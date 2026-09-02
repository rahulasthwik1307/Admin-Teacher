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
  periodP: string
  periodNum: string
  periodLabel: string
  codeBadge: string
  dot: string
}

// ── Rich Curated 360° Color Palette System (High Contrast & Distinct) ──
const PALETTES: SubjectTheme[] = [
  // 1. Sapphire / Blue (e.g. Computer Networks)
  {
    border: "border-blue-200/90 dark:border-blue-800/70",
    hoverBorder: "hover:border-blue-400 dark:hover:border-blue-500",
    bg: "bg-blue-500/3 dark:bg-blue-950/20",
    periodBox: "bg-blue-100/90 dark:bg-blue-950/90 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200",
    periodP: "text-blue-600 dark:text-blue-400 font-extrabold",
    periodNum: "text-blue-950 dark:text-blue-100 font-black",
    periodLabel: "text-blue-700 dark:text-blue-300 font-black",
    codeBadge: "bg-blue-100 text-blue-900 dark:bg-blue-900/80 dark:text-blue-200 border-blue-300 dark:border-blue-700",
    dot: "bg-blue-600",
  },
  // 2. Royal Purple / Violet (e.g. Machine Learning)
  {
    border: "border-purple-200/90 dark:border-purple-800/70",
    hoverBorder: "hover:border-purple-400 dark:hover:border-purple-500",
    bg: "bg-purple-500/3 dark:bg-purple-950/20",
    periodBox: "bg-purple-100/90 dark:bg-purple-950/90 border-purple-300 dark:border-purple-700 text-purple-800 dark:text-purple-200",
    periodP: "text-purple-600 dark:text-purple-400 font-extrabold",
    periodNum: "text-purple-950 dark:text-purple-100 font-black",
    periodLabel: "text-purple-700 dark:text-purple-300 font-black",
    codeBadge: "bg-purple-100 text-purple-900 dark:bg-purple-900/80 dark:text-purple-200 border-purple-300 dark:border-purple-700",
    dot: "bg-purple-600",
  },
  // 3. Vibrant Amber / Orange (e.g. Data Structures)
  {
    border: "border-amber-200/90 dark:border-amber-800/70",
    hoverBorder: "hover:border-amber-400 dark:hover:border-amber-500",
    bg: "bg-amber-500/3 dark:bg-amber-950/20",
    periodBox: "bg-amber-100/90 dark:bg-amber-950/90 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200",
    periodP: "text-amber-700 dark:text-amber-400 font-extrabold",
    periodNum: "text-amber-950 dark:text-amber-100 font-black",
    periodLabel: "text-amber-800 dark:text-amber-300 font-black",
    codeBadge: "bg-amber-100 text-amber-950 dark:bg-amber-900/80 dark:text-amber-200 border-amber-300 dark:border-amber-700",
    dot: "bg-amber-600",
  },
  // 4. Deep Teal / Cyan (e.g. Web Technologies)
  {
    border: "border-teal-200/90 dark:border-teal-800/70",
    hoverBorder: "hover:border-teal-400 dark:hover:border-teal-500",
    bg: "bg-teal-500/3 dark:bg-teal-950/20",
    periodBox: "bg-teal-100/90 dark:bg-teal-950/90 border-teal-300 dark:border-teal-700 text-teal-800 dark:text-teal-200",
    periodP: "text-teal-600 dark:text-teal-400 font-extrabold",
    periodNum: "text-teal-950 dark:text-teal-100 font-black",
    periodLabel: "text-teal-700 dark:text-teal-300 font-black",
    codeBadge: "bg-teal-100 text-teal-900 dark:bg-teal-900/80 dark:text-teal-200 border-teal-300 dark:border-teal-700",
    dot: "bg-teal-600",
  },
  // 5. Rich Emerald / Green (e.g. Operating Systems)
  {
    border: "border-emerald-200/90 dark:border-emerald-800/70",
    hoverBorder: "hover:border-emerald-400 dark:hover:border-emerald-500",
    bg: "bg-emerald-500/3 dark:bg-emerald-950/20",
    periodBox: "bg-emerald-100/90 dark:bg-emerald-950/90 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200",
    periodP: "text-emerald-600 dark:text-emerald-400 font-extrabold",
    periodNum: "text-emerald-950 dark:text-emerald-100 font-black",
    periodLabel: "text-emerald-700 dark:text-emerald-300 font-black",
    codeBadge: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/80 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700",
    dot: "bg-emerald-600",
  },
  // 6. Crimson / Rose (e.g. Software Engineering)
  {
    border: "border-rose-200/90 dark:border-rose-800/70",
    hoverBorder: "hover:border-rose-400 dark:hover:border-rose-500",
    bg: "bg-rose-500/3 dark:bg-rose-950/20",
    periodBox: "bg-rose-100/90 dark:bg-rose-950/90 border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200",
    periodP: "text-rose-600 dark:text-rose-400 font-extrabold",
    periodNum: "text-rose-950 dark:text-rose-100 font-black",
    periodLabel: "text-rose-700 dark:text-rose-300 font-black",
    codeBadge: "bg-rose-100 text-rose-900 dark:bg-rose-900/80 dark:text-rose-200 border-rose-300 dark:border-rose-700",
    dot: "bg-rose-600",
  },
  // 7. Indigo / Navy (e.g. AI & Database)
  {
    border: "border-indigo-200/90 dark:border-indigo-800/70",
    hoverBorder: "hover:border-indigo-400 dark:hover:border-indigo-500",
    bg: "bg-indigo-500/3 dark:bg-indigo-950/20",
    periodBox: "bg-indigo-100/90 dark:bg-indigo-950/90 border-indigo-300 dark:border-indigo-700 text-indigo-800 dark:text-indigo-200",
    periodP: "text-indigo-600 dark:text-indigo-400 font-extrabold",
    periodNum: "text-indigo-950 dark:text-indigo-100 font-black",
    periodLabel: "text-indigo-700 dark:text-indigo-300 font-black",
    codeBadge: "bg-indigo-100 text-indigo-900 dark:bg-indigo-900/80 dark:text-indigo-200 border-indigo-300 dark:border-indigo-700",
    dot: "bg-indigo-600",
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
  if (year.includes("1")) {
    return "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/50"
  }
  if (year.includes("2")) {
    return "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800/50"
  }
  if (year.includes("3")) {
    return "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/50"
  }
  if (year.includes("4")) {
    return "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/50"
  }
  return "bg-muted/70 text-muted-foreground border-border/50"
}

function slotKey(s: MissedSlot) {
  return `${s.date}__${s.subjectId}__${s.classId}__${s.periodId}`
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
  const [absenteeRoster, setAbsenteeRoster] = useState<{ id: string; name: string; rollNumber: string; classLabel: string }[]>([])
  const [absenteeLoading, setAbsenteeLoading] = useState(false)
  const [absenteeSearch, setAbsenteeSearch] = useState("")
  const [pickedAbsentees, setPickedAbsentees] = useState<Set<string>>(new Set())

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

  // Filtered lists for sheets
  const filteredStudentsInSheet = useMemo(() => {
    if (!singleSheetSearch.trim()) return students
    const q = singleSheetSearch.toLowerCase()
    return students.filter(
      (s) => s.name.toLowerCase().includes(q) || s.rollNumber.toLowerCase().includes(q)
    )
  }, [students, singleSheetSearch])

  const filteredAbsenteeRoster = useMemo(() => {
    if (!absenteeSearch.trim()) return absenteeRoster
    const q = absenteeSearch.toLowerCase()
    return absenteeRoster.filter(
      (s) => s.name.toLowerCase().includes(q) || s.rollNumber.toLowerCase().includes(q)
    )
  }, [absenteeRoster, absenteeSearch])

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
            <SelectTrigger className="w-38 h-9 text-xs font-semibold rounded-xl bg-muted/30 border-border/80 shadow-2xs">
              <CalendarDays className="size-3.5 text-muted-foreground mr-1.5 shrink-0" />
              <SelectValue placeholder="Time range" />
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
            <SelectTrigger className="w-44 h-9 text-xs font-semibold rounded-xl bg-muted/30 border-border/80 shadow-2xs">
              <BookOpen className="size-3.5 text-muted-foreground mr-1.5 shrink-0" />
              <SelectValue placeholder="All Subjects" />
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
            <SelectTrigger className="w-44 h-9 text-xs font-semibold rounded-xl bg-muted/30 border-border/80 shadow-2xs">
              <GraduationCap className="size-3.5 text-muted-foreground mr-1.5 shrink-0" />
              <SelectValue placeholder="All Cohorts" />
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
                <div key={date} className="flex flex-col gap-3">
                  {/* Date Group Header Anchor with Color Dot & Direct Pending Badge */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/80 pt-1">
                    <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                      <Checkbox
                        checked={allInGroupSelected}
                        onCheckedChange={(checked) => toggleGroupSelected(slots, !!checked)}
                        aria-label={`Select all slots on ${slots[0].dateLabel}`}
                        className="rounded-md size-4.5 cursor-pointer"
                      />
                      <div className="flex items-center gap-2">
                        <span className={cn("size-2.5 rounded-full shrink-0 shadow-2xs", dateDotColor)} />
                        <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-foreground">
                          {dateLabelFormatted}
                        </span>
                      </div>
                      <Badge
                        variant="secondary"
                        className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700 text-[10px] sm:text-[11px] font-black px-2.5 py-0.5 rounded-full shrink-0 shadow-2xs"
                      >
                        {slots.length} pending {slots.length === 1 ? "session" : "sessions"}
                      </Badge>
                    </div>
                  </div>

                  {/* 2-Column Responsive Grid with Compact Card Tiles */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {slots.map((slot) => {
                      const isSelected = selectedKeys.has(slotKey(slot))
                      const classParts = slot.className.includes(" · ")
                        ? slot.className.split(" · ")
                        : [slot.className, ""]
                      const sectionName = classParts[0]
                      const yearName = classParts[1]
                      const theme = getSubjectTheme(slot.subjectId, slot.subjectName)

                      return (
                        <Card
                          key={slotKey(slot)}
                          className={cn(
                            "group transition-all duration-200 border shadow-2xs overflow-hidden rounded-2xl",
                            isSelected
                              ? "bg-primary/5 border-primary/50 ring-1 ring-primary/20 shadow-xs"
                              : cn("bg-card", theme.border, theme.hoverBorder, theme.bg, "hover:shadow-xs")
                          )}
                        >
                          <CardContent className="flex items-center gap-3 p-3.5">
                            {/* Multi-slot Checkbox */}
                            <div className="flex items-center justify-center shrink-0">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => toggleSlotSelected(slot, !!checked)}
                                aria-label={`Select ${slot.subjectName} session for bulk action`}
                                className="rounded-md size-4.5 cursor-pointer"
                              />
                            </div>

                            {/* Distinct High-Contrast Period Box */}
                            <div
                              className="shrink-0 cursor-pointer"
                              onClick={() => openSheet(slot)}
                            >
                              <div
                                className={cn(
                                  "flex flex-col items-center justify-center w-11.5 h-13.5 rounded-xl border-2 shrink-0 shadow-xs transition-transform group-hover:scale-105",
                                  theme.periodBox
                                )}
                              >
                                <span className={cn("text-[9px] font-black leading-none uppercase tracking-wider", theme.periodP)}>
                                  P
                                </span>
                                <span className={cn("text-lg font-black leading-none my-0.5", theme.periodNum)}>
                                  {slot.periodNumber}
                                </span>
                                <span className={cn("text-[8px] font-black leading-none uppercase tracking-widest", theme.periodLabel)}>
                                  Period
                                </span>
                              </div>
                            </div>

                            {/* Card Body Details & Actions — opens single-slot sheet */}
                            <div
                              className="flex flex-col justify-between gap-2 flex-1 cursor-pointer min-w-0"
                              onClick={() => openSheet(slot)}
                            >
                              {/* Level 1: Subject Name + Monospace Code */}
                              <div className="flex items-center justify-between gap-2 min-w-0">
                                <span className="text-sm font-black text-foreground truncate group-hover:text-primary transition-colors tracking-tight">
                                  {slot.subjectName}
                                </span>
                                {slot.subjectCode && (
                                  <span
                                    className={cn(
                                      "shrink-0 text-[10px] font-mono font-black px-1.5 py-0.2 rounded-md border shadow-2xs",
                                      theme.codeBadge
                                    )}
                                  >
                                    {slot.subjectCode}
                                  </span>
                                )}
                              </div>

                              {/* Level 2: Cohort, Year & Lecture Time */}
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                                <span className="font-extrabold text-foreground flex items-center gap-1 text-[11px]">
                                  <GraduationCap className="size-3.5 text-slate-600 dark:text-slate-300 shrink-0" />
                                  <span>{sectionName}</span>
                                </span>

                                {yearName && (
                                  <span
                                    className={cn(
                                      "text-[9px] font-bold px-1.5 py-0.2 rounded-md border shadow-2xs",
                                      getYearBadgeClass(yearName)
                                    )}
                                  >
                                    {yearName}
                                  </span>
                                )}

                                <span className="text-muted-foreground/30 font-bold">&middot;</span>

                                <div className="flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-mono font-bold text-[10px]">
                                  <Clock className="size-2.5 text-slate-500 dark:text-slate-400 shrink-0" />
                                  <span>{slot.startTime}–{slot.endTime}</span>
                                </div>
                              </div>

                              {/* Level 3: Status Badge & Interactive Action Chevron */}
                              <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40">
                                <Badge
                                  variant="outline"
                                  className="bg-amber-500/15 text-amber-900 dark:text-amber-200 border-amber-300/90 dark:border-amber-700/80 font-bold text-[10px] sm:text-[11px] px-2 py-0.5 shrink-0 gap-1 rounded-full shadow-2xs"
                                >
                                  <AlertTriangle className="size-3 text-amber-600 dark:text-amber-400 shrink-0" />
                                  <span>Attendance Not Taken</span>
                                </Badge>
                                <div className="flex size-6.5 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-primary group-hover:text-primary-foreground transition-all shadow-2xs border border-slate-200/80 dark:border-slate-700">
                                  <ChevronRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
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
        <SheetContent className="w-full sm:max-w-md flex flex-col p-0 overflow-hidden rounded-l-2xl border-l border-border bg-card">
          <SheetHeader className="p-5 pb-4 border-b border-border/60 bg-muted/10">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/30">
                Multi-Slot Bulk Action
              </span>
            </div>
            <SheetTitle className="text-lg font-black text-foreground">
              Selected Absent · Others Present
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Select the students who were absent. Everyone else across all{" "}
              <span className="font-semibold text-foreground">{selectedSlotObjects.length} selected slot(s)</span> will
              automatically be marked present.
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
            <div className="flex flex-col flex-1 gap-3.5 p-5 overflow-hidden">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search student by name or roll number..."
                  value={absenteeSearch}
                  onChange={(e) => setAbsenteeSearch(e.target.value)}
                  className="h-9 pl-9 pr-8 text-xs rounded-xl bg-card border-border shadow-2xs"
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

              {/* Status strip */}
              <div className="flex items-center justify-between px-1 text-xs">
                <span className="font-bold text-rose-600 dark:text-rose-400">
                  {pickedAbsentees.size} student(s) marked absent
                </span>
                {pickedAbsentees.size > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[11px] font-bold text-muted-foreground hover:text-foreground h-6 px-2 cursor-pointer"
                    onClick={() => setPickedAbsentees(new Set())}
                  >
                    Clear Absentees
                  </Button>
                )}
              </div>

              {/* Student multi-select list */}
              <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1 rounded-xl border border-border/80 p-2.5 bg-card">
                {filteredAbsenteeRoster.length === 0 ? (
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    No students match your search
                  </div>
                ) : (
                  filteredAbsenteeRoster.map((student) => {
                    const isAbsent = pickedAbsentees.has(student.id)
                    return (
                      <div
                        key={student.id}
                        className={cn(
                          "flex items-center justify-between gap-3 rounded-xl border p-2.5 cursor-pointer transition-all shadow-2xs",
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
                            className="rounded-md size-4"
                            aria-label={`Mark ${student.name} absent`}
                          />
                          <div
                            className={cn(
                              "flex size-7.5 items-center justify-center rounded-full text-xs font-black shrink-0 transition-colors shadow-2xs",
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
                              <span className="font-mono font-semibold">{student.rollNumber}</span>
                              <span>&middot;</span>
                              <span>{student.classLabel}</span>
                            </div>
                          </div>
                        </div>

                        {isAbsent && (
                          <Badge
                            variant="outline"
                            className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800/60 font-bold text-[10px] px-2 py-0.2 shrink-0"
                          >
                            Marked Absent
                          </Badge>
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              {/* Bulk Submit CTA */}
              <Button
                onClick={() => runBulkSave("present", Array.from(pickedAbsentees))}
                disabled={bulkSaving}
                className="w-full h-11.5 rounded-xl font-black bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all cursor-pointer text-xs sm:text-sm"
              >
                {bulkSaving ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Saving Bulk Attendance...
                  </>
                ) : (
                  `Save Attendance (${pickedAbsentees.size} absent, rest present across ${selectedSlotObjects.length} slots)`
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
