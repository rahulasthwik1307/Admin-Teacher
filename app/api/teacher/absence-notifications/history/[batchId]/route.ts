import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: Promise<{ batchId: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { batchId } = await params

    const { data: batch, error: batchError } = await supabase
      .from("notification_batches")
      .select(`
        id, sent_at, teacher_id, selected_count, sent_count, failed_count, no_email_count,
        teacher:teachers ( user:users ( full_name ) ),
        session:attendance_sessions (
          session_date,
          subject:subjects ( name ),
          class:classes ( name, section ),
          period:periods ( period_number )
        )
      `)
      .eq("id", batchId)
      .maybeSingle()

    if (batchError || !batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 })
    if ((batch as any).teacher_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { data: recipients } = await supabase
      .from("notification_batch_recipients")
      .select(`
        id, recipient_email, status, failure_reason,
        student:students ( roll_number, user:users ( full_name ) )
      `)
      .eq("batch_id", batchId)
      .order("id")

    const b: any = batch
    return NextResponse.json({
      batchId: b.id,
      sentAt: b.sent_at,
      sentBy: b.teacher?.user?.full_name ?? "Unknown",
      subjectName: b.session?.subject?.name ?? "Unknown",
      className: b.session?.class ? `${b.session.class.name}-${b.session.class.section}` : "Unknown",
      periodNumber: b.session?.period?.period_number ?? 0,
      date: b.session?.session_date,
      selectedCount: b.selected_count, sentCount: b.sent_count, failedCount: b.failed_count, noEmailCount: b.no_email_count,
      recipients: (recipients ?? []).map((r: any) => ({
        studentName: r.student?.user?.full_name ?? "Unknown",
        rollNumber: r.student?.roll_number ?? "",
        email: r.recipient_email,
        status: r.status,
        failureReason: r.failure_reason,
      })),
    })
  } catch (e) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
