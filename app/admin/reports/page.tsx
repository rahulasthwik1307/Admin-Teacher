"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Download,
  UserPlus,
  MapPin,
  Link2,
  KeyRound,
  Trash2,
  Settings,
  Shield,
} from "lucide-react"

/* ── Teacher Activity Data ── */
const teacherActivity = [
  { name: "Dr. P. Sharma", dept: "CSE", sessions: 18, assigned: 20, rate: 90, lastSession: "Oct 24, 2024" },
  { name: "Dr. S. Reddy", dept: "CSE", sessions: 14, assigned: 18, rate: 78, lastSession: "Oct 23, 2024" },
  { name: "Dr. M. Patel", dept: "ECE", sessions: 10, assigned: 15, rate: 67, lastSession: "Oct 22, 2024" },
  { name: "Dr. K. Rao", dept: "CSE", sessions: 8, assigned: 20, rate: 40, lastSession: "Oct 20, 2024" },
  { name: "Dr. A. Singh", dept: "ECE", sessions: 0, assigned: 10, rate: 0, lastSession: "Never" },
]

/* ── Attendance Overview Data ── */
const overviewStats = [
  { label: "Overall Campus Attendance", value: "76%" },
  { label: "Highest Subject", value: "Data Structures", sub: "86%" },
  { label: "Lowest Subject", value: "DBMS", sub: "53%" },
  { label: "Students Below 75%", value: "12" },
]

const subjectAttendance = [
  { subject: "Data Structures", dept: "CSE", avg: 86, sessions: 18, below75: 2 },
  { subject: "Operating Systems", dept: "CSE", avg: 79, sessions: 16, below75: 4 },
  { subject: "Computer Networks", dept: "CSE", avg: 72, sessions: 14, below75: 6 },
  { subject: "Circuit Theory", dept: "ECE", avg: 68, sessions: 10, below75: 8 },
  { subject: "DBMS", dept: "CSE", avg: 53, sessions: 12, below75: 12 },
]

/* ── System Logs Data ── */
type LogType = "creation" | "update" | "deletion" | "security"

interface LogEntry {
  timestamp: string
  action: string
  performedBy: string
  details: string
  type: LogType
}

const systemLogs: LogEntry[] = [
  { timestamp: "Oct 24, 2024 10:30 AM", action: "Teacher Created", performedBy: "Dr. R. Kumar", details: "Created account for Dr. S. Reddy (TCH002)", type: "creation" },
  { timestamp: "Oct 23, 2024 3:15 PM", action: "Geofence Updated", performedBy: "Dr. R. Kumar", details: "Radius changed from 200m to 250m", type: "update" },
  { timestamp: "Oct 23, 2024 2:00 PM", action: "Assignment Added", performedBy: "Dr. R. Kumar", details: "Dr. P. Sharma assigned to DBMS — CSE-A", type: "update" },
  { timestamp: "Oct 22, 2024 11:45 AM", action: "Assignment Removed", performedBy: "Dr. R. Kumar", details: "Dr. K. Rao removed from Signals & Systems — ECE-A", type: "deletion" },
  { timestamp: "Oct 22, 2024 9:00 AM", action: "Password Reset", performedBy: "Dr. R. Kumar", details: "Password reset for Dr. A. Singh (TCH005)", type: "security" },
  { timestamp: "Oct 21, 2024 4:30 PM", action: "Teacher Created", performedBy: "Dr. R. Kumar", details: "Created account for Dr. M. Patel (TCH003)", type: "creation" },
  { timestamp: "Oct 21, 2024 2:00 PM", action: "Subject Deleted", performedBy: "Dr. R. Kumar", details: "Removed subject 'Advanced Mathematics' from CSE", type: "deletion" },
  { timestamp: "Oct 20, 2024 10:00 AM", action: "System Settings", performedBy: "Dr. R. Kumar", details: "Academic year 2024-25 structure configured", type: "update" },
]

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

const logTypeConfig: Record<LogType, { icon: typeof UserPlus; color: string; bg: string }> = {
  creation: { icon: UserPlus, color: "text-blue-600", bg: "bg-blue-500/10" },
  update: { icon: Settings, color: "text-amber-600", bg: "bg-amber-500/10" },
  deletion: { icon: Trash2, color: "text-red-600", bg: "bg-red-500/10" },
  security: { icon: Shield, color: "text-blue-600", bg: "bg-blue-500/10" },
}

// Map specific actions to specific icons for the log table
function getLogIcon(action: string, type: LogType) {
  if (action.includes("Geofence")) return { icon: MapPin, color: "text-amber-600", bg: "bg-amber-500/10" }
  if (action.includes("Assignment Added")) return { icon: Link2, color: "text-amber-600", bg: "bg-amber-500/10" }
  if (action.includes("Assignment Removed")) return { icon: Trash2, color: "text-red-600", bg: "bg-red-500/10" }
  if (action.includes("Password")) return { icon: KeyRound, color: "text-blue-600", bg: "bg-blue-500/10" }
  if (action.includes("Settings")) return { icon: Settings, color: "text-amber-600", bg: "bg-amber-500/10" }
  return logTypeConfig[type]
}

export default function ReportsPage() {
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
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="size-4" />
                Export
              </Button>
            </div>

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
                      {teacherActivity.map((t) => (
                        <tr key={t.name} className="border-b border-border last:border-0">
                          <td className="px-5 py-3 font-medium text-foreground">{t.name}</td>
                          <td className="px-5 py-3 text-muted-foreground">{t.dept}</td>
                          <td className="px-5 py-3 text-center font-semibold text-foreground">{t.sessions}</td>
                          <td className="px-5 py-3 text-center text-muted-foreground">{t.assigned}</td>
                          <td className="px-5 py-3 text-center">
                            <span className={`font-semibold ${getRateColor(t.rate)}`}>
                              {t.rate}%
                            </span>
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
                <Card key={t.name}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">{t.name}</span>
                        <span className="text-xs text-muted-foreground">{t.dept}</span>
                      </div>
                      <span className={`text-lg font-bold ${getRateColor(t.rate)}`}>
                        {t.rate}%
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{t.sessions} / {t.assigned} sessions</span>
                      <span>{'|'}</span>
                      <span>Last: {t.lastSession}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ── Tab 2: Attendance Overview ── */}
        <TabsContent value="attendance-overview" className="mt-6">
          <div className="flex flex-col gap-6">
            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {overviewStats.map((stat) => (
                <Card key={stat.label}>
                  <CardContent className="p-4 lg:p-5">
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">{stat.value}</p>
                    {stat.sub && (
                      <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
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
                      {subjectAttendance.map((s) => (
                        <tr key={s.subject} className="border-t border-border">
                          <td className="px-5 py-3 font-medium text-foreground">{s.subject}</td>
                          <td className="px-5 py-3 text-muted-foreground">{s.dept}</td>
                          <td className="px-5 py-3 text-center">
                            <span className={`font-semibold ${getAttendanceColor(s.avg)}`}>
                              {s.avg}%
                            </span>
                          </td>
                          <td className="px-5 py-3 text-center text-foreground">{s.sessions}</td>
                          <td className="px-5 py-3 text-center">
                            <Badge
                              variant="secondary"
                              className={
                                s.below75 >= 8
                                  ? "bg-red-500/10 text-red-600 border-red-200"
                                  : s.below75 >= 4
                                    ? "bg-amber-500/10 text-amber-600 border-amber-200"
                                    : "bg-emerald-500/10 text-emerald-600 border-emerald-200"
                              }
                            >
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
                      <span className={`text-lg font-bold ${getAttendanceColor(s.avg)}`}>
                        {s.avg}%
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{s.sessions} sessions</span>
                      <span>{'|'}</span>
                      <span className={s.below75 >= 8 ? "text-red-600 font-medium" : ""}>
                        {s.below75} below 75%
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ── Tab 3: System Logs ── */}
        <TabsContent value="system-logs" className="mt-6">
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
                    {systemLogs.map((log, i) => {
                      const cfg = getLogIcon(log.action, log.type)
                      const Icon = cfg.icon
                      return (
                        <tr key={i} className="border-b border-border last:border-0">
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
            {systemLogs.map((log, i) => {
              const cfg = getLogIcon(log.action, log.type)
              const Icon = cfg.icon
              return (
                <Card key={i}>
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
                          <span>{'|'}</span>
                          <span>{log.timestamp}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
