"use client"

import { useQuery } from "@tanstack/react-query"

export interface TeacherDashboardData {
  stats: {
    totalStudents: number
    todayPresent: number
    activeSessions: number
  }
  myClasses: {
    key: string
    subject: string
    className: string
    section: string
    students: number
    lastAttendance: string
  }[]
  todayAttendance: {
    id: string
    name: string
    present: number
    total: number
  }[]
  recentActivity: {
    description: string
    time: string
    type: "finalized" | "opened" | "approved" | "added"
  }[]
}

async function fetchDashboard(): Promise<TeacherDashboardData> {
  const res = await fetch("/api/teacher/dashboard", {
    cache: "no-store",
  })
  if (!res.ok) throw new Error("Failed to fetch dashboard")
  return res.json()
}

export function useTeacherDashboard() {
  return useQuery({
    queryKey: ["teacher-dashboard"],
    queryFn: fetchDashboard,
    staleTime: 60 * 1000,   // fresh for 60 seconds
    gcTime: 5 * 60 * 1000,  // stay in memory 5 minutes after unmount
  })
}
