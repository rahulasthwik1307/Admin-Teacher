"use client"

import { useQuery } from "@tanstack/react-query"

export interface AttendanceSession {
  id: string
  date: string
  rawDate: string
  subject: string
  subjectId: string
  class: string
  classId: string
  period: string
  periodShort: string
  periodTime: string
  present: number
  absent: number
  percentage: number
  status: "Finalized"
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
    staleTime: 2 * 60 * 1000,  // fresh for 2 minutes
    gcTime: 10 * 60 * 1000,    // keep in memory 10 minutes
  })
}
