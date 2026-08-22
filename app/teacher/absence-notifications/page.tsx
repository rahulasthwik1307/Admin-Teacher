"use client"

import { useState, useEffect, useMemo } from "react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  Loader2,
  CheckCheck,
  Send,
  MailX,
  Search,
  History,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  BookOpen,
  CalendarDays,
  Clock,
  Download,
  ArrowUpDown,
  Mail,
  Eye,
  Users,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Calendar,
} from "lucide-react"
import { MissedAttendanceSkeleton } from "@/components/ui/skeletons"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"

interface EligibleAbsence {
  periodAttendanceId: string
  studentId: string
  studentName: string
  rollNumber: string
  year: string
  className: string
  contactEmail: string | null
  alreadyNotified: boolean
  subjectId: string
  subjectName: string
  periodNumber: number
  startTime: string
  endTime: string
  date: string
  overallAttendancePct: number
}

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

function severityBadge(pct: number) {
  if (pct < 65) {
    return {
      label: `${pct}% — Critical`,
      className:
        "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-300/70 dark:border-rose-800/60",
      dot: "bg-rose-500",
    }
  }
  if (pct < 75) {
    return {
      label: `${pct}% — Low`,
      className:
        "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300/70 dark:border-amber-800/60",
      dot: "bg-amber-500",
    }
  }
  return {
    label: `${pct}% — Good`,
    className:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300/70 dark:border-emerald-800/60",
    dot: "bg-emerald-500",
  }
}

const AVATAR_COLORS = [
  "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-300/60 dark:border-sky-800/60",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300/60 dark:border-emerald-800/60",
  "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-300/60 dark:border-violet-800/60",
  "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300/60 dark:border-amber-800/60",
  "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-300/60 dark:border-rose-800/60",
  "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-300/60 dark:border-teal-800/60",
]

function getAvatarColor(name: string) {
  const charCode = name.charCodeAt(0) || 0
  return AVATAR_COLORS[charCode % AVATAR_COLORS.length]
}

function getInitials(name: string): string {
  return (
    name
      .split(" ")
      .filter((w) => w[0] && w[0] === w[0].toUpperCase())
      .map((w) => w[0])
      .join("")
      .slice(0, 2) ||
    name.slice(0, 2).toUpperCase() ||
    "ST"
  )
}

function exportPendingCSV(groups: any[]) {
  const rows = [["Student", "Roll No", "Year", "Section", "Overall %", "Pending Absences"]]
  for (const g of groups) {
    const pending = Array.from(g.subjects.values())
      .flat()
      .filter((a: any) => !a.alreadyNotified).length
    rows.push([
      g.studentName,
      g.rollNumber,
      g.year,
      g.className,
      `${g.overallAttendancePct}%`,
      String(pending),
    ])
  }
  const csv = rows.map((r) => r.map((c: string) => `"${c}"`).join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `pending-absences-${new Date().toISOString().split("T")[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

async function openPreview(
  studentId: string,
  ids: string[],
  setLoading: (b: boolean) => void,
  setData: (d: any) => void,
  setOpen: (b: boolean) => void
) {
  setOpen(true)
  setLoading(true)
  try {
    const res = await fetch("/api/teacher/absence-notifications/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, periodAttendanceIds: ids }),
    })
    const data = await res.json()
    if (res.ok) setData(data)
  } finally {
    setLoading(false)
  }
}

export default function AbsenceNotificationsPage() {
  const shouldReduceMotion = useReducedMotion()
  const [tab, setTab] = useState<"send" | "history">("send")
  const [absences, setAbsences] = useState<EligibleAbsence[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<any>(null)

  const [sortBy, setSortBy] = useState<"name" | "attendance">("attendance")
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewData, setPreviewData] = useState<{ subject: string; html: string } | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const [search, setSearch] = useState("")
  const [filterSubject, setFilterSubject] = useState("all")
  const [filterYear, setFilterYear] = useState("all")
  const [filterSection, setFilterSection] = useState("all")
  const [filterEmail, setFilterEmail] = useState("all")
  const [filterStatus, setFilterStatus] = useState("pending") // pending | notified | all
  const [filterDateFrom, setFilterDateFrom] = useState("")
  const [filterDateTo, setFilterDateTo] = useState("")

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const [history, setHistory] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detail, setDetail] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const fetchPending = async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const res = await fetch("/api/teacher/absence-notifications/pending")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAbsences(data)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }

  const fetchHistory = async () => {
    setHistoryLoading(true)
    try {
      const res = await fetch("/api/teacher/absence-notifications/history")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setHistory(data)
    } catch {
      toast.error("Failed to load history")
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    fetchPending()
    fetchHistory()
  }, [])

  const uniqueSubjects = useMemo(
    () => Array.from(new Set(absences.map((a) => a.subjectName))).sort(),
    [absences]
  )
  const uniqueYears = useMemo(
    () => Array.from(new Set(absences.map((a) => a.year))).sort(),
    [absences]
  )
  const uniqueSections = useMemo(
    () => Array.from(new Set(absences.map((a) => a.className))).sort(),
    [absences]
  )

  const filtered = useMemo(() => {
    return absences.filter((a) => {
      if (
        search &&
        !a.studentName.toLowerCase().includes(search.toLowerCase()) &&
        !a.rollNumber.toLowerCase().includes(search.toLowerCase())
      )
        return false
      if (filterSubject !== "all" && a.subjectName !== filterSubject) return false
      if (filterYear !== "all" && a.year !== filterYear) return false
      if (filterSection !== "all" && a.className !== filterSection) return false
      if (filterEmail === "has_email" && !a.contactEmail) return false
      if (filterEmail === "no_email" && a.contactEmail) return false
      if (filterStatus === "pending" && a.alreadyNotified) return false
      if (filterStatus === "notified" && !a.alreadyNotified) return false
      if (filterDateFrom && a.date < filterDateFrom) return false
      if (filterDateTo && a.date > filterDateTo) return false
      return true
    })
  }, [
    absences,
    search,
    filterSubject,
    filterYear,
    filterSection,
    filterEmail,
    filterStatus,
    filterDateFrom,
    filterDateTo,
  ])

  // Student → Subject grouping
  const studentGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        studentId: string
        studentName: string
        rollNumber: string
        year: string
        className: string
        contactEmail: string | null
        overallAttendancePct: number
        subjects: Map<string, EligibleAbsence[]>
      }
    >()
    for (const a of filtered) {
      if (!map.has(a.studentId)) {
        map.set(a.studentId, {
          studentId: a.studentId,
          studentName: a.studentName,
          rollNumber: a.rollNumber,
          year: a.year,
          className: a.className,
          contactEmail: a.contactEmail,
          overallAttendancePct: a.overallAttendancePct,
          subjects: new Map(),
        })
      }
      const g = map.get(a.studentId)!
      if (!g.subjects.has(a.subjectId)) g.subjects.set(a.subjectId, [])
      g.subjects.get(a.subjectId)!.push(a)
    }
    const groups = Array.from(map.values())
    return sortBy === "attendance"
      ? groups.sort((a, b) => a.overallAttendancePct - b.overallAttendancePct)
      : groups.sort((a, b) => a.studentName.localeCompare(b.studentName))
  }, [filtered, sortBy])

  useEffect(() => {
    if (studentGroups.length > 8) setCollapsed(new Set(studentGroups.map((g) => g.studentId)))
    else setCollapsed(new Set())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentGroups.length])

  const selectableIds = useMemo(
    () => filtered.filter((a) => !a.alreadyNotified).map((a) => a.periodAttendanceId),
    [filtered]
  )
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id))
  const selectedStudentIds = useMemo(
    () =>
      new Set(
        filtered
          .filter((a) => selectedIds.has(a.periodAttendanceId))
          .map((a) => a.studentId)
      ),
    [filtered, selectedIds]
  )

  const pendingAbsencesTotal = useMemo(
    () => absences.filter((a) => !a.alreadyNotified).length,
    [absences]
  )

  const hasActiveFilters = Boolean(
    search ||
      filterSubject !== "all" ||
      filterYear !== "all" ||
      filterSection !== "all" ||
      filterEmail !== "all" ||
      filterStatus !== "pending" ||
      filterDateFrom ||
      filterDateTo
  )

  const clearAllFilters = () => {
    setSearch("")
    setFilterSubject("all")
    setFilterYear("all")
    setFilterSection("all")
    setFilterEmail("all")
    setFilterStatus("pending")
    setFilterDateFrom("")
    setFilterDateTo("")
  }

  function toggle(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const n = new Set(prev)
      checked ? n.add(id) : n.delete(id)
      return n
    })
  }

  function toggleGroup(ids: string[], checked: boolean) {
    setSelectedIds((prev) => {
      const n = new Set(prev)
      for (const id of ids) checked ? n.add(id) : n.delete(id)
      return n
    })
  }

  function toggleCollapse(studentId: string) {
    setCollapsed((prev) => {
      const n = new Set(prev)
      n.has(studentId) ? n.delete(studentId) : n.add(studentId)
      return n
    })
  }

  async function handleSend() {
    setSending(true)
    try {
      const res = await fetch("/api/teacher/absence-notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodAttendanceIds: Array.from(selectedIds) }),
      })
      const result = await res.json()
      if (!res.ok) {
        toast.error(result.error || "Failed to send")
        return
      }
      setSendResult(result)
      setSelectedIds(new Set())
      fetchPending()
      fetchHistory()
    } catch {
      toast.error("An unexpected error occurred")
    } finally {
      setSending(false)
    }
  }

  async function openDetail(batchId: string) {
    setDetailOpen(true)
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/teacher/absence-notifications/history/${batchId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDetail(data)
    } catch {
      toast.error("Failed to load details")
    } finally {
      setDetailLoading(false)
    }
  }

  const tabsConfig = [
    {
      id: "send" as const,
      label: "Send Notifications",
      icon: Send,
      count: pendingAbsencesTotal,
      loading,
      badgeActive: "bg-primary text-primary-foreground",
    },
    {
      id: "history" as const,
      label: "Notification History",
      icon: History,
      count: history.length,
      loading: historyLoading,
      badgeActive: "bg-sky-600 text-white",
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Absence Notifications
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Notify students and guardians about recorded absences and monitor email dispatch history.
          </p>
        </div>
      </div>

      {/* ── Segmented Tab Switcher ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="inline-flex flex-wrap items-center gap-1.5 rounded-xl bg-muted/60 p-1.5 border border-border/70 shadow-2xs self-start">
          {tabsConfig.map((t) => {
            const isActive = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative flex items-center gap-2 rounded-lg h-10 px-4 text-xs font-semibold transition-all duration-150 cursor-pointer select-none ${
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeAbsenceTabPill"
                    className="absolute inset-0 rounded-lg bg-card shadow-xs ring-1 ring-border/80"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <t.icon
                    className={`size-3.5 ${isActive ? "text-primary" : "text-muted-foreground"}`}
                  />
                  <span>{t.label}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold min-w-5 text-center transition-colors ${
                      isActive ? t.badgeActive : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {t.loading ? "—" : t.count}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Main Tab Content ── */}
      <AnimatePresence mode="wait">
        {tab === "send" && (
          <motion.div
            key="tab-send"
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="flex flex-col gap-4"
          >
            {/* ── Filter Toolbar ── */}
            <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card/60 p-3.5 sm:p-4 shadow-2xs">
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search */}
                <div className="relative shrink-0 min-w-56 sm:min-w-64 flex-1 sm:flex-none">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search student or roll..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-10 pl-9 pr-8 text-xs font-medium rounded-xl border-border/80 bg-card shadow-2xs focus-visible:ring-primary/20 transition-all w-full sm:w-64 md:w-72"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>

                {/* Subject Filter */}
                <Select value={filterSubject} onValueChange={setFilterSubject}>
                  <SelectTrigger className="h-10 w-full sm:w-auto sm:min-w-44 text-xs font-semibold rounded-xl bg-card border-border/80 shadow-2xs hover:border-primary/40 focus-visible:ring-primary/20 shrink-0">
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <BookOpen className="size-3.5 text-muted-foreground shrink-0" />
                      <span>
                        {filterSubject === "all" ? "All Subjects" : filterSubject}
                      </span>
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border shadow-md">
                    <SelectItem value="all" className="text-xs font-semibold">
                      All Subjects
                    </SelectItem>
                    {uniqueSubjects.map((s) => (
                      <SelectItem key={s} value={s} className="text-xs font-semibold">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Year Filter */}
                <Select value={filterYear} onValueChange={setFilterYear}>
                  <SelectTrigger className="h-10 w-full sm:w-auto sm:min-w-32 text-xs font-semibold rounded-xl bg-card border-border/80 shadow-2xs hover:border-primary/40 focus-visible:ring-primary/20 shrink-0">
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <GraduationCap className="size-3.5 text-muted-foreground shrink-0" />
                      <span>
                        {filterYear === "all" ? "All Years" : filterYear}
                      </span>
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border shadow-md">
                    <SelectItem value="all" className="text-xs font-semibold">
                      All Years
                    </SelectItem>
                    {uniqueYears.map((y) => (
                      <SelectItem key={y} value={y} className="text-xs font-semibold">
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Section Filter */}
                <Select value={filterSection} onValueChange={setFilterSection}>
                  <SelectTrigger className="h-10 w-full sm:w-auto sm:min-w-36 text-xs font-semibold rounded-xl bg-card border-border/80 shadow-2xs hover:border-primary/40 focus-visible:ring-primary/20 shrink-0">
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <Users className="size-3.5 text-muted-foreground shrink-0" />
                      <span>
                        {filterSection === "all" ? "All Sections" : filterSection}
                      </span>
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border shadow-md">
                    <SelectItem value="all" className="text-xs font-semibold">
                      All Sections
                    </SelectItem>
                    {uniqueSections.map((s) => (
                      <SelectItem key={s} value={s} className="text-xs font-semibold">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Email Filter */}
                <Select value={filterEmail} onValueChange={setFilterEmail}>
                  <SelectTrigger className="h-10 w-full sm:w-auto sm:min-w-36 text-xs font-semibold rounded-xl bg-card border-border/80 shadow-2xs hover:border-primary/40 focus-visible:ring-primary/20 shrink-0">
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <Mail className="size-3.5 text-muted-foreground shrink-0" />
                      <span>
                        {filterEmail === "all"
                          ? "All Contacts"
                          : filterEmail === "has_email"
                          ? "Has Email"
                          : "No Email"}
                      </span>
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border shadow-md">
                    <SelectItem value="all" className="text-xs font-semibold">
                      All Contacts
                    </SelectItem>
                    <SelectItem value="has_email" className="text-xs font-semibold">
                      Has Email
                    </SelectItem>
                    <SelectItem value="no_email" className="text-xs font-semibold">
                      No Email
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* Status Filter */}
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-10 w-full sm:w-auto sm:min-w-40 text-xs font-semibold rounded-xl bg-card border-border/80 shadow-2xs hover:border-primary/40 focus-visible:ring-primary/20 shrink-0">
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <Clock className="size-3.5 text-muted-foreground shrink-0" />
                      <span>
                        {filterStatus === "pending"
                          ? "Pending Only"
                          : filterStatus === "notified"
                          ? "Already Notified"
                          : "All Absences"}
                      </span>
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border shadow-md">
                    <SelectItem value="pending" className="text-xs font-semibold">
                      Pending Only
                    </SelectItem>
                    <SelectItem value="notified" className="text-xs font-semibold">
                      Already Notified
                    </SelectItem>
                    <SelectItem value="all" className="text-xs font-semibold">
                      All Absences
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* Date Range Section */}
                <div className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-card px-2.5 h-10 shadow-2xs text-xs shrink-0">
                  <CalendarDays className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 shrink-0">
                    From
                  </span>
                  <input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="bg-muted/40 hover:bg-muted/60 border border-border/70 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-lg px-2 py-1 text-xs font-medium text-foreground outline-none transition-all cursor-pointer w-28"
                    aria-label="Filter start date"
                  />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 shrink-0">
                    To
                  </span>
                  <input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className="bg-muted/40 hover:bg-muted/60 border border-border/70 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-lg px-2 py-1 text-xs font-medium text-foreground outline-none transition-all cursor-pointer w-28"
                    aria-label="Filter end date"
                  />
                  {(filterDateFrom || filterDateTo) && (
                    <button
                      type="button"
                      onClick={() => {
                        setFilterDateFrom("")
                        setFilterDateTo("")
                      }}
                      className="p-1 hover:bg-muted/80 rounded-md text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      title="Clear date range"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Sub-toolbar: Sort, Clear, Expand/Collapse, Export */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border/50">
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                    <SelectTrigger className="h-9 w-56 text-xs font-semibold rounded-xl bg-card border-border/80 shadow-2xs hover:border-primary/40">
                      <div className="flex items-center gap-1.5 truncate">
                        <ArrowUpDown className="size-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">
                          {sortBy === "attendance"
                            ? "Sort: Lowest Attendance First"
                            : "Sort: Student Name (A–Z)"}
                        </span>
                      </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border shadow-md">
                      <SelectItem value="attendance" className="text-xs font-semibold">
                        Sort: Lowest Attendance First
                      </SelectItem>
                      <SelectItem value="name" className="text-xs font-semibold">
                        Sort: Student Name (A–Z)
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {hasActiveFilters && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearAllFilters}
                      className="h-9 rounded-xl border border-rose-200/80 bg-rose-50/60 dark:border-rose-900/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 hover:bg-rose-100/80 text-xs font-semibold px-3 gap-1.5 shadow-2xs transition-all cursor-pointer"
                    >
                      <X className="size-3.5" /> Clear Filters
                    </Button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 ml-auto">
                  {studentGroups.length > 8 && (
                    <div className="flex gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCollapsed(new Set())}
                        className="h-9 rounded-xl text-xs font-semibold shadow-2xs hover:bg-muted cursor-pointer"
                      >
                        Expand All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCollapsed(new Set(studentGroups.map((g) => g.studentId)))
                        }
                        className="h-9 rounded-xl text-xs font-semibold shadow-2xs hover:bg-muted cursor-pointer"
                      >
                        Collapse All
                      </Button>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportPendingCSV(studentGroups)}
                    disabled={studentGroups.length === 0}
                    className="h-9 rounded-xl text-xs font-semibold gap-1.5 shadow-2xs hover:bg-muted cursor-pointer"
                  >
                    <Download className="size-3.5 text-muted-foreground" />
                    <span>Export CSV</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* ── Select All Pending Bar & Send Action ── */}
            {!loading && !loadError && filtered.length > 0 && (
              <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-linear-to-r from-primary/10 via-card to-primary/5 dark:from-primary/20 dark:via-card dark:to-primary/10 p-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none bg-card/80 hover:bg-card border border-border/80 px-3 py-1.5 rounded-xl transition-colors shadow-2xs">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={(c) => toggleGroup(selectableIds, !!c)}
                        className="rounded-md data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <span className="text-xs font-bold text-foreground">Select all pending</span>
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-bold px-1.5 py-0 h-4.5 rounded-md"
                      >
                        {selectableIds.length}
                      </Badge>
                    </label>

                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <span className="inline-flex items-center gap-1 bg-muted/60 rounded-lg px-2.5 py-1 border border-border/60">
                        <strong className="text-foreground font-bold">
                          {selectedIds.size}
                        </strong>{" "}
                        absence{selectedIds.size !== 1 ? "s" : ""} selected
                      </span>
                      <span className="inline-flex items-center gap-1 bg-muted/60 rounded-lg px-2.5 py-1 border border-border/60">
                        <strong className="text-foreground font-bold">
                          {selectedStudentIds.size}
                        </strong>{" "}
                        student{selectedStudentIds.size !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  <Button
                    size="default"
                    disabled={selectedIds.size === 0 || sending}
                    onClick={() => setConfirmOpen(true)}
                    className="gap-2 rounded-xl h-10 px-5 font-bold shadow-xs hover:shadow transition-all bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed self-stretch sm:self-auto active:scale-[0.98]"
                  >
                    {sending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                    <span>
                      Send {selectedStudentIds.size} Email
                      {selectedStudentIds.size !== 1 ? "s" : ""}
                    </span>
                  </Button>
                </div>
              </div>
            )}

            {/* ── Student List / State Cards ── */}
            {loading ? (
              <MissedAttendanceSkeleton />
            ) : loadError ? (
              <Card className="rounded-2xl border-destructive/30">
                <CardContent className="py-16 text-center flex flex-col items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-1">
                    <AlertTriangle className="size-6" />
                  </div>
                  <p className="text-sm font-semibold text-destructive">
                    Unable to load absence records.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchPending}
                    className="rounded-xl mt-1"
                  >
                    Retry Connection
                  </Button>
                </CardContent>
              </Card>
            ) : studentGroups.length === 0 ? (
              <Card className="rounded-2xl border-border">
                <CardContent className="py-16 text-center flex flex-col items-center">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-3">
                    <CheckCheck className="size-6" />
                  </div>
                  <p className="text-sm font-bold text-foreground">
                    {absences.length === 0
                      ? "No pending absences"
                      : filterStatus === "pending"
                      ? "All matching absences have already been notified."
                      : "No students match the current filters."}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                    {absences.length === 0
                      ? "All student attendance records are currently up to date with zero unnotified absences."
                      : "Try adjusting your filter options or clearing the search box to view other records."}
                  </p>
                  {hasActiveFilters && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearAllFilters}
                      className="rounded-xl text-xs font-semibold mt-4"
                    >
                      Clear All Filters
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col gap-3">
                {studentGroups.map((group) => {
                  const isCollapsed = collapsed.has(group.studentId)
                  const groupIds = Array.from(group.subjects.values())
                    .flat()
                    .filter((a) => !a.alreadyNotified)
                    .map((a) => a.periodAttendanceId)
                  const groupAllSelected =
                    groupIds.length > 0 && groupIds.every((id) => selectedIds.has(id))
                  const pendingCount = Array.from(group.subjects.values())
                    .flat()
                    .filter((a) => !a.alreadyNotified).length
                  const severity = severityBadge(group.overallAttendancePct)
                  const avatarColor = getAvatarColor(group.studentName)

                  return (
                    <Card
                      key={group.studentId}
                      className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs transition-all hover:border-border"
                    >
                      <CardContent className="p-0">
                        {/* Student Header Summary Bar */}
                        <div
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-4 cursor-pointer gap-3 hover:bg-muted/20 transition-colors select-none"
                          onClick={() => toggleCollapse(group.studentId)}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex size-10 shrink-0 items-center justify-center rounded-xl font-bold text-xs border ${avatarColor}`}
                            >
                              {getInitials(group.studentName)}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-foreground truncate">
                                  {group.studentName}
                                </span>
                                <span className="font-mono text-[11px] font-bold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/60">
                                  {group.rollNumber}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                <span className="flex items-center gap-1 font-medium">
                                  <GraduationCap className="size-3.5 text-muted-foreground" />
                                  {group.year.toLowerCase().includes("year") ? group.year : `Year ${group.year}`} · {group.className.toLowerCase().includes("section") ? group.className : group.className}
                                </span>
                                {group.contactEmail ? (
                                  <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-muted-foreground/80 font-mono">
                                    · {group.contactEmail}
                                  </span>
                                ) : (
                                  <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                                    · No email recorded
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            <div className="flex flex-wrap items-center gap-1.5 justify-end">
                              <Badge
                                variant="secondary"
                                className="text-xs font-semibold px-2.5 py-0.5 rounded-lg"
                              >
                                {pendingCount} pending
                              </Badge>

                              <Badge
                                variant="outline"
                                className={`text-xs font-semibold px-2.5 py-0.5 rounded-lg flex items-center gap-1.5 ${severity.className}`}
                              >
                                <span className={`size-1.5 rounded-full ${severity.dot}`} />
                                <span>{severity.label}</span>
                              </Badge>

                              {!group.contactEmail && (
                                <Badge
                                  variant="outline"
                                  className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300/70 dark:border-amber-800/60"
                                >
                                  <MailX className="size-3 mr-1 text-amber-600" />
                                  <span>No email</span>
                                </Badge>
                              )}
                            </div>

                            <div className="flex size-7 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground ml-1">
                              {isCollapsed ? (
                                <ChevronRight className="size-4" />
                              ) : (
                                <ChevronDown className="size-4" />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Collapsible Details Body */}
                        <AnimatePresence initial={false}>
                          {!isCollapsed && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2, ease: "easeInOut" }}
                              className="border-t border-border/60 bg-muted/10 p-4 flex flex-col gap-4 overflow-hidden"
                            >
                              {/* Sub-header inside student card */}
                              <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-border/40">
                                <div className="flex items-center gap-3">
                                  {groupIds.length > 0 && (
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                      <Checkbox
                                        checked={groupAllSelected}
                                        onCheckedChange={(c) => toggleGroup(groupIds, !!c)}
                                        className="rounded-md"
                                      />
                                      <span className="text-xs font-bold text-foreground">
                                        Select all for this student
                                      </span>
                                    </label>
                                  )}
                                </div>

                                {groupIds.length > 0 && selectedIds.size > 0 && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs font-semibold gap-1.5 rounded-xl border-border/80 shadow-2xs hover:bg-card cursor-pointer"
                                    onClick={() => {
                                      const studentSelectedIds = Array.from(
                                        group.subjects.values()
                                      )
                                        .flat()
                                        .filter((a) => selectedIds.has(a.periodAttendanceId))
                                        .map((a) => a.periodAttendanceId)
                                      if (studentSelectedIds.length > 0) {
                                        openPreview(
                                          group.studentId,
                                          studentSelectedIds,
                                          setPreviewLoading,
                                          setPreviewData,
                                          setPreviewOpen
                                        )
                                      }
                                    }}
                                  >
                                    <Eye className="size-3.5 text-primary" />
                                    <span>Preview Email</span>
                                  </Button>
                                )}
                              </div>

                              {/* Grouped Subjects and Absence Rows */}
                              <div className="flex flex-col gap-4">
                                {Array.from(group.subjects.entries()).map(([subjId, records]) => {
                                  const subjIds = records
                                    .filter((r) => !r.alreadyNotified)
                                    .map((r) => r.periodAttendanceId)
                                  const subjAllSelected =
                                    subjIds.length > 0 &&
                                    subjIds.every((id) => selectedIds.has(id))
                                  return (
                                    <div
                                      key={subjId}
                                      className="rounded-xl border border-border/70 bg-card p-3.5 flex flex-col gap-2.5 shadow-2xs"
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <div className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                                            <BookOpen className="size-3.5" />
                                          </div>
                                          <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                                            {records[0].subjectName}
                                          </span>
                                          <Badge
                                            variant="secondary"
                                            className="text-[10px] font-bold px-1.5 py-0 h-4.5 rounded-md"
                                          >
                                            {records.length} session{records.length !== 1 ? "s" : ""}
                                          </Badge>
                                        </div>

                                        {subjIds.length > 1 && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs font-semibold px-2 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                                            onClick={() => toggleGroup(subjIds, !subjAllSelected)}
                                          >
                                            {subjAllSelected
                                              ? "Deselect subject"
                                              : `Select all in ${records[0].subjectName}`}
                                          </Button>
                                        )}
                                      </div>

                                      {/* Individual Absence Rows */}
                                      <div className="flex flex-col gap-1.5">
                                        {records
                                          .sort((a, b) => b.date.localeCompare(a.date))
                                          .map((r) => (
                                            <div
                                              key={r.periodAttendanceId}
                                              className={`flex items-center justify-between p-2.5 rounded-lg border text-xs transition-colors ${
                                                r.alreadyNotified
                                                  ? "bg-muted/30 border-border/40 opacity-70"
                                                  : selectedIds.has(r.periodAttendanceId)
                                                  ? "bg-primary/5 border-primary/30"
                                                  : "bg-muted/10 border-border/60 hover:bg-muted/30"
                                              }`}
                                            >
                                              <div className="flex items-center gap-3">
                                                <Checkbox
                                                  disabled={r.alreadyNotified}
                                                  checked={selectedIds.has(r.periodAttendanceId)}
                                                  onCheckedChange={(c) =>
                                                    toggle(r.periodAttendanceId, !!c)
                                                  }
                                                  className="rounded-md"
                                                />
                                                <div className="flex flex-wrap items-center gap-2">
                                                  <span className="font-semibold text-foreground">
                                                    {fmtDate(r.date)}
                                                  </span>
                                                  <span className="text-muted-foreground font-medium">
                                                    • Period {r.periodNumber}
                                                  </span>
                                                  <span className="text-muted-foreground/80 font-mono text-[11px]">
                                                    ({r.startTime} – {r.endTime})
                                                  </span>
                                                </div>
                                              </div>

                                              {r.alreadyNotified && (
                                                <Badge
                                                  variant="outline"
                                                  className="text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300/60 dark:border-emerald-800/60 ml-auto"
                                                >
                                                  <Check className="size-3 mr-1 text-emerald-600" />
                                                  Already notified
                                                </Badge>
                                              )}
                                            </div>
                                          ))}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ── Notification History Tab ── */}
        {tab === "history" && (
          <motion.div
            key="tab-history"
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="flex flex-col gap-3"
          >
            {historyLoading ? (
              <MissedAttendanceSkeleton />
            ) : history.length === 0 ? (
              <Card className="rounded-2xl border-border">
                <CardContent className="py-16 text-center flex flex-col items-center">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-3">
                    <History className="size-6" />
                  </div>
                  <p className="text-sm font-bold text-foreground">No notifications sent yet</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                    Dispatched absence notification batches and email delivery summaries will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              history.map((b: any) => (
                <Card
                  key={b.batchId}
                  className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-2xs hover:border-border transition-all"
                >
                  <CardContent className="p-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex flex-col gap-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-foreground">
                          {b.subjects.join(", ") || "General Notification"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1 font-medium">
                          <Calendar className="size-3.5 text-muted-foreground" />
                          {fmtDateTime(b.sentAt)}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-medium">
                          Sent by <strong className="text-foreground">{b.sentBy}</strong>
                        </span>
                      </div>

                      {/* History metrics chips */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <Badge
                          variant="secondary"
                          className="text-xs font-semibold px-2.5 py-0.5 rounded-lg"
                        >
                          <Users className="size-3 mr-1" />
                          {b.studentCount} students
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-muted/40"
                        >
                          {b.selectedCount} records
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300/60 dark:border-emerald-800/60"
                        >
                          <CheckCircle2 className="size-3 mr-1 text-emerald-600" />
                          {b.sentCount} sent
                        </Badge>
                        {b.failedCount > 0 && (
                          <Badge
                            variant="outline"
                            className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-300/60 dark:border-rose-800/60"
                          >
                            <XCircle className="size-3 mr-1 text-rose-600" />
                            {b.failedCount} failed
                          </Badge>
                        )}
                        {b.noEmailCount > 0 && (
                          <Badge
                            variant="outline"
                            className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300/60 dark:border-amber-800/60"
                          >
                            <MailX className="size-3 mr-1 text-amber-600" />
                            {b.noEmailCount} no email
                          </Badge>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDetail(b.batchId)}
                      className="rounded-xl h-10 px-4 text-xs font-semibold gap-1.5 shadow-2xs hover:bg-muted cursor-pointer shrink-0 self-start sm:self-auto"
                    >
                      <Eye className="size-3.5 text-primary" />
                      <span>View Details</span>
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Confirmation AlertDialog ── */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="rounded-2xl border-border shadow-xl sm:max-w-md">
          <AlertDialogHeader>
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-2">
              <Send className="size-5" />
            </div>
            <AlertDialogTitle className="text-lg font-bold">
              Send Absence Notifications?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              You are about to dispatch{" "}
              <strong className="text-foreground font-bold">
                {selectedStudentIds.size} email
                {selectedStudentIds.size !== 1 ? "s" : ""}
              </strong>{" "}
              covering{" "}
              <strong className="text-foreground font-bold">
                {selectedIds.size} absence record
                {selectedIds.size !== 1 ? "s" : ""}
              </strong>
              . Each student will receive a single consolidated notification summary.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 mt-2">
            <AlertDialogCancel
              disabled={sending}
              className="rounded-xl font-semibold cursor-pointer"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false)
                handleSend()
              }}
              disabled={sending}
              className="rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
            >
              {sending ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Confirm & Dispatch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Send Result AlertDialog ── */}
      <AlertDialog open={!!sendResult} onOpenChange={() => setSendResult(null)}>
        <AlertDialogContent className="rounded-2xl border-border shadow-xl sm:max-w-md">
          <AlertDialogHeader>
            <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-2">
              <CheckCircle2 className="size-5" />
            </div>
            <AlertDialogTitle className="text-lg font-bold">Dispatch Summary</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="flex flex-col gap-2 text-sm mt-2">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-300/60 dark:border-emerald-800/60">
                  <CheckCircle2 className="size-4 shrink-0" />
                  <span>{sendResult?.sentCount} email(s) successfully delivered</span>
                </div>
                {sendResult?.failedCount > 0 && (
                  <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-semibold bg-rose-500/10 p-2.5 rounded-xl border border-rose-300/60 dark:border-rose-800/60">
                    <XCircle className="size-4 shrink-0" />
                    <span>{sendResult.failedCount} failed to deliver</span>
                  </div>
                )}
                {sendResult?.noEmailCount > 0 && (
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-semibold bg-amber-500/10 p-2.5 rounded-xl border border-amber-300/60 dark:border-amber-800/60">
                    <MailX className="size-4 shrink-0" />
                    <span>{sendResult.noEmailCount} skipped (no contact email provided)</span>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2">
            <AlertDialogAction
              onClick={() => setSendResult(null)}
              className="rounded-xl font-bold bg-primary hover:bg-primary/90 cursor-pointer"
            >
              Done
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Notification History Details Sheet ── */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto p-0 flex flex-col gap-0 border-l border-border bg-background">
          <SheetHeader className="p-5 border-b border-border bg-card pr-14">
            <SheetTitle className="text-lg font-bold">Notification Batch Details</SheetTitle>
            {detail && (
              <SheetDescription className="text-xs text-muted-foreground">
                {detail.studentCount} students notified · {fmtDateTime(detail.sentAt)}
              </SheetDescription>
            )}
          </SheetHeader>

          {detailLoading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="size-6 animate-spin text-primary" />
              <span className="text-xs font-semibold">Loading batch delivery details...</span>
            </div>
          ) : (
            detail && (
              <div className="flex flex-col gap-3 p-5 overflow-y-auto">
                {detail.students.map((s: any, i: number) => {
                  const avatarColor = getAvatarColor(s.studentName)
                  return (
                    <div
                      key={i}
                      className="rounded-2xl border border-border/80 bg-card p-4 flex flex-col gap-3 shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex size-9 shrink-0 items-center justify-center rounded-xl font-bold text-xs border ${avatarColor}`}
                          >
                            {getInitials(s.studentName)}
                          </div>
                          <div className="flex flex-col">
                            <p className="text-xs font-bold text-foreground">{s.studentName}</p>
                            <p className="text-[11px] text-muted-foreground font-mono">
                              {s.rollNumber} {s.email ? `· ${s.email}` : ""}
                            </p>
                          </div>
                        </div>

                        {s.status === "sent" && (
                          <Badge
                            variant="outline"
                            className="text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300/60 dark:border-emerald-800/60"
                          >
                            <Check className="size-3 mr-1 text-emerald-600" />
                            Sent
                          </Badge>
                        )}
                        {s.status === "failed" && (
                          <Badge
                            variant="outline"
                            className="text-xs font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-300/60 dark:border-rose-800/60"
                          >
                            <X className="size-3 mr-1 text-rose-600" />
                            Failed
                          </Badge>
                        )}
                        {s.status === "no_email" && (
                          <Badge
                            variant="outline"
                            className="text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300/60 dark:border-amber-800/60"
                          >
                            <MailX className="size-3 mr-1 text-amber-600" />
                            No email
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-col gap-1.5 pt-2 border-t border-border/50">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Included Absences ({s.records.length})
                        </span>
                        {s.records.map((r: any, ri: number) => (
                          <div
                            key={ri}
                            className="flex items-center justify-between text-[11px] text-muted-foreground bg-muted/40 p-2 rounded-lg"
                          >
                            <span className="font-medium text-foreground">{r.subjectName}</span>
                            <span>
                              {fmtDate(r.date)} • Period {r.periodNumber}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          )}
        </SheetContent>
      </Sheet>

      {/* ── Email Preview Sheet ── */}
      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto p-0 flex flex-col gap-0 border-l border-border bg-background">
          <SheetHeader className="p-5 border-b border-border bg-card pr-14">
            <SheetTitle className="text-lg font-bold">Email Preview</SheetTitle>
            {previewData && (
              <SheetDescription className="text-xs text-muted-foreground font-mono">
                Subject: {previewData.subject}
              </SheetDescription>
            )}
          </SheetHeader>
          <div className="p-5 flex-1 overflow-y-auto">
            {previewLoading ? (
              <div className="p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="size-6 animate-spin text-primary" />
                <span className="text-xs font-semibold">Generating email preview HTML...</span>
              </div>
            ) : previewData ? (
              <div className="rounded-2xl border border-border bg-white dark:bg-zinc-950 p-4 overflow-hidden shadow-2xs">
                <div
                  className="prose prose-sm max-w-none text-foreground"
                  dangerouslySetInnerHTML={{ __html: previewData.html }}
                />
              </div>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
