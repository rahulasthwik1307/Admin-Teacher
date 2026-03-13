"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Award,
  Loader2,
  Users,
  CalendarDays,
  Activity,
  BarChart3,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  LabelList,
} from "recharts"
import { cn } from "@/lib/utils"

/* ── types ─────────────────────────────────────────────── */
const periods = ["This Week", "This Month", "This Semester"] as const
type Period = (typeof periods)[number]
type Trend = "Improving" | "Stable" | "Declining"

interface SubjectCard {
  assignmentId: string
  subjectId: string
  subjectName: string
  classId: string
  className: string
  percentage: number
  totalStudents: number
  totalClasses: number
  trend: Trend
  presentTotal: number
  absentTotal: number
  insight: string
}

interface ChartPoint {
  date: string
  percentage: number
  sessionId: string
}

interface StudentRow {
  name: string
  roll: string
  subject: string
  percentage: number
  attended: number
  total: number
}

/* ── date range helpers ────────────────────────────────── */
function getDateRange(period: Period): { from: string; to: string } {
  const now = new Date()
  const toStr = now.toISOString().split("T")[0]
  if (period === "This Week") {
    const day = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - ((day + 6) % 7))
    return { from: monday.toISOString().split("T")[0], to: toStr }
  }
  if (period === "This Month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1)
    return { from: from.toISOString().split("T")[0], to: toStr }
  }
  return { from: "2000-01-01", to: toStr }
}

function formatChartDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

/* ── color helpers ─────────────────────────────────────── */
function pctColor(pct: number) {
  if (pct >= 75) return "text-emerald-600"
  if (pct >= 60) return "text-amber-600"
  return "text-red-600"
}
function barColor(pct: number) {
  if (pct >= 75) return "#059669"
  if (pct >= 60) return "#d97706"
  return "#dc2626"
}

/* ── Insight generator ─────────────────────────────────── */
function generateInsight(
  percentage: number,
  trend: Trend,
  totalClasses: number,
  presentTotal: number,
  absentTotal: number,
  totalStudents: number
): string {
  if (totalClasses === 0) return "No sessions conducted yet."
  if (percentage === 100) return "Perfect attendance — every student present every class!"
  if (percentage === 0) return "No attendance recorded yet for this period."

  if (trend === "Improving" && percentage < 75)
    return `Trending up but still below 75% — keep monitoring closely.`
  if (trend === "Declining" && percentage >= 75)
    return `Attendance is slipping — was above target but now declining.`
  if (trend === "Declining" && percentage < 75)
    return `Critical: attendance is low and still dropping.`
  if (trend === "Improving" && percentage >= 75)
    return `Good progress — attendance is above target and improving.`
  if (percentage < 50)
    return `Very low attendance — immediate action recommended.`
  if (percentage < 75)
    return `Below 75% threshold — ${absentTotal} absences recorded across ${totalClasses} sessions.`
  if (percentage >= 90)
    return `Excellent attendance across ${totalClasses} session${totalClasses !== 1 ? "s" : ""}.`
  return `Stable attendance — ${presentTotal} present out of ${presentTotal + absentTotal} records.`
}

/* ── CircularProgress ──────────────────────────────────── */
function CircularProgress({ percentage, size = 100, strokeWidth = 9 }: {
  percentage: number; size?: number; strokeWidth?: number
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference
  const stroke = percentage >= 75 ? "#059669" : percentage >= 60 ? "#d97706" : "#dc2626"

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          strokeWidth={strokeWidth} className="stroke-muted" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          strokeWidth={strokeWidth} stroke={stroke} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      </svg>
      <span className={cn("absolute text-xl font-bold", pctColor(percentage))}>
        {percentage}%
      </span>
    </div>
  )
}

/* ── Custom bar label ──────────────────────────────────── */
function BarLabel(props: any) {
  const { x, y, width, value } = props
  if (value === undefined || value === null) return null
  return (
    <text
      x={x + width / 2}
      y={y - 5}
      fill={barColor(value)}
      textAnchor="middle"
      fontSize={11}
      fontWeight={600}
    >
      {value}%
    </text>
  )
}

/* ── CustomTooltip ─────────────────────────────────────── */
function CustomTooltip({ active, payload, label }: {
  active?: boolean; payload?: { value: number }[]; label?: string
}) {
  if (!active || !payload?.length) return null
  const pct = payload[0].value
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-sm font-semibold", pctColor(pct))}>{pct}%</p>
    </div>
  )
}

/* ── StudentTable ──────────────────────────────────────── */
function getRowTint(percentage: number, type: "low" | "top") {
  if (type === "top") {
    return "bg-card" // handled separately for medal rows
  }
  // low students
  if (percentage <= 40) return "bg-red-50/80 dark:bg-red-950/20 border-l-4 border-l-red-500"
  if (percentage <= 60) return "bg-orange-50/70 dark:bg-orange-950/20 border-l-4 border-l-orange-400"
  return "bg-amber-50/60 dark:bg-amber-950/20 border-l-4 border-l-amber-400"
}

function getMedalStyle(index: number) {
  if (index === 0) return "bg-yellow-50/80 dark:bg-yellow-950/20 border-l-4 border-l-yellow-400"
  if (index === 1) return "bg-slate-50/80 dark:bg-slate-800/30 border-l-4 border-l-slate-400"
  if (index === 2) return "bg-orange-50/60 dark:bg-orange-950/20 border-l-4 border-l-orange-300"
  return "bg-card"
}

function getMedalLabel(index: number) {
  if (index === 0) return <span className="text-xs">🥇</span>
  if (index === 1) return <span className="text-xs">🥈</span>
  if (index === 2) return <span className="text-xs">🥉</span>
  return null
}

function StudentTable({
  rows,
  colorClass,
  type,
}: {
  rows: StudentRow[]
  colorClass: string
  type: "low" | "top"
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
        No students found for this period.
      </div>
    )
  }

  return (
    <>
      {/* Desktop */}
      <div className="hidden rounded-xl border border-border bg-card overflow-hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {type === "top" && <th className="px-4 py-3 text-left font-medium text-muted-foreground w-10">#</th>}
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Student Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Roll Number</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Subject</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Attendance</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Attended</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total Classes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((st, idx) => (
              <tr
                key={st.roll + st.subject}
                className={cn(
                  "border-b border-border last:border-0 transition-colors",
                  type === "low" ? getRowTint(st.percentage, "low") : getMedalStyle(idx)
                )}
              >
                {type === "top" && (
                  <td className="px-4 py-3">{getMedalLabel(idx)}</td>
                )}
                <td className="px-4 py-3 font-semibold text-foreground">{st.name}</td>
                <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{st.roll}</td>
                <td className="px-4 py-3 text-foreground">{st.subject}</td>
                <td className={cn("px-4 py-3 text-right font-bold", colorClass)}>{st.percentage}%</td>
                <td className="px-4 py-3 text-right text-muted-foreground">{st.attended}</td>
                <td className="px-4 py-3 text-right text-muted-foreground">{st.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="flex flex-col gap-2 md:hidden">
        {rows.map((st, idx) => (
          <div
            key={st.roll + st.subject}
            className={cn(
              "rounded-xl border border-border p-4",
              type === "low" ? getRowTint(st.percentage, "low") : getMedalStyle(idx)
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                {type === "top" && getMedalLabel(idx)}
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-foreground">{st.name}</span>
                  <span className="text-xs text-muted-foreground font-mono">{st.roll}</span>
                </div>
              </div>
              <span className={cn("text-sm font-bold", colorClass)}>{st.percentage}%</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>{st.subject}</span>
              <span>{st.attended} / {st.total} classes</span>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

/* ── Page ──────────────────────────────────────────────── */
export default function AnalyticsPage() {
  const supabase = createClient()
  const [period, setPeriod] = useState<Period>("This Month")
  const [loading, setLoading] = useState(true)

  const [subjectCards, setSubjectCards] = useState<SubjectCard[]>([])
  const [chartData, setChartData] = useState<ChartPoint[]>([])
  const [lowStudents, setLowStudents] = useState<StudentRow[]>([])
  const [topStudents, setTopStudents] = useState<StudentRow[]>([])

  // Summary strip stats
  const [summaryStats, setSummaryStats] = useState({
    totalClasses: 0,
    overallPct: 0,
    belowThresholdCount: 0,
  })

  const fetchAnalytics = useCallback(async (selectedPeriod: Period) => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const teacherId = session.user.id
      const { from, to } = getDateRange(selectedPeriod)

      const { data: assignments } = await supabase
        .from("teacher_assignments")
        .select(`
          id, subject_id, class_id,
          subjects ( id, name ),
          classes ( id, name, section )
        `)
        .eq("teacher_id", teacherId)

      if (!assignments || assignments.length === 0) {
        setSubjectCards([])
        setChartData([])
        setLowStudents([])
        setTopStudents([])
        setSummaryStats({ totalClasses: 0, overallPct: 0, belowThresholdCount: 0 })
        setLoading(false)
        return
      }

      const { data: allSessions } = await supabase
        .from("attendance_sessions")
        .select("id, session_date, subject_id, class_id")
        .eq("teacher_id", teacherId)
        .eq("status", "finalized")
        .gte("session_date", from)
        .lte("session_date", to)
        .order("session_date", { ascending: true })

      const sessionIds = (allSessions ?? []).map((s: any) => s.id)

      const { data: allAttendance } = sessionIds.length > 0
        ? await supabase
            .from("period_attendance")
            .select(`
              session_id, student_id, status,
              students ( id, roll_number, class_id, users ( full_name ) )
            `)
            .in("session_id", sessionIds)
            .in("status", ["present", "absent"])
        : { data: [] }

      const attendance = allAttendance ?? []

      /* ── Subject cards ── */
      const cards: SubjectCard[] = []

      for (const asgn of assignments) {
        const sub = asgn.subjects as any
        const cls = asgn.classes as any
        const subjectId = asgn.subject_id
        const classId = asgn.class_id

        const relevantSessions = (allSessions ?? []).filter(
          (s: any) => s.subject_id === subjectId && s.class_id === classId
        )
        const relevantSessionIds = relevantSessions.map((s: any) => s.id)
        const rows = attendance.filter((a: any) => relevantSessionIds.includes(a.session_id))

        const { count: studentCount } = await supabase
          .from("students")
          .select("id", { count: "exact", head: true })
          .eq("class_id", classId)
          .eq("is_active", true)

        const totalClasses = relevantSessions.length
        const presentTotal = rows.filter((r: any) => r.status === "present").length
        const absentTotal = rows.filter((r: any) => r.status === "absent").length
        const totalRows = rows.length
        const percentage = totalRows > 0 ? Math.round((presentTotal / totalRows) * 100) : 0

        let trend: Trend = "Stable"
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

        const insight = generateInsight(percentage, trend, totalClasses, presentTotal, absentTotal, studentCount ?? 0)

        cards.push({
          assignmentId: asgn.id,
          subjectId,
          subjectName: sub?.name ?? "Unknown",
          classId,
          // hyphen format CSE-A
          className: cls ? `${cls.name}-${cls.section}` : "Unknown",
          percentage,
          totalStudents: studentCount ?? 0,
          totalClasses,
          trend,
          presentTotal,
          absentTotal,
          insight,
        })
      }

      setSubjectCards(cards)

      /* ── Summary strip stats ── */
      const totalClasses = (allSessions ?? []).length
      const overallPresent = attendance.filter((a: any) => a.status === "present").length
      const overallTotal = attendance.length
      const overallPct = overallTotal > 0 ? Math.round((overallPresent / overallTotal) * 100) : 0

      // Count unique student+subject combos below 75%
      const studentSubjectPct: Record<string, { present: number; total: number }> = {}
      for (const asgn of assignments) {
        const subjectId = asgn.subject_id
        const classId = asgn.class_id
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

      setSummaryStats({ totalClasses, overallPct, belowThresholdCount })

      /* ── Chart data ── */
      const last8 = [...(allSessions ?? [])]
        .sort((a: any, b: any) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime())
        .slice(0, 8)
        .reverse()

      const chartPoints: ChartPoint[] = last8.map((s: any) => {
        const rows = attendance.filter((a: any) => a.session_id === s.id)
        const present = rows.filter((a: any) => a.status === "present").length
        const pct = rows.length > 0 ? Math.round((present / rows.length) * 100) : 0
        return { date: formatChartDate(s.session_date), percentage: pct, sessionId: s.id }
      })
      setChartData(chartPoints)

      /* ── Student rows ── */
      const studentSubjectMap: Record<string, {
        name: string; roll: string; subject: string; attended: number; total: number
      }> = {}

      for (const asgn of assignments) {
        const sub = asgn.subjects as any
        const subjectId = asgn.subject_id
        const classId = asgn.class_id
        const relevantSessionIds = (allSessions ?? [])
          .filter((s: any) => s.subject_id === subjectId && s.class_id === classId)
          .map((s: any) => s.id)
        if (relevantSessionIds.length === 0) continue
        const rows = attendance.filter((a: any) => relevantSessionIds.includes(a.session_id))
        const byStudent: Record<string, { present: number; total: number; name: string; roll: string }> = {}
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

      const allStudentRows: StudentRow[] = Object.values(studentSubjectMap).map(v => ({
        ...v,
        percentage: v.total > 0 ? Math.round((v.attended / v.total) * 100) : 0,
      }))

      setLowStudents(allStudentRows.filter(r => r.percentage < 75).sort((a, b) => a.percentage - b.percentage).slice(0, 10))
      setTopStudents(allStudentRows.filter(r => r.percentage >= 90).sort((a, b) => b.percentage - a.percentage).slice(0, 10))

    } catch (e) {
      console.error("Analytics fetch error:", e)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => { fetchAnalytics(period) }, [period, fetchAnalytics])

  return (
    <div className="flex flex-col gap-8">
      <p className="text-sm text-muted-foreground -mt-1">
        Attendance insights for your subjects.
      </p>

      {/* ── Summary strip ──────────────────────────────────── */}
      {!loading && (
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-2.5 shadow-sm">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <CalendarDays className="size-4 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Total Classes</span>
              <span className="text-sm font-bold text-foreground">{summaryStats.totalClasses}</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-2.5 shadow-sm">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <Activity className="size-4 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Overall Attendance</span>
              <span className={cn("text-sm font-bold", pctColor(summaryStats.overallPct))}>
                {summaryStats.overallPct}%
              </span>
            </div>
          </div>
          {summaryStats.belowThresholdCount > 0 && (
            <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 px-4 py-2.5 shadow-sm">
              <div className="flex size-8 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/40">
                <Users className="size-4 text-red-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-red-700 dark:text-red-400">Students Below 75%</span>
                <span className="text-sm font-bold text-red-800 dark:text-red-300">
                  {summaryStats.belowThresholdCount} student{summaryStats.belowThresholdCount !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Period selector ────────────────────────────────── */}
      <div className="flex items-center gap-1 self-start rounded-xl bg-muted p-1 shadow-sm">
        {periods.map((p) => {
          const Icon = p === "This Week" ? CalendarDays : p === "This Month" ? TrendingUp : BarChart3
          const isActive = period === p
          return (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-3.5" />
              {p}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* ── Subject cards ──────────────────────────────── */}
          {subjectCards.length === 0 ? (
            <div className="rounded-xl border border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
              No subjects assigned yet. Ask your admin to assign subjects.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {subjectCards.map((sub) => {
                const totalRecords = sub.presentTotal + sub.absentTotal
                const presentPct = totalRecords > 0 ? (sub.presentTotal / totalRecords) * 100 : 0

                return (
                  <div
                    key={sub.assignmentId}
                    className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-foreground">{sub.subjectName}</h3>
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary mt-1">
                          {sub.className}
                        </span>
                      </div>
                      {/* Trend badge */}
                      <div className={cn(
                        "flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold shrink-0",
                        sub.trend === "Improving" && "bg-emerald-100 text-emerald-700",
                        sub.trend === "Stable" && "bg-muted text-muted-foreground",
                        sub.trend === "Declining" && "bg-red-100 text-red-700",
                      )}>
                        {sub.trend === "Improving" && <TrendingUp className="size-3" />}
                        {sub.trend === "Stable" && <Minus className="size-3" />}
                        {sub.trend === "Declining" && <TrendingDown className="size-3" />}
                        {sub.trend}
                      </div>
                    </div>

                    {/* Circular progress centered */}
                    <div className="flex justify-center">
                      <CircularProgress percentage={sub.percentage} size={100} strokeWidth={9} />
                    </div>

                    {/* Present / Absent mini bar */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span className="text-emerald-600 font-medium">{sub.presentTotal} present</span>
                        <span className="text-red-500 font-medium">{sub.absentTotal} absent</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                          style={{ width: `${presentPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
                      <span>{sub.totalStudents} students</span>
                      <span className="text-border">|</span>
                      <span>{sub.totalClasses} class{sub.totalClasses !== 1 ? "es" : ""}</span>
                    </div>

                    {/* Insight callout */}
                    <div className={cn(
                      "rounded-lg px-3 py-2 text-xs leading-relaxed",
                      sub.percentage >= 75
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                        : sub.percentage >= 60
                        ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                        : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                    )}>
                      {sub.insight}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Bar chart ──────────────────────────────────── */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">
                Attendance Trend — Last 8 Sessions
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="h-px w-6 border-t-2 border-dashed border-amber-500" />
                75% target
              </div>
            </div>
            {chartData.length === 0 ? (
              <div className="rounded-xl border border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
                No sessions found for this period.
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} margin={{ top: 24, right: 8, bottom: 0, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                      tickLine={false} axisLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                      tickLine={false} axisLine={false}
                      tickFormatter={(v: number) => `${v}%`}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--color-muted)", opacity: 0.4 }} />
                    {/* 75% threshold dashed line */}
                    <ReferenceLine
                      y={75}
                      stroke="#d97706"
                      strokeDasharray="5 4"
                      strokeWidth={1.5}
                    />
                    <Bar dataKey="percentage" radius={[6, 6, 0, 0]} maxBarSize={48}>
                      <LabelList dataKey="percentage" content={<BarLabel />} />
                      {chartData.map((entry, idx) => (
                        <Cell key={idx} fill={barColor(entry.percentage)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* ── Students needing attention ──────────────────── */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-red-500" />
              <h2 className="text-base font-semibold text-foreground">
                Students Needing Attention
                <span className="ml-2 text-sm font-normal text-muted-foreground">(below 75%)</span>
              </h2>
              {lowStudents.length > 0 && (
                <span className="ml-auto inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                  {lowStudents.length} student{lowStudents.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {/* Legend */}
            {lowStudents.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded-sm bg-red-400" /> 0–40% Critical
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded-sm bg-orange-400" /> 41–60% Warning
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded-sm bg-amber-400" /> 61–74% At Risk
                </span>
              </div>
            )}

            <StudentTable rows={lowStudents} colorClass="text-red-600" type="low" />
          </div>

          {/* ── Top performers ──────────────────────────────── */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Award className="size-5 text-emerald-600" />
              <h2 className="text-base font-semibold text-foreground">
                Top Performers
                <span className="ml-2 text-sm font-normal text-muted-foreground">(90% and above)</span>
              </h2>
              {topStudents.length > 0 && (
                <span className="ml-auto inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                  {topStudents.length} student{topStudents.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <StudentTable rows={topStudents} colorClass="text-emerald-600" type="top" />
          </div>
        </>
      )}
    </div>
  )
}