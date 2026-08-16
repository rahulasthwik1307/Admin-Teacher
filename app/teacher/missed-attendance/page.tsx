"use client"

import { useState, useMemo } from "react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  Search,
  Clock,
  GraduationCap,
  CalendarDays,
  Sparkles,
  BookOpen,
  Filter,
} from "lucide-react"
import { MissedAttendanceSkeleton, StudentSheetSkeleton } from "@/components/ui/skeletons"
import {
  Select,
  SelectContent,
  SelectItem,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useMissedAttendance } from "@/hooks/use-missed-attendance"
import { cn } from "@/lib/utils"

interface MissedSlot {
  date: string
  dateLabel: string
  subjectId: string
  subjectName: string
  subjectCode: string
  classId: string
  className: string
  periodId: string
  periodNumber: number
  startTime: string
  endTime: string
}

interface Student {
  id: string
  name: string
  rollNumber: string
  status: "present" | "absent"
}

/* ---------- Color Palettes & Mapping Helpers ---------- */

const SUBJECT_COLORS = [
  {
    bg: "bg-sky-500/10",
    text: "text-sky-700 dark:text-sky-300",
    border: "border-sky-300 dark:border-sky-800/60",
    badge: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800/60",
    cardBorder: "border-l-sky-500",
    tint: "hover:border-sky-300/80",
  },
  {
    bg: "bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-300 dark:border-emerald-800/60",
    badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/60",
    cardBorder: "border-l-emerald-500",
    tint: "hover:border-emerald-300/80",
  },
  {
    bg: "bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-300 dark:border-amber-800/60",
    badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800/60",
    cardBorder: "border-l-amber-500",
    tint: "hover:border-amber-300/80",
  },
  {
    bg: "bg-violet-500/10",
    text: "text-violet-700 dark:text-violet-300",
    border: "border-violet-300 dark:border-violet-800/60",
    badge: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-300 dark:border-violet-800/60",
    cardBorder: "border-l-violet-500",
    tint: "hover:border-violet-300/80",
  },
  {
    bg: "bg-rose-500/10",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-300 dark:border-rose-800/60",
    badge: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800/60",
    cardBorder: "border-l-rose-500",
    tint: "hover:border-rose-300/80",
  },
  {
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/30",
    badge: "bg-primary/15 text-primary border-primary/30",
    cardBorder: "border-l-primary",
    tint: "hover:border-primary/50",
  },
]

const SECTION_COLORS = [
  {
    badge: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/50",
  },
  {
    badge: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800/50",
  },
  {
    badge: "bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-200 dark:border-fuchsia-800/50",
  },
  {
    badge: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/50",
  },
  {
    badge: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800/50",
  },
  {
    badge: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/50",
  },
]

function hashStringToNumber(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00")
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  if (d.getTime() === today.getTime()) return `Today — ${months[date.getMonth()]} ${date.getDate()}`
  if (d.getTime() === yesterday.getTime()) return `Yesterday — ${months[date.getMonth()]} ${date.getDate()}`
  return `${days[date.getDay()]} — ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
}

function slotKey(s: MissedSlot) {
  return `${s.date}__${s.subjectId}__${s.classId}__${s.periodId}`
}

export default function MissedAttendancePage() {
  const [filterSubject, setFilterSubject] = useState("all")
  const [filterClass, setFilterClass] = useState("all")
  const [filterDays, setFilterDays] = useState("30")
  const [sheetOpen, setSheetOpen] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<MissedSlot | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // ── Bulk selection state ──────────────────────────────────────────
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [bulkSaving, setBulkSaving] = useState(false)

  // ── Absentee picker sheet state (for "except" mode) ────────────────
  const [absenteeSheetOpen, setAbsenteeSheetOpen] = useState(false)
  const [absenteeRoster, setAbsenteeRoster] = useState<{ id: string; name: string; rollNumber: string; classLabel: string }[]>([])
  const [absenteeLoading, setAbsenteeLoading] = useState(false)
  const [absenteeSearch, setAbsenteeSearch] = useState("")
  const [pickedAbsentees, setPickedAbsentees] = useState<Set<string>>(new Set())

  const { data: missedSlots = [], isLoading: loading, refetch } = useMissedAttendance(filterDays)

  // Deterministic Subject & Section Color Maps
  const subjectColorMap = useMemo(() => {
    const map: Record<string, number> = {}
    const names = Array.from(new Set(missedSlots.map((s) => s.subjectName)))
    names.forEach((name, i) => {
      map[name] = i % SUBJECT_COLORS.length
    })
    return map
  }, [missedSlots])

  const classColorMap = useMemo(() => {
    const map: Record<string, number> = {}
    const names = Array.from(new Set(missedSlots.map((s) => s.className)))
    names.forEach((name, i) => {
      map[name] = i % SECTION_COLORS.length
    })
    return map
  }, [missedSlots])

  function getSubjectColor(name: string) {
    const idx = subjectColorMap[name] !== undefined ? subjectColorMap[name] : hashStringToNumber(name) % SUBJECT_COLORS.length
    return SUBJECT_COLORS[idx]
  }

  function getClassColor(name: string) {
    const idx = classColorMap[name] !== undefined ? classColorMap[name] : hashStringToNumber(name) % SECTION_COLORS.length
    return SECTION_COLORS[idx]
  }

  const filteredSlots = missedSlots.filter((s) => {
    if (filterSubject !== "all" && s.subjectId !== filterSubject) return false
    if (filterClass !== "all" && s.classId !== filterClass) return false
    return true
  })

  const uniqueSubjects = Array.from(
    new Map(missedSlots.map((s) => [s.subjectId, { id: s.subjectId, name: s.subjectName }])).values()
  )
  const uniqueClasses = Array.from(
    new Map(missedSlots.map((s) => [s.classId, { id: s.classId, name: s.className }])).values()
  )
  const grouped = filteredSlots.reduce<Record<string, MissedSlot[]>>((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = []
    acc[slot.date].push(slot)
    return acc
  }, {})

  const selectedSlotObjects = useMemo(
    () => filteredSlots.filter((s) => selectedKeys.has(slotKey(s))),
    [filteredSlots, selectedKeys]
  )

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

  const openSheet = async (slot: MissedSlot) => {
    setSelectedSlot(slot)
    setSheetOpen(true)
    setStudentsLoading(true)
    try {
      const supabase = createClient()
      // Only include students who were already enrolled on or before this
      // slot's date — a student created after this date wasn't yet a
      // student and should never appear in a past attendance sheet.
      const { data } = await supabase
        .from("students")
        .select("id, roll_number, created_at, user:users ( full_name )")
        .eq("class_id", slot.classId)
        .eq("is_approved", true)
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
    } finally {
      setStudentsLoading(false)
    }
  }

  const toggleStudent = (studentId: string) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, status: s.status === "present" ? "absent" : "present" } : s))
    )
  }
  const markAll = (status: "present" | "absent") => {
    setStudents((prev) => prev.map((s) => ({ ...s, status })))
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
        toast.error(result.error || "Failed to save attendance", {
          style: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },
        })
        return
      }
      toast.success("Attendance saved successfully")
      setSheetOpen(false)
      setSelectedSlot(null)
      refetch()
    } catch (e) {
      toast.error("An unexpected error occurred", {
        style: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },
      })
    } finally {
      setSaving(false)
    }
  }

  // ── Bulk save — "present" or "absent" mode (no picker needed) ──────
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
          `${result.successCount} slot(s) saved, ${result.failedCount} failed (likely already had a session)`
        )
      } else {
        toast.success(`Attendance saved for ${result.successCount} slot(s)`)
      }
      clearSelection()
      setAbsenteeSheetOpen(false)
      setPickedAbsentees(new Set())
      refetch()
    } catch {
      toast.error("An unexpected error occurred")
    } finally {
      setBulkSaving(false)
    }
  }

  // ── Open the absentee picker — fetch roster across all classes in the selection ──
  async function openAbsenteePicker() {
    if (selectedSlotObjects.length === 0) return
    setAbsenteeSheetOpen(true)
    setAbsenteeLoading(true)
    setPickedAbsentees(new Set())
    try {
      const supabase = createClient()
      const uniqueClassIds = Array.from(new Set(selectedSlotObjects.map((s) => s.classId)))
      const classLabelMap = new Map(selectedSlotObjects.map((s) => [s.classId, s.className]))
      // Selected slots can span multiple dates — use the LATEST selected date
      // as the enrollment cutoff for the picker list, since "present, except
      // absentees" applies broadly. Per-slot enrollment filtering still
      // happens server-side in the bulk-save route for correctness.
      const latestSelectedDate = selectedSlotObjects
        .map((s) => s.date)
        .sort()
        .at(-1)!

      const { data } = await supabase
        .from("students")
        .select("id, roll_number, class_id, created_at, user:users ( full_name )")
        .in("class_id", uniqueClassIds)
        .eq("is_approved", true)
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

  const filteredAbsenteeRoster = absenteeRoster.filter(
    (s) =>
      s.name.toLowerCase().includes(absenteeSearch.toLowerCase()) ||
      s.rollNumber.toLowerCase().includes(absenteeSearch.toLowerCase())
  )

  const presentCount = students.filter((s) => s.status === "present").length
  const absentCount = students.filter((s) => s.status === "absent").length

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
            Missed Attendance Sessions
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Review and record past lecture slots where an attendance window was not opened.
          </p>
        </div>
      </div>

      {/* ── Filters Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl border border-border bg-card shadow-2xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Time Range */}
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
            <SelectContent className="rounded-xl border-border shadow-md">
              <SelectItem value="all" className="text-xs font-semibold">All Subjects</SelectItem>
              {uniqueSubjects.map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-xs font-semibold">
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Class Filter */}
          <Select value={filterClass} onValueChange={setFilterClass}>
            <SelectTrigger className="w-38 h-9 text-xs font-semibold rounded-xl bg-muted/30 border-border/80 shadow-2xs">
              <GraduationCap className="size-3.5 text-muted-foreground mr-1.5 shrink-0" />
              <SelectValue placeholder="All Cohorts" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border shadow-md">
              <SelectItem value="all" className="text-xs font-semibold">All Cohorts</SelectItem>
              {uniqueClasses.map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-xs font-semibold">
                  {c.name}
                </SelectItem>
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

      {/* ── Bulk Action Bar (Sticky Floating Pill) ── */}
      {selectedKeys.size > 0 && (
        <div className="sticky top-3 z-30 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-card/95 backdrop-blur-md px-4 py-3 shadow-lg ring-1 ring-primary/20 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-black shadow-xs">
              {selectedKeys.size}
            </span>
            <span className="text-xs sm:text-sm font-bold text-foreground">
              slot{selectedKeys.size !== 1 ? "s" : ""} selected for bulk action
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 ml-auto">
            <Button
              size="sm"
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8.5 rounded-xl shadow-xs cursor-pointer"
              disabled={bulkSaving}
              onClick={() => runBulkSave("present")}
            >
              {bulkSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
              <span>Mark All Present</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-rose-300 dark:border-rose-800/80 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 font-bold h-8.5 rounded-xl shadow-2xs cursor-pointer"
              disabled={bulkSaving}
              onClick={() => runBulkSave("absent")}
            >
              <X className="size-3.5" />
              <span>Mark All Absent</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-border font-bold h-8.5 rounded-xl shadow-2xs hover:bg-muted cursor-pointer"
              disabled={bulkSaving}
              onClick={openAbsenteePicker}
            >
              <UserX className="size-3.5 text-amber-500" />
              <span>Present, Except Absentees</span>
            </Button>

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

      {/* ── Content ── */}
      {loading ? (
        <MissedAttendanceSkeleton />
      ) : filteredSlots.length === 0 ? (
        <Card className="border-border shadow-2xs">
          <CardContent className="py-16 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 shadow-2xs border border-emerald-300/50">
                <Check className="size-6" />
              </div>
              <p className="text-base font-bold text-foreground">All Caught Up!</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                There are no pending missed attendance sessions for the selected filters.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {Object.entries(grouped)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([date, slots]) => {
              const allInGroupSelected = slots.every((s) => selectedKeys.has(slotKey(s)))
              return (
                <div key={date} className="flex flex-col gap-3">
                  {/* Date Group Header Bar */}
                  <div className="flex items-center gap-3 px-1">
                    <Checkbox
                      checked={allInGroupSelected}
                      onCheckedChange={(checked) => toggleGroupSelected(slots, !!checked)}
                      aria-label={`Select all slots on ${slots[0].dateLabel}`}
                      className="rounded-md"
                    />
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="size-3.5 text-amber-500 shrink-0" />
                      <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                        {slots[0].dateLabel}
                      </span>
                      <Badge
                        variant="secondary"
                        className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800/60 text-[10px] font-bold px-2 py-0.2 rounded-md"
                      >
                        {slots.length} missed
                      </Badge>
                    </div>
                    <div className="h-px flex-1 bg-border/80" />
                  </div>

                  {/* Slot Cards Grid / List */}
                  <div className="flex flex-col gap-2.5">
                    {slots.map((slot, i) => {
                      const isSelected = selectedKeys.has(slotKey(slot))
                      const subjectColor = getSubjectColor(slot.subjectName)
                      const classColor = getClassColor(slot.className)

                      return (
                        <Card
                          key={i}
                          className={cn(
                            "transition-all duration-200 border border-border shadow-2xs overflow-hidden border-l-4",
                            subjectColor.cardBorder,
                            isSelected
                              ? "bg-primary/5 border-primary/40 ring-1 ring-primary/20 shadow-xs"
                              : "bg-card hover:bg-muted/10 hover:shadow-xs",
                            subjectColor.tint
                          )}
                        >
                          <CardContent className="flex items-center gap-3.5 p-3.5 sm:p-4">
                            {/* Checkbox */}
                            <div className="flex items-center justify-center shrink-0">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => toggleSlotSelected(slot, !!checked)}
                                aria-label="Select slot for bulk action"
                                className="rounded-md size-4"
                              />
                            </div>

                            {/* Card Body — opens manual sheet */}
                            <div
                              className="flex items-center justify-between gap-4 flex-1 cursor-pointer min-w-0"
                              onClick={() => openSheet(slot)}
                            >
                              {/* Left: Period Badge & Details */}
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                {/* Period Badge with Subject Color */}
                                <div
                                  className={cn(
                                    "flex flex-col items-center justify-center size-10 sm:size-11 shrink-0 rounded-xl border font-black shadow-2xs",
                                    subjectColor.bg,
                                    subjectColor.text,
                                    subjectColor.border
                                  )}
                                >
                                  <span className="text-[9px] uppercase tracking-tight font-bold leading-none">Period</span>
                                  <span className="text-base sm:text-lg leading-none mt-0.5">{slot.periodNumber}</span>
                                </div>

                                {/* Subject & Class Details */}
                                <div className="flex flex-col min-w-0">
                                  <span className="text-xs sm:text-sm font-bold text-foreground truncate">
                                    {slot.subjectName}
                                  </span>
                                  <div className="flex flex-wrap items-center gap-2 mt-1">
                                    {/* Section/Class Pill with distinct Section Color */}
                                    <span
                                      className={cn(
                                        "inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.2 rounded-md border shadow-2xs",
                                        classColor.badge
                                      )}
                                    >
                                      <GraduationCap className="size-2.5 shrink-0" />
                                      {slot.className}
                                    </span>

                                    {/* Time Range */}
                                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                                      <Clock className="size-3 text-muted-foreground/70 shrink-0" />
                                      <span>
                                        {slot.startTime} – {slot.endTime}
                                      </span>
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Right: Not Taken Badge & Arrow */}
                              <div className="flex items-center gap-2.5 shrink-0">
                                <Badge
                                  variant="outline"
                                  className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800/60 font-bold text-[11px] px-2.5 py-0.5"
                                >
                                  Not taken
                                </Badge>
                                <div className="flex size-7 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground group-hover:text-foreground">
                                  <ChevronRight className="size-4" />
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

      {/* ── Manual Single-Slot Attendance Sheet ── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md flex flex-col p-0 overflow-hidden rounded-l-2xl border-l border-border bg-card">
          <SheetHeader className="p-5 pb-4 border-b border-border/60 bg-muted/10">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-300/40">
                Single Slot Entry
              </span>
            </div>
            <SheetTitle className="text-lg font-black text-foreground">
              Fill Missed Attendance
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              {selectedSlot && (
                <span className="font-medium">
                  {selectedSlot.subjectName} &middot; {selectedSlot.className} &middot; Period {selectedSlot.periodNumber} &middot; {selectedSlot.dateLabel}
                </span>
              )}
            </SheetDescription>
          </SheetHeader>

          {studentsLoading ? (
            <div className="p-5 flex-1">
              <StudentSheetSkeleton />
            </div>
          ) : students.length === 0 ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <div className="flex flex-col items-center gap-2 text-center">
                <Users className="size-8 text-muted-foreground/40" />
                <p className="text-xs font-semibold text-muted-foreground">No approved students found for this class cohort.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col flex-1 gap-3.5 p-5 overflow-hidden">
              {/* Quick Actions & Turnout Summary */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                <div className="flex items-center gap-3 text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    <span>{presentCount} Present</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                    <span className="size-2 rounded-full bg-rose-500" />
                    <span>{absentCount} Absent</span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[11px] font-bold rounded-lg h-7 px-2.5 cursor-pointer hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-300"
                    onClick={() => markAll("present")}
                  >
                    All Present
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[11px] font-bold rounded-lg h-7 px-2.5 cursor-pointer hover:bg-rose-500/10 hover:text-rose-700 dark:hover:text-rose-300"
                    onClick={() => markAll("absent")}
                  >
                    All Absent
                  </Button>
                </div>
              </div>

              {/* Student Scrollable Roster */}
              <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1 rounded-xl border border-border/80 p-2 bg-card">
                {students.map((student) => {
                  const isPresent = student.status === "present"
                  return (
                    <div
                      key={student.id}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-xl border p-2.5 cursor-pointer transition-all shadow-2xs",
                        isPresent
                          ? "border-emerald-300/80 bg-emerald-500/5 hover:bg-emerald-500/10"
                          : "border-rose-300/80 bg-rose-500/5 hover:bg-rose-500/10"
                      )}
                      onClick={() => toggleStudent(student.id)}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className={cn(
                            "flex size-7.5 shrink-0 items-center justify-center rounded-lg text-white text-xs font-black shadow-2xs",
                            isPresent ? "bg-emerald-600" : "bg-rose-600"
                          )}
                        >
                          {isPresent ? <Check className="size-4" /> : <X className="size-4" />}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-foreground truncate">{student.name}</span>
                          <span className="text-[10px] font-mono text-muted-foreground font-semibold">
                            {student.rollNumber}
                          </span>
                        </div>
                      </div>

                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-bold shrink-0 px-2 py-0.5",
                          isPresent
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/60"
                            : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800/60"
                        )}
                      >
                        {isPresent ? "Present" : "Absent"}
                      </Badge>
                    </div>
                  )
                })}
              </div>

              {/* Save CTA */}
              <Button
                onClick={saveAttendance}
                disabled={saving}
                className="w-full h-11 rounded-xl font-bold shadow-xs hover:shadow transition-all cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Saving Attendance...
                  </>
                ) : (
                  "Save Attendance"
                )}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Absentee Picker Sheet (for "Present, Except Absentees" bulk mode) ── */}
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
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/30">
                Bulk Multi-Slot Mode
              </span>
            </div>
            <SheetTitle className="text-lg font-black text-foreground">
              Select Absent Students
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Pick the students who were absent. Everyone else across the{" "}
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
                <p className="text-xs font-semibold text-muted-foreground">No approved students found across selected classes.</p>
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
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Status strip */}
              <div className="flex items-center justify-between px-1 text-xs">
                <span className="font-bold text-rose-600 dark:text-rose-400">
                  {pickedAbsentees.size} marked absent
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
              <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1 rounded-xl border border-border/80 p-2 bg-card">
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
                          />
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
                className="w-full h-11 rounded-xl font-bold shadow-xs hover:shadow transition-all cursor-pointer"
              >
                {bulkSaving ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Saving Bulk Attendance...
                  </>
                ) : (
                  `Save Attendance (${pickedAbsentees.size} absent, rest present)`
                )}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
