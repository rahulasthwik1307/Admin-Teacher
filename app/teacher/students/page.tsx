"use client"

import { useState, useMemo } from "react"
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

interface Student {
  id: string
  name: string
  roll: string
  class: string
  year: string
  faceStatus: "Approved" | "Pending" | "Rejected"
}

const initialStudents: Student[] = [
  { id: "1", name: "Rahul Sharma", roll: "21CSE047", class: "CSE-A", year: "3rd Year", faceStatus: "Approved" },
  { id: "2", name: "Priya Patel", roll: "21CSE048", class: "CSE-A", year: "3rd Year", faceStatus: "Approved" },
  { id: "3", name: "Arjun Singh", roll: "21CSE049", class: "CSE-B", year: "3rd Year", faceStatus: "Pending" },
  { id: "4", name: "Meena Joshi", roll: "21CSE050", class: "CSE-B", year: "3rd Year", faceStatus: "Pending" },
  { id: "5", name: "Kiran Rao", roll: "21CSE051", class: "CSE-A", year: "3rd Year", faceStatus: "Approved" },
  { id: "6", name: "Farhan Ali", roll: "21CSE052", class: "CSE-B", year: "3rd Year", faceStatus: "Rejected" },
  { id: "7", name: "Divya Sharma", roll: "21CSE053", class: "CSE-A", year: "3rd Year", faceStatus: "Approved" },
  { id: "8", name: "Suresh Kumar", roll: "21CSE054", class: "CSE-B", year: "3rd Year", faceStatus: "Pending" },
]

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase()
}

const ROWS_PER_PAGE = 10

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>(initialStudents)
  const [search, setSearch] = useState("")
  const [classFilter, setClassFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  // Form state
  const [formName, setFormName] = useState("")
  const [formRoll, setFormRoll] = useState("")
  const [formClass, setFormClass] = useState("")
  const [formDept, setFormDept] = useState("CSE")
  const [formYear, setFormYear] = useState("")

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
    const active = students.filter((s) => s.faceStatus === "Approved").length
    const pending = students.filter((s) => s.faceStatus === "Pending").length
    return { total, active, pending }
  }, [students])

  function handleDelete() {
    if (!deleteTarget) return
    setStudents((prev) => prev.filter((s) => s.id !== deleteTarget.id))
    toast.success(`${deleteTarget.name} has been removed`)
    setDeleteTarget(null)
  }

  function handleAddStudent() {
    if (!formName || !formRoll || !formClass || !formYear) {
      toast.error("Please fill in all fields")
      return
    }
    const newStudent: Student = {
      id: Date.now().toString(),
      name: formName,
      roll: formRoll,
      class: formClass,
      year: formYear,
      faceStatus: "Pending",
    }
    setStudents((prev) => [...prev, newStudent])
    toast.success("Student added successfully. Default password shared by teacher.")
    setSheetOpen(false)
    setFormName("")
    setFormRoll("")
    setFormClass("")
    setFormDept("CSE")
    setFormYear("")
  }

  const faceStatusBadge = (status: Student["faceStatus"]) => {
    switch (status) {
      case "Approved":
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">Approved</Badge>
      case "Pending":
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50">Pending</Badge>
      case "Rejected":
        return <Badge className="bg-red-50 text-red-700 border-red-200 hover:bg-red-50">Rejected</Badge>
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Stat chips */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5">
          <Users className="size-4 text-primary" />
          <span className="text-sm text-muted-foreground">Total Students</span>
          <span className="text-sm font-semibold text-foreground">{stats.total}</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5">
          <UserCheck className="size-4 text-emerald-600" />
          <span className="text-sm text-muted-foreground">Active</span>
          <span className="text-sm font-semibold text-foreground">{stats.active}</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5">
          <UserCog className="size-4 text-amber-600" />
          <span className="text-sm text-muted-foreground">Pending Face Approval</span>
          <span className="text-sm font-semibold text-foreground">{stats.pending}</span>
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
              <SelectItem value="CSE-A">CSE-A</SelectItem>
              <SelectItem value="CSE-B">CSE-B</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setSheetOpen(true)} className="gap-2">
          <Plus className="size-4" />
          Add Student
        </Button>
      </div>

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
              {paged.map((student) => (
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
              ))}
              {paged.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    No students found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cards — mobile */}
      <div className="flex flex-col gap-3 md:hidden">
        {paged.map((student) => (
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
        ))}
        {paged.length === 0 && (
          <div className="rounded-lg border border-border bg-card px-4 py-12 text-center text-muted-foreground">
            No students found matching your search.
          </div>
        )}
      </div>

      {/* Pagination */}
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
            >
              Delete
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
              Enter the student details below. A default password will be shared with the student by the teacher.
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
              <Select value={formClass} onValueChange={setFormClass}>
                <SelectTrigger id="student-class">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CSE-A">CSE-A</SelectItem>
                  <SelectItem value="CSE-B">CSE-B</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="student-dept">Department</Label>
              <Input
                id="student-dept"
                value={formDept}
                onChange={(e) => setFormDept(e.target.value)}
              />
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
            <Button onClick={handleAddStudent}>
              Add Student
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
