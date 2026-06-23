"use client"

import { useEffect, useState } from "react"
import { Loader2, BarChart2, Users, UserCheck, UserX, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { TodayAttendanceSummarySkeleton } from "@/components/ui/skeletons"

interface SubjectSummary {
  id: string
  name: string
  present: number
  total: number
}

function getBarColor(pct: number) {
  if (pct >= 75) return "bg-emerald-500"
  if (pct >= 60) return "bg-amber-500"
  return "bg-red-500"
}
function getBadgeBg(pct: number) {
  if (pct >= 75) return "bg-emerald-50 text-emerald-700 border-emerald-200"
  if (pct >= 60) return "bg-amber-50 text-amber-700 border-amber-200"
  return "bg-red-50 text-red-700 border-red-200"
}
function getRingColor(pct: number) {
  if (pct >= 75) return "#10b981"
  if (pct >= 60) return "#f59e0b"
  return "#ef4444"
}

function AnimatedBar({ pct, color }: { pct: number; color: string }) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 150)
    return () => clearTimeout(t)
  }, [pct])
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
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
    <svg width="72" height="72" viewBox="0 0 72 72">
      {/* Track */}
      <circle cx="36" cy="36" r={r} fill="none" stroke="#e2e8f0" strokeWidth="7" />
      {/* Progress */}
      <circle
        cx="36" cy="36" r={r}
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 36 36)"
        style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.4,0,0.2,1)" }}
      />
      <text x="36" y="40" textAnchor="middle" fontSize="13" fontWeight="700" fill={color}>
        {animPct}%
      </text>
    </svg>
  )
}

export function TodayAttendanceSummary() {
  const supabase = createClient()
  const [subjects, setSubjects] = useState<SubjectSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const teacherId = session.user.id
      const today = new Date().toISOString().split("T")[0]

      const { data: activeSessions } = await supabase
        .from("attendance_sessions")
        .select(`
          id, subject_id, class_id, status, opened_at,
          subject:subjects ( name ),
          class:classes ( name, section )
        `)
        .eq("teacher_id", teacherId)
        .eq("session_date", today)

      if (!activeSessions || activeSessions.length === 0) {
        setSubjects([])
        setLoading(false)
        return
      }

      const allSummaries = await Promise.all(activeSessions.map(async (sess: any) => {
        const { count: presentCount } = await supabase
          .from("period_attendance")
          .select("id", { count: "exact", head: true })
          .eq("session_id", sess.id)
          .eq("status", "present")

        const { count: studentCount } = await supabase
          .from("students")
          .select("id", { count: "exact", head: true })
          .eq("class_id", sess.class_id)
          .eq("is_active", true)

        const sectionName = sess.class ? `${sess.class.name}-${sess.class.section}` : "Unknown"
        const subjectName = sess.subject?.name ?? "Unknown"
        return {
          id: sess.id,
          name: `${subjectName} (${sectionName})`,
          present: presentCount ?? 0,
          total: studentCount ?? 0,
          openedAt: sess.opened_at,
          dedupeKey: `${sess.subject_id}__${sess.class_id}`,
        }
      }))

      const latestMap = new Map<string, typeof allSummaries[0]>()
      for (const s of allSummaries) {
        const existing = latestMap.get(s.dedupeKey)
        if (!existing || s.openedAt > existing.openedAt) latestMap.set(s.dedupeKey, s)
      }
      setSubjects(Array.from(latestMap.values()).map(({ id, name, present, total }) => ({ id, name, present, total })))
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return <TodayAttendanceSummarySkeleton />
  }

  // Totals across all subjects for the overview strip
  const totalPresent = subjects.reduce((a, s) => a + s.present, 0)
  const totalStudents = subjects.reduce((a, s) => a + s.total, 0)
  const totalAbsent = totalStudents - totalPresent
  const overallPct = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
          <BarChart2 className="size-4 text-primary" />
        </div>
        <h3 className="text-base font-semibold text-foreground">{"Today's Attendance Summary"}</h3>
      </div>

      {subjects.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <Clock className="size-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">No sessions today</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Start an attendance session to see data here
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 flex-1">
          {/* Subject rows */}
          {subjects.map((subject) => {
            const pct = subject.total > 0
              ? Math.round((subject.present / subject.total) * 100)
              : 0
            const ringColor = getRingColor(pct)
            return (
              <div
                key={subject.id}
                className="rounded-xl border border-border bg-white dark:bg-slate-900 p-4 shadow-sm"
              >
                {/* Top row: name + badge */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <span className="text-sm font-semibold text-foreground leading-snug">{subject.name}</span>
                  <span className={cn("shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-bold", getBadgeBg(pct))}>
                    {pct}%
                  </span>
                </div>

                {/* Donut + stats side by side */}
                <div className="flex items-center gap-4">
                  <DonutChart pct={pct} color={ringColor} />
                  <div className="flex flex-col gap-2 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="flex size-6 items-center justify-center rounded-md bg-emerald-50">
                        <UserCheck className="size-3.5 text-emerald-600" />
                      </div>
                      <span className="text-xs text-muted-foreground">Present</span>
                      <span className="ml-auto text-xs font-bold text-emerald-600">{subject.present}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex size-6 items-center justify-center rounded-md bg-red-50">
                        <UserX className="size-3.5 text-red-500" />
                      </div>
                      <span className="text-xs text-muted-foreground">Absent</span>
                      <span className="ml-auto text-xs font-bold text-red-500">{subject.total - subject.present}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex size-6 items-center justify-center rounded-md bg-slate-100">
                        <Users className="size-3.5 text-slate-500" />
                      </div>
                      <span className="text-xs text-muted-foreground">Total</span>
                      <span className="ml-auto text-xs font-bold text-slate-600">{subject.total}</span>
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

          {/* Overall summary strip — only show when multiple subjects */}
          {subjects.length > 1 && (
            <div className="rounded-xl border border-border bg-slate-50 dark:bg-slate-900/60 px-4 py-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Overall Today</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-lg font-bold text-emerald-600">{totalPresent}</p>
                    <p className="text-[10px] text-muted-foreground">Present</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-red-500">{totalAbsent}</p>
                    <p className="text-[10px] text-muted-foreground">Absent</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-slate-600">{totalStudents}</p>
                    <p className="text-[10px] text-muted-foreground">Total</p>
                  </div>
                </div>
                <span className={cn(
                  "rounded-full border px-3 py-1 text-sm font-bold",
                  getBadgeBg(overallPct)
                )}>
                  {overallPct}%
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}