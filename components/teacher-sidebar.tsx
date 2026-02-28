"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  ScanFace,
  QrCode,
  CalendarDays,
  BarChart3,
  LogOut,
} from "lucide-react"
import { FALogo } from "@/components/fa-logo"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

const baseNavItems = [
  { label: "Dashboard", href: "/teacher/dashboard", icon: LayoutDashboard },
  { label: "Students", href: "/teacher/students", icon: Users },
  { label: "Face Approval", href: "/teacher/face-approval", icon: ScanFace },
  { label: "QR Attendance", href: "/teacher/qr-attendance", icon: QrCode },
  { label: "Attendance History", href: "/teacher/attendance-history", icon: CalendarDays },
  { label: "Analytics", href: "/teacher/analytics", icon: BarChart3 },
]

interface TeacherSidebarProps {
  onClose?: () => void
}

export function TeacherSidebar({ onClose }: TeacherSidebarProps) {
  const pathname = usePathname()
  const [pendingCount, setPendingCount] = useState<number>(0)
  const [teacherName, setTeacherName] = useState("Teacher")
  const [teacherInitials, setTeacherInitials] = useState("T")

  const fetchPendingCount = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      // Get the teacher's profile
      const { data: profile } = await supabase
        .from("users")
        .select("full_name")
        .eq("id", user.id)
        .single()
        
      if (profile?.full_name) {
        setTeacherName(profile.full_name)
        setTeacherInitials(
          profile.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
        )
      }

      // Query face_registrations where status = pending and the student belongs to this teacher
      const { data: students } = await supabase
        .from("students")
        .select("id")
        .eq("created_by", user.id)

      if (students && students.length > 0) {
        const studentIds = students.map((s) => s.id)
        const { count } = await supabase
          .from("face_registrations")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending")
          .in("student_id", studentIds)

        setPendingCount(count || 0)
      } else {
        setPendingCount(0)
      }
    }
  }, [])

  useEffect(() => {
    fetchPendingCount()

    const handleUpdate = () => {
      fetchPendingCount()
    }
    window.addEventListener("face-approval-updated", handleUpdate)
    return () => window.removeEventListener("face-approval-updated", handleUpdate)
  }, [fetchPendingCount])

  const navItems = baseNavItems.map((item) => {
    if (item.label === "Face Approval" && pendingCount > 0) {
      return { ...item, badge: pendingCount }
    }
    return item
  })

  return (
    <aside className="flex h-full flex-col bg-card border-r border-border">
      {/* Logo section */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-4">
        <FALogo size="sm" />
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-foreground leading-tight">
            Factor Attendance
          </span>
          <span className="text-xs text-muted-foreground">NNRG College</span>
        </div>
      </div>

      {/* Teacher profile */}
      <div className="px-5 pb-4">
        <div className="flex items-center gap-3 rounded-lg bg-muted/60 px-3 py-2.5">
          <Avatar className="size-9">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {teacherInitials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground leading-tight">
              {teacherName}
            </span>
            <span className="text-xs text-muted-foreground">Teacher</span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4" aria-label="Teacher navigation">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className="size-5 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {('badge' in item && item.badge) ? (
                    <span
                      className={cn(
                        "flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold min-w-5",
                        isActive
                          ? "bg-white/20 text-primary-foreground"
                          : "bg-destructive text-white"
                      )}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <Separator />

      {/* Sign out */}
      <div className="px-3 py-4">
        <Link
          href="/login"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <LogOut className="size-5 shrink-0" />
          <span>Sign Out</span>
        </Link>
      </div>
    </aside>
  )
}
