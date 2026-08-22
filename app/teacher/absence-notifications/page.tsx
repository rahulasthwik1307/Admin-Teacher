"use client"

import { useState, useEffect, useMemo } from "react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Loader2, CheckCheck, Send, MailX, Search, History, Check, X, ChevronDown, ChevronRight, GraduationCap } from "lucide-react"
import { MissedAttendanceSkeleton } from "@/components/ui/skeletons"

interface EligibleAbsence {
  periodAttendanceId: string; studentId: string; studentName: string; rollNumber: string; year: string
  className: string; contactEmail: string | null; alreadyNotified: boolean
  subjectId: string; subjectName: string; periodNumber: number; startTime: string; endTime: string; date: string
}

function fmtDate(d: string) { return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) }
function fmtDateTime(iso: string) { return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true }) }

export default function AbsenceNotificationsPage() {
  const [tab, setTab] = useState<"send" | "history">("send")
  const [absences, setAbsences] = useState<EligibleAbsence[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<any>(null)

  const [search, setSearch] = useState("")
  const [filterSubject, setFilterSubject] = useState("all")
  const [filterYear, setFilterYear] = useState("all")
  const [filterSection, setFilterSection] = useState("all")
  const [filterEmail, setFilterEmail] = useState("all")
  const [filterStatus, setFilterStatus] = useState("pending") // pending | notified | all
  const [filterDateFrom, setFilterDateFrom] = useState("")
  const [filterDateTo, setFilterDateTo] = useState("")

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const [history, setHistory] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detail, setDetail] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const fetchPending = async () => {
    setLoading(true); setLoadError(false)
    try {
      const res = await fetch("/api/teacher/absence-notifications/pending")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAbsences(data)
    } catch { setLoadError(true) } finally { setLoading(false) }
  }
  const fetchHistory = async () => {
    setHistoryLoading(true)
    try {
      const res = await fetch("/api/teacher/absence-notifications/history")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setHistory(data)
    } catch { toast.error("Failed to load history") } finally { setHistoryLoading(false) }
  }
  useEffect(() => { fetchPending(); fetchHistory() }, [])

  const uniqueSubjects = useMemo(() => Array.from(new Set(absences.map(a => a.subjectName))), [absences])
  const uniqueYears = useMemo(() => Array.from(new Set(absences.map(a => a.year))), [absences])
  const uniqueSections = useMemo(() => Array.from(new Set(absences.map(a => a.className))), [absences])

  const filtered = useMemo(() => {
    return absences.filter(a => {
      if (search && !a.studentName.toLowerCase().includes(search.toLowerCase()) && !a.rollNumber.toLowerCase().includes(search.toLowerCase())) return false
      if (filterSubject !== "all" && a.subjectName !== filterSubject) return false
      if (filterYear !== "all" && a.year !== filterYear) return false
      if (filterSection !== "all" && a.className !== filterSection) return false
      if (filterEmail === "has_email" && !a.contactEmail) return false
      if (filterEmail === "no_email" && a.contactEmail) return false
      if (filterStatus === "pending" && a.alreadyNotified) return false
      if (filterStatus === "notified" && !a.alreadyNotified) return false
      if (filterDateFrom && a.date < filterDateFrom) return false
      if (filterDateTo && a.date > filterDateTo) return false
      return true
    })
  }, [absences, search, filterSubject, filterYear, filterSection, filterEmail, filterStatus, filterDateFrom, filterDateTo])

  // Student → Subject grouping
  const studentGroups = useMemo(() => {
    const map = new Map<string, { studentId: string; studentName: string; rollNumber: string; year: string; className: string; contactEmail: string | null; subjects: Map<string, EligibleAbsence[]> }>()
    for (const a of filtered) {
      if (!map.has(a.studentId)) {
        map.set(a.studentId, { studentId: a.studentId, studentName: a.studentName, rollNumber: a.rollNumber, year: a.year, className: a.className, contactEmail: a.contactEmail, subjects: new Map() })
      }
      const g = map.get(a.studentId)!
      if (!g.subjects.has(a.subjectId)) g.subjects.set(a.subjectId, [])
      g.subjects.get(a.subjectId)!.push(a)
    }
    return Array.from(map.values()).sort((a, b) => a.studentName.localeCompare(b.studentName))
  }, [filtered])

  useEffect(() => {
    // Auto expand/collapse threshold
    if (studentGroups.length > 8) setCollapsed(new Set(studentGroups.map(g => g.studentId)))
    else setCollapsed(new Set())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentGroups.length])

  const selectableIds = useMemo(() => filtered.filter(a => !a.alreadyNotified).map(a => a.periodAttendanceId), [filtered])
  const allSelected = selectableIds.length > 0 && selectableIds.every(id => selectedIds.has(id))
  const selectedStudentIds = useMemo(() => new Set(filtered.filter(a => selectedIds.has(a.periodAttendanceId)).map(a => a.studentId)), [filtered, selectedIds])

  function toggle(id: string, checked: boolean) {
    setSelectedIds(prev => { const n = new Set(prev); checked ? n.add(id) : n.delete(id); return n })
  }
  function toggleGroup(ids: string[], checked: boolean) {
    setSelectedIds(prev => { const n = new Set(prev); for (const id of ids) checked ? n.add(id) : n.delete(id); return n })
  }
  function toggleCollapse(studentId: string) {
    setCollapsed(prev => { const n = new Set(prev); n.has(studentId) ? n.delete(studentId) : n.add(studentId); return n })
  }

  async function handleSend() {
    setSending(true)
    try {
      const res = await fetch("/api/teacher/absence-notifications/send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodAttendanceIds: Array.from(selectedIds) }),
      })
      const result = await res.json()
      if (!res.ok) { toast.error(result.error || "Failed to send"); return }
      setSendResult(result)
      setSelectedIds(new Set())
      fetchPending(); fetchHistory()
    } catch { toast.error("An unexpected error occurred") } finally { setSending(false) }
  }

  async function openDetail(batchId: string) {
    setDetailOpen(true); setDetailLoading(true)
    try {
      const res = await fetch(`/api/teacher/absence-notifications/history/${batchId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDetail(data)
    } catch { toast.error("Failed to load details") } finally { setDetailLoading(false) }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Absence Notifications</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Notify students about their recorded absences.</p>
      </div>

      <div className="inline-flex gap-1 rounded-xl border border-border bg-muted/40 p-1 self-start">
        <button onClick={() => setTab("send")} className={`flex items-center gap-2 rounded-lg px-4 h-9 text-xs font-semibold ${tab === "send" ? "bg-background shadow-xs" : "text-muted-foreground"}`}><Send className="size-3.5" /> Send Notifications</button>
        <button onClick={() => setTab("history")} className={`flex items-center gap-2 rounded-lg px-4 h-9 text-xs font-semibold ${tab === "history" ? "bg-background shadow-xs" : "text-muted-foreground"}`}><History className="size-3.5" /> Notification History</button>
      </div>

      {tab === "send" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
            <div className="relative shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input placeholder="Search student..." value={search} onChange={e => setSearch(e.target.value)} className="h-9 pl-9 w-44 text-xs" />
            </div>
            <Select value={filterSubject} onValueChange={setFilterSubject}><SelectTrigger className="h-9 w-36 text-xs shrink-0"><SelectValue placeholder="Subject" /></SelectTrigger><SelectContent><SelectItem value="all">All Subjects</SelectItem>{uniqueSubjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
            <Select value={filterYear} onValueChange={setFilterYear}><SelectTrigger className="h-9 w-32 text-xs shrink-0"><SelectValue placeholder="Year" /></SelectTrigger><SelectContent><SelectItem value="all">All Years</SelectItem>{uniqueYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent></Select>
            <Select value={filterSection} onValueChange={setFilterSection}><SelectTrigger className="h-9 w-32 text-xs shrink-0"><SelectValue placeholder="Section" /></SelectTrigger><SelectContent><SelectItem value="all">All Sections</SelectItem>{uniqueSections.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
            <Select value={filterEmail} onValueChange={setFilterEmail}><SelectTrigger className="h-9 w-36 text-xs shrink-0"><SelectValue placeholder="Email" /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="has_email">Has Email</SelectItem><SelectItem value="no_email">No Email</SelectItem></SelectContent></Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="h-9 w-36 text-xs shrink-0"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="notified">Already Notified</SelectItem><SelectItem value="all">All</SelectItem></SelectContent></Select>
            <Input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="h-9 w-36 text-xs shrink-0" placeholder="From" />
            <Input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="h-9 w-36 text-xs shrink-0" placeholder="To" />
          </div>

          {!loading && !loadError && filtered.length > 0 && (
            <div className="sticky top-2 z-10 flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-background/95 backdrop-blur px-4 py-3 shadow-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={allSelected} onCheckedChange={c => toggleGroup(selectableIds, !!c)} />
                <span className="text-xs font-semibold">Select all pending</span>
              </label>
              <span className="text-xs text-muted-foreground ml-auto">
                {selectedIds.size} absence{selectedIds.size !== 1 ? "s" : ""} • {selectedStudentIds.size} student{selectedStudentIds.size !== 1 ? "s" : ""}
              </span>
              <Button size="sm" disabled={selectedIds.size === 0} onClick={() => setConfirmOpen(true)} className="gap-2">
                <Send className="size-3.5" /> Send {selectedStudentIds.size} Email{selectedStudentIds.size !== 1 ? "s" : ""}
              </Button>
            </div>
          )}

          {studentGroups.length > 8 && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setCollapsed(new Set())}>Expand All</Button>
              <Button variant="outline" size="sm" onClick={() => setCollapsed(new Set(studentGroups.map(g => g.studentId)))}>Collapse All</Button>
            </div>
          )}

          {loading ? <MissedAttendanceSkeleton /> : loadError ? (
            <Card><CardContent className="py-16 text-center flex flex-col items-center gap-3">
              <p className="text-sm text-destructive">Unable to load absence records.</p>
              <Button variant="outline" size="sm" onClick={fetchPending}>Retry</Button>
            </CardContent></Card>
          ) : studentGroups.length === 0 ? (
            <Card><CardContent className="py-16 text-center">
              <CheckCheck className="mx-auto size-8 text-emerald-500 mb-2" />
              <p className="text-sm font-medium">
                {absences.length === 0 ? "No pending absences" : filterStatus === "pending" ? "All matching absences have already been notified." : "No students match the current filters."}
              </p>
            </CardContent></Card>
          ) : (
            <div className="flex flex-col gap-3">
              {studentGroups.map(group => {
                const isCollapsed = collapsed.has(group.studentId)
                const groupIds = Array.from(group.subjects.values()).flat().filter(a => !a.alreadyNotified).map(a => a.periodAttendanceId)
                const groupAllSelected = groupIds.length > 0 && groupIds.every(id => selectedIds.has(id))
                const pendingCount = Array.from(group.subjects.values()).flat().filter(a => !a.alreadyNotified).length
                return (
                  <Card key={group.studentId}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2 cursor-pointer" onClick={() => toggleCollapse(group.studentId)}>
                        <div className="flex items-start gap-2">
                          {isCollapsed ? <ChevronRight className="size-4 mt-0.5 text-muted-foreground" /> : <ChevronDown className="size-4 mt-0.5 text-muted-foreground" />}
                          <div>
                            <p className="text-sm font-bold text-foreground">{group.studentName}</p>
                            <p className="text-xs text-muted-foreground font-mono">Roll No: {group.rollNumber}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1"><GraduationCap className="size-3" />{group.year} · {group.className}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant="secondary">{pendingCount} pending</Badge>
                          {!group.contactEmail && <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200"><MailX className="size-2.5 mr-1" />No contact email</Badge>}
                        </div>
                      </div>

                      {!isCollapsed && (
                        <div className="flex flex-col gap-3 pl-6 mt-3">
                          {groupIds.length > 0 && (
                            <label className="flex items-center gap-2 cursor-pointer w-fit">
                              <Checkbox checked={groupAllSelected} onCheckedChange={c => toggleGroup(groupIds, !!c)} />
                              <span className="text-xs font-medium">Select student</span>
                            </label>
                          )}
                          {Array.from(group.subjects.entries()).map(([subjId, records]) => {
                            const subjIds = records.filter(r => !r.alreadyNotified).map(r => r.periodAttendanceId)
                            const subjAllSelected = subjIds.length > 0 && subjIds.every(id => selectedIds.has(id))
                            return (
                              <div key={subjId} className="flex flex-col gap-1.5">
                                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{records[0].subjectName}</p>
                                {records.sort((a, b) => b.date.localeCompare(a.date)).map(r => (
                                  <div key={r.periodAttendanceId} className={`flex items-center gap-2 text-xs pl-2 ${r.alreadyNotified ? "opacity-50" : ""}`}>
                                    <Checkbox disabled={r.alreadyNotified} checked={selectedIds.has(r.periodAttendanceId)} onCheckedChange={c => toggle(r.periodAttendanceId, !!c)} />
                                    <span className="text-foreground">{fmtDate(r.date)} • Period {r.periodNumber} • {r.startTime}–{r.endTime}</span>
                                    {r.alreadyNotified && <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 ml-auto"><Check className="size-2.5 mr-1" />Already notified</Badge>}
                                  </div>
                                ))}
                                {subjIds.length > 1 && (
                                  <Button variant="ghost" size="sm" className="w-fit h-7 text-xs" onClick={() => toggleGroup(subjIds, !subjAllSelected)}>
                                    {subjAllSelected ? "Deselect all" : `Select all ${records[0].subjectName}`}
                                  </Button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === "history" && (
        <div className="flex flex-col gap-3">
          {historyLoading ? <MissedAttendanceSkeleton /> : history.length === 0 ? (
            <Card><CardContent className="py-16 text-center text-sm text-muted-foreground">No notifications sent yet.</CardContent></Card>
          ) : history.map((b: any) => (
            <Card key={b.batchId}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-foreground">{b.subjects.join(", ") || "—"}</p>
                  <p className="text-xs text-muted-foreground">{fmtDateTime(b.sentAt)} · Sent by {b.sentBy}</p>
                  <p className="text-xs mt-1">
                    <span className="font-semibold">{b.studentCount} students</span>
                    <span className="text-muted-foreground ml-2">{b.selectedCount} records</span>
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

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Absence Notifications?</AlertDialogTitle>
            <AlertDialogDescription>
              Sending <strong>{selectedStudentIds.size} email{selectedStudentIds.size !== 1 ? "s" : ""}</strong> covering <strong>{selectedIds.size} record{selectedIds.size !== 1 ? "s" : ""}</strong>. Each student receives one consolidated email.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmOpen(false); handleSend() }} disabled={sending}>{sending ? <Loader2 className="size-4 animate-spin" /> : "Send"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!sendResult} onOpenChange={() => setSendResult(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Result</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="flex flex-col gap-1 text-sm">
                <span className="text-emerald-600">✓ {sendResult?.sentCount} email(s) sent</span>
                {sendResult?.failedCount > 0 && <span className="text-rose-600">⚠ {sendResult.failedCount} failed</span>}
                {sendResult?.noEmailCount > 0 && <span className="text-amber-600">⚠ {sendResult.noEmailCount} skipped — no contact email</span>}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogAction onClick={() => setSendResult(null)}>OK</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>Notification Details</SheetTitle>{detail && <SheetDescription>{detail.studentCount} students · {fmtDateTime(detail.sentAt)}</SheetDescription>}</SheetHeader>
          {detailLoading ? <div className="p-6"><Loader2 className="animate-spin" /></div> : detail && (
            <div className="flex flex-col gap-3 p-4">
              {detail.students.map((s: any, i: number) => (
                <div key={i} className="border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div><p className="text-xs font-bold">{s.studentName}</p><p className="text-[11px] text-muted-foreground font-mono">{s.rollNumber} · {s.email ?? "—"}</p></div>
                    {s.status === "sent" && <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200"><Check className="size-3 mr-1" />Sent</Badge>}
                    {s.status === "failed" && <Badge className="bg-rose-50 text-rose-700 border-rose-200"><X className="size-3 mr-1" />Failed</Badge>}
                    {s.status === "no_email" && <Badge className="bg-amber-50 text-amber-700 border-amber-200"><MailX className="size-3 mr-1" />No email</Badge>}
                  </div>
                  <div className="flex flex-col gap-1 mt-2">{s.records.map((r: any, ri: number) => <span key={ri} className="text-[11px] text-muted-foreground">{fmtDate(r.date)} — {r.subjectName} — Period {r.periodNumber}</span>)}</div>
                </div>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
