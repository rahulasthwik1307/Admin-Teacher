"use client"

import { useEffect, useState } from "react"
import { Users, UserCheck, ScanFace, Radio } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

interface Stat {
  label: string
  value: number | string
  icon: React.ElementType
  iconColor: string
  iconBg: string
}

export function DashboardStats() {
  const supabase = createClient()
  const [stats, setStats] = useState<Stat[]>([
    { label: "Total Students", value: "—", icon: Users, iconColor: "text-primary", iconBg: "bg-primary/10" },
    { label: "Today Present", value: "—", icon: UserCheck, iconColor: "text-emerald-600", iconBg: "bg-emerald-50" },
    { label: "Pending Face Approvals", value: "—", icon: ScanFace, iconColor: "text-amber-600", iconBg: "bg-amber-50" },
    { label: "Active Attendance Windows", value: "—", icon: Radio, iconColor: "text-muted-foreground", iconBg: "bg-muted" },
  ])

  useEffect(() => {
    async function fetch() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const teacherId = session.user.id
      const today = new Date().toISOString().split("T")[0]

      // Get teacher's assigned class IDs
      const { data: assignments } = await supabase
        .from("teacher_assignments")
        .select("class_id, subject_id")
        .eq("teacher_id", teacherId)

      const classIds = [...new Set((assignments ?? []).map((a: any) => a.class_id))]

      // 1. Total students across all assigned classes
      let totalStudents = 0
      if (classIds.length > 0) {
        const { count } = await supabase
          .from("students")
          .select("id", { count: "exact", head: true })
          .in("class_id", classIds)
          .eq("is_active", true)
        totalStudents = count ?? 0
      }

      // 2. Today present — all present records in today's sessions for this teacher
      const { data: todaySessions } = await supabase
        .from("attendance_sessions")
        .select("id")
        .eq("teacher_id", teacherId)
        .eq("session_date", today)

      const todaySessionIds = (todaySessions ?? []).map((s: any) => s.id)
      let todayPresent = 0
      if (todaySessionIds.length > 0) {
        const { count } = await supabase
          .from("period_attendance")
          .select("id", { count: "exact", head: true })
          .in("session_id", todaySessionIds)
          .eq("status", "present")
        todayPresent = count ?? 0
      }

      // 3. Pending face approvals — students in teacher's assigned classes awaiting approval
      let pendingCount = 0
      if (classIds.length > 0) {
        const { count } = await supabase
          .from("students")
          .select("id", { count: "exact", head: true })
          .in("class_id", classIds)
          .eq("face_registered", true)
          .eq("is_approved", false)
          .eq("is_rejected", false)
        pendingCount = count ?? 0
      }

      // 4. Active attendance windows for this teacher
      const { count: activeCount } = await supabase
        .from("attendance_sessions")
        .select("id", { count: "exact", head: true })
        .eq("teacher_id", teacherId)
        .eq("status", "active")

      setStats([
        { label: "Total Students", value: totalStudents, icon: Users, iconColor: "text-primary", iconBg: "bg-primary/10" },
        { label: "Today Present", value: todayPresent, icon: UserCheck, iconColor: "text-emerald-600", iconBg: "bg-emerald-50" },
        { label: "Pending Face Approvals", value: pendingCount ?? 0, icon: ScanFace, iconColor: "text-amber-600", iconBg: "bg-amber-50" },
        { label: "Active Attendance Windows", value: activeCount ?? 0, icon: Radio, iconColor: activeCount ? "text-emerald-600" : "text-muted-foreground", iconBg: activeCount ? "bg-emerald-50" : "bg-muted" },
      ])
    }
    fetch()
  }, [])

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
      {stats.map((stat) => (
        <Card key={stat.label} className="py-4 gap-0">
          <CardContent className="flex items-start gap-4">
            <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", stat.iconBg)}>
              <stat.icon className={cn("size-5", stat.iconColor)} />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-foreground leading-tight">{stat.value}</span>
              <span className="text-xs text-muted-foreground leading-snug mt-0.5">{stat.label}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}