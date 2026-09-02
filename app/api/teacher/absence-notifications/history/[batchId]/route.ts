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
      .select(`id, sent_at, teacher_id, selected_count, student_count, sent_count, failed_count, no_email_count, teacher:teachers ( user:users ( full_name ) )`)
      .eq("id", batchId).maybeSingle()

    if (batchError || !batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 })
    if ((batch as any).teacher_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { data: recipients } = await supabase
      .from("notification_batch_recipients")
      .select(`
        student_id, recipient_email, status, failure_reason,
        student:students (
          roll_number,
          year,
          class:classes ( name, section, year, department:departments ( code ) ),
          user:users ( full_name )
        ),
        period_attendance:period_attendance_id (
          session:attendance_sessions (
            session_date,
            subject:subjects ( name ),
            class:classes ( name, section, year, department:departments ( code ) ),
            period:periods ( period_number, start_time, end_time )
          )
        )
      `)
      .eq("batch_id", batchId)

    const byStudent = new Map<string, any>()
    for (const r of (recipients ?? [])) {
      const st: any = r.student
      const pa: any = r.period_attendance
      const s = pa?.session
      const cls = st?.class || s?.class
      const dCode = cls?.department?.code || ""
      const year = st?.year || cls?.year || ""
      const section = cls?.section || ""
      const cohortLabel = `${dCode ? `${dCode} · ` : ""}${year ? `${year} — ` : ""}Section ${section || "A"}`

      if (!byStudent.has(r.student_id)) {
        byStudent.set(r.student_id, {
          studentName: st?.user?.full_name ?? "Unknown",
          rollNumber: st?.roll_number ?? "",
          departmentCode: dCode,
          year,
          section,
          cohortLabel,
          email: r.recipient_email,
          status: r.status,
          failureReason: r.failure_reason,
          records: [],
        })
      }
      byStudent.get(r.student_id)!.records.push({
        subjectName: s?.subject?.name ?? "Unknown",
        date: s?.session_date,
        periodNumber: s?.period?.period_number ?? 0,
        startTime: s?.period?.start_time ?? "",
        endTime: s?.period?.end_time ?? "",
      })
    }

    const b: any = batch
    return NextResponse.json({
      batchId: b.id, sentAt: b.sent_at, sentBy: b.teacher?.user?.full_name ?? "Unknown",
      selectedCount: b.selected_count, studentCount: b.student_count, sentCount: b.sent_count, failedCount: b.failed_count, noEmailCount: b.no_email_count,
      students: Array.from(byStudent.values()),
    })
  } catch (e) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
