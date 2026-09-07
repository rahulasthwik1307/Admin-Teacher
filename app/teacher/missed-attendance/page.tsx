"use client"

import { useState, useMemo } from "react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Loader2,
  AlertTriangle,
  ChevronRight,
  X,
  Check,
  Users,
  CheckCheck,
  UserX,
  UserCheck,
  Search,
  Clock,
  GraduationCap,
  CalendarDays,
  BookOpen,
  RotateCcw,
  Zap,
  CornerDownLeft,
} from "lucide-react"
import { MissedAttendanceSkeleton, StudentSheetSkeleton } from "@/components/ui/skeletons"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
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
import { useMissedAttendance, MissedSlot } from "@/hooks/use-missed-attendance"
import { cn } from "@/lib/utils"

interface Student {
  id: string
  name: string
  rollNumber: string
  status: "present" | "absent"
}

interface ConfirmModalConfig {
  title: string
  description: string
  actionLabel: string
  isDestructive?: boolean
  onConfirm: () => void
}

interface SubjectTheme {
  border: string
  hoverBorder: string
  bg: string
  periodBox: string
  periodNumBadge: string
  codeBadge: string
  dot: string
  railBorder: string
  railHeader: string
  accentText: string
  durationPill: string
}

// ── Rich Curated 360° Color Palette System (High Contrast & Distinct) ──
const PALETTES: SubjectTheme[] = [
  // 1. Sapphire / Blue (e.g. Computer Networks)
  {
    border: "border-blue-200/90 dark:border-blue-800/70",
    hoverBorder: "hover:border-blue-400 dark:hover:border-blue-500",
    bg: "bg-blue-500/3 dark:bg-blue-950/20",
    periodBox: "bg-blue-500/10 border-blue-300 dark:border-blue-700/80 text-blue-900 dark:text-blue-100",
    periodNumBadge: "bg-blue-600 text-white dark:bg-blue-500",
    codeBadge: "bg-blue-100 text-blue-900 dark:bg-blue-900/80 dark:text-blue-200 border-blue-300 dark:border-blue-700",
    dot: "bg-blue-600",
    railBorder: "border-blue-300 dark:border-blue-700/80",
    railHeader: "bg-blue-600 dark:bg-blue-500 text-white",
    accentText: "text-blue-600 dark:text-blue-400",
    durationPill: "bg-blue-500/15 text-blue-950 dark:text-blue-200 border-blue-300/80 dark:border-blue-700/80",
  },
  // 2. Royal Purple / Violet (e.g. Machine Learning)
  {
    border: "border-purple-200/90 dark:border-purple-800/70",
    hoverBorder: "hover:border-purple-400 dark:hover:border-purple-500",
    bg: "bg-purple-500/3 dark:bg-purple-950/20",
    periodBox: "bg-purple-500/10 border-purple-300 dark:border-purple-700/80 text-purple-900 dark:text-purple-100",
    periodNumBadge: "bg-purple-600 text-white dark:bg-purple-500",
    codeBadge: "bg-purple-100 text-purple-900 dark:bg-purple-900/80 dark:text-purple-200 border-purple-300 dark:border-purple-700",
    dot: "bg-purple-600",
    railBorder: "border-purple-300 dark:border-purple-700/80",
    railHeader: "bg-purple-600 dark:bg-purple-500 text-white",
    accentText: "text-purple-600 dark:text-purple-400",
    durationPill: "bg-purple-500/15 text-purple-950 dark:text-purple-200 border-purple-300/80 dark:border-purple-700/80",
  },
  // 3. Vibrant Amber / Orange (e.g. Data Structures)
  {
    border: "border-amber-200/90 dark:border-amber-800/70",
    hoverBorder: "hover:border-amber-400 dark:hover:border-amber-500",
    bg: "bg-amber-500/3 dark:bg-amber-950/20",
    periodBox: "bg-amber-500/10 border-amber-300 dark:border-amber-700/80 text-amber-950 dark:text-amber-100",
    periodNumBadge: "bg-amber-600 text-white dark:bg-amber-500",
    codeBadge: "bg-amber-100 text-amber-950 dark:bg-amber-900/80 dark:text-amber-200 border-amber-300 dark:border-amber-700",
    dot: "bg-amber-600",
    railBorder: "border-amber-300 dark:border-amber-700/80",
    railHeader: "bg-amber-600 dark:bg-amber-500 text-white",
    accentText: "text-amber-600 dark:text-amber-400",
    durationPill: "bg-amber-500/15 text-amber-950 dark:text-amber-200 border-amber-300/80 dark:border-amber-700/80",
  },
  // 4. Deep Teal / Cyan (e.g. Web Technologies)
  {
    border: "border-teal-200/90 dark:border-teal-800/70",
    hoverBorder: "hover:border-teal-400 dark:hover:border-teal-500",
    bg: "bg-teal-500/3 dark:bg-teal-950/20",
    periodBox: "bg-teal-500/10 border-teal-300 dark:border-teal-700/80 text-teal-900 dark:text-teal-100",
    periodNumBadge: "bg-teal-600 text-white dark:bg-teal-500",
    codeBadge: "bg-teal-100 text-teal-900 dark:bg-teal-900/80 dark:text-teal-200 border-teal-300 dark:border-teal-700",
    dot: "bg-teal-600",
    railBorder: "border-teal-300 dark:border-teal-700/80",
    railHeader: "bg-teal-600 dark:bg-teal-500 text-white",
    accentText: "text-teal-600 dark:text-teal-400",
    durationPill: "bg-teal-500/15 text-teal-950 dark:text-teal-200 border-teal-300/80 dark:border-teal-700/80",
  },
  // 5. Rich Emerald / Green (e.g. Operating Systems)
  {
    border: "border-emerald-200/90 dark:border-emerald-800/70",
    hoverBorder: "hover:border-emerald-400 dark:hover:border-emerald-500",
    bg: "bg-emerald-500/3 dark:bg-emerald-950/20",
    periodBox: "bg-emerald-500/10 border-emerald-300 dark:border-emerald-700/80 text-emerald-900 dark:text-emerald-100",
    periodNumBadge: "bg-emerald-600 text-white dark:bg-emerald-500",
    codeBadge: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/80 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700",
    dot: "bg-emerald-600",
    railBorder: "border-emerald-300 dark:border-emerald-700/80",
    railHeader: "bg-emerald-600 dark:bg-emerald-500 text-white",
    accentText: "text-emerald-600 dark:text-emerald-400",
    durationPill: "bg-emerald-500/15 text-emerald-950 dark:text-emerald-200 border-emerald-300/80 dark:border-emerald-700/80",
  },
  // 6. Crimson / Rose (e.g. Software Engineering)
  {
    border: "border-rose-200/90 dark:border-rose-800/70",
    hoverBorder: "hover:border-rose-400 dark:hover:border-rose-500",
    bg: "bg-rose-500/3 dark:bg-rose-950/20",
    periodBox: "bg-rose-500/10 border-rose-300 dark:border-rose-700/80 text-rose-900 dark:text-rose-100",
    periodNumBadge: "bg-rose-600 text-white dark:bg-rose-500",
    codeBadge: "bg-rose-100 text-rose-900 dark:bg-rose-900/80 dark:text-rose-200 border-rose-300 dark:border-rose-700",
    dot: "bg-rose-600",
    railBorder: "border-rose-300 dark:border-rose-700/80",
    railHeader: "bg-rose-600 dark:bg-rose-500 text-white",
    accentText: "text-rose-600 dark:text-rose-400",
    durationPill: "bg-rose-500/15 text-rose-950 dark:text-rose-200 border-rose-300/80 dark:border-rose-700/80",
  },
  // 7. Indigo / Navy (e.g. AI & Database)
  {
    border: "border-indigo-200/90 dark:border-indigo-800/70",
    hoverBorder: "hover:border-indigo-400 dark:hover:border-indigo-500",
    bg: "bg-indigo-500/3 dark:bg-indigo-950/20",
    periodBox: "bg-indigo-500/10 border-indigo-300 dark:border-indigo-700/80 text-indigo-900 dark:text-indigo-100",
    periodNumBadge: "bg-indigo-600 text-white dark:bg-indigo-500",
    codeBadge: "bg-indigo-100 text-indigo-900 dark:bg-indigo-900/80 dark:text-indigo-200 border-indigo-300 dark:border-indigo-700",
    dot: "bg-indigo-600",
    railBorder: "border-indigo-300 dark:border-indigo-700/80",
    railHeader: "bg-indigo-600 dark:bg-indigo-500 text-white",
    accentText: "text-indigo-600 dark:text-indigo-400",
    durationPill: "bg-indigo-500/15 text-indigo-950 dark:text-indigo-200 border-indigo-300/80 dark:border-indigo-700/80",
  },
]

const DATE_DOT_COLORS = [
  "bg-blue-600",
  "bg-purple-600",
  "bg-emerald-600",
  "bg-amber-600",
  "bg-teal-600",
  "bg-rose-600",
]

function getYearBadgeClass(year: string) {
  const y = (year || "").toLowerCase()
  if (/\b(4|4th|iv|fourth)\b/.test(y) || y.includes("4")) {
    return "bg-purple-500/12 text-purple-800 dark:text-purple-200 border-purple-300/70 dark:border-purple-600/50 font-bold"
  }
  if (/\b(3|3rd|iii|third)\b/.test(y) || y.includes("3")) {
    return "bg-amber-500/12 text-amber-800 dark:text-amber-200 border-amber-300/70 dark:border-amber-600/50 font-bold"
  }
  if (/\b(2|2nd|ii|second)\b/.test(y) || y.includes("2")) {
    return "bg-emerald-500/12 text-emerald-800 dark:text-emerald-200 border-emerald-300/70 dark:border-emerald-600/50 font-bold"
  }
  if (/\b(1|1st|i|first)\b/.test(y) || y.includes("1")) {
    return "bg-sky-500/12 text-sky-800 dark:text-sky-200 border-sky-300/70 dark:border-sky-600/50 font-bold"
  }
  return "bg-muted/70 text-muted-foreground border-border/80 font-bold"
}

function slotKey(s: MissedSlot) {
  return `${s.date}__${s.subjectId}__${s.classId}__${s.periodId}`
}

function getSlotDuration(startTime?: string, endTime?: string): string {
  if (!startTime || !endTime) return ""
  const [sh, sm] = startTime.split(":").map(Number)
  const [eh, em] = endTime.split(":").map(Number)
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return ""
  const startTotal = sh * 60 + sm
  const endTotal = eh * 60 + em
  const diff = endTotal - startTotal
  if (diff > 0) {
    if (diff >= 60 && diff % 60 === 0) return `${diff / 60} hr`
    return `${diff} min`
  }
  return ""
}

export default function MissedAttendancePage() {
  // ── Filters ────────────────────────────────────────────────────────
  const [filterDays, setFilterDays] = useState("30")
  const [filterSubject, setFilterSubject] = useState("all")
  const [filterClass, setFilterClass] = useState("all")

  // ── Multi-slot bulk selection state ────────────────────────────────
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [bulkSaving, setBulkSaving] = useState(false)

  // ── Single-slot sheet state ────────────────────────────────────────
  const [sheetOpen, setSheetOpen] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<MissedSlot | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [singleSheetSearch, setSingleSheetSearch] = useState("")
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set())

  // ── Multi-slot Absentee picker sheet state ─────────────────────────
  const [absenteeSheetOpen, setAbsenteeSheetOpen] = useState(false)
  const [absenteeRoster, setAbsenteeRoster] = useState<
    { id: string; name: string; rollNumber: string; classId: string; classLabel: string }[]
  >([])
  const [absenteeLoading, setAbsenteeLoading] = useState(false)
  const [absenteeSearch, setAbsenteeSearch] = useState("")
  const [pickedAbsentees, setPickedAbsentees] = useState<Set<string>>(new Set())
  const [activeAbsenteeClassId, setActiveAbsenteeClassId] = useState<string>("all")
  const [quickRollInput, setQuickRollInput] = useState("")

  // ── Confirmation Modal State ───────────────────────────────────────
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [confirmConfig, setConfirmConfig] = useState<ConfirmModalConfig | null>(null)

  // ── Data Query ─────────────────────────────────────────────────────
  const { data: missedSlots = [], isLoading: loading, refetch } = useMissedAttendance(filterDays)

  // Unique subjects list
  const uniqueSubjects = useMemo(() => {
    return Array.from(
      new Map(missedSlots.map((s) => [s.subjectId, { id: s.subjectId, name: s.subjectName }])).values()
    ).sort((a, b) => a.name.localeCompare(b.name))
  }, [missedSlots])

  // ── Deterministic, Collision-Free Subject Theme Map ─────────────────
  const subjectThemeMap = useMemo(() => {
    const map = new Map<string, SubjectTheme>()
    uniqueSubjects.forEach((sub, idx) => {
      map.set(sub.id, PALETTES[idx % PALETTES.length])
    })
    return map
  }, [uniqueSubjects])

  function getSubjectTheme(subjectId: string, subjectName: string): SubjectTheme {
    const found = subjectThemeMap.get(subjectId)
    if (found) return found
    let hash = 0
    for (let i = 0; i < subjectName.length; i++) {
      hash = (hash << 5) - hash + subjectName.charCodeAt(i)
      hash |= 0
    }
    return PALETTES[Math.abs(hash) % PALETTES.length]
  }

  // Filter slots
  const filteredSlots = useMemo(() => {
    return missedSlots.filter((s) => {
      if (filterSubject !== "all" && s.subjectId !== filterSubject) return false
      if (filterClass !== "all" && s.classId !== filterClass) return false
      return true
    })
  }, [missedSlots, filterSubject, filterClass])

  // ── Grouped Cohorts by Year (Retains authoritative class_id UUID) ──
  const groupedClassesByYear = useMemo(() => {
    const classMap = new Map<string, { id: string; fullName: string }>()
    missedSlots.forEach((s) => {
      if (!classMap.has(s.classId)) {
        classMap.set(s.classId, { id: s.classId, fullName: s.className })
      }
    })

    const groups: Record<string, { id: string; sectionName: string; fullName: string }[]> = {}
    classMap.forEach(({ id, fullName }) => {
      let year = "General"
      let sectionName = fullName
      if (fullName.includes(" · ")) {
        const parts = fullName.split(" · ")
        sectionName = parts[0].trim()
        year = parts[1].trim()
      }
      if (!groups[year]) groups[year] = []
      groups[year].push({ id, sectionName, fullName })
    })

    const sortedYears = Object.keys(groups).sort((a, b) => {
      const numA = parseInt(a) || 99
      const numB = parseInt(b) || 99
      return numA - numB
    })

    return sortedYears.map((year) => ({
      year,
      classes: groups[year].sort((a, b) => a.sectionName.localeCompare(b.sectionName)),
    }))
  }, [missedSlots])

  // Selected class cohort metadata for trigger display (showing both Section and Year)
  const selectedCohortMeta = useMemo(() => {
    if (!filterClass || filterClass === "all") return null
    for (const g of groupedClassesByYear) {
      const match = g.classes.find((c) => c.id === filterClass)
      if (match) {
        return {
          sectionName: match.sectionName,
          year: g.year,
        }
      }
    }
    return null
  }, [groupedClassesByYear, filterClass])

  const grouped = useMemo(() => {
    return filteredSlots.reduce<Record<string, MissedSlot[]>>((acc, slot) => {
      if (!acc[slot.date]) acc[slot.date] = []
      acc[slot.date].push(slot)
      return acc
    }, {})
  }, [filteredSlots])

  const selectedSlotObjects = useMemo(
    () => filteredSlots.filter((s) => selectedKeys.has(slotKey(s))),
    [filteredSlots, selectedKeys]
  )

  // ── Multi-Slot Selection Handlers ──────────────────────────────────
  function toggleSlotSelected(slot: MissedSlot, checked: boolean) {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      const key = slotKey(slot)
      if (checked) next.add(key)
      else next.delete(key)
      return next
    })
  }

  function toggleGroupSelected(slots: MissedSlot[], checked: boolean) {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      for (const s of slots) {
        const key = slotKey(s)
        if (checked) next.add(key)
        else next.delete(key)
      }
      return next
    })
  }

  function selectAllFiltered() {
    setSelectedKeys(new Set(filteredSlots.map(slotKey)))
  }

  function clearSelection() {
    setSelectedKeys(new Set())
  }

  function resetFilters() {
    setFilterDays("30")
    setFilterSubject("all")
    setFilterClass("all")
  }

  // ── Single-Slot Attendance Sheet Handlers ──────────────────────────
  const openSheet = async (slot: MissedSlot) => {
    setSelectedSlot(slot)
    setSheetOpen(true)
    setStudentsLoading(true)
    setSingleSheetSearch("")
    setSelectedStudentIds(new Set())
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from("students")
        .select("id, roll_number, created_at, user:users ( full_name )")
        .eq("class_id", slot.classId)
        .neq("is_active", false)
        .lte("created_at", `${slot.date}T23:59:59`)
        .order("roll_number")
      setStudents(
        (data || []).map((s: any) => ({
          id: s.id,
          name: s.user?.full_name ?? "Unknown",
          rollNumber: s.roll_number ?? "",
          status: "present" as const,
        }))
      )
    } catch (e) {
      console.error("fetchStudents error:", e)
      toast.error("Failed to load students")
    } finally {
      setStudentsLoading(false)
    }
  }

  const setStudentStatus = (studentId: string, status: "present" | "absent") => {
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, status } : s))
    )
  }

  const toggleStudentStatus = (studentId: string) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, status: s.status === "present" ? "absent" : "present" } : s))
    )
  }

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev)
      if (next.has(studentId)) next.delete(studentId)
      else next.add(studentId)
      return next
    })
  }

  const selectAllStudents = () => {
    setSelectedStudentIds(new Set(students.map((s) => s.id)))
  }

  const clearStudentSelection = () => {
    setSelectedStudentIds(new Set())
  }

  // Single-sheet bulk shortcuts
  const markAllInSheet = (status: "present" | "absent") => {
    if (status === "absent") {
      setConfirmConfig({
        title: "Mark All Students Absent?",
        description: `Are you sure you want to mark all ${students.length} students in ${selectedSlot?.className} as absent for this session?`,
        actionLabel: "Mark All Absent",
        isDestructive: true,
        onConfirm: () => {
          setStudents((prev) => prev.map((s) => ({ ...s, status: "absent" })))
          toast.info("All students marked absent in local draft")
        },
      })
      setConfirmDialogOpen(true)
      return
    }
    setStudents((prev) => prev.map((s) => ({ ...s, status: "present" })))
    toast.info("All students marked present in local draft")
  }

  const markSelectedInSheet = (status: "present" | "absent") => {
    if (selectedStudentIds.size === 0) return
    setStudents((prev) =>
      prev.map((s) => (selectedStudentIds.has(s.id) ? { ...s, status } : s))
    )
    toast.success(`Marked ${selectedStudentIds.size} student(s) as ${status}`)
    clearStudentSelection()
  }

  const markSelectedAbsentOthersPresentInSheet = () => {
    if (selectedStudentIds.size === 0) return
    setStudents((prev) =>
      prev.map((s) => ({
        ...s,
        status: selectedStudentIds.has(s.id) ? "absent" : "present",
      }))
    )
    toast.success(`Marked ${selectedStudentIds.size} student(s) absent, remainder present`)
    clearStudentSelection()
  }

  const saveAttendance = async () => {
    if (!selectedSlot) return
    setSaving(true)
    try {
      const response = await fetch("/api/teacher/save-missed-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          class_id: selectedSlot.classId,
          subject_id: selectedSlot.subjectId,
          period_id: selectedSlot.periodId,
          session_date: selectedSlot.date,
          attendance: students.map((s) => ({ student_id: s.id, status: s.status })),
        }),
      })
      const result = await response.json()
      if (!response.ok) {
        toast.error(result.error || "Failed to save attendance")
        return
      }
      toast.success("Attendance saved successfully")
      setSheetOpen(false)
      setSelectedSlot(null)
      refetch()
    } catch {
      toast.error("An unexpected error occurred while saving")
    } finally {
      setSaving(false)
    }
  }

  // ── Multi-Slot Bulk Save Execution ─────────────────────────────────
  async function runBulkSave(mode: "present" | "absent", absenteeIds?: string[]) {
    if (selectedSlotObjects.length === 0) return
    setBulkSaving(true)
    try {
      const res = await fetch("/api/teacher/bulk-save-missed-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slots: selectedSlotObjects.map((s) => ({
            classId: s.classId,
            subjectId: s.subjectId,
            periodId: s.periodId,
            sessionDate: s.date,
          })),
          mode: absenteeIds ? "except" : mode,
          absenteeIds,
        }),
      })
      const result = await res.json()
      if (!res.ok) {
        toast.error(result.error || "Bulk save failed")
        return
      }
      if (result.failedCount > 0) {
        toast.warning(
          `${result.successCount} slot(s) saved, ${result.failedCount} failed (already recorded)`
        )
      } else {
        toast.success(`Attendance saved for ${result.successCount} slot(s)`)
      }
      clearSelection()
      setAbsenteeSheetOpen(false)
      setPickedAbsentees(new Set())
      refetch()
    } catch {
      toast.error("An unexpected error occurred during bulk save")
    } finally {
      setBulkSaving(false)
    }
  }

  // Trigger Bulk Save with confirmation
  function requestBulkSave(mode: "present" | "absent") {
    const count = selectedSlotObjects.length
    if (count === 0) return

    if (mode === "absent") {
      setConfirmConfig({
        title: "Mark All Students Absent Across Selected Slots?",
        description: `This will record 100% absence for all enrolled students across the ${count} selected session slot(s). This is a high-impact operation.`,
        actionLabel: "Confirm Mark All Absent",
        isDestructive: true,
        onConfirm: () => runBulkSave("absent"),
      })
      setConfirmDialogOpen(true)
      return
    }

    setConfirmConfig({
      title: "Mark All Students Present Across Selected Slots?",
      description: `This will record 100% presence for all enrolled students across the ${count} selected session slot(s).`,
      actionLabel: "Confirm Mark All Present",
      isDestructive: false,
      onConfirm: () => runBulkSave("present"),
    })
    setConfirmDialogOpen(true)
  }

  // ── Open Multi-Slot Absentee Picker ────────────────────────────────
  async function openAbsenteePicker() {
    if (selectedSlotObjects.length === 0) return
    setAbsenteeSheetOpen(true)
    setAbsenteeLoading(true)
    setPickedAbsentees(new Set())
    setAbsenteeSearch("")
    setQuickRollInput("")
    setActiveAbsenteeClassId("all")
    try {
      const supabase = createClient()
      const uniqueClassIds = Array.from(new Set(selectedSlotObjects.map((s) => s.classId)))
      const classLabelMap = new Map(selectedSlotObjects.map((s) => [s.classId, s.className]))
      const latestSelectedDate = selectedSlotObjects
        .map((s) => s.date)
        .sort()
        .at(-1)!

      const { data } = await supabase
        .from("students")
        .select("id, roll_number, class_id, created_at, user:users ( full_name )")
        .in("class_id", uniqueClassIds)
        .neq("is_active", false)
        .lte("created_at", `${latestSelectedDate}T23:59:59`)
        .order("roll_number")

      setAbsenteeRoster(
        (data || []).map((s: any) => ({
          id: s.id,
          name: s.user?.full_name ?? "Unknown",
          rollNumber: s.roll_number ?? "",
          classId: s.class_id,
          classLabel: classLabelMap.get(s.class_id) ?? "",
        }))
      )
    } catch (e) {
      console.error("fetchAbsenteeRoster error:", e)
      toast.error("Failed to load student list")
    } finally {
      setAbsenteeLoading(false)
    }
  }

  function toggleAbsentee(studentId: string) {
    setPickedAbsentees((prev) => {
      const next = new Set(prev)
      if (next.has(studentId)) next.delete(studentId)
      else next.add(studentId)
      return next
    })
  }

  // Distinct classes among selected slots with student and absent counts
  const distinctSelectedClasses = useMemo(() => {
    const classMap = new Map<
      string,
      { id: string; label: string; totalStudents: number; absentCount: number }
    >()
    for (const s of selectedSlotObjects) {
      if (!classMap.has(s.classId)) {
        classMap.set(s.classId, {
          id: s.classId,
          label: s.className,
          totalStudents: 0,
          absentCount: 0,
        })
      }
    }
    for (const st of absenteeRoster) {
      const entry = classMap.get(st.classId)
      if (entry) {
        entry.totalStudents += 1
        if (pickedAbsentees.has(st.id)) {
          entry.absentCount += 1
        }
      }
    }
    return Array.from(classMap.values())
  }, [selectedSlotObjects, absenteeRoster, pickedAbsentees])

  // Rapid roll number quick-add function
  function handleQuickRollAdd() {
    if (!quickRollInput.trim()) return
    const tokens = quickRollInput
      .split(/[,\s;]+/)
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)

    if (tokens.length === 0) return

    const candidates =
      activeAbsenteeClassId === "all"
        ? absenteeRoster
        : absenteeRoster.filter((s) => s.classId === activeAbsenteeClassId)

    const newlyAddedIds: string[] = []
    const notFoundRolls: string[] = []

    for (const token of tokens) {
      const match = candidates.find(
        (s) =>
          s.rollNumber.toLowerCase() === token ||
          s.rollNumber.toLowerCase().endsWith(token)
      )
      if (match) {
        newlyAddedIds.push(match.id)
      } else {
        notFoundRolls.push(token)
      }
    }

    if (newlyAddedIds.length > 0) {
      setPickedAbsentees((prev) => {
        const next = new Set(prev)
        newlyAddedIds.forEach((id) => next.add(id))
        return next
      })
      toast.success(`Marked ${newlyAddedIds.length} student(s) absent`)
    }

    if (notFoundRolls.length > 0) {
      toast.error(`Roll number(s) not found: ${notFoundRolls.join(", ")}`)
    }

    setQuickRollInput("")
  }

  function clearAbsenteesForCurrentClass() {
    if (activeAbsenteeClassId === "all") {
      setPickedAbsentees(new Set())
    } else {
      const idsToRemove = new Set(
        absenteeRoster.filter((s) => s.classId === activeAbsenteeClassId).map((s) => s.id)
      )
      setPickedAbsentees((prev) => {
        const next = new Set(prev)
        idsToRemove.forEach((id) => next.delete(id))
        return next
      })
    }
  }

  const pickedAbsenteeStudents = useMemo(() => {
    return absenteeRoster.filter((s) => pickedAbsentees.has(s.id))
  }, [absenteeRoster, pickedAbsentees])

  // Filtered lists for sheets
  const filteredStudentsInSheet = useMemo(() => {
    if (!singleSheetSearch.trim()) return students
    const q = singleSheetSearch.toLowerCase()
    return students.filter(
      (s) => s.name.toLowerCase().includes(q) || s.rollNumber.toLowerCase().includes(q)
    )
  }, [students, singleSheetSearch])

  const filteredAbsenteeRoster = useMemo(() => {
    let list = absenteeRoster
    if (activeAbsenteeClassId !== "all") {
      list = list.filter((s) => s.classId === activeAbsenteeClassId)
    }
    if (absenteeSearch.trim()) {
      const q = absenteeSearch.toLowerCase()
      list = list.filter(
        (s) => s.name.toLowerCase().includes(q) || s.rollNumber.toLowerCase().includes(q)
      )
    }
    return list
  }, [absenteeRoster, activeAbsenteeClassId, absenteeSearch])

  const presentCount = students.filter((s) => s.status === "present").length
  const absentCount = students.filter((s) => s.status === "absent").length

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page Header / Context Subtitle ── */}
      <div className="pb-0.5">
        <p className="text-xs sm:text-sm text-muted-foreground font-medium">
          Review and record past lecture slots where an attendance window was not opened.
        </p>
      </div>

      {/* ── Filters Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl border border-border/80 bg-card shadow-2xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Time Range Filter */}
          <Select value={filterDays} onValueChange={setFilterDays}>
            <SelectTrigger className="w-auto min-w-36 h-9 text-xs font-semibold rounded-xl bg-muted/30 border-border/80 shadow-2xs gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <CalendarDays className="size-3.5 text-muted-foreground shrink-0" />
                <SelectValue placeholder="Time range" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border shadow-md">
              <SelectItem value="7" className="text-xs font-semibold">Last 7 days</SelectItem>
              <SelectItem value="14" className="text-xs font-semibold">Last 14 days</SelectItem>
              <SelectItem value="30" className="text-xs font-semibold">Last 30 days</SelectItem>
              <SelectItem value="90" className="text-xs font-semibold">Last 3 months</SelectItem>
              <SelectItem value="180" className="text-xs font-semibold">Last 6 months</SelectItem>
              <SelectItem value="365" className="text-xs font-semibold">Last 1 year</SelectItem>
            </SelectContent>
          </Select>

          {/* Subject Filter */}
          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger className="w-auto min-w-36 h-9 text-xs font-semibold rounded-xl bg-muted/30 border-border/80 shadow-2xs gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <BookOpen className="size-3.5 text-muted-foreground shrink-0" />
                <SelectValue placeholder="All Subjects" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border shadow-md max-h-72">
              <SelectItem value="all" className="text-xs font-semibold">All Subjects</SelectItem>
              {uniqueSubjects.map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-xs font-medium">
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Cohort Filter — Grouped by Year */}
          <Select value={filterClass} onValueChange={setFilterClass}>
            <SelectTrigger className="w-auto min-w-36 h-9 text-xs font-semibold rounded-xl bg-muted/30 border-border/80 shadow-2xs gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <GraduationCap className="size-3.5 text-muted-foreground shrink-0" />
                <SelectValue placeholder="All Cohorts">
                  {selectedCohortMeta ? (
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-bold text-foreground text-xs tracking-tight">
                        {selectedCohortMeta.sectionName}
                      </span>
                      {selectedCohortMeta.year && selectedCohortMeta.year !== "General" && (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md border shadow-2xs",
                            getYearBadgeClass(selectedCohortMeta.year)
                          )}
                        >
                          <GraduationCap className="size-2.5 shrink-0" />
                          <span>{selectedCohortMeta.year}</span>
                        </span>
                      )}
                    </div>
                  ) : (
                    "All Cohorts"
                  )}
                </SelectValue>
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border shadow-md max-h-80">
              <SelectItem value="all" className="text-xs font-semibold">All Cohorts</SelectItem>
              {groupedClassesByYear.map(({ year, classes }) => (
                <SelectGroup key={year}>
                  <SelectLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1 bg-muted/40 rounded-md mt-1 mb-0.5">
                    {year}
                  </SelectLabel>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs font-medium pl-3.5">
                      {c.sectionName}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filteredSlots.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 h-9 rounded-xl text-xs font-bold shadow-2xs hover:bg-muted cursor-pointer"
            onClick={selectAllFiltered}
          >
            <CheckCheck className="size-3.5 text-primary" />
            <span>Select All ({filteredSlots.length})</span>
          </Button>
        )}
      </div>

      {/* ── Multi-Slot Bulk Action Bar (Sticky Floating Bar) ── */}
      {selectedKeys.size > 0 && (
        <div className="sticky top-3 z-30 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-card/95 backdrop-blur-md px-4 py-3 shadow-xl ring-1 ring-primary/20 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5">
            <span className="flex size-6.5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-black shadow-xs">
              {selectedKeys.size}
            </span>
            <span className="text-xs sm:text-sm font-bold text-foreground">
              slot{selectedKeys.size !== 1 ? "s" : ""} selected for bulk action
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 ml-auto">
            {/* Primary Action: Mark All Present */}
            <Button
              size="sm"
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8.5 rounded-xl shadow-xs cursor-pointer text-xs"
              disabled={bulkSaving}
              onClick={() => requestBulkSave("present")}
            >
              {bulkSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
              <span>Mark All Present</span>
            </Button>

            {/* Destructive Action: Mark All Absent */}
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-rose-300 dark:border-rose-800/80 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 font-bold h-8.5 rounded-xl shadow-2xs cursor-pointer text-xs"
              disabled={bulkSaving}
              onClick={() => requestBulkSave("absent")}
            >
              <X className="size-3.5" />
              <span>Mark All Absent</span>
            </Button>

            {/* Special Workflow: Selected Absent · Others Present */}
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary font-bold h-8.5 rounded-xl shadow-2xs cursor-pointer text-xs"
              disabled={bulkSaving}
              onClick={openAbsenteePicker}
            >
              <UserX className="size-3.5 text-primary" />
              <span>Selected Absent · Others Present</span>
            </Button>

            {/* Clear selection */}
            <Button
              size="sm"
              variant="ghost"
              className="h-8.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={clearSelection}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* ── Main Content List ── */}
      {loading ? (
        <MissedAttendanceSkeleton />
      ) : filteredSlots.length === 0 ? (
        <Card className="border-border shadow-2xs rounded-2xl">
          <CardContent className="py-16 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 shadow-2xs border border-emerald-300/50">
                <Check className="size-6" />
              </div>
              <p className="text-base font-bold text-foreground">
                {missedSlots.length === 0 ? "All Caught Up!" : "No Matching Sessions Found"}
              </p>
              <p className="text-xs text-muted-foreground max-w-sm">
                {missedSlots.length === 0
                  ? "There are no pending missed attendance sessions for the selected time range."
                  : "No missed attendance sessions match your active subject or cohort filters."}
              </p>
              {(filterSubject !== "all" || filterClass !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetFilters}
                  className="mt-2 text-xs font-semibold gap-1.5 rounded-xl cursor-pointer"
                >
                  <RotateCcw className="size-3" />
                  <span>Clear Filter Criteria</span>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {Object.entries(grouped)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([date, slots], dateIdx) => {
              const allInGroupSelected = slots.every((s) => selectedKeys.has(slotKey(s)))
              const dateDotColor = DATE_DOT_COLORS[dateIdx % DATE_DOT_COLORS.length]
              const dateLabelFormatted = slots[0].dateLabel.replace(/—/g, "•").replace(/–/g, "•")

              return (
                <div
                  key={date}
                  className="flex flex-col rounded-2xl border border-border/80 bg-card/70 dark:bg-card/40 backdrop-blur-xs shadow-2xs overflow-hidden transition-all"
                >
                  {/* Day Container Header Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-muted/40 dark:bg-muted/20 border-b border-border/80">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={allInGroupSelected}
                        onCheckedChange={(checked) => toggleGroupSelected(slots, !!checked)}
                        aria-label={`Select all slots on ${slots[0].dateLabel}`}
                        className="rounded-md size-4.5 cursor-pointer"
                      />
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <CalendarDays className="size-4" />
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-foreground">
                            {dateLabelFormatted}
                          </span>
                          <span className="text-muted-foreground/60 hidden sm:inline">·</span>
                          <span className="text-xs font-semibold text-muted-foreground hidden sm:inline">
                            {slots.length} {slots.length === 1 ? "lecture slot" : "lecture slots"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-300/70 dark:border-amber-700/60 text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-md shadow-2xs gap-1.5"
                      >
                        <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                        <span>{slots.length} Pending</span>
                      </Badge>
                    </div>
                  </div>

                  {/* Day Lecture Slots: Side-by-Side 2-Column Grid */}
                  <div className="p-3 sm:p-4 grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {slots.map((slot) => {
                      const isSelected = selectedKeys.has(slotKey(slot))
                      const classParts = slot.className.includes(" · ")
                        ? slot.className.split(" · ")
                        : [slot.className, ""]
                      const sectionName = classParts[0]
                      const yearName = classParts[1]
                      const theme = getSubjectTheme(slot.subjectId, slot.subjectName)

                      const duration = getSlotDuration(slot.startTime, slot.endTime)

                      return (
                        <Card
                          key={slotKey(slot)}
                          className={cn(
                            "group transition-all duration-200 border shadow-2xs overflow-hidden rounded-2xl cursor-pointer select-none hover:shadow-md hover:-translate-y-0.5",
                            isSelected
                              ? "bg-primary/5 border-primary/50 ring-1 ring-primary/20 shadow-xs"
                              : cn("bg-card", theme.border, theme.hoverBorder, theme.bg)
                          )}
                          onClick={() => openSheet(slot)}
                        >
                          <CardContent className="p-3.5 sm:p-4">
                            <div className="flex items-start gap-3">
                              {/* Selection Checkbox */}
                              <div className="pt-2 shrink-0">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={(checked) => toggleSlotSelected(slot, !!checked)}
                                  onClick={(e) => e.stopPropagation()}
                                  aria-label={`Select ${slot.subjectName} session for bulk action`}
                                  className="rounded-md size-4.5 cursor-pointer"
                                />
                              </div>

                              {/* Schedule Rail: Eye-Catching Calendar Ticket Stub */}
                              <div
                                className={cn(
                                  "flex flex-col rounded-xl border overflow-hidden shadow-2xs shrink-0 w-28 sm:w-31 transition-transform group-hover:scale-102 bg-card",
                                  theme.railBorder
                                )}
                              >
                                {/* Vibrant Accent Header Band */}
                                <div
                                  className={cn(
                                    "flex items-center justify-center gap-1.5 py-1.5 px-2 font-black shadow-xs",
                                    theme.railHeader
                                  )}
                                >
                                  <span className="text-[10px] tracking-wider uppercase font-extrabold opacity-95">
                                    PERIOD
                                  </span>
                                  <span className="text-[13px] sm:text-sm font-black font-mono leading-none">
                                    {slot.periodNumber}
                                  </span>
                                </div>

                                {/* High-Contrast Time & Duration Capsule */}
                                <div className="flex flex-col items-center justify-center py-2 px-2 gap-1.5 text-center bg-muted/20 dark:bg-muted/10">
                                  <div className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-black font-mono text-foreground leading-none">
                                    <Clock className={cn("size-3 shrink-0", theme.accentText)} />
                                    <span>{slot.startTime}–{slot.endTime}</span>
                                  </div>

                                  {duration && (
                                    <span
                                      className={cn(
                                        "inline-flex items-center text-[10px] font-extrabold px-2 py-0.5 rounded-full border shadow-2xs leading-none",
                                        theme.durationPill
                                      )}
                                    >
                                      {duration}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Middle & Right Content Area */}
                              <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch gap-2.5">
                                {/* Top Row: Subject Title + Inline Subject Code (Adjacent!) & Status Badge */}
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                    <h3 className="text-sm sm:text-[15px] font-black text-foreground tracking-tight group-hover:text-primary transition-colors truncate">
                                      {slot.subjectName}
                                    </h3>
                                    {slot.subjectCode && (
                                      <span
                                        className={cn(
                                          "shrink-0 text-[10px] font-mono font-black px-1.5 py-0.5 rounded-md border shadow-2xs",
                                          theme.codeBadge
                                        )}
                                      >
                                        {slot.subjectCode}
                                      </span>
                                    )}
                                  </div>

                                  <Badge
                                    variant="outline"
                                    className="bg-amber-500/15 text-amber-900 dark:text-amber-200 border-amber-300/90 dark:border-amber-700/80 font-bold text-[10px] sm:text-[11px] px-2 py-0.5 shrink-0 gap-1 rounded-full shadow-2xs"
                                  >
                                    <AlertTriangle className="size-3 text-amber-600 dark:text-amber-400 shrink-0" />
                                    <span>Unrecorded</span>
                                  </Badge>
                                </div>

                                {/* Bottom Row: Cohort Metadata & Primary Action Button */}
                                <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-border/50">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-extrabold text-foreground flex items-center gap-1 text-[11px] bg-muted/70 dark:bg-muted/40 px-2 py-0.5 rounded-md border border-border/70 shadow-2xs">
                                      <GraduationCap className="size-3 text-primary shrink-0" />
                                      <span>{sectionName}</span>
                                    </span>

                                    {yearName && (
                                      <span
                                        className={cn(
                                          "text-[10px] font-bold px-1.5 py-0.5 rounded-md border shadow-2xs",
                                          getYearBadgeClass(yearName)
                                        )}
                                      >
                                        {yearName}
                                      </span>
                                    )}
                                  </div>

                                  <Button
                                    size="sm"
                                    className="h-7 px-3 text-xs font-bold gap-1 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xs cursor-pointer group-hover:shadow-xs transition-all shrink-0 ml-auto"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      openSheet(slot)
                                    }}
                                  >
                                    <span>Record</span>
                                    <ChevronRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              )
            })}
        </div>
      )}

      {/* ── Single-Slot Attendance Sheet ── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md flex flex-col p-0 overflow-hidden rounded-l-2xl border-l border-border bg-card">
          {/* Dynamic Subject Themed Header */}
          {(() => {
            const drawerTheme = selectedSlot
              ? getSubjectTheme(selectedSlot.subjectId, selectedSlot.subjectName)
              : PALETTES[0]
            const classParts = selectedSlot?.className.includes(" · ")
              ? selectedSlot.className.split(" · ")
              : [selectedSlot?.className ?? "", ""]
            const sectionName = classParts[0]
            const yearName = classParts[1]
            const formattedDate = selectedSlot?.dateLabel
              ? selectedSlot.dateLabel.replace(/—/g, "•").replace(/–/g, "•")
              : ""

            return (
              <SheetHeader className={cn("p-5 pb-4 border-b border-border/70", drawerTheme.bg)}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span
                    className={cn(
                      "text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md border shadow-2xs",
                      drawerTheme.codeBadge
                    )}
                  >
                    Single Slot Entry
                  </span>
                </div>

                {/* Subject Title + Monospace Badge */}
                <div className="flex items-center gap-2 min-w-0">
                  <SheetTitle className="text-xl font-black text-foreground truncate">
                    {selectedSlot ? selectedSlot.subjectName : "Fill Attendance"}
                  </SheetTitle>
                  {selectedSlot?.subjectCode && (
                    <span
                      className={cn(
                        "shrink-0 text-[10px] font-mono font-black px-2 py-0.5 rounded-md border shadow-2xs",
                        drawerTheme.codeBadge
                      )}
                    >
                      {selectedSlot.subjectCode}
                    </span>
                  )}
                </div>

                {/* Structured 2-Line Meta Strip (Zero Awkward Wrapping) */}
                <SheetDescription className="text-xs mt-2" asChild>
                  <div className="flex flex-col gap-1.5 pt-0.5">
                    {/* Row 1: Academic Context (Cohort, Year, Period) */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-extrabold text-foreground flex items-center gap-1.5">
                        <GraduationCap className="size-4 text-slate-600 dark:text-slate-300 shrink-0" />
                        <span>{sectionName}</span>
                      </span>

                      {yearName && (
                        <span
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.2 rounded-md border shadow-2xs",
                            getYearBadgeClass(yearName)
                          )}
                        >
                          {yearName}
                        </span>
                      )}

                      <span className="text-muted-foreground/30 font-bold">&middot;</span>

                      <span
                        className={cn(
                          "text-[10px] font-black px-2 py-0.5 rounded-full border shadow-2xs",
                          drawerTheme.codeBadge
                        )}
                      >
                        Period {selectedSlot?.periodNumber}
                      </span>
                    </div>

                    {/* Row 2: Schedule Context (Date + Crisp Monospace Time Pill) */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-foreground/90">
                        <CalendarDays className="size-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                        <span>{formattedDate}</span>
                      </div>

                      <span className="text-muted-foreground/30 font-bold">&middot;</span>

                      <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 shadow-2xs text-slate-900 dark:text-slate-100 font-mono font-bold text-[11px]">
                        <Clock className="size-3 text-slate-500 dark:text-slate-400 shrink-0" />
                        <span>{selectedSlot?.startTime} – {selectedSlot?.endTime}</span>
                      </div>
                    </div>
                  </div>
                </SheetDescription>
              </SheetHeader>
            )
          })()}

          {studentsLoading ? (
            <div className="p-5 flex-1">
              <StudentSheetSkeleton />
            </div>
          ) : students.length === 0 ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <div className="flex flex-col items-center gap-2 text-center">
                <Users className="size-8 text-muted-foreground/40" />
                <p className="text-xs font-semibold text-muted-foreground">No active enrolled students found for this class cohort.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col flex-1 gap-3 p-5 overflow-hidden">
              {/* Turnout Stats Bar */}
              <div className="flex items-center justify-between p-2.5 px-3 rounded-xl border border-border/80 bg-muted/30 shadow-2xs">
                <div className="flex items-center gap-2 text-xs font-bold">
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800/60 font-black">
                    <span className="size-2 rounded-full bg-emerald-500 shadow-xs" />
                    <span>{presentCount} Present</span>
                  </span>
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-300/60 dark:border-rose-800/60 font-black">
                    <span className="size-2 rounded-full bg-rose-500 shadow-xs" />
                    <span>{absentCount} Absent</span>
                  </span>
                </div>
                <span className="text-xs font-semibold text-muted-foreground">
                  {students.length} {students.length === 1 ? "student" : "students"} enrolled
                </span>
              </div>

              {/* Student Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search student by name or roll number..."
                  value={singleSheetSearch}
                  onChange={(e) => setSingleSheetSearch(e.target.value)}
                  className="h-9 pl-9 pr-8 text-xs rounded-xl bg-card border-border shadow-2xs"
                />
                {singleSheetSearch && (
                  <button
                    type="button"
                    onClick={() => setSingleSheetSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                    aria-label="Clear search"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Multi-student action toolbar inside sheet */}
              {selectedStudentIds.size > 0 ? (
                <div className="flex flex-col gap-2 p-2.5 rounded-xl bg-primary/5 border border-primary/30 shadow-2xs animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-black">
                        {selectedStudentIds.size}
                      </span>
                      <span className="text-xs font-bold text-foreground">
                        student{selectedStudentIds.size !== 1 ? "s" : ""} selected
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[11px] text-muted-foreground hover:text-foreground px-2 cursor-pointer font-medium"
                      onClick={clearStudentSelection}
                    >
                      Clear selection
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-[11px] font-bold rounded-lg border-emerald-300 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 cursor-pointer shadow-2xs gap-1"
                      onClick={() => markSelectedInSheet("present")}
                    >
                      <UserCheck className="size-3.5 shrink-0" />
                      <span>Selected Present</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-[11px] font-bold rounded-lg border-rose-300 text-rose-700 dark:text-rose-300 hover:bg-rose-500/10 cursor-pointer shadow-2xs gap-1"
                      onClick={() => markSelectedInSheet("absent")}
                    >
                      <UserX className="size-3.5 shrink-0" />
                      <span>Selected Absent</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="col-span-2 h-8 text-[11px] font-bold rounded-lg border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer shadow-2xs gap-1.5"
                      onClick={markSelectedAbsentOthersPresentInSheet}
                      title="Selected students will be marked absent; all others will be marked present"
                    >
                      <Users className="size-3.5 shrink-0" />
                      <span>Selected Absent · Others Present</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedStudentIds.size === students.length && students.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) selectAllStudents()
                        else clearStudentSelection()
                      }}
                      id="select-all-students"
                      className="rounded"
                    />
                    <label htmlFor="select-all-students" className="text-xs text-muted-foreground cursor-pointer font-medium">
                      Select multiple students
                    </label>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[11px] font-bold rounded-lg h-7 px-2.5 gap-1 cursor-pointer hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-300 border-emerald-300/80 text-emerald-700 dark:text-emerald-300"
                      onClick={() => markAllInSheet("present")}
                    >
                      <Check className="size-3 shrink-0" />
                      <span>All Present</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[11px] font-bold rounded-lg h-7 px-2.5 gap-1 cursor-pointer hover:bg-rose-500/10 hover:text-rose-700 dark:hover:text-rose-300 border-rose-300/80 text-rose-700 dark:text-rose-300"
                      onClick={() => markAllInSheet("absent")}
                    >
                      <X className="size-3 shrink-0" />
                      <span>All Absent</span>
                    </Button>
                  </div>
                </div>
              )}

              {/* Student Scrollable Roster with Circle Avatars & 360° Outlines */}
              <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1 rounded-xl border border-border/80 p-2.5 bg-card">
                {filteredStudentsInSheet.length === 0 ? (
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    No students match your search
                  </div>
                ) : (
                  filteredStudentsInSheet.map((student) => {
                    const isPresent = student.status === "present"
                    const isChecked = selectedStudentIds.has(student.id)

                    return (
                      <div
                        key={student.id}
                        className={cn(
                          "flex items-center justify-between gap-3 rounded-xl border p-2.5 transition-all shadow-2xs",
                          isPresent
                            ? "border-emerald-300/80 bg-emerald-500/4 hover:bg-emerald-500/8"
                            : "border-rose-300/80 bg-rose-500/4 hover:bg-rose-500/8",
                          isChecked && "ring-1 ring-primary/40 bg-primary/5"
                        )}
                      >
                        {/* Checkbox, Avatar Initial & Student Details */}
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleStudentSelection(student.id)}
                            className="rounded-md size-4"
                            aria-label={`Select ${student.name}`}
                          />
                          <div
                            className={cn(
                              "flex size-7.5 items-center justify-center rounded-full text-xs font-black shrink-0 transition-colors shadow-2xs",
                              isPresent
                                ? "bg-emerald-600 text-white"
                                : "bg-rose-500 text-white"
                            )}
                          >
                            {student.name.trim().charAt(0).toUpperCase() || "?"}
                          </div>
                          <div
                            className="flex flex-col min-w-0 flex-1 cursor-pointer"
                            onClick={() => toggleStudentStatus(student.id)}
                          >
                            <span className="text-xs sm:text-sm font-black text-foreground truncate uppercase tracking-tight">
                              {student.name}
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground font-semibold">
                              {student.rollNumber}
                            </span>
                          </div>
                        </div>

                        {/* Segmented Present / Absent Action Buttons */}
                        <div className="flex items-center gap-1 shrink-0 bg-background/80 p-0.5 rounded-lg border border-border/70 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => setStudentStatus(student.id, "present")}
                            className={cn(
                              "flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md transition-all cursor-pointer",
                              isPresent
                                ? "bg-emerald-600 text-white shadow-2xs"
                                : "text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10"
                            )}
                            aria-label={`Mark ${student.name} Present`}
                          >
                            <Check className="size-3 shrink-0" />
                            <span>Present</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setStudentStatus(student.id, "absent")}
                            className={cn(
                              "flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md transition-all cursor-pointer",
                              !isPresent
                                ? "bg-rose-600 text-white shadow-2xs"
                                : "text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                            )}
                            aria-label={`Mark ${student.name} Absent`}
                          >
                            <X className="size-3 shrink-0" />
                            <span>Absent</span>
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Save Attendance CTA */}
              <Button
                onClick={saveAttendance}
                disabled={saving}
                className="w-full h-11.5 rounded-xl font-black bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all cursor-pointer mt-1 text-xs sm:text-sm"
              >
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Saving Attendance...
                  </>
                ) : (
                  `Save Attendance (${presentCount} Present, ${absentCount} Absent)`
                )}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Absentee Picker Sheet (for "Selected Absent · Others Present" bulk mode) ── */}
      <Sheet
        open={absenteeSheetOpen}
        onOpenChange={(open) => {
          setAbsenteeSheetOpen(open)
          if (!open) setPickedAbsentees(new Set())
        }}
      >
        <SheetContent className="w-full sm:max-w-lg flex flex-col p-0 overflow-hidden rounded-l-2xl border-l border-border bg-card">
          <SheetHeader className="p-4 sm:p-5 pb-3.5 border-b border-border/60 bg-muted/10">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/30">
                Multi-Class Bulk Action
              </span>
              <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-muted/60">
                {selectedSlotObjects.length} session{selectedSlotObjects.length !== 1 ? "s" : ""} selected
              </Badge>
              <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-muted/60">
                {distinctSelectedClasses.length} {distinctSelectedClasses.length === 1 ? "cohort" : "cohorts"}
              </Badge>
            </div>
            <SheetTitle className="text-lg font-black text-foreground">
              Selected Absent · Others Present
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Enter or pick the absentees. Everyone else across all selected classes will automatically be marked present.
            </SheetDescription>
          </SheetHeader>

          {absenteeLoading ? (
            <div className="p-5 flex-1">
              <StudentSheetSkeleton />
            </div>
          ) : absenteeRoster.length === 0 ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <div className="flex flex-col items-center gap-2 text-center">
                <Users className="size-8 text-muted-foreground/40" />
                <p className="text-xs font-semibold text-muted-foreground">No enrolled students found across selected classes.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col flex-1 gap-3 p-4 sm:p-5 overflow-hidden">
              {/* ── 1. Quick Roll-Number Input Bar (Fastest Path) ── */}
              <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-muted/40 border border-border/80 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <Zap className="size-3.5 text-amber-500 fill-amber-500 shrink-0" />
                    <span>Quick Absentee Entry</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground font-semibold">
                    Type roll numbers & press Enter
                  </span>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleQuickRollAdd()
                  }}
                  className="flex items-center gap-2"
                >
                  <div className="relative flex-1">
                    <Input
                      placeholder="e.g. 14, 28, 42..."
                      value={quickRollInput}
                      onChange={(e) => setQuickRollInput(e.target.value)}
                      className="h-8.5 text-xs rounded-lg bg-card border-border shadow-2xs font-mono font-bold pl-2.5 pr-2"
                    />
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!quickRollInput.trim()}
                    className="h-8.5 px-3 text-xs font-bold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground gap-1 shadow-2xs shrink-0 cursor-pointer"
                  >
                    <span>Mark</span>
                    <CornerDownLeft className="size-3 shrink-0 opacity-80" />
                  </Button>
                </form>
              </div>

              {/* ── 2. Marked Absentee Chips Strip (Shows picked students) ── */}
              {pickedAbsenteeStudents.length > 0 && (
                <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-rose-500/10 border border-rose-300/80 dark:border-rose-900/50 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                      <UserX className="size-3.5 shrink-0" />
                      <span>{pickedAbsenteeStudents.length} Marked Absent</span>
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPickedAbsentees(new Set())}
                      className="h-5 px-1.5 text-[10px] font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-500/15 cursor-pointer rounded"
                    >
                      Clear All Absentees
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                    {pickedAbsenteeStudents.map((st) => (
                      <span
                        key={st.id}
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-card border border-rose-300 dark:border-rose-800 text-[11px] font-bold text-foreground shadow-2xs"
                      >
                        <span className="font-mono text-rose-600 dark:text-rose-400 font-black">{st.rollNumber}</span>
                        <span className="truncate max-w-28">{st.name.split(" ")[0]}</span>
                        <button
                          type="button"
                          onClick={() => toggleAbsentee(st.id)}
                          className="text-muted-foreground hover:text-rose-600 cursor-pointer p-0.5 ml-0.5"
                          aria-label={`Unmark ${st.name}`}
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ── 3. Class Cohort Switcher Tabs (Isolation per class) ── */}
              {distinctSelectedClasses.length > 1 && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 overflow-x-auto p-1 rounded-xl bg-muted/40 border border-border/80 select-none">
                    <button
                      type="button"
                      onClick={() => setActiveAbsenteeClassId("all")}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 shrink-0",
                        activeAbsenteeClassId === "all"
                          ? "bg-card text-foreground shadow-2xs border border-border/80"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <span>All Classes</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-muted text-muted-foreground font-bold">
                        {absenteeRoster.length}
                      </span>
                    </button>

                    {distinctSelectedClasses.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setActiveAbsenteeClassId(c.id)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 shrink-0",
                          activeAbsenteeClassId === c.id
                            ? "bg-card text-foreground shadow-2xs border border-border/80"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <GraduationCap className="size-3 text-primary shrink-0" />
                        <span>{c.label.split(" · ")[0]}</span>
                        {c.absentCount > 0 ? (
                          <span className="text-[10px] font-black px-1.5 py-0.2 rounded-md bg-rose-500 text-white shadow-2xs">
                            {c.absentCount} abs
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-muted text-muted-foreground font-bold">
                            {c.totalStudents}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {activeAbsenteeClassId !== "all" && (
                    <div className="flex items-center justify-between px-1 text-[11px]">
                      <span className="text-muted-foreground font-medium">
                        Showing {filteredAbsenteeRoster.length} students in this class
                      </span>
                      <button
                        type="button"
                        onClick={clearAbsenteesForCurrentClass}
                        className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                      >
                        ✓ Mark this class 100% Present
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── 4. Search Filter Bar ── */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search by student name or roll number..."
                  value={absenteeSearch}
                  onChange={(e) => setAbsenteeSearch(e.target.value)}
                  className="h-8.5 pl-9 pr-8 text-xs rounded-xl bg-card border-border shadow-2xs"
                />
                {absenteeSearch && (
                  <button
                    type="button"
                    onClick={() => setAbsenteeSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                    aria-label="Clear search"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {/* ── 5. Student Multi-Select List ── */}
              <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1 rounded-xl border border-border/80 p-2 bg-card">
                {filteredAbsenteeRoster.length === 0 ? (
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    No students match your search or filter
                  </div>
                ) : (
                  filteredAbsenteeRoster.map((student) => {
                    const isAbsent = pickedAbsentees.has(student.id)
                    return (
                      <div
                        key={student.id}
                        className={cn(
                          "flex items-center justify-between gap-3 rounded-xl border p-2 cursor-pointer transition-all shadow-2xs select-none",
                          isAbsent
                            ? "border-rose-300/80 bg-rose-500/10 shadow-xs"
                            : "border-border/80 bg-card hover:bg-muted/30"
                        )}
                        onClick={() => toggleAbsentee(student.id)}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <Checkbox
                            checked={isAbsent}
                            onCheckedChange={() => toggleAbsentee(student.id)}
                            className="rounded-md size-4 cursor-pointer"
                            aria-label={`Mark ${student.name} absent`}
                          />
                          <div
                            className={cn(
                              "flex size-7 items-center justify-center rounded-full text-xs font-black shrink-0 transition-colors shadow-2xs",
                              isAbsent
                                ? "bg-rose-500 text-white"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {student.name.trim().charAt(0).toUpperCase() || "?"}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-foreground truncate">{student.name}</span>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium mt-0.5">
                              <span className="font-mono font-bold text-foreground/80">{student.rollNumber}</span>
                              <span>&middot;</span>
                              <span>{student.classLabel}</span>
                            </div>
                          </div>
                        </div>

                        {isAbsent ? (
                          <Badge
                            variant="outline"
                            className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800/60 font-bold text-[10px] px-2 py-0.2 shrink-0 gap-1"
                          >
                            <UserX className="size-3 shrink-0" />
                            <span>Absent</span>
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300/50 font-bold text-[10px] px-2 py-0.2 shrink-0 gap-1 opacity-70"
                          >
                            <Check className="size-2.5 shrink-0" />
                            <span>Present</span>
                          </Badge>
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              {/* ── 6. Bulk Submit CTA ── */}
              <Button
                onClick={() => runBulkSave("present", Array.from(pickedAbsentees))}
                disabled={bulkSaving}
                className="w-full h-11 rounded-xl font-black bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all cursor-pointer text-xs sm:text-sm"
              >
                {bulkSaving ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Saving Bulk Attendance...
                  </>
                ) : (
                  `Save Attendance (${absenteeRoster.length - pickedAbsentees.size} Present, ${pickedAbsentees.size} Absent Across ${distinctSelectedClasses.length} ${distinctSelectedClasses.length === 1 ? "Class" : "Classes"})`
                )}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Confirmation Dialog ── */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent className="rounded-2xl border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-foreground">
              {confirmConfig?.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              {confirmConfig?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl text-xs font-semibold">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                "rounded-xl text-xs font-bold",
                confirmConfig?.isDestructive
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
              onClick={() => {
                if (confirmConfig?.onConfirm) {
                  confirmConfig.onConfirm()
                }
              }}
            >
              {confirmConfig?.actionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
