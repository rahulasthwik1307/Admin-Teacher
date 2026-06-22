"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { CheckCircle2, ScanFace, Loader2, RefreshCw, Check, X, Users, Clock, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface PendingStudent {
  id: string
  name: string
  roll: string
  registration_photo: string | null
  created_at: string
  class?: string
  year?: string
}

function formatClassYear(cls?: string, year?: string) {
  const parts: string[] = []
  if (cls) parts.push(cls)
  if (year) parts.push(year)
  return parts.join(" · ") || "N/A"
}

function StudentPhoto({ src, name, size = "lg" }: { src: string | null; name: string; size?: "lg" | "md" }) {
  const dim = size === "lg" ? "w-16 h-16" : "w-14 h-14"
  const iconSize = size === "lg" ? "size-7" : "size-6"
  if (src) {
    return <img src={src} alt={name} className={cn(dim, "rounded-full object-cover object-top border-2 border-border shrink-0 shadow-sm")} />
  }
  return (
    <div className={cn(dim, "rounded-full bg-muted flex items-center justify-center border-2 border-border shrink-0")}>
      <ScanFace className={cn(iconSize, "text-muted-foreground/40")} />
    </div>
  )
}

function SectionHeader({ sectionName, count, variant }: { sectionName: string; count: number; variant: "pending" | "approved" }) {
  return (
    <div className={cn("flex items-center gap-3 px-4 py-2.5 border-b border-border", variant === "pending" ? "bg-amber-50/80 dark:bg-amber-950/20" : "bg-emerald-50/80 dark:bg-emerald-950/20")}>
      <span className="text-sm font-bold text-foreground">{sectionName}</span>
      <span className="text-muted-foreground/40 text-xs">·</span>
      <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-0.5", variant === "pending" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40")}>
        <span className={cn("size-1.5 rounded-full", variant === "pending" ? "bg-amber-500" : "bg-emerald-500")} />
        {count} {variant === "pending" ? "pending" : "approved"}
      </span>
    </div>
  )
}

function SectionFilterPills({ sections, active, onChange, variant }: { sections: string[]; active: string; onChange: (s: string) => void; variant: "pending" | "approved" }) {
  if (sections.length <= 1) return null
  const activeStyle = variant === "pending"
    ? "bg-amber-100 text-amber-700 border-amber-300 font-semibold dark:bg-amber-900/40"
    : "bg-emerald-100 text-emerald-700 border-emerald-300 font-semibold dark:bg-emerald-900/40"
  return (
    <div className="flex flex-wrap items-center gap-2">
      {["all", ...sections].map((s) => (
        <button key={s} onClick={() => onChange(s)} className={cn("rounded-full border px-3 py-1 text-xs transition-all duration-150", active === s ? activeStyle : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground")}>
          {s === "all" ? "All" : s}
        </button>
      ))}
    </div>
  )
}

export default function AdminFaceApprovalPage() {
  const [pending, setPending] = useState<PendingStudent[]>([])
  const [approved, setApproved] = useState<PendingStudent[]>([])
  const [activeTab, setActiveTab] = useState<"pending" | "approved">("pending")
  const [loading, setLoading] = useState(true)
  const [approveTarget, setApproveTarget] = useState<{ studentId: string; name: string } | null>(null)
  const [rejectTarget, setRejectTarget] = useState<{ studentId: string; name: string } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [pendingSectionFilter, setPendingSectionFilter] = useState("all")
  const [approvedSectionFilter, setApprovedSectionFilter] = useState("all")

  const fetchData = async () => {
    setLoading(true)
    try {
      // Admin endpoint — no teacher_id filter
      const response = await fetch("/api/admin/face-approvals")
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to fetch data")
      setPending(data.pending || [])
      setApproved(data.approved || [])
    } catch {
      toast.error("Failed to load face approvals")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleApprove = async () => {
    if (!approveTarget) return
    setActionLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("students").update({ is_approved: true }).eq("id", approveTarget.studentId)
      if (error) throw error
      toast.success(`Approved face registration for ${approveTarget.name}`)
      window.dispatchEvent(new Event("face-approval-updated"))
      const approvedStudent = pending.find((s) => s.id === approveTarget.studentId)
      if (approvedStudent) setApproved((prev) => [approvedStudent, ...prev])
      setPending((prev) => prev.filter((s) => s.id !== approveTarget.studentId))
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
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: rejectTarget.studentId }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to reject")
      toast.success(`Rejected face registration for ${rejectTarget.name}`)
      window.dispatchEvent(new Event("face-approval-updated"))
      setPending((prev) => prev.filter((s) => s.id !== rejectTarget.studentId))
      setApproved((prev) => prev.filter((s) => s.id !== rejectTarget.studentId))
    } catch {
      toast.error("Failed to reject registration")
    } finally {
      setActionLoading(false)
      setRejectTarget(null)
    }
  }

  const pendingGrouped = useMemo(() => {
    const map = new Map<string, PendingStudent[]>()
    for (const s of pending) {
      const key = s.class || "Unassigned"
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(s)
    }
    return map
  }, [pending])

  const approvedGrouped = useMemo(() => {
    const map = new Map<string, PendingStudent[]>()
    for (const s of approved) {
      const key = s.class || "Unassigned"
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(s)
    }
    return map
  }, [approved])

  const pendingSections = useMemo(() => Array.from(pendingGrouped.keys()), [pendingGrouped])
  const approvedSections = useMemo(() => Array.from(approvedGrouped.keys()), [approvedGrouped])

  const filteredPendingGroups = useMemo(() => {
    const all = Array.from(pendingGrouped.entries())
    return pendingSectionFilter === "all" ? all : all.filter(([k]) => k === pendingSectionFilter)
  }, [pendingGrouped, pendingSectionFilter])

  const filteredApprovedGroups = useMemo(() => {
    const all = Array.from(approvedGrouped.entries())
    return approvedSectionFilter === "all" ? all : all.filter(([k]) => k === approvedSectionFilter)
  }, [approvedGrouped, approvedSectionFilter])

  const totalRegistered = pending.length + approved.length

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Face Registration Approval</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Review and approve student face registrations across all classes</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="shrink-0 gap-2">
          <RefreshCw className={cn("size-4", loading && "animate-spin")} />Refresh
        </Button>
      </div>

      {!loading && (
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-2.5 shadow-sm">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10"><Users className="size-4 text-primary" /></div>
            <div className="flex flex-col"><span className="text-xs text-muted-foreground">Total Registered</span><span className="text-sm font-bold text-foreground">{totalRegistered}</span></div>
          </div>
          <div className={cn("flex items-center gap-2.5 rounded-xl border px-4 py-2.5 shadow-sm", pending.length > 0 ? "border-amber-200 bg-amber-50 dark:bg-amber-950/30" : "border-border bg-card")}>
            <div className={cn("flex size-8 items-center justify-center rounded-lg", pending.length > 0 ? "bg-amber-100 dark:bg-amber-900/40" : "bg-muted")}><Clock className={cn("size-4", pending.length > 0 ? "text-amber-600" : "text-muted-foreground")} /></div>
            <div className="flex flex-col"><span className={cn("text-xs", pending.length > 0 ? "text-amber-700" : "text-muted-foreground")}>Pending Approval</span><span className={cn("text-sm font-bold", pending.length > 0 ? "text-amber-800" : "text-foreground")}>{pending.length}</span></div>
          </div>
          <div className={cn("flex items-center gap-2.5 rounded-xl border px-4 py-2.5 shadow-sm", approved.length > 0 ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30" : "border-border bg-card")}>
            <div className={cn("flex size-8 items-center justify-center rounded-lg", approved.length > 0 ? "bg-emerald-100 dark:bg-emerald-900/40" : "bg-muted")}><ShieldCheck className={cn("size-4", approved.length > 0 ? "text-emerald-600" : "text-muted-foreground")} /></div>
            <div className="flex flex-col"><span className={cn("text-xs", approved.length > 0 ? "text-emerald-700" : "text-muted-foreground")}>Approved</span><span className={cn("text-sm font-bold", approved.length > 0 ? "text-emerald-800" : "text-foreground")}>{approved.length}</span></div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-1 self-start rounded-xl bg-muted p-1 shadow-sm">
        <button onClick={() => setActiveTab("pending")} className={cn("flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200", activeTab === "pending" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
          <Clock className="size-3.5" />Pending
          {pending.length > 0 && <span className={cn("flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold min-w-4 tabular-nums", activeTab === "pending" ? "bg-amber-100 text-amber-700" : "bg-amber-500/20 text-amber-600")}>{pending.length}</span>}
        </button>
        <button onClick={() => setActiveTab("approved")} className={cn("flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200", activeTab === "approved" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
          <ShieldCheck className="size-3.5" />Approved
          {approved.length > 0 && <span className={cn("flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold min-w-4 tabular-nums", activeTab === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-emerald-500/20 text-emerald-600")}>{approved.length}</span>}
        </button>
      </div>

      {activeTab === "pending" && (
        <div className="flex flex-col gap-4">
          <SectionFilterPills sections={pendingSections} active={pendingSectionFilter} onChange={setPendingSectionFilter} variant="pending" />
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground"><Loader2 className="size-8 animate-spin mb-4" /><p className="text-sm">Loading pending approvals...</p></div>
          ) : pending.length === 0 ? (
            <Card className="shadow-sm"><CardContent className="flex flex-col items-center justify-center py-16"><div className="mb-4 flex size-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30"><CheckCircle2 className="size-8 text-emerald-500" /></div><p className="text-base font-bold text-foreground">All caught up!</p><p className="text-sm text-muted-foreground mt-1">No pending face registrations to review.</p></CardContent></Card>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
              {filteredPendingGroups.map(([section, students]) => (
                <div key={section}>
                  <SectionHeader sectionName={section} count={students.length} variant="pending" />
                  {students.map((student) => (
                    <div key={student.id} className="flex items-center gap-4 px-4 py-3.5 border-b border-border last:border-0 bg-amber-50/30 dark:bg-amber-950/10 hover:bg-amber-50/60 transition-colors">
                      <div className="w-1 self-stretch rounded-full bg-amber-400 shrink-0" />
                      <StudentPhoto src={student.registration_photo} name={student.name} size="lg" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground truncate">{student.name}</p>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">{student.roll}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatClassYear(student.class, student.year)}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700 gap-1.5 h-8 px-3 shadow-sm" onClick={() => setApproveTarget({ studentId: student.id, name: student.name })}><Check className="size-3.5" /> Approve</Button>
                        <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 gap-1.5 h-8 px-3" onClick={() => setRejectTarget({ studentId: student.id, name: student.name })}><X className="size-3.5" /> Reject</Button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "approved" && (
        <div className="flex flex-col gap-4">
          <SectionFilterPills sections={approvedSections} active={approvedSectionFilter} onChange={setApprovedSectionFilter} variant="approved" />
          {approved.length === 0 ? (
            <Card className="shadow-sm"><CardContent className="flex flex-col items-center justify-center py-16"><div className="mb-4 flex size-16 items-center justify-center rounded-full bg-muted"><ShieldCheck className="size-8 text-muted-foreground/40" /></div><p className="text-base font-bold text-foreground">No approved registrations yet</p><p className="text-sm text-muted-foreground mt-1">Approved students will appear here.</p></CardContent></Card>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
              {filteredApprovedGroups.map(([section, students]) => (
                <div key={section}>
                  <SectionHeader sectionName={section} count={students.length} variant="approved" />
                  {students.map((student) => (
                    <div key={student.id} className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-0 bg-emerald-50/30 dark:bg-emerald-950/10 hover:bg-emerald-50/60 transition-colors">
                      <div className="w-1 self-stretch rounded-full bg-emerald-400 shrink-0" />
                      <StudentPhoto src={student.registration_photo} name={student.name} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground truncate">{student.name}</p>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">{student.roll}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatClassYear(student.class, student.year)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="size-3.5" />Approved</div>
                        <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 gap-1.5 h-8 px-3" onClick={() => setRejectTarget({ studentId: student.id, name: student.name })}><X className="size-3.5" /> Reject</Button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <AlertDialog open={!!approveTarget} onOpenChange={() => setApproveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Approve Face Registration</AlertDialogTitle><AlertDialogDescription>Are you sure you want to approve the face registration for <strong>{approveTarget?.name}</strong>?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} disabled={actionLoading}>{actionLoading ? <><Loader2 className="size-4 mr-2 animate-spin" />Approving...</> : "Approve"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!rejectTarget} onOpenChange={() => setRejectTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Reject Face Registration</AlertDialogTitle><AlertDialogDescription>Are you sure you want to reject this registration? The student will need to re-register their face.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReject} disabled={actionLoading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{actionLoading ? <><Loader2 className="size-4 mr-2 animate-spin" />Rejecting...</> : "Reject"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
