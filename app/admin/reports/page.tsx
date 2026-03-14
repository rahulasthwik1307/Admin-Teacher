"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Download, UserPlus, MapPin, Link2, KeyRound,
  Trash2, Settings, Shield, Loader2,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

/* ── Types ── */
interface TeacherActivityRow {
  id: string
  name: string
  dept: string
  sessions: number
  assigned: number
  rate: number
  lastSession: string
}

interface SubjectAttendanceRow {
  subject: string
  dept: string
  avg: number
  sessions: number
  below75: number
}

interface OverviewStats {
  overallPct: number
  highestSubject: string
  highestPct: number
  lowestSubject: string
  lowestPct: number
  studentsBelow75: number
}

type LogType = "creation" | "update" | "deletion" | "security"

interface LogEntry {
  id: string
  timestamp: string
  action: string
  performedBy: string
  details: string
  type: LogType
}

/* ── Helpers ── */
function getRateColor(rate: number) {
  if (rate >= 80) return "text-emerald-600"
  if (rate >= 60) return "text-amber-600"
  return "text-red-600"
}

function getAttendanceColor(avg: number) {
  if (avg >= 80) return "text-emerald-600"
  if (avg >= 60) return "text-amber-600"
  return "text-red-600"
}

function formatTimestamp(raw: string): string {
  const d = new Date(raw)
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  })
}

function inferLogType(actionType: string): LogType {
  if (actionType === "create") return "creation"
  if (actionType === "delete") return "deletion"
  if (actionType === "security" || actionType === "password") return "security"
  return "update"
}

function getLogIcon(action: string, type: LogType) {
  const desc = action.toLowerCase()
  if (desc.includes("geofence")) return { icon: MapPin, color: "text-amber-600", bg: "bg-amber-500/10" }
  if (desc.includes("assignment") && desc.includes("added")) return { icon: Link2, color: "text-amber-600", bg: "bg-amber-500/10" }
  if (desc.includes("assignment") && desc.includes("removed")) return { icon: Trash2, color: "text-red-600", bg: "bg-red-500/10" }
  if (desc.includes("password")) return { icon: KeyRound, color: "text-blue-600", bg: "bg-blue-500/10" }
  if (desc.includes("settings") || desc.includes("updated") || desc.includes("update")) return { icon: Settings, color: "text-amber-600", bg: "bg-amber-500/10" }
  if (type === "creation") return { icon: UserPlus, color: "text-blue-600", bg: "bg-blue-500/10" }
  if (type === "deletion") return { icon: Trash2, color: "text-red-600", bg: "bg-red-500/10" }
  if (type === "security") return { icon: Shield, color: "text-blue-600", bg: "bg-blue-500/10" }
  return { icon: Settings, color: "text-amber-600", bg: "bg-amber-500/10" }
}

function exportTeacherCSV(rows: TeacherActivityRow[]) {
  const headers = ["Teacher Name", "Department", "Sessions Conducted", "Periods Assigned", "Completion Rate", "Last Session"]
  const csvRows = rows.map((r) => [r.name, r.dept, r.sessions, r.assigned, `${r.rate}%`, r.lastSession])
  const csv = [headers, ...csvRows].map((r) => r.join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `teacher-activity-${new Date().toISOString().split("T")[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/* ── Main Page ── */
export default function ReportsPage() {
  const [teacherActivity, setTeacherActivity] = useState<TeacherActivityRow[]>([])
  const [loadingTeachers, setLoadingTeachers] = useState(true)

  const [subjectAttendance, setSubjectAttendance] = useState<SubjectAttendanceRow[]>([])
  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null)
  const [loadingOverview, setLoadingOverview] = useState(true)

  const [systemLogs, setSystemLogs] = useState<LogEntry[]>([])
  const [loadingLogs, setLoadingLogs] = useState(true)

  /* ── Fetch Teacher Activity ── */
  const fetchTeacherActivity = useCallback(async () => {
    setLoadingTeachers(true)
    try {
      const supabase = createClient()

      // All teachers with name, title, department
      const { data: teachers } = await supabase
        .from("teachers")
        .select(`
          id,
          title,
          department:departments ( name, code ),
          user:users ( full_name )
        `)

      if (!teachers) return

      // All finalized sessions grouped by teacher
      const { data: sessions, error: sessErr } = await supabase
        .from("attendance_sessions")
        .select("id, teacher_id, session_date")
        .eq("status", "finalized")
        .order("session_date", { ascending: false })

      console.log("DEBUG sessions count:", sessions?.length, "error:", sessErr)
      console.log("DEBUG first session:", sessions?.[0])

      if (sessErr) console.error("sessions fetch error:", sessErr)

      // All teacher assignments
      const { data: assignments } = await supabase
        .from("teacher_assignments")
        .select("teacher_id")

      console.log("DEBUG assignments count:", assignments?.length)

      const sessionsByTeacher: Record<string, { count: number; latest: string }> = {}
      for (const s of sessions || []) {
        if (!sessionsByTeacher[s.teacher_id]) {
          sessionsByTeacher[s.teacher_id] = { count: 0, latest: "" }
        }
        sessionsByTeacher[s.teacher_id].count++
        if (!sessionsByTeacher[s.teacher_id].latest || s.session_date > sessionsByTeacher[s.teacher_id].latest) {
          sessionsByTeacher[s.teacher_id].latest = s.session_date
        }
      }

      const assignmentsByTeacher: Record<string, number> = {}
      for (const a of assignments || []) {
        assignmentsByTeacher[a.teacher_id] = (assignmentsByTeacher[a.teacher_id] || 0) + 1
      }

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
        return {
          id: t.id,
          name: `${t.title}. ${t.user?.full_name ?? "Unknown"}`,
          dept: (t.department as any)?.code ?? "—",
          sessions: sessionCount,
          assigned,
          rate,
          lastSession,
        }
      })

      rows.sort((a, b) => b.sessions - a.sessions)
      setTeacherActivity(rows)
    } catch (e) {
      console.error("fetchTeacherActivity error:", e)
    } finally {
      setLoadingTeachers(false)
    }
  }, [])

  /* ── Fetch Attendance Overview ── */
  const fetchOverview = useCallback(async () => {
    setLoadingOverview(true)
    try {
      const supabase = createClient()

      // All finalized sessions with subject info
      const { data: sessions } = await supabase
        .from("attendance_sessions")
        .select("id, subject_id, subject:subjects ( name, department:departments ( code ) )")
        .eq("status", "finalized")

      if (!sessions || sessions.length === 0) {
        setOverviewStats({ overallPct: 0, highestSubject: "—", highestPct: 0, lowestSubject: "—", lowestPct: 0, studentsBelow75: 0 })
        setSubjectAttendance([])
        setLoadingOverview(false)
        return
      }

      const sessionIds = sessions.map((s: any) => s.id)

      // Fetch attendance in batches of 100 to avoid URL length limits
      const allAttendance: any[] = []
      const batchSize = 100
      for (let i = 0; i < sessionIds.length; i += batchSize) {
        const batch = sessionIds.slice(i, i + batchSize)
        const { data: batchData, error: batchErr } = await supabase
          .from("period_attendance")
          .select("session_id, student_id, status")
          .in("session_id", batch)
        if (batchErr) console.error("attendance batch error:", batchErr)
        if (batchData) allAttendance.push(...batchData)
      }
      // Filter to only present/absent in JS
      const attendance = allAttendance.filter((a) => a.status === "present" || a.status === "absent")

      // Build per-subject stats
      const subjectMap: Record<string, {
        name: string
        dept: string
        sessionIds: Set<string>
        present: number
        total: number
        studentPresent: Record<string, number>
        studentTotal: Record<string, number>
      }> = {}

      for (const s of sessions) {
        const subId = (s as any).subject_id
        const subName = (s as any).subject?.name ?? "Unknown"
        const deptCode = (s as any).subject?.department?.code ?? "—"
        if (!subjectMap[subId]) {
          subjectMap[subId] = { name: subName, dept: deptCode, sessionIds: new Set(), present: 0, total: 0, studentPresent: {}, studentTotal: {} }
        }
        subjectMap[subId].sessionIds.add(s.id)
      }

      // Session to subject mapping
      const sessionSubject: Record<string, string> = {}
      for (const s of sessions) {
        sessionSubject[s.id] = (s as any).subject_id
      }

      for (const a of attendance || []) {
        const subId = sessionSubject[a.session_id]
        if (!subId || !subjectMap[subId]) continue
        subjectMap[subId].total++
        if (a.status === "present") subjectMap[subId].present++
        if (!subjectMap[subId].studentTotal[a.student_id]) {
          subjectMap[subId].studentTotal[a.student_id] = 0
          subjectMap[subId].studentPresent[a.student_id] = 0
        }
        subjectMap[subId].studentTotal[a.student_id]++
        if (a.status === "present") subjectMap[subId].studentPresent[a.student_id]++
      }

      const subjectRows: SubjectAttendanceRow[] = Object.values(subjectMap).map((sub) => {
        const avg = sub.total > 0 ? Math.round((sub.present / sub.total) * 100) : 0
        const below75 = Object.keys(sub.studentTotal).filter((sid) => {
          const pct = sub.studentTotal[sid] > 0 ? sub.studentPresent[sid] / sub.studentTotal[sid] : 0
          return pct < 0.75
        }).length
        return {
          subject: sub.name,
          dept: sub.dept,
          avg,
          sessions: sub.sessionIds.size,
          below75,
        }
      }).sort((a, b) => b.avg - a.avg)

      // Overall campus attendance
      const totalPresent = (attendance || []).filter((a: any) => a.status === "present").length
      const totalAll = (attendance || []).length
      const overallPct = totalAll > 0 ? Math.round((totalPresent / totalAll) * 100) : 0

      // Students below 75% overall
      const studentPresentOverall: Record<string, number> = {}
      const studentTotalOverall: Record<string, number> = {}
      for (const a of attendance || []) {
        studentTotalOverall[a.student_id] = (studentTotalOverall[a.student_id] || 0) + 1
        if (a.status === "present") studentPresentOverall[a.student_id] = (studentPresentOverall[a.student_id] || 0) + 1
      }
      const studentsBelow75 = Object.keys(studentTotalOverall).filter((sid) => {
        const pct = (studentPresentOverall[sid] || 0) / studentTotalOverall[sid]
        return pct < 0.75
      }).length

      const highest = subjectRows[0]
      const lowest = subjectRows[subjectRows.length - 1]

      setOverviewStats({
        overallPct,
        highestSubject: highest?.subject ?? "—",
        highestPct: highest?.avg ?? 0,
        lowestSubject: lowest?.subject ?? "—",
        lowestPct: lowest?.avg ?? 0,
        studentsBelow75,
      })
      setSubjectAttendance(subjectRows)
    } catch (e) {
      console.error("fetchOverview error:", e)
    } finally {
      setLoadingOverview(false)
    }
  }, [])

  /* ── Fetch System Logs ── */
  const fetchSystemLogs = useCallback(async () => {
    setLoadingLogs(true)
    try {
      const supabase = createClient()

      const { data: logs } = await supabase
        .from("system_logs")
        .select("id, created_at, action_type, description, performed_by")
        .order("created_at", { ascending: false })
        .limit(50)

      if (!logs) return

      const performerIds = [...new Set(logs.map((l: any) => l.performed_by).filter(Boolean))]
      const nameMap: Record<string, string> = {}
      if (performerIds.length > 0) {
        const { data: users } = await supabase
          .from("users")
          .select("id, full_name")
          .in("id", performerIds)
        for (const u of users || []) {
          nameMap[u.id] = u.full_name
        }
      }

      const mapped: LogEntry[] = logs.map((l: any) => {
        const type = inferLogType(l.action_type)
        // Derive a human-readable action label from action_type
        const actionLabel =
          l.action_type === "create" ? "Created" :
          l.action_type === "update" ? "Updated" :
          l.action_type === "delete" ? "Deleted" :
          l.action_type === "security" ? "Security" :
          l.action_type.charAt(0).toUpperCase() + l.action_type.slice(1)

        return {
          id: l.id,
          timestamp: formatTimestamp(l.created_at),
          action: actionLabel,
          performedBy: nameMap[l.performed_by] ?? "System",
          details: l.description ?? "—",
          type,
        }
      })

      setSystemLogs(mapped)
    } catch (e) {
      console.error("fetchSystemLogs error:", e)
    } finally {
      setLoadingLogs(false)
    }
  }, [])

  useEffect(() => {
    fetchTeacherActivity()
    fetchOverview()
    fetchSystemLogs()
  }, [fetchTeacherActivity, fetchOverview, fetchSystemLogs])

  /* ── Render ── */
  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        System-wide attendance and activity reports.
      </p>

      <Tabs defaultValue="teacher-activity">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="teacher-activity">Teacher Activity</TabsTrigger>
          <TabsTrigger value="attendance-overview">Attendance Overview</TabsTrigger>
          <TabsTrigger value="system-logs">System Logs</TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Teacher Activity ── */}
        <TabsContent value="teacher-activity" className="mt-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-end">
              <Button
                variant="outline" size="sm" className="gap-2"
                disabled={loadingTeachers || teacherActivity.length === 0}
                onClick={() => exportTeacherCSV(teacherActivity)}
              >
                <Download className="size-4" />
                Export
              </Button>
            </div>

            {loadingTeachers ? (
              <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <>
                {/* Desktop table */}
                <Card className="hidden md:block">
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-left">
                            <th className="px-5 py-3 font-medium text-muted-foreground">Teacher Name</th>
                            <th className="px-5 py-3 font-medium text-muted-foreground">Department</th>
                            <th className="px-5 py-3 font-medium text-muted-foreground text-center">Sessions Conducted</th>
                            <th className="px-5 py-3 font-medium text-muted-foreground text-center">Periods Assigned</th>
                            <th className="px-5 py-3 font-medium text-muted-foreground text-center">Completion Rate</th>
                            <th className="px-5 py-3 font-medium text-muted-foreground">Last Session</th>
                          </tr>
                        </thead>
                        <tbody>
                          {teacherActivity.length === 0 ? (
                            <tr><td colSpan={6} className="px-5 py-10 text-center text-muted-foreground text-sm">No data available.</td></tr>
                          ) : teacherActivity.map((t) => (
                            <tr key={t.id} className="border-b border-border last:border-0">
                              <td className="px-5 py-3 font-medium text-foreground">{t.name}</td>
                              <td className="px-5 py-3 text-muted-foreground">{t.dept}</td>
                              <td className="px-5 py-3 text-center font-semibold text-foreground">{t.sessions}</td>
                              <td className="px-5 py-3 text-center text-muted-foreground">{t.assigned}</td>
                              <td className="px-5 py-3 text-center">
                                <span className={`font-semibold ${getRateColor(t.rate)}`}>{t.rate}%</span>
                              </td>
                              <td className="px-5 py-3 text-muted-foreground">{t.lastSession}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Mobile cards */}
                <div className="flex flex-col gap-3 md:hidden">
                  {teacherActivity.map((t) => (
                    <Card key={t.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-foreground">{t.name}</span>
                            <span className="text-xs text-muted-foreground">{t.dept}</span>
                          </div>
                          <span className={`text-lg font-bold ${getRateColor(t.rate)}`}>{t.rate}%</span>
                        </div>
                        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{t.sessions} / {t.assigned} sessions</span>
                          <span>|</span>
                          <span>Last: {t.lastSession}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </div>
        </TabsContent>

        {/* ── Tab 2: Attendance Overview ── */}
        <TabsContent value="attendance-overview" className="mt-6">
          {loadingOverview ? (
            <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Stat cards */}
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Card>
                  <CardContent className="p-4 lg:p-5">
                    <p className="text-xs text-muted-foreground">Overall Campus Attendance</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">{overviewStats?.overallPct ?? 0}%</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 lg:p-5">
                    <p className="text-xs text-muted-foreground">Highest Subject</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">{overviewStats?.highestSubject ?? "—"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{overviewStats?.highestPct ?? 0}%</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 lg:p-5">
                    <p className="text-xs text-muted-foreground">Lowest Subject</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">{overviewStats?.lowestSubject ?? "—"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{overviewStats?.lowestPct ?? 0}%</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 lg:p-5">
                    <p className="text-xs text-muted-foreground">Students Below 75%</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">{overviewStats?.studentsBelow75 ?? 0}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Subject table — desktop */}
              <Card className="hidden md:block">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">Subject-wise Attendance</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-t border-border text-left">
                          <th className="px-5 py-3 font-medium text-muted-foreground">Subject</th>
                          <th className="px-5 py-3 font-medium text-muted-foreground">Department</th>
                          <th className="px-5 py-3 font-medium text-muted-foreground text-center">Avg Attendance</th>
                          <th className="px-5 py-3 font-medium text-muted-foreground text-center">Total Sessions</th>
                          <th className="px-5 py-3 font-medium text-muted-foreground text-center">Below 75%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subjectAttendance.length === 0 ? (
                          <tr><td colSpan={5} className="px-5 py-10 text-center text-muted-foreground text-sm">No attendance data available.</td></tr>
                        ) : subjectAttendance.map((s) => (
                          <tr key={s.subject} className="border-t border-border">
                            <td className="px-5 py-3 font-medium text-foreground">{s.subject}</td>
                            <td className="px-5 py-3 text-muted-foreground">{s.dept}</td>
                            <td className="px-5 py-3 text-center">
                              <span className={`font-semibold ${getAttendanceColor(s.avg)}`}>{s.avg}%</span>
                            </td>
                            <td className="px-5 py-3 text-center text-foreground">{s.sessions}</td>
                            <td className="px-5 py-3 text-center">
                              <Badge variant="secondary" className={
                                s.below75 >= 8
                                  ? "bg-red-500/10 text-red-600 border-red-200"
                                  : s.below75 >= 4
                                    ? "bg-amber-500/10 text-amber-600 border-amber-200"
                                    : "bg-emerald-500/10 text-emerald-600 border-emerald-200"
                              }>
                                {s.below75} students
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Subject cards — mobile */}
              <div className="flex flex-col gap-3 md:hidden">
                <h3 className="text-sm font-semibold text-foreground">Subject-wise Attendance</h3>
                {subjectAttendance.map((s) => (
                  <Card key={s.subject}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">{s.subject}</span>
                          <span className="text-xs text-muted-foreground">{s.dept}</span>
                        </div>
                        <span className={`text-lg font-bold ${getAttendanceColor(s.avg)}`}>{s.avg}%</span>
                      </div>
                      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{s.sessions} sessions</span>
                        <span>|</span>
                        <span className={s.below75 >= 8 ? "text-red-600 font-medium" : ""}>{s.below75} below 75%</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── Tab 3: System Logs ── */}
        <TabsContent value="system-logs" className="mt-6">
          {loadingLogs ? (
            <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              {/* Desktop table */}
              <Card className="hidden md:block">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left">
                          <th className="px-5 py-3 font-medium text-muted-foreground w-12"></th>
                          <th className="px-5 py-3 font-medium text-muted-foreground">Timestamp</th>
                          <th className="px-5 py-3 font-medium text-muted-foreground">Action</th>
                          <th className="px-5 py-3 font-medium text-muted-foreground">Performed By</th>
                          <th className="px-5 py-3 font-medium text-muted-foreground">Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {systemLogs.length === 0 ? (
                          <tr><td colSpan={5} className="px-5 py-10 text-center text-muted-foreground text-sm">No system logs yet.</td></tr>
                        ) : systemLogs.map((log) => {
                          const cfg = getLogIcon(log.details, log.type)
                          const Icon = cfg.icon
                          return (
                            <tr key={log.id} className="border-b border-border last:border-0">
                              <td className="px-5 py-3">
                                <div className={`flex size-8 items-center justify-center rounded-lg ${cfg.bg}`}>
                                  <Icon className={`size-4 ${cfg.color}`} />
                                </div>
                              </td>
                              <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">{log.timestamp}</td>
                              <td className="px-5 py-3 font-medium text-foreground">{log.action}</td>
                              <td className="px-5 py-3 text-muted-foreground">{log.performedBy}</td>
                              <td className="px-5 py-3 text-muted-foreground">{log.details}</td>
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
                {systemLogs.map((log) => {
                  const cfg = getLogIcon(log.details, log.type)
                  const Icon = cfg.icon
                  return (
                    <Card key={log.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${cfg.bg}`}>
                            <Icon className={`size-4 ${cfg.color}`} />
                          </div>
                          <div className="flex flex-1 flex-col gap-0.5">
                            <span className="text-sm font-medium text-foreground">{log.action}</span>
                            <span className="text-xs text-muted-foreground">{log.details}</span>
                            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{log.performedBy}</span>
                              <span>|</span>
                              <span>{log.timestamp}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}