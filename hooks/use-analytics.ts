"use client"

import { useQuery } from "@tanstack/react-query"

export type Period = "This Week" | "This Month" | "This Semester"

export interface SubjectCard {
  assignmentId: string
  subjectId: string
  subjectName: string
  classId: string
  className: string
  percentage: number
  totalStudents: number
  totalClasses: number
  trend: "Improving" | "Stable" | "Declining"
  presentTotal: number
  absentTotal: number
  insight: string
}

export interface ChartPoint {
  date: string
  percentage: number
  sessionId: string
}

export interface StudentRow {
  name: string
  roll: string
  subject: string
  percentage: number
  attended: number
  total: number
}

export interface AnalyticsResponse {
  subjectCards: SubjectCard[]
  chartData: ChartPoint[]
  lowStudents: StudentRow[]
  topStudents: StudentRow[]
  summaryStats: {
    totalClasses: number
    overallPct: number
    belowThresholdCount: number
  }
}

async function fetchAnalytics(period: Period): Promise<AnalyticsResponse> {
  const res = await fetch(`/api/teacher/analytics?period=${encodeURIComponent(period)}`)
  if (!res.ok) throw new Error("Failed to fetch analytics")
  return res.json()
}

export function useAnalytics(period: Period) {
  return useQuery({
    queryKey: ["teacher-analytics", period],
    queryFn: () => fetchAnalytics(period),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}
