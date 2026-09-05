"use client"

import { useQuery } from "@tanstack/react-query"

export interface AttendanceSession {
  id: string
  date: string
  rawDate: string
  subject: string
  subjectId: string
  subjectCode?: string
  class: string
  classId: string
  departmentCode?: string
  year?: string
  section?: string
  period: string
  periodShort: string
  periodNumber?: number
  periodTime: string
  startTime?: string
  endTime?: string
  present: number
  absent: number
  total?: number
  percentage: number
  status: "Finalized"
  method?: "qr" | "manual"
  finalizedAt?: string | null
}

async function fetchAttendanceHistory(): Promise<AttendanceSession[]> {
  const res = await fetch("/api/teacher/attendance-history")
  if (!res.ok) throw new Error("Failed to fetch attendance history")
  return res.json()
}

export function useAttendanceHistory() {
  return useQuery({
    queryKey: ["teacher-attendance-history"],
    queryFn: fetchAttendanceHistory,
    staleTime: 5 * 1000,        // 5 seconds
    refetchOnMount: "always",   // always fetch fresh data when navigating to page
    refetchOnWindowFocus: true, // refresh when tab is focused
  })
}
