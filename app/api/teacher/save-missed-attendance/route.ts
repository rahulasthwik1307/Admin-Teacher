import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const { class_id, subject_id, period_id, session_date, attendance } = body

    if (!class_id || !subject_id || !period_id || !session_date || !attendance || !Array.isArray(attendance)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const admin = createAdminClient()

    // 1. Explicit Teacher Role & Active Status Verification
    const { data: userProfile, error: profileError } = await admin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profileError || !userProfile || userProfile.role !== "teacher") {
      return NextResponse.json({ error: "Forbidden: Teacher access required" }, { status: 403 })
    }

    const { data: teacherProfile } = await admin
      .from("teachers")
      .select("is_active")
      .eq("id", user.id)
      .single()

    if (teacherProfile && teacherProfile.is_active === false) {
      return NextResponse.json({ error: "Forbidden: Teacher account is inactive" }, { status: 403 })
    }

    // 2. Server-Authoritative Teacher Assignment Authorization
    const { data: assignment, error: assignmentError } = await admin
      .from("teacher_assignments")
      .select("id")
      .eq("teacher_id", user.id)
      .eq("class_id", class_id)
      .eq("subject_id", subject_id)
      .maybeSingle()

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { error: "Forbidden: You are not assigned to teach this subject and class cohort" },
        { status: 403 }
      )
    }

    // 3. Execute atomic PostgreSQL transaction RPC with Fail-Closed validation
    const { data: rpcResult, error: rpcError } = await admin.rpc(
      "save_missed_attendance_session",
      {
        p_teacher_id: user.id,
        p_class_id: class_id,
        p_subject_id: subject_id,
        p_period_id: period_id,
        p_session_date: session_date,
        p_attendance: attendance,
      }
    )

    if (rpcError) {
      const msg = rpcError.message || ""
      if (msg.includes("Forbidden")) {
        return NextResponse.json({ error: msg }, { status: 403 })
      }
      if (msg.includes("Conflict")) {
        return NextResponse.json({ error: msg }, { status: 409 })
      }
      if (msg.includes("Bad Request")) {
        return NextResponse.json({ error: msg }, { status: 400 })
      }
      console.error("save_missed_attendance_session RPC error:", rpcError)
      return NextResponse.json({ error: "Failed to save attendance" }, { status: 500 })
    }

    return NextResponse.json(rpcResult)
  } catch (e) {
    console.error("save-missed-attendance error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

