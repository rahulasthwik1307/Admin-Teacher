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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

/* ── Nav structure with groups ─────────────────────────── */
const navGroups = [
  {
    label: null,
    items: [
      { label: "Dashboard", href: "/teacher/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Manage",
    items: [
      { label: "Students", href: "/teacher/students", icon: Users },
      { label: "Face Approval", href: "/teacher/face-approval", icon: ScanFace },
    ],
  },
  {
    label: "Attendance",
    items: [
      { label: "QR Attendance", href: "/teacher/qr-attendance", icon: QrCode },
      { label: "Attendance History", href: "/teacher/attendance-history", icon: CalendarDays },
      { label: "Analytics", href: "/teacher/analytics", icon: BarChart3 },
    ],
  },
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
    const handleUpdate = () => fetchPendingCount()
    window.addEventListener("face-approval-updated", handleUpdate)
    return () => window.removeEventListener("face-approval-updated", handleUpdate)
  }, [fetchPendingCount])

  return (
    <aside className="flex h-full flex-col bg-card border-r border-border overflow-hidden">

      {/* ── Logo ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-5">
        <FALogo size="sm" />
        <div className="flex flex-col">
          <span className="text-sm font-bold text-foreground leading-tight tracking-tight">
            Factor Attendance
          </span>
          <span className="text-xs text-muted-foreground">NNRG College</span>
        </div>
      </div>

      {/* ── Teacher profile card ──────────────────────────── */}
      <div className="px-4 pb-4">
        <div className="relative flex items-center gap-3 rounded-xl border border-border bg-gradient-to-br from-muted/60 to-muted/20 px-3 py-3 shadow-sm">
          {/* Avatar with online dot */}
          <div className="relative shrink-0">
            <Avatar className="size-9 ring-2 ring-primary/20 ring-offset-1">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                {teacherInitials}
              </AvatarFallback>
            </Avatar>
            {/* Online indicator */}
            <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-foreground leading-tight truncate">
              {teacherName}
            </span>
            <span className="text-xs text-muted-foreground">Teacher</span>
          </div>
        </div>
      </div>

      {/* ── Divider ───────────────────────────────────────── */}
      <div className="mx-4 h-px bg-border" />

      {/* ── Nav ──────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Teacher navigation">
        <ul className="flex flex-col gap-5">
          {navGroups.map((group, gi) => (
            <li key={gi}>
              {/* Group label */}
              {group.label && (
                <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 select-none">
                  {group.label}
                </p>
              )}

              <ul className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  // inject badge for face approval
                  const badge = item.label === "Face Approval" && pendingCount > 0 ? pendingCount : null
                  const isActive = pathname === item.href

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                          isActive
                            ? "text-primary bg-primary/8"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        )}
                      >
                        {/* Left accent bar */}
                        <span
                          className={cn(
                            "absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full transition-all duration-200",
                            isActive
                              ? "h-6 bg-primary opacity-100"
                              : "h-0 bg-primary opacity-0 group-hover:h-4 group-hover:opacity-40"
                          )}
                        />

                        {/* Icon container */}
                        <span
                          className={cn(
                            "flex size-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
                            isActive
                              ? "bg-primary/15 text-primary shadow-sm"
                              : "bg-muted/80 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                          )}
                        >
                          <item.icon className="size-4" />
                        </span>

                        {/* Label */}
                        <span
                          className={cn(
                            "flex-1 transition-all duration-200",
                            isActive ? "font-semibold text-primary" : "font-medium"
                          )}
                        >
                          {item.label}
                        </span>

                        {/* Badge */}
                        {badge && (
                          <span
                            className={cn(
                              "flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold min-w-5 tabular-nums",
                              isActive
                                ? "bg-primary/20 text-primary"
                                : "bg-destructive text-white shadow-sm"
                            )}
                          >
                            {badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </li>
          ))}
        </ul>
      </nav>

      {/* ── Divider ───────────────────────────────────────── */}
      <div className="mx-4 h-px bg-border" />

      {/* ── Sign out ──────────────────────────────────────── */}
      <div className="px-3 py-4">
        <Link
          href="/login"
          className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400"
        >
          {/* Icon container */}
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/80 transition-all duration-200 group-hover:bg-rose-100 group-hover:text-rose-600 dark:group-hover:bg-rose-900/40">
            <LogOut className="size-4" />
          </span>
          <span className="transition-all duration-200">Sign Out</span>
        </Link>
      </div>
    </aside>
  )
}