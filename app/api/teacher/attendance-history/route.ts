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

    // 1. Fetch teacher's authorized subject + class assignment scope
    const [{ data: assignments }, { data: timetableSlots }] = await Promise.all([
      supabase
        .from("teacher_assignments")
        .select("subject_id, class_id")
        .eq("teacher_id", teacherId),
      supabase
        .from("timetables")
        .select("subject_id, class_id")
        .eq("teacher_id", teacherId),
    ])

    const authorizedPairs = new Set<string>()
    const authorizedClassIds = new Set<string>()
    ;(assignments ?? []).forEach((a: any) => {
      if (a.subject_id && a.class_id) authorizedPairs.add(`${a.subject_id}_${a.class_id}`)
      if (a.class_id) authorizedClassIds.add(a.class_id)
    })
    ;(timetableSlots ?? []).forEach((tt: any) => {
      if (tt.subject_id && tt.class_id) authorizedPairs.add(`${tt.subject_id}_${tt.class_id}`)
      if (tt.class_id) authorizedClassIds.add(tt.class_id)
    })

    if (authorizedPairs.size === 0 || authorizedClassIds.size === 0) {
      return NextResponse.json([])
    }

    const todayStr = new Date().toISOString().split("T")[0]

    // 2. Fetch all finalized sessions for this teacher up to today with rich joins and database-level class authorization
    const { data: rawSessions, error } = await supabase
      .from("attendance_sessions")
      .select(`
        id, session_date, finalized_at, opened_at, current_qr_token, subject_id, class_id, period_id,
        qr_tokens:qr_tokens(count),
        subjects ( id, name, code ),
        classes ( id, name, section, year, department:departments ( code, name ) ),
        periods ( id, period_number, start_time, end_time )
      `)
      .eq("teacher_id", teacherId)
      .eq("status", "finalized")
      .in("class_id", Array.from(authorizedClassIds))
      .lte("session_date", todayStr)
      .order("session_date", { ascending: false })
      .order("finalized_at", { ascending: false })

    if (error) {
      console.error("Failed to fetch attendance sessions:", error)
      return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 })
    }

    if (!rawSessions || rawSessions.length === 0) return NextResponse.json([])

    // 3. Filter sessions strictly by authorized (subject_id, class_id) pairs
    const authorizedSessions = rawSessions.filter((s: any) =>
      authorizedPairs.has(`${s.subject_id}_${s.class_id}`)
    )

    if (authorizedSessions.length === 0) return NextResponse.json([])

    // 4. Fetch attendance counts in 1 fast server-aggregated query (no chunks, no raw row downloads)
    const sessionIds = authorizedSessions.map((s: any) => s.id)
    const { data: countsData, error: countsError } = await supabase.rpc(
      "get_session_attendance_counts",
      { p_session_ids: sessionIds }
    )

    if (countsError) {
      console.error("Failed to fetch attendance counts:", countsError)
    }

    const presentMap = new Map<string, number>()
    const absentMap = new Map<string, number>()

    for (const row of (countsData ?? [])) {
      presentMap.set(row.session_id, Number(row.present_count ?? 0))
      absentMap.set(row.session_id, Number(row.absent_count ?? 0))
    }

    // 5. Map sessions and exclude empty ghost sessions with zero attendance records
    const sessions = []
    for (const s of authorizedSessions as any[]) {
      const present = presentMap.get(s.id) ?? 0
      const absent = absentMap.get(s.id) ?? 0
      const total = present + absent

      // Ignore unconducted ghost sessions with 0 student attendance records
      if (total === 0) continue

      const pct = Math.round((present / total) * 100)
      const periodNum = s.periods?.period_number ?? 0
      const periodShort = periodNum > 0 ? `${getOrdinal(periodNum)} Period` : "Period"
      const startTime = s.periods?.start_time ? s.periods.start_time.slice(0, 5) : ""
      const endTime = s.periods?.end_time ? s.periods.end_time.slice(0, 5) : ""
      const periodTime = startTime && endTime ? `${startTime} - ${endTime}` : ""

      const dCode = Array.isArray(s.classes?.department)
        ? s.classes?.department[0]?.code
        : s.classes?.department?.code ?? s.classes?.name ?? "CSE"
      const year = s.classes?.year ?? ""
      const section = s.classes?.section ?? ""
      const classLabel = `${dCode}-${section}${year ? ` · ${year}` : ""}`

      const qrCount = s.qr_tokens?.[0]?.count ?? 0
      const method = qrCount > 0 ? "qr" : "manual"

      sessions.push({
        id: s.id,
        date: formatDate(s.session_date),
        rawDate: s.session_date,
        subject: s.subjects?.name ?? "Unknown Subject",
        subjectId: s.subject_id ?? "",
        subjectCode: s.subjects?.code ?? "",
        class: classLabel,
        classId: s.class_id ?? "",
        departmentCode: dCode,
        year,
        section,
        period: `${periodShort}${periodTime ? ` · ${periodTime}` : ""}`,
        periodShort,
        periodNumber: periodNum,
        periodTime,
        startTime,
        endTime,
        present,
        absent,
        total,
        percentage: pct,
        status: "Finalized" as const,
        method: method as "qr" | "manual",
        finalizedAt: s.finalized_at ?? null,
      })
    }

    return NextResponse.json(sessions, {
      headers: {
        "Cache-Control": "private, no-cache, stale-while-revalidate=60",
      },
    })
  } catch (e) {
    console.error("Attendance history API error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
