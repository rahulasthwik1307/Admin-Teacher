import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  console.log('service role key exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { searchParams } = new URL(req.url)
  const classId = searchParams.get("class_id")
  const sessionId = searchParams.get("session_id")

  if (!classId || !sessionId) {
    return NextResponse.json({ error: "class_id and session_id required" }, { status: 400 })
  }

  // 1. Fetch all students in the class
  const { data: classStudents, error: studentsErr } = await supabaseAdmin
    .from("students")
    .select("id, roll_number")
    .eq("class_id", classId)

  console.log('students error:', studentsErr)

  if (studentsErr || !classStudents || classStudents.length === 0) {
    return NextResponse.json({ students: [] })
  }

  // 2. Fetch names from users table for each student
  const nameMap = new Map<string, string>()
  await Promise.all(
    classStudents.map(async (s: any) => {
      const { data: userData } = await supabaseAdmin
        .from("users")
        .select("full_name")
        .eq("id", s.id)
        .single()
      if (userData?.full_name) {
        nameMap.set(s.id, userData.full_name)
      }
    })
  )

  // 3. Fetch attendance records for this session
  const { data: attendanceData, error: attendanceError } = await supabaseAdmin
    .from('period_attendance')
    .select('student_id, status')
    .eq('session_id', sessionId)

  console.log('attendance error:', attendanceError)
  console.log('attendance data:', JSON.stringify(attendanceData))

  const attendanceMap = new Map()
  if (attendanceData) {
    attendanceData.forEach((a: any) => attendanceMap.set(a.student_id, a))
  }

  // 4. Merge all results
  const students = classStudents.map((s: any) => {
    const att = attendanceMap.get(s.id)
    let status: string = "pending"
    let time: string | undefined = undefined

    if (att) {
      status = att.status
      if (att.marked_at) {
        time = new Date(att.marked_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }
    }

    const name = nameMap.get(s.id) || "Unknown Student"
    const initials = name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase()

    return {
      id: s.id,
      name,
      roll: s.roll_number,
      initials,
      status,
      time,
    }
  })

  // Sort: present first, then absent, then pending
  const order: Record<string, number> = { present: 0, absent: 1, pending: 2 }
  students.sort((a: any, b: any) => (order[a.status] ?? 2) - (order[b.status] ?? 2))

  console.log('merged students:', JSON.stringify(students))

  return NextResponse.json({ students })
}
