"use client"

import { useState } from "react"
import { motion, useReducedMotion, type Variants } from "framer-motion"
import { Skeleton } from "@/components/ui/skeleton"
import { CardSkeleton, ChartSkeleton } from "@/components/ui/skeletons"
import { Card, CardContent } from "@/components/ui/card"
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Award,
  Users,
  CalendarDays,
  Activity,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  GraduationCap,
  Building2,
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

import {
  useAnalytics,
  Period,
  SubjectCard,
  ChartPoint,
  StudentRow,
} from "@/hooks/use-analytics"

/* ── types ─────────────────────────────────────────────── */
const periods = ["This Week", "This Month", "This Semester"] as const
type Trend = "Improving" | "Stable" | "Declining"

/* ── Academic Year Color Themes ────────────────────────── */
interface YearTheme {
  badge: string
  dot: string
}

function getYearTheme(yearStr?: string): YearTheme {
  const y = (yearStr || "").toLowerCase()
  if (y.includes("4") || y.includes("iv") || y.includes("four")) {
    return {
      badge: "bg-purple-500/15 text-purple-800 dark:text-purple-200 border-purple-300/80 dark:border-purple-700/80 font-bold shadow-2xs",
      dot: "bg-purple-600 dark:bg-purple-400",
    }
  }
  if (y.includes("3") || y.includes("iii") || y.includes("three")) {
    return {
      badge: "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-300/80 dark:border-amber-700/80 font-bold shadow-2xs",
      dot: "bg-amber-600 dark:bg-amber-400",
    }
  }
  if (y.includes("2") || y.includes("ii") || y.includes("two")) {
    return {
      badge: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-300/80 dark:border-emerald-700/80 font-bold shadow-2xs",
      dot: "bg-emerald-600 dark:bg-emerald-400",
    }
  }
  if (y.includes("1") || y.includes("i") || y.includes("one")) {
    return {
      badge: "bg-sky-500/15 text-sky-800 dark:text-sky-200 border-sky-300/80 dark:border-sky-700/80 font-bold shadow-2xs",
      dot: "bg-sky-600 dark:bg-sky-400",
    }
  }
  return {
    badge: "bg-muted text-muted-foreground border-border font-bold",
    dot: "bg-muted-foreground",
  }
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
  if (pct >= 75) return "text-emerald-600 dark:text-emerald-400"
  if (pct >= 60) return "text-amber-600 dark:text-amber-400"
  return "text-rose-600 dark:text-rose-400"
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
function CircularProgress({ percentage, size = 104, strokeWidth = 9 }: {
  percentage: number; size?: number; strokeWidth?: number
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference
  const stroke = percentage >= 75 ? "#059669" : percentage >= 60 ? "#d97706" : "#dc2626"

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted/60 dark:stroke-muted/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          stroke={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className={cn("text-2xl font-black tracking-tight", pctColor(percentage))}>
          {percentage}%
        </span>
      </div>
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
      y={y - 6}
      fill={barColor(value)}
      textAnchor="middle"
      fontSize={11}
      fontWeight={700}
    >
      {value}%
    </text>
  )
}

/* ── Custom X-Axis Tick (Disambiguates Multi-Session Dates) ── */
function CustomXAxisTick(props: any) {
  const { x, y, payload, chartData } = props
  if (!payload) return null
  const index = payload.index
  const rawDate = payload.value

  let label = rawDate
  if (chartData && Array.isArray(chartData) && chartData.length > 0) {
    const matchingIndices = chartData
      .map((item: any, i: number) => (item.date === rawDate ? i : -1))
      .filter((i: number) => i !== -1)
    if (matchingIndices.length > 1) {
      const sessionNum = matchingIndices.indexOf(index) + 1
      label = `${rawDate} (S${sessionNum})`
    }
  }

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={14}
        textAnchor="middle"
        className="text-[11px] font-semibold fill-muted-foreground"
      >
        {label}
      </text>
    </g>
  )
}

/* ── CustomTooltip ─────────────────────────────────────── */
function CustomTooltip({ active, payload, label }: {
  active?: boolean; payload?: { value: number }[]; label?: string
}) {
  if (!active || !payload?.length) return null
  const pct = payload[0].value
  return (
    <div className="rounded-xl border border-border/80 bg-card/95 backdrop-blur-md px-3.5 py-2.5 shadow-lg">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mb-1">
        <CalendarDays className="size-3 text-muted-foreground/70" />
        <span>{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className={cn("text-base font-extrabold tracking-tight", pctColor(pct))}>
          {pct}%
        </span>
        <span className="text-[11px] font-semibold text-muted-foreground">
          {pct >= 75 ? "Target Met" : "Below 75%"}
        </span>
      </div>
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
      <div className="rounded-2xl border border-border/80 bg-card px-4 py-10 text-center text-sm text-muted-foreground">
        No students found for this period.
      </div>
    )
  }

  return (
    <>
      {/* Desktop */}
      <div className="hidden rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/80 bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
              {type === "top" && <th className="px-4 py-3.5 text-left w-12">#</th>}
              <th className="px-4 py-3.5 text-left">Student Name</th>
              <th className="px-4 py-3.5 text-left">Roll Number</th>
              <th className="px-4 py-3.5 text-left">Subject & Cohort</th>
              <th className="px-4 py-3.5 text-right">Attendance</th>
              <th className="px-4 py-3.5 text-right">Attended</th>
              <th className="px-4 py-3.5 text-right">Total Classes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.map((st, idx) => {
              const yrTheme = getYearTheme(st.year)
              return (
                <tr
                  key={`${st.roll}-${st.subject}-${st.className || ""}-${st.year || ""}-${idx}`}
                  className={cn(
                    "transition-colors duration-150 hover:bg-muted/30",
                    type === "low" ? getRowTint(st.percentage, "low") : getMedalStyle(idx)
                  )}
                >
                  {type === "top" && (
                    <td className="px-4 py-3.5 text-base">{getMedalLabel(idx)}</td>
                  )}
                  <td className="px-4 py-3.5 font-semibold text-foreground">{st.name}</td>
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-xs text-muted-foreground bg-muted/70 border border-border/60 px-2 py-0.5 rounded-md font-semibold">
                      {st.roll}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-foreground font-semibold text-sm">{st.subject}</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {st.className && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300">
                            <Building2 className="size-2.5" />
                            {st.className}
                          </span>
                        )}
                        {st.year && (
                          <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold border", yrTheme.badge)}>
                            <GraduationCap className="size-2.5" />
                            {st.year}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className={cn("px-4 py-3.5 text-right font-extrabold text-sm", colorClass)}>
                    {st.percentage}%
                  </td>
                  <td className="px-4 py-3.5 text-right font-medium text-muted-foreground">{st.attended}</td>
                  <td className="px-4 py-3.5 text-right font-medium text-muted-foreground">{st.total}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="flex flex-col gap-2.5 md:hidden">
        {rows.map((st, idx) => {
          const yrTheme = getYearTheme(st.year)
          return (
            <div
              key={`${st.roll}-${st.subject}-${st.className || ""}-${st.year || ""}-${idx}`}
              className={cn(
                "rounded-xl border border-border/80 p-4 shadow-2xs flex flex-col gap-2.5",
                type === "low" ? getRowTint(st.percentage, "low") : getMedalStyle(idx)
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {type === "top" && <span className="text-base">{getMedalLabel(idx)}</span>}
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold text-foreground">{st.name}</span>
                    <span className="font-mono text-xs text-muted-foreground bg-muted/70 border border-border/60 px-1.5 py-0.5 rounded font-semibold self-start">
                      {st.roll}
                    </span>
                  </div>
                </div>
                <span className={cn("text-sm font-extrabold", colorClass)}>{st.percentage}%</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 text-xs text-muted-foreground border-t border-border/40 pt-2 font-medium">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-foreground font-bold">{st.subject}</span>
                  {st.className && (
                    <span className="inline-flex items-center gap-1 rounded bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300">
                      <Building2 className="size-2.5" />
                      {st.className}
                    </span>
                  )}
                  {st.year && (
                    <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold border", yrTheme.badge)}>
                      <GraduationCap className="size-2.5" />
                      {st.year}
                    </span>
                  )}
                </div>
                <span className="font-medium">{st.attended} / {st.total} classes</span>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

/* ── Page ──────────────────────────────────────────────── */
export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>("This Month")
  const { data, isLoading: loading } = useAnalytics(period)
  const shouldReduceMotion = useReducedMotion()

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.06,
      },
    },
  }

  const itemVariants: Variants = {
    hidden: shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: "easeOut",
      },
    },
  }

  const subjectCards = data?.subjectCards ?? []
  const chartData = data?.chartData ?? []
  const lowStudents = data?.lowStudents ?? []
  const topStudents = data?.topStudents ?? []
  const summaryStats = data?.summaryStats ?? { totalClasses: 0, overallPct: 0, belowThresholdCount: 0 }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-7"
    >
      {/* ── Header Title & Subtitle ── */}
      <motion.div variants={itemVariants} className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">
          Attendance performance and cohort insights across your assigned subjects.
        </p>
      </motion.div>

      {/* ── Period selector ────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <div className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-muted/60 p-1.5 self-start shadow-2xs">
          {periods.map((p) => {
            const Icon = p === "This Week" ? CalendarDays : p === "This Month" ? TrendingUp : BarChart3
            const isActive = period === p
            return (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "relative flex items-center gap-2 rounded-lg px-4 h-9.5 text-xs font-semibold transition-all cursor-pointer",
                  isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeAnalyticsPeriodTab"
                    className="absolute inset-0 rounded-lg bg-background border border-border/80 shadow-xs"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Icon className={cn("size-3.5", isActive ? "text-primary" : "text-muted-foreground")} />
                  <span>{p}</span>
                </span>
              </button>
            )
          })}
        </div>
      </motion.div>

      {/* ── Summary strip ──────────────────────────────────── */}
      {!loading && (
        <motion.div variants={itemVariants}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 lg:gap-4">
            {/* Card 1: Total Classes */}
            <div className="group relative overflow-hidden rounded-xl border border-sky-200/80 bg-linear-to-b from-sky-500/5 via-card to-card p-3.5 lg:p-4 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-sky-300 dark:border-sky-900/50 dark:from-sky-950/20">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex size-8.5 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                  <CalendarDays className="size-4.5" />
                </div>
                <span className="rounded-md bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">
                  Sessions
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground leading-none">
                  {summaryStats.totalClasses}
                </span>
                <span className="text-xs font-semibold text-foreground/80 mt-1">
                  Total Classes
                </span>
                <span className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                  <BookOpen className="size-3 text-sky-500 shrink-0" />
                  Conducted in selected period
                </span>
              </div>
            </div>

            {/* Card 2: Overall Attendance */}
            <div className="group relative overflow-hidden rounded-xl border border-emerald-200/80 bg-linear-to-b from-emerald-500/5 via-card to-card p-3.5 lg:p-4 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-emerald-300 dark:border-emerald-900/50 dark:from-emerald-950/20">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex size-8.5 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Activity className="size-4.5" />
                </div>
                <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  Average
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className={cn("text-2xl lg:text-3xl font-extrabold tracking-tight leading-none", pctColor(summaryStats.overallPct))}>
                  {summaryStats.overallPct}%
                </span>
                <span className="text-xs font-semibold text-foreground/80 mt-1">
                  Overall Attendance
                </span>
                <span className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                  <CheckCircle2 className="size-3 text-emerald-500 shrink-0" />
                  Across all assigned subjects
                </span>
              </div>
            </div>

            {/* Card 3: Students Below 75% */}
            {summaryStats.belowThresholdCount > 0 ? (
              <div className="group relative overflow-hidden rounded-xl border border-rose-200/80 bg-linear-to-b from-rose-500/5 via-card to-card p-3.5 lg:p-4 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-rose-300 dark:border-rose-900/50 dark:from-rose-950/20">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex size-8.5 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                    <Users className="size-4.5" />
                  </div>
                  <span className="rounded-md bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                    Action Needed
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-2xl lg:text-3xl font-extrabold tracking-tight text-rose-600 dark:text-rose-400 leading-none">
                    {summaryStats.belowThresholdCount}
                  </span>
                  <span className="text-xs font-semibold text-foreground/80 mt-1">
                    Students Below 75%
                  </span>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                    <AlertTriangle className="size-3 text-rose-500 shrink-0" />
                    Require immediate attention
                  </span>
                </div>
              </div>
            ) : (
              <div className="group relative overflow-hidden rounded-xl border border-emerald-200/80 bg-linear-to-b from-emerald-500/5 via-card to-card p-3.5 lg:p-4 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-emerald-300 dark:border-emerald-900/50 dark:from-emerald-950/20">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex size-8.5 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="size-4.5" />
                  </div>
                  <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                    On Track
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-2xl lg:text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400 leading-none">
                    0
                  </span>
                  <span className="text-xs font-semibold text-foreground/80 mt-1">
                    Students Below 75%
                  </span>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                    <ShieldCheck className="size-3 text-emerald-500 shrink-0" />
                    All students meet criteria
                  </span>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {loading ? (
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-5 flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <Skeleton className="h-5 w-1/2" />
                    <Skeleton className="h-5 w-12 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-3/4" />
                  <div className="h-px bg-border my-2" />
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between"><Skeleton className="h-3.5 w-16" /><Skeleton className="h-3.5 w-8" /></div>
                    <div className="flex justify-between"><Skeleton className="h-3.5 w-20" /><Skeleton className="h-3.5 w-8" /></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
            <ChartSkeleton />
            <CardSkeleton />
          </div>
        </div>
      ) : (
        <>
          {/* ── Subject cards ──────────────────────────────── */}
          <motion.div variants={itemVariants} className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <BookOpen className="size-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold tracking-tight text-foreground">
                    Subject Overview
                  </h2>
                </div>
              </div>
              {subjectCards.length > 0 && (
                <span className="rounded-full bg-muted/80 border border-border/80 px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                  {subjectCards.length} subject{subjectCards.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {subjectCards.length === 0 ? (
              <div className="rounded-2xl border border-border/80 bg-card px-4 py-12 text-center text-sm text-muted-foreground">
                No subjects assigned yet. Ask your admin to assign subjects.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {subjectCards.map((sub) => {
                  const totalRecords = sub.presentTotal + sub.absentTotal
                  const presentPct = totalRecords > 0 ? (sub.presentTotal / totalRecords) * 100 : 0
                  const yrTheme = getYearTheme(sub.year)

                  return (
                    <div
                      key={sub.assignmentId}
                      className="group relative flex flex-col gap-4 rounded-2xl border border-border/80 bg-card p-5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-border"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col gap-1.5 min-w-0">
                          <h3 className="text-base font-bold text-foreground leading-snug truncate" title={sub.subjectName}>
                            {sub.subjectName}
                          </h3>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[11px] font-bold text-blue-700 dark:text-blue-300">
                              <Building2 className="size-3" />
                              {sub.className}
                            </span>
                            {sub.year && (
                              <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold border", yrTheme.badge)}>
                                <GraduationCap className="size-3" />
                                {sub.year}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Trend badge */}
                        <div className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold shrink-0",
                          sub.trend === "Improving" && "bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300",
                          sub.trend === "Stable" && "bg-muted border border-border/80 text-muted-foreground",
                          sub.trend === "Declining" && "bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300",
                        )}>
                          {sub.trend === "Improving" && <TrendingUp className="size-3" />}
                          {sub.trend === "Stable" && <Minus className="size-3" />}
                          {sub.trend === "Declining" && <TrendingDown className="size-3" />}
                          <span>{sub.trend}</span>
                        </div>
                      </div>

                      {/* Circular progress centered */}
                      <div className="flex justify-center py-1">
                        <CircularProgress percentage={sub.percentage} size={108} strokeWidth={9} />
                      </div>

                      {/* High-End Attendance Distribution Pods & Sleek Track */}
                      <div className="flex flex-col gap-2.5">
                        <div className="grid grid-cols-2 gap-2">
                          {/* Present Metric Box */}
                          <div className="flex items-center justify-between rounded-xl bg-emerald-500/[0.08] dark:bg-emerald-950/30 border border-emerald-500/20 px-3 py-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="size-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20 shrink-0" />
                              <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 truncate">Present</span>
                            </div>
                            <span className="text-xs font-black text-emerald-700 dark:text-emerald-300 font-mono shrink-0">
                              {sub.presentTotal} <span className="text-[10px] font-semibold opacity-75">({Math.round(presentPct)}%)</span>
                            </span>
                          </div>

                          {/* Absent Metric Box */}
                          <div className="flex items-center justify-between rounded-xl bg-rose-500/[0.08] dark:bg-rose-950/30 border border-rose-500/20 px-3 py-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="size-2 rounded-full bg-rose-500 ring-2 ring-rose-500/20 shrink-0" />
                              <span className="text-xs font-bold text-rose-900 dark:text-rose-200 truncate">Absent</span>
                            </div>
                            <span className="text-xs font-black text-rose-700 dark:text-rose-300 font-mono shrink-0">
                              {sub.absentTotal} <span className="text-[10px] font-semibold opacity-75">({totalRecords > 0 ? Math.round(100 - presentPct) : 0}%)</span>
                            </span>
                          </div>
                        </div>

                        {/* Sleek Visual Segmented Track Bar */}
                        <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted/80 p-0.5 shadow-inner">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-700 ease-out",
                              sub.percentage >= 75
                                ? "bg-linear-to-r from-emerald-600 to-emerald-500 shadow-xs"
                                : sub.percentage >= 60
                                ? "bg-linear-to-r from-amber-600 to-amber-500 shadow-xs"
                                : "bg-linear-to-r from-rose-600 to-rose-500 shadow-xs"
                            )}
                            style={{ width: `${presentPct}%` }}
                          />
                        </div>
                      </div>

                      {/* Stats row */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/60 pt-3 font-medium">
                        <span className="flex items-center gap-1.5">
                          <Users className="size-3.5 text-muted-foreground/70" />
                          {sub.totalStudents} enrolled
                        </span>
                        <span className="text-border">·</span>
                        <span className="flex items-center gap-1.5">
                          <CalendarDays className="size-3.5 text-muted-foreground/70" />
                          {sub.totalClasses} class{sub.totalClasses !== 1 ? "es" : ""}
                        </span>
                      </div>

                      {/* Insight callout */}
                      <div className={cn(
                        "rounded-xl px-3.5 py-2.5 text-xs leading-relaxed font-medium flex items-start gap-2",
                        sub.percentage >= 75
                          ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                          : sub.percentage >= 60
                          ? "bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300"
                          : "bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300"
                      )}>
                        <Sparkles className="size-3.5 shrink-0 mt-0.5 opacity-80" />
                        <span>{sub.insight}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </motion.div>

          {/* ── Bar chart ──────────────────────────────────── */}
          <motion.div variants={itemVariants} className="flex flex-col gap-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                  <TrendingUp className="size-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold tracking-tight text-foreground">
                    Attendance Trend
                  </h2>
                  <p className="text-xs text-muted-foreground">Last 8 conducted sessions</p>
                </div>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                <div className="h-0.5 w-4 border-t-2 border-dashed border-amber-500" />
                <span>75% Target Threshold</span>
              </div>
            </div>

            {chartData.length === 0 ? (
              <div className="rounded-2xl border border-border/80 bg-card px-4 py-12 text-center text-sm text-muted-foreground">
                No sessions found for this period.
              </div>
            ) : (
              <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-6 shadow-2xs">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={chartData} margin={{ top: 24, right: 12, bottom: 8, left: -16 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      className="stroke-border"
                      strokeOpacity={0.6}
                    />
                    <XAxis
                      dataKey="date"
                      tick={<CustomXAxisTick chartData={chartData} />}
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: "var(--color-muted-foreground)", fontWeight: 500 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => `${v}%`}
                    />
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{ fill: "var(--color-muted)", opacity: 0.35 }}
                    />
                    {/* 75% threshold dashed line */}
                    <ReferenceLine
                      y={75}
                      stroke="#d97706"
                      strokeDasharray="5 4"
                      strokeWidth={1.5}
                    />
                    <Bar
                      dataKey="percentage"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={48}
                      isAnimationActive={true}
                      animationDuration={800}
                      animationEasing="ease-out"
                    >
                      <LabelList dataKey="percentage" content={<BarLabel />} />
                      {chartData.map((entry, idx) => (
                        <Cell key={idx} fill={barColor(entry.percentage)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </motion.div>

          {/* ── Students needing attention ──────────────────── */}
          <motion.div variants={itemVariants} className="flex flex-col gap-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="size-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold tracking-tight text-foreground">
                    Students Needing Attention
                  </h2>
                  <p className="text-xs text-muted-foreground">Attendance rate below 75% target</p>
                </div>
              </div>
              {lowStudents.length > 0 && (
                <span className="inline-flex items-center rounded-full bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 text-xs font-bold text-rose-700 dark:text-rose-300">
                  {lowStudents.length} student{lowStudents.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {/* Legend */}
            {lowStudents.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-red-500/10 border border-red-500/20 px-2.5 py-1 text-xs font-semibold text-red-700 dark:text-red-300">
                  <span className="size-2 rounded-full bg-red-500" /> 0–40% Critical
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 text-xs font-semibold text-orange-700 dark:text-orange-300">
                  <span className="size-2 rounded-full bg-orange-500" /> 41–60% Warning
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                  <span className="size-2 rounded-full bg-amber-500" /> 61–74% At Risk
                </span>
              </div>
            )}

            <StudentTable rows={lowStudents} colorClass="text-rose-600 dark:text-rose-400" type="low" />
          </motion.div>

          {/* ── Top performers ──────────────────────────────── */}
          <motion.div variants={itemVariants} className="flex flex-col gap-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Award className="size-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold tracking-tight text-foreground">
                    Top Performers
                  </h2>
                  <p className="text-xs text-muted-foreground">Exemplary attendance of 90% and above</p>
                </div>
              </div>
              {topStudents.length > 0 && (
                <span className="inline-flex items-center rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  {topStudents.length} student{topStudents.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            <StudentTable rows={topStudents} colorClass="text-emerald-600 dark:text-emerald-400" type="top" />
          </motion.div>
        </>
      )}
    </motion.div>
  )
}