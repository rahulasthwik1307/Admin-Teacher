import { DashboardStats } from "@/components/teacher/dashboard-stats"
import { FaceApprovalAlert } from "@/components/teacher/face-approval-alert"
import { MyClasses } from "@/components/teacher/my-classes"
import { TodayAttendanceSummary } from "@/components/teacher/today-attendance-summary"
import { RecentActivity } from "@/components/teacher/recent-activity"
import { QuickActions } from "@/components/teacher/quick-actions"

export default function TeacherDashboard() {
  return (
    <div className="flex flex-col gap-6">
      {/* Section 1 — Stats */}
      <DashboardStats />

      {/* Section 2 — Face approval alert */}
      <FaceApprovalAlert />

      {/* Section 3 — My classes */}
      <MyClasses />

      {/* Section 4 & 5 — Summary + Activity side by side on desktop */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TodayAttendanceSummary />
        <RecentActivity />
      </div>

      {/* Section 6 — Quick actions */}
      <QuickActions />
    </div>
  )
}
