"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { toast } from "sonner"
import {
  Search,
  Plus,
  MoreHorizontal,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Users,
  UserCheck,
  UserCog,
  Loader2,
  User,
  Hash,
  GraduationCap,
  CalendarDays,
  Building2,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

/* ---------- Types ---------- */

interface Student {
  id: string
  name: string
  roll: string
  class: string
  year: string
  faceStatus: "Approved" | "Pending" | "Rejected" | "None"
  isActive: boolean
  photoUrl: string | null
}

interface ClassOption {
  id: string
  label: string
  name: string
  section: string
  deptName: string
  deptCode: string
  deptId: string
}

interface DeptOption {
  id: string
  name: string
  code: string
}

/* ---------- Helpers ---------- */

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

const ROWS_PER_PAGE = 10

/* ---------- Row / card styling by status ---------- */

function getRowStyle(status: Student["faceStatus"]) {
  switch (status) {
    case "Approved": return "bg-emerald-50/60 hover:bg-emerald-50 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30"
    case "Pending":  return "bg-amber-50/60 hover:bg-amber-50 dark:bg-amber-950/20 dark:hover:bg-amber-950/30"
    case "Rejected": return "bg-red-50/60 hover:bg-red-50 dark:bg-red-950/20 dark:hover:bg-red-950/30"
    case "None":     return "bg-slate-50/80 hover:bg-slate-100/60 dark:bg-slate-900/40 dark:hover:bg-slate-800/40"
  }
}

function getMobileCardStyle(status: Student["faceStatus"]) {
  switch (status) {
    case "Approved": return "border-emerald-200 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/20"
    case "Pending":  return "border-amber-200 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/20"
    case "Rejected": return "border-red-200 bg-red-50/60 dark:border-red-800 dark:bg-red-950/20"
    case "None":     return "border-border bg-card"
  }
}

function getAvatarRing(status: Student["faceStatus"]) {
  switch (status) {
    case "Approved": return "ring-2 ring-emerald-400 ring-offset-1"
    case "Pending":  return "ring-2 ring-amber-400 ring-offset-1"
    case "Rejected": return "ring-2 ring-red-400 ring-offset-1"
    case "None":     return "ring-1 ring-slate-200 ring-offset-1"
  }
}

function getAvatarFallbackStyle(status: Student["faceStatus"]) {
  switch (status) {
    case "Approved": return "bg-emerald-100 text-emerald-700"
    case "Pending":  return "bg-amber-100 text-amber-700"
    case "Rejected": return "bg-red-100 text-red-600"
    case "None":     return "bg-primary/10 text-primary"
  }
}

/* ---------- Skeletons ---------- */

function TableSkeleton() {
  return (
    <>
      {[1, 2, 3, 4].map((i) => (
        <tr key={i} className="border-b border-border last:border-0 animate-pulse">
          <td className="px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-full bg-muted shrink-0" />
              <div className="h-4 w-24 rounded bg-muted" />
            </div>
          </td>
          <td className="px-4 py-3"><div className="h-4 w-16 rounded bg-muted" /></td>
          <td className="px-4 py-3"><div className="h-4 w-12 rounded bg-muted" /></td>
          <td className="px-4 py-3"><div className="h-4 w-14 rounded bg-muted" /></td>
          <td className="px-4 py-3"><div className="h-5 w-16 rounded-full bg-muted" /></td>
          <td className="px-4 py-3 text-right"><div className="size-7 ml-auto rounded bg-muted" /></td>
        </tr>
      ))}
    </>
  )
}

function MobileSkeleton() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-full bg-muted" />
            <div className="flex flex-col gap-2">
              <div className="h-4 w-28 rounded bg-muted" />
              <div className="h-3 w-16 rounded bg-muted" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-3 w-10 rounded bg-muted" />
            <div className="h-3 w-14 rounded bg-muted" />
            <div className="ml-auto h-5 w-14 rounded-full bg-muted" />
          </div>
        </div>
      ))}
    </>
  )
}

/* ---------- Status badge ---------- */

function FaceStatusBadge({ status }: { status: Student["faceStatus"] }) {
  switch (status) {
    case "Approved": return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50 font-medium">✓ Approved</Badge>
    case "Pending":  return <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50 font-medium">⏳ Pending</Badge>
    case "Rejected": return <Badge className="bg-red-50 text-red-700 border-red-200 hover:bg-red-50 font-medium">✕ Rejected</Badge>
    case "None":     return <Badge className="bg-muted text-muted-foreground border-border hover:bg-muted">Not Registered</Badge>
  }
}

/* ---------- Avatar with hover preview ---------- */

function StudentAvatar({ student, size = "md" }: { student: Student; size?: "sm" | "md" }) {
  const [hovered, setHovered] = useState(false)
  const sizeClass = size === "md" ? "size-11" : "size-10"

  return (
    <div
      className="relative shrink-0"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Avatar className={cn(sizeClass, getAvatarRing(student.faceStatus))}>
        {student.photoUrl && (
          <AvatarImage src={student.photoUrl} alt={student.name} className="object-cover" />
        )}
        <AvatarFallback className={cn("text-xs font-semibold", getAvatarFallbackStyle(student.faceStatus))}>
          {getInitials(student.name)}
        </AvatarFallback>
      </Avatar>

      {/* Hover preview — right side, fixed 112×112, proper face crop */}
      {hovered && student.photoUrl && (
        <div
          className="absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 z-[100] pointer-events-none"
        >
          {/* Left arrow */}
          <div className="absolute left-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 bg-white border-l-2 border-b-2 border-emerald-400" />
          {/* Card */}
          <div className="rounded-xl overflow-hidden border-2 border-emerald-400 shadow-2xl bg-white">
            <img
              src={student.photoUrl}
              alt={student.name}
              style={{ width: 112, height: 112, objectFit: "cover", objectPosition: "center top", display: "block" }}
            />
            {/* Name label at bottom */}
            <div className="bg-emerald-600 px-2 py-1 text-center">
              <span className="text-white text-xs font-semibold truncate block">{student.name}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- Group headers ---------- */

function GroupHeader({ className, students }: { className: string; students: Student[] }) {
  const approved = students.filter(s => s.faceStatus === "Approved").length
  const pending  = students.filter(s => s.faceStatus === "Pending").length
  const none     = students.filter(s => s.faceStatus === "None").length

  return (
    <tr className="bg-slate-100/80 dark:bg-slate-800/60 border-b border-border">
      <td colSpan={6} className="px-4 py-2.5">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-bold text-foreground tracking-wide">{className}</span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground font-medium">{students.length} students</span>
          {approved > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-100 rounded-full px-2 py-0.5">
              <span className="size-1.5 rounded-full bg-emerald-500 inline-block" />{approved} approved
            </span>
          )}
          {pending > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">
              <span className="size-1.5 rounded-full bg-amber-500 inline-block" />{pending} pending
            </span>
          )}
          {none > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-200 rounded-full px-2 py-0.5">
              <span className="size-1.5 rounded-full bg-slate-400 inline-block" />{none} not registered
            </span>
          )}
        </div>
      </td>
    </tr>
  )
}

function MobileGroupHeader({ className, students }: { className: string; students: Student[] }) {
  const approved = students.filter(s => s.faceStatus === "Approved").length
  const pending  = students.filter(s => s.faceStatus === "Pending").length
  return (
    <div className="flex items-center gap-2 px-1 pt-2 pb-1 flex-wrap">
      <span className="text-sm font-bold text-foreground">{className}</span>
      <span className="text-xs text-muted-foreground">· {students.length} students</span>
      {approved > 0 && <span className="text-xs font-medium text-emerald-700 bg-emerald-100 rounded-full px-2 py-0.5">{approved} approved</span>}
      {pending > 0 && <span className="text-xs font-medium text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">{pending} pending</span>}
    </div>
  )
}

/* ---------- Form field ---------- */

function FormField({ icon: Icon, label, htmlFor, children }: {
  icon: React.ElementType; label: string; htmlFor: string; children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor} className="flex items-center gap-1.5 text-sm font-medium text-foreground">
        <Icon className="size-3.5 text-muted-foreground" />{label}
      </Label>
      {children}
    </div>
  )
}

/* ---------- Main component ---------- */

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [teacherId, setTeacherId] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [classFilter, setClassFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const [classOptions, setClassOptions] = useState<ClassOption[]>([])
  const [deptOptions, setDeptOptions] = useState<DeptOption[]>([])

  const [formName, setFormName] = useState("")
  const [formRoll, setFormRoll] = useState("")
  const [formClassId, setFormClassId] = useState("")
  const [formDeptId, setFormDeptId] = useState("")
  const [formYear, setFormYear] = useState("")

  const filteredClassOptions = useMemo(() => {
    if (!formDeptId) return []
    return classOptions.filter((c) => c.deptId === formDeptId)
  }, [formDeptId, classOptions])

  useEffect(() => {
    async function getTeacher() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setTeacherId(user.id)
    }
    getTeacher()
  }, [])

  const fetchStudents = useCallback(async () => {
    if (!teacherId) return
    setIsLoading(true)
    setFetchError(null)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("students")
        .select(`
          id, roll_number, year, is_active, embedding_a, is_approved,
          registration_photo_url,
          class:classes ( name, section, department:departments ( code ) ),
          user:users ( full_name )
        `)
        .eq("created_by", teacherId)
        .order("created_at", { ascending: false })

      if (error) { setFetchError("Failed to load students."); return }

      const mapped: Student[] = (data || []).map((s: any) => {
        const classData = s.class
        const className = classData ? `${classData.department?.code ?? ""}-${classData.section}` : "—"
        const hasEmbedding = !!s.embedding_a
        const isApproved = s.is_approved === true
        const faceStatus: Student["faceStatus"] = !hasEmbedding ? "None" : isApproved ? "Approved" : "Pending"
        return {
          id: s.id,
          name: s.user?.full_name ?? "Unknown",
          roll: s.roll_number,
          class: className,
          year: s.year,
          faceStatus,
          isActive: s.is_active ?? true,
          photoUrl: isApproved ? (s.registration_photo_url ?? null) : null,
        }
      })
      setStudents(mapped)
    } catch {
      setFetchError("An unexpected error occurred.")
    } finally {
      setIsLoading(false)
    }
  }, [teacherId])

  const fetchDropdownData = useCallback(async () => {
    const supabase = createClient()
    const [classesRes, deptsRes] = await Promise.all([
      supabase.from("classes").select("id, name, section, department:departments ( id, name, code )").order("name"),
      supabase.from("departments").select("id, name, code").order("name"),
    ])
    if (classesRes.data) {
      setClassOptions(classesRes.data.map((c: any) => ({
        id: c.id, label: `${c.department?.code ?? c.name}-${c.section}`,
        name: c.name, section: c.section,
        deptName: c.department?.name ?? "", deptCode: c.department?.code ?? "", deptId: c.department?.id ?? "",
      })))
    }
    if (deptsRes.data) setDeptOptions(deptsRes.data.map((d: any) => ({ id: d.id, name: d.name, code: d.code })))
  }, [])

  useEffect(() => { if (teacherId) fetchStudents() }, [teacherId, fetchStudents])
  useEffect(() => { fetchDropdownData() }, [fetchDropdownData])

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.roll.toLowerCase().includes(search.toLowerCase())
      const matchesClass = classFilter === "all" || s.class === classFilter
      return matchesSearch && matchesClass
    })
  }, [students, search, classFilter])

  const isGrouped = classFilter === "all" && search === ""

  const groupedStudents = useMemo(() => {
    if (!isGrouped) return null
    const map = new Map<string, Student[]>()
    for (const s of filtered) {
      const key = s.class === "—" ? "Unassigned" : s.class
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(s)
    }
    return map
  }, [filtered, isGrouped])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE))
  const paged = isGrouped ? filtered : filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE)

  const stats = useMemo(() => ({
    total: students.length,
    active: students.filter((s) => s.isActive).length,
    pending: students.filter((s) => s.faceStatus === "Pending").length,
  }), [students])

  const uniqueClasses = Array.from(new Set(students.map((s) => s.class))).filter((c) => c !== "—")

  async function handleAddStudent() {
    if (!formName || !formRoll || !formClassId || !formYear || !formDeptId) { toast.error("Please fill in all fields"); return }
    if (!teacherId) { toast.error("Teacher session not found. Please re-login."); return }
    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const studentEmail = `${formRoll.toLowerCase()}@nnrg.student`
      const res = await fetch("/api/admin/create-user", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: studentEmail, password: "Student@1234", full_name: formName, role: "student" }),
      })
      const result = await res.json()
      if (!res.ok) { toast.error(result.error || "Failed to create user"); setIsSubmitting(false); return }
      const newUserId = result.userId
      if (!newUserId) { toast.error("Failed to create auth user."); setIsSubmitting(false); return }
      const { error: userInsertError } = await supabase.from("users").insert({ id: newUserId, email: studentEmail, full_name: formName, role: "student", must_change_password: false })
      if (userInsertError) { toast.error(`Users insert failed: ${userInsertError.message}`); return }
      const { error: studentInsertError } = await supabase.from("students").insert({ id: newUserId, roll_number: formRoll, department_id: formDeptId, class_id: formClassId, year: formYear, created_by: teacherId, is_active: true })
      if (studentInsertError) { toast.error(`Students insert failed: ${studentInsertError.message}`); return }
      await supabase.from("system_logs").insert({ performed_by: teacherId, action_type: "create", description: `Student account created for ${formName} (${formRoll})` })
      toast.success("Student account created successfully. Default password is Student@1234")
      setSheetOpen(false)
      setFormName(""); setFormRoll(""); setFormClassId(""); setFormDeptId(""); setFormYear("")
      fetchStudents()
    } catch { toast.error("An unexpected error occurred.") }
    finally { setIsSubmitting(false) }
  }

  async function handleDelete() {
    if (!deleteTarget || !teacherId) return
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/admin/delete-user", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: deleteTarget.id }) })
      const result = await res.json()
      if (!res.ok) { toast.error(result.error || "Failed to delete student records"); return }
      toast.success(`${deleteTarget.name} has been removed`)
      fetchStudents()
    } catch { toast.error("An unexpected error occurred.") }
    finally { setDeleteTarget(null); setIsSubmitting(false) }
  }

  /* Student row */
  function StudentRow({ student }: { student: Student }) {
    return (
      <tr className={cn("border-b border-border last:border-0 transition-colors", getRowStyle(student.faceStatus))}>
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <StudentAvatar student={student} size="md" />
            <span className="font-medium text-foreground">{student.name}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{student.roll}</td>
        <td className="px-4 py-3 text-foreground">{student.class}</td>
        <td className="px-4 py-3 text-muted-foreground">{student.year}</td>
        <td className="px-4 py-3"><FaceStatusBadge status={student.faceStatus} /></td>
        <td className="px-4 py-3 text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm"><MoreHorizontal className="size-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(student)}>
                <Trash2 className="size-4" />Delete Student
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </td>
      </tr>
    )
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Stat chips */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
            <Users className="size-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Students</p>
            <p className="text-lg font-bold text-foreground leading-tight">{isLoading ? "—" : stats.total}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 px-4 py-3 shadow-sm">
          <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
            <UserCheck className="size-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-emerald-700 dark:text-emerald-400">Active</p>
            <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400 leading-tight">{isLoading ? "—" : stats.active}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3 shadow-sm">
          <div className="flex size-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/50">
            <UserCog className="size-4 text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-amber-700 dark:text-amber-400">Pending Approval</p>
            <p className="text-lg font-bold text-amber-700 dark:text-amber-400 leading-tight">{isLoading ? "—" : stats.pending}</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by name or roll..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-9" />
          </div>
          <Select value={classFilter} onValueChange={(v) => { setClassFilter(v); setPage(1) }}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="All Classes" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {uniqueClasses.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setSheetOpen(true)} className="gap-2">
          <Plus className="size-4" />Add Student
        </Button>
      </div>

      {fetchError && (
        <div className="rounded-lg border border-border bg-card px-4 py-8 text-center">
          <p className="text-sm text-destructive">{fetchError}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={fetchStudents}>Retry</Button>
        </div>
      )}

      {/* Table — desktop */}
      <div className="hidden rounded-xl border border-border bg-card md:block overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50/80 dark:bg-slate-900/60">
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">Student</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">Roll Number</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">Class</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">Year</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">Face Status</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground text-xs uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? <TableSkeleton /> : filtered.length === 0 && !fetchError ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  {students.length === 0 ? 'No students yet. Click "Add Student" to create one.' : "No students found matching your search."}
                </td></tr>
              ) : isGrouped && groupedStudents ? (
                Array.from(groupedStudents.entries()).map(([cls, clsStudents]) => (
                  <>
                    <GroupHeader key={`hdr-${cls}`} className={cls} students={clsStudents} />
                    {clsStudents.map((s) => <StudentRow key={s.id} student={s} />)}
                  </>
                ))
              ) : (
                paged.map((s) => <StudentRow key={s.id} student={s} />)
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cards — mobile */}
      <div className="flex flex-col gap-3 md:hidden">
        {isLoading ? <MobileSkeleton /> : filtered.length === 0 && !fetchError ? (
          <div className="rounded-lg border border-border bg-card px-4 py-12 text-center text-muted-foreground">
            {students.length === 0 ? 'No students yet. Tap "Add Student" to create one.' : "No students found matching your search."}
          </div>
        ) : isGrouped && groupedStudents ? (
          Array.from(groupedStudents.entries()).map(([cls, clsStudents]) => (
            <div key={cls}>
              <MobileGroupHeader className={cls} students={clsStudents} />
              <div className="flex flex-col gap-2">
                {clsStudents.map((student) => (
                  <div key={student.id} className={cn("rounded-lg border p-4 transition-colors", getMobileCardStyle(student.faceStatus))}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <StudentAvatar student={student} size="sm" />
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{student.name}</span>
                          <span className="text-xs text-muted-foreground font-mono">{student.roll}</span>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(student)}><Trash2 className="size-4" />Delete Student</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{student.year}</span>
                      <FaceStatusBadge status={student.faceStatus} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          paged.map((student) => (
            <div key={student.id} className={cn("rounded-lg border p-4 transition-colors", getMobileCardStyle(student.faceStatus))}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <StudentAvatar student={student} size="sm" />
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{student.name}</span>
                    <span className="text-xs text-muted-foreground font-mono">{student.roll}</span>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(student)}><Trash2 className="size-4" />Delete Student</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{student.class}</span>
                <span className="text-xs text-muted-foreground">{student.year}</span>
                <FaceStatusBadge status={student.faceStatus} />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {!isLoading && !isGrouped && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Showing {filtered.length === 0 ? 0 : (page - 1) * ROWS_PER_PAGE + 1} – {Math.min(page * ROWS_PER_PAGE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="size-4" /></Button>
            <span className="text-sm font-medium text-foreground">{page} / {totalPages}</span>
            <Button variant="outline" size="icon-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="size-4" /></Button>
          </div>
        </div>
      )}

      {/* Delete dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Student</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="flex flex-col gap-2">
                <span>Are you sure you want to delete <strong className="text-foreground">{deleteTarget?.name}</strong>?</span>
                <span className="text-destructive text-sm font-medium">This action is permanent and cannot be undone. All attendance records for this student will be deleted.</span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Student Sheet */}
      <Sheet open={sheetOpen} onOpenChange={(open) => {
        if (!open) { setFormName(""); setFormRoll(""); setFormClassId(""); setFormDeptId(""); setFormYear("") }
        setSheetOpen(open)
      }}>
        <SheetContent side="right" className="sm:max-w-md flex flex-col">
          <SheetHeader className="border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                <GraduationCap className="size-5 text-primary" />
              </div>
              <div>
                <SheetTitle className="text-base">Add New Student</SheetTitle>
                <SheetDescription className="text-xs mt-0.5">
                  Default password: <span className="font-mono font-semibold text-foreground">Student@1234</span>
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
          <div className="flex flex-col gap-0 flex-1 overflow-y-auto">
            <div className="px-4 py-4 border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Personal Info</p>
              <div className="flex flex-col gap-4">
                <FormField icon={User} label="Full Name" htmlFor="student-name">
                  <Input id="student-name" placeholder="Enter student full name" value={formName} onChange={(e) => setFormName(e.target.value)} />
                </FormField>
                <FormField icon={Hash} label="Roll Number" htmlFor="student-roll">
                  <Input id="student-roll" placeholder="e.g. 21CSE055" value={formRoll} onChange={(e) => setFormRoll(e.target.value)} />
                </FormField>
              </div>
            </div>
            <div className="px-4 py-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Academic Info</p>
              <div className="flex flex-col gap-4">
                <FormField icon={Building2} label="Department" htmlFor="student-dept">
                  <Select value={formDeptId} onValueChange={(v) => { setFormDeptId(v); setFormClassId("") }}>
                    <SelectTrigger id="student-dept" className="w-full"><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>{deptOptions.map((d) => <SelectItem key={d.id} value={d.id}>{d.name} ({d.code})</SelectItem>)}</SelectContent>
                  </Select>
                </FormField>
                <FormField icon={GraduationCap} label="Class & Section" htmlFor="student-class">
                  <Select value={formClassId} onValueChange={setFormClassId}>
                    <SelectTrigger id="student-class" disabled={!formDeptId} className="w-full">
                      <SelectValue placeholder={formDeptId ? "Select class" : "Select department first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredClassOptions.length === 0
                        ? <SelectItem value="none" disabled>No classes found</SelectItem>
                        : filteredClassOptions.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)
                      }
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField icon={CalendarDays} label="Year" htmlFor="student-year">
                  <Select value={formYear} onValueChange={setFormYear}>
                    <SelectTrigger id="student-year" className="w-full"><SelectValue placeholder="Select year" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1st Year">1st Year</SelectItem>
                      <SelectItem value="2nd Year">2nd Year</SelectItem>
                      <SelectItem value="3rd Year">3rd Year</SelectItem>
                      <SelectItem value="4th Year">4th Year</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-border px-4 py-4 mt-auto">
            <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
            <Button onClick={handleAddStudent} disabled={isSubmitting} className="min-w-[110px]">
              {isSubmitting ? <><Loader2 className="size-4 animate-spin" />Creating...</> : <><Plus className="size-4" />Add Student</>}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}