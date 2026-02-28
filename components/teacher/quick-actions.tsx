import Link from "next/link"
import { QrCode, ScanFace, UserPlus } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:gap-6">
      {actions.map((action) => (
        <Link key={action.href} href={action.href} className="group">
          <Card className="py-4 transition-shadow group-hover:shadow-md">
            <CardContent className="flex items-center gap-4">
              <div
                className={`flex size-11 shrink-0 items-center justify-center rounded-lg ${action.iconBg}`}
              >
                <action.icon className={`size-5 ${action.iconColor}`} />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">
                  {action.label}
                </span>
                <span className="text-xs text-muted-foreground leading-snug mt-0.5">
                  {action.description}
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
