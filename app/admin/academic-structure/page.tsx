"use client"
import { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import { useAcademicStructure } from "@/hooks/use-academic-structure"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Plus,
  Loader2,
  Building2,
  Users,
  BookOpen,
  Clock,
  GraduationCap,
  Hash,
  ChevronDown,
  ChevronRight,
  AlignJustify,
  CalendarDays,
  Sparkles,
  Layers,
  ArrowUpRight,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

import { motion, AnimatePresence } from "framer-motion"

/* ---------- Interfaces ---------- */
interface Department { id: string; name: string; code: string; classes: number; subjects: number }
interface ClassItem { id: string; name: string; section: string; year: string; department: string; departmentFull: string; displayName: string }
interface Subject { id: string; name: string; code: string; department: string; departmentFull: string }
interface Period { id: string; number: number; start: string; end: string; duration: string }

/* ---------- Academic Year Definitions & Visual Tokens ---------- */
const STANDARD_YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"] as const

interface YearTheme {
  label: string
  sublabel: string
  pillColor: string
  pillActive: string
  badge: string
  border: string
  hoverBorder: string
  gradient: string
  avatarGradient: string
  avatarText: string
  glowDot: string
  iconBg: string
  bgSoft: string
}

const YEAR_THEMES: Record<string, YearTheme> = {
  "1st Year": {
    label: "1st Year",
    sublabel: "Freshers / 1st Year Cohort",
    pillColor: "hover:bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-300/40",
    pillActive: "bg-sky-600 text-white shadow-xs border-sky-600",
    badge: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-300/60 dark:border-sky-800/80",
    border: "border-sky-200/80 dark:border-sky-900/50",
    hoverBorder: "hover:border-sky-400 dark:hover:border-sky-600",
    gradient: "from-sky-500/15 via-sky-500/5 to-transparent",
    avatarGradient: "from-sky-500/20 to-blue-600/10",
    avatarText: "text-sky-700 dark:text-sky-300 border-sky-300/60 dark:border-sky-700/60",
    glowDot: "bg-sky-500",
    iconBg: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    bgSoft: "bg-sky-500/[0.02] dark:bg-sky-950/10",
  },
  "2nd Year": {
    label: "2nd Year",
    sublabel: "Sophomores / 2nd Year Cohort",
    pillColor: "hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300/40",
    pillActive: "bg-emerald-600 text-white shadow-xs border-emerald-600",
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300/60 dark:border-emerald-800/80",
    border: "border-emerald-200/80 dark:border-emerald-900/50",
    hoverBorder: "hover:border-emerald-400 dark:hover:border-emerald-600",
    gradient: "from-emerald-500/15 via-emerald-500/5 to-transparent",
    avatarGradient: "from-emerald-500/20 to-teal-600/10",
    avatarText: "text-emerald-700 dark:text-emerald-300 border-emerald-300/60 dark:border-emerald-700/60",
    glowDot: "bg-emerald-500",
    iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    bgSoft: "bg-emerald-500/[0.02] dark:bg-emerald-950/10",
  },
  "3rd Year": {
    label: "3rd Year",
    sublabel: "Pre-Final / 3rd Year Cohort",
    pillColor: "hover:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300/40",
    pillActive: "bg-amber-600 text-white shadow-xs border-amber-600",
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300/60 dark:border-amber-800/80",
    border: "border-amber-200/80 dark:border-amber-900/50",
    hoverBorder: "hover:border-amber-400 dark:hover:border-amber-600",
    gradient: "from-amber-500/15 via-amber-500/5 to-transparent",
    avatarGradient: "from-amber-500/20 to-orange-600/10",
    avatarText: "text-amber-700 dark:text-amber-300 border-amber-300/60 dark:border-amber-700/60",
    glowDot: "bg-amber-500",
    iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    bgSoft: "bg-amber-500/[0.02] dark:bg-amber-950/10",
  },
  "4th Year": {
    label: "4th Year",
    sublabel: "Final Year / Graduating Cohort",
    pillColor: "hover:bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-300/40",
    pillActive: "bg-violet-600 text-white shadow-xs border-violet-600",
    badge: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-300/60 dark:border-violet-800/80",
    border: "border-violet-200/80 dark:border-violet-900/50",
    hoverBorder: "hover:border-violet-400 dark:hover:border-violet-600",
    gradient: "from-violet-500/15 via-violet-500/5 to-transparent",
    avatarGradient: "from-violet-500/20 to-purple-600/10",
    avatarText: "text-violet-700 dark:text-violet-300 border-violet-300/60 dark:border-violet-700/60",
    glowDot: "bg-violet-500",
    iconBg: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    bgSoft: "bg-violet-500/[0.02] dark:bg-violet-950/10",
  },
}

function getYearTheme(year: string): YearTheme {
  return YEAR_THEMES[year] || {
    label: year,
    sublabel: `${year} Cohort`,
    pillColor: "hover:bg-primary/10 text-primary border-primary/40",
    pillActive: "bg-primary text-primary-foreground shadow-xs border-primary",
    badge: "bg-primary/10 text-primary border-primary/30",
    border: "border-border",
    hoverBorder: "hover:border-primary/50",
    gradient: "from-primary/10 via-primary/5 to-transparent",
    avatarGradient: "from-primary/15 to-primary/5",
    avatarText: "text-primary border-primary/30",
    glowDot: "bg-primary",
    iconBg: "bg-primary/10 text-primary",
    bgSoft: "bg-muted/10",
  }
}

/* ---------- Helpers ---------- */
function computeDuration(start: string, end: string): string {
  const [sh, sm] = start.split(":").map(Number)
  const [eh, em] = end.split(":").map(Number)
  return `${eh * 60 + em - (sh * 60 + sm)} min`
}

const DEPT_COLORS = [
  { border: "border-sky-200/80 dark:border-sky-900/50", bg: "bg-sky-500/10", text: "text-sky-700 dark:text-sky-300", badge: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-200/70 dark:border-sky-800/60" },
  { border: "border-emerald-200/80 dark:border-emerald-900/50", bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-300", badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200/70 dark:border-emerald-800/60" },
  { border: "border-amber-200/80 dark:border-amber-900/50", bg: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-300", badge: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200/70 dark:border-amber-800/60" },
  { border: "border-violet-200/80 dark:border-violet-900/50", bg: "bg-violet-500/10", text: "text-violet-700 dark:text-violet-300", badge: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-200/70 dark:border-violet-800/60" },
  { border: "border-rose-200/80 dark:border-rose-900/50", bg: "bg-rose-500/10", text: "text-rose-700 dark:text-rose-300", badge: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200/70 dark:border-rose-800/60" },
]

const PERIOD_THEMES = [
  { border: "border-sky-300/80 dark:border-sky-800/60", bg: "bg-sky-500/8 dark:bg-sky-950/20", chip: "bg-sky-500/15 text-sky-700 dark:text-sky-300", text: "text-sky-700 dark:text-sky-300" },
  { border: "border-emerald-300/80 dark:border-emerald-800/60", bg: "bg-emerald-500/8 dark:bg-emerald-950/20", chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", text: "text-emerald-700 dark:text-emerald-300" },
  { border: "border-amber-300/80 dark:border-amber-800/60", bg: "bg-amber-500/8 dark:bg-amber-950/20", chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300", text: "text-amber-700 dark:text-amber-300" },
  { border: "border-violet-300/80 dark:border-violet-800/60", bg: "bg-violet-500/8 dark:bg-violet-950/20", chip: "bg-violet-500/15 text-violet-700 dark:text-violet-300", text: "text-violet-700 dark:text-violet-300" },
  { border: "border-rose-300/80 dark:border-rose-800/60", bg: "bg-rose-500/8 dark:bg-rose-950/20", chip: "bg-rose-500/15 text-rose-700 dark:text-rose-300", text: "text-rose-700 dark:text-rose-300" },
  { border: "border-cyan-300/80 dark:border-cyan-800/60", bg: "bg-cyan-500/8 dark:bg-cyan-950/20", chip: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300", text: "text-cyan-700 dark:text-cyan-300" },
]

function getDeptColor(index: number) {
  return DEPT_COLORS[index % DEPT_COLORS.length]
}

const TABS = ["departments", "classes", "subjects", "periods"] as const
type Tab = (typeof TABS)[number]

/* ---------- Component ---------- */
export default function AcademicStructurePage() {
  const queryClient = useQueryClient()
  const { data: structureData } = useAcademicStructure()

  const [activeTab, setActiveTab] = useState<Tab>("departments")
  const [departments, setDepartments] = useState<Department[]>([])
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [periods, setPeriods] = useState<Period[]>([])

  const [loadingDepts, setLoadingDepts] = useState(true)
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [loadingSubjects, setLoadingSubjects] = useState(true)
  const [loadingPeriods, setLoadingPeriods] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [deptDialog, setDeptDialog] = useState(false)
  const [classDialog, setClassDialog] = useState(false)
  const [subjectDialog, setSubjectDialog] = useState(false)
  const [periodDialog, setPeriodDialog] = useState(false)

  const [deptName, setDeptName] = useState("")
  const [deptCode, setDeptCode] = useState("")
  const [className, setClassName] = useState("")
  const [classSection, setClassSection] = useState("")
  const [classDept, setClassDept] = useState("")
  const [classYear, setClassYear] = useState("1st Year")
  const [subjName, setSubjName] = useState("")
  const [subjCode, setSubjCode] = useState("")
  const [subjDept, setSubjDept] = useState("")
  const [perStart, setPerStart] = useState("")
  const [perEnd, setPerEnd] = useState("")

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [yearFilterByDept, setYearFilterByDept] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!structureData) return
    setDepartments(structureData.departments)
    setClasses(structureData.classes)
    setSubjects(structureData.subjects)
    setPeriods(structureData.periods)
    setLoadingDepts(false)
    setLoadingClasses(false)
    setLoadingSubjects(false)
    setLoadingPeriods(false)
  }, [structureData])

  /* ---------- Hierarchical Classes Data Grouped by Dept -> Year -> Section ---------- */
  const classesHierarchy = useMemo(() => {
    const deptMap: Record<string, {
      deptCode: string
      deptName: string
      totalClasses: number
      years: Record<string, ClassItem[]>
    }> = {}

    // Initialize all departments from departments list
    for (const d of departments) {
      deptMap[d.name] = {
        deptCode: d.code,
        deptName: d.name,
        totalClasses: 0,
        years: {
          "1st Year": [],
          "2nd Year": [],
          "3rd Year": [],
          "4th Year": [],
        },
      }
    }

    // Populate classes
    for (const c of classes) {
      const deptName = c.departmentFull || "Unassigned"
      if (!deptMap[deptName]) {
        deptMap[deptName] = {
          deptCode: c.department || "—",
          deptName,
          totalClasses: 0,
          years: {
            "1st Year": [],
            "2nd Year": [],
            "3rd Year": [],
            "4th Year": [],
          },
        }
      }
      const yearKey = c.year || "1st Year"
      if (!deptMap[deptName].years[yearKey]) {
        deptMap[deptName].years[yearKey] = []
      }
      deptMap[deptName].years[yearKey].push(c)
      deptMap[deptName].totalClasses += 1
    }

    // Sort sections alphabetically within each year (A, B, C...)
    for (const deptKey of Object.keys(deptMap)) {
      for (const yKey of Object.keys(deptMap[deptKey].years)) {
        deptMap[deptKey].years[yKey].sort((a, b) => a.section.localeCompare(b.section))
      }
    }

    return Object.entries(deptMap).sort(([a], [b]) => a.localeCompare(b))
  }, [classes, departments])

  const subjectsByDept = useMemo(() => {
    const groups: Record<string, Subject[]> = {}
    for (const s of subjects) {
      const key = s.departmentFull || "Unassigned"
      if (!groups[key]) groups[key] = []
      groups[key].push(s)
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [subjects])

  function toggleGroup(key: string) {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function handleYearFilter(deptName: string, year: string) {
    setYearFilterByDept(prev => ({
      ...prev,
      [deptName]: year,
    }))
  }

  function openAddClassForCohort(deptCode: string, year: string) {
    setClassDept(deptCode)
    setClassYear(year)
    setClassName(deptCode)
    setClassSection("")
    setClassDialog(true)
  }

  /* ---------- Submit handlers ---------- */
  async function handleAddDept() {
    if (!deptName || !deptCode) { toast.error("Please fill all fields"); return }
    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("departments").insert({ name: deptName, code: deptCode })
      if (error) { toast.error(`Failed: ${error.message}`); return }
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await supabase.from("system_logs").insert({ performed_by: user.id, action_type: "create", description: `Department added: ${deptName}` })
      toast.success(`Department "${deptCode}" added`)
      setDeptDialog(false); setDeptName(""); setDeptCode("")
      queryClient.invalidateQueries({ queryKey: ["admin-academic-structure"] })
    } finally { setIsSubmitting(false) }
  }

  async function handleAddClass() {
    if (!className || !classSection || !classDept || !classYear) { toast.error("Please fill all fields"); return }
    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const selectedDept = departments.find(d => d.code === classDept)
      if (!selectedDept) { toast.error("Department not found"); return }
      const { error } = await supabase.from("classes").insert({ 
        name: className.toUpperCase(), 
        section: classSection.toUpperCase(), 
        department_id: selectedDept.id,
        year: classYear
      })
      if (error) { toast.error(`Failed: ${error.message}`); return }
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await supabase.from("system_logs").insert({ performed_by: user.id, action_type: "create", description: `Class added: ${className.toUpperCase()}-${classSection.toUpperCase()} · ${classYear} (${classDept})` })
      toast.success(`Class "${className.toUpperCase()}-${classSection.toUpperCase()} (${classYear})" added`)
      setClassDialog(false); setClassName(""); setClassSection(""); setClassDept(""); setClassYear("1st Year")
      queryClient.invalidateQueries({ queryKey: ["admin-academic-structure"] })
    } finally { setIsSubmitting(false) }
  }

  async function handleAddSubject() {
    if (!subjName || !subjCode || !subjDept) { toast.error("Please fill all fields"); return }
    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const selectedDept = departments.find(d => d.code === subjDept)
      if (!selectedDept) { toast.error("Department not found"); return }
      const { error } = await supabase.from("subjects").insert({ name: subjName, code: subjCode, department_id: selectedDept.id })
      if (error) { toast.error(`Failed: ${error.message}`); return }
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await supabase.from("system_logs").insert({ performed_by: user.id, action_type: "create", description: `Subject added: ${subjName}` })
      toast.success(`Subject "${subjName}" added`)
      setSubjectDialog(false); setSubjName(""); setSubjCode(""); setSubjDept("")
      queryClient.invalidateQueries({ queryKey: ["admin-academic-structure"] })
    } finally { setIsSubmitting(false) }
  }

  async function handleAddPeriod() {
    if (!perStart || !perEnd) { toast.error("Please fill all fields"); return }
    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const nextNum = periods.length + 1
      const { error } = await supabase.from("periods").insert({ period_number: nextNum, start_time: perStart, end_time: perEnd })
      if (error) { toast.error(`Failed: ${error.message}`); return }
      toast.success(`Period ${nextNum} added`)
      setPeriodDialog(false); setPerStart(""); setPerEnd("")
      queryClient.invalidateQueries({ queryKey: ["admin-academic-structure"] })
    } finally { setIsSubmitting(false) }
  }

  /* ---------- Tab config ---------- */
  const tabConfig = [
    {
      id: "departments" as Tab,
      label: "Departments",
      icon: Building2,
      count: departments.length,
      loading: loadingDepts,
      themeColor: "text-sky-600 dark:text-sky-400",
      activeBg: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-300/80 dark:border-sky-800",
      badgeActive: "bg-sky-600 text-white",
    },
    {
      id: "classes" as Tab,
      label: "Classes",
      icon: GraduationCap,
      count: classes.length,
      loading: loadingClasses,
      themeColor: "text-emerald-600 dark:text-emerald-400",
      activeBg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300/80 dark:border-emerald-800",
      badgeActive: "bg-emerald-600 text-white",
    },
    {
      id: "subjects" as Tab,
      label: "Subjects",
      icon: BookOpen,
      count: subjects.length,
      loading: loadingSubjects,
      themeColor: "text-amber-600 dark:text-amber-400",
      activeBg: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300/80 dark:border-amber-800",
      badgeActive: "bg-amber-600 text-white",
    },
    {
      id: "periods" as Tab,
      label: "Periods",
      icon: Clock,
      count: periods.length,
      loading: loadingPeriods,
      themeColor: "text-violet-600 dark:text-violet-400",
      activeBg: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-300/80 dark:border-violet-800",
      badgeActive: "bg-violet-600 text-white",
    },
  ]

  const statCards = [
    {
      label: "Departments",
      value: departments.length,
      icon: Building2,
      accent: "border-sky-200/80 bg-linear-to-b from-sky-500/5 via-card to-card hover:border-sky-300 dark:border-sky-900/50 dark:from-sky-950/20",
      iconColor: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
      tag: "Academic Units",
      tagColor: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
      trend: "Faculty departments",
    },
    {
      label: "Classes",
      value: classes.length,
      icon: GraduationCap,
      accent: "border-emerald-200/80 bg-linear-to-b from-emerald-500/5 via-card to-card hover:border-emerald-300 dark:border-emerald-900/50 dark:from-emerald-950/20",
      iconColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      tag: "Sections",
      tagColor: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      trend: "Active student cohorts",
    },
    {
      label: "Subjects",
      value: subjects.length,
      icon: BookOpen,
      accent: "border-amber-200/80 bg-linear-to-b from-amber-500/5 via-card to-card hover:border-amber-300 dark:border-amber-900/50 dark:from-amber-950/20",
      iconColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      tag: "Curriculum",
      tagColor: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
      trend: "Course catalogue",
    },
    {
      label: "Periods",
      value: periods.length,
      icon: Clock,
      accent: "border-violet-200/80 bg-linear-to-b from-violet-500/5 via-card to-card hover:border-violet-300 dark:border-violet-900/50 dark:from-violet-950/20",
      iconColor: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
      tag: "Schedule",
      tagColor: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
      trend: "Daily timetable slots",
    },
  ]

  const addActions: Record<Tab, () => void> = {
    departments: () => setDeptDialog(true),
    classes: () => setClassDialog(true),
    subjects: () => setSubjectDialog(true),
    periods: () => setPeriodDialog(true),
  }

  const addLabels: Record<Tab, string> = {
    departments: "Add Department",
    classes: "Add Class",
    subjects: "Add Subject",
    periods: "Add Period",
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Stat Cards (Tighter, Differentiated Layout) ── */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4 lg:gap-4">
        {statCards.map(s => (
          <div
            key={s.label}
            className={`group relative overflow-hidden rounded-xl border p-3.5 lg:p-4 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${s.accent}`}
          >
            <div className="flex items-center justify-between mb-2.5">
              <div className={`flex size-8.5 items-center justify-center rounded-lg ${s.iconColor}`}>
                <s.icon className="size-4.5" />
              </div>
              <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${s.tagColor}`}>
                {s.tag}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground leading-none">
                {s.value}
              </div>
              <div className="text-xs font-semibold text-foreground/80 mt-1">{s.label}</div>
              <div className="text-[11px] text-muted-foreground truncate">{s.trend}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Polished Tab Bar & Actions ── */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Segmented pill tabs with clear active state & comfortable height */}
          <div className="inline-flex flex-wrap items-center gap-1.5 rounded-xl bg-muted/60 p-1.5 border border-border/70 shadow-2xs">
            {tabConfig.map(tab => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 rounded-lg h-10 px-4 text-xs font-semibold transition-all duration-150 cursor-pointer select-none ${
                    isActive
                      ? "bg-card text-foreground shadow-2xs ring-1 ring-border"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeAcademicTabPill"
                      className="absolute inset-0 rounded-lg bg-card shadow-xs ring-1 ring-border/80"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    <tab.icon className={`size-4 ${isActive ? tab.themeColor : "text-muted-foreground"}`} />
                    <span>{tab.label}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold min-w-5 text-center transition-colors ${
                        isActive
                          ? tab.badgeActive
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {tab.loading ? "—" : tab.count}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>

          <Button
            onClick={addActions[activeTab]}
            size="sm"
            className="gap-2 rounded-xl h-11 px-4.5 font-semibold shadow-2xs hover:shadow transition-all self-start sm:self-auto cursor-pointer"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">{addLabels[activeTab]}</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>

        {/* ── Tab Content Area with Smooth Animation ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {/* ── Departments Tab ── */}
            {activeTab === "departments" && (
              <div className="flex flex-col gap-3">
                {loadingDepts ? (
                  <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map(i => (
                      <Card key={i} className="border-border">
                        <CardContent className="p-4.5 flex flex-col gap-3">
                          <Skeleton className="h-5 w-40" />
                          <Skeleton className="h-3 w-16" />
                          <div className="h-px bg-border my-1" />
                          <div className="flex gap-4">
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-4 w-16" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : departments.length === 0 ? (
                  <Card className="border-border">
                    <CardContent className="py-12 text-center text-sm text-muted-foreground">
                      No departments configured yet.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                    {departments.map((d, i) => {
                      const color = getDeptColor(i)
                      return (
                        <div
                          key={d.id}
                          className={`group relative overflow-hidden rounded-xl border ${color.border} bg-card p-4 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}
                        >
                          <div className="flex items-start justify-between gap-3 mb-3.5">
                            <div className="flex flex-col min-w-0">
                              <div className="text-base font-bold text-foreground leading-snug truncate">
                                {d.name}
                              </div>
                              <Badge
                                variant="outline"
                                className={`mt-1.5 w-fit text-xs font-mono font-bold tracking-wide ${color.badge}`}
                              >
                                {d.code}
                              </Badge>
                            </div>
                            <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl border ${color.bg} ${color.border}`}>
                              <Building2 className={`size-4.5 ${color.text}`} />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border/70">
                            <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-2 text-xs text-muted-foreground border border-border/40">
                              <GraduationCap className="size-3.5 text-primary shrink-0" />
                              <span className="truncate">
                                <span className="font-bold text-foreground">{d.classes}</span> Classes
                              </span>
                            </div>
                            <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-2 text-xs text-muted-foreground border border-border/40">
                              <BookOpen className="size-3.5 text-amber-500 shrink-0" />
                              <span className="truncate">
                                <span className="font-bold text-foreground">{d.subjects}</span> Subjects
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Classes Tab (Interactive Cohort Hub with Year Hierarchy) ── */}
            {activeTab === "classes" && (
              <div className="flex flex-col gap-4">
                {loadingClasses ? (
                  <div className="flex flex-col gap-4">
                    {[1, 2].map(i => (
                      <Card key={i} className="border-border p-5 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <Skeleton className="h-6 w-48 rounded-lg" />
                          <Skeleton className="h-5 w-20 rounded-full" />
                        </div>
                        <div className="flex gap-2">
                          <Skeleton className="h-8 w-24 rounded-lg" />
                          <Skeleton className="h-8 w-24 rounded-lg" />
                          <Skeleton className="h-8 w-24 rounded-lg" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <Skeleton className="h-28 rounded-xl" />
                          <Skeleton className="h-28 rounded-xl" />
                          <Skeleton className="h-28 rounded-xl" />
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : classesHierarchy.length === 0 ? (
                  <Card className="border-border">
                    <CardContent className="py-12 text-center text-sm text-muted-foreground">
                      No classes configured yet. Click &quot;Add Class&quot; to get started.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="flex flex-col gap-5">
                    {classesHierarchy.map(([deptName, deptData], gi) => {
                      const color = getDeptColor(gi)
                      const isCollapsed = collapsedGroups.has(deptName)
                      const selectedYear = yearFilterByDept[deptName] || "ALL"
                      
                      // Calculate active years count
                      const activeYearsCount = Object.values(deptData.years).filter(secs => secs.length > 0).length
                      
                      // Determine which years to display
                      const allYearKeys = Array.from(
                        new Set([...STANDARD_YEARS, ...Object.keys(deptData.years)])
                      )

                      const yearsToRender = selectedYear === "ALL" 
                        ? allYearKeys 
                        : allYearKeys.filter(y => y === selectedYear)

                      return (
                        <div
                          key={deptName}
                          className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs transition-all duration-200"
                        >
                          {/* ── Department Header Banner ── */}
                          <div
                            onClick={() => toggleGroup(deptName)}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/30 px-5 py-4 cursor-pointer hover:bg-muted/50 transition-colors border-b border-border/70"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl border ${color.bg} ${color.border}`}>
                                <Building2 className={`size-4.5 ${color.text}`} />
                              </div>
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-base font-bold text-foreground">
                                    {deptName}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md ${color.badge}`}
                                  >
                                    {deptData.deptCode}
                                  </Badge>
                                </div>
                                <span className="text-xs text-muted-foreground font-medium mt-0.5">
                                  {deptData.totalClasses} total class{deptData.totalClasses !== 1 ? "es" : ""} across {activeYearsCount} active year cohort{activeYearsCount !== 1 ? "s" : ""}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2.5 self-end sm:self-auto">
                              <Badge variant="secondary" className="text-xs font-semibold px-2.5 py-1">
                                {deptData.totalClasses} Class{deptData.totalClasses !== 1 ? "es" : ""}
                              </Badge>
                              <div className="flex size-7 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
                                {isCollapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
                              </div>
                            </div>
                          </div>

                          {/* ── Expanded Content: Interactive Cohort Workspace ── */}
                          {!isCollapsed && (
                            <div className="p-4 sm:p-5 flex flex-col gap-4 bg-muted/4">
                              {/* ── Year Filter Switcher Pills ── */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-border/60">
                                <div className="flex items-center gap-2">
                                  <Sparkles className="size-3.5 text-primary" />
                                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Cohort Switcher
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {/* All Years Pill */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleYearFilter(deptName, "ALL")
                                    }}
                                    className={`relative flex items-center gap-1.5 rounded-lg h-8 px-3 text-xs font-semibold transition-all cursor-pointer ${
                                      selectedYear === "ALL"
                                        ? "bg-foreground text-background shadow-xs font-bold"
                                        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50"
                                    }`}
                                  >
                                    <Layers className="size-3" />
                                    <span>All Years</span>
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                                      selectedYear === "ALL" ? "bg-background/20 text-background" : "bg-muted-foreground/15 text-foreground"
                                    }`}>
                                      {deptData.totalClasses}
                                    </span>
                                  </button>

                                  {/* Individual Year Pills */}
                                  {allYearKeys.map((yearKey) => {
                                    const yTheme = getYearTheme(yearKey)
                                    const count = deptData.years[yearKey]?.length || 0
                                    const isYearActive = selectedYear === yearKey

                                    return (
                                      <button
                                        key={yearKey}
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleYearFilter(deptName, yearKey)
                                        }}
                                        className={`flex items-center gap-1.5 rounded-lg h-8 px-3 text-xs font-semibold transition-all border cursor-pointer ${
                                          isYearActive
                                            ? yTheme.pillActive
                                            : `bg-card text-muted-foreground hover:text-foreground ${yTheme.pillColor}`
                                        }`}
                                      >
                                        <span className={`size-1.5 rounded-full ${isYearActive ? "bg-white" : yTheme.glowDot}`} />
                                        <span>{yearKey}</span>
                                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                                          isYearActive ? "bg-white/25 text-white" : "bg-muted text-muted-foreground"
                                        }`}>
                                          {count}
                                        </span>
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>

                              {/* ── Year Cohort Bands ── */}
                              <div className="flex flex-col gap-4">
                                {yearsToRender.map((yearKey) => {
                                  const yTheme = getYearTheme(yearKey)
                                  const sections = deptData.years[yearKey] || []

                                  return (
                                    <div
                                      key={yearKey}
                                      className={`relative overflow-hidden rounded-xl border ${yTheme.border} ${yTheme.bgSoft} p-3.5 sm:p-4 transition-all duration-150`}
                                    >
                                      {/* Year Cohort Header */}
                                      <div className="flex items-center justify-between gap-3 mb-3 pb-2.5 border-b border-border/50">
                                        <div className="flex items-center gap-2.5">
                                          <div className={`flex size-7 items-center justify-center rounded-lg ${yTheme.iconBg}`}>
                                            <GraduationCap className="size-4" />
                                          </div>
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-extrabold text-foreground tracking-tight">
                                              {yearKey}
                                            </span>
                                            <Badge
                                              variant="outline"
                                              className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${yTheme.badge}`}
                                            >
                                              {sections.length} Section{sections.length !== 1 ? "s" : ""}
                                            </Badge>
                                          </div>
                                        </div>

                                        {/* Quick Add Section in Header (only when sections already exist) */}
                                        {sections.length > 0 && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => openAddClassForCohort(deptData.deptCode, yearKey)}
                                            className={`h-7 px-2.5 text-xs font-semibold gap-1.5 rounded-lg cursor-pointer ${yTheme.badge} hover:opacity-90`}
                                          >
                                            <Plus className="size-3" />
                                            <span>Add Section</span>
                                          </Button>
                                        )}
                                      </div>

                                      {/* Sections Grid or Clean Empty State */}
                                      {sections.length > 0 ? (
                                        <div className="flex flex-wrap gap-2.5 sm:gap-3">
                                          {sections.map((c) => (
                                            <div
                                              key={c.id}
                                              className={`group relative flex items-center justify-between gap-3.5 rounded-xl border border-border/90 bg-card px-3 py-2.5 shadow-2xs ${yTheme.hoverBorder} hover:shadow-xs transition-all duration-150 w-full sm:w-auto sm:min-w-50 sm:max-w-60`}
                                            >
                                              {/* Section Emblem & Clean Identity */}
                                              <div className="flex items-center gap-2.5 min-w-0">
                                                <div className={`flex size-9 shrink-0 flex-col items-center justify-center rounded-lg border bg-linear-to-br ${yTheme.avatarGradient} ${yTheme.avatarText} shadow-2xs`}>
                                                  <span className="text-[7.5px] font-extrabold uppercase tracking-widest opacity-70 leading-none">SEC</span>
                                                  <span className="text-xs font-black leading-none mt-0.5">{c.section}</span>
                                                </div>
                                                <span className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                                                  {c.name}-{c.section}
                                                </span>
                                              </div>

                                              {/* Pulse Active Status Pill */}
                                              <span className="flex items-center gap-1.5 text-[10.5px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded-full shrink-0">
                                                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                Active
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        /* Clean, Non-Repetitive Empty State for Year without classes */
                                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-dashed border-border/80 bg-background/40 px-4 py-3 text-center sm:text-left">
                                          <div className="flex items-center gap-2.5">
                                            <div className="flex size-7.5 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                              <GraduationCap className="size-4" />
                                            </div>
                                            <div className="flex flex-col">
                                              <span className="text-xs font-bold text-foreground">
                                                No sections configured for {yearKey}
                                              </span>
                                              <span className="text-[11px] text-muted-foreground">
                                                Add sections (e.g. {deptData.deptCode}-A) to activate this cohort.
                                              </span>
                                            </div>
                                          </div>

                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => openAddClassForCohort(deptData.deptCode, yearKey)}
                                            className={`h-7.5 px-3 text-xs font-semibold gap-1.5 shrink-0 rounded-lg cursor-pointer ${yTheme.badge} hover:opacity-90`}
                                          >
                                            <Plus className="size-3.5" />
                                            <span>Add {yearKey} Section</span>
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Subjects Tab ── */}
            {activeTab === "subjects" && (
              <div className="flex flex-col gap-3.5">
                {loadingSubjects ? (
                  <div className="flex flex-col gap-3">
                    {[1, 2].map(i => (
                      <Card key={i} className="border-border">
                        <CardContent className="p-4.5 flex flex-col gap-3">
                          <Skeleton className="h-4 w-40" />
                          <div className="grid grid-cols-2 gap-3 mt-2">
                            <Skeleton className="h-12 rounded-xl" />
                            <Skeleton className="h-12 rounded-xl" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : subjects.length === 0 ? (
                  <Card className="border-border">
                    <CardContent className="py-12 text-center text-sm text-muted-foreground">
                      No subjects configured yet.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="flex flex-col gap-3.5">
                    {subjectsByDept.map(([dept, deptSubjects], gi) => {
                      const color = getDeptColor(gi)
                      const isCollapsed = collapsedGroups.has(`subj-${dept}`)
                      return (
                        <Card key={dept} className="overflow-hidden border-border shadow-2xs">
                          {/* Collapsible Department Header */}
                          <button
                            onClick={() => toggleGroup(`subj-${dept}`)}
                            className="flex w-full items-center justify-between bg-muted/30 px-5 py-3.5 text-left hover:bg-muted/50 transition-colors border-b border-border/70 cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className={`flex size-7.5 items-center justify-center rounded-lg border ${color.bg} ${color.border}`}>
                                <BookOpen className={`size-3.5 ${color.text}`} />
                              </div>
                              <span className="text-sm font-bold text-foreground">{dept}</span>
                              <Badge variant="secondary" className="text-xs font-semibold px-2 py-0.5">
                                {deptSubjects.length} subject{deptSubjects.length !== 1 ? "s" : ""}
                              </Badge>
                            </div>
                            {isCollapsed ? (
                              <ChevronRight className="size-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="size-4 text-muted-foreground" />
                            )}
                          </button>

                          {/* Distinct Individual Subject Cards */}
                          {!isCollapsed && (
                            <div className="p-4 bg-muted/10">
                              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {deptSubjects.map((s) => (
                                  <div
                                    key={s.id}
                                    className="group relative flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3.5 shadow-2xs hover:border-amber-500/40 hover:shadow-sm transition-all duration-150"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20">
                                        <BookOpen className="size-4" />
                                      </div>
                                      <div className="flex flex-col min-w-0">
                                        <span className="font-bold text-sm text-foreground truncate">
                                          {s.name}
                                        </span>
                                        <span className="text-xs text-muted-foreground truncate">
                                          {dept}
                                        </span>
                                      </div>
                                    </div>
                                    <Badge
                                      variant="outline"
                                      className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-300/70 dark:border-amber-800/60 shrink-0"
                                    >
                                      {s.code}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </Card>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Periods Tab (Elevated Timeline Cards & Clean Reference) ── */}
            {activeTab === "periods" && (
              <div className="flex flex-col gap-5">
                {loadingPeriods ? (
                  <div className="flex gap-3.5 overflow-x-auto pb-2">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="shrink-0 h-32 w-44 rounded-xl border border-border p-4 flex flex-col justify-between bg-card shadow-2xs">
                        <div className="flex justify-between items-center">
                          <Skeleton className="h-3 w-12" />
                          <Skeleton className="h-4 w-6 rounded-full" />
                        </div>
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    ))}
                  </div>
                ) : periods.length === 0 ? (
                  <Card className="border-border">
                    <CardContent className="py-12 text-center text-sm text-muted-foreground">
                      No periods configured yet.
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {/* Elevated Horizontal Timeline Cards */}
                    <div className="flex flex-col gap-2">
                      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1 flex items-center gap-2">
                        <Clock className="size-3.5 text-violet-600" />
                        <span>Daily Period Sequence</span>
                      </div>
                      <div className="flex gap-3.5 overflow-x-auto pb-3 pt-1">
                        {periods.map((p, i) => {
                          const theme = PERIOD_THEMES[i % PERIOD_THEMES.length]
                          return (
                            <div
                              key={p.id}
                              className={`group shrink-0 rounded-xl border p-4 w-44 flex flex-col justify-between gap-3 transition-all duration-200 hover:-translate-y-1 hover:shadow-md shadow-2xs ${theme.bg} ${theme.border}`}
                            >
                              <div className="flex items-center justify-between">
                                <span className={`text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border shadow-2xs ${theme.chip}`}>
                                  Slot {p.number}
                                </span>
                                <Clock className={`size-4 opacity-70 ${theme.text}`} />
                              </div>

                              <div className="flex flex-col gap-0.5">
                                <div className="text-base font-extrabold font-mono text-foreground leading-tight">
                                  {p.start}
                                </div>
                                <div className="text-[11px] text-muted-foreground font-medium">to</div>
                                <div className="text-base font-extrabold font-mono text-foreground leading-tight">
                                  {p.end}
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
                                <span className="text-[11px] text-muted-foreground">Duration</span>
                                <span className={`font-bold font-mono ${theme.text}`}>
                                  {p.duration}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Clean Complementary Reference Schedule */}
                    <Card className="border-border shadow-2xs overflow-hidden">
                      <div className="border-b border-border/60 bg-muted/20 px-5 py-3 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                          Slot Schedule Reference Table
                        </span>
                        <Badge variant="outline" className="text-[11px] font-medium text-muted-foreground">
                          {periods.length} Total Slots
                        </Badge>
                      </div>
                      <CardContent className="p-0">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border/50 text-left bg-muted/10">
                              <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Period</th>
                              <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Start Time</th>
                              <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">End Time</th>
                              <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground text-right">Duration</th>
                            </tr>
                          </thead>
                          <tbody>
                            {periods.map((p, i) => {
                              const theme = PERIOD_THEMES[i % PERIOD_THEMES.length]
                              return (
                                <tr key={p.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                                  <td className="px-5 py-3">
                                    <div className="flex items-center gap-2.5">
                                      <div className={`size-6 rounded-full flex items-center justify-center text-[10px] font-bold border shadow-2xs ${theme.chip}`}>
                                        {p.number}
                                      </div>
                                      <span className="text-xs font-bold text-foreground">Period {p.number}</span>
                                    </div>
                                  </td>
                                  <td className="px-5 py-3 font-mono text-xs font-semibold text-foreground">{p.start}</td>
                                  <td className="px-5 py-3 font-mono text-xs font-semibold text-foreground">{p.end}</td>
                                  <td className="px-5 py-3 text-right">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-mono text-xs font-bold ${theme.chip}`}>
                                      {p.duration}
                                    </span>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Add Department Dialog ── */}
      <Dialog open={deptDialog} onOpenChange={setDeptDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Department</DialogTitle>
            <DialogDescription>Create a new academic department.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="dept-name" className="flex items-center gap-1.5 text-sm font-medium">
                <Building2 className="size-3.5 text-muted-foreground" /> Department Name
              </Label>
              <Input id="dept-name" placeholder="e.g. Mechanical Engineering" value={deptName} onChange={e => setDeptName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="dept-code" className="flex items-center gap-1.5 text-sm font-medium">
                <Hash className="size-3.5 text-muted-foreground" /> Code
              </Label>
              <Input id="dept-code" placeholder="e.g. MECH" value={deptCode} onChange={e => setDeptCode(e.target.value)} />
            </div>
            {deptName && deptCode && (
              <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-3 flex items-center gap-2">
                <Building2 className="size-4 text-primary shrink-0" />
                <span className="text-xs text-primary font-medium">{deptName} <span className="font-mono">({deptCode})</span></span>
              </div>
            )}
            <Button onClick={handleAddDept} disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="size-4 animate-spin" />Adding...</> : "Add Department"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Add Class Dialog ── */}
      <Dialog open={classDialog} onOpenChange={setClassDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Class</DialogTitle>
            <DialogDescription>Create a new class and section.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-2">
            <div className="flex flex-col gap-2">
              <Label className="flex items-center gap-1.5 text-sm font-medium"><GraduationCap className="size-3.5 text-muted-foreground" /> Class Name</Label>
              <Input placeholder="e.g. CSE" value={className} onChange={e => setClassName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="flex items-center gap-1.5 text-sm font-medium"><Hash className="size-3.5 text-muted-foreground" /> Section</Label>
              <Input placeholder="e.g. A" value={classSection} onChange={e => setClassSection(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="flex items-center gap-1.5 text-sm font-medium"><Building2 className="size-3.5 text-muted-foreground" /> Department</Label>
              <Select value={classDept} onValueChange={setClassDept}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.code}>{d.name} ({d.code})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label className="flex items-center gap-1.5 text-sm font-medium"><CalendarDays className="size-3.5 text-muted-foreground" /> Academic Year</Label>
              <Select value={classYear} onValueChange={setClassYear}>
                <SelectTrigger><SelectValue placeholder="Select academic year" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1st Year">1st Year</SelectItem>
                  <SelectItem value="2nd Year">2nd Year</SelectItem>
                  <SelectItem value="3rd Year">3rd Year</SelectItem>
                  <SelectItem value="4th Year">4th Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {className && classSection && classYear && (
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 px-4 py-3 flex items-center gap-2">
                <GraduationCap className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">Will be created as <span className="font-bold">{className.toUpperCase()}-{classSection.toUpperCase()} · {classYear}</span></span>
              </div>
            )}
            <Button onClick={handleAddClass} disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="size-4 animate-spin" />Adding...</> : "Add Class"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Add Subject Dialog ── */}
      <Dialog open={subjectDialog} onOpenChange={setSubjectDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Subject</DialogTitle>
            <DialogDescription>Create a new subject for a department.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-2">
            <div className="flex flex-col gap-2">
              <Label className="flex items-center gap-1.5 text-sm font-medium"><BookOpen className="size-3.5 text-muted-foreground" /> Subject Name</Label>
              <Input placeholder="e.g. Compiler Design" value={subjName} onChange={e => setSubjName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="flex items-center gap-1.5 text-sm font-medium"><Hash className="size-3.5 text-muted-foreground" /> Subject Code</Label>
              <Input placeholder="e.g. CD" value={subjCode} onChange={e => setSubjCode(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="flex items-center gap-1.5 text-sm font-medium"><Building2 className="size-3.5 text-muted-foreground" /> Department</Label>
              <Select value={subjDept} onValueChange={setSubjDept}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.code}>{d.name} ({d.code})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddSubject} disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="size-4 animate-spin" />Adding...</> : "Add Subject"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Add Period Dialog ── */}
      <Dialog open={periodDialog} onOpenChange={setPeriodDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Period {periods.length + 1}</DialogTitle>
            <DialogDescription>Configure start and end time for this period slot.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-2">
            <div className="flex flex-col gap-2">
              <Label className="flex items-center gap-1.5 text-sm font-medium"><Clock className="size-3.5 text-muted-foreground" /> Start Time</Label>
              <Input type="time" value={perStart} onChange={e => setPerStart(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="flex items-center gap-1.5 text-sm font-medium"><Clock className="size-3.5 text-muted-foreground" /> End Time</Label>
              <Input type="time" value={perEnd} onChange={e => setPerEnd(e.target.value)} />
            </div>
            {perStart && perEnd && (
              <div className="rounded-lg bg-violet-50 border border-violet-200 px-4 py-3 flex items-center gap-2">
                <Clock className="size-4 text-violet-600 shrink-0" />
                <span className="text-xs text-violet-700 font-medium">Period {periods.length + 1}: {perStart} → {perEnd} ({computeDuration(perStart, perEnd)})</span>
              </div>
            )}
            <Button onClick={handleAddPeriod} disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="size-4 animate-spin" />Adding...</> : "Add Period"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}