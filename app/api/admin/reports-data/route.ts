import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const [
      { data: teachers },
      { data: sessions },
      { data: assignments },
      { data: logs },
    ] = await Promise.all([
      supabase.from("teachers").select(`id, title, department:departments ( name, code ), user:users ( full_name )`),
      supabase.from("attendance_sessions").select("id, teacher_id, session_date, subject_id, subject:subjects ( name, department:departments ( code ) )").eq("status", "finalized").order("session_date", { ascending: false }),
      supabase.from("teacher_assignments").select("teacher_id"),
      supabase.from("system_logs").select("id, created_at, action_type, description, performed_by").order("created_at", { ascending: false }).limit(100),
    ])

    const sessionIds = (sessions ?? []).map((s: any) => s.id)

    // Fetch ALL attendance in ONE query instead of chunked loop
    const { data: allAttendance } = sessionIds.length > 0
      ? await supabase
          .from("period_attendance")
          .select("session_id, student_id, status")
          .in("session_id", sessionIds)
          .in("status", ["present", "absent"])
      : { data: [] }

    // Fetch performer names for logs
    const performerIds = [...new Set((logs ?? []).map((l: any) => l.performed_by).filter(Boolean))]
    const { data: logUsers } = performerIds.length > 0
      ? await supabase.from("users").select("id, full_name").in("id", performerIds)
      : { data: [] }

    const nameMap: Record<string, string> = {}
    for (const u of logUsers ?? []) nameMap[u.id] = u.full_name

    return NextResponse.json({
      teachers: teachers ?? [],
      sessions: sessions ?? [],
      assignments: assignments ?? [],
      attendance: allAttendance ?? [],
      logs: (logs ?? []).map((l: any) => ({
        ...l,
        performedBy: nameMap[l.performed_by] ?? "System",
      })),
    })
  } catch (e) {
    console.error("reports-data API error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
