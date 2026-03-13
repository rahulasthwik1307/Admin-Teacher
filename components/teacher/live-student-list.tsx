"use client"

import { useState, useEffect, useRef } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import type { Student, StudentStatus } from "@/lib/qr-attendance-data"

/* ---------- Status config ---------- */

const statusConfig: Record<StudentStatus, { label: string; badge: string; row: string; avatar: string; ring: string }> = {
  present: {
    label: "Present",
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200 font-semibold",
    row: "bg-emerald-50/80 dark:bg-emerald-950/20",
    avatar: "bg-emerald-100 text-emerald-700",
    ring: "ring-2 ring-emerald-400 ring-offset-1",
  },
  failed: {
    label: "Failed",
    badge: "bg-orange-100 text-orange-700 border-orange-200",
    row: "bg-orange-50/60 dark:bg-orange-950/20",
    avatar: "bg-orange-100 text-orange-700",
    ring: "ring-2 ring-orange-400 ring-offset-1",
  },
  absent: {
    label: "Absent",
    badge: "bg-red-100 text-red-700 border-red-200",
    row: "bg-red-50/60 dark:bg-red-950/20",
    avatar: "bg-red-100 text-red-700",
    ring: "ring-2 ring-red-400 ring-offset-1",
  },
  pending: {
    label: "Pending",
    badge: "bg-muted text-muted-foreground border-0",
    row: "",
    avatar: "bg-muted text-muted-foreground",
    ring: "ring-1 ring-slate-200 ring-offset-1",
  },
}

/* ---------- Sort: present first, then failed, then pending ---------- */

function sortStudents(students: Student[]): Student[] {
  const order: Record<StudentStatus, number> = { present: 0, failed: 1, absent: 1, pending: 2 }
  return [...students].sort((a, b) => order[a.status] - order[b.status])
}

/* ---------- Single student row with flash animation ---------- */

function StudentRow({ student }: { student: Student }) {
  const config = statusConfig[student.status]
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
        "relative flex items-center gap-3 px-4 py-3 transition-colors duration-300",
        config.row,
        flashing && "animate-none"
      )}
    >
      {/* Green flash overlay */}
      {flashing && (
        <div
          className="pointer-events-none absolute inset-0 bg-emerald-400/30"
          style={{
            animation: "greenFlash 0.8s ease-out forwards",
          }}
        />
      )}

      <Avatar className={cn("size-9 shrink-0", config.ring)}>
        {student.photoUrl && student.status === "present" && (
          <AvatarImage src={student.photoUrl} alt={student.name} className="object-cover" />
        )}
        <AvatarFallback className={cn("text-xs font-semibold", config.avatar)}>
          {student.initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-foreground">{student.name}</span>
        <span className="text-xs text-muted-foreground">
          {student.roll}
          {student.time && (
            <span className="ml-2 text-muted-foreground/70">{student.time}</span>
          )}
        </span>
      </div>

      <Badge className={cn("shrink-0", config.badge)}>{config.label}</Badge>

      <style jsx>{`
        @keyframes greenFlash {
          0%   { opacity: 1; }
          60%  { opacity: 0.6; }
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
  const absentCount  = students.filter((s) => s.status === "absent" || s.status === "failed").length
  const pendingCount = students.filter((s) => s.status === "pending").length
  const total        = students.length

  const filtered = sortStudents(
    students.filter(
      (s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.roll.toLowerCase().includes(search.toLowerCase())
    )
  )

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-3">
        <h2 className="text-base font-semibold text-foreground">Live Attendance</h2>
        <span className="text-sm font-medium">
          <span className="text-emerald-600 font-bold">{presentCount}</span>
          <span className="text-muted-foreground"> / {total} Present</span>
        </span>
      </div>

      {/* Search */}
      <div className="relative pb-3">
        <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or roll..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-border bg-card">
        <div className="divide-y divide-border">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No students found</div>
          ) : (
            filtered.map((student) => (
              <StudentRow key={student.id} student={student} />
            ))
          )}
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-3 text-sm">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-emerald-500" />
          <span className="text-muted-foreground">Present <span className="font-semibold text-foreground">{presentCount}</span></span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-red-500" />
          <span className="text-muted-foreground">Absent <span className="font-semibold text-foreground">{absentCount}</span></span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-slate-400" />
          <span className="text-muted-foreground">Pending <span className="font-semibold text-foreground">{pendingCount}</span></span>
        </span>
        <span className="ml-auto text-muted-foreground">
          Total <span className="font-semibold text-foreground">{total}</span>
        </span>
      </div>
    </div>
  )
}