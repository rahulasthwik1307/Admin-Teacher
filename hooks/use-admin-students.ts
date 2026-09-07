"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"

export interface Student {
  id: string
  name: string
  roll: string
  class: string
  classSection: string
  classId: string
  departmentId: string
  departmentCode: string
  year: string
  faceStatus: "Approved" | "Pending" | "Rejected" | "None"
  isActive: boolean
  photoUrl: string | null
  contactEmail: string | null
}

export interface ClassOption {
  id: string
  label: string
  name: string
  section: string
  year: string
  classSection: string
  deptName: string
  deptCode: string
  deptId: string
}

export interface DeptOption {
  id: string
  name: string
  code: string
}

export interface AdminStudentsData {
  students: Student[]
  classOptions: ClassOption[]
  deptOptions: DeptOption[]
}

export async function fetchAdminStudentsData(): Promise<AdminStudentsData> {
  const supabase = createClient()
  const [studentsRes, classesRes, deptsRes] = await Promise.all([
    supabase
      .from("students")
      .select(`
        id, roll_number, year, is_active, created_at, face_registered, is_approved, is_rejected,
        registration_photo_url, class_id, department_id,
        class:classes ( id, name, section, year, department:departments ( code, id, name ) ),
        user:users ( full_name, contact_email )
      `)
      .order("created_at", { ascending: false }),
    supabase
      .from("classes")
      .select("id, name, section, year, department:departments ( id, name, code )")
      .order("name"),
    supabase.from("departments").select("id, name, code").order("name"),
  ])

  if (studentsRes.error) throw studentsRes.error

  const students: Student[] = (studentsRes.data || []).map((s: any) => {
    const classData = s.class
    const deptCode = classData?.department?.code ?? s.department?.code ?? ""
    const classSection = classData ? `${deptCode || classData.name}-${classData.section}` : "—"
    const className = classData
      ? `${deptCode || classData.name}-${classData.section} · ${s.year}`
      : "Unassigned Cohort"
    const hasEmbedding = s.face_registered === true
    const isApproved = s.is_approved === true
    const isRejected = s.is_rejected === true

    const faceStatus: Student["faceStatus"] = isRejected
      ? "Rejected"
      : !hasEmbedding
      ? "None"
      : isApproved
      ? "Approved"
      : "Pending"

    return {
      id: s.id,
      name: s.user?.full_name ?? "Unknown",
      roll: s.roll_number,
      class: className,
      classSection,
      classId: s.class_id ?? classData?.id ?? "",
      departmentId: s.department_id ?? classData?.department?.id ?? "",
      departmentCode: deptCode,
      year: s.year,
      faceStatus,
      isActive: s.is_active ?? true,
      photoUrl: s.registration_photo_url ?? null,
      contactEmail: s.user?.contact_email ?? null,
    }
  })

  const classOptions: ClassOption[] = (classesRes.data || []).map((c: any) => ({
    id: c.id,
    label: `${c.department?.code ?? c.name}-${c.section} · ${c.year}`,
    name: c.name,
    section: c.section,
    year: c.year,
    classSection: `${c.department?.code ?? c.name}-${c.section}`,
    deptName: c.department?.name ?? "",
    deptCode: c.department?.code ?? "",
    deptId: c.department?.id ?? "",
  }))

  const deptOptions: DeptOption[] = (deptsRes.data || []).map((d: any) => ({
    id: d.id,
    name: d.name,
    code: d.code,
  }))

  return {
    students,
    classOptions,
    deptOptions,
  }
}

export function useAdminStudents() {
  return useQuery({
    queryKey: ["admin-students"],
    queryFn: fetchAdminStudentsData,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}
