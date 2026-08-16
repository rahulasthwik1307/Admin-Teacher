"use client"

import { motion, useReducedMotion, type Variants } from "framer-motion"
import { DashboardStats } from "@/components/teacher/dashboard-stats"
import { FaceApprovalAlert } from "@/components/teacher/face-approval-alert"
import { MissedAttendanceAlert } from "@/components/teacher/missed-attendance-alert"
import { MyClasses } from "@/components/teacher/my-classes"
import { MyTimetable } from "@/components/teacher/my-timetable"
import { TodayAttendanceSummary } from "@/components/teacher/today-attendance-summary"
import { RecentActivity } from "@/components/teacher/recent-activity"
import { QuickActions } from "@/components/teacher/quick-actions"

export default function TeacherDashboard() {
  const shouldReduceMotion = useReducedMotion()

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.05,
      },
    },
  }

  const itemVariants: Variants = {
    hidden: shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.35,
        ease: "easeOut",
      },
    },
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-6"
    >
      <motion.div variants={itemVariants}>
        <DashboardStats />
      </motion.div>

      <FaceApprovalAlert />

      <motion.div variants={itemVariants}>
        <MissedAttendanceAlert />
      </motion.div>

      <motion.div variants={itemVariants}>
        <MyClasses />
      </motion.div>

      <motion.div variants={itemVariants}>
        <MyTimetable />
      </motion.div>

      <motion.div variants={itemVariants}>
        <SummaryActivityPanel />
      </motion.div>

      <motion.div variants={itemVariants}>
        <QuickActions />
      </motion.div>
    </motion.div>
  )
}

function SummaryActivityPanel() {
  return (
    <div className="rounded-xl border border-border bg-card shadow-2xs overflow-hidden">
      {/* ── Desktop layout ── */}
      <div className="hidden lg:grid lg:grid-cols-[1fr_1px_1fr]">
        <div className="p-5 lg:p-6">
          <TodayAttendanceSummary />
        </div>

        {/* Vertical divider */}
        <div className="bg-border/70" />

        <div className="p-5 lg:p-6">
          <RecentActivity />
        </div>
      </div>

      {/* ── Mobile layout ── */}
      <div className="flex flex-col lg:hidden divide-y divide-border/70">
        <div className="p-4 sm:p-5">
          <TodayAttendanceSummary />
        </div>
        <div className="p-4 sm:p-5">
          <RecentActivity />
        </div>
      </div>
    </div>
  )
}