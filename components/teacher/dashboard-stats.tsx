"use client"

import { useEffect, useState } from "react"
import { Users, UserCheck, Radio } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTeacherDashboard } from "@/hooks/use-teacher-dashboard"
import { DashboardStatsSkeleton } from "@/components/ui/skeletons"

interface Stat {
  label: string
  value: number | string
  icon: React.ElementType
  iconColor: string
  iconBg: string
  borderColor: string
}

function useCountUp(target: number | string, duration = 800) {
  const [display, setDisplay] = useState<number | string>("—")
  useEffect(() => {
    if (typeof target !== "number") { setDisplay(target); return }
    if (target === 0) { setDisplay(0); return }
    let start = 0
    const step = Math.ceil(target / (duration / 16))
    const timer = setInterval(() => {
      start += step
      if (start >= target) { setDisplay(target); clearInterval(timer) }
      else setDisplay(start)
    }, 16)
    return () => clearInterval(timer)
  }, [target])
  return display
}

function StatCard({ stat, index }: { stat: Stat; index: number }) {
  const count = useCountUp(stat.value)
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm",
        "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
        "opacity-0 animate-[fadeSlideUp_0.4s_ease_forwards]",
      )}
      style={{
        animationDelay: `${index * 80}ms`,
        borderLeftWidth: "4px",
        borderLeftColor: stat.borderColor,
      }}
    >
      <div className="flex items-start gap-4">
        <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", stat.iconBg)}>
          <stat.icon className={cn("size-5", stat.iconColor)} />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-2xl font-bold text-foreground leading-tight tabular-nums">{count}</span>
          <span className="text-xs text-muted-foreground leading-snug mt-0.5">{stat.label}</span>
        </div>
      </div>
    </div>
  )
}

export function DashboardStats() {
  const { data, isLoading } = useTeacherDashboard()

  if (isLoading || !data) {
    return <DashboardStatsSkeleton />
  }

  const { stats } = data
  const activeCount = stats.activeSessions

  const statCards: Stat[] = [
    { label: "Total Students", value: stats.totalStudents, icon: Users, iconColor: "text-primary", iconBg: "bg-primary/10", borderColor: "#3b82f6" },
    { label: "Today Present", value: stats.todayPresent, icon: UserCheck, iconColor: "text-emerald-600", iconBg: "bg-emerald-50", borderColor: "#10b981" },
    { label: "Active Attendance Windows", value: activeCount, icon: Radio, iconColor: activeCount ? "text-emerald-600" : "text-muted-foreground", iconBg: activeCount ? "bg-emerald-50" : "bg-muted", borderColor: activeCount ? "#10b981" : "#e2e8f0" },
  ]

  return (
    <>
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 lg:gap-6">
        {statCards.map((stat, i) => <StatCard key={stat.label} stat={stat} index={i} />)}
      </div>
    </>
  )
}