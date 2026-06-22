"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Pencil, CheckCircle2, XCircle, AlertCircle, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import type { Student } from "@/lib/qr-attendance-data"

interface QRSummaryStateProps {
  subjectLabel: string
  classLabel: string
  periodLabel: string
  dateLabel: string
  initialStudents: Student[]
  teacherId: string
  sessionId: string
  onDone: () => void
}

/* ---------- Status config ---------- */

const statusConfig = {
  present: {
    label: "Present",
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200 font-semibold",
    row: "bg-emerald-50/70 dark:bg-emerald-950/20 border-l-4 border-l-emerald-400",
    avatar: "bg-emerald-100 text-emerald-700",
    ring: "ring-2 ring-emerald-400 ring-offset-1",
    icon: <CheckCircle2 className="size-4 text-emerald-600" />,
  },
  absent: {
    label: "Absent",
    badge: "bg-red-100 text-red-700 border-red-200 font-semibold",
    row: "bg-red-50/50 dark:bg-red-950/20 border-l-4 border-l-red-400",
    avatar: "bg-red-100 text-red-700",
    ring: "ring-2 ring-red-300 ring-offset-1",
    icon: <XCircle className="size-4 text-red-500" />,
  },
  failed: {
    label: "Failed",
    badge: "bg-orange-100 text-orange-700 border-orange-200 font-semibold",
    row: "bg-orange-50/50 dark:bg-orange-950/20 border-l-4 border-l-orange-400",
    avatar: "bg-orange-100 text-orange-700",
    ring: "ring-2 ring-orange-300 ring-offset-1",
    icon: <AlertCircle className="size-4 text-orange-500" />,
  },
  pending: {
    label: "Pending",
    badge: "bg-muted text-muted-foreground border-0",
    row: "border-l-4 border-l-slate-300",
    avatar: "bg-muted text-muted-foreground",
    ring: "ring-1 ring-slate-200 ring-offset-1",
    icon: <AlertCircle className="size-4 text-slate-400" />,
  },
} as const

export function QRSummaryState({
  subjectLabel,
  classLabel,
  periodLabel,
  dateLabel,
  initialStudents,
  teacherId,
  sessionId,
  onDone,
}: QRSummaryStateProps) {
  const [students, setStudents] = useState<Student[]>(() =>
    initialStudents.map((s) => (s.status === "pending" ? { ...s, status: "absent" } : s))
  )

  const presentCount = students.filter((s) => s.status === "present").length
  const absentCount  = students.filter((s) => s.status === "absent").length
  const failedCount  = students.filter((s) => s.status === "failed").length
  const total        = students.length

  async function handleOverride(studentId: string, newStatus: "present" | "absent") {
    const studentName = students.find((s) => s.id === studentId)?.name || "Student"

    // Optimistic update
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, status: newStatus } : s))
    )

    try {
      const supabase = createClient()
      const { data: existing } = await supabase
        .from("period_attendance")
        .select("student_id")
        .eq("session_id", sessionId)
        .eq("student_id", studentId)
        .maybeSingle()

      if (existing) {
        const { error } = await supabase
          .from("period_attendance")
          .update({ status: newStatus, overridden_by: teacherId, overridden_at: new Date().toISOString() })
          .eq("session_id", sessionId)
          .eq("student_id", studentId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from("period_attendance")
          .insert({ session_id: sessionId, student_id: studentId, status: newStatus, overridden_by: teacherId, overridden_at: new Date().toISOString() })
        if (error) throw error
      }

      toast.success(`Marked ${newStatus} — ${studentName}`)
    } catch (err) {
      console.error(err)
      setStudents((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, status: s.status } : s))
      )
      toast.error("Failed to update status")
    }
  }

  // Sort: present → failed → absent
  const sorted = [...students].sort((a, b) => {
    const order = { present: 0, failed: 1, absent: 2, pending: 3 }
    return order[a.status] - order[b.status]
  })

  return (
    <div className="flex flex-col gap-5">

      {/* ── Session Summary Header ── */}
      <Card className="shadow-sm overflow-hidden">
        <div className="h-1 w-full bg-linear-to-r from-emerald-400 via-primary to-blue-500" />
        <CardContent className="pt-5 pb-5">
          <div className="flex flex-col gap-0.5 mb-4">
            <h2 className="text-xl font-bold text-foreground">{subjectLabel}</h2>
            <p className="text-sm text-muted-foreground">
              {classLabel} &middot; {periodLabel} &middot; {dateLabel}
            </p>
          </div>

          {/* Stat pills */}
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-4 py-2">
              <CheckCircle2 className="size-4 text-emerald-600" />
              <span className="text-sm font-bold text-emerald-800 dark:text-emerald-400">{presentCount}</span>
              <span className="text-sm text-emerald-700 dark:text-emerald-500">Present</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-red-100 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-4 py-2">
              <XCircle className="size-4 text-red-500" />
              <span className="text-sm font-bold text-red-800 dark:text-red-400">{absentCount}</span>
              <span className="text-sm text-red-700 dark:text-red-500">Absent</span>
            </div>
            {failedCount > 0 && (
              <div className="flex items-center gap-2 rounded-xl bg-orange-100 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 px-4 py-2">
                <AlertCircle className="size-4 text-orange-500" />
                <span className="text-sm font-bold text-orange-800 dark:text-orange-400">{failedCount}</span>
                <span className="text-sm text-orange-700 dark:text-orange-500">Failed</span>
              </div>
            )}
            <div className="ml-auto flex items-center gap-1.5 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{presentCount}/{total}</span> attended
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Student List ── */}
      <Card className="shadow-sm">
        <CardContent className="pt-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Student List</h3>
            <span className="text-xs text-muted-foreground">{total} students</span>
          </div>

          <div className="flex flex-col gap-2">
            {sorted.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">No students found.</div>
            ) : (
              sorted.map((s) => {
                const cfg = statusConfig[s.status] ?? statusConfig.absent
                return (
                  <div
                    key={s.id}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border border-border px-4 py-3 transition-colors",
                      cfg.row
                    )}
                  >
                    {/* Avatar */}
                    <Avatar className={cn("size-10 shrink-0", cfg.ring)}>
                      {s.photoUrl && s.status === "present" && (
                        <AvatarImage src={s.photoUrl} alt={s.name} className="object-cover" />
                      )}
                      <AvatarFallback className={cn("text-xs font-bold", cfg.avatar)}>
                        {s.initials}
                      </AvatarFallback>
                    </Avatar>

                    {/* Info */}
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="text-sm font-semibold text-foreground truncate">{s.name}</span>
                      <span className="text-xs text-muted-foreground">Roll: {s.roll}</span>
                    </div>

                    {/* Badge */}
                    <Badge variant="outline" className={cn("shrink-0 gap-1", cfg.badge)}>
                      {cfg.icon}
                      {cfg.label}
                    </Badge>

                    {/* Override menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8 shrink-0">
                          <Pencil className="size-3.5 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleOverride(s.id, "present")}
                          className="text-emerald-700 focus:text-emerald-700 focus:bg-emerald-50"
                        >
                          <CheckCircle2 className="mr-2 size-4" /> Mark Present
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleOverride(s.id, "absent")}
                          className="text-red-600 focus:text-red-600 focus:bg-red-50"
                        >
                          <XCircle className="mr-2 size-4" /> Mark Absent
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Done Button ── */}
      <Button
        onClick={onDone}
        size="lg"
        className="w-full gap-2 bg-primary font-semibold shadow-sm hover:bg-primary/90"
      >
        Done — Return to Setup
      </Button>
    </div>
  )
}