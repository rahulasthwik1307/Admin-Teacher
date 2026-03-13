import Link from "next/link"
import { QrCode, ScanFace, UserPlus, ArrowRight } from "lucide-react"

const actions = [
  {
    label: "Take Attendance",
    description: "Generate QR and start a session",
    href: "/teacher/qr-attendance",
    icon: QrCode,
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
  },
  {
    label: "Review Face Approvals",
    description: "Approve pending face registrations",
    href: "/teacher/face-approval",
    icon: ScanFace,
    iconColor: "text-amber-600",
    iconBg: "bg-amber-50",
  },
  {
    label: "Add New Student",
    description: "Register a student to your class",
    href: "/teacher/students",
    icon: UserPlus,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50",
  },
]

export function QuickActions() {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="text-base font-semibold text-foreground">Quick Actions</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Common tasks at a glance</p>
      </div>
      <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-y-0 sm:divide-x">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group flex items-center gap-4 px-6 py-5 transition-colors duration-150 hover:bg-slate-50 dark:hover:bg-slate-900/50"
          >
            <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110 ${action.iconBg}`}>
              <action.icon className={`size-5 ${action.iconColor}`} />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-semibold text-foreground">{action.label}</span>
              <span className="text-xs text-muted-foreground leading-snug mt-0.5">{action.description}</span>
            </div>
            <ArrowRight className="size-4 text-muted-foreground shrink-0 opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0" />
          </Link>
        ))}
      </div>
    </div>
  )
}