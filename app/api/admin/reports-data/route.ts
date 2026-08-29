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
      { data: departments },
      { data: classes },
      { data: subjects },
    ] = await Promise.all([
      supabase.from("teachers").select(`id, title, department:departments ( id, name, code ), user:users ( full_name )`),
      supabase
        .from("attendance_sessions")
        .select(`
          id,
          teacher_id,
          session_date,
          subject_id,
          class_id,
          status,
          subject:subjects ( id, name, code, department_id, department:departments ( id, name, code ) ),
          class:classes ( id, name, section, year, department_id, department:departments ( id, name, code ) ),
          teacher:teachers ( id, title, user:users ( full_name ), department:departments ( id, name, code ) )
        `)
        .eq("status", "finalized")
        .order("session_date", { ascending: false }),
      supabase.from("teacher_assignments").select("id, teacher_id, subject_id, class_id"),
      supabase.from("system_logs").select("id, created_at, action_type, description, performed_by").order("created_at", { ascending: false }).limit(100),
      supabase.from("departments").select("id, name, code").order("name"),
      supabase.from("classes").select("id, name, section, year, department_id, department:departments ( id, name, code )").order("name"),
      supabase.from("subjects").select("id, name, code, department_id, department:departments ( id, name, code )").order("name"),
    ])

    const sessionIds = (sessions ?? []).map((s: any) => s.id)

    // Chunk sessionIds in batches of 50 to avoid HTTP HeadersOverflowError (URL query length limit)
    const CHUNK_SIZE = 50
    const chunks: string[][] = []
    for (let i = 0; i < sessionIds.length; i += CHUNK_SIZE) {
      chunks.push(sessionIds.slice(i, i + CHUNK_SIZE))
    }

    const attResults = await Promise.all(
      chunks.map(chunk =>
        supabase
          .from("period_attendance")
          .select(`
            session_id,
            student_id,
            status,
            student:students (
              id,
              roll_number,
              year,
              user:users ( full_name ),
              class:classes ( id, name, section, year, department:departments ( id, name, code ) ),
              department:departments ( id, name, code )
            )
          `)
          .in("session_id", chunk)
          .in("status", ["present", "absent"])
      )
    )

    const allAttendance = attResults.flatMap(r => r.data || [])

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
      departments: departments ?? [],
      classes: classes ?? [],
      subjects: subjects ?? [],
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

