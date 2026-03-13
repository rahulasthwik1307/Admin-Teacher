"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { CheckCircle2, ScanFace, Loader2, RefreshCw, Check, X } from "lucide-react"
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

/* ---------- Section group header ---------- */

function SectionHeader({
  sectionName,
  count,
  variant,
}: {
  sectionName: string
  count: number
  variant: "pending" | "approved"
}) {
  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-2.5 border-b border-border",
      variant === "pending"
        ? "bg-amber-50/80 dark:bg-amber-950/20"
        : "bg-emerald-50/80 dark:bg-emerald-950/20"
    )}>
      <span className="text-sm font-bold text-foreground tracking-wide">{sectionName}</span>
      <span className="text-xs text-muted-foreground">·</span>
      <span className={cn(
        "inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5",
        variant === "pending"
          ? "text-amber-700 bg-amber-100"
          : "text-emerald-700 bg-emerald-100"
      )}>
        <span className={cn("size-1.5 rounded-full inline-block", variant === "pending" ? "bg-amber-500" : "bg-emerald-500")} />
        {count} {variant === "pending" ? "pending" : "approved"}
      </span>
    </div>
  )
}

/* ---------- Student photo ---------- */

function StudentPhoto({
  src,
  name,
  size = "lg",
}: {
  src: string | null
  name: string
  size?: "lg" | "md"
}) {
  const dim = size === "lg" ? "w-20 h-20" : "w-16 h-16"
  const iconSize = size === "lg" ? "size-8" : "size-6"

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn(dim, "rounded-full object-cover border-2 border-border shrink-0")}
      />
    )
  }
  return (
    <div className={cn(dim, "rounded-full bg-muted flex items-center justify-center border-2 border-border shrink-0")}>
      <ScanFace className={cn(iconSize, "text-muted-foreground/50")} />
    </div>
  )
}

/* ---------- Format class + year cleanly ---------- */

function formatClassYear(cls?: string, year?: string) {
  const parts: string[] = []
  if (cls) parts.push(cls)
  if (year) parts.push(year)  // year already contains "4th Year" — no prefix needed
  return parts.join(" · ") || "N/A"
}

/* ---------- Main component ---------- */

export default function FaceApprovalPage() {
  const [pending, setPending] = useState<PendingStudent[]>([])
  const [approved, setApproved] = useState<PendingStudent[]>([])
  const [activeTab, setActiveTab] = useState<"pending" | "approved">("pending")
  const [loading, setLoading] = useState(true)
  const [approveTarget, setApproveTarget] = useState<{ studentId: string; name: string } | null>(null)
  const [rejectTarget, setRejectTarget] = useState<{ studentId: string; name: string } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast.error("Not authenticated"); setLoading(false); return }
      const response = await fetch(`/api/teacher/face-approvals?teacher_id=${user.id}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to fetch data")
      setPending(data.pending || [])
      setApproved(data.approved || [])
    } catch (error: any) {
      toast.error("Failed to load pending approvals")
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
      setPending((prev) => prev.filter((s) => s.id !== rejectTarget.studentId))
    } catch {
      toast.error("Failed to reject registration")
    } finally {
      setActionLoading(false)
      setRejectTarget(null)
    }
  }

  /* ---------- Group by class section ---------- */

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

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Face Registration Approval</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Review and approve student face registrations</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={cn("size-4 mr-2", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-border">
        <button
          onClick={() => setActiveTab("pending")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
            activeTab === "pending" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Pending{pending.length > 0 && ` (${pending.length})`}
        </button>
        <button
          onClick={() => setActiveTab("approved")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
            activeTab === "approved" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Approved{approved.length > 0 && ` (${approved.length})`}
        </button>
      </div>

      {/* ── Pending tab ── */}
      {activeTab === "pending" && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-base font-semibold text-foreground">Pending Approvals</h2>
            {pending.length > 0 && <Badge variant="secondary">{pending.length}</Badge>}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="size-8 animate-spin mb-4" />
              <p className="text-sm">Loading pending approvals...</p>
            </div>
          ) : pending.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <CheckCircle2 className="size-12 mb-4 text-emerald-500/50" />
                <p className="text-base font-semibold">All caught up!</p>
                <p className="text-sm">No pending face registrations to review.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
              {Array.from(pendingGrouped.entries()).map(([section, sectionStudents]) => (
                <div key={section}>
                  <SectionHeader sectionName={section} count={sectionStudents.length} variant="pending" />
                  {sectionStudents.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-0 hover:bg-amber-50/30 transition-colors"
                    >
                      <StudentPhoto src={student.registration_photo} name={student.name} size="lg" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{student.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{student.roll}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatClassYear(student.class, student.year)}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          className="bg-emerald-600 text-white hover:bg-emerald-700 h-8 px-3"
                          onClick={() => setApproveTarget({ studentId: student.id, name: student.name })}
                        >
                          <Check className="size-3.5 mr-1" />Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50 h-8 px-3"
                          onClick={() => setRejectTarget({ studentId: student.id, name: student.name })}
                        >
                          <X className="size-3.5 mr-1" />Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Approved tab ── */}
      {activeTab === "approved" && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-base font-semibold text-foreground">Approved Students</h2>
            {approved.length > 0 && <Badge variant="secondary">{approved.length}</Badge>}
          </div>

          {approved.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <CheckCircle2 className="size-12 mb-4 text-muted-foreground/30" />
                <p className="text-base font-semibold">No approved registrations yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
              {Array.from(approvedGrouped.entries()).map(([section, sectionStudents]) => (
                <div key={section}>
                  <SectionHeader sectionName={section} count={sectionStudents.length} variant="approved" />
                  {sectionStudents.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-0 hover:bg-emerald-50/30 transition-colors"
                    >
                      <StudentPhoto src={student.registration_photo} name={student.name} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{student.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{student.roll}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatClassYear(student.class, student.year)}
                        </p>
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 shrink-0">✓ Approved</Badge>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Approve dialog */}
      <AlertDialog open={!!approveTarget} onOpenChange={() => setApproveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Face Registration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve the face registration for{" "}
              <strong>{approveTarget?.name}</strong>? This will allow the student to be marked present via face recognition.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} disabled={actionLoading}>
              {actionLoading ? <><Loader2 className="size-4 mr-2 animate-spin" />Approving...</> : "Approve"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject dialog */}
      <AlertDialog open={!!rejectTarget} onOpenChange={() => setRejectTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Face Registration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject this registration? The student will need to re-register their face.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReject} disabled={actionLoading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {actionLoading ? <><Loader2 className="size-4 mr-2 animate-spin" />Rejecting...</> : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}