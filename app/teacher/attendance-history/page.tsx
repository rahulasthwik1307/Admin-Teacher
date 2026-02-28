"use client"

import { useState, useMemo } from "react"
import { toast } from "sonner"
import {
  Download,
  CalendarDays,
  TrendingUp,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  X,
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

/* ── demo data ─────────────────────────────────────────── */
interface Session {
  id: string
  date: string
  subject: string
  class: string
  period: string
  present: number
  absent: number
  percentage: number
  status: "Finalized"
}

const sessions: Session[] = [
  { id: "1", date: "Oct 24, 2024", subject: "Data Structures", class: "CSE-A", period: "1st Period", present: 43, absent: 4, percentage: 91, status: "Finalized" },
  { id: "2", date: "Oct 24, 2024", subject: "Operating Systems", class: "CSE-B", period: "3rd Period", present: 30, absent: 13, percentage: 70, status: "Finalized" },
  { id: "3", date: "Oct 23, 2024", subject: "DBMS", class: "CSE-A", period: "5th Period", present: 25, absent: 22, percentage: 53, status: "Finalized" },
  { id: "4", date: "Oct 23, 2024", subject: "Data Structures", class: "CSE-A", period: "2nd Period", present: 40, absent: 7, percentage: 85, status: "Finalized" },
  { id: "5", date: "Oct 22, 2024", subject: "Operating Systems", class: "CSE-B", period: "1st Period", present: 35, absent: 8, percentage: 81, status: "Finalized" },
  { id: "6", date: "Oct 22, 2024", subject: "DBMS", class: "CSE-A", period: "4th Period", present: 28, absent: 19, percentage: 60, status: "Finalized" },
  { id: "7", date: "Oct 21, 2024", subject: "Data Structures", class: "CSE-A", period: "3rd Period", present: 44, absent: 3, percentage: 94, status: "Finalized" },
  { id: "8", date: "Oct 21, 2024", subject: "Operating Systems", class: "CSE-B", period: "2nd Period", present: 38, absent: 5, percentage: 88, status: "Finalized" },
]

interface DetailStudent {
  name: string
  roll: string
  status: "Present" | "Absent"
}

const detailStudents: DetailStudent[] = [
  { name: "Rahul Sharma", roll: "21CSE047", status: "Present" },
  { name: "Priya Patel", roll: "21CSE048", status: "Present" },
  { name: "Arjun Singh", roll: "21CSE049", status: "Absent" },
  { name: "Meena Joshi", roll: "21CSE050", status: "Present" },
  { name: "Kiran Rao", roll: "21CSE051", status: "Absent" },
]

/* ── helpers ───────────────────────────────────────────── */
function pctColor(pct: number) {
  if (pct >= 75) return "text-emerald-600"
  if (pct >= 60) return "text-amber-600"
  return "text-red-600"
}

/* ── page ──────────────────────────────────────────────── */
export default function AttendanceHistoryPage() {
  const [subjectFilter, setSubjectFilter] = useState("all")
  const [classFilter, setClassFilter] = useState("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)

  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      if (subjectFilter !== "all" && s.subject !== subjectFilter) return false
      if (classFilter !== "all" && s.class !== classFilter) return false
      return true
    })
  }, [subjectFilter, classFilter])

  /* stats */
  const totalSessions = filtered.length
  const avgAttendance =
    filtered.length > 0
      ? Math.round(filtered.reduce((a, s) => a + s.percentage, 0) / filtered.length)
      : 0
  const bestSubjectMap: Record<string, number[]> = {}
  filtered.forEach((s) => {
    if (!bestSubjectMap[s.subject]) bestSubjectMap[s.subject] = []
    bestSubjectMap[s.subject].push(s.percentage)
  })
  let bestSubject = { name: "-", avg: 0 }
  let worstSubject = { name: "-", avg: 100 }
  Object.entries(bestSubjectMap).forEach(([name, pcts]) => {
    const avg = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length)
    if (avg > bestSubject.avg) bestSubject = { name, avg }
    if (avg < worstSubject.avg) worstSubject = { name, avg }
  })

  return (
    <div className="flex flex-col gap-6">
      {/* Subtitle */}
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
                <SelectItem value="Data Structures">Data Structures</SelectItem>
                <SelectItem value="Operating Systems">Operating Systems</SelectItem>
                <SelectItem value="DBMS">DBMS</SelectItem>
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
                <SelectItem value="CSE-A">CSE-A</SelectItem>
                <SelectItem value="CSE-B">CSE-B</SelectItem>
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
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                aria-label="Start date"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                aria-label="End date"
              />
            </div>
          </div>
        </div>

        {/* Export */}
        <Button
          className="gap-2 self-start lg:self-auto"
          onClick={() => toast.success("Attendance report exported successfully.")}
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
            {bestSubject.name} {bestSubject.avg}%
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5">
          <AlertTriangle className="size-4 text-red-500" />
          <span className="text-sm text-muted-foreground">Needs Attention</span>
          <span className="text-sm font-semibold text-foreground">
            {worstSubject.name} {worstSubject.avg}%
          </span>
        </div>
      </div>

      {/* ── Table — desktop ────────────────────────────── */}
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
              {filtered.map((s) => (
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
                    No records match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Cards — mobile ─────────────────────────────── */}
      <div className="flex flex-col gap-3 md:hidden">
        {filtered.map((s) => (
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
            No records match your filters.
          </div>
        )}
      </div>

      {/* ── Detail sheet ───────────────────────────────── */}
      <Sheet open={!!selectedSession} onOpenChange={(open) => !open && setSelectedSession(null)}>
        <SheetContent side="right" className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Session Details</SheetTitle>
            <SheetDescription>
              Student-level attendance breakdown.
            </SheetDescription>
          </SheetHeader>

          {selectedSession && (
            <div className="flex flex-col gap-5 px-4 py-2">
              {/* Session info */}
              <div className="rounded-lg bg-muted/60 p-4">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-foreground">
                    {selectedSession.subject}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {selectedSession.class} &middot; {selectedSession.period}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {selectedSession.date}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-4">
                  <span className="text-sm text-emerald-600 font-medium">
                    {selectedSession.present} Present
                  </span>
                  <span className="text-sm text-red-600 font-medium">
                    {selectedSession.absent} Absent
                  </span>
                  <span className={`ml-auto text-lg font-bold ${pctColor(selectedSession.percentage)}`}>
                    {selectedSession.percentage}%
                  </span>
                </div>
              </div>

              {/* Student list */}
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-medium text-foreground">Student Breakdown</h3>
                <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
                  {detailStudents.map((st) => (
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
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
