"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import {
  CheckCircle2,
  XCircle,
  ScanFace,
  Check,
  X,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"

interface PendingStudent {
  id: string
  studentId: string
  name: string
  roll: string
  class: string
  submittedAt: string
}

interface HistoryItem {
  id: string
  studentId: string
  name: string
  roll: string
  decision: "Approved" | "Rejected"
  date: string
  reason: string
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

function formatTimeAgo(dateString: string) {
  if (!dateString) return "Unknown"
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) return "Just now"
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays === 1) return "Yesterday"
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function FaceApprovalPage() {
  const [pending, setPending] = useState<PendingStudent[]>([])
  const [historyData, setHistoryData] = useState<HistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [teacherId, setTeacherId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  // Approve dialog state
  const [approveTarget, setApproveTarget] = useState<PendingStudent | null>(null)

  // Reject dialog state
  const [rejectTarget, setRejectTarget] = useState<PendingStudent | null>(null)
  const [rejectReason, setRejectReason] = useState("")

  const fetchData = useCallback(async (uid: string) => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      
      // 1. Get teacher's students
      const { data: students } = await supabase
        .from("students")
        .select(`
          id,
          roll_number,
          class:classes ( name, section, department:departments ( code ) ),
          user:users ( full_name )
        `)
        .eq("created_by", uid)

      if (!students || students.length === 0) {
        setPending([])
        setHistoryData([])
        setIsLoading(false)
        return
      }

      const studentMap: Record<string, any> = {}
      students.forEach((s: any) => {
        studentMap[s.id] = {
          roll: s.roll_number,
          name: s.user?.full_name || "Unknown",
          className: s.class ? `${s.class.department?.code || ""}-${s.class.section}` : "—"
        }
      })

      const studentIds = Object.keys(studentMap)

      // 2. Get pending
      const { data: pendingRes } = await supabase
        .from("face_registrations")
        .select("*")
        .eq("status", "pending")
        .in("student_id", studentIds)
        .order("submitted_at", { ascending: false })

      // 3. Get history
      const { data: historyRes } = await supabase
        .from("face_registrations")
        .select("*")
        .in("status", ["approved", "rejected"])
        .in("student_id", studentIds)
        .order("reviewed_at", { ascending: false })

      if (pendingRes) {
        setPending(
          pendingRes.map((p) => ({
            id: p.id,
            studentId: p.student_id,
            name: studentMap[p.student_id]?.name || "Unknown",
            roll: studentMap[p.student_id]?.roll || "—",
            class: studentMap[p.student_id]?.className || "—",
            submittedAt: formatTimeAgo(p.submitted_at),
          }))
        )
      }

      if (historyRes) {
        setHistoryData(
          historyRes.map((h) => ({
            id: h.id,
            studentId: h.student_id,
            name: studentMap[h.student_id]?.name || "Unknown",
            roll: studentMap[h.student_id]?.roll || "—",
            decision: h.status === "approved" ? "Approved" : "Rejected",
            date: new Date(h.reviewed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            reason: h.rejection_reason || "-",
          }))
        )
      }

    } catch (err) {
      console.error("Fetch face approvals error:", err)
      toast.error("Failed to load face registration data")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setTeacherId(user.id)
        fetchData(user.id)
      } else {
        setIsLoading(false)
      }
    }
    init()
  }, [fetchData])

  async function handleApprove() {
    if (!approveTarget || !teacherId) return
    const name = approveTarget.name
    const id = approveTarget.id
    
    setRemovingId(id)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("face_registrations")
        .update({
          status: "approved",
          reviewed_by: teacherId,
          reviewed_at: new Date().toISOString()
        })
        .eq("id", id)

      if (error) throw error

      await supabase.from("system_logs").insert({
        performed_by: teacherId,
        action_type: "update",
        description: `Face approved for ${name}`,
      })

      setPending((prev) => prev.filter((s) => s.id !== id))
      fetchData(teacherId) // Refresh to update history
      toast.success(`Face approved for ${name}`)
      window.dispatchEvent(new Event("face-approval-updated"))
    } catch (err: any) {
      toast.error(err.message || "Failed to approve registration")
    } finally {
      setRemovingId(null)
      setApproveTarget(null)
    }
  }

  async function handleReject() {
    if (!rejectTarget || !teacherId) return
    const name = rejectTarget.name
    const id = rejectTarget.id
    const reason = rejectReason.trim()
    
    setRemovingId(id)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("face_registrations")
        .update({
          status: "rejected",
          rejection_reason: reason,
          reviewed_by: teacherId,
          reviewed_at: new Date().toISOString()
        })
        .eq("id", id)

      if (error) throw error

      await supabase.from("system_logs").insert({
        performed_by: teacherId,
        action_type: "update",
        description: `Face rejected for ${name}`,
      })

      setPending((prev) => prev.filter((s) => s.id !== id))
      fetchData(teacherId) // Refresh to update history
      toast.warning(`Face rejected for ${name}`)
      window.dispatchEvent(new Event("face-approval-updated"))
    } catch (err: any) {
      toast.error(err.message || "Failed to reject registration")
    } finally {
      setRemovingId(null)
      setRejectTarget(null)
      setRejectReason("")
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground -mt-1">
        Review and approve student face registrations.
      </p>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            Pending
            {pending.length > 0 && (
              <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 px-1.5 py-0 text-xs">
                {pending.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Pending tab */}
        <TabsContent value="pending" className="mt-4">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center rounded-lg border border-border bg-card">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : pending.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card py-16 px-4">
              <div className="flex size-16 items-center justify-center rounded-full bg-emerald-50">
                <CheckCircle2 className="size-8 text-emerald-600" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">All caught up!</h3>
              <p className="mt-1 text-sm text-muted-foreground">No pending approvals.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {pending.map((student) => (
                <div
                  key={student.id}
                  className={`rounded-xl border border-border bg-card shadow-sm transition-all duration-300 ${
                    removingId === student.id ? "opacity-0 scale-95" : "opacity-100 scale-100"
                  }`}
                >
                  <div className="flex flex-col items-center p-6">
                    {/* Student info */}
                    <Avatar className="size-16">
                      <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                        {getInitials(student.name)}
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="mt-3 text-base font-semibold text-foreground">{student.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {student.roll} &middot; {student.class}
                    </p>

                    {/* Face photo placeholder */}
                    <div className="mt-4 flex w-full flex-col items-center justify-center rounded-lg bg-muted/50 border border-border py-10">
                      <ScanFace className="size-10 text-muted-foreground/50" />
                      <span className="mt-2 text-xs text-muted-foreground">Face Photo</span>
                    </div>

                    <p className="mt-3 text-xs text-muted-foreground">
                      Submitted {student.submittedAt}
                    </p>

                    {/* Action buttons */}
                    <div className="mt-4 flex w-full gap-3">
                      <Button
                        className="flex-1 gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                        onClick={() => setApproveTarget(student)}
                      >
                        <Check className="size-4" />
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => setRejectTarget(student)}
                      >
                        <X className="size-4" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* History tab */}
        <TabsContent value="history" className="mt-4">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center rounded-lg border border-border bg-card">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden rounded-lg border border-border bg-card md:block">
                <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Student Name</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Roll Number</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Decision</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {historyData.map((item) => (
                    <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{item.name}</td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{item.roll}</td>
                      <td className="px-4 py-3">
                        {item.decision === "Approved" ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">Approved</Badge>
                        ) : (
                          <Badge className="bg-red-50 text-red-700 border-red-200 hover:bg-red-50">Rejected</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{item.date}</td>
                      <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{item.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {historyData.map((item) => (
              <div key={item.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{item.roll}</p>
                  </div>
                  {item.decision === "Approved" ? (
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">Approved</Badge>
                  ) : (
                    <Badge className="bg-red-50 text-red-700 border-red-200 hover:bg-red-50">Rejected</Badge>
                  )}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{item.date}</span>
                  {item.reason !== "-" && (
                    <span className="text-xs text-muted-foreground max-w-[60%] truncate">{item.reason}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Approve confirmation dialog */}
      <Dialog open={!!approveTarget} onOpenChange={(open) => !open && setApproveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Face Registration</DialogTitle>
            <DialogDescription>
              Approve face registration for <strong className="text-foreground">{approveTarget?.name}</strong>? Student will be able to mark attendance after approval.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={handleApprove}
            >
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog with reason */}
      <Dialog open={!!rejectTarget} onOpenChange={(open) => { if (!open) { setRejectTarget(null); setRejectReason("") } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Face Registration</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejection. Student will need to re-register their face.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="reject-reason">Reason for rejection</Label>
            <Textarea
              id="reject-reason"
              placeholder="e.g. Face not clearly visible, photo is blurry..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectTarget(null); setRejectReason("") }}>
              Cancel
            </Button>
            <Button
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleReject}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
