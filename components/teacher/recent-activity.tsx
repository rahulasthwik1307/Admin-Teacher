"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface ActivityItem {
  description: string
  time: string
  sortKey: number
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const then = new Date(dateStr)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function RecentActivity() {
  const supabase = createClient()
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const teacherId = session.user.id

      const items: ActivityItem[] = []

      // 1. Attendance finalized events
      const { data: finalizedSessions } = await supabase
        .from("attendance_sessions")
        .select(`
          id,
          finalized_at,
          subjects ( name ),
          classes ( name, section )
        `)
        .eq("teacher_id", teacherId)
        .eq("status", "finalized")
        .not("finalized_at", "is", null)
        .order("finalized_at", { ascending: false })
        .limit(5)

      for (const s of (finalizedSessions ?? [])) {
        const subject: any = Array.isArray(s.subjects) ? s.subjects[0] : s.subjects
        const cls: any = Array.isArray(s.classes) ? s.classes[0] : s.classes
        const subName = subject?.name ?? "Unknown"
        const clsName = cls ? `${cls.name} ${cls.section}` : ""
        items.push({
          description: `Attendance finalized for ${subName}${clsName ? ` — ${clsName}` : ""}`,
          time: timeAgo(s.finalized_at),
          sortKey: new Date(s.finalized_at).getTime(),
        })
      }

      // 2. Attendance window opened events
      const { data: openedSessions } = await supabase
        .from("attendance_sessions")
        .select(`
          id,
          opened_at,
          subjects ( name ),
          classes ( name, section )
        `)
        .eq("teacher_id", teacherId)
        .not("opened_at", "is", null)
        .order("opened_at", { ascending: false })
        .limit(5)

      for (const s of (openedSessions ?? [])) {
        const subject: any = Array.isArray(s.subjects) ? s.subjects[0] : s.subjects
        const cls: any = Array.isArray(s.classes) ? s.classes[0] : s.classes
        const subName = subject?.name ?? "Unknown"
        const clsName = cls ? `${cls.name} ${cls.section}` : ""
        items.push({
          description: `Attendance window opened for ${subName}${clsName ? ` — ${clsName}` : ""}`,
          time: timeAgo(s.opened_at),
          sortKey: new Date(s.opened_at).getTime(),
        })
      }

      // 3. Face approvals done by this teacher
      const { data: approvedStudents } = await supabase
        .from("students")
        .select(`
          id,
          updated_at,
          users ( full_name )
        `)
        .eq("created_by", teacherId)
        .eq("is_approved", true)
        .not("updated_at", "is", null)
        .order("updated_at", { ascending: false })
        .limit(5)

      for (const s of (approvedStudents ?? [])) {
        const user: any = Array.isArray(s.users) ? s.users[0] : s.users
        const name = user?.full_name ?? "Unknown"
        items.push({
          description: `Face approved for ${name}`,
          time: timeAgo(s.updated_at),
          sortKey: new Date(s.updated_at).getTime(),
        })
      }

      // 4. New students added by this teacher
      const { data: newStudents } = await supabase
        .from("students")
        .select(`
          id,
          created_at,
          users ( full_name )
        `)
        .eq("created_by", teacherId)
        .not("created_at", "is", null)
        .order("created_at", { ascending: false })
        .limit(5)

      for (const s of (newStudents ?? [])) {
        const user: any = Array.isArray(s.users) ? s.users[0] : s.users
        const name = user?.full_name ?? "Unknown"
        items.push({
          description: `New student added: ${name}`,
          time: timeAgo(s.created_at),
          sortKey: new Date(s.created_at).getTime(),
        })
      }

      // Sort all by most recent, take top 8
      items.sort((a, b) => b.sortKey - a.sortKey)
      setActivities(items.slice(0, 8))
      setLoading(false)
    }
    fetch()
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base text-muted-foreground font-semibold">
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No recent activity yet.
          </p>
        ) : (
          <div className="relative flex flex-col">
            {activities.map((activity, i) => (
              <div key={i} className="flex gap-4">
                {/* Timeline rail */}
                <div className="flex flex-col items-center">
                  <div className="mt-1.5 size-2.5 shrink-0 rounded-full bg-primary" />
                  {i < activities.length - 1 && (
                    <div className="w-px flex-1 min-h-[24px] bg-border" />
                  )}
                </div>
                {/* Content — generous padding so items breathe */}
                <div className="pb-6 last:pb-0">
                  <p className="text-sm font-medium text-foreground leading-snug">
                    {activity.description}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}