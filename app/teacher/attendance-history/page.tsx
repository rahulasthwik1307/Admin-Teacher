"use client"

import { useState, useMemo, useEffect } from "react"
import { toast } from "sonner"
import { motion, useReducedMotion, type Variants } from "framer-motion"
import {
  Download,
  CalendarDays,
  TrendingUp,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Users,
  X,
  ShieldCheck,
  Clock,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
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
import { useAttendanceHistory } from "@/hooks/use-attendance-history"
import { createClient } from "@/lib/supabase/client"

/* ── types ─────────────────────────────────────────────── */
interface Session {
  id: string
  date: string
  rawDate: string
  subject: string
  subjectId: string
  class: string        // formatted as "CSE-A"
  classId: string
  period: string
  periodShort: string  // e.g. "1st Period"
  periodTime: string   // e.g. "09:15 - 10:10"
  present: number
  absent: number
  percentage: number
  status: "Finalized"
}

interface DetailStudent {
  name: string
  roll: string
  status: "Present" | "Absent"
}

/* ── helpers ───────────────────────────────────────────── */
function pctColor(pct: number) {
  if (pct >= 75) return "text-emerald-600 dark:text-emerald-400"
  if (pct >= 60) return "text-amber-600 dark:text-amber-400"
  return "text-rose-600 dark:text-rose-400"
}

function pctBg(pct: number) {
  if (pct >= 75) return "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
  if (pct >= 60) return "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300"
  return "bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300"
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function getDayLabel(rawDate: string): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const d = new Date(rawDate + "T00:00:00")
  d.setHours(0, 0, 0, 0)
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000)
  if (diff === 0) return "Today"
  if (diff === 1) return "Yesterday"
  return d.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "short", year: "numeric" })
}

function getOrdinal(n: number): string {
  if (n >= 11 && n <= 13) return `${n}th`
  switch (n % 10) {
    case 1: return `${n}st`
    case 2: return `${n}nd`
    case 3: return `${n}rd`
    default: return `${n}th`
  }
}

function exportSessionsCSV(sessions: Session[]) {
  const headers = ["Date", "Subject", "Class", "Period", "Present", "Absent", "Percentage", "Status"]
  const rows = sessions.map(s => [s.date, s.subject, s.class, s.period, s.present, s.absent, `${s.percentage}%`, s.status])
  const csv = [headers, ...rows].map(r => r.join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `attendance-history-${new Date().toISOString().split("T")[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function exportDetailCSV(session: Session, students: DetailStudent[]) {
  const headers = ["Name", "Roll Number", "Status"]
  const rows = students.map(s => [s.name, s.roll, s.status])
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

/* ── Grouping ──────────────────────────────────────────── */
// Returns: Map<dayLabel, Map<sectionLabel, Session[]>>
type GroupedSessions = Map<string, Map<string, Session[]>>

function groupSessions(sessions: Session[]): GroupedSessions {
  const map: GroupedSessions = new Map()
  for (const s of sessions) {
    const day = getDayLabel(s.rawDate)
    if (!map.has(day)) map.set(day, new Map())
    const dayMap = map.get(day)!
    if (!dayMap.has(s.class)) dayMap.set(s.class, [])
    dayMap.get(s.class)!.push(s)
  }
  return map
}

/* ── Per-subject summary strip ─────────────────────────── */
function SubjectSummaryStrip({ sessions }: { sessions: Session[] }) {
  const subjectMap: Record<string, { count: number; totalPct: number; lowCount: number }> = {}
  for (const s of sessions) {
    if (!subjectMap[s.subject]) subjectMap[s.subject] = { count: 0, totalPct: 0, lowCount: 0 }
    subjectMap[s.subject].count++
    subjectMap[s.subject].totalPct += s.percentage
    if (s.percentage < 75) subjectMap[s.subject].lowCount++
  }
  const subjects = Object.entries(subjectMap).map(([name, v]) => ({
    name,
    count: v.count,
    avg: Math.round(v.totalPct / v.count),
    lowCount: v.lowCount,
  }))

  if (subjects.length === 0) return null

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <div className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
          <BookOpen className="size-3.5" />
        </div>
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Per-Subject Summary
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {subjects.map((sub) => (
          <div
            key={sub.name}
            className={cn(
              "group relative flex items-center justify-between gap-3.5 rounded-xl border bg-card p-3.5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs",
              sub.avg >= 75
                ? "border-emerald-200/80 bg-linear-to-b from-emerald-500/5 via-card to-card dark:border-emerald-900/50"
                : sub.avg >= 60
                ? "border-amber-200/80 bg-linear-to-b from-amber-500/5 via-card to-card dark:border-amber-900/50"
                : "border-rose-200/80 bg-linear-to-b from-rose-500/5 via-card to-card dark:border-rose-900/50"
            )}
          >
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-foreground truncate" title={sub.name}>
                {sub.name}
              </span>
              <span className="text-xs text-muted-foreground font-medium mt-0.5">
                {sub.count} session{sub.count !== 1 ? "s" : ""} conducted
              </span>
            </div>
            <div className="flex flex-col items-end shrink-0">
              <span className={cn("text-lg font-extrabold tracking-tight leading-none", pctColor(sub.avg))}>
                {sub.avg}%
              </span>
              {sub.lowCount > 0 ? (
                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 mt-1">
                  {sub.lowCount} below 75%
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                  All on track
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Collapsible section row ───────────────────────────── */
function SectionGroup({
  section,
  sessions,
  onSelect,
}: {
  section: string
  sessions: Session[]
  onSelect: (s: Session) => void
}) {
  const [open, setOpen] = useState(true)
  const avgPct = Math.round(sessions.reduce((a, s) => a + s.percentage, 0) / sessions.length)

  return (
    <div className="flex flex-col">
      {/* Section header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 py-2.5 px-1 text-left group cursor-pointer"
      >
        <div className="flex size-5 items-center justify-center rounded-md bg-muted/80 text-muted-foreground group-hover:text-foreground transition-colors">
          {open ? (
            <ChevronDown className="size-3.5" />
          ) : (
            <ChevronRight className="size-3.5" />
          )}
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-bold text-primary">
          {section}
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          {sessions.length} session{sessions.length !== 1 ? "s" : ""}
        </span>
        <span className={cn("ml-auto text-xs font-bold px-2 py-0.5 rounded-md border", pctBg(avgPct))}>
          avg {avgPct}%
        </span>
      </button>

      {/* Subject rows */}
      {open && (
        <div className="mb-2.5 rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs divide-y divide-border/60">
          {sessions.map((s) => (
            <div
              key={s.id}
              onClick={() => onSelect(s)}
              className="group flex cursor-pointer items-center justify-between gap-3.5 px-4 py-3.5 hover:bg-muted/40 transition-all duration-150"
            >
              {/* Subject + period */}
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                  {s.subject}
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground bg-muted/70 border border-border/60 px-1.5 py-0.2 rounded-md">
                    {s.periodShort}
                  </span>
                  <span className="text-muted-foreground/40 text-xs">·</span>
                  <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                    <Clock className="size-3 text-muted-foreground/60" />
                    {s.periodTime}
                  </span>
                </div>
              </div>

              {/* Present / Absent badges */}
              <div className="hidden sm:flex items-center gap-2 text-xs shrink-0">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  {s.present} Present
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 text-xs font-bold text-rose-700 dark:text-rose-300">
                  <span className="size-1.5 rounded-full bg-rose-500" />
                  {s.absent} Absent
                </span>
              </div>

              {/* Percentage badge */}
              <span className={cn("text-sm font-extrabold shrink-0 px-2.5 py-1 rounded-lg border", pctBg(s.percentage))}>
                {s.percentage}%
              </span>

              {/* Arrow hint */}
              <ChevronRight className="size-4 text-muted-foreground/40 shrink-0 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Page ──────────────────────────────────────────────── */
export default function AttendanceHistoryPage() {
  const { data: sessions = [], isLoading: loading } = useAttendanceHistory()
  const shouldReduceMotion = useReducedMotion()

  const [subjectFilter, setSubjectFilter] = useState("all")
  const [classFilter, setClassFilter] = useState("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [detailStudents, setDetailStudents] = useState<DetailStudent[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  /* ── fetch detail students ─────────────────────────────── */
  useEffect(() => {
    if (!selectedSession) { setDetailStudents([]); return }
    const fetchDetail = async () => {
      setDetailLoading(true)
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from("period_attendance")
          .select(`status, student_id, students ( roll_number, users ( full_name ) )`)
          .eq("session_id", selectedSession.id)
          .in("status", ["present", "absent"])
          .order("status", { ascending: false })

        if (error) { toast.error("Failed to load student details."); return }

        const students: DetailStudent[] = (data ?? []).map((row: any) => ({
          name: row.students?.users?.full_name ?? "Unknown",
          roll: row.students?.roll_number ?? "—",
          status: row.status === "present" ? "Present" : "Absent",
        }))
        students.sort((a, b) => {
          if (a.status === b.status) return a.name.localeCompare(b.name)
          return a.status === "Present" ? -1 : 1
        })
        setDetailStudents(students)
      } catch (e) {
        console.error(e)
      } finally {
        setDetailLoading(false)
      }
    }
    fetchDetail()
  }, [selectedSession])

  /* ── filter options ────────────────────────────────────── */
  const subjectOptions = useMemo(() => {
    const seen = new Map<string, string>()
    sessions.forEach(s => { if (!seen.has(s.subjectId)) seen.set(s.subjectId, s.subject) })
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }))
  }, [sessions])

  const classOptions = useMemo(() => {
    const seen = new Map<string, string>()
    sessions.forEach(s => { if (!seen.has(s.classId)) seen.set(s.classId, s.class) })
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }))
  }, [sessions])

  /* ── filtered sessions ─────────────────────────────────── */
  const filtered = useMemo(() => {
    return sessions.filter(s => {
      if (subjectFilter !== "all" && s.subjectId !== subjectFilter) return false
      if (classFilter !== "all" && s.classId !== classFilter) return false
      if (startDate && s.rawDate < startDate) return false
      if (endDate && s.rawDate > endDate) return false
      return true
    })
  }, [sessions, subjectFilter, classFilter, startDate, endDate])

  /* ── grouped sessions ──────────────────────────────────── */
  const grouped = useMemo(() => groupSessions(filtered), [filtered])

  /* ── summary stats ─────────────────────────────────────── */
  const totalSessions = filtered.length
  const avgAttendance = filtered.length > 0
    ? Math.round(filtered.reduce((a, s) => a + s.percentage, 0) / filtered.length)
    : 0
  const lowSessions = filtered.filter(s => s.percentage < 75).length

  const subjectStatMap: Record<string, number[]> = {}
  filtered.forEach(s => {
    if (!subjectStatMap[s.subject]) subjectStatMap[s.subject] = []
    subjectStatMap[s.subject].push(s.percentage)
  })
  let bestSubject = { name: "—", avg: 0 }
  Object.entries(subjectStatMap).forEach(([name, pcts]) => {
    const avg = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length)
    if (avg > bestSubject.avg) bestSubject = { name, avg }
  })

  const hasActiveFilters = subjectFilter !== "all" || classFilter !== "all" || startDate !== "" || endDate !== ""

  const clearFilters = () => {
    setSubjectFilter("all")
    setClassFilter("all")
    setStartDate("")
    setEndDate("")
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
      {/* ── Page description ── */}
      <motion.div variants={itemVariants} className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground -mt-1">
          Historical attendance logs, session breakdowns, and student presence records.
        </p>
      </motion.div>

      {/* ── Filter toolbar ─────────────────────────────────── */}
      <motion.div variants={itemVariants} className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        
        {/* Premium Connected Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center rounded-2xl border border-border/80 bg-card shadow-2xs w-full lg:w-auto overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-border/70">
          
          {/* Subject Filter */}
          <div className="flex items-center gap-3 px-4 py-2.5 flex-1 sm:w-56 hover:bg-muted/20 transition-colors">
            <BookOpen className="size-4 text-muted-foreground shrink-0" />
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Subject</span>
              <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                <SelectTrigger className="border-0 bg-transparent p-0 h-auto shadow-none focus:ring-0 focus:ring-offset-0 font-medium text-xs w-full outline-none [&>svg]:opacity-50 hover:bg-transparent cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {subjectOptions.map(opt => <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Class Filter */}
          <div className="flex items-center gap-3 px-4 py-2.5 flex-1 sm:w-48 hover:bg-muted/20 transition-colors">
            <Users className="size-4 text-muted-foreground shrink-0" />
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Class</span>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="border-0 bg-transparent p-0 h-auto shadow-none focus:ring-0 focus:ring-offset-0 font-medium text-xs w-full outline-none [&>svg]:opacity-50 hover:bg-transparent cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classOptions.map(opt => <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="flex items-center gap-3 px-4 py-2.5 flex-1 hover:bg-muted/20 transition-colors">
            <CalendarDays className="size-4 text-muted-foreground shrink-0" />
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Date Range</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="bg-muted/40 hover:bg-muted/60 border border-border/70 focus:border-primary/50 rounded-lg px-2 py-0.5 text-xs font-medium text-foreground outline-none transition-all cursor-pointer w-full max-w-31"
                  aria-label="Start date"
                />
                <span className="text-[10px] font-bold text-muted-foreground/60 uppercase">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="bg-muted/40 hover:bg-muted/60 border border-border/70 focus:border-primary/50 rounded-lg px-2 py-0.5 text-xs font-medium text-foreground outline-none transition-all cursor-pointer w-full max-w-31"
                  aria-label="End date"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Clear & Export Buttons */}
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
            className="gap-2 h-11 rounded-xl font-semibold shadow-2xs hover:shadow transition-all cursor-pointer shrink-0 w-full sm:w-auto"
            disabled={filtered.length === 0}
            onClick={() => { exportSessionsCSV(filtered); toast.success("Exported successfully.") }}
          >
            <Download className="size-4" />
            Export CSV
          </Button>
        </div>
      </motion.div>

      {/* ── Summary stats ───────────────────────────────────── */}
      <motion.div variants={itemVariants} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Total Sessions */}
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
                {totalSessions}
              </span>
              <span className="text-xs font-semibold text-foreground/80 mt-1">
                Total Sessions
              </span>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                <BookOpen className="size-3 text-sky-500 shrink-0" />
                Finalized lecture records
              </span>
            </div>
          </div>

          {/* Average Attendance */}
          <div className="group relative overflow-hidden rounded-xl border border-emerald-200/80 bg-linear-to-b from-emerald-500/5 via-card to-card p-3.5 lg:p-4 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-emerald-300 dark:border-emerald-900/50 dark:from-emerald-950/20">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex size-8.5 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="size-4.5" />
              </div>
              <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                Average
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className={cn("text-2xl lg:text-3xl font-extrabold tracking-tight leading-none", pctColor(avgAttendance))}>
                {avgAttendance}%
              </span>
              <span className="text-xs font-semibold text-foreground/80 mt-1">
                Avg Attendance
              </span>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                <CheckCircle2 className="size-3 text-emerald-500 shrink-0" />
                Across filtered sessions
              </span>
            </div>
          </div>

          {/* Best Subject */}
          <div className="group relative overflow-hidden rounded-xl border border-amber-200/80 bg-linear-to-b from-amber-500/5 via-card to-card p-3.5 lg:p-4 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-amber-300 dark:border-amber-900/50 dark:from-amber-950/20">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex size-8.5 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <BookOpen className="size-4.5" />
              </div>
              <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                Top Subject
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xl lg:text-2xl font-extrabold tracking-tight text-foreground leading-tight truncate" title={bestSubject.name}>
                {bestSubject.name}
              </span>
              <span className="text-xs font-semibold text-foreground/80 mt-1">
                {bestSubject.avg > 0 ? `${bestSubject.avg}% Average` : "No records"}
              </span>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                <Sparkles className="size-3 text-amber-500 shrink-0" />
                Highest performing cohort
              </span>
            </div>
          </div>

          {/* Low Sessions / All on track */}
          {lowSessions > 0 ? (
            <div className="group relative overflow-hidden rounded-xl border border-rose-200/80 bg-linear-to-b from-rose-500/5 via-card to-card p-3.5 lg:p-4 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-rose-300 dark:border-rose-900/50 dark:from-rose-950/20">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex size-8.5 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="size-4.5" />
                </div>
                <span className="rounded-md bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                  At Risk
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-2xl lg:text-3xl font-extrabold tracking-tight text-rose-600 dark:text-rose-400 leading-none">
                  {lowSessions}
                </span>
                <span className="text-xs font-semibold text-foreground/80 mt-1">
                  Below 75% Target
                </span>
                <span className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                  <AlertTriangle className="size-3 text-rose-500 shrink-0" />
                  Sessions needing review
                </span>
              </div>
            </div>
          ) : (
            <div className="group relative overflow-hidden rounded-xl border border-emerald-200/80 bg-linear-to-b from-emerald-500/5 via-card to-card p-3.5 lg:p-4 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-emerald-300 dark:border-emerald-900/50 dark:from-emerald-950/20">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex size-8.5 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="size-4.5" />
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
                  Below 75% Target
                </span>
                <span className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                  <ShieldCheck className="size-3 text-emerald-500 shrink-0" />
                  All sessions meet target
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Per-subject summary strip */}
        {filtered.length > 0 && <SubjectSummaryStrip sessions={filtered} />}
      </motion.div>

      {/* ── Loading ─────────────────────────────────────────── */}
      {loading && <AttendanceHistorySkeleton />}

      {/* ── Grouped sessions ────────────────────────────────── */}
      {!loading && filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/80 bg-card/60 py-16 text-center text-sm text-muted-foreground">
          {sessions.length === 0 ? "No finalized sessions yet." : "No records match your filters."}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <motion.div variants={itemVariants} className="flex flex-col gap-6">
          {Array.from(grouped.entries()).map(([day, sectionMap]) => {
            const daySessions = Array.from(sectionMap.values()).flat()
            const dayAvg = Math.round(daySessions.reduce((a, s) => a + s.percentage, 0) / daySessions.length)

            return (
              <div key={day} className="flex flex-col gap-2">
                {/* Day header */}
                <div className="flex items-center gap-3 mb-1">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="size-4 text-primary" />
                    <span className="text-sm font-bold text-foreground">{day}</span>
                  </div>
                  <div className="flex-1 h-px bg-border/80" />
                  <span className={cn("text-xs font-bold px-2 py-0.5 rounded-md border", pctBg(dayAvg))}>
                    avg {dayAvg}%
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground bg-muted/60 border border-border/60 px-2 py-0.5 rounded-md">
                    {daySessions.length} session{daySessions.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Sections within day */}
                <div className="flex flex-col gap-1.5 pl-3 border-l-2 border-border/80">
                  {Array.from(sectionMap.entries()).map(([section, sectionSessions]) => (
                    <SectionGroup
                      key={section}
                      section={section}
                      sessions={sectionSessions}
                      onSelect={setSelectedSession}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </motion.div>
      )}

      {/* ── Detail sheet ────────────────────────────────────── */}
      <Sheet open={!!selectedSession} onOpenChange={open => !open && setSelectedSession(null)}>
        <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Session Details</SheetTitle>
            <SheetDescription>Student-level attendance breakdown.</SheetDescription>
          </SheetHeader>

          {selectedSession && (
            <div className="flex flex-col gap-5 px-4 py-3">
              {/* Session info card */}
              <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs">
                <div className="h-1.5 w-full bg-linear-to-r from-primary/80 via-primary to-primary/60" />
                <div className="p-4 flex flex-col gap-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-base font-bold text-foreground">{selectedSession.subject}</span>
                    <span className="inline-flex items-center rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-xs font-semibold text-primary">
                      {selectedSession.class}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mt-0.5">
                    <span>{selectedSession.periodShort}</span>
                    {selectedSession.periodTime && (
                      <>
                        <span className="text-muted-foreground/40">·</span>
                        <span>{selectedSession.periodTime}</span>
                      </>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">{selectedSession.date}</span>
                </div>
                <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      {selectedSession.present} Present
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-md">
                      <span className="size-1.5 rounded-full bg-rose-500" />
                      {selectedSession.absent} Absent
                    </span>
                  </div>
                  <span className={cn("text-lg font-extrabold", pctColor(selectedSession.percentage))}>
                    {selectedSession.percentage}%
                  </span>
                </div>
              </div>

              {/* Export */}
              <Button
                variant="outline"
                className="gap-2 w-full h-10 rounded-xl font-semibold shadow-2xs hover:shadow transition-all cursor-pointer"
                disabled={detailLoading || detailStudents.length === 0}
                onClick={() => { exportDetailCSV(selectedSession, detailStudents); toast.success("Session exported.") }}
              >
                <Download className="size-4" />
                Export This Session CSV
              </Button>

              {/* Student breakdown */}
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Student Breakdown
                  </h3>
                  {!detailLoading && (
                    <span className="text-xs font-semibold text-muted-foreground bg-muted/60 border border-border/60 px-2 py-0.5 rounded-md">
                      {detailStudents.length} student{detailStudents.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                {detailLoading ? (
                  <StudentDetailsSkeleton />
                ) : detailStudents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No records found.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {detailStudents.map((st, i) => (
                      <div
                        key={`${st.roll}-${i}`}
                        className={cn(
                          "flex items-center justify-between rounded-xl border p-3 shadow-2xs transition-colors",
                          st.status === "Present"
                            ? "bg-emerald-500/5 border-emerald-500/20 border-l-4 border-l-emerald-500"
                            : "bg-rose-500/5 border-rose-500/20 border-l-4 border-l-rose-500"
                        )}
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-bold text-foreground">{st.name}</span>
                          <span className="font-mono text-xs text-muted-foreground bg-muted/70 border border-border/60 px-1.5 py-0.2 rounded font-semibold self-start">
                            {st.roll}
                          </span>
                        </div>
                        <Badge
                          className={cn(
                            "gap-1 font-bold text-xs",
                            st.status === "Present"
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20"
                          )}
                        >
                          {st.status === "Present"
                            ? <CheckCircle2 className="size-3 text-emerald-500" />
                            : <AlertTriangle className="size-3 text-rose-500" />
                          }
                          {st.status}
                        </Badge>
                      </div>
                    ))}
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