"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"

export type BiometricStatus = "Approved" | "Pending" | "Rejected" | "None"

export interface EnrolledStudent {
  id: string
  name: string
  roll: string
  classId: string
  className: string
  classSection: string
  cohortLabel: string
  deptId: string
  deptCode: string
  deptName: string
  year: string
  faceStatus: BiometricStatus
  isActive: boolean
  registrationPhoto: string | null
  createdAt: string
  contactEmail: string | null
}

export interface ClassOption {
  id: string
  label: string
  name: string
  section: string
  year: string
  classSection: string
  deptCode: string
  deptId: string
}

export interface DeptOption {
  id: string
  name: string
  code: string
}

export interface FaceApprovalsData {
  students: EnrolledStudent[]
  classOptions: ClassOption[]
  deptOptions: DeptOption[]
}

export async function fetchFaceApprovalsData(): Promise<FaceApprovalsData> {
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

  const students: EnrolledStudent[] = (studentsRes.data || []).map((s: any) => {
    const classData = s.class
    const deptCode = classData?.department?.code ?? s.department?.code ?? "N/A"
    const deptName = classData?.department?.name ?? s.department?.name ?? "Department"
    const classSection = classData?.section ? `${deptCode}-${classData.section}` : "—"
    const cohortLabel = classData?.section
      ? `${deptCode}-${classData.section} · ${s.year || classData.year}`
      : "Unassigned Cohort"
    const hasEmbedding = s.face_registered === true
    const isApproved = s.is_approved === true
    const isRejected = s.is_rejected === true

    // Strict 4-state lifecycle
    const faceStatus: BiometricStatus = isRejected
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
      classId: s.class_id ?? classData?.id ?? "",
      className: classData?.name ?? "",
      classSection,
      cohortLabel,
      deptId: s.department_id ?? classData?.department?.id ?? "",
      deptCode,
      deptName,
      year: s.year || classData?.year || "N/A",
      faceStatus,
      isActive: s.is_active ?? true,
      registrationPhoto: s.registration_photo_url ?? null,
      createdAt: s.created_at,
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

export function useFaceApprovals() {
  return useQuery({
    queryKey: ["admin-face-approvals"],
    queryFn: fetchFaceApprovalsData,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}
