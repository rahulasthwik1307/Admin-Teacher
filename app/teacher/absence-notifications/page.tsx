"use client"

import { useState, useEffect, useMemo } from "react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Mail, Loader2, AlertTriangle, CheckCheck, Send, User, MailX } from "lucide-react"
import { MissedAttendanceSkeleton } from "@/components/ui/skeletons"

interface PendingAbsence {
  periodAttendanceId: string
  studentId: string
  studentName: string
  rollNumber: string
  contactEmail: string | null
  date: string
  subject: string
  period: number
  className: string
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export default function AbsenceNotificationsPage() {
  const [items, setItems] = useState<PendingAbsence[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [sending, setSending] = useState(false)

  const fetchPending = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/teacher/absence-notifications/pending")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setItems(data)
    } catch {
      toast.error("Failed to load pending absences")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPending() }, [])

  const groupedByStudent = useMemo(() => {
    const map = new Map<string, PendingAbsence[]>()
    for (const item of items) {
      if (!map.has(item.studentId)) map.set(item.studentId, [])
      map.get(item.studentId)!.push(item)
    }
    return map
  }, [items])

  const selectedStudentCount = useMemo(() => {
    const studentIds = new Set(
      items.filter((i) => selectedIds.has(i.periodAttendanceId)).map((i) => i.studentId)
    )
    return studentIds.size
  }, [items, selectedIds])

  const selectedWithoutEmail = useMemo(() => {
    return items.filter((i) => selectedIds.has(i.periodAttendanceId) && !i.contactEmail).length
  }, [items, selectedIds])

  function toggleItem(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function toggleStudentGroup(studentItems: PendingAbsence[], checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const item of studentItems) {
        if (checked) next.add(item.periodAttendanceId)
        else next.delete(item.periodAttendanceId)
      }
      return next
    })
  }

  function selectAll() {
    setSelectedIds(new Set(items.map((i) => i.periodAttendanceId)))
  }

  async function handleSend() {
    setSending(true)
    try {
      const res = await fetch("/api/teacher/absence-notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodAttendanceIds: Array.from(selectedIds) }),
      })
      const result = await res.json()
      if (!res.ok) {
        toast.error(result.error || "Failed to send notifications")
        return
      }
      if (result.failedCount > 0) {
        toast.warning(`${result.successCount} sent, ${result.failedCount} failed (check contact emails)`)
      } else {
        toast.success(`Notifications sent to ${result.successCount} student(s)`)
      }
      setSelectedIds(new Set())
      setConfirmOpen(false)
      fetchPending()
    } catch {
      toast.error("An unexpected error occurred")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Absence Notifications</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Review finalized absences and send email notifications to students. Emails are only sent when you choose to send them.
        </p>
      </div>

      {items.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" className="gap-2" onClick={selectAll}>
            <CheckCheck className="size-3.5" /> Select All ({items.length})
          </Button>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              {selectedWithoutEmail > 0 && (
                <span className="flex items-center gap-1 text-xs text-amber-600">
                  <MailX className="size-3.5" /> {selectedWithoutEmail} without contact email — will be skipped
                </span>
              )}
              <Button size="sm" className="gap-2" onClick={() => setConfirmOpen(true)}>
                <Send className="size-3.5" /> Send Notifications ({selectedStudentCount} student{selectedStudentCount !== 1 ? "s" : ""})
              </Button>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <MissedAttendanceSkeleton />
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10">
                <CheckCheck className="size-6 text-emerald-600" />
              </div>
              <p className="text-sm font-medium text-foreground">No pending notifications</p>
              <p className="text-xs text-muted-foreground">All finalized absences have already been notified.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {Array.from(groupedByStudent.entries()).map(([studentId, studentItems]) => {
            const student = studentItems[0]
            const allSelected = studentItems.every((i) => selectedIds.has(i.periodAttendanceId))
            const hasEmail = !!student.contactEmail
            return (
              <Card key={studentId} className={!hasEmail ? "border-amber-200" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={(checked) => toggleStudentGroup(studentItems, !!checked)}
                    />
                    <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <User className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{student.studentName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{student.rollNumber}</p>
                    </div>
                    {hasEmail ? (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Mail className="size-3.5" /> {student.contactEmail}
                      </span>
                    ) : (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                        <MailX className="size-3 mr-1" /> No contact email
                      </Badge>
                    )}
                    <Badge variant="secondary">{studentItems.length} absence{studentItems.length !== 1 ? "s" : ""}</Badge>
                  </div>
                  <div className="flex flex-col gap-1.5 pl-11">
                    {studentItems.map((item) => (
                      <div key={item.periodAttendanceId} className="flex items-center gap-3 text-xs">
                        <Checkbox
                          checked={selectedIds.has(item.periodAttendanceId)}
                          onCheckedChange={(checked) => toggleItem(item.periodAttendanceId, !!checked)}
                        />
                        <AlertTriangle className="size-3 text-amber-500 shrink-0" />
                        <span className="text-muted-foreground">
                          {formatDate(item.date)} — {item.subject} — Period {item.period} — {item.className}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Absence Notifications?</AlertDialogTitle>
            <AlertDialogDescription>
              You're about to send notifications to <strong>{selectedStudentCount} student{selectedStudentCount !== 1 ? "s" : ""}</strong>.
              {selectedWithoutEmail > 0 && (
                <span className="block mt-2 text-amber-600">
                  {selectedWithoutEmail} selected absence(s) belong to students without a contact email and will be skipped.
                </span>
              )}
              {" "}This action cannot be undone — these absences will be marked as notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSend} disabled={sending}>
              {sending ? <><Loader2 className="size-4 animate-spin mr-2" />Sending...</> : "Send Notifications"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
