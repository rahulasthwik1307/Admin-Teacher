"use client"

import { useState, useMemo, useEffect, Fragment } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { motion, useReducedMotion, type Variants } from "framer-motion"
import {
  Download,
  CalendarDays,
  TrendingUp,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Users,
  X,
  ShieldCheck,
  Clock,
  Sparkles,
  Building2,
  GraduationCap,
  Calendar,
  Search,
  Mail,
  QrCode,
  FileEdit,
  Filter,
  ArrowUpRight,
  Check,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { AttendanceHistorySkeleton, StudentDetailsSkeleton } from "@/components/ui/skeletons"
import { useAttendanceHistory, type AttendanceSession } from "@/hooks/use-attendance-history"

/* ── types ─────────────────────────────────────────────── */
interface DetailStudent {
  id: string
  name: string
  rollNumber: string
  email?: string
  hasEmail?: boolean
  status: "Present" | "Absent"
  alreadyNotified?: boolean
  notifiedAt?: string | null
  departmentCode?: string
  year?: string
  section?: string
}

interface YearTheme {
  badge: string
  headerBg: string
  containerBorder: string
  containerBg: string
  accentText: string
  dot: string
  activeTab: string
}

interface YearSubGroup {
  year: string
  sessions: AttendanceSession[]
  totalLectures: number
  avgPercentage: number
  totalPresent: number
  totalAbsent: number
  theme: YearTheme
}

interface DayGroup {
  dayLabel: string
  rawDate: string
  sessions: AttendanceSession[]
  totalLectures: number
  avgPercentage: number
  totalPresent: number
  totalAbsent: number
  yearGroups: YearSubGroup[]
  hasMultipleYears: boolean
}

/* ── Academic Year Color Themes ────────────────────────── */
function getYearTheme(yearStr?: string): YearTheme {
  const y = (yearStr || "").toLowerCase()
  if (y.includes("4") || y.includes("iv") || y.includes("four")) {
    return {
      badge: "bg-purple-500/15 text-purple-800 dark:text-purple-200 border-purple-300/80 dark:border-purple-700/80 font-black shadow-2xs",
      headerBg: "bg-purple-500/10 border-b border-purple-200/80 dark:border-purple-900/60 text-purple-950 dark:text-purple-100",
      containerBorder: "border-purple-200/90 dark:border-purple-900/60",
      containerBg: "bg-purple-500/[0.03] dark:bg-purple-950/15",
      accentText: "text-purple-700 dark:text-purple-300",
      dot: "bg-purple-600 dark:bg-purple-400",
      activeTab: "bg-purple-600 text-white shadow-2xs border-purple-600",
    }
  }
  if (y.includes("3") || y.includes("iii") || y.includes("three")) {
    return {
      badge: "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-300/80 dark:border-amber-700/80 font-black shadow-2xs",
      headerBg: "bg-amber-500/10 border-b border-amber-200/80 dark:border-amber-900/60 text-amber-950 dark:text-amber-100",
      containerBorder: "border-amber-200/90 dark:border-amber-900/60",
      containerBg: "bg-amber-500/[0.03] dark:bg-amber-950/15",
      accentText: "text-amber-700 dark:text-amber-300",
      dot: "bg-amber-600 dark:bg-amber-400",
      activeTab: "bg-amber-600 text-white shadow-2xs border-amber-600",
    }
  }
  if (y.includes("2") || y.includes("ii") || y.includes("two")) {
    return {
      badge: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-300/80 dark:border-emerald-700/80 font-black shadow-2xs",
      headerBg: "bg-emerald-500/10 border-b border-emerald-200/80 dark:border-emerald-900/60 text-emerald-950 dark:text-emerald-100",
      containerBorder: "border-emerald-200/90 dark:border-emerald-900/60",
      containerBg: "bg-emerald-500/[0.03] dark:bg-emerald-950/15",
      accentText: "text-emerald-700 dark:text-emerald-300",
      dot: "bg-emerald-600 dark:bg-emerald-400",
      activeTab: "bg-emerald-600 text-white shadow-2xs border-emerald-600",
    }
  }
  if (y.includes("1") || y.includes("i") || y.includes("one")) {
    return {
      badge: "bg-sky-500/15 text-sky-800 dark:text-sky-200 border-sky-300/80 dark:border-sky-700/80 font-black shadow-2xs",
      headerBg: "bg-sky-500/10 border-b border-sky-200/80 dark:border-sky-900/60 text-sky-950 dark:text-sky-100",
      containerBorder: "border-sky-200/90 dark:border-sky-900/60",
      containerBg: "bg-sky-500/[0.03] dark:bg-sky-950/15",
      accentText: "text-sky-700 dark:text-sky-300",
      dot: "bg-sky-600 dark:bg-sky-400",
      activeTab: "bg-sky-600 text-white shadow-2xs border-sky-600",
    }
  }
  return {
    badge: "bg-muted/80 text-foreground border-border/80 font-bold shadow-2xs",
    headerBg: "bg-muted/40 border-b border-border/70",
    containerBorder: "border-border/70",
    containerBg: "bg-card/40",
    accentText: "text-foreground",
    dot: "bg-primary",
    activeTab: "bg-primary text-primary-foreground shadow-2xs border-primary",
  }
}

/* ── Subject Color Palettes ────────────────────────────── */
interface SubjectTheme {
  border: string
  bgLinear: string
  accentBg: string
  accentText: string
  periodBadge: string
}

const SUBJECT_THEMES: Record<string, SubjectTheme> = {
  blue: {
    border: "border-blue-200/90 dark:border-blue-900/60 hover:border-blue-400/90 dark:hover:border-blue-700/80",
    bgLinear: "bg-linear-to-b from-blue-500/8 via-card to-card dark:from-blue-950/25",
    accentBg: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-300/60 dark:border-blue-800/60",
    accentText: "text-blue-600 dark:text-blue-400",
    periodBadge: "bg-blue-600 text-white dark:bg-blue-500 dark:text-white font-extrabold shadow-2xs",
  },
  purple: {
    border: "border-purple-200/90 dark:border-purple-900/60 hover:border-purple-400/90 dark:hover:border-purple-700/80",
    bgLinear: "bg-linear-to-b from-purple-500/8 via-card to-card dark:from-purple-950/25",
    accentBg: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-300/60 dark:border-purple-800/60",
    accentText: "text-purple-600 dark:text-purple-400",
    periodBadge: "bg-purple-600 text-white dark:bg-purple-500 dark:text-white font-extrabold shadow-2xs",
  },
  emerald: {
    border: "border-emerald-200/90 dark:border-emerald-900/60 hover:border-emerald-400/90 dark:hover:border-emerald-700/80",
    bgLinear: "bg-linear-to-b from-emerald-500/8 via-card to-card dark:from-emerald-950/25",
    accentBg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300/60 dark:border-emerald-800/60",
    accentText: "text-emerald-600 dark:text-emerald-400",
    periodBadge: "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-white font-extrabold shadow-2xs",
  },
  amber: {
    border: "border-amber-200/90 dark:border-amber-900/60 hover:border-amber-400/90 dark:hover:border-amber-700/80",
    bgLinear: "bg-linear-to-b from-amber-500/8 via-card to-card dark:from-amber-950/25",
    accentBg: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300/60 dark:border-amber-800/60",
    accentText: "text-amber-600 dark:text-amber-400",
    periodBadge: "bg-amber-600 text-white dark:bg-amber-500 dark:text-white font-extrabold shadow-2xs",
  },
  indigo: {
    border: "border-indigo-200/90 dark:border-indigo-900/60 hover:border-indigo-400/90 dark:hover:border-indigo-700/80",
    bgLinear: "bg-linear-to-b from-indigo-500/8 via-card to-card dark:from-indigo-950/25",
    accentBg: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-300/60 dark:border-indigo-800/60",
    accentText: "text-indigo-600 dark:text-indigo-400",
    periodBadge: "bg-indigo-600 text-white dark:bg-indigo-500 dark:text-white font-extrabold shadow-2xs",
  },
  rose: {
    border: "border-rose-200/90 dark:border-rose-900/60 hover:border-rose-400/90 dark:hover:border-rose-700/80",
    bgLinear: "bg-linear-to-b from-rose-500/8 via-card to-card dark:from-rose-950/25",
    accentBg: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-300/60 dark:border-rose-800/60",
    accentText: "text-rose-600 dark:text-rose-400",
    periodBadge: "bg-rose-600 text-white dark:bg-rose-500 dark:text-white font-extrabold shadow-2xs",
  },
}

function getSubjectTheme(subjectName: string): SubjectTheme {
  const s = (subjectName || "").toLowerCase()
  if (s.includes("network") || s.includes("cn") || s.includes("data comm")) return SUBJECT_THEMES.blue
  if (s.includes("machine") || s.includes("ml") || s.includes("learning") || s.includes("intelligence") || s.includes("ai")) return SUBJECT_THEMES.purple
  if (s.includes("database") || s.includes("dbms") || s.includes("sql") || s.includes("system")) return SUBJECT_THEMES.emerald
  if (s.includes("web") || s.includes("cloud") || s.includes("devops") || s.includes("full")) return SUBJECT_THEMES.amber
  if (s.includes("algorithm") || s.includes("structure") || s.includes("dsa") || s.includes("math")) return SUBJECT_THEMES.indigo
  return SUBJECT_THEMES.blue
}

/* ── helpers ───────────────────────────────────────────── */
function pctColor(pct: number) {
  if (pct >= 75) return "text-emerald-600 dark:text-emerald-400"
  if (pct >= 60) return "text-amber-600 dark:text-amber-400"
  return "text-rose-600 dark:text-rose-400"
}

function pctBg(pct: number) {
  if (pct >= 75) return "bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-300"
  if (pct >= 60) return "bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-amber-300"
  return "bg-rose-500/10 border-rose-500/25 text-rose-700 dark:text-rose-300"
}

function getDayLabel(rawDate: string): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const d = new Date(rawDate + "T00:00:00")
  d.setHours(0, 0, 0, 0)
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000)

  const dateFormatted = d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })

  if (diff === 0) return `Today · ${dateFormatted}`
  if (diff === 1) return `Yesterday · ${dateFormatted}`
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function exportSessionsCSV(sessions: AttendanceSession[]) {
  const headers = ["Date", "Subject", "Class", "Period", "Present", "Absent", "Total Students", "Percentage", "Status"]
  const rows = sessions.map(s => [
    s.date,
    s.subject,
    s.class,
    s.period,
    s.present,
    s.absent,
    s.present + s.absent,
    `${s.percentage}%`,
    s.status,
  ])
  const csv = [headers, ...rows].map(r => r.join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `attendance-history-${new Date().toISOString().split("T")[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function exportDetailCSV(session: AttendanceSession, students: DetailStudent[]) {
  const headers = ["Name", "Roll Number", "Status"]
  const rows = students.map(s => [s.name, s.rollNumber, s.status])
  const meta = [
    [`Session: ${session.subject}`],
    [`Class: ${session.class}`],
    [`Period: ${session.period}`],
    [`Date: ${session.date}`],
    [`Present: ${session.present} | Absent: ${session.absent} | Attendance: ${session.percentage}%`],
    [],
    headers,
    ...rows,
  ]
  const csv = meta.map(r => r.join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `session-${session.subject.replace(/\s+/g, "-")}-${session.date.replace(/\s+/g, "-")}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/* ── Grouping: Day Grouping with Year-Aware Segregation ── */
function groupSessionsByDay(sessions: AttendanceSession[]): DayGroup[] {
  const map = new Map<string, { dayLabel: string; rawDate: string; sessions: AttendanceSession[] }>()

  for (const s of sessions) {
    if (!map.has(s.rawDate)) {
      map.set(s.rawDate, {
        dayLabel: getDayLabel(s.rawDate),
        rawDate: s.rawDate,
        sessions: [],
      })
    }
    map.get(s.rawDate)!.sessions.push(s)
  }

  return Array.from(map.values()).map((group) => {
    // Sort sessions within day by period number ascending
    group.sessions.sort((a, b) => (a.periodNumber ?? 0) - (b.periodNumber ?? 0))
    const totalPresent = group.sessions.reduce((acc, s) => acc + s.present, 0)
    const totalAbsent = group.sessions.reduce((acc, s) => acc + s.absent, 0)
    const totalStudents = totalPresent + totalAbsent
    const avgPercentage = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0

    // Group sessions by Academic Year within this day
    const yearMap = new Map<string, AttendanceSession[]>()
    for (const s of group.sessions) {
      const yr = s.year || "Other"
      if (!yearMap.has(yr)) yearMap.set(yr, [])
      yearMap.get(yr)!.push(s)
    }

    // Sort years descending (e.g. 4th Year before 1st Year)
    const sortedYears = Array.from(yearMap.keys()).sort((a, b) => {
      const numA = parseInt(a) || 99
      const numB = parseInt(b) || 99
      return numB - numA
    })

    const yearGroups: YearSubGroup[] = sortedYears.map((year) => {
      const yrSessions = yearMap.get(year)!
      const yrPresent = yrSessions.reduce((acc, s) => acc + s.present, 0)
      const yrAbsent = yrSessions.reduce((acc, s) => acc + s.absent, 0)
      const yrTotal = yrPresent + yrAbsent
      const yrAvg = yrTotal > 0 ? Math.round((yrPresent / yrTotal) * 100) : 0
      return {
        year,
        sessions: yrSessions,
        totalLectures: yrSessions.length,
        avgPercentage: yrAvg,
        totalPresent: yrPresent,
        totalAbsent: yrAbsent,
        theme: getYearTheme(year),
      }
    })

    return {
      dayLabel: group.dayLabel,
      rawDate: group.rawDate,
      sessions: group.sessions,
      totalLectures: group.sessions.length,
      avgPercentage,
      totalPresent,
      totalAbsent,
      yearGroups,
      hasMultipleYears: yearGroups.length > 1,
    }
  }).sort((a, b) => b.rawDate.localeCompare(a.rawDate))
}

/* ── Per-subject summary strip ─────────────────────────── */
function SubjectSummaryStrip({ sessions }: { sessions: AttendanceSession[] }) {
  const subjectMap: Record<string, { count: number; totalPct: number; lowCount: number; present: number; absent: number }> = {}
  for (const s of sessions) {
    if (!subjectMap[s.subject]) {
      subjectMap[s.subject] = { count: 0, totalPct: 0, lowCount: 0, present: 0, absent: 0 }
    }
    subjectMap[s.subject].count++
    subjectMap[s.subject].totalPct += s.percentage
    subjectMap[s.subject].present += s.present
    subjectMap[s.subject].absent += s.absent
    if (s.percentage < 75) subjectMap[s.subject].lowCount++
  }

  const subjects = Object.entries(subjectMap).map(([name, v]) => ({
    name,
    count: v.count,
    avg: Math.round(v.totalPct / v.count),
    lowCount: v.lowCount,
    present: v.present,
    absent: v.absent,
    theme: getSubjectTheme(name),
  }))

  if (subjects.length === 0) return null

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <div className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
          <BookOpen className="size-3.5" />
        </div>
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Subject Performance Overview
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {subjects.map((sub) => (
          <div
            key={sub.name}
            className={cn(
              "group relative flex items-center justify-between gap-3.5 rounded-2xl border p-4 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs",
              sub.theme.border,
              sub.theme.bgLinear
            )}
          >
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-extrabold text-foreground truncate" title={sub.name}>
                {sub.name}
              </span>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs text-muted-foreground font-semibold">
                  {sub.count} session{sub.count !== 1 ? "s" : ""}
                </span>
                <span className="text-muted-foreground/40 text-xs">·</span>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  {sub.present} Pres
                </span>
                <span className="text-muted-foreground/40 text-xs">·</span>
                <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                  {sub.absent} Abs
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end shrink-0">
              <span className={cn("text-xl font-extrabold tracking-tight leading-none", pctColor(sub.avg))}>
                {sub.avg}%
              </span>
              {sub.lowCount > 0 ? (
                <span className="text-[10px] font-extrabold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-300/40 px-1.5 py-0.2 rounded-md mt-1.5 shadow-2xs">
                  {sub.lowCount} below 75%
                </span>
              ) : (
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-300/40 px-1.5 py-0.2 rounded-md mt-1.5 shadow-2xs">
                  On track
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Main Page Component ───────────────────────────────── */
export default function AttendanceHistoryPage() {
  const { data: sessions = [], isLoading: loading } = useAttendanceHistory()
  const shouldReduceMotion = useReducedMotion()

  const [subjectFilter, setSubjectFilter] = useState("all")
  const [classFilter, setClassFilter] = useState("all")
  const [filterAtRiskOnly, setFilterAtRiskOnly] = useState(false)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [activeDatePreset, setActiveDatePreset] = useState<"all" | "today" | "yesterday" | "7days" | "30days">("all")

  const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null)
  const [detailStudents, setDetailStudents] = useState<DetailStudent[]>([])
  const [detailSessionSummary, setDetailSessionSummary] = useState<{
    notifiedAbsentCount: number
    emailableAbsentCount: number
    noEmailAbsentCount: number
    pendingAbsentCount: number
  } | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [drawerSearch, setDrawerSearch] = useState("")
  const [drawerStatusFilter, setDrawerStatusFilter] = useState<"all" | "absent" | "present">("all")
  const [dayYearFilters, setDayYearFilters] = useState<Record<string, string>>({})

  /* ── Fetch detailed student breakdown from backend API ── */
  useEffect(() => {
    if (!selectedSession) {
      setDetailStudents([])
      setDetailSessionSummary(null)
      setDrawerSearch("")
      setDrawerStatusFilter("all")
      return
    }

    setDrawerSearch("")
    setDrawerStatusFilter("all")
    let isMounted = true
    const fetchDetail = async () => {
      setDetailLoading(true)
      try {
        const res = await fetch(`/api/teacher/attendance-history/${selectedSession.id}`)
        if (!res.ok) throw new Error("Failed to load student attendance details")
        const json = await res.json()
        if (isMounted) {
          setDetailStudents(json.students ?? [])
          setDetailSessionSummary({
            notifiedAbsentCount: json.session?.notifiedAbsentCount ?? 0,
            emailableAbsentCount: json.session?.emailableAbsentCount ?? 0,
            noEmailAbsentCount: json.session?.noEmailAbsentCount ?? 0,
            pendingAbsentCount: json.session?.pendingAbsentCount ?? 0,
          })
        }
      } catch (e) {
        console.error(e)
        toast.error("Failed to load student breakdown for this session.")
      } finally {
        if (isMounted) setDetailLoading(false)
      }
    }

    fetchDetail()
    return () => {
      isMounted = false
    }
  }, [selectedSession])

  /* ── Preset Date Range Handler ── */
  const setPresetDateRange = (preset: "all" | "today" | "yesterday" | "7days" | "30days") => {
    setActiveDatePreset(preset)
    const now = new Date()
    const fmt = (d: Date) => d.toISOString().split("T")[0]

    if (preset === "all") {
      setStartDate("")
      setEndDate("")
    } else if (preset === "today") {
      const todayStr = fmt(now)
      setStartDate(todayStr)
      setEndDate(todayStr)
    } else if (preset === "yesterday") {
      const y = new Date(now)
      y.setDate(now.getDate() - 1)
      const yStr = fmt(y)
      setStartDate(yStr)
      setEndDate(yStr)
    } else if (preset === "7days") {
      const past = new Date(now)
      past.setDate(now.getDate() - 6)
      setStartDate(fmt(past))
      setEndDate(fmt(now))
    } else if (preset === "30days") {
      const past = new Date(now)
      past.setDate(now.getDate() - 29)
      setStartDate(fmt(past))
      setEndDate(fmt(now))
    }
  }

  /* ── Filter options derived only from authorized sessions ── */
  const subjectOptions = useMemo(() => {
    const seen = new Map<string, string>()
    sessions.forEach((s) => {
      if (!seen.has(s.subjectId)) seen.set(s.subjectId, s.subject)
    })
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }))
  }, [sessions])

  const classCohortGroups = useMemo(() => {
    const classMap = new Map<string, { id: string; className: string; year: string }>()
    sessions.forEach((s) => {
      if (!classMap.has(s.classId)) {
        let cleanName = s.section
          ? (s.departmentCode ? `${s.departmentCode}-${s.section}` : `Section ${s.section}`)
          : s.class
        if (cleanName.includes(" · ")) {
          cleanName = cleanName.split(" · ")[0]
        }
        let year = s.year || ""
        if (!year && s.class.includes(" · ")) {
          year = s.class.split(" · ")[1] || "Other"
        }
        classMap.set(s.classId, {
          id: s.classId,
          className: cleanName,
          year: year || "Other",
        })
      }
    })

    const yearMap = new Map<string, { id: string; className: string; year: string }[]>()
    for (const c of classMap.values()) {
      if (!yearMap.has(c.year)) yearMap.set(c.year, [])
      yearMap.get(c.year)!.push(c)
    }

    const sortedYears = Array.from(yearMap.keys()).sort((a, b) => a.localeCompare(b))
    return sortedYears.map((year) => ({
      year,
      cohorts: yearMap.get(year)!.sort((a, b) => a.className.localeCompare(b.className)),
    }))
  }, [sessions])

  /* ── Filtered sessions ─────────────────────────────────── */
  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      if (subjectFilter !== "all" && s.subjectId !== subjectFilter) return false
      if (classFilter !== "all" && s.classId !== classFilter) return false
      if (filterAtRiskOnly && s.percentage >= 75) return false
      if (startDate && s.rawDate < startDate) return false
      if (endDate && s.rawDate > endDate) return false
      return true
    })
  }, [sessions, subjectFilter, classFilter, filterAtRiskOnly, startDate, endDate])

  /* ── Filtered students in drawer ──────────────────────── */
  const filteredStudents = useMemo(() => {
    return detailStudents.filter((st) => {
      if (drawerStatusFilter === "absent" && st.status !== "Absent") return false
      if (drawerStatusFilter === "present" && st.status !== "Present") return false
      if (drawerSearch.trim()) {
        const q = drawerSearch.toLowerCase().trim()
        const matchName = st.name.toLowerCase().includes(q)
        const matchRoll = st.rollNumber.toLowerCase().includes(q)
        return matchName || matchRoll
      }
      return true
    })
  }, [detailStudents, drawerStatusFilter, drawerSearch])

  /* ── Grouped sessions by Day (Option 1) ───────────────── */
  const groupedDays = useMemo(() => groupSessionsByDay(filtered), [filtered])

  /* ── Summary statistics ─────────────────────────────────── */
  const totalSessions = filtered.length
  const avgAttendance =
    filtered.length > 0
      ? Math.round(filtered.reduce((a, s) => a + s.percentage, 0) / filtered.length)
      : 0
  const lowSessions = filtered.filter((s) => s.percentage < 75).length

  const subjectStatMap: Record<string, number[]> = {}
  filtered.forEach((s) => {
    if (!subjectStatMap[s.subject]) subjectStatMap[s.subject] = []
    subjectStatMap[s.subject].push(s.percentage)
  })
  let bestSubject = { name: "—", avg: 0 }
  Object.entries(subjectStatMap).forEach(([name, pcts]) => {
    const avg = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length)
    if (avg > bestSubject.avg) bestSubject = { name, avg }
  })

  const hasActiveFilters =
    subjectFilter !== "all" ||
    classFilter !== "all" ||
    filterAtRiskOnly ||
    startDate !== "" ||
    endDate !== "" ||
    activeDatePreset !== "all"

  const clearFilters = () => {
    setSubjectFilter("all")
    setClassFilter("all")
    setFilterAtRiskOnly(false)
    setStartDate("")
    setEndDate("")
    setActiveDatePreset("all")
  }

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.05,
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

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-6"
    >
      {/* ── Page Description ── */}
      <motion.div variants={itemVariants} className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground -mt-1">
          Verified historical session logs, student presence breakdowns, and lecture analytics.
        </p>
      </motion.div>

      {/* ── Filter Toolbar ─────────────────────────────────── */}
      <motion.div variants={itemVariants} className="flex flex-col gap-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Connected Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center rounded-2xl border border-border/80 bg-card shadow-2xs w-full lg:w-auto overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-border/70">
            {/* Subject Filter */}
            <div className="flex items-center gap-3 px-4 py-2.5 flex-1 sm:w-60 hover:bg-muted/20 transition-colors">
              <BookOpen className="size-4 text-muted-foreground shrink-0" />
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
                  Subject
                </span>
                <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                  <SelectTrigger className="border-0 bg-transparent p-0 h-auto shadow-none focus:ring-0 focus:ring-offset-0 font-bold text-xs w-full outline-none [&>svg]:opacity-50 hover:bg-transparent cursor-pointer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border shadow-md">
                    <SelectItem value="all" className="text-xs font-semibold">
                      All Assigned Subjects
                    </SelectItem>
                    {subjectOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id} className="text-xs font-semibold">
                        {opt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Class Filter */}
            <div className="flex items-center gap-3 px-4 py-2.5 flex-1 sm:w-56 hover:bg-muted/20 transition-colors">
              <Building2 className="size-4 text-muted-foreground shrink-0" />
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
                  Class
                </span>
                <Select value={classFilter} onValueChange={setClassFilter}>
                  <SelectTrigger className="border-0 bg-transparent p-0 h-auto shadow-none focus:ring-0 focus:ring-offset-0 font-bold text-xs w-full outline-none [&>svg]:opacity-50 hover:bg-transparent cursor-pointer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border shadow-md min-w-48 py-1">
                    <SelectItem value="all" className="text-xs font-semibold py-1.5 px-2.5 cursor-pointer">
                      All Assigned Classes
                    </SelectItem>
                    {classCohortGroups.map((group) => (
                      <Fragment key={group.year}>
                        <SelectSeparator className="my-1 bg-border/60" />
                        <SelectGroup>
                          <SelectLabel className="px-2.5 pt-1.5 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {group.year.toUpperCase()}
                          </SelectLabel>
                          {group.cohorts.map((cohort) => (
                            <SelectItem
                              key={cohort.id}
                              value={cohort.id}
                              className="text-xs font-semibold py-1.5 px-2.5 cursor-pointer"
                            >
                              {cohort.className}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </Fragment>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Snug Date Range Filter */}
            <div className="flex items-center gap-3 px-4 py-2.5 flex-1 hover:bg-muted/20 transition-colors">
              <CalendarDays className="size-4 text-muted-foreground shrink-0" />
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
                  Date Range
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value)
                      setActiveDatePreset("all")
                    }}
                    className="bg-muted/40 hover:bg-muted/60 border border-border/70 focus:border-primary/50 rounded-lg px-1.5 py-0.5 text-xs font-medium text-foreground outline-none transition-all cursor-pointer w-29"
                    aria-label="Start date"
                  />
                  <span className="text-[10px] font-bold text-muted-foreground/60 uppercase">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value)
                      setActiveDatePreset("all")
                    }}
                    className="bg-muted/40 hover:bg-muted/60 border border-border/70 focus:border-primary/50 rounded-lg px-1.5 py-0.5 text-xs font-medium text-foreground outline-none transition-all cursor-pointer w-29"
                    aria-label="End date"
                  />
                  {(startDate || endDate) && (
                    <button
                      type="button"
                      onClick={() => {
                        setStartDate("")
                        setEndDate("")
                        setActiveDatePreset("all")
                      }}
                      className="p-1 hover:bg-muted/80 rounded-md text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      title="Clear dates"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="rounded-xl border border-rose-200/80 bg-rose-50/60 dark:border-rose-900/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 hover:bg-rose-100/80 text-xs font-semibold px-3 h-11 gap-1.5 shadow-2xs transition-all cursor-pointer"
              >
                <X className="size-3.5" /> Clear Filters
              </Button>
            )}

            <Button
              variant="outline"
              className="gap-2 h-11 rounded-xl font-bold shadow-2xs hover:shadow transition-all cursor-pointer shrink-0 w-full sm:w-auto"
              disabled={filtered.length === 0}
              onClick={() => {
                exportSessionsCSV(filtered)
                toast.success("Attendance history exported to CSV.")
              }}
            >
              <Download className="size-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Quick Date Presets */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground pt-1">
          <span className="text-[11px] font-bold text-muted-foreground mr-1 flex items-center gap-1">
            <Calendar className="size-3 text-muted-foreground" /> Quick Dates:
          </span>
          <button
            type="button"
            onClick={() => setPresetDateRange("all")}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
              activeDatePreset === "all"
                ? "bg-primary text-primary-foreground border-primary font-bold shadow-2xs"
                : "bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            All Time
          </button>
          <button
            type="button"
            onClick={() => setPresetDateRange("today")}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
              activeDatePreset === "today"
                ? "bg-primary text-primary-foreground border-primary font-bold shadow-2xs"
                : "bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setPresetDateRange("yesterday")}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
              activeDatePreset === "yesterday"
                ? "bg-primary text-primary-foreground border-primary font-bold shadow-2xs"
                : "bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            Yesterday
          </button>
          <button
            type="button"
            onClick={() => setPresetDateRange("7days")}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
              activeDatePreset === "7days"
                ? "bg-primary text-primary-foreground border-primary font-bold shadow-2xs"
                : "bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            Last 7 Days
          </button>
          <button
            type="button"
            onClick={() => setPresetDateRange("30days")}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
              activeDatePreset === "30days"
                ? "bg-primary text-primary-foreground border-primary font-bold shadow-2xs"
                : "bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            Last 30 Days
          </button>

          <div className="h-4 w-px bg-border/80 mx-1 hidden sm:block" />

          {/* Dedicated At-Risk Filter Pill in Filter Toolbar */}
          <button
            type="button"
            onClick={() => setFilterAtRiskOnly((prev) => !prev)}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 shadow-2xs",
              filterAtRiskOnly
                ? "bg-rose-600 text-white border-rose-700 shadow-xs"
                : "bg-muted/40 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-900/50 hover:bg-rose-100/70 dark:hover:bg-rose-950/30"
            )}
          >
            <AlertTriangle className={cn("size-3.5", filterAtRiskOnly ? "text-white" : "text-rose-500")} />
            <span>At Risk (&lt;75%)</span>
            {lowSessions > 0 && (
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.2 rounded-full font-black",
                  filterAtRiskOnly
                    ? "bg-white/20 text-white"
                    : "bg-rose-500/20 text-rose-700 dark:text-rose-300"
                )}
              >
                {lowSessions}
              </span>
            )}
          </button>
        </div>
      </motion.div>

      {/* ── Summary Statistics Cards ─────────────────────────── */}
      <motion.div variants={itemVariants} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Total Sessions */}
          <div className="group relative overflow-hidden rounded-2xl border border-sky-200/80 bg-linear-to-b from-sky-500/5 via-card to-card p-4 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-sky-300 dark:border-sky-900/50 dark:from-sky-950/20">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <CalendarDays className="size-5" />
              </div>
              <span className="rounded-md bg-sky-500/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-sky-700 dark:text-sky-300">
                Sessions
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-2xl lg:text-3xl font-black tracking-tight text-foreground leading-none">
                {totalSessions}
              </span>
              <span className="text-xs font-bold text-foreground/80 mt-1">
                Conducted Sessions
              </span>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                <BookOpen className="size-3 text-sky-500 shrink-0" />
                Across authorized subjects
              </span>
            </div>
          </div>

          {/* Average Attendance */}
          <div className="group relative overflow-hidden rounded-2xl border border-emerald-200/80 bg-linear-to-b from-emerald-500/5 via-card to-card p-4 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-emerald-300 dark:border-emerald-900/50 dark:from-emerald-950/20">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="size-5" />
              </div>
              <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                Average
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className={cn("text-2xl lg:text-3xl font-black tracking-tight leading-none", pctColor(avgAttendance))}>
                {avgAttendance}%
              </span>
              <span className="text-xs font-bold text-foreground/80 mt-1">
                Overall Attendance
              </span>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                <CheckCircle2 className="size-3 text-emerald-500 shrink-0" />
                Live average across records
              </span>
            </div>
          </div>

          {/* Top Subject */}
          <div className="group relative overflow-hidden rounded-2xl border border-amber-200/80 bg-linear-to-b from-amber-500/5 via-card to-card p-4 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-amber-300 dark:border-amber-900/50 dark:from-amber-950/20">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Sparkles className="size-5" />
              </div>
              <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                Top Subject
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xl lg:text-2xl font-black tracking-tight text-foreground leading-tight truncate" title={bestSubject.name}>
                {bestSubject.name}
              </span>
              <span className="text-xs font-bold text-foreground/80 mt-1">
                {bestSubject.avg > 0 ? `${bestSubject.avg}% Avg Attendance` : "No sessions"}
              </span>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                <BookOpen className="size-3 text-amber-500 shrink-0" />
                Highest performing subject
              </span>
            </div>
          </div>

          {/* At-Risk Sessions (<75%) */}
          {lowSessions > 0 ? (
            <div className="group relative overflow-hidden rounded-2xl border border-rose-200/80 bg-linear-to-b from-rose-500/5 via-card to-card p-4 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-rose-300 dark:border-rose-900/50 dark:from-rose-950/20">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="size-5" />
                </div>
                <span className="rounded-md bg-rose-500/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                  At Risk
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-2xl lg:text-3xl font-black tracking-tight text-rose-600 dark:text-rose-400 leading-none">
                  {lowSessions}
                </span>
                <span className="text-xs font-bold text-foreground/80 mt-1">
                  Below 75% Target
                </span>
                <span className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                  <AlertTriangle className="size-3 text-rose-500 shrink-0" />
                  Sessions needing review
                </span>
              </div>
            </div>
          ) : (
            <div className="group relative overflow-hidden rounded-2xl border border-emerald-200/80 bg-linear-to-b from-emerald-500/5 via-card to-card p-4 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-emerald-300 dark:border-emerald-900/50 dark:from-emerald-950/20">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="size-5" />
                </div>
                <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  On Track
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-2xl lg:text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400 leading-none">
                  0
                </span>
                <span className="text-xs font-bold text-foreground/80 mt-1">
                  All Meets Target
                </span>
                <span className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                  <ShieldCheck className="size-3 text-emerald-500 shrink-0" />
                  100% on track
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Per-subject summary strip */}
        {filtered.length > 0 && <SubjectSummaryStrip sessions={filtered} />}
      </motion.div>

      {/* ── Loading Skeleton ───────────────────────────────── */}
      {loading && <AttendanceHistorySkeleton />}

      {/* ── Empty State ────────────────────────────────────── */}
      {!loading && filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/80 bg-card/60 py-16 text-center text-sm text-muted-foreground flex flex-col items-center justify-center gap-2">
          <BookOpen className="size-8 text-muted-foreground/50 mb-1" />
          <p className="font-bold text-foreground">
            {sessions.length === 0 ? "No finalized sessions recorded." : "No records match your filters."}
          </p>
          <p className="text-xs text-muted-foreground max-w-sm">
            {sessions.length === 0
              ? "Conduct a lecture session via QR Attendance or Missed Attendance to view history here."
              : "Try adjusting your subject, class, or date range filters."}
          </p>
        </div>
      )}

      {/* ── Option 1: High-Density 2-Column Bento Timeline ── */}
      {!loading && filtered.length > 0 && (
        <motion.div variants={itemVariants} className="flex flex-col gap-5">
          {groupedDays.map((day) => (
            <div
              key={day.rawDate}
              className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card/40 p-4 shadow-2xs"
            >
              {/* Single Clean Day Banner (No Duplicate Sub-Headers!) */}
              <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-border/70 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <CalendarDays className="size-4" />
                  </div>
                  <span className="text-sm font-extrabold text-foreground">
                    {day.dayLabel}
                  </span>
                </div>

                {/* Single Aggregate Badge for the Day */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground bg-muted/60 border border-border/60 px-2.5 py-0.5 rounded-lg shadow-2xs">
                    {day.totalLectures} lecture{day.totalLectures !== 1 ? "s" : ""}
                  </span>
                  <span className={cn("text-xs font-black px-2.5 py-0.5 rounded-lg border shadow-2xs", pctBg(day.avgPercentage))}>
                    avg {day.avgPercentage}%
                  </span>
                </div>
              </div>

              {/* Option 3: Day-Level Year Switcher Tabs */}
              {day.hasMultipleYears && (
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/50 border border-border/70 overflow-x-auto select-none">
                  <button
                    type="button"
                    onClick={() =>
                      setDayYearFilters((prev) => ({
                        ...prev,
                        [day.rawDate]: "all",
                      }))
                    }
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                      (dayYearFilters[day.rawDate] || "all") === "all"
                        ? "bg-card text-foreground shadow-2xs border border-border/80"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span>All Years</span>
                    <Badge
                      variant="secondary"
                      className="text-[10px] font-extrabold px-1.5 py-0 h-4 rounded-md"
                    >
                      {day.totalLectures}
                    </Badge>
                  </button>

                  {day.yearGroups.map((yrGroup) => {
                    const isSelected = dayYearFilters[day.rawDate] === yrGroup.year
                    return (
                      <button
                        key={yrGroup.year}
                        type="button"
                        onClick={() =>
                          setDayYearFilters((prev) => ({
                            ...prev,
                            [day.rawDate]: yrGroup.year,
                          }))
                        }
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap border",
                          isSelected
                            ? yrGroup.theme.activeTab
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <span
                          className={cn(
                            "size-2 rounded-full shrink-0",
                            isSelected ? "bg-white" : yrGroup.theme.dot
                          )}
                        />
                        <GraduationCap className="size-3.5 shrink-0" />
                        <span>{yrGroup.year}</span>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px] font-extrabold px-1.5 py-0 h-4 rounded-md",
                            isSelected ? "bg-white/20 text-white" : ""
                          )}
                        >
                          {yrGroup.totalLectures}
                        </Badge>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Option 1: Dedicated Year Container Blocks */}
              {(() => {
                const currentFilter = dayYearFilters[day.rawDate] || "all"
                const visibleYearGroups =
                  currentFilter === "all"
                    ? day.yearGroups
                    : day.yearGroups.filter((yg) => yg.year === currentFilter)

                if (day.hasMultipleYears) {
                  return (
                    <div className="flex flex-col gap-4">
                      {visibleYearGroups.map((yrGroup) => (
                        <div
                          key={yrGroup.year}
                          className={cn(
                            "flex flex-col rounded-2xl border overflow-hidden shadow-2xs transition-all",
                            yrGroup.theme.containerBorder,
                            yrGroup.theme.containerBg
                          )}
                        >
                          {/* Dedicated Elevated Year Header */}
                          <div
                            className={cn(
                              "flex items-center justify-between px-4 py-2.5",
                              yrGroup.theme.headerBg
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className={cn("size-2.5 rounded-full shrink-0", yrGroup.theme.dot)} />
                              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                <span className="text-sm font-black tracking-tight text-foreground flex items-center gap-1.5 truncate">
                                  <GraduationCap className={cn("size-4", yrGroup.theme.accentText)} />
                                  {yrGroup.year}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-card/90 border-border/80 text-foreground shadow-2xs"
                                >
                                  {yrGroup.totalLectures} lecture{yrGroup.totalLectures !== 1 ? "s" : ""}
                                </Badge>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 text-xs font-bold shrink-0">
                              <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300 bg-card/80 px-2 py-0.5 rounded-lg border border-emerald-500/20 shadow-2xs">
                                <span className="size-1.5 rounded-full bg-emerald-500" />
                                {yrGroup.totalPresent} Pres
                              </span>
                              <span className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-300 bg-card/80 px-2 py-0.5 rounded-lg border border-rose-500/20 shadow-2xs">
                                <span className="size-1.5 rounded-full bg-rose-500" />
                                {yrGroup.totalAbsent} Abs
                              </span>
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded-lg border text-xs font-black shadow-2xs",
                                  pctBg(yrGroup.avgPercentage)
                                )}
                              >
                                {yrGroup.avgPercentage}% Avg
                              </span>
                            </div>
                          </div>

                          {/* Inner Lecture Cards Canvas */}
                          <div className="p-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {yrGroup.sessions.map((s) => {
                                const theme = getSubjectTheme(s.subject)
                                const yrTheme = getYearTheme(s.year)
                                return (
                                  <div
                                    key={s.id}
                                    onClick={() => setSelectedSession(s)}
                                    className={cn(
                                      "group relative flex flex-col justify-between gap-3 rounded-2xl border p-4 shadow-2xs cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md bg-card",
                                      theme.border,
                                      theme.bgLinear
                                    )}
                                  >
                                    {/* Top Row: Subject Title + Subject Code + Period Badge + Period Time */}
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex flex-col min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-sm font-black text-foreground group-hover:text-primary transition-colors truncate">
                                            {s.subject}
                                          </span>
                                          {s.subjectCode && (
                                            <span
                                              className={cn(
                                                "text-[10px] font-black uppercase px-1.5 py-0.2 rounded border shadow-2xs",
                                                theme.accentBg
                                              )}
                                            >
                                              {s.subjectCode}
                                            </span>
                                          )}
                                        </div>

                                        {/* Academic Cohort Badges + Method Badge */}
                                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                          <Badge
                                            variant="outline"
                                            className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-primary/10 text-primary border-primary/30 tracking-wider uppercase flex items-center gap-1 shadow-2xs"
                                          >
                                            <Building2 className="size-3 mr-0.5" />
                                            {s.departmentCode ? `${s.departmentCode}-${s.section || "A"}` : s.class}
                                          </Badge>
                                          {s.year && (
                                            <span
                                              className={cn(
                                                "inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-lg border shadow-2xs",
                                                yrTheme.badge
                                              )}
                                            >
                                              <GraduationCap className="size-3 shrink-0" />
                                              {s.year}
                                            </span>
                                          )}
                                          {s.method === "qr" ? (
                                            <Badge
                                              variant="outline"
                                              className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300/60 dark:border-emerald-800/60 shadow-2xs flex items-center gap-1"
                                              title="Marked via live classroom QR scan"
                                            >
                                              <QrCode className="size-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                              <span>Live QR</span>
                                            </Badge>
                                          ) : (
                                            <Badge
                                              variant="outline"
                                              className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300/60 dark:border-amber-800/60 shadow-2xs flex items-center gap-1"
                                              title="Manually marked / backfilled"
                                            >
                                              <FileEdit className="size-3 text-amber-600 dark:text-amber-400 shrink-0" />
                                              <span>Manual Entry</span>
                                            </Badge>
                                          )}
                                        </div>
                                      </div>

                                      {/* Period Badge & Time */}
                                      <div className="flex flex-col items-end shrink-0 gap-1">
                                        <span
                                          className={cn(
                                            "text-[10px] font-extrabold px-2 py-0.5 rounded-md",
                                            theme.periodBadge
                                          )}
                                        >
                                          {s.periodShort}
                                        </span>
                                        {s.periodTime && (
                                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-foreground bg-muted/80 border border-border/70 px-2 py-0.5 rounded-md shadow-2xs">
                                            <Clock className="size-3 text-muted-foreground shrink-0" />
                                            {s.periodTime}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Bottom Row: Presence Tally + Percentage + Arrow */}
                                    <div className="flex items-center justify-between pt-2.5 border-t border-border/60">
                                      <div className="flex items-center gap-1.5 text-xs">
                                        <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 shadow-2xs">
                                          <span className="size-1.5 rounded-full bg-emerald-500" />
                                          {s.present} Present
                                        </span>
                                        <span className="inline-flex items-center gap-1 rounded-lg bg-rose-500/10 border border-rose-500/25 px-2 py-0.5 text-xs font-bold text-rose-700 dark:text-rose-300 shadow-2xs">
                                          <span className="size-1.5 rounded-full bg-rose-500" />
                                          {s.absent} Absent
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-1.5">
                                        <span
                                          className={cn(
                                            "text-xs font-black px-2.5 py-0.5 rounded-lg border shadow-2xs",
                                            pctBg(s.percentage))
                                          }
                                        >
                                          {s.percentage}%
                                        </span>
                                        <ChevronRight className="size-4 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                }

                /* Single Year: 2-Column Bento Grid for Lectures */
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {day.sessions.map((s) => {
                      const theme = getSubjectTheme(s.subject)
                      const yrTheme = getYearTheme(s.year)
                      return (
                        <div
                          key={s.id}
                          onClick={() => setSelectedSession(s)}
                          className={cn(
                            "group relative flex flex-col justify-between gap-3 rounded-2xl border p-4 shadow-2xs cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md bg-card",
                            theme.border,
                            theme.bgLinear
                          )}
                        >
                          {/* Top Row: Subject Title + Subject Code + Period Badge + Period Time */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-black text-foreground group-hover:text-primary transition-colors truncate">
                                  {s.subject}
                                </span>
                                {s.subjectCode && (
                                  <span
                                    className={cn(
                                      "text-[10px] font-black uppercase px-1.5 py-0.2 rounded border shadow-2xs",
                                      theme.accentBg
                                    )}
                                  >
                                    {s.subjectCode}
                                  </span>
                                )}
                              </div>

                              {/* Academic Cohort Badges + Method Badge */}
                              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-primary/10 text-primary border-primary/30 tracking-wider uppercase flex items-center gap-1 shadow-2xs"
                                >
                                  <Building2 className="size-3 mr-0.5" />
                                  {s.departmentCode ? `${s.departmentCode}-${s.section || "A"}` : s.class}
                                </Badge>
                                {s.year && (
                                  <span
                                    className={cn(
                                      "inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-lg border shadow-2xs",
                                      yrTheme.badge
                                    )}
                                  >
                                    <GraduationCap className="size-3 shrink-0" />
                                    {s.year}
                                  </span>
                                )}
                                {s.method === "qr" ? (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300/60 dark:border-emerald-800/60 shadow-2xs flex items-center gap-1"
                                    title="Marked via live classroom QR scan"
                                  >
                                    <QrCode className="size-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                    <span>Live QR</span>
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300/60 dark:border-amber-800/60 shadow-2xs flex items-center gap-1"
                                    title="Manually marked / backfilled"
                                  >
                                    <FileEdit className="size-3 text-amber-600 dark:text-amber-400 shrink-0" />
                                    <span>Manual Entry</span>
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Period Badge & Time */}
                            <div className="flex flex-col items-end shrink-0 gap-1">
                              <span
                                className={cn(
                                  "text-[10px] font-extrabold px-2 py-0.5 rounded-md",
                                  theme.periodBadge
                                )}
                              >
                                {s.periodShort}
                              </span>
                              {s.periodTime && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-foreground bg-muted/80 border border-border/70 px-2 py-0.5 rounded-md shadow-2xs">
                                  <Clock className="size-3 text-muted-foreground shrink-0" />
                                  {s.periodTime}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Bottom Row: Presence Tally + Percentage + Arrow */}
                          <div className="flex items-center justify-between pt-2.5 border-t border-border/60">
                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 shadow-2xs">
                                <span className="size-1.5 rounded-full bg-emerald-500" />
                                {s.present} Present
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-lg bg-rose-500/10 border border-rose-500/25 px-2 py-0.5 text-xs font-bold text-rose-700 dark:text-rose-300 shadow-2xs">
                                <span className="size-1.5 rounded-full bg-rose-500" />
                                {s.absent} Absent
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span
                                className={cn(
                                  "text-xs font-black px-2.5 py-0.5 rounded-lg border shadow-2xs",
                                  pctBg(s.percentage)
                                )}
                              >
                                {s.percentage}%
                              </span>
                              <ChevronRight className="size-4 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
          ))}
        </motion.div>
      )}

      {/* ── Session Details Sheet Drawer ───────────────────── */}
      <Sheet open={!!selectedSession} onOpenChange={(open) => !open && setSelectedSession(null)}>
        <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-lg font-black">Session Details</SheetTitle>
            <SheetDescription className="text-xs">
              Student-level presence breakdown & verification audit.
            </SheetDescription>
          </SheetHeader>

          {selectedSession && (
            <div className="flex flex-col gap-5 px-4 py-3">
              {/* Session info card */}
              <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs">
                <div className="h-1.5 w-full bg-linear-to-r from-primary via-primary/80 to-primary/60" />
                <div className="p-4 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-base font-extrabold text-foreground">
                      {selectedSession.subject}
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge
                        variant="outline"
                        className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-primary/10 text-primary border-primary/30 tracking-wider uppercase flex items-center gap-1 shadow-2xs"
                      >
                        <Building2 className="size-3 mr-0.5" />
                        {selectedSession.departmentCode ? `${selectedSession.departmentCode}-${selectedSession.section || "A"}` : selectedSession.class}
                      </Badge>
                      {selectedSession.year && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-lg border border-border/60 shadow-2xs">
                          <GraduationCap className="size-3 text-primary shrink-0" />
                          {selectedSession.year}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Period + Timings + Method Pill */}
                  <div className="flex items-center gap-2 text-xs flex-wrap mt-0.5">
                    <span className="font-bold text-foreground bg-muted/80 border border-border/70 px-2 py-0.5 rounded-md shadow-2xs">
                      {selectedSession.periodShort}
                    </span>
                    {selectedSession.periodTime && (
                      <span className="inline-flex items-center gap-1 font-semibold text-muted-foreground bg-muted/50 border border-border/60 px-2 py-0.5 rounded-md">
                        <Clock className="size-3 text-muted-foreground/70" />
                        {selectedSession.periodTime}
                      </span>
                    )}
                    {selectedSession.method === "qr" ? (
                      <Badge
                        variant="outline"
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300/60 dark:border-emerald-800/60 shadow-2xs flex items-center gap-1"
                      >
                        <QrCode className="size-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>Live QR</span>
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300/60 dark:border-amber-800/60 shadow-2xs flex items-center gap-1"
                      >
                        <FileEdit className="size-3 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>Manual Entry</span>
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground font-medium ml-auto">
                      {selectedSession.date}
                    </span>
                  </div>
                </div>

                {/* Presence Tally Footer */}
                <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-md shadow-2xs">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      {selectedSession.present} Present
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/25 px-2 py-0.5 rounded-md shadow-2xs">
                      <span className="size-1.5 rounded-full bg-rose-500" />
                      {selectedSession.absent} Absent
                    </span>
                  </div>
                  <span className={cn("text-lg font-black", pctColor(selectedSession.percentage))}>
                    {selectedSession.percentage}%
                  </span>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <Button
                  variant="outline"
                  className="gap-2 flex-1 w-full h-10 rounded-xl font-bold shadow-2xs hover:shadow transition-all cursor-pointer bg-card hover:bg-muted text-xs"
                  disabled={detailLoading || detailStudents.length === 0}
                  onClick={() => {
                    exportDetailCSV(selectedSession, detailStudents)
                    toast.success("Session student details exported.")
                  }}
                >
                  <Download className="size-3.5" />
                  Export Session CSV
                </Button>

                {selectedSession.absent > 0 && (
                  (() => {
                    const notifiedCount = detailSessionSummary?.notifiedAbsentCount ?? 0
                    const emailableCount = detailSessionSummary?.emailableAbsentCount ?? (detailSessionSummary?.pendingAbsentCount ?? selectedSession.absent)
                    const noEmailCount = detailSessionSummary?.noEmailAbsentCount ?? 0
                    const totalAbsent = selectedSession.absent

                    // Case 1: All absentees were already notified
                    if (notifiedCount > 0 && notifiedCount === totalAbsent) {
                      return (
                        <div className="flex-1 w-full h-10 rounded-xl border border-emerald-300/70 dark:border-emerald-800/70 bg-emerald-500/10 px-3 flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-300 shadow-2xs">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span className="truncate">All Notified ({totalAbsent})</span>
                          </div>
                          <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20">
                            <Link href="/teacher/absence-notifications">
                              <span>History</span>
                              <ArrowUpRight className="size-3 ml-0.5" />
                            </Link>
                          </Button>
                        </div>
                      )
                    }

                    // Case 2: All remaining unnotified absentees lack a registered email address
                    if (emailableCount === 0 && noEmailCount > 0) {
                      return (
                        <div className="flex-1 w-full h-10 rounded-xl border border-amber-300/70 dark:border-amber-800/70 bg-amber-500/10 px-3 flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-300 shadow-2xs">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <AlertCircle className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                            <span className="truncate">Email Not Configured ({noEmailCount})</span>
                          </div>
                          <span className="text-[10px] text-amber-600/80 font-medium hidden sm:inline">
                            Ask admin to add email
                          </span>
                        </div>
                      )
                    }

                    // Case 3: We have at least 1 student eligible to be notified
                    return (
                      <Button
                        asChild
                        variant="outline"
                        className="gap-1.5 flex-1 w-full h-10 rounded-xl font-bold shadow-2xs hover:shadow transition-all cursor-pointer bg-card hover:bg-muted text-primary border-primary/30 text-xs"
                      >
                        <Link
                          href={`/teacher/absence-notifications?date=${selectedSession.rawDate}&classId=${selectedSession.classId}&subjectId=${selectedSession.subjectId}&sessionId=${selectedSession.id}`}
                        >
                          <Mail className="size-3.5 text-primary" />
                          <span>
                            Notify Absentees ({emailableCount}{noEmailCount > 0 ? ` of ${totalAbsent}` : ""})
                          </span>
                          <ArrowUpRight className="size-3 opacity-60 ml-auto sm:ml-0" />
                        </Link>
                      </Button>
                    )
                  })()
                )}
              </div>

              {/* Student breakdown */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Users className="size-3.5" /> Student Roster ({detailStudents.length})
                  </h3>
                  {!detailLoading && (
                    <div className="flex items-center gap-1.5 text-[11px] font-bold">
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {detailStudents.filter((s) => s.status === "Present").length} Present
                      </span>
                      <span className="text-muted-foreground/40">·</span>
                      <span className="text-rose-600 dark:text-rose-400">
                        {detailStudents.filter((s) => s.status === "Absent").length} Absent
                      </span>
                    </div>
                  )}
                </div>

                {/* Instant Student Search Box */}
                {!detailLoading && detailStudents.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <div className="relative w-full">
                      <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      <Input
                        placeholder="Search student name or roll number..."
                        value={drawerSearch}
                        onChange={(e) => setDrawerSearch(e.target.value)}
                        className="h-9 pl-8.5 pr-8 text-xs rounded-xl bg-muted/40 border-border/70 focus-visible:ring-primary/20"
                      />
                      {drawerSearch && (
                        <button
                          type="button"
                          onClick={() => setDrawerSearch("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          aria-label="Clear search"
                        >
                          <X className="size-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Quick Status Filter Segmented Buttons */}
                    <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/40 border border-border/60 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setDrawerStatusFilter("all")}
                        className={cn(
                          "flex-1 py-1 rounded-lg text-center transition-all cursor-pointer text-[11px]",
                          drawerStatusFilter === "all"
                            ? "bg-card text-foreground shadow-2xs border border-border/80"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        All ({detailStudents.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setDrawerStatusFilter("absent")}
                        className={cn(
                          "flex-1 py-1 rounded-lg text-center transition-all cursor-pointer flex items-center justify-center gap-1 text-[11px]",
                          drawerStatusFilter === "absent"
                            ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 shadow-2xs border border-rose-300/60 dark:border-rose-800/60"
                            : "text-rose-600/80 hover:text-rose-700"
                        )}
                      >
                        <span className="size-1.5 rounded-full bg-rose-500 shrink-0" />
                        Absent ({detailStudents.filter((s) => s.status === "Absent").length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setDrawerStatusFilter("present")}
                        className={cn(
                          "flex-1 py-1 rounded-lg text-center transition-all cursor-pointer flex items-center justify-center gap-1 text-[11px]",
                          drawerStatusFilter === "present"
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 shadow-2xs border border-emerald-300/60 dark:border-emerald-800/60"
                            : "text-emerald-600/80 hover:text-emerald-700"
                        )}
                      >
                        <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
                        Present ({detailStudents.filter((s) => s.status === "Present").length})
                      </button>
                    </div>
                  </div>
                )}

                {detailLoading ? (
                  <StudentDetailsSkeleton />
                ) : detailStudents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No student attendance rows recorded for this session.
                  </p>
                ) : filteredStudents.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground rounded-xl border border-dashed border-border bg-muted/20 flex flex-col items-center gap-1.5">
                    <Search className="size-5 text-muted-foreground/50 mb-1" />
                    <span className="font-bold text-foreground">No matching students</span>
                    <span>Try changing your search query or filter tab</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {filteredStudents.map((st, i) => {
                      const isPresent = st.status === "Present"
                      return (
                        <div
                          key={`${st.rollNumber}-${i}`}
                          className={cn(
                            "flex items-center justify-between rounded-xl border p-3 shadow-2xs transition-all",
                            isPresent
                              ? "bg-emerald-500/5 border-emerald-500/25 hover:border-emerald-500/40"
                              : "bg-rose-500/5 border-rose-500/25 hover:border-rose-500/40"
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Avatar Initials */}
                            <div
                              className={cn(
                                "flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-extrabold shadow-2xs",
                                isPresent
                                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                                  : "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30"
                              )}
                            >
                              {st.name
                                .split(" ")
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join("")
                                .toUpperCase()}
                            </div>

                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-bold text-foreground truncate">
                                {st.name}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className="font-mono text-[11px] font-bold text-foreground bg-muted/80 px-1.5 py-0.2 rounded border border-border/70 shadow-2xs">
                                  {st.rollNumber}
                                </span>
                                {st.departmentCode && (
                                  <span className="text-[10px] font-extrabold text-primary bg-primary/10 border border-primary/25 px-1.5 py-0.2 rounded shadow-2xs">
                                    {st.departmentCode}-{st.section || "A"}
                                  </span>
                                )}
                                {st.year && (
                                  <span className="text-[10px] font-bold text-muted-foreground bg-muted/40 border border-border/50 px-1.5 py-0.2 rounded">
                                    {st.year}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <Badge
                              className={cn(
                                "gap-1 font-bold text-xs shadow-2xs",
                                isPresent
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                  : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"
                              )}
                            >
                              {isPresent ? (
                                <>
                                  <CheckCircle2 className="size-3 text-emerald-500" />
                                  Present
                                </>
                              ) : (
                                <>
                                  <AlertTriangle className="size-3 text-rose-500" />
                                  Absent
                                </>
                              )}
                            </Badge>
                            {!isPresent && (
                              st.alreadyNotified ? (
                                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-300/50 dark:border-emerald-800/50 px-1.5 py-0.2 rounded-md shadow-2xs flex items-center gap-1">
                                  <Check className="size-2.5" />
                                  Email Sent
                                </span>
                              ) : !st.hasEmail ? (
                                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-300/50 dark:border-amber-800/50 px-1.5 py-0.2 rounded-md shadow-2xs flex items-center gap-1">
                                  <AlertCircle className="size-2.5" />
                                  No Email
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-sky-700 dark:text-sky-300 bg-sky-500/10 border border-sky-300/50 dark:border-sky-800/50 px-1.5 py-0.2 rounded-md shadow-2xs flex items-center gap-1">
                                  <Clock className="size-2.5" />
                                  Pending Notify
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </motion.div>
  )
}