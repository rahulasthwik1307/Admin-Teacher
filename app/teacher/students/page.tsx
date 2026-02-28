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
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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

/* ---------- Types ---------- */

interface Student {
  id: string
  name: string
  roll: string
  class: string
  year: string
  faceStatus: "Approved" | "Pending" | "Rejected" | "None"
  isActive: boolean
}

interface ClassOption {
  id: string
  label: string // e.g. "CSE-A"
  name: string
  section: string
  deptName: string
  deptCode: string
}

interface DeptOption {
  id: string
  name: string
  code: string
}

/* ---------- Helpers ---------- */

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

const ROWS_PER_PAGE = 10

/* ---------- Skeleton ---------- */

function TableSkeleton() {
  return (
    <>
      {[1, 2, 3, 4].map((i) => (
        <tr key={i} className="border-b border-border last:border-0 animate-pulse">
          <td className="px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-full bg-muted" />
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
            <div className="size-10 rounded-full bg-muted" />
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

/* ---------- Component ---------- */

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

  // Dropdown options
  const [classOptions, setClassOptions] = useState<ClassOption[]>([])
  const [deptOptions, setDeptOptions] = useState<DeptOption[]>([])

  // Form state
  const [formName, setFormName] = useState("")
  const [formRoll, setFormRoll] = useState("")
  const [formClassId, setFormClassId] = useState("")
  const [formDeptId, setFormDeptId] = useState("")
  const [formYear, setFormYear] = useState("")

  /* ---------- Fetch teacher id ---------- */

  useEffect(() => {
    async function getTeacher() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setTeacherId(user.id)
    }
    getTeacher()
  }, [])

  /* ---------- Fetch students ---------- */

  const fetchStudents = useCallback(async () => {
    if (!teacherId) return
    setIsLoading(true)
    setFetchError(null)

    try {
      const supabase = createClient()

      // Fetch students created by this teacher
      const { data, error } = await supabase
        .from("students")
        .select(`
          id,
          roll_number,
          year,
          is_active,
          class:classes ( name, section, department:departments ( code ) ),
          user:users ( full_name )
        `)
        .eq("created_by", teacherId)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Fetch students error:", error)
        setFetchError("Failed to load students.")
        return
      }

      // Fetch latest face registration status for each student
      const studentIds = (data || []).map((s: any) => s.id)
      let faceMap: Record<string, string> = {}

      if (studentIds.length > 0) {
        const { data: faceData } = await supabase
          .from("face_registrations")
          .select("student_id, status, submitted_at")
          .in("student_id", studentIds)
          .order("submitted_at", { ascending: false })

        if (faceData) {
          // Keep only the latest per student
          for (const fr of faceData as any[]) {
            if (!faceMap[fr.student_id]) {
              faceMap[fr.student_id] = fr.status
            }
          }
        }
      }

      const mapped: Student[] = (data || []).map((s: any) => {
        const classData = s.class
        const className = classData
          ? `${classData.department?.code ?? ""}-${classData.section}`
          : "—"
        const rawStatus = faceMap[s.id] || "None"
        const faceStatus =
          rawStatus === "approved"
            ? "Approved"
            : rawStatus === "pending"
              ? "Pending"
              : rawStatus === "rejected"
                ? "Rejected"
                : "None"

        return {
          id: s.id,
          name: s.user?.full_name ?? "Unknown",
          roll: s.roll_number,
          class: className,
          year: s.year,
          faceStatus,
          isActive: s.is_active ?? true,
        }
      })

      setStudents(mapped)
    } catch {
      setFetchError("An unexpected error occurred.")
    } finally {
      setIsLoading(false)
    }
  }, [teacherId])

  /* ---------- Fetch dropdown data ---------- */

  const fetchDropdownData = useCallback(async () => {
    const supabase = createClient()

    const [classesRes, deptsRes] = await Promise.all([
      supabase
        .from("classes")
        .select("id, name, section, department:departments ( id, name, code )")
        .order("name"),
      supabase
        .from("departments")
        .select("id, name, code")
        .order("name"),
    ])

    if (classesRes.data) {
      setClassOptions(
        classesRes.data.map((c: any) => ({
          id: c.id,
          label: `${c.department?.code ?? c.name}-${c.section}`,
          name: c.name,
          section: c.section,
          deptName: c.department?.name ?? "",
          deptCode: c.department?.code ?? "",
        }))
      )
    }

    if (deptsRes.data) {
      setDeptOptions(
        deptsRes.data.map((d: any) => ({ id: d.id, name: d.name, code: d.code }))
      )
    }
  }, [])

  useEffect(() => {
    if (teacherId) fetchStudents()
  }, [teacherId, fetchStudents])

  useEffect(() => {
    fetchDropdownData()
  }, [fetchDropdownData])

  /* ---------- Filtering & pagination ---------- */

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.roll.toLowerCase().includes(search.toLowerCase())
      const matchesClass = classFilter === "all" || s.class === classFilter
      return matchesSearch && matchesClass
    })
  }, [students, search, classFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE))
  const paged = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE)

  const stats = useMemo(() => {
    const total = students.length
    const active = students.filter((s) => s.isActive).length
    const pending = students.filter((s) => s.faceStatus === "Pending").length
    return { total, active, pending }
  }, [students])

  // Unique class labels for filter dropdown
  const uniqueClasses = Array.from(new Set(students.map((s) => s.class))).filter((c) => c !== "—")

  /* ---------- Add Student ---------- */

  async function handleAddStudent() {
    if (!formName || !formRoll || !formClassId || !formYear || !formDeptId) {
      toast.error("Please fill in all fields")
      return
    }
    if (!teacherId) {
      toast.error("Teacher session not found. Please re-login.")
      return
    }

    setIsSubmitting(true)
    try {
      const supabase = createClient()

      // Step 1 — Generate student email
      const studentEmail = `${formRoll.toLowerCase()}@nnrg.student`

      // Step 2 — Create auth user via admin API route
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: studentEmail,
          password: "Student@1234",
          full_name: formName,
          role: "student"
        }),
      })

      const result = await res.json()

      if (!res.ok) {
        toast.error(result.error || "Failed to create user", { style: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" } })
        setIsSubmitting(false)
        return
      }

      const newUserId = result.userId
      if (!newUserId) {
        toast.error("Failed to create auth user.", { style: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" } })
        setIsSubmitting(false)
        return
      }

      // Step 3 — Insert into users
      const { error: userInsertError } = await supabase.from("users").insert({
        id: newUserId,
        email: studentEmail,
        full_name: formName,
        role: "student",
        must_change_password: false,
      })

      if (userInsertError) {
        toast.error(`Users insert failed: ${userInsertError.message}`, { style: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" } })
        return
      }

      // Step 4 & 5 — class_id and department_id already selected by UUID in dropdowns

      // Step 6 — Insert into students
      const { error: studentInsertError } = await supabase.from("students").insert({
        id: newUserId,
        roll_number: formRoll,
        department_id: formDeptId,
        class_id: formClassId,
        year: formYear,
        created_by: teacherId,
        is_active: true,
      })

      if (studentInsertError) {
        toast.error(`Students insert failed: ${studentInsertError.message}`, { style: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" } })
        return
      }

      // Step 7 — System log
      await supabase.from("system_logs").insert({
        performed_by: teacherId,
        action_type: "create",
        description: `Student account created for ${formName} (${formRoll})`,
      })

      toast.success("Student account created successfully. Default password is Student@1234")
      setSheetOpen(false)
      setFormName("")
      setFormRoll("")
      setFormClassId("")
      setFormDeptId("")
      setFormYear("")
      fetchStudents()
    } catch {
      toast.error("An unexpected error occurred.", { style: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" } })
    } finally {
      setIsSubmitting(false)
    }
  }

  /* ---------- Delete Student ---------- */

  async function handleDelete() {
    if (!deleteTarget || !teacherId) return

    setIsSubmitting(true)
    try {
      // The admin API route handles deleting from students, users, and auth
      const res = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: deleteTarget.id,
        }),
      })

      const result = await res.json()

      if (!res.ok) {
        toast.error(result.error || "Failed to delete student records", { style: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" } })
        return
      }

      toast.success(`${deleteTarget.name} has been removed`)
      fetchStudents()
    } catch {
      toast.error("An unexpected error occurred.", { style: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" } })
    } finally {
      setDeleteTarget(null)
      setIsSubmitting(false)
    }
  }

  /* ---------- Status badge ---------- */

  const faceStatusBadge = (status: Student["faceStatus"]) => {
    switch (status) {
      case "Approved":
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">Approved</Badge>
      case "Pending":
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50">Pending</Badge>
      case "Rejected":
        return <Badge className="bg-red-50 text-red-700 border-red-200 hover:bg-red-50">Rejected</Badge>
      case "None":
        return <Badge className="bg-muted text-muted-foreground border-border hover:bg-muted">Not Registered</Badge>
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Stat chips */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5">
          <Users className="size-4 text-primary" />
          <span className="text-sm text-muted-foreground">Total Students</span>
          <span className="text-sm font-semibold text-foreground">{isLoading ? "—" : stats.total}</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5">
          <UserCheck className="size-4 text-emerald-600" />
          <span className="text-sm text-muted-foreground">Active</span>
          <span className="text-sm font-semibold text-foreground">{isLoading ? "—" : stats.active}</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5">
          <UserCog className="size-4 text-amber-600" />
          <span className="text-sm text-muted-foreground">Pending Face Approval</span>
          <span className="text-sm font-semibold text-foreground">{isLoading ? "—" : stats.pending}</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or roll..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="pl-9"
            />
          </div>
          <Select value={classFilter} onValueChange={(v) => { setClassFilter(v); setPage(1) }}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {uniqueClasses.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setSheetOpen(true)} className="gap-2">
          <Plus className="size-4" />
          Add Student
        </Button>
      </div>

      {/* Error state */}
      {fetchError && (
        <div className="rounded-lg border border-border bg-card px-4 py-8 text-center">
          <p className="text-sm text-destructive">{fetchError}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={fetchStudents}>
            Retry
          </Button>
        </div>
      )}

      {/* Table — desktop */}
      <div className="hidden rounded-lg border border-border bg-card md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Student</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Roll Number</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Class</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Year</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Face Status</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <TableSkeleton />
              ) : paged.length === 0 && !fetchError ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    {students.length === 0
                      ? 'No students yet. Click "Add Student" to create one.'
                      : "No students found matching your search."}
                  </td>
                </tr>
              ) : (
                paged.map((student) => (
                  <tr key={student.id} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                            {getInitials(student.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-foreground">{student.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{student.roll}</td>
                    <td className="px-4 py-3 text-foreground">{student.class}</td>
                    <td className="px-4 py-3 text-muted-foreground">{student.year}</td>
                    <td className="px-4 py-3">{faceStatusBadge(student.faceStatus)}</td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label="Student actions">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(student)}>
                            <Trash2 className="size-4" />
                            Delete Student
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cards — mobile */}
      <div className="flex flex-col gap-3 md:hidden">
        {isLoading ? (
          <MobileSkeleton />
        ) : paged.length === 0 && !fetchError ? (
          <div className="rounded-lg border border-border bg-card px-4 py-12 text-center text-muted-foreground">
            {students.length === 0
              ? 'No students yet. Tap "Add Student" to create one.'
              : "No students found matching your search."}
          </div>
        ) : (
          paged.map((student) => (
            <div key={student.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="size-10">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                      {getInitials(student.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{student.name}</span>
                    <span className="text-xs text-muted-foreground font-mono">{student.roll}</span>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label="Student actions">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(student)}>
                      <Trash2 className="size-4" />
                      Delete Student
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{student.class}</span>
                <span className="text-xs text-muted-foreground">{student.year}</span>
                {faceStatusBadge(student.faceStatus)}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {!isLoading && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Showing {filtered.length === 0 ? 0 : (page - 1) * ROWS_PER_PAGE + 1}
            {" - "}
            {Math.min(page * ROWS_PER_PAGE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm font-medium text-foreground">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              aria-label="Next page"
            >
              <ChevronRight className="size-4" />
            </Button>
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
                <span>
                  Are you sure you want to delete <strong className="text-foreground">{deleteTarget?.name}</strong>?
                </span>
                <span className="text-destructive text-sm font-medium">
                  This action is permanent and cannot be undone. All attendance records for this student will be deleted.
                </span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Student Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Add New Student</SheetTitle>
            <SheetDescription>
              Enter the student details below. Default password is Student@1234.
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-5 px-4 py-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="student-name">Full Name</Label>
              <Input
                id="student-name"
                placeholder="Enter student name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="student-roll">Roll Number</Label>
              <Input
                id="student-roll"
                placeholder="e.g. 21CSE055"
                value={formRoll}
                onChange={(e) => setFormRoll(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="student-class">Class & Section</Label>
              <Select value={formClassId} onValueChange={setFormClassId}>
                <SelectTrigger id="student-class">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="student-dept">Department</Label>
              <Select value={formDeptId} onValueChange={setFormDeptId}>
                <SelectTrigger id="student-dept">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {deptOptions.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="student-year">Year</Label>
              <Select value={formYear} onValueChange={setFormYear}>
                <SelectTrigger id="student-year">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1st Year">1st Year</SelectItem>
                  <SelectItem value="2nd Year">2nd Year</SelectItem>
                  <SelectItem value="3rd Year">3rd Year</SelectItem>
                  <SelectItem value="4th Year">4th Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-border px-4 py-4 mt-auto">
            <Button variant="outline" onClick={() => setSheetOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddStudent} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Add Student"
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
