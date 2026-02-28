"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus } from "lucide-react"

/* ---------- Departments ---------- */

interface Department {
  id: string
  name: string
  code: string
  classes: number
  subjects: number
}

const initialDepartments: Department[] = [
  { id: "1", name: "Computer Science Engineering", code: "CSE", classes: 2, subjects: 5 },
  { id: "2", name: "Electronics and Communication", code: "ECE", classes: 1, subjects: 3 },
]

/* ---------- Subjects ---------- */

interface Subject {
  id: string
  name: string
  code: string
  department: string
}

const initialSubjects: Subject[] = [
  { id: "1", name: "Data Structures", code: "DS", department: "CSE" },
  { id: "2", name: "Operating Systems", code: "OS", department: "CSE" },
  { id: "3", name: "DBMS", code: "DB", department: "CSE" },
  { id: "4", name: "Computer Networks", code: "CN", department: "CSE" },
  { id: "5", name: "Circuit Theory", code: "CT", department: "ECE" },
]

/* ---------- Periods ---------- */

interface Period {
  id: string
  number: number
  start: string
  end: string
  duration: string
}

const initialPeriods: Period[] = [
  { id: "1", number: 1, start: "09:15", end: "10:10", duration: "55 min" },
  { id: "2", number: 2, start: "10:10", end: "11:00", duration: "50 min" },
  { id: "3", number: 3, start: "11:10", end: "12:00", duration: "50 min" },
  { id: "4", number: 4, start: "12:00", end: "12:50", duration: "50 min" },
  { id: "5", number: 5, start: "13:30", end: "14:20", duration: "50 min" },
]

/* ---------- Component ---------- */

export default function AcademicStructurePage() {
  const [departments, setDepartments] = useState<Department[]>(initialDepartments)
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects)
  const [periods, setPeriods] = useState<Period[]>(initialPeriods)

  // Dialogs
  const [deptDialog, setDeptDialog] = useState(false)
  const [subjectDialog, setSubjectDialog] = useState(false)
  const [periodDialog, setPeriodDialog] = useState(false)

  // Department form
  const [deptName, setDeptName] = useState("")
  const [deptCode, setDeptCode] = useState("")

  // Subject form
  const [subjName, setSubjName] = useState("")
  const [subjCode, setSubjCode] = useState("")
  const [subjDept, setSubjDept] = useState("")

  // Period form
  const [perStart, setPerStart] = useState("")
  const [perEnd, setPerEnd] = useState("")

  function handleAddDept() {
    if (!deptName || !deptCode) {
      toast.error("Please fill all fields")
      return
    }
    setDepartments((prev) => [
      ...prev,
      { id: String(Date.now()), name: deptName, code: deptCode, classes: 0, subjects: 0 },
    ])
    setDeptDialog(false)
    setDeptName("")
    setDeptCode("")
    toast.success(`Department "${deptCode}" added successfully`)
  }

  function handleAddSubject() {
    if (!subjName || !subjCode || !subjDept) {
      toast.error("Please fill all fields")
      return
    }
    setSubjects((prev) => [
      ...prev,
      { id: String(Date.now()), name: subjName, code: subjCode, department: subjDept },
    ])
    setSubjectDialog(false)
    setSubjName("")
    setSubjCode("")
    setSubjDept("")
    toast.success(`Subject "${subjName}" added successfully`)
  }

  function handleAddPeriod() {
    if (!perStart || !perEnd) {
      toast.error("Please fill all fields")
      return
    }
    const nextNum = periods.length + 1
    // Compute duration
    const [sh, sm] = perStart.split(":").map(Number)
    const [eh, em] = perEnd.split(":").map(Number)
    const dur = (eh * 60 + em) - (sh * 60 + sm)
    setPeriods((prev) => [
      ...prev,
      { id: String(Date.now()), number: nextNum, start: perStart, end: perEnd, duration: `${dur} min` },
    ])
    setPeriodDialog(false)
    setPerStart("")
    setPerEnd("")
    toast.success(`Period ${nextNum} added successfully`)
  }

  return (
    <div className="flex flex-col gap-6">
      <Tabs defaultValue="departments" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
          <TabsTrigger value="periods">Periods</TabsTrigger>
        </TabsList>

        {/* ===== Departments Tab ===== */}
        <TabsContent value="departments" className="mt-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Manage departments and their structure.</p>
              <Button onClick={() => setDeptDialog(true)} size="sm" className="gap-2">
                <Plus className="size-4" />
                <span className="hidden sm:inline">Add Department</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </div>
            {/* Desktop table */}
            <Card className="hidden sm:block">
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="px-5 py-3 font-medium text-muted-foreground">Name</th>
                      <th className="px-5 py-3 font-medium text-muted-foreground">Code</th>
                      <th className="px-5 py-3 font-medium text-muted-foreground text-center">Classes</th>
                      <th className="px-5 py-3 font-medium text-muted-foreground text-center">Subjects</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.map((d) => (
                      <tr key={d.id} className="border-b border-border last:border-0">
                        <td className="px-5 py-3 font-medium text-foreground">{d.name}</td>
                        <td className="px-5 py-3 font-mono text-muted-foreground">{d.code}</td>
                        <td className="px-5 py-3 text-center text-foreground">{d.classes}</td>
                        <td className="px-5 py-3 text-center text-foreground">{d.subjects}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
            {/* Mobile cards */}
            <div className="flex flex-col gap-3 sm:hidden">
              {departments.map((d) => (
                <Card key={d.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{d.name}</span>
                        <span className="text-xs text-muted-foreground font-mono">{d.code}</span>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{d.classes} classes</span>
                      <span>{d.subjects} subjects</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ===== Subjects Tab ===== */}
        <TabsContent value="subjects" className="mt-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Manage subjects across departments.</p>
              <Button onClick={() => setSubjectDialog(true)} size="sm" className="gap-2">
                <Plus className="size-4" />
                <span className="hidden sm:inline">Add Subject</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </div>
            {/* Desktop table */}
            <Card className="hidden sm:block">
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="px-5 py-3 font-medium text-muted-foreground">Subject Name</th>
                      <th className="px-5 py-3 font-medium text-muted-foreground">Code</th>
                      <th className="px-5 py-3 font-medium text-muted-foreground">Department</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map((s) => (
                      <tr key={s.id} className="border-b border-border last:border-0">
                        <td className="px-5 py-3 font-medium text-foreground">{s.name}</td>
                        <td className="px-5 py-3 font-mono text-muted-foreground">{s.code}</td>
                        <td className="px-5 py-3 text-muted-foreground">{s.department}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
            {/* Mobile cards */}
            <div className="flex flex-col gap-3 sm:hidden">
              {subjects.map((s) => (
                <Card key={s.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{s.name}</span>
                        <span className="text-xs text-muted-foreground font-mono">{s.code}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{s.department}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ===== Periods Tab ===== */}
        <TabsContent value="periods" className="mt-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Configure daily period timings.</p>
              <Button onClick={() => setPeriodDialog(true)} size="sm" className="gap-2">
                <Plus className="size-4" />
                <span className="hidden sm:inline">Add Period</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </div>
            {/* Desktop table */}
            <Card className="hidden sm:block">
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="px-5 py-3 font-medium text-muted-foreground">Period</th>
                      <th className="px-5 py-3 font-medium text-muted-foreground">Start Time</th>
                      <th className="px-5 py-3 font-medium text-muted-foreground">End Time</th>
                      <th className="px-5 py-3 font-medium text-muted-foreground">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periods.map((p) => (
                      <tr key={p.id} className="border-b border-border last:border-0">
                        <td className="px-5 py-3 font-semibold text-foreground">Period {p.number}</td>
                        <td className="px-5 py-3 font-mono text-foreground">{p.start}</td>
                        <td className="px-5 py-3 font-mono text-foreground">{p.end}</td>
                        <td className="px-5 py-3 text-muted-foreground">{p.duration}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
            {/* Mobile cards */}
            <div className="flex flex-col gap-3 sm:hidden">
              {periods.map((p) => (
                <Card key={p.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">Period {p.number}</span>
                      <span className="text-xs text-muted-foreground">{p.duration}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground font-mono">
                      <span>{p.start}</span>
                      <span>{'—'}</span>
                      <span>{p.end}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Department Dialog */}
      <Dialog open={deptDialog} onOpenChange={setDeptDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Department</DialogTitle>
            <DialogDescription>Create a new academic department.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="dept-name">Department Name</Label>
              <Input
                id="dept-name"
                placeholder="e.g. Mechanical Engineering"
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="dept-code">Code</Label>
              <Input
                id="dept-code"
                placeholder="e.g. MECH"
                value={deptCode}
                onChange={(e) => setDeptCode(e.target.value)}
              />
            </div>
            <Button onClick={handleAddDept}>Add Department</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Subject Dialog */}
      <Dialog open={subjectDialog} onOpenChange={setSubjectDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Subject</DialogTitle>
            <DialogDescription>Create a new subject for a department.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="subj-name">Subject Name</Label>
              <Input
                id="subj-name"
                placeholder="e.g. Compiler Design"
                value={subjName}
                onChange={(e) => setSubjName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="subj-code">Subject Code</Label>
              <Input
                id="subj-code"
                placeholder="e.g. CD"
                value={subjCode}
                onChange={(e) => setSubjCode(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="subj-dept">Department</Label>
              <Select value={subjDept} onValueChange={setSubjDept}>
                <SelectTrigger id="subj-dept">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.code}>
                      {d.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddSubject}>Add Subject</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Period Dialog */}
      <Dialog open={periodDialog} onOpenChange={setPeriodDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Period</DialogTitle>
            <DialogDescription>
              Add period {periods.length + 1} to the timetable.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="per-start">Start Time</Label>
              <Input
                id="per-start"
                type="time"
                value={perStart}
                onChange={(e) => setPerStart(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="per-end">End Time</Label>
              <Input
                id="per-end"
                type="time"
                value={perEnd}
                onChange={(e) => setPerEnd(e.target.value)}
              />
            </div>
            <Button onClick={handleAddPeriod}>Add Period</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
