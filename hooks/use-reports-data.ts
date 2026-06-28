"use client"

import { useQuery } from "@tanstack/react-query"

export interface ReportsData {
  teachers: any[]
  sessions: any[]
  assignments: any[]
  attendance: any[]
  logs: any[]
}

async function fetchReportsData(): Promise<ReportsData> {
  const res = await fetch("/api/admin/reports-data")
  if (!res.ok) throw new Error("Failed to fetch reports data")
  return res.json()
}

export function useReportsData() {
  return useQuery<ReportsData>({
    queryKey: ["admin-reports"],
    queryFn: fetchReportsData,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}
