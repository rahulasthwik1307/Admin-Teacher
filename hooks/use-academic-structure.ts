"use client"

import { useQuery } from "@tanstack/react-query"

export interface AcademicStructureData {
  departments: any[]
  classes: any[]
  subjects: any[]
  periods: any[]
}

async function fetchAcademicStructure(): Promise<AcademicStructureData> {
  const res = await fetch("/api/admin/academic-structure-data")
  if (!res.ok) throw new Error("Failed to fetch academic structure")
  return res.json()
}

export function useAcademicStructure() {
  return useQuery<AcademicStructureData>({
    queryKey: ["admin-academic-structure"],
    queryFn: fetchAcademicStructure,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}
