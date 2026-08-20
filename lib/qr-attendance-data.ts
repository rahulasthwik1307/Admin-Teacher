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
    if (!isNaN(date.getTime())) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    }
  } catch {
    // fallback
  }

  // Fallback for pre-formatted strings with seconds (e.g., "10:42:37 AM" -> "10:42 AM")
  const match = trimmed.match(/^(\d{1,2}:\d{2}):\d{2}(\s*[AaPp][Mm])?$/)
  if (match) {
    return `${match[1]}${match[2] ? ` ${match[2].trim().toUpperCase()}` : ""}`
  }

  return trimmed
}