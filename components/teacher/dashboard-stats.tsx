import { Users, UserCheck, ScanFace, Radio } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const stats = [
  {
    label: "Total Students",
    value: 47,
    icon: Users,
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
  },
  {
    label: "Today Present",
    value: 38,
    icon: UserCheck,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50",
  },
  {
    label: "Pending Face Approvals",
    value: 3,
    icon: ScanFace,
    iconColor: "text-amber-600",
    iconBg: "bg-amber-50",
  },
  {
    label: "Active Attendance Windows",
    value: 0,
    icon: Radio,
    iconColor: "text-muted-foreground",
    iconBg: "bg-muted",
  },
]

export function DashboardStats() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
      {stats.map((stat) => (
        <Card key={stat.label} className="py-4 gap-0">
          <CardContent className="flex items-start gap-4">
            <div
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-lg",
                stat.iconBg
              )}
            >
              <stat.icon className={cn("size-5", stat.iconColor)} />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-foreground leading-tight">
                {stat.value}
              </span>
              <span className="text-xs text-muted-foreground leading-snug mt-0.5">
                {stat.label}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
