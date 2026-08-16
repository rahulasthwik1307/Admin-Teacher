"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { AlertTriangle, ArrowRight } from "lucide-react"
import { MissedAttendanceAlertSkeleton } from "@/components/ui/skeletons"

export function MissedAttendanceAlert() {
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function fetchCount() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }

        const todayStr = new Date().toISOString().split("T")[0]
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        const startStr = thirtyDaysAgo.toISOString().split("T")[0]

        const { data: timetable } = await supabase
          .from("timetables")
          .select("day_of_week, subject_id, class_id, period_id")
          .eq("teacher_id", user.id)

        if (!timetable || timetable.length === 0) {
          setCount(0)
          return
        }

        const { data: existingSessions } = await supabase
          .from("attendance_sessions")
          .select("subject_id, class_id, period_id, session_date")
          .eq("teacher_id", user.id)
          .gte("session_date", startStr)
          .lte("session_date", todayStr)

        const existingKeys = new Set(
          (existingSessions || []).map(
            (s: any) => `${s.session_date}__${s.subject_id}__${s.class_id}__${s.period_id}`
          )
        )

        let missed = 0
        const cursor = new Date(thirtyDaysAgo)
        const today = new Date()
        today.setHours(23, 59, 59, 999)

        while (cursor <= today) {
          const dayOfWeek = cursor.getDay() === 0 ? 7 : cursor.getDay()
          if (dayOfWeek !== 7) {
            const dateStr = cursor.toISOString().split("T")[0]
            const isToday = dateStr === todayStr
            for (const slot of timetable) {
              if ((slot as any).day_of_week !== dayOfWeek) continue
              const key = `${dateStr}__${slot.subject_id}__${slot.class_id}__${slot.period_id}`
              if (existingKeys.has(key)) continue
              if (isToday) {
                // Skip future periods today
                continue
              }
              missed++
            }
          }
          cursor.setDate(cursor.getDate() + 1)
        }

        setCount(missed)
      } catch (e) {
        console.error("MissedAttendanceAlert error:", e)
      } finally {
        setLoading(false)
      }
    }
    fetchCount()
  }, [])

  if (loading) return <MissedAttendanceAlertSkeleton />
  if (count === 0) return null

  return (
    <div className="relative overflow-hidden rounded-xl border border-amber-300/90 bg-linear-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 shadow-2xs dark:border-amber-800/80 dark:from-amber-950/40">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 ring-1 ring-amber-500/30">
            <AlertTriangle className="size-5" />
            <span className="absolute -top-0.5 -right-0.5 flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-amber-500" />
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-amber-900 dark:text-amber-200">
                {count} Missed Attendance Session{count !== 1 ? "s" : ""}
              </span>
              <span className="rounded-full bg-amber-500/20 px-2 py-0.2 text-[10px] font-extrabold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                Action Required
              </span>
            </div>
            <span className="text-xs text-amber-700/90 dark:text-amber-400">
              Timetable periods passed without recorded attendance in the last 30 days
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => router.push("/teacher/missed-attendance")}
          className="group inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all duration-150 hover:bg-amber-700 hover:shadow-sm shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <span>Review & Record</span>
          <ArrowRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  )
}
