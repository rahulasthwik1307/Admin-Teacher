"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

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
    <Card className="border-amber-200 bg-amber-500/5">
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
          <AlertTriangle className="size-5 text-amber-600" />
        </div>
        <div className="flex flex-1 flex-col">
          <span className="text-sm font-semibold text-foreground">
            {count} missed attendance session{count !== 1 ? "s" : ""}
          </span>
          <span className="text-xs text-muted-foreground">
            Periods passed without attendance being recorded in the last 30 days.
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="border-amber-300 text-amber-700 hover:bg-amber-50 shrink-0"
          onClick={() => router.push("/teacher/missed-attendance")}
        >
          View All
        </Button>
      </CardContent>
    </Card>
  )
}
