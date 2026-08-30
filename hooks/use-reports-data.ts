"use client"

import { useEffect, useRef, useCallback } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createClient, getTabId } from "@/lib/supabase/client"

export interface TopSubjectCohort {
  subjectName: string
  subjectCode: string
  cohortLabel: string
  attendancePct: number
  sessionsCount: number
  teacherName: string
}

export interface AttentionRequiredCohort {
  subjectName: string
  subjectCode: string
  cohortLabel: string
  attendancePct: number
  sessionsCount: number
  teacherName: string
}

export interface AnalyticsOverview {
  hasData: boolean
  campusAttendancePct: number | null
  totalSessionsConducted: number
  totalExpectedStudents: number
  totalPresentMarks: number
  activeTeachersCount: number
  studentsBelow75Count: number
  topSubjectCohort: TopSubjectCohort | null
  attentionRequiredSubjectCohort: AttentionRequiredCohort | null
}

export interface SubjectCohortMatrixItem {
  key: string
  subjectId: string
  subjectName: string
  subjectCode: string
  classId: string
  classSection: string
  year: string
  deptCode: string
  cohortLabel: string
  attendancePct: number | null
  sessionsConducted: number
  totalExpected: number
  totalPresent: number
  teachersList?: string
}

export interface DepartmentYearBreakdownItem {
  deptCode: string
  year: string
  label: string
  sessionsConducted: number
  attendancePct: number | null
}

export interface DefaulterStudentItem {
  studentId: string
  name: string
  rollNumber: string
  classId: string
  deptCode: string
  year: string
  classSection: string
  expectedSessions: number
  attendedSessions: number
  attendancePct: number
  status: "critical" | "at_risk"
}

export interface TeacherActivityItem {
  teacherId: string
  name: string
  deptCode: string
  sessionsConducted: number
  assignedCoursesCount: number
  assignedCohortsCount: number
  avgAttendancePct: number | null
  lastSessionDate: string | null
  rate: number
}

export interface ZeroEnrollmentSessionItem {
  session_id: string
  session_date: string
  subject_code: string
  subject_name: string
  cohort_label: string
  teacher_name: string
  total_recorded_marks: number
}

export interface CrossCohortAnomalyItem {
  attendance_id: string
  session_id: string
  session_date: string
  student_id: string
  student_name: string
  roll_number: string
  session_cohort: string
  enrolled_cohort: string
  subject_name: string
  status: "present" | "absent"
}

export interface ReportDiagnostics {
  zeroEnrollmentSessionsCount: number
  crossCohortMarksCount: number
  zeroEnrollmentSessions: ZeroEnrollmentSessionItem[]
  crossCohortAnomalies: CrossCohortAnomalyItem[]
}

export interface AnalyticsData {
  overview: AnalyticsOverview
  subjectCohortMatrix: SubjectCohortMatrixItem[]
  departmentYearBreakdown: DepartmentYearBreakdownItem[]
  defaulterStudents: DefaulterStudentItem[]
  teacherActivity: TeacherActivityItem[]
  diagnostics: ReportDiagnostics
}

export interface ReportsFilterState {
  dateRange?: string
  startDate?: string
  endDate?: string
  departmentId?: string
  year?: string
  classId?: string
  subjectId?: string
  teacherId?: string
}

export interface ReportsData {
  analytics?: AnalyticsData
  overview?: AnalyticsOverview
  subjectCohortMatrix?: SubjectCohortMatrixItem[]
  departmentYearBreakdown?: DepartmentYearBreakdownItem[]
  defaulterStudents?: DefaulterStudentItem[]
  teacherActivity?: TeacherActivityItem[]
  diagnostics?: ReportDiagnostics
  // Metadata & relations for filtering and drill-down:
  teachers: any[]
  sessions: any[]
  assignments: any[]
  attendance: any[]
  departments: any[]
  classes: any[]
  subjects: any[]
  logs: any[]
}

async function fetchReportsData(filters?: ReportsFilterState): Promise<ReportsData> {
  const params = new URLSearchParams()
  if (filters?.dateRange) params.set("dateRange", filters.dateRange)
  if (filters?.startDate) params.set("startDate", filters.startDate)
  if (filters?.endDate) params.set("endDate", filters.endDate)
  if (filters?.departmentId && filters.departmentId !== "all") params.set("departmentId", filters.departmentId)
  if (filters?.year && filters.year !== "all") params.set("year", filters.year)
  if (filters?.classId && filters.classId !== "all") params.set("classId", filters.classId)
  if (filters?.subjectId && filters.subjectId !== "all") params.set("subjectId", filters.subjectId)
  if (filters?.teacherId && filters.teacherId !== "all") params.set("teacherId", filters.teacherId)

  const queryString = params.toString()
  const url = queryString ? `/api/admin/reports-data?${queryString}` : "/api/admin/reports-data"

  const res = await fetch(url)
  if (!res.ok) {
    if (res.status === 401) throw new Error("Unauthorized: Please log in as an administrator")
    if (res.status === 403) throw new Error("Forbidden: Admin access required")
    throw new Error("Failed to fetch reports data")
  }
  return res.json()
}

export function useReportsData(filters?: ReportsFilterState) {
  const queryClient = useQueryClient()

  // Realtime & Invalidation Controller References
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fallbackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isRealtimeHealthyRef = useRef<boolean>(false)
  const hasPendingUpdateRef = useRef<boolean>(false)
  const isSubscribedRef = useRef<boolean>(false)

  // Safe invalidator: marks active admin reports query stale and refetches with exact active filters
  const triggerDebouncedRefresh = useCallback(() => {
    // If the tab is currently hidden in the background, defer the fetch until focus/visibility resumes
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      hasPendingUpdateRef.current = true
      return
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null
      hasPendingUpdateRef.current = false
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] })
    }, 500) // 500ms trailing-edge debounce shield
  }, [queryClient])

  useEffect(() => {
    if (typeof window === "undefined") return

    const supabase = createClient()
    const tabId = getTabId()
    const channelName = `admin_reports_realtime_${tabId}`

    // Helper to control 45s fallback polling when Realtime is degraded
    const updateFallbackPolling = (isHealthy: boolean) => {
      isRealtimeHealthyRef.current = isHealthy
      if (isHealthy) {
        if (fallbackIntervalRef.current) {
          clearInterval(fallbackIntervalRef.current)
          fallbackIntervalRef.current = null
        }
      } else {
        if (!fallbackIntervalRef.current) {
          fallbackIntervalRef.current = setInterval(() => {
            if (document.visibilityState === "visible") {
              queryClient.invalidateQueries({ queryKey: ["admin-reports"] })
            }
          }, 45000) // 45-second fallback ONLY when Realtime is unhealthy
        }
      }
    }

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attendance_sessions" },
        () => {
          triggerDebouncedRefresh()
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "period_attendance" },
        () => {
          triggerDebouncedRefresh()
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "college_attendance" },
        () => {
          triggerDebouncedRefresh()
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          updateFallbackPolling(true)
          // If we reconnected after being disconnected, synchronize immediately
          if (isSubscribedRef.current) {
            triggerDebouncedRefresh()
          }
          isSubscribedRef.current = true
        } else if (status === "TIMED_OUT" || status === "CHANNEL_ERROR" || status === "CLOSED") {
          updateFallbackPolling(false)
        }
      })

    // Tab visibility & focus handling: when returning to tab, catch up if any updates occurred
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        if (hasPendingUpdateRef.current) {
          hasPendingUpdateRef.current = false
          queryClient.invalidateQueries({ queryKey: ["admin-reports"] })
        }
      }
    }

    // Network online recovery
    const handleOnline = () => {
      triggerDebouncedRefresh()
    }

    document.addEventListener("visibilitychange", handleVisibilityOrFocus)
    window.addEventListener("focus", handleVisibilityOrFocus)
    window.addEventListener("online", handleOnline)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current)
        fallbackIntervalRef.current = null
      }
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus)
      window.removeEventListener("focus", handleVisibilityOrFocus)
      window.removeEventListener("online", handleOnline)

      supabase.removeChannel(channel)
    }
  }, [triggerDebouncedRefresh, queryClient])

  return useQuery<ReportsData>({
    queryKey: ["admin-reports", filters],
    queryFn: () => fetchReportsData(filters),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}
