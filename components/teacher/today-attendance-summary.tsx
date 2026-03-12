"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

interface SubjectSummary {
  id: string
  name: string
  present: number
  total: number
}

function getBarColor(pct: number) {
  if (pct >= 75) return "bg-emerald-500"
  if (pct >= 60) return "bg-amber-500"
  return "bg-destructive"
}
function getTextColor(pct: number) {
  if (pct >= 75) return "text-emerald-600"
  if (pct >= 60) return "text-amber-600"
  return "text-destructive"
}

export function TodayAttendanceSummary() {
  const supabase = createClient()
  const [subjects, setSubjects] = useState<SubjectSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const teacherId = session.user.id
      const today = new Date().toISOString().split("T")[0]

      // Today's sessions for this teacher (any status — show even active ones)
      const { data: todaySessions } = await supabase
        .from("attendance_sessions")
        .select(`
          id,
          subject_id,
          class_id,
          opened_at,
          subjects ( name ),
          classes ( name, section )
        `)
        .eq("teacher_id", teacherId)
        .eq("session_date", today)
        .order("opened_at", { ascending: false })

      if (!todaySessions || todaySessions.length === 0) {
        setSubjects([])
        setLoading(false)
        return
      }

      const sessionIds = todaySessions.map((s: any) => s.id)

      // Get attendance for these sessions
      const { data: attendance } = await supabase
        .from("period_attendance")
        .select("session_id, status")
        .in("session_id", sessionIds)
        .in("status", ["present", "absent"])

      const rows = attendance ?? []

      // Build per-session summary, then keep only latest per subject+class
      const allSummaries: (SubjectSummary & { dedupeKey: string; openedAt: string })[] =
        todaySessions.map((s: any) => {
          const sessionRows = rows.filter((r: any) => r.session_id === s.id)
          const present = sessionRows.filter((r: any) => r.status === "present").length
          const total = sessionRows.length
          const subName = s.subjects?.name ?? "Unknown"
          const clsLabel = s.classes ? `${s.classes.name} ${s.classes.section}` : ""
          return {
            id: s.id,
            name: clsLabel ? `${subName} — ${clsLabel}` : subName,
            dedupeKey: `${s.subject_id}__${s.class_id}`,
            present,
            total,
            openedAt: s.opened_at ?? s.id,
          }
        })

      // Keep only the latest session per subject+class combination
      const latestMap = new Map<string, typeof allSummaries[0]>()
      for (const s of allSummaries) {
        const existing = latestMap.get(s.dedupeKey)
        if (!existing || s.openedAt > existing.openedAt) {
          latestMap.set(s.dedupeKey, s)
        }
      }
      const summaries: SubjectSummary[] = Array.from(latestMap.values()).map(
        ({ id, name, present, total }) => ({ id, name, present, total })
      )

      setSubjects(summaries)
      setLoading(false)
    }
    fetch()
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base text-muted-foreground font-semibold">
          {"Today's Attendance Summary"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : subjects.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No attendance sessions today.
          </p>
        ) : (
          <div className="flex flex-col gap-5">
            {subjects.map((subject) => {
              const pct = subject.total > 0
                ? Math.round((subject.present / subject.total) * 100)
                : 0
              return (
                <div key={subject.id} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{subject.name}</span>
                    <span className={cn("text-xs font-semibold", getTextColor(pct))}>
                      {subject.present}/{subject.total} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full transition-all", getBarColor(pct))}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}