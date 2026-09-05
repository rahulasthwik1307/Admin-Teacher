import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const [assignmentsRes, periodsRes, classesRes, timetableRes, teachersRes] = await Promise.all([
      supabase.from("teacher_assignments").select(`id, teacher_id, subject_id, class_id, year, teacher:teachers ( id, title, user:users ( full_name ) ), subject:subjects ( id, name, code ), class:classes ( id, name, section, year )`),
      supabase.from("periods").select("id, period_number, start_time, end_time").order("period_number"),
      supabase.from("classes").select("id, name, section, year").order("name"),
      supabase.from("timetables").select(`id, day_of_week, teacher_id, teacher_assignment_id, teacher:teachers ( id, title, user:users ( full_name ) ), subject:subjects ( id, name, code ), class:classes ( id, name, section, year ), period:periods ( period_number, start_time, end_time )`).order("day_of_week"),
      supabase.from("teachers").select(`id, title, user:users ( full_name )`),
    ])

    return NextResponse.json({
      assignments: assignmentsRes.data ?? [],
      periods: periodsRes.data ?? [],
      classes: classesRes.data ?? [],
      timetable: timetableRes.data ?? [],
      teachers: teachersRes.data ?? [],
    })
  } catch (e) {
    console.error("timetable-data API error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
