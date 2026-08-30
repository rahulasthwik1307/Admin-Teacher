import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

function getISTDateRange(range: string, customStart?: string | null, customEnd?: string | null): { from: string | null; to: string | null } {
  if (range === "custom" && customStart && customEnd) {
    return { from: customStart, to: customEnd }
  }
  if (range === "all") {
    return { from: null, to: null }
  }

  // Calculate current date in Indian Standard Time (IST, UTC+05:30)
  const now = new Date()
  const istFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  const todayStr = istFormatter.format(now) // "YYYY-MM-DD"
  const [yearStr, monthStr] = todayStr.split("-")
  const currentYear = parseInt(yearStr, 10)
  const currentMonth = parseInt(monthStr, 10) // 1-12

  if (range === "today") {
    return { from: todayStr, to: todayStr }
  }

  if (range === "week") {
    const istDate = new Date(`${todayStr}T12:00:00+05:30`)
    const dayOfWeek = istDate.getDay() // 0 = Sunday, 1 = Monday
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const mondayDate = new Date(istDate)
    mondayDate.setDate(mondayDate.getDate() - diffToMonday)
    const fromStr = istFormatter.format(mondayDate)
    return { from: fromStr, to: todayStr }
  }

  if (range === "month") {
    const fromStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`
    return { from: fromStr, to: todayStr }
  }

  if (range === "semester") {
    // Academic semester: Fall starts July 1 (month >= 7), Spring starts Jan 1 (month < 7)
    const semesterStartMonth = currentMonth >= 7 ? 7 : 1
    const fromStr = `${currentYear}-${String(semesterStartMonth).padStart(2, "0")}-01`
    return { from: fromStr, to: todayStr }
  }

  // Default fallback: Semester
  const semesterStartMonth = currentMonth >= 7 ? 7 : 1
  const fromStr = `${currentYear}-${String(semesterStartMonth).padStart(2, "0")}-01`
  return { from: fromStr, to: todayStr }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 1. Authentication Verification
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized: Please log in" }, { status: 401 })
    }

    // 2. Explicit Admin Role Authorization Check
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profileError || !profile || profile.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Admin privileges required to access reports data" },
        { status: 403 }
      )
    }

    // 3. Parse Filter Parameters
    const searchParams = request.nextUrl.searchParams
    const dateRange = searchParams.get("dateRange") || "all"
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const departmentId = searchParams.get("departmentId")
    const year = searchParams.get("year")
    const classId = searchParams.get("classId")
    const subjectId = searchParams.get("subjectId")
    const teacherId = searchParams.get("teacherId")

    const { from, to } = getISTDateRange(dateRange, startDate, endDate)

    // 4. Parallel Execution: PostgreSQL RPC + Metadata Entities
    const [
      { data: analyticsRpcData, error: rpcError },
      { data: teachers },
      { data: assignments },
      { data: logs },
      { data: departments },
      { data: classes },
      { data: subjects },
    ] = await Promise.all([
      supabase.rpc("get_admin_reports_analytics", {
        p_date_from: from,
        p_date_to: to,
        p_department_id: departmentId && departmentId !== "all" ? departmentId : null,
        p_year: year && year !== "all" ? year : null,
        p_class_id: classId && classId !== "all" ? classId : null,
        p_subject_id: subjectId && subjectId !== "all" ? subjectId : null,
        p_teacher_id: teacherId && teacherId !== "all" ? teacherId : null,
      }),
      supabase
        .from("teachers")
        .select(`id, title, department:departments ( id, name, code ), user:users ( full_name )`),
      supabase.from("teacher_assignments").select("id, teacher_id, subject_id, class_id"),
      supabase
        .from("system_logs")
        .select("id, created_at, action_type, description, performed_by")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("departments").select("id, name, code").order("name"),
      supabase
        .from("classes")
        .select("id, name, section, year, department_id, department:departments ( id, name, code )")
        .order("name"),
      supabase
        .from("subjects")
        .select("id, name, code, department_id, department:departments ( id, name, code )")
        .order("name"),
    ])

    if (rpcError) {
      console.error("Error executing get_admin_reports_analytics RPC:", rpcError)
      return NextResponse.json({ error: "Failed to compute analytics" }, { status: 500 })
    }

    const analytics = analyticsRpcData as any

    // 5. Filtered Sessions for Transitional Compatibility (Server-side date filtered)
    let sessionsQuery = supabase
      .from("attendance_sessions")
      .select(`
        id,
        teacher_id,
        session_date,
        subject_id,
        class_id,
        status,
        subject:subjects ( id, name, code, department_id, department:departments ( id, name, code ) ),
        class:classes ( id, name, section, year, department_id, department:departments ( id, name, code ) ),
        teacher:teachers ( id, title, user:users ( full_name ), department:departments ( id, name, code ) )
      `)
      .eq("status", "finalized")
      .order("session_date", { ascending: false })

    if (from) sessionsQuery = sessionsQuery.gte("session_date", from)
    if (to) sessionsQuery = sessionsQuery.lte("session_date", to)
    if (departmentId && departmentId !== "all") {
      // Find classes belonging to this department
      const matchingClassIds = (classes ?? []).filter((c: any) => c.department_id === departmentId).map((c: any) => c.id)
      if (matchingClassIds.length > 0) {
        sessionsQuery = sessionsQuery.in("class_id", matchingClassIds)
      }
    }
    if (classId && classId !== "all") sessionsQuery = sessionsQuery.eq("class_id", classId)
    if (subjectId && subjectId !== "all") sessionsQuery = sessionsQuery.eq("subject_id", subjectId)
    if (teacherId && teacherId !== "all") sessionsQuery = sessionsQuery.eq("teacher_id", teacherId)

    const { data: filteredSessions } = await sessionsQuery

    const sessionIds = (filteredSessions ?? []).map((s: any) => s.id)

    // 6. Fetch Attendance in chunks for filtered sessions only
    const CHUNK_SIZE = 50
    const chunks: string[][] = []
    for (let i = 0; i < sessionIds.length; i += CHUNK_SIZE) {
      chunks.push(sessionIds.slice(i, i + CHUNK_SIZE))
    }

    const attResults = await Promise.all(
      chunks.map(chunk =>
        supabase
          .from("period_attendance")
          .select(`
            session_id,
            student_id,
            status,
            student:students (
              id,
              roll_number,
              year,
              user:users ( full_name ),
              class:classes ( id, name, section, year, department:departments ( id, name, code ) ),
              department:departments ( id, name, code )
            )
          `)
          .in("session_id", chunk)
          .in("status", ["present", "absent"])
      )
    )

    const allAttendance = attResults.flatMap(r => r.data || [])

    // 7. Map performer names for system logs
    const performerIds = [...new Set((logs ?? []).map((l: any) => l.performed_by).filter(Boolean))]
    const { data: logUsers } =
      performerIds.length > 0
        ? await supabase.from("users").select("id, full_name").in("id", performerIds)
        : { data: [] }

    const nameMap: Record<string, string> = {}
    for (const u of logUsers ?? []) nameMap[u.id] = u.full_name

    return NextResponse.json({
      analytics,
      overview: analytics?.overview ?? null,
      subjectCohortMatrix: analytics?.subjectCohortMatrix ?? [],
      departmentYearBreakdown: analytics?.departmentYearBreakdown ?? [],
      defaulterStudents: analytics?.defaulterStudents ?? [],
      teacherActivity: analytics?.teacherActivity ?? [],
      diagnostics: analytics?.diagnostics ?? null,
      // Transitional fields for existing UI:
      teachers: teachers ?? [],
      sessions: filteredSessions ?? [],
      assignments: assignments ?? [],
      attendance: allAttendance ?? [],
      departments: departments ?? [],
      classes: classes ?? [],
      subjects: subjects ?? [],
      logs: (logs ?? []).map((l: any) => ({
        ...l,
        performedBy: nameMap[l.performed_by] ?? "System",
      })),
    })
  } catch (e) {
    console.error("reports-data API error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
