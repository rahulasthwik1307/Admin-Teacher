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
    ;(assignments ?? []).forEach((a: any) => {
      if (a.subject_id && a.class_id) authorizedPairs.add(`${a.subject_id}_${a.class_id}`)
    })
    ;(timetableSlots ?? []).forEach((tt: any) => {
      if (tt.subject_id && tt.class_id) authorizedPairs.add(`${tt.subject_id}_${tt.class_id}`)
    })

    if (authorizedPairs.size === 0) {
      return NextResponse.json([])
    }

    const todayStr = new Date().toISOString().split("T")[0]

    // 2. Fetch all finalized sessions for this teacher up to today with rich joins
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

    // 4. Fetch attendance counts in safe chunks of 50 to prevent URL parameter explosion
    const sessionIds = authorizedSessions.map((s: any) => s.id)
    const CHUNK_SIZE = 50
    const chunks: string[][] = []
    for (let i = 0; i < sessionIds.length; i += CHUNK_SIZE) {
      chunks.push(sessionIds.slice(i, i + CHUNK_SIZE))
    }

    const chunkResults = await Promise.all(
      chunks.map((chunk) =>
        supabase
          .from("period_attendance")
          .select("session_id, status")
          .in("session_id", chunk)
          .in("status", ["present", "absent"])
      )
    )

    const presentMap = new Map<string, number>()
    const absentMap = new Map<string, number>()

    for (const res of chunkResults) {
      for (const row of (res.data ?? [])) {
        if (row.status === "present") {
          presentMap.set(row.session_id, (presentMap.get(row.session_id) ?? 0) + 1)
        } else if (row.status === "absent") {
          absentMap.set(row.session_id, (absentMap.get(row.session_id) ?? 0) + 1)
        }
      }
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

    return NextResponse.json(sessions)
  } catch (e) {
    console.error("Attendance history API error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
