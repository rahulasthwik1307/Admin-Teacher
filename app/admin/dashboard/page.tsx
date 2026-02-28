"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Users, GraduationCap, Building, Radio } from "lucide-react"

const stats = [
  { label: "Total Teachers", value: "8", icon: Users, color: "bg-primary/10 text-primary" },
  { label: "Total Students", value: "47", icon: GraduationCap, color: "bg-emerald-500/10 text-emerald-600" },
  { label: "Departments", value: "3", icon: Building, color: "bg-amber-500/10 text-amber-600" },
  { label: "Active Sessions Today", value: "2", icon: Radio, color: "bg-rose-500/10 text-rose-600" },
]

const teacherActivity = [
  { name: "Dr. P. Sharma", initials: "PS", subject: "Data Structures", sessions: 5, lastActive: "Today, 11:00 AM" },
  { name: "Dr. S. Reddy", initials: "SR", subject: "Operating Systems", sessions: 4, lastActive: "Today, 10:15 AM" },
  { name: "Dr. K. Rao", initials: "KR", subject: "Computer Networks", sessions: 3, lastActive: "Yesterday, 2:30 PM" },
  { name: "Dr. M. Patel", initials: "MP", subject: "Circuit Theory", sessions: 2, lastActive: "Yesterday, 12:00 PM" },
]

const systemStatus = [
  "Geofence Configured",
  "3 Departments Active",
  "8 Teachers Active",
  "Student App Connected",
]

const recentActivity = [
  { text: "Teacher account created for Dr. S. Reddy", time: "2 hours ago" },
  { text: "Geofence updated — radius 250m", time: "5 hours ago" },
  { text: "New subject DBMS added to CSE", time: "1 day ago" },
  { text: "Teacher assigned to CSE-A Data Structures", time: "1 day ago" },
  { text: "Academic year structure configured", time: "2 days ago" },
]

export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-4 lg:p-5">
              <div className={`flex size-11 shrink-0 items-center justify-center rounded-lg ${stat.color}`}>
                <stat.icon className="size-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-foreground leading-tight">{stat.value}</span>
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Teacher Activity + System Status */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Teacher Activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Teacher Activity This Week</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-border text-left">
                    <th className="px-5 py-3 font-medium text-muted-foreground">Teacher Name</th>
                    <th className="px-5 py-3 font-medium text-muted-foreground">Subject</th>
                    <th className="px-5 py-3 font-medium text-muted-foreground text-center">Sessions</th>
                    <th className="px-5 py-3 font-medium text-muted-foreground">Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {teacherActivity.map((t) => (
                    <tr key={t.name} className="border-t border-border">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="size-8">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                              {t.initials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-foreground">{t.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{t.subject}</td>
                      <td className="px-5 py-3 text-center font-semibold text-foreground">{t.sessions}</td>
                      <td className="px-5 py-3 text-muted-foreground">{t.lastActive}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <div className="flex flex-col gap-3 p-4 sm:hidden">
              {teacherActivity.map((t) => (
                <div key={t.name} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <Avatar className="size-9">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {t.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-1 flex-col">
                    <span className="text-sm font-medium text-foreground">{t.name}</span>
                    <span className="text-xs text-muted-foreground">{t.subject}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-semibold text-foreground">{t.sessions} sessions</span>
                    <span className="text-xs text-muted-foreground">{t.lastActive}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">System Status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {systemStatus.map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3">
                <span className="relative flex size-2.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
                </span>
                <span className="text-sm font-medium text-foreground">{item}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent System Activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Recent System Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative flex flex-col gap-0">
            {recentActivity.map((item, i) => (
              <div key={i} className="relative flex gap-4 pb-6 last:pb-0">
                {/* Timeline connector */}
                {i < recentActivity.length - 1 && (
                  <div className="absolute left-[7px] top-4 h-full w-px bg-border" />
                )}
                <div className="relative z-10 mt-1.5 size-3.5 shrink-0 rounded-full border-2 border-primary bg-background" />
                <div className="flex flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm text-foreground">{item.text}</span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
