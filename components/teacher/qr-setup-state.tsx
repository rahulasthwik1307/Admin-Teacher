"use client"

import { useMemo, useState, useEffect } from "react"
import { QrCode, CalendarDays, Users, BookOpen, Clock, ArrowRight, ShieldCheck, Sparkles, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { RecentSessionsSkeleton } from "@/components/ui/skeletons"

export interface DropdownOption {
  value: string
  label: string
}

export interface RecentSessionData {
  subject: string
  class: string
  period: string
  date: string
  time: string
  present: number
  total: number
  status: string
}

interface QRSetupStateProps {
  selectedClass: string
  selectedSubject: string
  selectedPeriod: string
  onClassChange: (val: string) => void
  onSubjectChange: (val: string) => void
  onPeriodChange: (val: string) => void
  onStart: () => void
  canStart: boolean
  classOptions: DropdownOption[]
  subjectOptions: DropdownOption[]
  periodOptions: DropdownOption[]
  recentSessions: RecentSessionData[]
  recentSessionsLoading?: boolean
  periodAutoFilled?: boolean
}

/* ---------- Period label parser helper ---------- */
function parsePeriodLabel(label: string) {
  const match = label.match(/^(\d+)\s*(?:Period)?\s*(.*)$/i)
  if (match) {
    const periodNum = match[1]
    let timeRange = match[2]?.trim() || ""
    timeRange = timeRange.replace(/^[-–—]\s*/, "")
    return {
      periodNum,
      periodText: `Period ${periodNum}`,
      timeRange,
    }
  }
  return {
    periodNum: "",
    periodText: label,
    timeRange: "",
  }
}

/* ---------- Grouping helpers ---------- */
function getDayLabel(dateStr: string): string {
  const parts = dateStr.split("/")
  if (parts.length !== 3) return dateStr

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  const d = parseInt(parts[0])
  const m = parseInt(parts[1]) - 1
  const y = parseInt(parts[2])
  const sessionDate = new Date(y, m, d)
  sessionDate.setHours(0, 0, 0, 0)

  const diff = today.getTime() - sessionDate.getTime()
  const diffDays = Math.round(diff / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  return sessionDate.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" })
}

type GroupedSessions = Map<string, Map<string, RecentSessionData[]>>

function groupSessions(sessions: RecentSessionData[]): GroupedSessions {
  const map: GroupedSessions = new Map()
  for (const s of sessions) {
    const day = getDayLabel(s.date)
    const section = s.class
    if (!map.has(day)) map.set(day, new Map())
    const dayMap = map.get(day)!
    if (!dayMap.has(section)) dayMap.set(section, [])
    dayMap.get(section)!.push(s)
  }
  return map
}

function getAttendancePct(present: number, total: number) {
  if (total === 0) return null
  return Math.round((present / total) * 100)
}

function getPctBadge(pct: number) {
  if (pct >= 75) return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/60"
  if (pct >= 50) return "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800/60"
  return "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800/60"
}

/* ---------- Component ---------- */

export function QRSetupState({
  selectedClass,
  selectedSubject,
  selectedPeriod,
  onClassChange,
  onSubjectChange,
  onPeriodChange,
  onStart,
  canStart,
  classOptions,
  subjectOptions,
  periodOptions,
  recentSessions,
  recentSessionsLoading,
  periodAutoFilled,
}: QRSetupStateProps) {
  const [dateFilter, setDateFilter] = useState<"today" | "week" | "all">("today")
  const [classFilterLocal, setClassFilterLocal] = useState("all")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const uniqueClasses = useMemo(() => {
    const set = new Set<string>()
    recentSessions.forEach((s) => set.add(s.class))
    return Array.from(set).sort()
  }, [recentSessions])

  const filteredSessions = useMemo(() => {
    return recentSessions.filter((session) => {
      let passDate = true
      if (dateFilter === "today") {
        passDate = getDayLabel(session.date) === "Today"
      } else if (dateFilter === "week") {
        const parts = session.date.split("/")
        if (parts.length === 3) {
          const d = parseInt(parts[0])
          const m = parseInt(parts[1]) - 1
          const y = parseInt(parts[2])
          const sessionDate = new Date(y, m, d)
          sessionDate.setHours(0, 0, 0, 0)

          const today = new Date()
          today.setHours(0, 0, 0, 0)

          const diffDays = Math.round((today.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24))
          passDate = diffDays <= 7 && diffDays >= 0
        }
      }

      let passClass = true
      if (classFilterLocal !== "all") {
        passClass = session.class === classFilterLocal
      }

      return passDate && passClass
    })
  }, [recentSessions, dateFilter, classFilterLocal])

  const grouped = useMemo(() => groupSessions(filteredSessions), [filteredSessions])

  // Selected period formatting for trigger display
  const selectedPeriodParsed = useMemo(() => {
    if (!selectedPeriod) return null
    const opt = periodOptions.find((o) => o.value === selectedPeriod)
    return opt ? parsePeriodLabel(opt.label) : null
  }, [selectedPeriod, periodOptions])

  return (
    <div className="flex flex-col gap-6">
      {/* ── Setup Card ── */}
      <Card className="border-border shadow-2xs overflow-hidden">
        <CardHeader className="pb-3.5 border-b border-border/60 bg-muted/10">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <QrCode className="size-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-foreground">
                Start Live Attendance Window
              </CardTitle>
              <CardDescription className="text-[11px] text-muted-foreground">
                Configure your lecture session parameters and generate a dynamic rotating QR code
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 flex flex-col gap-5">
          {/* Premium Connected Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center rounded-xl border border-border/80 bg-muted/20 shadow-2xs w-full overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-border/80">
            {/* Class Select */}
            <div className="flex items-center gap-3 px-4 py-3 sm:py-2.5 flex-1 bg-card hover:bg-muted/30 transition-colors">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <Users className="size-4" />
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
                  Class & Section
                </span>
                {!mounted ? (
                  <div className="flex items-center justify-between font-semibold text-xs sm:text-sm text-muted-foreground w-full py-0.5">
                    <span className="truncate">
                      {classOptions.find((o) => o.value === selectedClass)?.label || "Select class cohort"}
                    </span>
                    <ChevronDown className="size-4 opacity-50 shrink-0 ml-auto" />
                  </div>
                ) : (
                  <Select value={selectedClass} onValueChange={onClassChange}>
                    <SelectTrigger className="border-0 bg-transparent p-0 h-auto shadow-none focus:ring-0 focus:ring-offset-0 font-semibold text-xs sm:text-sm w-full outline-none [&>svg]:opacity-50 hover:bg-transparent cursor-pointer">
                      <SelectValue placeholder="Select class cohort" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border shadow-md">
                      {classOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs font-semibold py-2">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Subject Select */}
            <div className="flex items-center gap-3 px-4 py-3 sm:py-2.5 flex-1 bg-card hover:bg-muted/30 transition-colors">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <BookOpen className="size-4" />
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
                  Subject Curriculum
                </span>
                {!mounted ? (
                  <div className="flex items-center justify-between font-semibold text-xs sm:text-sm text-muted-foreground w-full py-0.5">
                    <span className="truncate">
                      {subjectOptions.find((o) => o.value === selectedSubject)?.label || "Select subject"}
                    </span>
                    <ChevronDown className="size-4 opacity-50 shrink-0 ml-auto" />
                  </div>
                ) : (
                  <Select value={selectedSubject} onValueChange={onSubjectChange}>
                    <SelectTrigger className="border-0 bg-transparent p-0 h-auto shadow-none focus:ring-0 focus:ring-offset-0 font-semibold text-xs sm:text-sm w-full outline-none [&>svg]:opacity-50 hover:bg-transparent cursor-pointer">
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border shadow-md">
                      {subjectOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs font-semibold py-2">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Period Select (Fixed formatting) */}
            <div className="flex items-center gap-3 px-4 py-3 sm:py-2.5 flex-1 bg-card hover:bg-muted/30 transition-colors relative">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Clock className="size-4" />
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Timetable Period
                  </span>
                  {periodAutoFilled && (
                    <span className="text-[9px] font-extrabold text-primary bg-primary/10 px-1.5 py-0.2 rounded-md uppercase tracking-wider border border-primary/20">
                      Auto-matched
                    </span>
                  )}
                </div>
                {!mounted ? (
                  <div className="flex items-center justify-between font-semibold text-xs sm:text-sm text-muted-foreground w-full py-0.5">
                    {selectedPeriodParsed ? (
                      <span className="flex items-center gap-2 truncate">
                        <span className="font-bold text-primary">P{selectedPeriodParsed.periodNum}</span>
                        <span className="font-mono text-xs text-muted-foreground">{selectedPeriodParsed.timeRange}</span>
                      </span>
                    ) : (
                      <span className="truncate">Select period slot</span>
                    )}
                    <ChevronDown className="size-4 opacity-50 shrink-0 ml-auto" />
                  </div>
                ) : (
                  <Select value={selectedPeriod} onValueChange={onPeriodChange}>
                    <SelectTrigger className="border-0 bg-transparent p-0 h-auto shadow-none focus:ring-0 focus:ring-offset-0 font-semibold text-xs sm:text-sm w-full outline-none [&>svg]:opacity-50 hover:bg-transparent cursor-pointer">
                      {selectedPeriodParsed ? (
                        <span className="flex items-center gap-2 truncate">
                          <span className="font-bold text-primary">P{selectedPeriodParsed.periodNum}</span>
                          <span className="font-mono text-xs text-muted-foreground">{selectedPeriodParsed.timeRange}</span>
                        </span>
                      ) : (
                        <SelectValue placeholder="Select period slot" />
                      )}
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border shadow-md min-w-64">
                      {periodOptions.map((opt) => {
                        const parsed = parsePeriodLabel(opt.label)
                        return (
                          <SelectItem key={opt.value} value={opt.value} className="py-2.5">
                            <div className="flex items-center justify-between w-full gap-3">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex size-6 items-center justify-center rounded-md bg-primary/15 text-primary text-xs font-black">
                                  P{parsed.periodNum || opt.label[0]}
                                </span>
                                <span className="font-bold text-xs text-foreground">
                                  {parsed.periodText}
                                </span>
                              </div>
                              {parsed.timeRange && (
                                <span className="font-mono text-[11px] text-muted-foreground rounded border border-border/60 bg-muted/40 px-2 py-0.5">
                                  {parsed.timeRange}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
            <Button
              size="lg"
              className="gap-2 font-bold shadow-xs hover:shadow transition-all sm:w-auto h-11 px-5 rounded-xl cursor-pointer"
              disabled={!canStart}
              onClick={onStart}
            >
              <QrCode className="size-4.5" />
              <span>Open Attendance Window</span>
              <ArrowRight className="size-4" />
            </Button>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="size-4 text-emerald-500 shrink-0" />
              <span>Geofencing and facial verification are automatically enforced</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Recent Sessions — Grouped ── */}
      <Card className="border-border shadow-2xs overflow-hidden">
        <CardHeader className="pb-3.5 border-b border-border/60 bg-muted/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-slate-500/10 text-slate-700 dark:text-slate-300">
                <CalendarDays className="size-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-foreground">
                  Recent Attendance Sessions
                </CardTitle>
                <CardDescription className="text-[11px] text-muted-foreground">
                  History of completed and finalized lecture sessions
                </CardDescription>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              {/* Date Filter Pills */}
              <div className="flex items-center rounded-xl p-1 bg-muted/50 border border-border/70">
                {(["today", "week", "all"] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setDateFilter(opt)}
                    className={cn(
                      "px-3 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer",
                      dateFilter === opt
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {opt === "today" ? "Today" : opt === "week" ? "This Week" : "All"}
                  </button>
                ))}
              </div>

              {/* Class Filter Dropdown */}
              <div className="flex items-center h-8.5 rounded-xl border border-border bg-card px-2.5 shadow-2xs">
                <Users className="size-3.5 text-muted-foreground mr-1.5 shrink-0" />
                {!mounted ? (
                  <div className="h-full border-0 bg-transparent p-0 text-xs font-semibold flex items-center justify-between w-full text-foreground">
                    <span>{classFilterLocal === "all" ? "All Cohorts" : classFilterLocal}</span>
                    <ChevronDown className="size-4 opacity-50 shrink-0 ml-1" />
                  </div>
                ) : (
                  <Select value={classFilterLocal} onValueChange={setClassFilterLocal}>
                    <SelectTrigger className="h-full border-0 bg-transparent p-0 text-xs font-semibold focus:ring-0 focus:ring-offset-0 shadow-none outline-none [&>svg]:opacity-50">
                      <SelectValue placeholder="All Cohorts" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border shadow-md">
                      <SelectItem value="all" className="text-xs font-semibold">All Cohorts</SelectItem>
                      {uniqueClasses.map((c) => (
                        <SelectItem key={c} value={c} className="text-xs font-semibold">
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          {recentSessionsLoading ? (
            <RecentSessionsSkeleton />
          ) : filteredSessions.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground bg-muted/10 rounded-xl border border-dashed border-border/80">
              <CalendarDays className="mx-auto size-8 text-muted-foreground/40 mb-2" />
              <p className="font-semibold text-xs">
                {recentSessions.length === 0 ? "No recent sessions recorded." : "No sessions match your filter criteria."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {Array.from(grouped.entries()).map(([day, sectionMap]) => (
                <div key={day} className="flex flex-col gap-3">
                  {/* Day header */}
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider">{day}</span>
                    <div className="flex-1 h-px bg-border/80" />
                    <span className="text-[11px] text-muted-foreground font-medium">
                      {Array.from(sectionMap.values()).flat().length} session{Array.from(sectionMap.values()).flat().length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Sections within day */}
                  <div className="flex flex-col gap-3 pl-1 sm:pl-3 border-l-2 border-border/60">
                    {Array.from(sectionMap.entries()).map(([section, sessions]) => (
                      <div key={section} className="flex flex-col gap-2">
                        {/* Section header */}
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-primary font-mono bg-primary/10 rounded-md border border-primary/20 px-2 py-0.5">
                            {section}
                          </span>
                          <span className="text-[11px] text-muted-foreground font-medium">
                            {sessions.length} {sessions.length === 1 ? "session" : "sessions"}
                          </span>
                        </div>

                        {/* Subject rows within section */}
                        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-2xs">
                          {sessions.map((session, i) => {
                            const pct = getAttendancePct(session.present, session.total)
                            return (
                              <div
                                key={i}
                                className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors"
                              >
                                {/* Subject + period */}
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs border border-primary/20">
                                    {session.period}
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <p className="text-xs font-bold text-foreground truncate">
                                      {session.subject}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                      <Clock className="size-3 text-muted-foreground/70 shrink-0" />
                                      <span>{session.time}</span>
                                    </p>
                                  </div>
                                </div>

                                {/* Attendance metrics & status */}
                                <div className="flex items-center gap-3 shrink-0">
                                  <div className="text-right">
                                    <p className="text-xs font-bold text-foreground">
                                      <span className="text-emerald-600 dark:text-emerald-400">{session.present}</span>
                                      <span className="text-muted-foreground">/{session.total}</span>
                                    </p>
                                    {pct !== null && (
                                      <p className="text-[10px] text-muted-foreground font-semibold">{pct}% turnout</p>
                                    )}
                                  </div>

                                  {pct !== null && (
                                    <Badge variant="outline" className={cn("text-[10px] font-bold px-2 py-0.5", getPctBadge(pct))}>
                                      {session.status}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}