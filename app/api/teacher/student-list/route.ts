import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
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

  if (studentsErr) {
    console.error("student-list: error fetching class students:", studentsErr)
  }

  if (studentsErr || !classStudents || classStudents.length === 0) {
    return NextResponse.json({ students: [] })
  }

  // 2. Fetch names from users table in a single bulk query
  const studentIds = classStudents.map((s: any) => s.id)
  const { data: usersData, error: usersErr } = await supabaseAdmin
    .from("users")
    .select("id, full_name")
    .in("id", studentIds)

  if (usersErr) {
    console.error("student-list: error fetching user names:", usersErr)
  }

  const nameMap = new Map<string, string>()
  if (usersData) {
    usersData.forEach((u: any) => {
      if (u.full_name) {
        nameMap.set(u.id, u.full_name)
      }
    })
  }

  // 3. Fetch attendance records for this session
  const { data: attendanceData, error: attendanceError } = await supabaseAdmin
    .from('period_attendance')
    .select('student_id, status, scanned_at, face_verified')
    .eq('session_id', sessionId)

  if (attendanceError) {
    console.error("student-list: error fetching attendance records:", attendanceError)
  }

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
      if (att.scanned_at) {
        time = att.scanned_at
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
  const order: Record<string, number> = { present: 0, absent: 1, pending: 2, failed: 3 }
  students.sort((a: any, b: any) => (order[a.status] ?? 2) - (order[b.status] ?? 2))

  return NextResponse.json({ students })
}
