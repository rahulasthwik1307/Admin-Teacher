"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"

export interface Assignment {
  id: string
  teacher: string
  teacherId: string
  subject: string
  classSection: string
  classSectionOnly: string
  department: string
  year: string | null
  date: string
}

export interface TeacherOption {
  id: string
  name: string
}

export interface SubjectOption {
  id: string
  name: string
  code?: string
  deptCode: string
}

export interface ClassOption {
  id: string
  label: string
  fullLabel: string
  name: string
  section: string
  year: string
  classSection: string
  deptCode: string
}

export interface DeptOption {
  code: string
  name: string
}

export interface AdminAssignmentsData {
  assignments: Assignment[]
  teacherOptions: TeacherOption[]
  subjectOptions: SubjectOption[]
  classOptions: ClassOption[]
  deptOptions: DeptOption[]
  totalSubjectsInSystem: number
}

export async function fetchAdminAssignmentsData(): Promise<AdminAssignmentsData> {
  const supabase = createClient()

  const [teachersRes, subjectsRes, classesRes, assignmentsRes] = await Promise.all([
    supabase
      .from("teachers")
      .select("id, user:users ( full_name )")
      .eq("is_active", true),
    supabase
      .from("subjects")
      .select("id, name, code, department:departments ( code )")
      .order("name"),
    supabase
      .from("classes")
      .select("id, name, section, year, department:departments ( code, name )")
      .order("name"),
    supabase
      .from("teacher_assignments")
      .select(
        `id, assigned_at, year, teacher:teachers ( id, user:users ( full_name ) ), subject:subjects ( name ), class:classes ( name, section, year, department:departments ( code ) )`
      )
      .order("assigned_at", { ascending: false }),
  ])

  if (assignmentsRes.error) throw assignmentsRes.error

  const teacherOptions: TeacherOption[] = (teachersRes.data || []).map((t: any) => ({
    id: t.id,
    name: t.user?.full_name ?? "Unknown",
  }))

  const subjectOptions: SubjectOption[] = (subjectsRes.data || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    code: s.code ?? "",
    deptCode: s.department?.code ?? "",
  }))

  const classOptions: ClassOption[] = (classesRes.data || []).map((c: any) => ({
    id: c.id,
    label: `${c.name}-${c.section}`,
    fullLabel: `${c.name}-${c.section} · ${c.year}`,
    name: c.name,
    section: c.section,
    year: c.year,
    classSection: `${c.name}-${c.section}`,
    deptCode: c.department?.code ?? "",
  }))

  const deptMap = new Map<string, string>()
  for (const c of (classesRes.data || []) as any[]) {
    if (c.department?.code) {
      deptMap.set(c.department.code, c.department.name)
    }
  }
  const deptOptions: DeptOption[] = Array.from(deptMap.entries()).map(([code, name]) => ({
    code,
    name,
  }))

  const assignments: Assignment[] = (assignmentsRes.data || []).map((a: any) => ({
    id: a.id,
    teacher: a.teacher?.user?.full_name ?? "Unknown",
    teacherId: a.teacher?.id ?? "",
    subject: a.subject?.name ?? "—",
    classSection: a.class ? `${a.class.name}-${a.class.section} · ${a.class.year}` : "—",
    classSectionOnly: a.class ? `${a.class.name}-${a.class.section}` : "—",
    department: a.class?.department?.code ?? "—",
    year: a.year ?? a.class?.year ?? null,
    date: a.assigned_at
      ? new Date(a.assigned_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "—",
  }))

  return {
    assignments,
    teacherOptions,
    subjectOptions,
    classOptions,
    deptOptions,
    totalSubjectsInSystem: subjectOptions.length,
  }
}

export function useAdminAssignments() {
  return useQuery({
    queryKey: ["admin-assignments"],
    queryFn: fetchAdminAssignmentsData,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}
