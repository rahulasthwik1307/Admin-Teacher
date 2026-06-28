import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

function timeAgo(dateStr: string): string {
  const now = new Date()
  const then = new Date(dateStr)
  const diffMs = now.getTime() - then.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)
  if (diffMin < 1) return "Just now"
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay === 1) return "Yesterday"
  return `${diffDay}d ago`
}

function getInitials(name: string): string {
  return (
    name.split(" ").filter((w) => w[0] && w[0] === w[0].toUpperCase()).map((w) => w[0]).join("").slice(0, 2) || "NA"
  )
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const now = new Date()
    const day = now.getDay()
    const diffToMon = day === 0 ? -6 : 1 - day
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() + diffToMon)
    weekStart.setHours(0, 0, 0, 0)
    const weekStartStr = weekStart.toISOString().split("T")[0]

    const [
      { count: teacherCount },
      { count: studentCount },
      { count: deptCount },
      { count: activeSessionCount },
      { data: teachers },
      { data: weekSessions },
      { data: logs },
      { count: pendingFaceCount },
    ] = await Promise.all([
      supabase.from("teachers").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("students").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("departments").select("id", { count: "exact", head: true }),
      supabase.from("attendance_sessions").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("teachers").select(`id, title, user:users ( full_name )`),
      supabase
        .from("attendance_sessions")
        .select("id, teacher_id, subject_id, session_date, finalized_at, subject:subjects ( name )")
        .eq("status", "finalized")
        .gte("session_date", weekStartStr)
        .order("finalized_at", { ascending: false }),
      supabase
        .from("system_logs")
        .select("id, created_at, description, performed_by, action_type")
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("is_approved", false)
        .eq("is_rejected", false)
        .not("embedding_a", "is", null),
    ])

    // Teacher activity
    const teacherMap: Record<string, any> = {}
    for (const t of teachers || []) {
      const fullName = (t as any).user?.full_name ?? "Unknown"
      const title = (t as any).title ?? ""
      teacherMap[t.id] = {
        id: t.id,
        name: `${title}. ${fullName}`,
        initials: getInitials(fullName),
        subject: "—",
        sessions: 0,
        lastActive: "No sessions this week",
      }
    }

    for (const s of weekSessions || []) {
      const tid = (s as any).teacher_id
      if (!teacherMap[tid]) continue
      teacherMap[tid].sessions++
      const subjectName = (s as any).subject?.name ?? "—"
      if (teacherMap[tid].subject === "—") teacherMap[tid].subject = subjectName
      if (teacherMap[tid].lastActive === "No sessions this week") {
        const finalizedAt = (s as any).finalized_at
        if (finalizedAt) {
          const d = new Date(finalizedAt)
          const todayDate = new Date()
          todayDate.setHours(0, 0, 0, 0)
          const sessionDate = new Date(d)
          sessionDate.setHours(0, 0, 0, 0)
          const isToday = sessionDate.getTime() === todayDate.getTime()
          const timeStr = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
          teacherMap[tid].lastActive = isToday
            ? `Today, ${timeStr}`
            : `${sessionDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${timeStr}`
        }
      }
    }

    const teacherActivity = Object.values(teacherMap)
      .sort((a: any, b: any) => b.sessions - a.sessions)
      .slice(0, 5)

    const systemStatus = [
      { label: "Departments Active", value: deptCount ?? 0, status: "ok" },
      { label: "Teachers Active", value: (teachers || []).length, status: "ok" },
      { label: "Students Enrolled", value: studentCount ?? 0, status: "info" },
      {
        label: (activeSessionCount ?? 0) > 0 ? "Active Sessions Now" : "No Active Sessions",
        value: activeSessionCount ?? 0,
        status: (activeSessionCount ?? 0) > 0 ? "warn" : "ok",
      },
    ]

    const recentActivity = (logs || []).map((l: any) => ({
      text: l.description ?? "System action",
      time: timeAgo(l.created_at),
      actionType: l.action_type ?? "create",
    }))

    return NextResponse.json({
      stats: {
        teachers: teacherCount ?? 0,
        students: studentCount ?? 0,
        departments: deptCount ?? 0,
        activeSessions: activeSessionCount ?? 0,
        pendingFaceApprovals: pendingFaceCount ?? 0,
      },
      teacherActivity,
      systemStatus,
      recentActivity,
      maxSessions: Math.max(...teacherActivity.map((t: any) => t.sessions), 1),
    })
  } catch (e) {
    console.error("Admin dashboard API error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
