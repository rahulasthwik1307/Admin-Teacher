import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

interface SlotInput {
  classId: string
  subjectId: string
  periodId: string
  sessionDate: string
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const { slots, mode, absenteeIds } = body as {
      slots: SlotInput[]
      mode: "present" | "absent" | "except"
      absenteeIds?: string[]
    }

    if (!slots || slots.length === 0) {
      return NextResponse.json({ error: "No slots provided" }, { status: 400 })
    }
    if (!["present", "absent", "except"].includes(mode)) {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 })
    }
    if (mode === "except" && (!absenteeIds || !Array.isArray(absenteeIds))) {
      return NextResponse.json({ error: "absenteeIds required for except mode" }, { status: 400 })
    }

    const admin = createAdminClient()
    const now = new Date().toISOString()
    const absenteeSet = new Set(absenteeIds ?? [])

    const results: { slot: SlotInput; success: boolean; error?: string }[] = []
    let successCount = 0

    for (const slot of slots) {
      const { classId, subjectId, periodId, sessionDate } = slot

      if (!classId || !subjectId || !periodId || !sessionDate) {
        results.push({ slot, success: false, error: "Missing fields" })
        continue
      }

      // Check for existing session — same guard as the single-slot route
      const { data: existing } = await admin
        .from("attendance_sessions")
        .select("id")
        .eq("teacher_id", user.id)
        .eq("class_id", classId)
        .eq("subject_id", subjectId)
        .eq("period_id", periodId)
        .eq("session_date", sessionDate)
        .maybeSingle()

      if (existing) {
        results.push({ slot, success: false, error: "Session already exists" })
        continue
      }

      // Fetch roster server-side — never trust a client-supplied list.
      // Also bound by enrollment date: a student created after this slot's
      // session date wasn't yet enrolled and must not appear in this
      // attendance record, per-slot, since different slots in a bulk
      // action can carry different dates.
      const { data: roster, error: rosterError } = await admin
        .from("students")
        .select("id")
        .eq("class_id", classId)
        .eq("is_approved", true)
        .lte("created_at", `${sessionDate}T23:59:59`)

      if (rosterError || !roster || roster.length === 0) {
        results.push({ slot, success: false, error: "No approved students enrolled by this date" })
        continue
      }

      const attendanceRows = roster.map((s: any) => {
        let status: "present" | "absent"
        if (mode === "present") status = "present"
        else if (mode === "absent") status = "absent"
        else status = absenteeSet.has(s.id) ? "absent" : "present"
        return { student_id: s.id, status }
      })

      const { data: session, error: sessionError } = await admin
        .from("attendance_sessions")
        .insert({
          teacher_id: user.id,
          class_id: classId,
          subject_id: subjectId,
          period_id: periodId,
          session_date: sessionDate,
          status: "finalized",
          opened_at: now,
          finalized_at: now,
        })
        .select("id")
        .single()

      if (sessionError || !session) {
        results.push({ slot, success: false, error: "Failed to create session" })
        continue
      }

      const { error: attendanceError } = await admin
        .from("period_attendance")
        .insert(attendanceRows.map((r) => ({ session_id: session.id, ...r })))

      if (attendanceError) {
        await admin.from("attendance_sessions").delete().eq("id", session.id)
        results.push({ slot, success: false, error: "Failed to save attendance" })
        continue
      }

      results.push({ slot, success: true })
      successCount++
    }

    if (successCount > 0) {
      await admin.from("system_logs").insert({
        performed_by: user.id,
        action_type: "create",
        description: `Bulk missed attendance filled for ${successCount} slot(s) — mode: ${mode}`,
      })
    }

    return NextResponse.json({
      success: successCount > 0,
      totalRequested: slots.length,
      successCount,
      failedCount: slots.length - successCount,
      results,
    })
  } catch (e) {
    console.error("bulk-save-missed-attendance error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
