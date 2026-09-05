import { createClient } from "@supabase/supabase-js"
import fs from "fs"

const envContent = fs.readFileSync(".env.local", "utf8")
const env = {}
for (const line of envContent.split("\n")) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
  if (match) {
    let val = match[2] || ""
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1)
    env[match[1]] = val
  }
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function auditAnalytics() {
  console.log("=== AUDITING TEACHER ANALYTICS ===")
  const teacherId = "ef2dacca-6b84-4781-bbd6-05e94e785f89" // Devi

  // 1. Assignments
  const { data: assignments } = await supabase
    .from("teacher_assignments")
    .select(`
      id, subject_id, class_id,
      subjects ( id, name, code ),
      classes ( id, name, section, year, department_id, department:departments ( id, name, code ) )
    `)
    .eq("teacher_id", teacherId)

  console.log("\n--- TEACHER ASSIGNMENTS ---")
  console.table(assignments.map(a => ({
    asgnId: a.id,
    subject: a.subjects?.name,
    class: `${a.classes?.department?.code || a.classes?.name}-${a.classes?.section} (${a.classes?.year})`
  })))

  // 2. Finalized Sessions
  const { data: allSessions } = await supabase
    .from("attendance_sessions")
    .select("id, session_date, subject_id, class_id, status, period_id")
    .eq("teacher_id", teacherId)
    .eq("status", "finalized")
    .order("session_date", { ascending: false })

  console.log(`\n--- ALL FINALIZED SESSIONS COUNT: ${allSessions?.length} ---`)

  // 3. Period Attendance in Chunks
  const sessionIds = (allSessions || []).map(s => s.id)
  const CHUNK_SIZE = 50
  const chunks = []
  for (let i = 0; i < sessionIds.length; i += CHUNK_SIZE) {
    chunks.push(sessionIds.slice(i, i + CHUNK_SIZE))
  }

  const attResults = await Promise.all(
    chunks.map(chunk =>
      supabase
        .from("period_attendance")
        .select(`
          id, session_id, student_id, status,
          student:students ( id, roll_number, year, user:users ( full_name ) )
        `)
        .in("session_id", chunk)
        .in("status", ["present", "absent"])
    )
  )

  const attendance = attResults.flatMap(r => r.data || [])

  console.log(`\n--- TOTAL PERIOD ATTENDANCE ROWS: ${attendance.length} ---`)
  const presentCount = attendance.filter(a => a.status === "present").length
  const absentCount = attendance.filter(a => a.status === "absent").length
  console.log(`Present: ${presentCount}, Absent: ${absentCount}, Overall %: ${Math.round((presentCount / attendance.length) * 100)}%`)

  // 4. Test Periods: This Week, This Month, This Semester
  const now = new Date()
  const to = now.toISOString().split("T")[0]
  
  // This Week
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((day + 6) % 7))
  const thisWeekFrom = monday.toISOString().split("T")[0]

  // This Month
  const thisMonthFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]

  // This Semester
  const thisSemesterFrom = "2000-01-01"

  console.log(`\nDate Ranges (Today is ${to}):`)
  console.log(`This Week: ${thisWeekFrom} to ${to}`)
  console.log(`This Month: ${thisMonthFrom} to ${to}`)
  console.log(`This Semester: ${thisSemesterFrom} to ${to}`)

  for (const [pName, fromDate] of [["This Week", thisWeekFrom], ["This Month", thisMonthFrom], ["This Semester", thisSemesterFrom]]) {
    console.log(`\n================== PERIOD: ${pName} (${fromDate} to ${to}) ==================`)
    const filteredSessions = (allSessions || []).filter(s => s.session_date >= fromDate && s.session_date <= to)
    const filteredSessionIds = filteredSessions.map(s => s.id)
    const filteredAtt = attendance.filter(a => filteredSessionIds.includes(a.session_id))
    
    const pCount = filteredAtt.filter(a => a.status === "present").length
    const aCount = filteredAtt.filter(a => a.status === "absent").length
    const tot = filteredAtt.length
    const avg = tot > 0 ? Math.round((pCount / tot) * 100) : 0

    console.log(`Total Sessions: ${filteredSessions.length}`)
    console.log(`Attendance Rows: ${tot} (Present: ${pCount}, Absent: ${aCount}, Avg: ${avg}%)`)

    // Subject breakdown
    console.log(`\n--- Subject Overview ---`)
    for (const asgn of assignments) {
      const subSessions = filteredSessions.filter(s => s.subject_id === asgn.subject_id && s.class_id === asgn.class_id)
      const subSessionIds = subSessions.map(s => s.id)
      const subAtt = filteredAtt.filter(a => subSessionIds.includes(a.session_id))
      const subP = subAtt.filter(a => a.status === "present").length
      const subA = subAtt.filter(a => a.status === "absent").length
      const subTot = subAtt.length
      const subPct = subTot > 0 ? Math.round((subP / subTot) * 100) : 0
      console.log(`Subject: ${asgn.subjects?.name} (${asgn.classes?.name}-${asgn.classes?.section} ${asgn.classes?.year}): ${subSessions.length} classes, ${subP} present, ${subA} absent (${subPct}%)`)
    }

    // Students below 75%
    const studentSubPct = {}
    for (const row of filteredAtt) {
      const sess = filteredSessions.find(s => s.id === row.session_id)
      const key = `${row.student_id}__${sess?.subject_id}`
      if (!studentSubPct[key]) {
        const userObj = Array.isArray(row.student?.user) ? row.student.user[0] : row.student?.user
        studentSubPct[key] = {
          name: userObj?.full_name || "Unknown",
          roll: row.student?.roll_number,
          studentId: row.student_id,
          subjectId: sess?.subject_id,
          present: 0,
          total: 0
        }
      }
      studentSubPct[key].total++
      if (row.status === "present") studentSubPct[key].present++
    }

    const studentList = Object.values(studentSubPct).map(s => ({
      name: s.name,
      roll: s.roll,
      attended: s.present,
      total: s.total,
      pct: s.total > 0 ? Math.round((s.present / s.total) * 100) : 0
    }))

    const below75 = studentList.filter(s => s.pct < 75)
    const top90 = studentList.filter(s => s.pct >= 90)

    console.log(`\nStudents Below 75%: ${below75.length}`)
    if (below75.length > 0) console.table(below75)

    console.log(`\nTop Performers (>=90%): ${top90.length}`)
    if (top90.length > 0) console.table(top90)
  }
}

auditAnalytics()
