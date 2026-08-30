"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion, useReducedMotion, type Variants } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { AdminDashboardSkeleton } from "@/components/ui/skeletons"
import {
  Users,
  GraduationCap,
  Building,
  Radio,
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
  ScanFace,
  ArrowRight,
  ShieldCheck,
  Zap,
} from "lucide-react"
import {
  useAdminDashboard,
  TeacherActivityRow,
  SystemStatusItem,
  RecentActivityItem,
} from "@/hooks/use-admin-dashboard"

function getActionConfig(actionType: string) {
  switch (actionType) {
    case "create":
      return {
        icon: UserPlus,
        color: "text-emerald-600 dark:text-emerald-400",
        bg: "bg-emerald-500/10",
        border: "border-emerald-200 dark:border-emerald-800/60",
        label: "CREATED",
        badgeBg: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60",
      }
    case "update":
      return {
        icon: Pencil,
        color: "text-sky-600 dark:text-sky-400",
        bg: "bg-sky-500/10",
        border: "border-sky-200 dark:border-sky-800/60",
        label: "UPDATED",
        badgeBg: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/60",
      }
    case "delete":
      return {
        icon: Trash2,
        color: "text-rose-600 dark:text-rose-400",
        bg: "bg-rose-500/10",
        border: "border-rose-200 dark:border-rose-800/60",
        label: "DELETED",
        badgeBg: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60",
      }
    case "reset":
      return {
        icon: KeyRound,
        color: "text-amber-600 dark:text-amber-400",
        bg: "bg-amber-500/10",
        border: "border-amber-200 dark:border-amber-800/60",
        label: "RESET",
        badgeBg: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60",
      }
    case "assign":
      return {
        icon: Link2,
        color: "text-violet-600 dark:text-violet-400",
        bg: "bg-violet-500/10",
        border: "border-violet-200 dark:border-violet-800/60",
        label: "ASSIGNED",
        badgeBg: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800/60",
      }
    default:
      return {
        icon: Activity,
        color: "text-muted-foreground",
        bg: "bg-muted",
        border: "border-border",
        label: "ACTION",
        badgeBg: "bg-muted text-muted-foreground border-border",
      }
  }
}

function AnimatedNumber({ value }: { value: number | string }) {
  const [display, setDisplay] = useState<number | string>(typeof value === "number" ? 0 : value)
  const isNumber = typeof value === "number"

  useEffect(() => {
    if (!isNumber) {
      setDisplay(value)
      return
    }
    const num = Number(value)
    if (num === 0) {
      setDisplay(0)
      return
    }
    const duration = 500
    const start = performance.now()

    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(num * ease))
      if (progress < 1) {
        requestAnimationFrame(step)
      }
    }
    const req = requestAnimationFrame(step)
    return () => cancelAnimationFrame(req)
  }, [value, isNumber])

  return <span>{display}</span>
}

export default function AdminDashboardPage() {
  const { data, isLoading: loading } = useAdminDashboard()
  const shouldReduceMotion = useReducedMotion()

  const stats = data?.stats ?? {
    teachers: 0,
    students: 0,
    departments: 0,
    activeSessions: 0,
    pendingFaceApprovals: 0,
  }
  const teacherActivity: TeacherActivityRow[] = data?.teacherActivity ?? []
  const systemStatus: SystemStatusItem[] = data?.systemStatus ?? []
  const recentActivity: RecentActivityItem[] = data?.recentActivity ?? []
  const maxSessions = data?.maxSessions ?? 1

  const sessionBarColors = [
    "from-primary to-primary/80",
    "from-emerald-500 to-emerald-600",
    "from-amber-500 to-amber-600",
    "from-violet-500 to-violet-600",
    "from-rose-500 to-rose-600",
  ]

  if (loading) {
    return <AdminDashboardSkeleton />
  }

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.06,
      },
    },
  }

  const itemVariants: Variants = {
    hidden: shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.35,
        ease: "easeOut",
      },
    },
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-6"
    >
      {/* ── Stat Cards (Tighter, Differentiated Layout) ── */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-2 gap-3.5 lg:grid-cols-4 lg:gap-4"
      >
        {/* Card 1: Total Teachers (Academic Sky Accent) */}
        <div className="group relative overflow-hidden rounded-xl border border-sky-200/80 bg-linear-to-b from-sky-500/5 via-card to-card p-3.5 lg:p-4 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-sky-300 dark:border-sky-900/50 dark:from-sky-950/20">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex size-8.5 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Users className="size-4.5" />
            </div>
            <span className="rounded-md bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">
              Faculty
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground leading-none">
              <AnimatedNumber value={stats.teachers} />
            </span>
            <span className="text-xs font-semibold text-foreground/80 mt-1">
              Total Teachers
            </span>
            <span className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
              <ShieldCheck className="size-3 text-sky-500 shrink-0" />
              Faculty members
            </span>
          </div>
        </div>

        {/* Card 2: Total Students (Growth Emerald Accent) */}
        <div className="group relative overflow-hidden rounded-xl border border-emerald-200/80 bg-linear-to-b from-emerald-500/5 via-card to-card p-3.5 lg:p-4 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-emerald-300 dark:border-emerald-900/50 dark:from-emerald-950/20">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex size-8.5 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <GraduationCap className="size-4.5" />
            </div>
            <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              Enrolled
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground leading-none">
              <AnimatedNumber value={stats.students} />
            </span>
            <span className="text-xs font-semibold text-foreground/80 mt-1">
              Total Students
            </span>
            <span className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
              <CheckCircle2 className="size-3 text-emerald-500 shrink-0" />
              Enrolled & active
            </span>
          </div>
        </div>

        {/* Card 3: Departments (Structural Amber Accent) */}
        <div className="group relative overflow-hidden rounded-xl border border-amber-200/80 bg-linear-to-b from-amber-500/5 via-card to-card p-3.5 lg:p-4 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-amber-300 dark:border-amber-900/50 dark:from-amber-950/20">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex size-8.5 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Building className="size-4.5" />
            </div>
            <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
              Units
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground leading-none">
              <AnimatedNumber value={stats.departments} />
            </span>
            <span className="text-xs font-semibold text-foreground/80 mt-1">
              Departments
            </span>
            <span className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
              <Building className="size-3 text-amber-500 shrink-0" />
              Academic units
            </span>
          </div>
        </div>

        {/* Card 4: Active Sessions (Dynamic Live Pulse Beacon) */}
        <div
          className={`group relative overflow-hidden rounded-xl border p-3.5 lg:p-4 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
            stats.activeSessions > 0
              ? "border-rose-300/90 bg-linear-to-b from-rose-500/10 via-card to-card hover:border-rose-400 dark:border-rose-900/70 dark:from-rose-950/30"
              : "border-border bg-card"
          }`}
        >
          <div className="flex items-center justify-between mb-2.5">
            <div
              className={`flex size-8.5 items-center justify-center rounded-lg ${
                stats.activeSessions > 0
                  ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <Radio className="size-4.5" />
            </div>
            {stats.activeSessions > 0 ? (
              <div className="flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-extrabold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-300">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-rose-500" />
                </span>
                <span>LIVE NOW</span>
              </div>
            ) : (
              <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground uppercase">
                Standby
              </span>
            )}
          </div>
          <div className="flex flex-col gap-0.5">
            <span
              className={`text-2xl lg:text-3xl font-extrabold tracking-tight leading-none ${
                stats.activeSessions > 0 ? "text-rose-600 dark:text-rose-400" : "text-foreground"
              }`}
            >
              <AnimatedNumber value={stats.activeSessions} />
            </span>
            <span className="text-xs font-semibold text-foreground/80 mt-1">
              Active Sessions
            </span>
            <span className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
              <Zap className="size-3 text-rose-500 shrink-0" />
              Live right now
            </span>
          </div>
        </div>
      </motion.div>

      {/* ── Quick Summary Strip ── */}
      <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-2">
        {[
          {
            icon: TrendingUp,
            label: `${stats.teachers} Teachers`,
            style: "border-sky-200/70 bg-sky-500/5 text-sky-700 dark:border-sky-900/50 dark:text-sky-300",
          },
          {
            icon: GraduationCap,
            label: `${stats.students} Students`,
            style: "border-emerald-200/70 bg-emerald-500/5 text-emerald-700 dark:border-emerald-900/50 dark:text-emerald-300",
          },
          {
            icon: Building,
            label: `${stats.departments} Departments`,
            style: "border-amber-200/70 bg-amber-500/5 text-amber-700 dark:border-amber-900/50 dark:text-amber-300",
          },
          {
            icon: Radio,
            label:
              stats.activeSessions > 0
                ? `${stats.activeSessions} Live Session${stats.activeSessions !== 1 ? "s" : ""}`
                : "No Live Sessions",
            style:
              stats.activeSessions > 0
                ? "border-rose-200/80 bg-rose-500/8 text-rose-700 dark:border-rose-900/60 dark:text-rose-300 font-semibold"
                : "border-border bg-muted/40 text-muted-foreground",
          },
        ].map((chip) => (
          <div
            key={chip.label}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${chip.style}`}
          >
            <chip.icon className="size-3.5 shrink-0" />
            <span>{chip.label}</span>
          </div>
        ))}
      </motion.div>

      {/* ── Pending Face Approvals Alert Banner ── */}
      {stats.pendingFaceApprovals > 0 && (
        <motion.div
          variants={itemVariants}
          className="relative overflow-hidden rounded-xl border border-amber-300/90 bg-linear-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 shadow-2xs dark:border-amber-800/80 dark:from-amber-950/40"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 ring-1 ring-amber-500/30">
                <ScanFace className="size-5" />
                <span className="absolute -top-0.5 -right-0.5 flex size-2.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-amber-500" />
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-amber-900 dark:text-amber-200">
                    {stats.pendingFaceApprovals} Student{stats.pendingFaceApprovals !== 1 ? "s" : ""} Waiting for Face Approval
                  </span>
                  <span className="rounded-full bg-amber-500/20 px-2 py-0.2 text-[10px] font-extrabold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                    Action Required
                  </span>
                </div>
                <span className="text-xs text-amber-700/90 dark:text-amber-400">
                  Review and approve face registrations to allow students to mark geofenced attendance
                </span>
              </div>
            </div>
            <Link
              href="/admin/face-approval"
              className="group inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all duration-150 hover:bg-amber-700 hover:shadow-sm shrink-0 self-start sm:self-auto"
            >
              <span>Review Queue</span>
              <ArrowRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </motion.div>
      )}

      {/* ── Teacher Activity + System Status ── */}
      <motion.div variants={itemVariants} className="grid gap-6 lg:grid-cols-3 items-stretch">
        {/* Teacher Activity — 2 cols */}
        <Card className="lg:col-span-2 border-border shadow-2xs flex flex-col justify-between h-full">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/60">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <BarChart3 className="size-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-foreground">
                  Teacher Activity This Week
                </CardTitle>
                <CardDescription className="text-[11px] text-muted-foreground">
                  Faculty lecture sessions conducted during the current week
                </CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs font-semibold px-2 py-0.5">
              {teacherActivity.filter((t: TeacherActivityRow) => t.sessions > 0).length} active
            </Badge>
          </CardHeader>
          <CardContent className="p-0 flex-1 flex flex-col justify-between">
            {/* Desktop Table */}
            <div className="hidden sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/20 text-left">
                    <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Teacher
                    </th>
                    <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Subject
                    </th>
                    <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Sessions
                    </th>
                    <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Last Active
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {teacherActivity.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center text-sm text-muted-foreground">
                        No sessions recorded this week yet.
                      </td>
                    </tr>
                  ) : (
                    teacherActivity.map((t: TeacherActivityRow, i: number) => {
                      const isTopPerformer = i === 0 && t.sessions > 0
                      return (
                        <tr
                          key={t.id}
                          className={`border-b border-border/50 last:border-0 transition-colors hover:bg-muted/30 ${
                            isTopPerformer ? "bg-primary/3" : ""
                          }`}
                        >
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <Avatar className="size-8 ring-1 ring-border">
                                <AvatarFallback
                                  className={`text-xs font-bold ${
                                    isTopPerformer
                                      ? "bg-primary/15 text-primary"
                                      : "bg-muted text-muted-foreground"
                                  }`}
                                >
                                  {t.initials}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <span className="text-xs font-semibold text-foreground">
                                  {t.name}
                                </span>
                                {isTopPerformer && (
                                  <span className="text-[10px] font-bold text-primary flex items-center gap-1">
                                    ★ Top Faculty
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-xs text-muted-foreground font-medium">
                            {t.subject}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <span className="w-5 text-center text-xs font-bold text-foreground">
                                {t.sessions}
                              </span>
                              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                                <div
                                  className={`h-full rounded-full bg-linear-to-r transition-all duration-300 ${
                                    sessionBarColors[i % sessionBarColors.length]
                                  }`}
                                  style={{
                                    width: `${Math.max(6, (t.sessions / maxSessions) * 100)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Clock className="size-3 shrink-0 text-muted-foreground/70" />
                              <span>{t.lastActive}</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="flex flex-col gap-2 p-3 sm:hidden">
              {teacherActivity.map((t: TeacherActivityRow, i: number) => (
                <div
                  key={t.id}
                  className="flex items-center gap-3 rounded-lg border border-border/80 bg-card p-3 shadow-2xs"
                >
                  <Avatar className="size-8.5 ring-1 ring-border shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                      {t.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-1 flex-col gap-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground truncate">
                        {t.name}
                      </span>
                      <span className="text-xs font-bold text-foreground shrink-0 ml-2">
                        {t.sessions} ses.
                      </span>
                    </div>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full bg-linear-to-r ${
                          sessionBarColors[i % sessionBarColors.length]
                        }`}
                        style={{
                          width: `${Math.max(6, (t.sessions / maxSessions) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span className="truncate">{t.subject}</span>
                      <span className="shrink-0">{t.lastActive}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Status — 1 col (Vertical Stacked Telemetry Monitor) */}
        <Card className="h-full flex flex-col justify-between border-border shadow-2xs overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-foreground">
                    System Telemetry
                  </CardTitle>
                  <CardDescription className="text-[11px] text-muted-foreground">
                    Infrastructure & attendance engine
                  </CardDescription>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                ONLINE
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-3.5 flex-1 flex flex-col justify-between gap-2.5">
            <div className="flex flex-col gap-2.5 flex-1 justify-between">
              {systemStatus.map((item: SystemStatusItem) => {
                const dotColor =
                  item.status === "ok"
                    ? "bg-emerald-500"
                    : item.status === "warn"
                    ? "bg-amber-500"
                    : "bg-sky-500"
                const pingColor =
                  item.status === "ok"
                    ? "bg-emerald-400"
                    : item.status === "warn"
                    ? "bg-amber-400"
                    : "bg-sky-400"
                const cardBg =
                  item.status === "ok"
                    ? "bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/35"
                    : item.status === "warn"
                    ? "bg-amber-500/5 border-amber-500/20 hover:border-amber-500/35"
                    : "bg-sky-500/5 border-sky-500/20 hover:border-sky-500/35"
                const valueColor =
                  item.status === "ok"
                    ? "text-emerald-700 dark:text-emerald-300"
                    : item.status === "warn"
                    ? "text-amber-700 dark:text-amber-300"
                    : "text-sky-700 dark:text-sky-300"
                const iconBg =
                  item.status === "ok"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : item.status === "warn"
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                    : "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20"
                const Icon =
                  item.status === "ok"
                    ? CheckCircle2
                    : item.status === "warn"
                    ? Radio
                    : GraduationCap

                return (
                  <div
                    key={item.label}
                    className={`flex items-center justify-between rounded-xl border p-2.5 lg:p-3 transition-all duration-150 shadow-2xs ${cardBg}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex size-8.5 shrink-0 items-center justify-center rounded-lg border ${iconBg}`}>
                        <Icon className="size-4" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-foreground truncate">
                          {item.label}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="relative flex size-1.5 shrink-0">
                            <span
                              className={`absolute inline-flex size-full animate-ping rounded-full opacity-60 ${pingColor}`}
                            />
                            <span className={`relative inline-flex size-1.5 rounded-full ${dotColor}`} />
                          </span>
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {item.status === "ok"
                              ? "Operational"
                              : item.status === "warn"
                              ? "Standby"
                              : "Active Pool"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className={`text-xl lg:text-2xl font-extrabold tracking-tight shrink-0 pl-2 ${valueColor}`}>
                      <AnimatedNumber value={item.value} />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Telemetry Health Summary Bar */}
            <div className="mt-1 flex items-center justify-between rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Telemetry Nominal
              </span>
              <span className="font-mono text-[10px] text-muted-foreground/80">
                100% Operational
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Recent System Activity (Audit Trail Timeline) ── */}
      <motion.div variants={itemVariants}>
        <Card className="border-border shadow-2xs">
          <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                <Activity className="size-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-foreground">
                  Audit Trail & Activity Log
                </CardTitle>
                <CardDescription className="text-[11px] text-muted-foreground">
                  Chronological record of recent administrative and system events
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-[11px] font-medium text-muted-foreground">
              {recentActivity.length} Events
            </Badge>
          </CardHeader>
          <CardContent className="p-4 sm:p-5">
            {recentActivity.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                No recent activity records available.
              </p>
            ) : (
              <div className="relative flex flex-col">
                {recentActivity.map((item: RecentActivityItem, i: number) => {
                  const config = getActionConfig(item.actionType)
                  const IconComponent = config.icon
                  return (
                    <div key={i} className="relative flex gap-3.5 pb-5 last:pb-0">
                      {/* Vertical line connecting nodes with intentional gap around icons */}
                      {i < recentActivity.length - 1 && (
                        <div className="absolute left-3.75 top-8.5 bottom-1 w-px -translate-x-1/2 bg-border" />
                      )}
                      {/* Node Icon */}
                      <div
                        className={`relative z-10 flex size-7.5 shrink-0 items-center justify-center rounded-lg border shadow-2xs ${config.bg} ${config.border}`}
                      >
                        <IconComponent className={`size-3.5 ${config.color}`} />
                      </div>
                      {/* Content Row */}
                      <div className="flex flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between min-w-0">
                        <div className="flex items-center gap-2 min-w-0 flex-wrap">
                          <span
                            className={`inline-flex items-center rounded border px-1.5 py-0.2 text-[9px] font-extrabold uppercase tracking-wider ${config.badgeBg}`}
                          >
                            {config.label}
                          </span>
                          <span className="text-xs font-medium text-foreground truncate">
                            {item.text}
                          </span>
                        </div>
                        <span className="shrink-0 text-[11px] text-muted-foreground sm:pl-3">
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
      </motion.div>
    </motion.div>
  )
}