"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Users, GraduationCap, Building, Radio, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter((w) => w[0] && w[0] === w[0].toUpperCase())
    .map((w) => w[0])
    .join("")
    .slice(0, 2) || "NA"
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const then = new Date(dateStr)
  const diffMs = now.getTime() - then.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)
  if (diffMin < 1) return "Just now"
  if (diffMin < 60) return `${diffMin} min ago`
  if (diffHour < 24) return `${diffHour} hour${diffHour !== 1 ? "s" : ""} ago`
  if (diffDay === 1) return "Yesterday"
  return `${diffDay} days ago`
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
}

interface DashboardStats {
  teachers: number
  students: number
  departments: number
  activeSessions: number
}

interface SystemStatusItem {
  label: string
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({ teachers: 0, students: 0, departments: 0, activeSessions: 0 })
  const [teacherActivity, setTeacherActivity] = useState<TeacherActivityRow[]>([])
  const [systemStatus, setSystemStatus] = useState<SystemStatusItem[]>([])
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const today = new Date().toISOString().split("T")[0]

      // Week start (Monday)
      const now = new Date()
      const day = now.getDay()
      const diffToMon = (day === 0 ? -6 : 1 - day)
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() + diffToMon)
      weekStart.setHours(0, 0, 0, 0)
      const weekStartStr = weekStart.toISOString().split("T")[0]

      // Run all queries in parallel
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
          .select("id, created_at, description, performed_by")
          .order("created_at", { ascending: false })
          .limit(5),
      ])

      // ── Stats ──
      setStats({
        teachers: teacherCount ?? 0,
        students: studentCount ?? 0,
        departments: deptCount ?? 0,
        activeSessions: activeSessionCount ?? 0,
      })

      // ── Teacher Activity This Week ──
      const teacherMap: Record<string, { name: string; initials: string; subject: string; sessions: number; lastActive: string }> = {}
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
            teacherMap[tid].lastActive = isToday ? `Today, ${timeStr}` : `${sessionDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${timeStr}`
          }
        }
      }

      const activityRows: TeacherActivityRow[] = Object.entries(teacherMap)
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => b.sessions - a.sessions)
        .slice(0, 5)

      setTeacherActivity(activityRows)

      // ── System Status ──
      const statusItems: SystemStatusItem[] = [
        { label: `${deptCount ?? 0} Department${(deptCount ?? 0) !== 1 ? "s" : ""} Active` },
        { label: `${(activeTeachers || []).length} Teacher${(activeTeachers || []).length !== 1 ? "s" : ""} Active` },
        { label: `${studentCount ?? 0} Student${(studentCount ?? 0) !== 1 ? "s" : ""} Enrolled` },
        { label: (activeSessionCount ?? 0) > 0 ? `${activeSessionCount} Active Session${(activeSessionCount ?? 0) !== 1 ? "s" : ""} Now` : "No Active Sessions" },
      ]
      setSystemStatus(statusItems)

      // ── Recent Activity ──
      if (logs && logs.length > 0) {
        const performerIds = [...new Set(logs.map((l: any) => l.performed_by).filter(Boolean))]
        const nameMap: Record<string, string> = {}
        if (performerIds.length > 0) {
          const { data: users } = await supabase
            .from("users")
            .select("id, full_name")
            .in("id", performerIds)
          for (const u of users || []) nameMap[u.id] = u.full_name
        }

        setRecentActivity(
          logs.map((l: any) => ({
            text: l.description ?? "System action",
            time: timeAgo(l.created_at),
          }))
        )
      }

    } catch (e) {
      console.error("Admin dashboard fetch error:", e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const statCards = [
    { label: "Total Teachers", value: stats.teachers, icon: Users, color: "bg-primary/10 text-primary" },
    { label: "Total Students", value: stats.students, icon: GraduationCap, color: "bg-emerald-500/10 text-emerald-600" },
    { label: "Departments", value: stats.departments, icon: Building, color: "bg-amber-500/10 text-amber-600" },
    { label: "Active Sessions Today", value: stats.activeSessions, icon: Radio, color: "bg-rose-500/10 text-rose-600" },
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
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-4 lg:p-5">
              <div className={`flex size-11 shrink-0 items-center justify-center rounded-lg ${stat.color}`}>
                <stat.icon className="size-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-foreground leading-tight">{stat.value}</span>
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Teacher Activity + System Status */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Teacher Activity This Week */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Teacher Activity This Week</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-border text-left">
                    <th className="px-5 py-3 font-medium text-muted-foreground">Teacher Name</th>
                    <th className="px-5 py-3 font-medium text-muted-foreground">Subject</th>
                    <th className="px-5 py-3 font-medium text-muted-foreground text-center">Sessions</th>
                    <th className="px-5 py-3 font-medium text-muted-foreground">Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {teacherActivity.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center text-muted-foreground text-sm">
                        No sessions this week yet.
                      </td>
                    </tr>
                  ) : teacherActivity.map((t) => (
                    <tr key={t.id} className="border-t border-border">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="size-8">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                              {t.initials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-foreground">{t.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{t.subject}</td>
                      <td className="px-5 py-3 text-center font-semibold text-foreground">{t.sessions}</td>
                      <td className="px-5 py-3 text-muted-foreground">{t.lastActive}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <div className="flex flex-col gap-3 p-4 sm:hidden">
              {teacherActivity.map((t) => (
                <div key={t.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <Avatar className="size-9">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {t.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-1 flex-col">
                    <span className="text-sm font-medium text-foreground">{t.name}</span>
                    <span className="text-xs text-muted-foreground">{t.subject}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-semibold text-foreground">{t.sessions} sessions</span>
                    <span className="text-xs text-muted-foreground">{t.lastActive}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">System Status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {systemStatus.map((item) => (
              <div key={item.label} className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3">
                <span className="relative flex size-2.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
                </span>
                <span className="text-sm font-medium text-foreground">{item.label}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent System Activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Recent System Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No recent activity.</p>
          ) : (
            <div className="relative flex flex-col gap-0">
              {recentActivity.map((item, i) => (
                <div key={i} className="relative flex gap-4 pb-6 last:pb-0">
                  {i < recentActivity.length - 1 && (
                    <div className="absolute left-[7px] top-4 h-full w-px bg-border" />
                  )}
                  <div className="relative z-10 mt-1.5 size-3.5 shrink-0 rounded-full border-2 border-primary bg-background" />
                  <div className="flex flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm text-foreground">{item.text}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{item.time}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}