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

export function formatScanTime(timeStr?: string | null): string {
  if (!timeStr || typeof timeStr !== "string") return ""
  const trimmed = timeStr.trim()
  if (!trimmed) return ""

  try {
    const date = new Date(trimmed)
    if (isNaN(date.getTime())) return ""
    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  } catch {
    return ""
  }
}