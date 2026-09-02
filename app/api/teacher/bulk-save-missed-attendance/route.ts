import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

interface SlotInput {
  classId: string
  subjectId: string
  periodId: string
  sessionDate: string
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const { slots, mode, absenteeIds } = body as {
      slots: SlotInput[]
      mode: "present" | "absent" | "except"
      absenteeIds?: string[]
    }

    if (!slots || !Array.isArray(slots) || slots.length === 0) {
      return NextResponse.json({ error: "No slots provided" }, { status: 400 })
    }
    if (!["present", "absent", "except"].includes(mode)) {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 })
    }
    if (mode === "except" && (!absenteeIds || !Array.isArray(absenteeIds))) {
      return NextResponse.json({ error: "absenteeIds required for except mode" }, { status: 400 })
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

    // 2. Execute atomic PostgreSQL bulk save RPC
    const { data: rpcResult, error: rpcError } = await admin.rpc(
      "save_bulk_missed_attendance",
      {
        p_teacher_id: user.id,
        p_slots: slots,
        p_mode: mode,
        p_absentee_ids: absenteeIds ?? [],
      }
    )

    if (rpcError) {
      const msg = rpcError.message || ""
      if (msg.includes("Forbidden")) {
        return NextResponse.json({ error: msg }, { status: 403 })
      }
      if (msg.includes("Bad Request")) {
        return NextResponse.json({ error: msg }, { status: 400 })
      }
      console.error("save_bulk_missed_attendance RPC error:", rpcError)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }

    return NextResponse.json(rpcResult)
  } catch (e) {
    console.error("bulk-save-missed-attendance error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

