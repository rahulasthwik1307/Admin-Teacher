"use client"

import { useState, useMemo } from "react"
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
  Clock,
  Target,
  Filter,
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
  DayOfWeekStat,
  PeriodSlotStat,
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

/* ── CircularProgress with High-Contrast Clean Typography ── */
function CircularProgress({ percentage, size = 108, strokeWidth = 8.5 }: {
  percentage: number; size?: number; strokeWidth?: number
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference
  const stroke = percentage >= 75 ? "#059669" : percentage >= 60 ? "#d97706" : percentage > 0 ? "#dc2626" : "#94a3b8"

  return (
    <div className="relative inline-flex items-center justify-center select-none" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted/50 dark:stroke-muted/25"
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
        <span className="text-3xl font-black tracking-tight text-foreground leading-none">
          {percentage}%
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 mt-1">
          Turnout
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
/* ── Custom X-Axis Tick (Shows Date and Timetable Period) ── */
function CustomXAxisTick(props: any) {
  const { x, y, payload, chartData } = props
  if (!payload) return null
  const index = payload.index
  const item: ChartPoint | undefined = chartData?.[index]

  // Shows date and period (e.g. "Aug 31 (P1)" or clean date)
  const label = item?.periodNumber ? `${item.date} (P${item.periodNumber})` : (item?.date || payload.value)

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

/* ── CustomTooltip with Rich Subject & Session Information ── */
function CustomTooltip({ active, payload }: {
  active?: boolean; payload?: { payload: ChartPoint }[]
}) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const isTargetMet = d.percentage >= 75
  const yrTheme = getYearTheme(d.year)

  return (
    <div className="rounded-xl border border-border/80 bg-card/95 backdrop-blur-md p-3.5 shadow-xl min-w-60">
      {/* Subject & Class Header */}
      <div className="flex flex-col gap-1 border-b border-border/60 pb-2 mb-2">
        <span className="text-xs font-black text-foreground">{d.subjectName || "Subject Session"}</span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {d.className && (
            <span className="inline-flex items-center gap-1 rounded bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300">
              <Building2 className="size-2.5" />
              {d.className}
            </span>
          )}
          {d.year && (
            <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold border", yrTheme.badge)}>
              <GraduationCap className="size-2.5" />
              {d.year}
            </span>
          )}
        </div>
      </div>

      {/* Session Timing & Period */}
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium mb-2.5">
        <CalendarDays className="size-3 text-primary shrink-0" />
        <span>{d.fullDate || d.date}</span>
        {d.periodNumber && (
          <span className="font-bold text-foreground">· Period {d.periodNumber}</span>
        )}
      </div>

      {/* Headcount Breakdown */}
      <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-muted/60 p-2 mb-2.5 text-[11px]">
        <div className="flex flex-col">
          <span className="text-muted-foreground text-[10px]">Present</span>
          <span className="font-bold text-emerald-700 dark:text-emerald-400">{d.presentCount ?? 0} students</span>
        </div>
        <div className="flex flex-col">
          <span className="text-muted-foreground text-[10px]">Absent</span>
          <span className="font-bold text-rose-700 dark:text-rose-400">{d.absentCount ?? 0} students</span>
        </div>
      </div>

      {/* Turnout Percentage & Status */}
      <div className="flex items-center justify-between border-t border-border/60 pt-2">
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground font-medium">Class Attendance</span>
          <span className={cn("text-lg font-black font-mono leading-none", pctColor(d.percentage))}>
            {d.percentage}%
          </span>
        </div>
        <span className={cn(
          "rounded-full px-2 py-0.5 text-[10px] font-bold",
          isTargetMet
            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
            : "bg-rose-500/15 text-rose-700 dark:text-rose-300"
        )}>
          {isTargetMet ? `+${d.percentage - 75}% vs target` : `${d.percentage - 75}% vs target`}
        </span>
      </div>
    </div>
  )
}

/* ── StudentTable with Recovery Calculator Column ──────────────────────── */
function getRowTint(percentage: number, type: "low" | "top") {
  if (type === "top") {
    return "bg-card"
  }
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
        No students found matching this criteria.
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
              {type === "low" && <th className="px-4 py-3.5 text-right">Recovery Target</th>}
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
                  {type === "low" && (
                    <td className="px-4 py-3.5 text-right">
                      <span
                        className="inline-flex items-center gap-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-300"
                        title={`Must attend the next ${st.classesNeededFor75 ?? 1} sessions consecutively without absence to cross 75%`}
                      >
                        <Target className="size-3 text-indigo-500" />
                        Needs +{st.classesNeededFor75 ?? 1} classes
                      </span>
                    </td>
                  )}
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
              {type === "low" && (
                <div className="flex items-center justify-between border-t border-border/40 pt-2 text-xs">
                  <span className="text-muted-foreground font-medium">Recovery Target:</span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 font-bold text-indigo-700 dark:text-indigo-300">
                    <Target className="size-3 text-indigo-500" />
                    Needs +{st.classesNeededFor75 ?? 1} classes
                  </span>
                </div>
              )}
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
  const [lowFilter, setLowFilter] = useState<"all" | "quick" | "critical">("all")
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
  const dayOfWeekStats = data?.dayOfWeekStats ?? []
  const periodSlotStats = data?.periodSlotStats ?? []
  const summaryStats = data?.summaryStats ?? { totalClasses: 0, overallPct: 0, belowThresholdCount: 0 }

  // Group subjects by subjectId with their associated cohorts (classes)
  const uniqueSubjects = useMemo(() => {
    const map = new Map<string, {
      subjectId: string
      subjectName: string
      cohorts: {
        assignmentId: string
        classId: string
        className: string
        year?: string
      }[]
    }>()

    for (const sub of subjectCards) {
      if (!map.has(sub.subjectId)) {
        map.set(sub.subjectId, {
          subjectId: sub.subjectId,
          subjectName: sub.subjectName,
          cohorts: [],
        })
      }
      map.get(sub.subjectId)!.cohorts.push({
        assignmentId: sub.assignmentId,
        classId: sub.classId,
        className: sub.className,
        year: sub.year,
      })
    }
    return Array.from(map.values())
  }, [subjectCards])

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("all")
  const [selectedClassId, setSelectedClassId] = useState<string>("all")

  // Active subject's cohorts (if multiple classes exist for that subject)
  const activeSubjectCohorts = useMemo(() => {
    if (selectedSubjectId === "all") return []
    const found = uniqueSubjects.find((s) => s.subjectId === selectedSubjectId)
    return found?.cohorts ?? []
  }, [uniqueSubjects, selectedSubjectId])

  // Filtered low students
  const filteredLowStudents = useMemo(() => {
    if (lowFilter === "quick") {
      return lowStudents.filter((s) => s.percentage >= 60 && s.percentage < 75)
    }
    if (lowFilter === "critical") {
      return lowStudents.filter((s) => s.percentage < 60)
    }
    return lowStudents
  }, [lowStudents, lowFilter])

  // Filtered chart data for attendance trend (last 10 sessions)
  const filteredChartData = useMemo(() => {
    let result = chartData
    if (selectedSubjectId !== "all") {
      result = result.filter((c) => c.subjectId === selectedSubjectId)
    }
    if (selectedClassId !== "all") {
      result = result.filter((c) => c.classId === selectedClassId)
    }
    return result.slice(-10)
  }, [chartData, selectedSubjectId, selectedClassId])

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
          {/* ── Subject cards (Option A Redesign) ──────────────── */}
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

                      {/* Circular progress with high-contrast text */}
                      <div className="flex justify-center py-1">
                        <CircularProgress percentage={sub.percentage} size={108} strokeWidth={8.5} />
                      </div>

                      {/* Distribution Pods & Option A Two-Tone Split Track */}
                      <div className="flex flex-col gap-2.5">
                        <div className="grid grid-cols-2 gap-2">
                          {/* Present Metric Box */}
                          <div className="flex items-center justify-between rounded-xl bg-emerald-500/8 dark:bg-emerald-950/30 border border-emerald-500/20 px-3 py-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="size-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20 shrink-0" />
                              <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 truncate">Present</span>
                            </div>
                            <span className="text-xs font-black text-emerald-700 dark:text-emerald-300 font-mono shrink-0">
                              {sub.presentTotal} <span className="text-[10px] font-semibold opacity-75">({Math.round(presentPct)}%)</span>
                            </span>
                          </div>

                          {/* Absent Metric Box */}
                          <div className="flex items-center justify-between rounded-xl bg-rose-500/8 dark:bg-rose-950/30 border border-rose-500/20 px-3 py-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="size-2 rounded-full bg-rose-500 ring-2 ring-rose-500/20 shrink-0" />
                              <span className="text-xs font-bold text-rose-900 dark:text-rose-200 truncate">Absent</span>
                            </div>
                            <span className="text-xs font-black text-rose-700 dark:text-rose-300 font-mono shrink-0">
                              {sub.absentTotal} <span className="text-[10px] font-semibold opacity-75">({totalRecords > 0 ? Math.round(100 - presentPct) : 0}%)</span>
                            </span>
                          </div>
                        </div>

                        {/* Option A: Integrated Two-Tone Split Bar with 75% Notch */}
                        <div className="flex flex-col gap-1.5">
                          <div
                            className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted/80 p-0.5 shadow-inner flex"
                            title={`Present: ${Math.round(presentPct)}% | Absent: ${totalRecords > 0 ? Math.round(100 - presentPct) : 0}%`}
                          >
                            {/* Present Segment */}
                            <div
                              className="h-full rounded-l-full bg-linear-to-r from-emerald-600 to-emerald-500 transition-all duration-700 ease-out"
                              style={{ width: `${presentPct}%` }}
                            />
                            {/* Absent Segment */}
                            <div
                              className="h-full rounded-r-full bg-linear-to-r from-rose-500 to-rose-600 transition-all duration-700 ease-out opacity-90"
                              style={{ width: `${totalRecords > 0 ? 100 - presentPct : 0}%` }}
                            />
                            {/* 75% Regulatory Threshold Marker */}
                            <div
                              className="absolute top-0 bottom-0 w-0.5 bg-foreground dark:bg-white shadow-xs z-10"
                              style={{ left: "75%" }}
                              title="75% Minimum Target Benchmark"
                            />
                          </div>
                          <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground px-0.5">
                            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{Math.round(presentPct)}% present</span>
                            <span className="text-[9px] uppercase tracking-wider text-muted-foreground/80 font-mono">
                              {presentPct >= 75 ? `+${Math.round(presentPct - 75)}% safe buffer` : `-${Math.round(75 - presentPct)}% below target`}
                            </span>
                            <span className="text-rose-700 dark:text-rose-400 font-semibold">{totalRecords > 0 ? Math.round(100 - presentPct) : 0}% absent</span>
                          </div>
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

          {/* ── Bar chart: Attendance Trend ──────────────────── */}
          <motion.div variants={itemVariants} className="flex flex-col gap-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                  <TrendingUp className="size-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold tracking-tight text-foreground">
                    Session Attendance Trend
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Student attendance % per conducted class (Y-axis: Attendance % · X-axis: Date & Timetable Period)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Primary Subject Filter Selector */}
                {uniqueSubjects.length > 1 && (
                  <div className="flex items-center gap-1 rounded-xl border border-border/80 bg-muted/40 p-1 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSubjectId("all")
                        setSelectedClassId("all")
                      }}
                      className={cn(
                        "px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer",
                        selectedSubjectId === "all"
                          ? "bg-background text-foreground shadow-2xs border border-border/80"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      All Subjects
                    </button>
                    {uniqueSubjects.map((sub) => {
                      const isActive = selectedSubjectId === sub.subjectId
                      return (
                        <button
                          key={sub.subjectId}
                          type="button"
                          onClick={() => {
                            setSelectedSubjectId(sub.subjectId)
                            setSelectedClassId("all")
                          }}
                          className={cn(
                            "px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer truncate max-w-44 flex items-center gap-1.5",
                            isActive
                              ? "bg-primary text-primary-foreground shadow-2xs"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                          title={sub.subjectName}
                        >
                          <span>{sub.subjectName}</span>
                          {sub.cohorts.length > 1 && (
                            <span className={cn(
                              "rounded-full px-1.5 py-0.2 text-[9px] font-extrabold",
                              isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                            )}>
                              {sub.cohorts.length}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* 75% Target Threshold Marker Indicator */}
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                  <div className="h-0.5 w-4 border-t-2 border-dashed border-amber-500" />
                  <span>75% Target Threshold</span>
                </div>
              </div>
            </div>

            {/* Sub-Tier: Cohort / Class Selector (When the selected subject has multiple sections/years) */}
            {activeSubjectCohorts.length > 1 && (
              <div className="flex items-center gap-1.5 flex-wrap rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-xs">
                <span className="text-muted-foreground text-[11px] font-semibold mr-1 flex items-center gap-1">
                  <GraduationCap className="size-3 text-primary shrink-0" />
                  Select Cohort:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedClassId("all")}
                  className={cn(
                    "px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer text-xs",
                    selectedClassId === "all"
                      ? "bg-background text-foreground shadow-2xs border border-border/80"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  All Classes ({activeSubjectCohorts.length})
                </button>
                {activeSubjectCohorts.map((c) => {
                  const yrTheme = getYearTheme(c.year)
                  const isSelected = selectedClassId === c.classId
                  return (
                    <button
                      key={c.classId}
                      type="button"
                      onClick={() => setSelectedClassId(c.classId)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-0.5 font-bold transition-all cursor-pointer text-xs border",
                        isSelected
                          ? "bg-background text-foreground shadow-2xs border-primary ring-1 ring-primary/30"
                          : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
                      )}
                    >
                      <span>{c.className}</span>
                      {c.year && (
                        <span className={cn("inline-flex items-center rounded px-1 text-[10px] font-extrabold border", yrTheme.badge)}>
                          {c.year}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {filteredChartData.length === 0 ? (
              <div className="rounded-2xl border border-border/80 bg-card px-4 py-12 text-center text-sm text-muted-foreground">
                No sessions found for this selection.
              </div>
            ) : (
              <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-6 shadow-2xs">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={filteredChartData} margin={{ top: 24, right: 12, bottom: 8, left: -16 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      className="stroke-border"
                      strokeOpacity={0.6}
                    />
                    <XAxis
                      dataKey="date"
                      tick={<CustomXAxisTick chartData={filteredChartData} />}
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
                      {filteredChartData.map((entry, idx) => (
                        <Cell key={idx} fill={barColor(entry.percentage)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </motion.div>

          {/* ── Day-of-Week & Period Turnout Intelligence ── */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 1. Day-of-Week Patterns */}
            <div className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-card p-5 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    <CalendarDays className="size-4" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold tracking-tight text-foreground">
                      Day-of-Week Turnout Pattern
                    </h2>
                    <p className="text-xs text-muted-foreground">Historical attendance rhythm across weekdays</p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-md bg-muted/60 border border-border/80 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                  <Target className="size-3 text-amber-500" />
                  <span>Target: 75%</span>
                </div>
              </div>

              {dayOfWeekStats.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">No session records available.</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {dayOfWeekStats.map((d) => (
                    <div
                      key={d.dayNumber}
                      className={cn(
                        "group relative flex flex-col justify-between gap-2.5 rounded-xl border p-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs",
                        d.isPeak
                          ? "border-emerald-500/40 bg-linear-to-b from-emerald-500/8 via-card to-card dark:border-emerald-700/60 dark:from-emerald-950/25"
                          : d.isLowest
                          ? "border-rose-500/40 bg-linear-to-b from-rose-500/8 via-card to-card dark:border-rose-700/60 dark:from-rose-950/25"
                          : "border-border/80 bg-card hover:border-border"
                      )}
                    >
                      {/* Day Header & Highlights */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground tracking-tight">{d.day}</span>
                        {d.isPeak && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 dark:text-emerald-300 shadow-2xs">
                            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Peak
                          </span>
                        )}
                        {d.isLowest && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[10px] font-extrabold text-rose-800 dark:text-rose-300 shadow-2xs">
                            <span className="size-1.5 rounded-full bg-rose-500" />
                            Lowest
                          </span>
                        )}
                      </div>

                      {/* Dual-Tone Percentage & Delta */}
                      <div className="flex items-baseline justify-between gap-1.5">
                        <span className={cn("text-2xl font-black tracking-tight font-mono", pctColor(d.percentage))}>
                          {d.sessionCount > 0 ? `${d.percentage}%` : "—"}
                        </span>
                        {d.sessionCount > 0 && (
                          <span className={cn(
                            "text-[10px] font-bold font-mono px-1.5 py-0.5 rounded",
                            d.percentage >= 75
                              ? "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10"
                              : "text-rose-700 dark:text-rose-300 bg-rose-500/10"
                          )}>
                            {d.percentage >= 75 ? `+${d.percentage - 75}%` : `${d.percentage - 75}%`}
                          </span>
                        )}
                      </div>

                      {/* Progress Track with 75% Benchmark Notch */}
                      <div className="flex flex-col gap-1">
                        <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted/80">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              d.percentage >= 75
                                ? "bg-linear-to-r from-emerald-600 to-emerald-500"
                                : d.percentage >= 60
                                ? "bg-linear-to-r from-amber-600 to-amber-500"
                                : "bg-linear-to-r from-rose-600 to-rose-500"
                            )}
                            style={{ width: `${d.percentage}%` }}
                          />
                          {/* 75% Target Notch */}
                          <div
                            className="absolute top-0 bottom-0 w-0.5 bg-foreground/70 dark:bg-white/80 z-10"
                            style={{ left: "75%" }}
                            title="75% Target Marker"
                          />
                        </div>
                        <div className="text-[10px] font-medium text-muted-foreground truncate">
                          {d.sessionCount} class{d.sessionCount !== 1 ? "es" : ""} conducted
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Period Time-Slot Turnout */}
            <div className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-card p-5 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Clock className="size-4" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold tracking-tight text-foreground">
                      Period Slot Turnout Distribution
                    </h2>
                    <p className="text-xs text-muted-foreground">Attendance performance across timetable periods</p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-md bg-muted/60 border border-border/80 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                  <Target className="size-3 text-amber-500" />
                  <span>Target: 75%</span>
                </div>
              </div>

              {periodSlotStats.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">No slot data available.</div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {periodSlotStats.map((p) => {
                    const isOverTarget = p.percentage >= 75
                    const delta = p.percentage - 75
                    return (
                      <div
                        key={p.periodNumber}
                        className="group flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-border/70 bg-card p-3 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs hover:border-border"
                      >
                        {/* Period Badge & High-Contrast Time */}
                        <div className="flex items-center gap-2 sm:w-52 shrink-0">
                          <span className={cn(
                            "inline-flex items-center justify-center rounded-lg px-2.5 py-1 text-xs font-black font-mono shadow-2xs",
                            p.percentage >= 75
                              ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30"
                              : p.percentage >= 60
                              ? "bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/30"
                              : "bg-rose-500/15 text-rose-800 dark:text-rose-200 border border-rose-500/30"
                          )}>
                            Period {p.periodNumber}
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-300 dark:border-zinc-700 px-2.5 py-1 text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 shadow-2xs">
                            <Clock className="size-3 text-amber-600 dark:text-amber-400 shrink-0" />
                            {p.timeRange}
                          </span>
                        </div>

                        {/* Dual-Tone Progress Track with 75% Target Notch */}
                        <div className="flex-1 flex flex-col gap-1 min-w-30">
                          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted/80 shadow-inner">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-700 ease-out",
                                p.percentage >= 75
                                  ? "bg-linear-to-r from-emerald-600 to-emerald-500"
                                  : p.percentage >= 60
                                  ? "bg-linear-to-r from-amber-600 to-amber-500"
                                  : "bg-linear-to-r from-rose-600 to-rose-500"
                              )}
                              style={{ width: `${p.percentage}%` }}
                            />
                            {/* 75% Target Notch */}
                            <div
                              className="absolute top-0 bottom-0 w-0.5 bg-foreground dark:bg-white shadow-xs z-10"
                              style={{ left: "75%" }}
                              title="75% Minimum Target Benchmark"
                            />
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium">
                            <span>{p.sessionCount} session{p.sessionCount !== 1 ? "s" : ""}</span>
                            <span className={cn(
                              "font-bold font-mono",
                              isOverTarget ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"
                            )}>
                              {isOverTarget ? `+${delta}% vs target` : `${delta}% vs target`}
                            </span>
                          </div>
                        </div>

                        {/* Large Dual-Tone Percentage Pill */}
                        <div className="flex items-center justify-end sm:w-16 shrink-0">
                          <span className={cn(
                            "rounded-lg px-2.5 py-1 text-sm font-black font-mono tracking-tight",
                            p.percentage >= 75
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                              : p.percentage >= 60
                              ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                              : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20"
                          )}>
                            {p.percentage}%
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>

          {/* ── Students needing attention with Target Calculator ──── */}
          <motion.div variants={itemVariants} className="flex flex-col gap-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="size-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold tracking-tight text-foreground">
                    Students Needing Attention & Recovery Targets
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Attendance below 75% target with automated consecutive lecture recovery calculator
                  </p>
                </div>
              </div>

              {/* Segmented Filter Pills */}
              <div className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-muted/40 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setLowFilter("all")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer",
                    lowFilter === "all"
                      ? "bg-background text-foreground shadow-2xs border border-border/80"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  All At-Risk ({lowStudents.length})
                </button>
                <button
                  type="button"
                  onClick={() => setLowFilter("quick")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer",
                    lowFilter === "quick"
                      ? "bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/30"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Quick Recovery ({lowStudents.filter((s) => s.percentage >= 60 && s.percentage < 75).length})
                </button>
                <button
                  type="button"
                  onClick={() => setLowFilter("critical")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer",
                    lowFilter === "critical"
                      ? "bg-rose-500/15 text-rose-800 dark:text-rose-200 border border-rose-500/30"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Critical ({lowStudents.filter((s) => s.percentage < 60).length})
                </button>
              </div>
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

            <StudentTable rows={filteredLowStudents} colorClass="text-rose-600 dark:text-rose-400" type="low" />
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