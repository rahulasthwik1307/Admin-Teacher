import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

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

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const teacherId = user.id

    // Fetch all finalized sessions with joins
    const { data: rawSessions, error } = await supabase
      .from("attendance_sessions")
      .select(`
        id, session_date, finalized_at, subject_id, class_id, period_id,
        subjects ( id, name ),
        classes ( id, name, section ),
        periods ( period_number, start_time, end_time )
      `)
      .eq("teacher_id", teacherId)
      .eq("status", "finalized")
      .order("session_date", { ascending: false })
      .order("finalized_at", { ascending: false })

    if (error) return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 })
    if (!rawSessions || rawSessions.length === 0) return NextResponse.json([])

    // Fetch ALL attendance counts in 2 bulk queries instead of 2N queries
    const sessionIds = rawSessions.map((s: any) => s.id)

    const [{ data: attendanceRows }] = await Promise.all([
      supabase
        .from("period_attendance")
        .select("session_id, status")
        .in("session_id", sessionIds)
        .in("status", ["present", "absent"]),
    ])

    // Build count maps
    const presentMap = new Map<string, number>()
    const absentMap = new Map<string, number>()
    for (const row of (attendanceRows ?? [])) {
      if (row.status === "present") {
        presentMap.set(row.session_id, (presentMap.get(row.session_id) ?? 0) + 1)
      } else if (row.status === "absent") {
        absentMap.set(row.session_id, (absentMap.get(row.session_id) ?? 0) + 1)
      }
    }

    const sessions = rawSessions.map((s: any) => {
      const present = presentMap.get(s.id) ?? 0
      const absent = absentMap.get(s.id) ?? 0
      const total = present + absent
      const pct = total > 0 ? Math.round((present / total) * 100) : 0
      const periodNum = s.periods?.period_number ?? 0
      const periodShort = periodNum > 0 ? `${getOrdinal(periodNum)} Period` : "Unknown Period"
      const startTime = s.periods?.start_time?.slice(0, 5) ?? ""
      const endTime = s.periods?.end_time?.slice(0, 5) ?? ""
      const periodTime = startTime && endTime ? `${startTime} - ${endTime}` : ""

      return {
        id: s.id,
        date: formatDate(s.session_date),
        rawDate: s.session_date,
        subject: s.subjects?.name ?? "Unknown Subject",
        subjectId: s.subject_id ?? "",
        class: s.classes ? `${s.classes.name}-${s.classes.section}` : "Unknown",
        classId: s.class_id ?? "",
        period: `${periodShort}${periodTime ? ` · ${periodTime}` : ""}`,
        periodShort,
        periodTime,
        present,
        absent,
        percentage: pct,
        status: "Finalized" as const,
      }
    })

    return NextResponse.json(sessions)
  } catch (e) {
    console.error("Attendance history API error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
