"use client"

import { useEffect, useState, useMemo, useCallback, Fragment } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { FaceApprovalSkeleton } from "@/components/ui/skeletons"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  CheckCircle2,
  ScanFace,
  Loader2,
  RefreshCw,
  Check,
  X,
  Users,
  Clock,
  ShieldCheck,
  Search,
  Eye,
  Building2,
  GraduationCap,
  Calendar,
  ArrowUpDown,
  AlertCircle,
  Hash,
  ChevronDown,
  ChevronRight,
  UserX,
  Layers,
  UserCheck,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export type BiometricStatus = "Approved" | "Pending" | "Rejected" | "None"

export interface EnrolledStudent {
  id: string
  name: string
  roll: string
  classId: string
  className: string
  classSection: string
  cohortLabel: string
  deptId: string
  deptCode: string
  deptName: string
  year: string
  faceStatus: BiometricStatus
  isActive: boolean
  registrationPhoto: string | null
  createdAt: string
  contactEmail: string | null
}

export interface ClassOption {
  id: string
  label: string
  name: string
  section: string
  year: string
  classSection: string
  deptCode: string
  deptId: string
}

export interface DeptOption {
  id: string
  name: string
  code: string
}

function formatRegistrationDate(dateStr?: string): string {
  if (!dateStr) return "—"
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return (
      d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }) +
      " · " +
      d.toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    )
  } catch {
    return dateStr
  }
}

function BiometricStatusBadge({ status }: { status: BiometricStatus }) {
  switch (status) {
    case "Approved":
      return (
        <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-300/80 hover:bg-emerald-500/20 font-semibold dark:border-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="size-3 mr-1" /> Verified & Approved
        </Badge>
      )
    case "Pending":
      return (
        <Badge className="bg-amber-500/15 text-amber-700 border-amber-300/80 hover:bg-amber-500/20 font-semibold dark:border-amber-800 dark:text-amber-300">
          <Clock className="size-3 mr-1" /> Pending Approval
        </Badge>
      )
    case "Rejected":
      return (
        <Badge className="bg-rose-500/15 text-rose-700 border-rose-300/80 hover:bg-rose-500/20 font-semibold dark:border-rose-800 dark:text-rose-300">
          <X className="size-3 mr-1" /> Rejected (Purged)
        </Badge>
      )
    case "None":
      return (
        <Badge variant="outline" className="bg-muted text-muted-foreground border-border font-medium">
          Not Registered
        </Badge>
      )
  }
}

function StudentPhotoThumbnail({
  src,
  name,
  size = "md",
}: {
  src: string | null
  name: string
  size?: "lg" | "md" | "sm"
}) {
  const [hovered, setHovered] = useState(false)
  const dim = size === "lg" ? "w-13 h-13" : size === "md" ? "w-11 h-11" : "w-9 h-9"
  const iconSize = size === "lg" ? "size-6" : "size-4.5"

  return (
    <div
      className="relative shrink-0"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          className={cn(
            dim,
            "rounded-xl object-cover object-top border border-border shrink-0 shadow-2xs transition-transform hover:scale-105"
          )}
        />
      ) : (
        <div
          className={cn(
            dim,
            "rounded-xl bg-muted/60 flex items-center justify-center border border-border shrink-0"
          )}
        >
          <ScanFace className={cn(iconSize, "text-muted-foreground/40")} />
        </div>
      )}

      {hovered && src && (
        <div className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 z-50 pointer-events-none hidden sm:block">
          <div className="rounded-xl overflow-hidden border border-border shadow-2xl bg-card p-1">
            <img
              src={src}
              alt={name}
              style={{
                width: 120,
                height: 120,
                objectFit: "cover",
                objectPosition: "center top",
                borderRadius: 8,
              }}
            />
            <div className="pt-1 text-center">
              <span className="text-[11px] font-semibold text-foreground truncate block max-w-30">
                {name}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminFaceApprovalPage() {
  const [students, setStudents] = useState<EnrolledStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "all">("pending")
  const [showCohortBreakdown, setShowCohortBreakdown] = useState(false)

  // Actions & Modals state
  const [approveTarget, setApproveTarget] = useState<{ studentId: string; name: string } | null>(null)
  const [rejectTarget, setRejectTarget] = useState<{ studentId: string; name: string } | null>(null)
  const [viewTarget, setViewTarget] = useState<EnrolledStudent | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Options & Dropdowns
  const [classOptions, setClassOptions] = useState<ClassOption[]>([])
  const [deptOptions, setDeptOptions] = useState<DeptOption[]>([])

  // Filters & Search state
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDept, setSelectedDept] = useState("all")
  const [selectedYear, setSelectedYear] = useState("all")
  const [selectedSection, setSelectedSection] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState<"all" | BiometricStatus>("all")
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name_asc" | "roll_asc">("newest")

  const fetchStudentsAndMetadata = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()

      const [studentsRes, classesRes, deptsRes] = await Promise.all([
        supabase
          .from("students")
          .select(`
            id, roll_number, year, is_active, created_at, embedding_a, is_approved, is_rejected,
            registration_photo_url, class_id, department_id,
            class:classes ( id, name, section, year, department:departments ( code, id, name ) ),
            user:users ( full_name, contact_email )
          `)
          .order("created_at", { ascending: false }),
        supabase
          .from("classes")
          .select("id, name, section, year, department:departments ( id, name, code )")
          .order("name"),
        supabase.from("departments").select("id, name, code").order("name"),
      ])

      if (studentsRes.error) throw studentsRes.error

      const mapped: EnrolledStudent[] = (studentsRes.data || []).map((s: any) => {
        const classData = s.class
        const deptCode = classData?.department?.code ?? s.department?.code ?? "N/A"
        const deptName = classData?.department?.name ?? s.department?.name ?? "Department"
        const classSection = classData?.section ? `${deptCode}-${classData.section}` : "—"
        const cohortLabel = classData?.section
          ? `${deptCode}-${classData.section} · ${s.year || classData.year}`
          : "Unassigned Cohort"
        const hasEmbedding = !!s.embedding_a
        const isApproved = s.is_approved === true
        const isRejected = s.is_rejected === true

        // Strict 4-state lifecycle from forensic audit
        const faceStatus: BiometricStatus = isRejected
          ? "Rejected"
          : !hasEmbedding
          ? "None"
          : isApproved
          ? "Approved"
          : "Pending"

        return {
          id: s.id,
          name: s.user?.full_name ?? "Unknown",
          roll: s.roll_number,
          classId: s.class_id ?? classData?.id ?? "",
          className: classData?.name ?? "",
          classSection,
          cohortLabel,
          deptId: s.department_id ?? classData?.department?.id ?? "",
          deptCode,
          deptName,
          year: s.year || classData?.year || "N/A",
          faceStatus,
          isActive: s.is_active ?? true,
          registrationPhoto: s.registration_photo_url ?? null,
          createdAt: s.created_at,
          contactEmail: s.user?.contact_email ?? null,
        }
      })

      setStudents(mapped)

      if (classesRes.data) {
        setClassOptions(
          classesRes.data.map((c: any) => ({
            id: c.id,
            label: `${c.department?.code ?? c.name}-${c.section} · ${c.year}`,
            name: c.name,
            section: c.section,
            year: c.year,
            classSection: `${c.department?.code ?? c.name}-${c.section}`,
            deptCode: c.department?.code ?? "",
            deptId: c.department?.id ?? "",
          }))
        )
      }

      if (deptsRes.data) {
        setDeptOptions(deptsRes.data.map((d: any) => ({ id: d.id, name: d.name, code: d.code })))
      }
    } catch {
      toast.error("Failed to load face verification roster")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStudentsAndMetadata()
  }, [fetchStudentsAndMetadata])

  const handleApprove = async () => {
    if (!approveTarget) return
    setActionLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("students")
        .update({ is_approved: true })
        .eq("id", approveTarget.studentId)
      if (error) throw error

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        await supabase.from("system_logs").insert({
          performed_by: user.id,
          action_type: "update",
          description: `Student face registration approved by admin: ${approveTarget.name}`,
        })
      }

      toast.success(`Approved face registration for ${approveTarget.name}`)
      window.dispatchEvent(new Event("face-approval-updated"))

      // Update local state immediately
      setStudents((prev) =>
        prev.map((s) => (s.id === approveTarget.studentId ? { ...s, faceStatus: "Approved" } : s))
      )
      if (viewTarget?.id === approveTarget.studentId) {
        setViewTarget((prev) => (prev ? { ...prev, faceStatus: "Approved" } : null))
      }
    } catch {
      toast.error("Failed to approve registration")
    } finally {
      setActionLoading(false)
      setApproveTarget(null)
    }
  }

  const handleReject = async () => {
    if (!rejectTarget) return
    setActionLoading(true)
    try {
      const response = await fetch("/api/teacher/reject-face", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: rejectTarget.studentId }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to reject")

      toast.success(`Rejected face registration for ${rejectTarget.name}`)
      window.dispatchEvent(new Event("face-approval-updated"))

      // Update local state immediately
      setStudents((prev) =>
        prev.map((s) =>
          s.id === rejectTarget.studentId
            ? { ...s, faceStatus: "Rejected", registrationPhoto: null }
            : s
        )
      )
      if (viewTarget?.id === rejectTarget.studentId) {
        setViewTarget((prev) =>
          prev ? { ...prev, faceStatus: "Rejected", registrationPhoto: null } : null
        )
      }
    } catch {
      toast.error("Failed to reject registration")
    } finally {
      setActionLoading(false)
      setRejectTarget(null)
    }
  }

  // Campus-level aggregate counts
  const campusStats = useMemo(() => {
    const total = students.length
    const active = students.filter((s) => s.isActive).length
    const approved = students.filter((s) => s.faceStatus === "Approved").length
    const pending = students.filter((s) => s.faceStatus === "Pending").length
    const rejected = students.filter((s) => s.faceStatus === "Rejected").length
    const notRegistered = students.filter((s) => s.faceStatus === "None").length

    const approvedPct = total > 0 ? Math.round((approved / total) * 100) : 0
    const pendingPct = total > 0 ? Math.round((pending / total) * 100) : 0
    const rejectedPct = total > 0 ? Math.round((rejected / total) * 100) : 0
    const notRegisteredPct =
      total > 0 ? Math.max(0, 100 - approvedPct - pendingPct - rejectedPct) : 0

    return {
      total,
      active,
      approved,
      pending,
      rejected,
      notRegistered,
      approvedPct,
      pendingPct,
      rejectedPct,
      notRegisteredPct,
    }
  }, [students])

  // Department -> Year -> Section Cohort Breakdown Tree
  const departmentTree = useMemo(() => {
    const map = new Map<
      string,
      {
        deptCode: string
        deptName: string
        total: number
        approved: number
        pending: number
        rejected: number
        none: number
        years: Map<
          string,
          {
            year: string
            total: number
            approved: number
            pending: number
            rejected: number
            none: number
            cohorts: Map<
              string,
              {
                cohortLabel: string
                classSection: string
                total: number
                approved: number
                pending: number
                rejected: number
                none: number
                students: EnrolledStudent[]
              }
            >
          }
        >
      }
    >()

    for (const s of students) {
      const dCode = s.deptCode || "Other"
      const dName = s.deptName || "Department"
      const yr = s.year || "N/A"
      const cohort = s.cohortLabel || "Unassigned"

      if (!map.has(dCode)) {
        map.set(dCode, {
          deptCode: dCode,
          deptName: dName,
          total: 0,
          approved: 0,
          pending: 0,
          rejected: 0,
          none: 0,
          years: new Map(),
        })
      }
      const deptEntry = map.get(dCode)!
      deptEntry.total++
      if (s.faceStatus === "Approved") deptEntry.approved++
      else if (s.faceStatus === "Pending") deptEntry.pending++
      else if (s.faceStatus === "Rejected") deptEntry.rejected++
      else deptEntry.none++

      if (!deptEntry.years.has(yr)) {
        deptEntry.years.set(yr, {
          year: yr,
          total: 0,
          approved: 0,
          pending: 0,
          rejected: 0,
          none: 0,
          cohorts: new Map(),
        })
      }
      const yearEntry = deptEntry.years.get(yr)!
      yearEntry.total++
      if (s.faceStatus === "Approved") yearEntry.approved++
      else if (s.faceStatus === "Pending") yearEntry.pending++
      else if (s.faceStatus === "Rejected") yearEntry.rejected++
      else yearEntry.none++

      if (!yearEntry.cohorts.has(cohort)) {
        yearEntry.cohorts.set(cohort, {
          cohortLabel: cohort,
          classSection: s.classSection,
          total: 0,
          approved: 0,
          pending: 0,
          rejected: 0,
          none: 0,
          students: [],
        })
      }
      const cohortEntry = yearEntry.cohorts.get(cohort)!
      cohortEntry.total++
      cohortEntry.students.push(s)
      if (s.faceStatus === "Approved") cohortEntry.approved++
      else if (s.faceStatus === "Pending") cohortEntry.pending++
      else if (s.faceStatus === "Rejected") cohortEntry.rejected++
      else cohortEntry.none++
    }

    return Array.from(map.values())
  }, [students])

  // Cascading filter options
  const availableAcademicYears = useMemo(() => {
    let list = classOptions
    if (selectedDept !== "all") {
      list = list.filter((c) => c.deptCode === selectedDept || c.deptId === selectedDept)
    }
    const set = new Set(list.map((c) => c.year).filter(Boolean))
    return Array.from(set).sort()
  }, [classOptions, selectedDept])

  const availableSections = useMemo(() => {
    let list = classOptions
    if (selectedDept !== "all") {
      list = list.filter((c) => c.deptCode === selectedDept || c.deptId === selectedDept)
    }
    if (selectedYear !== "all") {
      list = list.filter((c) => c.year === selectedYear)
    }
    const set = new Set(list.map((c) => c.classSection).filter(Boolean))
    return Array.from(set).sort()
  }, [classOptions, selectedDept, selectedYear])

  // Reset cascading dependent filters if invalid
  useEffect(() => {
    if (selectedYear !== "all" && !availableAcademicYears.includes(selectedYear)) {
      setSelectedYear("all")
    }
  }, [availableAcademicYears, selectedYear])

  useEffect(() => {
    if (selectedSection !== "all" && !availableSections.includes(selectedSection)) {
      setSelectedSection("all")
    }
  }, [availableSections, selectedSection])

  // Active view dataset filtering
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // Tab constraint
      if (activeTab === "pending" && s.faceStatus !== "Pending") return false
      if (activeTab === "approved" && s.faceStatus !== "Approved") return false

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchName = s.name.toLowerCase().includes(q)
        const matchRoll = s.roll.toLowerCase().includes(q)
        if (!matchName && !matchRoll) return false
      }

      // Department Filter
      if (selectedDept !== "all" && s.deptCode !== selectedDept && s.deptId !== selectedDept) {
        return false
      }

      // Academic Year Filter
      if (selectedYear !== "all" && s.year !== selectedYear) {
        return false
      }

      // Section Filter
      if (selectedSection !== "all" && s.classSection !== selectedSection) {
        return false
      }

      // Status Filter (used on 'all' tab or universal)
      if (selectedStatus !== "all" && s.faceStatus !== selectedStatus) {
        return false
      }

      return true
    })
  }, [students, activeTab, searchQuery, selectedDept, selectedYear, selectedSection, selectedStatus])

  // Sort filtered list
  const sortedStudents = useMemo(() => {
    const list = [...filteredStudents]
    list.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      }
      if (sortBy === "oldest") {
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
      }
      if (sortBy === "name_asc") {
        return a.name.localeCompare(b.name)
      }
      if (sortBy === "roll_asc") {
        return a.roll.localeCompare(b.roll)
      }
      return 0
    })
    return list
  }, [filteredStudents, sortBy])

  // Group sorted results by Cohort Label
  const groupedCohorts = useMemo(() => {
    const map = new Map<string, EnrolledStudent[]>()
    for (const s of sortedStudents) {
      const key = s.cohortLabel || "Unassigned Cohort"
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(s)
    }
    return Array.from(map.entries())
  }, [sortedStudents])

  const isFilterActive =
    searchQuery.trim() !== "" ||
    selectedDept !== "all" ||
    selectedYear !== "all" ||
    selectedSection !== "all" ||
    selectedStatus !== "all" ||
    sortBy !== "newest"

  const clearAllFilters = () => {
    setSearchQuery("")
    setSelectedDept("all")
    setSelectedYear("all")
    setSelectedSection("all")
    setSelectedStatus("all")
    setSortBy("newest")
  }

  /* ---------- Stat cards ---------- */
  const statCards = [
    {
      label: "Total Students",
      value: campusStats.total,
      icon: Users,
      accent: "border-sky-200/80 bg-linear-to-b from-sky-500/5 via-card to-card hover:border-sky-300 dark:border-sky-900/50 dark:from-sky-950/20",
      iconColor: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
      tag: "Enrolled",
      tagColor: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
      trend: "Total student population",
    },
    {
      label: "Active Roster",
      value: campusStats.active,
      icon: UserCheck,
      accent: "border-teal-200/80 bg-linear-to-b from-teal-500/5 via-card to-card hover:border-teal-300 dark:border-teal-900/50 dark:from-teal-950/20",
      iconColor: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
      tag: "Active",
      tagColor: "bg-teal-500/10 text-teal-700 dark:text-teal-300",
      trend: "Active student records",
    },
    {
      label: "Pending Approval",
      value: campusStats.pending,
      icon: Clock,
      accent:
        campusStats.pending > 0
          ? "border-amber-300/80 bg-linear-to-b from-amber-500/10 via-card to-card hover:border-amber-400 dark:border-amber-800/60 dark:from-amber-950/30"
          : "border-amber-200/80 bg-linear-to-b from-amber-500/5 via-card to-card hover:border-amber-300 dark:border-amber-900/50 dark:from-amber-950/20",
      iconColor:
        campusStats.pending > 0
          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 animate-pulse"
          : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      tag: "Queue",
      tagColor: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
      trend: "Awaiting verification",
    },
    {
      label: "Approved",
      value: campusStats.approved,
      icon: ShieldCheck,
      accent: "border-emerald-200/80 bg-linear-to-b from-emerald-500/5 via-card to-card hover:border-emerald-300 dark:border-emerald-900/50 dark:from-emerald-950/20",
      iconColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      tag: "Verified",
      tagColor: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      trend: "Biometrics verified",
    },
    {
      label: "Rejected",
      value: campusStats.rejected,
      icon: X,
      accent: "border-rose-200/80 bg-linear-to-b from-rose-500/5 via-card to-card hover:border-rose-300 dark:border-rose-900/50 dark:from-rose-950/20",
      iconColor: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
      tag: "Purged",
      tagColor: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
      trend: "Rejected & removed",
    },
    {
      label: "Not Registered",
      value: campusStats.notRegistered,
      icon: UserX,
      accent: "border-slate-200/80 bg-linear-to-b from-slate-500/5 via-card to-card hover:border-slate-300 dark:border-slate-800 dark:from-slate-900/30",
      iconColor: "bg-muted text-muted-foreground",
      tag: "No Capture",
      tagColor: "bg-muted text-muted-foreground",
      trend: "Face capture pending",
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* ── Stat Cards (Consistent with Academic Structure & Teacher Assignments) ── */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 lg:gap-4">
          {statCards.map((s) => (
            <div
              key={s.label}
              className={cn(
                "group relative overflow-hidden rounded-xl border p-3.5 lg:p-4 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
                s.accent
              )}
            >
              <div className="flex items-center justify-between mb-2.5">
                <div className={cn("flex size-8.5 items-center justify-center rounded-lg", s.iconColor)}>
                  <s.icon className="size-4.5" />
                </div>
                <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", s.tagColor)}>
                  {s.tag}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground leading-none">
                  {s.value}
                </div>
                <div className="text-xs font-semibold text-foreground/80 mt-1">{s.label}</div>
                <div className="text-[11px] text-muted-foreground truncate">{s.trend}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Segmented Navigation & Action Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Segmented view tabs */}
        <div className="inline-flex flex-wrap items-center gap-1.5 rounded-xl bg-muted/60 p-1.5 border border-border/70 shadow-2xs">
          <button
            onClick={() => setActiveTab("pending")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer select-none",
              activeTab === "pending"
                ? "bg-card text-foreground shadow-xs ring-1 ring-border/80"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <Clock className="size-3.5 text-amber-500" />
            <span>Pending Queue</span>
            <span
              className={cn(
                "flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-extrabold min-w-5 tabular-nums transition-colors",
                activeTab === "pending"
                  ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {campusStats.pending}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("approved")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer select-none",
              activeTab === "approved"
                ? "bg-card text-foreground shadow-xs ring-1 ring-border/80"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <ShieldCheck className="size-3.5 text-emerald-500" />
            <span>Approved Directory</span>
            <span
              className={cn(
                "flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-extrabold min-w-5 tabular-nums transition-colors",
                activeTab === "approved"
                  ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {campusStats.approved}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("all")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer select-none",
              activeTab === "all"
                ? "bg-card text-foreground shadow-xs ring-1 ring-border/80"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <Users className="size-3.5 text-primary" />
            <span>All Biometrics Roster</span>
            <span className="flex items-center justify-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-extrabold text-muted-foreground min-w-5 tabular-nums">
              {campusStats.total}
            </span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCohortBreakdown((prev) => !prev)}
            className="rounded-xl text-xs font-semibold gap-1.5 h-9.5 px-3.5 shadow-2xs cursor-pointer border-border/80 bg-card hover:bg-muted/80"
          >
            <Layers className="size-3.5 text-primary" />
            <span>{showCohortBreakdown ? "Hide Cohort Tree" : "View Cohort Breakdown"}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStudentsAndMetadata}
            disabled={loading}
            className="rounded-xl text-xs font-semibold gap-1.5 h-9.5 px-3.5 shadow-2xs cursor-pointer border-border/80 bg-card hover:bg-muted/80"
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* ── 2. Biometric Status Overview Distribution Bar ── */}
      {!loading && campusStats.total > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground tracking-wide">
                Campus Biometric Distribution
              </span>
              <span className="text-[11px] text-muted-foreground">
                ({campusStats.total} total students)
              </span>
            </div>
          </div>

          {/* Multi-segment distribution bar */}
          <div className="h-3 w-full rounded-full bg-muted/60 flex overflow-hidden p-0.5 gap-0.5 border border-border/60">
            {campusStats.approved > 0 && (
              <div
                style={{ width: `${campusStats.approvedPct}%` }}
                className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                title={`Approved: ${campusStats.approved} (${campusStats.approvedPct}%)`}
              />
            )}
            {campusStats.pending > 0 && (
              <div
                style={{ width: `${campusStats.pendingPct}%` }}
                className="h-full rounded-full bg-amber-500 transition-all duration-300"
                title={`Pending: ${campusStats.pending} (${campusStats.pendingPct}%)`}
              />
            )}
            {campusStats.rejected > 0 && (
              <div
                style={{ width: `${campusStats.rejectedPct}%` }}
                className="h-full rounded-full bg-rose-500 transition-all duration-300"
                title={`Rejected: ${campusStats.rejected} (${campusStats.rejectedPct}%)`}
              />
            )}
            {campusStats.notRegistered > 0 && (
              <div
                style={{ width: `${campusStats.notRegisteredPct}%` }}
                className="h-full rounded-full bg-slate-300 dark:bg-slate-700 transition-all duration-300"
                title={`Not Registered: ${campusStats.notRegistered} (${campusStats.notRegisteredPct}%)`}
              />
            )}
          </div>

          {/* Segment breakdown legend */}
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500 inline-block" />
              <span className="text-foreground font-semibold">Approved:</span>
              <span className="text-muted-foreground font-mono">
                {campusStats.approved} ({campusStats.approvedPct}%)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-amber-500 inline-block" />
              <span className="text-foreground font-semibold">Pending:</span>
              <span className="text-muted-foreground font-mono">
                {campusStats.pending} ({campusStats.pendingPct}%)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-rose-500 inline-block" />
              <span className="text-foreground font-semibold">Rejected:</span>
              <span className="text-muted-foreground font-mono">
                {campusStats.rejected} ({campusStats.rejectedPct}%)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-slate-400 dark:bg-slate-600 inline-block" />
              <span className="text-foreground font-semibold">Not Registered:</span>
              <span className="text-muted-foreground font-mono">
                {campusStats.notRegistered} ({campusStats.notRegisteredPct}%)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. Department -> Academic Year -> Section Cohort Breakdown Tree (Collapsible) ── */}
      {showCohortBreakdown && !loading && (
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-3.5 mb-3.5 border-b border-border/70">
            <div className="flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Building2 className="size-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Institutional Cohort Breakdown
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Department → Academic Year → Section breakdown · Click any section to apply filters
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-[11px] font-semibold text-muted-foreground self-start sm:self-auto">
              {departmentTree.length} Departments
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {departmentTree.map((dept) => (
              <div
                key={dept.deptCode}
                className="rounded-xl border border-border/80 bg-muted/20 p-3.5 flex flex-col gap-3 transition-colors hover:border-primary/30"
              >
                {/* Department Header */}
                <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="rounded-md bg-primary/15 px-2 py-0.5 text-xs font-black text-primary tracking-wide shrink-0">
                      {dept.deptCode}
                    </span>
                    <span className="text-xs font-bold text-foreground truncate">
                      {dept.deptName}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-muted-foreground shrink-0 pl-2">
                    {dept.total} {dept.total === 1 ? "student" : "students"}
                  </span>
                </div>

                {/* Years & Sections */}
                <div className="flex flex-col gap-2.5">
                  {Array.from(dept.years.values()).map((yr) => (
                    <div key={yr.year} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1">
                        <span className="flex items-center gap-1">
                          <GraduationCap className="size-3 text-muted-foreground/70" />
                          {yr.year}
                        </span>
                        <span className="font-mono text-[10px] font-normal text-muted-foreground">
                          {yr.total} {yr.total === 1 ? "student" : "students"}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1">
                        {Array.from(yr.cohorts.values()).map((cohort) => (
                          <div
                            key={cohort.cohortLabel}
                            onClick={() => {
                              setSelectedDept(dept.deptCode)
                              setSelectedYear(yr.year)
                              setSelectedSection(cohort.classSection)
                            }}
                            className="group flex items-center justify-between rounded-lg p-2 bg-card hover:bg-muted/80 border border-border/60 hover:border-primary/40 transition-all cursor-pointer shadow-2xs"
                            title={`Filter by ${cohort.cohortLabel}`}
                          >
                            <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                              {cohort.classSection}
                            </span>
                            <div className="flex items-center gap-1 font-mono text-[10px] flex-wrap justify-end">
                              <span className="text-emerald-700 bg-emerald-500/15 dark:text-emerald-300 rounded px-1.5 py-0.5 font-semibold">
                                {cohort.approved} App
                              </span>
                              {cohort.pending > 0 && (
                                <span className="text-amber-700 bg-amber-500/20 dark:text-amber-300 rounded px-1.5 py-0.5 font-bold animate-pulse">
                                  {cohort.pending} Pend
                                </span>
                              )}
                              {cohort.rejected > 0 && (
                                <span className="text-rose-700 bg-rose-500/15 dark:text-rose-300 rounded px-1.5 py-0.5 font-semibold">
                                  {cohort.rejected} Rej
                                </span>
                              )}
                              {cohort.none > 0 && (
                                <span className="text-muted-foreground bg-muted rounded px-1.5 py-0.5 font-medium">
                                  {cohort.none} Not Reg
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}



      {/* ── 5. Compact Filter & Search Workspace ── */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3.5 sm:p-4 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 sm:gap-3 items-center">
          {/* Search Box */}
          <div className="relative sm:col-span-2 lg:col-span-4">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by student name or roll number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9.5 rounded-xl pl-9 pr-8 text-xs bg-muted/30 border-border focus-visible:ring-primary/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer"
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Department Filter */}
          <div className="lg:col-span-2">
            <Select value={selectedDept} onValueChange={(v) => { setSelectedDept(v); setSelectedSection("all"); }}>
              <SelectTrigger className="h-9.5 rounded-xl text-xs bg-muted/30 border-border font-medium">
                <div className="flex items-center gap-1.5 truncate">
                  <Building2 className="size-3 text-muted-foreground shrink-0" />
                  <span className="truncate">
                    {selectedDept === "all" ? "All Departments" : `Dept: ${selectedDept}`}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {deptOptions.map((dept) => (
                  <SelectItem key={dept.id} value={dept.code}>
                    {dept.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Academic Year Filter */}
          <div className="lg:col-span-2">
            <Select value={selectedYear} onValueChange={(v) => { setSelectedYear(v); setSelectedSection("all"); }}>
              <SelectTrigger className="h-9.5 rounded-xl text-xs bg-muted/30 border-border font-medium">
                <div className="flex items-center gap-1.5 truncate">
                  <GraduationCap className="size-3 text-muted-foreground shrink-0" />
                  <span className="truncate">
                    {selectedYear === "all" ? "All Years" : selectedYear}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Academic Years</SelectItem>
                {availableAcademicYears.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Class / Section Filter */}
          <div className="lg:col-span-2">
            <Select value={selectedSection} onValueChange={setSelectedSection}>
              <SelectTrigger className="h-9.5 rounded-xl text-xs bg-muted/30 border-border font-medium">
                <div className="flex items-center gap-1.5 truncate">
                  <Users className="size-3 text-muted-foreground shrink-0" />
                  <span className="truncate">
                    {selectedSection === "all" ? "All Sections" : `Section: ${selectedSection}`}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                {availableSections.map((sec) => (
                  <SelectItem key={sec} value={sec}>
                    {sec}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter (Active on 'all' tab or universal) */}
          {activeTab === "all" ? (
            <div className="lg:col-span-2">
              <Select value={selectedStatus} onValueChange={(v: any) => setSelectedStatus(v)}>
                <SelectTrigger className="h-9.5 rounded-xl text-xs bg-muted/30 border-border font-medium">
                  <div className="flex items-center gap-1.5 truncate">
                    <CheckCircle2 className="size-3 text-muted-foreground shrink-0" />
                    <span className="truncate">
                      {selectedStatus === "all" ? "All Statuses" : `Status: ${selectedStatus}`}
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                  <SelectItem value="None">Not Registered</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            /* Sort By */
            <div className="lg:col-span-2">
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger className="h-9.5 rounded-xl text-xs bg-muted/30 border-border font-medium">
                  <div className="flex items-center gap-1.5 truncate">
                    <ArrowUpDown className="size-3 text-muted-foreground shrink-0" />
                    <span className="truncate">
                      {sortBy === "newest"
                        ? "Newest First"
                        : sortBy === "oldest"
                        ? "Oldest First"
                        : sortBy === "name_asc"
                        ? "Name (A–Z)"
                        : "Roll Number"}
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="name_asc">Student Name (A–Z)</SelectItem>
                  <SelectItem value="roll_asc">Roll Number (A–Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Filter Summary & Active Chips Bar */}
        {isFilterActive && (
          <div className="flex flex-wrap items-center justify-between border-t border-border/60 pt-2 text-xs gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-muted-foreground">Active Filters:</span>
              {searchQuery && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-[11px] font-medium">
                  Search: &quot;{searchQuery}&quot;
                  <X className="size-3 cursor-pointer" onClick={() => setSearchQuery("")} />
                </span>
              )}
              {selectedDept !== "all" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted text-foreground px-2.5 py-0.5 text-[11px] font-medium">
                  Dept: {selectedDept}
                  <X className="size-3 cursor-pointer" onClick={() => setSelectedDept("all")} />
                </span>
              )}
              {selectedYear !== "all" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted text-foreground px-2.5 py-0.5 text-[11px] font-medium">
                  Year: {selectedYear}
                  <X className="size-3 cursor-pointer" onClick={() => setSelectedYear("all")} />
                </span>
              )}
              {selectedSection !== "all" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted text-foreground px-2.5 py-0.5 text-[11px] font-medium">
                  Section: {selectedSection}
                  <X className="size-3 cursor-pointer" onClick={() => setSelectedSection("all")} />
                </span>
              )}
              {selectedStatus !== "all" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted text-foreground px-2.5 py-0.5 text-[11px] font-medium">
                  Status: {selectedStatus}
                  <X className="size-3 cursor-pointer" onClick={() => setSelectedStatus("all")} />
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-muted-foreground">
                Showing {sortedStudents.length} of {students.length}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-7 text-xs font-semibold text-primary hover:text-primary/80 gap-1 px-2 cursor-pointer"
              >
                <X className="size-3" /> Clear All
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── 6. Main Content List by Cohorts ── */}
      {loading ? (
        <FaceApprovalSkeleton />
      ) : sortedStudents.length === 0 ? (
        /* Empty State */
        <Card className="rounded-2xl border border-dashed border-border shadow-xs">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            {activeTab === "pending" && !isFilterActive ? (
              <>
                <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-7" />
                </div>
                <h3 className="text-base font-bold text-foreground">All Caught Up!</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  There are no pending facial registrations requiring verification at this time.
                </p>
              </>
            ) : activeTab === "approved" && !isFilterActive ? (
              <>
                <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                  <ShieldCheck className="size-7" />
                </div>
                <h3 className="text-base font-bold text-foreground">No Approved Registrations</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  Approved biometric face templates will be indexed here.
                </p>
              </>
            ) : (
              <>
                <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <Search className="size-5" />
                </div>
                <h3 className="text-sm font-bold text-foreground">No matching students found</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  No records match your active search and filter combinations.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFilters}
                  className="mt-4 h-8 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
                >
                  <X className="size-3.5" /> Clear Filters
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Grouped Cohort Lists */
        <div className="flex flex-col gap-4">
          {groupedCohorts.map(([cohortTitle, cohortStudents]) => {
            const cApproved = cohortStudents.filter((s) => s.faceStatus === "Approved").length
            const cPending = cohortStudents.filter((s) => s.faceStatus === "Pending").length
            const cRejected = cohortStudents.filter((s) => s.faceStatus === "Rejected").length
            const cNone = cohortStudents.filter((s) => s.faceStatus === "None").length

            return (
              <div
                key={cohortTitle}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xs"
              >
                {/* Cohort Header with Summary Badges */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/80 bg-muted/30 px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <GraduationCap className="size-4" />
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-foreground">
                      {cohortTitle}
                    </span>
                    <Badge variant="secondary" className="text-[10px] font-semibold px-2 py-0.2">
                      {cohortStudents.length} student{cohortStudents.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>

                  {/* Metric Pills for Cohort */}
                  <div className="flex items-center gap-1.5 text-[11px] font-medium font-mono">
                    <span className="rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-2 py-0.5">
                      {cApproved} Approved
                    </span>
                    {cPending > 0 && (
                      <span className="rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 px-2 py-0.5 font-bold">
                        {cPending} Pending
                      </span>
                    )}
                    {cRejected > 0 && (
                      <span className="rounded-md bg-rose-500/15 text-rose-700 dark:text-rose-300 px-2 py-0.5">
                        {cRejected} Rejected
                      </span>
                    )}
                    {cNone > 0 && (
                      <span className="rounded-md bg-muted text-muted-foreground px-2 py-0.5">
                        {cNone} Not Reg
                      </span>
                    )}
                  </div>
                </div>

                {/* Cohort Student Rows */}
                <div className="divide-y divide-border/60">
                  {cohortStudents.map((student) => (
                    <div
                      key={student.id}
                      className={cn(
                        "flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 p-4 transition-colors",
                        student.faceStatus === "Pending"
                          ? "hover:bg-amber-500/5"
                          : student.faceStatus === "Approved"
                          ? "hover:bg-emerald-500/5"
                          : "hover:bg-muted/20"
                      )}
                    >
                      {/* Left: Identity & Metadata */}
                      <div className="flex flex-1 items-start sm:items-center gap-3.5 min-w-0">
                        <StudentPhotoThumbnail
                          src={student.registrationPhoto}
                          name={student.name}
                          size="lg"
                        />
                        <div className="flex flex-col gap-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-foreground truncate">
                              {student.name}
                            </span>
                            <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-semibold text-muted-foreground">
                              {student.roll}
                            </span>
                            <BiometricStatusBadge status={student.faceStatus} />
                          </div>

                          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <Building2 className="size-3 text-muted-foreground/70" />
                              {student.deptCode} · {student.classSection}
                            </span>
                            <span>·</span>
                            <span>{student.year}</span>
                            <span>·</span>
                            <span className="flex items-center gap-1 text-[11px]">
                              <Calendar className="size-3 text-muted-foreground/70" />
                              {student.registrationPhoto
                                ? formatRegistrationDate(student.createdAt)
                                : "No enrollment"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions Column with Consistent Horizontal Alignment */}
                      <div className="flex items-center justify-end gap-2 self-end sm:self-center shrink-0 sm:min-w-64">
                        {/* View Button - Always at the exact same horizontal column */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setViewTarget(student)}
                          className="h-8.5 rounded-xl text-xs font-semibold gap-1.5 px-3 border-border hover:bg-muted shadow-2xs cursor-pointer shrink-0"
                          aria-label={`View details for ${student.name}`}
                        >
                          <Eye className="size-3.5 text-muted-foreground" />
                          <span>View</span>
                        </Button>

                        {/* State-specific actions slot */}
                        <div className="flex items-center justify-end gap-1.5 sm:min-w-40 shrink-0">
                          {/* Pending Actions */}
                          {student.faceStatus === "Pending" && (
                            <>
                              <Button
                                size="sm"
                                className="h-8.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1 px-3 shadow-2xs cursor-pointer shrink-0"
                                onClick={() =>
                                  setApproveTarget({
                                    studentId: student.id,
                                    name: student.name,
                                  })
                                }
                              >
                                <Check className="size-3.5" />
                                <span>Approve</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8.5 rounded-xl text-xs font-semibold border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/30 gap-1 px-2.5 cursor-pointer shrink-0"
                                onClick={() =>
                                  setRejectTarget({
                                    studentId: student.id,
                                    name: student.name,
                                  })
                                }
                              >
                                <X className="size-3.5" />
                                <span>Reject</span>
                              </Button>
                            </>
                          )}

                          {/* Approved Actions */}
                          {student.faceStatus === "Approved" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 px-2.5 cursor-pointer"
                              onClick={() =>
                                setRejectTarget({
                                  studentId: student.id,
                                  name: student.name,
                                })
                              }
                            >
                              Reset
                            </Button>
                          )}

                          {/* Rejected Notice */}
                          {student.faceStatus === "Rejected" && (
                            <span className="text-[11px] text-muted-foreground italic truncate">
                              Awaiting re-capture
                            </span>
                          )}

                          {/* Not Registered Notice */}
                          {student.faceStatus === "None" && (
                            <span className="text-[11px] text-muted-foreground italic truncate">
                              No capture
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── 7. Student Verification Detail Modal (View Action) ── */}
      <Dialog open={!!viewTarget} onOpenChange={(open) => !open && setViewTarget(null)}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-border bg-card">
          <DialogHeader className="p-5 pb-4 border-b border-border bg-muted/20">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ScanFace className="size-4.5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Biometric Verification Card
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Inspect student facial biometric template and academic identity
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {viewTarget && (
            <div className="flex flex-col gap-4 p-5">
              {/* Photo Preview Card */}
              <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-muted/40 border border-border">
                {viewTarget.registrationPhoto ? (
                  <img
                    src={viewTarget.registrationPhoto}
                    alt={viewTarget.name}
                    className="size-48 rounded-xl object-cover object-top border border-border shadow-md"
                  />
                ) : (
                  <div className="flex size-48 flex-col items-center justify-center rounded-xl bg-muted border border-border text-muted-foreground text-center p-4">
                    <ScanFace className="size-12 opacity-40 mb-2" />
                    <span className="text-xs font-semibold">No Image Capture Stored</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">
                      {viewTarget.faceStatus === "Rejected"
                        ? "Photos were purged upon rejection."
                        : "Student has not yet enrolled their face."}
                    </span>
                  </div>
                )}
              </div>

              {/* Information Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-border/80 bg-muted/20 p-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-0.5">
                    Student Full Name
                  </span>
                  <span className="font-bold text-foreground text-sm truncate block">
                    {viewTarget.name}
                  </span>
                </div>

                <div className="rounded-xl border border-border/80 bg-muted/20 p-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-0.5">
                    Hall Ticket / Roll No.
                  </span>
                  <span className="font-mono font-bold text-foreground text-sm block">
                    {viewTarget.roll}
                  </span>
                </div>

                <div className="rounded-xl border border-border/80 bg-muted/20 p-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-0.5">
                    Cohort / Section
                  </span>
                  <span className="font-semibold text-foreground block">
                    {viewTarget.cohortLabel}
                  </span>
                </div>

                <div className="rounded-xl border border-border/80 bg-muted/20 p-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-0.5">
                    Biometric Status
                  </span>
                  <div className="mt-0.5">
                    <BiometricStatusBadge status={viewTarget.faceStatus} />
                  </div>
                </div>

                <div className="col-span-2 rounded-xl border border-border/80 bg-muted/20 p-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-0.5">
                    Registration Timestamp
                  </span>
                  <span className="font-medium text-foreground flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-muted-foreground" />
                    {formatRegistrationDate(viewTarget.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="p-4 border-t border-border bg-muted/20 flex flex-row items-center justify-between sm:justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewTarget(null)}
              className="rounded-xl text-xs font-semibold cursor-pointer"
            >
              Close
            </Button>

            {viewTarget && (
              <div className="flex items-center gap-2">
                {viewTarget.faceStatus === "Pending" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-xs font-semibold border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/60 dark:hover:bg-rose-950/30 cursor-pointer"
                      onClick={() => {
                        setRejectTarget({ studentId: viewTarget.id, name: viewTarget.name })
                      }}
                    >
                      <X className="size-3.5 mr-1" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      className="rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                      onClick={() => {
                        setApproveTarget({ studentId: viewTarget.id, name: viewTarget.name })
                      }}
                    >
                      <Check className="size-3.5 mr-1" />
                      Approve
                    </Button>
                  </>
                )}
                {viewTarget.faceStatus === "Approved" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl text-xs font-semibold border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/60 dark:hover:bg-rose-950/30 cursor-pointer"
                    onClick={() => {
                      setRejectTarget({ studentId: viewTarget.id, name: viewTarget.name })
                    }}
                  >
                    <X className="size-3.5 mr-1" />
                    Reset Biometric
                  </Button>
                )}
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 8. Approve Confirmation Dialog ── */}
      <AlertDialog open={!!approveTarget} onOpenChange={() => setApproveTarget(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-2.5 text-emerald-600 mb-1">
              <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/15">
                <CheckCircle2 className="size-4.5" />
              </div>
              <AlertDialogTitle className="text-base font-bold text-foreground">
                Approve Face Registration
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Confirm biometric approval for{" "}
              <strong className="text-foreground">{approveTarget?.name}</strong>? The student will be
              authorized to authenticate attendance using biometric scanning.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2">
            <AlertDialogCancel disabled={actionLoading} className="rounded-xl text-xs font-semibold">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              disabled={actionLoading}
              className="rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  Approving...
                </>
              ) : (
                "Confirm Approval"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── 9. Reject Confirmation Dialog ── */}
      <AlertDialog open={!!rejectTarget} onOpenChange={() => setRejectTarget(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-2.5 text-rose-600 mb-1">
              <div className="flex size-8 items-center justify-center rounded-xl bg-rose-500/15">
                <AlertCircle className="size-4.5" />
              </div>
              <AlertDialogTitle className="text-base font-bold text-foreground">
                Reject & Purge Face Template
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to reject the face registration for{" "}
              <strong className="text-foreground">{rejectTarget?.name}</strong>? The stored biometric
              embeddings and photo will be cleared, and the student will be prompted to re-register.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2">
            <AlertDialogCancel disabled={actionLoading} className="rounded-xl text-xs font-semibold">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={actionLoading}
              className="rounded-xl text-xs font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  Rejecting...
                </>
              ) : (
                "Confirm Rejection"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
