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
      const to = now.toISOString().split("T")[0]
      if (p === "This Week") {
        const day = now.getDay()
        const monday = new Date(now)
        monday.setDate(now.getDate() - ((day + 6) % 7))
        return { from: monday.toISOString().split("T")[0], to }
      }
      if (p === "This Month") {
        const from = new Date(now.getFullYear(), now.getMonth(), 1)
        return { from: from.toISOString().split("T")[0], to }
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
          classes ( id, name, section )
        `)
        .eq("teacher_id", teacherId),
      supabase
        .from("attendance_sessions")
        .select("id, session_date, subject_id, class_id")
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
        summaryStats: { totalClasses: 0, overallPct: 0, belowThresholdCount: 0 },
      })
    }

    const sessionIds = (allSessions ?? []).map((s: any) => s.id)

    // Fetch attendance + student counts in parallel
    const [{ data: allAttendance }, ...studentCountResults] = await Promise.all([
      sessionIds.length > 0
        ? supabase
            .from("period_attendance")
            .select(`
              session_id, student_id, status,
              students ( id, roll_number, class_id, users ( full_name ) )
            `)
            .in("session_id", sessionIds)
            .in("status", ["present", "absent"])
        : Promise.resolve({ data: [] }),
      // Get student counts per class in one shot
      ...assignments.map((asgn: any) =>
        supabase
          .from("students")
          .select("id", { count: "exact", head: true })
          .eq("class_id", asgn.class_id)
          .eq("is_active", true)
      ),
    ])

    const attendance = allAttendance ?? []

    // Build student count map
    const studentCountMap = new Map<string, number>()
    assignments.forEach((asgn: any, idx: number) => {
      studentCountMap.set(asgn.class_id, (studentCountResults[idx] as any).count ?? 0)
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
        const key = `${row.student_id}__${subjectId}`
        if (!studentSubjectPct[key]) studentSubjectPct[key] = { present: 0, total: 0 }
        studentSubjectPct[key].total++
        if (row.status === "present") studentSubjectPct[key].present++
      }
    }
    const belowThresholdCount = Object.values(studentSubjectPct).filter(
      v => v.total > 0 && Math.round((v.present / v.total) * 100) < 75
    ).length

    // Chart data — last 8 sessions
    const last8 = [...(allSessions ?? [])]
      .sort((a: any, b: any) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime())
      .slice(0, 8).reverse()

    const chartData = last8.map((s: any) => {
      const rows = attendance.filter((a: any) => a.session_id === s.id)
      const present = rows.filter((a: any) => a.status === "present").length
      const pct = rows.length > 0 ? Math.round((present / rows.length) * 100) : 0
      const d = new Date(s.session_date + "T00:00:00")
      return {
        date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        percentage: pct,
        sessionId: s.id,
      }
    })

    // Student rows
    const studentSubjectMap: Record<string, any> = {}
    for (const asgn of assignments) {
      const sub = (asgn as any).subjects as any
      const subjectId = (asgn as any).subject_id
      const classId = (asgn as any).class_id
      const relevantSessionIds = (allSessions ?? [])
        .filter((s: any) => s.subject_id === subjectId && s.class_id === classId)
        .map((s: any) => s.id)
      if (relevantSessionIds.length === 0) continue
      const rows = attendance.filter((a: any) => relevantSessionIds.includes(a.session_id))
      const byStudent: Record<string, any> = {}
      for (const row of rows) {
        const sid = row.student_id
        if (!byStudent[sid]) {
          const st = row.students as any
          byStudent[sid] = { name: st?.users?.full_name ?? "Unknown", roll: st?.roll_number ?? "—", present: 0, total: 0 }
        }
        byStudent[sid].total++
        if (row.status === "present") byStudent[sid].present++
      }
      for (const [sid, val] of Object.entries(byStudent)) {
        studentSubjectMap[`${sid}__${subjectId}`] = {
          name: val.name, roll: val.roll,
          subject: sub?.name ?? "Unknown",
          attended: val.present, total: val.total,
        }
      }
    }

    const allStudentRows = Object.values(studentSubjectMap).map((v: any) => ({
      ...v,
      percentage: v.total > 0 ? Math.round((v.attended / v.total) * 100) : 0,
    }))

    return NextResponse.json({
      subjectCards,
      chartData,
      summaryStats: { totalClasses, overallPct, belowThresholdCount },
      lowStudents: allStudentRows.filter((r: any) => r.percentage < 75).sort((a: any, b: any) => a.percentage - b.percentage).slice(0, 10),
      topStudents: allStudentRows.filter((r: any) => r.percentage >= 90).sort((a: any, b: any) => b.percentage - a.percentage).slice(0, 10),
    })
  } catch (e) {
    console.error("Analytics API error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
