"use client"
import { useState, useEffect, useCallback } from "react"
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
import { Plus, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

/* ---------- Interfaces ---------- */
interface Department {
  id: string
  name: string
  code: string
  classes: number
  subjects: number
}

interface ClassItem {
  id: string
  name: string
  section: string
  department: string
  displayName: string // e.g. "CSE-A"
}

interface Subject {
  id: string
  name: string
  code: string
  department: string
}

interface Period {
  id: string
  number: number
  start: string
  end: string
  duration: string
}

/* ---------- Helpers ---------- */
function computeDuration(start: string, end: string): string {
  const [sh, sm] = start.split(":").map(Number)
  const [eh, em] = end.split(":").map(Number)
  const dur = eh * 60 + em - (sh * 60 + sm)
  return `${dur} min`
}

/* ---------- Skeleton Components ---------- */
function TableSkeleton({ cols }: { cols: number }) {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <tr key={i} className="border-b border-border last:border-0 animate-pulse">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-5 py-3">
              <div className="h-4 w-20 rounded bg-muted" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

function MobileSkeleton() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-4 animate-pulse">
            <div className="h-4 w-32 rounded bg-muted" />
            <div className="mt-2 h-3 w-20 rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </>
  )
}

/* ---------- Component ---------- */
export default function AcademicStructurePage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [periods, setPeriods] = useState<Period[]>([])

  // Loading & error states
  const [loadingDepts, setLoadingDepts] = useState(true)
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [loadingSubjects, setLoadingSubjects] = useState(true)
  const [loadingPeriods, setLoadingPeriods] = useState(true)
  const [deptError, setDeptError] = useState<string | null>(null)
  const [classError, setClassError] = useState<string | null>(null)
  const [subjectError, setSubjectError] = useState<string | null>(null)
  const [periodError, setPeriodError] = useState<string | null>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Dialogs
  const [deptDialog, setDeptDialog] = useState(false)
  const [classDialog, setClassDialog] = useState(false)
  const [subjectDialog, setSubjectDialog] = useState(false)
  const [periodDialog, setPeriodDialog] = useState(false)

  // Department form
  const [deptName, setDeptName] = useState("")
  const [deptCode, setDeptCode] = useState("")

  // Class form
  const [className, setClassName] = useState("")
  const [classSection, setClassSection] = useState("")
  const [classDept, setClassDept] = useState("")

  // Subject form
  const [subjName, setSubjName] = useState("")
  const [subjCode, setSubjCode] = useState("")
  const [subjDept, setSubjDept] = useState("")

  // Period form
  const [perStart, setPerStart] = useState("")
  const [perEnd, setPerEnd] = useState("")

  /* ---------- Fetch functions ---------- */
  const fetchDepartments = useCallback(async () => {
    setLoadingDepts(true)
    setDeptError(null)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("departments")
        .select("id, name, code")
        .order("name")
      if (error) {
        setDeptError("Failed to load departments.")
        return
      }
      // Fetch class counts per department
      const { data: classData } = await supabase
        .from("classes")
        .select("department_id")

      const classCountMap: Record<string, number> = {}
      for (const c of classData || []) {
        if (c.department_id) {
          classCountMap[c.department_id] = (classCountMap[c.department_id] || 0) + 1
        }
      }

      // Fetch subject counts per department
      const { data: subjectData } = await supabase
        .from("subjects")
        .select("department_id")

      const subjectCountMap: Record<string, number> = {}
      for (const s of subjectData || []) {
        if (s.department_id) {
          subjectCountMap[s.department_id] = (subjectCountMap[s.department_id] || 0) + 1
        }
      }

      setDepartments(
        (data || []).map((d: any) => ({
          id: d.id,
          name: d.name,
          code: d.code,
          classes: classCountMap[d.id] || 0,
          subjects: subjectCountMap[d.id] || 0,
        }))
      )
    } catch {
      setDeptError("An unexpected error occurred.")
    } finally {
      setLoadingDepts(false)
    }
  }, [])

  const fetchClasses = useCallback(async () => {
    setLoadingClasses(true)
    setClassError(null)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("classes")
        .select("id, name, section, department:departments ( name, code )")
        .order("name")
      if (error) {
        setClassError("Failed to load classes.")
        return
      }
      setClasses(
        (data || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          section: c.section,
          department: c.department?.code ?? "—",
          displayName: `${c.name}-${c.section}`,
        }))
      )
    } catch {
      setClassError("An unexpected error occurred.")
    } finally {
      setLoadingClasses(false)
    }
  }, [])

  const fetchSubjects = useCallback(async () => {
    setLoadingSubjects(true)
    setSubjectError(null)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("subjects")
        .select(`id, name, code, department:departments ( name, code )`)
        .order("name")
      if (error) {
        setSubjectError("Failed to load subjects.")
        return
      }
      setSubjects(
        (data || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          code: s.code,
          department: s.department?.code ?? "—",
        }))
      )
    } catch {
      setSubjectError("An unexpected error occurred.")
    } finally {
      setLoadingSubjects(false)
    }
  }, [])

  const fetchPeriods = useCallback(async () => {
    setLoadingPeriods(true)
    setPeriodError(null)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("periods")
        .select("id, period_number, start_time, end_time")
        .order("period_number")
      if (error) {
        setPeriodError("Failed to load periods.")
        return
      }
      setPeriods(
        (data || []).map((p: any) => ({
          id: p.id,
          number: p.period_number,
          start: p.start_time,
          end: p.end_time,
          duration: computeDuration(p.start_time, p.end_time),
        }))
      )
    } catch {
      setPeriodError("An unexpected error occurred.")
    } finally {
      setLoadingPeriods(false)
    }
  }, [])

  useEffect(() => {
    fetchDepartments()
    fetchClasses()
    fetchSubjects()
    fetchPeriods()
  }, [fetchDepartments, fetchClasses, fetchSubjects, fetchPeriods])

  /* ---------- Submit handlers ---------- */
  async function handleAddDept() {
    if (!deptName || !deptCode) {
      toast.error("Please fill all fields")
      return
    }
    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("departments").insert({
        name: deptName,
        code: deptCode,
      })
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
          action_type: "create",
          description: `Department added: ${deptName}`,
        })
      }
      toast.success(`Department "${deptCode}" added successfully`)
      setDeptDialog(false)
      setDeptName("")
      setDeptCode("")
      fetchDepartments()
    } catch {
      toast.error("An unexpected error occurred.", {
        style: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleAddClass() {
    if (!className || !classSection || !classDept) {
      toast.error("Please fill all fields")
      return
    }
    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const selectedDept = departments.find((d) => d.code === classDept)
      if (!selectedDept) {
        toast.error("Selected department not found.", {
          style: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },
        })
        return
      }
      const { data: { user } } = await supabase.auth.getUser()
      console.log('Current user:', user?.id, user?.email)
      console.log('User role check:', user?.id)
      
      const { error } = await supabase.from("classes").insert({
        name: className.toUpperCase(),
        section: classSection.toUpperCase(),
        department_id: selectedDept.id,
      })
      if (error) {
        toast.error(`Failed: ${error.message}`, {
          style: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },
        })
        return
      }
      // user already fetched above
      if (user) {
        await supabase.from("system_logs").insert({
          performed_by: user.id,
          action_type: "create",
          description: `Class added: ${className.toUpperCase()}-${classSection.toUpperCase()} (${classDept})`,
        })
      }
      toast.success(`Class "${className.toUpperCase()}-${classSection.toUpperCase()}" added successfully`)
      setClassDialog(false)
      setClassName("")
      setClassSection("")
      setClassDept("")
      fetchClasses()
    } catch {
      toast.error("An unexpected error occurred.", {
        style: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleAddSubject() {
    if (!subjName || !subjCode || !subjDept) {
      toast.error("Please fill all fields")
      return
    }
    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const selectedDept = departments.find((d) => d.code === subjDept)
      if (!selectedDept) {
        toast.error(`Department "${subjDept}" not found.`, {
          style: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },
        })
        return
      }
      const { error } = await supabase.from("subjects").insert({
        name: subjName,
        code: subjCode,
        department_id: selectedDept.id,
      })
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
          action_type: "create",
          description: `Subject added: ${subjName}`,
        })
      }
      toast.success(`Subject "${subjName}" added successfully`)
      setSubjectDialog(false)
      setSubjName("")
      setSubjCode("")
      setSubjDept("")
      fetchSubjects()
    } catch {
      toast.error("An unexpected error occurred.", {
        style: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleAddPeriod() {
    if (!perStart || !perEnd) {
      toast.error("Please fill all fields")
      return
    }
    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const nextNum = periods.length + 1
      const { error } = await supabase.from("periods").insert({
        period_number: nextNum,
        start_time: perStart,
        end_time: perEnd,
      })
      if (error) {
        toast.error(`Failed: ${error.message}`, {
          style: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },
        })
        return
      }
      toast.success(`Period ${nextNum} added successfully`)
      setPeriodDialog(false)
      setPerStart("")
      setPerEnd("")
      fetchPeriods()
    } catch {
      toast.error("An unexpected error occurred.", {
        style: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  /* ---------- Render helpers ---------- */
  function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-destructive">{message}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  function EmptyCard({ message }: { message: string }) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          {message}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Tabs defaultValue="departments" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="classes">Classes</TabsTrigger>
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
            {deptError ? (
              <ErrorCard message={deptError} onRetry={fetchDepartments} />
            ) : !loadingDepts && departments.length === 0 ? (
              <EmptyCard message="No departments found. Click &ldquo;Add Department&rdquo; to create one." />
            ) : (
              <>
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
                        {loadingDepts ? (
                          <TableSkeleton cols={4} />
                        ) : (
                          departments.map((d) => (
                            <tr key={d.id} className="border-b border-border last:border-0">
                              <td className="px-5 py-3 font-medium text-foreground">{d.name}</td>
                              <td className="px-5 py-3 font-mono text-muted-foreground">{d.code}</td>
                              <td className="px-5 py-3 text-center text-foreground">{d.classes}</td>
                              <td className="px-5 py-3 text-center text-foreground">{d.subjects}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
                <div className="flex flex-col gap-3 sm:hidden">
                  {loadingDepts ? (
                    <MobileSkeleton />
                  ) : (
                    departments.map((d) => (
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
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </TabsContent>

        {/* ===== Classes Tab ===== */}
        <TabsContent value="classes" className="mt-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Manage classes and sections.</p>
              <Button onClick={() => setClassDialog(true)} size="sm" className="gap-2">
                <Plus className="size-4" />
                <span className="hidden sm:inline">Add Class</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </div>
            {classError ? (
              <ErrorCard message={classError} onRetry={fetchClasses} />
            ) : !loadingClasses && classes.length === 0 ? (
              <EmptyCard message="No classes found. Click &ldquo;Add Class&rdquo; to create one." />
            ) : (
              <>
                <Card className="hidden sm:block">
                  <CardContent className="p-0">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left">
                          <th className="px-5 py-3 font-medium text-muted-foreground">Class</th>
                          <th className="px-5 py-3 font-medium text-muted-foreground">Section</th>
                          <th className="px-5 py-3 font-medium text-muted-foreground">Department</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingClasses ? (
                          <TableSkeleton cols={3} />
                        ) : (
                          classes.map((c) => (
                            <tr key={c.id} className="border-b border-border last:border-0">
                              <td className="px-5 py-3 font-medium text-foreground">{c.displayName}</td>
                              <td className="px-5 py-3 text-muted-foreground">{c.section}</td>
                              <td className="px-5 py-3 text-muted-foreground">{c.department}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
                <div className="flex flex-col gap-3 sm:hidden">
                  {loadingClasses ? (
                    <MobileSkeleton />
                  ) : (
                    classes.map((c) => (
                      <Card key={c.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground">{c.displayName}</span>
                              <span className="text-xs text-muted-foreground">Section {c.section}</span>
                            </div>
                            <span className="text-xs text-muted-foreground font-mono">{c.department}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </>
            )}
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
            {subjectError ? (
              <ErrorCard message={subjectError} onRetry={fetchSubjects} />
            ) : !loadingSubjects && subjects.length === 0 ? (
              <EmptyCard message="No subjects found. Click &ldquo;Add Subject&rdquo; to create one." />
            ) : (
              <>
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
                        {loadingSubjects ? (
                          <TableSkeleton cols={3} />
                        ) : (
                          subjects.map((s) => (
                            <tr key={s.id} className="border-b border-border last:border-0">
                              <td className="px-5 py-3 font-medium text-foreground">{s.name}</td>
                              <td className="px-5 py-3 font-mono text-muted-foreground">{s.code}</td>
                              <td className="px-5 py-3 text-muted-foreground">{s.department}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
                <div className="flex flex-col gap-3 sm:hidden">
                  {loadingSubjects ? (
                    <MobileSkeleton />
                  ) : (
                    subjects.map((s) => (
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
                    ))
                  )}
                </div>
              </>
            )}
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
            {periodError ? (
              <ErrorCard message={periodError} onRetry={fetchPeriods} />
            ) : !loadingPeriods && periods.length === 0 ? (
              <EmptyCard message="No periods configured. Click &ldquo;Add Period&rdquo; to create one." />
            ) : (
              <>
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
                        {loadingPeriods ? (
                          <TableSkeleton cols={4} />
                        ) : (
                          periods.map((p) => (
                            <tr key={p.id} className="border-b border-border last:border-0">
                              <td className="px-5 py-3 font-semibold text-foreground">Period {p.number}</td>
                              <td className="px-5 py-3 font-mono text-foreground">{p.start}</td>
                              <td className="px-5 py-3 font-mono text-foreground">{p.end}</td>
                              <td className="px-5 py-3 text-muted-foreground">{p.duration}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
                <div className="flex flex-col gap-3 sm:hidden">
                  {loadingPeriods ? (
                    <MobileSkeleton />
                  ) : (
                    periods.map((p) => (
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
                    ))
                  )}
                </div>
              </>
            )}
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
            <Button onClick={handleAddDept} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Department"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Class Dialog */}
      <Dialog open={classDialog} onOpenChange={setClassDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Class</DialogTitle>
            <DialogDescription>
              Create a new class and section. e.g. Class: CSE, Section: A → displayed as CSE-A.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="class-name">Class Name</Label>
              <Input
                id="class-name"
                placeholder="e.g. CSE"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="class-section">Section</Label>
              <Input
                id="class-section"
                placeholder="e.g. A"
                value={classSection}
                onChange={(e) => setClassSection(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="class-dept">Department</Label>
              <Select value={classDept} onValueChange={setClassDept}>
                <SelectTrigger id="class-dept">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.code}>
                      {d.name} ({d.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {className && classSection && (
              <div className="rounded-lg bg-muted/60 px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  Will be created as:{" "}
                  <span className="font-semibold text-foreground">
                    {className.toUpperCase()}-{classSection.toUpperCase()}
                  </span>
                </p>
              </div>
            )}
            <Button onClick={handleAddClass} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Class"
              )}
            </Button>
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
                      {d.name} ({d.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddSubject} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Subject"
              )}
            </Button>
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
            <Button onClick={handleAddPeriod} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Period"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}