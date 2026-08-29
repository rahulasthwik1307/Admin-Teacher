"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  QrCode,
  CalendarDays,
  BarChart3,
  LogOut,
  ClipboardX,
  PanelLeftClose,
  PanelLeftOpen,
  Mail,
} from "lucide-react"
import { FALogo } from "@/components/fa-logo"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

/* ── Nav structure with groups ─────────────────────────── */
const navGroups = [
  {
    label: "OVERVIEW",
    items: [
      { label: "Dashboard", href: "/teacher/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "MANAGE",
    items: [
      { label: "Students", href: "/teacher/students", icon: Users },
    ],
  },
  {
    label: "ATTENDANCE",
    items: [
      { label: "QR Attendance", href: "/teacher/qr-attendance", icon: QrCode },
      { label: "Missed Attendance", href: "/teacher/missed-attendance", icon: ClipboardX },
      { label: "Absence Notifications", href: "/teacher/absence-notifications", icon: Mail },
      { label: "Attendance History", href: "/teacher/attendance-history", icon: CalendarDays },
      { label: "Analytics", href: "/teacher/analytics", icon: BarChart3 },
    ],
  },
]

interface TeacherSidebarProps {
  onClose?: () => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export function TeacherSidebar({
  onClose,
  collapsed = false,
  onToggleCollapse,
}: TeacherSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [teacherName, setTeacherName] = useState("Teacher")
  const [teacherInitials, setTeacherInitials] = useState("T")

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault()
    const { clearTabSession } = await import("@/lib/auth/session-manager")
    await clearTabSession()
    router.push("/login")
  }

  useEffect(() => {
    async function loadTeacherName() {
      try {
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
              profile.full_name
                .split(" ")
                .map((n: string) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)
            )
          }
        }
      } catch {
        // fail silently
      }
    }
    loadTeacherName()
  }, [])

  return (
    <aside
      className={cn(
        "flex h-full flex-col bg-card border-r border-border transition-[width,padding] duration-200 ease-in-out select-none",
        collapsed ? "w-18" : "w-64"
      )}
    >
      {/* ── Logo & Header section ─────────────────────────── */}
      {!collapsed ? (
        <div className="flex items-center justify-between px-4 pt-5 pb-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <FALogo size="sm" className="shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-foreground leading-tight tracking-tight truncate">
                Factor Attendance
              </span>
              <span className="text-[11px] font-medium text-muted-foreground tracking-tight truncate">
                NNRG College
              </span>
            </div>
          </div>
          {onToggleCollapse && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="hidden lg:flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                  aria-label="Collapse sidebar"
                >
                  <PanelLeftClose className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Collapse sidebar
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2.5 px-2 pt-4 pb-3">
          <FALogo size="sm" className="shrink-0" />
          {onToggleCollapse && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="hidden lg:flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                  aria-label="Expand sidebar"
                >
                  <PanelLeftOpen className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Expand sidebar
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      )}

      {/* ── Teacher profile card ──────────────────────────── */}
      {!collapsed ? (
        <div className="px-3 pb-3.5">
          <div className="relative flex items-center gap-3 rounded-xl border border-border bg-linear-to-br from-muted/60 to-muted/20 px-3 py-2.5 shadow-2xs">
            <div className="relative shrink-0">
              <Avatar className="size-8.5 ring-2 ring-primary/20 ring-offset-1">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                  {teacherInitials}
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 size-2 rounded-full bg-emerald-500 ring-2 ring-card" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-foreground leading-tight truncate">
                {teacherName}
              </span>
              <span className="text-[11px] font-medium text-muted-foreground truncate">
                Teacher
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex justify-center px-2 pb-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="relative cursor-default">
                <Avatar className="size-9 ring-2 ring-primary/20 ring-offset-1">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                    {teacherInitials}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}>
              <div className="flex flex-col">
                <span className="font-semibold text-xs">{teacherName}</span>
                <span className="text-[10px] text-muted-foreground">Teacher</span>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      <div className={cn("h-px bg-border/80 transition-all duration-200", collapsed ? "mx-3" : "mx-4")} />

      {/* ── Nav items ─────────────────────────────────────── */}
      <nav className={cn("flex-1 overflow-y-auto py-3", collapsed ? "px-2" : "px-3")} aria-label="Teacher navigation">
        <ul className="flex flex-col gap-4">
          {navGroups.map((group, groupIdx) => (
            <li key={group.label}>
              {!collapsed ? (
                <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 select-none">
                  {group.label}
                </p>
              ) : groupIdx > 0 ? (
                <div className="my-1.5 mx-auto w-6 h-px bg-border/60" />
              ) : null}
              <ul className="flex flex-col gap-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href

                  if (collapsed) {
                    return (
                      <li key={item.href}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link
                              href={item.href}
                              onClick={onClose}
                              className={cn(
                                "group relative flex size-10 items-center justify-center rounded-xl mx-auto transition-all duration-200",
                                isActive
                                  ? "bg-primary/15 text-primary font-semibold shadow-2xs"
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                              )}
                              aria-label={item.label}
                            >
                              <span
                                className={cn(
                                  "absolute left-0 top-1/2 -translate-y-1/2 w-0.75 rounded-r-full transition-all duration-200",
                                  isActive ? "h-5 bg-primary opacity-100" : "h-0 bg-primary opacity-0"
                                )}
                              />
                              <item.icon className="size-4.5 shrink-0" />
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent side="right" sideOffset={12}>
                            <span>{item.label}</span>
                          </TooltipContent>
                        </Tooltip>
                      </li>
                    )
                  }

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
                          isActive
                            ? "text-primary bg-primary/10 font-semibold"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        )}
                      >
                        <span
                          className={cn(
                            "absolute left-0 top-1/2 -translate-y-1/2 w-0.75 rounded-r-full transition-all duration-200",
                            isActive
                              ? "h-5 bg-primary opacity-100"
                              : "h-0 bg-primary opacity-0 group-hover:h-3.5 group-hover:opacity-40"
                          )}
                        />
                        <span
                          className={cn(
                            "flex size-7.5 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
                            isActive
                              ? "bg-primary/20 text-primary shadow-2xs"
                              : "bg-muted/80 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                          )}
                        >
                          <item.icon className="size-4" />
                        </span>
                        <span className="flex-1 truncate">{item.label}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </li>
          ))}
        </ul>
      </nav>

      <div className={cn("h-px bg-border/80 transition-all duration-200", collapsed ? "mx-3" : "mx-4")} />

      {/* ── Sign out ──────────────────────────────────────── */}
      <div className={cn("py-3", collapsed ? "px-2" : "px-3")}>
        {!collapsed ? (
          <button
            type="button"
            onClick={handleSignOut}
            className="group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 cursor-pointer"
          >
            <span className="flex size-7.5 shrink-0 items-center justify-center rounded-lg bg-muted/80 transition-all duration-200 group-hover:bg-rose-100 group-hover:text-rose-600 dark:group-hover:bg-rose-900/40">
              <LogOut className="size-4" />
            </span>
            <span className="transition-all duration-200 font-medium">Sign Out</span>
          </button>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleSignOut}
                className="group flex size-10 items-center justify-center rounded-xl mx-auto text-muted-foreground transition-all duration-200 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 cursor-pointer"
                aria-label="Sign Out"
              >
                <LogOut className="size-4.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={12}>
              Sign Out
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </aside>
  )
}