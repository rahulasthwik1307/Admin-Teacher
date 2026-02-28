"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
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
import { Plus, Trash2, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

/* ---------- Interfaces ---------- */

interface Assignment {
  id: string
  teacher: string
  subject: string
  classSection: string
  department: string
  date: string
}

interface TeacherOption {
  id: string
  name: string
}

interface SubjectOption {
  id: string
  name: string
  deptCode: string
}

interface ClassOption {
  id: string
  label: string          // e.g. "CSE-A"
  deptCode: string
}

interface DeptOption {
  code: string
  name: string
}

/* ---------- Skeleton ---------- */

function TableSkeleton() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <tr key={i} className="border-b border-border last:border-0 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((j) => (
            <td key={j} className="px-5 py-3">
              <div className="h-4 w-20 rounded bg-muted" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

function MobileCardSkeleton() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-4 animate-pulse">
            <div className="h-4 w-32 rounded bg-muted" />
            <div className="mt-2 h-3 w-24 rounded bg-muted" />
            <div className="mt-2 h-3 w-40 rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </>
  )
}

/* ---------- Component ---------- */

export default function TeacherAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Dropdown data
  const [teacherOptions, setTeacherOptions] = useState<TeacherOption[]>([])
  const [subjectOptions, setSubjectOptions] = useState<SubjectOption[]>([])
  const [classOptions, setClassOptions] = useState<ClassOption[]>([])
  const [deptOptions, setDeptOptions] = useState<DeptOption[]>([])

  // Filters
  const [filterClass, setFilterClass] = useState("all")
  const [filterDept, setFilterDept] = useState("all")

  // Sheet & dialog
  const [sheetOpen, setSheetOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<Assignment | null>(null)

  // Form state — stores UUIDs
  const [formTeacherId, setFormTeacherId] = useState("")
  const [formSubjectId, setFormSubjectId] = useState("")
  const [formClassId, setFormClassId] = useState("")
  const [formDeptCode, setFormDeptCode] = useState("")

  /* ---------- Fetch dropdown data ---------- */

  const fetchDropdownData = useCallback(async () => {
    const supabase = createClient()

    // Fetch all three in parallel
    const [teachersRes, subjectsRes, classesRes] = await Promise.all([
      supabase
        .from("teachers")
        .select("id, user:users ( full_name )")
        .eq("is_active", true),
      supabase
        .from("subjects")
        .select("id, name, department:departments ( code )")
        .order("name"),
      supabase
        .from("classes")
        .select("id, name, section, department:departments ( code, name )")
        .order("name"),
    ])

    console.log("Teachers fetch response:", teachersRes)
    console.log("Subjects fetch response:", subjectsRes)
    console.log("Classes fetch response:", classesRes)

    if (teachersRes.data) {
      setTeacherOptions(
        teachersRes.data.map((t: any) => ({
          id: t.id,
          name: t.user?.full_name ?? "Unknown",
        }))
      )
    }

    if (subjectsRes.data) {
      setSubjectOptions(
        subjectsRes.data.map((s: any) => ({
          id: s.id,
          name: s.name,
          deptCode: s.department?.code ?? "",
        }))
      )
    }

    if (classesRes.data) {
      setClassOptions(
        classesRes.data.map((c: any) => ({
          id: c.id,
          label: `${c.name}-${c.section}`,
          deptCode: c.department?.code ?? "",
        }))
      )

      // Derive unique departments from classes
      const deptMap = new Map<string, string>()
      for (const c of classesRes.data as any[]) {
        if (c.department?.code) {
          deptMap.set(c.department.code, c.department.name)
        }
      }
      setDeptOptions(
        Array.from(deptMap.entries()).map(([code, name]) => ({ code, name }))
      )
    }
  }, [])

  /* ---------- Fetch assignments ---------- */

  const fetchAssignments = useCallback(async () => {
    setIsLoading(true)
    setFetchError(null)

    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from("teacher_assignments")
        .select(`
          id,
          assigned_at,
          teacher:teachers ( id, user:users ( full_name ) ),
          subject:subjects ( name ),
          class:classes ( name, section, department:departments ( code ) )
        `)
        .order("assigned_at", { ascending: false })

      if (error) {
        console.error("Fetch assignments error:", error)
        setFetchError("Failed to load assignments.")
        return
      }

      const mapped: Assignment[] = (data || []).map((a: any) => ({
        id: a.id,
        teacher: a.teacher?.user?.full_name ?? "Unknown",
        subject: a.subject?.name ?? "—",
        classSection: a.class ? `${a.class.name}-${a.class.section}` : "—",
        department: a.class?.department?.code ?? "—",
        date: a.assigned_at
          ? new Date(a.assigned_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "—",
      }))

      setAssignments(mapped)
    } catch {
      setFetchError("An unexpected error occurred.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDropdownData()
    fetchAssignments()
  }, [fetchDropdownData, fetchAssignments])

  /* ---------- Filtered assignments ---------- */

  const filtered = assignments.filter((a) => {
    if (filterClass !== "all" && a.classSection !== filterClass) return false
    if (filterDept !== "all" && a.department !== filterDept) return false
    return true
  })

  /* ---------- Auto-fill department on subject change ---------- */

  function handleSubjectChange(subjectId: string) {
    setFormSubjectId(subjectId)
    const found = subjectOptions.find((s) => s.id === subjectId)
    if (found) setFormDeptCode(found.deptCode)
  }

  /* ---------- Add assignment ---------- */

  async function handleAssign() {
    if (!formTeacherId || !formSubjectId || !formClassId) {
      toast.error("Please fill all fields")
      return
    }

    setIsSubmitting(true)
    try {
      const supabase = createClient()

      const { error } = await supabase.from("teacher_assignments").insert({
        teacher_id: formTeacherId,
        subject_id: formSubjectId,
        class_id: formClassId,
      })

      if (error) {
        toast.error(`Failed: ${error.message}`, {
          style: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },
        })
        return
      }

      // System log
      const { data: { user } } = await supabase.auth.getUser()
      const teacherName = teacherOptions.find((t) => t.id === formTeacherId)?.name ?? ""
      const subjectName = subjectOptions.find((s) => s.id === formSubjectId)?.name ?? ""
      const className = classOptions.find((c) => c.id === formClassId)?.label ?? ""

      if (user) {
        await supabase.from("system_logs").insert({
          performed_by: user.id,
          action_type: "assign",
          description: `Teacher ${teacherName} assigned to ${subjectName} — ${className}`,
        })
      }

      toast.success(`${teacherName} assigned to ${subjectName} — ${className}`)
      setSheetOpen(false)
      setFormTeacherId("")
      setFormSubjectId("")
      setFormClassId("")
      setFormDeptCode("")
      fetchAssignments()
    } catch {
      toast.error("An unexpected error occurred.", {
        style: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  /* ---------- Remove assignment ---------- */

  async function handleRemove() {
    if (!removeTarget) return

    setIsSubmitting(true)
    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("teacher_assignments")
        .delete()
        .eq("id", removeTarget.id)

      if (error) {
        toast.error(`Failed: ${error.message}`, {
          style: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },
        })
        return
      }

      // System log
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from("system_logs").insert({
          performed_by: user.id,
          action_type: "delete",
          description: `Assignment removed: ${removeTarget.teacher} — ${removeTarget.subject} (${removeTarget.classSection})`,
        })
      }

      toast.success(`Assignment removed for ${removeTarget.teacher}`)
      fetchAssignments()
    } catch {
      toast.error("An unexpected error occurred.", {
        style: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },
      })
    } finally {
      setRemoveTarget(null)
      setIsSubmitting(false)
    }
  }

  /* ---------- Assignment Overview (teacher counts) ---------- */

  function getTeacherCounts() {
    const counts: Record<string, number> = {}
    for (const a of assignments) {
      counts[a.teacher] = (counts[a.teacher] || 0) + 1
    }
    // Include all teachers even if 0 assignments
    for (const t of teacherOptions) {
      if (!counts[t.name]) counts[t.name] = 0
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }

  const teacherCounts = getTeacherCounts()
  const maxSubjects = Math.max(5, ...teacherCounts.map(([, c]) => c))

  // Derive unique class labels for filter dropdown
  const uniqueClasses = Array.from(new Set(assignments.map((a) => a.classSection))).filter(
    (c) => c !== "—"
  )

  return (
    <div className="flex flex-col gap-6">
      {/* Subtitle + filters + add button */}
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Assign teachers to classes and subjects.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={filterClass} onValueChange={setFilterClass}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {uniqueClasses.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterDept} onValueChange={setFilterDept}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {deptOptions.map((d) => (
                  <SelectItem key={d.code} value={d.code}>
                    {d.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setSheetOpen(true)} className="gap-2 self-start sm:self-auto">
            <Plus className="size-4" />
            Add Assignment
          </Button>
        </div>
      </div>

      {/* Error state */}
      {fetchError && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-destructive">{fetchError}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={fetchAssignments}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Assignments table — desktop */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-5 py-3 font-medium text-muted-foreground">Teacher Name</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">Subject</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">Class & Section</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">Department</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">Assigned Date</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <TableSkeleton />
                ) : filtered.length === 0 && !fetchError ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                      {assignments.length === 0
                        ? 'No assignments yet. Click "Add Assignment" to create one.'
                        : "No assignments found matching the selected filters."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((a) => (
                    <tr key={a.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-3 font-medium text-foreground">{a.teacher}</td>
                      <td className="px-5 py-3 text-foreground">{a.subject}</td>
                      <td className="px-5 py-3 text-muted-foreground">{a.classSection}</td>
                      <td className="px-5 py-3 text-muted-foreground">{a.department}</td>
                      <td className="px-5 py-3 text-muted-foreground">{a.date}</td>
                      <td className="px-5 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setRemoveTarget(a)}
                        >
                          <Trash2 className="size-4" />
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Assignments cards — mobile */}
      <div className="flex flex-col gap-3 md:hidden">
        {isLoading ? (
          <MobileCardSkeleton />
        ) : filtered.length === 0 && !fetchError ? (
          <div className="rounded-lg border border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
            {assignments.length === 0
              ? 'No assignments yet. Tap "Add Assignment" to create one.'
              : "No assignments found matching the selected filters."}
          </div>
        ) : (
          filtered.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-foreground">{a.teacher}</span>
                    <span className="text-sm text-foreground">{a.subject}</span>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{a.classSection}</span>
                      <span>{'|'}</span>
                      <span>{a.department}</span>
                      <span>{'|'}</span>
                      <span>{a.date}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setRemoveTarget(a)}
                    aria-label="Remove assignment"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Assignment Overview */}
      {!isLoading && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Assignment Overview</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {teacherCounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No teachers to display.</p>
            ) : (
              teacherCounts.map(([teacher, count]) => (
                <div key={teacher} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{teacher}</span>
                    <span className="text-sm text-muted-foreground">
                      {count} {count === 1 ? "subject" : "subjects"}
                    </span>
                  </div>
                  <Progress value={(count / maxSubjects) * 100} className="h-2" />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Assignment Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Add Assignment</SheetTitle>
            <SheetDescription>
              Assign a teacher to a class and subject combination.
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-5 py-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="assign-teacher">Teacher</Label>
              <Select value={formTeacherId} onValueChange={setFormTeacherId}>
                <SelectTrigger id="assign-teacher">
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teacherOptions.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="assign-subject">Subject</Label>
              <Select value={formSubjectId} onValueChange={handleSubjectChange}>
                <SelectTrigger id="assign-subject">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjectOptions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.deptCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="assign-class">Class & Section</Label>
              <Select value={formClassId} onValueChange={setFormClassId}>
                <SelectTrigger id="assign-class">
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
              <Label>Department</Label>
              <div className="flex h-10 items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
                {formDeptCode || "Auto-fills from subject"}
              </div>
            </div>
            <Button onClick={handleAssign} className="mt-2" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                "Assign Teacher"
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={!!removeTarget} onOpenChange={() => setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this assignment?</AlertDialogTitle>
            <AlertDialogDescription>
              Teacher will no longer have access to this class and subject.
              {removeTarget && (
                <span className="mt-2 block text-sm font-medium text-foreground">
                  {removeTarget.teacher} — {removeTarget.subject} ({removeTarget.classSection})
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
