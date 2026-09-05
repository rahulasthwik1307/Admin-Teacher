"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, ChevronDown, ChevronUp, LayoutGrid, AlignJustify, Clock, GraduationCap, Building2, ArrowRight, Download } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { MyTimetableSkeleton } from "@/components/ui/skeletons"
import { toast } from "sonner"
import { exportTeacherTimetablePDF } from "@/lib/timetable-export"

const DAYS = [
  { value: 1, short: "Mon", full: "Monday" },
  { value: 2, short: "Tue", full: "Tuesday" },
  { value: 3, short: "Wed", full: "Wednesday" },
  { value: 4, short: "Thu", full: "Thursday" },
  { value: 5, short: "Fri", full: "Friday" },
  { value: 6, short: "Sat", full: "Saturday" },
]

const SUBJECT_COLORS = [
  { bg: "bg-sky-500/10", text: "text-sky-700 dark:text-sky-300", border: "border-sky-300 dark:border-sky-800/60", badge: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  { bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-300 dark:border-emerald-800/60", badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  { bg: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-300", border: "border-amber-300 dark:border-amber-800/60", badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  { bg: "bg-violet-500/10", text: "text-violet-700 dark:text-violet-300", border: "border-violet-300 dark:border-violet-800/60", badge: "bg-violet-500/15 text-violet-700 dark:text-violet-300" },
  { bg: "bg-rose-500/10", text: "text-rose-700 dark:text-rose-300", border: "border-rose-300 dark:border-rose-800/60", badge: "bg-rose-500/15 text-rose-700 dark:text-rose-300" },
  { bg: "bg-primary/10", text: "text-primary", border: "border-primary/30", badge: "bg-primary/15 text-primary" },
]

interface TimetableSlot {
  dayOfWeek: number
  periodNumber: number
  startTime: string
  endTime: string
  subjectName: string
  subjectCode?: string
  className: string
  section: string
  year?: string
}

export function MyTimetable() {
  const [slots, setSlots] = useState<TimetableSlot[]>([])
  const [teacherName, setTeacherName] = useState<string>("Faculty Member")
  const [loading, setLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)
  const [gridView, setGridView] = useState(false)
  const [selectedDay, setSelectedDay] = useState<number>(() => {
    const jsDay = new Date().getDay()
    return jsDay >= 1 && jsDay <= 6 ? jsDay : 1
  })

  useEffect(() => {
    async function fetchTimetable() {
      try {
        const supabase = createClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session) return

        const [{ data, error }, { data: profile }] = await Promise.all([
          supabase
            .from("timetables")
            .select(`
              day_of_week,
              period:periods ( period_number, start_time, end_time ),
              subject:subjects ( name, code ),
              class:classes ( name, section, year )
            `)
            .eq("teacher_id", session.user.id)
            .order("day_of_week"),
          supabase
            .from("users")
            .select("full_name")
            .eq("id", session.user.id)
            .maybeSingle(),
        ])

        if (profile?.full_name) {
          setTeacherName(profile.full_name)
        }

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
            subjectCode: t.subject?.code ?? "",
            className: t.class?.name ?? "—",
            section: t.class?.section ?? "",
            year: t.class?.year ?? "",
          }))
          .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.periodNumber - b.periodNumber)

        setSlots(mapped)
      } catch {
        // fail silently
      } finally {
        setLoading(false)
      }
    }
    fetchTimetable()
  }, [])

  function handleDownloadPDF() {
    if (slots.length === 0) {
      toast.error("No timetable slots to export.")
      return
    }
    try {
      toast.info("Generating your weekly schedule PDF...", { duration: 1500 })
      exportTeacherTimetablePDF({
        slots,
        teacherName,
        institutionName: "Faculty Weekly Schedule",
      })
      toast.success("Schedule PDF downloaded successfully!")
    } catch (err) {
      console.error("Teacher PDF export error:", err)
      toast.error("Failed to generate PDF. Please try again.")
    }
  }

  const todayDow = (() => {
    const jsDay = new Date().getDay()
    return jsDay >= 1 && jsDay <= 6 ? jsDay : null
  })()

  const slotsForDay = (day: number) => slots.filter((s) => s.dayOfWeek === day)

  const subjectColorMap = useMemo(() => {
    const map: Record<string, number> = {}
    const names = Array.from(new Set(slots.map((s) => s.subjectName)))
    names.forEach((name, i) => {
      map[name] = i % SUBJECT_COLORS.length
    })
    return map
  }, [slots])

  function getSubjectColor(name: string) {
    return SUBJECT_COLORS[subjectColorMap[name] ?? 0]
  }

  if (loading) {
    return <MyTimetableSkeleton />
  }

  if (slots.length === 0) {
    return (
      <Card className="border-border shadow-2xs">
        <CardHeader className="pb-0">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <CalendarDays className="size-4 text-primary" />
            My Weekly Timetable
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground text-center py-10">
            No timetable slots assigned yet.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border shadow-2xs overflow-hidden transition-all duration-200">
      <CardHeader className="pb-3.5 border-b border-border/60 bg-muted/10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CalendarDays className="size-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-foreground">
                My Weekly Timetable
              </CardTitle>
              <CardDescription className="text-[11px] text-muted-foreground">
                Schedule of lecture periods and room assignments
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Quick Export PDF */}
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary px-2.5 py-1.5 text-xs font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer"
              title="Download weekly schedule as PDF"
            >
              <Download className="size-3.5" />
              <span className="hidden sm:inline">Download PDF</span>
              <span className="sm:hidden">PDF</span>
            </button>

            {/* View toggle — only shown when expanded */}
            {isExpanded && (
              <div className="inline-flex gap-0.5 rounded-xl border border-border/80 bg-muted/50 p-1">
                <button
                  type="button"
                  onClick={() => setGridView(false)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer",
                    !gridView
                      ? "bg-card text-foreground shadow-2xs border border-border/60"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <AlignJustify className="size-3.5" /> Day
                </button>
                <button
                  type="button"
                  onClick={() => setGridView(true)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer",
                    gridView
                      ? "bg-card text-foreground shadow-2xs border border-border/60"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <LayoutGrid className="size-3.5" /> Week
                </button>
              </div>
            )}

            {/* Expand / Collapse toggle button */}
            <button
              type="button"
              onClick={() => {
                setIsExpanded((prev) => !prev)
                if (isExpanded) setGridView(false)
              }}
              className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted/50 transition-all cursor-pointer"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="size-3.5" /> Collapse
                </>
              ) : (
                <>
                  <ChevronDown className="size-3.5" /> Full View
                </>
              )}
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 flex flex-col gap-4">
        {/* ── Day tabs (Shown in day view) ── */}
        {!(isExpanded && gridView) && (
          <div className="flex gap-1.5 rounded-xl border border-border/70 bg-muted/40 p-1 overflow-x-auto">
            {DAYS.map((d) => {
              const isToday = d.value === todayDow
              const isSelected = d.value === selectedDay
              const count = slotsForDay(d.value).length
              return (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setSelectedDay(d.value)}
                  className={cn(
                    "flex-1 min-w-16 flex flex-col items-center py-2 px-2 rounded-lg text-xs font-bold transition-all duration-150 relative cursor-pointer",
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                  )}
                >
                  <div className="flex items-center gap-1">
                    <span>{d.short}</span>
                    {count > 0 && (
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          isSelected ? "bg-primary-foreground" : "bg-primary"
                        )}
                      />
                    )}
                  </div>
                  {isToday ? (
                    <span
                      className={cn(
                        "text-[9px] uppercase tracking-wider font-extrabold mt-0.5",
                        isSelected ? "text-primary-foreground/90" : "text-primary"
                      )}
                    >
                      Today
                    </span>
                  ) : (
                    <span
                      className={cn(
                        "text-[9px] font-medium mt-0.5",
                        isSelected ? "text-primary-foreground/80" : "text-muted-foreground/70"
                      )}
                    >
                      {count} {count === 1 ? "slot" : "slots"}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* ── DEFAULT / COLLAPSED VIEW (High Clarity for Period, Subject, Class, Time) ── */}
        {!isExpanded && (
          <div className="flex flex-col gap-2.5">
            {slotsForDay(selectedDay).length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/80 py-10 text-center bg-muted/10">
                <CalendarDays className="mx-auto size-7 text-muted-foreground/40 mb-2" />
                <p className="text-xs font-semibold text-muted-foreground">
                  No lecture periods scheduled on {DAYS.find((d) => d.value === selectedDay)?.full}
                </p>
              </div>
            ) : (
              slotsForDay(selectedDay).map((slot, i) => {
                const color = getSubjectColor(slot.subjectName)
                const isCurrentDay = selectedDay === todayDow
                return (
                  <div
                    key={i}
                    className={cn(
                      "group relative flex items-center justify-between gap-3.5 rounded-xl border p-3 sm:p-3.5 transition-all duration-150 shadow-2xs hover:shadow-xs",
                      isCurrentDay
                        ? "border-primary/30 bg-linear-to-r from-primary/5 via-card to-card"
                        : "border-border bg-card hover:border-border/90"
                    )}
                  >
                    {/* Left: Period Badge (Bold & Prominent) + Subject & Class */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Period Badge — high prominence */}
                      <div
                        className={cn(
                          "flex flex-col items-center justify-center min-w-15 sm:min-w-16 h-11 px-2 shrink-0 rounded-xl border shadow-2xs text-center",
                          color.bg,
                          color.border,
                          color.text
                        )}
                      >
                        <span className="text-[9.5px] uppercase font-extrabold leading-none tracking-wider opacity-85">Period</span>
                        <span className="text-base sm:text-lg font-black leading-none mt-0.5">{slot.periodNumber}</span>
                      </div>

                      {/* Subject + Class Details */}
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs sm:text-sm font-bold text-foreground truncate">
                          {slot.subjectName}
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-medium mt-1">
                          <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300">
                            <Building2 className="size-2.5 shrink-0" />
                            {slot.className}-{slot.section}
                          </span>
                          {slot.year && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 text-[10px] font-bold text-purple-700 dark:text-purple-300">
                              <GraduationCap className="size-2.5 shrink-0" />
                              {slot.year}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Time Slot Badge */}
                    <div className="flex flex-col items-end shrink-0 pl-2">
                      <div className="flex items-center gap-1 text-xs font-bold text-foreground">
                        <Clock className="size-3 text-primary shrink-0" />
                        <span>{slot.startTime}</span>
                      </div>
                      <span className="text-[11px] text-muted-foreground font-medium mt-0.5">
                        to {slot.endTime}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* ── EXPANDED — DAY VIEW ── */}
        {isExpanded && !gridView && (
          <div className="flex flex-col gap-3">
            {slotsForDay(selectedDay).length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/80 py-10 text-center bg-muted/10">
                <CalendarDays className="mx-auto size-7 text-muted-foreground/40 mb-2" />
                <p className="text-xs font-semibold text-muted-foreground">
                  No lecture periods scheduled on {DAYS.find((d) => d.value === selectedDay)?.full}
                </p>
              </div>
            ) : (
              slotsForDay(selectedDay).map((slot, i) => {
                const color = getSubjectColor(slot.subjectName)
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center justify-between gap-4 rounded-xl border p-4 transition-all shadow-2xs",
                      color.border,
                      color.bg
                    )}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={cn(
                          "flex h-11 min-w-16 px-2 shrink-0 flex-col items-center justify-center rounded-xl font-bold shadow-2xs border text-center",
                          color.badge,
                          color.border,
                          color.text
                        )}
                      >
                        <span className="text-[9.5px] uppercase font-extrabold tracking-wider opacity-85 leading-none">Period</span>
                        <span className="text-base sm:text-lg font-black leading-none mt-0.5">{slot.periodNumber}</span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className={cn("text-sm font-bold truncate", color.text)}>
                          {slot.subjectName}
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap mt-1">
                          <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300">
                            <Building2 className="size-2.5 shrink-0" />
                            {slot.className}-{slot.section}
                          </span>
                          {slot.year && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 text-[10px] font-bold text-purple-700 dark:text-purple-300">
                              <GraduationCap className="size-2.5 shrink-0" />
                              {slot.year}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <div className={cn("text-xs font-bold flex items-center gap-1", color.text)}>
                        <Clock className="size-3.5" />
                        <span>{slot.startTime}</span>
                      </div>
                      <span className="text-[11px] text-muted-foreground font-medium">
                        until {slot.endTime}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* ── EXPANDED — WEEKLY GRID VIEW ── */}
        {isExpanded && gridView && (
          <div className="overflow-x-auto">
            <div className="min-w-160">
              <div className="rounded-xl border border-border overflow-hidden shadow-2xs">
                {/* Header row */}
                <div
                  className="grid bg-muted/40 border-b border-border/80"
                  style={{ gridTemplateColumns: `90px repeat(6, 1fr)` }}
                >
                  <div className="px-3.5 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-r border-border/60">
                    Period
                  </div>
                  {DAYS.map((d) => (
                    <div
                      key={d.value}
                      className={cn(
                        "px-2 py-2.5 text-center border-r border-border/60 last:border-r-0",
                        d.value === todayDow ? "bg-primary/10" : ""
                      )}
                    >
                      <div
                        className={cn(
                          "text-xs font-bold uppercase tracking-wide",
                          d.value === todayDow ? "text-primary" : "text-muted-foreground"
                        )}
                      >
                        {d.short}
                      </div>
                      {d.value === todayDow && (
                        <div className="text-[9px] font-extrabold text-primary uppercase tracking-widest mt-0.5">
                          Today
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Period rows */}
                {Array.from(new Set(slots.map((s) => s.periodNumber)))
                  .sort((a, b) => a - b)
                  .map((periodNum) => {
                    const periodSlot = slots.find((s) => s.periodNumber === periodNum)
                    return (
                      <div
                        key={periodNum}
                        className="grid border-b border-border/60 last:border-b-0"
                        style={{ gridTemplateColumns: `90px repeat(6, 1fr)` }}
                      >
                        <div className="flex flex-col justify-center px-3 py-3 border-r border-border/60 bg-muted/20">
                          <span className="text-xs font-bold text-foreground">
                            Period {periodNum}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono mt-0.5">
                            {periodSlot?.startTime}–{periodSlot?.endTime}
                          </span>
                        </div>
                        {DAYS.map((d) => {
                          const slot = slots.find(
                            (s) => s.dayOfWeek === d.value && s.periodNumber === periodNum
                          )
                          const color = slot ? getSubjectColor(slot.subjectName) : null
                          const isToday = d.value === todayDow
                          return (
                            <div
                              key={d.value}
                              className={cn(
                                "relative min-h-18 border-r border-border/60 last:border-r-0 p-1.5",
                                isToday ? "bg-primary/3" : ""
                              )}
                            >
                              {slot ? (
                                <div
                                  className={cn(
                                    "h-full rounded-lg border p-2 flex flex-col justify-between shadow-2xs",
                                    color!.bg,
                                    color!.border
                                  )}
                                >
                                  <div
                                    className={cn(
                                      "text-[11px] font-bold leading-tight line-clamp-2",
                                      color!.text
                                    )}
                                  >
                                    {slot.subjectName}
                                  </div>
                                  <div className="flex items-center gap-1 flex-wrap mt-1">
                                    <span className="inline-flex items-center rounded bg-blue-500/10 border border-blue-500/20 px-1 py-0.2 text-[9px] font-bold text-blue-700 dark:text-blue-300">
                                      {slot.className}-{slot.section}
                                    </span>
                                    {slot.year && (
                                      <span className="inline-flex items-center rounded bg-purple-500/10 border border-purple-500/20 px-1 py-0.2 text-[9px] font-bold text-purple-700 dark:text-purple-300">
                                        {slot.year}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div
                                  className={cn(
                                    "h-full min-h-14 rounded-lg border border-dashed border-border/40 flex items-center justify-center",
                                    isToday ? "border-primary/20" : ""
                                  )}
                                >
                                  <span className="text-[10px] text-muted-foreground/30">—</span>
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
              <div className="mt-3.5 flex flex-wrap gap-2">
                {Array.from(new Set(slots.map((s) => s.subjectName))).map((subj) => {
                  const c = getSubjectColor(subj)
                  return (
                    <div
                      key={subj}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border shadow-2xs",
                        c.bg,
                        c.text,
                        c.border
                      )}
                    >
                      <span className="size-2 rounded-full bg-current opacity-70" />
                      {subj}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Jump to today button */}
        {todayDow && selectedDay !== todayDow && !(isExpanded && gridView) && (
          <button
            type="button"
            onClick={() => setSelectedDay(todayDow)}
            className="text-xs text-primary font-semibold text-center hover:underline cursor-pointer flex items-center justify-center gap-1 self-center"
          >
            <span>Jump to today ({DAYS.find((d) => d.value === todayDow)?.full})</span>
            <ArrowRight className="size-3" />
          </button>
        )}
      </CardContent>
    </Card>
  )
}