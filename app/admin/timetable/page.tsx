"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useTimetableData } from "@/hooks/use-timetable"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { MyTimetableSkeleton } from "@/components/ui/skeletons"
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
  AlertTriangle,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

/* ---------- Constants ---------- */
const YEAR_OPTIONS = ["1st Year", "2nd Year", "3rd Year", "4th Year"]

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
  subjectCode?: string
  teacher: string
  classSection: string
}

interface ClassOption {
  id: string
  name: string
  section: string
  year: string
  label: string
  fullLabel: string
}
interface PeriodOption { id: string; label: string; number: number; start: string; end: string }
interface AssignmentOption {
  id: string
  teacherId: string
  teacherName: string
  subjectId: string
  subjectName: string
  subjectCode?: string
  classId: string
  classLabel: string
  classSection: string
  year: string | null
}

/* ---------- Component ---------- */
export default function TimetablePage() {
  const [entries, setEntries] = useState<TimetableEntry[]>([])
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
  const [formYear, setFormYear] = useState("")
  const [formClassId, setFormClassId] = useState("")
  const [formAssignmentKey, setFormAssignmentKey] = useState("")
  const [formPeriodId, setFormPeriodId] = useState("")
  const [formDay, setFormDay] = useState("")

  // Bulk add form: { "dayValue__periodId": assignmentKey }
  const [bulkYear, setBulkYear] = useState("")
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

  const queryClient = useQueryClient()
  const { data: timetablePageData, isLoading } = useTimetableData()

  useEffect(() => {
    if (!timetablePageData) return

    const init = async () => {
      await Promise.resolve()
      const { assignments, periods, classes, timetable } = timetablePageData

      setAssignmentOptions(assignments.map((a: any) => ({
        id: a.id ?? "",
        teacherId: a.teacher_id,
        teacherName: a.teacher?.user?.full_name ?? "Unknown",
        subjectId: a.subject_id,
        subjectName: a.subject?.name ?? "—",
        subjectCode: a.subject?.code ?? "",
        classId: a.class_id,
        classLabel: a.class ? `${a.class.name}-${a.class.section} · ${a.class.year ?? a.year}` : "—",
        classSection: a.class ? `${a.class.name}-${a.class.section}` : "—",
        year: a.year ?? a.class?.year ?? null,
      })))

      setPeriodOptions(periods.map((p: any) => ({
        id: p.id,
        number: p.period_number,
        start: p.start_time.slice(0, 5),
        end: p.end_time.slice(0, 5),
        label: `Period ${p.period_number} (${p.start_time.slice(0, 5)} - ${p.end_time.slice(0, 5)})`,
      })))

      setClassOptions(classes.map((c: any) => ({
        id: c.id,
        name: c.name,
        section: c.section,
        year: c.year,
        label: `${c.name}-${c.section}`,
        fullLabel: `${c.name}-${c.section} · ${c.year}`,
      })))

      const mapped: TimetableEntry[] = timetable.map((t: any) => ({
        id: t.id,
        day: t.day_of_week,
        dayLabel: getDayLabel(t.day_of_week),
        periodNumber: t.period?.period_number ?? 0,
        periodStart: t.period?.start_time?.slice(0, 5) ?? "",
        periodEnd: t.period?.end_time?.slice(0, 5) ?? "",
        period: t.period ? `Period ${t.period.period_number} (${t.period.start_time.slice(0, 5)} - ${t.period.end_time.slice(0, 5)})` : "—",
        subject: t.subject?.name ?? "—",
        subjectCode: t.subject?.code ?? "",
        teacher: t.teacher?.user?.full_name ?? "Unassigned",
        classSection: t.class ? `${t.class.name}-${t.class.section} · ${t.class.year}` : "—",
      }))
      mapped.sort((a, b) => a.day - b.day || a.periodNumber - b.periodNumber)
      setEntries(mapped)
    }
    init()
  }, [timetablePageData])

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

  const formAvailableClasses = useMemo(() => {
    if (!formYear) return []
    return classOptions.filter(c => c.year === formYear)
  }, [classOptions, formYear])

  const bulkAvailableClasses = useMemo(() => {
    if (!bulkYear) return []
    return classOptions.filter(c => c.year === bulkYear)
  }, [classOptions, bulkYear])

  const filteredAssignments = useMemo(() => {
    if (!formClassId) return []
    return assignmentOptions.filter(a => a.classId === formClassId)
  }, [formClassId, assignmentOptions])

  const bulkFilteredAssignments = useMemo(() => {
    if (!bulkClassId) return []
    return assignmentOptions.filter(a => a.classId === bulkClassId)
  }, [bulkClassId, assignmentOptions])

  function handleFormYearChange(year: string) {
    setFormYear(year)
    setFormClassId("")
    setFormAssignmentKey("")
  }

  function handleFormClassChange(classId: string) {
    setFormClassId(classId)
    if (!classId) {
      setFormAssignmentKey("")
      return
    }
    const matchingAssignments = assignmentOptions.filter(a => a.classId === classId)
    if (matchingAssignments.length === 1) {
      const single = matchingAssignments[0]
      setFormAssignmentKey(`${single.teacherId}__${single.subjectId}__${single.classId}__${single.year ?? ""}`)
    } else {
      setFormAssignmentKey("")
    }
  }

  function resetForm() {
    setFormYear("")
    setFormClassId("")
    setFormAssignmentKey("")
    setFormPeriodId("")
    setFormDay("")
  }

  function resetBulkForm() {
    setBulkYear("")
    setBulkClassId("")
    setBulkSlots({})
  }

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
    if (!formYear || !formClassId || !formAssignmentKey || !formPeriodId || !formDay) {
      toast.error("Please fill all required fields including Academic Year"); return
    }
    const selectedClass = classOptions.find(c => c.id === formClassId)
    if (!selectedClass || selectedClass.year !== formYear) {
      toast.error("Selected class does not match the chosen academic year"); return
    }
    const assignment = assignmentOptions.find(a =>
      (`${a.teacherId}__${a.subjectId}__${a.classId}__${a.year ?? ""}` === formAssignmentKey ||
       `${a.teacherId}__${a.subjectId}__${a.classId}` === formAssignmentKey) &&
      a.classId === formClassId
    )
    if (!assignment) { toast.error("Invalid assignment selected for this class"); return }

    const selectedPeriod = periodOptions.find(p => p.id === formPeriodId)
    if (!selectedPeriod) { toast.error("Invalid period selected"); return }

    // Check conflict
    const conflictKey = `${assignment.teacherName}__${formDay}__${selectedPeriod.number}`
    const conflict = conflictMap[conflictKey]
    if (conflict && conflict.classSection !== selectedClass.fullLabel) {
      toast.error(`Teacher conflict: ${assignment.teacherName} is already teaching ${conflict.classSection} at this time`)
      return
    }

    // Check same subject on same day
    const isSameSubjectSameDay = entries.some(e =>
      e.classSection === selectedClass.fullLabel &&
      e.day === parseInt(formDay) &&
      e.subject === assignment.subjectName &&
      e.periodNumber !== selectedPeriod.number
    )
    if (isSameSubjectSameDay) {
      toast.error(`${assignment.subjectName} is already scheduled for ${selectedClass.label} on ${getDayLabel(parseInt(formDay))}`)
      return
    }

    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("timetables").insert({
        class_id: assignment.classId,
        subject_id: assignment.subjectId,
        teacher_id: assignment.teacherId,
        teacher_assignment_id: assignment.id || undefined,
        period_id: formPeriodId,
        day_of_week: parseInt(formDay),
      })
      if (error) {
        if (error.code === "23505") toast.error("This class already has a subject assigned to this period on this day.")
        else toast.error(`Failed: ${error.message}`)
        return
      }
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from("system_logs").insert({
          performed_by: user.id,
          action_type: "create",
          description: `Timetable entry added: ${assignment.subjectName} — ${assignment.classLabel} — ${getDayLabel(parseInt(formDay))}`
        })
      }
      toast.success(`Added: ${assignment.subjectName} on ${getDayLabel(parseInt(formDay))}`)
      setSheetOpen(false)
      resetForm()
      queryClient.invalidateQueries({ queryKey: ["admin-timetable"] })
    } finally { setIsSubmitting(false) }
  }

  async function handleBulkAdd() {
    const slots = Object.entries(bulkSlots).filter(([, v]) => v && v !== "" && v !== "__skip__")
    if (!bulkYear || !bulkClassId || slots.length === 0) {
      toast.error("Please select an academic year, target class, and fill at least one slot")
      return
    }

    setIsSubmitting(true)
    let added = 0; let failed = 0
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      for (const [key, assignmentKey] of slots) {
        const [dayStr, periodId] = key.split("__")
        const assignment = assignmentOptions.find(a =>
          (`${a.teacherId}__${a.subjectId}__${a.classId}__${a.year ?? ""}` === assignmentKey ||
           `${a.teacherId}__${a.subjectId}__${a.classId}` === assignmentKey) &&
          a.classId === bulkClassId
        )
        if (!assignment) continue

        const { error } = await supabase.from("timetables").insert({
          class_id: assignment.classId,
          subject_id: assignment.subjectId,
          teacher_id: assignment.teacherId,
          teacher_assignment_id: assignment.id || undefined,
          period_id: periodId,
          day_of_week: parseInt(dayStr),
        })
        if (error) { failed++; continue }
        added++
        if (user) {
          await supabase.from("system_logs").insert({
            performed_by: user.id,
            action_type: "create",
            description: `Timetable entry added: ${assignment.subjectName} — ${assignment.classLabel} — ${getDayLabel(parseInt(dayStr))}`
          })
        }
      }

      if (added > 0) toast.success(`${added} slot${added !== 1 ? "s" : ""} added successfully${failed > 0 ? ` (${failed} failed/duplicate)` : ""}`)
      else toast.error("No slots were added. They may already exist.")

      setBulkSheetOpen(false)
      resetBulkForm()
      queryClient.invalidateQueries({ queryKey: ["admin-timetable"] })
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
      queryClient.invalidateQueries({ queryKey: ["admin-timetable"] })
    } finally { setRemoveTarget(null); setIsSubmitting(false) }
  }

  return (
    <div className="flex flex-col gap-6">

      {/* ── Stat chips ── */}
      {!isLoading && (
        <div className="flex flex-wrap gap-2.5">
          <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary shadow-2xs">
            <CalendarDays className="size-3.5" />
            <span>{totalSlots} Total Slots</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 shadow-2xs">
            <GraduationCap className="size-3.5" />
            <span>{classesWithTimetable} Classes Scheduled</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 shadow-2xs">
            <Clock className="size-3.5" />
            <span>{coveredToday} Periods Today</span>
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
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${viewMode === "grid" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
            >
              <LayoutGrid className="size-3.5" /> Grid
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${viewMode === "list" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
            >
              <AlignJustify className="size-3.5" /> List
            </button>
          </div>

          {/* Grid: class selector */}
          {viewMode === "grid" && (
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSelectedClassForGrid("all")}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${selectedClassForGrid === "all" ? "bg-primary text-primary-foreground shadow-xs" : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                All Classes
              </button>
              {uniqueClasses.map(c => (
                <button
                  key={c}
                  onClick={() => setSelectedClassForGrid(c)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${selectedClassForGrid === c ? "bg-primary text-primary-foreground shadow-xs" : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          {/* List: filters */}
          {viewMode === "list" && (
            <div className="flex flex-wrap gap-2 items-center">
              <Select value={filterDay} onValueChange={setFilterDay}>
                <SelectTrigger className="h-9 w-36 text-xs font-medium">
                  <CalendarDays className="size-3.5 mr-1 text-muted-foreground" />
                  <SelectValue placeholder="All Days" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Days</SelectItem>
                  {DAYS.map(d => <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterClass} onValueChange={setFilterClass}>
                <SelectTrigger className="h-9 w-40 text-xs font-medium">
                  <GraduationCap className="size-3.5 mr-1 text-muted-foreground" />
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {uniqueClasses.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              {(filterDay !== "all" || filterClass !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-xl border border-rose-200/80 bg-rose-50/60 dark:border-rose-900/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 hover:bg-rose-100/80 dark:hover:bg-rose-950/40 text-xs font-semibold px-3 gap-1.5 shadow-2xs transition-all cursor-pointer"
                  onClick={() => { setFilterDay("all"); setFilterClass("all") }}
                >
                  <X className="size-3.5" /> Clear
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 self-start sm:self-auto">
          <Button variant="outline" size="sm" onClick={() => setBulkSheetOpen(true)} className="h-9 rounded-xl font-semibold gap-2 shadow-2xs hover:shadow transition-all cursor-pointer">
            <Layers className="size-4" />
            <span className="hidden sm:inline">Fill Week</span>
            <span className="sm:hidden">Bulk</span>
          </Button>
          <Button size="sm" onClick={() => setSheetOpen(true)} className="h-9 rounded-xl font-semibold gap-2 shadow-2xs hover:shadow transition-all cursor-pointer">
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
          <Button variant="outline" size="sm" className="mt-3" onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-timetable"] })}>Retry</Button>
        </CardContent></Card>
      )}

      {/* ── Loading ── */}
      {isLoading && <MyTimetableSkeleton />}

      {/* ══════════════════════════════════════
          GRID VIEW
      ══════════════════════════════════════ */}
      {!isLoading && viewMode === "grid" && (
        <div className="overflow-x-auto">
          <div className="min-w-175">
            {entries.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No timetable entries yet. Click &quot;Add Slot&quot; or &quot;Fill Week&quot; to create one.</CardContent></Card>
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
                                  <div className={`text-[11px] truncate ${entry.teacher === "Unassigned" ? "italic text-muted-foreground/60" : "text-muted-foreground"}`}>{entry.teacher}</div>
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
                                          <td className={`px-3 py-2.5 text-sm ${e.teacher === "Unassigned" ? "italic text-muted-foreground/60" : "text-muted-foreground"}`}>{e.teacher}</td>
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
                                          <div className="text-xs text-muted-foreground">
                                             <span className={e.teacher === "Unassigned" ? "italic text-muted-foreground/60" : ""}>{e.teacher}</span> · {e.periodStart}–{e.periodEnd}
                                           </div>
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
      <Sheet open={sheetOpen} onOpenChange={v => { setSheetOpen(v); if (!v) resetForm() }}>
        <SheetContent className="overflow-y-auto sm:max-w-md p-0 flex flex-col gap-0 border-l border-border bg-background">
          <SheetHeader className="p-6 border-b border-border/80 bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <CalendarDays className="size-5" />
              </div>
              <div className="flex flex-col">
                <SheetTitle className="text-base font-bold text-foreground">Add Timetable Slot</SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  Assign a subject and teacher to a specific day and period for a class
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
          <div className="flex flex-col gap-4.5 p-6 overflow-y-auto flex-1">
            {/* 1. Academic Year */}
            <div className="flex flex-col gap-1.5">
              <Label className="flex items-center gap-1.5 text-xs font-semibold text-foreground/90">
                <CalendarDays className="size-3.5 text-muted-foreground" /> Academic Year <span className="text-destructive">*</span>
              </Label>
              <Select value={formYear} onValueChange={handleFormYearChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select academic year" />
                </SelectTrigger>
                <SelectContent>
                  {YEAR_OPTIONS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* 2. Class & Section */}
            <div className="flex flex-col gap-1.5">
              <Label className="flex items-center gap-1.5 text-xs font-semibold text-foreground/90">
                <GraduationCap className="size-3.5 text-muted-foreground" /> Class & Section
              </Label>
              <Select value={formClassId} onValueChange={handleFormClassChange} disabled={!formYear}>
                <SelectTrigger className="w-full" disabled={!formYear}>
                  <SelectValue placeholder={!formYear ? "Select academic year first" : formAvailableClasses.length === 0 ? "No classes found" : "Select class & section"} />
                </SelectTrigger>
                <SelectContent>
                  {formAvailableClasses.length === 0 ? (
                    <SelectItem value="none" disabled>No classes found for {formYear}</SelectItem>
                  ) : (
                    formAvailableClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* 3. Subject & Teacher */}
            <div className="flex flex-col gap-1.5">
              <Label className="flex items-center gap-1.5 text-xs font-semibold text-foreground/90">
                <BookOpen className="size-3.5 text-muted-foreground" /> Subject & Teacher
              </Label>
              <Select value={formAssignmentKey} onValueChange={setFormAssignmentKey} disabled={!formClassId || filteredAssignments.length === 0}>
                <SelectTrigger className="w-full" disabled={!formClassId || filteredAssignments.length === 0}>
                  <SelectValue placeholder={!formYear ? "Select academic year first" : !formClassId ? "Select class first" : filteredAssignments.length === 0 ? "No assignments available" : "Select subject & teacher"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredAssignments.length === 0 && formClassId ? (
                    <SelectItem value="none" disabled>No teacher assignments available for this class</SelectItem>
                  ) : (
                    filteredAssignments.map(a => {
                      const key = `${a.teacherId}__${a.subjectId}__${a.classId}__${a.year ?? ""}`
                      const currentClass = classOptions.find(c => c.id === formClassId)
                      const currentClassFullLabel = currentClass?.fullLabel ?? currentClass?.label ?? ""
                      const selectedPeriod = periodOptions.find(p => p.id === formPeriodId)

                      let isTeacherBusy = false
                      let busyConflictLabel = ""
                      let isAlreadyScheduledSameDay = false

                      if (formDay && selectedPeriod) {
                        const conflictKey = `${a.teacherName}__${formDay}__${selectedPeriod.number}`
                        const conflictEntry = conflictMap[conflictKey]
                        if (conflictEntry && conflictEntry.classSection !== currentClassFullLabel) {
                          isTeacherBusy = true
                          busyConflictLabel = conflictEntry.classSection
                        }

                        isAlreadyScheduledSameDay = entries.some(e =>
                          e.classSection === currentClassFullLabel &&
                          e.day === parseInt(formDay) &&
                          e.subject === a.subjectName &&
                          e.periodNumber !== selectedPeriod.number
                        )
                      }

                      const isDisabled = isTeacherBusy || isAlreadyScheduledSameDay
                      const subjectDisplay = a.subjectCode ? `${a.subjectName} (${a.subjectCode})` : a.subjectName

                      return (
                        <SelectItem
                          key={key}
                          value={key}
                          disabled={isDisabled}
                          className={isDisabled ? "opacity-60 text-muted-foreground" : ""}
                        >
                          <div className="flex items-center justify-between w-full gap-2">
                            <span>{subjectDisplay} — {a.teacherName}</span>
                            {isTeacherBusy && (
                              <span className="text-[11px] font-semibold text-destructive">
                                ⚠ Busy — {busyConflictLabel}
                              </span>
                            )}
                            {!isTeacherBusy && isAlreadyScheduledSameDay && (
                              <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                                ⚠ Already on {getDayLabel(parseInt(formDay))}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      )
                    })
                  )}
                </SelectContent>
              </Select>
              {formClassId && filteredAssignments.length === 0 && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  No teacher assignments available for this class and academic year. Create a faculty assignment first.
                </p>
              )}
            </div>

            {/* 4. Day of Week */}
            <div className="flex flex-col gap-1.5">
              <Label className="flex items-center gap-1.5 text-xs font-semibold text-foreground/90">
                <CalendarDays className="size-3.5 text-muted-foreground" /> Day of Week
              </Label>
              <Select value={formDay} onValueChange={setFormDay} disabled={!formClassId}>
                <SelectTrigger className="w-full" disabled={!formClassId}>
                  <SelectValue placeholder={!formClassId ? "Select class first" : "Select day"} />
                </SelectTrigger>
                <SelectContent>{DAYS.map(d => <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* 5. Class Period */}
            <div className="flex flex-col gap-1.5">
              <Label className="flex items-center gap-1.5 text-xs font-semibold text-foreground/90">
                <Clock className="size-3.5 text-muted-foreground" /> Class Period
              </Label>
              <Select value={formPeriodId} onValueChange={setFormPeriodId} disabled={!formClassId}>
                <SelectTrigger className="w-full" disabled={!formClassId}>
                  <SelectValue placeholder={!formClassId ? "Select class first" : "Select period"} />
                </SelectTrigger>
                <SelectContent>{periodOptions.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {(() => {
              if (formAssignmentKey && formDay && formPeriodId && formClassId) {
                const selectedAssignment = assignmentOptions.find(a => `${a.teacherId}__${a.subjectId}__${a.classId}__${a.year ?? ""}` === formAssignmentKey || `${a.teacherId}__${a.subjectId}__${a.classId}` === formAssignmentKey);
                const selectedPeriod = periodOptions.find(p => p.id === formPeriodId);
                const selectedClassLabel = classOptions.find(c => c.id === formClassId)?.label;
                if (selectedAssignment && selectedPeriod && selectedClassLabel) {
                  const conflictEntry = conflictMap[`${selectedAssignment.teacherName}__${formDay}__${selectedPeriod.number}`];
                  if (conflictEntry && conflictEntry.classSection !== selectedClassLabel) {
                    return (
                      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive flex items-start gap-2.5">
                        <AlertTriangle className="size-4 shrink-0 mt-0.5 text-destructive" />
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold">Faculty Schedule Conflict</span>
                          <span className="leading-relaxed">{selectedAssignment.teacherName} is already assigned to {conflictEntry.classSection} — {conflictEntry.subject} on this day and period.</span>
                        </div>
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
                      <div className="rounded-xl border border-amber-300/80 bg-linear-to-r from-amber-500/10 via-amber-500/5 to-transparent p-3.5 text-xs text-amber-800 dark:text-amber-300 dark:border-amber-800/60 flex items-start gap-2.5">
                        <AlertTriangle className="size-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-amber-900 dark:text-amber-200">Duplicate Subject on Same Day</span>
                          <span className="leading-relaxed">{selectedAssignment.subjectName} is already scheduled for {selectedClassLabel} on {getDayLabel(parseInt(formDay))}. Each subject should appear only once per day.</span>
                        </div>
                      </div>
                    )
                  }
                }
              }
              return null;
            })()}
            <div className="rounded-xl border border-border/80 bg-muted/40 p-3 text-xs text-muted-foreground flex items-center gap-2">
              <Clock className="size-3.5 text-muted-foreground shrink-0" />
              <span>Each class can only have one subject per period per day. Duplicates are rejected automatically.</span>
            </div>
            <Button
              onClick={handleAdd}
              className="mt-2 h-10.5 rounded-xl font-semibold shadow-sm hover:shadow transition-all gap-2 cursor-pointer"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Adding Timetable Slot...
                </>
              ) : (
                <>
                  <Plus className="size-4" />
                  Add Slot
                </>
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ══════════════════════════════════════
          BULK FILL WEEK SHEET
      ══════════════════════════════════════ */}
      <Sheet open={bulkSheetOpen} onOpenChange={v => { setBulkSheetOpen(v); if (!v) resetBulkForm() }}>
        <SheetContent className="overflow-y-auto max-w-[100vw] w-full sm:max-w-4xl p-0 flex flex-col gap-0 border-l border-border bg-background">
          <SheetHeader className="p-6 border-b border-border/80 bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Layers className="size-5" />
              </div>
              <div className="flex flex-col">
                <SheetTitle className="text-base font-bold text-foreground">Fill Week Timetable</SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  Select a class cohort, then assign subjects to each day × period slot simultaneously
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
          <div className="flex flex-col gap-5 p-6 overflow-y-auto flex-1">
            {/* Academic Year selector */}
            <div className="flex flex-col gap-1.5 max-w-sm">
              <Label className="flex items-center gap-1.5 text-xs font-semibold text-foreground/90">
                <CalendarDays className="size-3.5 text-muted-foreground" /> Academic Year <span className="text-destructive">*</span>
              </Label>
              <Select value={bulkYear} onValueChange={v => { setBulkYear(v); setBulkClassId(""); setBulkSlots({}) }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select academic year" />
                </SelectTrigger>
                <SelectContent>
                  {YEAR_OPTIONS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Target Class selector */}
            <div className="flex flex-col gap-1.5 max-w-sm">
              <Label className="flex items-center gap-1.5 text-xs font-semibold text-foreground/90">
                <GraduationCap className="size-3.5 text-muted-foreground" /> Target Class & Section <span className="text-destructive">*</span>
              </Label>
              <Select value={bulkClassId} onValueChange={v => { setBulkClassId(v); setBulkSlots({}) }} disabled={!bulkYear}>
                <SelectTrigger className="w-full" disabled={!bulkYear}>
                  <SelectValue placeholder={!bulkYear ? "Select academic year first" : bulkAvailableClasses.length === 0 ? "No classes found" : "Select class & section"} />
                </SelectTrigger>
                <SelectContent>{bulkAvailableClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Grid of day × period */}
            {bulkClassId && periodOptions.length > 0 && (
              <div className="flex flex-col gap-3.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Select subjects for desired slots. Blank slots will remain untouched.</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setBulkSlots({})}
                    className="h-7 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  >
                    Clear selections
                  </Button>
                </div>
                <div className="w-full overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-xs border-collapse table-fixed">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border">
                        <th className="text-left px-2 sm:px-3 py-2.5 text-muted-foreground font-semibold w-16 sm:w-24 text-[10px] sm:text-xs uppercase tracking-wide">Period</th>
                        {DAYS.map(d => (
                          <th key={d.value} className={`text-center px-1 sm:px-2 py-2.5 font-bold text-[10px] sm:text-xs uppercase tracking-wide ${d.value === todayValue ? "text-primary bg-primary/5" : "text-muted-foreground"}`}>
                            {d.short} {d.value === todayValue ? "•" : ""}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {periodOptions.map(p => (
                        <tr key={p.id} className="border-t border-border">
                          <td className="px-2 sm:px-3 py-2 bg-muted/20 border-r border-border">
                            <div className="font-bold text-foreground text-xs sm:text-sm">P{p.number}</div>
                            <div className="text-muted-foreground text-[10px] sm:text-xs font-mono">{p.start}–{p.end}</div>
                          </td>
                          {DAYS.map(d => {
                            const key = `${d.value}__${p.id}`
                            const val = bulkSlots[key] || ""
                            const targetClassObj = classOptions.find(c => c.id === bulkClassId)
                            const currentBulkClassFullLabel = targetClassObj?.fullLabel ?? targetClassObj?.label ?? ""
                            const existingEntry = entries.find(e => e.classSection === currentBulkClassFullLabel && e.day === d.value && e.periodNumber === p.number)

                            return (
                              <td key={d.value} className={`px-1 py-1.5 border-r border-border last:border-r-0 ${d.value === todayValue ? "bg-primary/3" : ""}`}>
                                {existingEntry ? (
                                  <div className="rounded-lg bg-muted/70 px-1.5 py-2 text-[10px] text-muted-foreground text-center font-medium truncate" title="Already scheduled">
                                    {existingEntry.subject}
                                  </div>
                                ) : (
                                  <Select value={val} onValueChange={v => setBulkSlots(prev => ({ ...prev, [key]: v }))}>
                                    <SelectTrigger className="h-8.5 text-xs px-2 min-w-0 w-full overflow-hidden rounded-lg">
                                      <SelectValue placeholder="—" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="__skip__">— Skip —</SelectItem>
                                      {bulkFilteredAssignments.map(a => {
                                        const conflictEntry = conflictMap[`${a.teacherName}__${d.value}__${p.number}`];
                                        const isConflict = conflictEntry && conflictEntry.classSection !== currentBulkClassFullLabel;

                                        const isAlreadySavedForDay = entries.some(e =>
                                          e.classSection === currentBulkClassFullLabel &&
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
                                            sa => `${sa.teacherId}__${sa.subjectId}__${sa.classId}__${sa.year ?? ""}` === slotVal || `${sa.teacherId}__${sa.subjectId}__${sa.classId}` === slotVal
                                          )
                                          return slotAssignment?.subjectId === a.subjectId
                                        });

                                        const isDisabled = !!isConflict || isAlreadySelectedForDay || isAlreadySavedForDay;
                                        const subjectDisplay = a.subjectCode ? `${a.subjectName} (${a.subjectCode})` : a.subjectName;

                                        return (
                                          <SelectItem 
                                            key={`${a.teacherId}__${a.subjectId}__${a.classId}__${a.year ?? ""}`} 
                                            value={`${a.teacherId}__${a.subjectId}__${a.classId}__${a.year ?? ""}`}
                                            disabled={isDisabled}
                                            className={isDisabled ? "opacity-50 text-destructive" : ""}
                                          >
                                            {subjectDisplay} — {a.teacherName}
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
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                  <span className="font-semibold text-foreground">{Object.values(bulkSlots).filter(v => v && v !== "__skip__").length} slots selected for bulk insert</span>
                </div>
                <Button
                  onClick={handleBulkAdd}
                  className="h-10.5 rounded-xl font-semibold shadow-sm hover:shadow transition-all gap-2 cursor-pointer"
                  disabled={isSubmitting || Object.values(bulkSlots).filter(v => v && v !== "__skip__").length === 0}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Adding slots to timetable...
                    </>
                  ) : (
                    <>
                      <Layers className="size-4" />
                      Add {Object.values(bulkSlots).filter(v => v && v !== "__skip__").length} Timetable Slot{Object.values(bulkSlots).filter(v => v && v !== "__skip__").length !== 1 ? "s" : ""}
                    </>
                  )}
                </Button>
              </div>
            )}
            {bulkClassId && periodOptions.length === 0 && (
              <p className="text-xs text-muted-foreground">No periods configured. Add periods in Academic Structure first.</p>
            )}
            {!bulkClassId && (
              <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-10 text-center text-xs text-muted-foreground">
                Select a class cohort above to view the week layout and fill timetable slots
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Remove Dialog */}
      <AlertDialog open={!!removeTarget} onOpenChange={() => setRemoveTarget(null)}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove timetable slot?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="flex flex-col gap-2.5 pt-1">
                <span className="text-xs text-muted-foreground">
                  This slot will be removed from the class schedule and become available again.
                </span>
                {removeTarget && (
                  <div className="flex flex-col gap-1 rounded-xl border border-border/70 bg-muted/40 p-3 text-xs">
                    <div className="font-bold text-foreground">{removeTarget.subject}</div>
                    <div className="text-muted-foreground font-medium flex items-center gap-1.5">
                      <span>{removeTarget.classSection}</span>
                      <span>•</span>
                      <span>{removeTarget.dayLabel}</span>
                      <span>•</span>
                      <span>{removeTarget.period}</span>
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2">
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} className="rounded-xl bg-destructive text-white hover:bg-destructive/90" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : "Remove Slot"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}