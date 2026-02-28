"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  CheckCircle2,
  XCircle,
  ScanFace,
  Check,
  X,
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

interface PendingStudent {
  id: string
  name: string
  roll: string
  class: string
  submittedAt: string
}

interface HistoryItem {
  id: string
  name: string
  roll: string
  decision: "Approved" | "Rejected"
  date: string
  reason: string
}

const initialPending: PendingStudent[] = [
  { id: "1", name: "Arjun Singh", roll: "21CSE049", class: "CSE-B", submittedAt: "2 hours ago" },
  { id: "2", name: "Meena Joshi", roll: "21CSE050", class: "CSE-B", submittedAt: "5 hours ago" },
  { id: "3", name: "Suresh Kumar", roll: "21CSE054", class: "CSE-B", submittedAt: "Yesterday" },
]

const historyData: HistoryItem[] = [
  { id: "h1", name: "Rahul Sharma", roll: "21CSE047", decision: "Approved", date: "Feb 24, 2026", reason: "-" },
  { id: "h2", name: "Priya Patel", roll: "21CSE048", decision: "Approved", date: "Feb 23, 2026", reason: "-" },
  { id: "h3", name: "Kiran Rao", roll: "21CSE051", decision: "Approved", date: "Feb 22, 2026", reason: "-" },
  { id: "h4", name: "Farhan Ali", roll: "21CSE052", decision: "Rejected", date: "Feb 21, 2026", reason: "Face not clearly visible, eyes closed in photo" },
  { id: "h5", name: "Divya Sharma", roll: "21CSE053", decision: "Approved", date: "Feb 20, 2026", reason: "-" },
]

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase()
}

export default function FaceApprovalPage() {
  const [pending, setPending] = useState<PendingStudent[]>(initialPending)
  const [removingId, setRemovingId] = useState<string | null>(null)

  // Approve dialog state
  const [approveTarget, setApproveTarget] = useState<PendingStudent | null>(null)

  // Reject dialog state
  const [rejectTarget, setRejectTarget] = useState<PendingStudent | null>(null)
  const [rejectReason, setRejectReason] = useState("")

  function handleApprove() {
    if (!approveTarget) return
    const name = approveTarget.name
    const id = approveTarget.id
    setApproveTarget(null)
    setRemovingId(id)
    setTimeout(() => {
      setPending((prev) => prev.filter((s) => s.id !== id))
      setRemovingId(null)
      toast.success(`Face approved for ${name}`)
    }, 300)
  }

  function handleReject() {
    if (!rejectTarget) return
    const name = rejectTarget.name
    const id = rejectTarget.id
    setRejectTarget(null)
    setRejectReason("")
    setRemovingId(id)
    setTimeout(() => {
      setPending((prev) => prev.filter((s) => s.id !== id))
      setRemovingId(null)
      toast.warning(`Face rejected for ${name}`)
    }, 300)
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
          {pending.length === 0 ? (
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
