"use client"

import { useState, useEffect, useCallback, useMemo, Fragment } from "react"
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
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
  Sparkles,
  Download,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { exportAdminTimetablePDF } from "@/lib/timetable-export"

/* ---------- Constants ---------- */
const YEAR_OPTIONS = ["1st Year", "2nd Year", "3rd Year", "4th Year"]

const YEAR_BADGE_THEMES: Record<string, { bg: string; text: string; border: string }> = {
  "1st Year": { bg: "bg-sky-500/10 dark:bg-sky-950/40", text: "text-sky-700 dark:text-sky-300", border: "border-sky-300/60 dark:border-sky-800/80" },
  "2nd Year": { bg: "bg-emerald-500/10 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-300/60 dark:border-emerald-800/80" },
  "3rd Year": { bg: "bg-amber-500/10 dark:bg-amber-950/40", text: "text-amber-700 dark:text-amber-300", border: "border-amber-300/60 dark:border-amber-800/80" },
  "4th Year": { bg: "bg-violet-500/10 dark:bg-violet-950/40", text: "text-violet-700 dark:text-violet-300", border: "border-violet-300/60 dark:border-violet-800/80" },
}

function getYearBadgeTheme(year: string) {
  return YEAR_BADGE_THEMES[year] || { bg: "bg-primary/10", text: "text-primary", border: "border-primary/30" }
}

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
  className?: string
  section?: string
  year?: string
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
function formatTeacherName(title?: string | null, fullName?: string | null): string {
  if (!fullName || fullName === "Unassigned" || fullName === "Unknown") return fullName || "Unassigned"
  const cleanName = fullName.trim()
  if (/^(mr|mrs|ms|dr|prof)\.?\s+/i.test(cleanName)) {
    return cleanName
  }
  const cleanTitle = title ? title.trim().replace(/\.+$/, "") : "Mr"
  return `${cleanTitle}. ${cleanName}`
}

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
      const { assignments, periods, classes, timetable, teachers = [] } = timetablePageData

      // Build a dedicated teacher lookup map (teacherId -> "Mrs. Devi", "Mr. Ram")
      const teacherMap = new Map<string, string>()
      teachers.forEach((t: any) => {
        const u = Array.isArray(t?.user) ? t.user[0] : t?.user
        const fullName = u?.full_name || ""
        const title = t?.title || ""
        if (t?.id && fullName) {
          teacherMap.set(t.id, formatTeacherName(title, fullName))
        }
      })

      assignments.forEach((a: any) => {
        const tObj = Array.isArray(a.teacher) ? a.teacher[0] : a.teacher
        const uObj = Array.isArray(tObj?.user) ? tObj.user[0] : tObj?.user
        const teacherId = a.teacher_id || tObj?.id
        const fullName = uObj?.full_name
        const title = tObj?.title
        if (teacherId && fullName && !teacherMap.has(teacherId)) {
          teacherMap.set(teacherId, formatTeacherName(title, fullName))
        }
      })

      setAssignmentOptions(assignments.map((a: any) => {
        const tObj = Array.isArray(a.teacher) ? a.teacher[0] : a.teacher
        const uObj = Array.isArray(tObj?.user) ? tObj.user[0] : tObj?.user
        const teacherId = a.teacher_id || tObj?.id
        const resolvedTeacher = teacherMap.get(teacherId) || formatTeacherName(tObj?.title, uObj?.full_name || "Unknown")
        return {
          id: a.id ?? "",
          teacherId: teacherId,
          teacherName: resolvedTeacher,
          subjectId: a.subject_id,
          subjectName: a.subject?.name ?? "—",
          subjectCode: a.subject?.code ?? "",
          classId: a.class_id,
          classLabel: a.class ? `${a.class.name}-${a.class.section} · ${a.class.year ?? a.year}` : "—",
          classSection: a.class ? `${a.class.name}-${a.class.section}` : "—",
          year: a.year ?? a.class?.year ?? null,
        }
      }))

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

      const mapped: TimetableEntry[] = timetable.map((t: any) => {
        const tObj = Array.isArray(t.teacher) ? t.teacher[0] : t.teacher
        const uObj = Array.isArray(tObj?.user) ? tObj.user[0] : tObj?.user
        const teacherId = t.teacher_id || tObj?.id
        const resolvedTeacher = teacherMap.get(teacherId) || formatTeacherName(tObj?.title, uObj?.full_name || "Unassigned")
        return {
          id: t.id,
          day: t.day_of_week,
          dayLabel: getDayLabel(t.day_of_week),
          periodNumber: t.period?.period_number ?? 0,
          periodStart: t.period?.start_time?.slice(0, 5) ?? "",
          periodEnd: t.period?.end_time?.slice(0, 5) ?? "",
          period: t.period ? `Period ${t.period.period_number} (${t.period.start_time.slice(0, 5)} - ${t.period.end_time.slice(0, 5)})` : "—",
          subject: t.subject?.name ?? "—",
          subjectCode: t.subject?.code ?? "",
          teacher: resolvedTeacher,
          classSection: t.class ? `${t.class.name}-${t.class.section} · ${t.class.year}` : "—",
          className: t.class?.name ?? "",
          section: t.class?.section ?? "",
          year: t.class?.year ?? "",
        }
      })
      mapped.sort((a, b) => a.day - b.day || a.periodNumber - b.periodNumber)
      setEntries(mapped)
    }
    init()
  }, [timetablePageData])

  /* ---------- Derived data ---------- */
  const uniqueClasses = useMemo(() =>
    Array.from(new Set(entries.map(e => e.classSection))).filter(c => c !== "—").sort(),
    [entries])

  const allAvailableClasses = useMemo(() => {
    const fromOptions = classOptions.map(c => c.fullLabel || `${c.name}-${c.section} · ${c.year}`).filter(Boolean)
    const fromEntries = entries.map(e => e.classSection).filter(c => c && c !== "—")
    return Array.from(new Set([...fromOptions, ...fromEntries])).sort()
  }, [classOptions, entries])

  const classCohortGroups = useMemo(() => {
    const groups: Record<string, string[]> = {}
    YEAR_OPTIONS.forEach(y => { groups[y] = [] })

    for (const c of allAvailableClasses) {
      const [, cYear] = c.includes(" · ") ? c.split(" · ") : [c, ""]
      const yearKey = cYear || "Other"
      if (!groups[yearKey]) groups[yearKey] = []
      groups[yearKey].push(c)
    }

    return Object.entries(groups).filter(([, items]) => items.length > 0)
  }, [allAvailableClasses])

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

  function openAddForSlot(dayVal: number, perId: string) {
    setFormDay(String(dayVal))
    setFormPeriodId(perId)
    if (selectedClassForGrid !== "all") {
      const match = classOptions.find(c => c.fullLabel === selectedClassForGrid)
      if (match) {
        setFormYear(match.year)
        setFormClassId(match.id)
        const matchingAssignments = assignmentOptions.filter(a => a.classId === match.id)
        if (matchingAssignments.length === 1) {
          const single = matchingAssignments[0]
          setFormAssignmentKey(`${single.teacherId}__${single.subjectId}__${single.classId}__${single.year ?? ""}`)
        }
      }
    }
    setSheetOpen(true)
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

  function handleDownloadPDF() {
    try {
      if (entries.length === 0) {
        toast.error("No timetable entries available to export.")
        return
      }

      if (selectedClassForGrid !== "all") {
        const classSlots = entries.filter((e) => e.classSection === selectedClassForGrid)
        if (classSlots.length === 0) {
          toast.error(`No timetable slots scheduled for ${selectedClassForGrid} yet. Please create slots first.`)
          return
        }
      }

      toast.info("Generating PDF timetable document...", { duration: 1500 })
      exportAdminTimetablePDF({
        entries: entries.map((e) => ({
          day: e.day,
          dayLabel: e.dayLabel,
          periodNumber: e.periodNumber,
          periodStart: e.periodStart,
          periodEnd: e.periodEnd,
          subject: e.subject,
          subjectCode: e.subjectCode,
          teacher: e.teacher,
          className: e.className,
          section: e.section,
          year: e.year,
          classSection: e.classSection,
        })),
        periods: periodOptions.map((p) => ({
          number: p.number,
          label: p.label,
          start: p.start,
          end: p.end,
        })),
        classes: classOptions.map((c) => ({
          id: c.id,
          name: c.name,
          section: c.section,
          year: c.year,
          label: c.label,
          fullLabel: c.fullLabel,
        })),
        selectedClassId: selectedClassForGrid,
        institutionName: "Campus Academic Timetable",
      })
      toast.success("Timetable PDF downloaded successfully!")
    } catch (err: any) {
      console.error("PDF export error:", err)
      toast.error(err?.message || "Failed to generate PDF. Please try again.")
    }
  }

  return (
    <div className="flex flex-col gap-6">

      {/* ── Global Print Styles ── */}
      <style jsx global>{`
        @media print {
          @page {
            size: landscape;
            margin: 10mm 10mm 10mm 10mm;
          }
          body {
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
            background: white !important;
            color: black !important;
          }
          header, nav, aside, [role="navigation"], .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>

      {/* ── Stat chips ── */}
      {!isLoading && (
        <div className="flex flex-wrap gap-2.5 print:hidden">
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

      {/* ── Controls Bar ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* View toggle */}
          <div className="inline-flex gap-1 rounded-xl bg-muted/60 p-1 border border-border/60 shadow-2xs">
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

          {/* Grid: Connected Cohort Selector Dropdown (Teacher Portal Style) */}
          {viewMode === "grid" && (
            <div className="flex items-center gap-2">
              <Select value={selectedClassForGrid} onValueChange={setSelectedClassForGrid}>
                <SelectTrigger className="h-9 w-auto min-w-44 max-w-60 text-xs font-semibold rounded-xl border border-border/80 bg-background shadow-2xs hover:bg-muted/30 transition-all cursor-pointer">
                  <div className="flex items-center gap-2 truncate">
                    <GraduationCap className="size-3.5 text-primary shrink-0" />
                    {selectedClassForGrid === "all" ? (
                      <span className="font-semibold text-foreground flex items-center gap-1.5 truncate">
                        <Sparkles className="size-3 text-amber-500 shrink-0" />
                        All Classes (Master Grid)
                      </span>
                    ) : (
                      (() => {
                        const [cName, cYear] = selectedClassForGrid.includes(" · ") ? selectedClassForGrid.split(" · ") : [selectedClassForGrid, ""]
                        const yTheme = getYearBadgeTheme(cYear)
                        return (
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="font-bold text-foreground">{cName}</span>
                            {cYear && (
                              <span className={`inline-flex items-center rounded-full px-2 py-0.2 text-[10px] font-bold border ${yTheme.bg} ${yTheme.text} ${yTheme.border}`}>
                                {cYear}
                              </span>
                            )}
                          </div>
                        )
                      })()
                    )}
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border shadow-lg min-w-56 py-1">
                  <SelectItem value="all" className="text-xs font-bold py-2 px-3 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Sparkles className="size-3.5 text-amber-500 shrink-0" />
                      <span>All Classes (Master Timetable)</span>
                    </div>
                  </SelectItem>
                  {classCohortGroups.map(([year, classList]) => {
                    const yTheme = getYearBadgeTheme(year)
                    return (
                      <Fragment key={year}>
                        <SelectSeparator className="my-1 bg-border/60" />
                        <SelectGroup>
                          <SelectLabel className="px-3 pt-1.5 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <span className={`size-1.5 rounded-full ${year.includes("2nd") ? "bg-emerald-500" : year.includes("1st") ? "bg-sky-500" : year.includes("3rd") ? "bg-amber-500" : "bg-violet-500"}`} />
                            {year}
                          </SelectLabel>
                          {classList.map(c => {
                            const [cName, cYear] = c.includes(" · ") ? c.split(" · ") : [c, ""]
                            const slotCount = entries.filter(e => e.classSection === c).length
                            return (
                              <SelectItem key={c} value={c} className="text-xs font-semibold py-1.5 px-3 cursor-pointer">
                                <div className="flex items-center justify-between w-full gap-2">
                                  <span className="font-bold text-foreground">{cName}</span>
                                  <div className="flex items-center gap-1.5">
                                    {slotCount > 0 ? (
                                      <span className="inline-flex items-center rounded-md px-1.5 py-0.2 text-[9px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60">
                                        {slotCount} {slotCount === 1 ? "slot" : "slots"}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center rounded-md px-1.5 py-0.2 text-[9px] font-medium bg-muted text-muted-foreground border border-border/60">
                                        Unscheduled
                                      </span>
                                    )}
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.2 text-[9px] font-bold border ${yTheme.bg} ${yTheme.text} ${yTheme.border}`}>
                                      {cYear}
                                    </span>
                                  </div>
                                </div>
                              </SelectItem>
                            )
                          })}
                        </SelectGroup>
                      </Fragment>
                    )
                  })}
                </SelectContent>
              </Select>
              {selectedClassForGrid !== "all" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground rounded-xl cursor-pointer"
                  onClick={() => setSelectedClassForGrid("all")}
                  title="Reset to all classes"
                >
                  <X className="size-3.5 mr-1" /> Reset
                </Button>
              )}
            </div>
          )}

          {/* List: filters */}
          {viewMode === "list" && (
            <div className="flex flex-wrap gap-2 items-center">
              <Select value={filterDay} onValueChange={setFilterDay}>
                <SelectTrigger className="h-9 w-32 text-xs font-medium rounded-xl border-border/80 bg-background shadow-2xs">
                  <CalendarDays className="size-3.5 mr-1 text-muted-foreground" />
                  <SelectValue placeholder="All Days" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Days</SelectItem>
                  {DAYS.map(d => <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterClass} onValueChange={setFilterClass}>
                <SelectTrigger className="h-9 w-auto min-w-36 max-w-52 text-xs font-medium rounded-xl border-border/80 bg-background shadow-2xs">
                  <GraduationCap className="size-3.5 mr-1 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border shadow-lg min-w-56 py-1">
                  <SelectItem value="all" className="text-xs font-semibold py-1.5 px-3 cursor-pointer">
                    All Classes
                  </SelectItem>
                  {classCohortGroups.map(([year, classList]) => {
                    const yTheme = getYearBadgeTheme(year)
                    return (
                      <Fragment key={year}>
                        <SelectSeparator className="my-1 bg-border/60" />
                        <SelectGroup>
                          <SelectLabel className="px-3 pt-1.5 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <span className={`size-1.5 rounded-full ${year.includes("2nd") ? "bg-emerald-500" : year.includes("1st") ? "bg-sky-500" : year.includes("3rd") ? "bg-amber-500" : "bg-violet-500"}`} />
                            {year}
                          </SelectLabel>
                          {classList.map(c => {
                            const [cName, cYear] = c.includes(" · ") ? c.split(" · ") : [c, ""]
                            const slotCount = entries.filter(e => e.classSection === c).length
                            return (
                              <SelectItem key={c} value={c} className="text-xs font-semibold py-1.5 px-3 cursor-pointer">
                                <div className="flex items-center justify-between w-full gap-2">
                                  <span className="font-bold text-foreground">{cName}</span>
                                  <div className="flex items-center gap-1.5">
                                    {slotCount > 0 ? (
                                      <span className="inline-flex items-center rounded-md px-1.5 py-0.2 text-[9px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60">
                                        {slotCount} {slotCount === 1 ? "slot" : "slots"}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center rounded-md px-1.5 py-0.2 text-[9px] font-medium bg-muted text-muted-foreground border border-border/60">
                                        Unscheduled
                                      </span>
                                    )}
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.2 text-[9px] font-bold border ${yTheme.bg} ${yTheme.text} ${yTheme.border}`}>
                                      {cYear}
                                    </span>
                                  </div>
                                </div>
                              </SelectItem>
                            )
                          })}
                        </SelectGroup>
                      </Fragment>
                    )
                  })}
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

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto print:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPDF}
            disabled={selectedClassForGrid === "all" ? entries.length === 0 : gridEntries.length === 0}
            className={`h-9 rounded-xl font-semibold gap-2 border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary shadow-2xs hover:shadow-xs transition-all cursor-pointer ${
              (selectedClassForGrid === "all" ? entries.length === 0 : gridEntries.length === 0)
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
            title={
              (selectedClassForGrid === "all" ? entries.length === 0 : gridEntries.length === 0)
                ? "No timetable slots scheduled to download"
                : "Download PDF document directly to your computer"
            }
          >
            <Download className="size-4" />
            <span className="hidden sm:inline">
              Download PDF{selectedClassForGrid !== "all" && gridEntries.length > 0 ? ` (${gridEntries.length} slots)` : ""}
            </span>
            <span className="sm:hidden">PDF</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBulkSheetOpen(true)}
            className="h-9 rounded-xl font-semibold gap-2 border-border/80 shadow-2xs hover:shadow-xs transition-all cursor-pointer"
          >
            <Layers className="size-4 text-primary" />
            <span className="hidden sm:inline">Fill Week</span>
            <span className="sm:hidden">Bulk</span>
          </Button>
          <Button
            size="sm"
            onClick={() => setSheetOpen(true)}
            className="h-9 rounded-xl font-semibold gap-2 shadow-2xs hover:shadow-xs transition-all cursor-pointer"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Add Slot</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* ── Error ── */}
      {fetchError && (
        <Card className="print:hidden"><CardContent className="py-8 text-center">
          <p className="text-sm text-destructive">{fetchError}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-timetable"] })}>Retry</Button>
        </CardContent></Card>
      )}

      {/* ── Loading ── */}
      {isLoading && <MyTimetableSkeleton />}

      {/* ── Printable Institution Header (visible only during browser print / PDF export) ── */}
      <div className="hidden print:flex flex-col gap-1.5 pb-4 mb-4 border-b-2 border-foreground/20">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-xl font-black text-foreground tracking-tight uppercase">
              Academic Timetable Schedule
            </h1>
            <p className="text-xs text-muted-foreground font-semibold">
              Department of Computer Science & Engineering
            </p>
          </div>
          <div className="text-right flex flex-col items-end">
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-muted/30 px-3 py-1 text-xs font-bold text-foreground">
              {selectedClassForGrid === "all" ? "Master Timetable (All Classes)" : selectedClassForGrid}
            </div>
            <span className="text-[10px] text-muted-foreground font-mono mt-1">
              Generated: {new Date().toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
            </span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          GRID VIEW
      ══════════════════════════════════════ */}
      {!isLoading && viewMode === "grid" && (
        <div className="overflow-x-auto">
          {selectedClassForGrid !== "all" && gridEntries.length === 0 && (
            <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 rounded-2xl border border-amber-300/60 bg-amber-500/10 px-4 py-3 text-xs text-amber-900 dark:text-amber-200 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  <strong>Timetable Not Created Yet:</strong> No periods have been scheduled for <strong>{selectedClassForGrid}</strong>. Click any slot below or use <strong>&quot;Fill Week&quot;</strong> to schedule.
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs font-bold border-amber-300 dark:border-amber-700 bg-background text-foreground hover:bg-muted shrink-0"
                onClick={() => setBulkSheetOpen(true)}
              >
                Schedule Now
              </Button>
            </div>
          )}
          <div className="min-w-180">
            {entries.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No timetable entries yet. Click &quot;Add Slot&quot; or &quot;Fill Week&quot; to create one.</CardContent></Card>
            ) : (
              <div className="rounded-2xl border border-border/80 overflow-hidden shadow-2xs bg-card">
                {/* Header row — days */}
                <div className="grid bg-muted/40 border-b border-border/80" style={{ gridTemplateColumns: `140px repeat(6, 1fr)` }}>
                  <div className="px-3.5 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider border-r border-border/80 flex items-center">
                    Period
                  </div>
                  {DAYS.map(d => (
                    <div
                      key={d.value}
                      className={`px-3 py-3 text-center border-r border-border/80 last:border-r-0 transition-colors ${d.value === todayValue ? "bg-primary/10" : ""}`}
                    >
                      <div className={`text-xs font-bold uppercase tracking-wider ${d.value === todayValue ? "text-primary font-extrabold" : "text-foreground/80"}`}>
                        {d.short}
                      </div>
                      {d.value === todayValue && (
                        <div className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.2 text-[9px] font-bold text-primary uppercase tracking-wider">
                          Today
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Period rows */}
                {periodOptions.map((p) => (
                  <div
                    key={p.id}
                    className="grid border-b border-border/70 last:border-b-0"
                    style={{ gridTemplateColumns: `140px repeat(6, 1fr)` }}
                  >
                    {/* Period label & Timing capsule */}
                    <div className="flex flex-col justify-center items-start px-3.5 py-3.5 border-r border-border/80 bg-muted/20 gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center justify-center rounded-lg bg-primary/10 border border-primary/25 px-2 py-0.5 text-xs font-bold text-primary shadow-2xs">
                          P{p.number}
                        </span>
                        <span className="text-xs font-bold text-foreground tracking-tight">Period {p.number}</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold font-mono text-muted-foreground bg-background/80 dark:bg-background/40 px-2 py-0.5 rounded-md border border-border/60 shadow-2xs">
                        <Clock className="size-3 text-primary/70 shrink-0" />
                        <span>{p.start}–{p.end}</span>
                      </div>
                    </div>

                    {/* Day cells */}
                    {DAYS.map(d => {
                      const cellEntries = gridMap[p.number]?.[d.value] ?? []
                      const isToday = d.value === todayValue

                      return (
                        <div
                          key={d.value}
                          className={`relative border-r border-border/70 last:border-r-0 p-1.5 transition-colors flex flex-col gap-1.5 ${isToday ? "bg-primary/2" : ""}`}
                          style={{ minHeight: cellEntries.length > 1 ? `${cellEntries.length * 85}px` : "80px" }}
                        >
                          {cellEntries.length === 0 ? (
                            <button
                              type="button"
                              onClick={() => openAddForSlot(d.value, p.id)}
                              className={`group/slot flex-1 min-h-16 w-full rounded-xl border-2 border-dashed border-border/50 hover:border-primary/50 hover:bg-primary/4 transition-all duration-200 flex flex-col items-center justify-center gap-1 cursor-pointer print:hidden ${
                                isToday ? "border-primary/25 bg-primary/1.5" : ""
                              }`}
                              title={`Click to schedule slot on ${d.label} (Period ${p.number})`}
                            >
                              <div className="size-5 rounded-full border border-dashed border-muted-foreground/30 group-hover/slot:border-primary group-hover/slot:bg-primary group-hover/slot:text-primary-foreground flex items-center justify-center transition-all duration-200 text-muted-foreground/40">
                                <Plus className="size-3 transition-transform group-hover/slot:scale-110" />
                              </div>
                              <span className="text-[10px] font-medium text-muted-foreground/40 group-hover/slot:text-primary transition-colors">
                                Add slot
                              </span>
                            </button>
                          ) : (
                            cellEntries.map((entry) => {
                              const color = getSubjectColor(entry.subject)
                              const [cName, cYear] = (entry.classSection && entry.classSection.includes(" · "))
                                ? entry.classSection.split(" · ")
                                : [entry.classSection || "", ""]
                              const yTheme = getYearBadgeTheme(cYear)

                              return (
                                <div
                                  key={entry.id}
                                  className={`rounded-xl border p-2.5 flex flex-col gap-2 group cursor-pointer relative transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${color.bg} ${color.border} ${isToday ? "ring-1.5 ring-primary/30 shadow-2xs" : ""}`}
                                  style={{ minHeight: "82px" }}
                                >
                                  {/* Top row: Subject Title & Top-Right Code Badge */}
                                  <div className="flex items-start justify-between gap-1.5 pr-5">
                                    <span className={`text-xs font-bold leading-snug tracking-tight ${color.text} line-clamp-2`}>
                                      {entry.subject}
                                    </span>
                                    {entry.subjectCode && (
                                      <span className="shrink-0 inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-black font-mono uppercase tracking-wider bg-background/90 dark:bg-background/70 backdrop-blur-xs border border-border/80 text-foreground/80 shadow-2xs">
                                        {entry.subjectCode}
                                      </span>
                                    )}
                                  </div>

                                  {/* Middle row: Clean Teacher Name */}
                                  <div className="flex items-center min-w-0 pt-0.5">
                                    <span className={`text-xs truncate ${entry.teacher === "Unassigned" ? "italic text-muted-foreground/60 text-[11px]" : "font-semibold text-foreground/90"}`}>
                                      {entry.teacher}
                                    </span>
                                  </div>

                                  {/* Bottom row: Dual-capsule badges for Class + Year when viewing All Classes */}
                                  {selectedClassForGrid === "all" && cName && (
                                    <div className="mt-auto pt-1 flex flex-wrap items-center gap-1">
                                      <span className={`inline-flex items-center text-[9px] font-bold rounded-md px-1.5 py-0.5 bg-background/80 dark:bg-background/60 backdrop-blur-xs border border-border/60 ${color.text}`}>
                                        {cName}
                                      </span>
                                      {cYear && (
                                        <span className={`inline-flex items-center text-[9px] font-bold rounded-md px-1.5 py-0.5 border ${yTheme.bg} ${yTheme.text} ${yTheme.border}`}>
                                          {cYear}
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  {/* Action delete on hover */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setRemoveTarget(entry)
                                    }}
                                    className="absolute top-1.5 right-1.5 size-5.5 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 bg-destructive/10 hover:bg-destructive/20 text-destructive transition-all cursor-pointer shadow-2xs print:hidden"
                                    title="Remove slot"
                                  >
                                    <Trash2 className="size-3" />
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
              <div className="mt-4 flex flex-wrap items-center gap-2 pt-2 border-t border-border/40 print:hidden">
                <span className="text-xs font-semibold text-muted-foreground mr-1">Subject Legend:</span>
                {Array.from(new Set(gridEntries.map(e => e.subject))).map(subj => {
                  const c = getSubjectColor(subj)
                  return (
                    <div key={subj} className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border shadow-2xs ${c.bg} ${c.text} ${c.border}`}>
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
              const [cName, cYear] = classSection.includes(" · ") ? classSection.split(" · ") : [classSection, ""]
              const yTheme = getYearBadgeTheme(cYear)

              return (
                <Card key={classSection} className="overflow-hidden border-border/80 shadow-2xs hover:shadow-xs transition-all">
                  {/* Class header */}
                  <button
                    type="button"
                    onClick={() => toggleGroup(classSection)}
                    className="flex w-full items-center justify-between bg-muted/30 px-5 py-3 text-left hover:bg-muted/50 transition-colors border-b border-border/80 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary shadow-2xs">
                        <GraduationCap className="size-4" />
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold tracking-tight text-foreground">{cName}</span>
                        {cYear && (
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${yTheme.bg} ${yTheme.text} ${yTheme.border}`}>
                            {cYear}
                          </span>
                        )}
                        <Badge variant="secondary" className="text-[11px] font-semibold ml-1">{totalInClass} slot{totalInClass !== 1 ? "s" : ""}</Badge>
                      </div>
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
                          <div key={d.value} className={di !== 0 ? "border-t border-border/70" : ""}>
                            {/* Day sub-header */}
                            <button
                              type="button"
                              onClick={() => toggleGroup(isDayGroupKey)}
                              className={`flex w-full items-center justify-between px-5 py-2.5 text-left hover:bg-muted/30 transition-colors cursor-pointer ${isToday ? "bg-primary/5" : "bg-muted/10"}`}
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
                                        <tr key={e.id} className="border-t border-border/60 hover:bg-muted/20 transition-colors">
                                          <td className="px-5 py-2.5 w-8">
                                            <span className={`inline-flex size-6 items-center justify-center rounded-full text-[10px] font-bold ${color.bg} ${color.text} border ${color.border}`}>
                                              {e.periodNumber}
                                            </span>
                                          </td>
                                          <td className="px-3 py-2.5 w-36">
                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-foreground/5 dark:bg-foreground/10 border border-border/80 text-foreground font-bold font-mono text-xs shadow-2xs">
                                              <Clock className="size-3 text-primary shrink-0" />
                                              <span>{e.periodStart}–{e.periodEnd}</span>
                                            </div>
                                          </td>
                                          <td className="px-3 py-2.5">
                                            <div className="flex items-center gap-2">
                                              <span className={`size-2 rounded-full ${color.dot}`} />
                                              <span className="text-sm font-semibold text-foreground">{e.subject}</span>
                                              {e.subjectCode && (
                                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-muted border border-border/60 text-foreground/80">
                                                  {e.subjectCode}
                                                </span>
                                              )}
                                            </div>
                                          </td>
                                          <td className="px-3 py-2.5">
                                            <span className={`text-sm ${e.teacher === "Unassigned" ? "italic text-muted-foreground/60" : "text-foreground font-semibold"}`}>
                                              {e.teacher}
                                            </span>
                                          </td>
                                          <td className="px-5 py-2.5 text-right">
                                            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer" onClick={() => setRemoveTarget(e)}>
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
                                        <span className={`size-8 shrink-0 flex items-center justify-center rounded-xl text-xs font-bold ${color.bg} ${color.text} border ${color.border}`}>{e.periodNumber}</span>
                                        <div>
                                          <div className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                                            {e.subject}
                                            {e.subjectCode && (
                                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-muted text-foreground/80 border border-border/60">
                                                {e.subjectCode}
                                              </span>
                                            )}
                                          </div>
                                          <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                                            <span className={e.teacher === "Unassigned" ? "italic text-muted-foreground/60" : "font-semibold text-foreground/85"}>{e.teacher}</span>
                                            <span>·</span>
                                            <span className="inline-flex items-center gap-1 font-mono font-bold text-foreground text-[11px] bg-foreground/5 dark:bg-foreground/10 px-1.5 py-0.5 rounded-md border border-border/70 shadow-2xs">
                                              <Clock className="size-2.5 text-primary shrink-0" /> {e.periodStart}–{e.periodEnd}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                      <Button variant="ghost" size="icon-sm" className="text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer" onClick={() => setRemoveTarget(e)}>
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
                {removeTarget && (() => {
                  const [cName, cYear] = (removeTarget.classSection && removeTarget.classSection.includes(" · "))
                    ? removeTarget.classSection.split(" · ")
                    : [removeTarget.classSection || "", ""]
                  const yTheme = getYearBadgeTheme(cYear)
                  return (
                    <div className="flex flex-col gap-1.5 rounded-xl border border-border/70 bg-muted/40 p-3 text-xs">
                      <div className="font-bold text-foreground flex items-center justify-between">
                        <span>{removeTarget.subject}</span>
                        {removeTarget.subjectCode && (
                          <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            {removeTarget.subjectCode}
                          </span>
                        )}
                      </div>
                      <div className="text-muted-foreground font-medium flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-foreground">{cName}</span>
                        {cYear && (
                          <span className={`inline-flex items-center rounded-md px-1.5 py-0.2 text-[10px] font-bold border ${yTheme.bg} ${yTheme.text} ${yTheme.border}`}>
                            {cYear}
                          </span>
                        )}
                        <span>•</span>
                        <span>{removeTarget.dayLabel}</span>
                        <span>•</span>
                        <span>{removeTarget.period}</span>
                      </div>
                    </div>
                  )
                })()}
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