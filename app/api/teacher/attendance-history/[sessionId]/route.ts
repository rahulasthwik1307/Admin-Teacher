import { createClient } from "@/lib/supabase/server"
import { NextResponse, type NextRequest } from "next/server"

function getOrdinal(n: number): string {
  if (n >= 11 && n <= 13) return `${n}th`
  switch (n % 10) {
    case 1: return `${n}st`
    case 2: return `${n}nd`
    case 3: return `${n}rd`
    default: return `${n}th`
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await context.params
    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const teacherId = user.id

    // 1. Fetch the session and verify teacher ownership
    const { data: sessionData, error: sErr } = await supabase
      .from("attendance_sessions")
      .select(`
        id, session_date, finalized_at, subject_id, class_id, period_id, status,
        subjects ( id, name, code ),
        classes ( id, name, section, year, department:departments ( code, name ) ),
        periods ( id, period_number, start_time, end_time )
      `)
      .eq("id", sessionId)
      .eq("teacher_id", teacherId)
      .single()

    if (sErr || !sessionData) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // 2. Verify authorization against teacher_assignments / timetables
    const [{ data: assignments }, { data: timetableSlots }] = await Promise.all([
      supabase
        .from("teacher_assignments")
        .select("subject_id, class_id")
        .eq("teacher_id", teacherId)
        .eq("subject_id", sessionData.subject_id)
        .eq("class_id", sessionData.class_id),
      supabase
        .from("timetables")
        .select("subject_id, class_id")
        .eq("teacher_id", teacherId)
        .eq("subject_id", sessionData.subject_id)
        .eq("class_id", sessionData.class_id),
    ])

    const hasAccess = (assignments && assignments.length > 0) || (timetableSlots && timetableSlots.length > 0)
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied for this session" }, { status: 403 })
    }

    // 3. Fetch all period_attendance records for this session
    const { data: studentRows, error: stErr } = await supabase
      .from("period_attendance")
      .select(`
        id, status, student_id, notified_at,
        student:students (
          id, roll_number, year,
          user:users ( full_name, email ),
          class:classes ( name, section, year, department:departments ( code, name ) )
        )
      `)
      .eq("session_id", sessionId)
      .in("status", ["present", "absent"])

    if (stErr) {
      console.error("Failed to load student records:", stErr)
      return NextResponse.json({ error: "Failed to load student details" }, { status: 500 })
    }

    let presentCount = 0
    let absentCount = 0
    let notifiedAbsentCount = 0
    let emailableAbsentCount = 0
    let noEmailAbsentCount = 0

    const students = (studentRows ?? []).map((row: any) => {
      const isPresent = row.status === "present"
      const alreadyNotified = !!row.notified_at
      const rawEmail = (row.student?.user?.email ?? "").trim()
      const hasEmail = rawEmail.length > 0 && rawEmail.includes("@")

      if (isPresent) {
        presentCount++
      } else {
        absentCount++
        if (alreadyNotified) {
          notifiedAbsentCount++
        } else {
          if (hasEmail) {
            emailableAbsentCount++
          } else {
            noEmailAbsentCount++
          }
        }
      }

      const std = row.student
      const dCode = Array.isArray(std?.class?.department)
        ? std?.class?.department[0]?.code
        : std?.class?.department?.code ?? std?.class?.name ?? ""

      return {
        id: std?.id ?? row.student_id,
        name: std?.user?.full_name ?? "Unknown Student",
        rollNumber: std?.roll_number ?? "—",
        email: rawEmail,
        hasEmail,
        status: isPresent ? ("Present" as const) : ("Absent" as const),
        alreadyNotified,
        notifiedAt: row.notified_at ? new Date(row.notified_at).toISOString() : null,
        departmentCode: dCode,
        year: std?.class?.year ?? std?.year ?? "",
        section: std?.class?.section ?? "",
      }
    })

    // Sort: Present first, then alphabetical by name
    students.sort((a, b) => {
      if (a.status === b.status) return a.name.localeCompare(b.name)
      return a.status === "Present" ? -1 : 1
    })

    const totalStudents = presentCount + absentCount
    const percentage = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0

    const periodNum = (sessionData.periods as any)?.period_number ?? 0
    const periodShort = periodNum > 0 ? `${getOrdinal(periodNum)} Period` : "Period"
    const startTime = (sessionData.periods as any)?.start_time ? (sessionData.periods as any).start_time.slice(0, 5) : ""
    const endTime = (sessionData.periods as any)?.end_time ? (sessionData.periods as any).end_time.slice(0, 5) : ""
    const periodTime = startTime && endTime ? `${startTime} - ${endTime}` : ""

    const dCode = Array.isArray((sessionData.classes as any)?.department)
      ? (sessionData.classes as any)?.department[0]?.code
      : (sessionData.classes as any)?.department?.code ?? (sessionData.classes as any)?.name ?? "CSE"
    const year = (sessionData.classes as any)?.year ?? ""
    const section = (sessionData.classes as any)?.section ?? ""
    const classLabel = `${dCode}-${section}${year ? ` · ${year}` : ""}`

    return NextResponse.json({
      session: {
        id: sessionData.id,
        date: formatDate(sessionData.session_date),
        rawDate: sessionData.session_date,
        finalizedAt: sessionData.finalized_at,
        subject: (sessionData.subjects as any)?.name ?? "Unknown Subject",
        subjectId: sessionData.subject_id ?? "",
        subjectCode: (sessionData.subjects as any)?.code ?? "",
        class: classLabel,
        classId: sessionData.class_id ?? "",
        periodId: sessionData.period_id ?? "",
        departmentCode: dCode,
        year,
        section,
        period: `${periodShort}${periodTime ? ` · ${periodTime}` : ""}`,
        periodShort,
        periodNumber: periodNum,
        periodTime,
        startTime,
        endTime,
        present: presentCount,
        absent: absentCount,
        notifiedAbsentCount,
        emailableAbsentCount,
        noEmailAbsentCount,
        pendingAbsentCount: emailableAbsentCount,
        total: totalStudents,
        percentage,
        status: "Finalized",
      },
      students,
    })
  } catch (e) {
    console.error("Session details API error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
