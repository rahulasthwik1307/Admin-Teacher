"use client"

import { useState } from "react"
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
import { Plus, Trash2 } from "lucide-react"

interface Assignment {
  id: string
  teacher: string
  subject: string
  classSection: string
  department: string
  date: string
}

const initialAssignments: Assignment[] = [
  { id: "1", teacher: "Dr. P. Sharma", subject: "Data Structures", classSection: "CSE-A", department: "CSE", date: "Oct 1, 2024" },
  { id: "2", teacher: "Dr. P. Sharma", subject: "Operating Systems", classSection: "CSE-B", department: "CSE", date: "Oct 1, 2024" },
  { id: "3", teacher: "Dr. P. Sharma", subject: "DBMS", classSection: "CSE-A", department: "CSE", date: "Oct 1, 2024" },
  { id: "4", teacher: "Dr. S. Reddy", subject: "Computer Networks", classSection: "CSE-B", department: "CSE", date: "Oct 1, 2024" },
  { id: "5", teacher: "Dr. K. Rao", subject: "Operating Systems", classSection: "CSE-A", department: "CSE", date: "Oct 2, 2024" },
  { id: "6", teacher: "Dr. A. Singh", subject: "Circuit Theory", classSection: "ECE-A", department: "ECE", date: "Oct 3, 2024" },
]

const allTeachers = ["Dr. P. Sharma", "Dr. S. Reddy", "Dr. K. Rao", "Dr. M. Patel", "Dr. A. Singh"]
const allSubjects = [
  { name: "Data Structures", dept: "CSE" },
  { name: "Operating Systems", dept: "CSE" },
  { name: "DBMS", dept: "CSE" },
  { name: "Computer Networks", dept: "CSE" },
  { name: "Circuit Theory", dept: "ECE" },
  { name: "Signals & Systems", dept: "ECE" },
]
const allClasses = ["CSE-A", "CSE-B", "ECE-A"]

function getTeacherSubjectCount(assignments: Assignment[]) {
  const counts: Record<string, number> = {}
  for (const a of assignments) {
    counts[a.teacher] = (counts[a.teacher] || 0) + 1
  }
  // Include all teachers, even those with 0
  for (const t of allTeachers) {
    if (!counts[t]) counts[t] = 0
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])
}

export default function TeacherAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments)
  const [filterClass, setFilterClass] = useState("all")
  const [filterDept, setFilterDept] = useState("all")
  const [sheetOpen, setSheetOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<Assignment | null>(null)

  // Form state
  const [formTeacher, setFormTeacher] = useState("")
  const [formSubject, setFormSubject] = useState("")
  const [formClass, setFormClass] = useState("")
  const [formDept, setFormDept] = useState("")

  // Filter assignments
  const filtered = assignments.filter((a) => {
    if (filterClass !== "all" && a.classSection !== filterClass) return false
    if (filterDept !== "all" && a.department !== filterDept) return false
    return true
  })

  // Auto-fill department when subject is selected
  function handleSubjectChange(value: string) {
    setFormSubject(value)
    const found = allSubjects.find((s) => s.name === value)
    if (found) setFormDept(found.dept)
  }

  function handleAssign() {
    if (!formTeacher || !formSubject || !formClass) {
      toast.error("Please fill all fields")
      return
    }
    const newAssignment: Assignment = {
      id: String(Date.now()),
      teacher: formTeacher,
      subject: formSubject,
      classSection: formClass,
      department: formDept,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    }
    setAssignments((prev) => [...prev, newAssignment])
    setSheetOpen(false)
    setFormTeacher("")
    setFormSubject("")
    setFormClass("")
    setFormDept("")
    toast.success(`${formTeacher} assigned to ${formSubject} — ${formClass}`)
  }

  function handleRemove() {
    if (!removeTarget) return
    setAssignments((prev) => prev.filter((a) => a.id !== removeTarget.id))
    toast.success(`Assignment removed for ${removeTarget.teacher}`)
    setRemoveTarget(null)
  }

  const teacherCounts = getTeacherSubjectCount(assignments)
  const maxSubjects = 5

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
                <SelectItem value="CSE-A">CSE-A</SelectItem>
                <SelectItem value="CSE-B">CSE-B</SelectItem>
                <SelectItem value="ECE-A">ECE-A</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterDept} onValueChange={setFilterDept}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="CSE">CSE</SelectItem>
                <SelectItem value="ECE">ECE</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setSheetOpen(true)} className="gap-2 self-start sm:self-auto">
            <Plus className="size-4" />
            Add Assignment
          </Button>
        </div>
      </div>

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
                {filtered.map((a) => (
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
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                      No assignments found matching the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Assignments cards — mobile */}
      <div className="flex flex-col gap-3 md:hidden">
        {filtered.map((a) => (
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
        ))}
        {filtered.length === 0 && (
          <div className="rounded-lg border border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
            No assignments found matching the selected filters.
          </div>
        )}
      </div>

      {/* Assignment Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Assignment Overview</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {teacherCounts.map(([teacher, count]) => (
            <div key={teacher} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{teacher}</span>
                <span className="text-sm text-muted-foreground">
                  {count} {count === 1 ? "subject" : "subjects"}
                </span>
              </div>
              <Progress value={(count / maxSubjects) * 100} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>

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
              <Select value={formTeacher} onValueChange={setFormTeacher}>
                <SelectTrigger id="assign-teacher">
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>
                <SelectContent>
                  {allTeachers.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="assign-subject">Subject</Label>
              <Select value={formSubject} onValueChange={handleSubjectChange}>
                <SelectTrigger id="assign-subject">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {allSubjects.map((s) => (
                    <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="assign-class">Class & Section</Label>
              <Select value={formClass} onValueChange={setFormClass}>
                <SelectTrigger id="assign-class">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {allClasses.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Department</Label>
              <div className="flex h-10 items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
                {formDept || "Auto-fills from subject"}
              </div>
            </div>
            <Button onClick={handleAssign} className="mt-2">
              Assign Teacher
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
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
