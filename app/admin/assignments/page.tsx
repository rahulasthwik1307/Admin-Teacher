"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
  Link2,
  Users,
  BookOpen,
  GraduationCap,
  Building2,
  ChevronDown,
  ChevronRight,
  X,
  CalendarDays,
  AlertTriangle,
  Pencil,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

/* ---------- Constants ---------- */
const YEAR_OPTIONS = ["1st Year", "2nd Year", "3rd Year", "4th Year"]

/* ---------- Interfaces ---------- */
interface Assignment {
  id: string
  teacher: string
  teacherId: string
  subject: string
  classSection: string
  classSectionOnly: string
  department: string
  year: string | null
  date: string
}

interface TeacherOption { id: string; name: string }
interface SubjectOption { id: string; name: string; code?: string; deptCode: string }
interface ClassOption { id: string; label: string; fullLabel: string; name: string; section: string; year: string; classSection: string; deptCode: string }
interface DeptOption { code: string; name: string }

/* ---------- Helpers ---------- */
function getInitials(name: string): string {
  return name.split(" ").filter(w => w[0] && w[0] === w[0].toUpperCase()).map(w => w[0]).join("").slice(0, 2) || "NA"
}

const AVATAR_COLORS = [
  "bg-primary/15 text-primary",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  "bg-sky-500/15 text-sky-700 dark:text-sky-300",
]

const RING_COLORS = [
  { stroke: "#3b82f6", bg: "bg-primary/10", text: "text-primary", badge: "bg-primary/10 text-primary border-primary/20" },
  { stroke: "#10b981", bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-300", badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20" },
  { stroke: "#f59e0b", bg: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-300", badge: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20" },
  { stroke: "#8b5cf6", bg: "bg-violet-500/10", text: "text-violet-700 dark:text-violet-300", badge: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20" },
  { stroke: "#f43f5e", bg: "bg-rose-500/10", text: "text-rose-700 dark:text-rose-300", badge: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20" },
  { stroke: "#0ea5e9", bg: "bg-sky-500/10", text: "text-sky-700 dark:text-sky-300", badge: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20" },
]

function getAvatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
}

function getRingColor(index: number) {
  return RING_COLORS[index % RING_COLORS.length]
}

/* ---------- Ring Component ---------- */
function AssignmentRing({ count, total, color, size = 72 }: { count: number; total: number; color: string; size?: number }) {
  const pct = total > 0 ? count / total : 0
  const strokeWidth = 6.5
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - pct * circumference

  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }} className="shrink-0 drop-shadow-2xs">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-muted/40" />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
    </svg>
  )
}

/* ---------- Component ---------- */
export default function TeacherAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [totalSubjectsInSystem, setTotalSubjectsInSystem] = useState(0)

  const [teacherOptions, setTeacherOptions] = useState<TeacherOption[]>([])
  const [subjectOptions, setSubjectOptions] = useState<SubjectOption[]>([])
  const [classOptions, setClassOptions] = useState<ClassOption[]>([])
  const [deptOptions, setDeptOptions] = useState<DeptOption[]>([])

  const [filterClass, setFilterClass] = useState("all")
  const [filterDept, setFilterDept] = useState("all")
  const [filterTeacher, setFilterTeacher] = useState("all")
  const [filterYear, setFilterYear] = useState("all")

  const [sheetOpen, setSheetOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<Assignment | null>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  const [formTeacherId, setFormTeacherId] = useState("")
  const [formSubjectId, setFormSubjectId] = useState("")
  const [formClassId, setFormClassId] = useState("")
  const [formDeptCode, setFormDeptCode] = useState("")
  const [formYear, setFormYear] = useState("")

  const [editTarget, setEditTarget] = useState<Assignment | null>(null)
  const [editYear, setEditYear] = useState("")
  const [editSheetOpen, setEditSheetOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  /* ---------- Fetch ---------- */
  const fetchDropdownData = useCallback(async () => {
    const supabase = createClient()
    const [teachersRes, subjectsRes, classesRes] = await Promise.all([
      supabase.from("teachers").select("id, user:users ( full_name )").eq("is_active", true),
      supabase.from("subjects").select("id, name, code, department:departments ( code )").order("name"),
      supabase.from("classes").select("id, name, section, year, department:departments ( code, name )").order("name"),
    ])
    if (teachersRes.data) setTeacherOptions(teachersRes.data.map((t: any) => ({ id: t.id, name: t.user?.full_name ?? "Unknown" })))
    if (subjectsRes.data) {
      setSubjectOptions(subjectsRes.data.map((s: any) => ({
        id: s.id,
        name: s.name,
        code: s.code ?? "",
        deptCode: s.department?.code ?? "",
      })))
      setTotalSubjectsInSystem(subjectsRes.data.length)
    }
    if (classesRes.data) {
      setClassOptions(classesRes.data.map((c: any) => ({
        id: c.id,
        label: `${c.name}-${c.section}`,
        fullLabel: `${c.name}-${c.section} · ${c.year}`,
        name: c.name,
        section: c.section,
        year: c.year,
        classSection: `${c.name}-${c.section}`,
        deptCode: c.department?.code ?? "",
      })))
      const deptMap = new Map<string, string>()
      for (const c of classesRes.data as any[]) { if (c.department?.code) deptMap.set(c.department.code, c.department.name) }
      setDeptOptions(Array.from(deptMap.entries()).map(([code, name]) => ({ code, name })))
    }
  }, [])

  const fetchAssignments = useCallback(async () => {
    setIsLoading(true); setFetchError(null)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("teacher_assignments")
        .select(`id, assigned_at, year, teacher:teachers ( id, user:users ( full_name ) ), subject:subjects ( name ), class:classes ( name, section, year, department:departments ( code ) )`)
        .order("assigned_at", { ascending: false })
      if (error) { setFetchError("Failed to load assignments."); return }
      setAssignments((data || []).map((a: any) => ({
        id: a.id,
        teacher: a.teacher?.user?.full_name ?? "Unknown",
        teacherId: a.teacher?.id ?? "",
        subject: a.subject?.name ?? "—",
        classSection: a.class ? `${a.class.name}-${a.class.section} · ${a.class.year}` : "—",
        classSectionOnly: a.class ? `${a.class.name}-${a.class.section}` : "—",
        department: a.class?.department?.code ?? "—",
        year: a.year ?? a.class?.year ?? null,
        date: a.assigned_at ? new Date(a.assigned_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—",
      })))
    } catch { setFetchError("An unexpected error occurred.") }
    finally { setIsLoading(false) }
  }, [])

  useEffect(() => {
    const init = async () => {
      await Promise.resolve()
      fetchDropdownData()
      fetchAssignments()
    }
    init()
  }, [fetchDropdownData, fetchAssignments])

  const availableClassFilterOptions = useMemo(() => {
    let list = classOptions
    if (filterDept !== "all") {
      list = list.filter(c => c.deptCode === filterDept)
    }
    if (filterYear !== "all") {
      list = list.filter(c => c.year === filterYear)
    }
    const unique = Array.from(new Set(list.map(c => c.classSection).filter(Boolean)))
    return unique.sort()
  }, [classOptions, filterDept, filterYear])

  useEffect(() => {
    if (filterClass !== "all" && !availableClassFilterOptions.includes(filterClass)) {
      setFilterClass("all")
    }
  }, [availableClassFilterOptions, filterClass])

  /* ---------- Filtered & grouped ---------- */
  const filtered = useMemo(() => assignments.filter(a => {
    if (filterClass !== "all" && a.classSectionOnly !== filterClass) return false
    if (filterDept !== "all" && a.department !== filterDept) return false
    if (filterTeacher !== "all" && a.teacher !== filterTeacher) return false
    if (filterYear !== "all" && a.year !== filterYear) return false
    return true
  }), [assignments, filterClass, filterDept, filterTeacher, filterYear])

  const groupedByClass = useMemo(() => {
    const groups: Record<string, Assignment[]> = {}
    for (const a of filtered) {
      if (!groups[a.classSection]) groups[a.classSection] = []
      groups[a.classSection].push(a)
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  /* ---------- Legacy Assignments Count ---------- */
  const legacyAssignmentsCount = useMemo(() => assignments.filter(a => !a.year).length, [assignments])

  /* ---------- Assignment Overview per teacher ---------- */
  const teacherOverview = useMemo(() => {
    const map: Record<string, { name: string; subjects: string[]; count: number }> = {}
    for (const a of assignments) {
      if (!map[a.teacher]) map[a.teacher] = { name: a.teacher, subjects: [], count: 0 }
      if (!map[a.teacher].subjects.includes(a.subject)) {
        map[a.teacher].subjects.push(a.subject)
        map[a.teacher].count++
      }
    }
    for (const t of teacherOptions) {
      if (!map[t.name]) map[t.name] = { name: t.name, subjects: [], count: 0 }
    }
    return Object.values(map).sort((a, b) => b.count - a.count)
  }, [assignments, teacherOptions])

  function toggleGroup(key: string) {
    setCollapsedGroups(prev => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next })
  }

  function handleSubjectChange(subjectId: string) {
    setFormSubjectId(subjectId)
    const found = subjectOptions.find(s => s.id === subjectId)
    setFormDeptCode(found?.deptCode ?? "")
  }

  const formAvailableClasses = useMemo(() => {
    if (!formYear) return []
    return classOptions.filter(c => c.year === formYear)
  }, [classOptions, formYear])

  /* ---------- Stat cards ---------- */
  const teachersWithAssignments = new Set(assignments.map(a => a.teacher)).size
  const subjectsCovered = new Set(assignments.map(a => a.subject)).size
  const classesCovered = new Set(assignments.map(a => a.classSection)).size

  const statCards = [
    {
      label: "Total Assignments",
      value: assignments.length,
      icon: Link2,
      accent: "border-sky-200/80 bg-linear-to-b from-sky-500/5 via-card to-card hover:border-sky-300 dark:border-sky-900/50 dark:from-sky-950/20",
      iconColor: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
      tag: "Coverage",
      tagColor: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
      trend: "Teacher-course pairings",
    },
    {
      label: "Teachers Assigned",
      value: teachersWithAssignments,
      icon: Users,
      accent: "border-emerald-200/80 bg-linear-to-b from-emerald-500/5 via-card to-card hover:border-emerald-300 dark:border-emerald-900/50 dark:from-emerald-950/20",
      iconColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      tag: "Faculty",
      tagColor: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      trend: "Active teaching staff",
    },
    {
      label: "Subjects Covered",
      value: subjectsCovered,
      icon: BookOpen,
      accent: "border-amber-200/80 bg-linear-to-b from-amber-500/5 via-card to-card hover:border-amber-300 dark:border-amber-900/50 dark:from-amber-950/20",
      iconColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      tag: "Curriculum",
      tagColor: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
      trend: "Assigned course titles",
    },
    {
      label: "Classes Covered",
      value: classesCovered,
      icon: GraduationCap,
      accent: "border-violet-200/80 bg-linear-to-b from-violet-500/5 via-card to-card hover:border-violet-300 dark:border-violet-900/50 dark:from-violet-950/20",
      iconColor: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
      tag: "Cohorts",
      tagColor: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
      trend: "Class & section groups",
    },
  ]

  const uniqueClasses = Array.from(new Set(assignments.map(a => a.classSection))).filter(c => c !== "—")
  const uniqueTeachers = Array.from(new Set(assignments.map(a => a.teacher)))

  /* ---------- Handlers ---------- */
  async function handleAssign() {
    if (!formTeacherId || !formSubjectId || !formClassId || !formYear) {
      toast.error("Please fill all required fields including Academic Year")
      return
    }
    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("teacher_assignments").insert({
        teacher_id: formTeacherId,
        subject_id: formSubjectId,
        class_id: formClassId,
        year: formYear,
      })
      if (error) {
        if (error.code === "23505") {
          toast.error("This faculty member is already assigned to this subject, class section, and academic year.")
        } else {
          toast.error(`Failed: ${error.message}`)
        }
        return
      }
      const { data: { user } } = await supabase.auth.getUser()
      const teacherName = teacherOptions.find(t => t.id === formTeacherId)?.name ?? ""
      const subjectName = subjectOptions.find(s => s.id === formSubjectId)?.name ?? ""
      const className = classOptions.find(c => c.id === formClassId)?.label ?? ""
      if (user) {
        await supabase.from("system_logs").insert({
          performed_by: user.id,
          action_type: "assign",
          description: `Teacher ${teacherName} assigned to ${subjectName} — ${className} (${formYear})`,
        })
      }
      toast.success(`${teacherName} assigned to ${subjectName} — ${className} (${formYear})`)
      setSheetOpen(false)
      setFormTeacherId("")
      setFormSubjectId("")
      setFormClassId("")
      setFormDeptCode("")
      setFormYear("")
      fetchAssignments()
    } catch { toast.error("An unexpected error occurred.") }
    finally { setIsSubmitting(false) }
  }

  async function handleUpdateYear() {
    if (!editTarget || !editYear) {
      toast.error("Please select an academic year")
      return
    }
    setIsEditing(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("teacher_assignments")
        .update({ year: editYear })
        .eq("id", editTarget.id)

      if (error) {
        if (error.code === "23505") {
          toast.error("An assignment for this teacher, subject, class, and year already exists.")
        } else {
          toast.error(`Failed to update year: ${error.message}`)
        }
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from("system_logs").insert({
          performed_by: user.id,
          action_type: "update",
          description: `Updated academic year to ${editYear} for assignment: ${editTarget.teacher} — ${editTarget.subject} (${editTarget.classSection})`,
        })
      }
      toast.success(`Updated academic year to ${editYear}`)
      setEditSheetOpen(false)
      setEditTarget(null)
      setEditYear("")
      fetchAssignments()
    } catch {
      toast.error("An unexpected error occurred.")
    } finally {
      setIsEditing(false)
    }
  }

  const [affectedSlots, setAffectedSlots] = useState<{ day: string; period: number; subject: string; classLabel: string }[]>([])
  const [loadingPreview, setLoadingPreview] = useState(false)

  async function openRemoveDialog(assignment: Assignment) {
    setRemoveTarget(assignment)
    setLoadingPreview(true)
    setAffectedSlots([])
    try {
      const res = await fetch(`/api/admin/teacher-assignments/${assignment.id}`)
      const result = await res.json()
      if (res.ok) setAffectedSlots(result.slots ?? [])
    } catch {
      // Non-fatal — dialog still works without the preview
    } finally {
      setLoadingPreview(false)
    }
  }

  async function handleRemove() {
    if (!removeTarget) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/admin/teacher-assignments/${removeTarget.id}`, { method: "DELETE" })
      const result = await res.json()
      if (!res.ok) { toast.error(result.error || "Failed to remove assignment"); return }
      if (result.affectedSlots > 0) {
        toast.success(`Assignment removed. ${result.affectedSlots} timetable slot(s) marked Unassigned.`)
      } else {
        toast.success("Assignment removed")
      }
      fetchAssignments()
    } catch { toast.error("An unexpected error occurred.") }
    finally { setRemoveTarget(null); setAffectedSlots([]); setIsSubmitting(false) }
  }

  /* ---------- Preview card ---------- */
  const selectedFormClass = classOptions.find(c => c.id === formClassId)
  const previewTeacher = teacherOptions.find(t => t.id === formTeacherId)?.name
  const previewSubject = subjectOptions.find(s => s.id === formSubjectId)?.name
  const previewClass = selectedFormClass?.classSection
  const showPreview = previewTeacher && previewSubject && previewClass && formYear

  return (
    <div className="flex flex-col gap-6">
      {/* ── Stat Cards (Tighter, Differentiated Layout) ── */}
      {!isLoading && (
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
      )}

      {/* ── Filter Bar + Add Button ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2.5">
          <Select value={filterClass} onValueChange={setFilterClass}>
            <SelectTrigger className="w-38 h-10 rounded-xl border-border bg-card shadow-2xs hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/20 transition-all text-xs font-semibold">
              <div className="flex items-center gap-2 overflow-hidden w-full">
                <GraduationCap className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate flex-1 text-left">
                  <SelectValue placeholder="All Classes" />
                </span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {availableClassFilterOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filterDept} onValueChange={setFilterDept}>
            <SelectTrigger className="w-52 h-10 rounded-xl border-border bg-card shadow-2xs hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/20 transition-all text-xs font-semibold">
              <div className="flex items-center gap-2 overflow-hidden w-full">
                <Building2 className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate flex-1 text-left">
                  <SelectValue placeholder="All Departments" />
                </span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {deptOptions.map(d => <SelectItem key={d.code} value={d.code}>{d.code}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filterTeacher} onValueChange={setFilterTeacher}>
            <SelectTrigger className="w-44 h-10 rounded-xl border-border bg-card shadow-2xs hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/20 transition-all text-xs font-semibold">
              <div className="flex items-center gap-2 overflow-hidden w-full">
                <Users className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate flex-1 text-left">
                  <SelectValue placeholder="All Teachers" />
                </span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teachers</SelectItem>
              {uniqueTeachers.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger className="w-38 h-10 rounded-xl border-border bg-card shadow-2xs hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/20 transition-all text-xs font-semibold">
              <div className="flex items-center gap-2 overflow-hidden w-full">
                <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate flex-1 text-left">
                  <SelectValue placeholder="All Years" />
                </span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {YEAR_OPTIONS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>

          {(filterClass !== "all" || filterDept !== "all" || filterTeacher !== "all" || filterYear !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              className="h-10 px-3 rounded-xl border border-border/70 bg-muted/40 hover:bg-muted font-semibold text-xs text-muted-foreground hover:text-foreground cursor-pointer gap-1.5"
              onClick={() => { setFilterClass("all"); setFilterDept("all"); setFilterTeacher("all"); setFilterYear("all") }}
            >
              <X className="size-3.5" /> Clear
            </Button>
          )}
        </div>

        <Button
          onClick={() => setSheetOpen(true)}
          className="gap-2 rounded-xl h-10 px-4.5 font-semibold shadow-xs hover:shadow transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="size-4" /> Add Assignment
        </Button>
      </div>

      {/* ── Legacy Warning Alert Banner ── */}
      {!isLoading && !fetchError && legacyAssignmentsCount > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-300/80 bg-linear-to-r from-amber-500/15 via-amber-500/10 to-amber-500/5 p-3.5 text-xs text-amber-900 dark:text-amber-200 dark:border-amber-800/70 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold">
              <AlertTriangle className="size-4" />
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="font-bold text-amber-950 dark:text-amber-100">
                {legacyAssignmentsCount} Legacy Assignment{legacyAssignmentsCount !== 1 ? "s" : ""} Require Academic Year
              </span>
              <span className="text-amber-800/90 dark:text-amber-300/90 text-[11px] truncate">
                Assignments created without an Academic Year are hidden from teacher views until updated. Click &quot;Edit Year&quot; on any record to assign it.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {fetchError && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-8 text-center">
            <p className="text-sm font-semibold text-destructive">{fetchError}</p>
            <Button variant="outline" size="sm" className="mt-3 rounded-xl" onClick={fetchAssignments}>Retry</Button>
          </CardContent>
        </Card>
      )}

      {/* ── Assignments Grouped by Class — Desktop ── */}
      {!isLoading && !fetchError && (
        <div className="flex flex-col gap-3.5">
          {groupedByClass.length === 0 ? (
            <Card className="border-border shadow-2xs">
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                {assignments.length === 0 ? "No assignments yet. Click \"Add Assignment\" to create one." : "No assignments match the selected filters."}
              </CardContent>
            </Card>
          ) : (
            groupedByClass.map(([classSection, classAssignments]) => {
              const isCollapsed = collapsedGroups.has(classSection)
              return (
                <Card key={classSection} className="overflow-hidden border-border shadow-2xs">
                  <button
                    onClick={() => toggleGroup(classSection)}
                    className="flex w-full items-center justify-between bg-muted/30 px-5 py-3.5 text-left hover:bg-muted/50 transition-colors border-b border-border/70 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-7.5 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                        <GraduationCap className="size-3.5" />
                      </div>
                      <span className="text-sm font-bold text-foreground">{classSection}</span>
                      <Badge variant="secondary" className="text-xs font-semibold px-2 py-0.5">
                        {classAssignments.length} assignment{classAssignments.length !== 1 ? "s" : ""}
                      </Badge>
                      <Badge variant="outline" className="text-xs font-mono font-semibold px-2 py-0.5 text-muted-foreground">
                        {classAssignments[0]?.department}
                      </Badge>
                    </div>
                    {isCollapsed ? <ChevronRight className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
                  </button>

                  {!isCollapsed && (
                    <>
                      {/* Desktop Table View */}
                      <div className="hidden md:block">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left bg-muted/10 border-b border-border/60">
                              <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Teacher</th>
                              <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Subject</th>
                              <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Department</th>
                              <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Academic Year</th>
                              <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Assigned Date</th>
                              <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {classAssignments.map(a => (
                              <tr key={a.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                                <td className="px-5 py-3">
                                  <div className="flex items-center gap-2.5">
                                    <Avatar className="size-7.5 ring-1 ring-border">
                                      <AvatarFallback className={`text-[11px] font-bold ${getAvatarColor(a.teacher)}`}>
                                        {getInitials(a.teacher)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs font-bold text-foreground">{a.teacher}</span>
                                  </div>
                                </td>
                                <td className="px-5 py-3">
                                  <div className="flex items-center gap-2">
                                    <BookOpen className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                                    <span className="text-xs font-semibold text-foreground">{a.subject}</span>
                                  </div>
                                </td>
                                <td className="px-5 py-3">
                                  <span className="font-mono text-xs font-semibold rounded-md border border-border/70 bg-muted/40 px-2 py-0.5 text-muted-foreground">
                                    {a.department}
                                  </span>
                                </td>
                                <td className="px-5 py-3">
                                  {a.year ? (
                                    <Badge variant="outline" className="text-xs font-semibold px-2 py-0.5 border-primary/30 text-primary bg-primary/5">
                                      {a.year}
                                    </Badge>
                                  ) : (
                                    <Badge variant="destructive" className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-xs font-semibold px-2 py-0.5 gap-1 inline-flex items-center">
                                      <AlertTriangle className="size-3" /> Year not set — update required
                                    </Badge>
                                  )}
                                </td>
                                <td className="px-5 py-3 text-xs text-muted-foreground font-medium">{a.date}</td>
                                <td className="px-5 py-3 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 rounded-lg px-2.5 text-xs text-primary hover:text-primary hover:bg-primary/10 font-semibold gap-1.5 cursor-pointer"
                                      onClick={() => {
                                        setEditTarget(a)
                                        setEditYear(a.year || "")
                                        setEditSheetOpen(true)
                                      }}
                                    >
                                      <Pencil className="size-3.5" /> Edit Year
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 rounded-lg px-2.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 font-semibold gap-1.5 cursor-pointer"
                                      onClick={() => openRemoveDialog(a)}
                                    >
                                      <Trash2 className="size-3.5" /> Remove
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile Card View */}
                      <div className="flex flex-col md:hidden p-3 gap-2 bg-muted/10">
                        {classAssignments.map((a) => (
                          <div
                            key={a.id}
                            className="flex items-center justify-between p-3 rounded-xl border border-border bg-card shadow-2xs"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <Avatar className="size-8.5 ring-1 ring-border shrink-0">
                                <AvatarFallback className={`text-xs font-bold ${getAvatarColor(a.teacher)}`}>
                                  {getInitials(a.teacher)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col min-w-0">
                                <div className="text-xs font-bold text-foreground truncate">{a.teacher}</div>
                                <div className="text-[11px] text-muted-foreground font-medium truncate flex items-center gap-1.5 mt-0.5">
                                  <span className="text-foreground/90 font-semibold">{a.subject}</span>
                                  <span>•</span>
                                  <span className="font-mono">{a.department}</span>
                                </div>
                                <div className="mt-1">
                                  {a.year ? (
                                    <Badge variant="outline" className="text-[10px] font-semibold px-1.5 py-0.2 border-primary/30 text-primary bg-primary/5">
                                      {a.year}
                                    </Badge>
                                  ) : (
                                    <Badge variant="destructive" className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] font-semibold px-1.5 py-0.2 gap-1 inline-flex items-center">
                                      <AlertTriangle className="size-2.5" /> Year not set — update required
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="size-8 p-0 rounded-lg text-primary hover:bg-primary/10 cursor-pointer shrink-0"
                                onClick={() => {
                                  setEditTarget(a)
                                  setEditYear(a.year || "")
                                  setEditSheetOpen(true)
                                }}
                              >
                                <Pencil className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="size-8 p-0 rounded-lg text-destructive hover:bg-destructive/10 cursor-pointer shrink-0"
                                onClick={() => openRemoveDialog(a)}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </Card>
              )
            })
          )}
        </div>
      )}

      {/* ── Loading Skeleton ── */}
      {isLoading && (
        <div className="flex flex-col gap-3.5">
          {[1, 2].map(i => (
            <Card key={i} className="border-border">
              <div className="bg-muted/40 px-5 py-3.5 border-b border-border">
                <Skeleton className="h-4 w-32" />
              </div>
              {[1, 2, 3].map(j => (
                <div key={j} className="flex gap-4 px-5 py-3 border-t border-border/50 items-center">
                  <Skeleton className="size-7.5 rounded-full shrink-0" />
                  <div className="flex gap-8 flex-1 items-center">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-36" />
                  </div>
                </div>
              ))}
            </Card>
          ))}
        </div>
      )}

      {/* ── Assignment Overview — Teacher Rings (Elevated Highlight) ── */}
      {!isLoading && teacherOverview.length > 0 && (
        <Card className="border-border shadow-2xs overflow-hidden">
          <CardHeader className="pb-3.5 border-b border-border/60 bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Users className="size-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-foreground">Faculty Assignment Overview</CardTitle>
                  <span className="text-[11px] text-muted-foreground">Subject allocation distribution across faculty members</span>
                </div>
              </div>
              <Badge variant="outline" className="text-xs font-semibold px-2 py-0.5">
                {totalSubjectsInSystem} Total Subjects
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5">
            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {teacherOverview.map((t, i) => {
                const color = getRingColor(i)
                const pct = totalSubjectsInSystem > 0 ? Math.round((t.count / totalSubjectsInSystem) * 100) : 0
                return (
                  <div
                    key={t.name}
                    className={`group relative flex items-center gap-3.5 rounded-xl border p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                      t.count > 0 ? "bg-card border-border shadow-2xs" : "bg-muted/20 border-border/60"
                    }`}
                  >
                    {/* Ring */}
                    <div className="relative shrink-0 flex items-center justify-center">
                      <AssignmentRing count={t.count} total={totalSubjectsInSystem} color={color.stroke} size={64} />
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-sm font-black leading-none" style={{ color: color.stroke }}>{t.count}</span>
                        <span className="text-[9px] text-muted-foreground font-semibold leading-none mt-0.5">/{totalSubjectsInSystem}</span>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex flex-1 flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar className="size-6 shrink-0 ring-1 ring-border">
                          <AvatarFallback className={`text-[10px] font-bold ${getAvatarColor(t.name)}`}>
                            {getInitials(t.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-bold text-foreground truncate">{t.name}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground font-medium">
                        {t.count} subject{t.count !== 1 ? "s" : ""} allocated ({pct}%)
                      </div>
                      {t.subjects.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {t.subjects.map(subj => (
                            <Badge key={subj} variant="outline" className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-md ${color.badge}`}>
                              {subj}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {t.count === 0 && (
                        <span className="text-[11px] text-muted-foreground/80 italic">No subjects assigned</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Add Assignment Sheet (Polished) ── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-md p-0 flex flex-col gap-0 border-l border-border bg-background">
          <SheetHeader className="p-6 border-b border-border/80 bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Link2 className="size-5" />
              </div>
              <div className="flex flex-col">
                <SheetTitle className="text-base font-bold text-foreground">Add Faculty Assignment</SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  Link a teacher to a specific academic class section and subject
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="flex flex-col gap-4.5 p-6 overflow-y-auto flex-1">
            {/* Teacher Select */}
            <div className="flex flex-col gap-1.5">
              <Label className="flex items-center gap-1.5 text-xs font-semibold text-foreground/90">
                <Users className="size-3.5 text-muted-foreground" /> Teacher
              </Label>
              <Select value={formTeacherId} onValueChange={setFormTeacherId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select faculty member" />
                </SelectTrigger>
                <SelectContent>
                  {teacherOptions.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subject Select */}
            <div className="flex flex-col gap-1.5">
              <Label className="flex items-center gap-1.5 text-xs font-semibold text-foreground/90">
                <BookOpen className="size-3.5 text-muted-foreground" /> Subject
              </Label>
              <Select value={formSubjectId} onValueChange={handleSubjectChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select subject curriculum" />
                </SelectTrigger>
                <SelectContent>
                  {subjectOptions.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="font-medium">{s.name}</span>
                      {s.code && <span className="text-xs text-muted-foreground ml-1">({s.code})</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Academic Year Select (Required - Selected First) */}
            <div className="flex flex-col gap-1.5">
              <Label className="flex items-center gap-1.5 text-xs font-semibold text-foreground/90">
                <CalendarDays className="size-3.5 text-muted-foreground" /> Academic Year <span className="text-destructive">*</span>
              </Label>
              <Select value={formYear} onValueChange={(y) => { setFormYear(y); setFormClassId("") }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select academic year" />
                </SelectTrigger>
                <SelectContent>
                  {YEAR_OPTIONS.map(y => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Class & Section Select (Dependent on Academic Year) */}
            <div className="flex flex-col gap-1.5">
              <Label className="flex items-center gap-1.5 text-xs font-semibold text-foreground/90">
                <GraduationCap className="size-3.5 text-muted-foreground" /> Class & Section <span className="text-destructive">*</span>
              </Label>
              <Select value={formClassId} onValueChange={setFormClassId} disabled={!formYear}>
                <SelectTrigger className="w-full" disabled={!formYear}>
                  <SelectValue placeholder={!formYear ? "Select academic year first" : formAvailableClasses.length === 0 ? "No classes found" : "Select class & section"} />
                </SelectTrigger>
                <SelectContent>
                  {formAvailableClasses.length === 0 ? (
                    <SelectItem value="none" disabled>No classes found for {formYear}</SelectItem>
                  ) : (
                    formAvailableClasses.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.classSection}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Department (Auto-filled) */}
            <div className="flex flex-col gap-1.5">
              <Label className="flex items-center gap-1.5 text-xs font-semibold text-foreground/90">
                <Building2 className="size-3.5 text-muted-foreground" /> Department
              </Label>
              <div className="flex h-10 items-center rounded-xl border border-border/80 bg-muted/40 px-3.5 text-xs font-semibold text-foreground">
                {formDeptCode ? (
                  <span className="font-mono text-primary font-bold">{formDeptCode}</span>
                ) : (
                  <span className="text-muted-foreground font-normal">Auto-fills from selected subject</span>
                )}
              </div>
            </div>

            {/* Assignment Preview Callout */}
            {showPreview && (
              <div className="rounded-xl border border-primary/20 bg-linear-to-b from-primary/10 via-primary/5 to-transparent p-4">
                <div className="text-[11px] font-bold text-primary mb-2.5 uppercase tracking-wider flex items-center gap-1.5">
                  <Link2 className="size-3.5" />
                  <span>Assignment Preview</span>
                </div>
                <div className="flex items-center gap-3">
                  <Avatar className="size-9 ring-1 ring-border">
                    <AvatarFallback className={`text-xs font-bold ${getAvatarColor(previewTeacher!)}`}>
                      {getInitials(previewTeacher!)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <div className="font-bold text-xs text-foreground truncate">{previewTeacher}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5 truncate">
                      <span className="font-semibold text-foreground/90">{previewSubject}</span>
                      <span className="text-primary font-bold">→</span>
                      <span className="font-bold text-primary">{previewClass} · {formYear}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <Button
              onClick={handleAssign}
              className="mt-2 h-10.5 rounded-xl font-semibold shadow-sm hover:shadow transition-all gap-2 cursor-pointer"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Assigning Faculty...
                </>
              ) : (
                <>
                  <Link2 className="size-4" />
                  Assign Teacher
                </>
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Edit Year Dialog ── */}
      <AlertDialog open={editSheetOpen} onOpenChange={(open) => { if (!open) { setEditTarget(null); setEditYear("") } setEditSheetOpen(open) }}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Update Academic Year</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="flex flex-col gap-3 pt-1">
                <span className="text-xs text-muted-foreground">
                  Select the correct academic year for this faculty assignment so students are properly grouped.
                </span>
                {editTarget && (
                  <div className="flex flex-col gap-1.5 rounded-xl border border-border/70 bg-muted/40 p-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">{editTarget.teacher}</span>
                      <span className="font-mono text-muted-foreground">{editTarget.department}</span>
                    </div>
                    <div className="text-muted-foreground font-medium">
                      {editTarget.subject} <span className="font-bold text-foreground">({editTarget.classSection})</span>
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-1.5 mt-2">
                  <Label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <CalendarDays className="size-3.5 text-muted-foreground" /> Academic Year <span className="text-destructive">*</span>
                  </Label>
                  <Select value={editYear} onValueChange={setEditYear}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select academic year" />
                    </SelectTrigger>
                    <SelectContent>
                      {YEAR_OPTIONS.map(y => (
                        <SelectItem key={y} value={y}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2">
            <AlertDialogCancel className="rounded-xl" disabled={isEditing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUpdateYear}
              className="rounded-xl font-semibold gap-2"
              disabled={isEditing || !editYear}
            >
              {isEditing ? <><Loader2 className="size-4 animate-spin" /> Updating...</> : "Save Year"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Remove Dialog (Polished) ── */}
      <AlertDialog open={!!removeTarget} onOpenChange={() => { setRemoveTarget(null); setAffectedSlots([]) }}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Assignment?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="flex flex-col gap-3 pt-1">
                <span className="text-xs text-muted-foreground">
                  This teacher will no longer be assigned to teach this subject in the specified class section.
                </span>
                {removeTarget && (
                  <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/40 p-3 text-xs">
                    <span className="font-bold text-foreground">{removeTarget.teacher}</span>
                    <span className="text-muted-foreground font-medium">
                      {removeTarget.subject} <span className="font-bold text-foreground">({removeTarget.classSection})</span>
                    </span>
                  </div>
                )}
                {loadingPreview ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                    <Loader2 className="size-3.5 animate-spin" /> Checking timetable dependencies...
                  </div>
                ) : affectedSlots.length > 0 ? (
                  <div className="flex flex-col gap-2 rounded-xl border border-amber-300/80 bg-linear-to-r from-amber-500/10 via-amber-500/5 to-transparent p-3.5 dark:border-amber-800/60 dark:from-amber-950/30">
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                      Active Timetable Impact ({affectedSlots.length} slot{affectedSlots.length !== 1 ? "s" : ""}):
                    </span>
                    <ul className="flex flex-col gap-1 text-[11px] text-amber-800 dark:text-amber-300 max-h-36 overflow-y-auto pl-1">
                      {affectedSlots.map((s, i) => (
                        <li key={i} className="font-medium">• {s.day} — Period {s.period} ({s.subject} · {s.classLabel})</li>
                      ))}
                    </ul>
                    <span className="text-[11px] text-amber-800/90 dark:text-amber-300/90 leading-relaxed mt-1">
                      Deleting this assignment marks these slots as Unassigned. They will automatically re-link if reassigned later.
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">This assignment is not currently linked to any active timetable slots.</span>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2">
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="rounded-xl bg-destructive text-white hover:bg-destructive/90"
              disabled={isSubmitting || loadingPreview}
            >
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : "Delete Assignment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}