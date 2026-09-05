import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") ?? "This Month"

    const teacherId = user.id

    function getDateRange(p: string) {
      const now = new Date()
      const pad = (n: number) => String(n).padStart(2, "0")
      const formatLocalYMD = (d: Date) =>
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

      const to = formatLocalYMD(now)

      if (p === "This Week") {
        const day = now.getDay()
        const monday = new Date(now)
        monday.setDate(now.getDate() - ((day + 6) % 7))
        return { from: formatLocalYMD(monday), to }
      }
      if (p === "This Month") {
        const from = new Date(now.getFullYear(), now.getMonth(), 1)
        return { from: formatLocalYMD(from), to }
      }
      return { from: "2000-01-01", to }
    }

    const { from, to } = getDateRange(period)

    // All in parallel
    const [{ data: assignments }, { data: allSessions }] = await Promise.all([
      supabase
        .from("teacher_assignments")
        .select(`
          id, subject_id, class_id,
          subjects ( id, name ),
          classes ( id, name, section, year )
        `)
        .eq("teacher_id", teacherId),
      supabase
        .from("attendance_sessions")
        .select(`
          id, session_date, subject_id, class_id, period_id,
          period:periods ( id, period_number, start_time, end_time )
        `)
        .eq("teacher_id", teacherId)
        .eq("status", "finalized")
        .gte("session_date", from)
        .lte("session_date", to)
        .order("session_date", { ascending: true }),
    ])

    if (!assignments || assignments.length === 0) {
      return NextResponse.json({
        subjectCards: [],
        chartData: [],
        lowStudents: [],
        topStudents: [],
        dayOfWeekStats: [],
        periodSlotStats: [],
        summaryStats: { totalClasses: 0, overallPct: 0, belowThresholdCount: 0 },
      })
    }

    const sessionIds = (allSessions ?? []).map((s: any) => s.id)
    const uniqueClassIds = Array.from(new Set(assignments.map((a: any) => a.class_id)))

    // Fetch attendance in batches of 50 to prevent PostgREST URL query overflows on large date ranges
    const CHUNK_SIZE = 50
    const chunks: string[][] = []
    for (let i = 0; i < sessionIds.length; i += CHUNK_SIZE) {
      chunks.push(sessionIds.slice(i, i + CHUNK_SIZE))
    }

    const [attResults, ...studentCountResults] = await Promise.all([
      chunks.length > 0
        ? Promise.all(
            chunks.map((chunk) =>
              supabase
                .from("period_attendance")
                .select(`
                  session_id, status, student_id,
                  student:students ( id, roll_number, year, user:users ( full_name ) )
                `)
                .in("session_id", chunk)
                .in("status", ["present", "absent"])
            )
          )
        : Promise.resolve([]),
      ...uniqueClassIds.map((cid: string) =>
        supabase
          .from("students")
          .select("id", { count: "exact", head: true })
          .eq("class_id", cid)
          .eq("is_active", true)
      ),
    ])

    const attendance = (attResults as any[]).flatMap((r) => r.data || [])

    // Build student count map
    const studentCountMap = new Map<string, number>()
    uniqueClassIds.forEach((cid: string, i: number) => {
      studentCountMap.set(cid, (studentCountResults[i] as any).count ?? 0)
    })

    // Subject cards
    const subjectCards = assignments.map((asgn: any) => {
      const sub = asgn.subjects as any
      const cls = asgn.classes as any
      const subjectId = asgn.subject_id
      const classId = asgn.class_id

      const relevantSessions = (allSessions ?? []).filter(
        (s: any) => s.subject_id === subjectId && s.class_id === classId
      )
      const relevantSessionIds = relevantSessions.map((s: any) => s.id)
      const rows = attendance.filter((a: any) => relevantSessionIds.includes(a.session_id))

      const totalClasses = relevantSessions.length
      const presentTotal = rows.filter((r: any) => r.status === "present").length
      const absentTotal = rows.filter((r: any) => r.status === "absent").length
      const totalRows = rows.length
      const percentage = totalRows > 0 ? Math.round((presentTotal / totalRows) * 100) : 0

      let trend = "Stable"
      if (relevantSessions.length >= 4) {
        const sorted = [...relevantSessions].sort(
          (a: any, b: any) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime()
        )
        const recent3 = sorted.slice(0, 3).map((s: any) => s.id)
        const prev3 = sorted.slice(3, 6).map((s: any) => s.id)
        const avgPct = (ids: string[]) => {
          const r = attendance.filter((a: any) => ids.includes(a.session_id))
          if (r.length === 0) return 0
          return (r.filter((a: any) => a.status === "present").length / r.length) * 100
        }
        const diff = avgPct(recent3) - avgPct(prev3)
        if (diff > 5) trend = "Improving"
        else if (diff < -5) trend = "Declining"
      }

      const studentCount = studentCountMap.get(classId) ?? 0
      const insight = (() => {
        if (totalClasses === 0) return "No sessions conducted yet."
        if (percentage === 100) return "Perfect attendance!"
        if (trend === "Improving" && percentage < 75) return "Trending up but still below 75%."
        if (trend === "Declining" && percentage >= 75) return "Attendance slipping — was above target."
        if (trend === "Declining" && percentage < 75) return "Critical: attendance is low and still dropping."
        if (trend === "Improving" && percentage >= 75) return "Good progress — above target and improving."
        if (percentage < 50) return "Very low attendance — immediate action recommended."
        if (percentage < 75) return `Below 75% — ${absentTotal} absences across ${totalClasses} sessions.`
        if (percentage >= 90) return `Excellent attendance across ${totalClasses} sessions.`
        return `Stable — ${presentTotal} present out of ${presentTotal + absentTotal} records.`
      })()

      return {
        assignmentId: asgn.id,
        subjectId,
        subjectName: sub?.name ?? "Unknown",
        classId,
        className: cls ? `${cls.name}-${cls.section}` : "Unknown",
        year: cls?.year ?? "",
        percentage,
        totalStudents: studentCount,
        totalClasses,
        trend,
        presentTotal,
        absentTotal,
        insight,
      }
    })

    // Summary stats
    const totalClasses = (allSessions ?? []).length
    const overallPresent = attendance.filter((a: any) => a.status === "present").length
    const overallTotal = attendance.length
    const overallPct = overallTotal > 0 ? Math.round((overallPresent / overallTotal) * 100) : 0

    const studentSubjectPct: Record<string, { present: number; total: number }> = {}
    for (const asgn of assignments) {
      const subjectId = (asgn as any).subject_id
      const classId = (asgn as any).class_id
      const relevantSessionIds = (allSessions ?? [])
        .filter((s: any) => s.subject_id === subjectId && s.class_id === classId)
        .map((s: any) => s.id)
      const rows = attendance.filter((a: any) => relevantSessionIds.includes(a.session_id))
      for (const row of rows) {
        const key = `${row.student_id}__${subjectId}__${classId}`
        if (!studentSubjectPct[key]) studentSubjectPct[key] = { present: 0, total: 0 }
        studentSubjectPct[key].total++
        if (row.status === "present") studentSubjectPct[key].present++
      }
    }
    const belowThresholdCount = Object.values(studentSubjectPct).filter(
      v => v.total > 0 && Math.round((v.present / v.total) * 100) < 75
    ).length

    // Chart data — all sessions in period (sorted chronologically)
    const sortedSessions = [...(allSessions ?? [])]
      .sort((a: any, b: any) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime())

    // Map each assignment for fast lookup
    const asgnLookup = new Map<string, { subjectName: string; className: string; year: string }>()
    for (const asgn of assignments) {
      const sub = asgn.subjects as any
      const cls = asgn.classes as any
      const key = `${asgn.subject_id}__${asgn.class_id}`
      asgnLookup.set(key, {
        subjectName: sub?.name ?? "Unknown",
        className: cls ? `${cls.name}-${cls.section}` : "Unknown",
        year: cls?.year ?? "",
      })
    }

    const chartData = sortedSessions.map((s: any) => {
      const rows = attendance.filter((a: any) => a.session_id === s.id)
      const present = rows.filter((a: any) => a.status === "present").length
      const absent = rows.filter((a: any) => a.status === "absent").length
      const total = rows.length
      const pct = total > 0 ? Math.round((present / total) * 100) : 0
      const d = new Date(s.session_date + "T00:00:00")
      const meta = asgnLookup.get(`${s.subject_id}__${s.class_id}`)

      const periodNumber = s.period?.period_number
      const timeRange = s.period?.start_time && s.period?.end_time
        ? `${s.period.start_time.slice(0, 5)} - ${s.period.end_time.slice(0, 5)}`
        : ""

      return {
        date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        fullDate: d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
        percentage: pct,
        sessionId: s.id,
        subjectId: s.subject_id,
        subjectName: meta?.subjectName ?? "Subject",
        classId: s.class_id,
        className: meta?.className ?? "Class",
        year: meta?.year ?? "",
        periodNumber,
        timeRange,
        presentCount: present,
        absentCount: absent,
        totalStudents: total || (studentCountMap.get(s.class_id) ?? 0),
      }
    })

    // Day of week stats (Mon = 1 to Sat = 6)
    const dayMap: Record<number, { day: string; dayNumber: number; sessionCount: number; presentTotal: number; totalRecords: number }> = {
      1: { day: "Mon", dayNumber: 1, sessionCount: 0, presentTotal: 0, totalRecords: 0 },
      2: { day: "Tue", dayNumber: 2, sessionCount: 0, presentTotal: 0, totalRecords: 0 },
      3: { day: "Wed", dayNumber: 3, sessionCount: 0, presentTotal: 0, totalRecords: 0 },
      4: { day: "Thu", dayNumber: 4, sessionCount: 0, presentTotal: 0, totalRecords: 0 },
      5: { day: "Fri", dayNumber: 5, sessionCount: 0, presentTotal: 0, totalRecords: 0 },
      6: { day: "Sat", dayNumber: 6, sessionCount: 0, presentTotal: 0, totalRecords: 0 },
    }

    for (const s of (allSessions ?? [])) {
      const dayNum = new Date(s.session_date + "T00:00:00").getDay()
      if (dayNum >= 1 && dayNum <= 6) {
        dayMap[dayNum].sessionCount++
        const rows = attendance.filter((a: any) => a.session_id === s.id)
        dayMap[dayNum].presentTotal += rows.filter((r: any) => r.status === "present").length
        dayMap[dayNum].totalRecords += rows.length
      }
    }

    const dayStatsRaw = Object.values(dayMap).map((d) => ({
      ...d,
      percentage: d.totalRecords > 0 ? Math.round((d.presentTotal / d.totalRecords) * 100) : 0,
    }))

    const activeDays = dayStatsRaw.filter((d) => d.sessionCount > 0)
    const maxPct = activeDays.length > 0 ? Math.max(...activeDays.map((d) => d.percentage)) : -1
    const minPct = activeDays.length > 0 ? Math.min(...activeDays.map((d) => d.percentage)) : -1

    const dayOfWeekStats = dayStatsRaw.map((d) => ({
      ...d,
      isPeak: d.sessionCount > 0 && d.percentage === maxPct && maxPct > minPct,
      isLowest: d.sessionCount > 0 && d.percentage === minPct && minPct < maxPct,
    }))

    // Period slot turnout stats
    const periodSlotMap: Record<number, { periodNumber: number; timeRange: string; sessionCount: number; presentTotal: number; totalRecords: number }> = {}

    for (const s of (allSessions ?? [])) {
      const pObj = Array.isArray((s as any).period) ? (s as any).period[0] : (s as any).period
      const pNum = pObj?.period_number ?? 1
      const timeRange = pObj?.start_time && pObj?.end_time ? `${pObj.start_time} - ${pObj.end_time}` : `Period ${pNum}`
      if (!periodSlotMap[pNum]) {
        periodSlotMap[pNum] = {
          periodNumber: pNum,
          timeRange,
          sessionCount: 0,
          presentTotal: 0,
          totalRecords: 0,
        }
      }
      periodSlotMap[pNum].sessionCount++
      const rows = attendance.filter((a: any) => a.session_id === s.id)
      periodSlotMap[pNum].presentTotal += rows.filter((r: any) => r.status === "present").length
      periodSlotMap[pNum].totalRecords += rows.length
    }

    const periodSlotStats = Object.values(periodSlotMap)
      .map((p) => ({
        periodNumber: p.periodNumber,
        timeRange: p.timeRange,
        percentage: p.totalRecords > 0 ? Math.round((p.presentTotal / p.totalRecords) * 100) : 0,
        sessionCount: p.sessionCount,
      }))
      .sort((a, b) => a.periodNumber - b.periodNumber)

    // Student rows with exact recovery formula
    const studentSubjectMap: Record<string, any> = {}
    for (const asgn of assignments) {
      const sub = (asgn as any).subjects as any
      const cls = (asgn as any).classes as any
      const subjectId = (asgn as any).subject_id
      const classId = (asgn as any).class_id
      const className = cls ? `${cls.name}-${cls.section}` : "Unknown"

      const relevantSessionIds = (allSessions ?? [])
        .filter((s: any) => s.subject_id === subjectId && s.class_id === classId)
        .map((s: any) => s.id)
      if (relevantSessionIds.length === 0) continue
      const rows = attendance.filter((a: any) => relevantSessionIds.includes(a.session_id))
      const byStudent: Record<string, any> = {}
      for (const row of rows) {
        const sid = row.student_id
        if (!byStudent[sid]) {
          const st = (row as any).student
          const userObj = Array.isArray(st?.user) ? st.user[0] : st?.user
          byStudent[sid] = {
            studentId: sid,
            name: userObj?.full_name ?? "Unknown",
            roll: st?.roll_number ?? "—",
            year: cls?.year || st?.year || "",
            present: 0,
            total: 0,
          }
        }
        byStudent[sid].total++
        if (row.status === "present") byStudent[sid].present++
      }
      for (const [sid, val] of Object.entries(byStudent)) {
        const key = `${sid}__${subjectId}__${classId}`
        studentSubjectMap[key] = {
          studentId: val.studentId,
          name: val.name,
          roll: val.roll,
          year: val.year,
          subject: sub?.name ?? "Unknown",
          className,
          attended: val.present,
          total: val.total,
        }
      }
    }

    const allStudentRows = Object.values(studentSubjectMap).map((v: any) => {
      const pct = v.total > 0 ? Math.round((v.attended / v.total) * 100) : 0
      const classesNeeded = pct < 75 ? Math.max(1, Math.ceil(3 * v.total - 4 * v.attended)) : 0
      return {
        ...v,
        percentage: pct,
        classesNeededFor75: classesNeeded,
      }
    })

    return NextResponse.json({
      subjectCards,
      chartData,
      summaryStats: { totalClasses, overallPct, belowThresholdCount },
      dayOfWeekStats,
      periodSlotStats,
      lowStudents: allStudentRows.filter((r: any) => r.percentage < 75).sort((a: any, b: any) => a.percentage - b.percentage),
      topStudents: allStudentRows.filter((r: any) => r.percentage >= 90).sort((a: any, b: any) => b.percentage - a.percentage).slice(0, 15),
    })
  } catch (e) {
    console.error("Analytics API error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
