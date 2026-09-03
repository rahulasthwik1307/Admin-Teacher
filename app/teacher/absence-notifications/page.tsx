"use client"

import { useState, useEffect, useMemo, Fragment } from "react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
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
  Sparkles,
  Building2,
  ShieldAlert,
} from "lucide-react"
import { MissedAttendanceSkeleton } from "@/components/ui/skeletons"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { createClient } from "@/lib/supabase/client"

interface EligibleAbsence {
  periodAttendanceId: string
  studentId: string
  studentName: string
  rollNumber: string
  year: string
  className: string
  section: string
  departmentCode: string
  cohortLabel: string
  contactEmail: string | null
  alreadyNotified: boolean
  sessionId: string
  subjectId: string
  subjectName: string
  classId: string
  periodId: string
  periodNumber: number
  startTime: string
  endTime: string
  date: string
  overallAttendancePct: number
  overallAttended: number
  overallTotalClasses: number
  subjectAttendancePct: number
  subjectAttended: number
  subjectTotalClasses: number
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

function severityBadge(pct: number, prefix: string = "") {
  const labelPrefix = prefix ? `${prefix}: ` : ""
  if (pct < 65) {
    return {
      label: `${labelPrefix}${pct}% — Critical`,
      shortLabel: `${labelPrefix}${pct}%`,
      className:
        "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-300/70 dark:border-rose-800/60",
      dot: "bg-rose-500",
    }
  }
  if (pct < 75) {
    return {
      label: `${labelPrefix}${pct}% — Low`,
      shortLabel: `${labelPrefix}${pct}%`,
      className:
        "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300/70 dark:border-amber-800/60",
      dot: "bg-amber-500",
    }
  }
  return {
    label: `${labelPrefix}${pct}% — Good`,
    shortLabel: `${labelPrefix}${pct}%`,
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

export const SUBJECT_THEMES: {
  [key: string]: {
    name: string
    border: string
    bg: string
    badge: string
    iconBg: string
    periodBadge: string
    chipBorder: string
    chipHover: string
    chipSelected: string
    accentText: string
    dot: string
  }
} = {
  blue: {
    name: "blue",
    border: "border-sky-300/70 dark:border-sky-800/70",
    bg: "bg-linear-to-b from-sky-500/[0.04] to-card",
    badge: "bg-sky-500/15 text-sky-800 dark:text-sky-200 border-sky-300/80 dark:border-sky-700/80",
    iconBg: "bg-sky-600 text-white shadow-xs",
    periodBadge: "bg-sky-600 text-white dark:bg-sky-500 dark:text-slate-950 font-black",
    chipBorder: "border-sky-200/80 dark:border-sky-900/60 bg-sky-500/[0.03] hover:border-sky-400 dark:hover:border-sky-600",
    chipHover: "hover:bg-sky-500/[0.08]",
    chipSelected: "bg-sky-500/15 border-sky-500 ring-2 ring-sky-500/30",
    accentText: "text-sky-700 dark:text-sky-300",
    dot: "bg-sky-500",
  },
  purple: {
    name: "purple",
    border: "border-purple-300/70 dark:border-purple-800/70",
    bg: "bg-linear-to-b from-purple-500/[0.04] to-card",
    badge: "bg-purple-500/15 text-purple-800 dark:text-purple-200 border-purple-300/80 dark:border-purple-700/80",
    iconBg: "bg-purple-600 text-white shadow-xs",
    periodBadge: "bg-purple-600 text-white dark:bg-purple-500 dark:text-slate-950 font-black",
    chipBorder: "border-purple-200/80 dark:border-purple-900/60 bg-purple-500/[0.03] hover:border-purple-400 dark:hover:border-purple-600",
    chipHover: "hover:bg-purple-500/[0.08]",
    chipSelected: "bg-purple-500/15 border-purple-500 ring-2 ring-purple-500/30",
    accentText: "text-purple-700 dark:text-purple-300",
    dot: "bg-purple-500",
  },
  emerald: {
    name: "emerald",
    border: "border-emerald-300/70 dark:border-emerald-800/70",
    bg: "bg-linear-to-b from-emerald-500/[0.04] to-card",
    badge: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-300/80 dark:border-emerald-700/80",
    iconBg: "bg-emerald-600 text-white shadow-xs",
    periodBadge: "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-950 font-black",
    chipBorder: "border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-500/[0.03] hover:border-emerald-400 dark:hover:border-emerald-600",
    chipHover: "hover:bg-emerald-500/[0.08]",
    chipSelected: "bg-emerald-500/15 border-emerald-500 ring-2 ring-emerald-500/30",
    accentText: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  amber: {
    name: "amber",
    border: "border-amber-300/70 dark:border-amber-800/70",
    bg: "bg-linear-to-b from-amber-500/[0.04] to-card",
    badge: "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-300/80 dark:border-amber-700/80",
    iconBg: "bg-amber-600 text-white shadow-xs",
    periodBadge: "bg-amber-600 text-white dark:bg-amber-500 dark:text-slate-950 font-black",
    chipBorder: "border-amber-200/80 dark:border-amber-900/60 bg-amber-500/[0.03] hover:border-amber-400 dark:hover:border-amber-600",
    chipHover: "hover:bg-amber-500/[0.08]",
    chipSelected: "bg-amber-500/15 border-amber-500 ring-2 ring-amber-500/30",
    accentText: "text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  indigo: {
    name: "indigo",
    border: "border-indigo-300/70 dark:border-indigo-800/70",
    bg: "bg-linear-to-b from-indigo-500/[0.04] to-card",
    badge: "bg-indigo-500/15 text-indigo-800 dark:text-indigo-200 border-indigo-300/80 dark:border-indigo-700/80",
    iconBg: "bg-indigo-600 text-white shadow-xs",
    periodBadge: "bg-indigo-600 text-white dark:bg-indigo-500 dark:text-slate-950 font-black",
    chipBorder: "border-indigo-200/80 dark:border-indigo-900/60 bg-indigo-500/[0.03] hover:border-indigo-400 dark:hover:border-indigo-600",
    chipHover: "hover:bg-indigo-500/[0.08]",
    chipSelected: "bg-indigo-500/15 border-indigo-500 ring-2 ring-indigo-500/30",
    accentText: "text-indigo-700 dark:text-indigo-300",
    dot: "bg-indigo-500",
  },
  rose: {
    name: "rose",
    border: "border-rose-300/70 dark:border-rose-800/70",
    bg: "bg-linear-to-b from-rose-500/[0.04] to-card",
    badge: "bg-rose-500/15 text-rose-800 dark:text-rose-200 border-rose-300/80 dark:border-rose-700/80",
    iconBg: "bg-rose-600 text-white shadow-xs",
    periodBadge: "bg-rose-600 text-white dark:bg-rose-500 dark:text-slate-950 font-black",
    chipBorder: "border-rose-200/80 dark:border-rose-900/60 bg-rose-500/[0.03] hover:border-rose-400 dark:hover:border-rose-600",
    chipHover: "hover:bg-rose-500/[0.08]",
    chipSelected: "bg-rose-500/15 border-rose-500 ring-2 ring-rose-500/30",
    accentText: "text-rose-700 dark:text-rose-300",
    dot: "bg-rose-500",
  },
}

const THEME_KEYS = ["blue", "purple", "emerald", "amber", "indigo", "rose"]

export function getSubjectTheme(subjectName: string) {
  const clean = (subjectName || "").toLowerCase()
  if (clean.includes("network") || clean.includes("cloud")) return SUBJECT_THEMES.blue
  if (clean.includes("learn") || clean.includes("ai") || clean.includes("intel")) return SUBJECT_THEMES.purple
  if (clean.includes("data") || clean.includes("db") || clean.includes("sql")) return SUBJECT_THEMES.emerald
  if (clean.includes("system") || clean.includes("os") || clean.includes("web")) return SUBJECT_THEMES.amber
  if (clean.includes("sec") || clean.includes("cyber") || clean.includes("soft")) return SUBJECT_THEMES.rose
  let hash = 0
  for (let i = 0; i < clean.length; i++) hash = clean.charCodeAt(i) + ((hash << 5) - hash)
  const idx = Math.abs(hash) % THEME_KEYS.length
  return SUBJECT_THEMES[THEME_KEYS[idx]]
}

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

function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function extractSectionsAndYears(batch: {
  sections?: string[]
  years?: string[]
  cohorts?: string[]
}): { sections: string[]; years: string[] } {
  const sections = new Set<string>(batch.sections || [])
  const years = new Set<string>(batch.years || [])

  if (sections.size === 0 && years.size === 0 && batch.cohorts) {
    for (const c of batch.cohorts) {
      const parts = c.split(/\s*[·•]\s*|\s+-\s+/)
      if (parts.length >= 2) {
        sections.add(parts[0].trim())
        years.add(parts.slice(1).join(" ").trim())
      } else if (c.toLowerCase().includes("year")) {
        years.add(c.trim())
      } else {
        sections.add(c.trim())
      }
    }
  }

  return {
    sections: Array.from(sections).filter(Boolean),
    years: Array.from(years).filter(Boolean),
  }
}

function exportPendingCSV(groups: any[]) {
  const rows = [
    [
      "Student Name",
      "Roll Number",
      "Department",
      "Academic Year",
      "Section",
      "Cohort Label",
      "Contact Email",
      "Email Status",
      "Overall Attendance %",
      "Overall Classes (Attended/Total)",
      "Subject Details",
      "Pending Absences",
    ],
  ]
  for (const g of groups) {
    const allRecords = Array.from(g.subjects.values()).flat() as any[]
    const pending = allRecords.filter((a: any) => !a.alreadyNotified).length
    const subjectSummaries = Array.from(g.subjects.entries())
      .map((entry: any) => {
        const [, recs] = entry as [string, any[]]
        const sName = recs[0]?.subjectName || "Subject"
        const sPct = recs[0]?.subjectAttendancePct ?? 100
        const sAtt = recs[0]?.subjectAttended ?? 0
        const sTot = recs[0]?.subjectTotalClasses ?? 0
        return `${sName}: ${sPct}% (${sAtt}/${sTot})`
      })
      .join(" | ")

    rows.push([
      g.studentName,
      g.rollNumber,
      g.departmentCode || "N/A",
      g.year || "N/A",
      g.section || "N/A",
      g.cohortLabel || `${g.departmentCode ? `${g.departmentCode} · ` : ""}${g.year} — Section ${g.section}`,
      g.contactEmail || "N/A",
      g.contactEmail ? "Configured" : "Missing Email",
      `${g.overallAttendancePct}%`,
      `${g.overallAttended ?? 0}/${g.overallTotalClasses ?? 0}`,
      subjectSummaries,
      String(pending),
    ])
  }
  const csv = rows.map((r) => r.map((c: string) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `absence-notifications-report-${new Date().toISOString().split("T")[0]}.csv`
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
  const [filterClass, setFilterClass] = useState("all")
  const [filterEmail, setFilterEmail] = useState("all")
  const [filterStatus, setFilterStatus] = useState("pending") // pending | notified | all
  const [filterDateFrom, setFilterDateFrom] = useState("")
  const [filterDateTo, setFilterDateTo] = useState("")

  const [teacherCohorts, setTeacherCohorts] = useState<
    { id: string; className: string; year: string; section: string; deptCode: string; label: string }[]
  >([])
  const [classSubjectMap, setClassSubjectMap] = useState<Map<string, { id: string; name: string }[]>>(
    new Map()
  )

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

    async function loadTeacherClasses() {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) {
          const { data: assignments } = await supabase
            .from("teacher_assignments")
            .select(`
              class_id,
              subject_id,
              class:classes(id, name, section, year, department:departments(code)),
              subject:subjects(id, name)
            `)
            .eq("teacher_id", user.id)
          if (assignments) {
            const cohortMap = new Map<
              string,
              { id: string; className: string; year: string; section: string; deptCode: string; label: string }
            >()
            const subjMap = new Map<string, { id: string; name: string }[]>()
            for (const a of assignments as any[]) {
              if (a.class && !cohortMap.has(a.class.id)) {
                const dCode = a.class.department?.code || ""
                const cName = dCode
                  ? `${dCode}-${a.class.section || "A"}`
                  : a.class.name && a.class.section
                  ? `${a.class.name}-${a.class.section}`
                  : `Section ${a.class.section || "A"}`
                cohortMap.set(a.class.id, {
                  id: a.class.id,
                  className: cName,
                  year: a.class.year,
                  section: a.class.section,
                  deptCode: dCode,
                  label: cName,
                })
              }
              if (a.class_id && a.subject) {
                if (!subjMap.has(a.class_id)) subjMap.set(a.class_id, [])
                const list = subjMap.get(a.class_id)!
                if (!list.some((s) => s.id === a.subject.id)) {
                  list.push({ id: a.subject.id, name: a.subject.name })
                }
              }
            }
            setTeacherCohorts(Array.from(cohortMap.values()))
            setClassSubjectMap(subjMap)
          }
        }
      } catch {
        // fail silently
      }
    }
    loadTeacherClasses()
  }, [])

  // Build academic year grouped cohort list with clean section identification
  const { cohortYearGroups, allCohortOptions } = useMemo(() => {
    const cohortMap = new Map<
      string,
      { id: string; className: string; year: string; section: string; deptCode: string; label: string }
    >()
    for (const c of teacherCohorts) {
      cohortMap.set(c.id, {
        id: c.id,
        className: c.className,
        year: c.year,
        section: c.section,
        deptCode: c.deptCode,
        label: c.className,
      })
    }
    for (const a of absences) {
      if (a.classId && !cohortMap.has(a.classId)) {
        const dCode = a.departmentCode || ""
        const cName = dCode
          ? `${dCode}-${a.section || "A"}`
          : a.className
          ? `${a.className}-${a.section}`
          : `Section ${a.section || "A"}`
        cohortMap.set(a.classId, {
          id: a.classId,
          className: cName,
          year: a.year || "Other",
          section: a.section,
          deptCode: dCode,
          label: cName,
        })
      }
    }

    const allOptions = Array.from(cohortMap.values())

    // Group cohorts by academic year
    const yearMap = new Map<string, typeof allOptions>()
    for (const opt of allOptions) {
      const yr = opt.year || "Other"
      if (!yearMap.has(yr)) yearMap.set(yr, [])
      yearMap.get(yr)!.push(opt)
    }

    // Sort cohorts inside each year by department then section / name
    for (const [, list] of yearMap.entries()) {
      list.sort(
        (a, b) =>
          a.deptCode.localeCompare(b.deptCode) ||
          a.section.localeCompare(b.section) ||
          a.className.localeCompare(b.className)
      )
    }

    // Sort year groups naturally
    const sortedYears = Array.from(yearMap.keys()).sort((a, b) => a.localeCompare(b))
    const groups = sortedYears.map((yr) => ({
      year: yr,
      cohorts: yearMap.get(yr)!,
    }))

    return { cohortYearGroups: groups, allCohortOptions: allOptions }
  }, [teacherCohorts, absences])

  // Derive subjects dynamically: When a cohort is selected, ONLY show subjects taught for that cohort
  const availableSubjects = useMemo(() => {
    if (filterClass === "all") {
      const seen = new Set<string>()
      for (const subjects of classSubjectMap.values()) {
        for (const s of subjects) {
          if (s.name) seen.add(s.name)
        }
      }
      for (const a of absences) {
        if (a.subjectName) seen.add(a.subjectName)
      }
      return Array.from(seen).sort()
    } else {
      const seen = new Set<string>()
      const list = classSubjectMap.get(filterClass) || []
      for (const s of list) {
        if (s.name) seen.add(s.name)
      }
      for (const a of absences) {
        if (a.classId === filterClass && a.subjectName) {
          seen.add(a.subjectName)
        }
      }
      return Array.from(seen).sort()
    }
  }, [filterClass, classSubjectMap, absences])

  // Auto-reset filterSubject if currently selected subject is not valid for newly selected class
  useEffect(() => {
    if (filterSubject !== "all" && !availableSubjects.includes(filterSubject)) {
      setFilterSubject("all")
    }
  }, [filterClass, filterSubject, availableSubjects])

  const filtered = useMemo(() => {
    return absences.filter((a) => {
      if (
        search &&
        !a.studentName.toLowerCase().includes(search.toLowerCase()) &&
        !a.rollNumber.toLowerCase().includes(search.toLowerCase()) &&
        !a.departmentCode.toLowerCase().includes(search.toLowerCase())
      )
        return false
      if (filterSubject !== "all" && a.subjectName !== filterSubject) return false
      if (filterClass !== "all" && a.classId !== filterClass) return false
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
    filterClass,
    filterEmail,
    filterStatus,
    filterDateFrom,
    filterDateTo,
  ])

  // Student → Subject grouping with rich attendance stats
  const studentGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        studentId: string
        studentName: string
        rollNumber: string
        year: string
        className: string
        section: string
        departmentCode: string
        cohortLabel: string
        contactEmail: string | null
        overallAttendancePct: number
        overallAttended: number
        overallTotalClasses: number
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
          section: a.section,
          departmentCode: a.departmentCode,
          cohortLabel:
            a.cohortLabel ||
            `${a.departmentCode ? `${a.departmentCode} · ` : ""}${a.year} — Section ${a.section}`,
          contactEmail: a.contactEmail,
          overallAttendancePct: a.overallAttendancePct,
          overallAttended: a.overallAttended,
          overallTotalClasses: a.overallTotalClasses,
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
  }, [studentGroups.length])

  // Emailable pending absences (students who have a valid email configured)
  const selectableIds = useMemo(
    () =>
      filtered
        .filter((a) => !a.alreadyNotified && Boolean(a.contactEmail))
        .map((a) => a.periodAttendanceId),
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

  // Count pending records and students who have NO email configured
  const { pendingNoEmailCount, pendingNoEmailStudents } = useMemo(() => {
    const noEmailAbsences = filtered.filter((a) => !a.alreadyNotified && !a.contactEmail)
    const studentSet = new Set(noEmailAbsences.map((a) => a.studentId))
    return {
      pendingNoEmailCount: noEmailAbsences.length,
      pendingNoEmailStudents: studentSet.size,
    }
  }, [filtered])

  const pendingAbsencesTotal = useMemo(
    () => absences.filter((a) => !a.alreadyNotified).length,
    [absences]
  )

  const hasActiveFilters = Boolean(
    search ||
      filterSubject !== "all" ||
      filterClass !== "all" ||
      filterEmail !== "all" ||
      filterStatus !== "pending" ||
      filterDateFrom ||
      filterDateTo
  )

  const clearAllFilters = () => {
    setSearch("")
    setFilterSubject("all")
    setFilterClass("all")
    setFilterEmail("all")
    setFilterStatus("pending")
    setFilterDateFrom("")
    setFilterDateTo("")
  }

  // Quick date presets
  const activeDatePreset = useMemo(() => {
    const now = new Date()
    const today = getLocalDateString(now)
    if (!filterDateFrom && !filterDateTo) return "all"
    if (filterDateFrom === today && filterDateTo === today) return "today"
    const yest = new Date(now)
    yest.setDate(yest.getDate() - 1)
    const yestStr = getLocalDateString(yest)
    if (filterDateFrom === yestStr && filterDateTo === yestStr) return "yesterday"
    const past7 = new Date(now)
    past7.setDate(past7.getDate() - 6)
    if (filterDateFrom === getLocalDateString(past7) && filterDateTo === today) return "7days"
    const past30 = new Date(now)
    past30.setDate(past30.getDate() - 29)
    if (filterDateFrom === getLocalDateString(past30) && filterDateTo === today) return "30days"
    return "custom"
  }, [filterDateFrom, filterDateTo])

  function setPresetDateRange(preset: "all" | "today" | "yesterday" | "7days" | "30days") {
    const now = new Date()
    if (preset === "all") {
      setFilterDateFrom("")
      setFilterDateTo("")
    } else if (preset === "today") {
      const today = getLocalDateString(now)
      setFilterDateFrom(today)
      setFilterDateTo(today)
    } else if (preset === "yesterday") {
      const yest = new Date(now)
      yest.setDate(yest.getDate() - 1)
      const yestStr = getLocalDateString(yest)
      setFilterDateFrom(yestStr)
      setFilterDateTo(yestStr)
    } else if (preset === "7days") {
      const past = new Date(now)
      past.setDate(past.getDate() - 6)
      setFilterDateFrom(getLocalDateString(past))
      setFilterDateTo(getLocalDateString(now))
    } else if (preset === "30days") {
      const past = new Date(now)
      past.setDate(past.getDate() - 29)
      setFilterDateFrom(getLocalDateString(past))
      setFilterDateTo(getLocalDateString(now))
    }
  }

  // Quick risk-tier eligible ID sets and smart toggle logic (Mutually Exclusive Buckets)
  const criticalEligibleIds = useMemo(() => {
    const ids = new Set<string>()
    for (const group of studentGroups) {
      if (group.overallAttendancePct < 65 && group.contactEmail) {
        for (const recs of group.subjects.values()) {
          for (const a of recs) {
            if (!a.alreadyNotified) ids.add(a.periodAttendanceId)
          }
        }
      }
    }
    return ids
  }, [studentGroups])

  const lowEligibleIds = useMemo(() => {
    const ids = new Set<string>()
    for (const group of studentGroups) {
      // Disjoint Warning/Low tier: between 65% and 75%
      if (group.overallAttendancePct >= 65 && group.overallAttendancePct < 75 && group.contactEmail) {
        for (const recs of group.subjects.values()) {
          for (const a of recs) {
            if (!a.alreadyNotified) ids.add(a.periodAttendanceId)
          }
        }
      }
    }
    return ids
  }, [studentGroups])

  const isCriticalSelected =
    criticalEligibleIds.size > 0 &&
    Array.from(criticalEligibleIds).every((id) => selectedIds.has(id))
  const isLowSelected =
    lowEligibleIds.size > 0 &&
    Array.from(lowEligibleIds).every((id) => selectedIds.has(id))

  function toggleRiskTier(tier: 65 | 75) {
    const isCritical = tier === 65
    const targetSet = isCritical ? criticalEligibleIds : lowEligibleIds
    const label = isCritical ? "critical (<65%)" : "low (65%–75%)"

    if (targetSet.size === 0) {
      toast.info(`No emailable students found in ${label} attendance tier`)
      return
    }
    const isCurrentlyAllSelected = Array.from(targetSet).every((id) => selectedIds.has(id))

    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (isCurrentlyAllSelected) {
        for (const id of targetSet) next.delete(id)
        toast.info(`Deselected ${targetSet.size} ${label} record(s)`)
      } else {
        for (const id of targetSet) next.add(id)
        toast.success(`Selected ${targetSet.size} ${label} record(s)`)
      }
      return next
    })
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
      {/* ── Page Subtitle ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 -mt-1">
        <p className="text-sm text-muted-foreground">
          Notify students and parents about recorded class absences with automated email digests and delivery tracking.
        </p>
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
            <div className="flex flex-col gap-3.5 rounded-2xl border border-border/80 bg-card/60 p-3.5 sm:p-4 shadow-2xs">
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search */}
                <div className="relative shrink-0 min-w-56 sm:min-w-64 flex-1 sm:flex-none">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search student, roll, or dept..."
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

                {/* Cohort / Section Filter (Grouped by Academic Year) */}
                <Select value={filterClass} onValueChange={setFilterClass}>
                  <SelectTrigger className="h-10 w-full sm:w-auto sm:min-w-44 text-xs font-semibold rounded-xl bg-card border-border/80 shadow-2xs hover:border-primary/40 focus-visible:ring-primary/20 shrink-0">
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <Users className="size-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">
                        {filterClass === "all"
                          ? "All Sections"
                          : allCohortOptions.find((c) => c.id === filterClass)?.className || "Selected Section"}
                      </span>
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border shadow-md min-w-48 py-1">
                    <SelectItem value="all" className="text-xs font-semibold py-1.5 px-2.5 cursor-pointer">
                      All Sections
                    </SelectItem>
                    {cohortYearGroups.map((group) => (
                      <Fragment key={group.year}>
                        <SelectSeparator className="my-1 bg-border/60" />
                        <SelectGroup>
                          <SelectLabel className="px-2.5 pt-1.5 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {group.year.toUpperCase()}
                          </SelectLabel>
                          {group.cohorts.map((cohort) => (
                            <SelectItem
                              key={cohort.id}
                              value={cohort.id}
                              className="text-xs font-semibold py-1.5 px-2.5 cursor-pointer"
                            >
                              {cohort.className}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </Fragment>
                    ))}
                  </SelectContent>
                </Select>

                {/* Subject Filter (Dynamic with Cohort) */}
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
                    {availableSubjects.map((s) => (
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
                      Has Email Only
                    </SelectItem>
                    <SelectItem value="no_email" className="text-xs font-semibold">
                      No Email Configured
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
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 rounded-xl border border-border/80 bg-card p-1.5 sm:px-2.5 sm:py-1 h-auto sm:h-10 shadow-2xs text-xs shrink-0">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <CalendarDays className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 shrink-0">
                      From
                    </span>
                    <input
                      type="date"
                      value={filterDateFrom}
                      onChange={(e) => setFilterDateFrom(e.target.value)}
                      className="bg-muted/40 hover:bg-muted/60 border border-border/70 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-lg px-1.5 py-1 text-xs font-medium text-foreground outline-none transition-all cursor-pointer w-29"
                      aria-label="Filter start date"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 shrink-0">
                      To
                    </span>
                    <input
                      type="date"
                      value={filterDateTo}
                      onChange={(e) => setFilterDateTo(e.target.value)}
                      className="bg-muted/40 hover:bg-muted/60 border border-border/70 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-lg px-1.5 py-1 text-xs font-medium text-foreground outline-none transition-all cursor-pointer w-29"
                      aria-label="Filter end date"
                    />
                    {(filterDateFrom || filterDateTo) && (
                      <button
                        type="button"
                        onClick={() => {
                          setFilterDateFrom("")
                          setFilterDateTo("")
                        }}
                        className="p-1 hover:bg-muted/80 rounded-md text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
                        title="Clear date range"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Date Presets Row */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <span className="text-[11px] font-semibold text-muted-foreground mr-1 flex items-center gap-1">
                  <Calendar className="size-3 text-muted-foreground" /> Quick Dates:
                </span>
                <button
                  type="button"
                  onClick={() => setPresetDateRange("all")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                    activeDatePreset === "all"
                      ? "bg-primary text-primary-foreground border-primary font-bold shadow-2xs"
                      : "bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted/80 hover:text-foreground"
                  }`}
                >
                  All Time
                </button>
                <button
                  type="button"
                  onClick={() => setPresetDateRange("today")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                    activeDatePreset === "today"
                      ? "bg-primary text-primary-foreground border-primary font-bold shadow-2xs"
                      : "bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted/80 hover:text-foreground"
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setPresetDateRange("yesterday")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                    activeDatePreset === "yesterday"
                      ? "bg-primary text-primary-foreground border-primary font-bold shadow-2xs"
                      : "bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted/80 hover:text-foreground"
                  }`}
                >
                  Yesterday
                </button>
                <button
                  type="button"
                  onClick={() => setPresetDateRange("7days")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                    activeDatePreset === "7days"
                      ? "bg-primary text-primary-foreground border-primary font-bold shadow-2xs"
                      : "bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted/80 hover:text-foreground"
                  }`}
                >
                  Last 7 Days
                </button>
                <button
                  type="button"
                  onClick={() => setPresetDateRange("30days")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                    activeDatePreset === "30days"
                      ? "bg-primary text-primary-foreground border-primary font-bold shadow-2xs"
                      : "bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted/80 hover:text-foreground"
                  }`}
                >
                  Last 30 Days
                </button>
              </div>

              {/* Sub-toolbar: Sort, Clear, Expand/Collapse, Export */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/50">
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

                  {/* Risk Tier Quick Selectors with Smart 2-Way Toggle */}
                  <div className="hidden lg:flex items-center gap-1.5 pl-1">
                    <Button
                      variant={isCriticalSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleRiskTier(65)}
                      disabled={criticalEligibleIds.size === 0}
                      className={`h-9 rounded-xl text-xs font-bold gap-1.5 shadow-2xs cursor-pointer transition-all ${
                        isCriticalSelected
                          ? "bg-rose-600 hover:bg-rose-700 text-white border-rose-600"
                          : "border-rose-200/80 bg-rose-50/50 dark:border-rose-900/40 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 hover:bg-rose-100/70"
                      }`}
                      title={
                        isCriticalSelected
                          ? "Click to deselect critical (<65%) records"
                          : "Select all pending records for students under 65% attendance"
                      }
                    >
                      <ShieldAlert className={`size-3.5 ${isCriticalSelected ? "text-white" : "text-rose-600"}`} />
                      <span>{isCriticalSelected ? "Deselect Critical (<65%)" : "Select Critical (<65%)"}</span>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] font-extrabold px-1.5 py-0 h-4.5 rounded-md ${
                          isCriticalSelected
                            ? "bg-white/20 text-white"
                            : "bg-rose-200/60 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200"
                        }`}
                      >
                        {criticalEligibleIds.size}
                      </Badge>
                    </Button>

                    <Button
                      variant={isLowSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleRiskTier(75)}
                      disabled={lowEligibleIds.size === 0}
                      className={`h-9 rounded-xl text-xs font-bold gap-1.5 shadow-2xs cursor-pointer transition-all ${
                        isLowSelected
                          ? "bg-amber-600 hover:bg-amber-700 text-white border-amber-600"
                          : "border-amber-200/80 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 hover:bg-amber-100/70"
                      }`}
                      title={
                        isLowSelected
                          ? "Click to deselect low (65–75%) records"
                          : "Select all pending records for students between 65% and 75% attendance"
                      }
                    >
                      <AlertTriangle className={`size-3.5 ${isLowSelected ? "text-white" : "text-amber-600"}`} />
                      <span>{isLowSelected ? "Deselect Low (65–75%)" : "Select Low (65–75%)"}</span>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] font-extrabold px-1.5 py-0 h-4.5 rounded-md ${
                          isLowSelected
                            ? "bg-white/20 text-white"
                            : "bg-amber-200/60 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200"
                        }`}
                      >
                        {lowEligibleIds.size}
                      </Badge>
                    </Button>
                  </div>

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

            {/* ── Missing Email Information Banner (if filterEmail is "no_email") ── */}
            {filterEmail === "no_email" && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-amber-300/70 bg-amber-50/70 dark:border-amber-800/60 dark:bg-amber-950/20 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300">
                    <MailX className="size-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                      Viewing Students Without Configured Email Addresses
                    </span>
                    <span className="text-[11px] text-amber-700 dark:text-amber-400">
                      These students cannot receive automatic email notifications until an email is added in the student registry.
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportPendingCSV(studentGroups)}
                  className="rounded-xl h-8 text-xs font-semibold gap-1.5 border-amber-300 text-amber-800 dark:text-amber-200 hover:bg-amber-100 cursor-pointer self-start sm:self-auto"
                >
                  <Download className="size-3" /> Export Unreachable List
                </Button>
              </div>
            )}

            {/* ── Select All Pending Bar & Send Action ── */}
            {!loading && !loadError && filtered.length > 0 && filterEmail !== "no_email" && (
              <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-linear-to-r from-primary/10 via-card to-primary/5 dark:from-primary/20 dark:via-card dark:to-primary/10 p-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none bg-card/90 hover:bg-card border border-border/80 px-3 py-1.5 rounded-xl transition-colors shadow-2xs">
                      <Checkbox
                        checked={allSelected}
                        disabled={selectableIds.length === 0}
                        onCheckedChange={(c) => toggleGroup(selectableIds, !!c)}
                        className="rounded-md data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <span className="text-xs font-bold text-foreground">Select all emailable pending</span>
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-bold px-1.5 py-0 h-4.5 rounded-md"
                      >
                        {selectableIds.length}
                      </Badge>
                    </label>

                    {selectedIds.size > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedIds(new Set())}
                        className="h-8 rounded-xl text-xs font-bold text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50/60 dark:hover:bg-rose-950/20 px-2.5 gap-1 cursor-pointer transition-colors shadow-2xs"
                        title="Deselect all selected absences"
                      >
                        <X className="size-3.5" />
                        <span>Clear Selection</span>
                      </Button>
                    )}

                    <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
                      <span className="inline-flex items-center gap-1 bg-card rounded-lg px-2.5 py-1 border border-border/70 shadow-2xs">
                        <strong className="text-foreground font-bold">
                          {selectedIds.size}
                        </strong>{" "}
                        absence{selectedIds.size !== 1 ? "s" : ""} selected
                      </span>
                      <span className="inline-flex items-center gap-1 bg-card rounded-lg px-2.5 py-1 border border-border/70 shadow-2xs">
                        <strong className="text-foreground font-bold">
                          {selectedStudentIds.size}
                        </strong>{" "}
                        student{selectedStudentIds.size !== 1 ? "s" : ""} ready
                      </span>
                      {pendingNoEmailStudents > 0 && (
                        <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-300/60 dark:border-amber-800/60 text-[11px]">
                          <MailX className="size-3 text-amber-600" />
                          {pendingNoEmailStudents} student{pendingNoEmailStudents !== 1 ? "s" : ""} skipped (no email)
                        </span>
                      )}
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
                      className="rounded-xl text-xs font-semibold mt-4 cursor-pointer"
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
                    .filter((a) => !a.alreadyNotified && Boolean(group.contactEmail))
                    .map((a) => a.periodAttendanceId)
                  const groupAllSelected =
                    groupIds.length > 0 && groupIds.every((id) => selectedIds.has(id))
                  const pendingCount = Array.from(group.subjects.values())
                    .flat()
                    .filter((a) => !a.alreadyNotified).length
                  const overallSeverity = severityBadge(group.overallAttendancePct, "Overall")
                  const avatarColor = getAvatarColor(group.studentName)

                  // Check if a specific subject is filtered to show highlighted subject badge in header
                  const filteredSubjectRecords =
                    filterSubject !== "all" ? group.subjects.get(
                      Array.from(group.subjects.keys()).find(
                        (k) => group.subjects.get(k)?.[0]?.subjectName === filterSubject
                      ) || ""
                    ) : null
                  const filteredSubjectStats = filteredSubjectRecords?.[0]

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
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div
                              className={`flex size-11 shrink-0 items-center justify-center rounded-2xl font-extrabold text-sm border shadow-2xs ${avatarColor}`}
                            >
                              {getInitials(group.studentName)}
                            </div>
                            <div className="flex flex-col min-w-0 gap-1.5">
                              {/* Line 1: Name + Monospace Roll Number */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-extrabold text-foreground tracking-tight">
                                  {group.studentName}
                                </span>
                                <span className="font-mono text-[11px] font-bold text-foreground bg-muted/80 px-2 py-0.5 rounded-lg border border-border/70 shadow-2xs">
                                  {group.rollNumber}
                                </span>
                              </div>

                              {/* Line 2: Class Badge (e.g. CSE-A) + Year Badge (e.g. 4th Year) + Email Pill */}
                              <div className="flex items-center gap-2 text-xs flex-wrap">
                                {group.departmentCode && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-primary/10 text-primary border-primary/30 tracking-wider uppercase flex items-center gap-1 shadow-2xs"
                                  >
                                    <Building2 className="size-3 mr-0.5" />
                                    {group.departmentCode}-{group.section}
                                  </Badge>
                                )}
                                {group.year && (
                                  <span className="inline-flex items-center gap-1.5 font-semibold text-muted-foreground bg-muted/50 px-2.5 py-0.5 rounded-lg border border-border/60 shadow-2xs">
                                    <GraduationCap className="size-3.5 text-primary shrink-0" />
                                    <span>{group.year}</span>
                                  </span>
                                )}
                                {group.contactEmail ? (
                                  <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono bg-muted/40 px-2.5 py-0.5 rounded-lg border border-border/50 shadow-2xs">
                                    <Mail className="size-3 text-muted-foreground/70 shrink-0" />
                                    {group.contactEmail}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-300 font-bold bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-300/60 dark:border-amber-800/60 shadow-2xs">
                                    <MailX className="size-3 text-amber-600 shrink-0" />
                                    No email on file
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                            <div className="flex flex-wrap items-center gap-1.5 justify-end">
                              {/* Overall Attendance Badge */}
                              <Badge
                                variant="outline"
                                className={`text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-2xs ${overallSeverity.className}`}
                                title={`Overall Attendance: ${group.overallAttended}/${group.overallTotalClasses} classes attended`}
                              >
                                <span className={`size-1.5 rounded-full ${overallSeverity.dot}`} />
                                <span>{overallSeverity.label}</span>
                                <span className="opacity-80 font-normal text-[10px]">
                                  ({group.overallAttended}/{group.overallTotalClasses})
                                </span>
                              </Badge>

                              {/* Highlighted Filtered Subject Badge (if filtered) */}
                              {filteredSubjectStats && (
                                <Badge
                                  variant="outline"
                                  className={`text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-2xs ${severityBadge(
                                    filteredSubjectStats.subjectAttendancePct,
                                    filteredSubjectStats.subjectName
                                  ).className}`}
                                >
                                  <BookOpen className="size-3 mr-0.5" />
                                  <span>
                                    {filteredSubjectStats.subjectAttendancePct}%
                                  </span>
                                </Badge>
                              )}

                              <Badge
                                variant="secondary"
                                className="text-xs font-bold px-2.5 py-1 rounded-lg shadow-2xs"
                              >
                                {pendingCount} pending
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
                                  {group.contactEmail ? (
                                    groupIds.length > 0 && (
                                      <label className="flex items-center gap-2 cursor-pointer select-none bg-card px-2.5 py-1 rounded-lg border border-border/60 shadow-2xs">
                                        <Checkbox
                                          checked={groupAllSelected}
                                          onCheckedChange={(c) => toggleGroup(groupIds, !!c)}
                                          className="rounded-md"
                                        />
                                        <span className="text-xs font-bold text-foreground">
                                          Select all for this student
                                        </span>
                                      </label>
                                    )
                                  ) : (
                                    <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300 font-medium">
                                      <AlertTriangle className="size-3.5 text-amber-600" />
                                      <span>
                                        Cannot select for email dispatch (Student email not configured in system)
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {group.contactEmail && groupIds.length > 0 && selectedIds.size > 0 && (
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
                                    <span>Preview Email Digest</span>
                                  </Button>
                                )}
                              </div>

                              {/* Grouped Subjects and Absence Rows (Themed Bento Grid) */}
                              <div className="flex flex-col gap-3.5">
                                {Array.from(group.subjects.entries()).map(([subjId, records]) => {
                                  const subjIds = records
                                    .filter((r) => !r.alreadyNotified && Boolean(group.contactEmail))
                                    .map((r) => r.periodAttendanceId)
                                  const subjAllSelected =
                                    subjIds.length > 0 &&
                                    subjIds.every((id) => selectedIds.has(id))
                                  const subjectBadge = severityBadge(
                                    records[0].subjectAttendancePct,
                                    "Course Attendance"
                                  )
                                  const theme = getSubjectTheme(records[0].subjectName)

                                  return (
                                    <div
                                      key={subjId}
                                      className={`rounded-2xl border ${theme.border} ${theme.bg} p-3.5 sm:p-4 flex flex-col gap-3.5 shadow-2xs transition-all`}
                                    >
                                      {/* Bento Subject Header */}
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-border/50">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <div className={`flex size-7 items-center justify-center rounded-lg ${theme.iconBg}`}>
                                            <BookOpen className="size-3.5" />
                                          </div>
                                          <span className="text-xs font-extrabold uppercase tracking-wider text-foreground">
                                            {records[0].subjectName}
                                          </span>
                                          <Badge
                                            variant="secondary"
                                            className="text-[10px] font-bold px-2 py-0.5 rounded-md shadow-2xs"
                                          >
                                            {records.length} absence{records.length !== 1 ? "s" : ""}
                                          </Badge>

                                          {/* Dedicated Subject Attendance Progress Pill */}
                                          <div
                                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-bold border shadow-2xs ${subjectBadge.className}`}
                                          >
                                            <span className={`size-1.5 rounded-full ${subjectBadge.dot}`} />
                                            <span>
                                              Course Attendance: {records[0].subjectAttendancePct}%
                                            </span>
                                            <span className="font-normal opacity-80 text-[10px]">
                                              ({records[0].subjectAttended}/{records[0].subjectTotalClasses} attended)
                                            </span>
                                          </div>
                                        </div>

                                        {group.contactEmail && subjIds.length > 1 && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7.5 text-xs font-bold px-2.5 rounded-lg bg-card/80 border-border/70 hover:bg-card text-muted-foreground hover:text-foreground cursor-pointer self-start sm:self-auto shadow-2xs transition-colors"
                                            onClick={() => toggleGroup(subjIds, !subjAllSelected)}
                                          >
                                            {subjAllSelected
                                              ? "Deselect subject"
                                              : `Select all in ${records[0].subjectName}`}
                                          </Button>
                                        )}
                                      </div>

                                      {/* Smart Bento Absence Chips Grid */}
                                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
                                        {records
                                          .sort((a, b) => b.date.localeCompare(a.date))
                                          .map((r) => {
                                            const isEmailable = Boolean(group.contactEmail)
                                            const isSelected = selectedIds.has(r.periodAttendanceId)
                                            const isNotified = r.alreadyNotified
                                            const isInteractive = isEmailable && !isNotified

                                            return (
                                              <div
                                                key={r.periodAttendanceId}
                                                onClick={() => {
                                                  if (isInteractive) {
                                                    toggle(r.periodAttendanceId, !isSelected)
                                                  }
                                                }}
                                                className={`group relative flex items-start gap-2.5 p-3 rounded-xl border text-xs transition-all select-none ${
                                                  isNotified
                                                    ? "bg-muted/30 border-border/40 opacity-75 cursor-default"
                                                    : !isEmailable
                                                    ? "bg-amber-500/5 border-amber-300/40 dark:border-amber-900/40 cursor-default"
                                                    : isSelected
                                                    ? `${theme.chipSelected} shadow-xs cursor-pointer`
                                                    : `${theme.chipBorder} ${theme.chipHover} shadow-2xs cursor-pointer`
                                                }`}
                                              >
                                                {/* Checkbox */}
                                                <div
                                                  className="pt-0.5 shrink-0"
                                                  onClick={(e) => e.stopPropagation()}
                                                >
                                                  <Checkbox
                                                    disabled={!isInteractive}
                                                    checked={isSelected}
                                                    onCheckedChange={(c) =>
                                                      toggle(r.periodAttendanceId, !!c)
                                                    }
                                                    className="rounded-md"
                                                  />
                                                </div>

                                                {/* Chip Content */}
                                                <div className="flex flex-col min-w-0 flex-1 gap-1.5">
                                                  <div className="flex items-center justify-between gap-1">
                                                    <span
                                                      className={`text-xs font-extrabold leading-tight truncate ${
                                                        isSelected
                                                          ? `${theme.accentText} font-black`
                                                          : "text-foreground"
                                                      }`}
                                                    >
                                                      {fmtDate(r.date)}
                                                    </span>
                                                    {isNotified && (
                                                      <Badge
                                                        variant="outline"
                                                        className="text-[9px] font-bold px-1.5 py-0 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300/60 dark:border-emerald-800/60 shrink-0"
                                                      >
                                                        Sent ✓
                                                      </Badge>
                                                    )}
                                                  </div>

                                                  {/* Period Badge + High-Contrast Time */}
                                                  <div className="flex items-center gap-1.5 text-xs flex-wrap">
                                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black shadow-2xs ${theme.periodBadge}`}>
                                                      P{r.periodNumber}
                                                    </span>
                                                    <span className="font-mono text-[11px] font-bold text-slate-800 dark:text-slate-100 bg-background/80 px-1.5 py-0.5 rounded border border-border/60 shadow-2xs">
                                                      {r.startTime} – {r.endTime}
                                                    </span>
                                                  </div>

                                                  {!isEmailable && (
                                                    <div className="flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-300 font-bold mt-0.5 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-300/60">
                                                      <MailX className="size-3" />
                                                      <span>No student email</span>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            )
                                          })}
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
              history.map((b: any) => {
                const mainSubject = b.subjects[0] || "General"
                const theme = getSubjectTheme(mainSubject)
                const { sections, years } = extractSectionsAndYears(b)
                return (
                  <Card
                    key={b.batchId}
                    className={`rounded-2xl border ${theme.border} ${theme.bg} p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all`}
                  >
                    <CardContent className="p-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex flex-col gap-2 min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <div
                            className={`flex size-8 shrink-0 items-center justify-center rounded-xl ${theme.iconBg}`}
                          >
                            <BookOpen className="size-4" />
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-extrabold text-foreground">
                              {b.subjects.join(", ") || "Absence Notification Batch"}
                            </span>
                            {sections.map((sec) => (
                              <Badge
                                key={sec}
                                variant="outline"
                                className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-primary/10 text-primary border-primary/30 tracking-wider uppercase flex items-center gap-1 shadow-2xs"
                              >
                                <Building2 className="size-3 mr-0.5" />
                                {sec}
                              </Badge>
                            ))}
                            {years.map((yr) => (
                              <span
                                key={yr}
                                className="inline-flex items-center gap-1.5 font-semibold text-muted-foreground bg-muted/50 px-2.5 py-0.5 rounded-lg border border-border/60 shadow-2xs text-[10px]"
                              >
                                <GraduationCap className="size-3.5 text-primary shrink-0" />
                                <span>{yr}</span>
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap pl-10.5">
                          <span className="flex items-center gap-1.5 font-medium">
                            <Calendar className="size-3.5 text-muted-foreground" />
                            {fmtDateTime(b.sentAt)}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-medium">
                            Sent by <strong className="text-foreground font-bold">{b.sentBy}</strong>
                          </span>
                        </div>

                        {/* History metrics chips */}
                        <div className="flex flex-wrap items-center gap-2 pl-10.5 mt-0.5">
                          <Badge
                            variant="secondary"
                            className="text-xs font-bold px-2.5 py-0.5 rounded-lg shadow-2xs"
                          >
                            <Users className="size-3 mr-1 text-primary" />
                            {b.studentCount} Student{b.studentCount !== 1 ? "s" : ""}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-card border-border/80 shadow-2xs"
                          >
                            {b.selectedCount} Absences
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300/60 dark:border-emerald-800/60 shadow-2xs"
                          >
                            <CheckCircle2 className="size-3 mr-1 text-emerald-600" />
                            {b.sentCount} Delivered
                          </Badge>
                          {b.failedCount > 0 && (
                            <Badge
                              variant="outline"
                              className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-300/60 dark:border-rose-800/60"
                            >
                              <XCircle className="size-3 mr-1 text-rose-600" />
                              {b.failedCount} Failed
                            </Badge>
                          )}
                          {b.noEmailCount > 0 && (
                            <Badge
                              variant="outline"
                              className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300/60 dark:border-amber-800/60"
                            >
                              <MailX className="size-3 mr-1 text-amber-600" />
                              {b.noEmailCount} No Email
                            </Badge>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDetail(b.batchId)}
                        className="rounded-xl h-10 px-4 text-xs font-bold gap-1.5 shadow-2xs bg-card hover:bg-muted border-border/80 cursor-pointer shrink-0 self-start sm:self-auto transition-all hover:scale-[1.02]"
                      >
                        <Eye className="size-3.5 text-primary" />
                        <span>View Batch Details</span>
                      </Button>
                    </CardContent>
                  </Card>
                )
              })
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
              . Each recipient will receive a consolidated summary including subject-specific attendance stats and overall percentages.
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
        <SheetContent className="sm:max-w-xl overflow-y-auto p-0 flex flex-col gap-0 border-l border-border bg-background">
          <SheetHeader className="p-5 border-b border-border bg-card pr-14">
            <SheetTitle className="text-lg font-bold">Notification Batch Details</SheetTitle>
            {detail && (
              <SheetDescription className="text-xs text-muted-foreground">
                {detail.studentCount} student{detail.studentCount !== 1 ? "s" : ""} notified · {fmtDateTime(detail.sentAt)} · Sent by {detail.sentBy}
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
              <div className="flex flex-col gap-4 p-5 overflow-y-auto">
                {detail.students.map((s: any, i: number) => {
                  const avatarColor = getAvatarColor(s.studentName)
                  // Group records by subject for compact Bento Chip presentation
                  const subjectMap = new Map<string, any[]>()
                  for (const r of s.records) {
                    const subj = r.subjectName || "Subject"
                    if (!subjectMap.has(subj)) subjectMap.set(subj, [])
                    subjectMap.get(subj)!.push(r)
                  }

                  return (
                    <div
                      key={i}
                      className="rounded-2xl border border-border/80 bg-card p-4 flex flex-col gap-3.5 shadow-2xs"
                    >
                      {/* Student Profile Row */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`flex size-10 shrink-0 items-center justify-center rounded-2xl font-extrabold text-xs border shadow-2xs ${avatarColor}`}
                          >
                            {getInitials(s.studentName)}
                          </div>
                          <div className="flex flex-col min-w-0 gap-1.5">
                            {/* Line 1: Name + Monospace Roll Number */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-extrabold text-foreground">
                                {s.studentName}
                              </span>
                              <span className="font-mono text-[11px] font-bold text-foreground bg-muted/80 px-2 py-0.5 rounded-lg border border-border/70 shadow-2xs">
                                {s.rollNumber}
                              </span>
                            </div>

                            {/* Line 2: Class Badge (e.g. CSE-A) + Year Badge (e.g. 4th Year) + Email Pill */}
                            <div className="flex items-center gap-2 text-xs flex-wrap">
                              {(s.departmentCode || s.section) && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-primary/10 text-primary border-primary/30 tracking-wider uppercase flex items-center gap-1 shadow-2xs"
                                >
                                  <Building2 className="size-3 mr-0.5" />
                                  {s.departmentCode ? `${s.departmentCode}-${s.section || "A"}` : `Sec ${s.section}`}
                                </Badge>
                              )}
                              {s.year && (
                                <span className="inline-flex items-center gap-1.5 font-semibold text-muted-foreground bg-muted/50 px-2.5 py-0.5 rounded-lg border border-border/60 shadow-2xs">
                                  <GraduationCap className="size-3.5 text-primary shrink-0" />
                                  <span>{s.year}</span>
                                </span>
                              )}
                              {s.email ? (
                                <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono bg-muted/40 px-2.5 py-0.5 rounded-lg border border-border/50 shadow-2xs">
                                  <Mail className="size-3 text-muted-foreground/70" />
                                  {s.email}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-300 font-bold bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-300/60 dark:border-amber-800/60 shadow-2xs">
                                  <MailX className="size-3 text-amber-600" />
                                  No email
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {s.status === "sent" && (
                          <Badge
                            variant="outline"
                            className="text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300/60 dark:border-emerald-800/60 shrink-0 shadow-2xs"
                          >
                            <Check className="size-3 mr-1 text-emerald-600" />
                            Sent ✓
                          </Badge>
                        )}
                        {s.status === "failed" && (
                          <Badge
                            variant="outline"
                            className="text-xs font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-300/60 dark:border-rose-800/60 shrink-0"
                          >
                            <X className="size-3 mr-1 text-rose-600" />
                            Failed
                          </Badge>
                        )}
                        {s.status === "no_email" && (
                          <Badge
                            variant="outline"
                            className="text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300/60 dark:border-amber-800/60 shrink-0"
                          >
                            <MailX className="size-3 mr-1 text-amber-600" />
                            No email
                          </Badge>
                        )}
                      </div>

                      {/* Grouped Included Absences as Compact Bento Chips */}
                      <div className="flex flex-col gap-2.5 pt-2 border-t border-border/50">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Included Absences in this Dispatch ({s.records.length})
                          </span>
                        </div>

                        <div className="flex flex-col gap-2.5">
                          {Array.from(subjectMap.entries()).map(([subjName, recs]) => {
                            const theme = getSubjectTheme(subjName)
                            return (
                              <div
                                key={subjName}
                                className={`rounded-xl border ${theme.border} ${theme.bg} p-3 flex flex-col gap-2 shadow-2xs`}
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`flex size-6 items-center justify-center rounded-lg ${theme.iconBg}`}
                                  >
                                    <BookOpen className="size-3" />
                                  </div>
                                  <span className="text-xs font-extrabold text-foreground">
                                    {subjName}
                                  </span>
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] font-bold px-1.5 py-0 h-4.5 rounded-md ml-auto"
                                  >
                                    {recs.length} record{recs.length !== 1 ? "s" : ""}
                                  </Badge>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {recs
                                    .sort((a: any, b: any) => b.date.localeCompare(a.date))
                                    .map((r: any, ri: number) => (
                                      <div
                                        key={ri}
                                        className={`flex items-center justify-between p-2 rounded-lg border text-xs bg-card/90 ${theme.chipBorder}`}
                                      >
                                        <div className="flex flex-col min-w-0 gap-0.5">
                                          <span className="text-xs font-bold text-foreground truncate">
                                            {fmtDate(r.date)}
                                          </span>
                                          <div className="flex items-center gap-1.5">
                                            <span
                                              className={`px-1.5 py-0.2 rounded text-[10px] font-black ${theme.periodBadge}`}
                                            >
                                              P{r.periodNumber}
                                            </span>
                                            {r.startTime && (
                                              <span className="font-mono text-[10px] font-bold text-slate-700 dark:text-slate-200">
                                                {r.startTime} – {r.endTime}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            )
                          })}
                        </div>
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
