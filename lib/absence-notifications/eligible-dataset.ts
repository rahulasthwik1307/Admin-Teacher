import { SupabaseClient } from "@supabase/supabase-js"

export interface EligibleAbsence {
  periodAttendanceId: string
  studentId: string
  studentName: string
  rollNumber: string
  year: string
  className: string
  contactEmail: string | null
  alreadyNotified: boolean
  sessionId: string
  subjectId: string
  subjectName: string
  classId: string
  periodId: string
  periodNumber: number
  startTime: string
  endTime: string
  date: string
}

/**
 * Canonical eligible-absence dataset for the Absence Notifications workflow.
 * Applies: teacher authorization, finalized-only sessions, latest-session-per-date
 * dedup (by subject+class+period+date, tiebreak on opened_at DESC).
 * Used identically by the pending list, selection validation, and email generation.
 */
export async function getEligibleAbsences(
  supabase: SupabaseClient,
  teacherId: string
): Promise<EligibleAbsence[]> {
  const { data, error } = await supabase
    .from("period_attendance")
    .select(`
      id, student_id, notified_at,
      student:students ( id, roll_number, year, class_id, user:users ( full_name, contact_email ) ),
      session:attendance_sessions!inner (
        id, session_date, status, teacher_id, opened_at, subject_id, class_id, period_id,
        subject:subjects ( id, name ),
        class:classes ( id, name, section ),
        period:periods ( id, period_number, start_time, end_time )
      )
    `)
    .eq("status", "absent")
    .eq("session.status", "finalized")
    .eq("session.teacher_id", teacherId)

  if (error || !data) return []

  // Group sessions by dedup key: date + subject + class + period
  // Keep only the session with the latest opened_at per key
  const sessionByKey = new Map<string, { sessionId: string; openedAt: string }>()
  for (const row of data) {
    const s: any = row.session
    const key = `${s.session_date}__${s.subject_id}__${s.class_id}__${s.period_id}`
    const existing = sessionByKey.get(key)
    if (!existing || s.opened_at > existing.openedAt) {
      sessionByKey.set(key, { sessionId: s.id, openedAt: s.opened_at })
    }
  }
  const winningSessionIds = new Set(Array.from(sessionByKey.values()).map(v => v.sessionId))

  const result: EligibleAbsence[] = []
  for (const row of data) {
    const s: any = row.session
    if (!winningSessionIds.has(s.id)) continue // superseded duplicate — excluded, not deleted
    const student: any = row.student
    result.push({
      periodAttendanceId: row.id,
      studentId: row.student_id,
      studentName: student?.user?.full_name ?? "Unknown",
      rollNumber: student?.roll_number ?? "",
      year: student?.year ?? "",
      className: s.class ? `${s.class.name}-${s.class.section}` : "Unknown",
      contactEmail: student?.user?.contact_email ?? null,
      alreadyNotified: row.notified_at !== null,
      sessionId: s.id,
      subjectId: s.subject_id,
      subjectName: s.subject?.name ?? "Unknown",
      classId: s.class_id,
      periodId: s.period_id,
      periodNumber: s.period?.period_number ?? 0,
      startTime: (s.period?.start_time ?? "").substring(0, 5),
      endTime: (s.period?.end_time ?? "").substring(0, 5),
      date: s.session_date,
    })
  }
  return result
}
