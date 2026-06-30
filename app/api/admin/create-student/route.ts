import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const ROLL_NUMBER_REGEX = /^\d{3}[A-Z]\d[A-Z]\d{4}$/

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const { full_name, roll_number, class_id, department_id, year } = body

    if (!full_name || !roll_number || !class_id || !department_id || !year) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    const cleanRoll = roll_number.trim().toUpperCase()

    if (!ROLL_NUMBER_REGEX.test(cleanRoll)) {
      return NextResponse.json({
        error: "Invalid roll number format. Roll number must follow the official college hall-ticket format. Example: 227Z1A6755. Pattern: Digit Digit Digit Letter Digit Letter Digit Digit Digit Digit."
      }, { status: 400 })
    }

    const admin = createAdminClient()
    const email = `${cleanRoll.toLowerCase()}@nnrg.student`

    // Check global uniqueness before attempting insert (gives a clean error
    // before hitting the database constraint, which gives an ugly Postgres error)
    const { data: existing } = await admin
      .from("students")
      .select("id")
      .eq("roll_number", cleanRoll)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: "A student with this roll number already exists" }, { status: 409 })
    }

    // Create auth user
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password: "Student@1234",
      email_confirm: true,
      user_metadata: {
        full_name: full_name.trim(),
        role: "student",
      },
    })

    if (authError) {
      if (authError.message?.includes("already been registered") || authError.message?.includes("already exists")) {
        return NextResponse.json({ error: "A student with this roll number already exists" }, { status: 409 })
      }
      return NextResponse.json({ error: `Failed to create account: ${authError.message}` }, { status: 500 })
    }

    const newUserId = authData.user.id

    // Insert into users table
    const { error: userInsertError } = await admin.from("users").insert({
      id: newUserId,
      email,
      full_name: full_name.trim(),
      role: "student",
      must_change_password: false,
    })

    if (userInsertError) {
      await admin.auth.admin.deleteUser(newUserId)
      return NextResponse.json({ error: `Failed to create user record: ${userInsertError.message}` }, { status: 500 })
    }

    // Insert into students table
    const { error: studentInsertError } = await admin.from("students").insert({
      id: newUserId,
      roll_number: cleanRoll,
      department_id,
      class_id,
      year,
      is_active: true,
      // created_by is intentionally null for admin-created students
      // The column references the teachers table, not the users table
    })

    if (studentInsertError) {
      // Cleanup on failure — including the database-level unique/format constraint violation
      await admin.from("users").delete().eq("id", newUserId)
      await admin.auth.admin.deleteUser(newUserId)

      if (studentInsertError.code === "23505") {
        // unique constraint violation
        return NextResponse.json({ error: "A student with this roll number already exists" }, { status: 409 })
      }
      if (studentInsertError.code === "23514") {
        // check constraint violation (format)
        return NextResponse.json({
          error: "Invalid roll number format. Roll number must follow the official college hall-ticket format. Example: 227Z1A6755."
        }, { status: 400 })
      }
      return NextResponse.json({ error: `Failed to create student record: ${studentInsertError.message}` }, { status: 500 })
    }

    await admin.from("system_logs").insert({
      performed_by: user.id,
      action_type: "create",
      description: `Student account created by admin: ${full_name.trim()} (${cleanRoll})`,
    })

    return NextResponse.json({ success: true, userId: newUserId })
  } catch (e) {
    console.error("create-student error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
