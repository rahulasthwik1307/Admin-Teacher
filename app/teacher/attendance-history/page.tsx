"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { toast } from "sonner"
import {
  Download,
  CalendarDays,
  TrendingUp,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  Loader2,
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

/* ── types ─────────────────────────────────────────────── */
interface Session {
  id: string
  date: string          // formatted for display e.g. "Oct 24, 2024"
  rawDate: string       // ISO date string for filtering e.g. "2024-10-24"
  subject: string
  subjectId: string
  class: string
  classId: string
  period: string
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

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
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
  const rows = sessions.map(s => [
    s.date, s.subject, s.class, s.period,
    s.present, s.absent, `${s.percentage}%`, s.status,
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

/* ── page ──────────────────────────────────────────────── */
export default function AttendanceHistoryPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  // filter states
  const [subjectFilter, setSubjectFilter] = useState("all")
  const [classFilter, setClassFilter] = useState("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  // detail sheet
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [detailStudents, setDetailStudents] = useState<DetailStudent[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  /* ── fetch sessions ──────────────────────────────────── */
  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true)
      const { data: { session: authSession } } = await supabase.auth.getSession()
      if (!authSession) return

      const teacherId = authSession.user.id

      // Fetch all finalized sessions for this teacher
      const { data: rawSessions, error } = await supabase
        .from("attendance_sessions")
        .select(`
          id,
          session_date,
          finalized_at,
          subject_id,
          class_id,
          period_id,
          subjects ( id, name ),
          classes ( id, name, section ),
          periods ( period_number, start_time, end_time )
        `)
        .eq("teacher_id", teacherId)
        .eq("status", "finalized")
        .order("session_date", { ascending: false })
        .order("finalized_at", { ascending: false })

      if (error) {
        toast.error("Failed to load attendance history.")
        console.error(error)
        return
      }

      if (!rawSessions || rawSessions.length === 0) {
        setSessions([])
        return
      }

      // For each session, count present and absent from period_attendance
      const sessionIds = rawSessions.map((s: any) => s.id)

      const { data: attendanceCounts, error: countError } = await supabase
        .from("period_attendance")
        .select("session_id, status")
        .in("session_id", sessionIds)
        .in("status", ["present", "absent"])

      if (countError) {
        console.error("Error fetching attendance counts:", countError)
      }

      // Build count map
      const countMap: Record<string, { present: number; absent: number }> = {}
      for (const row of (attendanceCounts ?? [])) {
        if (!countMap[row.session_id]) countMap[row.session_id] = { present: 0, absent: 0 }
        if (row.status === "present") countMap[row.session_id].present++
        else if (row.status === "absent") countMap[row.session_id].absent++
      }

      // Build final session list
      const built: Session[] = rawSessions.map((s: any) => {
        const counts = countMap[s.id] ?? { present: 0, absent: 0 }
        const total = counts.present + counts.absent
        const pct = total > 0 ? Math.round((counts.present / total) * 100) : 0

        const subjectName = s.subjects?.name ?? "Unknown Subject"
        const className = s.classes ? `${s.classes.name} ${s.classes.section}` : "Unknown Class"
        const periodNum = s.periods?.period_number ?? 0
        const periodLabel = periodNum > 0
          ? `${getOrdinal(periodNum)} Period • ${s.periods.start_time} - ${s.periods.end_time}`
          : "Unknown Period"

        return {
          id: s.id,
          date: formatDate(s.session_date),
          rawDate: s.session_date,
          subject: subjectName,
          subjectId: s.subject_id ?? "",
          class: className,
          classId: s.class_id ?? "",
          period: periodLabel,
          present: counts.present,
          absent: counts.absent,
          percentage: pct,
          status: "Finalized",
        }
      })

      setSessions(built)
    } catch (e) {
      console.error("Unexpected error:", e)
      toast.error("Something went wrong loading history.")
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  /* ── fetch detail students when sheet opens ──────────── */
  useEffect(() => {
    if (!selectedSession) {
      setDetailStudents([])
      return
    }
    const fetchDetail = async () => {
      setDetailLoading(true)
      try {
        const { data, error } = await supabase
          .from("period_attendance")
          .select(`
            status,
            student_id,
            students (
              roll_number,
              users ( full_name )
            )
          `)
          .eq("session_id", selectedSession.id)
          .in("status", ["present", "absent"])
          .order("status", { ascending: false }) // present first

        if (error) {
          toast.error("Failed to load student details.")
          console.error(error)
          return
        }

        const students: DetailStudent[] = (data ?? []).map((row: any) => ({
          name: row.students?.users?.full_name ?? "Unknown",
          roll: row.students?.roll_number ?? "—",
          status: row.status === "present" ? "Present" : "Absent",
        }))

        // Sort: Present first, then Absent, then by name
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
  }, [selectedSession, supabase])

  /* ── filter options built from real data ─────────────── */
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

  /* ── filtered sessions ───────────────────────────────── */
  const filtered = useMemo(() => {
    return sessions.filter(s => {
      if (subjectFilter !== "all" && s.subjectId !== subjectFilter) return false
      if (classFilter !== "all" && s.classId !== classFilter) return false
      if (startDate && s.rawDate < startDate) return false
      if (endDate && s.rawDate > endDate) return false
      return true
    })
  }, [sessions, subjectFilter, classFilter, startDate, endDate])

  /* ── summary stats ───────────────────────────────────── */
  const totalSessions = filtered.length
  const avgAttendance = filtered.length > 0
    ? Math.round(filtered.reduce((a, s) => a + s.percentage, 0) / filtered.length)
    : 0

  const subjectStatMap: Record<string, number[]> = {}
  filtered.forEach(s => {
    if (!subjectStatMap[s.subject]) subjectStatMap[s.subject] = []
    subjectStatMap[s.subject].push(s.percentage)
  })
  let bestSubject = { name: "—", avg: 0 }
  let worstSubject = { name: "—", avg: 101 }
  Object.entries(subjectStatMap).forEach(([name, pcts]) => {
    const avg = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length)
    if (avg > bestSubject.avg) bestSubject = { name, avg }
    if (avg < worstSubject.avg) worstSubject = { name, avg }
  })
  if (worstSubject.avg === 101) worstSubject = { name: "—", avg: 0 }

  /* ── render ──────────────────────────────────────────── */
  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground -mt-1">
        View past attendance records for your classes.
      </p>

      {/* ── Filter toolbar ─────────────────────────────── */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          {/* Subject */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Subject</label>
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjectOptions.map(opt => (
                  <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Class */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Class</label>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classOptions.map(opt => (
                  <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date range */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Date Range</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                aria-label="Start date"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                aria-label="End date"
              />
            </div>
          </div>
        </div>

        {/* Export all filtered sessions */}
        <Button
          className="gap-2 self-start lg:self-auto"
          disabled={filtered.length === 0}
          onClick={() => {
            exportSessionsCSV(filtered)
            toast.success("Attendance report exported successfully.")
          }}
        >
          <Download className="size-4" />
          Export
        </Button>
      </div>

      {/* ── Summary stats ──────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5">
          <CalendarDays className="size-4 text-primary" />
          <span className="text-sm text-muted-foreground">Total Sessions</span>
          <span className="text-sm font-semibold text-foreground">{totalSessions}</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5">
          <TrendingUp className="size-4 text-primary" />
          <span className="text-sm text-muted-foreground">Average Attendance</span>
          <span className="text-sm font-semibold text-foreground">{avgAttendance}%</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5">
          <BookOpen className="size-4 text-emerald-600" />
          <span className="text-sm text-muted-foreground">Best Subject</span>
          <span className="text-sm font-semibold text-foreground">
            {bestSubject.name}{bestSubject.name !== "—" ? ` ${bestSubject.avg}%` : ""}
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5">
          <AlertTriangle className="size-4 text-red-500" />
          <span className="text-sm text-muted-foreground">Needs Attention</span>
          <span className="text-sm font-semibold text-foreground">
            {worstSubject.name}{worstSubject.name !== "—" ? ` ${worstSubject.avg}%` : ""}
          </span>
        </div>
      </div>

      {/* ── Loading state ──────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* ── Table — desktop ────────────────────────────── */}
      {!loading && (
        <div className="hidden rounded-lg border border-border bg-card md:block">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Subject</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Class</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Period</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Present</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Absent</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Percentage</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr
                    key={s.id}
                    className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors cursor-pointer"
                    onClick={() => setSelectedSession(s)}
                  >
                    <td className="px-4 py-3 text-foreground">{s.date}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{s.subject}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.class}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.period}</td>
                    <td className="px-4 py-3 text-right text-emerald-600 font-medium">{s.present}</td>
                    <td className="px-4 py-3 text-right text-red-600 font-medium">{s.absent}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${pctColor(s.percentage)}`}>
                      {s.percentage}%
                    </td>
                    <td className="px-4 py-3">
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                        <CheckCircle2 className="size-3 mr-1" />
                        Finalized
                      </Badge>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                      {sessions.length === 0
                        ? "No finalized sessions yet."
                        : "No records match your filters."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Cards — mobile ─────────────────────────────── */}
      {!loading && (
        <div className="flex flex-col gap-3 md:hidden">
          {filtered.map(s => (
            <div
              key={s.id}
              className="rounded-lg border border-border bg-card p-4 cursor-pointer hover:bg-muted/40 transition-colors"
              onClick={() => setSelectedSession(s)}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{s.subject}</span>
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50 text-xs">
                  Finalized
                </Badge>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>{s.date}</span>
                <span>{s.class}</span>
                <span>{s.period}</span>
              </div>
              <div className="mt-3 flex items-center gap-4">
                <span className="text-sm text-emerald-600 font-medium">{s.present} Present</span>
                <span className="text-sm text-red-600 font-medium">{s.absent} Absent</span>
                <span className={`ml-auto text-sm font-semibold ${pctColor(s.percentage)}`}>
                  {s.percentage}%
                </span>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="rounded-lg border border-border bg-card px-4 py-12 text-center text-muted-foreground">
              {sessions.length === 0 ? "No finalized sessions yet." : "No records match your filters."}
            </div>
          )}
        </div>
      )}

      {/* ── Detail sheet ───────────────────────────────── */}
      <Sheet open={!!selectedSession} onOpenChange={open => !open && setSelectedSession(null)}>
        <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Session Details</SheetTitle>
            <SheetDescription>Student-level attendance breakdown.</SheetDescription>
          </SheetHeader>

          {selectedSession && (
            <div className="flex flex-col gap-5 px-4 py-2">
              {/* Session info card */}
              <div className="rounded-lg bg-muted/60 p-4">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-foreground">{selectedSession.subject}</span>
                  <span className="text-xs text-muted-foreground">
                    {selectedSession.class} · {selectedSession.period}
                  </span>
                  <span className="text-xs text-muted-foreground">{selectedSession.date}</span>
                </div>
                <div className="mt-3 flex items-center gap-4">
                  <span className="text-sm text-emerald-600 font-medium">{selectedSession.present} Present</span>
                  <span className="text-sm text-red-600 font-medium">{selectedSession.absent} Absent</span>
                  <span className={`ml-auto text-lg font-bold ${pctColor(selectedSession.percentage)}`}>
                    {selectedSession.percentage}%
                  </span>
                </div>
              </div>

              {/* Export this session */}
              <Button
                variant="outline"
                className="gap-2 w-full"
                disabled={detailLoading || detailStudents.length === 0}
                onClick={() => {
                  exportDetailCSV(selectedSession, detailStudents)
                  toast.success("Session exported successfully.")
                }}
              >
                <Download className="size-4" />
                Export This Session
              </Button>

              {/* Student breakdown */}
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-medium text-foreground">
                  Student Breakdown
                  {!detailLoading && (
                    <span className="ml-2 text-xs text-muted-foreground font-normal">
                      ({detailStudents.length} students)
                    </span>
                  )}
                </h3>

                {detailLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  </div>
                ) : detailStudents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No student records found.
                  </p>
                ) : (
                  <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
                    {detailStudents.map(st => (
                      <div key={st.roll} className="flex items-center justify-between px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">{st.name}</span>
                          <span className="text-xs text-muted-foreground font-mono">{st.roll}</span>
                        </div>
                        <Badge
                          className={
                            st.status === "Present"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                              : "bg-red-50 text-red-700 border-red-200 hover:bg-red-50"
                          }
                        >
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