import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data, error } = await supabase
      .from("notification_batches")
      .select(`
        id, sent_at, selected_count, sent_count, failed_count, no_email_count,
        teacher:teachers ( user:users ( full_name ) ),
        session:attendance_sessions (
          session_date,
          subject:subjects ( name ),
          class:classes ( name, section ),
          period:periods ( period_number )
        )
      `)
      .eq("teacher_id", user.id)
      .order("sent_at", { ascending: false })
      .limit(50)

    if (error) return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 })

    const batches = (data ?? []).map((b: any) => ({
      batchId: b.id,
      sentAt: b.sent_at,
      selectedCount: b.selected_count,
      sentCount: b.sent_count,
      failedCount: b.failed_count,
      noEmailCount: b.no_email_count,
      sentBy: b.teacher?.user?.full_name ?? "Unknown",
      subjectName: b.session?.subject?.name ?? "Unknown",
      className: b.session?.class ? `${b.session.class.name}-${b.session.class.section}` : "Unknown",
      periodNumber: b.session?.period?.period_number ?? 0,
      date: b.session?.session_date,
    }))

    return NextResponse.json(batches)
  } catch (e) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
