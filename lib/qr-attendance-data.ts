export type StudentStatus = "present" | "absent" | "failed" | "pending"

export interface Student {
  id: string
  name: string
  roll: string
  initials: string
  status: StudentStatus
  time?: string
  photoUrl?: string | null
}