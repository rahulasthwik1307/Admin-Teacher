"use client"
import { useState, useEffect, useCallback, useMemo } from "react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  Plus,
  MoreHorizontal,
  Pencil,
  KeyRound,
  ShieldOff,
  Loader2,
  Search,
  Building2,
  ChevronDown,
  ChevronRight,
  Users,
  UserCheck,
  X,
  GraduationCap,
  Mail,
  Hash,
  BookOpen,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Teacher {
  id: string
  name: string
  title: string
  initials: string
  teacherId: string
  department: string
  departmentId: string
  subjects: number
  status: "Active" | "Disabled"
}

function getInitials(name: string): string {
  return (
    name
      .split(" ")
      .filter((w) => w[0] && w[0] === w[0].toUpperCase())
      .map((w) => w[0])
      .join("")
      .slice(0, 2) || "NA"
  )
}

const avatarColors = [
  "bg-primary/15 text-primary",
  "bg-emerald-500/15 text-emerald-700",
  "bg-amber-500/15 text-amber-700",
  "bg-violet-500/15 text-violet-700",
  "bg-rose-500/15 text-rose-700",
  "bg-blue-500/15 text-blue-700",
]

function getAvatarColor(name: string): string {
  const index = name.charCodeAt(0) % avatarColors.length
  return avatarColors[index]
}

export default function TeacherManagementPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [isLoadingTeachers, setIsLoadingTeachers] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [resetTarget, setResetTarget] = useState<Teacher | null>(null)
  const [disableTarget, setDisableTarget] = useState<Teacher | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [editTarget, setEditTarget] = useState<Teacher | null>(null)
  const [editSheetOpen, setEditSheetOpen] = useState(false)
  const [editTitle, setEditTitle] = useState("Mr")
  const [editName, setEditName] = useState("")
  const [editDept, setEditDept] = useState("")

  // Search & filter
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>("all")
  const [collapsedDepts, setCollapsedDepts] = useState<Set<string>>(new Set())

  // Form state
  const [formTitle, setFormTitle] = useState("Mr")
  const [formName, setFormName] = useState("")
  const [formTeacherId, setFormTeacherId] = useState("")
  const [formDept, setFormDept] = useState("")
  const [formEmail, setFormEmail] = useState("")

  const [departments, setDepartments] = useState<{ id: string; name: string; code: string }[]>([])

  const fetchTeachers = useCallback(async () => {
    setIsLoadingTeachers(true)
    setFetchError(null)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("teachers")
        .select(`
          id,
          teacher_id_code,
          is_active,
          title,
          department_id,
          department:departments ( id, name ),
          user:users ( full_name, email )
        `)
        .order("created_at", { ascending: false })

      if (error) {
        setFetchError("Failed to load teachers. Please refresh.")
        setIsLoadingTeachers(false)
        return
      }

      const mapped: Teacher[] = (data || []).map((t: any) => ({
        id: t.id,
        name: t.user?.full_name ?? "Unknown",
        title: t.title ?? "Mr",
        initials: getInitials(t.user?.full_name ?? ""),
        teacherId: t.teacher_id_code,
        department: t.department?.name ?? "Unassigned",
        departmentId: t.department?.id ?? "unassigned",
        subjects: 0,
        status: t.is_active ? "Active" : "Disabled",
      }))

      const { data: assignments } = await supabase
        .from("teacher_assignments")
        .select("teacher_id")

      const countMap: Record<string, number> = {}
      for (const a of assignments || []) {
        countMap[a.teacher_id] = (countMap[a.teacher_id] || 0) + 1
      }

      setTeachers(mapped.map((t) => ({ ...t, subjects: countMap[t.id] || 0 })))
    } catch {
      setFetchError("An unexpected error occurred.")
    } finally {
      setIsLoadingTeachers(false)
    }
  }, [])

  const fetchDepartments = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase.from("departments").select("id, name, code").order("name")
    if (data) setDepartments(data)
  }, [])

  useEffect(() => {
    fetchTeachers()
    fetchDepartments()
  }, [fetchTeachers, fetchDepartments])

  // ── Filtered teachers ──
  const filteredTeachers = useMemo(() => {
    let result = teachers
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.teacherId.toLowerCase().includes(q) ||
          t.department.toLowerCase().includes(q)
      )
    }
    if (selectedDeptFilter !== "all") {
      result = result.filter((t) => t.department === selectedDeptFilter)
    }
    return result
  }, [teachers, searchQuery, selectedDeptFilter])

  // ── Group by department ──
  const groupedTeachers = useMemo(() => {
    const groups: Record<string, Teacher[]> = {}
    for (const t of filteredTeachers) {
      const key = t.department || "Unassigned"
      if (!groups[key]) groups[key] = []
      groups[key].push(t)
    }
    // Sort: Unassigned last
    return Object.entries(groups).sort(([a], [b]) => {
      if (a === "Unassigned") return 1
      if (b === "Unassigned") return -1
      return a.localeCompare(b)
    })
  }, [filteredTeachers])

  const uniqueDepts = useMemo(
    () => [...new Set(teachers.map((t) => t.department))].sort(),
    [teachers]
  )

  function toggleDept(dept: string) {
    setCollapsedDepts((prev) => {
      const next = new Set(prev)
      if (next.has(dept)) next.delete(dept)
      else next.add(dept)
      return next
    })
  }

  // ── Handlers ──
  async function handleAddTeacher() {
    if (!formName || !formTeacherId || !formDept) {
      toast.error("Please fill all required fields")
      return
    }
    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const teacherEmail = `${formTeacherId.toLowerCase()}@nnrg.edu.in`

      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: teacherEmail,
          password: "Teacher@1234",
          full_name: formName,
          role: "teacher",
        }),
      })
      const result = await res.json()
      if (!res.ok) {
        toast.error(result.error || "Failed to create user", {
          style: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },
        })
        setIsSubmitting(false)
        return
      }

      const newUserId = result.userId
      if (!newUserId) {
        toast.error("Failed to create auth user — no user ID returned.", {
          style: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },
        })
        setIsSubmitting(false)
        return
      }

      const { error: userInsertError } = await supabase.from("users").insert({
        id: newUserId,
        email: teacherEmail,
        full_name: formName,
        role: "teacher",
        must_change_password: true,
      })
      if (userInsertError) {
        toast.error(`Users insert failed: ${userInsertError.message}`, {
          style: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },
        })
        setIsSubmitting(false)
        return
      }

      const selectedDept = departments.find((d) => d.name === formDept || d.code === formDept)
      if (!selectedDept) {
        toast.error(`Department "${formDept}" not found.`, {
          style: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },
        })
        setIsSubmitting(false)
        return
      }

      const { error: teacherInsertError } = await supabase.from("teachers").insert({
        id: newUserId,
        teacher_id_code: formTeacherId,
        department_id: selectedDept.id,
        is_active: true,
        title: formTitle,
      })
      if (teacherInsertError) {
        toast.error(`Teachers insert failed: ${teacherInsertError.message}`, {
          style: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },
        })
        setIsSubmitting(false)
        return
      }

      const { data: { user: adminUser } } = await supabase.auth.getUser()
      if (adminUser) {
        await supabase.from("system_logs").insert({
          performed_by: adminUser.id,
          action_type: "create",
          description: `Teacher account created for ${formName}`,
        })
      }

      toast.success("Teacher account created successfully")
      setSheetOpen(false)
      setFormTitle("Mr")
      setFormName("")
      setFormTeacherId("")
      setFormDept("")
      setFormEmail("")
      fetchTeachers()
    } catch {
      toast.error("An unexpected error occurred.", {
        style: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleResetPassword() {
    if (!resetTarget) return
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: resetTarget.id }),
      })
      const result = await res.json()
      if (!res.ok) {
        toast.error(result.error || "Failed to reset password", {
          style: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },
        })
      } else {
        toast.success(`Password reset for ${resetTarget.name}.`)
      }
    } catch {
      toast.error("An unexpected error occurred.", {
        style: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },
      })
    } finally {
      setResetTarget(null)
      setIsSubmitting(false)
    }
  }

  async function handleDisableAccount() {
    if (!disableTarget) return
    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const newStatus = disableTarget.status === "Active" ? false : true
      const { error } = await supabase
        .from("teachers")
        .update({ is_active: newStatus })
        .eq("id", disableTarget.id)

      if (error) {
        toast.error(`Failed to update account: ${error.message}`, {
          style: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },
        })
      } else {
        const action = disableTarget.status === "Active" ? "disabled" : "enabled"
        toast.success(`${disableTarget.name}'s account has been ${action}.`)
        setTeachers((prev) =>
          prev.map((t) =>
            t.id === disableTarget.id ? { ...t, status: newStatus ? "Active" : "Disabled" } : t
          )
        )
      }
    } catch {
      toast.error("An unexpected error occurred.", {
        style: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },
      })
    } finally {
      setDisableTarget(null)
      setIsSubmitting(false)
    }
  }

  async function handleEditTeacher() {
    if (!editTarget) return
    if (!editName.trim() || !editDept) {
      toast.error("Please fill all required fields")
      return
    }
    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const selectedDept = departments.find((d) => d.name === editDept)
      if (!selectedDept) {
        toast.error("Department not found")
        setIsSubmitting(false)
        return
      }

      const { error: teacherError } = await supabase
        .from("teachers")
        .update({ title: editTitle, department_id: selectedDept.id })
        .eq("id", editTarget.id)
      if (teacherError) {
        toast.error(`Failed to update teacher: ${teacherError.message}`)
        setIsSubmitting(false)
        return
      }

      const { error: userError } = await supabase
        .from("users")
        .update({ full_name: editName.trim() })
        .eq("id", editTarget.id)
      if (userError) {
        toast.error(`Failed to update name: ${userError.message}`)
        setIsSubmitting(false)
        return
      }

      const { data: { user: adminUser } } = await supabase.auth.getUser()
      if (adminUser) {
        await supabase.from("system_logs").insert({
          performed_by: adminUser.id,
          action_type: "update",
          description: `Teacher profile updated for ${editName.trim()}`,
        })
      }

      toast.success("Teacher updated successfully")
      setEditSheetOpen(false)
      setEditTarget(null)
      fetchTeachers()
    } catch {
      toast.error("An unexpected error occurred.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Stats strip ──
  const activeCount = teachers.filter((t) => t.status === "Active").length
  const disabledCount = teachers.filter((t) => t.status === "Disabled").length

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
            <Users className="size-3.5" />
            {teachers.length} Total
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-700">
            <UserCheck className="size-3.5" />
            {activeCount} Active
          </div>
          {disabledCount > 0 && (
            <div className="flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-700">
              <ShieldOff className="size-3.5" />
              {disabledCount} Disabled
            </div>
          )}
        </div>
        <Button onClick={() => setSheetOpen(true)} className="gap-2 self-start sm:self-auto">
          <Plus className="size-4" />
          <span className="hidden sm:inline">Add Teacher</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {/* ── Search & Filter Bar ── */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or teacher ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <Select value={selectedDeptFilter} onValueChange={setSelectedDeptFilter}>
          <SelectTrigger className="w-full sm:w-56">
            <div className="flex items-center gap-2">
              <Building2 className="size-4 text-muted-foreground" />
              <SelectValue placeholder="All Departments" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {uniqueDepts.map((dept) => (
              <SelectItem key={dept} value={dept}>
                {dept}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Error state ── */}
      {fetchError && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-destructive">{fetchError}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={fetchTeachers}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Loading skeleton ── */}
      {isLoadingTeachers && (
        <div className="flex flex-col gap-4">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="p-0">
                <div className="border-b border-border px-5 py-3 animate-pulse">
                  <div className="h-4 w-48 rounded bg-muted" />
                </div>
                {[1, 2, 3].map((j) => (
                  <div key={j} className="flex items-center gap-3 border-b border-border px-5 py-3 animate-pulse last:border-0">
                    <div className="size-9 rounded-full bg-muted" />
                    <div className="flex flex-1 gap-8">
                      <div className="h-4 w-28 rounded bg-muted" />
                      <div className="h-4 w-16 rounded bg-muted" />
                      <div className="h-4 w-32 rounded bg-muted" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Grouped Teacher List ── */}
      {!isLoadingTeachers && !fetchError && (
        <div className="flex flex-col gap-4">
          {groupedTeachers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Search className="mx-auto size-8 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No teachers found matching your search.
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => { setSearchQuery(""); setSelectedDeptFilter("all") }}
                >
                  Clear filters
                </Button>
              </CardContent>
            </Card>
          ) : (
            groupedTeachers.map(([dept, deptTeachers]) => {
              const isCollapsed = collapsedDepts.has(dept)
              const activeInDept = deptTeachers.filter((t) => t.status === "Active").length
              return (
                <Card key={dept} className="overflow-hidden">
                  {/* Department Header */}
                  <button
                    onClick={() => toggleDept(dept)}
                    className="flex w-full items-center justify-between border-b border-border bg-muted/40 px-5 py-3 text-left transition-colors hover:bg-muted/60"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-7 items-center justify-center rounded-md bg-primary/10">
                        <Building2 className="size-3.5 text-primary" />
                      </div>
                      <span className="text-sm font-semibold text-foreground">{dept}</span>
                      <Badge variant="secondary" className="text-xs">
                        {deptTeachers.length} teacher{deptTeachers.length !== 1 ? "s" : ""}
                      </Badge>
                      {activeInDept > 0 && (
                        <span className="text-xs text-emerald-600">
                          {activeInDept} active
                        </span>
                      )}
                    </div>
                    {isCollapsed ? (
                      <ChevronRight className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    )}
                  </button>

                  {/* Teachers in dept — Desktop */}
                  {!isCollapsed && (
                    <>
                      <div className="hidden md:block">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left">
                              <th className="px-5 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Teacher
                              </th>
                              <th className="px-5 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Teacher ID
                              </th>
                              <th className="px-5 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground text-center">
                                Subjects
                              </th>
                              <th className="px-5 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Status
                              </th>
                              <th className="px-5 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground text-right">
                                Action
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {deptTeachers.map((t) => (
                              <tr
                                key={t.id}
                                className="border-t border-border transition-colors hover:bg-muted/20"
                              >
                                <td className="px-5 py-3">
                                  <div className="flex items-center gap-3">
                                    <Avatar className="size-9">
                                      <AvatarFallback
                                        className={`text-xs font-semibold ${getAvatarColor(t.name)}`}
                                      >
                                        {t.initials}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                      <span className="font-medium text-foreground">
                                        {t.title}. {t.name}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {t.subjects > 0
                                          ? `${t.subjects} subject${t.subjects !== 1 ? "s" : ""} assigned`
                                          : "No subjects assigned"}
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-5 py-3">
                                  <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                                    {t.teacherId}
                                  </span>
                                </td>
                                <td className="px-5 py-3 text-center">
                                  <span className="font-semibold text-foreground">{t.subjects}</span>
                                </td>
                                <td className="px-5 py-3">
                                  <Badge
                                    variant={t.status === "Active" ? "secondary" : "outline"}
                                    className={
                                      t.status === "Active"
                                        ? "bg-emerald-500/10 text-emerald-700 border-emerald-200"
                                        : "bg-muted text-muted-foreground"
                                    }
                                  >
                                    <span
                                      className={`mr-1.5 inline-block size-1.5 rounded-full ${
                                        t.status === "Active" ? "bg-emerald-500" : "bg-muted-foreground"
                                      }`}
                                    />
                                    {t.status}
                                  </Badge>
                                </td>
                                <td className="px-5 py-3 text-right">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        aria-label="Teacher actions"
                                      >
                                        <MoreHorizontal className="size-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setEditTarget(t)
                                          setEditTitle(t.title)
                                          setEditName(t.name)
                                          setEditDept(t.department)
                                          setEditSheetOpen(true)
                                        }}
                                      >
                                        <Pencil className="size-4" />
                                        Edit Teacher
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => setResetTarget(t)}>
                                        <KeyRound className="size-4" />
                                        Reset Password
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        variant="destructive"
                                        onClick={() => setDisableTarget(t)}
                                      >
                                        <ShieldOff className="size-4" />
                                        {t.status === "Active" ? "Disable Account" : "Enable Account"}
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile cards */}
                      <div className="flex flex-col gap-0 md:hidden">
                        {deptTeachers.map((t, idx) => (
                          <div
                            key={t.id}
                            className={`flex items-start justify-between p-4 ${
                              idx !== 0 ? "border-t border-border" : ""
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="size-10">
                                <AvatarFallback
                                  className={`text-sm font-semibold ${getAvatarColor(t.name)}`}
                                >
                                  {t.initials}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col gap-0.5">
                                <span className="font-medium text-foreground">
                                  {t.title}. {t.name}
                                </span>
                                <span className="font-mono text-xs text-muted-foreground">
                                  {t.teacherId}
                                </span>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs text-muted-foreground">
                                    {t.subjects} subjects
                                  </span>
                                  <Badge
                                    variant={t.status === "Active" ? "secondary" : "outline"}
                                    className={
                                      t.status === "Active"
                                        ? "bg-emerald-500/10 text-emerald-700 border-emerald-200 text-[10px] px-1.5 py-0"
                                        : "bg-muted text-muted-foreground text-[10px] px-1.5 py-0"
                                    }
                                  >
                                    {t.status}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon-sm" aria-label="Teacher actions">
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditTarget(t)
                                    setEditTitle(t.title)
                                    setEditName(t.name)
                                    setEditDept(t.department)
                                    setEditSheetOpen(true)
                                  }}
                                >
                                  <Pencil className="size-4" />
                                  Edit Teacher
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setResetTarget(t)}>
                                  <KeyRound className="size-4" />
                                  Reset Password
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => setDisableTarget(t)}
                                >
                                  <ShieldOff className="size-4" />
                                  {t.status === "Active" ? "Disable Account" : "Enable Account"}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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

      {/* ── Add Teacher Sheet ── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add Teacher</SheetTitle>
            <SheetDescription>
              Create a new teacher account. A default password will be assigned automatically.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-5 py-6">
            {/* Title */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="teacher-title" className="flex items-center gap-1.5 text-sm font-medium">
                <GraduationCap className="size-3.5 text-muted-foreground" />
                Title
              </Label>
              <Select value={formTitle} onValueChange={setFormTitle}>
                <SelectTrigger id="teacher-title">
                  <SelectValue placeholder="Select title" />
                </SelectTrigger>
                <SelectContent>
                  {["Mr", "Ms", "Mrs", "Dr", "Prof"].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Full Name */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="teacher-name" className="flex items-center gap-1.5 text-sm font-medium">
                <Users className="size-3.5 text-muted-foreground" />
                Full Name
              </Label>
              <Input
                id="teacher-name"
                placeholder="e.g. Priya Sharma"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            {/* Teacher ID */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="teacher-id" className="flex items-center gap-1.5 text-sm font-medium">
                <Hash className="size-3.5 text-muted-foreground" />
                Teacher ID
              </Label>
              <Input
                id="teacher-id"
                placeholder="e.g. TCH006"
                value={formTeacherId}
                onChange={(e) => setFormTeacherId(e.target.value)}
              />
              {formTeacherId && (
                <p className="text-xs text-muted-foreground">
                  Email will be:{" "}
                  <span className="font-mono font-medium text-foreground">
                    {formTeacherId.toLowerCase()}@nnrg.edu.in
                  </span>
                </p>
              )}
            </div>

            {/* Department */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="teacher-dept" className="flex items-center gap-1.5 text-sm font-medium">
                <Building2 className="size-3.5 text-muted-foreground" />
                Department
              </Label>
              <Select value={formDept} onValueChange={setFormDept}>
                <SelectTrigger id="teacher-dept">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.name}>
                      {d.name} ({d.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Email (display only) */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="teacher-email" className="flex items-center gap-1.5 text-sm font-medium">
                <Mail className="size-3.5 text-muted-foreground" />
                Email
              </Label>
              <Input
                id="teacher-email"
                type="email"
                placeholder="teacher@nnrg.edu.in"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
              />
            </div>

            {/* Info note */}
            <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3.5">
              <KeyRound className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-amber-800">Default Password</span>
                <span className="text-xs text-amber-700">
                  Teacher will be assigned a default password and forced to change it on first login.
                </span>
              </div>
            </div>

            <Button onClick={handleAddTeacher} className="mt-1" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="size-4" />
                  Add Teacher
                </>
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Reset Password Dialog ── */}
      <AlertDialog open={!!resetTarget} onOpenChange={() => setResetTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Password</AlertDialogTitle>
            <AlertDialogDescription>
              Reset password for{" "}
              <span className="font-semibold text-foreground">{resetTarget?.name}</span> to default?
              They will be forced to change it on next login.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetPassword} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : "Reset"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Disable Account Dialog ── */}
      <AlertDialog open={!!disableTarget} onOpenChange={() => setDisableTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {disableTarget?.status === "Active" ? "Disable Account" : "Enable Account"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {disableTarget?.status === "Active" ? (
                <>
                  Are you sure you want to disable{" "}
                  <span className="font-semibold text-foreground">{disableTarget?.name}</span>
                  {"'s"} account? They will not be able to log in until re-enabled.
                </>
              ) : (
                <>
                  Re-enable{" "}
                  <span className="font-semibold text-foreground">{disableTarget?.name}</span>
                  {"'s"} account? They will regain full access.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisableAccount}
              disabled={isSubmitting}
              className={
                disableTarget?.status === "Active"
                  ? "bg-destructive text-white hover:bg-destructive/90"
                  : ""
              }
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : disableTarget?.status === "Active" ? (
                "Disable"
              ) : (
                "Enable"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Edit Teacher Sheet ── */}
      <Sheet
        open={editSheetOpen}
        onOpenChange={(open) => {
          setEditSheetOpen(open)
          if (!open) setEditTarget(null)
        }}
      >
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Teacher</SheetTitle>
            <SheetDescription>
              Update teacher details. Teacher ID and email cannot be changed.
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-5 py-6">
            {/* Title */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-teacher-title" className="flex items-center gap-1.5 text-sm font-medium">
                <GraduationCap className="size-3.5 text-muted-foreground" />
                Title
              </Label>
              <Select value={editTitle} onValueChange={setEditTitle}>
                <SelectTrigger id="edit-teacher-title">
                  <SelectValue placeholder="Select title" />
                </SelectTrigger>
                <SelectContent>
                  {["Mr", "Ms", "Mrs", "Dr", "Prof"].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Full Name */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-teacher-name" className="flex items-center gap-1.5 text-sm font-medium">
                <Users className="size-3.5 text-muted-foreground" />
                Full Name
              </Label>
              <Input
                id="edit-teacher-name"
                placeholder="Full Name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>

            {/* Department */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-teacher-dept" className="flex items-center gap-1.5 text-sm font-medium">
                <Building2 className="size-3.5 text-muted-foreground" />
                Department
              </Label>
              <Select value={editDept} onValueChange={setEditDept}>
                <SelectTrigger id="edit-teacher-dept">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.name}>
                      {d.name} ({d.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleEditTeacher} className="mt-2" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}