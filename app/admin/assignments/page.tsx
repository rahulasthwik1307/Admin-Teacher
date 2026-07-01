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
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

/* ---------- Interfaces ---------- */
interface Assignment {
  id: string
  teacher: string
  teacherId: string
  subject: string
  classSection: string
  department: string
  date: string
}

interface TeacherOption { id: string; name: string }
interface SubjectOption { id: string; name: string; deptCode: string }
interface ClassOption { id: string; label: string; deptCode: string }
interface DeptOption { code: string; name: string }

/* ---------- Helpers ---------- */
function getInitials(name: string): string {
  return name.split(" ").filter(w => w[0] && w[0] === w[0].toUpperCase()).map(w => w[0]).join("").slice(0, 2) || "NA"
}

const AVATAR_COLORS = [
  "bg-primary/15 text-primary",
  "bg-emerald-500/15 text-emerald-700",
  "bg-amber-500/15 text-amber-700",
  "bg-violet-500/15 text-violet-700",
  "bg-rose-500/15 text-rose-700",
  "bg-sky-500/15 text-sky-700",
]

const RING_COLORS = [
  { stroke: "#3b82f6", bg: "bg-primary/10", text: "text-primary", badge: "bg-primary/10 text-primary border-primary/20" },
  { stroke: "#10b981", bg: "bg-emerald-500/10", text: "text-emerald-700", badge: "bg-emerald-500/10 text-emerald-700 border-emerald-200" },
  { stroke: "#f59e0b", bg: "bg-amber-500/10", text: "text-amber-700", badge: "bg-amber-500/10 text-amber-700 border-amber-200" },
  { stroke: "#8b5cf6", bg: "bg-violet-500/10", text: "text-violet-700", badge: "bg-violet-500/10 text-violet-700 border-violet-200" },
  { stroke: "#f43f5e", bg: "bg-rose-500/10", text: "text-rose-700", badge: "bg-rose-500/10 text-rose-700 border-rose-200" },
  { stroke: "#0ea5e9", bg: "bg-sky-500/10", text: "text-sky-700", badge: "bg-sky-500/10 text-sky-700 border-sky-200" },
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
  const strokeWidth = 7
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - pct * circumference

  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-muted/30" />
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

  const [sheetOpen, setSheetOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<Assignment | null>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  const [formTeacherId, setFormTeacherId] = useState("")
  const [formSubjectId, setFormSubjectId] = useState("")
  const [formClassId, setFormClassId] = useState("")
  const [formDeptCode, setFormDeptCode] = useState("")

  /* ---------- Fetch ---------- */
  const fetchDropdownData = useCallback(async () => {
    const supabase = createClient()
    const [teachersRes, subjectsRes, classesRes] = await Promise.all([
      supabase.from("teachers").select("id, user:users ( full_name )").eq("is_active", true),
      supabase.from("subjects").select("id, name, department:departments ( code )").order("name"),
      supabase.from("classes").select("id, name, section, department:departments ( code, name )").order("name"),
    ])
    if (teachersRes.data) setTeacherOptions(teachersRes.data.map((t: any) => ({ id: t.id, name: t.user?.full_name ?? "Unknown" })))
    if (subjectsRes.data) {
      setSubjectOptions(subjectsRes.data.map((s: any) => ({ id: s.id, name: s.name, deptCode: s.department?.code ?? "" })))
      setTotalSubjectsInSystem(subjectsRes.data.length)
    }
    if (classesRes.data) {
      setClassOptions(classesRes.data.map((c: any) => ({ id: c.id, label: `${c.name}-${c.section}`, deptCode: c.department?.code ?? "" })))
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
        .select(`id, assigned_at, teacher:teachers ( id, user:users ( full_name ) ), subject:subjects ( name ), class:classes ( name, section, department:departments ( code ) )`)
        .order("assigned_at", { ascending: false })
      if (error) { setFetchError("Failed to load assignments."); return }
      setAssignments((data || []).map((a: any) => ({
        id: a.id,
        teacher: a.teacher?.user?.full_name ?? "Unknown",
        teacherId: a.teacher?.id ?? "",
        subject: a.subject?.name ?? "—",
        classSection: a.class ? `${a.class.name}-${a.class.section}` : "—",
        department: a.class?.department?.code ?? "—",
        date: a.assigned_at ? new Date(a.assigned_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—",
      })))
    } catch { setFetchError("An unexpected error occurred.") }
    finally { setIsLoading(false) }
  }, [])

  useEffect(() => { fetchDropdownData(); fetchAssignments() }, [fetchDropdownData, fetchAssignments])

  /* ---------- Filtered & grouped ---------- */
  const filtered = useMemo(() => assignments.filter(a => {
    if (filterClass !== "all" && a.classSection !== filterClass) return false
    if (filterDept !== "all" && a.department !== filterDept) return false
    if (filterTeacher !== "all" && a.teacher !== filterTeacher) return false
    return true
  }), [assignments, filterClass, filterDept, filterTeacher])

  const groupedByClass = useMemo(() => {
    const groups: Record<string, Assignment[]> = {}
    for (const a of filtered) {
      if (!groups[a.classSection]) groups[a.classSection] = []
      groups[a.classSection].push(a)
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

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
    if (found) setFormDeptCode(found.deptCode)
  }

  /* ---------- Stat cards ---------- */
  const teachersWithAssignments = new Set(assignments.map(a => a.teacher)).size
  const subjectsCovered = new Set(assignments.map(a => a.subject)).size
  const classesCovered = new Set(assignments.map(a => a.classSection)).size

  const statCards = [
    { label: "Total Assignments", value: assignments.length, icon: Link2, color: "border-l-primary", iconColor: "bg-primary/10 text-primary" },
    { label: "Teachers Assigned", value: teachersWithAssignments, icon: Users, color: "border-l-emerald-500", iconColor: "bg-emerald-500/10 text-emerald-600" },
    { label: "Subjects Covered", value: subjectsCovered, icon: BookOpen, color: "border-l-amber-500", iconColor: "bg-amber-500/10 text-amber-600" },
    { label: "Classes Covered", value: classesCovered, icon: GraduationCap, color: "border-l-violet-500", iconColor: "bg-violet-500/10 text-violet-600" },
  ]

  const uniqueClasses = Array.from(new Set(assignments.map(a => a.classSection))).filter(c => c !== "—")
  const uniqueTeachers = Array.from(new Set(assignments.map(a => a.teacher)))

  /* ---------- Handlers ---------- */
  async function handleAssign() {
    if (!formTeacherId || !formSubjectId || !formClassId) { toast.error("Please fill all fields"); return }
    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("teacher_assignments").insert({ teacher_id: formTeacherId, subject_id: formSubjectId, class_id: formClassId })
      if (error) { toast.error(`Failed: ${error.message}`); return }
      const { data: { user } } = await supabase.auth.getUser()
      const teacherName = teacherOptions.find(t => t.id === formTeacherId)?.name ?? ""
      const subjectName = subjectOptions.find(s => s.id === formSubjectId)?.name ?? ""
      const className = classOptions.find(c => c.id === formClassId)?.label ?? ""
      if (user) await supabase.from("system_logs").insert({ performed_by: user.id, action_type: "assign", description: `Teacher ${teacherName} assigned to ${subjectName} — ${className}` })
      toast.success(`${teacherName} assigned to ${subjectName} — ${className}`)
      setSheetOpen(false); setFormTeacherId(""); setFormSubjectId(""); setFormClassId(""); setFormDeptCode("")
      fetchAssignments()
    } catch { toast.error("An unexpected error occurred.") }
    finally { setIsSubmitting(false) }
  }

  async function handleRemove() {
    if (!removeTarget) return
    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("teacher_assignments").delete().eq("id", removeTarget.id)
      if (error) { toast.error(`Failed: ${error.message}`); return }
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await supabase.from("system_logs").insert({ performed_by: user.id, action_type: "delete", description: `Assignment removed: ${removeTarget.teacher} — ${removeTarget.subject} (${removeTarget.classSection})` })
      toast.success(`Assignment removed`)
      fetchAssignments()
    } catch { toast.error("An unexpected error occurred.") }
    finally { setRemoveTarget(null); setIsSubmitting(false) }
  }

  /* ---------- Preview card ---------- */
  const previewTeacher = teacherOptions.find(t => t.id === formTeacherId)?.name
  const previewSubject = subjectOptions.find(s => s.id === formSubjectId)?.name
  const previewClass = classOptions.find(c => c.id === formClassId)?.label
  const showPreview = previewTeacher && previewSubject && previewClass

  return (
    <div className="flex flex-col gap-6">
      {/* ── Stat Cards ── */}
      {!isLoading && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {statCards.map(s => (
            <Card key={s.label} className={`border-l-4 ${s.color} transition-shadow hover:shadow-md`}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${s.iconColor}`}>
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
      )}

      {/* ── Filter Bar + Add Button ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Select value={filterClass} onValueChange={setFilterClass}>
            <SelectTrigger className="w-36 h-9 text-sm">
              <GraduationCap className="size-4 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {uniqueClasses.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterDept} onValueChange={setFilterDept}>
            <SelectTrigger className="w-56 h-9 text-sm">
              <div className="flex items-center w-full min-w-0 overflow-hidden">
                <Building2 className="size-4 shrink-0 mr-1.5 text-muted-foreground" />
                <span className="truncate text-left flex-1">
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
            <SelectTrigger className="w-40 h-9 text-sm">
              <Users className="size-4 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="All Teachers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teachers</SelectItem>
              {uniqueTeachers.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          {(filterClass !== "all" || filterDept !== "all" || filterTeacher !== "all") && (
            <Button variant="ghost" size="sm" className="h-9 gap-1.5 text-muted-foreground" onClick={() => { setFilterClass("all"); setFilterDept("all"); setFilterTeacher("all") }}>
              <X className="size-3.5" /> Clear
            </Button>
          )}
        </div>
        <Button onClick={() => setSheetOpen(true)} className="gap-2 self-start sm:self-auto">
          <Plus className="size-4" /> Add Assignment
        </Button>
      </div>

      {/* ── Error ── */}
      {fetchError && (
        <Card><CardContent className="py-8 text-center">
          <p className="text-sm text-destructive">{fetchError}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={fetchAssignments}>Retry</Button>
        </CardContent></Card>
      )}

      {/* ── Assignments Grouped by Class — Desktop ── */}
      {!isLoading && !fetchError && (
        <div className="flex flex-col gap-3">
          {groupedByClass.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
              {assignments.length === 0 ? "No assignments yet. Click \"Add Assignment\" to create one." : "No assignments match the selected filters."}
            </CardContent></Card>
          ) : (
            groupedByClass.map(([classSection, classAssignments]) => {
              const isCollapsed = collapsedGroups.has(classSection)
              return (
                <Card key={classSection} className="overflow-hidden">
                  <button
                    onClick={() => toggleGroup(classSection)}
                    className="flex w-full items-center justify-between bg-muted/40 px-5 py-3 text-left hover:bg-muted/60 transition-colors border-b border-border"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-7 items-center justify-center rounded-md bg-primary/10">
                        <GraduationCap className="size-3.5 text-primary" />
                      </div>
                      <span className="text-base font-semibold text-foreground">{classSection}</span>
                      <Badge variant="secondary" className="text-sm">{classAssignments.length} assignment{classAssignments.length !== 1 ? "s" : ""}</Badge>
                      <span className="text-sm text-muted-foreground">{classAssignments[0]?.department}</span>
                    </div>
                    {isCollapsed ? <ChevronRight className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
                  </button>
                  {!isCollapsed && (
                    <>
                      {/* Desktop */}
                      <div className="hidden md:block">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left">
                              <th className="px-5 py-2.5 text-sm font-medium uppercase tracking-wide text-muted-foreground">Teacher</th>
                              <th className="px-5 py-2.5 text-sm font-medium uppercase tracking-wide text-muted-foreground">Subject</th>
                              <th className="px-5 py-2.5 text-sm font-medium uppercase tracking-wide text-muted-foreground">Department</th>
                              <th className="px-5 py-2.5 text-sm font-medium uppercase tracking-wide text-muted-foreground">Assigned</th>
                              <th className="px-5 py-2.5 text-sm font-medium uppercase tracking-wide text-muted-foreground text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {classAssignments.map(a => (
                              <tr key={a.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                                <td className="px-5 py-3">
                                  <div className="flex items-center gap-2.5">
                                    <Avatar className="size-7">
                                      <AvatarFallback className={`text-[10px] font-semibold ${getAvatarColor(a.teacher)}`}>{getInitials(a.teacher)}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-base font-medium text-foreground">{a.teacher}</span>
                                  </div>
                                </td>
                                <td className="px-5 py-3 text-base text-foreground">{a.subject}</td>
                                <td className="px-5 py-3"><span className="font-mono text-sm rounded bg-muted px-2 py-0.5 text-muted-foreground">{a.department}</span></td>
                                <td className="px-5 py-3 text-sm text-muted-foreground">{a.date}</td>
                                <td className="px-5 py-3 text-right">
                                  <Button variant="ghost" size="sm" className="h-7 gap-1 text-sm text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setRemoveTarget(a)}>
                                    <Trash2 className="size-3.5" /> Remove
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {/* Mobile */}
                      <div className="flex flex-col md:hidden">
                        {classAssignments.map((a, ai) => (
                          <div key={a.id} className={`flex items-center justify-between px-4 py-3 ${ai !== 0 ? "border-t border-border" : ""}`}>
                            <div className="flex items-center gap-3">
                              <Avatar className="size-8">
                                <AvatarFallback className={`text-xs font-semibold ${getAvatarColor(a.teacher)}`}>{getInitials(a.teacher)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="text-sm font-medium text-foreground">{a.teacher}</div>
                                <div className="text-xs text-muted-foreground">{a.subject}</div>
                              </div>
                            </div>
                            <Button variant="ghost" size="icon-sm" className="text-destructive hover:bg-destructive/10" onClick={() => setRemoveTarget(a)}>
                              <Trash2 className="size-4" />
                            </Button>
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

      {/* ── Loading skeleton ── */}
      {isLoading && (
        <div className="flex flex-col gap-3">
          {[1, 2].map(i => (
            <Card key={i}>
              <div className="bg-muted/40 px-5 py-3 border-b border-border">
                <Skeleton className="h-4 w-24" />
              </div>
              {[1, 2, 3].map(j => (
                <div key={j} className="flex gap-4 px-5 py-3 border-t border-border items-center">
                  <Skeleton className="size-7 rounded-full shrink-0" />
                  <div className="flex gap-8 flex-1 items-center">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                </div>
              ))}
            </Card>
          ))}
        </div>
      )}

      {/* ── Assignment Overview — Teacher Rings ── */}
      {!isLoading && teacherOverview.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                <Users className="size-4 text-primary" />
              </div>
              <CardTitle className="text-base font-semibold">Assignment Overview</CardTitle>
              <span className="text-xs text-muted-foreground ml-1">out of {totalSubjectsInSystem} total subjects</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {teacherOverview.map((t, i) => {
                const color = getRingColor(i)
                const pct = totalSubjectsInSystem > 0 ? Math.round((t.count / totalSubjectsInSystem) * 100) : 0
                return (
                  <div key={t.name} className={`flex items-center gap-4 rounded-xl border p-4 transition-shadow hover:shadow-sm ${t.count > 0 ? "bg-background" : "bg-muted/20"}`}>
                    {/* Ring */}
                    <div className="relative shrink-0">
                      <AssignmentRing count={t.count} total={totalSubjectsInSystem} color={color.stroke} size={72} />
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-base font-black" style={{ color: color.stroke }}>{t.count}</span>
                        <span className="text-xs text-muted-foreground leading-none">/{totalSubjectsInSystem}</span>
                      </div>
                    </div>
                    {/* Info */}
                    <div className="flex flex-1 flex-col gap-1.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <Avatar className="size-7 shrink-0">
                          <AvatarFallback className={`text-xs font-semibold ${getAvatarColor(t.name)}`}>{getInitials(t.name)}</AvatarFallback>
                        </Avatar>
                        <span className="text-base font-semibold text-foreground truncate">{t.name}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">{t.count} subject{t.count !== 1 ? "s" : ""} assigned ({pct}%)</div>
                      {t.subjects.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {t.subjects.map(subj => (
                            <Badge key={subj} variant="outline" className={`text-xs px-2 py-0.5 ${color.badge}`}>{subj}</Badge>
                          ))}
                        </div>
                      )}
                      {t.count === 0 && (
                        <span className="text-sm text-muted-foreground italic">No subjects assigned</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Add Assignment Sheet ── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add Assignment</SheetTitle>
            <SheetDescription>Assign a teacher to a class and subject.</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-5 py-6">
            <div className="flex flex-col gap-2">
              <Label className="flex items-center gap-1.5 text-sm font-medium"><Users className="size-3.5 text-muted-foreground" /> Teacher</Label>
              <Select value={formTeacherId} onValueChange={setFormTeacherId}>
                <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                <SelectContent>{teacherOptions.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label className="flex items-center gap-1.5 text-sm font-medium"><BookOpen className="size-3.5 text-muted-foreground" /> Subject</Label>
              <Select value={formSubjectId} onValueChange={handleSubjectChange}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>{subjectOptions.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.deptCode})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label className="flex items-center gap-1.5 text-sm font-medium"><GraduationCap className="size-3.5 text-muted-foreground" /> Class & Section</Label>
              <Select value={formClassId} onValueChange={setFormClassId}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>{classOptions.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label className="flex items-center gap-1.5 text-sm font-medium"><Building2 className="size-3.5 text-muted-foreground" /> Department</Label>
              <div className="flex h-10 items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
                {formDeptCode || "Auto-fills from subject"}
              </div>
            </div>
            {/* Preview */}
            {showPreview && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="text-xs font-semibold text-primary mb-2 uppercase tracking-wide">Assignment Preview</div>
                <div className="flex items-start gap-3">
                  <Avatar className="size-9">
                    <AvatarFallback className={`text-xs font-semibold ${getAvatarColor(previewTeacher!)}`}>{getInitials(previewTeacher!)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold text-sm text-foreground">{previewTeacher}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {previewSubject} <span className="text-primary font-medium">→</span> {previewClass}
                    </div>
                  </div>
                </div>
              </div>
            )}
            <Button onClick={handleAssign} className="mt-1" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="size-4 animate-spin" />Assigning...</> : <><Link2 className="size-4" />Assign Teacher</>}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Remove Dialog ── */}
      <AlertDialog open={!!removeTarget} onOpenChange={() => setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Assignment?</AlertDialogTitle>
            <AlertDialogDescription>
              This teacher will no longer have access to this subject and class.
              {removeTarget && (
                <span className="mt-2 block rounded-lg bg-muted/50 px-3 py-2 text-sm font-medium text-foreground">
                  {removeTarget.teacher} — {removeTarget.subject} ({removeTarget.classSection})
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} className="bg-destructive text-white hover:bg-destructive/90" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}