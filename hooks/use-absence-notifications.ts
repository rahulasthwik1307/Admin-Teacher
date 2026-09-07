"use client"

import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"

export interface EligibleAbsence {
  periodAttendanceId: string
  studentId: string
  studentName: string
  rollNumber: string
  year: string
  className: string
  section: string
  departmentCode: string
  cohortLabel: string
  contactEmail: string | null
  alreadyNotified: boolean
  sessionId: string
  subjectId: string
  subjectName: string
  classId: string
  periodId: string
  periodNumber: number
  startTime: string
  endTime: string
  date: string
  overallAttendancePct: number
  overallAttended: number
  overallTotalClasses: number
  subjectAttendancePct: number
  subjectAttended: number
  subjectTotalClasses: number
}

export async function fetchAbsencePending(): Promise<EligibleAbsence[]> {
  const res = await fetch("/api/teacher/absence-notifications/pending")
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || "Failed to load pending absences")
  }
  return res.json()
}

export function useAbsencePending() {
  return useQuery({
    queryKey: ["teacher-absence-pending"],
    queryFn: fetchAbsencePending,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  })
}

export async function fetchAbsenceHistory(): Promise<any[]> {
  const res = await fetch("/api/teacher/absence-notifications/history")
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || "Failed to load notification history")
  }
  return res.json()
}

export function useAbsenceHistory() {
  return useQuery({
    queryKey: ["teacher-absence-history"],
    queryFn: fetchAbsenceHistory,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  })
}

export async function fetchTeacherCohortsData() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { teacherCohorts: [], classSubjectMap: new Map<string, { id: string; name: string }[]>() }

  const { data: assignments } = await supabase
    .from("teacher_assignments")
    .select(`
      class_id,
      subject_id,
      class:classes(id, name, section, year, department:departments(code)),
      subject:subjects(id, name)
    `)
    .eq("teacher_id", user.id)

  const cohortMap = new Map()
  const subjMap = new Map<string, { id: string; name: string }[]>()

  if (assignments) {
    for (const a of assignments as any[]) {
      if (a.class && !cohortMap.has(a.class_id)) {
        const dCode = a.class.department?.code || ""
        const cName = dCode ? `${dCode}-${a.class.section}` : `${a.class.name}-${a.class.section}`
        cohortMap.set(a.class_id, {
          id: a.class_id,
          className: cName,
          year: a.class.year,
          section: a.class.section,
          deptCode: dCode,
          label: cName,
        })
      }
      if (a.class_id && a.subject) {
        if (!subjMap.has(a.class_id)) subjMap.set(a.class_id, [])
        const list = subjMap.get(a.class_id)!
        if (!list.some((s) => s.id === a.subject.id)) {
          list.push({ id: a.subject.id, name: a.subject.name })
        }
      }
    }
  }

  return {
    teacherCohorts: Array.from(cohortMap.values()) as {
      id: string
      className: string
      year: string
      section: string
      deptCode: string
      label: string
    }[],
    classSubjectMap: subjMap,
  }
}

export function useTeacherCohorts() {
  return useQuery({
    queryKey: ["teacher-cohorts-assignments"],
    queryFn: fetchTeacherCohortsData,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  })
}
