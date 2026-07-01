"use client"

import { useState, useCallback, useMemo } from "react"
import { useReportsData } from "@/hooks/use-reports-data"
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
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { Skeleton } from "@/components/ui/skeleton"
import { TableSkeleton, ListSkeleton, CardSkeleton, ChartSkeleton } from "@/components/ui/skeletons"

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

  const USER_COLORS = useMemo(() => [
    { bg: "bg-blue-500/10", text: "text-blue-600", border: "border-blue-500", avatar: "bg-blue-500/10 text-blue-600" },
    { bg: "bg-emerald-500/10", text: "text-emerald-600", border: "border-emerald-500", avatar: "bg-emerald-500/10 text-emerald-600" },
    { bg: "bg-violet-500/10", text: "text-violet-600", border: "border-violet-500", avatar: "bg-violet-500/10 text-violet-600" },
    { bg: "bg-amber-500/10", text: "text-amber-600", border: "border-amber-500", avatar: "bg-amber-500/10 text-amber-600" },
    { bg: "bg-rose-500/10", text: "text-rose-600", border: "border-rose-500", avatar: "bg-rose-500/10 text-rose-600" },
    { bg: "bg-sky-500/10", text: "text-sky-600", border: "border-sky-500", avatar: "bg-sky-500/10 text-sky-600" },
    { bg: "bg-orange-500/10", text: "text-orange-600", border: "border-orange-500", avatar: "bg-orange-500/10 text-orange-600" },
  ], [])

  const { data: reportsData, isLoading: reportsLoading } = useReportsData()

  const loadingTeachers = reportsLoading
  const loadingOverview = reportsLoading
  const loadingLogs = reportsLoading

  const [teacherDeptFilter, setTeacherDeptFilter] = useState("all")
  const [logFilterPerformer, setLogFilterPerformer] = useState("all")
  const [logFilterAction, setLogFilterAction] = useState("all")
  const [logFilterRange, setLogFilterRange] = useState("all")

  const teacherActivity = useMemo<TeacherActivityRow[]>(() => {
    if (!reportsData) return []
    const { teachers, sessions, assignments } = reportsData
    const sessionsByTeacher: Record<string, { count: number; latest: string }> = {}
    for (const s of sessions) {
      if (!sessionsByTeacher[s.teacher_id]) sessionsByTeacher[s.teacher_id] = { count: 0, latest: "" }
      sessionsByTeacher[s.teacher_id].count++
      if (!sessionsByTeacher[s.teacher_id].latest || s.session_date > sessionsByTeacher[s.teacher_id].latest)
        sessionsByTeacher[s.teacher_id].latest = s.session_date
    }
    const assignmentsByTeacher: Record<string, number> = {}
    for (const a of assignments) assignmentsByTeacher[a.teacher_id] = (assignmentsByTeacher[a.teacher_id] || 0) + 1

    return teachers.map((t: any) => {
      const sessData = sessionsByTeacher[t.id]
      const sessionCount = sessData?.count || 0
      const assigned = assignmentsByTeacher[t.id] || 0
      const rate = assigned > 0 ? Math.min(100, Math.round((sessionCount / assigned) * 100)) : 0
      let lastSession = "Never"
      if (sessData?.latest) {
        const d = new Date(sessData.latest + "T00:00:00")
        lastSession = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      }
      return { id: t.id, name: `${t.title}. ${t.user?.full_name ?? "Unknown"}`, dept: t.department?.code ?? "—", sessions: sessionCount, assigned, rate, lastSession }
    }).sort((a: any, b: any) => b.sessions - a.sessions)
  }, [reportsData])

  const { subjectAttendance, overviewStats } = useMemo(() => {
    if (!reportsData) return { subjectAttendance: [], overviewStats: null }
    const { sessions, attendance } = reportsData
    if (!sessions.length) return { subjectAttendance: [], overviewStats: { overallPct: 0, highestSubject: "—", highestPct: 0, lowestSubject: "—", lowestPct: 0, studentsBelow75: 0 } }

    const sessionSubject: Record<string, string> = {}
    const subjectMeta: Record<string, { name: string; dept: string; sessionIds: Set<string> }> = {}
    for (const s of sessions) {
      sessionSubject[s.id] = s.subject_id
      if (!subjectMeta[s.subject_id]) subjectMeta[s.subject_id] = { name: s.subject?.name ?? "Unknown", dept: s.subject?.department?.code ?? "—", sessionIds: new Set() }
      subjectMeta[s.subject_id].sessionIds.add(s.id)
    }

    const subjectStats: Record<string, { present: number; total: number; studentPresent: Record<string, number>; studentTotal: Record<string, number> }> = {}
    for (const a of attendance.filter((a: any) => a.status === "present" || a.status === "absent")) {
      const subId = sessionSubject[a.session_id]
      if (!subId) continue
      if (!subjectStats[subId]) subjectStats[subId] = { present: 0, total: 0, studentPresent: {}, studentTotal: {} }
      subjectStats[subId].total++
      if (a.status === "present") subjectStats[subId].present++
      if (!subjectStats[subId].studentTotal[a.student_id]) { subjectStats[subId].studentTotal[a.student_id] = 0; subjectStats[subId].studentPresent[a.student_id] = 0 }
      subjectStats[subId].studentTotal[a.student_id]++
      if (a.status === "present") subjectStats[subId].studentPresent[a.student_id]++
    }

    const subjectRows = Object.entries(subjectMeta).map(([subId, meta]) => {
      const stats = subjectStats[subId] ?? { present: 0, total: 0, studentPresent: {}, studentTotal: {} }
      const avg = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0
      const below75 = Object.keys(stats.studentTotal).filter(sid => (stats.studentTotal[sid] > 0 ? stats.studentPresent[sid] / stats.studentTotal[sid] : 0) < 0.75).length
      return { subject: meta.name, dept: meta.dept, avg, sessions: meta.sessionIds.size, below75 }
    }).sort((a, b) => b.avg - a.avg)

    const filteredAtt = attendance.filter((a: any) => a.status === "present" || a.status === "absent")
    const totalPresent = filteredAtt.filter((a: any) => a.status === "present").length
    const overallPct = filteredAtt.length > 0 ? Math.round((totalPresent / filteredAtt.length) * 100) : 0
    const studentPct: Record<string, { p: number; t: number }> = {}
    for (const a of filteredAtt) {
      if (!studentPct[a.student_id]) studentPct[a.student_id] = { p: 0, t: 0 }
      studentPct[a.student_id].t++
      if (a.status === "present") studentPct[a.student_id].p++
    }
    const studentsBelow75 = Object.values(studentPct).filter(v => v.t > 0 && (v.p / v.t) < 0.75).length

    return {
      subjectAttendance: subjectRows,
      overviewStats: { overallPct, highestSubject: subjectRows[0]?.subject ?? "—", highestPct: subjectRows[0]?.avg ?? 0, lowestSubject: subjectRows[subjectRows.length - 1]?.subject ?? "—", lowestPct: subjectRows[subjectRows.length - 1]?.avg ?? 0, studentsBelow75 },
    }
  }, [reportsData])

  const systemLogs = useMemo<LogEntry[]>(() => {
    if (!reportsData?.logs) return []
    return reportsData.logs.map((l: any) => ({
      id: l.id, timestamp: formatTimestamp(l.created_at), rawDate: new Date(l.created_at),
      action: l.action_type === "create" ? "Created" : l.action_type === "update" ? "Updated" : l.action_type === "delete" ? "Deleted" : l.action_type === "reset" ? "Reset" : l.action_type === "assign" ? "Assigned" : l.action_type,
      actionType: l.action_type, performedBy: l.performedBy, details: l.description ?? "—",
      type: inferLogType(l.action_type),
    }))
  }, [reportsData])

  /* ── Derived data ── */
  const uniqueDepts = useMemo(() => Array.from(new Set(teacherActivity.map(t => t.dept))).sort(), [teacherActivity])

  const filteredTeachers = useMemo(() => teacherDeptFilter === "all" ? teacherActivity : teacherActivity.filter(t => t.dept === teacherDeptFilter), [teacherActivity, teacherDeptFilter])

  const avgRate = teacherActivity.length > 0 ? Math.round(teacherActivity.reduce((s, t) => s + t.rate, 0) / teacherActivity.length) : 0
  const topTeacher = teacherActivity[0]

  const uniquePerformers = useMemo(() => Array.from(new Set(systemLogs.map(l => l.performedBy))).sort(), [systemLogs])

  const userColorMap = useMemo(() => {
    const map: Record<string, number> = {}
    uniquePerformers.forEach((name, i) => { map[name] = i % USER_COLORS.length })
    return map
  }, [uniquePerformers, USER_COLORS])

  const getUserColor = useCallback((name: string) => {
    if (name === "System") return { bg: "bg-muted", text: "text-muted-foreground", border: "border-border", avatar: "bg-muted text-muted-foreground" }
    const idx = userColorMap[name] ?? 0
    return USER_COLORS[idx]
  }, [userColorMap, USER_COLORS])

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
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-base font-medium transition-all ${activeTab === tab.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
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
                    <div className={`text-2xl font-bold ${getRateColor(avgRate).text}`}>{avgRate}%</div>
                    <div className="text-sm text-muted-foreground">Avg Completion</div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-emerald-500">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
                    <Users className="size-4 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">{teacherActivity.filter(t => t.sessions > 0).length}</div>
                    <div className="text-sm text-muted-foreground">Active Teachers</div>
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
                      <div className="text-2xl font-bold text-foreground truncate">{topTeacher.name}</div>
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
                <SelectTrigger className="h-9 w-56 text-xs">
                  <div className="flex items-center w-full min-w-0 overflow-hidden">
                    <span className="truncate text-left w-full">
                      <SelectValue placeholder="All Departments" />
                    </span>
                  </div>
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
            <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
              <CardSkeleton />
              <TableSkeleton cols={5} rows={6} hasAvatar={true} />
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
              {/* Completion Overview Chart */}
              <Card>
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-base font-semibold">Completion Overview</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="relative h-55">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[{ name: "Completed", value: avgRate }, { name: "Remaining", value: Math.max(0, 100 - avgRate) }]}
                          innerRadius={70}
                          outerRadius={100}
                          dataKey="value"
                          startAngle={90}
                          endAngle={-270}
                          stroke="none"
                        >
                          <Cell fill="#3b82f6" />
                          <Cell fill="#e2e8f0" />
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-3xl font-bold text-primary">{avgRate}%</span>
                      <span className="text-xs text-muted-foreground">Avg Completion</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col mt-2">
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-sm text-muted-foreground">Total Teachers</span>
                      <span className="text-base font-bold text-foreground">{teacherActivity.length}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-sm text-muted-foreground">Active Teachers</span>
                      <span className="text-base font-bold text-foreground">{teacherActivity.filter(t => t.sessions > 0).length}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-muted-foreground">Avg Rate</span>
                      <span className="text-base font-bold text-primary">{avgRate}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-col gap-5 min-w-0">
                {/* Desktop table */}
                <Card className="hidden md:block">
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="px-5 py-2.5 text-sm font-medium uppercase tracking-wide text-muted-foreground">Teacher</th>
                        <th className="px-5 py-2.5 text-sm font-medium uppercase tracking-wide text-muted-foreground">Dept</th>
                        <th className="px-5 py-2.5 text-sm font-medium uppercase tracking-wide text-muted-foreground text-center">Sessions</th>
                        <th className="px-5 py-2.5 text-sm font-medium uppercase tracking-wide text-muted-foreground text-center">Assigned</th>
                        <th className="px-5 py-2.5 text-sm font-medium uppercase tracking-wide text-muted-foreground">Completion</th>
                        <th className="px-5 py-2.5 text-sm font-medium uppercase tracking-wide text-muted-foreground">Last Session</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTeachers.length === 0 ? (
                        <tr><td colSpan={6} className="px-5 py-10 text-center text-base text-muted-foreground">No data available.</td></tr>
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
                                  <div className="text-base font-medium text-foreground">{t.name}</div>
                                  {i === 0 && t.sessions > 0 && <div className="text-[10px] text-amber-600 font-semibold">Top Performer</div>}
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3"><span className="font-mono text-xs rounded bg-muted px-2 py-0.5 text-muted-foreground">{t.dept}</span></td>
                            <td className="px-5 py-3 text-center text-base font-semibold text-foreground">{t.sessions}</td>
                            <td className="px-5 py-3 text-center text-base text-muted-foreground">{t.assigned}</td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="h-2.5 w-32 overflow-hidden rounded-full bg-muted">
                                  <div className={`h-full rounded-full ${color.bg} transition-all`} style={{ width: `${t.rate}%` }} />
                                </div>
                                <span className={`text-base font-semibold ${color.text}`}>{t.rate}%</span>
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
                              <div className="text-base font-medium text-foreground">{t.name}</div>
                              <div className="text-xs text-muted-foreground">{t.dept} · {t.sessions}/{t.assigned} sessions</div>
                            </div>
                          </div>
                          <span className={`text-2xl font-bold ${color.text}`}>{t.rate}%</span>
                        </div>
                        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
                          <div className={`h-full rounded-full ${color.bg}`} style={{ width: `${t.rate}%` }} />
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">Last: {t.lastSession}</div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════
          TAB 2: ATTENDANCE OVERVIEW
      ════════════════════════════════ */}
      {activeTab === "attendance-overview" && (
        loadingOverview ? (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[1, 2, 3, 4].map(i => <CardSkeleton key={i} />)}
            </div>
            <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
              <ChartSkeleton />
              <ListSkeleton count={4} hasAvatar={false} />
            </div>
          </div>
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
                      <div className="text-2xl font-bold text-foreground leading-tight truncate">{s.value}</div>
                      <div className="text-sm font-medium text-foreground/80 truncate">{s.label}</div>
                      <div className="text-xs text-muted-foreground truncate">{s.sub}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
              <Card>
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-base font-semibold">Overall Attendance</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="relative h-55">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[{ name: "Completed", value: overviewStats?.overallPct ?? 0 }, { name: "Remaining", value: Math.max(0, 100 - (overviewStats?.overallPct ?? 0)) }]}
                          innerRadius={70}
                          outerRadius={100}
                          dataKey="value"
                          startAngle={90}
                          endAngle={-270}
                          stroke="none"
                        >
                          <Cell fill="#10b981" />
                          <Cell fill="#e2e8f0" />
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-3xl font-bold text-emerald-600">{overviewStats?.overallPct ?? 0}%</span>
                      <span className="text-xs text-muted-foreground">Overall</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col mt-2">
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-sm text-muted-foreground">Highest: {overviewStats?.highestSubject ?? "—"}</span>
                      <span className="text-base font-bold text-foreground">{overviewStats?.highestPct ?? 0}%</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-sm text-muted-foreground">Lowest: {overviewStats?.lowestSubject ?? "—"}</span>
                      <span className="text-base font-bold text-foreground">{overviewStats?.lowestPct ?? 0}%</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-muted-foreground">Students Below 75%</span>
                      <span className="text-base font-bold text-foreground">{overviewStats?.studentsBelow75 ?? 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Subject table */}
              <Card className="min-w-0 overflow-hidden">
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
                      <th className="px-5 py-2.5 text-sm font-medium uppercase tracking-wide text-muted-foreground">Subject</th>
                      <th className="px-5 py-2.5 text-sm font-medium uppercase tracking-wide text-muted-foreground hidden sm:table-cell">Dept</th>
                      <th className="px-5 py-2.5 text-sm font-medium uppercase tracking-wide text-muted-foreground">Attendance</th>
                      <th className="px-5 py-2.5 text-sm font-medium uppercase tracking-wide text-muted-foreground text-center">Visual</th>
                      <th className="px-5 py-2.5 text-sm font-medium uppercase tracking-wide text-muted-foreground text-center hidden md:table-cell">Sessions</th>
                      <th className="px-5 py-2.5 text-sm font-medium uppercase tracking-wide text-muted-foreground text-center">Below 75%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjectAttendance.length === 0 ? (
                      <tr><td colSpan={6} className="px-5 py-10 text-center text-base text-muted-foreground">No attendance data available.</td></tr>
                    ) : subjectAttendance.map(s => {
                      const color = getAttendanceColor(s.avg)
                      return (
                        <tr key={s.subject} className="border-t border-border hover:bg-muted/20 transition-colors">
                          <td className="px-5 py-3 text-base font-medium text-foreground">{s.subject}</td>
                          <td className="px-5 py-3 hidden sm:table-cell"><span className="font-mono text-xs rounded bg-muted px-2 py-0.5 text-muted-foreground">{s.dept}</span></td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="h-2.5 w-32 overflow-hidden rounded-full bg-muted">
                                <div className={`h-full rounded-full ${color.bar} transition-all`} style={{ width: `${s.avg}%` }} />
                              </div>
                              <span className={`text-base font-bold ${color.text}`}>{s.avg}%</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-center">
                            <div className="inline-flex items-center justify-center">
                              <PieChart width={40} height={40}>
                                <Pie
                                  data={[{ value: s.avg }, { value: Math.max(0, 100 - s.avg) }]}
                                  innerRadius={12}
                                  outerRadius={18}
                                  dataKey="value"
                                  startAngle={90}
                                  endAngle={-270}
                                  stroke="none"
                                >
                                  <Cell fill={s.avg >= 80 ? "#10b981" : s.avg >= 60 ? "#f59e0b" : "#f43f5e"} />
                                  <Cell fill="#e2e8f0" />
                                </Pie>
                              </PieChart>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-center text-base text-foreground hidden md:table-cell">{s.sessions}</td>
                          <td className="px-5 py-3 text-center">
                            <Badge variant="secondary" className={`text-sm ${
                              s.below75 >= 8 ? "bg-rose-500/10 text-rose-600 border-rose-200"
                              : s.below75 >= 4 ? "bg-amber-500/10 text-amber-600 border-amber-200"
                              : "bg-emerald-500/10 text-emerald-600 border-emerald-200"
                            }`}>
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
              <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
                <Activity className="size-3.5" />{systemLogs.length} Total Logs
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-700">
                <Calendar className="size-3.5" />{todayLogCount} Today
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-700">
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
            <div className="flex flex-col gap-4">
              {[1, 2].map(i => (
                <div key={i} className="flex flex-col gap-3">
                  <Skeleton className="h-4 w-28" />
                  <TableSkeleton cols={4} rows={3} hasAvatar={false} />
                </div>
              ))}
            </div>
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
                            const uColor = getUserColor(log.performedBy)
                            return (
                              <tr key={log.id} className={`border-l-2 ${uColor.border} hover:bg-muted/20 transition-colors ${li !== 0 ? "border-t border-border" : ""}`}>
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
                                <td className="px-3 py-3 w-32">
                                  <div className="flex items-center gap-1.5">
                                    <Avatar className="size-5 shrink-0">
                                      <AvatarFallback className={`${uColor.avatar} text-[9px] font-medium`}>{getInitials(log.performedBy)}</AvatarFallback>
                                    </Avatar>
                                    <span className={`text-xs truncate ${uColor.text}`}>{log.performedBy}</span>
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
                      const uColor = getUserColor(log.performedBy)
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
                                  <Avatar className="size-4 shrink-0">
                                    <AvatarFallback className={`${uColor.avatar} text-[8px] font-medium`}>{getInitials(log.performedBy)}</AvatarFallback>
                                  </Avatar>
                                  <span className={`text-[11px] font-medium ${uColor.text}`}>{log.performedBy}</span>
                                  <span className="text-muted-foreground leading-none">·</span>
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