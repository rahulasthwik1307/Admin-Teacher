"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
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

/* ---------- Constants ---------- */

const DAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
]

function getDayLabel(n: number) {
  return DAYS.find((d) => d.value === n)?.label ?? "—"
}

/* ---------- Interfaces ---------- */

interface TimetableEntry {
  id: string
  day: number
  dayLabel: string
  period: string
  periodNumber: number
  subject: string
  teacher: string
  classSection: string
}

interface TeacherOption {
  id: string
  name: string
}

interface SubjectOption {
  id: string
  name: string
}

interface ClassOption {
  id: string
  label: string
}

interface PeriodOption {
  id: string
  label: string
  number: number
}

interface AssignmentOption {
  teacherId: string
  teacherName: string
  subjectId: string
  subjectName: string
  classId: string
  classLabel: string
}

/* ---------- Skeletons ---------- */

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

export default function TimetablePage() {
  const [entries, setEntries] = useState<TimetableEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Dropdown options
  const [assignmentOptions, setAssignmentOptions] = useState<AssignmentOption[]>([])
  const [periodOptions, setPeriodOptions] = useState<PeriodOption[]>([])
  const [classOptions, setClassOptions] = useState<ClassOption[]>([])

  // Filters
  const [filterDay, setFilterDay] = useState("all")
  const [filterClass, setFilterClass] = useState("all")

  // Sheet & dialog
  const [sheetOpen, setSheetOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<TimetableEntry | null>(null)

  // Form state
  const [formClassId, setFormClassId] = useState("")
  const [formAssignmentKey, setFormAssignmentKey] = useState("") // "teacherId__subjectId"
  const [formPeriodId, setFormPeriodId] = useState("")
  const [formDay, setFormDay] = useState("")

  /* ---------- Derived form values ---------- */
  const selectedAssignment = assignmentOptions.find(
    (a) => `${a.teacherId}__${a.subjectId}__${a.classId}` === formAssignmentKey
  )

  // Filter assignments by selected class
  const filteredAssignments = formClassId
    ? assignmentOptions.filter((a) => a.classId === formClassId)
    : []

  /* ---------- Fetch dropdown data ---------- */
  const fetchDropdownData = useCallback(async () => {
    const supabase = createClient()

    const [assignmentsRes, periodsRes, classesRes] = await Promise.all([
      supabase
        .from("teacher_assignments")
        .select(`
          teacher_id,
          subject_id,
          class_id,
          teacher:teachers ( id, user:users ( full_name ) ),
          subject:subjects ( id, name ),
          class:classes ( id, name, section )
        `),
      supabase
        .from("periods")
        .select("id, period_number, start_time, end_time")
        .order("period_number"),
      supabase
        .from("classes")
        .select("id, name, section")
        .order("name"),
    ])

    if (assignmentsRes.data) {
      setAssignmentOptions(
        assignmentsRes.data.map((a: any) => ({
          teacherId: a.teacher_id,
          teacherName: a.teacher?.user?.full_name ?? "Unknown",
          subjectId: a.subject_id,
          subjectName: a.subject?.name ?? "—",
          classId: a.class_id,
          classLabel: a.class ? `${a.class.name}-${a.class.section}` : "—",
        }))
      )
    }

    if (periodsRes.data) {
      setPeriodOptions(
        periodsRes.data.map((p: any) => ({
          id: p.id,
          number: p.period_number,
          label: `Period ${p.period_number} (${p.start_time.slice(0, 5)} - ${p.end_time.slice(0, 5)})`,
        }))
      )
    }

    if (classesRes.data) {
      setClassOptions(
        classesRes.data.map((c: any) => ({
          id: c.id,
          label: `${c.name}-${c.section}`,
        }))
      )
    }
  }, [])

  /* ---------- Fetch timetable entries ---------- */
  const fetchEntries = useCallback(async () => {
    setIsLoading(true)
    setFetchError(null)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("timetables")
        .select(`
          id,
          day_of_week,
          teacher:teachers ( id, user:users ( full_name ) ),
          subject:subjects ( name ),
          class:classes ( name, section ),
          period:periods ( period_number, start_time, end_time )
        `)
        .order("day_of_week")

      if (error) {
        setFetchError("Failed to load timetable.")
        return
      }

      const mapped: TimetableEntry[] = (data || []).map((t: any) => ({
        id: t.id,
        day: t.day_of_week,
        dayLabel: getDayLabel(t.day_of_week),
        periodNumber: t.period?.period_number ?? 0,
        period: t.period
          ? `Period ${t.period.period_number} (${t.period.start_time.slice(0, 5)} - ${t.period.end_time.slice(0, 5)})`
          : "—",
        subject: t.subject?.name ?? "—",
        teacher: t.teacher?.user?.full_name ?? "—",
        classSection: t.class ? `${t.class.name}-${t.class.section}` : "—",
      }))

      // Sort by day then period
      mapped.sort((a, b) => a.day - b.day || a.periodNumber - b.periodNumber)
      setEntries(mapped)
    } catch {
      setFetchError("An unexpected error occurred.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDropdownData()
    fetchEntries()
  }, [fetchDropdownData, fetchEntries])

  /* ---------- Filtered entries ---------- */
  const filtered = entries.filter((e) => {
    if (filterDay !== "all" && e.day !== parseInt(filterDay)) return false
    if (filterClass !== "all" && e.classSection !== filterClass) return false
    return true
  })

  /* ---------- Add timetable entry ---------- */
  async function handleAdd() {
    if (!formClassId || !formAssignmentKey || !formPeriodId || !formDay) {
      toast.error("Please fill all fields")
      return
    }

    const assignment = assignmentOptions.find(
      (a) => `${a.teacherId}__${a.subjectId}__${a.classId}` === formAssignmentKey
    )
    if (!assignment) {
      toast.error("Invalid assignment selected")
      return
    }

    setIsSubmitting(true)
    try {
      const supabase = createClient()

      const { error } = await supabase.from("timetables").insert({
        class_id: assignment.classId,
        subject_id: assignment.subjectId,
        teacher_id: assignment.teacherId,
        period_id: formPeriodId,
        day_of_week: parseInt(formDay),
      })

      if (error) {
        if (error.code === "23505") {
          toast.error("This class already has a subject assigned to this period on this day.", {
            style: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },
          })
        } else {
          toast.error(`Failed: ${error.message}`, {
            style: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },
          })
        }
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from("system_logs").insert({
          performed_by: user.id,
          action_type: "create",
          description: `Timetable entry added: ${assignment.subjectName} — ${assignment.classLabel} — ${getDayLabel(parseInt(formDay))}`,
        })
      }

      const dayLabel = getDayLabel(parseInt(formDay))
      const periodLabel = periodOptions.find((p) => p.id === formPeriodId)?.label ?? ""
      toast.success(`Timetable entry added: ${assignment.subjectName} on ${dayLabel} — ${periodLabel}`)

      setSheetOpen(false)
      setFormClassId("")
      setFormAssignmentKey("")
      setFormPeriodId("")
      setFormDay("")
      fetchEntries()
    } catch {
      toast.error("An unexpected error occurred.", {
        style: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  /* ---------- Remove entry ---------- */
  async function handleRemove() {
    if (!removeTarget) return
    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("timetables")
        .delete()
        .eq("id", removeTarget.id)

      if (error) {
        toast.error(`Failed: ${error.message}`, {
          style: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },
        })
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from("system_logs").insert({
          performed_by: user.id,
          action_type: "delete",
          description: `Timetable entry removed: ${removeTarget.subject} — ${removeTarget.classSection} — ${removeTarget.dayLabel}`,
        })
      }

      toast.success("Timetable entry removed")
      fetchEntries()
    } catch {
      toast.error("An unexpected error occurred.", {
        style: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },
      })
    } finally {
      setRemoveTarget(null)
      setIsSubmitting(false)
    }
  }

  // Unique class labels from entries for filter
  const uniqueClasses = Array.from(new Set(entries.map((e) => e.classSection))).filter(
    (c) => c !== "—"
  )

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Set the weekly timetable for each class. Each slot assigns one subject, teacher, period, and day.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={filterDay} onValueChange={setFilterDay}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All Days" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Days</SelectItem>
                {DAYS.map((d) => (
                  <SelectItem key={d.value} value={String(d.value)}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          </div>
          <Button onClick={() => setSheetOpen(true)} className="gap-2 self-start sm:self-auto">
            <Plus className="size-4" />
            Add Slot
          </Button>
        </div>
      </div>

      {/* Error */}
      {fetchError && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-destructive">{fetchError}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={fetchEntries}>
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
                  <th className="px-5 py-3 font-medium text-muted-foreground">Day</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">Period</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">Subject</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">Teacher</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">Class</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <TableSkeleton />
                ) : filtered.length === 0 && !fetchError ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                      {entries.length === 0
                        ? 'No timetable entries yet. Click "Add Slot" to create one.'
                        : "No entries found matching the selected filters."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((e) => (
                    <tr key={e.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-3 font-medium text-foreground">{e.dayLabel}</td>
                      <td className="px-5 py-3 text-muted-foreground">{e.period}</td>
                      <td className="px-5 py-3 text-foreground">{e.subject}</td>
                      <td className="px-5 py-3 text-muted-foreground">{e.teacher}</td>
                      <td className="px-5 py-3 text-muted-foreground">{e.classSection}</td>
                      <td className="px-5 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setRemoveTarget(e)}
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

      {/* Mobile cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {isLoading ? (
          <MobileCardSkeleton />
        ) : filtered.length === 0 && !fetchError ? (
          <div className="rounded-lg border border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
            {entries.length === 0
              ? 'No timetable entries yet. Tap "Add Slot" to create one.'
              : "No entries found matching the selected filters."}
          </div>
        ) : (
          filtered.map((e) => (
            <Card key={e.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-foreground">{e.subject}</span>
                    <span className="text-sm text-muted-foreground">{e.teacher}</span>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{e.dayLabel}</span>
                      <span>{'|'}</span>
                      <span>{e.period}</span>
                      <span>{'|'}</span>
                      <span>{e.classSection}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setRemoveTarget(e)}
                    aria-label="Remove entry"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add Slot Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Add Timetable Slot</SheetTitle>
            <SheetDescription>
              Assign a subject and teacher to a specific day and period for a class.
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-5 py-6">

            {/* Step 1: Select Class */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="tt-class">Class & Section</Label>
              <Select
                value={formClassId}
                onValueChange={(val) => {
                  setFormClassId(val)
                  setFormAssignmentKey("") // reset subject/teacher when class changes
                }}
              >
                <SelectTrigger id="tt-class">
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

            {/* Step 2: Select Subject + Teacher (filtered by class via assignments) */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="tt-assignment">Subject & Teacher</Label>
              <Select
                value={formAssignmentKey}
                onValueChange={setFormAssignmentKey}
                disabled={!formClassId}
              >
                <SelectTrigger id="tt-assignment">
                  <SelectValue placeholder={formClassId ? "Select subject" : "Select class first"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredAssignments.map((a) => (
                    <SelectItem
                      key={`${a.teacherId}__${a.subjectId}__${a.classId}`}
                      value={`${a.teacherId}__${a.subjectId}__${a.classId}`}
                    >
                      {a.subjectName} — {a.teacherName}
                    </SelectItem>
                  ))}
                  {filteredAssignments.length === 0 && formClassId && (
                    <SelectItem value="none" disabled>
                      No assignments found for this class
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Step 3: Select Day */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="tt-day">Day</Label>
              <Select value={formDay} onValueChange={setFormDay}>
                <SelectTrigger id="tt-day">
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((d) => (
                    <SelectItem key={d.value} value={String(d.value)}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Step 4: Select Period */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="tt-period">Period</Label>
              <Select value={formPeriodId} onValueChange={setFormPeriodId}>
                <SelectTrigger id="tt-period">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg bg-muted/60 px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Each class can only have one subject per period per day. Duplicate entries will be rejected automatically.
              </p>
            </div>

            <Button onClick={handleAdd} className="mt-2" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Slot"
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Remove Dialog */}
      <AlertDialog open={!!removeTarget} onOpenChange={() => setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this timetable slot?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the slot from the weekly timetable.
              {removeTarget && (
                <span className="mt-2 block text-sm font-medium text-foreground">
                  {removeTarget.subject} — {removeTarget.classSection} — {removeTarget.dayLabel} — {removeTarget.period}
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