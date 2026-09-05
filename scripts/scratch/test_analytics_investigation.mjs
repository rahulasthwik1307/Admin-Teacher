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

async function investigate() {
  const teacherId = "ef2dacca-6b84-4781-bbd6-05e94e785f89" // Devi

  // 1. Find Rahul in students table
  const { data: students } = await supabase
    .from("students")
    .select("id, roll_number, year, user:users(full_name)")
  
  const rahul = students.find(s => s.roll_number === "227Z1A6755")
  console.log("Student Rahul:", rahul)

  // 2. Find Subjects
  const { data: subjects } = await supabase.from("subjects").select("id, name, code")
  const mlSubject = subjects.find(s => s.name.toLowerCase().includes("machine learning"))
  const cnSubject = subjects.find(s => s.name.toLowerCase().includes("computer networks"))

  console.log("ML Subject ID:", mlSubject?.id)
  console.log("CN Subject ID:", cnSubject?.id)

  // 3. Rahul's ALL-TIME attendance in Machine Learning
  // All finalized ML sessions for Devi
  const { data: mlSessionsAllTime } = await supabase
    .from("attendance_sessions")
    .select("id, session_date, subject_id, class_id")
    .eq("teacher_id", teacherId)
    .eq("subject_id", mlSubject.id)
    .eq("status", "finalized")

  const mlSessionIdsAll = mlSessionsAllTime.map(s => s.id)

  const CHUNK_SIZE = 50
  const chunks = []
  for (let i = 0; i < mlSessionIdsAll.length; i += CHUNK_SIZE) {
    chunks.push(mlSessionIdsAll.slice(i, i + CHUNK_SIZE))
  }

  const mlAttResults = await Promise.all(
    chunks.map(chunk =>
      supabase
        .from("period_attendance")
        .select("id, session_id, student_id, status")
        .eq("student_id", rahul.id)
        .in("session_id", chunk)
    )
  )

  const rahulMLRows = mlAttResults.flatMap(r => r.data || [])
  const rahulMLPresent = rahulMLRows.filter(r => r.status === "present").length
  const rahulMLAbsent = rahulMLRows.filter(r => r.status === "absent").length
  const rahulMLTotal = rahulMLRows.length
  const rahulMLPct = rahulMLTotal > 0 ? Math.round((rahulMLPresent / rahulMLTotal) * 100) : 0

  console.log(`\n=== RAHUL ALL-TIME MACHINE LEARNING ATTENDANCE (STUDENT APP / THIS SEMESTER) ===`)
  console.log(`Total Classes Recorded: ${rahulMLTotal}`)
  console.log(`Classes Attended: ${rahulMLPresent}`)
  console.log(`Classes Absent: ${rahulMLAbsent}`)
  console.log(`Percentage: ${rahulMLPct}%  (Calculated: ${rahulMLPresent} / ${rahulMLTotal} = ${(rahulMLPresent/rahulMLTotal)*100}%)`)

  // 4. Rahul's "THIS WEEK" attendance in Machine Learning
  // This Week sessions (from 2026-08-31 to 2026-09-03)
  const mlSessionsThisWeek = mlSessionsAllTime.filter(s => s.session_date >= "2026-08-31" && s.session_date <= "2026-09-03")
  const mlSessionIdsThisWeek = mlSessionsThisWeek.map(s => s.id)

  const rahulMLThisWeekRows = rahulMLRows.filter(r => mlSessionIdsThisWeek.includes(r.session_id))
  const rahulMLThisWeekPresent = rahulMLThisWeekRows.filter(r => r.status === "present").length
  const rahulMLThisWeekTotal = rahulMLThisWeekRows.length
  const rahulMLThisWeekPct = rahulMLThisWeekTotal > 0 ? Math.round((rahulMLThisWeekPresent / rahulMLThisWeekTotal) * 100) : 0

  console.log(`\n=== RAHUL 'THIS WEEK' MACHINE LEARNING ATTENDANCE (TEACHER ANALYTICS: THIS WEEK TAB) ===`)
  console.log(`Classes Held This Week (Aug 31 - Sep 3): ${mlSessionsThisWeek.length}`)
  console.log(`Rahul Classes Recorded: ${rahulMLThisWeekTotal}`)
  console.log(`Rahul Attended: ${rahulMLThisWeekPresent}`)
  console.log(`Rahul This Week Percentage: ${rahulMLThisWeekPct}%`)

  // 5. Check Shashank in This Week vs All-Time
  const shashank = students.find(s => s.roll_number === "227Z1A6775")
  const shashankMLThisWeekRows = (await supabase
    .from("period_attendance")
    .select("id, status")
    .eq("student_id", shashank.id)
    .in("session_id", mlSessionIdsThisWeek)
  ).data || []
  const shashankMLPresentThisWeek = shashankMLThisWeekRows.filter(r => r.status === "present").length

  console.log(`\n=== SHASHANK 'THIS WEEK' MACHINE LEARNING ATTENDANCE ===`)
  console.log(`Shashank Attended: ${shashankMLPresentThisWeek} / ${shashankMLThisWeekRows.length} = ${Math.round((shashankMLPresentThisWeek/shashankMLThisWeekRows.length)*100)}%`)

  // 6. Breakdown of Subject Overview for This Week (89%, 60%, 75%)
  console.log(`\n=== SUBJECT OVERVIEW BREAKDOWN FOR THIS WEEK (Aug 31 - Sep 3) ===`)
  const { data: weekSessions } = await supabase
    .from("attendance_sessions")
    .select("id, session_date, subject_id, class_id")
    .eq("teacher_id", teacherId)
    .eq("status", "finalized")
    .gte("session_date", "2026-08-31")
    .lte("session_date", "2026-09-03")

  const { data: weekAtt } = await supabase
    .from("period_attendance")
    .select("session_id, status, student_id")
    .in("session_id", weekSessions.map(s => s.id))
    .in("status", ["present", "absent"])

  // Machine Learning (4th Year)
  const mlWeekSessions = weekSessions.filter(s => s.subject_id === mlSubject.id)
  const mlWeekAtt = weekAtt.filter(a => mlWeekSessions.map(s => s.id).includes(a.session_id))
  const mlWeekPres = mlWeekAtt.filter(a => a.status === "present").length
  const mlWeekAbs = mlWeekAtt.filter(a => a.status === "absent").length
  const mlWeekTot = mlWeekAtt.length
  console.log(`1. Machine Learning (4th Year): ${mlWeekSessions.length} sessions, ${mlWeekPres} present, ${mlWeekAbs} absent. Math: (${mlWeekPres} / ${mlWeekTot}) * 100 = ${(mlWeekPres/mlWeekTot)*100}% -> Rounds to ${Math.round((mlWeekPres/mlWeekTot)*100)}%`)

  // Computer Networks (4th Year)
  const { data: assignments } = await supabase.from("teacher_assignments").select("id, subject_id, class_id, classes(id, name, section, year)").eq("teacher_id", teacherId)
  const cn4thAsgn = assignments.find(a => a.subject_id === cnSubject.id && a.classes.year === "4th Year")
  const cn1stAsgn = assignments.find(a => a.subject_id === cnSubject.id && a.classes.year === "1st Year")

  const cn4thSessions = weekSessions.filter(s => s.subject_id === cnSubject.id && s.class_id === cn4thAsgn.class_id)
  const cn4thAtt = weekAtt.filter(a => cn4thSessions.map(s => s.id).includes(a.session_id))
  const cn4thPres = cn4thAtt.filter(a => a.status === "present").length
  const cn4thAbs = cn4thAtt.filter(a => a.status === "absent").length
  const cn4thTot = cn4thAtt.length
  console.log(`2. Computer Networks (4th Year): ${cn4thSessions.length} sessions, ${cn4thPres} present, ${cn4thAbs} absent. Math: (${cn4thPres} / ${cn4thTot}) * 100 = ${(cn4thPres/cn4thTot)*100}% -> Rounds to ${Math.round((cn4thPres/cn4thTot)*100)}%`)

  // Computer Networks (1st Year)
  const cn1stSessions = weekSessions.filter(s => s.subject_id === cnSubject.id && s.class_id === cn1stAsgn.class_id)
  const cn1stAtt = weekAtt.filter(a => cn1stSessions.map(s => s.id).includes(a.session_id))
  const cn1stPres = cn1stAtt.filter(a => a.status === "present").length
  const cn1stAbs = cn1stAtt.filter(a => a.status === "absent").length
  const cn1stTot = cn1stAtt.length
  console.log(`3. Computer Networks (1st Year): ${cn1stSessions.length} sessions, ${cn1stPres} present, ${cn1stAbs} absent. Math: (${cn1stPres} / ${cn1stTot}) * 100 = ${(cn1stPres/cn1stTot)*100}% -> Rounds to ${Math.round((cn1stPres/cn1stTot)*100)}%`)

  // 7. Last 8 Sessions Bar Chart
  console.log(`\n=== LAST 8 SESSIONS BAR CHART DATA ===`)
  const last8 = [...weekSessions].sort((a,b) => new Date(b.session_date) - new Date(a.session_date)).slice(0, 8).reverse()
  for (const s of last8) {
    const sAtt = weekAtt.filter(a => a.session_id === s.id)
    const sPres = sAtt.filter(a => a.status === "present").length
    const sTot = sAtt.length
    const sPct = sTot > 0 ? Math.round((sPres/sTot)*100) : 0
    console.log(`Session ${s.id} on ${s.session_date}: ${sPres}/${sTot} present = ${sPct}%`)
  }
}

investigate()
