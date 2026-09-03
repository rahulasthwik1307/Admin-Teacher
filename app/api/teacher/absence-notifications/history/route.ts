import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: batches, error } = await supabase
      .from("notification_batches")
      .select(`id, sent_at, selected_count, student_count, sent_count, failed_count, no_email_count, teacher:teachers ( user:users ( full_name ) )`)
      .eq("teacher_id", user.id)
      .order("sent_at", { ascending: false })
      .limit(50)

    if (error) return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 })
    const batchIds = (batches ?? []).map((b: any) => b.id)

    const { data: recipients } = batchIds.length > 0
      ? await supabase.from("notification_batch_recipients")
          .select(`
            batch_id,
            period_attendance:period_attendance_id (
              session:attendance_sessions (
                session_date,
                subject:subjects ( name ),
                class:classes ( name, section, year, department:departments ( code ) )
              )
            )
          `)
          .in("batch_id", batchIds)
      : { data: [] }

    const aggMap = new Map<string, { subjects: Set<string>; cohorts: Set<string>; sections: Set<string>; years: Set<string>; dates: string[] }>()
    for (const r of (recipients ?? [])) {
      const pa: any = r.period_attendance
      const s = pa?.session
      if (!aggMap.has(r.batch_id)) aggMap.set(r.batch_id, { subjects: new Set(), cohorts: new Set(), sections: new Set(), years: new Set(), dates: [] })
      const entry = aggMap.get(r.batch_id)!
      if (s?.subject?.name) entry.subjects.add(s.subject.name)
      if (s?.class) {
        const dCode = s.class.department?.code || ""
        const sec = s.class.section || "A"
        const secLabel = dCode ? `${dCode}-${sec}` : `Sec ${sec}`
        if (secLabel) entry.sections.add(secLabel)
        if (s.class.year) entry.years.add(s.class.year)
        const cLabel = `${secLabel}${s.class.year ? ` · ${s.class.year}` : ""}`.trim()
        if (cLabel) entry.cohorts.add(cLabel)
      }
      if (s?.session_date) entry.dates.push(s.session_date)
    }

    const result = (batches ?? []).map((b: any) => {
      const agg = aggMap.get(b.id) ?? { subjects: new Set(), cohorts: new Set(), sections: new Set(), years: new Set(), dates: [] }
      const sortedDates = [...agg.dates].sort()
      return {
        batchId: b.id, sentAt: b.sent_at, selectedCount: b.selected_count, studentCount: b.student_count,
        sentCount: b.sent_count, failedCount: b.failed_count, noEmailCount: b.no_email_count,
        sentBy: b.teacher?.user?.full_name ?? "Unknown",
        subjects: Array.from(agg.subjects),
        cohorts: Array.from(agg.cohorts),
        sections: Array.from(agg.sections),
        years: Array.from(agg.years),
        dateFrom: sortedDates[0] ?? null, dateTo: sortedDates[sortedDates.length - 1] ?? null,
      }
    })

    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
