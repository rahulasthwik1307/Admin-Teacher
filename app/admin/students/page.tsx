"use client"

import { useState, useEffect, useMemo, useCallback, Fragment } from "react"
import { toast } from "sonner"
import {
  Search, Plus, MoreHorizontal, Trash2, ChevronLeft, ChevronRight,
  Users, UserCheck, UserCog, Loader2, User, Hash, GraduationCap,
  CalendarDays, Building2,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { TableSkeleton, ListSkeleton } from "@/components/ui/skeletons"

interface Student {
  id: string
  name: string
  roll: string
  class: string
  classId: string
  departmentId: string
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

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

const ROWS_PER_PAGE = 10

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

function FaceStatusBadge({ status }: { status: Student["faceStatus"] }) {
  switch (status) {
    case "Approved": return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50 font-medium">✓ Approved</Badge>
    case "Pending":  return <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50 font-medium">⏳ Pending</Badge>
    case "Rejected": return <Badge className="bg-red-50 text-red-700 border-red-200 hover:bg-red-50 font-medium">✕ Rejected</Badge>
    case "None":     return <Badge className="bg-muted text-muted-foreground border-border hover:bg-muted">Not Registered</Badge>
  }
}

function StudentAvatar({ student, size = "md" }: { student: Student; size?: "sm" | "md" }) {
  const [hovered, setHovered] = useState(false)
  const sizeClass = size === "md" ? "size-11" : "size-10"
  return (
    <div className="relative shrink-0" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <Avatar className={cn(sizeClass, getAvatarRing(student.faceStatus))}>
        {student.photoUrl && <AvatarImage src={student.photoUrl} alt={student.name} className="object-cover" />}
        <AvatarFallback className={cn("text-xs font-semibold", getAvatarFallbackStyle(student.faceStatus))}>
          {getInitials(student.name)}
        </AvatarFallback>
      </Avatar>
      {hovered && student.photoUrl && (
        <div className="absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 z-100 pointer-events-none">
          <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 bg-white border-l-2 border-b-2 border-emerald-400" />
          <div className="rounded-xl overflow-hidden border-2 border-emerald-400 shadow-2xl bg-white">
            <img src={student.photoUrl} alt={student.name} style={{ width: 112, height: 112, objectFit: "cover", objectPosition: "center top", display: "block" }} />
            <div className="bg-emerald-600 px-2 py-1 text-center">
              <span className="text-white text-xs font-semibold truncate block">{student.name}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

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
          {approved > 0 && <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-100 rounded-full px-2 py-0.5"><span className="size-1.5 rounded-full bg-emerald-500 inline-block" />{approved} approved</span>}
          {pending > 0 && <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 rounded-full px-2 py-0.5"><span className="size-1.5 rounded-full bg-amber-500 inline-block" />{pending} pending</span>}
          {none > 0 && <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-200 rounded-full px-2 py-0.5"><span className="size-1.5 rounded-full bg-slate-400 inline-block" />{none} not registered</span>}
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

function FormField({ icon: Icon, label, htmlFor, children }: { icon: React.ElementType; label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor} className="flex items-center gap-1.5 text-sm font-medium text-foreground">
        <Icon className="size-3.5 text-muted-foreground" />{label}
      </Label>
      {children}
    </div>
  )
}



export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [search, setSearch] = useState("")
  const [classFilter, setClassFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const [editTarget, setEditTarget] = useState<Student | null>(null)
  const [editSheetOpen, setEditSheetOpen] = useState(false)
  const [editName, setEditName] = useState("")
  const [editRoll, setEditRoll] = useState("")
  const [editClassId, setEditClassId] = useState("")
  const [editDeptId, setEditDeptId] = useState("")
  const [editYear, setEditYear] = useState("")

  const [resetTarget, setResetTarget] = useState<Student | null>(null)
  const [resetOpen, setResetOpen] = useState(false)

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

  const editFilteredClassOptions = useMemo(() => {
    if (!editDeptId) return []
    return classOptions.filter((c) => c.deptId === editDeptId)
  }, [editDeptId, classOptions])

  const fetchStudents = useCallback(async () => {
    setIsLoading(true)
    setFetchError(null)
    try {
      const supabase = createClient()
      // Admin fetches ALL students — no created_by filter
      const { data, error } = await supabase
        .from("students")
        .select(`
          id, roll_number, year, is_active, embedding_a, is_approved, is_rejected,
          registration_photo_url, class_id, department_id,
          class:classes ( name, section, department:departments ( code, id ) ),
          user:users ( full_name )
        `)
        .order("created_at", { ascending: false })

      if (error) { setFetchError("Failed to load students."); return }

      const mapped: Student[] = (data || []).map((s: any) => {
        const classData = s.class
        const className = classData ? `${classData.department?.code ?? ""}-${classData.section}` : "—"
        const hasEmbedding = !!s.embedding_a
        const isApproved = s.is_approved === true
        const isRejected = s.is_rejected === true
        const faceStatus: Student["faceStatus"] = !hasEmbedding ? "None" : isApproved ? "Approved" : isRejected ? "Rejected" : "Pending"
        return {
          id: s.id,
          name: s.user?.full_name ?? "Unknown",
          roll: s.roll_number,
          class: className,
          classId: s.class_id ?? "",
          departmentId: s.department_id ?? classData?.department?.id ?? "",
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
  }, [])

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

  useEffect(() => { fetchStudents() }, [fetchStudents])
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
    if (!formName || !formRoll || !formClassId || !formYear || !formDeptId) {
      toast.error("Please fill in all fields")
      return
    }
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/admin/create-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: formName,
          roll_number: formRoll,
          class_id: formClassId,
          department_id: formDeptId,
          year: formYear,
        }),
      })
      const result = await res.json()
      if (!res.ok) {
        toast.error(result.error || "Failed to create student")
        return
      }
      toast.success("Student account created successfully. Default password is Student@1234")
      setSheetOpen(false)
      setFormName(""); setFormRoll(""); setFormClassId(""); setFormDeptId(""); setFormYear("")
      fetchStudents()
    } catch {
      toast.error("An unexpected error occurred.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/admin/delete-user", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: deleteTarget.id }) })
      const result = await res.json()
      if (!res.ok) { toast.error(result.error || "Failed to delete student"); return }
      toast.success(`${deleteTarget.name} has been removed`)
      fetchStudents()
    } catch { toast.error("An unexpected error occurred.") }
    finally { setDeleteTarget(null); setIsSubmitting(false) }
  }

  async function handleEditStudent() {
    if (!editTarget || !editName.trim() || !editRoll.trim()) return
    setIsSubmitting(true)
    try {
      const response = await fetch("/api/admin/update-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: editTarget.id,
          full_name: editName.trim(),
          roll_number: editRoll.trim(),
          class_id: editClassId || undefined,
          department_id: editDeptId || undefined,
          year: editYear || undefined,
        }),
      })
      const result = await response.json()
      if (!response.ok) { toast.error(result.error || "Failed to update student"); return }
      toast.success("Student updated successfully")
      setEditSheetOpen(false)
      // Update local state immediately
      setStudents(prev => prev.map(s => s.id === editTarget.id ? { ...s, name: editName.trim(), roll: editRoll.trim(), year: editYear || s.year } : s))
      setTimeout(() => fetchStudents(), 500)
    } catch { toast.error("An unexpected error occurred") }
    finally { setIsSubmitting(false) }
  }

  async function handleResetStudentPassword() {
    if (!resetTarget) return
    setIsSubmitting(true)
    try {
      const response = await fetch("/api/teacher/reset-student-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: resetTarget.id, roll_number: resetTarget.roll }),
      })
      const result = await response.json()
      if (!response.ok) { toast.error(result.error || "Failed to reset password"); return }
      toast.success(`Password reset to default for ${resetTarget.roll}`)
      setResetOpen(false)
      setResetTarget(null)
    } catch { toast.error("An unexpected error occurred") }
    finally { setIsSubmitting(false) }
  }

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
              <DropdownMenuItem onClick={() => {
                setEditTarget(student)
                setEditName(student.name)
                setEditRoll(student.roll)
                setEditClassId(student.classId)
                setEditDeptId(student.departmentId)
                setEditYear(student.year)
                setEditSheetOpen(true)
              }}>Edit Student</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setResetTarget(student); setResetOpen(true) }}>Reset Password</DropdownMenuItem>
              <DropdownMenuSeparator />
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
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10"><Users className="size-4 text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">Total Students</p><p className="text-lg font-bold text-foreground leading-tight">{isLoading ? "—" : stats.total}</p></div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 px-4 py-3 shadow-sm">
          <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/50"><UserCheck className="size-4 text-emerald-600" /></div>
          <div><p className="text-xs text-emerald-700 dark:text-emerald-400">Active</p><p className="text-lg font-bold text-emerald-700 dark:text-emerald-400 leading-tight">{isLoading ? "—" : stats.active}</p></div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3 shadow-sm">
          <div className="flex size-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/50"><UserCog className="size-4 text-amber-600" /></div>
          <div><p className="text-xs text-amber-700 dark:text-amber-400">Pending Approval</p><p className="text-lg font-bold text-amber-700 dark:text-amber-400 leading-tight">{isLoading ? "—" : stats.pending}</p></div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col sm:flex-row sm:items-center rounded-2xl border border-border bg-card shadow-sm w-full lg:w-auto overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-border flex-1 max-w-xl">
          <div className="flex items-center gap-3 px-4 py-3 sm:py-2 flex-1 sm:min-w-62.5">
            <Search className="size-4 text-muted-foreground shrink-0" />
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">Search</span>
              <Input placeholder="Search by name or roll..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="border-0 bg-transparent p-0 h-auto shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 font-medium w-full outline-none placeholder:text-muted-foreground/60 focus:bg-transparent" />
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 sm:py-2 flex-1 sm:w-55">
            <Users className="size-4 text-muted-foreground shrink-0" />
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">Class</span>
              <Select value={classFilter} onValueChange={(v) => { setClassFilter(v); setPage(1) }}>
                <SelectTrigger className="border-0 bg-transparent p-0 h-auto shadow-none focus:ring-0 focus:ring-offset-0 font-medium w-full outline-none [&>svg]:opacity-50 hover:bg-transparent">
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {uniqueClasses.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <Button onClick={() => setSheetOpen(true)} className="gap-2 h-13 rounded-2xl w-full lg:w-auto shadow-sm shrink-0 mt-4 lg:mt-0">
          <Plus className="size-4" />Add Student
        </Button>
      </div>

      {fetchError && (
        <div className="rounded-lg border border-border bg-card px-4 py-8 text-center">
          <p className="text-sm text-destructive">{fetchError}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={fetchStudents}>Retry</Button>
        </div>
      )}

      {/* Table desktop */}
      {isLoading ? (
        <div className="hidden md:block">
          <TableSkeleton cols={6} rows={6} hasAvatar={true} />
        </div>
      ) : (
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
                {filtered.length === 0 && !fetchError ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  {students.length === 0 ? 'No students yet. Click "Add Student" to create one.' : "No students found matching your search."}
                </td></tr>
              ) : isGrouped && groupedStudents ? (
                Array.from(groupedStudents.entries()).map(([cls, clsStudents]) => (
                  <Fragment key={cls}>
                    <GroupHeader className={cls} students={clsStudents} />
                    {clsStudents.map((s) => <StudentRow key={s.id} student={s} />)}
                  </Fragment>
                ))
              ) : (
                paged.map((s) => <StudentRow key={s.id} student={s} />)
              )}
            </tbody>
          </table>
        </div>
      </div>
    )}

      {/* Cards mobile */}
      <div className="flex flex-col gap-3 md:hidden">
        {isLoading ? (
          <ListSkeleton count={4} hasAvatar={true} />
        ) : filtered.length === 0 && !fetchError ? (
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
                          <DropdownMenuItem onClick={() => { setEditTarget(student); setEditName(student.name); setEditRoll(student.roll); setEditClassId(student.classId); setEditDeptId(student.departmentId); setEditYear(student.year); setEditSheetOpen(true) }}>Edit Student</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setResetTarget(student); setResetOpen(true) }}>Reset Password</DropdownMenuItem>
                          <DropdownMenuSeparator />
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
                    <DropdownMenuItem onClick={() => { setEditTarget(student); setEditName(student.name); setEditRoll(student.roll); setEditClassId(student.classId); setEditDeptId(student.departmentId); setEditYear(student.year); setEditSheetOpen(true) }}>Edit Student</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setResetTarget(student); setResetOpen(true) }}>Reset Password</DropdownMenuItem>
                    <DropdownMenuSeparator />
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
          <span className="text-sm text-muted-foreground">Showing {filtered.length === 0 ? 0 : (page - 1) * ROWS_PER_PAGE + 1} – {Math.min(page * ROWS_PER_PAGE, filtered.length)} of {filtered.length}</span>
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
                <span className="text-destructive text-sm font-medium">This action is permanent and cannot be undone.</span>
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
      <Sheet open={sheetOpen} onOpenChange={(open) => { if (!open) { setFormName(""); setFormRoll(""); setFormClassId(""); setFormDeptId(""); setFormYear("") } setSheetOpen(open) }}>
        <SheetContent side="right" className="sm:max-w-md flex flex-col">
          <SheetHeader className="border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10"><GraduationCap className="size-5 text-primary" /></div>
              <div>
                <SheetTitle className="text-base">Add New Student</SheetTitle>
                <SheetDescription className="text-xs mt-0.5">Default password: <span className="font-mono font-semibold text-foreground">Student@1234</span></SheetDescription>
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
                      {filteredClassOptions.length === 0 ? <SelectItem value="none" disabled>No classes found</SelectItem> : filteredClassOptions.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
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
            <Button onClick={handleAddStudent} disabled={isSubmitting} className="min-w-27.5">
              {isSubmitting ? <><Loader2 className="size-4 animate-spin" />Creating...</> : <><Plus className="size-4" />Add Student</>}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit Student Sheet — full edit: name, roll, dept, class, year */}
      <Sheet open={editSheetOpen} onOpenChange={setEditSheetOpen}>
        <SheetContent side="right" className="sm:max-w-md flex flex-col">
          <SheetHeader className="border-b border-border pb-4">
            <SheetTitle>Edit Student</SheetTitle>
            <SheetDescription>Update student details. Changes take effect immediately.</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-4 px-4 py-4 flex-1 overflow-y-auto">
            <FormField icon={User} label="Full Name" htmlFor="edit-name">
              <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Student full name" />
            </FormField>
            <FormField icon={Hash} label="Roll Number" htmlFor="edit-roll">
              <Input id="edit-roll" value={editRoll} onChange={(e) => setEditRoll(e.target.value)} placeholder="e.g. 21CSE055" />
              <p className="text-xs text-muted-foreground">Changing roll number will also update the student login email.</p>
            </FormField>
            <FormField icon={Building2} label="Department" htmlFor="edit-dept">
              <Select value={editDeptId} onValueChange={(v) => { setEditDeptId(v); setEditClassId("") }}>
                <SelectTrigger id="edit-dept" className="w-full"><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>{deptOptions.map((d) => <SelectItem key={d.id} value={d.id}>{d.name} ({d.code})</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <FormField icon={GraduationCap} label="Class & Section" htmlFor="edit-class">
              <Select value={editClassId} onValueChange={setEditClassId}>
                <SelectTrigger id="edit-class" disabled={!editDeptId} className="w-full">
                  <SelectValue placeholder={editDeptId ? "Select class" : "Select department first"} />
                </SelectTrigger>
                <SelectContent>
                  {editFilteredClassOptions.length === 0 ? <SelectItem value="none" disabled>No classes found</SelectItem> : editFilteredClassOptions.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
            <FormField icon={CalendarDays} label="Year" htmlFor="edit-year">
              <Select value={editYear} onValueChange={setEditYear}>
                <SelectTrigger id="edit-year" className="w-full"><SelectValue placeholder="Select year" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1st Year">1st Year</SelectItem>
                  <SelectItem value="2nd Year">2nd Year</SelectItem>
                  <SelectItem value="3rd Year">3rd Year</SelectItem>
                  <SelectItem value="4th Year">4th Year</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-border px-4 py-4 mt-auto">
            <Button variant="outline" onClick={() => setEditSheetOpen(false)}>Cancel</Button>
            <Button onClick={handleEditStudent} disabled={isSubmitting} className="min-w-27.5">
              {isSubmitting ? <><Loader2 className="size-4 animate-spin" />Saving...</> : "Save Changes"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Reset Password Dialog */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Student Password</DialogTitle>
            <DialogDescription>
              This will reset <strong>{resetTarget?.roll}</strong>&apos;s password to <strong>Student@1234</strong>. Student will set a new password on next sign in.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={() => setResetOpen(false)}>Cancel</Button>
            <Button onClick={handleResetStudentPassword} disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="size-4 animate-spin mr-2" />Resetting...</> : "Reset Password"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
