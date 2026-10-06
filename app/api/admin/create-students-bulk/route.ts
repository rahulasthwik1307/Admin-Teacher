import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const ROLL_NUMBER_REGEX = /^\d{3}[A-Z]\d[A-Z]\d{4}$/

export interface BulkStudentItem {
  full_name: string
  roll_number: string
  contact_email?: string
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const { students, class_id, department_id, year } = body as {
      students: BulkStudentItem[]
      class_id: string
      department_id: string
      year: string
    }

    if (!Array.isArray(students) || students.length === 0) {
      return NextResponse.json({ error: "At least one student is required" }, { status: 400 })
    }

    if (students.length > 150) {
      return NextResponse.json({ error: "Maximum batch limit is 150 students per request" }, { status: 400 })
    }

    if (!class_id || !department_id || !year) {
      return NextResponse.json({ error: "Class, Department, and Academic Year are required" }, { status: 400 })
    }

    const admin = createAdminClient()

    // Fetch class to verify year
    const { data: classRow } = await admin
      .from("classes")
      .select("id, name, section, year")
      .eq("id", class_id)
      .maybeSingle()

    const finalYear = classRow?.year || year
    const classLabel = classRow ? `${classRow.name}-${classRow.section}` : class_id

    // Pre-check existing roll numbers in DB in one bulk query
    const cleanRolls = students.map((s) => s.roll_number?.trim().toUpperCase() || "")
    const { data: existingStudents } = await admin
      .from("students")
      .select("roll_number")
      .in("roll_number", cleanRolls.filter(Boolean))

    const existingRollSet = new Set((existingStudents || []).map((s) => s.roll_number.toUpperCase()))

    // Track duplicates within the batch itself
    const seenBatchRolls = new Set<string>()

    const results: Array<{
      roll_number: string
      full_name: string
      status: "created" | "failed"
      error?: string
    }> = []

    let createdCount = 0
    let failedCount = 0

    for (const student of students) {
      const cleanName = student.full_name?.trim() || ""
      const cleanRoll = student.roll_number?.trim().toUpperCase() || ""
      const cleanEmail = student.contact_email?.trim() || null

      if (!cleanName || !cleanRoll) {
        results.push({
          roll_number: cleanRoll || "—",
          full_name: cleanName || "—",
          status: "failed",
          error: "Full name and roll number cannot be empty",
        })
        failedCount++
        continue
      }

      if (!ROLL_NUMBER_REGEX.test(cleanRoll)) {
        results.push({
          roll_number: cleanRoll,
          full_name: cleanName,
          status: "failed",
          error: "Invalid roll number format (e.g. 227Z1A6755)",
        })
        failedCount++
        continue
      }

      if (seenBatchRolls.has(cleanRoll)) {
        results.push({
          roll_number: cleanRoll,
          full_name: cleanName,
          status: "failed",
          error: "Duplicate roll number within this batch",
        })
        failedCount++
        continue
      }
      seenBatchRolls.add(cleanRoll)

      if (existingRollSet.has(cleanRoll)) {
        results.push({
          roll_number: cleanRoll,
          full_name: cleanName,
          status: "failed",
          error: "Roll number already registered in database",
        })
        failedCount++
        continue
      }

      const authEmail = `${cleanRoll.toLowerCase()}@nnrg.student`

      // Create auth user
      const { data: authData, error: authError } = await admin.auth.admin.createUser({
        email: authEmail,
        password: "Student@1234",
        email_confirm: true,
        user_metadata: {
          full_name: cleanName,
          role: "student",
        },
      })

      if (authError) {
        results.push({
          roll_number: cleanRoll,
          full_name: cleanName,
          status: "failed",
          error: authError.message.includes("already")
            ? "Account already exists"
            : authError.message,
        })
        failedCount++
        continue
      }

      const newUserId = authData.user.id

      // Insert into public.users
      const { error: userInsertError } = await admin.from("users").insert({
        id: newUserId,
        email: authEmail,
        full_name: cleanName,
        role: "student",
        must_change_password: true,
        contact_email: cleanEmail,
      })

      if (userInsertError) {
        await admin.auth.admin.deleteUser(newUserId)
        results.push({
          roll_number: cleanRoll,
          full_name: cleanName,
          status: "failed",
          error: `User record failed: ${userInsertError.message}`,
        })
        failedCount++
        continue
      }

      // Insert into public.students
      const { error: studentInsertError } = await admin.from("students").insert({
        id: newUserId,
        roll_number: cleanRoll,
        department_id,
        class_id,
        year: finalYear,
        is_active: true,
      })

      if (studentInsertError) {
        // Rollback
        await admin.from("users").delete().eq("id", newUserId)
        await admin.auth.admin.deleteUser(newUserId)
        results.push({
          roll_number: cleanRoll,
          full_name: cleanName,
          status: "failed",
          error: studentInsertError.code === "23505"
            ? "Roll number already exists"
            : `Student record failed: ${studentInsertError.message}`,
        })
        failedCount++
        continue
      }

      // Mark as existing in set so any subsequent duplicate fails
      existingRollSet.add(cleanRoll)
      createdCount++
      results.push({
        roll_number: cleanRoll,
        full_name: cleanName,
        status: "created",
      })
    }

    if (createdCount > 0) {
      await admin.from("system_logs").insert({
        performed_by: user.id,
        action_type: "create",
        description: `Bulk student creation: Enrolled ${createdCount} student(s) into ${classLabel} (${finalYear}) by admin. ${failedCount > 0 ? `(${failedCount} failed)` : ""}`,
      })
    }

    return NextResponse.json({
      success: true,
      total: students.length,
      created: createdCount,
      failed: failedCount,
      results,
    })
  } catch (e: any) {
    console.error("create-students-bulk error:", e)
    return NextResponse.json({ error: e?.message || "Internal server error" }, { status: 500 })
  }
}
