"use client"

import { useState } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import type { Student, StudentStatus } from "@/lib/qr-attendance-data"

const statusConfig: Record<
  StudentStatus,
  { label: string; badge: string; row: string; avatar: string }
> = {
  present: {
    label: "Present",
    badge: "bg-emerald-100 text-emerald-700 border-0",
    row: "",
    avatar: "bg-emerald-100 text-emerald-700",
  },
  failed: {
    label: "Failed",
    badge: "bg-red-100 text-red-700 border-0",
    row: "bg-red-50",
    avatar: "bg-red-100 text-red-700",
  },
  absent: {
    label: "Absent",
    badge: "bg-red-100 text-red-700 border-0",
    row: "bg-red-50",
    avatar: "bg-red-100 text-red-700",
  },
  pending: {
    label: "Pending",
    badge: "bg-muted text-muted-foreground border-0",
    row: "",
    avatar: "bg-muted text-muted-foreground",
  },
}

// Sort: present first, then failed, then pending
function sortStudents(students: Student[]): Student[] {
  const order: Record<StudentStatus, number> = {
    present: 0,
    failed: 1,
    absent: 1,
    pending: 2,
  }
  return [...students].sort((a, b) => order[a.status] - order[b.status])
}

interface LiveStudentListProps {
  students: Student[]
}

export function LiveStudentList({ students }: LiveStudentListProps) {
  const [search, setSearch] = useState("")

  const presentCount = students.filter((s) => s.status === "present").length
  const absentCount = students.filter((s) => s.status === "absent" || s.status === "failed").length
  const pendingCount = students.filter((s) => s.status === "pending").length
  const total = students.length

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
      <div className="flex items-center justify-between pb-4">
        <h2 className="text-base font-semibold text-foreground">
          Live Attendance
        </h2>
        <span className="text-sm font-medium text-foreground">
          <span className="text-emerald-600">{presentCount}</span>
          <span className="text-muted-foreground"> / {total}</span>
          <span className="ml-1 text-muted-foreground">Present</span>
        </span>
      </div>

      {/* Search */}
      <div className="relative pb-4">
        <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or roll..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto rounded-lg border border-border">
        <div className="divide-y divide-border">
          {filtered.map((student) => {
            const config = statusConfig[student.status]
            return (
              <div
                key={student.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/50",
                  config.row
                )}
              >
                <Avatar className="size-9 shrink-0">
                  <AvatarFallback
                    className={cn("text-xs font-semibold", config.avatar)}
                  >
                    {student.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium text-foreground">
                    {student.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {student.roll}
                    {student.time && (
                      <span className="ml-2 text-muted-foreground/70">
                        {student.time}
                      </span>
                    )}
                  </span>
                </div>
                <Badge className={cn("shrink-0", config.badge)}>
                  {config.label}
                </Badge>
              </div>
            )
          })}
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-4 text-sm">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-emerald-500" />
          <span className="text-muted-foreground">
            Present{" "}
            <span className="font-medium text-foreground">{presentCount}</span>
          </span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-red-500" />
          <span className="text-muted-foreground">
            Absent{" "}
            <span className="font-medium text-foreground">{absentCount}</span>
          </span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-muted-foreground/40" />
          <span className="text-muted-foreground">
            Pending{" "}
            <span className="font-medium text-foreground">{pendingCount}</span>
          </span>
        </span>
        <span className="ml-auto text-muted-foreground">
          Total <span className="font-medium text-foreground">{total}</span>
        </span>
      </div>
    </div>
  )
}
