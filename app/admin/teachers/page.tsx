"use client"
import { useState, useEffect, useCallback } from "react"
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
import { Plus, MoreHorizontal, Pencil, KeyRound, ShieldOff, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Teacher {
  id: string
  name: string
  title: string
  initials: string
  teacherId: string
  department: string
  subjects: number
  status: "Active" | "Disabled"
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter((w) => w[0] && w[0] === w[0].toUpperCase())
    .map((w) => w[0])
    .join("")
    .slice(0, 2) || "NA"
}

export default function TeacherManagementPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [isLoadingTeachers, setIsLoadingTeachers] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [resetTarget, setResetTarget] = useState<Teacher | null>(null)
  const [disableTarget, setDisableTarget] = useState<Teacher | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [formTitle, setFormTitle] = useState("Mr")
  const [formName, setFormName] = useState("")
  const [formTeacherId, setFormTeacherId] = useState("")
  const [formDept, setFormDept] = useState("")
  const [formEmail, setFormEmail] = useState("")

  // Departments list for the form select
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
          department:departments ( name ),
          user:users ( full_name, email )
        `)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Fetch teachers error:", error)
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
        department: t.department?.name ?? "—",
        subjects: 0,
        status: t.is_active ? "Active" : "Disabled",
      }))
      setTeachers(mapped)
    } catch {
      setFetchError("An unexpected error occurred.")
    } finally {
      setIsLoadingTeachers(false)
    }
  }, [])

  const fetchDepartments = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("departments")
      .select("id, name, code")
      .order("name")
    if (data) setDepartments(data)
  }, [])

  useEffect(() => {
    fetchTeachers()
    fetchDepartments()
  }, [fetchTeachers, fetchDepartments])

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

      // Insert into public.users
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

      // Find department
      const selectedDept = departments.find((d) => d.name === formDept || d.code === formDept)
      if (!selectedDept) {
        toast.error(`Department "${formDept}" not found.`, {
          style: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },
        })
        setIsSubmitting(false)
        return
      }

      // Insert into public.teachers — including title
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

      // System log
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
        toast.success(`Password reset for ${resetTarget.name}. They will be forced to change it on next login.`)
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
            t.id === disableTarget.id
              ? { ...t, status: newStatus ? "Active" : "Disabled" }
              : t
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

  function SkeletonRows() {
    return (
      <>
        {[1, 2, 3].map((i) => (
          <tr key={i} className="border-b border-border last:border-0 animate-pulse">
            <td className="px-5 py-3">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-full bg-muted" />
                <div className="h-4 w-28 rounded bg-muted" />
              </div>
            </td>
            <td className="px-5 py-3"><div className="h-4 w-16 rounded bg-muted" /></td>
            <td className="px-5 py-3"><div className="h-4 w-12 rounded bg-muted" /></td>
            <td className="px-5 py-3 text-center"><div className="h-4 w-6 mx-auto rounded bg-muted" /></td>
            <td className="px-5 py-3"><div className="h-5 w-14 rounded-full bg-muted" /></td>
            <td className="px-5 py-3 text-right"><div className="size-8 ml-auto rounded bg-muted" /></td>
          </tr>
        ))}
      </>
    )
  }

  function MobileSkeletonCards() {
    return (
      <>
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-muted" />
                <div className="flex flex-col gap-2">
                  <div className="h-4 w-28 rounded bg-muted" />
                  <div className="h-3 w-16 rounded bg-muted" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-3 w-10 rounded bg-muted" />
                <div className="h-3 w-20 rounded bg-muted" />
                <div className="ml-auto h-5 w-14 rounded-full bg-muted" />
              </div>
            </CardContent>
          </Card>
        ))}
      </>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Manage teacher accounts and their permissions.
        </p>
        <Button onClick={() => setSheetOpen(true)} className="gap-2">
          <Plus className="size-4" />
          <span className="hidden sm:inline">Add Teacher</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {/* Error state */}
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

      {/* Desktop table */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-5 py-3 font-medium text-muted-foreground">Teacher</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">Teacher ID</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">Department</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground text-center">Subjects</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingTeachers ? (
                  <SkeletonRows />
                ) : teachers.length === 0 && !fetchError ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                      No teachers found. Click &ldquo;Add Teacher&rdquo; to create one.
                    </td>
                  </tr>
                ) : (
                  teachers.map((t) => (
                    <tr key={t.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-9">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                              {t.initials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-foreground">{t.title}. {t.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 font-mono text-muted-foreground">{t.teacherId}</td>
                      <td className="px-5 py-3 text-muted-foreground">{t.department}</td>
                      <td className="px-5 py-3 text-center font-semibold text-foreground">{t.subjects}</td>
                      <td className="px-5 py-3">
                        <Badge
                          variant={t.status === "Active" ? "secondary" : "outline"}
                          className={t.status === "Active" ? "bg-emerald-500/10 text-emerald-600 border-emerald-200" : "bg-muted text-muted-foreground"}
                        >
                          {t.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" aria-label="Teacher actions">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Mobile cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {isLoadingTeachers ? (
          <MobileSkeletonCards />
        ) : teachers.length === 0 && !fetchError ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No teachers found. Tap &ldquo;Add&rdquo; to create one.
            </CardContent>
          </Card>
        ) : (
          teachers.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-10">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                        {t.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{t.title}. {t.name}</span>
                      <span className="text-xs text-muted-foreground font-mono">{t.teacherId}</span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label="Teacher actions">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
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
                <div className="mt-3 flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground">{t.department}</span>
                  <span className="text-muted-foreground">{'|'}</span>
                  <span className="text-muted-foreground">{t.subjects} subjects</span>
                  <Badge
                    variant={t.status === "Active" ? "secondary" : "outline"}
                    className={t.status === "Active" ? "ml-auto bg-emerald-500/10 text-emerald-600 border-emerald-200" : "ml-auto bg-muted text-muted-foreground"}
                  >
                    {t.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add Teacher Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Add Teacher</SheetTitle>
            <SheetDescription>
              Create a new teacher account. A default password will be assigned automatically.
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-5 py-6">
            {/* Title */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="teacher-title">Title</Label>
              <Select value={formTitle} onValueChange={setFormTitle}>
                <SelectTrigger id="teacher-title">
                  <SelectValue placeholder="Select title" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mr">Mr</SelectItem>
                  <SelectItem value="Ms">Ms</SelectItem>
                  <SelectItem value="Mrs">Mrs</SelectItem>
                  <SelectItem value="Dr">Dr</SelectItem>
                  <SelectItem value="Prof">Prof</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Full Name */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="teacher-name">Full Name</Label>
              <Input
                id="teacher-name"
                placeholder="Full Name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            {/* Teacher ID */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="teacher-id">Teacher ID</Label>
              <Input
                id="teacher-id"
                placeholder="TCH006"
                value={formTeacherId}
                onChange={(e) => setFormTeacherId(e.target.value)}
              />
            </div>
            {/* Department */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="teacher-dept">Department</Label>
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
            {/* Email */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="teacher-email">Email</Label>
              <Input
                id="teacher-email"
                type="email"
                placeholder="teacher@nnrg.edu.in"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
              />
            </div>
            <div className="rounded-lg bg-muted/60 px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Default password will be assigned automatically. The teacher will be forced to change it on first login.
              </p>
            </div>
            <Button onClick={handleAddTeacher} className="mt-2" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Add Teacher"
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Reset Password Dialog */}
      <AlertDialog open={!!resetTarget} onOpenChange={() => setResetTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Password</AlertDialogTitle>
            <AlertDialogDescription>
              Reset password for <span className="font-semibold text-foreground">{resetTarget?.name}</span> to
              default password? Teacher will be forced to change it on next login.
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

      {/* Disable Account Dialog */}
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
                  <span className="font-semibold text-foreground">{disableTarget?.name}</span>{"'s"} account?
                  They will not be able to log in or conduct attendance sessions until re-enabled.
                </>
              ) : (
                <>
                  Re-enable{" "}
                  <span className="font-semibold text-foreground">{disableTarget?.name}</span>{"'s"} account?
                  They will regain access to the system.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisableAccount}
              disabled={isSubmitting}
              className={disableTarget?.status === "Active" ? "bg-destructive text-white hover:bg-destructive/90" : ""}
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                disableTarget?.status === "Active" ? "Disable" : "Enable"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}