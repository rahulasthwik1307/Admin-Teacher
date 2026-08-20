import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { resend, FROM_EMAIL } from "@/lib/resend"
import { buildAbsenceEmail } from "@/lib/email-templates/absence-digest"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { periodAttendanceIds } = await request.json() as { periodAttendanceIds: string[] }
    if (!periodAttendanceIds || periodAttendanceIds.length === 0) {
      return NextResponse.json({ error: "No students selected" }, { status: 400 })
    }

    const admin = createAdminClient()

    // Re-verify server-side, must all belong to the SAME finalized session owned by this teacher
    const { data: records, error } = await admin
      .from("period_attendance")
      .select(`
        id, student_id, notified_at,
        student:students ( id, roll_number, user:users ( full_name, contact_email ) ),
        session:attendance_sessions (
          id, session_date, status, teacher_id, subject_id, class_id,
          subject:subjects ( name ),
          class:classes ( name, section ),
          period:periods ( period_number )
        )
      `)
      .in("id", periodAttendanceIds)
      .eq("status", "absent")
      .is("notified_at", null)

    if (error || !records || records.length === 0) {
      return NextResponse.json({ error: "No valid records found" }, { status: 400 })
    }

    const sessionIds = new Set(records.map((r: any) => r.session?.id))
    if (sessionIds.size !== 1) {
      return NextResponse.json({ error: "All selected students must belong to the same class session" }, { status: 400 })
    }
    const sessionInfo: any = (records[0] as any).session
    if (sessionInfo.status !== "finalized" || sessionInfo.teacher_id !== user.id) {
      return NextResponse.json({ error: "Session not eligible for notification" }, { status: 400 })
    }

    // Create the batch row
    const { data: batch, error: batchError } = await admin
      .from("notification_batches")
      .insert({
        teacher_id: user.id,
        session_id: sessionInfo.id,
        selected_count: records.length,
      })
      .select("id")
      .single()

    if (batchError || !batch) {
      return NextResponse.json({ error: "Failed to create notification batch" }, { status: 500 })
    }

    const dateFormatted = new Date(sessionInfo.session_date + "T00:00:00").toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric",
    })
    const classLabel = sessionInfo.class ? `${sessionInfo.class.name}-${sessionInfo.class.section}` : "Unknown"
    const periodNum = sessionInfo.period?.period_number ?? 0
    const subjectName = sessionInfo.subject?.name ?? "Unknown"

    let sentCount = 0, failedCount = 0, noEmailCount = 0
    const recipientRows: any[] = []

    for (const row of records) {
      const student: any = (row as any).student
      const studentName = student?.user?.full_name ?? "Student"
      const contactEmail = student?.user?.contact_email as string | null

      if (!contactEmail) {
        noEmailCount++
        recipientRows.push({
          batch_id: batch.id, student_id: row.student_id, period_attendance_id: row.id,
          recipient_email: null, status: "no_email",
        })
        continue
      }

      // Subject-level attendance — all finalized sessions for this subject+class, any teacher
      const { data: subjectSessions } = await admin
        .from("attendance_sessions")
        .select("id")
        .eq("subject_id", sessionInfo.subject_id)
        .eq("class_id", sessionInfo.class_id)
        .eq("status", "finalized")
      const subjectSessionIds = (subjectSessions ?? []).map((s: any) => s.id)

      const { data: subjectAtt } = subjectSessionIds.length > 0
        ? await admin.from("period_attendance").select("status")
            .eq("student_id", row.student_id).in("session_id", subjectSessionIds).in("status", ["present", "absent"])
        : { data: [] }
      const subjectTotal = subjectAtt?.length ?? 0
      const subjectAttended = (subjectAtt ?? []).filter((a: any) => a.status === "present").length

      // Overall attendance — all finalized sessions for this class, any subject
      const { data: overallSessions } = await admin
        .from("attendance_sessions").select("id")
        .eq("class_id", sessionInfo.class_id).eq("status", "finalized")
      const overallSessionIds = (overallSessions ?? []).map((s: any) => s.id)
      const { data: overallAtt } = overallSessionIds.length > 0
        ? await admin.from("period_attendance").select("status")
            .eq("student_id", row.student_id).in("session_id", overallSessionIds).in("status", ["present", "absent"])
        : { data: [] }
      const overallTotal = overallAtt?.length ?? 0
      const overallAttended = (overallAtt ?? []).filter((a: any) => a.status === "present").length

      const { subject, html } = buildAbsenceEmail({
        studentName, subjectName, date: dateFormatted, period: periodNum, className: classLabel,
        subjectAttended, subjectTotal, overallAttended, overallTotal,
      })

      try {
        const sendResult = await resend.emails.send({ from: FROM_EMAIL, to: contactEmail, subject, html })
        if (sendResult.error) {
          failedCount++
          recipientRows.push({
            batch_id: batch.id, student_id: row.student_id, period_attendance_id: row.id,
            recipient_email: contactEmail, status: "failed", failure_reason: sendResult.error.message,
          })
          continue
        }
        sentCount++
        recipientRows.push({
          batch_id: batch.id, student_id: row.student_id, period_attendance_id: row.id,
          recipient_email: contactEmail, status: "sent",
        })
        await admin.from("period_attendance")
          .update({ notified_at: new Date().toISOString(), notification_batch_id: batch.id })
          .eq("id", row.id)
      } catch (e: any) {
        failedCount++
        recipientRows.push({
          batch_id: batch.id, student_id: row.student_id, period_attendance_id: row.id,
          recipient_email: contactEmail, status: "failed", failure_reason: e?.message ?? "Send failed",
        })
      }
    }

    if (recipientRows.length > 0) {
      await admin.from("notification_batch_recipients").insert(recipientRows)
    }
    await admin.from("notification_batches")
      .update({ sent_count: sentCount, failed_count: failedCount, no_email_count: noEmailCount })
      .eq("id", batch.id)

    await admin.from("system_logs").insert({
      performed_by: user.id,
      action_type: "create",
      description: `Absence notification sent for ${subjectName} — ${classLabel} (${dateFormatted}): ${sentCount} sent, ${failedCount} failed, ${noEmailCount} no email`,
    })

    return NextResponse.json({
      success: sentCount > 0,
      batchId: batch.id,
      selectedCount: records.length,
      sentCount, failedCount, noEmailCount,
    })
  } catch (e) {
    console.error("send absence notifications error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
