import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

const DAY_NAMES = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

// GET — preview affected timetable slots before deletion
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const admin = createAdminClient()

    const { data, error } = await admin.rpc("get_timetable_slots_for_assignment", {
      p_assignment_id: id,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const slots = (data ?? []).map((s: any) => ({
      day: DAY_NAMES[s.day_of_week] ?? "Unknown",
      period: s.period_number,
      subject: s.subject_name,
      classLabel: s.class_label,
    }))

    return NextResponse.json({ count: slots.length, slots })
  } catch (e) {
    console.error("assignment preview error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE — atomically null timetable slots + delete assignment
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const admin = createAdminClient()

    // Fetch assignment details for the log message before deleting
    const { data: assignmentData } = await admin
      .from("teacher_assignments")
      .select(`teacher:teachers(user:users(full_name)), subject:subjects(name), class:classes(name, section)`)
      .eq("id", id)
      .maybeSingle()

    const { data: affectedCount, error } = await admin.rpc("delete_teacher_assignment_cascade", {
      p_assignment_id: id,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const teacherName = (assignmentData as any)?.teacher?.user?.full_name ?? "Unknown"
    const subjectName = (assignmentData as any)?.subject?.name ?? "Unknown"
    const classLabel = (assignmentData as any)?.class
      ? `${(assignmentData as any).class.name}-${(assignmentData as any).class.section}`
      : "Unknown"

    await admin.from("system_logs").insert({
      performed_by: user.id,
      action_type: "delete",
      description: `Assignment removed: ${teacherName} — ${subjectName} (${classLabel}). ${affectedCount} timetable slot(s) marked Unassigned.`,
    })

    return NextResponse.json({ success: true, affectedSlots: affectedCount })
  } catch (e) {
    console.error("assignment delete error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
