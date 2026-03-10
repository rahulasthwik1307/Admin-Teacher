"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  CheckCircle2,
  XCircle,
  ScanFace,
  Loader2,
  RefreshCw,
  Clock,
  Check,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"

interface PendingStudent {
  id: string
  name: string
  roll: string
  registration_photo: string | null
  created_at: string
  class?: string
  year?: string
}

export default function FaceApprovalPage() {
  const [pending, setPending] = useState<PendingStudent[]>([])
  const [approved, setApproved] = useState<PendingStudent[]>([])
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending')
  const [loading, setLoading] = useState(true)
  const [approveTarget, setApproveTarget] = useState<{ studentId: string; name: string } | null>(null)
  const [rejectTarget, setRejectTarget] = useState<{ studentId: string; name: string } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        toast.error("Not authenticated")
        setLoading(false)
        return
      }

      const response = await fetch(`/api/teacher/face-approvals?teacher_id=${user.id}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch data")
      }

      setPending(data.pending || [])
      setApproved(data.approved || [])
    } catch (error: any) {
      console.error("Error fetching face approvals:", error)
      toast.error("Failed to load pending approvals")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleApprove = async () => {
    if (!approveTarget) return
    setActionLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("students")
        .update({ is_approved: true })
        .eq("id", approveTarget.studentId)

      if (error) throw error

      toast.success(`Approved face registration for ${approveTarget.name}`)
      const approvedStudent = pending.find(s => s.id === approveTarget.studentId)
      if (approvedStudent) {
        setApproved(prev => [approvedStudent, ...prev])
      }
      setPending((prev) => prev.filter((s) => s.id !== approveTarget.studentId))
    } catch (error: any) {
      console.error("Error approving:", error)
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
      const supabase = createClient()
      const { error } = await supabase
        .from("students")
        .update({
          is_approved: false,
          embedding_a: null,
          embedding_b: null,
          registration_photo: null,
        })
        .eq("id", rejectTarget.studentId)

      if (error) throw error

      toast.success(`Rejected face registration for ${rejectTarget.name}`)
      setPending((prev) => prev.filter((s) => s.id !== rejectTarget.studentId))
    } catch (error: any) {
      console.error("Error rejecting:", error)
      toast.error("Failed to reject registration")
    } finally {
      setActionLoading(false)
      setRejectTarget(null)
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Face Registration Approval</h1>
          <p className="text-muted-foreground mt-1">
            Review and approve student face registrations
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`size-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="flex gap-2 border-b border-border mb-6">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'pending'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Pending {pending.length > 0 && `(${pending.length})`}
        </button>
        <button
          onClick={() => setActiveTab('approved')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'approved'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Approved {approved.length > 0 && `(${approved.length})`}
        </button>
      </div>

      {activeTab === 'pending' && (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xl font-semibold">Pending Approvals</h2>
          {pending.length > 0 && (
            <Badge variant="secondary">{pending.length}</Badge>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="size-8 animate-spin mb-4" />
            <p>Loading pending approvals...</p>
          </div>
        ) : pending.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <CheckCircle2 className="size-12 mb-4 text-green-500/50" />
              <p className="text-lg font-medium">All caught up!</p>
              <p className="text-sm">No pending face registrations to review.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            {pending.map((student) => (
              <div key={student.id} className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                {/* Photo */}
                {student.registration_photo ? (
                  <img
                    src={student.registration_photo}
                    alt={student.name}
                    className="w-20 h-20 rounded-full object-cover border-2 border-border flex-shrink-0 cursor-pointer"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border-2 border-border flex-shrink-0">
                    <ScanFace className="size-8 text-muted-foreground/50" />
                  </div>
                )}
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{student.name}</p>
                  <p className="text-xs text-muted-foreground">{student.roll}</p>
                  <p className="text-xs text-muted-foreground">
                    {student.class || "N/A"}{student.year ? ` · ${student.year}` : ""}
                  </p>
                </div>
                {/* Actions */}
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    className="bg-emerald-600 text-white hover:bg-emerald-700 h-8 px-3"
                    onClick={() =>
                      setApproveTarget({ studentId: student.id, name: student.name })
                    }
                  >
                    <Check className="size-3.5 mr-1" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-50 h-8 px-3"
                    onClick={() =>
                      setRejectTarget({ studentId: student.id, name: student.name })
                    }
                  >
                    <X className="size-3.5 mr-1" /> Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      {activeTab === 'approved' && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-semibold">Approved Students</h2>
            {approved.length > 0 && <Badge variant="secondary">{approved.length}</Badge>}
          </div>
          {approved.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <CheckCircle2 className="size-12 mb-4 text-muted-foreground/30" />
                <p className="text-lg font-medium">No approved registrations yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              {approved.map((student) => (
                <div key={student.id} className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-0">
                  {student.registration_photo ? (
                    <img src={student.registration_photo} alt={student.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-border flex-shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center border-2 border-border flex-shrink-0">
                      <ScanFace className="size-6 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{student.name}</p>
                    <p className="text-xs text-muted-foreground">{student.roll}</p>
                    <p className="text-xs text-muted-foreground">{student.class} · Year {student.year}</p>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700 border-0">Approved</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Approve Confirmation Dialog */}
      <AlertDialog open={!!approveTarget} onOpenChange={() => setApproveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Face Registration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve the face registration for{" "}
              <strong>{approveTarget?.name}</strong>? This will allow the student to be marked
              present via face recognition.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} disabled={actionLoading}>
              {actionLoading ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                "Approve"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Confirmation Dialog */}
      <AlertDialog open={!!rejectTarget} onOpenChange={() => setRejectTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Face Registration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject this registration? Student will need to re-register.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                "Reject"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
