"use client"

import { useState, useEffect, useMemo, useCallback, Fragment } from "react"
import { toast } from "sonner"
import {
  Search, Plus, MoreHorizontal, Trash2, ChevronLeft, ChevronRight,
  Users, UserCheck, Clock, Loader2, User, Hash, GraduationCap,
  CalendarDays, Building2, Mail, ShieldCheck, X, UserX, AlertCircle,
  Eye, Edit3, KeyRound,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { TableSkeleton, ListSkeleton } from "@/components/ui/skeletons"

export interface Student {
  id: string
  name: string
  roll: string
  class: string
  classSection: string
  classId: string
  departmentId: string
  departmentCode: string
  year: string
  faceStatus: "Approved" | "Pending" | "Rejected" | "None"
  isActive: boolean
  photoUrl: string | null
  contactEmail: string | null
}

export interface ClassOption {
  id: string
  label: string
  name: string
  section: string
  year: string
  classSection: string
  deptName: string
  deptCode: string
  deptId: string
}

export interface DeptOption {
  id: string
  name: string
  code: string
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

const ROWS_PER_PAGE = 10

/* ---------- Scalable Cohort Color & Hierarchy System ---------- */

interface CohortTheme {
  borderLeft: string
  headerBg: string
  deptBadge: string
  yearBadge: string
  iconColor: string
}

const DEPARTMENT_PALETTES: Record<string, {
  borderLeft: string
  headerBg: string
  deptBadge: string
  iconColor: string
  yearVariants: Record<string, string>
}> = {
  CSE: {
    borderLeft: "border-l-sky-500",
    headerBg: "bg-sky-500/6 dark:bg-sky-950/25",
    deptBadge: "bg-sky-500/15 text-sky-800 dark:text-sky-200 border-sky-300/70 dark:border-sky-800/60",
    iconColor: "text-sky-600 dark:text-sky-400",
    yearVariants: {
      "1st Year": "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-900/50",
      "2nd Year": "bg-sky-500/15 text-sky-800 dark:text-sky-200 border-sky-300/70 dark:border-sky-800/60",
      "3rd Year": "bg-sky-500/20 text-sky-900 dark:text-sky-100 border-sky-400/70 dark:border-sky-700/60 font-semibold",
      "4th Year": "bg-sky-600/25 text-sky-950 dark:text-sky-50 border-sky-500/70 dark:border-sky-600/70 font-bold",
    },
  },
  CSD: {
    borderLeft: "border-l-teal-500",
    headerBg: "bg-teal-500/6 dark:bg-teal-950/25",
    deptBadge: "bg-teal-500/15 text-teal-800 dark:text-teal-200 border-teal-300/70 dark:border-teal-800/60",
    iconColor: "text-teal-600 dark:text-teal-400",
    yearVariants: {
      "1st Year": "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-900/50",
      "2nd Year": "bg-teal-500/15 text-teal-800 dark:text-teal-200 border-teal-300/70 dark:border-teal-800/60",
      "3rd Year": "bg-teal-500/20 text-teal-900 dark:text-teal-100 border-teal-400/70 dark:border-teal-700/60 font-semibold",
      "4th Year": "bg-teal-600/25 text-teal-950 dark:text-teal-50 border-teal-500/70 dark:border-teal-600/70 font-bold",
    },
  },
  ECE: {
    borderLeft: "border-l-violet-500",
    headerBg: "bg-violet-500/6 dark:bg-violet-950/25",
    deptBadge: "bg-violet-500/15 text-violet-800 dark:text-violet-200 border-violet-300/70 dark:border-violet-800/60",
    iconColor: "text-violet-600 dark:text-violet-400",
    yearVariants: {
      "1st Year": "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-900/50",
      "2nd Year": "bg-violet-500/15 text-violet-800 dark:text-violet-200 border-violet-300/70 dark:border-violet-800/60",
      "3rd Year": "bg-violet-500/20 text-violet-900 dark:text-violet-100 border-violet-400/70 dark:border-violet-700/60 font-semibold",
      "4th Year": "bg-violet-600/25 text-violet-950 dark:text-violet-50 border-violet-500/70 dark:border-violet-600/70 font-bold",
    },
  },
  MECH: {
    borderLeft: "border-l-amber-500",
    headerBg: "bg-amber-500/6 dark:bg-amber-950/25",
    deptBadge: "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-300/70 dark:border-amber-800/60",
    iconColor: "text-amber-600 dark:text-amber-400",
    yearVariants: {
      "1st Year": "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/50",
      "2nd Year": "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-300/70 dark:border-amber-800/60",
      "3rd Year": "bg-amber-500/20 text-amber-900 dark:text-amber-100 border-amber-400/70 dark:border-amber-700/60 font-semibold",
      "4th Year": "bg-amber-600/25 text-amber-950 dark:text-amber-50 border-amber-500/70 dark:border-amber-600/70 font-bold",
    },
  },
  CIVIL: {
    borderLeft: "border-l-emerald-500",
    headerBg: "bg-emerald-500/6 dark:bg-emerald-950/25",
    deptBadge: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-300/70 dark:border-emerald-800/60",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    yearVariants: {
      "1st Year": "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50",
      "2nd Year": "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-300/70 dark:border-emerald-800/60",
      "3rd Year": "bg-emerald-500/20 text-emerald-900 dark:text-emerald-100 border-emerald-400/70 dark:border-emerald-700/60 font-semibold",
      "4th Year": "bg-emerald-600/25 text-emerald-950 dark:text-emerald-50 border-emerald-500/70 dark:border-emerald-600/70 font-bold",
    },
  },
}

const FALLBACK_PALETTES = [
  {
    borderLeft: "border-l-indigo-500",
    headerBg: "bg-indigo-500/6 dark:bg-indigo-950/25",
    deptBadge: "bg-indigo-500/15 text-indigo-800 dark:text-indigo-200 border-indigo-300/70 dark:border-indigo-800/60",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    yearVariants: {
      "1st Year": "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200",
      "2nd Year": "bg-indigo-500/15 text-indigo-800 dark:text-indigo-200 border-indigo-300/70",
      "3rd Year": "bg-indigo-500/20 text-indigo-900 dark:text-indigo-100 border-indigo-400/70 font-semibold",
      "4th Year": "bg-indigo-600/25 text-indigo-950 dark:text-indigo-50 border-indigo-500/70 font-bold",
    },
  },
  {
    borderLeft: "border-l-cyan-500",
    headerBg: "bg-cyan-500/6 dark:bg-cyan-950/25",
    deptBadge: "bg-cyan-500/15 text-cyan-800 dark:text-cyan-200 border-cyan-300/70 dark:border-cyan-800/60",
    iconColor: "text-cyan-600 dark:text-cyan-400",
    yearVariants: {
      "1st Year": "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-200",
      "2nd Year": "bg-cyan-500/15 text-cyan-800 dark:text-cyan-200 border-cyan-300/70",
      "3rd Year": "bg-cyan-500/20 text-cyan-900 dark:text-cyan-100 border-cyan-400/70 font-semibold",
      "4th Year": "bg-cyan-600/25 text-cyan-950 dark:text-cyan-50 border-cyan-500/70 font-bold",
    },
  },
  {
    borderLeft: "border-l-rose-500",
    headerBg: "bg-rose-500/6 dark:bg-rose-950/25",
    deptBadge: "bg-rose-500/15 text-rose-800 dark:text-rose-200 border-rose-300/70 dark:border-rose-800/60",
    iconColor: "text-rose-600 dark:text-rose-400",
    yearVariants: {
      "1st Year": "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200",
      "2nd Year": "bg-rose-500/15 text-rose-800 dark:text-rose-200 border-rose-300/70",
      "3rd Year": "bg-rose-500/20 text-rose-900 dark:text-rose-100 border-rose-400/70 font-semibold",
      "4th Year": "bg-rose-600/25 text-rose-950 dark:text-rose-50 border-rose-500/70 font-bold",
    },
  },
]

function getCohortTheme(cohortTitle: string): CohortTheme {
  const parts = cohortTitle.split("·").map((p) => p.trim())
  const classPart = parts[0] || ""
  const yearPart = parts[1] || ""

  const deptCode = classPart.split("-")[0]?.toUpperCase() || "CSE"

  let palette = DEPARTMENT_PALETTES[deptCode]
  if (!palette) {
    let hash = 0
    for (let i = 0; i < deptCode.length; i++) {
      hash = (hash << 5) - hash + deptCode.charCodeAt(i)
    }
    palette = FALLBACK_PALETTES[Math.abs(hash) % FALLBACK_PALETTES.length]
  }

  const yearBadge =
    palette.yearVariants[yearPart] ||
    "bg-muted text-muted-foreground border-border text-xs"

  return {
    borderLeft: palette.borderLeft,
    headerBg: palette.headerBg,
    deptBadge: palette.deptBadge,
    yearBadge,
    iconColor: palette.iconColor,
  }
}

/* ---------- Biometric Status Visual Styles (Completely Independent from Cohort Colors) ---------- */

function getMobileCardStyle(status: Student["faceStatus"]) {
  switch (status) {
    case "Approved":
      return "border-emerald-200/80 bg-emerald-500/4 dark:border-emerald-800/60 dark:bg-emerald-950/15"
    case "Pending":
      return "border-amber-200/80 bg-amber-500/4 dark:border-amber-800/60 dark:bg-amber-950/15"
    case "Rejected":
      return "border-rose-200/80 bg-rose-500/4 dark:border-rose-800/60 dark:bg-rose-950/15"
    case "None":
      return "border-border bg-card"
  }
}

function getAvatarRing(status: Student["faceStatus"]) {
  switch (status) {
    case "Approved":
      return "ring-2 ring-emerald-500/60 ring-offset-1 dark:ring-offset-card"
    case "Pending":
      return "ring-2 ring-amber-500/60 ring-offset-1 dark:ring-offset-card animate-pulse"
    case "Rejected":
      return "ring-2 ring-rose-500/60 ring-offset-1 dark:ring-offset-card"
    case "None":
      return "ring-1 ring-border/80 ring-offset-1 dark:ring-offset-card"
  }
}

function getAvatarFallbackStyle(status: Student["faceStatus"]) {
  switch (status) {
    case "Approved":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
    case "Pending":
      return "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
    case "Rejected":
      return "bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300"
    case "None":
      return "bg-muted text-muted-foreground"
  }
}

function FaceStatusBadge({ status }: { status: Student["faceStatus"] }) {
  switch (status) {
    case "Approved":
      return (
        <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-300/80 hover:bg-emerald-500/20 font-semibold dark:border-emerald-800 dark:text-emerald-300 text-xs">
          ✓ Approved
        </Badge>
      )
    case "Pending":
      return (
        <Badge className="bg-amber-500/15 text-amber-700 border-amber-300/80 hover:bg-amber-500/20 font-semibold dark:border-amber-800 dark:text-amber-300 text-xs">
          ⏳ Pending
        </Badge>
      )
    case "Rejected":
      return (
        <Badge className="bg-rose-500/15 text-rose-700 border-rose-300/80 hover:bg-rose-500/20 font-semibold dark:border-rose-800 dark:text-rose-300 text-xs">
          ✕ Rejected
        </Badge>
      )
    case "None":
      return (
        <Badge variant="outline" className="bg-muted/70 text-muted-foreground border-border hover:bg-muted font-medium text-xs">
          Not Registered
        </Badge>
      )
  }
}

function StudentAvatar({ student, size = "md" }: { student: Student; size?: "sm" | "md" }) {
  const [hovered, setHovered] = useState(false)
  const sizeClass = size === "md" ? "size-10" : "size-9"
  return (
    <div className="relative shrink-0" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <Avatar className={cn(sizeClass, getAvatarRing(student.faceStatus))}>
        {student.photoUrl && <AvatarImage src={student.photoUrl} alt={student.name} className="object-cover" />}
        <AvatarFallback className={cn("text-xs font-semibold", getAvatarFallbackStyle(student.faceStatus))}>
          {getInitials(student.name)}
        </AvatarFallback>
      </Avatar>
      {hovered && student.photoUrl && (
        <div className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 z-50 pointer-events-none hidden sm:block">
          <div className="rounded-xl overflow-hidden border border-border shadow-2xl bg-card p-1">
            <img
              src={student.photoUrl}
              alt={student.name}
              style={{ width: 120, height: 120, objectFit: "cover", objectPosition: "center top", borderRadius: 8 }}
            />
            <div className="bg-emerald-600 px-2 py-1 text-center mt-1 rounded-md">
              <span className="text-white text-xs font-semibold truncate block max-w-28">{student.name}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CohortGroupHeader({ cohortTitle, students }: { cohortTitle: string; students: Student[] }) {
  const approved = students.filter((s) => s.faceStatus === "Approved").length
  const pending = students.filter((s) => s.faceStatus === "Pending").length
  const rejected = students.filter((s) => s.faceStatus === "Rejected").length
  const none = students.filter((s) => s.faceStatus === "None").length

  const theme = getCohortTheme(cohortTitle)
  const parts = cohortTitle.split("·").map((p) => p.trim())
  const classPart = parts[0] || cohortTitle
  const yearPart = parts[1] || ""

  return (
    <tr className={cn("border-y border-border/80 border-l-4 transition-colors", theme.borderLeft, theme.headerBg)}>
      <td colSpan={6} className="px-4 py-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Cohort Identity */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className={cn("flex size-7 items-center justify-center rounded-lg bg-card border border-border/80 shadow-2xs", theme.iconColor)}>
              <GraduationCap className="size-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className={cn("font-bold px-2 py-0.5 rounded-md border text-xs font-mono tracking-wide", theme.deptBadge)}>
                {classPart}
              </span>
              {yearPart && (
                <span className={cn("px-2 py-0.5 rounded-md border text-xs font-medium", theme.yearBadge)}>
                  {yearPart}
                </span>
              )}
            </div>
            <span className="text-muted-foreground/60 text-xs">·</span>
            <Badge variant="outline" className="text-xs font-semibold px-2 py-0.5 bg-card/80 border-border text-foreground">
              {students.length} {students.length === 1 ? "student" : "students"}
            </Badge>
          </div>

          {/* Biometric Status Breakdown Pills */}
          <div className="flex items-center gap-1.5 font-mono text-[11px] font-medium flex-wrap">
            <span className="rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800/60 px-2 py-0.5 font-semibold">
              {approved} Approved
            </span>
            {pending > 0 && (
              <span className="rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800/60 px-2 py-0.5 font-bold animate-pulse">
                {pending} Pending
              </span>
            )}
            {rejected > 0 && (
              <span className="rounded-md bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-300/60 dark:border-rose-800/60 px-2 py-0.5 font-semibold">
                {rejected} Rejected
              </span>
            )}
            {none > 0 && (
              <span className="rounded-md bg-muted text-muted-foreground border border-border px-2 py-0.5">
                {none} Not Reg
              </span>
            )}
          </div>
        </div>
      </td>
    </tr>
  )
}

function MobileCohortGroupHeader({ cohortTitle, students }: { cohortTitle: string; students: Student[] }) {
  const approved = students.filter((s) => s.faceStatus === "Approved").length
  const pending = students.filter((s) => s.faceStatus === "Pending").length
  const rejected = students.filter((s) => s.faceStatus === "Rejected").length
  const none = students.filter((s) => s.faceStatus === "None").length

  const theme = getCohortTheme(cohortTitle)
  const parts = cohortTitle.split("·").map((p) => p.trim())
  const classPart = parts[0] || cohortTitle
  const yearPart = parts[1] || ""

  return (
    <div className={cn("flex flex-col gap-2 p-3 rounded-xl border border-border/80 border-l-4 mb-2 mt-1 shadow-2xs", theme.borderLeft, theme.headerBg)}>
      <div className="flex items-center justify-between flex-wrap gap-1.5">
        <div className="flex items-center gap-1.5">
          <span className={cn("font-bold px-2 py-0.5 rounded-md border text-xs font-mono", theme.deptBadge)}>
            {classPart}
          </span>
          {yearPart && (
            <span className={cn("px-2 py-0.5 rounded-md border text-xs font-medium", theme.yearBadge)}>
              {yearPart}
            </span>
          )}
        </div>
        <span className="text-xs font-mono font-semibold text-muted-foreground">
          {students.length} students
        </span>
      </div>

      <div className="flex items-center gap-1.5 font-mono text-[10px] flex-wrap pt-1 border-t border-border/40">
        <span className="rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 font-semibold">
          {approved} App
        </span>
        {pending > 0 && (
          <span className="rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 font-bold">
            {pending} Pend
          </span>
        )}
        {rejected > 0 && (
          <span className="rounded bg-rose-500/15 text-rose-700 dark:text-rose-300 px-1.5 py-0.5">
            {rejected} Rej
          </span>
        )}
        {none > 0 && (
          <span className="rounded bg-muted text-muted-foreground px-1.5 py-0.5">
            {none} None
          </span>
        )}
      </div>
    </div>
  )
}

function FormField({
  icon: Icon,
  label,
  htmlFor,
  children,
}: {
  icon: React.ElementType
  label: string
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor} className="flex items-center gap-1.5 text-sm font-medium text-foreground">
        <Icon className="size-3.5 text-muted-foreground" />
        {label}
      </Label>
      {children}
    </div>
  )
}

const ROLL_NUMBER_REGEX = /^\d{3}[A-Z]\d[A-Z]\d{4}$/

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Filters
  const [search, setSearch] = useState("")
  const [deptFilter, setDeptFilter] = useState("all")
  const [yearFilter, setYearFilter] = useState("all")
  const [classFilter, setClassFilter] = useState("all")
  const [faceStatusFilter, setFaceStatusFilter] = useState<"all" | Student["faceStatus"]>("all")
  const [page, setPage] = useState(1)

  // Action Modals State
  const [viewTarget, setViewTarget] = useState<Student | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const [editTarget, setEditTarget] = useState<Student | null>(null)
  const [editSheetOpen, setEditSheetOpen] = useState(false)
  const [editName, setEditName] = useState("")
  const [editRoll, setEditRoll] = useState("")
  const [editClassId, setEditClassId] = useState("")
  const [editDeptId, setEditDeptId] = useState("")
  const [editYear, setEditYear] = useState("")
  const [editContactEmail, setEditContactEmail] = useState("")

  const [resetTarget, setResetTarget] = useState<Student | null>(null)
  const [resetOpen, setResetOpen] = useState(false)

  // Dropdowns metadata
  const [classOptions, setClassOptions] = useState<ClassOption[]>([])
  const [deptOptions, setDeptOptions] = useState<DeptOption[]>([])

  // Form State for Add Student
  const [formName, setFormName] = useState("")
  const [formRoll, setFormRoll] = useState("")
  const [formClassId, setFormClassId] = useState("")
  const [formDeptId, setFormDeptId] = useState("")
  const [formYear, setFormYear] = useState("")
  const [formContactEmail, setFormContactEmail] = useState("")

  const filteredClassOptions = useMemo(() => {
    if (!formDeptId || !formYear) return []
    return classOptions.filter((c) => c.deptId === formDeptId && c.year === formYear)
  }, [formDeptId, formYear, classOptions])

  const editFilteredClassOptions = useMemo(() => {
    if (!editDeptId || !editYear) return []
    return classOptions.filter((c) => c.deptId === editDeptId && c.year === editYear)
  }, [editDeptId, editYear, classOptions])

  const fetchStudents = useCallback(async () => {
    setIsLoading(true)
    setFetchError(null)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("students")
        .select(`
          id, roll_number, year, is_active, created_at, embedding_a, is_approved, is_rejected,
          registration_photo_url, class_id, department_id,
          class:classes ( id, name, section, year, department:departments ( code, id, name ) ),
          user:users ( full_name, contact_email )
        `)
        .order("created_at", { ascending: false })

      if (error) {
        setFetchError("Failed to load students.")
        return
      }

      const mapped: Student[] = (data || []).map((s: any) => {
        const classData = s.class
        const deptCode = classData?.department?.code ?? s.department?.code ?? ""
        const classSection = classData ? `${deptCode || classData.name}-${classData.section}` : "—"
        const className = classData
          ? `${deptCode || classData.name}-${classData.section} · ${s.year}`
          : "Unassigned Cohort"
        const hasEmbedding = !!s.embedding_a
        const isApproved = s.is_approved === true
        const isRejected = s.is_rejected === true

        // Strict 4-state lifecycle from forensic audit
        const faceStatus: Student["faceStatus"] = isRejected
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
          class: className,
          classSection,
          classId: s.class_id ?? classData?.id ?? "",
          departmentId: s.department_id ?? classData?.department?.id ?? "",
          departmentCode: deptCode,
          year: s.year,
          faceStatus,
          isActive: s.is_active ?? true,
          photoUrl: s.registration_photo_url ?? null,
          contactEmail: s.user?.contact_email ?? null,
        }
      })
      setStudents(mapped)
    } catch {
      setFetchError("An unexpected error occurred.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchDropdownData = useCallback(async () => {
    const supabase = createClient()
    const [classesRes, deptsRes] = await Promise.all([
      supabase
        .from("classes")
        .select("id, name, section, year, department:departments ( id, name, code )")
        .order("name"),
      supabase.from("departments").select("id, name, code").order("name"),
    ])
    if (classesRes.data) {
      setClassOptions(
        classesRes.data.map((c: any) => ({
          id: c.id,
          label: `${c.department?.code ?? c.name}-${c.section} · ${c.year}`,
          name: c.name,
          section: c.section,
          year: c.year,
          classSection: `${c.department?.code ?? c.name}-${c.section}`,
          deptName: c.department?.name ?? "",
          deptCode: c.department?.code ?? "",
          deptId: c.department?.id ?? "",
        }))
      )
    }
    if (deptsRes.data) {
      setDeptOptions(deptsRes.data.map((d: any) => ({ id: d.id, name: d.name, code: d.code })))
    }
  }, [])

  useEffect(() => {
    fetchStudents()
    fetchDropdownData()
  }, [fetchStudents, fetchDropdownData])

  // Cascading Dropdown choices
  const availableClassSectionOptions = useMemo(() => {
    let list = classOptions
    if (deptFilter !== "all") {
      list = list.filter((c) => c.deptId === deptFilter || c.deptCode === deptFilter)
    }
    if (yearFilter !== "all") {
      list = list.filter((c) => c.year === yearFilter)
    }
    const unique = Array.from(
      new Set(
        list
          .map((c) => c.classSection || `${c.deptCode || c.name}-${c.section}`)
          .filter(Boolean)
      )
    )
    return unique.sort()
  }, [classOptions, deptFilter, yearFilter])

  useEffect(() => {
    if (classFilter !== "all" && !availableClassSectionOptions.includes(classFilter)) {
      setClassFilter("all")
    }
  }, [availableClassSectionOptions, classFilter])

  // Filtered dataset
  const filtered = useMemo(() => {
    return students.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.roll.toLowerCase().includes(search.toLowerCase())
      const matchesDept =
        deptFilter === "all" || s.departmentId === deptFilter || s.departmentCode === deptFilter
      const matchesYear = yearFilter === "all" || s.year === yearFilter
      const matchesClass = classFilter === "all" || s.classSection === classFilter
      const matchesFaceStatus = faceStatusFilter === "all" || s.faceStatus === faceStatusFilter

      return matchesSearch && matchesDept && matchesYear && matchesClass && matchesFaceStatus
    })
  }, [students, search, deptFilter, yearFilter, classFilter, faceStatusFilter])

  // Grouping by cohort
  const isGrouped = search === "" && classFilter === "all"

  const groupedStudents = useMemo(() => {
    if (!isGrouped) return null
    const map = new Map<string, Student[]>()
    for (const s of filtered) {
      const key = s.class === "—" ? "Unassigned Cohort" : s.class
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(s)
    }
    return map
  }, [filtered, isGrouped])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE))
  const paged = isGrouped ? filtered : filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE)

  // Dynamic KPI Stats calculated from both global and filtered datasets
  const stats = useMemo(() => {
    const total = students.length
    const active = students.filter((s) => s.isActive).length
    const approved = students.filter((s) => s.faceStatus === "Approved").length
    const pending = students.filter((s) => s.faceStatus === "Pending").length
    const rejected = students.filter((s) => s.faceStatus === "Rejected").length
    const none = students.filter((s) => s.faceStatus === "None").length

    const fTotal = filtered.length
    const fActive = filtered.filter((s) => s.isActive).length
    const fApproved = filtered.filter((s) => s.faceStatus === "Approved").length
    const fPending = filtered.filter((s) => s.faceStatus === "Pending").length
    const fRejected = filtered.filter((s) => s.faceStatus === "Rejected").length
    const fNone = filtered.filter((s) => s.faceStatus === "None").length

    return {
      total,
      active,
      approved,
      pending,
      rejected,
      none,
      fTotal,
      fActive,
      fApproved,
      fPending,
      fRejected,
      fNone,
    }
  }, [students, filtered])

  const isFilterActive =
    search.trim() !== "" ||
    deptFilter !== "all" ||
    yearFilter !== "all" ||
    classFilter !== "all" ||
    faceStatusFilter !== "all"

  const clearAllFilters = () => {
    setSearch("")
    setDeptFilter("all")
    setYearFilter("all")
    setClassFilter("all")
    setFaceStatusFilter("all")
    setPage(1)
  }

  async function handleAddStudent() {
    if (!formName || !formRoll || !formClassId || !formYear || !formDeptId) {
      toast.error("Please fill in all fields")
      return
    }
    if (!ROLL_NUMBER_REGEX.test(formRoll)) {
      toast.error("Invalid roll number format. Example: 227Z1A6755 (3 digits, letter, digit, letter, 4 digits)")
      return
    }
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/admin/create-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: formName,
          roll_number: formRoll,
          class_id: formClassId,
          department_id: formDeptId,
          year: formYear,
          contact_email: formContactEmail || undefined,
        }),
      })
      const result = await res.json()
      if (!res.ok) {
        toast.error(result.error || "Failed to create student")
        return
      }
      toast.success("Student account created successfully. Default password is Student@1234")
      setSheetOpen(false)
      setFormName("")
      setFormRoll("")
      setFormClassId("")
      setFormDeptId("")
      setFormYear("")
      setFormContactEmail("")
      fetchStudents()
    } catch {
      toast.error("An unexpected error occurred.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: deleteTarget.id }),
      })
      const result = await res.json()
      if (!res.ok) {
        toast.error(result.error || "Failed to delete student")
        return
      }
      toast.success(`${deleteTarget.name} has been removed`)
      fetchStudents()
    } catch {
      toast.error("An unexpected error occurred.")
    } finally {
      setDeleteTarget(null)
      setIsSubmitting(false)
    }
  }

  async function handleEditStudent() {
    if (!editTarget || !editName.trim() || !editRoll.trim()) return
    if (!ROLL_NUMBER_REGEX.test(editRoll.trim())) {
      toast.error("Invalid roll number format. Example: 227Z1A6755 (3 digits, letter, digit, letter, 4 digits)")
      return
    }
    setIsSubmitting(true)
    try {
      const response = await fetch("/api/admin/update-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: editTarget.id,
          full_name: editName.trim(),
          roll_number: editRoll.trim(),
          class_id: editClassId || undefined,
          department_id: editDeptId || undefined,
          year: editYear || undefined,
          contact_email: editContactEmail,
        }),
      })
      const result = await response.json()
      if (!response.ok) {
        toast.error(result.error || "Failed to update student")
        return
      }
      toast.success("Student updated successfully")
      setEditSheetOpen(false)
      setStudents((prev) =>
        prev.map((s) =>
          s.id === editTarget.id
            ? { ...s, name: editName.trim(), roll: editRoll.trim(), year: editYear || s.year }
            : s
        )
      )
      setTimeout(() => fetchStudents(), 500)
    } catch {
      toast.error("An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleResetStudentPassword() {
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
        toast.error(result.error || "Failed to reset password")
        return
      }
      toast.success(`Password for ${resetTarget.name} has been reset to Student@1234`)
      setResetOpen(false)
    } catch {
      toast.error("An unexpected error occurred.")
    } finally {
      setIsSubmitting(false)
    }
  }

  function StudentTableRow({ student }: { student: Student }) {
    return (
      <tr className="border-b border-border/50 hover:bg-muted/30 transition-colors">
        {/* 1. Student Name & Avatar (Left Aligned) */}
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <StudentAvatar student={student} />
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-foreground text-sm truncate">{student.name}</span>
              {student.contactEmail ? (
                <span className="text-[11px] text-muted-foreground truncate">{student.contactEmail}</span>
              ) : (
                <span className="text-[11px] text-muted-foreground/60 italic">No contact email</span>
              )}
            </div>
          </div>
        </td>

        {/* 2. Roll Number (Left Aligned Mono Badge) */}
        <td className="px-4 py-3.5 font-mono text-xs font-semibold text-foreground">
          <span className="inline-block rounded-md bg-muted/80 px-2.5 py-1 border border-border/70">
            {student.roll}
          </span>
        </td>

        {/* 3. Class & Section (STRICTLY CENTER ALIGNED) */}
        <td className="px-4 py-3.5 text-center">
          <div className="flex items-center justify-center">
            <span className="inline-flex items-center justify-center font-mono text-xs font-semibold px-2.5 py-1 rounded-md bg-muted/80 text-foreground border border-border/70">
              {student.classSection}
            </span>
          </div>
        </td>

        {/* 4. Academic Year (STRICTLY CENTER ALIGNED) */}
        <td className="px-4 py-3.5 text-center">
          <div className="flex items-center justify-center">
            <span className="inline-flex items-center justify-center text-xs text-muted-foreground font-medium px-2.5 py-1 rounded-md bg-muted/40 border border-border/50">
              {student.year}
            </span>
          </div>
        </td>

        {/* 5. Biometric Status (Left Aligned) */}
        <td className="px-4 py-3.5">
          <FaceStatusBadge status={student.faceStatus} />
        </td>

        {/* 6. Actions Column (Right Aligned, Stable Width) */}
        <td className="px-4 py-3.5 text-right w-36">
          <div className="flex items-center justify-end gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewTarget(student)}
              className="h-8 rounded-lg text-xs font-semibold gap-1 px-2.5 border-border hover:bg-muted shadow-2xs cursor-pointer"
            >
              <Eye className="size-3.5 text-muted-foreground" />
              <span>View</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="h-8 w-8 rounded-lg cursor-pointer">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 rounded-xl">
                <DropdownMenuItem
                  onClick={() => {
                    setEditTarget(student)
                    setEditName(student.name)
                    setEditRoll(student.roll)
                    setEditClassId(student.classId)
                    setEditDeptId(student.departmentId)
                    setEditYear(student.year)
                    setEditContactEmail(student.contactEmail ?? "")
                    setEditSheetOpen(true)
                  }}
                  className="gap-2 cursor-pointer"
                >
                  <Edit3 className="size-3.5 text-muted-foreground" />
                  Edit Student
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setResetTarget(student)
                    setResetOpen(true)
                  }}
                  className="gap-2 cursor-pointer"
                >
                  <KeyRound className="size-3.5 text-muted-foreground" />
                  Reset Password
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setDeleteTarget(student)}
                  className="gap-2 cursor-pointer"
                >
                  <Trash2 className="size-3.5" />
                  Delete Student
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ── Top Summary Area (6 Dynamic KPIs) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Students */}
        <div className="rounded-2xl border border-border bg-card p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold">Total Students</span>
            <Users className="size-3.5 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {isLoading ? "—" : isFilterActive ? stats.fTotal : stats.total}
            </span>
            {isFilterActive ? (
              <span className="text-[10px] font-medium text-primary">of {stats.total} total</span>
            ) : (
              <span className="text-[10px] text-muted-foreground">enrolled</span>
            )}
          </div>
        </div>

        {/* Active Students */}
        <div className="rounded-2xl border border-border bg-card p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold">Active Roster</span>
            <UserCheck className="size-3.5 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {isLoading ? "—" : isFilterActive ? stats.fActive : stats.active}
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">active</span>
          </div>
        </div>

        {/* Face Approved */}
        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-500/5 p-3.5 shadow-2xs dark:border-emerald-900/60 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300">
            <span className="text-[11px] font-semibold">Face Approved</span>
            <ShieldCheck className="size-3.5 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {isLoading ? "—" : isFilterActive ? stats.fApproved : stats.approved}
            </span>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold">verified</span>
          </div>
        </div>

        {/* Face Approval Pending */}
        <div
          className={cn(
            "rounded-2xl border p-3.5 shadow-2xs transition-colors",
            (isFilterActive ? stats.fPending : stats.pending) > 0
              ? "border-amber-300 bg-amber-500/10 dark:border-amber-700/60 dark:bg-amber-950/30"
              : "border-border bg-card"
          )}
        >
          <div className="flex items-center justify-between">
            <span
              className={cn(
                "text-[11px] font-semibold",
                (isFilterActive ? stats.fPending : stats.pending) > 0
                  ? "text-amber-700 dark:text-amber-300"
                  : "text-muted-foreground"
              )}
            >
              Face Approval Pending
            </span>
            <Clock
              className={cn(
                "size-3.5",
                (isFilterActive ? stats.fPending : stats.pending) > 0
                  ? "text-amber-600 animate-pulse"
                  : "text-muted-foreground"
              )}
            />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span
              className={cn(
                "text-2xl font-bold tracking-tight",
                (isFilterActive ? stats.fPending : stats.pending) > 0
                  ? "text-amber-700 dark:text-amber-300"
                  : "text-foreground"
              )}
            >
              {isLoading ? "—" : isFilterActive ? stats.fPending : stats.pending}
            </span>
            <span className="text-[10px] text-muted-foreground">in queue</span>
          </div>
        </div>

        {/* Face Rejected */}
        <div className="rounded-2xl border border-rose-200/80 bg-rose-500/5 p-3.5 shadow-2xs dark:border-rose-900/60 dark:bg-rose-950/20">
          <div className="flex items-center justify-between text-rose-700 dark:text-rose-300">
            <span className="text-[11px] font-semibold">Face Rejected</span>
            <X className="size-3.5 text-rose-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {isLoading ? "—" : isFilterActive ? stats.fRejected : stats.rejected}
            </span>
            <span className="text-[10px] text-rose-700 dark:text-rose-300 font-semibold">purged</span>
          </div>
        </div>

        {/* Not Registered */}
        <div className="rounded-2xl border border-border bg-card p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold">Not Registered</span>
            <UserX className="size-3.5 text-muted-foreground" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {isLoading ? "—" : isFilterActive ? stats.fNone : stats.none}
            </span>
            <span className="text-[10px] text-muted-foreground">no capture</span>
          </div>
        </div>
      </div>

      {/* ── Toolbar & Cascading Filter System ── */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3.5 sm:p-4 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 sm:gap-3 items-center">
          {/* Search Box */}
          <div className="relative sm:col-span-2 lg:col-span-3">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by student name or roll..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="h-9.5 rounded-xl pl-9 pr-8 text-xs bg-muted/30 border-border focus-visible:ring-primary/20"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer"
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Department Filter (Displays ONLY Canonical Short Code) */}
          <div className="lg:col-span-2">
            <Select
              value={deptFilter}
              onValueChange={(v) => {
                setDeptFilter(v)
                setClassFilter("all")
                setPage(1)
              }}
            >
              <SelectTrigger className="h-9.5 rounded-xl text-xs bg-muted/30 border-border font-medium">
                <div className="flex items-center gap-1.5 truncate">
                  <Building2 className="size-3 text-muted-foreground shrink-0" />
                  <span className="truncate">
                    {deptFilter === "all"
                      ? "All Departments"
                      : `Dept: ${deptOptions.find((d) => d.id === deptFilter)?.code ?? deptFilter}`}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {deptOptions.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Academic Year Filter */}
          <div className="lg:col-span-2">
            <Select
              value={yearFilter}
              onValueChange={(v) => {
                setYearFilter(v)
                setClassFilter("all")
                setPage(1)
              }}
            >
              <SelectTrigger className="h-9.5 rounded-xl text-xs bg-muted/30 border-border font-medium">
                <div className="flex items-center gap-1.5 truncate">
                  <CalendarDays className="size-3 text-muted-foreground shrink-0" />
                  <span className="truncate">
                    {yearFilter === "all" ? "All Years" : yearFilter}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                <SelectItem value="1st Year">1st Year</SelectItem>
                <SelectItem value="2nd Year">2nd Year</SelectItem>
                <SelectItem value="3rd Year">3rd Year</SelectItem>
                <SelectItem value="4th Year">4th Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Class & Section Filter */}
          <div className="lg:col-span-2">
            <Select
              value={classFilter}
              onValueChange={(v) => {
                setClassFilter(v)
                setPage(1)
              }}
            >
              <SelectTrigger className="h-9.5 rounded-xl text-xs bg-muted/30 border-border font-medium">
                <div className="flex items-center gap-1.5 truncate">
                  <GraduationCap className="size-3 text-muted-foreground shrink-0" />
                  <span className="truncate">
                    {classFilter === "all" ? "All Sections" : `Section: ${classFilter}`}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                {availableClassSectionOptions.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Face Status Filter */}
          <div className="lg:col-span-2">
            <Select
              value={faceStatusFilter}
              onValueChange={(v: any) => {
                setFaceStatusFilter(v)
                setPage(1)
              }}
            >
              <SelectTrigger className="h-9.5 rounded-xl text-xs bg-muted/30 border-border font-medium">
                <div className="flex items-center gap-1.5 truncate">
                  <ShieldCheck className="size-3 text-muted-foreground shrink-0" />
                  <span className="truncate">
                    {faceStatusFilter === "all" ? "All Face Statuses" : `Face: ${faceStatusFilter}`}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Face Statuses</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
                <SelectItem value="None">Not Registered</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Add Student Button */}
          <div className="lg:col-span-1 flex justify-end">
            <Button
              onClick={() => setSheetOpen(true)}
              className="gap-1.5 h-9.5 rounded-xl text-xs font-semibold shadow-2xs w-full cursor-pointer"
            >
              <Plus className="size-3.5" />
              <span>Add</span>
            </Button>
          </div>
        </div>

        {/* Active Filter Chips & Summary */}
        {isFilterActive && (
          <div className="flex flex-wrap items-center justify-between border-t border-border/60 pt-2 text-xs gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-muted-foreground">Active Filters:</span>
              {search && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-[11px] font-medium">
                  Search: &quot;{search}&quot;
                  <X className="size-3 cursor-pointer" onClick={() => setSearch("")} />
                </span>
              )}
              {deptFilter !== "all" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted text-foreground px-2.5 py-0.5 text-[11px] font-medium">
                  Dept: {deptOptions.find((d) => d.id === deptFilter)?.code ?? deptFilter}
                  <X className="size-3 cursor-pointer" onClick={() => setDeptFilter("all")} />
                </span>
              )}
              {yearFilter !== "all" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted text-foreground px-2.5 py-0.5 text-[11px] font-medium">
                  Year: {yearFilter}
                  <X className="size-3 cursor-pointer" onClick={() => setYearFilter("all")} />
                </span>
              )}
              {classFilter !== "all" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted text-foreground px-2.5 py-0.5 text-[11px] font-medium">
                  Section: {classFilter}
                  <X className="size-3 cursor-pointer" onClick={() => setClassFilter("all")} />
                </span>
              )}
              {faceStatusFilter !== "all" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted text-foreground px-2.5 py-0.5 text-[11px] font-medium">
                  Status: {faceStatusFilter === "None" ? "Not Registered" : faceStatusFilter}
                  <X className="size-3 cursor-pointer" onClick={() => setFaceStatusFilter("all")} />
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-muted-foreground">
                Showing {filtered.length} of {students.length}
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

      {fetchError && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-8 text-center">
          <p className="text-sm text-destructive">{fetchError}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={fetchStudents}>
            Retry
          </Button>
        </div>
      )}

      {/* ── Table Desktop View ── */}
      {isLoading ? (
        <div className="hidden md:block">
          <TableSkeleton cols={6} rows={6} hasAvatar={true} />
        </div>
      ) : (
        <div className="hidden rounded-2xl border border-border bg-card md:block overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left">
                  {/* 1. Student (Left) */}
                  <th className="px-4 py-3.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide text-left">
                    Student
                  </th>
                  {/* 2. Roll Number (Left) */}
                  <th className="px-4 py-3.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide text-left">
                    Roll Number
                  </th>
                  {/* 3. Class & Section (STRICTLY CENTER) */}
                  <th className="px-4 py-3.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide text-center">
                    Class & Section
                  </th>
                  {/* 4. Academic Year (STRICTLY CENTER) */}
                  <th className="px-4 py-3.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide text-center">
                    Academic Year
                  </th>
                  {/* 5. Biometric Status (Left) */}
                  <th className="px-4 py-3.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide text-left">
                    Biometric Status
                  </th>
                  {/* 6. Actions (Right) */}
                  <th className="px-4 py-3.5 text-right font-semibold text-muted-foreground text-xs uppercase tracking-wide w-36">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.length === 0 && !fetchError ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                        <Search className="size-7 opacity-40 text-muted-foreground" />
                        <h4 className="text-sm font-bold text-foreground">No students found</h4>
                        <p className="text-xs text-muted-foreground">
                          {students.length === 0
                            ? 'No students enrolled yet. Click "Add Student" to create one.'
                            : isFilterActive
                            ? "No students match your active filter criteria."
                            : "No students found matching your search."}
                        </p>
                        {isFilterActive && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={clearAllFilters}
                            className="mt-2 h-8 rounded-xl text-xs font-semibold gap-1.5"
                          >
                            <X className="size-3.5" /> Clear Filters
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : isGrouped && groupedStudents ? (
                  Array.from(groupedStudents.entries()).map(([cohortTitle, cohortStudents]) => (
                    <Fragment key={cohortTitle}>
                      <CohortGroupHeader cohortTitle={cohortTitle} students={cohortStudents} />
                      {cohortStudents.map((s) => (
                        <StudentTableRow key={s.id} student={s} />
                      ))}
                    </Fragment>
                  ))
                ) : (
                  paged.map((s) => <StudentTableRow key={s.id} student={s} />)
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Cards Mobile View ── */}
      <div className="flex flex-col gap-3 md:hidden">
        {isLoading ? (
          <ListSkeleton count={4} hasAvatar={true} />
        ) : filtered.length === 0 && !fetchError ? (
          <div className="rounded-2xl border border-border bg-card px-4 py-12 text-center text-muted-foreground">
            <Search className="size-6 mx-auto mb-2 opacity-40" />
            <p className="text-xs font-medium">
              {students.length === 0
                ? 'No students yet. Tap "Add" to create one.'
                : "No students found matching your active filter criteria."}
            </p>
          </div>
        ) : isGrouped && groupedStudents ? (
          Array.from(groupedStudents.entries()).map(([cohortTitle, cohortStudents]) => (
            <div key={cohortTitle} className="flex flex-col gap-2">
              <MobileCohortGroupHeader cohortTitle={cohortTitle} students={cohortStudents} />
              <div className="flex flex-col gap-2">
                {cohortStudents.map((student) => (
                  <div
                    key={student.id}
                    className={cn("rounded-xl border p-3.5 transition-colors shadow-2xs", getMobileCardStyle(student.faceStatus))}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <StudentAvatar student={student} size="sm" />
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground text-sm">{student.name}</span>
                          <span className="text-xs text-muted-foreground font-mono">{student.roll}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setViewTarget(student)}
                          className="h-8 w-8 rounded-lg"
                        >
                          <Eye className="size-4 text-muted-foreground" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" className="h-8 w-8 rounded-lg">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 rounded-xl">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditTarget(student)
                                setEditName(student.name)
                                setEditRoll(student.roll)
                                setEditClassId(student.classId)
                                setEditDeptId(student.departmentId)
                                setEditYear(student.year)
                                setEditContactEmail(student.contactEmail ?? "")
                                setEditSheetOpen(true)
                              }}
                            >
                              <Edit3 className="size-3.5 mr-2 text-muted-foreground" />
                              Edit Student
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setResetTarget(student)
                                setResetOpen(true)
                              }}
                            >
                              <KeyRound className="size-3.5 mr-2 text-muted-foreground" />
                              Reset Password
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setDeleteTarget(student)}
                            >
                              <Trash2 className="size-3.5 mr-2" />
                              Delete Student
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2 text-xs text-muted-foreground">
                      <span className="font-medium">{student.year}</span>
                      <FaceStatusBadge status={student.faceStatus} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          paged.map((student) => (
            <div
              key={student.id}
              className={cn("rounded-xl border p-3.5 transition-colors shadow-2xs", getMobileCardStyle(student.faceStatus))}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <StudentAvatar student={student} size="sm" />
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground text-sm">{student.name}</span>
                    <span className="text-xs text-muted-foreground font-mono">{student.roll}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setViewTarget(student)}
                    className="h-8 w-8 rounded-lg"
                  >
                    <Eye className="size-4 text-muted-foreground" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" className="h-8 w-8 rounded-lg">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44 rounded-xl">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditTarget(student)
                          setEditName(student.name)
                          setEditRoll(student.roll)
                          setEditClassId(student.classId)
                          setEditDeptId(student.departmentId)
                          setEditYear(student.year)
                          setEditContactEmail(student.contactEmail ?? "")
                          setEditSheetOpen(true)
                        }}
                      >
                        <Edit3 className="size-3.5 mr-2 text-muted-foreground" />
                        Edit Student
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setResetTarget(student)
                          setResetOpen(true)
                        }}
                      >
                        <KeyRound className="size-3.5 mr-2 text-muted-foreground" />
                        Reset Password
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setDeleteTarget(student)}
                      >
                        <Trash2 className="size-3.5 mr-2" />
                        Delete Student
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2 text-xs text-muted-foreground">
                <span className="font-medium">{student.class}</span>
                <FaceStatusBadge status={student.faceStatus} />
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Pagination (Active when not grouped) ── */}
      {!isLoading && !isGrouped && (
        <div className="flex items-center justify-between border-t border-border/60 pt-3">
          <span className="text-xs text-muted-foreground">
            Showing {filtered.length === 0 ? 0 : (page - 1) * ROWS_PER_PAGE + 1} –{" "}
            {Math.min(page * ROWS_PER_PAGE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="h-8 w-8 rounded-lg cursor-pointer"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-xs font-semibold text-foreground">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="h-8 w-8 rounded-lg cursor-pointer"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Student Details Modal (View Action) ── */}
      <Dialog open={!!viewTarget} onOpenChange={(open) => !open && setViewTarget(null)}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-border bg-card">
          <DialogHeader className="p-5 pb-4 border-b border-border bg-muted/20">
            <DialogTitle className="text-base font-bold text-foreground">
              Student Identity & Biometric Profile
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Institutional academic enrollment and facial biometric status
            </DialogDescription>
          </DialogHeader>

          {viewTarget && (
            <div className="flex flex-col gap-4 p-5">
              {/* Photo Frame */}
              <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-muted/40 border border-border">
                {viewTarget.photoUrl ? (
                  <img
                    src={viewTarget.photoUrl}
                    alt={viewTarget.name}
                    className="size-40 rounded-xl object-cover object-top border border-border shadow-md"
                  />
                ) : (
                  <div className="flex size-40 flex-col items-center justify-center rounded-xl bg-muted border border-border text-muted-foreground text-center p-4">
                    <User className="size-10 opacity-40 mb-2" />
                    <span className="text-xs font-semibold">No Biometric Photo</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">
                      {viewTarget.faceStatus === "Rejected"
                        ? "Photo purged on rejection."
                        : "No face template registered."}
                    </span>
                  </div>
                )}
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
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
                    Cohort / Class
                  </span>
                  <span className="font-semibold text-foreground block truncate">
                    {viewTarget.class}
                  </span>
                </div>

                <div className="rounded-xl border border-border/80 bg-muted/20 p-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-0.5">
                    Biometric Status
                  </span>
                  <div className="mt-0.5">
                    <FaceStatusBadge status={viewTarget.faceStatus} />
                  </div>
                </div>

                {viewTarget.contactEmail && (
                  <div className="col-span-2 rounded-xl border border-border/80 bg-muted/20 p-3">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-0.5">
                      Contact Email
                    </span>
                    <span className="font-mono text-foreground flex items-center gap-1.5">
                      <Mail className="size-3.5 text-muted-foreground" />
                      {viewTarget.contactEmail}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="p-4 border-t border-border bg-muted/20">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewTarget(null)}
              className="rounded-xl text-xs font-semibold cursor-pointer w-full"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-2.5 text-rose-600 mb-1">
              <div className="flex size-8 items-center justify-center rounded-xl bg-rose-500/15">
                <AlertCircle className="size-4.5" />
              </div>
              <AlertDialogTitle className="text-base font-bold text-foreground">
                Delete Student Record
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="flex flex-col gap-2 text-xs text-muted-foreground leading-relaxed">
                <span>
                  Are you sure you want to delete <strong className="text-foreground">{deleteTarget?.name}</strong> (
                  {deleteTarget?.roll})?
                </span>
                <span className="text-destructive font-semibold">
                  This will remove the student account, biometrics, and login credentials. This action cannot be undone.
                </span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2">
            <AlertDialogCancel disabled={isSubmitting} className="rounded-xl text-xs font-semibold">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="rounded-xl text-xs font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Student"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Add Student Sheet ── */}
      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          if (!open) {
            setFormName("")
            setFormRoll("")
            setFormClassId("")
            setFormDeptId("")
            setFormYear("")
            setFormContactEmail("")
          }
          setSheetOpen(open)
        }}
      >
        <SheetContent side="right" className="sm:max-w-md flex flex-col p-0">
          <SheetHeader className="border-b border-border p-5 pb-4 bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <GraduationCap className="size-5" />
              </div>
              <div>
                <SheetTitle className="text-base font-bold text-foreground">Add New Student</SheetTitle>
                <SheetDescription className="text-xs mt-0.5">
                  Default password: <span className="font-mono font-bold text-foreground">Student@1234</span>
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="flex flex-col gap-0 flex-1 overflow-y-auto p-5 divide-y divide-border/60">
            <div className="pb-4 flex flex-col gap-4">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Personal Information
              </p>
              <FormField icon={User} label="Full Name" htmlFor="student-name">
                <Input
                  id="student-name"
                  placeholder="Enter student full name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="h-9 rounded-xl text-xs"
                />
              </FormField>
              <FormField icon={Hash} label="Roll Number" htmlFor="student-roll">
                <Input
                  id="student-roll"
                  placeholder="e.g. 227Z1A6755"
                  value={formRoll}
                  maxLength={10}
                  onChange={(e) => setFormRoll(e.target.value.toUpperCase())}
                  className="h-9 rounded-xl text-xs font-mono"
                />
                <p className="text-[11px] text-muted-foreground">
                  Format: 227Z1A6755 (3 digits, letter, digit, letter, 4 digits)
                </p>
              </FormField>
              <FormField icon={Mail} label="Contact Email" htmlFor="student-contact-email">
                <Input
                  id="student-contact-email"
                  type="email"
                  placeholder="student@gmail.com (optional)"
                  value={formContactEmail}
                  onChange={(e) => setFormContactEmail(e.target.value)}
                  className="h-9 rounded-xl text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  Used for absence notifications — login is always roll-based.
                </p>
              </FormField>
            </div>

            <div className="pt-4 flex flex-col gap-4">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Academic Enrollment
              </p>
              <FormField icon={Building2} label="Department" htmlFor="student-dept">
                <Select
                  value={formDeptId}
                  onValueChange={(v) => {
                    setFormDeptId(v)
                    setFormClassId("")
                  }}
                >
                  <SelectTrigger id="student-dept" className="h-9 rounded-xl text-xs">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {deptOptions.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.code} — {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField icon={CalendarDays} label="Academic Year" htmlFor="student-year">
                <Select
                  value={formYear}
                  onValueChange={(v) => {
                    setFormYear(v)
                    setFormClassId("")
                  }}
                >
                  <SelectTrigger id="student-year" className="h-9 rounded-xl text-xs">
                    <SelectValue placeholder="Select academic year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1st Year">1st Year</SelectItem>
                    <SelectItem value="2nd Year">2nd Year</SelectItem>
                    <SelectItem value="3rd Year">3rd Year</SelectItem>
                    <SelectItem value="4th Year">4th Year</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              <FormField icon={GraduationCap} label="Class & Section" htmlFor="student-class">
                <Select
                  value={formClassId}
                  onValueChange={setFormClassId}
                  disabled={!formDeptId || !formYear}
                >
                  <SelectTrigger id="student-class" disabled={!formDeptId || !formYear} className="h-9 rounded-xl text-xs">
                    <SelectValue
                      placeholder={
                        !formDeptId
                          ? "Select department first"
                          : !formYear
                          ? "Select academic year first"
                          : filteredClassOptions.length === 0
                          ? "No classes found"
                          : "Select class & section"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredClassOptions.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No classes found
                      </SelectItem>
                    ) : (
                      filteredClassOptions.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.classSection}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </FormField>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-border px-5 py-4 bg-muted/20 mt-auto">
            <Button variant="outline" size="sm" onClick={() => setSheetOpen(false)} className="rounded-xl text-xs font-semibold cursor-pointer">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAddStudent}
              disabled={isSubmitting}
              className="rounded-xl text-xs font-semibold gap-1.5 min-w-28 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="size-3.5" />
                  Add Student
                </>
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Edit Student Sheet ── */}
      <Sheet open={editSheetOpen} onOpenChange={setEditSheetOpen}>
        <SheetContent side="right" className="sm:max-w-md flex flex-col p-0">
          <SheetHeader className="border-b border-border p-5 pb-4 bg-muted/20">
            <SheetTitle className="text-base font-bold text-foreground">Edit Student Record</SheetTitle>
            <SheetDescription className="text-xs mt-0.5">
              Update personal identity and academic assignment
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-4 p-5 flex-1 overflow-y-auto">
            <FormField icon={User} label="Full Name" htmlFor="edit-name">
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Student full name"
                className="h-9 rounded-xl text-xs"
              />
            </FormField>

            <FormField icon={Hash} label="Roll Number" htmlFor="edit-roll">
              <Input
                id="edit-roll"
                value={editRoll}
                maxLength={10}
                onChange={(e) => setEditRoll(e.target.value.toUpperCase())}
                placeholder="e.g. 227Z1A6755"
                className="h-9 rounded-xl text-xs font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                Changing roll number will automatically sync login email credentials.
              </p>
            </FormField>

            <FormField icon={Mail} label="Contact Email" htmlFor="edit-contact-email">
              <Input
                id="edit-contact-email"
                type="email"
                placeholder="student@gmail.com (optional)"
                value={editContactEmail}
                onChange={(e) => setEditContactEmail(e.target.value)}
                className="h-9 rounded-xl text-xs"
              />
            </FormField>

            <FormField icon={Building2} label="Department" htmlFor="edit-dept">
              <Select
                value={editDeptId}
                onValueChange={(v) => {
                  setEditDeptId(v)
                  setEditClassId("")
                }}
              >
                <SelectTrigger id="edit-dept" className="h-9 rounded-xl text-xs">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {deptOptions.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.code} — {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField icon={CalendarDays} label="Academic Year" htmlFor="edit-year">
              <Select
                value={editYear}
                onValueChange={(v) => {
                  setEditYear(v)
                  setEditClassId("")
                }}
              >
                <SelectTrigger id="edit-year" className="h-9 rounded-xl text-xs">
                  <SelectValue placeholder="Select academic year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1st Year">1st Year</SelectItem>
                  <SelectItem value="2nd Year">2nd Year</SelectItem>
                  <SelectItem value="3rd Year">3rd Year</SelectItem>
                  <SelectItem value="4th Year">4th Year</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <FormField icon={GraduationCap} label="Class & Section" htmlFor="edit-class">
              <Select
                value={editClassId}
                onValueChange={setEditClassId}
                disabled={!editDeptId || !editYear}
              >
                <SelectTrigger id="edit-class" disabled={!editDeptId || !editYear} className="h-9 rounded-xl text-xs">
                  <SelectValue
                    placeholder={
                      !editDeptId
                        ? "Select department first"
                        : !editYear
                        ? "Select academic year first"
                        : editFilteredClassOptions.length === 0
                        ? "No classes found"
                        : "Select class & section"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {editFilteredClassOptions.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No classes found
                    </SelectItem>
                  ) : (
                    editFilteredClassOptions.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.classSection}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-border px-5 py-4 bg-muted/20 mt-auto">
            <Button variant="outline" size="sm" onClick={() => setEditSheetOpen(false)} className="rounded-xl text-xs font-semibold cursor-pointer">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleEditStudent}
              disabled={isSubmitting}
              className="rounded-xl text-xs font-semibold min-w-28 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Reset Password Dialog ── */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2.5 text-primary mb-1">
              <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10">
                <KeyRound className="size-4.5" />
              </div>
              <DialogTitle className="text-base font-bold text-foreground">
                Reset Student Password
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              This will reset the password for <strong className="text-foreground">{resetTarget?.roll}</strong> ({resetTarget?.name}) to{" "}
              <strong className="font-mono text-foreground">Student@1234</strong>. The student will be required to change their password upon their next login.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2 flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setResetOpen(false)} className="rounded-xl text-xs font-semibold cursor-pointer">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleResetStudentPassword}
              disabled={isSubmitting}
              className="rounded-xl text-xs font-semibold cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  Resetting...
                </>
              ) : (
                "Confirm Reset"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
