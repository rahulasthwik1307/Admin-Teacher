import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const daysBack = parseInt(searchParams.get("days") ?? "30")

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)
    const startDateStr = startDate.toISOString().split("T")[0]
    const todayStr = new Date().toISOString().split("T")[0]

    const [{ data: timetable }, { data: existingSessions }] = await Promise.all([
      supabase
        .from("timetables")
        .select(`
          day_of_week, subject_id, class_id, period_id,
          subject:subjects ( id, name, code ),
          class:classes ( id, name, section ),
          period:periods ( id, period_number, start_time, end_time )
        `)
        .eq("teacher_id", user.id),
      supabase
        .from("attendance_sessions")
        .select("subject_id, class_id, period_id, session_date")
        .eq("teacher_id", user.id)
        .gte("session_date", startDateStr)
        .lte("session_date", todayStr),
    ])

    if (!timetable || timetable.length === 0) {
      return NextResponse.json([])
    }

    const existingKeys = new Set(
      (existingSessions || []).map((s: any) => `${s.session_date}__${s.subject_id}__${s.class_id}__${s.period_id}`)
    )

    const missed: any[] = []
    const cursor = new Date(startDate)
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes()

    while (cursor <= today) {
      const jsDay = cursor.getDay()
      const dayOfWeek = jsDay === 0 ? 7 : jsDay
      if (dayOfWeek !== 7) {
        const dateStr = cursor.toISOString().split("T")[0]
        const isToday = dateStr === todayStr
        for (const slot of timetable) {
          if ((slot as any).day_of_week !== dayOfWeek) continue
          const key = `${dateStr}__${slot.subject_id}__${slot.class_id}__${slot.period_id}`
          if (existingKeys.has(key)) continue
          if (isToday) {
            const endStr = ((slot as any).period?.end_time as string) ?? "00:00"
            const [endH, endM] = endStr.split(":").map(Number)
            if (nowMinutes < endH * 60 + endM) continue
          }

          const date = new Date(dateStr + "T00:00:00")
          const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
          const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]
          let dateLabel: string
          const todayMidnight = new Date(); todayMidnight.setHours(0,0,0,0)
          const yesterdayMidnight = new Date(todayMidnight); yesterdayMidnight.setDate(todayMidnight.getDate()-1)
          const dateMidnight = new Date(dateStr + "T00:00:00"); dateMidnight.setHours(0,0,0,0)
          if (dateMidnight.getTime() === todayMidnight.getTime()) dateLabel = `Today — ${months[date.getMonth()]} ${date.getDate()}`
          else if (dateMidnight.getTime() === yesterdayMidnight.getTime()) dateLabel = `Yesterday — ${months[date.getMonth()]} ${date.getDate()}`
          else dateLabel = `${days[date.getDay()]} — ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`

          missed.push({
            date: dateStr, dateLabel,
            subjectId: slot.subject_id,
            subjectName: (slot as any).subject?.name ?? "Unknown",
            subjectCode: (slot as any).subject?.code ?? "",
            classId: slot.class_id,
            className: `${(slot as any).class?.name ?? ""}-${(slot as any).class?.section ?? ""}`,
            periodId: slot.period_id,
            periodNumber: (slot as any).period?.period_number ?? 0,
            startTime: ((slot as any).period?.start_time ?? "").substring(0, 5),
            endTime: ((slot as any).period?.end_time ?? "").substring(0, 5),
          })
        }
      }
      cursor.setDate(cursor.getDate() + 1)
    }

    missed.sort((a, b) => {
      const d = b.date.localeCompare(a.date)
      return d !== 0 ? d : a.periodNumber - b.periodNumber
    })

    return NextResponse.json(missed)
  } catch (e) {
    console.error("missed-attendance API error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
