"use client"

import { useEffect, useState } from "react"
import { BarChart2, Users, UserCheck, UserX, Clock, Building2, GraduationCap } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTeacherDashboard } from "@/hooks/use-teacher-dashboard"
import { TodayAttendanceSummarySkeleton } from "@/components/ui/skeletons"

function getBarColor(pct: number) {
  if (pct >= 75) return "bg-emerald-500"
  if (pct >= 60) return "bg-amber-500"
  return "bg-rose-500"
}

function getBadgeBg(pct: number) {
  if (pct >= 75) return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/60"
  if (pct >= 60) return "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800/60"
  return "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800/60"
}

function getRingColor(pct: number) {
  if (pct >= 75) return "#10b981"
  if (pct >= 60) return "#f59e0b"
  return "#f43f5e"
}

function AnimatedBar({ pct, color }: { pct: number; color: string }) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 150)
    return () => clearTimeout(t)
  }, [pct])
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn("h-full rounded-full", color)}
        style={{ width: `${width}%`, transition: "width 0.9s cubic-bezier(0.4,0,0.2,1)" }}
      />
    </div>
  )
}

function DonutChart({ pct, color }: { pct: number; color: string }) {
  const [animPct, setAnimPct] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setAnimPct(pct), 200)
    return () => clearTimeout(t)
  }, [pct])

  const r = 28
  const circ = 2 * Math.PI * r
  const offset = circ - (animPct / 100) * circ

  return (
    <svg width="72" height="72" viewBox="0 0 72 72" className="shrink-0 drop-shadow-2xs">
      {/* Track */}
      <circle cx="36" cy="36" r={r} fill="none" stroke="currentColor" strokeWidth="6.5" className="text-muted/40" />
      {/* Progress */}
      <circle
        cx="36"
        cy="36"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 36 36)"
        style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.4,0,0.2,1)" }}
      />
      <text x="36" y="41" textAnchor="middle" fontSize="13" fontWeight="800" fill={color}>
        {animPct}%
      </text>
    </svg>
  )
}

export function TodayAttendanceSummary() {
  const { data, isLoading } = useTeacherDashboard()

  if (isLoading || !data) return <TodayAttendanceSummarySkeleton />

  const subjects = data.todayAttendance
  const totalPresent = subjects.reduce((a, s) => a + s.present, 0)
  const totalStudents = subjects.reduce((a, s) => a + s.total, 0)
  const totalAbsent = totalStudents - totalPresent
  const overallPct = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <BarChart2 className="size-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">Today&apos;s Attendance Summary</h3>
          <p className="text-[11px] text-muted-foreground">Session turnout metrics recorded today</p>
        </div>
      </div>

      {subjects.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2.5 py-10 text-center bg-muted/10 rounded-xl border border-dashed border-border/80">
          <div className="flex size-11 items-center justify-center rounded-full bg-muted">
            <Clock className="size-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-xs font-bold text-foreground">No sessions conducted today</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Attendance records will appear here after taking attendance
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5 flex-1">
          {/* Subject rows */}
          {subjects.map((subject) => {
            const pct = subject.total > 0
              ? Math.round((subject.present / subject.total) * 100)
              : 0
            const ringColor = getRingColor(pct)
            return (
              <div
                key={subject.id}
                className="rounded-xl border border-border bg-card p-4 shadow-2xs transition-all hover:border-border/90"
              >
                {/* Top row: name + separate pills + badge */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="text-xs sm:text-sm font-bold text-foreground leading-snug truncate">
                      {subject.subjectName || subject.name.split(" (")[0]}
                    </span>
                    {(subject.className || subject.year) && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {subject.className && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300">
                            <Building2 className="size-2.5 shrink-0" />
                            {subject.className}{subject.section ? `-${subject.section}` : ""}
                          </span>
                        )}
                        {subject.year && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 text-[10px] font-bold text-purple-700 dark:text-purple-300">
                            <GraduationCap className="size-2.5 shrink-0" />
                            {subject.year}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <span className={cn("shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-bold", getBadgeBg(pct))}>
                    {pct}% Turnout
                  </span>
                </div>

                {/* Donut + stats side by side */}
                <div className="flex items-center gap-4">
                  <DonutChart pct={pct} color={ringColor} />
                  <div className="flex flex-col gap-2 flex-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <div className="flex size-5 items-center justify-center rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          <UserCheck className="size-3" />
                        </div>
                        <span className="font-medium">Present</span>
                      </div>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{subject.present}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <div className="flex size-5 items-center justify-center rounded bg-rose-500/10 text-rose-600 dark:text-rose-400">
                          <UserX className="size-3" />
                        </div>
                        <span className="font-medium">Absent</span>
                      </div>
                      <span className="font-bold text-rose-600 dark:text-rose-400">{subject.total - subject.present}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <div className="flex size-5 items-center justify-center rounded bg-muted text-muted-foreground">
                          <Users className="size-3" />
                        </div>
                        <span className="font-medium">Total Roster</span>
                      </div>
                      <span className="font-bold text-foreground">{subject.total}</span>
                    </div>
                  </div>
                </div>

                {/* Bar */}
                <div className="mt-3">
                  <AnimatedBar pct={pct} color={getBarColor(pct)} />
                </div>
              </div>
            )
          })}

          {/* Overall summary strip */}
          {subjects.length > 1 && (
            <div className="rounded-xl border border-border/80 bg-muted/30 p-3.5 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Overall Aggregate Today
                </span>
                <span className={cn("rounded-md border px-2 py-0.5 text-xs font-bold", getBadgeBg(overallPct))}>
                  {overallPct}%
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border border-border/60 bg-card p-2">
                  <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">{totalPresent}</p>
                  <p className="text-[10px] text-muted-foreground font-medium">Present</p>
                </div>
                <div className="rounded-lg border border-border/60 bg-card p-2">
                  <p className="text-sm font-extrabold text-rose-600 dark:text-rose-400">{totalAbsent}</p>
                  <p className="text-[10px] text-muted-foreground font-medium">Absent</p>
                </div>
                <div className="rounded-lg border border-border/60 bg-card p-2">
                  <p className="text-sm font-extrabold text-foreground">{totalStudents}</p>
                  <p className="text-[10px] text-muted-foreground font-medium">Total</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}