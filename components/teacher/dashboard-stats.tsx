"use client"

import { useEffect, useState } from "react"
import { Users, UserCheck, Radio, CheckCircle2, ShieldCheck, Zap } from "lucide-react"
import { useTeacherDashboard } from "@/hooks/use-teacher-dashboard"
import { DashboardStatsSkeleton } from "@/components/ui/skeletons"

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
    const duration = 600
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

export function DashboardStats() {
  const { data, isLoading } = useTeacherDashboard()

  if (isLoading || !data) {
    return <DashboardStatsSkeleton />
  }

  const { stats } = data
  const activeCount = stats.activeSessions

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
      {/* Card 1: Total Students (Sky Accent) */}
      <div className="group relative overflow-hidden rounded-xl border border-sky-200/80 bg-linear-to-b from-sky-500/5 via-card to-card p-3.5 lg:p-4 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-sky-300 dark:border-sky-900/50 dark:from-sky-950/20">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex size-8.5 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
            <Users className="size-4.5" />
          </div>
          <span className="rounded-md bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">
            Enrolled
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground leading-none">
            <AnimatedNumber value={stats.totalStudents} />
          </span>
          <span className="text-xs font-semibold text-foreground/80 mt-1">
            Total Students
          </span>
          <span className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
            <ShieldCheck className="size-3 text-sky-500 shrink-0" />
            Assigned student cohort
          </span>
        </div>
      </div>

      {/* Card 2: Today Present (Emerald Accent) */}
      <div className="group relative overflow-hidden rounded-xl border border-emerald-200/80 bg-linear-to-b from-emerald-500/5 via-card to-card p-3.5 lg:p-4 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-emerald-300 dark:border-emerald-900/50 dark:from-emerald-950/20">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex size-8.5 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <UserCheck className="size-4.5" />
          </div>
          <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
            Recorded
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground leading-none">
            <AnimatedNumber value={stats.todayPresent} />
          </span>
          <span className="text-xs font-semibold text-foreground/80 mt-1">
            Today Present
          </span>
          <span className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
            <CheckCircle2 className="size-3 text-emerald-500 shrink-0" />
            Marked present today
          </span>
        </div>
      </div>

      {/* Card 3: Active Attendance Windows (Rose/Dynamic Accent) */}
      <div
        className={`group relative overflow-hidden rounded-xl border p-3.5 lg:p-4 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:col-span-2 lg:col-span-1 ${
          activeCount > 0
            ? "border-rose-300/90 bg-linear-to-b from-rose-500/10 via-card to-card hover:border-rose-400 dark:border-rose-900/70 dark:from-rose-950/30"
            : "border-border bg-card"
        }`}
      >
        <div className="flex items-center justify-between mb-2.5">
          <div
            className={`flex size-8.5 items-center justify-center rounded-lg ${
              activeCount > 0
                ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <Radio className="size-4.5" />
          </div>
          {activeCount > 0 ? (
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
              activeCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-foreground"
            }`}
          >
            <AnimatedNumber value={activeCount} />
          </span>
          <span className="text-xs font-semibold text-foreground/80 mt-1">
            Active Attendance Windows
          </span>
          <span className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
            <Zap className={`size-3 shrink-0 ${activeCount > 0 ? "text-rose-500" : "text-muted-foreground"}`} />
            {activeCount > 0 ? "Live session accepting check-ins" : "No live session active"}
          </span>
        </div>
      </div>
    </div>
  )
}