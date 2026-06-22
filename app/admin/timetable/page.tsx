"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Plus,
  Trash2,
  Loader2,
  LayoutGrid,
  AlignJustify,
  GraduationCap,
  CalendarDays,
  Clock,
  BookOpen,
  ChevronDown,
  ChevronRight,
  X,
  Layers,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

/* ---------- Constants ---------- */
const DAYS = [
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
]

function getDayLabel(n: number) {
  return DAYS.find((d) => d.value === n)?.label ?? "—"
}

function getTodayDayValue(): number {
  const d = new Date().getDay() // 0=Sun,1=Mon,...6=Sat
  return d === 0 ? 7 : d // make Sunday 7 (not in our range)
}

const SUBJECT_COLORS = [
  { bg: "bg-primary/10", text: "text-primary", border: "border-primary/30", dot: "bg-primary" },
  { bg: "bg-emerald-500/10", text: "text-emerald-700", border: "border-emerald-300", dot: "bg-emerald-500" },
  { bg: "bg-amber-500/10", text: "text-amber-700", border: "border-amber-300", dot: "bg-amber-500" },
  { bg: "bg-violet-500/10", text: "text-violet-700", border: "border-violet-300", dot: "bg-violet-500" },
  { bg: "bg-rose-500/10", text: "text-rose-700", border: "border-rose-300", dot: "bg-rose-500" },
  { bg: "bg-sky-500/10", text: "text-sky-700", border: "border-sky-300", dot: "bg-sky-500" },
  { bg: "bg-orange-500/10", text: "text-orange-700", border: "border-orange-300", dot: "bg-orange-500" },
]

/* ---------- Interfaces ---------- */
interface TimetableEntry {
  id: string
  day: number
  dayLabel: string
  period: string
  periodNumber: number
  periodStart: string
  periodEnd: string
  subject: string
  teacher: string
  classSection: string
}

interface ClassOption { id: string; label: string }
interface PeriodOption { id: string; label: string; number: number; start: string; end: string }
interface AssignmentOption {
  teacherId: string; teacherName: string
  subjectId: string; subjectName: string
  classId: string; classLabel: string
}

/* ---------- Component ---------- */
export default function TimetablePage() {
  const [entries, setEntries] = useState<TimetableEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [assignmentOptions, setAssignmentOptions] = useState<AssignmentOption[]>([])
  const [periodOptions, setPeriodOptions] = useState<PeriodOption[]>([])
  const [classOptions, setClassOptions] = useState<ClassOption[]>([])

  // View mode
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [selectedClassForGrid, setSelectedClassForGrid] = useState<string>("all")

  // Filters for list view
  const [filterDay, setFilterDay] = useState("all")
  const [filterClass, setFilterClass] = useState("all")

  // Collapsed groups in list view
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  // Sheets
  const [sheetOpen, setSheetOpen] = useState(false)
  const [bulkSheetOpen, setBulkSheetOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<TimetableEntry | null>(null)

  // Single add form
  const [formClassId, setFormClassId] = useState("")
  const [formAssignmentKey, setFormAssignmentKey] = useState("")
  const [formPeriodId, setFormPeriodId] = useState("")
  const [formDay, setFormDay] = useState("")

  // Bulk add form: { "dayValue__periodId": assignmentKey }
  const [bulkClassId, setBulkClassId] = useState("")
  const [bulkSlots, setBulkSlots] = useState<Record<string, string>>({})

  const todayValue = getTodayDayValue()

  /* ---- Subject color map (consistent per subject name) ---- */
  const subjectColorMap = useMemo(() => {
    const map: Record<string, number> = {}
    const names = Array.from(new Set(entries.map(e => e.subject)))
    names.forEach((name, i) => { map[name] = i % SUBJECT_COLORS.length })
    return map
  }, [entries])

  function getSubjectColor(name: string) {
    return SUBJECT_COLORS[subjectColorMap[name] ?? 0]
  }

  /* ---------- Fetch ---------- */
  const fetchDropdownData = useCallback(async () => {
    const supabase = createClient()
    const [assignmentsRes, periodsRes, classesRes] = await Promise.all([
      supabase.from("teacher_assignments").select(`teacher_id, subject_id, class_id, teacher:teachers ( id, user:users ( full_name ) ), subject:subjects ( id, name ), class:classes ( id, name, section )`),
      supabase.from("periods").select("id, period_number, start_time, end_time").order("period_number"),
      supabase.from("classes").select("id, name, section").order("name"),
    ])

    if (assignmentsRes.data) {
      setAssignmentOptions(assignmentsRes.data.map((a: any) => ({
        teacherId: a.teacher_id, teacherName: a.teacher?.user?.full_name ?? "Unknown",
        subjectId: a.subject_id, subjectName: a.subject?.name ?? "—",
        classId: a.class_id, classLabel: a.class ? `${a.class.name}-${a.class.section}` : "—",
      })))
    }
    if (periodsRes.data) {
      setPeriodOptions(periodsRes.data.map((p: any) => ({
        id: p.id, number: p.period_number,
        start: p.start_time.slice(0, 5), end: p.end_time.slice(0, 5),
        label: `Period ${p.period_number} (${p.start_time.slice(0, 5)} - ${p.end_time.slice(0, 5)})`,
      })))
    }
    if (classesRes.data) {
      setClassOptions(classesRes.data.map((c: any) => ({ id: c.id, label: `${c.name}-${c.section}` })))
    }
  }, [])

  const fetchEntries = useCallback(async () => {
    setIsLoading(true); setFetchError(null)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("timetables")
        .select(`id, day_of_week, teacher:teachers ( id, user:users ( full_name ) ), subject:subjects ( name ), class:classes ( name, section ), period:periods ( period_number, start_time, end_time )`)
        .order("day_of_week")

      if (error) { setFetchError("Failed to load timetable."); return }

      const mapped: TimetableEntry[] = (data || []).map((t: any) => ({
        id: t.id, day: t.day_of_week, dayLabel: getDayLabel(t.day_of_week),
        periodNumber: t.period?.period_number ?? 0,
        periodStart: t.period?.start_time?.slice(0, 5) ?? "",
        periodEnd: t.period?.end_time?.slice(0, 5) ?? "",
        period: t.period ? `Period ${t.period.period_number} (${t.period.start_time.slice(0, 5)} - ${t.period.end_time.slice(0, 5)})` : "—",
        subject: t.subject?.name ?? "—",
        teacher: t.teacher?.user?.full_name ?? "—",
        classSection: t.class ? `${t.class.name}-${t.class.section}` : "—",
      }))
      mapped.sort((a, b) => a.day - b.day || a.periodNumber - b.periodNumber)
      setEntries(mapped)
    } catch { setFetchError("An unexpected error occurred.") }
    finally { setIsLoading(false) }
  }, [])

  useEffect(() => { fetchDropdownData(); fetchEntries() }, [fetchDropdownData, fetchEntries])

  /* ---------- Derived data ---------- */
  const uniqueClasses = useMemo(() =>
    Array.from(new Set(entries.map(e => e.classSection))).filter(c => c !== "—").sort(),
    [entries])

  const filteredEntries = useMemo(() => entries.filter(e => {
    if (filterDay !== "all" && e.day !== parseInt(filterDay)) return false
    if (filterClass !== "all" && e.classSection !== filterClass) return false
    return true
  }), [entries, filterDay, filterClass])

  // Group list view by class then day
  const groupedEntries = useMemo(() => {
    const byClass: Record<string, Record<number, TimetableEntry[]>> = {}
    for (const e of filteredEntries) {
      if (!byClass[e.classSection]) byClass[e.classSection] = {}
      if (!byClass[e.classSection][e.day]) byClass[e.classSection][e.day] = []
      byClass[e.classSection][e.day].push(e)
    }
    return Object.entries(byClass).sort(([a], [b]) => a.localeCompare(b))
  }, [filteredEntries])

  // Grid view data for selected class
  const gridEntries = useMemo(() => {
    if (selectedClassForGrid === "all") return entries
    return entries.filter(e => e.classSection === selectedClassForGrid)
  }, [entries, selectedClassForGrid])

  // Build grid: period → day → entry
  const gridMap = useMemo(() => {
    const map: Record<number, Record<number, TimetableEntry[]>> = {}
    for (const e of gridEntries) {
      if (!map[e.periodNumber]) map[e.periodNumber] = {}
      if (!map[e.periodNumber][e.day]) map[e.periodNumber][e.day] = []
      map[e.periodNumber][e.day].push(e)
    }
    return map
  }, [gridEntries])

  const gridPeriods = useMemo(() =>
    periodOptions.filter(p => gridMap[p.number] && Object.keys(gridMap[p.number]).length > 0)
    .concat(periodOptions.filter(p => !gridMap[p.number]))
    .filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i)
    .sort((a, b) => a.number - b.number),
    [periodOptions, gridMap])

  function toggleGroup(key: string) {
    setCollapsedGroups(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  }

  const filteredAssignments = formClassId
    ? assignmentOptions.filter(a => a.classId === formClassId)
    : []

  const bulkFilteredAssignments = bulkClassId
    ? assignmentOptions.filter(a => a.classId === bulkClassId)
    : []

  /* ---------- Stats ---------- */
  const totalSlots = entries.length
  const coveredToday = entries.filter(e => e.day === todayValue).length
  const classesWithTimetable = new Set(entries.map(e => e.classSection)).size

  const conflictMap = useMemo(() => {
    const map: Record<string, { classSection: string; subject: string }> = {}
    entries.forEach(e => {
      map[`${e.teacher}__${e.day}__${e.periodNumber}`] = { classSection: e.classSection, subject: e.subject }
    })
    return map
  }, [entries])

  /* ---------- Handlers ---------- */
  async function handleAdd() {
    if (!formClassId || !formAssignmentKey || !formPeriodId || !formDay) {
      toast.error("Please fill all fields"); return
    }
    const assignment = assignmentOptions.find(a => `${a.teacherId}__${a.subjectId}__${a.classId}` === formAssignmentKey)
    if (!assignment) { toast.error("Invalid assignment selected"); return }

    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("timetables").insert({
        class_id: assignment.classId, subject_id: assignment.subjectId,
        teacher_id: assignment.teacherId, period_id: formPeriodId,
        day_of_week: parseInt(formDay),
      })
      if (error) {
        if (error.code === "23505") toast.error("This class already has a subject assigned to this period on this day.")
        else toast.error(`Failed: ${error.message}`)
        return
      }
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await supabase.from("system_logs").insert({ performed_by: user.id, action_type: "create", description: `Timetable entry added: ${assignment.subjectName} — ${assignment.classLabel} — ${getDayLabel(parseInt(formDay))}` })
      toast.success(`Added: ${assignment.subjectName} on ${getDayLabel(parseInt(formDay))}`)
      setSheetOpen(false); setFormClassId(""); setFormAssignmentKey(""); setFormPeriodId(""); setFormDay("")
      fetchEntries()
    } finally { setIsSubmitting(false) }
  }

  async function handleBulkAdd() {
    const slots = Object.entries(bulkSlots).filter(([, v]) => v && v !== "" && v !== "__skip__")
    if (!bulkClassId || slots.length === 0) { toast.error("Please select a class and fill at least one slot"); return }

    setIsSubmitting(true)
    let added = 0; let failed = 0
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      for (const [key, assignmentKey] of slots) {
        const [dayStr, periodId] = key.split("__")
        const assignment = assignmentOptions.find(a => `${a.teacherId}__${a.subjectId}__${a.classId}` === assignmentKey)
        if (!assignment) continue

        const { error } = await supabase.from("timetables").insert({
          class_id: assignment.classId, subject_id: assignment.subjectId,
          teacher_id: assignment.teacherId, period_id: periodId,
          day_of_week: parseInt(dayStr),
        })
        if (error) { failed++; continue }
        added++
        if (user) await supabase.from("system_logs").insert({ performed_by: user.id, action_type: "create", description: `Timetable entry added: ${assignment.subjectName} — ${assignment.classLabel} — ${getDayLabel(parseInt(dayStr))}` })
      }

      if (added > 0) toast.success(`${added} slot${added !== 1 ? "s" : ""} added successfully${failed > 0 ? ` (${failed} failed/duplicate)` : ""}`)
      else toast.error("No slots were added. They may already exist.")

      setBulkSheetOpen(false); setBulkClassId(""); setBulkSlots({})
      fetchEntries()
    } finally { setIsSubmitting(false) }
  }

  async function handleRemove() {
    if (!removeTarget) return
    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("timetables").delete().eq("id", removeTarget.id)
      if (error) { toast.error(`Failed: ${error.message}`); return }
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await supabase.from("system_logs").insert({ performed_by: user.id, action_type: "delete", description: `Timetable entry removed: ${removeTarget.subject} — ${removeTarget.classSection} — ${removeTarget.dayLabel}` })
      toast.success("Timetable entry removed")
      fetchEntries()
    } finally { setRemoveTarget(null); setIsSubmitting(false) }
  }

  return (
    <div className="flex flex-col gap-6">

      {/* ── Stat chips ── */}
      {!isLoading && (
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
            <CalendarDays className="size-3.5" />{totalSlots} Total Slots
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-700">
            <GraduationCap className="size-3.5" />{classesWithTimetable} Classes Scheduled
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-700">
            <Clock className="size-3.5" />{coveredToday} Periods Today
          </div>
        </div>
      )}

      {/* ── Controls ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* View toggle */}
          <div className="inline-flex gap-1 rounded-xl bg-muted/60 p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${viewMode === "grid" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <LayoutGrid className="size-3.5" /> Grid
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${viewMode === "list" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <AlignJustify className="size-3.5" /> List
            </button>
          </div>

          {/* Grid: class selector */}
          {viewMode === "grid" && (
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSelectedClassForGrid("all")}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${selectedClassForGrid === "all" ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
              >
                All Classes
              </button>
              {uniqueClasses.map(c => (
                <button
                  key={c}
                  onClick={() => setSelectedClassForGrid(c)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${selectedClassForGrid === c ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          {/* List: filters */}
          {viewMode === "list" && (
            <div className="flex flex-wrap gap-2">
              <Select value={filterDay} onValueChange={setFilterDay}>
                <SelectTrigger className="h-9 w-36 text-xs">
                  <CalendarDays className="size-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="All Days" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Days</SelectItem>
                  {DAYS.map(d => <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterClass} onValueChange={setFilterClass}>
                <SelectTrigger className="h-9 w-40 text-xs">
                  <GraduationCap className="size-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {uniqueClasses.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              {(filterDay !== "all" || filterClass !== "all") && (
                <Button variant="ghost" size="sm" className="h-9 gap-1 text-muted-foreground" onClick={() => { setFilterDay("all"); setFilterClass("all") }}>
                  <X className="size-3.5" /> Clear
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 self-start sm:self-auto">
          <Button variant="outline" size="sm" onClick={() => setBulkSheetOpen(true)} className="gap-2">
            <Layers className="size-4" />
            <span className="hidden sm:inline">Fill Week</span>
            <span className="sm:hidden">Bulk</span>
          </Button>
          <Button size="sm" onClick={() => setSheetOpen(true)} className="gap-2">
            <Plus className="size-4" />
            <span className="hidden sm:inline">Add Slot</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* ── Error ── */}
      {fetchError && (
        <Card><CardContent className="py-8 text-center">
          <p className="text-sm text-destructive">{fetchError}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={fetchEntries}>Retry</Button>
        </CardContent></Card>
      )}

      {/* ── Loading ── */}
      {isLoading && (
        <Card><CardContent className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </CardContent></Card>
      )}

      {/* ══════════════════════════════════════
          GRID VIEW
      ══════════════════════════════════════ */}
      {!isLoading && viewMode === "grid" && (
        <div className="overflow-x-auto">
          <div className="min-w-175">
            {entries.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No timetable entries yet. Click "Add Slot" or "Fill Week" to create one.</CardContent></Card>
            ) : (
              <div className="rounded-xl border border-border overflow-hidden">
                {/* Header row — days */}
                <div className="grid bg-muted/50" style={{ gridTemplateColumns: `120px repeat(6, 1fr)` }}>
                  <div className="px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-r border-border">
                    Period
                  </div>
                  {DAYS.map(d => (
                    <div
                      key={d.value}
                      className={`px-3 py-2.5 text-center border-r border-border last:border-r-0 ${d.value === todayValue ? "bg-primary/10" : ""}`}
                    >
                      <div className={`text-sm font-bold uppercase tracking-wide ${d.value === todayValue ? "text-primary" : "text-muted-foreground"}`}>
                        {d.short}
                      </div>
                      {d.value === todayValue && (
                        <div className="mt-0.5 text-[9px] font-semibold text-primary/70 uppercase tracking-widest">Today</div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Period rows */}
                {periodOptions.map((p, pi) => (
                  <div
                    key={p.id}
                    className="grid border-t border-border"
                    style={{ gridTemplateColumns: `120px repeat(6, 1fr)` }}
                  >
                    {/* Period label */}
                    <div className="flex flex-col justify-center px-3 py-3 border-r border-border bg-muted/20">
                      <span className="text-sm font-bold text-foreground">P{p.number}</span>
                      <span className="text-xs text-muted-foreground">{p.start}–{p.end}</span>
                    </div>

                    {/* Day cells */}
                    {DAYS.map(d => {
                      const cellEntries = gridMap[p.number]?.[d.value] ?? []
                      const isToday = d.value === todayValue

                      return (
                        <div
                          key={d.value}
                          className={`relative border-r border-border last:border-r-0 p-1.5 transition-colors flex flex-col gap-1 ${isToday ? "bg-primary/3" : ""}`}
                          style={{ minHeight: cellEntries.length > 1 ? `${cellEntries.length * 72}px` : "72px" }}
                        >
                          {cellEntries.length === 0 ? (
                            <div className={`flex-1 min-h-14 rounded-lg border-2 border-dashed border-border/40 flex items-center justify-center ${isToday ? "border-primary/20" : ""}`}>
                              <span className="text-[10px] text-muted-foreground/40">—</span>
                            </div>
                          ) : (
                            cellEntries.map((entry, ei) => {
                              const color = getSubjectColor(entry.subject)
                              return (
                                <div
                                  key={entry.id}
                                  className={`rounded-lg border p-2 flex flex-col gap-0.5 group cursor-pointer relative ${color.bg} ${color.border} ${isToday ? "shadow-sm" : ""}`}
                                  style={{ minHeight: "64px" }}
                                >
                                  <div className={`text-xs font-semibold leading-tight ${color.text} line-clamp-2`}>
                                    {entry.subject}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground truncate">{entry.teacher}</div>
                                  {selectedClassForGrid === "all" && (
                                    <div className="mt-auto">
                                      <span className={`text-[9px] font-bold rounded px-1 py-0.5 ${color.bg} ${color.text}`}>{entry.classSection}</span>
                                    </div>
                                  )}
                                  <button
                                    onClick={() => setRemoveTarget(entry)}
                                    className="absolute top-1 right-1 size-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 bg-destructive/10 hover:bg-destructive/20 transition-all"
                                  >
                                    <Trash2 className="size-3 text-destructive" />
                                  </button>
                                </div>
                              )
                            })
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}

            {/* Legend */}
            {entries.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {Array.from(new Set(gridEntries.map(e => e.subject))).map(subj => {
                  const c = getSubjectColor(subj)
                  return (
                    <div key={subj} className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border ${c.bg} ${c.text} ${c.border}`}>
                      <span className={`size-2 rounded-full ${c.dot}`} />
                      {subj}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          LIST VIEW — grouped by class → day
      ══════════════════════════════════════ */}
      {!isLoading && viewMode === "list" && (
        <div className="flex flex-col gap-3">
          {groupedEntries.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
              {entries.length === 0 ? 'No timetable entries yet.' : 'No entries match the selected filters.'}
            </CardContent></Card>
          ) : (
            groupedEntries.map(([classSection, dayMap]) => {
              const isClassCollapsed = collapsedGroups.has(classSection)
              const totalInClass = Object.values(dayMap).flat().length
              return (
                <Card key={classSection} className="overflow-hidden">
                  {/* Class header */}
                  <button
                    onClick={() => toggleGroup(classSection)}
                    className="flex w-full items-center justify-between bg-muted/40 px-5 py-3 text-left hover:bg-muted/60 transition-colors border-b border-border"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-7 items-center justify-center rounded-md bg-primary/10">
                        <GraduationCap className="size-3.5 text-primary" />
                      </div>
                      <span className="text-sm font-semibold text-foreground">{classSection}</span>
                      <Badge variant="secondary" className="text-xs">{totalInClass} slots</Badge>
                    </div>
                    {isClassCollapsed ? <ChevronRight className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
                  </button>

                  {!isClassCollapsed && (
                    <div className="flex flex-col">
                      {DAYS.filter(d => dayMap[d.value]).map((d, di) => {
                        const dayEntries = dayMap[d.value] || []
                        const isDayGroupKey = `${classSection}__${d.value}`
                        const isDayCollapsed = collapsedGroups.has(isDayGroupKey)
                        const isToday = d.value === todayValue

                        return (
                          <div key={d.value} className={di !== 0 ? "border-t border-border" : ""}>
                            {/* Day sub-header */}
                            <button
                              onClick={() => toggleGroup(isDayGroupKey)}
                              className={`flex w-full items-center justify-between px-5 py-2.5 text-left hover:bg-muted/30 transition-colors ${isToday ? "bg-primary/5" : "bg-muted/10"}`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold uppercase tracking-wide ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                                  {d.label} {isToday && "• Today"}
                                </span>
                                <span className="text-xs text-muted-foreground">{dayEntries.length} period{dayEntries.length !== 1 ? "s" : ""}</span>
                              </div>
                              {isDayCollapsed ? <ChevronRight className="size-3.5 text-muted-foreground" /> : <ChevronDown className="size-3.5 text-muted-foreground" />}
                            </button>

                            {!isDayCollapsed && (
                              <div className="hidden md:block">
                                <table className="w-full text-sm">
                                  <tbody>
                                    {dayEntries.map(e => {
                                      const color = getSubjectColor(e.subject)
                                      return (
                                        <tr key={e.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                                          <td className="px-5 py-2.5 w-8">
                                            <span className={`inline-flex size-6 items-center justify-center rounded-full text-[10px] font-bold ${color.bg} ${color.text}`}>
                                              {e.periodNumber}
                                            </span>
                                          </td>
                                          <td className="px-3 py-2.5 text-xs text-muted-foreground font-mono w-28">
                                            {e.periodStart}–{e.periodEnd}
                                          </td>
                                          <td className="px-3 py-2.5">
                                            <div className="flex items-center gap-2">
                                              <span className={`size-2 rounded-full ${color.dot}`} />
                                              <span className="text-sm font-medium text-foreground">{e.subject}</span>
                                            </div>
                                          </td>
                                          <td className="px-3 py-2.5 text-sm text-muted-foreground">{e.teacher}</td>
                                          <td className="px-5 py-2.5 text-right">
                                            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-destructive hover:bg-destructive/10" onClick={() => setRemoveTarget(e)}>
                                              <Trash2 className="size-3.5" /> Remove
                                            </Button>
                                          </td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {/* Mobile day entries */}
                            {!isDayCollapsed && (
                              <div className="flex flex-col gap-0 md:hidden">
                                {dayEntries.map((e, ei) => {
                                  const color = getSubjectColor(e.subject)
                                  return (
                                    <div key={e.id} className={`flex items-center justify-between px-4 py-3 ${ei !== 0 ? "border-t border-border" : ""}`}>
                                      <div className="flex items-center gap-3">
                                        <span className={`size-7 shrink-0 flex items-center justify-center rounded-full text-xs font-bold ${color.bg} ${color.text}`}>{e.periodNumber}</span>
                                        <div>
                                          <div className="text-sm font-medium text-foreground">{e.subject}</div>
                                          <div className="text-xs text-muted-foreground">{e.teacher} · {e.periodStart}–{e.periodEnd}</div>
                                        </div>
                                      </div>
                                      <Button variant="ghost" size="icon-sm" className="text-destructive hover:bg-destructive/10" onClick={() => setRemoveTarget(e)}>
                                        <Trash2 className="size-4" />
                                      </Button>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </Card>
              )
            })
          )}
        </div>
      )}

      {/* ══════════════════════════════════════
          ADD SINGLE SLOT SHEET
      ══════════════════════════════════════ */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add Timetable Slot</SheetTitle>
            <SheetDescription>Assign a subject and teacher to a specific day and period for a class.</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-5 py-6">
            <div className="flex flex-col gap-2">
              <Label className="flex items-center gap-1.5 text-sm font-medium"><GraduationCap className="size-3.5 text-muted-foreground" /> Class & Section</Label>
              <Select value={formClassId} onValueChange={v => { setFormClassId(v); setFormAssignmentKey("") }}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>{classOptions.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label className="flex items-center gap-1.5 text-sm font-medium"><BookOpen className="size-3.5 text-muted-foreground" /> Subject & Teacher</Label>
              <Select value={formAssignmentKey} onValueChange={setFormAssignmentKey} disabled={!formClassId}>
                <SelectTrigger><SelectValue placeholder={formClassId ? "Select subject" : "Select class first"} /></SelectTrigger>
                <SelectContent>
                  {filteredAssignments.map(a => <SelectItem key={`${a.teacherId}__${a.subjectId}__${a.classId}`} value={`${a.teacherId}__${a.subjectId}__${a.classId}`}>{a.subjectName} — {a.teacherName}</SelectItem>)}
                  {filteredAssignments.length === 0 && formClassId && <SelectItem value="none" disabled>No assignments found for this class</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label className="flex items-center gap-1.5 text-sm font-medium"><CalendarDays className="size-3.5 text-muted-foreground" /> Day</Label>
              <Select value={formDay} onValueChange={setFormDay}>
                <SelectTrigger><SelectValue placeholder="Select day" /></SelectTrigger>
                <SelectContent>{DAYS.map(d => <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label className="flex items-center gap-1.5 text-sm font-medium"><Clock className="size-3.5 text-muted-foreground" /> Period</Label>
              <Select value={formPeriodId} onValueChange={setFormPeriodId}>
                <SelectTrigger><SelectValue placeholder="Select period" /></SelectTrigger>
                <SelectContent>{periodOptions.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {(() => {
              if (formAssignmentKey && formDay && formPeriodId && formClassId) {
                const selectedAssignment = assignmentOptions.find(a => `${a.teacherId}__${a.subjectId}__${a.classId}` === formAssignmentKey);
                const selectedPeriod = periodOptions.find(p => p.id === formPeriodId);
                const selectedClassLabel = classOptions.find(c => c.id === formClassId)?.label;
                if (selectedAssignment && selectedPeriod && selectedClassLabel) {
                  const conflictEntry = conflictMap[`${selectedAssignment.teacherName}__${formDay}__${selectedPeriod.number}`];
                  if (conflictEntry && conflictEntry.classSection !== selectedClassLabel) {
                    return (
                      <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive">
                        ⚠ Conflict: {selectedAssignment.teacherName} is already assigned to {conflictEntry.classSection} — {conflictEntry.subject} on this day and period.
                      </div>
                    )
                  }

                  // Check if this subject is already scheduled for this class on this day
                  const isSameSubjectSameDay = entries.some(e =>
                    e.classSection === selectedClassLabel &&
                    e.day === parseInt(formDay) &&
                    e.subject === selectedAssignment.subjectName &&
                    e.periodNumber !== selectedPeriod.number
                  )

                  if (isSameSubjectSameDay) {
                    return (
                      <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                        ⚠ {selectedAssignment.subjectName} is already scheduled for {selectedClassLabel} on {getDayLabel(parseInt(formDay))}. Each subject should appear only once per day.
                      </div>
                    )
                  }
                }
              }
              return null;
            })()}
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
              Each class can only have one subject per period per day. Duplicates are rejected automatically.
            </div>
            <Button onClick={handleAdd} disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="size-4 animate-spin" />Adding...</> : <><Plus className="size-4" />Add Slot</>}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ══════════════════════════════════════
          BULK FILL WEEK SHEET
      ══════════════════════════════════════ */}
      <Sheet open={bulkSheetOpen} onOpenChange={v => { setBulkSheetOpen(v); if (!v) { setBulkClassId(""); setBulkSlots({}) } }}>
        <SheetContent className="overflow-y-auto max-w-[100vw] w-full sm:max-w-[100vw] p-4 sm:p-6">
          <SheetHeader>
            <SheetTitle>Fill Week Timetable</SheetTitle>
            <SheetDescription>Select a class, then assign subjects to each day × period slot at once.</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-5 py-6">
            {/* Class selector */}
            <div className="flex flex-col gap-2">
              <Label className="flex items-center gap-1.5 text-sm font-medium"><GraduationCap className="size-3.5 text-muted-foreground" /> Class & Section</Label>
              <Select value={bulkClassId} onValueChange={v => { setBulkClassId(v); setBulkSlots({}) }}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>{classOptions.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Grid of day × period */}
            {bulkClassId && periodOptions.length > 0 && (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-muted-foreground">Fill the slots you want to add. Leave empty to skip.</p>
                <div className="w-full">
                  <table className="w-full text-xs border-collapse table-fixed">
                    <thead>
                      <tr>
                        <th className="text-left px-1 sm:px-2 py-2 text-muted-foreground font-medium w-12 sm:w-20 text-[9px] sm:text-xs">Period</th>
                        {DAYS.map(d => (
                          <th key={d.value} className={`text-center px-0.5 sm:px-1 py-2 font-semibold text-[9px] sm:text-xs ${d.value === todayValue ? "text-primary" : "text-muted-foreground"}`}>
                            {d.short} {d.value === todayValue ? "•" : ""}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {periodOptions.map(p => (
                        <tr key={p.id} className="border-t border-border">
                          <td className="px-1 sm:px-2 py-2">
                            <div className="font-bold text-foreground text-sm">P{p.number}</div>
                            <div className="text-muted-foreground text-xs wrap-break-word">{p.start}</div>
                          </td>
                          {DAYS.map(d => {
                            const key = `${d.value}__${p.id}`
                            const val = bulkSlots[key] || ""
                            const existingEntry = entries.find(e => e.classSection === classOptions.find(c => c.id === bulkClassId)?.label && e.day === d.value && e.periodNumber === p.number)

                            return (
                              <td key={d.value} className={`px-0.5 sm:px-1 py-1 sm:py-1.5 ${d.value === todayValue ? "bg-primary/3" : ""}`}>
                                {existingEntry ? (
                                  <div className="rounded-md bg-muted px-1 sm:px-1.5 py-1 text-[9px] sm:text-[10px] text-muted-foreground text-center truncate" title="Already assigned">
                                    {existingEntry.subject.split(" ").map((w: string) => w[0]).join("").slice(0, 3)}
                                  </div>
                                ) : (
                                  <Select value={val} onValueChange={v => setBulkSlots(prev => ({ ...prev, [key]: v }))}>
                                    <SelectTrigger className="h-9 text-xs px-1 sm:px-1.5 min-w-0 w-full overflow-hidden">
                                      <SelectValue placeholder="—" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="__skip__">— Skip —</SelectItem>
                                      {bulkFilteredAssignments.map(a => {
                                        const currentBulkClassLabel = classOptions.find(c => c.id === bulkClassId)?.label;
                                        const conflictEntry = conflictMap[`${a.teacherName}__${d.value}__${p.number}`];
                                        const isConflict = conflictEntry && conflictEntry.classSection !== currentBulkClassLabel;

                                        const isAlreadySavedForDay = entries.some(e =>
                                          e.classSection === currentBulkClassLabel &&
                                          e.day === d.value &&
                                          e.subject === a.subjectName
                                        );

                                        // Check if this subject is already selected for this day in another period
                                        const isAlreadySelectedForDay = Object.entries(bulkSlots).some(([slotKey, slotVal]) => {
                                          if (slotVal === "__skip__" || slotVal === "") return false
                                          const [slotDay] = slotKey.split("__")
                                          if (parseInt(slotDay) !== d.value) return false
                                          if (slotKey === key) return false // skip current cell
                                          const slotAssignment = assignmentOptions.find(
                                            sa => `${sa.teacherId}__${sa.subjectId}__${sa.classId}` === slotVal
                                          )
                                          return slotAssignment?.subjectId === a.subjectId
                                        });

                                        const isDisabled = !!isConflict || isAlreadySelectedForDay || isAlreadySavedForDay;

                                        return (
                                          <SelectItem 
                                            key={`${a.teacherId}__${a.subjectId}__${a.classId}`} 
                                            value={`${a.teacherId}__${a.subjectId}__${a.classId}`}
                                            disabled={isDisabled}
                                            className={isDisabled ? "opacity-50 text-destructive" : ""}
                                          >
                                            {a.subjectName} — {a.teacherName}
                                            {isConflict && ` ⚠ busy in ${conflictEntry!.classSection}`}
                                            {!isConflict && (isAlreadySelectedForDay || isAlreadySavedForDay) && ` ⚠ already on ${DAYS.find(day => day.value === d.value)?.label}`}
                                          </SelectItem>
                                        );
                                      })}
                                    </SelectContent>
                                  </Select>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{Object.values(bulkSlots).filter(v => v && v !== "__skip__").length} slots selected</span>
                  <button onClick={() => setBulkSlots({})} className="text-destructive hover:underline">Clear all</button>
                </div>
                <Button onClick={handleBulkAdd} disabled={isSubmitting || Object.values(bulkSlots).filter(v => v && v !== "__skip__").length === 0}>
                  {isSubmitting ? <><Loader2 className="size-4 animate-spin" />Adding slots...</> : <><Layers className="size-4" />Add {Object.values(bulkSlots).filter(v => v && v !== "__skip__").length} Slot{Object.values(bulkSlots).filter(v => v && v !== "__skip__").length !== 1 ? "s" : ""}</>}
                </Button>
              </div>
            )}
            {bulkClassId && periodOptions.length === 0 && (
              <p className="text-sm text-muted-foreground">No periods configured. Add periods in Academic Structure first.</p>
            )}
            {!bulkClassId && (
              <div className="rounded-lg bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">Select a class above to start filling the timetable</div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Remove Dialog */}
      <AlertDialog open={!!removeTarget} onOpenChange={() => setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this timetable slot?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the slot from the weekly timetable.
              {removeTarget && (
                <span className="mt-2 block rounded-lg bg-muted/50 px-3 py-2 text-sm font-medium text-foreground">
                  {removeTarget.subject} — {removeTarget.classSection} — {removeTarget.dayLabel} — {removeTarget.period}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} className="bg-destructive text-white hover:bg-destructive/90" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}