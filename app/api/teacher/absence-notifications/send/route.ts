import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { resend, FROM_EMAIL } from "@/lib/resend"
import { buildConsolidatedAbsenceEmail } from "@/lib/email-templates/absence-digest"
import { getEligibleAbsences } from "@/lib/absence-notifications/eligible-dataset"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { periodAttendanceIds } = await request.json() as { periodAttendanceIds: string[] }
    if (!periodAttendanceIds || periodAttendanceIds.length === 0) {
      return NextResponse.json({ error: "No records selected" }, { status: 400 })
    }

    const admin = createAdminClient()

    // Re-derive the SAME canonical dataset server-side — never trust the client list blindly.
    // Only IDs present in this authoritative set, not already notified, are honored.
    const canonical = await getEligibleAbsences(admin, user.id)
    const canonicalById = new Map(canonical.map(a => [a.periodAttendanceId, a]))

    const validRecords = periodAttendanceIds
      .map(id => canonicalById.get(id))
      .filter((a): a is NonNullable<typeof a> => !!a && !a.alreadyNotified)

    if (validRecords.length === 0) {
      return NextResponse.json({ error: "None of the selected records are currently eligible" }, { status: 400 })
    }

    const byStudent = new Map<string, typeof validRecords>()
    for (const r of validRecords) {
      if (!byStudent.has(r.studentId)) byStudent.set(r.studentId, [])
      byStudent.get(r.studentId)!.push(r)
    }

    const { data: batch, error: batchError } = await admin
      .from("notification_batches")
      .insert({ teacher_id: user.id, selected_count: validRecords.length, student_count: byStudent.size })
      .select("id")
      .single()
    if (batchError || !batch) return NextResponse.json({ error: "Failed to create batch" }, { status: 500 })

    let sentCount = 0, failedCount = 0, noEmailCount = 0
    const recipientRows: any[] = []

    for (const [studentId, studentRecords] of byStudent.entries()) {
      const studentName = studentRecords[0].studentName
      const contactEmail = studentRecords[0].contactEmail
      const classId = studentRecords[0].classId

      if (!contactEmail) {
        noEmailCount++
        for (const r of studentRecords) {
          recipientRows.push({ batch_id: batch.id, student_id: studentId, period_attendance_id: r.periodAttendanceId, recipient_email: null, status: "no_email" })
        }
        continue
      }

      // Group this student's SELECTED records by subject
      const bySubject = new Map<string, typeof studentRecords>()
      for (const r of studentRecords) {
        if (!bySubject.has(r.subjectId)) bySubject.set(r.subjectId, [])
        bySubject.get(r.subjectId)!.push(r)
      }

      const subjectGroups = []
      for (const [subjId, subjRecords] of bySubject.entries()) {
        // Attendance percentage: FULL finalized history for this subject+class, independent of the dedup rule
        const { data: subjAtt } = await admin
          .from("period_attendance")
          .select("status, session:attendance_sessions!inner(subject_id, class_id, status)")
          .eq("student_id", studentId)
          .eq("session.subject_id", subjId)
          .eq("session.class_id", classId)
          .eq("session.status", "finalized")
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

      // Overall attendance: FULL finalized history for this class, independent of the dedup rule.
      // Joined via the FK relation instead of a giant .in(sessionIds) list — avoids exceeding
      // the request header size limit once a class has hundreds of sessions.
      const { data: overallAtt, error: overallAttErr } = await admin
        .from("period_attendance")
        .select("status, session:attendance_sessions!inner(class_id, status)")
        .eq("student_id", studentId)
        .eq("session.class_id", classId)
        .eq("session.status", "finalized")
        .in("status", ["present", "absent"])
      if (overallAttErr) console.error("[overall attendance error]", overallAttErr)
      const overallAttended = (overallAtt ?? []).filter((a: any) => a.status === "present").length
      const overallTotal = overallAtt?.length ?? 0

      const { subject, html } = buildConsolidatedAbsenceEmail({ studentName, subjectGroups, overallAttended, overallTotal })

      try {
        const sendResult = await resend.emails.send({ from: FROM_EMAIL, to: contactEmail, subject, html })
        if (sendResult.error) {
          failedCount++
          for (const r of studentRecords) {
            recipientRows.push({ batch_id: batch.id, student_id: studentId, period_attendance_id: r.periodAttendanceId, recipient_email: contactEmail, status: "failed", failure_reason: sendResult.error.message })
          }
          continue
        }
        sentCount++
        const nowIso = new Date().toISOString()
        for (const r of studentRecords) {
          recipientRows.push({ batch_id: batch.id, student_id: studentId, period_attendance_id: r.periodAttendanceId, recipient_email: contactEmail, status: "sent" })
        }
        await admin.from("period_attendance").update({ notified_at: nowIso, notification_batch_id: batch.id }).in("id", studentRecords.map(r => r.periodAttendanceId))
      } catch (e: any) {
        failedCount++
        for (const r of studentRecords) {
          recipientRows.push({ batch_id: batch.id, student_id: studentId, period_attendance_id: r.periodAttendanceId, recipient_email: contactEmail, status: "failed", failure_reason: e?.message ?? "Send failed" })
        }
      }
    }

    if (recipientRows.length > 0) await admin.from("notification_batch_recipients").insert(recipientRows)
    await admin.from("notification_batches").update({ sent_count: sentCount, failed_count: failedCount, no_email_count: noEmailCount }).eq("id", batch.id)

    await admin.from("system_logs").insert({
      performed_by: user.id, action_type: "create",
      description: `Absence notifications: ${sentCount} sent, ${failedCount} failed, ${noEmailCount} no email (${byStudent.size} students, ${validRecords.length} records)`,
    })

    return NextResponse.json({ success: sentCount > 0, batchId: batch.id, selectedCount: validRecords.length, studentCount: byStudent.size, sentCount, failedCount, noEmailCount })
  } catch (e) {
    console.error("send absence notifications error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
