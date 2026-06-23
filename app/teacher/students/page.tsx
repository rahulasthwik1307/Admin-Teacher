"use client"

import { useState, useEffect, useMemo, useCallback, Fragment } from "react"
import { Search, Users, UserCheck, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { TableSkeleton, ListSkeleton } from "@/components/ui/skeletons"

interface Student {
  id: string
  name: string
  roll: string
  class: string
  year: string
  faceStatus: "Approved" | "Pending" | "Rejected" | "None"
  photoUrl: string | null
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
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
            <div className="bg-emerald-600 px-2 py-1 text-center"><span className="text-white text-xs font-semibold truncate block">{student.name}</span></div>
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
      <td colSpan={5} className="px-4 py-2.5">
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

export default function TeacherStudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [teacherId, setTeacherId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [classFilter, setClassFilter] = useState("all")

  useEffect(() => {
    async function getTeacher() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setTeacherId(user.id)
    }
    getTeacher()
  }, [])

  const fetchStudents = useCallback(async () => {
    if (!teacherId) return
    setIsLoading(true)
    setFetchError(null)
    try {
      const supabase = createClient()

      // Get classes this teacher teaches via timetables
      const { data: timetableRows } = await supabase
        .from("timetables")
        .select("class_id")
        .eq("teacher_id", teacherId)

      if (!timetableRows || timetableRows.length === 0) {
        setStudents([])
        setIsLoading(false)
        return
      }

      // Unique class IDs
      const classIds = [...new Set(timetableRows.map((r: any) => r.class_id as string))]

      // Fetch students in those classes
      const { data, error } = await supabase
        .from("students")
        .select(`
          id, roll_number, year, is_active, embedding_a, is_approved, is_rejected,
          registration_photo_url,
          class:classes ( name, section, department:departments ( code ) ),
          user:users ( full_name )
        `)
        .in("class_id", classIds)
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
          year: s.year,
          faceStatus,
          photoUrl: isApproved ? (s.registration_photo_url ?? null) : null,
        }
      })
      setStudents(mapped)
    } catch {
      setFetchError("An unexpected error occurred.")
    } finally {
      setIsLoading(false)
    }
  }, [teacherId])

  useEffect(() => { if (teacherId) fetchStudents() }, [teacherId, fetchStudents])

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

  const stats = useMemo(() => ({
    total: students.length,
    active: students.filter((s) => s.faceStatus === "Approved").length,
  }), [students])

  const uniqueClasses = Array.from(new Set(students.map((s) => s.class))).filter((c) => c !== "—")

  return (
    <div className="flex flex-col gap-6">
      {/* Stat chips */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10"><Users className="size-4 text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">My Students</p><p className="text-lg font-bold text-foreground leading-tight">{isLoading ? "—" : stats.total}</p></div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 px-4 py-3 shadow-sm">
          <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/50"><UserCheck className="size-4 text-emerald-600" /></div>
          <div><p className="text-xs text-emerald-700 dark:text-emerald-400">Face Approved</p><p className="text-lg font-bold text-emerald-700 dark:text-emerald-400 leading-tight">{isLoading ? "—" : stats.active}</p></div>
        </div>

      </div>

      {/* Info banner */}
      <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 px-4 py-3">
        <Users className="size-4 text-blue-600 shrink-0" />
        <p className="text-sm text-blue-700 dark:text-blue-400">Showing students from your assigned classes. Student management is handled by admin.</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center rounded-2xl border border-border bg-card shadow-sm w-full overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-border max-w-xl">
        <div className="flex items-center gap-3 px-4 py-3 sm:py-2 flex-1 sm:min-w-62.5">
          <Search className="size-4 text-muted-foreground shrink-0" />
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">Search</span>
            <Input placeholder="Search by name or roll..." value={search} onChange={(e) => setSearch(e.target.value)} className="border-0 bg-transparent p-0 h-auto shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 font-medium w-full outline-none placeholder:text-muted-foreground/60 focus:bg-transparent" />
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3 sm:py-2 flex-1 sm:w-55">
          <Users className="size-4 text-muted-foreground shrink-0" />
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">Class</span>
            <Select value={classFilter} onValueChange={setClassFilter}>
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

      {fetchError && (
        <div className="rounded-lg border border-border bg-card px-4 py-8 text-center">
          <p className="text-sm text-destructive">{fetchError}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={fetchStudents}>Retry</Button>
        </div>
      )}

      {/* Table desktop */}
      {isLoading ? (
        <div className="hidden md:block">
          <TableSkeleton cols={5} rows={6} hasAvatar={true} />
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
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && !fetchError ? (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    {students.length === 0 ? "No students in your assigned classes yet." : "No students found matching your search."}
                  </td></tr>
                ) : isGrouped && groupedStudents ? (
                Array.from(groupedStudents.entries()).map(([cls, clsStudents]) => (
                  <Fragment key={cls}>
                    <GroupHeader className={cls} students={clsStudents} />
                    {clsStudents.map((s) => (
                      <tr key={s.id} className={cn("border-b border-border last:border-0 transition-colors", getRowStyle(s.faceStatus))}>
                        <td className="px-4 py-3"><div className="flex items-center gap-3"><StudentAvatar student={s} size="md" /><span className="font-medium text-foreground">{s.name}</span></div></td>
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{s.roll}</td>
                        <td className="px-4 py-3 text-foreground">{s.class}</td>
                        <td className="px-4 py-3 text-muted-foreground">{s.year}</td>
                        <td className="px-4 py-3"><FaceStatusBadge status={s.faceStatus} /></td>
                      </tr>
                    ))}
                  </Fragment>
                ))
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className={cn("border-b border-border last:border-0 transition-colors", getRowStyle(s.faceStatus))}>
                    <td className="px-4 py-3"><div className="flex items-center gap-3"><StudentAvatar student={s} size="md" /><span className="font-medium text-foreground">{s.name}</span></div></td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{s.roll}</td>
                    <td className="px-4 py-3 text-foreground">{s.class}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.year}</td>
                    <td className="px-4 py-3"><FaceStatusBadge status={s.faceStatus} /></td>
                  </tr>
                ))
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
            {students.length === 0 ? "No students in your assigned classes yet." : "No students found matching your search."}
          </div>
        ) : isGrouped && groupedStudents ? (
          Array.from(groupedStudents.entries()).map(([cls, clsStudents]) => (
            <div key={cls}>
              <MobileGroupHeader className={cls} students={clsStudents} />
              <div className="flex flex-col gap-2">
                {clsStudents.map((student) => (
                  <div key={student.id} className={cn("rounded-lg border p-4 transition-colors", getMobileCardStyle(student.faceStatus))}>
                    <div className="flex items-center gap-3">
                      <StudentAvatar student={student} size="sm" />
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="font-medium text-foreground truncate">{student.name}</span>
                        <span className="text-xs text-muted-foreground font-mono">{student.roll}</span>
                      </div>
                      <FaceStatusBadge status={student.faceStatus} />
                    </div>
                    <div className="mt-2 flex items-center gap-2 pl-13">
                      <span className="text-xs text-muted-foreground">{student.class}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{student.year}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          filtered.map((student) => (
            <div key={student.id} className={cn("rounded-lg border p-4 transition-colors", getMobileCardStyle(student.faceStatus))}>
              <div className="flex items-center gap-3">
                <StudentAvatar student={student} size="sm" />
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-medium text-foreground truncate">{student.name}</span>
                  <span className="text-xs text-muted-foreground font-mono">{student.roll}</span>
                </div>
                <FaceStatusBadge status={student.faceStatus} />
              </div>
              <div className="mt-2 flex items-center gap-2 pl-13">
                <span className="text-xs text-muted-foreground">{student.class}</span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">{student.year}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}