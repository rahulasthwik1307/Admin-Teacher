"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Pencil } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
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
  // Treat all pending as absent for display in this final summary
  const [students, setStudents] = useState<Student[]>(() => {
    return initialStudents.map(s => s.status === "pending" ? { ...s, status: "absent" } : s)
  })

  const presentCount = students.filter(s => s.status === "present").length
  const absentCount = students.filter(s => s.status === "absent").length
  const failedCount = students.filter(s => s.status === "failed").length

  async function handleOverride(studentId: string, newStatus: "present" | "absent") {
    try {
      const studentName = students.find(s => s.id === studentId)?.name || "Student"
      
      // Optimistic upate
      setStudents(prev => 
        prev.map(s => s.id === studentId ? { ...s, status: newStatus } : s)
      )

      const supabase = createClient()
      const { error } = await supabase
        .from('period_attendance')
        .update({
          status: newStatus,
          override_by_teacher: true,
          override_reason: 'Manual override by teacher',
          overridden_by: teacherId,
          overridden_at: new Date().toISOString()
        })
        .eq('session_id', sessionId)
        .eq('student_id', studentId)

      if (error) throw error

      toast.success(`Status updated for ${studentName}`)
    } catch (err) {
      console.error(err)
      toast.error("Failed to update status")
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Session Details Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold text-foreground">{subjectLabel}</h2>
            <p className="text-sm text-muted-foreground">{classLabel} &middot; {periodLabel} &middot; {dateLabel}</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <div className="flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1.5 text-emerald-800">
              <span className="font-semibold">{presentCount}</span> Present
            </div>
            <div className="flex items-center gap-2 rounded-full bg-red-100 px-4 py-1.5 text-red-800">
              <span className="font-semibold">{absentCount}</span> Absent
            </div>
            <div className="flex items-center gap-2 rounded-full bg-orange-100 px-4 py-1.5 text-orange-800">
              <span className="font-semibold">{failedCount}</span> Failed
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Student List */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-4 text-lg font-semibold text-foreground">Student List</h3>
          <div className="flex flex-col gap-3">
            {students.map(s => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                    {s.initials}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{s.name}</span>
                    <span className="text-xs text-muted-foreground">Roll: {s.roll}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Badge 
                    variant="outline"
                    className={
                      s.status === "present"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800"
                        : s.status === "failed"
                        ? "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 hover:text-orange-800"
                        : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800"
                    }
                  >
                    {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                  </Badge>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8">
                        <Pencil className="size-4 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOverride(s.id, "present")}>
                        Mark Present
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOverride(s.id, "absent")}>
                        Mark Absent
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
            {students.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-8">
                No students found in this class.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Button onClick={onDone} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
        Done
      </Button>
    </div>
  )
}
