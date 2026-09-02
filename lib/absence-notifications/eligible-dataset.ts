import { SupabaseClient } from "@supabase/supabase-js"

export interface EligibleAbsence {
  periodAttendanceId: string
  studentId: string
  studentName: string
  rollNumber: string
  year: string
  className: string
  section: string
  departmentCode: string
  cohortLabel: string
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
  overallAttendancePct: number
  overallAttended: number
  overallTotalClasses: number
  subjectAttendancePct: number
  subjectAttended: number
  subjectTotalClasses: number
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
        class:classes ( id, name, section, year, department:departments(code, name) ),
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

  // Compute overall & subject-level attendance % per unique student — used for severity and course badges.
  // Joined via FK relation (not .in(sessionIds)) to avoid header-overflow issues.
  const uniqueStudentClassPairs = new Map<string, string>() // studentId -> classId
  for (const row of data) {
    const student: any = row.student
    if (student?.id && student?.class_id) uniqueStudentClassPairs.set(student.id, student.class_id)
  }

  const attendanceStatsByStudent = new Map<
    string,
    {
      overallAttended: number
      overallTotal: number
      overallPct: number
      subjects: Map<string, { attended: number; total: number; pct: number }>
    }
  >()

  for (const [studentId, classId] of uniqueStudentClassPairs.entries()) {
    const { data: att } = await supabase
      .from("period_attendance")
      .select("status, session:attendance_sessions!inner(subject_id, class_id, status)")
      .eq("student_id", studentId)
      .eq("session.class_id", classId)
      .eq("session.status", "finalized")
      .in("status", ["present", "absent"])

    const records = att ?? []
    const overallTotal = records.length
    const overallAttended = records.filter((a: any) => a.status === "present").length
    const overallPct = overallTotal > 0 ? Math.round((overallAttended / overallTotal) * 100) : 100

    const subjectsMap = new Map<string, { attended: number; total: number; pct: number }>()
    for (const r of records) {
      const subjId = (r.session as any)?.subject_id
      if (!subjId) continue
      if (!subjectsMap.has(subjId)) {
        subjectsMap.set(subjId, { attended: 0, total: 0, pct: 100 })
      }
      const sStat = subjectsMap.get(subjId)!
      sStat.total += 1
      if (r.status === "present") {
        sStat.attended += 1
      }
    }

    for (const [, sStat] of subjectsMap.entries()) {
      sStat.pct = sStat.total > 0 ? Math.round((sStat.attended / sStat.total) * 100) : 100
    }

    attendanceStatsByStudent.set(studentId, {
      overallAttended,
      overallTotal,
      overallPct,
      subjects: subjectsMap,
    })
  }

  const result: EligibleAbsence[] = []
  for (const row of data) {
    const s: any = row.session
    if (!winningSessionIds.has(s.id)) continue // superseded duplicate — excluded, not deleted
    const student: any = row.student
    const yearStr = s.class?.year ?? student?.year ?? ""
    const sectionStr = s.class?.section ?? ""
    const deptCode = s.class?.department?.code ?? s.class?.name ?? ""
    const deptPrefix = deptCode ? `${deptCode} · ` : ""
    const cohortLabel = yearStr && sectionStr
      ? `${deptPrefix}${yearStr} — Section ${sectionStr}`
      : s.class ? `${deptPrefix}${s.class.name}-${s.class.section} · ${yearStr}` : `${deptPrefix}Class`

    const studentStats = attendanceStatsByStudent.get(row.student_id)
    const subjStat = studentStats?.subjects.get(s.subject_id)

    result.push({
      periodAttendanceId: row.id,
      studentId: row.student_id,
      studentName: student?.user?.full_name ?? "Unknown",
      rollNumber: student?.roll_number ?? "",
      year: yearStr,
      className: s.class?.name ?? "Unknown",
      section: sectionStr,
      departmentCode: deptCode,
      cohortLabel: cohortLabel,
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
      overallAttendancePct: studentStats?.overallPct ?? 100,
      overallAttended: studentStats?.overallAttended ?? 0,
      overallTotalClasses: studentStats?.overallTotal ?? 0,
      subjectAttendancePct: subjStat?.pct ?? 100,
      subjectAttended: subjStat?.attended ?? 0,
      subjectTotalClasses: subjStat?.total ?? 0,
    })
  }
  return result
}
