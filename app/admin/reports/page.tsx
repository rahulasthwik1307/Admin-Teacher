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
import { motion, AnimatePresence } from "framer-motion"

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
  if (rate >= 80) return { text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500", badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20" }
  if (rate >= 60) return { text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500", badge: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20" }
  return { text: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500", badge: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20" }
}

function getAttendanceColor(avg: number) {
  if (avg >= 80) return { text: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500" }
  if (avg >= 60) return { text: "text-amber-600 dark:text-amber-400", bar: "bg-amber-500" }
  return { text: "text-rose-600 dark:text-rose-400", bar: "bg-rose-500" }
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
    case "create": return { icon: UserPlus, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", label: "CREATED", labelColor: "text-emerald-700 dark:text-emerald-300" }
    case "update": return { icon: Pencil, color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/20", label: "UPDATED", labelColor: "text-sky-700 dark:text-sky-300" }
    case "delete": return { icon: Trash2, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", label: "DELETED", labelColor: "text-rose-700 dark:text-rose-300" }
    case "reset": return { icon: KeyRound, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", label: "RESET", labelColor: "text-amber-700 dark:text-amber-300" }
    case "assign": return { icon: Link2, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20", label: "ASSIGNED", labelColor: "text-violet-700 dark:text-violet-300" }
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

      {/* ── Segmented Tab Bar with Smooth Spring Indicator ── */}
      <div className="inline-flex gap-1.5 rounded-xl border border-border/80 bg-muted/60 p-1.5 self-start shadow-2xs">
        {tabConfig.map(tab => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 rounded-lg px-4 h-10 text-xs font-semibold transition-all cursor-pointer ${
                isActive ? "text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeReportsTabPill"
                  className="absolute inset-0 rounded-lg bg-background border border-border/80 shadow-xs"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <tab.icon className={`size-3.5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                <span>{tab.label}</span>
              </span>
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* ════════════════════════════════
            TAB 1: TEACHER ACTIVITY
        ════════════════════════════════ */}
        {activeTab === "teacher-activity" && (
          <motion.div
            key="teacher-activity"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col gap-5"
          >
            {/* Stat cards */}
            {!loadingTeachers && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {/* Card 1: Avg Completion */}
                <Card className="relative overflow-hidden rounded-xl border border-sky-200/80 bg-linear-to-b from-sky-500/5 via-card to-card p-3.5 lg:p-4 shadow-2xs transition-all hover:shadow-md dark:border-sky-800/60">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">
                          Performance
                        </span>
                      </div>
                      <div className="text-2xl lg:text-3xl font-black tracking-tight text-foreground mt-0.5">
                        <span className={getRateColor(avgRate).text}>{avgRate}%</span>
                      </div>
                      <span className="text-xs text-muted-foreground font-medium">Average Session Completion Rate</span>
                    </div>
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                      <TrendingUp className="size-4.5" />
                    </div>
                  </div>
                </Card>

                {/* Card 2: Active Teachers */}
                <Card className="relative overflow-hidden rounded-xl border border-emerald-200/80 bg-linear-to-b from-emerald-500/5 via-card to-card p-3.5 lg:p-4 shadow-2xs transition-all hover:shadow-md dark:border-emerald-800/60">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                          Faculty
                        </span>
                      </div>
                      <div className="text-2xl lg:text-3xl font-black tracking-tight text-foreground mt-0.5">
                        {teacherActivity.filter(t => t.sessions > 0).length}
                        <span className="text-xs font-semibold text-muted-foreground ml-1.5">/ {teacherActivity.length}</span>
                      </div>
                      <span className="text-xs text-muted-foreground font-medium">Active Teachers With Sessions</span>
                    </div>
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <Users className="size-4.5" />
                    </div>
                  </div>
                </Card>

                {/* Card 3: Top Performer */}
                {topTeacher && (
                  <Card className="relative overflow-hidden rounded-xl border border-amber-200/80 bg-linear-to-b from-amber-500/5 via-card to-card p-3.5 lg:p-4 shadow-2xs transition-all hover:shadow-md dark:border-amber-800/60 col-span-1 sm:col-span-2 lg:col-span-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                            Leader
                          </span>
                        </div>
                        <div className="text-xl lg:text-2xl font-black tracking-tight text-foreground mt-0.5 truncate">
                          {topTeacher.name}
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">{topTeacher.sessions} sessions conducted · {topTeacher.rate}% rate</span>
                      </div>
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        <CheckCircle2 className="size-4.5" />
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            )}

            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <Select value={teacherDeptFilter} onValueChange={setTeacherDeptFilter}>
                  <SelectTrigger className="h-9 w-56 text-xs font-medium">
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-xl border border-rose-200/80 bg-rose-50/60 dark:border-rose-900/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 hover:bg-rose-100/80 dark:hover:bg-rose-950/40 text-xs font-semibold px-3 gap-1.5 shadow-2xs transition-all cursor-pointer"
                    onClick={() => setTeacherDeptFilter("all")}
                  >
                    <X className="size-3.5" /> Clear
                  </Button>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 h-9 rounded-xl font-semibold shadow-2xs hover:shadow transition-all cursor-pointer"
                disabled={loadingTeachers || teacherActivity.length === 0}
                onClick={() => exportTeacherCSV(teacherActivity)}
              >
                <Download className="size-4" /> Export CSV
              </Button>
            </div>

            {loadingTeachers ? (
              <div className="grid gap-5 lg:grid-cols-[320px_1fr] items-stretch">
                <CardSkeleton />
                <TableSkeleton cols={5} rows={6} hasAvatar={true} />
              </div>
            ) : (
              <div className="grid gap-5 lg:grid-cols-[320px_1fr] items-stretch">
                {/* Completion Overview Chart */}
                <Card className="h-full flex flex-col overflow-hidden">
                  <CardHeader className="pb-2 pt-4 border-b border-border/60 bg-muted/20">
                    <div className="flex items-center gap-2">
                      <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <TrendingUp className="size-3.5" />
                      </div>
                      <CardTitle className="text-sm font-bold text-foreground">Completion Overview</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col justify-between flex-1 p-5 gap-4">
                    <div className="relative h-52 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[{ name: "Completed", value: avgRate }, { name: "Remaining", value: Math.max(0, 100 - avgRate) }]}
                            innerRadius={68}
                            outerRadius={95}
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
                        <span className="text-3xl font-black text-primary">{avgRate}%</span>
                        <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Avg Completion</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col divide-y divide-border/70 rounded-xl border border-border/70 bg-muted/20 px-3.5">
                      <div className="flex justify-between items-center py-2.5">
                        <span className="text-xs text-muted-foreground font-medium">Total Teachers</span>
                        <span className="text-xs font-bold text-foreground">{teacherActivity.length}</span>
                      </div>
                      <div className="flex justify-between items-center py-2.5">
                        <span className="text-xs text-muted-foreground font-medium">Active Teachers</span>
                        <span className="text-xs font-bold text-foreground">{teacherActivity.filter(t => t.sessions > 0).length}</span>
                      </div>
                      <div className="flex justify-between items-center py-2.5">
                        <span className="text-xs text-muted-foreground font-medium">Avg Completion Rate</span>
                        <span className="text-xs font-bold text-primary">{avgRate}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex flex-col gap-5 min-w-0 h-full">
                  {/* Desktop table */}
                  <Card className="hidden md:flex flex-col h-full overflow-hidden">
                    <CardContent className="p-0 flex-1 flex flex-col">
                      <div className="overflow-x-auto flex-1">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border bg-muted/30 text-left">
                              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Teacher</th>
                              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dept</th>
                              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center">Sessions</th>
                              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center">Assigned</th>
                              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Completion</th>
                              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Last Session</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredTeachers.length === 0 ? (
                              <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-muted-foreground">No data available for the selected department.</td></tr>
                            ) : filteredTeachers.map((t, i) => {
                              const color = getRateColor(t.rate)
                              return (
                                <tr key={t.id} className={`border-t border-border hover:bg-muted/20 transition-colors ${i === 0 && t.sessions > 0 ? "bg-amber-500/3" : ""}`}>
                                  <td className="px-5 py-3">
                                    <div className="flex items-center gap-2.5">
                                      <Avatar className="size-8 ring-1 ring-border">
                                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{getInitials(t.name)}</AvatarFallback>
                                      </Avatar>
                                      <div className="flex flex-col min-w-0">
                                        <span className="text-xs font-bold text-foreground truncate">{t.name}</span>
                                        {i === 0 && t.sessions > 0 && <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">★ Top Performer</span>}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3"><span className="font-mono text-xs font-bold rounded-md bg-muted px-2 py-0.5 text-muted-foreground">{t.dept}</span></td>
                                  <td className="px-4 py-3 text-center text-xs font-bold text-foreground">{t.sessions}</td>
                                  <td className="px-4 py-3 text-center text-xs text-muted-foreground">{t.assigned}</td>
                                  <td className="px-5 py-3">
                                    <div className="flex items-center gap-2.5">
                                      <div className="h-2 w-28 overflow-hidden rounded-full bg-muted">
                                        <div className={`h-full rounded-full ${color.bg} transition-all`} style={{ width: `${t.rate}%` }} />
                                      </div>
                                      <span className={`text-xs font-bold ${color.text}`}>{t.rate}%</span>
                                    </div>
                                  </td>
                                  <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">{t.lastSession}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Mobile cards */}
                  <div className="flex flex-col gap-3 md:hidden">
                    {filteredTeachers.map(t => {
                      const color = getRateColor(t.rate)
                      return (
                        <Card key={t.id} className="overflow-hidden">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2.5">
                                <Avatar className="size-9 ring-1 ring-border">
                                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{getInitials(t.name)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="text-xs font-bold text-foreground">{t.name}</div>
                                  <div className="text-[11px] text-muted-foreground">{t.dept} · {t.sessions}/{t.assigned} sessions</div>
                                </div>
                              </div>
                              <span className={`text-xl font-bold ${color.text}`}>{t.rate}%</span>
                            </div>
                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                              <div className={`h-full rounded-full ${color.bg}`} style={{ width: `${t.rate}%` }} />
                            </div>
                            <div className="mt-2 text-[11px] text-muted-foreground">Last Session: {t.lastSession}</div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ════════════════════════════════
            TAB 2: ATTENDANCE OVERVIEW
        ════════════════════════════════ */}
        {activeTab === "attendance-overview" && (
          <motion.div
            key="attendance-overview"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col gap-5"
          >
            {loadingOverview ? (
              <div className="flex flex-col gap-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {[1, 2, 3, 4].map(i => <CardSkeleton key={i} />)}
                </div>
                <div className="grid gap-5 lg:grid-cols-[320px_1fr] items-stretch">
                  <ChartSkeleton />
                  <ListSkeleton count={4} hasAvatar={false} />
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {/* Stat cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {/* Card 1: Overall Campus */}
                  <Card className="relative overflow-hidden rounded-xl border border-sky-200/80 bg-linear-to-b from-sky-500/5 via-card to-card p-3.5 lg:p-4 shadow-2xs transition-all hover:shadow-md dark:border-sky-800/60">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-1 min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">
                          Campus Attendance
                        </span>
                        <div className="text-2xl lg:text-3xl font-black tracking-tight text-foreground mt-0.5">
                          {overviewStats?.overallPct ?? 0}%
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">All Subjects Combined</span>
                      </div>
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                        <BarChart3 className="size-4.5" />
                      </div>
                    </div>
                  </Card>

                  {/* Card 2: Highest Subject */}
                  <Card className="relative overflow-hidden rounded-xl border border-emerald-200/80 bg-linear-to-b from-emerald-500/5 via-card to-card p-3.5 lg:p-4 shadow-2xs transition-all hover:shadow-md dark:border-emerald-800/60">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-1 min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                          Top Attendance
                        </span>
                        <div className="text-xl lg:text-2xl font-black tracking-tight text-foreground mt-0.5 truncate">
                          {overviewStats?.highestSubject ?? "—"}
                        </div>
                        <span className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold">{overviewStats?.highestPct ?? 0}% average</span>
                      </div>
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <TrendingUp className="size-4.5" />
                      </div>
                    </div>
                  </Card>

                  {/* Card 3: Lowest Subject */}
                  <Card className="relative overflow-hidden rounded-xl border border-rose-200/80 bg-linear-to-b from-rose-500/5 via-card to-card p-3.5 lg:p-4 shadow-2xs transition-all hover:shadow-md dark:border-rose-800/60">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-1 min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                          Attention Required
                        </span>
                        <div className="text-xl lg:text-2xl font-black tracking-tight text-foreground mt-0.5 truncate">
                          {overviewStats?.lowestSubject ?? "—"}
                        </div>
                        <span className="text-xs text-rose-700 dark:text-rose-300 font-semibold">{overviewStats?.lowestPct ?? 0}% lowest average</span>
                      </div>
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                        <AlertTriangle className="size-4.5" />
                      </div>
                    </div>
                  </Card>

                  {/* Card 4: Students Below 75% */}
                  <Card className="relative overflow-hidden rounded-xl border border-amber-200/80 bg-linear-to-b from-amber-500/5 via-card to-card p-3.5 lg:p-4 shadow-2xs transition-all hover:shadow-md dark:border-amber-800/60">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-1 min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                          At Risk
                        </span>
                        <div className="text-2xl lg:text-3xl font-black tracking-tight text-foreground mt-0.5">
                          {overviewStats?.studentsBelow75 ?? 0}
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">Students Below 75% Criteria</span>
                      </div>
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        <Users className="size-4.5" />
                      </div>
                    </div>
                  </Card>
                </div>

                <div className="grid gap-5 lg:grid-cols-[320px_1fr] items-stretch">
                  {/* Left Overview card */}
                  <Card className="h-full flex flex-col overflow-hidden">
                    <CardHeader className="pb-2 pt-4 border-b border-border/60 bg-muted/20">
                      <div className="flex items-center gap-2">
                        <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                          <BarChart3 className="size-3.5" />
                        </div>
                        <CardTitle className="text-sm font-bold text-foreground">Overall Attendance</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col justify-between flex-1 p-5 gap-4">
                      <div className="relative h-52 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[{ name: "Completed", value: overviewStats?.overallPct ?? 0 }, { name: "Remaining", value: Math.max(0, 100 - (overviewStats?.overallPct ?? 0)) }]}
                              innerRadius={68}
                              outerRadius={95}
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
                          <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{overviewStats?.overallPct ?? 0}%</span>
                          <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Campus Wide</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col divide-y divide-border/70 rounded-xl border border-border/70 bg-muted/20 px-3.5">
                        <div className="flex justify-between items-center py-2.5">
                          <span className="text-xs text-muted-foreground font-medium truncate max-w-36">Top: {overviewStats?.highestSubject ?? "—"}</span>
                          <span className="text-xs font-bold text-foreground">{overviewStats?.highestPct ?? 0}%</span>
                        </div>
                        <div className="flex justify-between items-center py-2.5">
                          <span className="text-xs text-muted-foreground font-medium truncate max-w-36">Lowest: {overviewStats?.lowestSubject ?? "—"}</span>
                          <span className="text-xs font-bold text-foreground">{overviewStats?.lowestPct ?? 0}%</span>
                        </div>
                        <div className="flex justify-between items-center py-2.5">
                          <span className="text-xs text-muted-foreground font-medium">Below 75% Students</span>
                          <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{overviewStats?.studentsBelow75 ?? 0}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Subject table card */}
                  <Card className="min-w-0 h-full flex flex-col overflow-hidden">
                    <CardHeader className="pb-3 pt-4 border-b border-border/60 bg-muted/20">
                      <div className="flex items-center gap-2">
                        <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <BookOpen className="size-3.5" />
                        </div>
                        <CardTitle className="text-sm font-bold text-foreground">Subject-wise Attendance Distribution</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 flex flex-col">
                      <div className="overflow-x-auto flex-1">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border bg-muted/30 text-left">
                              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Subject</th>
                              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden sm:table-cell">Dept</th>
                              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Attendance</th>
                              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center">Visual</th>
                              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center hidden md:table-cell">Sessions</th>
                              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center">Below 75%</th>
                            </tr>
                          </thead>
                          <tbody>
                            {subjectAttendance.length === 0 ? (
                              <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-muted-foreground">No attendance data available.</td></tr>
                            ) : subjectAttendance.map(s => {
                              const color = getAttendanceColor(s.avg)
                              return (
                                <tr key={s.subject} className="border-t border-border hover:bg-muted/20 transition-colors">
                                  <td className="px-5 py-3 text-xs font-bold text-foreground">{s.subject}</td>
                                  <td className="px-4 py-3 hidden sm:table-cell">
                                    <span className="font-mono text-xs font-bold rounded-md bg-muted px-2 py-0.5 text-muted-foreground">{s.dept}</span>
                                  </td>
                                  <td className="px-5 py-3">
                                    <div className="flex items-center gap-2.5">
                                      <div className="h-2 w-28 overflow-hidden rounded-full bg-muted">
                                        <div className={`h-full rounded-full ${color.bar} transition-all`} style={{ width: `${s.avg}%` }} />
                                      </div>
                                      <span className={`text-xs font-bold ${color.text}`}>{s.avg}%</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <div className="inline-flex items-center justify-center">
                                      <PieChart width={36} height={36}>
                                        <Pie
                                          data={[{ value: s.avg }, { value: Math.max(0, 100 - s.avg) }]}
                                          innerRadius={11}
                                          outerRadius={16}
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
                                  <td className="px-4 py-3 text-center text-xs font-bold text-foreground hidden md:table-cell">{s.sessions}</td>
                                  <td className="px-5 py-3 text-center">
                                    <Badge variant="outline" className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                                      s.below75 >= 8 ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20"
                                      : s.below75 >= 4 ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
                                      : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                                    }`}>
                                      {s.below75} students
                                    </Badge>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ════════════════════════════════
            TAB 3: SYSTEM LOGS
        ════════════════════════════════ */}
        {activeTab === "system-logs" && (
          <motion.div
            key="system-logs"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col gap-5"
          >
            {/* Stat cards */}
            {!loadingLogs && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="flex items-center gap-3 rounded-xl border border-sky-200/80 bg-linear-to-b from-sky-500/5 via-card to-card p-3.5 shadow-2xs dark:border-sky-800/60">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                    <Activity className="size-4.5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-lg font-black text-foreground leading-none">{systemLogs.length}</span>
                    <span className="text-[11px] text-muted-foreground font-medium mt-1">Total System Logs</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-emerald-200/80 bg-linear-to-b from-emerald-500/5 via-card to-card p-3.5 shadow-2xs dark:border-emerald-800/60">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Calendar className="size-4.5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-lg font-black text-foreground leading-none">{todayLogCount}</span>
                    <span className="text-[11px] text-muted-foreground font-medium mt-1">Events Logged Today</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-amber-200/80 bg-linear-to-b from-amber-500/5 via-card to-card p-3.5 shadow-2xs dark:border-amber-800/60">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Users className="size-4.5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-lg font-black text-foreground leading-none">{uniquePerformers.length}</span>
                    <span className="text-[11px] text-muted-foreground font-medium mt-1">Active Administrators</span>
                  </div>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-2 items-center">
              <Select value={logFilterPerformer} onValueChange={setLogFilterPerformer}>
                <SelectTrigger className="h-9 w-44 text-xs font-medium">
                  <Users className="size-3.5 mr-1 text-muted-foreground" />
                  <SelectValue placeholder="All Users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {uniquePerformers.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={logFilterAction} onValueChange={setLogFilterAction}>
                <SelectTrigger className="h-9 w-36 text-xs font-medium">
                  <Activity className="size-3.5 mr-1 text-muted-foreground" />
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
                <SelectTrigger className="h-9 w-36 text-xs font-medium">
                  <Calendar className="size-3.5 mr-1 text-muted-foreground" />
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
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-xl border border-rose-200/80 bg-rose-50/60 dark:border-rose-900/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 hover:bg-rose-100/80 dark:hover:bg-rose-950/40 text-xs font-semibold px-3 gap-1.5 shadow-2xs transition-all cursor-pointer"
                  onClick={() => { setLogFilterPerformer("all"); setLogFilterAction("all"); setLogFilterRange("all") }}
                >
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
                      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{dateLabel}</span>
                      <div className="flex-1 h-px bg-border" />
                      <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5">{logs.length}</Badge>
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
                                <tr key={log.id} className={`border-l-3 ${uColor.border} hover:bg-muted/20 transition-colors ${li !== 0 ? "border-t border-border" : ""}`}>
                                  <td className="px-4 py-3 w-10">
                                    <div className={`flex size-8 items-center justify-center rounded-lg border ${cfg.bg} ${cfg.border}`}>
                                      <Icon className={`size-4 ${cfg.color}`} />
                                    </div>
                                  </td>
                                  <td className="px-3 py-3 w-28">
                                    <Badge variant="outline" className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-md ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                                      {cfg.label}
                                    </Badge>
                                  </td>
                                  <td className="px-3 py-3 flex-1">
                                    <span className="text-xs font-medium text-foreground">{log.details}</span>
                                  </td>
                                  <td className="px-3 py-3 w-36">
                                    <div className="flex items-center gap-2">
                                      <Avatar className="size-6 shrink-0 ring-1 ring-border">
                                        <AvatarFallback className={`${uColor.avatar} text-[9px] font-bold`}>{getInitials(log.performedBy)}</AvatarFallback>
                                      </Avatar>
                                      <span className={`text-xs font-semibold truncate ${uColor.text}`}>{log.performedBy}</span>
                                    </div>
                                  </td>
                                  <td className="px-5 py-3 text-right text-xs font-mono text-muted-foreground whitespace-nowrap">{log.timestamp}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </CardContent>
                    </Card>

                    {/* Mobile cards */}
                    <div className="flex flex-col gap-2.5 md:hidden">
                      {logs.map(log => {
                        const cfg = getActionConfig(log.actionType, log.details)
                        const Icon = cfg.icon
                        const uColor = getUserColor(log.performedBy)
                        return (
                          <div key={log.id} className="rounded-xl border border-border bg-card p-3.5 shadow-2xs">
                            <div className="flex items-start gap-3">
                              <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg border ${cfg.bg} ${cfg.border}`}>
                                <Icon className={`size-4 ${cfg.color}`} />
                              </div>
                              <div className="flex flex-1 flex-col gap-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <Badge variant="outline" className={`text-[10px] font-bold tracking-wider px-1.5 py-0.2 rounded-md ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                                    {cfg.label}
                                  </Badge>
                                  <span className="text-[10px] font-mono text-muted-foreground">{log.timestamp}</span>
                                </div>
                                <span className="text-xs font-medium text-foreground">{log.details}</span>
                                <div className="flex items-center gap-1.5 mt-1 pt-1 border-t border-border/60">
                                  <Avatar className="size-4.5 shrink-0 ring-1 ring-border">
                                    <AvatarFallback className={`${uColor.avatar} text-[8px] font-bold`}>{getInitials(log.performedBy)}</AvatarFallback>
                                  </Avatar>
                                  <span className={`text-xs font-semibold ${uColor.text}`}>{log.performedBy}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}