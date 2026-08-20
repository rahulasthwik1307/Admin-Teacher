import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { resend, FROM_EMAIL } from "@/lib/resend"
import { buildAbsenceDigestEmail } from "@/lib/email-templates/absence-digest"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const { periodAttendanceIds } = body as { periodAttendanceIds: string[] }

    if (!periodAttendanceIds || periodAttendanceIds.length === 0) {
      return NextResponse.json({ error: "No records selected" }, { status: 400 })
    }

    const admin = createAdminClient()

    // Re-verify each record server-side — never trust the client's list blindly
    const { data: records, error } = await admin
      .from("period_attendance")
      .select(`
        id, student_id, notified_at,
        student:students ( id, roll_number, user:users ( full_name, contact_email ) ),
        session:attendance_sessions (
          id, session_date, status, teacher_id,
          subject:subjects ( name ),
          class:classes ( name, section ),
          period:periods ( period_number )
        )
      `)
      .in("id", periodAttendanceIds)
      .eq("status", "absent")
      .is("notified_at", null)

    if (error || !records) {
      return NextResponse.json({ error: "Failed to fetch records" }, { status: 500 })
    }

    // Enforce this teacher only notifies their own finalized sessions
    const validRecords = records.filter(
      (r: any) => r.session?.status === "finalized" && r.session?.teacher_id === user.id
    )

    // Group by student
    const byStudent = new Map<string, any[]>()
    for (const r of validRecords) {
      const sid = r.student_id
      if (!byStudent.has(sid)) byStudent.set(sid, [])
      byStudent.get(sid)!.push(r)
    }

    const batchId = crypto.randomUUID()
    const results: { studentId: string; studentName: string; success: boolean; reason?: string }[] = []

    for (const [studentId, rows] of byStudent.entries()) {
      const student = (rows[0] as any).student
      const studentName = student?.user?.full_name ?? "Student"
      const contactEmail = student?.user?.contact_email

      if (!contactEmail) {
        results.push({ studentId, studentName, success: false, reason: "No contact email configured" })
        continue
      }

      // Calculate current finalized attendance percentage for this student
      const { data: allFinalized } = await admin
        .from("period_attendance")
        .select("status, session:attendance_sessions!inner(status)")
        .eq("student_id", studentId)
        .eq("session.status", "finalized")
        .in("status", ["present", "absent"])

      const total = allFinalized?.length ?? 0
      const present = (allFinalized ?? []).filter((r: any) => r.status === "present").length
      const pct = total > 0 ? Math.round((present / total) * 100) : 0

      const absences = rows.map((r: any) => ({
        date: new Date(r.session.session_date + "T00:00:00").toLocaleDateString("en-US", {
          month: "long", day: "numeric", year: "numeric",
        }),
        subject: r.session?.subject?.name ?? "Unknown",
        period: r.session?.period?.period_number ?? 0,
        className: r.session?.class ? `${r.session.class.name}-${r.session.class.section}` : "Unknown",
      }))

      const { subject, html } = buildAbsenceDigestEmail({
        studentName,
        absences,
        attendancePercentage: pct,
      })

      try {
        const sendResult = await resend.emails.send({
          from: FROM_EMAIL,
          to: contactEmail,
          subject,
          html,
        })

        if (sendResult.error) {
          results.push({ studentId, studentName, success: false, reason: sendResult.error.message })
          continue
        }

        // Mark all rows for this student as notified
        const rowIds = rows.map((r: any) => r.id)
        await admin
          .from("period_attendance")
          .update({ notified_at: new Date().toISOString(), notification_batch_id: batchId })
          .in("id", rowIds)

        results.push({ studentId, studentName, success: true })

        await admin.from("system_logs").insert({
          performed_by: user.id,
          action_type: "create",
          description: `Absence notification sent to ${studentName} (${absences.length} absence(s)) — recipient: ${contactEmail}`,
        })
      } catch (sendError: any) {
        results.push({ studentId, studentName, success: false, reason: sendError?.message ?? "Send failed" })
      }
    }

    const successCount = results.filter((r) => r.success).length
    return NextResponse.json({
      success: successCount > 0,
      totalStudents: byStudent.size,
      successCount,
      failedCount: byStudent.size - successCount,
      results,
    })
  } catch (e) {
    console.error("send absence notifications error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
