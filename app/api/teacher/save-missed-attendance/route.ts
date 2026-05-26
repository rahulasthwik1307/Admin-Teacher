import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const { class_id, subject_id, period_id, session_date, attendance } = body
    // attendance = [{ student_id: string, status: "present" | "absent" }]

    if (!class_id || !subject_id || !period_id || !session_date || !attendance) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const admin = createAdminClient()

    // Check if a session already exists for this slot
    const { data: existing } = await admin
      .from("attendance_sessions")
      .select("id")
      .eq("teacher_id", user.id)
      .eq("class_id", class_id)
      .eq("subject_id", subject_id)
      .eq("period_id", period_id)
      .eq("session_date", session_date)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: "Session already exists for this slot" }, { status: 409 })
    }

    const now = new Date().toISOString()

    // Create the attendance session as finalized
    const { data: session, error: sessionError } = await admin
      .from("attendance_sessions")
      .insert({
        teacher_id: user.id,
        class_id,
        subject_id,
        period_id,
        session_date,
        status: "finalized",
        opened_at: now,
        finalized_at: now,
      })
      .select("id")
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: "Failed to create session" }, { status: 500 })
    }

    // Insert period_attendance for each student
    const attendanceRows = attendance.map((a: { student_id: string; status: string }) => ({
      session_id: session.id,
      student_id: a.student_id,
      status: a.status,
    }))

    const { error: attendanceError } = await admin
      .from("period_attendance")
      .insert(attendanceRows)

    if (attendanceError) {
      // Rollback session
      await admin.from("attendance_sessions").delete().eq("id", session.id)
      return NextResponse.json({ error: "Failed to save attendance" }, { status: 500 })
    }

    // Log to system_logs
    await admin.from("system_logs").insert({
      performed_by: user.id,
      action_type: "create",
      description: `Missed attendance filled for session_date: ${session_date}`,
    })

    return NextResponse.json({ success: true, session_id: session.id })
  } catch (e) {
    console.error("save-missed-attendance error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
