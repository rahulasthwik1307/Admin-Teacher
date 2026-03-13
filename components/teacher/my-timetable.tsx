"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CalendarDays } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

const DAYS = [
  { value: 1, short: "Mon", full: "Monday" },
  { value: 2, short: "Tue", full: "Tuesday" },
  { value: 3, short: "Wed", full: "Wednesday" },
  { value: 4, short: "Thu", full: "Thursday" },
  { value: 5, short: "Fri", full: "Friday" },
  { value: 6, short: "Sat", full: "Saturday" },
]

interface TimetableSlot {
  dayOfWeek: number
  periodNumber: number
  startTime: string
  endTime: string
  subjectName: string
  className: string
  section: string
}

export function MyTimetable() {
  const [slots, setSlots] = useState<TimetableSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<number>(() => {
    const jsDay = new Date().getDay()
    // Default to today if Mon-Sat, else Monday
    return jsDay >= 1 && jsDay <= 6 ? jsDay : 1
  })

  useEffect(() => {
    async function fetchTimetable() {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return

      const { data, error } = await supabase
        .from("timetables")
        .select(`
          day_of_week,
          period:periods ( period_number, start_time, end_time ),
          subject:subjects ( name ),
          class:classes ( name, section )
        `)
        .eq("teacher_id", session.user.id)
        .order("day_of_week")

      if (error || !data) {
        setLoading(false)
        return
      }

      const mapped: TimetableSlot[] = (data as any[])
        .map((t) => ({
          dayOfWeek: t.day_of_week,
          periodNumber: t.period?.period_number ?? 0,
          startTime: t.period?.start_time?.slice(0, 5) ?? "",
          endTime: t.period?.end_time?.slice(0, 5) ?? "",
          subjectName: t.subject?.name ?? "—",
          className: t.class?.name ?? "—",
          section: t.class?.section ?? "",
        }))
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.periodNumber - b.periodNumber)

      setSlots(mapped)
      setLoading(false)
    }
    fetchTimetable()
  }, [])

  const todayDow = (() => {
    const jsDay = new Date().getDay()
    return jsDay >= 1 && jsDay <= 6 ? jsDay : null
  })()

  const slotsForDay = (day: number) => slots.filter((s) => s.dayOfWeek === day)

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <CalendarDays className="size-4 text-primary" />
            My Timetable
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 flex justify-center py-10">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (slots.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <CalendarDays className="size-4 text-primary" />
            My Timetable
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground text-center py-10">
            No timetable assigned yet.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-0">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <CalendarDays className="size-4 text-primary" />
          My Timetable
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 flex flex-col gap-4">

        {/* Day tabs */}
        <div className="flex gap-1 rounded-xl bg-muted/60 p-1">
          {DAYS.map((d) => {
            const isToday = d.value === todayDow
            const isSelected = d.value === selectedDay
            const hasSlots = slotsForDay(d.value).length > 0
            return (
              <button
                key={d.value}
                onClick={() => setSelectedDay(d.value)}
                className={cn(
                  "flex-1 flex flex-col items-center py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 relative",
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <span>{d.short}</span>
                {isToday && (
                  <span
                    className={cn(
                      "mt-0.5 size-1 rounded-full",
                      isSelected ? "bg-primary-foreground/70" : "bg-primary"
                    )}
                  />
                )}
                {!isToday && hasSlots && (
                  <span
                    className={cn(
                      "mt-0.5 size-1 rounded-full",
                      isSelected ? "bg-primary-foreground/40" : "bg-muted-foreground/40"
                    )}
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* Slots for selected day */}
        <div className="flex flex-col gap-2">
          {slotsForDay(selectedDay).length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No classes on {DAYS.find((d) => d.value === selectedDay)?.full}
              </p>
            </div>
          ) : (
            slotsForDay(selectedDay).map((slot, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors",
                  selectedDay === todayDow
                    ? "border-primary/20 bg-primary/5"
                    : "border-border bg-card"
                )}
              >
                {/* Period number indicator */}
                <div
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold",
                    selectedDay === todayDow
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {slot.periodNumber}
                </div>

                {/* Subject + class */}
                <div className="flex flex-1 flex-col min-w-0">
                  <span className="text-sm font-semibold text-foreground truncate">
                    {slot.subjectName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {slot.className}-{slot.section}
                  </span>
                </div>

                {/* Time */}
                <div className="flex flex-col items-end shrink-0">
                  <span
                    className={cn(
                      "text-xs font-semibold",
                      selectedDay === todayDow ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {slot.startTime}
                  </span>
                  <span className="text-xs text-muted-foreground">{slot.endTime}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Today indicator */}
        {todayDow && selectedDay !== todayDow && (
          <button
            onClick={() => setSelectedDay(todayDow)}
            className="text-xs text-primary font-medium text-center hover:underline"
          >
            Jump to today →
          </button>
        )}
      </CardContent>
    </Card>
  )
}