import { DashboardStats } from "@/components/teacher/dashboard-stats"
import { FaceApprovalAlert } from "@/components/teacher/face-approval-alert"
import { MyClasses } from "@/components/teacher/my-classes"
import { MyTimetable } from "@/components/teacher/my-timetable"
import { TodayAttendanceSummary } from "@/components/teacher/today-attendance-summary"
import { RecentActivity } from "@/components/teacher/recent-activity"
import { QuickActions } from "@/components/teacher/quick-actions"

export default function TeacherDashboard() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="flex flex-col gap-6 p-1">
        <DashboardStats />
        <FaceApprovalAlert />
        <MyClasses />
        <MyTimetable />
        <SummaryActivityPanel />
        <QuickActions />
      </div>
    </div>
  )
}

function SummaryActivityPanel() {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">

      {/* ── Desktop layout ── */}
      <div className="hidden lg:grid lg:grid-cols-[1fr_2px_1fr]">
        <div className="p-6">
          <TodayAttendanceSummary />
        </div>

        {/* Vertical divider */}
        <div className="bg-slate-300 dark:bg-slate-600" />

        <div className="p-6">
          <RecentActivity />
        </div>
      </div>

      {/* ── Mobile layout ── */}
      <div className="flex flex-col lg:hidden">
        <div className="p-6">
          <TodayAttendanceSummary />
        </div>
        <div className="h-0.5 bg-slate-300 dark:bg-slate-600 mx-6" />
        <div className="p-6">
          <RecentActivity />
        </div>
      </div>

    </div>
  )
}