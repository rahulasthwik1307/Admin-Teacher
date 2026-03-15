"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  GraduationCap,
  Building,
  Radio,
  Loader2,
  UserPlus,
  Pencil,
  Trash2,
  KeyRound,
  Link2,
  TrendingUp,
  Activity,
  CheckCircle2,
  Clock,
  BarChart3,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

function getInitials(name: string): string {
  return (
    name
      .split(" ")
      .filter((w) => w[0] && w[0] === w[0].toUpperCase())
      .map((w) => w[0])
      .join("")
      .slice(0, 2) || "NA"
  )
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const then = new Date(dateStr)
  const diffMs = now.getTime() - then.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)
  if (diffMin < 1) return "Just now"
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay === 1) return "Yesterday"
  return `${diffDay}d ago`
}

function getActionConfig(actionType: string) {
  switch (actionType) {
    case "create":
      return {
        icon: UserPlus,
        color: "text-emerald-600",
        bg: "bg-emerald-500/10",
        border: "border-emerald-200",
        label: "CREATED",
        labelColor: "text-emerald-600",
      }
    case "update":
      return {
        icon: Pencil,
        color: "text-blue-600",
        bg: "bg-blue-500/10",
        border: "border-blue-200",
        label: "UPDATED",
        labelColor: "text-blue-600",
      }
    case "delete":
      return {
        icon: Trash2,
        color: "text-rose-600",
        bg: "bg-rose-500/10",
        border: "border-rose-200",
        label: "DELETED",
        labelColor: "text-rose-600",
      }
    case "reset":
      return {
        icon: KeyRound,
        color: "text-amber-600",
        bg: "bg-amber-500/10",
        border: "border-amber-200",
        label: "RESET",
        labelColor: "text-amber-600",
      }
    case "assign":
      return {
        icon: Link2,
        color: "text-violet-600",
        bg: "bg-violet-500/10",
        border: "border-violet-200",
        label: "ASSIGNED",
        labelColor: "text-violet-600",
      }
    default:
      return {
        icon: Activity,
        color: "text-muted-foreground",
        bg: "bg-muted",
        border: "border-border",
        label: "ACTION",
        labelColor: "text-muted-foreground",
      }
  }
}

interface TeacherActivityRow {
  id: string
  name: string
  initials: string
  subject: string
  sessions: number
  lastActive: string
}

interface RecentActivityItem {
  text: string
  time: string
  actionType: string
}

interface DashboardStats {
  teachers: number
  students: number
  departments: number
  activeSessions: number
}

interface SystemStatusItem {
  label: string
  value: number | string
  status: "ok" | "warn" | "info"
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    teachers: 0,
    students: 0,
    departments: 0,
    activeSessions: 0,
  })
  const [teacherActivity, setTeacherActivity] = useState<TeacherActivityRow[]>([])
  const [systemStatus, setSystemStatus] = useState<SystemStatusItem[]>([])
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [maxSessions, setMaxSessions] = useState(1)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()

      const now = new Date()
      const day = now.getDay()
      const diffToMon = day === 0 ? -6 : 1 - day
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() + diffToMon)
      weekStart.setHours(0, 0, 0, 0)
      const weekStartStr = weekStart.toISOString().split("T")[0]

      const [
        { count: teacherCount },
        { count: studentCount },
        { count: deptCount },
        { count: activeSessionCount },
        { data: teachers },
        { data: weekSessions },
        { data: activeTeachers },
        { data: logs },
      ] = await Promise.all([
        supabase.from("teachers").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("students").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("departments").select("id", { count: "exact", head: true }),
        supabase.from("attendance_sessions").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("teachers").select(`id, title, user:users ( full_name )`),
        supabase
          .from("attendance_sessions")
          .select("id, teacher_id, subject_id, session_date, finalized_at, subject:subjects ( name )")
          .eq("status", "finalized")
          .gte("session_date", weekStartStr)
          .order("finalized_at", { ascending: false }),
        supabase.from("teachers").select("id").eq("is_active", true),
        supabase
          .from("system_logs")
          .select("id, created_at, description, performed_by, action_type")
          .order("created_at", { ascending: false })
          .limit(8),
      ])

      setStats({
        teachers: teacherCount ?? 0,
        students: studentCount ?? 0,
        departments: deptCount ?? 0,
        activeSessions: activeSessionCount ?? 0,
      })

      // ── Teacher Activity ──
      const teacherMap: Record<
        string,
        { name: string; initials: string; subject: string; sessions: number; lastActive: string }
      > = {}
      for (const t of teachers || []) {
        const fullName = (t as any).user?.full_name ?? "Unknown"
        const title = (t as any).title ?? ""
        teacherMap[t.id] = {
          name: `${title}. ${fullName}`,
          initials: getInitials(fullName),
          subject: "—",
          sessions: 0,
          lastActive: "No sessions this week",
        }
      }

      for (const s of weekSessions || []) {
        const tid = (s as any).teacher_id
        if (!teacherMap[tid]) continue
        teacherMap[tid].sessions++
        const subjectName = (s as any).subject?.name ?? "—"
        if (teacherMap[tid].subject === "—") teacherMap[tid].subject = subjectName
        if (teacherMap[tid].lastActive === "No sessions this week") {
          const finalizedAt = (s as any).finalized_at
          if (finalizedAt) {
            const d = new Date(finalizedAt)
            const todayDate = new Date()
            todayDate.setHours(0, 0, 0, 0)
            const sessionDate = new Date(d)
            sessionDate.setHours(0, 0, 0, 0)
            const isToday = sessionDate.getTime() === todayDate.getTime()
            const timeStr = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
            teacherMap[tid].lastActive = isToday
              ? `Today, ${timeStr}`
              : `${sessionDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${timeStr}`
          }
        }
      }

      const activityRows: TeacherActivityRow[] = Object.entries(teacherMap)
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => b.sessions - a.sessions)
        .slice(0, 5)

      const max = Math.max(...activityRows.map((r) => r.sessions), 1)
      setMaxSessions(max)
      setTeacherActivity(activityRows)

      // ── System Status ──
      const statusItems: SystemStatusItem[] = [
        { label: "Departments Active", value: deptCount ?? 0, status: "ok" },
        { label: "Teachers Active", value: (activeTeachers || []).length, status: "ok" },
        { label: "Students Enrolled", value: studentCount ?? 0, status: "info" },
        {
          label: (activeSessionCount ?? 0) > 0 ? "Active Sessions Now" : "No Active Sessions",
          value: activeSessionCount ?? 0,
          status: (activeSessionCount ?? 0) > 0 ? "warn" : "ok",
        },
      ]
      setSystemStatus(statusItems)

      // ── Recent Activity ──
      if (logs && logs.length > 0) {
        setRecentActivity(
          logs.map((l: any) => ({
            text: l.description ?? "System action",
            time: timeAgo(l.created_at),
            actionType: l.action_type ?? "create",
          }))
        )
      }
    } catch (e) {
      console.error("Admin dashboard fetch error:", e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const statCards = [
    {
      label: "Total Teachers",
      value: stats.teachers,
      icon: Users,
      accent: "border-l-primary",
      iconColor: "bg-primary/10 text-primary",
      trend: "Faculty members",
    },
    {
      label: "Total Students",
      value: stats.students,
      icon: GraduationCap,
      accent: "border-l-emerald-500",
      iconColor: "bg-emerald-500/10 text-emerald-600",
      trend: "Enrolled & active",
    },
    {
      label: "Departments",
      value: stats.departments,
      icon: Building,
      accent: "border-l-amber-500",
      iconColor: "bg-amber-500/10 text-amber-600",
      trend: "Academic units",
    },
    {
      label: "Active Sessions",
      value: stats.activeSessions,
      icon: Radio,
      accent: "border-l-rose-500",
      iconColor: "bg-rose-500/10 text-rose-600",
      trend: "Live right now",
    },
  ]

  const sessionBarColors = [
    "bg-primary",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-violet-500",
    "bg-rose-500",
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card
            key={stat.label}
            className={`border-l-4 ${stat.accent} transition-shadow hover:shadow-md`}
          >
            <CardContent className="flex items-center gap-4 p-4 lg:p-5">
              <div
                className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${stat.iconColor}`}
              >
                <stat.icon className="size-5" />
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="text-3xl font-bold leading-tight text-foreground">
                  {stat.value}
                </span>
                <span className="truncate text-sm font-medium text-foreground/80">
                  {stat.label}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {stat.trend}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Quick Summary Strip ── */}
      <div className="flex flex-wrap gap-2">
        {[
          { icon: TrendingUp, label: `${stats.teachers} Teachers`, color: "text-primary bg-primary/8" },
          { icon: GraduationCap, label: `${stats.students} Students`, color: "text-emerald-600 bg-emerald-500/8" },
          { icon: Building, label: `${stats.departments} Departments`, color: "text-amber-600 bg-amber-500/8" },
          {
            icon: Radio,
            label: stats.activeSessions > 0 ? `${stats.activeSessions} Live Session${stats.activeSessions !== 1 ? "s" : ""}` : "No Live Sessions",
            color: stats.activeSessions > 0 ? "text-rose-600 bg-rose-500/8" : "text-muted-foreground bg-muted/50",
          },
        ].map((chip) => (
          <div
            key={chip.label}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${chip.color}`}
          >
            <chip.icon className="size-4" />
            {chip.label}
          </div>
        ))}
      </div>

      {/* ── Teacher Activity + System Status ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Teacher Activity — takes 2 cols */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                <BarChart3 className="size-4 text-primary" />
              </div>
              <CardTitle className="text-base font-semibold">Teacher Activity This Week</CardTitle>
            </div>
            <Badge variant="secondary" className="text-xs">
              {teacherActivity.filter((t) => t.sessions > 0).length} active
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            {/* Desktop */}
            <div className="hidden sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-border text-left">
                    <th className="px-5 py-2.5 text-sm font-medium uppercase tracking-wide text-muted-foreground">
                      Teacher
                    </th>
                    <th className="px-5 py-2.5 text-sm font-medium uppercase tracking-wide text-muted-foreground">
                      Subject
                    </th>
                    <th className="px-5 py-2.5 text-sm font-medium uppercase tracking-wide text-muted-foreground">
                      Sessions
                    </th>
                    <th className="px-5 py-2.5 text-sm font-medium uppercase tracking-wide text-muted-foreground">
                      Last Active
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {teacherActivity.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center text-sm text-muted-foreground">
                        No sessions this week yet.
                      </td>
                    </tr>
                  ) : (
                    teacherActivity.map((t, i) => (
                      <tr
                        key={t.id}
                        className={`border-t border-border transition-colors hover:bg-muted/30 ${i === 0 && t.sessions > 0 ? "bg-primary/3" : ""}`}
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="size-8">
                              <AvatarFallback
                                className={`text-xs font-semibold ${
                                  i === 0 && t.sessions > 0
                                    ? "bg-primary/15 text-primary"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {t.initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-foreground">{t.name}</span>
                              {i === 0 && t.sessions > 0 && (
                                <span className="text-[10px] font-semibold text-primary">
                                  Top Performer
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-sm text-muted-foreground">{t.subject}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className="w-5 text-center text-sm font-semibold text-foreground">
                              {t.sessions}
                            </span>
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                              <div
                                className={`h-full rounded-full transition-all ${sessionBarColors[i % sessionBarColors.length]}`}
                                style={{ width: `${(t.sessions / maxSessions) * 100}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Clock className="size-3 shrink-0" />
                            <span className="text-sm">{t.lastActive}</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* Mobile */}
            <div className="flex flex-col gap-2 p-4 sm:hidden">
              {teacherActivity.map((t, i) => (
                <div
                  key={t.id}
                  className="flex items-center gap-3 rounded-lg border border-border p-3"
                >
                  <Avatar className="size-9">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {t.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-1 flex-col gap-1">
                    <span className="text-sm font-medium text-foreground">{t.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full ${sessionBarColors[i % sessionBarColors.length]}`}
                          style={{ width: `${(t.sessions / maxSessions) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-sm font-semibold text-foreground">
                      {t.sessions} sessions
                    </span>
                    <span className="text-xs text-muted-foreground">{t.lastActive}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card className="h-full flex flex-col">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="size-4 text-emerald-600" />
              </div>
              <CardTitle className="text-lg font-semibold">System Status</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 flex-1">
            <div className="grid grid-cols-2 gap-3 h-full">
              {systemStatus.map((item) => {
                const dotColor = item.status === "ok" ? "bg-emerald-500" : item.status === "warn" ? "bg-amber-500" : "bg-blue-500"
                const pingColor = item.status === "ok" ? "bg-emerald-400" : item.status === "warn" ? "bg-amber-400" : "bg-blue-400"
                const cardBg = item.status === "ok" ? "bg-emerald-500/5 border-emerald-200/60" : item.status === "warn" ? "bg-amber-500/5 border-amber-200/60" : "bg-blue-500/5 border-blue-200/60"
                const valueColor = item.status === "ok" ? "text-emerald-700" : item.status === "warn" ? "text-amber-700" : "text-blue-700"
                const iconBg = item.status === "ok" ? "bg-emerald-500/10" : item.status === "warn" ? "bg-amber-500/10" : "bg-blue-500/10"
                const Icon = item.status === "ok" ? CheckCircle2 : item.status === "warn" ? Radio : GraduationCap

                return (
                  <div key={item.label} className={`relative flex flex-col gap-2 rounded-xl border p-4 transition-shadow hover:shadow-sm ${cardBg}`}>
                    {/* Top row: icon + pulse dot */}
                    <div className="flex items-center justify-between">
                      <div className={`flex size-9 items-center justify-center rounded-lg ${iconBg}`}>
                        <Icon className={`size-5 ${valueColor}`} />
                      </div>
                      <span className="relative flex size-2.5">
                        <span className={`absolute inline-flex size-full animate-ping rounded-full opacity-60 ${pingColor}`} />
                        <span className={`relative inline-flex size-2.5 rounded-full ${dotColor}`} />
                      </span>
                    </div>
                    {/* Value */}
                    <div className={`text-3xl font-black leading-none ${valueColor}`}>{item.value}</div>
                    {/* Label */}
                    <div className="text-sm font-medium text-muted-foreground leading-tight">{item.label}</div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Recent System Activity ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-violet-500/10">
              <Activity className="size-4 text-violet-600" />
            </div>
            <CardTitle className="text-base font-semibold">Recent System Activity</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No recent activity.</p>
          ) : (
            <div className="relative flex flex-col gap-0">
              {recentActivity.map((item, i) => {
                const config = getActionConfig(item.actionType)
                const IconComponent = config.icon
                return (
                  <div key={i} className="relative flex gap-4 pb-5 last:pb-0">
                    {/* Vertical line */}
                    {i < recentActivity.length - 1 && (
                      <div className="absolute left-[15px] top-8 h-full w-px bg-border" />
                    )}
                    {/* Icon */}
                    <div
                      className={`relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border ${config.bg} ${config.border}`}
                    >
                      <IconComponent className={`size-3.5 ${config.color}`} />
                    </div>
                    {/* Content */}
                    <div className="flex flex-1 flex-col gap-0.5 pt-1 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex flex-col gap-0.5">
                        <span className={`text-xs font-bold tracking-widest ${config.labelColor}`}>
                          {config.label}
                        </span>
                        <span className="text-base text-foreground">{item.text}</span>
                      </div>
                      <span className="mt-0.5 shrink-0 text-sm text-muted-foreground sm:pl-4">
                        {item.time}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}