"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Pencil, CheckCircle2, XCircle, AlertCircle, Users, ArrowRight, ShieldCheck, Check, Clock } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { formatScanTime, type Student } from "@/lib/qr-attendance-data"

interface QRSummaryStateProps {
  subjectLabel: string
  classLabel: string
  periodLabel: string
  dateLabel: string
  initialStudents: Student[]
  teacherId: string
  sessionId: string
  classId?: string
  onDone: () => void
}

/* ---------- Status config ---------- */

const statusConfig = {
  present: {
    label: "Present",
    badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/60 font-bold",
    row: "bg-emerald-500/5 dark:bg-emerald-950/20 border-l-4 border-l-emerald-500",
    avatar: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    ring: "ring-2 ring-emerald-400 ring-offset-1",
    icon: CheckCircle2,
  },
  absent: {
    label: "Absent",
    badge: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800/60 font-bold",
    row: "bg-rose-500/5 dark:bg-rose-950/20 border-l-4 border-l-rose-500",
    avatar: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
    ring: "ring-2 ring-rose-300 ring-offset-1",
    icon: XCircle,
  },
  failed: {
    label: "Failed",
    badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800/60 font-bold",
    row: "bg-amber-500/5 dark:bg-orange-950/20 border-l-4 border-l-amber-500",
    avatar: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    ring: "ring-2 ring-amber-300 ring-offset-1",
    icon: AlertCircle,
  },
  pending: {
    label: "Absent",
    badge: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800/60 font-bold",
    row: "border-l-4 border-l-rose-400",
    avatar: "bg-muted text-muted-foreground",
    ring: "ring-1 ring-border",
    icon: XCircle,
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
  classId,
  onDone,
}: QRSummaryStateProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [students, setStudents] = useState<Student[]>(() =>
    initialStudents.map((s) => (s.status === "pending" ? { ...s, status: "absent" } : s))
  )

  async function handleDone() {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      await onDone()
    } catch (err) {
      console.error("Error finalizing session:", err)
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    if (initialStudents.length === 0 && classId && sessionId) {
      fetch(`/api/teacher/student-list?class_id=${classId}&session_id=${sessionId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.students) {
            setStudents(
              data.students.map((s: Student) =>
                s.status === "pending" ? { ...s, status: "absent" } : s
              )
            )
          }
        })
        .catch((err) => console.error("Failed to load students in summary state:", err))
    }
  }, [classId, sessionId, initialStudents.length])

  const presentCount = students.filter((s) => s.status === "present").length
  const absentCount = students.filter((s) => s.status === "absent").length
  const failedCount = students.filter((s) => s.status === "failed").length
  const total = students.length
  const turnoutPct = total > 0 ? Math.round((presentCount / total) * 100) : 0

  async function handleOverride(studentId: string, newStatus: "present" | "absent") {
    const targetStudent = students.find((s) => s.id === studentId)
    const studentName = targetStudent?.name || "Student"
    const previousStatus = targetStudent?.status || "absent"

    if (previousStatus === newStatus) return

    // Optimistic update
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, status: newStatus } : s))
    )

    try {
      const supabase = createClient()
      const { data: existing, error: selectErr } = await supabase
        .from("period_attendance")
        .select("student_id")
        .eq("session_id", sessionId)
        .eq("student_id", studentId)
        .maybeSingle()

      if (selectErr) throw selectErr

      if (existing) {
        const { error } = await supabase
          .from("period_attendance")
          .update({
            status: newStatus,
            override_by_teacher: true,
            override_reason: "Manual teacher review override",
            overridden_by: teacherId,
            overridden_at: new Date().toISOString(),
            face_verified: newStatus === "present",
          })
          .eq("session_id", sessionId)
          .eq("student_id", studentId)
        if (error) throw error
      } else {
        const { error } = await supabase.from("period_attendance").insert({
          session_id: sessionId,
          student_id: studentId,
          status: newStatus,
          override_by_teacher: true,
          override_reason: "Manual teacher review override",
          overridden_by: teacherId,
          overridden_at: new Date().toISOString(),
          face_verified: newStatus === "present",
        })
        if (error) throw error
      }

      toast.success(`Marked ${newStatus} — ${studentName}`)
    } catch (err: any) {
      console.error("Manual override error:", err)
      // Roll back explicitly to the captured previous status
      setStudents((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, status: previousStatus } : s))
      )
      toast.error("Failed to update status", {
        description: err?.message || "Database update failed. Status has been reverted.",
      })
    }
  }

  // Sort: present → failed → absent
  const sorted = [...students].sort((a, b) => {
    const order = { present: 0, failed: 1, absent: 2, pending: 3 }
    return order[a.status] - order[b.status]
  })

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      {/* ── Session Summary Header Card ── */}
      <Card className="border-border shadow-md overflow-hidden bg-card">
        {/* Accent strip */}
        <div className="h-1.5 w-full bg-linear-to-r from-emerald-500 via-primary to-sky-500" />

        <CardHeader className="pb-4 pt-6 px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-300 dark:border-amber-800/60 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                  <Check className="size-3" />
                  REVIEWING — NOT YET FINAL
                </span>
                <span className="text-xs text-muted-foreground font-medium">{dateLabel}</span>
              </div>
              <CardTitle className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                {subjectLabel}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                {classLabel} &middot; {periodLabel}
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Badge variant="outline" className="text-xs font-semibold px-3 py-1 bg-muted/30">
                {total} Students Total
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-6 pb-6 pt-0">
          {/* Stat Tiles Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-2">
            {/* Present Tile */}
            <div className="rounded-xl border border-emerald-200/80 bg-linear-to-b from-emerald-500/10 via-card to-card p-3.5 shadow-2xs dark:border-emerald-900/50">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-4" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  Present
                </span>
              </div>
              <div className="text-2xl font-black text-foreground">{presentCount}</div>
              <div className="text-[11px] text-muted-foreground font-medium mt-0.5">
                {turnoutPct}% attendance
              </div>
            </div>

            {/* Absent Tile */}
            <div className="rounded-xl border border-rose-200/80 bg-linear-to-b from-rose-500/10 via-card to-card p-3.5 shadow-2xs dark:border-rose-900/50">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex size-7 items-center justify-center rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400">
                  <XCircle className="size-4" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                  Absent
                </span>
              </div>
              <div className="text-2xl font-black text-foreground">{absentCount}</div>
              <div className="text-[11px] text-muted-foreground font-medium mt-0.5">
                {total > 0 ? Math.round((absentCount / total) * 100) : 0}% absent
              </div>
            </div>

            {/* Failed Tile (if any) or Total enrolled */}
            {failedCount > 0 ? (
              <div className="rounded-xl border border-amber-200/80 bg-linear-to-b from-amber-500/10 via-card to-card p-3.5 shadow-2xs dark:border-amber-900/50">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    <AlertCircle className="size-4" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                    Failed
                  </span>
                </div>
                <div className="text-2xl font-black text-foreground">{failedCount}</div>
                <div className="text-[11px] text-muted-foreground font-medium mt-0.5">Verification failed</div>
              </div>
            ) : (
              <div className="rounded-xl border border-sky-200/80 bg-linear-to-b from-sky-500/10 via-card to-card p-3.5 shadow-2xs dark:border-sky-900/50">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400">
                    <Users className="size-4" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">
                    Total
                  </span>
                </div>
                <div className="text-2xl font-black text-foreground">{total}</div>
                <div className="text-[11px] text-muted-foreground font-medium mt-0.5">Enrolled students</div>
              </div>
            )}

            {/* Turnout Metric */}
            <div className="rounded-xl border border-border bg-muted/20 p-3.5 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ShieldCheck className="size-4" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Turnout
                </span>
              </div>
              <div className="text-2xl font-black text-primary">{turnoutPct}%</div>
              <div className="text-[11px] text-muted-foreground font-medium mt-0.5">
                {presentCount}/{total} logged
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Student Verification List ── */}
      <Card className="border-border shadow-2xs overflow-hidden bg-card">
        <CardHeader className="pb-3.5 border-b border-border/60 bg-muted/10">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-foreground">
                Roster Attendance Records
              </CardTitle>
              <CardDescription className="text-[11px] text-muted-foreground">
                Review and correct attendance below. This session becomes final only after you click Done.
              </CardDescription>
            </div>
            <span className="text-xs font-semibold text-muted-foreground">
              {sorted.length} records
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-2">
            {sorted.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No student records found for this session.
              </div>
            ) : (
              sorted.map((s) => {
                const cfg = statusConfig[s.status as keyof typeof statusConfig] || statusConfig.absent
                const StatusIcon = cfg.icon
                return (
                  <div
                    key={s.id}
                    className={cn(
                      "flex items-center justify-between gap-3.5 rounded-xl border border-border/80 p-3 sm:p-3.5 transition-all hover:bg-muted/30 shadow-2xs",
                      cfg.row
                    )}
                  >
                    {/* Avatar & Info */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Avatar className={cn("size-9 shrink-0", cfg.ring)}>
                        {s.photoUrl && s.status === "present" && (
                          <AvatarImage src={s.photoUrl} alt={s.name} className="object-cover" />
                        )}
                        <AvatarFallback className={cn("text-xs font-bold", cfg.avatar)}>
                          {s.initials}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="text-xs sm:text-sm font-bold text-foreground truncate">
                          {s.name}
                        </span>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                          <span className="font-mono font-semibold">{s.roll}</span>
                          {formatScanTime(s.time) && (
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                              <Clock className="size-2.5" />
                              {formatScanTime(s.time)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Badge & Override Menu */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className={cn("gap-1 text-xs px-2.5 py-0.5", cfg.badge)}>
                        <StatusIcon className="size-3" />
                        {cfg.label}
                      </Badge>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="size-8 rounded-lg hover:bg-muted cursor-pointer"
                            aria-label="Override attendance"
                          >
                            <Pencil className="size-3.5 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl border-border shadow-md">
                          <DropdownMenuItem
                            onClick={() => handleOverride(s.id, "present")}
                            className="text-xs font-semibold text-emerald-700 focus:text-emerald-700 focus:bg-emerald-50 dark:text-emerald-300 dark:focus:bg-emerald-950/40 cursor-pointer"
                          >
                            <CheckCircle2 className="mr-2 size-4" /> Mark Present
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleOverride(s.id, "absent")}
                            className="text-xs font-semibold text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:text-rose-400 dark:focus:bg-rose-950/40 cursor-pointer"
                          >
                            <XCircle className="mr-2 size-4" /> Mark Absent
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Done Button ── */}
      <Button
        onClick={handleDone}
        disabled={isSubmitting}
        size="lg"
        className="w-full gap-2 font-bold shadow-sm hover:shadow transition-all h-11.5 rounded-xl text-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <>
            <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span>Finalizing Session...</span>
          </>
        ) : (
          <>
            <span>Finalize Session &amp; Return to Setup</span>
            <ArrowRight className="size-4" />
          </>
        )}
      </Button>
    </div>
  )
}