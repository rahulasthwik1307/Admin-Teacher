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
    const { student_id, full_name, roll_number, class_id, department_id, year } = body

    if (!student_id) return NextResponse.json({ error: "Missing student_id" }, { status: 400 })

    const admin = createAdminClient()

    let cleanRoll: string | undefined
    if (roll_number) {
      cleanRoll = roll_number.trim().toUpperCase()
      if (!ROLL_NUMBER_REGEX.test(cleanRoll as string)) {
        return NextResponse.json({
          error: "Invalid roll number format. Roll number must follow the official college hall-ticket format. Example: 227Z1A6755. Pattern: Digit Digit Digit Letter Digit Letter Digit Digit Digit Digit."
        }, { status: 400 })
      }

      // Check global uniqueness, excluding the student being edited
      const { data: duplicateRoll } = await admin
        .from("students")
        .select("id")
        .eq("roll_number", cleanRoll)
        .neq("id", student_id)
        .maybeSingle()

      if (duplicateRoll) {
        return NextResponse.json({ error: "A student with this roll number already exists" }, { status: 409 })
      }
    }

    // Update full_name in users table
    if (full_name) {
      const { error: nameError } = await admin
        .from("users")
        .update({ full_name: full_name.trim() })
        .eq("id", student_id)
      if (nameError) return NextResponse.json({ error: "Failed to update name" }, { status: 500 })
    }

    // Update students table
    const studentUpdate: any = {}
    if (cleanRoll) studentUpdate.roll_number = cleanRoll
    if (class_id) studentUpdate.class_id = class_id
    if (department_id) studentUpdate.department_id = department_id
    if (year) studentUpdate.year = year

    if (Object.keys(studentUpdate).length > 0) {
      const { error: studentError } = await admin
        .from("students")
        .update(studentUpdate)
        .eq("id", student_id)
      if (studentError) {
        if (studentError.code === "23505") {
          return NextResponse.json({ error: "A student with this roll number already exists" }, { status: 409 })
        }
        if (studentError.code === "23514") {
          return NextResponse.json({
            error: "Invalid roll number format. Roll number must follow the official college hall-ticket format. Example: 227Z1A6755."
          }, { status: 400 })
        }
        return NextResponse.json({ error: `Failed to update student: ${studentError.message}` }, { status: 500 })
      }
    }

    // If roll number changed, update email — simple format, no class/year embedded
    if (cleanRoll) {
      const newEmail = `${cleanRoll.toLowerCase()}@nnrg.student`
      const { error: authError } = await admin.auth.admin.updateUserById(student_id, { email: newEmail })
      if (authError) return NextResponse.json({ error: "Failed to update email" }, { status: 500 })
      await admin.from("users").update({ email: newEmail }).eq("id", student_id)
    }

    await admin.from("system_logs").insert({
      performed_by: user.id,
      action_type: "update",
      description: `Student record updated by admin: ${full_name || ""} (${cleanRoll || ""})`,
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("update-student error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
