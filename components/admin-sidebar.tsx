"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Building,
  Link2,
  BarChart3,
  MapPin,
  LogOut,
} from "lucide-react"
import { FALogo } from "@/components/fa-logo"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

const navItems = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Teachers", href: "/admin/teachers", icon: Users },
  { label: "Academic Structure", href: "/admin/academic-structure", icon: Building },
  { label: "Teacher Assignments", href: "/admin/assignments", icon: Link2 },
  { label: "Reports", href: "/admin/reports", icon: BarChart3 },
  { label: "Geofence Setup", href: "/admin/geofence", icon: MapPin },
]

interface AdminSidebarProps {
  onClose?: () => void
}

export function AdminSidebar({ onClose }: AdminSidebarProps) {
  const pathname = usePathname()

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
      <div className="px-5 pb-4">
        <div className="flex items-center gap-3 rounded-lg bg-muted/60 px-3 py-2.5">
          <Avatar className="size-9">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              RK
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground leading-tight">
              Dr. R. Kumar
            </span>
            <span className="text-xs text-muted-foreground">Administrator</span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4" aria-label="Admin navigation">
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
