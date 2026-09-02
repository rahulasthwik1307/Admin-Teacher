"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Pencil,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Users,
  ArrowRight,
  ShieldCheck,
  Check,
  Clock,
  Search,
  X,
  UserCheck,
  UserX,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { formatScanTime, type Student } from "@/lib/qr-attendance-data"

interface QRSummaryStateProps {
  subjectLabel: string
  classLabel: string
  periodLabel: string
  dateLabel: string
  initialStudents: Student[]
  teacherId: string
  sessionId: string
  classId?: string
  onDone: () => void
}

/* ---------- Status config ---------- */

const statusConfig = {
  present: {
    label: "Present",
    badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/60 font-bold",
    row: "bg-emerald-500/5 dark:bg-emerald-950/20 border-l-4 border-l-emerald-500",
    avatar: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    ring: "ring-2 ring-emerald-400 ring-offset-1",
    icon: CheckCircle2,
  },
  absent: {
    label: "Absent",
    badge: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800/60 font-bold",
    row: "bg-rose-500/5 dark:bg-rose-950/20 border-l-4 border-l-rose-500",
    avatar: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
    ring: "ring-2 ring-rose-300 ring-offset-1",
    icon: XCircle,
  },
  failed: {
    label: "Failed",
    badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800/60 font-bold",
    row: "bg-amber-500/5 dark:bg-orange-950/20 border-l-4 border-l-amber-500",
    avatar: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    ring: "ring-2 ring-amber-300 ring-offset-1",
    icon: AlertCircle,
  },
  pending: {
    label: "Pending",
    badge: "bg-muted text-muted-foreground border-border font-bold",
    row: "border-l-4 border-l-muted-foreground/40",
    avatar: "bg-muted text-muted-foreground",
    ring: "ring-1 ring-border",
    icon: Clock,
  },
} as const

type StatusFilterType = "all" | "present" | "absent" | "pending"

export function QRSummaryState({
  subjectLabel,
  classLabel,
  periodLabel,
  dateLabel,
  initialStudents,
  teacherId,
  sessionId,
  classId,
  onDone,
}: QRSummaryStateProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [students, setStudents] = useState<Student[]>(() => [...initialStudents])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>("all")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkOverriding, setIsBulkOverriding] = useState(false)

  useEffect(() => {
    if (initialStudents.length === 0 && classId && sessionId) {
      fetch(`/api/teacher/student-list?class_id=${classId}&session_id=${sessionId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.students) {
            setStudents(data.students)
          }
        })
        .catch((err) => console.error("Failed to load students in summary state:", err))
    }
  }, [classId, sessionId, initialStudents.length])

  // Count calculations
  const total = students.length
  const presentCount = students.filter((s) => s.status === "present").length
  const absentCount = students.filter((s) => s.status === "absent").length
  const failedCount = students.filter((s) => s.status === "failed").length
  const pendingCount = students.filter((s) => s.status === "pending" || s.status === "failed").length
  const markedCount = presentCount + absentCount
  const turnoutPct = total > 0 ? Math.round((presentCount / total) * 100) : 0

  // Filter and sort students client-side
  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase()
    return students
      .filter((s) => {
        // Status filter
        if (statusFilter === "present" && s.status !== "present") return false
        if (statusFilter === "absent" && s.status !== "absent") return false
        if (statusFilter === "pending" && s.status !== "pending" && s.status !== "failed") return false

        // Search filter (name or roll)
        if (q) {
          const matchName = s.name.toLowerCase().includes(q)
          const matchRoll = s.roll.toLowerCase().includes(q)
          if (!matchName && !matchRoll) return false
        }

        return true
      })
      .sort((a, b) => {
        const order = { present: 0, failed: 1, pending: 2, absent: 3 }
        const diff = (order[a.status as keyof typeof order] ?? 99) - (order[b.status as keyof typeof order] ?? 99)
        if (diff !== 0) return diff
        return a.name.localeCompare(b.name)
      })
  }, [students, search, statusFilter])

  // Selection helpers
  const visibleStudentIds = useMemo(() => filteredStudents.map((s) => s.id), [filteredStudents])
  const allVisibleSelected =
    visibleStudentIds.length > 0 && visibleStudentIds.every((id) => selectedIds.has(id))
  const someVisibleSelected =
    visibleStudentIds.some((id) => selectedIds.has(id)) && !allVisibleSelected

  function toggleSelectAllVisible() {
    if (allVisibleSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        visibleStudentIds.forEach((id) => next.delete(id))
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        visibleStudentIds.forEach((id) => next.add(id))
        return next
      })
    }
  }

  function toggleSelectStudent(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  // Server-authoritative override handler (used for both single and bulk)
  async function performAttendanceOverride(targetIds: string[], newStatus: "present" | "absent") {
    if (targetIds.length === 0) return

    // Snapshot previous statuses for rollback on failure
    const previousMap = new Map<string, string>()
    students.forEach((s) => {
      if (targetIds.includes(s.id)) {
        previousMap.set(s.id, s.status)
      }
    })

    // Optimistic UI update
    setStudents((prev) =>
      prev.map((s) => (targetIds.includes(s.id) ? { ...s, status: newStatus } : s))
    )

    try {
      const res = await fetch("/api/teacher/bulk-override-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          studentIds: targetIds,
          status: newStatus,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update attendance")
      }

      if (targetIds.length === 1) {
        const student = students.find((s) => s.id === targetIds[0])
        toast.success(`Marked ${newStatus} — ${student?.name || "Student"}`)
      } else {
        toast.success(`Marked ${targetIds.length} students as ${newStatus}`)
        clearSelection()
      }
    } catch (err: any) {
      console.error("Attendance override error:", err)
      // Rollback to snapshot
      setStudents((prev) =>
        prev.map((s) => {
          const oldStatus = previousMap.get(s.id)
          return oldStatus ? { ...s, status: oldStatus as any } : s
        })
      )
      toast.error("Failed to update status", {
        description: err?.message || "Server rejected update. Status has been reverted.",
      })
    }
  }

  async function handleSingleOverride(studentId: string, newStatus: "present" | "absent") {
    await performAttendanceOverride([studentId], newStatus)
  }

  async function handleBulkOverride(newStatus: "present" | "absent") {
    const targetIds = Array.from(selectedIds)
    if (targetIds.length === 0) return
    setIsBulkOverriding(true)
    try {
      await performAttendanceOverride(targetIds, newStatus)
    } finally {
      setIsBulkOverriding(false)
    }
  }

  async function handleDone() {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      await onDone()
    } catch (err) {
      console.error("Error finalizing session:", err)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      {/* ── Session Summary Header Card ── */}
      <Card className="border-border shadow-md overflow-hidden bg-card">
        {/* Accent strip */}
        <div className="h-1.5 w-full bg-linear-to-r from-emerald-500 via-primary to-sky-500" />

        <CardHeader className="pb-4 pt-6 px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-300 dark:border-amber-800/60 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                  <Check className="size-3" />
                  REVIEWING — NOT YET FINAL
                </span>
                <span className="text-xs text-muted-foreground font-medium">{dateLabel}</span>
              </div>
              <CardTitle className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                {subjectLabel}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                {classLabel} &middot; {periodLabel}
              </CardDescription>
            </div>

            {/* Completeness Badge */}
            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/80 bg-muted/30 text-xs font-semibold">
                <span className="text-foreground font-bold">{total} Enrolled</span>
                <span className="text-muted-foreground/60">·</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">{markedCount} Marked</span>
                {pendingCount > 0 && (
                  <>
                    <span className="text-muted-foreground/60">·</span>
                    <span className="text-amber-600 dark:text-amber-400 font-bold">{pendingCount} Pending</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-6 pb-6 pt-0">
          {/* Stat Tiles Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-2">
            {/* Present Tile */}
            <div className="rounded-xl border border-emerald-200/80 bg-linear-to-b from-emerald-500/10 via-card to-card p-3.5 shadow-2xs dark:border-emerald-900/50">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-4" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  Present
                </span>
              </div>
              <div className="text-2xl font-black text-foreground">{presentCount}</div>
              <div className="text-[11px] text-muted-foreground font-medium mt-0.5">
                {turnoutPct}% attendance
              </div>
            </div>

            {/* Absent Tile */}
            <div className="rounded-xl border border-rose-200/80 bg-linear-to-b from-rose-500/10 via-card to-card p-3.5 shadow-2xs dark:border-rose-900/50">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex size-7 items-center justify-center rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400">
                  <XCircle className="size-4" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                  Absent
                </span>
              </div>
              <div className="text-2xl font-black text-foreground">{absentCount}</div>
              <div className="text-[11px] text-muted-foreground font-medium mt-0.5">
                {total > 0 ? Math.round((absentCount / total) * 100) : 0}% absent
              </div>
            </div>

            {/* Pending / Unmarked Tile */}
            {pendingCount > 0 ? (
              <div className="rounded-xl border border-amber-200/80 bg-linear-to-b from-amber-500/10 via-card to-card p-3.5 shadow-2xs dark:border-amber-900/50">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    <AlertCircle className="size-4" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                    Pending
                  </span>
                </div>
                <div className="text-2xl font-black text-foreground">{pendingCount}</div>
                <div className="text-[11px] text-muted-foreground font-medium mt-0.5">Unresolved status</div>
              </div>
            ) : (
              <div className="rounded-xl border border-sky-200/80 bg-linear-to-b from-sky-500/10 via-card to-card p-3.5 shadow-2xs dark:border-sky-900/50">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400">
                    <Users className="size-4" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">
                    Total
                  </span>
                </div>
                <div className="text-2xl font-black text-foreground">{total}</div>
                <div className="text-[11px] text-muted-foreground font-medium mt-0.5">Enrolled students</div>
              </div>
            )}

            {/* Turnout Metric */}
            <div className="rounded-xl border border-border bg-muted/20 p-3.5 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ShieldCheck className="size-4" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Turnout
                </span>
              </div>
              <div className="text-2xl font-black text-primary">{turnoutPct}%</div>
              <div className="text-[11px] text-muted-foreground font-medium mt-0.5">
                {presentCount}/{total} logged
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Student Verification List & Review Controls ── */}
      <Card className="border-border shadow-2xs overflow-hidden bg-card">
        <CardHeader className="pb-3.5 border-b border-border/60 bg-muted/10">
          <div className="flex flex-col gap-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-bold text-foreground">
                  Roster Attendance Records
                </CardTitle>
                <CardDescription className="text-[11px] text-muted-foreground">
                  Review and correct attendance below. This session becomes final only after you click Finalize.
                </CardDescription>
              </div>
              <span className="text-xs font-semibold text-muted-foreground self-start sm:self-auto">
                Showing {filteredStudents.length} of {total} records
              </span>
            </div>

            {/* Search & Filter Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
              {/* Search Field */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search by student name or roll number..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8.5 h-8.5 text-xs rounded-xl bg-background border-border/80 focus-visible:ring-1"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground hover:text-foreground cursor-pointer flex items-center justify-center"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1 rounded-xl p-1 bg-muted/40 border border-border/70 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={cn(
                    "px-2.5 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer",
                    statusFilter === "all"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  All ({total})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("present")}
                  className={cn(
                    "px-2.5 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer",
                    statusFilter === "present"
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : "text-emerald-700 dark:text-emerald-300 hover:text-foreground"
                  )}
                >
                  Present ({presentCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("absent")}
                  className={cn(
                    "px-2.5 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer",
                    statusFilter === "absent"
                      ? "bg-rose-600 text-white shadow-2xs"
                      : "text-rose-700 dark:text-rose-300 hover:text-foreground"
                  )}
                >
                  Absent ({absentCount})
                </button>
                {pendingCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setStatusFilter("pending")}
                    className={cn(
                      "px-2.5 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer",
                      statusFilter === "pending"
                        ? "bg-amber-600 text-white shadow-2xs"
                        : "text-amber-700 dark:text-amber-300 hover:text-foreground"
                    )}
                  >
                    Pending ({pendingCount})
                  </button>
                )}
              </div>
            </div>

            {/* Select All & Selection Header */}
            {filteredStudents.length > 0 && (
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50 text-xs">
                <label className="flex items-center gap-2 font-semibold text-muted-foreground hover:text-foreground cursor-pointer select-none">
                  <Checkbox
                    checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
                    onCheckedChange={toggleSelectAllVisible}
                  />
                  <span>
                    Select All {search || statusFilter !== "all" ? "Filtered" : ""} ({filteredStudents.length})
                  </span>
                </label>

                {selectedIds.size > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSelection}
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                  >
                    <X className="size-3" />
                    <span>Clear Selection</span>
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>

        {/* ── Sticky Bulk Action Bar ── */}
        {selectedIds.size > 0 && (
          <div className="bg-primary/10 border-b border-primary/20 px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-2">
              <Badge className="bg-primary text-primary-foreground font-bold text-xs px-2.5 py-0.5">
                {selectedIds.size} Selected
              </Badge>
              <span className="text-xs text-foreground font-medium hidden sm:inline">
                Apply bulk attendance action to selected students:
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                disabled={isBulkOverriding}
                onClick={() => handleBulkOverride("present")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs font-bold h-8 rounded-lg shadow-2xs cursor-pointer"
              >
                <UserCheck className="size-3.5" />
                <span>Mark Present</span>
              </Button>

              <Button
                size="sm"
                variant="destructive"
                disabled={isBulkOverriding}
                onClick={() => handleBulkOverride("absent")}
                className="gap-1.5 text-xs font-bold h-8 rounded-lg shadow-2xs cursor-pointer"
              >
                <UserX className="size-3.5" />
                <span>Mark Absent</span>
              </Button>
            </div>
          </div>
        )}

        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-2">
            {filteredStudents.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                <Search className="mx-auto size-7 text-muted-foreground/40 mb-2" />
                <p className="font-semibold text-xs">
                  {search || statusFilter !== "all"
                    ? "No students match your filter criteria."
                    : "No student records found for this session."}
                </p>
                {(search || statusFilter !== "all") && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => {
                      setSearch("")
                      setStatusFilter("all")
                    }}
                    className="text-xs mt-1"
                  >
                    Reset filters
                  </Button>
                )}
              </div>
            ) : (
              filteredStudents.map((s) => {
                const cfg = statusConfig[s.status as keyof typeof statusConfig] || statusConfig.absent
                const StatusIcon = cfg.icon
                const isSelected = selectedIds.has(s.id)

                return (
                  <div
                    key={s.id}
                    className={cn(
                      "flex items-center justify-between gap-3.5 rounded-xl border border-border/80 p-3 sm:p-3.5 transition-all hover:bg-muted/30 shadow-2xs",
                      cfg.row,
                      isSelected && "ring-2 ring-primary/40 bg-primary/5"
                    )}
                  >
                    {/* Checkbox & Avatar & Info */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelectStudent(s.id)}
                        className="mr-0.5 shrink-0 cursor-pointer"
                        aria-label={`Select ${s.name}`}
                      />

                      <Avatar className={cn("size-9 shrink-0", cfg.ring)}>
                        {s.photoUrl && s.status === "present" && (
                          <AvatarImage src={s.photoUrl} alt={s.name} className="object-cover" />
                        )}
                        <AvatarFallback className={cn("text-xs font-bold", cfg.avatar)}>
                          {s.initials}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="text-xs sm:text-sm font-bold text-foreground truncate">
                          {s.name}
                        </span>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                          <span className="font-mono font-semibold">{s.roll}</span>
                          {formatScanTime(s.time) && (
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                              <Clock className="size-2.5" />
                              {formatScanTime(s.time)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Badge & Individual Override Menu */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className={cn("gap-1 text-xs px-2.5 py-0.5", cfg.badge)}>
                        <StatusIcon className="size-3" />
                        {cfg.label}
                      </Badge>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="size-8 rounded-lg hover:bg-muted cursor-pointer"
                            aria-label="Override attendance"
                          >
                            <Pencil className="size-3.5 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl border-border shadow-md">
                          <DropdownMenuItem
                            onClick={() => handleSingleOverride(s.id, "present")}
                            className="text-xs font-semibold text-emerald-700 focus:text-emerald-700 focus:bg-emerald-50 dark:text-emerald-300 dark:focus:bg-emerald-950/40 cursor-pointer"
                          >
                            <CheckCircle2 className="mr-2 size-4" /> Mark Present
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleSingleOverride(s.id, "absent")}
                            className="text-xs font-semibold text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:text-rose-400 dark:focus:bg-rose-950/40 cursor-pointer"
                          >
                            <XCircle className="mr-2 size-4" /> Mark Absent
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Finalization Safeguard Banner (if pending exist) ── */}
      {pendingCount > 0 && (
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-500/10 text-amber-800 dark:text-amber-200 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="size-4 text-amber-600 shrink-0" />
            <span>
              <strong>{pendingCount} student{pendingCount > 1 ? "s" : ""}</strong> remain pending/unmarked. Finalizing will record them as absent.
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStatusFilter("pending")}
            className="h-7 text-xs font-bold border-amber-400 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 text-amber-800 dark:text-amber-200"
          >
            Review Pending
          </Button>
        </div>
      )}

      {/* ── Finalize Button ── */}
      <Button
        onClick={handleDone}
        disabled={isSubmitting}
        size="lg"
        className="w-full gap-2 font-bold shadow-sm hover:shadow transition-all h-11.5 rounded-xl text-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <>
            <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span>Finalizing Session...</span>
          </>
        ) : (
          <>
            <span>Finalize Session &amp; Return to Setup</span>
            <ArrowRight className="size-4" />
          </>
        )}
      </Button>
    </div>
  )
}