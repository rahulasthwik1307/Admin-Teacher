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
} from "recharts"

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
}

interface ChartPoint {
  date: string
  percentage: number
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
    const day = now.getDay() // 0=Sun
    const monday = new Date(now)
    monday.setDate(now.getDate() - ((day + 6) % 7))
    return { from: monday.toISOString().split("T")[0], to: toStr }
  }
  if (period === "This Month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1)
    return { from: from.toISOString().split("T")[0], to: toStr }
  }
  // This Semester = all data, use a far past date
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

/* ── CircularProgress ──────────────────────────────────── */
function CircularProgress({ percentage, size = 110, strokeWidth = 10 }: {
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
      <span className={`absolute text-2xl font-bold ${pctColor(percentage)}`}>
        {percentage}%
      </span>
    </div>
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
      <p className={`text-sm font-semibold ${pctColor(pct)}`}>{pct}%</p>
    </div>
  )
}

/* ── StudentTable ──────────────────────────────────────── */
function StudentTable({ rows, colorClass }: { rows: StudentRow[]; colorClass: string }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
        No students found for this period.
      </div>
    )
  }
  return (
    <>
      {/* Desktop */}
      <div className="hidden rounded-lg border border-border bg-card md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Student Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Roll Number</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Subject</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Attendance</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Attended</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total Classes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((st) => (
                <tr key={st.roll + st.subject}
                  className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{st.name}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{st.roll}</td>
                  <td className="px-4 py-3 text-foreground">{st.subject}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${colorClass}`}>{st.percentage}%</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{st.attended}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{st.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Mobile */}
      <div className="flex flex-col gap-3 md:hidden">
        {rows.map((st) => (
          <div key={st.roll + st.subject}
            className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">{st.name}</span>
                <span className="text-xs text-muted-foreground font-mono">{st.roll}</span>
              </div>
              <span className={`text-sm font-semibold ${colorClass}`}>{st.percentage}%</span>
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

/* ── page ──────────────────────────────────────────────── */
export default function AnalyticsPage() {
  const supabase = createClient()
  const [period, setPeriod] = useState<Period>("This Month")
  const [loading, setLoading] = useState(true)

  const [subjectCards, setSubjectCards] = useState<SubjectCard[]>([])
  const [chartData, setChartData] = useState<ChartPoint[]>([])
  const [lowStudents, setLowStudents] = useState<StudentRow[]>([])
  const [topStudents, setTopStudents] = useState<StudentRow[]>([])

  const fetchAnalytics = useCallback(async (selectedPeriod: Period) => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const teacherId = session.user.id
      const { from, to } = getDateRange(selectedPeriod)

      // ── 1. Get teacher's assignments (subject + class combos) ──
      const { data: assignments } = await supabase
        .from("teacher_assignments")
        .select(`
          id,
          subject_id,
          class_id,
          subjects ( id, name ),
          classes ( id, name, section )
        `)
        .eq("teacher_id", teacherId)

      if (!assignments || assignments.length === 0) {
        setSubjectCards([])
        setChartData([])
        setLowStudents([])
        setTopStudents([])
        setLoading(false)
        return
      }

      // ── 2. Get all finalized sessions for this teacher in date range ──
      const { data: allSessions } = await supabase
        .from("attendance_sessions")
        .select("id, session_date, subject_id, class_id")
        .eq("teacher_id", teacherId)
        .eq("status", "finalized")
        .gte("session_date", from)
        .lte("session_date", to)
        .order("session_date", { ascending: true })

      const sessionIds = (allSessions ?? []).map((s: any) => s.id)

      // ── 3. Get all period_attendance for these sessions ──
      const { data: allAttendance } = sessionIds.length > 0
        ? await supabase
            .from("period_attendance")
            .select(`
              session_id,
              student_id,
              status,
              students (
                id,
                roll_number,
                class_id,
                users ( full_name )
              )
            `)
            .in("session_id", sessionIds)
            .in("status", ["present", "absent"])
        : { data: [] }

      const attendance = allAttendance ?? []

      // ── 4. Build subject cards ──────────────────────────
      const cards: SubjectCard[] = []

      for (const asgn of assignments) {
        const sub = asgn.subjects as any
        const cls = asgn.classes as any
        const subjectId = asgn.subject_id
        const classId = asgn.class_id

        // Sessions for this subject+class
        const relevantSessions = (allSessions ?? []).filter(
          (s: any) => s.subject_id === subjectId && s.class_id === classId
        )
        const relevantSessionIds = relevantSessions.map((s: any) => s.id)

        // Attendance rows for these sessions
        const rows = attendance.filter((a: any) => relevantSessionIds.includes(a.session_id))

        // Count unique students in this class
        const { count: studentCount } = await supabase
          .from("students")
          .select("id", { count: "exact", head: true })
          .eq("class_id", classId)
          .eq("is_active", true)

        const totalClasses = relevantSessions.length
        const totalPresent = rows.filter((r: any) => r.status === "present").length
        const totalRows = rows.length
        const percentage = totalRows > 0 ? Math.round((totalPresent / totalRows) * 100) : 0

        // Trend: compare last 3 sessions avg vs prev 3 sessions avg
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
            const p = r.filter((a: any) => a.status === "present").length
            return (p / r.length) * 100
          }

          const recentAvg = avgPct(recent3)
          const prevAvg = avgPct(prev3)
          const diff = recentAvg - prevAvg

          if (diff > 5) trend = "Improving"
          else if (diff < -5) trend = "Declining"
          else trend = "Stable"
        }

        cards.push({
          assignmentId: asgn.id,
          subjectId,
          subjectName: sub?.name ?? "Unknown",
          classId,
          className: cls ? `${cls.name} ${cls.section}` : "Unknown",
          percentage,
          totalStudents: studentCount ?? 0,
          totalClasses,
          trend,
        })
      }

      setSubjectCards(cards)

      // ── 5. Build chart data — last 8 sessions overall ──
      const last8 = [...(allSessions ?? [])]
        .sort((a: any, b: any) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime())
        .slice(0, 8)
        .reverse()

      const chartPoints: ChartPoint[] = last8.map((s: any) => {
        const rows = attendance.filter((a: any) => a.session_id === s.id)
        const present = rows.filter((a: any) => a.status === "present").length
        const pct = rows.length > 0 ? Math.round((present / rows.length) * 100) : 0
        return { date: formatChartDate(s.session_date), percentage: pct }
      })

      setChartData(chartPoints)

      // ── 6. Per-student stats across all sessions ────────
      // Map: studentId → { subjectName, attended, total }
      // We track per-student per-subject (one entry per assignment)
      const studentSubjectMap: Record<string, {
        name: string; roll: string; subject: string
        attended: number; total: number
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

        // Group by student
        const byStudent: Record<string, { present: number; total: number; name: string; roll: string }> = {}
        for (const row of rows) {
          const sid = row.student_id
          if (!byStudent[sid]) {
            const st = row.students as any
            byStudent[sid] = {
              name: st?.users?.full_name ?? "Unknown",
              roll: st?.roll_number ?? "—",
              present: 0,
              total: 0,
            }
          }
          byStudent[sid].total++
          if (row.status === "present") byStudent[sid].present++
        }

        for (const [sid, val] of Object.entries(byStudent)) {
          const key = `${sid}__${subjectId}`
          studentSubjectMap[key] = {
            name: val.name,
            roll: val.roll,
            subject: sub?.name ?? "Unknown",
            attended: val.present,
            total: val.total,
          }
        }
      }

      // Convert to rows with percentage
      const allStudentRows: StudentRow[] = Object.values(studentSubjectMap).map((v) => ({
        ...v,
        percentage: v.total > 0 ? Math.round((v.attended / v.total) * 100) : 0,
      }))

      // Low: below 75%, sorted ascending
      const low = allStudentRows
        .filter((r) => r.percentage < 75)
        .sort((a, b) => a.percentage - b.percentage)
        .slice(0, 10)

      // Top: 90%+, sorted descending
      const top = allStudentRows
        .filter((r) => r.percentage >= 90)
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, 10)

      setLowStudents(low)
      setTopStudents(top)

    } catch (e) {
      console.error("Analytics fetch error:", e)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchAnalytics(period)
  }, [period, fetchAnalytics])

  return (
    <div className="flex flex-col gap-8">
      <p className="text-sm text-muted-foreground -mt-1">
        Attendance insights for your subjects.
      </p>

      {/* ── Period selector ────────────────────────────── */}
      <div className="flex items-center gap-1 rounded-lg bg-muted p-1 self-start">
        {periods.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              period === p
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* ── Subject cards ──────────────────────────── */}
          {subjectCards.length === 0 ? (
            <div className="rounded-lg border border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
              No subjects assigned yet. Ask your admin to assign subjects.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {subjectCards.map((sub) => (
                <div key={sub.assignmentId}
                  className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card p-6">
                  <div className="text-center">
                    <h3 className="text-sm font-semibold text-foreground">{sub.subjectName}</h3>
                    <p className="text-xs text-muted-foreground">{sub.className}</p>
                  </div>
                  <CircularProgress percentage={sub.percentage} size={110} strokeWidth={10} />
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{sub.totalStudents} students</span>
                    <span className="text-border">|</span>
                    <span>{sub.totalClasses} classes</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {sub.trend === "Improving" && (
                      <><TrendingUp className="size-4 text-emerald-600" />
                        <span className="text-sm font-medium text-emerald-600">Improving</span></>
                    )}
                    {sub.trend === "Stable" && (
                      <><Minus className="size-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">Stable</span></>
                    )}
                    {sub.trend === "Declining" && (
                      <><TrendingDown className="size-4 text-red-600" />
                        <span className="text-sm font-medium text-red-600">Declining</span></>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Bar chart ──────────────────────────────── */}
          <div className="flex flex-col gap-4">
            <h2 className="text-base font-semibold text-foreground">
              Attendance Trend — Last 8 Sessions
            </h2>
            {chartData.length === 0 ? (
              <div className="rounded-xl border border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
                No sessions found for this period.
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                    <XAxis dataKey="date"
                      tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                      tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]}
                      tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                      tickLine={false} axisLine={false}
                      tickFormatter={(v: number) => `${v}%`} />
                    <Tooltip content={<CustomTooltip />}
                      cursor={{ fill: "var(--color-muted)", opacity: 0.4 }} />
                    <Bar dataKey="percentage" radius={[6, 6, 0, 0]} maxBarSize={48}>
                      {chartData.map((entry, idx) => (
                        <Cell key={idx} fill={barColor(entry.percentage)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* ── Students needing attention ─────────────── */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-red-500" />
              <h2 className="text-base font-semibold text-foreground">
                Students Needing Attention
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  (below 75%)
                </span>
              </h2>
            </div>
            <StudentTable rows={lowStudents} colorClass="text-red-600" />
          </div>

          {/* ── Top performers ─────────────────────────── */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Award className="size-5 text-emerald-600" />
              <h2 className="text-base font-semibold text-foreground">
                Top Performers
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  (90% and above)
                </span>
              </h2>
            </div>
            <StudentTable rows={topStudents} colorClass="text-emerald-600" />
          </div>
        </>
      )}
    </div>
  )
}