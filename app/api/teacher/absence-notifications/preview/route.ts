import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { buildConsolidatedAbsenceEmail } from "@/lib/email-templates/absence-digest"
import { getEligibleAbsences } from "@/lib/absence-notifications/eligible-dataset"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { studentId, periodAttendanceIds } = await request.json() as { studentId: string; periodAttendanceIds: string[] }
    const admin = createAdminClient()
    const canonical = await getEligibleAbsences(admin, user.id)
    const canonicalById = new Map(canonical.map(a => [a.periodAttendanceId, a]))

    const records = periodAttendanceIds.map(id => canonicalById.get(id)).filter((a): a is NonNullable<typeof a> => !!a && a.studentId === studentId)
    if (records.length === 0) return NextResponse.json({ error: "No valid records" }, { status: 400 })

    const studentName = records[0].studentName
    const classId = records[0].classId

    const bySubject = new Map<string, typeof records>()
    for (const r of records) { if (!bySubject.has(r.subjectId)) bySubject.set(r.subjectId, []); bySubject.get(r.subjectId)!.push(r) }

    const subjectGroups = []
    for (const [subjId, subjRecords] of bySubject.entries()) {
      const { data: subjAtt } = await admin.from("period_attendance")
        .select("status, session:attendance_sessions!inner(subject_id, class_id, status)")
        .eq("student_id", studentId).eq("session.subject_id", subjId).eq("session.class_id", classId).eq("session.status", "finalized")
        .in("status", ["present", "absent"])
      subjectGroups.push({
        subjectName: subjRecords[0].subjectName,
        records: subjRecords.map(r => ({
          date: new Date(r.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          period: r.periodNumber, startTime: r.startTime, endTime: r.endTime,
        })),
        attended: (subjAtt ?? []).filter((a: any) => a.status === "present").length,
        total: subjAtt?.length ?? 0,
      })
    }

    const { data: overallAtt } = await admin.from("period_attendance")
      .select("status, session:attendance_sessions!inner(class_id, status)")
      .eq("student_id", studentId).eq("session.class_id", classId).eq("session.status", "finalized")
      .in("status", ["present", "absent"])
    const overallAttended = (overallAtt ?? []).filter((a: any) => a.status === "present").length
    const overallTotal = overallAtt?.length ?? 0

    const { subject, html } = buildConsolidatedAbsenceEmail({ studentName, subjectGroups, overallAttended, overallTotal })
    return NextResponse.json({ subject, html })
  } catch (e) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
