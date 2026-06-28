"use client"

import { useQuery } from "@tanstack/react-query"

export interface TimetableData {
  assignments: any[]
  periods: any[]
  classes: any[]
  timetable: any[]
}

async function fetchTimetableData(): Promise<TimetableData> {
  const res = await fetch("/api/admin/timetable-data")
  if (!res.ok) throw new Error("Failed to fetch timetable data")
  return res.json()
}

export function useTimetableData() {
  return useQuery<TimetableData>({
    queryKey: ["admin-timetable"],
    queryFn: fetchTimetableData,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}
