import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { buildAbsenceDigestEmail, AbsenceItem } from "@/lib/email-templates/absence-digest"
import { resend, FROM_EMAIL } from "@/lib/resend"

// Helper function to parse Date local-safe to avoid timezone offsets
function formatDateLong(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number)
  const d = new Date(year, month - 1, day)
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const admin = createAdminClient()

    // Verify the caller is a teacher
    const { data: callerUser, error: callerError } = await admin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()

    if (callerError || !callerUser || callerUser.role !== "teacher") {
      return NextResponse.json({ error: "Forbidden: Only teachers can send absence digests" }, { status: 403 })
    }

    const body = await request.json()
    const { student_id, since_date } = body

    if (!student_id) {
      return NextResponse.json({ error: "Missing student_id" }, { status: 400 })
    }

    // Look up student details
    const { data: student, error: studentError } = await admin
      .from("students")
      .select(`
        id,
        roll_number,
        class_id,
        user:users (
          full_name,
          email,
          contact_email
        )
      `)
      .eq("id", student_id)
      .maybeSingle()

    if (studentError || !student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    // Fetch all attendance records to calculate overall attendance percentage
    const { data: attendanceRows, error: attendanceError } = await admin
      .from("period_attendance")
      .select(`
        status,
        session:attendance_sessions (
          id,
          session_date,
          subject:subjects ( name ),
          class:classes ( name, section ),
          period:periods ( period_number )
        )
      `)
      .eq("student_id", student_id)

    if (attendanceError) {
      console.error("Attendance query error:", attendanceError)
      return NextResponse.json({ error: "Failed to retrieve student attendance history" }, { status: 500 })
    }

    const validRows = (attendanceRows ?? []).filter(
      (row: any) => row.status === "present" || row.status === "absent"
    )

    const totalCount = validRows.length
    const presentCount = validRows.filter((row: any) => row.status === "present").length

    const attendancePercentage = totalCount > 0
      ? Math.round((presentCount / totalCount) * 100)
      : 100

    // Filter absences (where status is "absent" and session is populated)
    const rawAbsences = validRows.filter((row: any) => row.status === "absent" && row.session)

    // Filter absences by date if since_date is provided
    const filteredAbsences = since_date
      ? rawAbsences.filter((row: any) => row.session.session_date >= since_date)
      : rawAbsences

    if (filteredAbsences.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No absences recorded for this student within the specified period. Email not sent."
      })
    }

    // Map to email AbsenceItem format
    const absences: AbsenceItem[] = filteredAbsences.map((row: any) => {
      const session = row.session
      return {
        date: formatDateLong(session.session_date),
        subject: session.subject?.name ?? "Unknown Subject",
        period: session.period?.period_number ?? 0,
        className: session.class ? `${session.class.name}-${session.class.section}` : "Unknown",
      }
    })

    const studentUser = student.user as any
    const recipientEmail = studentUser?.contact_email || studentUser?.email

    if (!recipientEmail) {
      return NextResponse.json({ error: "Student has no email address configured" }, { status: 400 })
    }

    // Build the email
    const { subject, html } = buildAbsenceDigestEmail({
      studentName: studentUser?.full_name || "Student",
      absences,
      attendancePercentage,
    })

    // Send the email
    const { error: sendError } = await resend.emails.send({
      from: FROM_EMAIL,
      to: recipientEmail,
      subject,
      html,
    })

    if (sendError) {
      console.error("Resend API error:", sendError)
      return NextResponse.json({ error: `Failed to send email: ${sendError.message}` }, { status: 500 })
    }

    // Log the transaction
    await admin.from("system_logs").insert({
      performed_by: user.id,
      action_type: "notification",
      description: `Absence digest email sent to student ${student.roll_number} (${recipientEmail}). Attendance: ${attendancePercentage}%, Absences listed: ${absences.length}`,
    })

    return NextResponse.json({
      success: true,
      recipient: recipientEmail,
      attendancePercentage,
      absencesCount: absences.length,
    })
  } catch (e) {
    console.error("send-absence-digest error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
