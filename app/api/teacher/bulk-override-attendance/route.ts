import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const { sessionId, studentIds, status } = body

    if (!sessionId || !Array.isArray(studentIds) || studentIds.length === 0 || !status) {
      return NextResponse.json({ error: "Missing required fields (sessionId, studentIds, status)" }, { status: 400 })
    }

    if (status !== "present" && status !== "absent") {
      return NextResponse.json({ error: "Invalid status (must be 'present' or 'absent')" }, { status: 400 })
    }

    const admin = createAdminClient()

    // 1. Explicit Teacher Role & Active Status Verification
    const { data: userProfile, error: profileError } = await admin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profileError || !userProfile || userProfile.role !== "teacher") {
      return NextResponse.json({ error: "Forbidden: Teacher access required" }, { status: 403 })
    }

    const { data: teacherProfile } = await admin
      .from("teachers")
      .select("is_active")
      .eq("id", user.id)
      .single()

    if (teacherProfile && teacherProfile.is_active === false) {
      return NextResponse.json({ error: "Forbidden: Teacher account is inactive" }, { status: 403 })
    }

    // 2. Verify Session Ownership and Status
    const { data: session, error: sessionErr } = await admin
      .from("attendance_sessions")
      .select("id, teacher_id, class_id, subject_id, status")
      .eq("id", sessionId)
      .single()

    if (sessionErr || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    if (session.teacher_id !== user.id) {
      return NextResponse.json({ error: "Forbidden: You do not own this attendance session" }, { status: 403 })
    }

    if (session.status === "finalized") {
      return NextResponse.json({ error: "Cannot modify a finalized session" }, { status: 400 })
    }

    // 3. Verify Teacher Assignment for Class & Subject
    const { data: assignment, error: assignmentError } = await admin
      .from("teacher_assignments")
      .select("id")
      .eq("teacher_id", user.id)
      .eq("class_id", session.class_id)
      .eq("subject_id", session.subject_id)
      .maybeSingle()

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { error: "Forbidden: You are not assigned to teach this subject and class cohort" },
        { status: 403 }
      )
    }

    // 4. Validate that all studentIds belong to session.class_id
    const { data: validStudents, error: studentsErr } = await admin
      .from("students")
      .select("id")
      .eq("class_id", session.class_id)
      .in("id", studentIds)

    if (studentsErr || !validStudents || validStudents.length !== studentIds.length) {
      return NextResponse.json(
        { error: "One or more selected students do not belong to the authorized class cohort" },
        { status: 400 }
      )
    }

    // 5. Batch Upsert to period_attendance — preserving biometric verification evidence
    const { data: existingRows } = await admin
      .from("period_attendance")
      .select("student_id, face_verified")
      .eq("session_id", sessionId)
      .in("student_id", studentIds)

    const existingFaceMap = new Map<string, boolean>()
    for (const r of existingRows ?? []) {
      if (r.face_verified !== null && r.face_verified !== undefined) {
        existingFaceMap.set(r.student_id, r.face_verified)
      }
    }

    const now = new Date().toISOString()
    const rows = studentIds.map((studentId: string) => ({
      session_id: sessionId,
      student_id: studentId,
      status,
      override_by_teacher: true,
      override_reason: studentIds.length > 1 ? "Bulk teacher review override" : "Manual teacher review override",
      overridden_by: user.id,
      overridden_at: now,
      face_verified: existingFaceMap.get(studentId) ?? false,
    }))

    const { error: upsertErr } = await admin
      .from("period_attendance")
      .upsert(rows, { onConflict: "session_id,student_id" })

    if (upsertErr) {
      console.error("Bulk override upsert error:", upsertErr)
      return NextResponse.json({ error: "Failed to update attendance records" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      updatedCount: studentIds.length,
      status,
    })
  } catch (e) {
    console.error("bulk-override-attendance error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
