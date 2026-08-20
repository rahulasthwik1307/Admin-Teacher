import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Only absences from FINALIZED sessions, not yet notified
    const { data, error } = await supabase
      .from("period_attendance")
      .select(`
        id, student_id, notified_at,
        student:students ( id, roll_number, user:users ( full_name, contact_email ) ),
        session:attendance_sessions!inner (
          id, session_date, status, teacher_id,
          subject:subjects ( name ),
          class:classes ( name, section ),
          period:periods ( period_number )
        )
      `)
      .eq("status", "absent")
      .is("notified_at", null)
      .eq("session.status", "finalized")
      .eq("session.teacher_id", user.id)
      .order("id", { ascending: false })

    if (error) {
      console.error("pending absences fetch error:", error)
      return NextResponse.json({ error: "Failed to fetch pending absences" }, { status: 500 })
    }

    const items = (data ?? []).map((row: any) => ({
      periodAttendanceId: row.id,
      studentId: row.student_id,
      studentName: row.student?.user?.full_name ?? "Unknown",
      rollNumber: row.student?.roll_number ?? "",
      contactEmail: row.student?.user?.contact_email ?? null,
      date: row.session?.session_date,
      subject: row.session?.subject?.name ?? "Unknown",
      period: row.session?.period?.period_number ?? 0,
      className: row.session?.class ? `${row.session.class.name}-${row.session.class.section}` : "Unknown",
    }))

    return NextResponse.json(items)
  } catch (e) {
    console.error("pending absences error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
