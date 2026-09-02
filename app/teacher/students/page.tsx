"use client"

import { useState, useEffect, useMemo, useCallback, Fragment } from "react"
import {
  Search,
  Users,
  UserCheck,
  AlertCircle,
  GraduationCap,
  RotateCcw,
  Filter,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function getAvatarRing(status: Student["faceStatus"]) {
  switch (status) {
    case "Approved":
      return "ring-2 ring-emerald-400 ring-offset-1"
    case "Pending":
      return "ring-2 ring-amber-400 ring-offset-1"
    case "Rejected":
      return "ring-2 ring-red-400 ring-offset-1"
    case "None":
      return "ring-1 ring-slate-200 ring-offset-1"
  }
}

function getAvatarFallbackStyle(status: Student["faceStatus"]) {
  switch (status) {
    case "Approved":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
    case "Pending":
      return "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
    case "Rejected":
      return "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-300"
    case "None":
      return "bg-primary/10 text-primary"
  }
}

function getRowStyle(status: Student["faceStatus"]) {
  switch (status) {
    case "Approved":
      return "bg-emerald-50/40 hover:bg-emerald-50/70 dark:bg-emerald-950/15 dark:hover:bg-emerald-950/25"
    case "Pending":
      return "bg-amber-50/40 hover:bg-amber-50/70 dark:bg-amber-950/15 dark:hover:bg-amber-950/25"
    case "Rejected":
      return "bg-red-50/40 hover:bg-red-50/70 dark:bg-red-950/15 dark:hover:bg-red-950/25"
    case "None":
      return "bg-card hover:bg-slate-50/60 dark:hover:bg-slate-900/40"
  }
}

function getMobileCardStyle(status: Student["faceStatus"]) {
  switch (status) {
    case "Approved":
      return "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20"
    case "Pending":
      return "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20"
    case "Rejected":
      return "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20"
    case "None":
      return "border-border bg-card"
  }
}

function FaceStatusBadge({ status }: { status: Student["faceStatus"] }) {
  switch (status) {
    case "Approved":
      return (
        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 font-medium">
          ✓ Approved
        </Badge>
      )
    case "Pending":
      return (
        <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 hover:bg-amber-50 font-medium">
          ⏳ Pending
        </Badge>
      )
    case "Rejected":
      return (
        <Badge className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800 hover:bg-red-50 font-medium">
          ✕ Rejected
        </Badge>
      )
    case "None":
      return (
        <Badge
          variant="outline"
          className="bg-muted/50 text-muted-foreground border-border hover:bg-muted/50 font-normal"
        >
          Not Registered
        </Badge>
      )
  }
}

function StudentAvatar({
  student,
  size = "md",
}: {
  student: Student
  size?: "sm" | "md"
}) {
  const [hovered, setHovered] = useState(false)
  const sizeClass = size === "md" ? "size-11" : "size-10"
  return (
    <div
      className="relative shrink-0"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Avatar className={cn(sizeClass, getAvatarRing(student.faceStatus))}>
        {student.photoUrl && (
          <AvatarImage
            src={student.photoUrl}
            alt={student.name}
            className="object-cover"
          />
        )}
        <AvatarFallback
          className={cn(
            "text-xs font-semibold",
            getAvatarFallbackStyle(student.faceStatus)
          )}
        >
          {getInitials(student.name)}
        </AvatarFallback>
      </Avatar>
      {hovered && student.photoUrl && (
        <div className="absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 z-50 pointer-events-none hidden sm:block">
          <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 bg-white dark:bg-slate-900 border-l-2 border-b-2 border-emerald-400" />
          <div className="rounded-xl overflow-hidden border-2 border-emerald-400 shadow-2xl bg-white dark:bg-slate-900">
            <img
              src={student.photoUrl}
              alt={student.name}
              style={{
                width: 112,
                height: 112,
                objectFit: "cover",
                objectPosition: "center top",
                display: "block",
              }}
            />
            <div className="bg-emerald-600 px-2 py-1 text-center">
              <span className="text-white text-xs font-semibold truncate block max-w-28">
                {student.name}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function GroupHeader({
  cohortName,
  students,
}: {
  cohortName: string
  students: Student[]
}) {
  const total = students.length
  const approved = students.filter((s) => s.faceStatus === "Approved").length
  const attention = total - approved
  const readyPercent = total > 0 ? Math.round((approved / total) * 100) : 0

  return (
    <tr className="bg-slate-100/90 dark:bg-slate-800/70 border-y border-border">
      <td colSpan={5} className="px-4 py-2.5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-sm font-bold text-foreground tracking-wide font-mono">
              {cohortName}
            </span>
            <span className="text-xs text-muted-foreground/60">·</span>
            <Badge
              variant="outline"
              className="text-xs font-semibold px-2 py-0.5 bg-card/80 border-border text-foreground"
            >
              {total} {total === 1 ? "student" : "students"}
            </Badge>
            {approved > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-full px-2.5 py-0.5">
                <span className="size-1.5 rounded-full bg-emerald-500 inline-block" />
                {approved} approved
              </span>
            )}
            {attention > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300 rounded-full px-2.5 py-0.5">
                <span className="size-1.5 rounded-full bg-amber-500 inline-block" />
                {attention} need attention
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "px-2.5 py-0.5 rounded-md font-mono text-[11px] font-semibold border shadow-2xs",
                readyPercent === 100
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300/60 dark:border-emerald-800/60"
                  : readyPercent > 0
                  ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-300/60 dark:border-blue-800/60"
                  : "bg-muted text-muted-foreground border-border"
              )}
            >
              {readyPercent === 100 ? "✓ 100% Ready" : `${readyPercent}% Ready`}
            </span>
          </div>
        </div>
      </td>
    </tr>
  )
}

function MobileGroupHeader({
  cohortName,
  students,
}: {
  cohortName: string
  students: Student[]
}) {
  const total = students.length
  const approved = students.filter((s) => s.faceStatus === "Approved").length
  const readyPercent = total > 0 ? Math.round((approved / total) * 100) : 0

  return (
    <div className="flex items-center justify-between gap-2 px-1 pt-3 pb-1.5 flex-wrap">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-bold text-foreground font-mono">
          {cohortName}
        </span>
        <span className="text-xs text-muted-foreground">· {total} students</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "px-2 py-0.5 rounded-md font-mono text-[10px] font-semibold border",
            readyPercent === 100
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300/60 dark:border-emerald-800/60"
              : readyPercent > 0
              ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-300/60 dark:border-blue-800/60"
              : "bg-muted text-muted-foreground border-border"
          )}
        >
          {readyPercent === 100 ? "100% Ready" : `${readyPercent}% Ready`}
        </span>
      </div>
    </div>
  )
}

function getCohortKey(s: Student) {
  if (s.class === "—") return "Unassigned"
  return s.year ? `${s.class} · ${s.year}` : s.class
}

export default function TeacherStudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [cohortFilter, setCohortFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  const fetchStudents = useCallback(async () => {
    setIsLoading(true)
    setFetchError(null)
    try {
      const res = await fetch("/api/teacher/student-list")
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        setFetchError(errData.error || "Failed to load students.")
        return
      }
      const data = await res.json()
      setStudents(data.students || [])
    } catch {
      setFetchError("An unexpected error occurred.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  // Derive unique authorized cohorts from the server-authorized student dataset
  const uniqueCohorts = useMemo(() => {
    const set = new Set<string>()
    for (const s of students) {
      const k = getCohortKey(s)
      if (k !== "Unassigned") set.add(k)
    }
    return Array.from(set).sort()
  }, [students])

  // Group unique authorized cohorts by year for dropdown rendering
  const cohortGroups = useMemo(() => {
    const map = new Map<string, Map<string, { key: string; className: string }>>()

    for (const s of students) {
      const key = getCohortKey(s)
      if (key === "Unassigned") continue

      const year = s.year && s.year.trim() ? s.year.trim() : "Other"
      const className = s.class || key

      if (!map.has(year)) {
        map.set(year, new Map())
      }
      if (!map.get(year)!.has(key)) {
        map.get(year)!.set(key, { key, className })
      }
    }

    const sortedYears = Array.from(map.keys()).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ""), 10)
      const numB = parseInt(b.replace(/\D/g, ""), 10)
      if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
        return numA - numB
      }
      return a.localeCompare(b)
    })

    return sortedYears.map((year) => ({
      year,
      cohorts: Array.from(map.get(year)!.values()).sort((a, b) =>
        a.className.localeCompare(b.className, undefined, { numeric: true, sensitivity: "base" })
      ),
    }))
  }, [students])

  // Filter students by search, cohort, and status
  const filtered = useMemo(() => {
    return students.filter((s) => {
      const q = search.toLowerCase().trim()
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.roll.toLowerCase().includes(q)

      const cKey = getCohortKey(s)
      const matchesCohort =
        cohortFilter === "all" || cKey === cohortFilter

      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "attention"
          ? s.faceStatus !== "Approved"
          : s.faceStatus === statusFilter

      return matchesSearch && matchesCohort && matchesStatus
    })
  }, [students, search, cohortFilter, statusFilter])

  // Group filtered students by cohort
  const groupedStudents = useMemo(() => {
    const map = new Map<string, Student[]>()
    for (const s of filtered) {
      const key = getCohortKey(s)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(s)
    }
    return map
  }, [filtered])

  // Top summary metrics (calculated only from authorized dataset)
  const stats = useMemo(() => {
    const total = students.length
    const ready = students.filter((s) => s.faceStatus === "Approved").length
    const needsAttention = total - ready
    const cohortsCount = uniqueCohorts.length

    return {
      total,
      ready,
      needsAttention,
      cohortsCount,
    }
  }, [students, uniqueCohorts])

  const hasActiveFilters =
    search.trim() !== "" ||
    cohortFilter !== "all" ||
    statusFilter !== "all"

  const handleResetFilters = () => {
    setSearch("")
    setCohortFilter("all")
    setStatusFilter("all")
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Students */}
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-2xs">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Users className="size-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground font-medium truncate">My Students</p>
            <p className="text-xl font-bold text-foreground leading-tight">
              {isLoading ? "—" : stats.total}
            </p>
          </div>
        </div>

        {/* Face Ready */}
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/70 dark:bg-emerald-950/25 dark:border-emerald-800/80 px-4 py-3 shadow-2xs">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400">
            <UserCheck className="size-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium truncate">Face Ready</p>
            <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300 leading-tight">
              {isLoading ? "—" : stats.ready}
            </p>
          </div>
        </div>

        {/* Needs Attention */}
        <div className="flex items-center gap-3 rounded-xl border border-amber-200/80 bg-amber-50/70 dark:bg-amber-950/25 dark:border-amber-800/80 px-4 py-3 shadow-2xs">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400">
            <AlertCircle className="size-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium truncate">Needs Attention</p>
            <p className="text-xl font-bold text-amber-700 dark:text-amber-300 leading-tight">
              {isLoading ? "—" : stats.needsAttention}
            </p>
          </div>
        </div>

        {/* Authorized Cohorts */}
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-2xs">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-400">
            <GraduationCap className="size-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground font-medium truncate">Cohorts</p>
            <p className="text-xl font-bold text-foreground leading-tight">
              {isLoading ? "—" : stats.cohortsCount}
            </p>
          </div>
        </div>
      </div>

      {/* Informational authorization banner */}
      <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50/80 dark:bg-blue-950/20 dark:border-blue-800 px-4 py-3">
        <Users className="size-4 text-blue-600 dark:text-blue-400 shrink-0" />
        <p className="text-sm text-blue-700 dark:text-blue-400">
          Showing students from your assigned cohorts. Student management is handled by admin.
        </p>
      </div>

      {/* Filter and search toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center rounded-2xl border border-border bg-card shadow-2xs w-full overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-border max-w-2xl">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-2.5 flex-[1.5] min-w-65">
            <Search className="size-4 text-muted-foreground shrink-0" />
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">
                Search
              </span>
              <Input
                placeholder="Search by name or roll..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-0 bg-transparent p-0 h-auto shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 font-medium w-full outline-none placeholder:text-muted-foreground/60 focus:bg-transparent"
              />
            </div>
          </div>

          {/* Cohort Filter */}
          <div className="flex items-center gap-3 px-4 py-2.5 flex-1 min-w-45">
            <GraduationCap className="size-4 text-muted-foreground shrink-0" />
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">
                Cohort
              </span>
              <Select value={cohortFilter} onValueChange={setCohortFilter}>
                <SelectTrigger className="border-0 bg-transparent p-0 h-auto shadow-none focus:ring-0 focus:ring-offset-0 font-medium w-full outline-none [&>svg]:opacity-50 hover:bg-transparent">
                  <SelectValue placeholder="All Cohorts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cohorts</SelectItem>
                  {cohortGroups.map((group) => (
                    <Fragment key={group.year}>
                      <SelectSeparator className="my-1" />
                      <SelectGroup>
                        <SelectLabel className="px-2.5 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {group.year}
                        </SelectLabel>
                        {group.cohorts.map((cohort) => (
                          <SelectItem key={cohort.key} value={cohort.key}>
                            {cohort.className}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </Fragment>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Face Status Filter */}
          <div className="flex items-center gap-3 px-4 py-2.5 flex-1 min-w-42.5">
            <Filter className="size-4 text-muted-foreground shrink-0" />
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">
                Face Status
              </span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="border-0 bg-transparent p-0 h-auto shadow-none focus:ring-0 focus:ring-offset-0 font-medium w-full outline-none [&>svg]:opacity-50 hover:bg-transparent">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="None">Not Registered</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Reset Filters button if active */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            className="text-xs text-muted-foreground hover:text-foreground self-start lg:self-center gap-1.5"
          >
            <RotateCcw className="size-3.5" />
            Reset Filters
          </Button>
        )}
      </div>

      {fetchError && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-8 text-center">
          <p className="text-sm font-medium text-destructive">{fetchError}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={fetchStudents}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Table desktop */}
      {isLoading ? (
        <div className="hidden md:block">
          <TableSkeleton cols={5} rows={6} hasAvatar={true} />
        </div>
      ) : (
        <div className="hidden rounded-xl border border-border bg-card md:block overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-slate-50/80 dark:bg-slate-900/60">
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                    Student
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                    Roll Number
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                    Class
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                    Year
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                    Face Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && !fetchError ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                      {students.length === 0 ? (
                        <div className="flex flex-col items-center gap-1.5">
                          <Users className="size-8 text-muted-foreground/50 mb-1" />
                          <p className="text-sm font-semibold text-foreground">
                            No students in your assigned cohorts yet.
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Student enrollments and cohort assignments are managed by your administrator.
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1.5">
                          <p className="text-sm font-medium text-foreground">
                            No students match the selected filters.
                          </p>
                          <Button
                            variant="link"
                            size="sm"
                            onClick={handleResetFilters}
                            className="text-xs text-primary"
                          >
                            Clear all filters
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  Array.from(groupedStudents.entries()).map(([cohortName, cohortStudents]) => (
                    <Fragment key={cohortName}>
                      <GroupHeader cohortName={cohortName} students={cohortStudents} />
                      {cohortStudents.map((s) => (
                        <tr
                          key={s.id}
                          className={cn(
                            "border-b border-border last:border-0 transition-colors",
                            getRowStyle(s.faceStatus)
                          )}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <StudentAvatar student={s} size="md" />
                              <span className="font-medium text-foreground">{s.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                            {s.roll}
                          </td>
                          <td className="px-4 py-3 text-foreground font-medium">{s.class}</td>
                          <td className="px-4 py-3 text-muted-foreground">{s.year}</td>
                          <td className="px-4 py-3">
                            <FaceStatusBadge status={s.faceStatus} />
                          </td>
                        </tr>
                      ))}
                    </Fragment>
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
          <div className="rounded-xl border border-border bg-card px-4 py-12 text-center text-muted-foreground">
            {students.length === 0 ? (
              <div className="flex flex-col items-center gap-1.5">
                <Users className="size-8 text-muted-foreground/50 mb-1" />
                <p className="text-sm font-semibold text-foreground">
                  No students in your assigned cohorts yet.
                </p>
                <p className="text-xs text-muted-foreground">
                  Student enrollments are managed by your administrator.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5">
                <p className="text-sm font-medium text-foreground">
                  No students match the selected filters.
                </p>
                <Button
                  variant="link"
                  size="sm"
                  onClick={handleResetFilters}
                  className="text-xs text-primary"
                >
                  Clear all filters
                </Button>
              </div>
            )}
          </div>
        ) : (
          Array.from(groupedStudents.entries()).map(([cohortName, cohortStudents]) => (
            <div key={cohortName} className="flex flex-col gap-2">
              <MobileGroupHeader cohortName={cohortName} students={cohortStudents} />
              <div className="flex flex-col gap-2">
                {cohortStudents.map((student) => (
                  <div
                    key={student.id}
                    className={cn(
                      "rounded-xl border p-4 transition-colors shadow-2xs",
                      getMobileCardStyle(student.faceStatus)
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <StudentAvatar student={student} size="sm" />
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="font-medium text-foreground truncate">
                          {student.name}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {student.roll}
                        </span>
                      </div>
                      <FaceStatusBadge status={student.faceStatus} />
                    </div>
                    <div className="mt-2.5 flex items-center gap-2 pl-13 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{student.class}</span>
                      <span>·</span>
                      <span>{student.year}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}