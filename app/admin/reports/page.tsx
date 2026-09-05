"use client"

import { useState, useMemo, useCallback } from "react"
import {
  useReportsData,
  ReportsFilterState,
  SubjectCohortMatrixItem,
  DepartmentYearBreakdownItem,
  DefaulterStudentItem,
  TeacherActivityItem,
  ZeroEnrollmentSessionItem,
  CrossCohortAnomalyItem,
} from "@/hooks/use-reports-data"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Download,
  Users,
  BookOpen,
  BarChart3,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  X,
  Pencil,
  Mail,
  UserPlus,
  Trash2,
  KeyRound,
  Link2,
  Settings,
  Activity,
  TrendingUp,
  ShieldAlert,
  Search,
  RefreshCw,
  Info,
  Layers,
  Award,
  ArrowUpDown,
  FileSpreadsheet,
} from "lucide-react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { TableSkeleton, CardSkeleton, ChartSkeleton } from "@/components/ui/skeletons"
import { motion, AnimatePresence } from "framer-motion"

/* ── Constants ── */
const YEAR_OPTIONS = ["1st Year", "2nd Year", "3rd Year", "4th Year"]
const YEAR_ORDER: Record<string, number> = {
  "1st Year": 1,
  "2nd Year": 2,
  "3rd Year": 3,
  "4th Year": 4,
}

const DATE_RANGES = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "semester", label: "This Semester" },
  { value: "custom", label: "Custom Range" },
]

type Tab = "attendance-overview" | "teacher-activity" | "diagnostics" | "system-logs"

const TABS: { id: Tab; label: string; icon: any; countBadge?: string }[] = [
  { id: "attendance-overview", label: "Attendance Overview", icon: BarChart3 },
  { id: "teacher-activity", label: "Teacher Activity", icon: Users },
  { id: "diagnostics", label: "Attendance Alerts & Exceptions", icon: AlertTriangle },
  { id: "system-logs", label: "System Logs", icon: Activity },
]

/* ── Helpers ── */
function formatSessionDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "Never"
  try {
    const [y, m, d] = dateStr.split("-")
    if (!y || !m || !d) return dateStr
    const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10))
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  } catch {
    return dateStr
  }
}

function getInitials(name: string): string {
  if (!name) return "NA"
  const clean = name.replace(/^(Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.)\s+/i, "")
  const parts = clean.trim().split(/\s+/)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return clean.slice(0, 2).toUpperCase() || "NA"
}

function getAttendanceColor(pct: number | null | undefined) {
  if (pct === null || pct === undefined) return { text: "text-muted-foreground", bg: "bg-muted", badge: "bg-muted text-muted-foreground border-border", bar: "bg-muted-foreground/30" }
  if (pct >= 75) return { text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500", badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20", bar: "bg-emerald-500" }
  if (pct >= 60) return { text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500", badge: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20", bar: "bg-amber-500" }
  return { text: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500", badge: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20", bar: "bg-rose-500" }
}

const YEAR_BADGE_THEMES: Record<string, { bg: string; text: string; border: string }> = {
  "1st Year": { bg: "bg-sky-500/10 dark:bg-sky-950/40", text: "text-sky-700 dark:text-sky-300", border: "border-sky-300/60 dark:border-sky-800/80" },
  "2nd Year": { bg: "bg-emerald-500/10 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-300/60 dark:border-emerald-800/80" },
  "3rd Year": { bg: "bg-amber-500/10 dark:bg-amber-950/40", text: "text-amber-700 dark:text-amber-300", border: "border-amber-300/60 dark:border-amber-800/80" },
  "4th Year": { bg: "bg-violet-500/10 dark:bg-violet-950/40", text: "text-violet-700 dark:text-violet-300", border: "border-violet-300/60 dark:border-violet-800/80" },
}

function getYearBadgeTheme(year: string) {
  return YEAR_BADGE_THEMES[year] || { bg: "bg-primary/10", text: "text-primary", border: "border-primary/30" }
}

function parseCohortInfo(rawCohort?: string | null, fallbackYear?: string | null, fallbackClassSection?: string | null, fallbackDept?: string | null) {
  let dept = fallbackDept || ""
  let year = fallbackYear || ""
  let classSection = fallbackClassSection || ""

  if (rawCohort) {
    const cleanStr = rawCohort.trim()
    const separator = cleanStr.includes(" · ") ? " · " : cleanStr.includes(" . ") ? " . " : null
    if (separator) {
      const parts = cleanStr.split(separator).map(p => p.trim())
      if (parts.length >= 3) {
        dept = dept || parts[0]
        year = year || parts[1]
        const rawSec = parts[2].replace(/^(Sec|Section)\.?\s+/i, "")
        classSection = rawSec.includes("-") ? rawSec : `${dept || "CSE"}-${rawSec}`
      } else if (parts.length === 2) {
        if (parts[0].toLowerCase().includes("year")) {
          year = year || parts[0]
          classSection = classSection || parts[1]
        } else {
          classSection = classSection || parts[0]
          year = year || parts[1]
        }
      }
    } else if (cleanStr.includes(" (") && cleanStr.endsWith(")")) {
      const [cName, cYear] = cleanStr.slice(0, -1).split(" (")
      classSection = cName.trim()
      year = cYear.trim()
    } else {
      classSection = cleanStr
    }
  }

  if (!classSection && fallbackClassSection) classSection = fallbackClassSection
  if (!year && fallbackYear) year = fallbackYear
  if (!dept && fallbackDept) dept = fallbackDept

  // Normalize year string (e.g. "1st year" -> "1st Year")
  if (year) {
    const yMatch = year.match(/([1-4](?:st|nd|rd|th))\s*year/i)
    if (yMatch) {
      const numPart = yMatch[1].toLowerCase()
      const formattedNum = numPart === "1st" ? "1st" : numPart === "2nd" ? "2nd" : numPart === "3rd" ? "3rd" : "4th"
      year = `${formattedNum} Year`
    }
  }

  // Clean classSection if it has leftover prefixes or dots
  if (classSection) {
    if (classSection.includes(" · ")) {
      const subParts = classSection.split(" · ")
      classSection = subParts[subParts.length - 1]
    }
    const cleanSec = classSection.replace(/^(Sec|Section)\.?\s+/i, "").trim()
    if (!cleanSec.includes("-") && !cleanSec.includes("—") && cleanSec.length <= 3 && dept) {
      classSection = `${dept}-${cleanSec}`
    } else {
      classSection = cleanSec
    }
  }

  return {
    classSection: classSection || "—",
    year: year || "",
    dept: dept || "",
  }
}

function renderCohortBadges(rawCohort?: string | null, year?: string | null, classSection?: string | null, deptCode?: string | null) {
  const parsed = parseCohortInfo(rawCohort, year, classSection, deptCode)
  const yTheme = getYearBadgeTheme(parsed.year)

  return (
    <div className="inline-flex items-center gap-1.5 flex-wrap">
      <span className="inline-flex items-center text-xs font-bold rounded-lg px-2.5 py-0.5 bg-background dark:bg-muted/40 border border-border/80 text-foreground shadow-2xs whitespace-nowrap">
        {parsed.classSection}
      </span>
      {parsed.year && (
        <span className={`inline-flex items-center text-[10px] font-bold rounded-full px-2 py-0.5 border ${yTheme.bg} ${yTheme.text} ${yTheme.border} whitespace-nowrap`}>
          {parsed.year}
        </span>
      )}
    </div>
  )
}

function getActionConfig(actionType: string, details: string) {
  const d = details.toLowerCase()
  if (d.includes("absence notification")) {
    return { icon: Mail, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", label: "NOTIFIED" }
  }
  switch (actionType) {
    case "create": return { icon: UserPlus, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", label: "CREATED" }
    case "update": return { icon: Pencil, color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/20", label: "UPDATED" }
    case "delete": return { icon: Trash2, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", label: "DELETED" }
    case "reset": return { icon: KeyRound, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", label: "RESET" }
    case "assign": return { icon: Link2, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20", label: "ASSIGNED" }
    default: return { icon: Settings, color: "text-muted-foreground", bg: "bg-muted", border: "border-border", label: "ACTION" }
  }
}

/* ── CSV Export Utilities ── */
function exportMatrixCSV(rows: SubjectCohortMatrixItem[]) {
  const headers = ["Department", "Academic Year", "Section", "Subject Name", "Subject Code", "Conducted Sessions", "Expected Student Opps", "Present Marks", "Absent Marks", "Attendance %", "Faculty"]
  const csvRows = rows.map(r => [
    r.deptCode,
    r.year,
    r.classSection,
    `"${r.subjectName.replace(/"/g, '""')}"`,
    r.subjectCode,
    r.sessionsConducted,
    r.totalExpected,
    r.totalPresent,
    r.totalExpected > 0 ? r.totalExpected - r.totalPresent : 0,
    r.attendancePct !== null ? `${r.attendancePct}%` : "No Enrolled Students",
    `"${(r.teachersList || "—").replace(/"/g, '""')}"`,
  ])
  const csv = [headers.join(","), ...csvRows.map(r => r.join(","))].join("\n")
  downloadBlob(csv, `subject-cohort-attendance-${new Date().toISOString().split("T")[0]}.csv`)
}

function exportDefaultersCSV(rows: DefaulterStudentItem[]) {
  const headers = ["Roll Number", "Student Name", "Department", "Academic Year", "Class & Section", "Attended Sessions", "Expected Sessions", "Attendance %", "Status"]
  const csvRows = rows.map(r => [
    r.rollNumber,
    `"${r.name.replace(/"/g, '""')}"`,
    r.deptCode,
    r.year,
    r.classSection,
    r.attendedSessions,
    r.expectedSessions,
    `${r.attendancePct}%`,
    r.status === "critical" ? "Critical (<65%)" : "At Risk (65-74%)",
  ])
  const csv = [headers.join(","), ...csvRows.map(r => r.join(","))].join("\n")
  downloadBlob(csv, `defaulter-students-${new Date().toISOString().split("T")[0]}.csv`)
}

function exportTeacherCSV(rows: TeacherActivityItem[]) {
  const headers = ["Faculty Name", "Department", "Sessions Conducted", "Assigned Courses", "Assigned Cohorts", "Avg Student Attendance %", "Last Active Date"]
  const csvRows = rows.map(r => [
    `"${r.name.replace(/"/g, '""')}"`,
    r.deptCode,
    r.sessionsConducted,
    r.assignedCoursesCount,
    r.assignedCohortsCount,
    r.avgAttendancePct !== null ? `${r.avgAttendancePct}%` : "No Sessions",
    r.lastSessionDate || "Never",
  ])
  const csv = [headers.join(","), ...csvRows.map(r => r.join(","))].join("\n")
  downloadBlob(csv, `teacher-activity-${new Date().toISOString().split("T")[0]}.csv`)
}

export interface LowTurnoutSessionItem {
  sessionId: string
  sessionDate: string
  formattedDate: string
  subjectName: string
  subjectCode: string
  classSection: string
  year: string
  deptCode: string
  teacherName: string
  presentCount: number
  expectedCount: number
  turnoutPct: number
  severity: "critical" | "moderate"
}

export interface ConsecutiveAbsenceStudentItem {
  studentId: string
  studentName: string
  rollNumber: string
  classSection: string
  year: string
  deptCode: string
  consecutiveMissed: number
  lastAttendedDate: string | null
  riskLevel: "critical" | "high"
}

function exportLowTurnoutCSV(rows: LowTurnoutSessionItem[]) {
  const headers = ["Date", "Subject Name", "Subject Code", "Department", "Year", "Class & Section", "Faculty", "Present Students", "Expected Students", "Turnout %", "Severity"]
  const csvRows = rows.map(r => [
    r.sessionDate,
    `"${r.subjectName.replace(/"/g, '""')}"`,
    r.subjectCode,
    r.deptCode,
    r.year,
    r.classSection,
    `"${r.teacherName.replace(/"/g, '""')}"`,
    r.presentCount,
    r.expectedCount,
    `${r.turnoutPct}%`,
    r.severity === "critical" ? "Critical Mass Bunk (<=25%)" : "Low Turnout (26-49%)",
  ])
  const csv = [headers.join(","), ...csvRows.map(r => r.join(","))].join("\n")
  downloadBlob(csv, `mass-bunk-low-turnout-alerts-${new Date().toISOString().split("T")[0]}.csv`)
}

function exportConsecutiveAbsenceCSV(rows: ConsecutiveAbsenceStudentItem[]) {
  const headers = ["Roll Number", "Student Name", "Department", "Academic Year", "Class & Section", "Consecutive Classes Missed", "Last Attended Date", "Risk Level"]
  const csvRows = rows.map(r => [
    r.rollNumber,
    `"${r.studentName.replace(/"/g, '""')}"`,
    r.deptCode,
    r.year,
    r.classSection,
    r.consecutiveMissed,
    r.lastAttendedDate || "Never Attended",
    r.riskLevel === "critical" ? "Critical Inactive (5+ missed)" : "High Inactive (3-4 missed)",
  ])
  const csv = [headers.join(","), ...csvRows.map(r => r.join(","))].join("\n")
  downloadBlob(csv, `consecutive-absence-alerts-${new Date().toISOString().split("T")[0]}.csv`)
}

function downloadBlob(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
══════════════════════════════════════════════════════════════ */
export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("attendance-overview")

  // Global Filters State
  const [dateRange, setDateRange] = useState("all")
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")
  const [selectedDept, setSelectedDept] = useState("all")
  const [selectedYear, setSelectedYear] = useState("all")
  const [selectedClass, setSelectedClass] = useState("all")
  const [selectedSubject, setSelectedSubject] = useState("all")
  const [selectedTeacher, setSelectedTeacher] = useState("all")

  // In-tab UI states
  const [matrixSearch, setMatrixSearch] = useState("")
  const [defaulterSearch, setDefaulterSearch] = useState("")
  const [defaulterStatusFilter, setDefaulterStatusFilter] = useState<"all" | "critical" | "at_risk">("all")
  const [teacherSearch, setTeacherSearch] = useState("")
  const [lowTurnoutSearch, setLowTurnoutSearch] = useState("")
  const [lowTurnoutSeverityFilter, setLowTurnoutSeverityFilter] = useState<"all" | "critical" | "moderate">("all")
  const [consecutiveAbsenceSearch, setConsecutiveAbsenceSearch] = useState("")
  const [consecutiveRiskFilter, setConsecutiveRiskFilter] = useState<"all" | "critical" | "high">("all")
  const [selectedStudentForDrilldown, setSelectedStudentForDrilldown] = useState<DefaulterStudentItem | null>(null)
  const [selectedTeacherForDrilldown, setSelectedTeacherForDrilldown] = useState<TeacherActivityItem | null>(null)

  // System logs filter states
  const [logFilterPerformer, setLogFilterPerformer] = useState("all")
  const [logFilterAction, setLogFilterAction] = useState("all")

  // Compose server-side filter request
  const queryFilters = useMemo<ReportsFilterState>(() => {
    const f: ReportsFilterState = {}
    if (dateRange !== "all") f.dateRange = dateRange
    if (dateRange === "custom" && customStartDate && customEndDate) {
      f.startDate = customStartDate
      f.endDate = customEndDate
    }
    if (selectedDept !== "all") f.departmentId = selectedDept
    if (selectedYear !== "all") f.year = selectedYear
    if (selectedClass !== "all") f.classId = selectedClass
    if (selectedSubject !== "all") f.subjectId = selectedSubject
    if (selectedTeacher !== "all") f.teacherId = selectedTeacher
    return f
  }, [dateRange, customStartDate, customEndDate, selectedDept, selectedYear, selectedClass, selectedSubject, selectedTeacher])

  const { data: reportsData, isLoading, isFetching, refetch } = useReportsData(queryFilters)

  /* ── Filter Options Derived from Database ── */
  const departmentsList = useMemo(() => reportsData?.departments ?? [], [reportsData])
  const classesList = useMemo(() => reportsData?.classes ?? [], [reportsData])
  const subjectsList = useMemo(() => reportsData?.subjects ?? [], [reportsData])
  const teachersList = useMemo(() => reportsData?.teachers ?? [], [reportsData])

  // Filter available classes cascading from selected year & dept, sorted deterministically
  const availableClasses = useMemo(() => {
    return classesList
      .filter((c: any) => {
        if (selectedYear !== "all" && c.year !== selectedYear) return false
        if (selectedDept !== "all" && c.department_id !== selectedDept) return false
        return true
      })
      .sort((a: any, b: any) => {
        const deptA = a.department?.code || a.name || ""
        const deptB = b.department?.code || b.name || ""
        const deptCmp = deptA.localeCompare(deptB)
        if (deptCmp !== 0) return deptCmp

        const yearOrderA = YEAR_ORDER[a.year] || 99
        const yearOrderB = YEAR_ORDER[b.year] || 99
        if (yearOrderA !== yearOrderB) return yearOrderA - yearOrderB

        const secA = a.section || ""
        const secB = b.section || ""
        return secA.localeCompare(secB)
      })
  }, [classesList, selectedYear, selectedDept])

  // Group available classes by Academic Year for structured dropdown hierarchy
  const groupedClassesByYear = useMemo(() => {
    const map = new Map<string, any[]>()
    for (const c of availableClasses) {
      const yr = c.year || "Other"
      if (!map.has(yr)) {
        map.set(yr, [])
      }
      map.get(yr)!.push(c)
    }

    const sortedYears = Array.from(map.keys()).sort((a, b) => {
      const orderA = YEAR_ORDER[a] || 99
      const orderB = YEAR_ORDER[b] || 99
      if (orderA !== orderB) return orderA - orderB
      return a.localeCompare(b)
    })

    return sortedYears.map(yr => ({
      year: yr,
      classes: map.get(yr)!,
    }))
  }, [availableClasses])

  // Filter available subjects cascading from dept
  const availableSubjects = useMemo(() => {
    return subjectsList.filter((s: any) => {
      if (selectedDept !== "all" && s.department_id !== selectedDept) return false
      return true
    })
  }, [subjectsList, selectedDept])

  const handleDeptChange = (val: string) => {
    setSelectedDept(val)
    setSelectedClass("all")
    setSelectedSubject("all")
  }

  const handleYearChange = (val: string) => {
    setSelectedYear(val)
    setSelectedClass("all")
  }

  const isAnyFilterActive =
    dateRange !== "all" ||
    selectedDept !== "all" ||
    selectedYear !== "all" ||
    selectedClass !== "all" ||
    selectedSubject !== "all" ||
    selectedTeacher !== "all"

  const clearAllFilters = () => {
    setDateRange("all")
    setCustomStartDate("")
    setCustomEndDate("")
    setSelectedDept("all")
    setSelectedYear("all")
    setSelectedClass("all")
    setSelectedSubject("all")
    setSelectedTeacher("all")
  }

  /* ── Canonical Analytics Payloads from Phase 4A ── */
  const overview = reportsData?.overview
  const subjectCohortMatrix = useMemo(() => reportsData?.subjectCohortMatrix ?? [], [reportsData])
  const departmentYearBreakdown = useMemo(() => reportsData?.departmentYearBreakdown ?? [], [reportsData])
  const defaulterStudents = useMemo(() => reportsData?.defaulterStudents ?? [], [reportsData])
  const teacherActivity = useMemo(() => reportsData?.teacherActivity ?? [], [reportsData])
  const diagnostics = reportsData?.diagnostics

  /* ── Trend Computation: Option B Daily Aggregation ── */
  const dailyAttendanceTrend = useMemo(() => {
    if (!reportsData?.sessions || reportsData.sessions.length === 0) return []

    // Build active student count per class map from subjectCohortMatrix
    const classActiveCountMap = new Map<string, number>()
    for (const scm of subjectCohortMatrix) {
      if (scm.sessionsConducted > 0 && scm.totalExpected > 0) {
        const count = Math.round(scm.totalExpected / scm.sessionsConducted)
        classActiveCountMap.set(scm.classId, count)
      }
    }

    // Group sessions by date
    const dateMap = new Map<string, { sessions: number; expected: number; present: number }>()

    for (const s of reportsData.sessions) {
      if (!dateMap.has(s.session_date)) {
        dateMap.set(s.session_date, { sessions: 0, expected: 0, present: 0 })
      }
      const item = dateMap.get(s.session_date)!
      item.sessions += 1
      const expectedInSession = classActiveCountMap.get(s.class_id) ?? 0
      item.expected += expectedInSession
    }

    // Add present marks strictly matching session class
    for (const a of reportsData.attendance ?? []) {
      if (a.status === "present") {
        const sess = reportsData.sessions.find((s: any) => s.id === a.session_id)
        if (sess && a.student?.class?.id === sess.class_id) {
          const item = dateMap.get(sess.session_date)
          if (item) item.present += 1
        }
      }
    }

    // Convert to sorted array
    const sortedDates = Array.from(dateMap.keys()).sort()
    return sortedDates.map(d => {
      const entry = dateMap.get(d)!
      const pct = entry.expected > 0 ? Math.round((entry.present / entry.expected) * 100) : 0
      return {
        date: d,
        formattedDate: formatSessionDate(d),
        attendancePct: pct,
        present: entry.present,
        expected: entry.expected,
        sessions: entry.sessions,
      }
    })
  }, [reportsData, subjectCohortMatrix])

  /* ── Filtered Subsets for Tables ── */
  const filteredMatrix = useMemo(() => {
    if (!matrixSearch.trim()) return subjectCohortMatrix
    const q = matrixSearch.toLowerCase()
    return subjectCohortMatrix.filter(
      item =>
        item.subjectName.toLowerCase().includes(q) ||
        item.subjectCode.toLowerCase().includes(q) ||
        item.cohortLabel.toLowerCase().includes(q) ||
        (item.teachersList && item.teachersList.toLowerCase().includes(q))
    )
  }, [subjectCohortMatrix, matrixSearch])

  const filteredDefaulters = useMemo(() => {
    return defaulterStudents.filter(item => {
      if (defaulterStatusFilter !== "all" && item.status !== defaulterStatusFilter) return false
      if (defaulterSearch.trim()) {
        const q = defaulterSearch.toLowerCase()
        const matchName = item.name.toLowerCase().includes(q)
        const matchRoll = item.rollNumber.toLowerCase().includes(q)
        const matchCohort = item.classSection.toLowerCase().includes(q) || item.deptCode.toLowerCase().includes(q)
        if (!matchName && !matchRoll && !matchCohort) return false
      }
      return true
    })
  }, [defaulterStudents, defaulterStatusFilter, defaulterSearch])

  const filteredTeachers = useMemo(() => {
    if (!teacherSearch.trim()) return teacherActivity
    const q = teacherSearch.toLowerCase()
    return teacherActivity.filter(
      t => t.name.toLowerCase().includes(q) || t.deptCode.toLowerCase().includes(q)
    )
  }, [teacherActivity, teacherSearch])

  /* ── Operational Alerts: Mass Bunk / Low Turnout (<50%) ── */
  const lowTurnoutSessions = useMemo<LowTurnoutSessionItem[]>(() => {
    if (!reportsData?.sessions || reportsData.sessions.length === 0) return []

    // Build active student count per class map from subjectCohortMatrix
    const classActiveCountMap = new Map<string, number>()
    for (const scm of subjectCohortMatrix) {
      if (scm.sessionsConducted > 0 && scm.totalExpected > 0) {
        const count = Math.round(scm.totalExpected / scm.sessionsConducted)
        classActiveCountMap.set(scm.classId, count)
      }
    }

    // Map session present counts from period_attendance
    const sessionPresentMap = new Map<string, number>()
    for (const a of reportsData.attendance ?? []) {
      if (a.status === "present") {
        sessionPresentMap.set(a.session_id, (sessionPresentMap.get(a.session_id) || 0) + 1)
      }
    }

    const alerts: LowTurnoutSessionItem[] = []

    for (const s of reportsData.sessions) {
      const expected = classActiveCountMap.get(s.class_id) ?? 0
      if (expected <= 0) continue // Skip empty classes without enrolled students

      const present = sessionPresentMap.get(s.id) ?? 0
      const pct = Math.round((present / expected) * 100)

      if (pct < 50) {
        const c = s.class
        const dept = c?.department?.code || s.subject?.department?.code || "CSE"
        const sec = c?.section ? (c.name.includes("-") ? c.name : `${dept}-${c.section}`) : c?.name || "—"
        const teacherName = s.teacher?.title
          ? `${s.teacher.title} ${s.teacher.user?.full_name}`
          : s.teacher?.user?.full_name || "—"

        alerts.push({
          sessionId: s.id,
          sessionDate: s.session_date,
          formattedDate: formatSessionDate(s.session_date),
          subjectName: s.subject?.name || "—",
          subjectCode: s.subject?.code || "—",
          classSection: sec,
          year: c?.year || "",
          deptCode: dept,
          teacherName,
          presentCount: present,
          expectedCount: expected,
          turnoutPct: pct,
          severity: pct <= 25 ? "critical" : "moderate",
        })
      }
    }

    return alerts.sort((a, b) => (a.turnoutPct !== b.turnoutPct ? a.turnoutPct - b.turnoutPct : b.sessionDate.localeCompare(a.sessionDate)))
  }, [reportsData, subjectCohortMatrix])

  /* ── Operational Alerts: Acute Consecutive Absentees (3+ missed) ── */
  const consecutiveAbsentStudents = useMemo<ConsecutiveAbsenceStudentItem[]>(() => {
    if (!reportsData?.attendance || !reportsData?.sessions || reportsData.attendance.length === 0) return []

    const sortedSessions = [...reportsData.sessions].sort((a, b) => a.session_date.localeCompare(b.session_date))
    const sessionOrderMap = new Map<string, { date: string; classId: string; index: number }>()
    sortedSessions.forEach((s, idx) => {
      sessionOrderMap.set(s.id, { date: s.session_date, classId: s.class_id, index: idx })
    })

    const studentMarksMap = new Map<string, {
      studentId: string
      name: string
      rollNumber: string
      classSection: string
      year: string
      deptCode: string
      classId: string
      marks: Array<{ date: string; status: string; sessionIndex: number }>
    }>()

    for (const a of reportsData.attendance) {
      if (!a.student_id || !a.student) continue
      const sInfo = sessionOrderMap.get(a.session_id)
      if (!sInfo) continue

      const st = a.student
      const c = st.class
      const dept = st.department?.code || c?.department?.code || "CSE"
      const sec = c?.section ? (c.name.includes("-") ? c.name : `${dept}-${c.section}`) : c?.name || "—"

      if (!studentMarksMap.has(a.student_id)) {
        studentMarksMap.set(a.student_id, {
          studentId: a.student_id,
          name: st.user?.full_name || "Unknown",
          rollNumber: st.roll_number || "—",
          classSection: sec,
          year: st.year || c?.year || "",
          deptCode: dept,
          classId: c?.id || "",
          marks: [],
        })
      }

      studentMarksMap.get(a.student_id)!.marks.push({
        date: sInfo.date,
        status: a.status,
        sessionIndex: sInfo.index,
      })
    }

    const inactiveList: ConsecutiveAbsenceStudentItem[] = []

    studentMarksMap.forEach(record => {
      record.marks.sort((a, b) => a.sessionIndex - b.sessionIndex)

      let streak = 0
      let lastAttended: string | null = null

      for (let i = record.marks.length - 1; i >= 0; i--) {
        const m = record.marks[i]
        if (m.status === "absent") {
          streak++
        } else if (m.status === "present") {
          if (!lastAttended) lastAttended = formatSessionDate(m.date)
          break
        }
      }

      if (!lastAttended) {
        const firstPresent = record.marks.find(m => m.status === "present")
        if (firstPresent) lastAttended = formatSessionDate(firstPresent.date)
      }

      if (streak >= 3) {
        inactiveList.push({
          studentId: record.studentId,
          studentName: record.name,
          rollNumber: record.rollNumber,
          classSection: record.classSection,
          year: record.year,
          deptCode: record.deptCode,
          consecutiveMissed: streak,
          lastAttendedDate: lastAttended,
          riskLevel: streak >= 5 ? "critical" : "high",
        })
      }
    })

    return inactiveList.sort((a, b) => b.consecutiveMissed - a.consecutiveMissed)
  }, [reportsData])

  const filteredLowTurnout = useMemo(() => {
    return lowTurnoutSessions.filter(item => {
      if (lowTurnoutSeverityFilter !== "all" && item.severity !== lowTurnoutSeverityFilter) return false
      if (lowTurnoutSearch.trim()) {
        const q = lowTurnoutSearch.toLowerCase()
        const matchSub = item.subjectName.toLowerCase().includes(q) || item.subjectCode.toLowerCase().includes(q)
        const matchCohort = item.classSection.toLowerCase().includes(q) || item.deptCode.toLowerCase().includes(q)
        const matchTeacher = item.teacherName.toLowerCase().includes(q)
        if (!matchSub && !matchCohort && !matchTeacher) return false
      }
      return true
    })
  }, [lowTurnoutSessions, lowTurnoutSeverityFilter, lowTurnoutSearch])

  const filteredConsecutiveAbsence = useMemo(() => {
    return consecutiveAbsentStudents.filter(item => {
      if (consecutiveRiskFilter !== "all" && item.riskLevel !== consecutiveRiskFilter) return false
      if (consecutiveAbsenceSearch.trim()) {
        const q = consecutiveAbsenceSearch.toLowerCase()
        const matchStudent = item.studentName.toLowerCase().includes(q) || item.rollNumber.toLowerCase().includes(q)
        const matchCohort = item.classSection.toLowerCase().includes(q) || item.deptCode.toLowerCase().includes(q)
        if (!matchStudent && !matchCohort) return false
      }
      return true
    })
  }, [consecutiveAbsentStudents, consecutiveRiskFilter, consecutiveAbsenceSearch])

  /* ── System Logs ── */
  const logs = useMemo(() => reportsData?.logs ?? [], [reportsData])
  const uniquePerformers = useMemo(() => Array.from(new Set(logs.map((l: any) => l.performedBy))).sort(), [logs])

  const filteredLogs = useMemo(() => {
    return logs.filter((l: any) => {
      if (logFilterPerformer !== "all" && l.performedBy !== logFilterPerformer) return false
      if (logFilterAction !== "all" && l.action_type !== logFilterAction) return false
      return true
    })
  }, [logs, logFilterPerformer, logFilterAction])

  // Overview metrics display
  const campusPct = overview?.campusAttendancePct
  const overallColor = getAttendanceColor(campusPct)

  return (
    <div className="flex flex-col gap-6">

      {/* ══════════════════════════════════════════════════════════
          TOP HEADER & TAB NAVIGATION
      ══════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Segmented Tab Control */}
        <div className="inline-flex flex-wrap gap-1.5 rounded-xl border border-border/80 bg-muted/60 p-1.5 shadow-2xs">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 rounded-lg px-3.5 h-9 text-xs font-semibold transition-all cursor-pointer ${
                  isActive ? "text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeReportsTab"
                    className="absolute inset-0 rounded-lg bg-background border border-border/80 shadow-xs"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <tab.icon className={`size-3.5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  <span>{tab.label}</span>
                  {tab.id === "diagnostics" && (lowTurnoutSessions.length + consecutiveAbsentStudents.length > 0) && (
                    <span className="flex size-4.5 items-center justify-center rounded-full bg-rose-500/15 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                      {lowTurnoutSessions.length + consecutiveAbsentStudents.length}
                    </span>
                  )}
                </span>
              </button>
            )
          })}
        </div>

        {/* Refresh & Last Refreshed */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-9 gap-1.5 text-xs font-semibold cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin text-primary" : "text-muted-foreground"}`} />
            <span>{isFetching ? "Refetching..." : "Refresh"}</span>
          </Button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          CASCADING SERVER-SIDE FILTER BAR
      ══════════════════════════════════════════════════════════ */}
      <Card className="border-border/80 bg-card shadow-2xs overflow-hidden">
        <CardContent className="p-3.5 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2.5">

            {/* 1. Date Range Preset */}
            <div className="w-40 min-w-36">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="h-9 text-xs font-medium w-full">
                  <Calendar className="size-3.5 mr-1 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  {DATE_RANGES.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom Date Range Inputs */}
            {dateRange === "custom" && (
              <div className="flex items-center gap-1.5">
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={e => setCustomStartDate(e.target.value)}
                  className="h-9 w-36 text-xs"
                  placeholder="Start Date"
                />
                <span className="text-xs text-muted-foreground">to</span>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={e => setCustomEndDate(e.target.value)}
                  className="h-9 w-36 text-xs"
                  placeholder="End Date"
                />
              </div>
            )}

            {/* 2. Department Selector */}
            <div className="w-40 min-w-36">
              <Select value={selectedDept} onValueChange={handleDeptChange}>
                <SelectTrigger className="h-9 text-xs font-medium w-full">
                  <Layers className="size-3.5 mr-1 text-muted-foreground shrink-0" />
                  <div className="truncate text-left w-full">
                    <SelectValue placeholder="All Departments" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {selectedDept !== "all" && !departmentsList.some((d: any) => d.id === selectedDept) && (
                    <SelectItem value={selectedDept} disabled className="hidden">
                      Loading...
                    </SelectItem>
                  )}
                  {departmentsList.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>{d.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 3. Academic Year Selector */}
            <div className="w-36 min-w-32">
              <Select value={selectedYear} onValueChange={handleYearChange}>
                <SelectTrigger className="h-9 text-xs font-medium w-full">
                  <div className="truncate text-left w-full">
                    <SelectValue placeholder="All Years" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {YEAR_OPTIONS.map(y => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 4. Class & Section (Filtered by Dept & Year) */}
            <div className="w-44 sm:w-48 min-w-40">
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="h-9 text-xs font-medium w-full">
                  <div className="truncate text-left w-full">
                    <SelectValue placeholder="All Classes" />
                  </div>
                </SelectTrigger>
                <SelectContent className="min-w-44 max-w-64 max-h-96 p-1">
                  <SelectItem value="all" className="font-semibold text-foreground cursor-pointer py-1 text-xs">
                    All Classes
                  </SelectItem>
                  {selectedClass !== "all" && !classesList.some((c: any) => c.id === selectedClass) && (
                    <SelectItem value={selectedClass} disabled className="hidden">
                      Loading...
                    </SelectItem>
                  )}
                  {groupedClassesByYear.length > 0 && <SelectSeparator className="my-0.5" />}
                  {groupedClassesByYear.length === 0 ? (
                    <div className="py-2 px-3 text-center text-xs text-muted-foreground">
                      No classes available
                    </div>
                  ) : (
                    groupedClassesByYear.map((group, idx) => (
                      <SelectGroup key={group.year} className={idx > 0 ? "mt-1 pt-0.5 border-t border-border/40" : ""}>
                        <SelectLabel className="px-2.5 pt-1.5 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                          {group.year}
                        </SelectLabel>
                        {group.classes.map((c: any) => (
                          <SelectItem
                            key={c.id}
                            value={c.id}
                            className="text-xs cursor-pointer py-1 px-2.5 my-0.2 rounded-md font-medium"
                          >
                            {c.department?.code || c.name}-{c.section}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* 5. Subject Filter */}
            <div className="w-44 min-w-36">
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="h-9 text-xs font-medium w-full">
                  <div className="truncate text-left w-full">
                    <SelectValue placeholder="All Subjects" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {selectedSubject !== "all" && !subjectsList.some((s: any) => s.id === selectedSubject) && (
                    <SelectItem value={selectedSubject} disabled className="hidden">
                      Loading...
                    </SelectItem>
                  )}
                  {availableSubjects.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 6. Teacher Filter */}
            <div className="w-44 min-w-36">
              <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                <SelectTrigger className="h-9 text-xs font-medium w-full">
                  <div className="truncate text-left w-full">
                    <SelectValue placeholder="All Faculty" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Faculty</SelectItem>
                  {selectedTeacher !== "all" && !teachersList.some((t: any) => t.id === selectedTeacher) && (
                    <SelectItem value={selectedTeacher} disabled className="hidden">
                      Loading...
                    </SelectItem>
                  )}
                  {teachersList.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title}. {t.user?.full_name || "Unknown"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Clear All Action */}
            {isAnyFilterActive && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                className="h-9 rounded-lg border border-rose-200/80 bg-rose-50/60 dark:border-rose-900/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 hover:bg-rose-100 text-xs font-semibold px-3 gap-1.5 cursor-pointer shadow-2xs"
              >
                <X className="size-3.5" /> Clear All Filters
              </Button>
            )}
          </div>

          {/* Active Filter Chips Summary */}
          {isAnyFilterActive && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/60">
              <span className="text-[11px] font-semibold text-muted-foreground mr-1">Active Filters:</span>
              {dateRange !== "all" && (
                <Badge variant="secondary" className="text-[10px] gap-1 px-2 py-0.5 font-medium">
                  Date: {DATE_RANGES.find(r => r.value === dateRange)?.label}
                  <X className="size-3 cursor-pointer hover:text-foreground" onClick={() => setDateRange("all")} />
                </Badge>
              )}
              {selectedDept !== "all" && (
                <Badge variant="secondary" className="text-[10px] gap-1 px-2 py-0.5 font-medium">
                  Dept: {departmentsList.find((d: any) => d.id === selectedDept)?.code || departmentsList.find((d: any) => d.id === selectedDept)?.name || "Loading..."}
                  <X className="size-3 cursor-pointer hover:text-foreground" onClick={() => setSelectedDept("all")} />
                </Badge>
              )}
              {selectedYear !== "all" && (
                <Badge variant="secondary" className="text-[10px] gap-1 px-2 py-0.5 font-medium">
                  Year: {selectedYear}
                  <X className="size-3 cursor-pointer hover:text-foreground" onClick={() => setSelectedYear("all")} />
                </Badge>
              )}
              {selectedClass !== "all" && (
                <Badge variant="secondary" className="text-[10px] gap-1 px-2 py-0.5 font-medium">
                  Class: {(() => {
                    const match = classesList.find((c: any) => c.id === selectedClass)
                    if (match) return `${match.department?.code || match.name} · ${match.year} · Sec ${match.section}`
                    return "Loading..."
                  })()}
                  <X className="size-3 cursor-pointer hover:text-foreground" onClick={() => setSelectedClass("all")} />
                </Badge>
              )}
              {selectedSubject !== "all" && (
                <Badge variant="secondary" className="text-[10px] gap-1 px-2 py-0.5 font-medium">
                  Subject: {subjectsList.find((s: any) => s.id === selectedSubject)?.name || "Loading..."}
                  <X className="size-3 cursor-pointer hover:text-foreground" onClick={() => setSelectedSubject("all")} />
                </Badge>
              )}
              {selectedTeacher !== "all" && (
                <Badge variant="secondary" className="text-[10px] gap-1 px-2 py-0.5 font-medium">
                  Teacher: {(() => {
                    const match = teachersList.find((t: any) => t.id === selectedTeacher)
                    if (match) return `${match.title ? `${match.title}. ` : ""}${match.user?.full_name || "Faculty"}`
                    return "Loading..."
                  })()}
                  <X className="size-3 cursor-pointer hover:text-foreground" onClick={() => setSelectedTeacher("all")} />
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading Skeleton State */}
      {isLoading && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {[1, 2, 3, 4].map(i => <CardSkeleton key={i} />)}
          </div>
          <ChartSkeleton />
          <TableSkeleton cols={7} rows={6} hasAvatar={false} />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 1: ATTENDANCE OVERVIEW (EXECUTIVE DASHBOARD)
      ══════════════════════════════════════════════════════════ */}
      {!isLoading && activeTab === "attendance-overview" && (
        <motion.div
          key="tab-attendance-overview"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
          className="flex flex-col gap-6"
        >
          {/* 4 Headline Executive KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* KPI 1: Overall Attendance Rate */}
            <Card className="relative overflow-hidden rounded-xl border border-sky-200/80 bg-linear-to-b from-sky-500/5 via-card to-card p-4 shadow-2xs dark:border-sky-800/60">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">
                      {isAnyFilterActive ? "Filtered Attendance" : "Campus Attendance"}
                    </span>
                  </div>
                  <div className="text-3xl font-black tracking-tight text-foreground mt-0.5">
                    {overview?.hasData && campusPct !== null ? (
                      <span className={overallColor.text}>{campusPct}%</span>
                    ) : (
                      <span className="text-muted-foreground text-2xl font-bold">No Data</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">
                    {overview?.hasData
                      ? `${overview.totalPresentMarks.toLocaleString()} present / ${overview.totalExpectedStudents.toLocaleString()} expected`
                      : "No valid finalized sessions"}
                  </span>
                </div>
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                  <BarChart3 className="size-5" />
                </div>
              </div>
            </Card>

            {/* KPI 2: Sessions Conducted */}
            <Card className="relative overflow-hidden rounded-xl border border-emerald-200/80 bg-linear-to-b from-emerald-500/5 via-card to-card p-4 shadow-2xs dark:border-emerald-800/60">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                    Sessions Finalized
                  </span>
                  <div className="text-3xl font-black tracking-tight text-foreground mt-0.5">
                    {overview?.totalSessionsConducted?.toLocaleString() ?? 0}
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">
                    Conducted by {overview?.activeTeachersCount ?? 0} active faculty
                  </span>
                </div>
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-5" />
                </div>
              </div>
            </Card>

            {/* KPI 3: Students Below 75% Criteria */}
            <Card className="relative overflow-hidden rounded-xl border border-rose-200/80 bg-linear-to-b from-rose-500/5 via-card to-card p-4 shadow-2xs dark:border-rose-800/60">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                    Defaulters (&lt;75%)
                  </span>
                  <div className="text-3xl font-black tracking-tight text-foreground mt-0.5">
                    {overview?.studentsBelow75Count ?? 0}
                  </div>
                  <span className="text-xs text-rose-600 dark:text-rose-400 font-semibold">
                    Students requiring intervention
                  </span>
                </div>
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="size-5" />
                </div>
              </div>
            </Card>

            {/* KPI 4: Total Expected Student Opportunities */}
            <Card className="relative overflow-hidden rounded-xl border border-amber-200/80 bg-linear-to-b from-amber-500/5 via-card to-card p-4 shadow-2xs dark:border-amber-800/60">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                    Expected Opportunities
                  </span>
                  <div className="text-3xl font-black tracking-tight text-foreground mt-0.5">
                    {overview?.totalExpectedStudents?.toLocaleString() ?? 0}
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">
                    {overview?.totalExpectedStudents && overview?.totalPresentMarks
                      ? `${overview.totalExpectedStudents - overview.totalPresentMarks} absent marks recorded`
                      : "Total expected student seats"}
                  </span>
                </div>
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Users className="size-5" />
                </div>
              </div>
            </Card>
          </div>

          {/* ══════════════════════════════════════════════════════════
              TOP PERFORMER & ATTENTION REQUIRED SUMMARY CARDS
          ══════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top Attendance Cohort */}
            <Card className="border-emerald-200/80 bg-emerald-500/5 dark:border-emerald-900/50 p-4.5 shadow-2xs">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <Award className="size-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                      Top Attendance Subject & Cohort
                    </span>
                    <Badge variant="outline" className="text-[10px] font-bold bg-emerald-500/10 text-emerald-700 border-emerald-500/20 px-1.5 py-0">
                      ≥3 Sessions
                    </Badge>
                  </div>
                  {overview?.topSubjectCohort ? (
                    <div className="flex flex-col gap-1.5 mt-1">
                      <div className="text-lg font-bold text-foreground">
                        {overview.topSubjectCohort.subjectName} ({overview.topSubjectCohort.subjectCode})
                      </div>
                      <div className="flex items-center gap-2 flex-wrap mt-0.5">
                        {renderCohortBadges(overview.topSubjectCohort.cohortLabel)}
                        <span className="text-muted-foreground/40 text-xs font-bold">·</span>
                        <div className="flex items-center gap-1 text-xs text-foreground/90 font-semibold">
                          <span className="text-muted-foreground font-medium">Faculty:</span>
                          <span>{overview.topSubjectCohort.teacherName}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                          {overview.topSubjectCohort.attendancePct}%
                        </span>
                        <span className="text-xs text-muted-foreground font-medium">
                          across {overview.topSubjectCohort.sessionsCount} conducted sessions
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground py-2 font-medium">
                      Insufficient data (minimum 3 conducted sessions required for ranking).
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Attention Required Cohort */}
            <Card className="border-rose-200/80 bg-rose-500/5 dark:border-rose-900/50 p-4.5 shadow-2xs">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="size-4 text-rose-600 dark:text-rose-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                      Attention Required (Lowest Attendance)
                    </span>
                    <Badge variant="outline" className="text-[10px] font-bold bg-rose-500/10 text-rose-700 border-rose-500/20 px-1.5 py-0">
                      Valid Cohorts Only
                    </Badge>
                  </div>
                  {overview?.attentionRequiredSubjectCohort ? (
                    <div className="flex flex-col gap-1.5 mt-1">
                      <div className="text-lg font-bold text-foreground">
                        {overview.attentionRequiredSubjectCohort.subjectName} ({overview.attentionRequiredSubjectCohort.subjectCode})
                      </div>
                      <div className="flex items-center gap-2 flex-wrap mt-0.5">
                        {renderCohortBadges(overview.attentionRequiredSubjectCohort.cohortLabel)}
                        <span className="text-muted-foreground/40 text-xs font-bold">·</span>
                        <div className="flex items-center gap-1 text-xs text-foreground/90 font-semibold">
                          <span className="text-muted-foreground font-medium">Faculty:</span>
                          <span>{overview.attentionRequiredSubjectCohort.teacherName}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
                          {overview.attentionRequiredSubjectCohort.attendancePct}%
                        </span>
                        <span className="text-xs text-muted-foreground font-medium">
                          across {overview.attentionRequiredSubjectCohort.sessionsCount} conducted sessions
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground py-2 font-medium">
                      No cohorts requiring immediate attention for selected filters.
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* ══════════════════════════════════════════════════════════
              ATTENDANCE TREND & DEPARTMENT BREAKDOWN SECTION
          ══════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 items-stretch">
            {/* Attendance Trend Chart */}
            <Card className="flex flex-col overflow-hidden">
              <CardHeader className="pb-2 pt-4 border-b border-border/60 bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="size-4 text-primary" />
                    <CardTitle className="text-sm font-bold text-foreground">Attendance Trend Over Time</CardTitle>
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground">
                    Canonical Option B Daily Aggregation
                  </span>
                </div>
                <CardDescription className="text-xs">
                  {dateRange === "all" ? "All available session dates" : `Filtered date range: ${DATE_RANGES.find(r => r.value === dateRange)?.label}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 p-4 pt-6">
                {dailyAttendanceTrend.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
                    <Calendar className="size-8 opacity-40" />
                    <span>No attendance session records found for the selected date range.</span>
                  </div>
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dailyAttendanceTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.6} />
                        <XAxis
                          dataKey="formattedDate"
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          domain={[0, 100]}
                          ticks={[0, 25, 50, 75, 100]}
                          unit="%"
                        />
                        <RechartsTooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload
                              return (
                                <div className="rounded-lg border border-border bg-card p-3 shadow-lg text-xs">
                                  <div className="font-bold text-foreground mb-1">{d.formattedDate}</div>
                                  <div className="flex items-center justify-between gap-4 py-0.5">
                                    <span className="text-muted-foreground">Attendance:</span>
                                    <span className="font-bold text-sky-600 dark:text-sky-400">{d.attendancePct}%</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-4 py-0.5">
                                    <span className="text-muted-foreground">Present Marks:</span>
                                    <span className="font-bold text-foreground">{d.present}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-4 py-0.5">
                                    <span className="text-muted-foreground">Expected Opps:</span>
                                    <span className="font-bold text-foreground">{d.expected}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-4 py-0.5">
                                    <span className="text-muted-foreground">Sessions:</span>
                                    <span className="font-bold text-foreground">{d.sessions}</span>
                                  </div>
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="attendancePct"
                          stroke="#0ea5e9"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#attendanceGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Department → Academic Year Breakdown */}
            <Card className="flex flex-col overflow-hidden">
              <CardHeader className="pb-2.5 pt-4 border-b border-border/60 bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="size-4 text-emerald-600 dark:text-emerald-400" />
                    <CardTitle className="text-sm font-bold text-foreground">Department & Year Breakdown</CardTitle>
                  </div>
                  {departmentYearBreakdown.length > 0 && (
                    <Badge variant="outline" className="text-[10px] font-semibold px-2 py-0.5 bg-background">
                      {departmentYearBreakdown.length} {departmentYearBreakdown.length === 1 ? "Cohort" : "Cohorts"}
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-xs">
                  Canonical academic year cohort attendance
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 p-4 flex flex-col justify-between gap-4">
                {departmentYearBreakdown.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center text-xs text-muted-foreground gap-2">
                    <Layers className="size-8 opacity-30" />
                    <span>No department cohorts available for selection.</span>
                  </div>
                ) : departmentYearBreakdown.length === 1 ? (
                  /* ── Single Cohort Focused Layout ── */
                  (() => {
                    const single = departmentYearBreakdown[0]
                    const color = getAttendanceColor(single.attendancePct)
                    return (
                      <div className="flex flex-col gap-3.5">
                        {/* Cohort Header & Status */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Badge variant="outline" className="text-xs font-bold px-2 py-0.5 bg-primary/5 border-primary/20 text-primary shrink-0">
                              {single.deptCode}
                            </Badge>
                            <span className="text-xs font-bold text-foreground truncate">{single.year}</span>
                          </div>
                          <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0.5 shrink-0 ${color.badge}`}>
                            {single.attendancePct === null
                              ? "No Data"
                              : single.attendancePct >= 75
                              ? "On Track (≥75%)"
                              : single.attendancePct >= 60
                              ? "At Risk (60-74%)"
                              : "Critical Low (<60%)"}
                          </Badge>
                        </div>

                        {/* Metric Container */}
                        <div className="rounded-xl bg-muted/30 border border-border/60 p-3.5 flex flex-col gap-2.5">
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Attendance Rate</span>
                            <span className={`text-3xl font-black tracking-tight ${color.text}`}>
                              {single.attendancePct !== null ? `${single.attendancePct}%` : "—"}
                            </span>
                          </div>

                          {/* Proportional Attendance Bar with 75% Target Marker */}
                          <div className="relative pt-1 pb-1">
                            <div className="h-3 w-full overflow-hidden rounded-full bg-muted border border-border/40">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${color.bg}`}
                                style={{ width: `${Math.min(100, Math.max(0, single.attendancePct ?? 0))}%` }}
                              />
                            </div>
                            {/* 75% Target Benchmark Line */}
                            <div className="absolute top-0 bottom-1 left-[75%] -translate-x-1/2 flex flex-col items-center pointer-events-none">
                              <div className="w-0.5 h-full bg-foreground/60 dark:bg-foreground/80 rounded-full" />
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1.5 font-medium">
                              <span>0%</span>
                              <span className="text-foreground/70 font-semibold">75% Target Benchmark</span>
                              <span>100%</span>
                            </div>
                          </div>
                        </div>

                        {/* Canonical Summary Stats */}
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="rounded-lg bg-muted/20 border border-border/50 p-2.5 flex flex-col">
                            <span className="text-[10px] text-muted-foreground font-medium">Sessions Conducted</span>
                            <span className="text-sm font-bold text-foreground mt-0.5">{single.sessionsConducted}</span>
                          </div>
                          <div className="rounded-lg bg-muted/20 border border-border/50 p-2.5 flex flex-col">
                            <span className="text-[10px] text-muted-foreground font-medium">Cohort Label</span>
                            <span className="text-xs font-bold text-foreground mt-0.5 truncate">{single.label}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })()
                ) : (
                  /* ── Multi-Cohort Comparative List ── */
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between text-[11px] pb-1 border-b border-border/40 text-muted-foreground font-medium">
                      <span>Cohort & Academic Year</span>
                      <span className="flex items-center gap-1">
                        <span className="inline-block size-1.5 rounded-full bg-emerald-500" /> ≥75% Target
                      </span>
                    </div>

                    <div className="flex flex-col gap-2 max-h-62.5 overflow-y-auto pr-1">
                      {departmentYearBreakdown.map(dy => {
                        const color = getAttendanceColor(dy.attendancePct)
                        return (
                          <div
                            key={`${dy.deptCode}__${dy.year}`}
                            className="rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 p-2.5 flex flex-col gap-1.5 transition-colors"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0 bg-background shrink-0">
                                  {dy.deptCode}
                                </Badge>
                                <span className="text-xs font-semibold text-foreground truncate">{dy.year}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[11px] text-muted-foreground font-medium whitespace-nowrap">
                                  {dy.sessionsConducted} sess.
                                </span>
                                <Badge variant="outline" className={`text-xs font-black px-1.5 py-0 ${color.badge}`}>
                                  {dy.attendancePct !== null ? `${dy.attendancePct}%` : "—"}
                                </Badge>
                              </div>
                            </div>

                            {/* Proportional comparison bar with subtle 75% target marker */}
                            <div className="relative pt-0.5">
                              <div className="h-2 w-full overflow-hidden rounded-full bg-muted/80 border border-border/30">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${color.bg}`}
                                  style={{ width: `${Math.min(100, Math.max(0, dy.attendancePct ?? 0))}%` }}
                                />
                              </div>
                              <div
                                className="absolute top-0 bottom-0 left-[75%] -translate-x-1/2 w-0.5 bg-foreground/30 pointer-events-none"
                                title="75% Target Benchmark"
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="rounded-lg bg-muted/40 p-2.5 border border-border/60 text-[11px] text-muted-foreground flex items-center gap-2 mt-auto">
                  <Info className="size-3.5 text-primary shrink-0" />
                  <span>Cohorts are strictly segregated by Department and Academic Year.</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ══════════════════════════════════════════════════════════
              SUBJECT + COHORT ATTENDANCE MATRIX TABLE
          ══════════════════════════════════════════════════════════ */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3 pt-4 border-b border-border/60 bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="size-4 text-primary" />
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground">Subject & Cohort Attendance Matrix</CardTitle>
                    <CardDescription className="text-xs">
                      Official Expected-Student Option B metrics per subject and exact class cohort
                    </CardDescription>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Search bar */}
                  <div className="relative w-48 sm:w-56">
                    <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search subject or code..."
                      value={matrixSearch}
                      onChange={e => setMatrixSearch(e.target.value)}
                      className="h-8 pl-8 text-xs"
                    />
                    {matrixSearch && (
                      <button onClick={() => setMatrixSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        <X className="size-3" />
                      </button>
                    )}
                  </div>

                  {/* CSV Export */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportMatrixCSV(filteredMatrix)}
                    disabled={filteredMatrix.length === 0}
                    className="h-8 gap-1.5 text-xs font-semibold cursor-pointer shadow-2xs"
                  >
                    <Download className="size-3.5" /> Export Matrix CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left">
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Subject</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cohort</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center">Sessions</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center">Expected Opps</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center">Present</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center">Absent</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Attendance %</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Faculty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMatrix.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-12 text-center text-sm text-muted-foreground">
                          {matrixSearch ? "No subjects match your search query." : "No attendance data found for the selected filters."}
                        </td>
                      </tr>
                    ) : (
                      filteredMatrix.map(item => {
                        const color = getAttendanceColor(item.attendancePct)
                        const absentCount = item.totalExpected > 0 ? item.totalExpected - item.totalPresent : 0
                        return (
                          <tr key={item.key} className="border-t border-border hover:bg-muted/20 transition-colors">
                            {/* Subject */}
                            <td className="px-5 py-3">
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-bold text-foreground">{item.subjectName}</span>
                                <span className="text-[10px] font-mono font-semibold text-muted-foreground">{item.subjectCode}</span>
                              </div>
                            </td>

                            {/* Cohort */}
                            <td className="px-4 py-3">
                              {renderCohortBadges(item.cohortLabel, item.year, item.classSection, item.deptCode)}
                            </td>

                            {/* Sessions */}
                            <td className="px-4 py-3 text-center text-xs font-bold text-foreground">
                              {item.sessionsConducted}
                            </td>

                            {/* Expected */}
                            <td className="px-4 py-3 text-center text-xs font-medium text-foreground">
                              {item.totalExpected}
                            </td>

                            {/* Present */}
                            <td className="px-4 py-3 text-center text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              {item.totalPresent}
                            </td>

                            {/* Absent */}
                            <td className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">
                              {absentCount}
                            </td>

                            {/* Attendance % */}
                            <td className="px-5 py-3">
                              {item.attendancePct !== null ? (
                                <div className="flex items-center gap-2.5">
                                  <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                                    <div className={`h-full rounded-full ${color.bar}`} style={{ width: `${item.attendancePct}%` }} />
                                  </div>
                                  <span className={`text-xs font-bold ${color.text}`}>{item.attendancePct}%</span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">No Enrolled Students</span>
                              )}
                            </td>

                            {/* Faculty */}
                            <td className="px-5 py-3 text-xs text-muted-foreground font-medium truncate max-w-44">
                              {item.teachersList || "—"}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* ══════════════════════════════════════════════════════════
              STUDENT DEFAULTER SECTION (<75%)
          ══════════════════════════════════════════════════════════ */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3 pt-4 border-b border-border/60 bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-4 text-rose-600 dark:text-rose-400" />
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground">Students Below 75% Attendance Requirement</CardTitle>
                    <CardDescription className="text-xs">
                      Identified defaulters requiring immediate administrative intervention and recovery tracking
                    </CardDescription>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Status Toggle filter */}
                  <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
                    <button
                      onClick={() => setDefaulterStatusFilter("all")}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                        defaulterStatusFilter === "all" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      All ({defaulterStudents.length})
                    </button>
                    <button
                      onClick={() => setDefaulterStatusFilter("critical")}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                        defaulterStatusFilter === "critical" ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 font-bold" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Critical &lt;65% ({defaulterStudents.filter(d => d.status === "critical").length})
                    </button>
                    <button
                      onClick={() => setDefaulterStatusFilter("at_risk")}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                        defaulterStatusFilter === "at_risk" ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      At Risk 65-74% ({defaulterStudents.filter(d => d.status === "at_risk").length})
                    </button>
                  </div>

                  {/* Student Search */}
                  <div className="relative w-44 sm:w-52">
                    <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search name or roll..."
                      value={defaulterSearch}
                      onChange={e => setDefaulterSearch(e.target.value)}
                      className="h-8 pl-8 text-xs"
                    />
                  </div>

                  {/* CSV Export */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportDefaultersCSV(filteredDefaulters)}
                    disabled={filteredDefaulters.length === 0}
                    className="h-8 gap-1.5 text-xs font-semibold cursor-pointer shadow-2xs"
                  >
                    <Download className="size-3.5" /> Export Defaulters CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left">
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Student</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Roll Number</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cohort</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center">Attended / Expected</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Attendance %</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center">Risk Status</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDefaulters.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-12 text-center text-sm text-muted-foreground">
                          {overview?.hasData
                            ? "Excellent! No students fall below the 75% attendance threshold in this scope."
                            : "No student records available for the selected filters."}
                        </td>
                      </tr>
                    ) : (
                      filteredDefaulters.map(st => {
                        const isCritical = st.status === "critical"
                        return (
                          <tr key={st.studentId} className="border-t border-border hover:bg-muted/20 transition-colors">
                            {/* Student */}
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2.5">
                                <Avatar className="size-7.5 ring-1 ring-border">
                                  <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                                    {getInitials(st.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs font-bold text-foreground">{st.name}</span>
                              </div>
                            </td>

                            {/* Roll Number */}
                            <td className="px-4 py-3">
                              <span className="font-mono text-xs font-bold bg-muted px-2 py-0.5 rounded-md text-muted-foreground">
                                {st.rollNumber}
                              </span>
                            </td>

                            {/* Cohort */}
                            <td className="px-4 py-3">
                              {renderCohortBadges("", st.year, st.classSection, st.deptCode)}
                            </td>

                            {/* Attended / Expected */}
                            <td className="px-4 py-3 text-center text-xs font-medium text-foreground">
                              {st.attendedSessions} / {st.expectedSessions} <span className="text-muted-foreground text-[11px]">sessions</span>
                            </td>

                            {/* Attendance % */}
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
                                  <div
                                    className={`h-full rounded-full ${isCritical ? "bg-rose-500" : "bg-amber-500"}`}
                                    style={{ width: `${st.attendancePct}%` }}
                                  />
                                </div>
                                <span className={`text-xs font-bold ${isCritical ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400"}`}>
                                  {st.attendancePct}%
                                </span>
                              </div>
                            </td>

                            {/* Risk Status */}
                            <td className="px-4 py-3 text-center">
                              <Badge
                                variant="outline"
                                className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                                  isCritical
                                    ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20"
                                    : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
                                }`}
                              >
                                {isCritical ? "Critical (<65%)" : "At Risk (65-74%)"}
                              </Badge>
                            </td>

                            {/* Actions */}
                            <td className="px-5 py-3 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedStudentForDrilldown(st)}
                                className="h-7 text-xs font-semibold text-primary hover:text-primary/80 cursor-pointer"
                              >
                                View Drilldown
                              </Button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 2: TEACHER ACTIVITY (FACULTY MONITORING)
      ══════════════════════════════════════════════════════════ */}
      {!isLoading && activeTab === "teacher-activity" && (
        <motion.div
          key="tab-teacher-activity"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
          className="flex flex-col gap-6"
        >
          {/* Teacher Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Active Faculty */}
            <Card className="p-4 border border-emerald-200/80 bg-linear-to-b from-emerald-500/5 via-card to-card shadow-2xs dark:border-emerald-800/60">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                    Active Faculty
                  </span>
                  <div className="text-3xl font-black text-foreground mt-1">
                    {teacherActivity.filter(t => t.sessionsConducted > 0).length}
                    <span className="text-xs font-semibold text-muted-foreground ml-1.5">/ {teacherActivity.length}</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">Faculty members with finalized sessions</span>
                </div>
                <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Users className="size-5" />
                </div>
              </div>
            </Card>

            {/* Total Sessions Conducted by Faculty */}
            <Card className="p-4 border border-sky-200/80 bg-linear-to-b from-sky-500/5 via-card to-card shadow-2xs dark:border-sky-800/60">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">
                    Faculty Sessions
                  </span>
                  <div className="text-3xl font-black text-foreground mt-1">
                    {teacherActivity.reduce((sum, t) => sum + t.sessionsConducted, 0).toLocaleString()}
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">Total sessions finalized by teachers</span>
                </div>
                <div className="flex size-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                  <CheckCircle2 className="size-5" />
                </div>
              </div>
            </Card>

            {/* Average Student Attendance Across Faculty */}
            <Card className="p-4 border border-amber-200/80 bg-linear-to-b from-amber-500/5 via-card to-card shadow-2xs dark:border-amber-800/60">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                    Average Student Attendance
                  </span>
                  <div className="text-3xl font-black text-foreground mt-1">
                    {overview?.campusAttendancePct !== null ? `${overview?.campusAttendancePct}%` : "—"}
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">Cumulative expected attendance outcome</span>
                </div>
                <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <TrendingUp className="size-5" />
                </div>
              </div>
            </Card>
          </div>

          {/* Teacher Activity Table */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3 pt-4 border-b border-border/60 bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-bold text-foreground">Faculty Activity & Attendance Overview</CardTitle>
                  <CardDescription className="text-xs">
                    Administrative monitoring of conducted sessions, assigned courses, cohorts, and average student attendance
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative w-48 sm:w-56">
                    <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search faculty name..."
                      value={teacherSearch}
                      onChange={e => setTeacherSearch(e.target.value)}
                      className="h-8 pl-8 text-xs"
                    />
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportTeacherCSV(filteredTeachers)}
                    disabled={filteredTeachers.length === 0}
                    className="h-8 gap-1.5 text-xs font-semibold cursor-pointer shadow-2xs"
                  >
                    <Download className="size-3.5" /> Export Faculty CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left">
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Faculty Member</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Department</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center">Sessions Conducted</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center">Assigned Courses</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center">Assigned Cohorts</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Avg Student Attendance %</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Last Session Date</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTeachers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-12 text-center text-sm text-muted-foreground">
                          No faculty records match your criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredTeachers.map((t, idx) => {
                        const color = getAttendanceColor(t.avgAttendancePct)
                        const isTop = idx === 0 && t.sessionsConducted > 0
                        return (
                          <tr key={t.teacherId} className={`border-t border-border hover:bg-muted/20 transition-colors ${isTop ? "bg-amber-500/3" : ""}`}>
                            {/* Teacher */}
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2.5">
                                <Avatar className="size-8 ring-1 ring-border">
                                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                    {getInitials(t.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col min-w-0">
                                  <span className="text-xs font-bold text-foreground truncate">{t.name}</span>
                                  {isTop && (
                                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">★ Most Active Faculty</span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Dept */}
                            <td className="px-4 py-3">
                              <span className="font-mono text-xs font-bold rounded-md bg-muted px-2 py-0.5 text-muted-foreground">
                                {t.deptCode}
                              </span>
                            </td>

                            {/* Sessions */}
                            <td className="px-4 py-3 text-center text-xs font-bold text-foreground">
                              {t.sessionsConducted}
                            </td>

                            {/* Assigned Courses */}
                            <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                              {t.assignedCoursesCount}
                            </td>

                            {/* Assigned Cohorts */}
                            <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                              {t.assignedCohortsCount}
                            </td>

                            {/* Avg Student Attendance % */}
                            <td className="px-5 py-3">
                              {t.avgAttendancePct !== null ? (
                                <div className="flex items-center gap-2.5">
                                  <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                                    <div className={`h-full rounded-full ${color.bar}`} style={{ width: `${t.avgAttendancePct}%` }} />
                                  </div>
                                  <span className={`text-xs font-bold ${color.text}`}>{t.avgAttendancePct}%</span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">No Sessions</span>
                              )}
                            </td>

                            {/* Last Session */}
                            <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">
                              {formatSessionDate(t.lastSessionDate)}
                            </td>

                            {/* Drilldown */}
                            <td className="px-5 py-3 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedTeacherForDrilldown(t)}
                                className="h-7 text-xs font-semibold text-primary hover:text-primary/80 cursor-pointer"
                              >
                                View Details
                              </Button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 3: ATTENDANCE ALERTS & EXCEPTIONS (OPERATIONAL ALERTS)
      ══════════════════════════════════════════════════════════ */}
      {!isLoading && activeTab === "diagnostics" && (
        <motion.div
          key="tab-alerts"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
          className="flex flex-col gap-6"
        >
          {/* Executive Alert Banner */}
          <div className="rounded-xl border border-rose-500/30 bg-linear-to-r from-rose-500/10 via-card to-amber-500/10 p-4 text-foreground shadow-2xs">
            <div className="flex items-start gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 shrink-0">
                <AlertTriangle className="size-5" />
              </div>
              <div className="flex flex-col gap-1 text-xs">
                <span className="font-bold text-sm text-foreground">Immediate Operational Attendance Alerts</span>
                <p className="text-muted-foreground leading-relaxed">
                  Real-time detection for <strong>mass absenteeism / low turnout class events (&lt;50%)</strong> and <strong>acute student inactivity streaks (3+ consecutive lectures missed)</strong> to enable prompt mentor intervention and parent outreach.
                </p>
              </div>
            </div>
          </div>

          {/* Operational Alert Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Card 1: Mass Absenteeism & Low Turnout */}
            <Card className="p-4 border border-rose-200/80 bg-linear-to-b from-rose-500/5 via-card to-card shadow-2xs dark:border-rose-900/50">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                    Mass Absenteeism / Low Turnout Sessions
                  </span>
                  <div className="text-3xl font-black text-foreground mt-1">
                    {lowTurnoutSessions.length}
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">
                    Conducted class sessions with &lt;50% student turnout
                  </span>
                </div>
                <div className="flex size-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="size-5" />
                </div>
              </div>
            </Card>

            {/* Card 2: Acute Consecutive Absentees */}
            <Card className="p-4 border border-amber-200/80 bg-linear-to-b from-amber-500/5 via-card to-card shadow-2xs dark:border-amber-900/50">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                    Acute Consecutive Absentees (3+ Classes)
                  </span>
                  <div className="text-3xl font-black text-foreground mt-1">
                    {consecutiveAbsentStudents.length}
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">
                    Students with 3+ consecutive unexcused lecture absences
                  </span>
                </div>
                <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Users className="size-5" />
                </div>
              </div>
            </Card>
          </div>

          {/* ══════════════════════════════════════════════════════════
              TABLE 1: MASS ABSENTEEISM & LOW TURNOUT SESSIONS (<50%)
          ══════════════════════════════════════════════════════════ */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3 pt-4 border-b border-border/60 bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-4 text-rose-600 dark:text-rose-400" />
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground">Mass Absenteeism & Low Turnout Sessions (&lt;50%)</CardTitle>
                    <CardDescription className="text-xs">
                      Individual class sessions where attendance dropped below 50% of enrolled class capacity
                    </CardDescription>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Severity Filter Toggle */}
                  <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
                    <button
                      onClick={() => setLowTurnoutSeverityFilter("all")}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                        lowTurnoutSeverityFilter === "all" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      All ({lowTurnoutSessions.length})
                    </button>
                    <button
                      onClick={() => setLowTurnoutSeverityFilter("critical")}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                        lowTurnoutSeverityFilter === "critical" ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 font-bold" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Critical ≤25% ({lowTurnoutSessions.filter(s => s.severity === "critical").length})
                    </button>
                    <button
                      onClick={() => setLowTurnoutSeverityFilter("moderate")}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                        lowTurnoutSeverityFilter === "moderate" ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Low 26-49% ({lowTurnoutSessions.filter(s => s.severity === "moderate").length})
                    </button>
                  </div>

                  <div className="relative w-44 sm:w-52">
                    <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search subject, class, faculty..."
                      value={lowTurnoutSearch}
                      onChange={e => setLowTurnoutSearch(e.target.value)}
                      className="h-8 pl-8 text-xs"
                    />
                    {lowTurnoutSearch && (
                      <button onClick={() => setLowTurnoutSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        <X className="size-3" />
                      </button>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportLowTurnoutCSV(filteredLowTurnout)}
                    disabled={filteredLowTurnout.length === 0}
                    className="h-8 gap-1.5 text-xs font-semibold cursor-pointer shadow-2xs"
                  >
                    <Download className="size-3.5" /> Export Low Turnout CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-120">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-xs">
                    <tr className="border-b border-border bg-muted/30 text-left">
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Subject</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Class & Cohort</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Faculty</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center">Turnout (Present / Enrolled)</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Attendance %</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center">Severity Alert</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLowTurnout.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-10 text-center text-sm text-muted-foreground">
                          {lowTurnoutSearch ? "No sessions match your search query." : "🎉 Excellent! No sessions with low turnout (<50%) recorded in this scope."}
                        </td>
                      </tr>
                    ) : (
                      filteredLowTurnout.map(item => (
                        <tr key={item.sessionId} className="border-t border-border hover:bg-muted/20 transition-colors">
                          <td className="px-5 py-3 font-mono text-xs text-foreground whitespace-nowrap">
                            {item.formattedDate}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-bold text-foreground">{item.subjectName}</span>
                              <span className="text-[10px] font-mono font-semibold text-muted-foreground">{item.subjectCode}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {renderCohortBadges(null, item.year, item.classSection, item.deptCode)}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground font-semibold">
                            {item.teacherName}
                          </td>
                          <td className="px-4 py-3 text-center text-xs font-medium text-foreground whitespace-nowrap">
                            <span className="font-bold text-rose-600 dark:text-rose-400">{item.presentCount}</span>
                            <span className="text-muted-foreground"> / {item.expectedCount} students</span>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full rounded-full bg-rose-500"
                                  style={{ width: `${item.turnoutPct}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                                {item.turnoutPct}%
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge
                              variant="outline"
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                                item.severity === "critical"
                                  ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30"
                                  : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                              }`}
                            >
                              {item.severity === "critical" ? "Critical Mass Bunk (≤25%)" : "Low Turnout (26-49%)"}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* ══════════════════════════════════════════════════════════
              TABLE 2: ACUTE CONSECUTIVE ABSENCE TRACKER (3+ SESSIONS)
          ══════════════════════════════════════════════════════════ */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3 pt-4 border-b border-border/60 bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-amber-600 dark:text-amber-400" />
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground">Acute Consecutive Absence Tracker (3+ Classes Missed)</CardTitle>
                    <CardDescription className="text-xs">
                      Students who have missed 3 or more consecutive lectures, requiring immediate mentor outreach
                    </CardDescription>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Risk Filter Toggle */}
                  <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
                    <button
                      onClick={() => setConsecutiveRiskFilter("all")}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                        consecutiveRiskFilter === "all" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      All ({consecutiveAbsentStudents.length})
                    </button>
                    <button
                      onClick={() => setConsecutiveRiskFilter("critical")}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                        consecutiveRiskFilter === "critical" ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 font-bold" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Urgent 5+ ({consecutiveAbsentStudents.filter(s => s.riskLevel === "critical").length})
                    </button>
                    <button
                      onClick={() => setConsecutiveRiskFilter("high")}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                        consecutiveRiskFilter === "high" ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      High Risk 3-4 ({consecutiveAbsentStudents.filter(s => s.riskLevel === "high").length})
                    </button>
                  </div>

                  <div className="relative w-44 sm:w-52">
                    <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search student or roll..."
                      value={consecutiveAbsenceSearch}
                      onChange={e => setConsecutiveAbsenceSearch(e.target.value)}
                      className="h-8 pl-8 text-xs"
                    />
                    {consecutiveAbsenceSearch && (
                      <button onClick={() => setConsecutiveAbsenceSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        <X className="size-3" />
                      </button>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportConsecutiveAbsenceCSV(filteredConsecutiveAbsence)}
                    disabled={filteredConsecutiveAbsence.length === 0}
                    className="h-8 gap-1.5 text-xs font-semibold cursor-pointer shadow-2xs"
                  >
                    <Download className="size-3.5" /> Export Inactive Students CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-120">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-xs">
                    <tr className="border-b border-border bg-muted/30 text-left">
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Student</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Roll Number</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Class & Cohort</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center">Consecutive Missed</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Last Attended Session</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center">Intervention Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredConsecutiveAbsence.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
                          {consecutiveAbsenceSearch ? "No students match your search query." : "🎉 Great! No students currently on a 3+ consecutive absence streak."}
                        </td>
                      </tr>
                    ) : (
                      filteredConsecutiveAbsence.map(st => (
                        <tr key={st.studentId} className="border-t border-border hover:bg-muted/20 transition-colors">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <Avatar className="size-7.5 ring-1 ring-border">
                                <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                                  {getInitials(st.studentName)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs font-bold text-foreground">{st.studentName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs font-bold bg-muted px-2 py-0.5 rounded-md text-muted-foreground">
                              {st.rollNumber}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {renderCohortBadges(null, st.year, st.classSection, st.deptCode)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center gap-1 font-mono text-xs font-black text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                              {st.consecutiveMissed} classes in a row
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground font-medium whitespace-nowrap">
                            {st.lastAttendedDate || "Never in record"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge
                              variant="outline"
                              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md ${
                                st.riskLevel === "critical"
                                  ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30"
                                  : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                              }`}
                            >
                              {st.riskLevel === "critical" ? "Urgent Outreach (5+ Missed)" : "High Risk (3-4 Missed)"}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 4: SYSTEM LOGS (AUDIT TRAIL)
      ══════════════════════════════════════════════════════════ */}
      {!isLoading && activeTab === "system-logs" && (
        <motion.div
          key="tab-system-logs"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
          className="flex flex-col gap-6"
        >
          {/* Filters for Logs */}
          <div className="flex flex-wrap gap-2.5 items-center">
            <Select value={logFilterPerformer} onValueChange={setLogFilterPerformer}>
              <SelectTrigger className="h-9 w-44 text-xs font-medium">
                <Users className="size-3.5 mr-1 text-muted-foreground" />
                <SelectValue placeholder="All Performers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Performers</SelectItem>
                {uniquePerformers.map(p => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={logFilterAction} onValueChange={setLogFilterAction}>
              <SelectTrigger className="h-9 w-44 text-xs font-medium">
                <Activity className="size-3.5 mr-1 text-muted-foreground" />
                <SelectValue placeholder="All Action Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Action Types</SelectItem>
                <SelectItem value="create">Created</SelectItem>
                <SelectItem value="update">Updated</SelectItem>
                <SelectItem value="delete">Deleted</SelectItem>
                <SelectItem value="reset">Reset</SelectItem>
                <SelectItem value="assign">Assigned</SelectItem>
              </SelectContent>
            </Select>

            {(logFilterPerformer !== "all" || logFilterAction !== "all") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setLogFilterPerformer("all"); setLogFilterAction("all") }}
                className="h-9 text-xs font-semibold gap-1.5 cursor-pointer shadow-2xs"
              >
                <X className="size-3.5" /> Clear Log Filters
              </Button>
            )}
          </div>

          {/* Logs Table */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3 pt-4 border-b border-border/60 bg-muted/20">
              <CardTitle className="text-sm font-bold text-foreground">Administrative Event Logs</CardTitle>
              <CardDescription className="text-xs">Audit log of system and administrative events</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left">
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground w-12">Type</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground w-28">Action</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Performed By</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-12 text-center text-sm text-muted-foreground">
                          No audit logs match the selected criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map(log => {
                        const cfg = getActionConfig(log.action_type, log.description || "")
                        const Icon = cfg.icon
                        return (
                          <tr key={log.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                            <td className="px-5 py-3">
                              <div className={`flex size-7 items-center justify-center rounded-lg border ${cfg.bg} ${cfg.border}`}>
                                <Icon className={`size-3.5 ${cfg.color}`} />
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0.5 ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                                {cfg.label}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-xs font-medium text-foreground">
                              {log.description || "—"}
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground font-semibold">
                              {log.performedBy || "System"}
                            </td>
                            <td className="px-5 py-3 text-right font-mono text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(log.created_at).toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                                hour12: true,
                              })}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════════════════
          STUDENT DRILLDOWN MODAL
      ══════════════════════════════════════════════════════════ */}
      <Dialog open={!!selectedStudentForDrilldown} onOpenChange={open => !open && setSelectedStudentForDrilldown(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Avatar className="size-8 ring-1 ring-border">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                  {selectedStudentForDrilldown ? getInitials(selectedStudentForDrilldown.name) : "ST"}
                </AvatarFallback>
              </Avatar>
              <span>{selectedStudentForDrilldown?.name}</span>
            </DialogTitle>
            <div className="flex items-center gap-2 flex-wrap pt-1 text-xs text-muted-foreground">
              <span>Roll No: <strong className="font-mono text-foreground font-bold">{selectedStudentForDrilldown?.rollNumber}</strong></span>
              <span>·</span>
              {selectedStudentForDrilldown && renderCohortBadges("", selectedStudentForDrilldown.year, selectedStudentForDrilldown.classSection, selectedStudentForDrilldown.deptCode)}
            </div>
          </DialogHeader>

          {selectedStudentForDrilldown && (
            <div className="flex flex-col gap-4 py-2">
              {/* Overall Progress */}
              <div className="rounded-xl border border-border bg-muted/20 p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground font-semibold">Current Cumulative Attendance</span>
                  <div className="text-3xl font-black text-foreground mt-0.5">
                    {selectedStudentForDrilldown.attendancePct}%
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Attended {selectedStudentForDrilldown.attendedSessions} of {selectedStudentForDrilldown.expectedSessions} expected class sessions
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className={`text-xs font-bold px-3 py-1 rounded-md ${
                    selectedStudentForDrilldown.status === "critical"
                      ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30"
                      : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                  }`}
                >
                  {selectedStudentForDrilldown.status === "critical" ? "Critical (<65%)" : "At Risk (65-74%)"}
                </Badge>
              </div>

              {/* Attendance Recovery Calculator */}
              <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-3.5 text-xs text-foreground">
                <div className="font-bold flex items-center gap-1.5 text-sky-700 dark:text-sky-300 mb-1">
                  <TrendingUp className="size-4" /> Attendance Recovery Calculator
                </div>
                {(() => {
                  const P = selectedStudentForDrilldown.attendedSessions
                  const E = selectedStudentForDrilldown.expectedSessions
                  // (P + x) / (E + x) >= 0.75  =>  4P + 4x >= 3E + 3x  =>  x >= 3E - 4P
                  const needed = Math.max(0, Math.ceil(3 * E - 4 * P))
                  return (
                    <p className="text-muted-foreground leading-relaxed">
                      To achieve the mandatory <strong>75% attendance threshold</strong>, this student must attend the next{" "}
                      <span className="font-bold text-sky-600 dark:text-sky-400">{needed} consecutive classes</span> without missing a session.
                    </p>
                  )
                })()}
              </div>

              {/* Quick Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedStudentForDrilldown(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════
          TEACHER DRILLDOWN MODAL
      ══════════════════════════════════════════════════════════ */}
      <Dialog open={!!selectedTeacherForDrilldown} onOpenChange={open => !open && setSelectedTeacherForDrilldown(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Avatar className="size-8 ring-1 ring-border">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                  {selectedTeacherForDrilldown ? getInitials(selectedTeacherForDrilldown.name) : "FA"}
                </AvatarFallback>
              </Avatar>
              <span>{selectedTeacherForDrilldown?.name}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Department of {selectedTeacherForDrilldown?.deptCode} · Faculty Profile
            </DialogDescription>
          </DialogHeader>

          {selectedTeacherForDrilldown && (
            <div className="flex flex-col gap-4 py-2">
              {/* Stats overview */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="rounded-lg border border-border bg-muted/20 p-3 text-center">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Sessions</span>
                  <div className="text-xl font-bold text-foreground mt-0.5">
                    {selectedTeacherForDrilldown.sessionsConducted}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-3 text-center">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Assigned Courses</span>
                  <div className="text-xl font-bold text-foreground mt-0.5">
                    {selectedTeacherForDrilldown.assignedCoursesCount}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-3 text-center">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Student Outcome</span>
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {selectedTeacherForDrilldown.avgAttendancePct !== null ? `${selectedTeacherForDrilldown.avgAttendancePct}%` : "—"}
                  </div>
                </div>
              </div>

              {/* Last active info */}
              <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Last Conducted Attendance Session:</span>
                <span className="font-bold text-foreground">
                  {formatSessionDate(selectedTeacherForDrilldown.lastSessionDate)}
                </span>
              </div>

              {/* Close */}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedTeacherForDrilldown(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  )
}