import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()

    // 1. Authenticate caller from session / Bearer header
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 2. Verify caller role
    const { data: userProfile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()

    const role = userProfile?.role
    if (role !== "teacher" && role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Teacher access required" },
        { status: 403 }
      )
    }

    // 3. If teacher, verify is_active status
    if (role === "teacher") {
      const { data: teacherProfile } = await supabase
        .from("teachers")
        .select("is_active")
        .eq("id", user.id)
        .maybeSingle()

      if (teacherProfile && teacherProfile.is_active === false) {
        return NextResponse.json(
          { error: "Teacher account is disabled" },
          { status: 403 }
        )
      }
    }

    // 4. Resolve authorized class IDs for this teacher
    let authorizedClassIds: string[] = []

    if (role === "admin") {
      // Admin retains campus-wide access
      const { data: allClasses } = await supabase
        .from("classes")
        .select("id")
      authorizedClassIds = (allClasses ?? []).map((c: any) => c.id)
    } else {
      // Teacher: resolve strictly from teacher_assignments
      const { data: assignments } = await supabase
        .from("teacher_assignments")
        .select("class_id")
        .eq("teacher_id", user.id)

      authorizedClassIds = Array.from(
        new Set(
          (assignments ?? [])
            .map((a: any) => a.class_id)
            .filter(Boolean)
        )
      )
    }

    if (authorizedClassIds.length === 0) {
      return NextResponse.json({ students: [] })
    }

    // 5. Intersect client query params with server-derived authorized scope
    const { searchParams } = new URL(req.url)
    const requestedClassId = searchParams.get("class_id")
    const sessionId = searchParams.get("session_id")

    let targetClassIds: string[] = authorizedClassIds

    if (requestedClassId) {
      // Reject / empty if requested class is outside teacher's authorized assignments
      if (!authorizedClassIds.includes(requestedClassId)) {
        return NextResponse.json({ students: [] })
      }
      targetClassIds = [requestedClassId]
    }

    // If session_id is supplied, verify session ownership / assignment
    if (sessionId && role === "teacher") {
      const { data: session } = await supabase
        .from("attendance_sessions")
        .select("id, teacher_id, class_id")
        .eq("id", sessionId)
        .maybeSingle()

      if (
        session &&
        session.teacher_id !== user.id &&
        !authorizedClassIds.includes(session.class_id)
      ) {
        return NextResponse.json({ students: [] })
      }
    }

    // 6. Query students strictly within the authorized class IDs
    const { data: studentRows, error: studentsErr } = await supabase
      .from("students")
      .select(`
        id,
        roll_number,
        year,
        is_active,
        is_approved,
        is_rejected,
        embedding_a,
        registration_photo_url,
        class_id,
        created_at,
        class:classes ( id, name, section, year, department:departments ( code ) ),
        user:users ( full_name )
      `)
      .in("class_id", targetClassIds)
      .order("created_at", { ascending: false })

    if (studentsErr) {
      console.error("student-list: error fetching students:", studentsErr)
      return NextResponse.json(
        { error: "Failed to fetch students" },
        { status: 500 }
      )
    }

    if (!studentRows || studentRows.length === 0) {
      return NextResponse.json({ students: [] })
    }

    // 7. If session_id is supplied, fetch attendance records for this session
    const attendanceMap = new Map<string, { status: string; scanned_at?: string }>()
    if (sessionId) {
      const { data: attendanceData, error: attendanceError } = await supabase
        .from("period_attendance")
        .select("student_id, status, scanned_at, face_verified")
        .eq("session_id", sessionId)

      if (attendanceError) {
        console.error(
          "student-list: error fetching attendance records:",
          attendanceError
        )
      }

      if (attendanceData) {
        attendanceData.forEach((a: any) =>
          attendanceMap.set(a.student_id, a)
        )
      }
    }

    // 8. Build formatted student response payload
    const students = studentRows.map((s: any) => {
      const classData = s.class as any
      const deptCode =
        classData?.department?.code ?? classData?.name ?? ""
      const section = classData?.section ?? ""
      const className = classData ? `${deptCode}-${section}` : "—"
      const hasEmbedding = !!s.embedding_a
      const isApproved = s.is_approved === true
      const isRejected = s.is_rejected === true
      const faceStatus: "Approved" | "Pending" | "Rejected" | "None" =
        isRejected
          ? "Rejected"
          : !hasEmbedding
          ? "None"
          : isApproved
          ? "Approved"
          : "Pending"

      const name = s.user?.full_name || "Unknown Student"
      const initials = name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()

      const att = attendanceMap.get(s.id)
      const status: string = att ? att.status : "pending"
      const time: string | undefined = att?.scanned_at
        ? att.scanned_at
        : undefined

      return {
        id: s.id,
        name,
        roll: s.roll_number,
        initials,
        class: className,
        classId: s.class_id,
        year: s.year ?? classData?.year ?? "",
        faceStatus,
        photoUrl: isApproved ? (s.registration_photo_url ?? null) : null,
        status,
        time,
      }
    })

    // Sort: if session attendance, present first, then absent, then pending, then failed
    if (sessionId) {
      const order: Record<string, number> = {
        present: 0,
        absent: 1,
        pending: 2,
        failed: 3,
      }
      students.sort(
        (a: any, b: any) =>
          (order[a.status] ?? 2) - (order[b.status] ?? 2)
      )
    }

    return NextResponse.json({ students })
  } catch (error: any) {
    console.error("student-list API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

