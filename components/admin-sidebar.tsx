"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import {
  LayoutDashboard,
  Users,
  Building,
  Link2,
  BarChart3,
  MapPin,
  LogOut,
  CalendarDays,
  GraduationCap,
  ScanFace,
} from "lucide-react"
import { FALogo } from "@/components/fa-logo"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

interface AdminSidebarProps {
  onClose?: () => void
}

export function AdminSidebar({ onClose }: AdminSidebarProps) {
  const pathname = usePathname()
  const [pendingCount, setPendingCount] = useState<number>(0)
  const [adminName, setAdminName] = useState("Administrator")
  const [adminInitials, setAdminInitials] = useState("AD")

  const fetchPendingCount = useCallback(async () => {
    try {
      const supabase = createClient()

      // Load admin name
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from("users")
          .select("full_name")
          .eq("id", user.id)
          .single()
        if (profile?.full_name) {
          setAdminName(profile.full_name)
          setAdminInitials(
            profile.full_name
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)
          )
        }
      }

      // Count pending face approvals
      const { count } = await supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("is_approved", false)
        .eq("is_rejected", false)
        .not("embedding_a", "is", null)

      setPendingCount(count || 0)
    } catch {
      // fail silently
    }
  }, [])

  useEffect(() => {
    fetchPendingCount()
    // Refresh count when face approval page updates
    const handleUpdate = () => fetchPendingCount()
    window.addEventListener("face-approval-updated", handleUpdate)
    return () => window.removeEventListener("face-approval-updated", handleUpdate)
  }, [fetchPendingCount])

  // Also refresh when navigating back to dashboard
  useEffect(() => {
    if (pathname === "/admin/dashboard" || pathname === "/admin/face-approval") {
      fetchPendingCount()
    }
  }, [pathname, fetchPendingCount])

  const navGroups = [
    {
      label: "OVERVIEW",
      items: [
        { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, badge: null },
      ],
    },
    {
      label: "MANAGE",
      items: [
        { label: "Teachers", href: "/admin/teachers", icon: Users, badge: null },
        { label: "Students", href: "/admin/students", icon: GraduationCap, badge: null },
        { label: "Face Approval", href: "/admin/face-approval", icon: ScanFace, badge: pendingCount > 0 ? pendingCount : null },
        { label: "Academic Structure", href: "/admin/academic-structure", icon: Building, badge: null },
        { label: "Teacher Assignments", href: "/admin/assignments", icon: Link2, badge: null },
        { label: "Timetable", href: "/admin/timetable", icon: CalendarDays, badge: null },
      ],
    },
    {
      label: "REPORTS & SETTINGS",
      items: [
        { label: "Reports", href: "/admin/reports", icon: BarChart3, badge: null },
        { label: "Geofence Setup", href: "/admin/geofence", icon: MapPin, badge: null },
      ],
    },
  ]

  return (
    <aside className="flex h-full flex-col bg-card border-r border-border">
      {/* Logo section */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-4">
        <FALogo size="sm" />
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-foreground leading-tight">
            Factor Attendance
          </span>
          <span className="text-xs text-muted-foreground">Admin Panel</span>
        </div>
      </div>

      {/* Admin profile */}
      <div className="px-4 pb-4">
        <div className="relative flex items-center gap-3 rounded-xl border border-border bg-linear-to-br from-muted/60 to-muted/20 px-3 py-3 shadow-sm">
          <div className="relative shrink-0">
            <Avatar className="size-9 ring-2 ring-primary/20 ring-offset-1">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                {adminInitials}
              </AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground leading-tight">
              {adminName}
            </span>
            <span className="text-xs text-muted-foreground">Administrator</span>
          </div>
        </div>
      </div>

      <div className="mx-4 h-px bg-border" />

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Admin navigation">
        <ul className="flex flex-col gap-5">
          {navGroups.map((group) => (
            <li key={group.label}>
              <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 select-none">
                {group.label}
              </p>
              <ul className="flex flex-col gap-0.5">
                {group.items.map((item) => {
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
                        <span className={cn(
                          "absolute left-0 top-1/2 -translate-y-1/2 w-0.75 rounded-r-full transition-all duration-200",
                          isActive
                            ? "h-6 bg-primary opacity-100"
                            : "h-0 bg-primary opacity-0 group-hover:h-4 group-hover:opacity-40"
                        )} />
                        <span className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
                          isActive
                            ? "bg-primary/15 text-primary shadow-sm"
                            : "bg-muted/80 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                        )}>
                          <item.icon className="size-4" />
                        </span>
                        <span className={cn(
                          "flex-1 transition-all duration-200",
                          isActive ? "font-semibold text-primary" : "font-medium"
                        )}>
                          {item.label}
                        </span>
                        {item.badge && (
                          <span className={cn(
                            "flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold min-w-5 tabular-nums",
                            isActive
                              ? "bg-amber-100 text-amber-700"
                              : "bg-amber-500 text-white shadow-sm"
                          )}>
                            {item.badge}
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

      <div className="mx-4 h-px bg-border" />

      {/* Sign out */}
      <div className="px-3 py-4">
        <Link
          href="/login"
          className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/80 transition-all duration-200 group-hover:bg-rose-100 group-hover:text-rose-600 dark:group-hover:bg-rose-900/40">
            <LogOut className="size-4" />
          </span>
          <span className="transition-all duration-200">Sign Out</span>
        </Link>
      </div>
    </aside>
  )
}