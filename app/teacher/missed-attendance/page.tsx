"use client"

import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, AlertTriangle, ChevronRight, X, Check, Users } from "lucide-react"
import { MissedAttendanceSkeleton, StudentSheetSkeleton } from "@/components/ui/skeletons"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet"

interface MissedSlot {
  date: string; dateLabel: string; subjectId: string; subjectName: string
  subjectCode: string; classId: string; className: string; periodId: string
  periodNumber: number; startTime: string; endTime: string
}

interface Student {
  id: string; name: string; rollNumber: string; status: "present" | "absent"
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00")
  const today = new Date(); today.setHours(0,0,0,0)
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  const d = new Date(date); d.setHours(0,0,0,0)
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
  const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]
  if (d.getTime() === today.getTime()) return `Today — ${months[date.getMonth()]} ${date.getDate()}`
  if (d.getTime() === yesterday.getTime()) return `Yesterday — ${months[date.getMonth()]} ${date.getDate()}`
  return `${days[date.getDay()]} — ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
}

export default function MissedAttendancePage() {
  const [missedSlots, setMissedSlots] = useState<MissedSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [filterSubject, setFilterSubject] = useState("all")
  const [filterClass, setFilterClass] = useState("all")
  const [filterDays, setFilterDays] = useState("30")
  const [sheetOpen, setSheetOpen] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<MissedSlot | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchMissedSlots = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const daysBack = parseInt(filterDays)
      const startDate = new Date(); startDate.setDate(startDate.getDate() - daysBack)
      const startDateStr = startDate.toISOString().split("T")[0]
      const todayStr = new Date().toISOString().split("T")[0]

      const { data: timetable } = await supabase
        .from("timetables")
        .select(`day_of_week, subject_id, class_id, period_id,
          subject:subjects ( id, name, code ),
          class:classes ( id, name, section ),
          period:periods ( id, period_number, start_time, end_time )`)
        .eq("teacher_id", user.id)

      if (!timetable || timetable.length === 0) { setMissedSlots([]); setLoading(false); return }

      const { data: existingSessions } = await supabase
        .from("attendance_sessions")
        .select("subject_id, class_id, period_id, session_date")
        .eq("teacher_id", user.id)
        .gte("session_date", startDateStr)
        .lte("session_date", todayStr)

      const existingKeys = new Set(
        (existingSessions || []).map((s: any) => `${s.session_date}__${s.subject_id}__${s.class_id}__${s.period_id}`)
      )

      const missed: MissedSlot[] = []
      const cursor = new Date(startDate)
      const today = new Date(); today.setHours(23,59,59,999)

      while (cursor <= today) {
        const dayOfWeek = cursor.getDay() === 0 ? 7 : cursor.getDay()
        if (dayOfWeek !== 7) {
          const dateStr = cursor.toISOString().split("T")[0]
          const isToday = dateStr === todayStr
          const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes()
          for (const slot of timetable) {
            if ((slot as any).day_of_week !== dayOfWeek) continue
            const key = `${dateStr}__${slot.subject_id}__${slot.class_id}__${slot.period_id}`
            if (existingKeys.has(key)) continue
            if (isToday) {
              const endStr = ((slot as any).period?.end_time as string) ?? "00:00"
              const [endH, endM] = endStr.split(":").map(Number)
              if (nowMinutes < endH * 60 + endM) continue
            }
            missed.push({
              date: dateStr, dateLabel: formatDateLabel(dateStr),
              subjectId: slot.subject_id, subjectName: (slot as any).subject?.name ?? "Unknown",
              subjectCode: (slot as any).subject?.code ?? "", classId: slot.class_id,
              className: `${(slot as any).class?.name ?? ""}-${(slot as any).class?.section ?? ""}`,
              periodId: slot.period_id, periodNumber: (slot as any).period?.period_number ?? 0,
              startTime: ((slot as any).period?.start_time ?? "").substring(0, 5),
              endTime: ((slot as any).period?.end_time ?? "").substring(0, 5),
            })
          }
        }
        cursor.setDate(cursor.getDate() + 1)
      }
      missed.sort((a, b) => { const d = b.date.localeCompare(a.date); return d !== 0 ? d : a.periodNumber - b.periodNumber })
      setMissedSlots(missed)
    } catch (e) { console.error("fetchMissedSlots error:", e) }
    finally { setLoading(false) }
  }, [filterDays])

  useEffect(() => { fetchMissedSlots() }, [fetchMissedSlots])

  const filteredSlots = missedSlots.filter((s) => {
    if (filterSubject !== "all" && s.subjectId !== filterSubject) return false
    if (filterClass !== "all" && s.classId !== filterClass) return false
    return true
  })
  const uniqueSubjects = Array.from(new Map(missedSlots.map((s) => [s.subjectId, { id: s.subjectId, name: s.subjectName }])).values())
  const uniqueClasses = Array.from(new Map(missedSlots.map((s) => [s.classId, { id: s.classId, name: s.className }])).values())
  const grouped = filteredSlots.reduce<Record<string, MissedSlot[]>>((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = []; acc[slot.date].push(slot); return acc
  }, {})

  const openSheet = async (slot: MissedSlot) => {
    setSelectedSlot(slot); setSheetOpen(true); setStudentsLoading(true)
    try {
      const supabase = createClient()
      const { data } = await supabase.from("students")
        .select("id, roll_number, user:users ( full_name )")
        .eq("class_id", slot.classId).eq("is_approved", true).order("roll_number")
      setStudents((data || []).map((s: any) => ({
        id: s.id, name: s.user?.full_name ?? "Unknown", rollNumber: s.roll_number ?? "", status: "present" as const,
      })))
    } catch (e) { console.error("fetchStudents error:", e) }
    finally { setStudentsLoading(false) }
  }

  const toggleStudent = (studentId: string) => {
    setStudents((prev) => prev.map((s) => s.id === studentId ? { ...s, status: s.status === "present" ? "absent" : "present" } : s))
  }
  const markAll = (status: "present" | "absent") => { setStudents((prev) => prev.map((s) => ({ ...s, status }))) }

  const saveAttendance = async () => {
    if (!selectedSlot) return
    setSaving(true)
    try {
      const response = await fetch("/api/teacher/save-missed-attendance", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          class_id: selectedSlot.classId, subject_id: selectedSlot.subjectId,
          period_id: selectedSlot.periodId, session_date: selectedSlot.date,
          attendance: students.map((s) => ({ student_id: s.id, status: s.status })),
        }),
      })
      const result = await response.json()
      if (!response.ok) {
        toast.error(result.error || "Failed to save attendance", { style: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" } })
        return
      }
      toast.success("Attendance saved successfully")
      setSheetOpen(false); setSelectedSlot(null); fetchMissedSlots()
    } catch (e) {
      toast.error("An unexpected error occurred", { style: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" } })
    } finally { setSaving(false) }
  }

  const presentCount = students.filter((s) => s.status === "present").length
  const absentCount = students.filter((s) => s.status === "absent").length

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Fill attendance for periods where no session was created.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterDays} onValueChange={setFilterDays}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Time range" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 3 months</SelectItem>
            <SelectItem value="180">Last 6 months</SelectItem>
            <SelectItem value="365">Last 1 year</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterSubject} onValueChange={setFilterSubject}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Subjects" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {uniqueSubjects.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={filterClass} onValueChange={setFilterClass}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All Classes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {uniqueClasses.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {loading ? (
        <MissedAttendanceSkeleton />
      ) : filteredSlots.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10"><Check className="size-6 text-emerald-600" /></div>
              <p className="text-sm font-medium text-foreground">All caught up!</p>
              <p className="text-xs text-muted-foreground">No missed attendance sessions found.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a)).map(([date, slots]) => (
            <div key={date} className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-3.5 text-amber-500" />
                  <span className="text-xs font-semibold text-muted-foreground">{slots[0].dateLabel}</span>
                  <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-200 text-[10px]">{slots.length} missed</Badge>
                </div>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="flex flex-col gap-2">
                {slots.map((slot, i) => (
                  <Card key={i} className="cursor-pointer hover:border-amber-300 transition-colors" onClick={() => openSheet(slot)}>
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 font-bold text-sm">P{slot.periodNumber}</div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-sm font-semibold text-foreground truncate">{slot.subjectName}</span>
                        <span className="text-xs text-muted-foreground">{slot.className} · {slot.startTime} – {slot.endTime}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-200">Not taken</Badge>
                        <ChevronRight className="size-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Manual Attendance Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md flex flex-col">
          <SheetHeader>
            <SheetTitle>Fill Attendance</SheetTitle>
            <SheetDescription>
              {selectedSlot && (<span>{selectedSlot.subjectName} · {selectedSlot.className} · Period {selectedSlot.periodNumber} · {selectedSlot.dateLabel}</span>)}
            </SheetDescription>
          </SheetHeader>
          {studentsLoading ? (
            <StudentSheetSkeleton />
          ) : students.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="flex flex-col items-center gap-2 text-center">
                <Users className="size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No approved students found.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col flex-1 gap-4 overflow-hidden">
              <div className="flex items-center justify-between pt-2">
                <div className="flex gap-3 text-sm">
                  <span className="text-emerald-600 font-semibold">{presentCount} present</span>
                  <span className="text-red-600 font-semibold">{absentCount} absent</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => markAll("present")}>All Present</Button>
                  <Button variant="outline" size="sm" onClick={() => markAll("absent")}>All Absent</Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
                {students.map((student) => (
                  <div key={student.id}
                    className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${student.status === "present" ? "border-emerald-200 bg-emerald-500/5" : "border-red-200 bg-red-500/5"}`}
                    onClick={() => toggleStudent(student.id)}>
                    <div className={`flex size-8 shrink-0 items-center justify-center rounded-full text-white text-xs font-bold ${student.status === "present" ? "bg-emerald-500" : "bg-red-500"}`}>
                      {student.status === "present" ? <Check className="size-4" /> : <X className="size-4" />}
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-sm font-medium text-foreground truncate">{student.name}</span>
                      <span className="text-xs text-muted-foreground">{student.rollNumber}</span>
                    </div>
                    <span className={`text-xs font-semibold ${student.status === "present" ? "text-emerald-600" : "text-red-600"}`}>
                      {student.status === "present" ? "Present" : "Absent"}
                    </span>
                  </div>
                ))}
              </div>
              <Button onClick={saveAttendance} disabled={saving} className="w-full">
                {saving ? (<><Loader2 className="size-4 animate-spin mr-2" />Saving...</>) : "Save Attendance"}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
