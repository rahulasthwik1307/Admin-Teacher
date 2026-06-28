import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const { student_id, full_name, roll_number, class_id, department_id, year } = body

    if (!student_id) return NextResponse.json({ error: "Missing student_id" }, { status: 400 })

    const admin = createAdminClient()

    // Update full_name in users table
    if (full_name) {
      const { error: nameError } = await admin
        .from("users")
        .update({ full_name: full_name.trim() })
        .eq("id", student_id)
      if (nameError) return NextResponse.json({ error: "Failed to update name" }, { status: 500 })
    }

    // Check roll number uniqueness within the target class (excluding current student)
    if (roll_number) {
      const targetClassId = class_id || (await (async () => {
        const { data } = await admin.from("students").select("class_id").eq("id", student_id).maybeSingle()
        return data?.class_id
      })())

      if (targetClassId) {
        const { data: duplicateRoll } = await admin
          .from("students")
          .select("id")
          .eq("roll_number", roll_number.trim().toUpperCase())
          .eq("class_id", targetClassId)
          .neq("id", student_id)
          .maybeSingle()

        if (duplicateRoll) {
          return NextResponse.json({ error: "A student with this roll number already exists in this class" }, { status: 409 })
        }
      }
    }

    // Update roll_number, class_id, department_id, year in students table
    const studentUpdate: any = {}
    if (roll_number) studentUpdate.roll_number = roll_number.trim().toUpperCase()
    if (class_id) studentUpdate.class_id = class_id
    if (department_id) studentUpdate.department_id = department_id
    if (year) studentUpdate.year = year

    if (Object.keys(studentUpdate).length > 0) {
      const { error: studentError } = await admin
        .from("students")
        .update(studentUpdate)
        .eq("id", student_id)
      if (studentError) return NextResponse.json({ error: `Failed to update student: ${studentError.message}` }, { status: 500 })
    }

    // If roll number changed, update email in auth and users table
    if (roll_number) {
      const newEmail = `${roll_number.trim().toLowerCase()}@nnrg.student`
      const { error: authError } = await admin.auth.admin.updateUserById(student_id, { email: newEmail })
      if (authError) return NextResponse.json({ error: "Failed to update email" }, { status: 500 })
      await admin.from("users").update({ email: newEmail }).eq("id", student_id)
    }

    await admin.from("system_logs").insert({
      performed_by: user.id,
      action_type: "update",
      description: `Student record updated by admin: ${full_name || ""} (${roll_number || ""})`,
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("update-student error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
