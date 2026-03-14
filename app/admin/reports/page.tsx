"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Download, UserPlus, MapPin, Link2, KeyRound,
  Trash2, Settings, Shield, Loader2, Activity,
  TrendingUp, Users, BookOpen, BarChart3, Calendar,
  CheckCircle2, AlertTriangle, X, Pencil,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

/* ── Types ── */
interface TeacherActivityRow {
  id: string; name: string; dept: string
  sessions: number; assigned: number; rate: number; lastSession: string
}

interface SubjectAttendanceRow {
  subject: string; dept: string; avg: number; sessions: number; below75: number
}

interface OverviewStats {
  overallPct: number
  highestSubject: string; highestPct: number
  lowestSubject: string; lowestPct: number
  studentsBelow75: number
}

type LogType = "creation" | "update" | "deletion" | "security"
interface LogEntry {
  id: string; timestamp: string; rawDate: Date
  action: string; actionType: string
  performedBy: string; details: string; type: LogType
}

/* ── Helpers ── */
function getRateColor(rate: number) {
  if (rate >= 80) return { text: "text-emerald-600", bg: "bg-emerald-500", badge: "bg-emerald-500/10 text-emerald-700 border-emerald-200" }
  if (rate >= 60) return { text: "text-amber-600", bg: "bg-amber-500", badge: "bg-amber-500/10 text-amber-700 border-amber-200" }
  return { text: "text-rose-600", bg: "bg-rose-500", badge: "bg-rose-500/10 text-rose-700 border-rose-200" }
}

function getAttendanceColor(avg: number) {
  if (avg >= 80) return { text: "text-emerald-600", bar: "bg-emerald-500" }
  if (avg >= 60) return { text: "text-amber-600", bar: "bg-amber-500" }
  return { text: "text-rose-600", bar: "bg-rose-500" }
}

function formatTimestamp(raw: string): string {
  const d = new Date(raw)
  return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true })
}

function getDateGroupLabel(date: Date): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7)
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  if (d.getTime() === today.getTime()) return "Today"
  if (d.getTime() === yesterday.getTime()) return "Yesterday"
  if (d > weekAgo) return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function inferLogType(actionType: string): LogType {
  if (actionType === "create") return "creation"
  if (actionType === "delete") return "deletion"
  if (actionType === "reset") return "security"
  return "update"
}

function getActionConfig(actionType: string, details: string) {
  const d = details.toLowerCase()
  switch (actionType) {
    case "create": return { icon: UserPlus, color: "text-emerald-600", bg: "bg-emerald-500/10", border: "border-emerald-200", label: "CREATED", labelColor: "text-emerald-600" }
    case "update": return { icon: Pencil, color: "text-blue-600", bg: "bg-blue-500/10", border: "border-blue-200", label: "UPDATED", labelColor: "text-blue-600" }
    case "delete": return { icon: Trash2, color: "text-rose-600", bg: "bg-rose-500/10", border: "border-rose-200", label: "DELETED", labelColor: "text-rose-600" }
    case "reset": return { icon: KeyRound, color: "text-amber-600", bg: "bg-amber-500/10", border: "border-amber-200", label: "RESET", labelColor: "text-amber-600" }
    case "assign": return { icon: Link2, color: "text-violet-600", bg: "bg-violet-500/10", border: "border-violet-200", label: "ASSIGNED", labelColor: "text-violet-600" }
    default: return { icon: Settings, color: "text-muted-foreground", bg: "bg-muted", border: "border-border", label: "ACTION", labelColor: "text-muted-foreground" }
  }
}

function getInitials(name: string) {
  return name.split(" ").filter(w => w[0] && w[0] === w[0].toUpperCase()).map(w => w[0]).join("").slice(0, 2) || "NA"
}

function exportTeacherCSV(rows: TeacherActivityRow[]) {
  const headers = ["Teacher Name", "Department", "Sessions Conducted", "Periods Assigned", "Completion Rate", "Last Session"]
  const csvRows = rows.map(r => [r.name, r.dept, r.sessions, r.assigned, `${r.rate}%`, r.lastSession])
  const csv = [headers, ...csvRows].map(r => r.join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a"); a.href = url
  a.download = `teacher-activity-${new Date().toISOString().split("T")[0]}.csv`
  a.click(); URL.revokeObjectURL(url)
}

const TABS = ["teacher-activity", "attendance-overview", "system-logs"] as const
type Tab = typeof TABS[number]

/* ── Main Page ── */
export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("teacher-activity")

  const [teacherActivity, setTeacherActivity] = useState<TeacherActivityRow[]>([])
  const [loadingTeachers, setLoadingTeachers] = useState(true)
  const [teacherDeptFilter, setTeacherDeptFilter] = useState("all")

  const [subjectAttendance, setSubjectAttendance] = useState<SubjectAttendanceRow[]>([])
  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null)
  const [loadingOverview, setLoadingOverview] = useState(true)

  const [systemLogs, setSystemLogs] = useState<LogEntry[]>([])
  const [loadingLogs, setLoadingLogs] = useState(true)
  const [logFilterPerformer, setLogFilterPerformer] = useState("all")
  const [logFilterAction, setLogFilterAction] = useState("all")
  const [logFilterRange, setLogFilterRange] = useState("all")

  /* ── Fetch Teacher Activity ── */
  const fetchTeacherActivity = useCallback(async () => {
    setLoadingTeachers(true)
    try {
      const supabase = createClient()
      const { data: teachers } = await supabase.from("teachers").select(`id, title, department:departments ( name, code ), user:users ( full_name )`)
      if (!teachers) return
      const { data: sessions } = await supabase.from("attendance_sessions").select("id, teacher_id, session_date").eq("status", "finalized").order("session_date", { ascending: false })
      const { data: assignments } = await supabase.from("teacher_assignments").select("teacher_id")

      const sessionsByTeacher: Record<string, { count: number; latest: string }> = {}
      for (const s of sessions || []) {
        if (!sessionsByTeacher[s.teacher_id]) sessionsByTeacher[s.teacher_id] = { count: 0, latest: "" }
        sessionsByTeacher[s.teacher_id].count++
        if (!sessionsByTeacher[s.teacher_id].latest || s.session_date > sessionsByTeacher[s.teacher_id].latest)
          sessionsByTeacher[s.teacher_id].latest = s.session_date
      }
      const assignmentsByTeacher: Record<string, number> = {}
      for (const a of assignments || []) assignmentsByTeacher[a.teacher_id] = (assignmentsByTeacher[a.teacher_id] || 0) + 1

      const rows: TeacherActivityRow[] = teachers.map((t: any) => {
        const sessData = sessionsByTeacher[t.id]
        const sessionCount = sessData?.count || 0
        const assigned = assignmentsByTeacher[t.id] || 0
        const rate = assigned > 0 ? Math.min(100, Math.round((sessionCount / assigned) * 100)) : 0
        let lastSession = "Never"
        if (sessData?.latest) {
          const d = new Date(sessData.latest + "T00:00:00")
          lastSession = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        }
        return { id: t.id, name: `${t.title}. ${t.user?.full_name ?? "Unknown"}`, dept: (t.department as any)?.code ?? "—", sessions: sessionCount, assigned, rate, lastSession }
      })
      rows.sort((a, b) => b.sessions - a.sessions)
      setTeacherActivity(rows)
    } catch (e) { console.error("fetchTeacherActivity error:", e) }
    finally { setLoadingTeachers(false) }
  }, [])

  /* ── Fetch Attendance Overview ── */
  const fetchOverview = useCallback(async () => {
    setLoadingOverview(true)
    try {
      const supabase = createClient()
      const { data: sessions } = await supabase.from("attendance_sessions").select("id, subject_id, subject:subjects ( name, department:departments ( code ) )").eq("status", "finalized")
      if (!sessions || sessions.length === 0) {
        setOverviewStats({ overallPct: 0, highestSubject: "—", highestPct: 0, lowestSubject: "—", lowestPct: 0, studentsBelow75: 0 })
        setSubjectAttendance([]); setLoadingOverview(false); return
      }
      const sessionIds = sessions.map((s: any) => s.id)
      const allAttendance: any[] = []
      for (let i = 0; i < sessionIds.length; i += 100) {
        const { data } = await supabase.from("period_attendance").select("session_id, student_id, status").in("session_id", sessionIds.slice(i, i + 100))
        if (data) allAttendance.push(...data)
      }
      const attendance = allAttendance.filter(a => a.status === "present" || a.status === "absent")
      const subjectMap: Record<string, { name: string; dept: string; sessionIds: Set<string>; present: number; total: number; studentPresent: Record<string, number>; studentTotal: Record<string, number> }> = {}
      for (const s of sessions) {
        const subId = (s as any).subject_id
        if (!subjectMap[subId]) subjectMap[subId] = { name: (s as any).subject?.name ?? "Unknown", dept: (s as any).subject?.department?.code ?? "—", sessionIds: new Set(), present: 0, total: 0, studentPresent: {}, studentTotal: {} }
        subjectMap[subId].sessionIds.add(s.id)
      }
      const sessionSubject: Record<string, string> = {}
      for (const s of sessions) sessionSubject[s.id] = (s as any).subject_id
      for (const a of attendance) {
        const subId = sessionSubject[a.session_id]
        if (!subId || !subjectMap[subId]) continue
        subjectMap[subId].total++
        if (a.status === "present") subjectMap[subId].present++
        if (!subjectMap[subId].studentTotal[a.student_id]) { subjectMap[subId].studentTotal[a.student_id] = 0; subjectMap[subId].studentPresent[a.student_id] = 0 }
        subjectMap[subId].studentTotal[a.student_id]++
        if (a.status === "present") subjectMap[subId].studentPresent[a.student_id]++
      }
      const subjectRows = Object.values(subjectMap).map(sub => {
        const avg = sub.total > 0 ? Math.round((sub.present / sub.total) * 100) : 0
        const below75 = Object.keys(sub.studentTotal).filter(sid => (sub.studentTotal[sid] > 0 ? sub.studentPresent[sid] / sub.studentTotal[sid] : 0) < 0.75).length
        return { subject: sub.name, dept: sub.dept, avg, sessions: sub.sessionIds.size, below75 }
      }).sort((a, b) => b.avg - a.avg)

      const totalPresent = attendance.filter(a => a.status === "present").length
      const overallPct = attendance.length > 0 ? Math.round((totalPresent / attendance.length) * 100) : 0
      const studentPresentOverall: Record<string, number> = {}; const studentTotalOverall: Record<string, number> = {}
      for (const a of attendance) {
        studentTotalOverall[a.student_id] = (studentTotalOverall[a.student_id] || 0) + 1
        if (a.status === "present") studentPresentOverall[a.student_id] = (studentPresentOverall[a.student_id] || 0) + 1
      }
      const studentsBelow75 = Object.keys(studentTotalOverall).filter(sid => ((studentPresentOverall[sid] || 0) / studentTotalOverall[sid]) < 0.75).length
      setOverviewStats({ overallPct, highestSubject: subjectRows[0]?.subject ?? "—", highestPct: subjectRows[0]?.avg ?? 0, lowestSubject: subjectRows[subjectRows.length - 1]?.subject ?? "—", lowestPct: subjectRows[subjectRows.length - 1]?.avg ?? 0, studentsBelow75 })
      setSubjectAttendance(subjectRows)
    } catch (e) { console.error("fetchOverview error:", e) }
    finally { setLoadingOverview(false) }
  }, [])

  /* ── Fetch System Logs ── */
  const fetchSystemLogs = useCallback(async () => {
    setLoadingLogs(true)
    try {
      const supabase = createClient()
      const { data: logs } = await supabase.from("system_logs").select("id, created_at, action_type, description, performed_by").order("created_at", { ascending: false }).limit(100)
      if (!logs) return
      const performerIds = [...new Set(logs.map((l: any) => l.performed_by).filter(Boolean))]
      const nameMap: Record<string, string> = {}
      if (performerIds.length > 0) {
        const { data: users } = await supabase.from("users").select("id, full_name").in("id", performerIds)
        for (const u of users || []) nameMap[u.id] = u.full_name
      }
      setSystemLogs(logs.map((l: any) => ({
        id: l.id, timestamp: formatTimestamp(l.created_at), rawDate: new Date(l.created_at),
        action: l.action_type === "create" ? "Created" : l.action_type === "update" ? "Updated" : l.action_type === "delete" ? "Deleted" : l.action_type === "reset" ? "Reset" : l.action_type === "assign" ? "Assigned" : l.action_type,
        actionType: l.action_type,
        performedBy: nameMap[l.performed_by] ?? "System",
        details: l.description ?? "—",
        type: inferLogType(l.action_type),
      })))
    } catch (e) { console.error("fetchSystemLogs error:", e) }
    finally { setLoadingLogs(false) }
  }, [])

  useEffect(() => { fetchTeacherActivity(); fetchOverview(); fetchSystemLogs() }, [fetchTeacherActivity, fetchOverview, fetchSystemLogs])

  /* ── Derived data ── */
  const uniqueDepts = useMemo(() => Array.from(new Set(teacherActivity.map(t => t.dept))).sort(), [teacherActivity])

  const filteredTeachers = useMemo(() => teacherDeptFilter === "all" ? teacherActivity : teacherActivity.filter(t => t.dept === teacherDeptFilter), [teacherActivity, teacherDeptFilter])

  const avgRate = teacherActivity.length > 0 ? Math.round(teacherActivity.reduce((s, t) => s + t.rate, 0) / teacherActivity.length) : 0
  const topTeacher = teacherActivity[0]

  const uniquePerformers = useMemo(() => Array.from(new Set(systemLogs.map(l => l.performedBy))).sort(), [systemLogs])

  const filteredLogs = useMemo(() => {
    let logs = systemLogs
    if (logFilterPerformer !== "all") logs = logs.filter(l => l.performedBy === logFilterPerformer)
    if (logFilterAction !== "all") logs = logs.filter(l => l.actionType === logFilterAction)
    if (logFilterRange !== "all") {
      const now = new Date()
      const cutoff = new Date(now)
      if (logFilterRange === "today") cutoff.setHours(0, 0, 0, 0)
      else if (logFilterRange === "week") cutoff.setDate(now.getDate() - 7)
      else if (logFilterRange === "month") cutoff.setMonth(now.getMonth() - 1)
      logs = logs.filter(l => l.rawDate >= cutoff)
    }
    return logs
  }, [systemLogs, logFilterPerformer, logFilterAction, logFilterRange])

  // Group logs by date
  const groupedLogs = useMemo(() => {
    const groups: Record<string, LogEntry[]> = {}
    for (const log of filteredLogs) {
      const label = getDateGroupLabel(log.rawDate)
      if (!groups[label]) groups[label] = []
      groups[label].push(log)
    }
    return Object.entries(groups)
  }, [filteredLogs])

  const todayLogCount = systemLogs.filter(l => getDateGroupLabel(l.rawDate) === "Today").length

  const tabConfig = [
    { id: "teacher-activity" as Tab, label: "Teacher Activity", icon: Users },
    { id: "attendance-overview" as Tab, label: "Attendance", icon: BarChart3 },
    { id: "system-logs" as Tab, label: "System Logs", icon: Activity },
  ]

  return (
    <div className="flex flex-col gap-6">

      {/* ── Premium Tab Bar ── */}
      <div className="inline-flex gap-1 rounded-xl bg-muted/60 p-1 self-start">
        {tabConfig.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all ${activeTab === tab.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <tab.icon className="size-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════
          TAB 1: TEACHER ACTIVITY
      ════════════════════════════════ */}
      {activeTab === "teacher-activity" && (
        <div className="flex flex-col gap-5">
          {/* Stat cards */}
          {!loadingTeachers && (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              <Card className="border-l-4 border-l-primary">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <TrendingUp className="size-4 text-primary" />
                  </div>
                  <div>
                    <div className={`text-xl font-bold ${getRateColor(avgRate).text}`}>{avgRate}%</div>
                    <div className="text-xs text-muted-foreground">Avg Completion</div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-emerald-500">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
                    <Users className="size-4 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-xl font-bold text-foreground">{teacherActivity.filter(t => t.sessions > 0).length}</div>
                    <div className="text-xs text-muted-foreground">Active Teachers</div>
                  </div>
                </CardContent>
              </Card>
              {topTeacher && (
                <Card className="border-l-4 border-l-amber-500 col-span-2 lg:col-span-1">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
                      <CheckCircle2 className="size-4 text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-foreground truncate">{topTeacher.name}</div>
                      <div className="text-xs text-muted-foreground">{topTeacher.sessions} sessions · Top Performer</div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <div className="flex gap-2">
              <Select value={teacherDeptFilter} onValueChange={setTeacherDeptFilter}>
                <SelectTrigger className="h-9 w-40 text-xs">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {uniqueDepts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
              {teacherDeptFilter !== "all" && (
                <Button variant="ghost" size="sm" className="h-9 gap-1 text-muted-foreground" onClick={() => setTeacherDeptFilter("all")}>
                  <X className="size-3.5" /> Clear
                </Button>
              )}
            </div>
            <Button variant="outline" size="sm" className="gap-2 h-9" disabled={loadingTeachers || teacherActivity.length === 0} onClick={() => exportTeacherCSV(teacherActivity)}>
              <Download className="size-4" /> Export CSV
            </Button>
          </div>

          {loadingTeachers ? (
            <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              {/* Desktop table */}
              <Card className="hidden md:block">
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="px-5 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Teacher</th>
                        <th className="px-5 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Dept</th>
                        <th className="px-5 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground text-center">Sessions</th>
                        <th className="px-5 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground text-center">Assigned</th>
                        <th className="px-5 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Completion</th>
                        <th className="px-5 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Last Session</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTeachers.length === 0 ? (
                        <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">No data available.</td></tr>
                      ) : filteredTeachers.map((t, i) => {
                        const color = getRateColor(t.rate)
                        return (
                          <tr key={t.id} className={`border-t border-border hover:bg-muted/20 transition-colors ${i === 0 && t.sessions > 0 ? "bg-amber-500/3" : ""}`}>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2.5">
                                <Avatar className="size-8">
                                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{getInitials(t.name)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium text-foreground">{t.name}</div>
                                  {i === 0 && t.sessions > 0 && <div className="text-[10px] text-amber-600 font-semibold">Top Performer</div>}
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3"><span className="font-mono text-xs rounded bg-muted px-2 py-0.5 text-muted-foreground">{t.dept}</span></td>
                            <td className="px-5 py-3 text-center font-semibold text-foreground">{t.sessions}</td>
                            <td className="px-5 py-3 text-center text-muted-foreground">{t.assigned}</td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                                  <div className={`h-full rounded-full ${color.bg} transition-all`} style={{ width: `${t.rate}%` }} />
                                </div>
                                <span className={`text-sm font-semibold ${color.text}`}>{t.rate}%</span>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-xs text-muted-foreground">{t.lastSession}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              {/* Mobile cards */}
              <div className="flex flex-col gap-3 md:hidden">
                {filteredTeachers.map(t => {
                  const color = getRateColor(t.rate)
                  return (
                    <Card key={t.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="size-9"><AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">{getInitials(t.name)}</AvatarFallback></Avatar>
                            <div>
                              <div className="text-sm font-medium text-foreground">{t.name}</div>
                              <div className="text-xs text-muted-foreground">{t.dept} · {t.sessions}/{t.assigned} sessions</div>
                            </div>
                          </div>
                          <span className={`text-lg font-bold ${color.text}`}>{t.rate}%</span>
                        </div>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div className={`h-full rounded-full ${color.bg}`} style={{ width: `${t.rate}%` }} />
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">Last: {t.lastSession}</div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ════════════════════════════════
          TAB 2: ATTENDANCE OVERVIEW
      ════════════════════════════════ */}
      {activeTab === "attendance-overview" && (
        loadingOverview ? (
          <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="flex flex-col gap-5">
            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                {
                  label: "Overall Campus", value: `${overviewStats?.overallPct ?? 0}%`,
                  sub: "All subjects combined",
                  accent: "border-l-primary", iconColor: "bg-primary/10 text-primary",
                  icon: BarChart3,
                },
                {
                  label: "Highest Subject", value: overviewStats?.highestSubject ?? "—",
                  sub: `${overviewStats?.highestPct ?? 0}% attendance`,
                  accent: "border-l-emerald-500", iconColor: "bg-emerald-500/10 text-emerald-600",
                  icon: TrendingUp,
                },
                {
                  label: "Lowest Subject", value: overviewStats?.lowestSubject ?? "—",
                  sub: `${overviewStats?.lowestPct ?? 0}% attendance`,
                  accent: "border-l-rose-500", iconColor: "bg-rose-500/10 text-rose-600",
                  icon: AlertTriangle,
                },
                {
                  label: "Students Below 75%", value: `${overviewStats?.studentsBelow75 ?? 0}`,
                  sub: "Need attention",
                  accent: "border-l-amber-500", iconColor: "bg-amber-500/10 text-amber-600",
                  icon: Users,
                },
              ].map(s => (
                <Card key={s.label} className={`border-l-4 ${s.accent} transition-shadow hover:shadow-md`}>
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${s.iconColor}`}>
                      <s.icon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-lg font-bold text-foreground leading-tight truncate">{s.value}</div>
                      <div className="text-xs font-medium text-foreground/80 truncate">{s.label}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{s.sub}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Subject table */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                    <BookOpen className="size-4 text-primary" />
                  </div>
                  <CardTitle className="text-base font-semibold">Subject-wise Attendance</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-t border-border text-left">
                      <th className="px-5 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Subject</th>
                      <th className="px-5 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground hidden sm:table-cell">Dept</th>
                      <th className="px-5 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Attendance</th>
                      <th className="px-5 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground text-center hidden md:table-cell">Sessions</th>
                      <th className="px-5 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground text-center">Below 75%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjectAttendance.length === 0 ? (
                      <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">No attendance data available.</td></tr>
                    ) : subjectAttendance.map(s => {
                      const color = getAttendanceColor(s.avg)
                      return (
                        <tr key={s.subject} className="border-t border-border hover:bg-muted/20 transition-colors">
                          <td className="px-5 py-3 font-medium text-foreground">{s.subject}</td>
                          <td className="px-5 py-3 hidden sm:table-cell"><span className="font-mono text-xs rounded bg-muted px-2 py-0.5 text-muted-foreground">{s.dept}</span></td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
                                <div className={`h-full rounded-full ${color.bar} transition-all`} style={{ width: `${s.avg}%` }} />
                              </div>
                              <span className={`text-sm font-bold ${color.text}`}>{s.avg}%</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-center text-foreground hidden md:table-cell">{s.sessions}</td>
                          <td className="px-5 py-3 text-center">
                            <Badge variant="secondary" className={
                              s.below75 >= 8 ? "bg-rose-500/10 text-rose-600 border-rose-200"
                              : s.below75 >= 4 ? "bg-amber-500/10 text-amber-600 border-amber-200"
                              : "bg-emerald-500/10 text-emerald-600 border-emerald-200"
                            }>
                              {s.below75}
                            </Badge>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        )
      )}

      {/* ════════════════════════════════
          TAB 3: SYSTEM LOGS
      ════════════════════════════════ */}
      {activeTab === "system-logs" && (
        <div className="flex flex-col gap-5">
          {/* Stat chips */}
          {!loadingLogs && (
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                <Activity className="size-3.5" />{systemLogs.length} Total Logs
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-700">
                <Calendar className="size-3.5" />{todayLogCount} Today
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-700">
                <Users className="size-3.5" />{uniquePerformers.length} Users Active
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <Select value={logFilterPerformer} onValueChange={setLogFilterPerformer}>
              <SelectTrigger className="h-9 w-44 text-xs">
                <Users className="size-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="All Users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {uniquePerformers.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={logFilterAction} onValueChange={setLogFilterAction}>
              <SelectTrigger className="h-9 w-36 text-xs">
                <Activity className="size-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="create">Create</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
                <SelectItem value="reset">Reset</SelectItem>
                <SelectItem value="assign">Assign</SelectItem>
              </SelectContent>
            </Select>
            <Select value={logFilterRange} onValueChange={setLogFilterRange}>
              <SelectTrigger className="h-9 w-36 text-xs">
                <Calendar className="size-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="All Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
            {(logFilterPerformer !== "all" || logFilterAction !== "all" || logFilterRange !== "all") && (
              <Button variant="ghost" size="sm" className="h-9 gap-1 text-muted-foreground" onClick={() => { setLogFilterPerformer("all"); setLogFilterAction("all"); setLogFilterRange("all") }}>
                <X className="size-3.5" /> Clear
              </Button>
            )}
          </div>

          {loadingLogs ? (
            <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
          ) : filteredLogs.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No logs match the selected filters.</CardContent></Card>
          ) : (
            <div className="flex flex-col gap-4">
              {groupedLogs.map(([dateLabel, logs]) => (
                <div key={dateLabel}>
                  {/* Date group header */}
                  <div className="mb-3 flex items-center gap-3">
                    <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{dateLabel}</span>
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">{logs.length}</span>
                  </div>

                  {/* Desktop table */}
                  <Card className="hidden md:block overflow-hidden">
                    <CardContent className="p-0">
                      <table className="w-full text-sm">
                        <tbody>
                          {logs.map((log, li) => {
                            const cfg = getActionConfig(log.actionType, log.details)
                            const Icon = cfg.icon
                            return (
                              <tr key={log.id} className={`hover:bg-muted/20 transition-colors ${li !== 0 ? "border-t border-border" : ""}`}>
                                <td className="px-5 py-3 w-10">
                                  <div className={`flex size-8 items-center justify-center rounded-full border ${cfg.bg} ${cfg.border}`}>
                                    <Icon className={`size-3.5 ${cfg.color}`} />
                                  </div>
                                </td>
                                <td className="px-3 py-3 w-32">
                                  <span className={`text-[10px] font-bold tracking-widest ${cfg.labelColor}`}>{cfg.label}</span>
                                </td>
                                <td className="px-3 py-3 flex-1">
                                  <span className="text-sm text-foreground">{log.details}</span>
                                </td>
                                <td className="px-3 py-3 w-28">
                                  <div className="flex items-center gap-1.5">
                                    <Avatar className="size-5">
                                      <AvatarFallback className="bg-muted text-muted-foreground text-[9px]">{getInitials(log.performedBy)}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs text-muted-foreground truncate">{log.performedBy}</span>
                                  </div>
                                </td>
                                <td className="px-5 py-3 text-right text-xs text-muted-foreground whitespace-nowrap">{log.timestamp}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>

                  {/* Mobile cards */}
                  <div className="flex flex-col gap-2 md:hidden">
                    {logs.map(log => {
                      const cfg = getActionConfig(log.actionType, log.details)
                      const Icon = cfg.icon
                      return (
                        <Card key={log.id}>
                          <CardContent className="p-3">
                            <div className="flex items-start gap-3">
                              <div className={`flex size-8 shrink-0 items-center justify-center rounded-full border ${cfg.bg} ${cfg.border}`}>
                                <Icon className={`size-3.5 ${cfg.color}`} />
                              </div>
                              <div className="flex flex-1 flex-col gap-0.5">
                                <span className={`text-[10px] font-bold tracking-widest ${cfg.labelColor}`}>{cfg.label}</span>
                                <span className="text-xs text-foreground">{log.details}</span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[11px] text-muted-foreground">{log.performedBy}</span>
                                  <span className="text-muted-foreground">·</span>
                                  <span className="text-[11px] text-muted-foreground">{log.timestamp}</span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}