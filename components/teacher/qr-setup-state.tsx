"use client"

import { useMemo, useState } from "react"
import { QrCode, CalendarDays, Users, BookOpen, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

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

/* ---------- Grouping helpers ---------- */

function getDayLabel(dateStr: string): string {
  // dateStr is like "13/03/2026" from toLocaleDateString()
  // Parse it back to compare with today/yesterday
  const parts = dateStr.split("/")
  if (parts.length !== 3) return dateStr

  // Handle both DD/MM/YYYY and MM/DD/YYYY based on locale — use a safe approach
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  // Try to reconstruct date — DD/MM/YYYY format
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
// day -> section -> sessions[]

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

function getPctColor(pct: number) {
  if (pct >= 75) return "text-emerald-700"
  if (pct >= 50) return "text-amber-600"
  return "text-red-600"
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

  const uniqueClasses = useMemo(() => {
    const set = new Set<string>()
    recentSessions.forEach(s => set.add(s.class))
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

  return (
    <div className="flex flex-col gap-6">

      {/* ── Setup Card ── */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <QrCode className="size-4 text-primary" />
            </div>
            <CardTitle className="text-base font-semibold">Start Attendance Session</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {/* Premium Connected Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center rounded-2xl border border-border bg-card shadow-sm w-full overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-border">
            
            {/* Class Filter */}
            <div className="flex items-center gap-3 px-4 py-3 sm:py-2 flex-1">
              <Users className="size-4 text-muted-foreground shrink-0" />
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">Class & Section</span>
                <Select value={selectedClass} onValueChange={onClassChange}>
                  <SelectTrigger className="border-0 bg-transparent p-0 h-auto shadow-none focus:ring-0 focus:ring-offset-0 font-medium w-full outline-none [&>svg]:opacity-50 hover:bg-transparent">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classOptions.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Subject Filter */}
            <div className="flex items-center gap-3 px-4 py-3 sm:py-2 flex-1">
              <BookOpen className="size-4 text-muted-foreground shrink-0" />
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">Subject</span>
                <Select value={selectedSubject} onValueChange={onSubjectChange}>
                  <SelectTrigger className="border-0 bg-transparent p-0 h-auto shadow-none focus:ring-0 focus:ring-offset-0 font-medium w-full outline-none [&>svg]:opacity-50 hover:bg-transparent">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjectOptions.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Period Filter */}
            <div className="flex items-center gap-3 px-4 py-3 sm:py-2 flex-1 relative">
              <Clock className="size-4 text-muted-foreground shrink-0" />
              <div className="flex flex-col flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Period</span>
                  {periodAutoFilled && (
                    <span className="text-[9px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Auto</span>
                  )}
                </div>
                <Select value={selectedPeriod} onValueChange={onPeriodChange}>
                  <SelectTrigger className="border-0 bg-transparent p-0 h-auto shadow-none focus:ring-0 focus:ring-offset-0 font-medium w-full outline-none [&>svg]:opacity-50 hover:bg-transparent">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    {periodOptions.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-2">
            <Button
              size="lg"
              className="gap-2 font-semibold sm:w-auto"
              disabled={!canStart}
              onClick={onStart}
            >
              <QrCode className="size-5" />
              Open Attendance Window
            </Button>
            <p className="text-xs text-muted-foreground max-w-sm">
              Students must be inside campus and have marked college attendance before they can scan.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Recent Sessions — Grouped ── */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                <CalendarDays className="size-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-base font-semibold">Recent Sessions</CardTitle>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center rounded-lg p-0.5 bg-muted">
                {(["today", "week", "all"] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setDateFilter(opt)}
                    className={cn(
                      "px-2.5 py-1 text-xs rounded-md capitalize transition-colors",
                      dateFilter === opt
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-muted-foreground hover:text-foreground font-medium"
                    )}
                  >
                    {opt === "week" ? "This Week" : opt}
                  </button>
                ))}
              </div>

              <div className="flex items-center h-7 rounded-lg border border-border bg-card px-2">
                <Users className="size-3 text-muted-foreground mr-1.5 shrink-0" />
                <Select value={classFilterLocal} onValueChange={setClassFilterLocal}>
                  <SelectTrigger className="h-full border-0 bg-transparent p-0 text-xs focus:ring-0 focus:ring-offset-0 shadow-none outline-none [&>svg]:opacity-50">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {uniqueClasses.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {recentSessionsLoading ? (
            <div className="flex flex-col gap-3 py-4 border-t border-transparent">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`h-12 w-full rounded-lg bg-muted animate-pulse opacity-${Math.max(20, 100 - i * 20)}`} />
              ))}
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              {recentSessions.length === 0 ? "No recent sessions found." : "No sessions match your filters."}
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {Array.from(grouped.entries()).map(([day, sectionMap]) => (
                <div key={day}>
                  {/* Day header */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-bold text-foreground">{day}</span>
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">
                      {Array.from(sectionMap.values()).flat().length} session{Array.from(sectionMap.values()).flat().length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Sections within day */}
                  <div className="flex flex-col gap-3 pl-2">
                    {Array.from(sectionMap.entries()).map(([section, sessions]) => (
                      <div key={section}>
                        {/* Section header */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 rounded-full px-2.5 py-0.5">
                            {section}
                          </span>
                          <span className="text-xs text-muted-foreground">{sessions.length} session{sessions.length !== 1 ? "s" : ""}</span>
                        </div>

                        {/* Subject rows within section */}
                        <div className="rounded-xl border border-border bg-card overflow-hidden">
                          {sessions.map((session, i) => {
                            const pct = getAttendancePct(session.present, session.total)
                            return (
                              <div
                                key={i}
                                className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                              >
                                {/* Subject + period */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-foreground truncate">{session.subject}</p>
                                  <p className="text-xs text-muted-foreground">{session.period} Period · {session.time}</p>
                                </div>

                                {/* Attendance count */}
                                <div className="text-right shrink-0">
                                  <p className={cn("text-sm font-bold", pct !== null ? getPctColor(pct) : "text-muted-foreground")}>
                                    {session.present}/{session.total}
                                  </p>
                                  {pct !== null && (
                                    <p className={cn("text-xs", getPctColor(pct))}>{pct}%</p>
                                  )}
                                </div>

                                {/* Status badge */}
                                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 shrink-0 text-xs">
                                  {session.status}
                                </Badge>
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