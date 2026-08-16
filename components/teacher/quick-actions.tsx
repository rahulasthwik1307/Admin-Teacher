import Link from "next/link"
import { QrCode, Users, CalendarDays, ArrowRight, Zap } from "lucide-react"

const actions = [
  {
    label: "Take Attendance",
    description: "Generate dynamic QR code & start session",
    href: "/teacher/qr-attendance",
    icon: QrCode,
    iconColor: "text-primary",
    iconBg: "bg-primary/10 border border-primary/20",
  },
  {
    label: "View Students",
    description: "Browse student roster and photo approvals",
    href: "/teacher/students",
    icon: Users,
    iconColor: "text-sky-600 dark:text-sky-400",
    iconBg: "bg-sky-500/10 border border-sky-500/20",
  },
  {
    label: "Attendance History",
    description: "Review past sessions, logs, and summaries",
    href: "/teacher/attendance-history",
    icon: CalendarDays,
    iconColor: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-500/10 border border-emerald-500/20",
  },
]

export function QuickActions() {
  return (
    <div className="rounded-xl border border-border bg-card shadow-2xs overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border/60 bg-muted/10">
        <div className="flex size-7.5 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Zap className="size-3.5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">Quick Actions</h3>
          <p className="text-[11px] text-muted-foreground">Frequently accessed teacher tools and shortcuts</p>
        </div>
      </div>
      <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-y-0 sm:divide-x">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group flex items-center gap-3.5 px-5 py-4 transition-all duration-150 hover:bg-muted/30 cursor-pointer"
          >
            <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 ${action.iconBg}`}>
              <action.icon className={`size-5 ${action.iconColor}`} />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-xs sm:text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                {action.label}
              </span>
              <span className="text-[11px] text-muted-foreground leading-snug mt-0.5 truncate">
                {action.description}
              </span>
            </div>
            <ArrowRight className="size-4 text-muted-foreground shrink-0 opacity-40 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-primary" />
          </Link>
        ))}
      </div>
    </div>
  )
}