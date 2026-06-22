"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CalendarDays, ChevronDown, ChevronUp, LayoutGrid, AlignJustify } from "lucide-react"
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

const SUBJECT_COLORS = [
  { bg: "bg-primary/10", text: "text-primary", border: "border-primary/30" },
  { bg: "bg-emerald-500/10", text: "text-emerald-700", border: "border-emerald-300" },
  { bg: "bg-amber-500/10", text: "text-amber-700", border: "border-amber-300" },
  { bg: "bg-violet-500/10", text: "text-violet-700", border: "border-violet-300" },
  { bg: "bg-rose-500/10", text: "text-rose-700", border: "border-rose-300" },
  { bg: "bg-sky-500/10", text: "text-sky-700", border: "border-sky-300" },
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
  const [isExpanded, setIsExpanded] = useState(false)
  const [gridView, setGridView] = useState(false)
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

  const subjectColorMap = useMemo(() => {
    const map: Record<string, number> = {}
    const names = Array.from(new Set(slots.map(s => s.subjectName)))
    names.forEach((name, i) => { map[name] = i % SUBJECT_COLORS.length })
    return map
  }, [slots])

  function getSubjectColor(name: string) {
    return SUBJECT_COLORS[subjectColorMap[name] ?? 0]
  }

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
    <Card className="overflow-hidden transition-all duration-300">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <CalendarDays className="size-4 text-primary" />
            My Timetable
          </CardTitle>
          <div className="flex items-center gap-1.5">
            {/* View toggle — only shown when expanded */}
            {isExpanded && (
              <div className="inline-flex gap-0.5 rounded-lg bg-muted/60 p-0.5">
                <button
                  onClick={() => setGridView(false)}
                  className={cn(
                    "flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all",
                    !gridView ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <AlignJustify className="size-3" /> Day
                </button>
                <button
                  onClick={() => setGridView(true)}
                  className={cn(
                    "flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all",
                    gridView ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <LayoutGrid className="size-3" /> Week
                </button>
              </div>
            )}
            {/* Expand/collapse button */}
            <button
              onClick={() => { setIsExpanded(prev => !prev); if (isExpanded) setGridView(false) }}
              className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
            >
              {isExpanded ? <><ChevronUp className="size-3.5" /> Collapse</> : <><ChevronDown className="size-3.5" /> Full View</>}
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 flex flex-col gap-4">
        {/* Day tabs — only show in day view */}
        {!(isExpanded && gridView) && (
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
                  <span className={cn("mt-0.5 size-1 rounded-full", isSelected ? "bg-primary-foreground/70" : "bg-primary")} />
                )}
                {!isToday && hasSlots && (
                  <span className={cn("mt-0.5 size-1 rounded-full", isSelected ? "bg-primary-foreground/40" : "bg-muted-foreground/40")} />
                )}
              </button>
            )
          })}
        </div>
        )}

        {/* COLLAPSED VIEW — day slots only */}
        {!isExpanded && (
          <div className="flex flex-col gap-2">
            {slotsForDay(selectedDay).length === 0 ? (
              <div className="rounded-xl border border-dashed border-border py-8 text-center">
                <p className="text-sm text-muted-foreground">No classes on {DAYS.find(d => d.value === selectedDay)?.full}</p>
              </div>
            ) : (
              slotsForDay(selectedDay).map((slot, i) => {
                const color = getSubjectColor(slot.subjectName)
                return (
                  <div key={i} className={cn("flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors", selectedDay === todayDow ? "border-primary/20 bg-primary/5" : "border-border bg-card")}>
                    <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold", selectedDay === todayDow ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                      {slot.periodNumber}
                    </div>
                    <div className="flex flex-1 flex-col min-w-0">
                      <span className="text-sm font-semibold text-foreground truncate">{slot.subjectName}</span>
                      <span className="text-xs text-muted-foreground">{slot.className}-{slot.section}</span>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <span className={cn("text-xs font-semibold", selectedDay === todayDow ? "text-primary" : "text-muted-foreground")}>{slot.startTime}</span>
                      <span className="text-xs text-muted-foreground">{slot.endTime}</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* EXPANDED — DAY VIEW */}
        {isExpanded && !gridView && (
          <div className="flex flex-col gap-2">
            {slotsForDay(selectedDay).length === 0 ? (
              <div className="rounded-xl border border-dashed border-border py-8 text-center">
                <p className="text-sm text-muted-foreground">No classes on {DAYS.find(d => d.value === selectedDay)?.full}</p>
              </div>
            ) : (
              slotsForDay(selectedDay).map((slot, i) => {
                const color = getSubjectColor(slot.subjectName)
                return (
                  <div key={i} className={cn("flex items-center gap-4 rounded-xl border-2 px-5 py-4 transition-colors", color.border, color.bg)}>
                    <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl text-base font-bold", color.bg, color.text)}>
                      P{slot.periodNumber}
                    </div>
                    <div className="flex flex-1 flex-col min-w-0">
                      <span className={cn("text-base font-bold truncate", color.text)}>{slot.subjectName}</span>
                      <span className="text-sm text-muted-foreground">{slot.className}-{slot.section}</span>
                    </div>
                    <div className="flex flex-col items-end shrink-0 gap-0.5">
                      <span className={cn("text-sm font-bold", color.text)}>{slot.startTime}</span>
                      <span className="text-xs text-muted-foreground">{slot.endTime}</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* EXPANDED — WEEKLY GRID VIEW */}
        {isExpanded && gridView && (
          <div className="overflow-x-auto">
            <div className="min-w-150">
              <div className="rounded-xl border border-border overflow-hidden">
                {/* Header row */}
                <div className="grid bg-muted/50" style={{ gridTemplateColumns: `80px repeat(6, 1fr)` }}>
                  <div className="px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-r border-border">Period</div>
                  {DAYS.map(d => (
                    <div key={d.value} className={cn("px-2 py-2.5 text-center border-r border-border last:border-r-0", d.value === todayDow ? "bg-primary/10" : "")}>
                      <div className={cn("text-xs font-bold uppercase tracking-wide", d.value === todayDow ? "text-primary" : "text-muted-foreground")}>{d.short}</div>
                      {d.value === todayDow && <div className="text-[9px] font-semibold text-primary/70 uppercase tracking-widest">Today</div>}
                    </div>
                  ))}
                </div>
                {/* Period rows — get unique periods */}
                {Array.from(new Set(slots.map(s => s.periodNumber))).sort((a, b) => a - b).map(periodNum => {
                  const periodSlot = slots.find(s => s.periodNumber === periodNum)
                  return (
                    <div key={periodNum} className="grid border-t border-border" style={{ gridTemplateColumns: `80px repeat(6, 1fr)` }}>
                      <div className="flex flex-col justify-center px-3 py-3 border-r border-border bg-muted/20">
                        <span className="text-xs font-bold text-foreground">P{periodNum}</span>
                        <span className="text-[10px] text-muted-foreground">{periodSlot?.startTime}–{periodSlot?.endTime}</span>
                      </div>
                      {DAYS.map(d => {
                        const slot = slots.find(s => s.dayOfWeek === d.value && s.periodNumber === periodNum)
                        const color = slot ? getSubjectColor(slot.subjectName) : null
                        const isToday = d.value === todayDow
                        return (
                          <div key={d.value} className={cn("relative min-h-16 border-r border-border last:border-r-0 p-1.5", isToday ? "bg-primary/3" : "")}>
                            {slot ? (
                              <div className={cn("h-full rounded-lg border p-2 flex flex-col gap-0.5", color!.bg, color!.border)}>
                                <div className={cn("text-[11px] font-semibold leading-tight line-clamp-2", color!.text)}>{slot.subjectName}</div>
                                <div className="text-[10px] text-muted-foreground">{slot.className}-{slot.section}</div>
                              </div>
                            ) : (
                              <div className={cn("h-full min-h-12 rounded-lg border-2 border-dashed border-border/40 flex items-center justify-center", isToday ? "border-primary/20" : "")}>
                                <span className="text-[10px] text-muted-foreground/40">—</span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
              {/* Subject legend */}
              <div className="mt-3 flex flex-wrap gap-2">
                {Array.from(new Set(slots.map(s => s.subjectName))).map(subj => {
                  const c = getSubjectColor(subj)
                  return (
                    <div key={subj} className={cn("flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border", c.bg, c.text, c.border)}>
                      <span className={cn("size-2 rounded-full", c.bg.replace("/10", "").replace("bg-", "bg-"))} />
                      {subj}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Jump to today */}
        {todayDow && selectedDay !== todayDow && !(isExpanded && gridView) && (
          <button onClick={() => setSelectedDay(todayDow)} className="text-xs text-primary font-medium text-center hover:underline">
            Jump to today →
          </button>
        )}
      </CardContent>
    </Card>
  )
}