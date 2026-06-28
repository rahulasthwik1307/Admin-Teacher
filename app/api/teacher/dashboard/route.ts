import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const teacherId = user.id
    const today = new Date().toISOString().split("T")[0]

    // 1. Get teacher assignments with class + subject info in one query
    const { data: assignments } = await supabase
      .from("teacher_assignments")
      .select(`
        id, subject_id, class_id,
        subjects ( name ),
        classes ( name, section )
      `)
      .eq("teacher_id", teacherId)

    const classIds = [...new Set((assignments ?? []).map((a: any) => a.class_id))]
    const subjectIds = [...new Set((assignments ?? []).map((a: any) => a.subject_id))]

    // 2. Run remaining queries in parallel — no sequential waterfalls
    const [
      studentsResult,
      todaySessionsResult,
      activeSessionsResult,
      lastSessionsResult,
      finalizedSessionsResult,
      openedSessionsResult,
      recentStudentsResult,
    ] = await Promise.all([
      // Total students across teacher's classes
      classIds.length > 0
        ? supabase
            .from("students")
            .select("id, class_id", { count: "exact" })
            .in("class_id", classIds)
            .eq("is_active", true)
        : Promise.resolve({ data: [], count: 0 }),

      // Today's sessions
      supabase
        .from("attendance_sessions")
        .select(`
          id, subject_id, class_id, status, opened_at,
          subjects ( name ),
          classes ( name, section )
        `)
        .eq("teacher_id", teacherId)
        .eq("session_date", today),

      // Active session count
      supabase
        .from("attendance_sessions")
        .select("id", { count: "exact", head: true })
        .eq("teacher_id", teacherId)
        .eq("status", "active"),

      // Last finalized session per assignment (for MyClasses)
      supabase
        .from("attendance_sessions")
        .select("teacher_id, subject_id, class_id, session_date")
        .eq("teacher_id", teacherId)
        .eq("status", "finalized")
        .order("session_date", { ascending: false })
        .limit(50),

      // Recent finalized sessions for activity feed
      supabase
        .from("attendance_sessions")
        .select(`id, finalized_at, subjects ( name ), classes ( name, section )`)
        .eq("teacher_id", teacherId)
        .eq("status", "finalized")
        .not("finalized_at", "is", null)
        .order("finalized_at", { ascending: false })
        .limit(5),

      // Recent opened sessions for activity feed
      supabase
        .from("attendance_sessions")
        .select(`id, opened_at, subjects ( name ), classes ( name, section )`)
        .eq("teacher_id", teacherId)
        .not("opened_at", "is", null)
        .order("opened_at", { ascending: false })
        .limit(5),

      // Recent students created by teacher
      supabase
        .from("students")
        .select(`id, created_at, updated_at, is_approved, users ( full_name )`)
        .eq("created_by", teacherId)
        .order("created_at", { ascending: false })
        .limit(10),
    ])

    // 3. Today's session IDs for attendance count
    const todaySessions = todaySessionsResult.data ?? []
    const todaySessionIds = todaySessions.map((s: any) => s.id)

    // 4. Get today's present count and per-session student counts in parallel
    const [todayPresentResult, sessionStudentCounts] = await Promise.all([
      todaySessionIds.length > 0
        ? supabase
            .from("period_attendance")
            .select("id, session_id", { count: "exact" })
            .in("session_id", todaySessionIds)
            .eq("status", "present")
        : Promise.resolve({ data: [], count: 0 }),

      todaySessions.length > 0
        ? supabase
            .from("students")
            .select("id, class_id")
            .in("class_id", todaySessions.map((s: any) => s.class_id))
            .eq("is_active", true)
        : Promise.resolve({ data: [] }),
    ])

    // 5. Build MyClasses data — student counts from already-fetched students
    const allStudents = studentsResult.data ?? []
    const studentsByClass = new Map<string, number>()
    for (const s of allStudents) {
      studentsByClass.set(s.class_id, (studentsByClass.get(s.class_id) ?? 0) + 1)
    }

    // Last session per assignment from already-fetched sessions
    const lastSessions = lastSessionsResult.data ?? []
    const lastSessionMap = new Map<string, string>()
    for (const s of lastSessions) {
      const key = `${s.subject_id}__${s.class_id}`
      if (!lastSessionMap.has(key)) {
        lastSessionMap.set(key, s.session_date)
      }
    }

    const myClasses = (assignments ?? []).map((asgn: any) => {
      const key = `${asgn.subject_id}__${asgn.class_id}`
      const lastDate = lastSessionMap.get(key)
      let lastAttendance = "No sessions yet"
      if (lastDate) {
        const d = new Date(lastDate + "T00:00:00")
        lastAttendance = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      }
      return {
        key: asgn.id,
        subject: asgn.subjects?.name ?? "Unknown",
        className: asgn.classes?.name ?? "Unknown",
        section: asgn.classes?.section ?? "",
        students: studentsByClass.get(asgn.class_id) ?? 0,
        lastAttendance,
      }
    })

    // 6. Build today attendance summary — student counts from already-fetched data
    const sessionStudents = sessionStudentCounts.data ?? []
    const studentCountByClass = new Map<string, number>()
    for (const s of sessionStudents) {
      studentCountByClass.set(s.class_id, (studentCountByClass.get(s.class_id) ?? 0) + 1)
    }

    const presentBySession = new Map<string, number>()
    for (const p of (todayPresentResult.data ?? [])) {
      presentBySession.set(p.session_id, (presentBySession.get(p.session_id) ?? 0) + 1)
    }

    const dedupeMap = new Map<string, any>()
    for (const sess of todaySessions) {
      const dedupeKey = `${sess.subject_id}__${sess.class_id}`
      const existing = dedupeMap.get(dedupeKey)
      if (!existing || sess.opened_at > existing.opened_at) {
        dedupeMap.set(dedupeKey, sess)
      }
    }

    const todayAttendance = Array.from(dedupeMap.values()).map((sess: any) => {
      const sectionName = sess.classes ? `${sess.classes.name}-${sess.classes.section}` : "Unknown"
      const subjectName = sess.subjects?.name ?? "Unknown"
      return {
        id: sess.id,
        name: `${subjectName} (${sectionName})`,
        present: presentBySession.get(sess.id) ?? 0,
        total: studentCountByClass.get(sess.class_id) ?? 0,
      }
    })

    // 7. Build recent activity feed
    const activityItems: any[] = []

    for (const s of (finalizedSessionsResult.data ?? [])) {
      const subject: any = Array.isArray(s.subjects) ? s.subjects[0] : s.subjects
      const cls: any = Array.isArray(s.classes) ? s.classes[0] : s.classes
      activityItems.push({
        description: `${subject?.name ?? "Unknown"}${cls ? ` — ${cls.name} ${cls.section}` : ""}`,
        time: s.finalized_at,
        type: "finalized",
      })
    }

    for (const s of (openedSessionsResult.data ?? [])) {
      const subject: any = Array.isArray(s.subjects) ? s.subjects[0] : s.subjects
      const cls: any = Array.isArray(s.classes) ? s.classes[0] : s.classes
      activityItems.push({
        description: `${subject?.name ?? "Unknown"}${cls ? ` — ${cls.name} ${cls.section}` : ""}`,
        time: s.opened_at,
        type: "opened",
      })
    }

    for (const s of (recentStudentsResult.data ?? [])) {
      const userObj: any = Array.isArray(s.users) ? s.users[0] : s.users
      if (s.is_approved) {
        activityItems.push({
          description: userObj?.full_name ?? "Unknown",
          time: s.updated_at,
          type: "approved",
        })
      }
      activityItems.push({
        description: userObj?.full_name ?? "Unknown",
        time: s.created_at,
        type: "added",
      })
    }

    activityItems.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    const recentActivity = activityItems.slice(0, 8).map(item => ({
      ...item,
      time: item.time, // keep raw ISO string, format on client
    }))

    return NextResponse.json({
      stats: {
        totalStudents: studentsResult.count ?? 0,
        todayPresent: todayPresentResult.count ?? 0,
        activeSessions: activeSessionsResult.count ?? 0,
      },
      myClasses,
      todayAttendance,
      recentActivity,
    })
  } catch (e) {
    console.error("Teacher dashboard API error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
