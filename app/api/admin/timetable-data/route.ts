import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const [assignmentsRes, periodsRes, classesRes, timetableRes] = await Promise.all([
      supabase.from("teacher_assignments").select(`teacher_id, subject_id, class_id, teacher:teachers ( id, user:users ( full_name ) ), subject:subjects ( id, name ), class:classes ( id, name, section )`),
      supabase.from("periods").select("id, period_number, start_time, end_time").order("period_number"),
      supabase.from("classes").select("id, name, section").order("name"),
      supabase.from("timetables").select(`id, day_of_week, teacher:teachers ( id, user:users ( full_name ) ), subject:subjects ( name ), class:classes ( name, section ), period:periods ( period_number, start_time, end_time )`).order("day_of_week"),
    ])

    return NextResponse.json({
      assignments: assignmentsRes.data ?? [],
      periods: periodsRes.data ?? [],
      classes: classesRes.data ?? [],
      timetable: timetableRes.data ?? [],
    })
  } catch (e) {
    console.error("timetable-data API error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
