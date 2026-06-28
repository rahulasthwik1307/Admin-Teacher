"use client"

import { useQuery } from "@tanstack/react-query"

export interface TeacherActivityRow {
  id: string
  name: string
  initials: string
  subject: string
  sessions: number
  lastActive: string
}

export interface SystemStatusItem {
  label: string
  value: number | string
  status: "ok" | "warn" | "info"
}

export interface RecentActivityItem {
  text: string
  time: string
  actionType: string
}

export interface DashboardStats {
  teachers: number
  students: number
  departments: number
  activeSessions: number
  pendingFaceApprovals: number
}

export interface AdminDashboardResponse {
  stats: DashboardStats
  teacherActivity: TeacherActivityRow[]
  systemStatus: SystemStatusItem[]
  recentActivity: RecentActivityItem[]
  maxSessions: number
}

async function fetchAdminDashboard(): Promise<AdminDashboardResponse> {
  const res = await fetch("/api/admin/dashboard-data")
  if (!res.ok) throw new Error("Failed to fetch admin dashboard")
  return res.json()
}

export function useAdminDashboard() {
  return useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: fetchAdminDashboard,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}
