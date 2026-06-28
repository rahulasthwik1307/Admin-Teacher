"use client"

import { useState, useMemo, useEffect } from "react"
import { toast } from "sonner"
import {
  Download,
  CalendarDays,
  TrendingUp,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronRight,
  BarChart3,
  Users,
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
  if (pct >= 75) return "text-emerald-600"
  if (pct >= 60) return "text-amber-600"
  return "text-red-600"
}

function pctBg(pct: number) {
  if (pct >= 75) return "bg-emerald-50 border-emerald-200 text-emerald-700"
  if (pct >= 60) return "bg-amber-50 border-amber-200 text-amber-700"
  return "bg-red-50 border-red-200 text-red-700"
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
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Per-Subject Summary</p>
      <div className="flex flex-wrap gap-2">
        {subjects.map((sub) => (
          <div
            key={sub.name}
            className={cn(
              "flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm",
              pctBg(sub.avg)
            )}
          >
            <div className="flex flex-col">
              <span className="font-semibold leading-tight">{sub.name}</span>
              <span className="text-xs opacity-70">{sub.count} session{sub.count !== 1 ? "s" : ""}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-base font-bold leading-tight">{sub.avg}%</span>
              {sub.lowCount > 0 && (
                <span className="text-xs opacity-70">{sub.lowCount} below 75%</span>
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
        className="flex items-center gap-2 py-2 text-left"
      >
        {open ? (
          <ChevronDown className="size-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-3.5 text-muted-foreground" />
        )}
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
          {section}
        </span>
        <span className="text-xs text-muted-foreground">
          {sessions.length} session{sessions.length !== 1 ? "s" : ""}
        </span>
        <span className={cn("ml-auto text-xs font-semibold", pctColor(avgPct))}>
          avg {avgPct}%
        </span>
      </button>

      {/* Subject rows */}
      {open && (
        <div className="mb-2 rounded-xl border border-border bg-card overflow-hidden">
          {sessions.map((s, i) => (
            <div
              key={s.id}
              onClick={() => onSelect(s)}
              className="group flex cursor-pointer items-center gap-3 border-b border-border px-4 py-3 last:border-0 hover:bg-muted/30 transition-colors"
            >
              {/* Subject + period */}
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-semibold text-foreground">{s.subject}</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs text-muted-foreground">{s.periodShort}</span>
                  <span className="text-xs text-muted-foreground/50">·</span>
                  <span className="text-xs text-muted-foreground">{s.periodTime}</span>
                </div>
              </div>

              {/* Present / Absent */}
              <div className="hidden sm:flex items-center gap-3 text-sm shrink-0">
                <span className="text-emerald-600 font-semibold">{s.present} P</span>
                <span className="text-red-500 font-semibold">{s.absent} A</span>
              </div>

              {/* Percentage badge */}
              <span className={cn("text-sm font-bold shrink-0", pctColor(s.percentage))}>
                {s.percentage}%
              </span>

              {/* Arrow hint */}
              <ChevronRight className="size-3.5 text-muted-foreground/40 shrink-0 group-hover:text-muted-foreground transition-colors" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

import { useAttendanceHistory } from "@/hooks/use-attendance-history"
import { createClient } from "@/lib/supabase/client"

/* ── Page ──────────────────────────────────────────────── */
export default function AttendanceHistoryPage() {
  const { data: sessions = [], isLoading: loading } = useAttendanceHistory()

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

  /* ── render ────────────────────────────────────────────── */
  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground -mt-1">
        View past attendance records for your classes.
      </p>

      {/* ── Filter toolbar ─────────────────────────────────── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        
        {/* Premium Connected Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center rounded-2xl border border-border bg-card shadow-sm w-full lg:w-auto overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-border">
          
          {/* Subject Filter */}
          <div className="flex items-center gap-3 px-4 py-3 sm:py-2 flex-1 sm:w-55">
            <BookOpen className="size-4 text-muted-foreground shrink-0" />
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">Subject</span>
              <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                <SelectTrigger className="border-0 bg-transparent p-0 h-auto shadow-none focus:ring-0 focus:ring-offset-0 font-medium w-full outline-none [&>svg]:opacity-50 hover:bg-transparent">
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
          <div className="flex items-center gap-3 px-4 py-3 sm:py-2 flex-1 sm:w-45">
            <Users className="size-4 text-muted-foreground shrink-0" />
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">Class</span>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="border-0 bg-transparent p-0 h-auto shadow-none focus:ring-0 focus:ring-offset-0 font-medium w-full outline-none [&>svg]:opacity-50 hover:bg-transparent">
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
          <div className="flex items-center gap-3 px-4 py-3 sm:py-2 flex-1">
            <CalendarDays className="size-4 text-muted-foreground shrink-0" />
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">Date Range</span>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="bg-transparent border-0 p-0 text-sm font-medium text-foreground outline-none focus:ring-0 cursor-pointer w-full max-w-31.25"
                  aria-label="Start date"
                />
                <span className="text-[10px] font-semibold text-muted-foreground/60 w-4 text-center">TO</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="bg-transparent border-0 p-0 text-sm font-medium text-foreground outline-none focus:ring-0 cursor-pointer w-full max-w-31.25"
                  aria-label="End date"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Export Button */}
        <Button
          className="gap-2 sm:self-end lg:self-auto h-13 rounded-2xl w-full sm:w-auto shadow-sm shrink-0"
          disabled={filtered.length === 0}
          onClick={() => { exportSessionsCSV(filtered); toast.success("Exported successfully.") }}
        >
          <Download className="size-4" />
          Export
        </Button>
      </div>

      {/* ── Summary stats ───────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {/* Total Sessions */}
          <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-2.5 shadow-sm">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <CalendarDays className="size-4 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Total Sessions</span>
              <span className="text-sm font-bold text-foreground">{totalSessions}</span>
            </div>
          </div>

          {/* Average Attendance */}
          <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-2.5 shadow-sm">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <TrendingUp className="size-4 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Avg Attendance</span>
              <span className={cn("text-sm font-bold", pctColor(avgAttendance))}>{avgAttendance}%</span>
            </div>
          </div>

          {/* Best Subject */}
          {bestSubject.name !== "—" && (
            <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 shadow-sm">
              <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-100">
                <BookOpen className="size-4 text-emerald-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-emerald-700">Best Subject</span>
                <span className="text-sm font-bold text-emerald-800">
                  {bestSubject.name} · {bestSubject.avg}%
                </span>
              </div>
            </div>
          )}

          {/* Low sessions */}
          {lowSessions > 0 && (
            <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 shadow-sm">
              <div className="flex size-8 items-center justify-center rounded-lg bg-red-100">
                <AlertTriangle className="size-4 text-red-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-red-700">Below 75%</span>
                <span className="text-sm font-bold text-red-800">{lowSessions} session{lowSessions !== 1 ? "s" : ""}</span>
              </div>
            </div>
          )}
        </div>

        {/* Per-subject summary strip */}
        {filtered.length > 0 && <SubjectSummaryStrip sessions={filtered} />}
      </div>

      {/* ── Loading ─────────────────────────────────────────── */}
      {loading && <AttendanceHistorySkeleton />}

      {/* ── Grouped sessions ────────────────────────────────── */}
      {!loading && filtered.length === 0 && (
        <div className="rounded-xl border border-border bg-card py-14 text-center text-sm text-muted-foreground">
          {sessions.length === 0 ? "No finalized sessions yet." : "No records match your filters."}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="flex flex-col gap-6">
          {Array.from(grouped.entries()).map(([day, sectionMap]) => {
            const daySessions = Array.from(sectionMap.values()).flat()
            const dayAvg = Math.round(daySessions.reduce((a, s) => a + s.percentage, 0) / daySessions.length)

            return (
              <div key={day} className="flex flex-col gap-1">
                {/* Day header */}
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-sm font-bold text-foreground">{day}</span>
                  <div className="flex-1 h-px bg-border" />
                  <span className={cn("text-xs font-semibold", pctColor(dayAvg))}>
                    avg {dayAvg}%
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {daySessions.length} session{daySessions.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Sections within day */}
                <div className="flex flex-col gap-1 pl-3 border-l-2 border-border">
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
        </div>
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
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="h-1 w-full bg-linear-to-r from-primary/60 to-primary" />
                <div className="p-4 flex flex-col gap-1">
                  <span className="text-base font-bold text-foreground">{selectedSession.subject}</span>
                  <span className="text-sm font-medium text-foreground">{selectedSession.class}</span>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <span>{selectedSession.periodShort}</span>
                    {selectedSession.periodTime && (
                      <>
                        <span className="text-muted-foreground/40">·</span>
                        <span>{selectedSession.periodTime}</span>
                      </>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground mt-0.5">{selectedSession.date}</span>
                </div>
                <div className="flex items-center gap-4 border-t border-border px-4 py-3">
                  <span className="text-sm text-emerald-600 font-semibold">{selectedSession.present} Present</span>
                  <span className="text-sm text-red-600 font-semibold">{selectedSession.absent} Absent</span>
                  <span className={cn("ml-auto text-xl font-bold", pctColor(selectedSession.percentage))}>
                    {selectedSession.percentage}%
                  </span>
                </div>
              </div>

              {/* Export */}
              <Button
                variant="outline"
                className="gap-2 w-full"
                disabled={detailLoading || detailStudents.length === 0}
                onClick={() => { exportDetailCSV(selectedSession, detailStudents); toast.success("Session exported.") }}
              >
                <Download className="size-4" />
                Export This Session
              </Button>

              {/* Student breakdown */}
              <div className="flex flex-col gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Student Breakdown
                  {!detailLoading && (
                    <span className="ml-2 font-normal normal-case">
                      ({detailStudents.length} students)
                    </span>
                  )}
                </h3>

                {detailLoading ? (
                  <StudentDetailsSkeleton />
                ) : detailStudents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No records found.</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {detailStudents.map((st, i) => (
                      <div
                        key={`${st.roll}-${i}`}
                        className={cn(
                          "flex items-center justify-between rounded-xl border px-4 py-3 transition-colors",
                          st.status === "Present"
                            ? "bg-emerald-50/70 border-emerald-200 border-l-4 border-l-emerald-400 dark:bg-emerald-950/20"
                            : "bg-red-50/50 border-red-200 border-l-4 border-l-red-400 dark:bg-red-950/20"
                        )}
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-foreground">{st.name}</span>
                          <span className="text-xs text-muted-foreground font-mono">{st.roll}</span>
                        </div>
                        <Badge
                          className={cn(
                            "gap-1 font-semibold",
                            st.status === "Present"
                              ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                              : "bg-red-100 text-red-700 border-red-200"
                          )}
                        >
                          {st.status === "Present"
                            ? <CheckCircle2 className="size-3" />
                            : <AlertTriangle className="size-3" />
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
    </div>
  )
}