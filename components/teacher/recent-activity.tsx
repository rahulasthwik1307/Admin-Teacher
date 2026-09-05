"use client"

import { Activity, CheckCircle2, Radio, UserPlus, ScanFace, Clock, Send, Building2, GraduationCap } from "lucide-react"
import { useTeacherDashboard } from "@/hooks/use-teacher-dashboard"
import { RecentActivitySkeleton } from "@/components/ui/skeletons"
import { cn } from "@/lib/utils"

function timeAgo(dateStr: string): string {
  const now = new Date()
  const then = new Date(dateStr)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays}d ago`
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

const typeConfig = {
  finalized: {
    icon: CheckCircle2,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20 dark:border-emerald-800/60",
    label: "FINALIZED",
    badgeBg: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 dark:border-emerald-800/60",
  },
  opened: {
    icon: Radio,
    color: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-500/10",
    border: "border-sky-500/20 dark:border-sky-800/60",
    label: "SESSION OPENED",
    badgeBg: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20 dark:border-sky-800/60",
  },
  approved: {
    icon: ScanFace,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20 dark:border-amber-800/60",
    label: "FACE APPROVED",
    badgeBg: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 dark:border-amber-800/60",
  },
  added: {
    icon: UserPlus,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20 dark:border-violet-800/60",
    label: "STUDENT ADDED",
    badgeBg: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20 dark:border-violet-800/60",
  },
  notified: {
    icon: Send,
    color: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/20 dark:border-indigo-800/60",
    label: "NOTIFIED",
    badgeBg: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20 dark:border-indigo-800/60",
  },
}

export function RecentActivity() {
  const { data, isLoading } = useTeacherDashboard()

  if (isLoading || !data) return <RecentActivitySkeleton />

  const activities = data.recentActivity.map((item) => ({
    ...item,
    time: timeAgo(item.time),
    sortKey: new Date(item.time).getTime(),
  }))

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
          <Activity className="size-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">Recent Activity</h3>
          <p className="text-[11px] text-muted-foreground">Recent attendance and registration actions</p>
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2.5 py-10 text-center bg-muted/10 rounded-xl border border-dashed border-border/80">
          <div className="flex size-11 items-center justify-center rounded-full bg-muted">
            <Activity className="size-5 text-muted-foreground" />
          </div>
          <p className="text-xs font-bold text-foreground">No recent activity</p>
          <p className="text-[11px] text-muted-foreground">Actions will be logged as they occur</p>
        </div>
      ) : (
        <div className="relative flex flex-col">
          {activities.map((activity, i) => {
            const cfg = typeConfig[activity.type] || typeConfig.finalized
            const Icon = cfg.icon
            const isLast = i === activities.length - 1
            return (
              <div key={i} className="group relative flex gap-3.5 pb-4 last:pb-0 items-start">
                {/* Vertical connecting line — stops cleanly between icon edges */}
                {!isLast && (
                  <div
                    aria-hidden="true"
                    className="absolute left-4 top-8.5 bottom-0 w-px -translate-x-1/2 bg-border/90 pointer-events-none"
                  />
                )}

                {/* Timeline node icon with opaque solid card background */}
                <div
                  className={cn(
                    "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-xl border bg-card shadow-2xs transition-transform group-hover:scale-105",
                    cfg.border
                  )}
                >
                  <div className={cn("flex size-full items-center justify-center rounded-[10px]", cfg.bg)}>
                    <Icon className={cn("size-4", cfg.color)} />
                  </div>
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between min-w-0 pt-0.5">
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md border px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider shrink-0",
                        cfg.badgeBg
                      )}
                    >
                      {cfg.label}
                    </span>

                    {/* Title / Subject / Name */}
                    <span className="text-xs font-bold text-foreground truncate">
                      {activity.title || activity.description.split(" — ")[0]}
                    </span>

                    {/* Class & Section Pill */}
                    {activity.className && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300">
                        <Building2 className="size-2.5 shrink-0" />
                        {activity.className}{activity.section ? `-${activity.section}` : ""}
                      </span>
                    )}

                    {/* Year Pill */}
                    {activity.year && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 text-[10px] font-bold text-purple-700 dark:text-purple-300">
                        <GraduationCap className="size-2.5 shrink-0" />
                        {activity.year}
                      </span>
                    )}

                    {/* Count info if available (for notifications) */}
                    {activity.countInfo && (
                      <span className="text-[11px] font-medium text-muted-foreground">
                        ({activity.countInfo})
                      </span>
                    )}
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground font-medium flex items-center gap-1 sm:pl-3">
                    <Clock className="size-3 text-muted-foreground/60 shrink-0" />
                    <span>{activity.time}</span>
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}