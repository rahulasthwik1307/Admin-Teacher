"use client"
import { useState, useEffect, useCallback, useMemo } from "react"
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
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

/* ---------- Interfaces ---------- */
interface Department { id: string; name: string; code: string; classes: number; subjects: number }
interface ClassItem { id: string; name: string; section: string; department: string; departmentFull: string; displayName: string }
interface Subject { id: string; name: string; code: string; department: string; departmentFull: string }
interface Period { id: string; number: number; start: string; end: string; duration: string }

/* ---------- Helpers ---------- */
function computeDuration(start: string, end: string): string {
  const [sh, sm] = start.split(":").map(Number)
  const [eh, em] = end.split(":").map(Number)
  return `${eh * 60 + em - (sh * 60 + sm)} min`
}

const DEPT_COLORS = [
  { border: "border-l-primary", bg: "bg-primary/10", text: "text-primary", badge: "bg-primary/10 text-primary border-primary/20" },
  { border: "border-l-emerald-500", bg: "bg-emerald-500/10", text: "text-emerald-700", badge: "bg-emerald-500/10 text-emerald-700 border-emerald-200" },
  { border: "border-l-amber-500", bg: "bg-amber-500/10", text: "text-amber-700", badge: "bg-amber-500/10 text-amber-700 border-amber-200" },
  { border: "border-l-violet-500", bg: "bg-violet-500/10", text: "text-violet-700", badge: "bg-violet-500/10 text-violet-700 border-violet-200" },
  { border: "border-l-rose-500", bg: "bg-rose-500/10", text: "text-rose-700", badge: "bg-rose-500/10 text-rose-700 border-rose-200" },
]

const PERIOD_COLORS = [
  "bg-primary/10 border-primary/30 text-primary",
  "bg-emerald-500/10 border-emerald-300 text-emerald-700",
  "bg-amber-500/10 border-amber-300 text-amber-700",
  "bg-violet-500/10 border-violet-300 text-violet-700",
  "bg-rose-500/10 border-rose-300 text-rose-700",
  "bg-sky-500/10 border-sky-300 text-sky-700",
]

function getDeptColor(index: number) {
  return DEPT_COLORS[index % DEPT_COLORS.length]
}

const TABS = ["departments", "classes", "subjects", "periods"] as const
type Tab = (typeof TABS)[number]

/* ---------- Component ---------- */
export default function AcademicStructurePage() {
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
  const [subjName, setSubjName] = useState("")
  const [subjCode, setSubjCode] = useState("")
  const [subjDept, setSubjDept] = useState("")
  const [perStart, setPerStart] = useState("")
  const [perEnd, setPerEnd] = useState("")

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  /* ---------- Fetch ---------- */
  const fetchDepartments = useCallback(async () => {
    setLoadingDepts(true)
    try {
      const supabase = createClient()
      const { data } = await supabase.from("departments").select("id, name, code").order("name")
      const { data: classData } = await supabase.from("classes").select("department_id")
      const { data: subjectData } = await supabase.from("subjects").select("department_id")
      const classMap: Record<string, number> = {}
      const subjectMap: Record<string, number> = {}
      for (const c of classData || []) classMap[c.department_id] = (classMap[c.department_id] || 0) + 1
      for (const s of subjectData || []) subjectMap[s.department_id] = (subjectMap[s.department_id] || 0) + 1
      setDepartments((data || []).map((d: any) => ({ id: d.id, name: d.name, code: d.code, classes: classMap[d.id] || 0, subjects: subjectMap[d.id] || 0 })))
    } finally { setLoadingDepts(false) }
  }, [])

  const fetchClasses = useCallback(async () => {
    setLoadingClasses(true)
    try {
      const supabase = createClient()
      const { data } = await supabase.from("classes").select("id, name, section, department:departments ( name, code )").order("name")
      setClasses((data || []).map((c: any) => ({ id: c.id, name: c.name, section: c.section, department: c.department?.code ?? "—", departmentFull: c.department?.name ?? "—", displayName: `${c.name}-${c.section}` })))
    } finally { setLoadingClasses(false) }
  }, [])

  const fetchSubjects = useCallback(async () => {
    setLoadingSubjects(true)
    try {
      const supabase = createClient()
      const { data } = await supabase.from("subjects").select("id, name, code, department:departments ( name, code )").order("name")
      setSubjects((data || []).map((s: any) => ({ id: s.id, name: s.name, code: s.code, department: s.department?.code ?? "—", departmentFull: s.department?.name ?? "—" })))
    } finally { setLoadingSubjects(false) }
  }, [])

  const fetchPeriods = useCallback(async () => {
    setLoadingPeriods(true)
    try {
      const supabase = createClient()
      const { data } = await supabase.from("periods").select("id, period_number, start_time, end_time").order("period_number")
      setPeriods((data || []).map((p: any) => ({ id: p.id, number: p.period_number, start: p.start_time, end: p.end_time, duration: computeDuration(p.start_time, p.end_time) })))
    } finally { setLoadingPeriods(false) }
  }, [])

  useEffect(() => {
    fetchDepartments(); fetchClasses(); fetchSubjects(); fetchPeriods()
  }, [fetchDepartments, fetchClasses, fetchSubjects, fetchPeriods])

  /* ---------- Grouped data ---------- */
  const classesByDept = useMemo(() => {
    const groups: Record<string, ClassItem[]> = {}
    for (const c of classes) {
      const key = c.departmentFull || "Unassigned"
      if (!groups[key]) groups[key] = []
      groups[key].push(c)
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [classes])

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
      fetchDepartments()
    } finally { setIsSubmitting(false) }
  }

  async function handleAddClass() {
    if (!className || !classSection || !classDept) { toast.error("Please fill all fields"); return }
    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const selectedDept = departments.find(d => d.code === classDept)
      if (!selectedDept) { toast.error("Department not found"); return }
      const { error } = await supabase.from("classes").insert({ name: className.toUpperCase(), section: classSection.toUpperCase(), department_id: selectedDept.id })
      if (error) { toast.error(`Failed: ${error.message}`); return }
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await supabase.from("system_logs").insert({ performed_by: user.id, action_type: "create", description: `Class added: ${className.toUpperCase()}-${classSection.toUpperCase()} (${classDept})` })
      toast.success(`Class "${className.toUpperCase()}-${classSection.toUpperCase()}" added`)
      setClassDialog(false); setClassName(""); setClassSection(""); setClassDept("")
      fetchClasses(); fetchDepartments()
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
      fetchSubjects(); fetchDepartments()
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
      fetchPeriods()
    } finally { setIsSubmitting(false) }
  }

  /* ---------- Tab config ---------- */
  const tabConfig = [
    { id: "departments" as Tab, label: "Departments", icon: Building2, count: departments.length, loading: loadingDepts },
    { id: "classes" as Tab, label: "Classes", icon: GraduationCap, count: classes.length, loading: loadingClasses },
    { id: "subjects" as Tab, label: "Subjects", icon: BookOpen, count: subjects.length, loading: loadingSubjects },
    { id: "periods" as Tab, label: "Periods", icon: Clock, count: periods.length, loading: loadingPeriods },
  ]

  const statCards = [
    { label: "Departments", value: departments.length, icon: Building2, color: "border-l-primary", iconColor: "bg-primary/10 text-primary" },
    { label: "Classes", value: classes.length, icon: GraduationCap, color: "border-l-emerald-500", iconColor: "bg-emerald-500/10 text-emerald-600" },
    { label: "Subjects", value: subjects.length, icon: BookOpen, color: "border-l-amber-500", iconColor: "bg-amber-500/10 text-amber-600" },
    { label: "Periods", value: periods.length, icon: Clock, color: "border-l-violet-500", iconColor: "bg-violet-500/10 text-violet-600" },
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
      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map(s => (
          <Card key={s.label} className={`border-l-4 ${s.color} transition-shadow hover:shadow-md`}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${s.iconColor}`}>
                <s.icon className="size-5" />
              </div>
              <div>
                <div className="text-3xl font-bold text-foreground leading-tight">{s.value}</div>
                <div className="text-sm text-muted-foreground">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Premium Tab Bar ── */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          {/* Segmented pill tabs */}
          <div className="inline-flex gap-1 rounded-xl bg-muted/60 p-1">
            {tabConfig.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-base font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className="size-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                  activeTab === tab.id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                }`}>
                  {tab.loading ? "—" : tab.count}
                </span>
              </button>
            ))}
          </div>
          <Button onClick={addActions[activeTab]} size="sm" className="gap-2">
            <Plus className="size-4" />
            <span className="hidden sm:inline">{addLabels[activeTab]}</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>

        {/* ── Departments Tab ── */}
        {activeTab === "departments" && (
          <div className="flex flex-col gap-3">
            {loadingDepts ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map(i => (
                  <Card key={i}>
                    <CardContent className="p-5 flex flex-col gap-3">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-3 w-16" />
                      <div className="h-px bg-border my-2" />
                      <div className="flex gap-4">
                        <Skeleton className="h-4 w-12" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : departments.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No departments yet.</CardContent></Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {departments.map((d, i) => {
                  const color = getDeptColor(i)
                  return (
                    <Card key={d.id} className={`border-l-4 ${color.border} transition-shadow hover:shadow-md`}>
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="text-lg font-semibold text-foreground leading-snug">{d.name}</div>
                            <Badge variant="outline" className={`mt-1 text-sm font-mono ${color.badge}`}>{d.code}</Badge>
                          </div>
                          <div className={`flex size-9 items-center justify-center rounded-xl ${color.bg}`}>
                            <Building2 className={`size-4 ${color.text}`} />
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <GraduationCap className="size-3.5" />
                            <span><span className="text-sm font-semibold text-foreground">{d.classes}</span> Classes</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <BookOpen className="size-3.5" />
                            <span><span className="text-sm font-semibold text-foreground">{d.subjects}</span> Subjects</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Classes Tab ── */}
        {activeTab === "classes" && (
          <div className="flex flex-col gap-3">
            {loadingClasses ? (
              <div className="flex flex-col gap-3">
                {[1, 2].map(i => (
                  <Card key={i}>
                    <CardContent className="p-5 flex flex-col gap-3">
                      <Skeleton className="h-4 w-40" />
                      <div className="flex items-center gap-4 mt-2">
                        <Skeleton className="h-3.5 w-12" />
                        <Skeleton className="h-3.5 w-20" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : classes.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No classes yet.</CardContent></Card>
            ) : (
              <div className="flex flex-col gap-3">
                {classesByDept.map(([dept, deptClasses], gi) => {
                  const color = getDeptColor(gi)
                  const isCollapsed = collapsedGroups.has(dept)
                  return (
                    <Card key={dept} className="overflow-hidden">
                      <button
                        onClick={() => toggleGroup(dept)}
                        className="flex w-full items-center justify-between bg-muted/40 px-5 py-3 text-left hover:bg-muted/60 transition-colors border-b border-border"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`flex size-7 items-center justify-center rounded-md ${color.bg}`}>
                            <Building2 className={`size-3.5 ${color.text}`} />
                          </div>
                          <span className="text-base font-semibold text-foreground">{dept}</span>
                          <Badge variant="secondary" className="text-sm">{deptClasses.length} class{deptClasses.length !== 1 ? "es" : ""}</Badge>
                        </div>
                        {isCollapsed ? <ChevronRight className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
                      </button>
                      {!isCollapsed && (
                        <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-3">
                          {deptClasses.map((c, ci) => (
                            <div key={c.id} className={`flex items-center gap-3 px-5 py-3.5 ${ci !== 0 ? "border-t border-border sm:border-l" : ""} hover:bg-muted/20 transition-colors`}>
                              <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg font-bold text-xs ${color.bg} ${color.text}`}>
                                {c.section}
                              </div>
                              <div>
                                <div className="font-semibold text-base text-foreground">{c.displayName}</div>
                                <div className="text-sm text-muted-foreground">Section {c.section}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Subjects Tab ── */}
        {activeTab === "subjects" && (
          <div className="flex flex-col gap-3">
            {loadingSubjects ? (
              <div className="flex flex-col gap-3">
                {[1, 2].map(i => (
                  <Card key={i}>
                    <CardContent className="p-5 flex flex-col gap-3">
                      <Skeleton className="h-4 w-40" />
                      <div className="flex items-center gap-4 mt-2">
                        <Skeleton className="h-3.5 w-16" />
                        <Skeleton className="h-3.5 w-12" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : subjects.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No subjects yet.</CardContent></Card>
            ) : (
              <div className="flex flex-col gap-3">
                {subjectsByDept.map(([dept, deptSubjects], gi) => {
                  const color = getDeptColor(gi)
                  const isCollapsed = collapsedGroups.has(`subj-${dept}`)
                  return (
                    <Card key={dept} className="overflow-hidden">
                      <button
                        onClick={() => toggleGroup(`subj-${dept}`)}
                        className="flex w-full items-center justify-between bg-muted/40 px-5 py-3 text-left hover:bg-muted/60 transition-colors border-b border-border"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`flex size-7 items-center justify-center rounded-md ${color.bg}`}>
                            <BookOpen className={`size-3.5 ${color.text}`} />
                          </div>
                          <span className="text-base font-semibold text-foreground">{dept}</span>
                          <Badge variant="secondary" className="text-sm">{deptSubjects.length} subject{deptSubjects.length !== 1 ? "s" : ""}</Badge>
                        </div>
                        {isCollapsed ? <ChevronRight className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
                      </button>
                      {!isCollapsed && (
                        <div className="flex flex-col">
                          {deptSubjects.map((s, si) => (
                            <div key={s.id} className={`flex items-center justify-between px-5 py-3.5 ${si !== 0 ? "border-t border-border" : ""} hover:bg-muted/20 transition-colors`}>
                              <div className="flex items-center gap-3">
                                <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${color.bg}`}>
                                  <BookOpen className={`size-3.5 ${color.text}`} />
                                </div>
                                <span className="font-medium text-base text-foreground">{s.name}</span>
                              </div>
                              <Badge variant="outline" className={`font-mono text-sm ${color.badge}`}>{s.code}</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Periods Tab ── */}
        {activeTab === "periods" && (
          <div className="flex flex-col gap-4">
            {loadingPeriods ? (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="shrink-0 h-28 w-36 rounded-xl border border-border p-4 flex flex-col justify-between bg-card">
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-3 w-10" />
                      <Skeleton className="h-4 w-6" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Skeleton className="h-3.5 w-12" />
                      <Skeleton className="h-3.5 w-14" />
                    </div>
                  </div>
                ))}
              </div>
            ) : periods.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No periods configured yet.</CardContent></Card>
            ) : (
              <>
                {/* Timeline cards */}
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {periods.map((p, i) => {
                    const colorClass = PERIOD_COLORS[i % PERIOD_COLORS.length]
                    return (
                      <div
                        key={p.id}
                        className={`shrink-0 rounded-xl border-2 p-4 w-36 flex flex-col gap-2 transition-shadow hover:shadow-md ${colorClass}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wide opacity-70">Period</span>
                          <span className="text-lg font-black">{p.number}</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-bold">{p.start}</span>
                          <div className="h-px bg-current opacity-20" />
                          <span className="text-sm font-semibold">{p.end}</span>
                        </div>
                        <div className="text-[11px] font-semibold opacity-60">{p.duration}</div>
                      </div>
                    )
                  })}
                </div>
                {/* Also show as clean table for detail */}
                <Card>
                  <CardContent className="p-0">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left">
                          <th className="px-5 py-2.5 text-sm font-medium uppercase tracking-wide text-muted-foreground">Period</th>
                          <th className="px-5 py-2.5 text-sm font-medium uppercase tracking-wide text-muted-foreground">Start</th>
                          <th className="px-5 py-2.5 text-sm font-medium uppercase tracking-wide text-muted-foreground">End</th>
                          <th className="px-5 py-2.5 text-sm font-medium uppercase tracking-wide text-muted-foreground">Duration</th>
                        </tr>
                      </thead>
                      <tbody>
                        {periods.map((p, i) => (
                          <tr key={p.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <div className={`size-6 rounded-full flex items-center justify-center text-[10px] font-bold border ${PERIOD_COLORS[i % PERIOD_COLORS.length]}`}>
                                  {p.number}
                                </div>
                                <span className="text-base font-medium text-foreground">Period {p.number}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3 font-mono text-base text-foreground">{p.start}</td>
                            <td className="px-5 py-3 font-mono text-base text-foreground">{p.end}</td>
                            <td className="px-5 py-3 text-base text-muted-foreground">{p.duration}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}
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
            {className && classSection && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center gap-2">
                <GraduationCap className="size-4 text-emerald-600 shrink-0" />
                <span className="text-xs text-emerald-700 font-medium">Will be created as <span className="font-bold">{className.toUpperCase()}-{classSection.toUpperCase()}</span></span>
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