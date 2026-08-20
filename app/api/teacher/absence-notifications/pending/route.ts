import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data, error } = await supabase
      .from("period_attendance")
      .select(`
        id, student_id, notified_at,
        student:students ( id, roll_number, user:users ( full_name, contact_email ) ),
        session:attendance_sessions!inner (
          id, session_date, status, teacher_id,
          subject:subjects ( id, name ),
          class:classes ( id, name, section ),
          period:periods ( id, period_number, start_time, end_time )
        )
      `)
      .eq("status", "absent")
      .is("notified_at", null)
      .eq("session.status", "finalized")
      .eq("session.teacher_id", user.id)
      .order("id", { ascending: false })

    if (error) return NextResponse.json({ error: "Failed to fetch pending absences" }, { status: 500 })

    // Group by session
    const sessionMap = new Map<string, any>()
    for (const row of (data ?? [])) {
      const s: any = row.session
      if (!sessionMap.has(s.id)) {
        sessionMap.set(s.id, {
          sessionId: s.id,
          subjectId: s.subject?.id,
          subjectName: s.subject?.name ?? "Unknown",
          classId: s.class?.id,
          className: s.class ? `${s.class.name}-${s.class.section}` : "Unknown",
          periodId: s.period?.id,
          periodNumber: s.period?.period_number ?? 0,
          startTime: (s.period?.start_time ?? "").substring(0, 5),
          endTime: (s.period?.end_time ?? "").substring(0, 5),
          date: s.session_date,
          students: [],
        })
      }
      const student: any = row.student
      sessionMap.get(s.id)!.students.push({
        periodAttendanceId: row.id,
        studentId: row.student_id,
        studentName: student?.user?.full_name ?? "Unknown",
        rollNumber: student?.roll_number ?? "",
        contactEmail: student?.user?.contact_email ?? null,
      })
    }

    const sessions = Array.from(sessionMap.values()).sort((a, b) => b.date.localeCompare(a.date))
    return NextResponse.json(sessions)
  } catch (e) {
    console.error("pending absences error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
