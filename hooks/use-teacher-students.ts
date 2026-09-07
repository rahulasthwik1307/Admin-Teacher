"use client"

import { useQuery } from "@tanstack/react-query"

export interface TeacherStudent {
  id: string
  name: string
  roll: string
  class: string
  year: string
  faceStatus: "Approved" | "Pending" | "Rejected" | "None"
  photoUrl: string | null
}

export async function fetchTeacherStudentList(): Promise<TeacherStudent[]> {
  const res = await fetch("/api/teacher/student-list")
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.error || "Failed to load students.")
  }
  const data = await res.json()
  return (data.students || []) as TeacherStudent[]
}

export function useTeacherStudents() {
  return useQuery({
    queryKey: ["teacher-students"],
    queryFn: fetchTeacherStudentList,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}
