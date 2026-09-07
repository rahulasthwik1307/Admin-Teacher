"use client"

import { useQuery, keepPreviousData } from "@tanstack/react-query"

export interface MissedSlot {
  date: string
  dateLabel: string
  subjectId: string
  subjectName: string
  subjectCode: string
  classId: string
  className: string
  periodId: string
  periodNumber: number
  startTime: string
  endTime: string
}

export async function fetchMissedAttendance(days: string = "180"): Promise<MissedSlot[]> {
  const res = await fetch(`/api/teacher/missed-attendance?days=${days}`)
  if (!res.ok) throw new Error("Failed to fetch missed attendance")
  return res.json()
}

export function useMissedAttendance(days: string) {
  return useQuery<MissedSlot[]>({
    queryKey: ["teacher-missed-attendance", days],
    queryFn: () => fetchMissedAttendance(days),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  })
}
