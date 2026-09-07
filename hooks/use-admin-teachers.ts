"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"

export interface Teacher {
  id: string
  name: string
  title: string
  initials: string
  teacherId: string
  department: string
  departmentCode: string
  departmentId: string
  subjects: number
  status: "Active" | "Disabled"
  contactEmail: string | null
}

export interface DepartmentOption {
  id: string
  name: string
  code: string
}

export interface AdminTeachersData {
  teachers: Teacher[]
  departments: DepartmentOption[]
}

function getInitials(name: string): string {
  return (
    name
      .split(" ")
      .filter((w) => w[0] && w[0] === w[0].toUpperCase())
      .map((w) => w[0])
      .join("")
      .slice(0, 2) || "NA"
  )
}

export async function fetchAdminTeachersData(): Promise<AdminTeachersData> {
  const supabase = createClient()
  const [teachersRes, deptsRes, assignmentsRes] = await Promise.all([
    supabase
      .from("teachers")
      .select(`
        id,
        teacher_id_code,
        is_active,
        title,
        department_id,
        department:departments ( id, name, code ),
        user:users ( full_name, email, contact_email )
      `)
      .order("created_at", { ascending: false }),
    supabase.from("departments").select("id, name, code").order("name"),
    supabase.from("teacher_assignments").select("teacher_id"),
  ])

  if (teachersRes.error) throw teachersRes.error

  const countMap: Record<string, number> = {}
  for (const a of assignmentsRes.data || []) {
    countMap[a.teacher_id] = (countMap[a.teacher_id] || 0) + 1
  }

  const teachers: Teacher[] = (teachersRes.data || []).map((t: any) => ({
    id: t.id,
    name: t.user?.full_name ?? "Unknown",
    title: t.title ?? "Mr",
    initials: getInitials(t.user?.full_name ?? ""),
    teacherId: t.teacher_id_code,
    department: t.department?.name ?? "Unassigned",
    departmentCode: t.department?.code ?? t.department?.name ?? "Unassigned",
    departmentId: t.department?.id ?? "unassigned",
    subjects: countMap[t.id] || 0,
    status: t.is_active ? "Active" : "Disabled",
    contactEmail: t.user?.contact_email ?? null,
  }))

  return {
    teachers,
    departments: deptsRes.data || [],
  }
}

export function useAdminTeachers() {
  return useQuery({
    queryKey: ["admin-teachers"],
    queryFn: fetchAdminTeachersData,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}
