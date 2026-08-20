"use client"

import { useState, useEffect, useMemo } from "react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet"
import { Mail, Loader2, AlertTriangle, CheckCheck, Send, MailX, Search, Clock, History, Check, X } from "lucide-react"
import { MissedAttendanceSkeleton } from "@/components/ui/skeletons"

interface PendingStudent {
  periodAttendanceId: string; studentId: string; studentName: string; rollNumber: string; contactEmail: string | null
}
interface PendingSession {
  sessionId: string; subjectId: string; subjectName: string; classId: string; className: string
  periodId: string; periodNumber: number; startTime: string; endTime: string; date: string; students: PendingStudent[]
}
interface HistoryBatch {
  batchId: string; sentAt: string; selectedCount: number; sentCount: number; failedCount: number; noEmailCount: number
  sentBy: string; subjectName: string; className: string; periodNumber: number; date: string
}
interface BatchDetail extends HistoryBatch {
  recipients: { studentName: string; rollNumber: string; email: string | null; status: string; failureReason: string | null }[]
}

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}
function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true })
}

export default function AbsenceNotificationsPage() {
  const [tab, setTab] = useState<"send" | "history">("send")

  // Send tab state
  const [sessions, setSessions] = useState<PendingSession[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBySession, setSelectedBySession] = useState<Record<string, Set<string>>>({})
  const [confirmSession, setConfirmSession] = useState<PendingSession | null>(null)
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState("")
  const [filterSubject, setFilterSubject] = useState("all")
  const [filterSection, setFilterSection] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all") // no-email filter for pending

  // History tab state
  const [history, setHistory] = useState<HistoryBatch[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detail, setDetail] = useState<BatchDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const fetchPending = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/teacher/absence-notifications/pending")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSessions(data)
    } catch { toast.error("Failed to load pending absences") }
    finally { setLoading(false) }
  }
  const fetchHistory = async () => {
    setHistoryLoading(true)
    try {
      const res = await fetch("/api/teacher/absence-notifications/history")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setHistory(data)
    } catch { toast.error("Failed to load history") }
    finally { setHistoryLoading(false) }
  }

  useEffect(() => { fetchPending(); fetchHistory() }, [])

  const uniqueSubjects = useMemo(() => Array.from(new Set(sessions.map(s => s.subjectName))), [sessions])
  const uniqueSections = useMemo(() => Array.from(new Set(sessions.map(s => s.className))), [sessions])

  const filteredSessions = useMemo(() => {
    return sessions
      .map(s => ({
        ...s,
        students: s.students.filter(st => {
          if (search && !st.studentName.toLowerCase().includes(search.toLowerCase()) && !st.rollNumber.toLowerCase().includes(search.toLowerCase())) return false
          if (filterStatus === "no_email" && st.contactEmail) return false
          if (filterStatus === "has_email" && !st.contactEmail) return false
          return true
        }),
      }))
      .filter(s => s.students.length > 0)
      .filter(s => filterSubject === "all" || s.subjectName === filterSubject)
      .filter(s => filterSection === "all" || s.className === filterSection)
  }, [sessions, search, filterSubject, filterSection, filterStatus])

  function toggleStudent(sessionId: string, id: string, checked: boolean) {
    setSelectedBySession(prev => {
      const next = { ...prev }
      const set = new Set(next[sessionId] ?? [])
      if (checked) set.add(id); else set.delete(id)
      next[sessionId] = set
      return next
    })
  }
  function selectAllInSession(session: PendingSession, checked: boolean) {
    setSelectedBySession(prev => ({ ...prev, [session.sessionId]: checked ? new Set(session.students.map(s => s.periodAttendanceId)) : new Set() }))
  }

  async function handleSend() {
    if (!confirmSession) return
    const ids = Array.from(selectedBySession[confirmSession.sessionId] ?? [])
    if (ids.length === 0) return
    setSending(true)
    try {
      const res = await fetch("/api/teacher/absence-notifications/send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodAttendanceIds: ids }),
      })
      const result = await res.json()
      if (!res.ok) { toast.error(result.error || "Failed to send"); return }
      toast.success(`${result.sentCount} sent, ${result.failedCount} failed, ${result.noEmailCount} no email`)
      setSelectedBySession(prev => ({ ...prev, [confirmSession.sessionId]: new Set() }))
      setConfirmSession(null)
      fetchPending(); fetchHistory()
    } catch { toast.error("An unexpected error occurred") }
    finally { setSending(false) }
  }

  async function openDetail(batchId: string) {
    setDetailOpen(true); setDetailLoading(true)
    try {
      const res = await fetch(`/api/teacher/absence-notifications/history/${batchId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDetail(data)
    } catch { toast.error("Failed to load details") }
    finally { setDetailLoading(false) }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Absence Notifications</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Notify students of absences by class session and track every send.</p>
      </div>

      <div className="inline-flex gap-1 rounded-xl border border-border bg-muted/40 p-1 self-start">
        <button onClick={() => setTab("send")} className={`flex items-center gap-2 rounded-lg px-4 h-9 text-xs font-semibold transition-colors ${tab === "send" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground"}`}>
          <Send className="size-3.5" /> Send Notifications
        </button>
        <button onClick={() => setTab("history")} className={`flex items-center gap-2 rounded-lg px-4 h-9 text-xs font-semibold transition-colors ${tab === "history" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground"}`}>
          <History className="size-3.5" /> Notification History
        </button>
      </div>

      {tab === "send" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input placeholder="Search student..." value={search} onChange={e => setSearch(e.target.value)} className="h-9 pl-9 w-52 text-xs" />
            </div>
            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger className="h-9 w-40 text-xs"><SelectValue placeholder="All Subjects" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Subjects</SelectItem>{uniqueSubjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filterSection} onValueChange={setFilterSection}>
              <SelectTrigger className="h-9 w-36 text-xs"><SelectValue placeholder="All Sections" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Sections</SelectItem>{uniqueSections.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-9 w-40 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="has_email">Has Contact Email</SelectItem>
                <SelectItem value="no_email">No Contact Email</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? <MissedAttendanceSkeleton /> : filteredSessions.length === 0 ? (
            <Card><CardContent className="py-16 text-center">
              <CheckCheck className="mx-auto size-8 text-emerald-500 mb-2" />
              <p className="text-sm font-medium">No pending notifications</p>
            </CardContent></Card>
          ) : (
            filteredSessions.map(session => {
              const selected = selectedBySession[session.sessionId] ?? new Set()
              const allSelected = session.students.length > 0 && session.students.every(s => selected.has(s.periodAttendanceId))
              return (
                <Card key={session.sessionId}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm font-bold text-foreground">{session.subjectName}</p>
                        <p className="text-xs text-muted-foreground">{session.className} — Period {session.periodNumber} · {session.startTime}–{session.endTime}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(session.date)}</p>
                      </div>
                      <Badge variant="secondary">{session.students.length} Students Absent</Badge>
                    </div>
                    <div className="flex flex-col gap-1.5 mb-3">
                      {session.students.map(st => (
                        <div key={st.periodAttendanceId} className="flex items-center gap-2 text-xs">
                          <Checkbox checked={selected.has(st.periodAttendanceId)} onCheckedChange={c => toggleStudent(session.sessionId, st.periodAttendanceId, !!c)} />
                          <span className="text-foreground">{st.studentName}</span>
                          <span className="text-muted-foreground font-mono">{st.rollNumber}</span>
                          {!st.contactEmail && <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200"><MailX className="size-2.5 mr-1" />No email</Badge>}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <Button variant="outline" size="sm" onClick={() => selectAllInSession(session, !allSelected)}>{allSelected ? "Deselect All" : "Select All"}</Button>
                      <Button size="sm" disabled={selected.size === 0} onClick={() => setConfirmSession(session)} className="gap-2">
                        <Send className="size-3.5" /> Send Emails ({selected.size})
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      )}

      {tab === "history" && (
        <div className="flex flex-col gap-3">
          {historyLoading ? <MissedAttendanceSkeleton /> : history.length === 0 ? (
            <Card><CardContent className="py-16 text-center text-sm text-muted-foreground">No notifications sent yet.</CardContent></Card>
          ) : history.map(b => (
            <Card key={b.batchId}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-foreground">{b.subjectName}</p>
                  <p className="text-xs text-muted-foreground">{b.className} · Period {b.periodNumber} — {formatDate(b.date)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Sent by: {b.sentBy} · {formatDateTime(b.sentAt)}</p>
                  <p className="text-xs mt-1">
                    <span className="font-semibold">{b.selectedCount} selected</span>
                    <span className="text-emerald-600 ml-2">{b.sentCount} sent</span>
                    {b.failedCount > 0 && <span className="text-rose-600 ml-2">{b.failedCount} failed</span>}
                    {b.noEmailCount > 0 && <span className="text-amber-600 ml-2">{b.noEmailCount} no email</span>}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => openDetail(b.batchId)}>View Details</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!confirmSession} onOpenChange={o => !o && setConfirmSession(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Absence Notifications?</AlertDialogTitle>
            <AlertDialogDescription>
              You're about to send notifications to <strong>{confirmSession ? (selectedBySession[confirmSession.sessionId]?.size ?? 0) : 0} students</strong> for {confirmSession?.subjectName} ({confirmSession?.className}). Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSend} disabled={sending}>{sending ? <Loader2 className="size-4 animate-spin" /> : "Send"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Notification Details</SheetTitle>
            {detail && <SheetDescription>{detail.subjectName} — {detail.className} · Period {detail.periodNumber} — {formatDate(detail.date)}</SheetDescription>}
          </SheetHeader>
          {detailLoading ? <div className="p-6"><Loader2 className="animate-spin" /></div> : detail && (
            <div className="flex flex-col gap-3 p-4">
              <p className="text-xs text-muted-foreground">Sent by {detail.sentBy} at {formatDateTime(detail.sentAt)}</p>
              <div className="flex flex-col gap-1.5">
                {detail.recipients.map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-xs border-b border-border/60 py-2">
                    <div>
                      <p className="font-medium text-foreground">{r.studentName}</p>
                      <p className="text-muted-foreground font-mono">{r.rollNumber} · {r.email ?? "—"}</p>
                    </div>
                    {r.status === "sent" && <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200"><Check className="size-3 mr-1" />Sent</Badge>}
                    {r.status === "failed" && <Badge className="bg-rose-50 text-rose-700 border-rose-200"><X className="size-3 mr-1" />Failed</Badge>}
                    {r.status === "no_email" && <Badge className="bg-amber-50 text-amber-700 border-amber-200"><MailX className="size-3 mr-1" />No email</Badge>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
