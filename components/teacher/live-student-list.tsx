"use client"

import { useState, useEffect, useRef } from "react"
import { Search, Users, CheckCircle2, AlertCircle, Clock, X, UserCheck, UserX } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import type { Student, StudentStatus } from "@/lib/qr-attendance-data"

/* ---------- Status config ---------- */

const statusConfig: Record<
  StudentStatus,
  { label: string; badge: string; row: string; avatar: string; ring: string; icon: React.ElementType }
> = {
  present: {
    label: "Present",
    badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/60 font-bold",
    row: "bg-emerald-500/5 dark:bg-emerald-950/20",
    avatar: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    ring: "ring-2 ring-emerald-500/40 ring-offset-1",
    icon: CheckCircle2,
  },
  failed: {
    label: "Failed",
    badge: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-800/60 font-bold",
    row: "bg-orange-500/5 dark:bg-orange-950/20",
    avatar: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
    ring: "ring-2 ring-orange-400 ring-offset-1",
    icon: AlertCircle,
  },
  absent: {
    label: "Absent",
    badge: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800/60 font-bold",
    row: "bg-rose-500/5 dark:bg-rose-950/20",
    avatar: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
    ring: "ring-2 ring-rose-400 ring-offset-1",
    icon: UserX,
  },
  pending: {
    label: "Pending",
    badge: "bg-muted/80 text-muted-foreground border-border/60 font-medium",
    row: "",
    avatar: "bg-muted text-muted-foreground",
    ring: "ring-1 ring-border",
    icon: Clock,
  },
}

/* ---------- Sort: present first, then failed, then pending ---------- */

function sortStudents(students: Student[]): Student[] {
  const order: Record<StudentStatus, number> = { present: 0, failed: 1, absent: 2, pending: 3 }
  return [...students].sort((a, b) => order[a.status] - order[b.status])
}

/* ---------- Single student row with flash animation ---------- */

function StudentRow({ student }: { student: Student }) {
  const config = statusConfig[student.status] || statusConfig.pending
  const StatusIcon = config.icon
  const prevStatusRef = useRef<StudentStatus>(student.status)
  const [flashing, setFlashing] = useState(false)

  useEffect(() => {
    // Trigger flash only when status changes TO present
    if (prevStatusRef.current !== "present" && student.status === "present") {
      setFlashing(true)
      const t = setTimeout(() => setFlashing(false), 800)
      prevStatusRef.current = student.status
      return () => clearTimeout(t)
    }
    prevStatusRef.current = student.status
  }, [student.status])

  return (
    <div
      className={cn(
        "relative flex items-center justify-between gap-3 px-4 py-2.5 transition-colors duration-200 hover:bg-muted/30",
        config.row,
        flashing && "bg-emerald-500/15"
      )}
    >
      {/* Green flash overlay */}
      {flashing && (
        <div
          className="pointer-events-none absolute inset-0 bg-emerald-400/25"
          style={{
            animation: "greenFlash 0.8s ease-out forwards",
          }}
        />
      )}

      {/* Student Details */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Avatar className={cn("size-8.5 shrink-0 transition-all", config.ring)}>
          {student.photoUrl && student.status === "present" && (
            <AvatarImage src={student.photoUrl} alt={student.name} className="object-cover" />
          )}
          <AvatarFallback className={cn("text-[11px] font-bold", config.avatar)}>
            {student.initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-xs sm:text-sm font-bold text-foreground">
            {student.name}
          </span>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
            <span className="font-mono font-semibold">{student.roll}</span>
            {student.time && (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <Clock className="size-2.5" />
                {student.time}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Status Badge */}
      <Badge variant="outline" className={cn("shrink-0 gap-1 text-[11px] px-2 py-0.5", config.badge)}>
        <StatusIcon className="size-3" />
        {config.label}
      </Badge>

      <style jsx>{`
        @keyframes greenFlash {
          0%   { opacity: 1; }
          60%  { opacity: 0.5; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}

/* ---------- Main component ---------- */

interface LiveStudentListProps {
  students: Student[]
}

export function LiveStudentList({ students }: LiveStudentListProps) {
  const [search, setSearch] = useState("")

  const presentCount = students.filter((s) => s.status === "present").length
  const absentCount = students.filter((s) => s.status === "absent" || s.status === "failed").length
  const pendingCount = students.filter((s) => s.status === "pending").length
  const total = students.length
  const turnoutPct = total > 0 ? Math.round((presentCount / total) * 100) : 0

  const filtered = sortStudents(
    students.filter(
      (s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.roll.toLowerCase().includes(search.toLowerCase())
    )
  )

  return (
    <div className="flex h-full flex-col">
      {/* Header with Turnout Bar */}
      <div className="pb-3.5 border-b border-border/60">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <div className="flex size-7.5 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground leading-tight">Live Student Roster</h3>
              <p className="text-[11px] text-muted-foreground">Real-time attendance check-ins</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-foreground">
              <span className="text-emerald-600 dark:text-emerald-400 text-sm font-black">{presentCount}</span>
              <span className="text-muted-foreground font-semibold">/{total}</span>
            </span>
            <span className="rounded-md border border-emerald-300 dark:border-emerald-800/60 bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              {turnoutPct}%
            </span>
          </div>
        </div>

        {/* Turnout Progress Bar */}
        <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500 ease-out"
            style={{ width: `${turnoutPct}%` }}
          />
        </div>
      </div>

      {/* Search Input */}
      <div className="relative py-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input
          placeholder="Search student by name or roll number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 pl-9 pr-8 text-xs rounded-xl bg-card border-border shadow-2xs hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/20 transition-all"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-border/80 bg-card shadow-2xs min-h-64">
        <div className="divide-y divide-border/60">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-xs text-muted-foreground">
              <Users className="mx-auto size-7 text-muted-foreground/40 mb-2" />
              {search ? "No students matching your search criteria" : "No student roster loaded"}
            </div>
          ) : (
            filtered.map((student) => (
              <StudentRow key={student.id} student={student} />
            ))
          )}
        </div>
      </div>

      {/* Summary Chips Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
            <span className="size-2 rounded-full bg-emerald-500" />
            <span>Present:</span>
            <span className="font-bold text-foreground">{presentCount}</span>
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
            <span className="size-2 rounded-full bg-amber-400" />
            <span>Pending:</span>
            <span className="font-bold text-foreground">{pendingCount}</span>
          </span>
          {absentCount > 0 && (
            <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
              <span className="size-2 rounded-full bg-rose-500" />
              <span>Absent/Fail:</span>
              <span className="font-bold text-foreground">{absentCount}</span>
            </span>
          )}
        </div>

        <span className="font-semibold text-muted-foreground">
          Total: <span className="text-foreground">{total}</span>
        </span>
      </div>
    </div>
  )
}