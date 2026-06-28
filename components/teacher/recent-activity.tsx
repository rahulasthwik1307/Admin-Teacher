"use client"

import { Activity, CheckCircle2, Radio, UserPlus, ScanFace } from "lucide-react"
import { cn } from "@/lib/utils"
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
    iconColor: "text-emerald-600",
    dot: "bg-emerald-500",
    line: "bg-emerald-200",
    label: "Finalized",
    labelColor: "text-emerald-600",
    prefix: "Attendance finalized",
  },
  opened: {
    icon: Radio,
    iconColor: "text-primary",
    dot: "bg-primary",
    line: "bg-primary/20",
    label: "Window Opened",
    labelColor: "text-primary",
    prefix: "Session opened",
  },
  approved: {
    icon: ScanFace,
    iconColor: "text-amber-600",
    dot: "bg-amber-500",
    line: "bg-amber-200",
    label: "Face Approved",
    labelColor: "text-amber-600",
    prefix: "Face approved",
  },
  added: {
    icon: UserPlus,
    iconColor: "text-violet-600",
    dot: "bg-violet-500",
    line: "bg-violet-200",
    label: "Student Added",
    labelColor: "text-violet-600",
    prefix: "New student added",
  },
}

export function RecentActivity() {
  const { data, isLoading } = useTeacherDashboard()

  if (isLoading || !data) return <RecentActivitySkeleton />

  const activities = data.recentActivity.map(item => ({
    ...item,
    time: timeAgo(item.time),
    sortKey: new Date(item.time).getTime(),
  }))

  return (
    <>
      <style>{`
        @keyframes fadeInItem {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-2 mb-5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
            <Activity className="size-4 text-primary" />
          </div>
          <h3 className="text-base font-semibold text-foreground">Recent Activity</h3>
        </div>

        {activities.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <Activity className="size-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No activity yet</p>
          </div>
        ) : (
          <div className="relative flex flex-col">
            {activities.map((activity, i) => {
              const cfg = typeConfig[activity.type]
              const Icon = cfg.icon
              const isLast = i === activities.length - 1
              return (
                <div
                  key={i}
                  className="relative flex gap-4 opacity-0"
                  style={{
                    animation: "fadeInItem 0.35s ease forwards",
                    animationDelay: `${i * 55}ms`,
                  }}
                >
                  {/* Timeline column */}
                  <div className="relative flex flex-col items-center">
                    {/* Dot with icon */}
                    <div className={cn(
                      "relative z-10 mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-white bg-white shadow-sm dark:border-slate-900 dark:bg-slate-900",
                    )}>
                      <Icon className={cn("size-4", cfg.iconColor)} />
                    </div>
                    {/* Vertical connecting line */}
                    {!isLast && (
                      <div className={cn("mt-1 w-0.5 flex-1 min-h-7", cfg.line)} />
                    )}
                  </div>

                  {/* Content */}
                  <div className={cn("flex-1 min-w-0 pb-5", isLast && "pb-0")}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          <span className={cfg.labelColor}>{cfg.label}</span>
                        </p>
                        <p className="text-sm font-medium text-foreground leading-snug mt-0.5 truncate">
                          {activity.description}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground whitespace-nowrap mt-0.5">
                        {activity.time}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}