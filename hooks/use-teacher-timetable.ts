"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"

export interface TimetableSlot {
  dayOfWeek: number
  periodNumber: number
  startTime: string
  endTime: string
  subjectName: string
  subjectCode: string
  className: string
  section: string
  year: string
}

export interface TeacherTimetableData {
  slots: TimetableSlot[]
  teacherName: string
}

export async function fetchTeacherTimetable(): Promise<TeacherTimetableData> {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return { slots: [], teacherName: "Faculty Member" }
  }

  const [{ data, error }, { data: profile }] = await Promise.all([
    supabase
      .from("timetables")
      .select(`
        day_of_week,
        period:periods ( period_number, start_time, end_time ),
        subject:subjects ( name, code ),
        class:classes ( name, section, year )
      `)
      .eq("teacher_id", session.user.id)
      .order("day_of_week"),
    supabase
      .from("users")
      .select("full_name")
      .eq("id", session.user.id)
      .maybeSingle(),
  ])

  let teacherName = "Faculty Member"
  if (profile?.full_name) {
    teacherName = profile.full_name
  }

  if (error || !data) {
    return { slots: [], teacherName }
  }

  const mapped: TimetableSlot[] = (data as any[])
    .map((t) => ({
      dayOfWeek: t.day_of_week,
      periodNumber: t.period?.period_number ?? 0,
      startTime: t.period?.start_time?.slice(0, 5) ?? "",
      endTime: t.period?.end_time?.slice(0, 5) ?? "",
      subjectName: t.subject?.name ?? "—",
      subjectCode: t.subject?.code ?? "",
      className: t.class?.name ?? "—",
      section: t.class?.section ?? "",
      year: t.class?.year ?? "",
    }))
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.periodNumber - b.periodNumber)

  return { slots: mapped, teacherName }
}

export function useTeacherTimetable() {
  return useQuery({
    queryKey: ["teacher-timetable"],
    queryFn: fetchTeacherTimetable,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}
