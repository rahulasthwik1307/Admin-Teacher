"use client"

import { Activity, CheckCircle2, Radio, UserPlus, ScanFace } from "lucide-react"
import { useTeacherDashboard } from "@/hooks/use-teacher-dashboard"
import { RecentActivitySkeleton } from "@/components/ui/skeletons"

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
    border: "border-emerald-200 dark:border-emerald-800/60",
    label: "FINALIZED",
    badgeBg: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60",
  },
  opened: {
    icon: Radio,
    color: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-500/10",
    border: "border-sky-200 dark:border-sky-800/60",
    label: "SESSION OPENED",
    badgeBg: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/60",
  },
  approved: {
    icon: ScanFace,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-200 dark:border-amber-800/60",
    label: "FACE APPROVED",
    badgeBg: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60",
  },
  added: {
    icon: UserPlus,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-200 dark:border-violet-800/60",
    label: "STUDENT ADDED",
    badgeBg: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800/60",
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
              <div key={i} className="relative flex gap-3.5 pb-4 last:pb-0">
                {/* Vertical connecting line */}
                {!isLast && (
                  <div className="absolute left-3.75 top-7.5 h-full w-px bg-border" />
                )}

                {/* Timeline node icon */}
                <div
                  className={`relative z-10 flex size-7.5 shrink-0 items-center justify-center rounded-lg border shadow-2xs ${cfg.bg} ${cfg.border}`}
                >
                  <Icon className={`size-3.5 ${cfg.color}`} />
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between min-w-0">
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <span
                      className={`inline-flex items-center rounded border px-1.5 py-0.2 text-[9px] font-extrabold uppercase tracking-wider ${cfg.badgeBg}`}
                    >
                      {cfg.label}
                    </span>
                    <span className="text-xs font-semibold text-foreground truncate">
                      {activity.description}
                    </span>
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground font-medium sm:pl-3">
                    {activity.time}
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