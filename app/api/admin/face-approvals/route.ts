import { NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest) {
  const supabaseAdmin = createAdminClient()
  try {
    // Fetch ALL pending students — not filtered by teacher
    const { data: pendingStudents } = await supabaseAdmin
      .from("students")
      .select("id, roll_number, registration_photo_url, created_at, year")
      .eq("is_approved", false)
      .eq("is_rejected", false)
      .not("embedding_a", "is", null)

    const { data: approvedStudents } = await supabaseAdmin
      .from("students")
      .select("id, roll_number, registration_photo_url, created_at, year")
      .eq("is_approved", true)
      .not("embedding_a", "is", null)

    async function enrichStudent(student: any) {
      const { data: userData } = await supabaseAdmin
        .from("users")
        .select("full_name")
        .eq("id", student.id)
        .single()

      const { data: studentRow } = await supabaseAdmin
        .from("students")
        .select(`
          year,
          class:classes (
            section,
            department:departments ( code )
          )
        `)
        .eq("id", student.id)
        .single()

      const classData = studentRow?.class as any
      const section = classData?.section ?? "N/A"
      const deptCode = classData?.department?.code ?? "N/A"
      const classLabel = deptCode !== "N/A" && section !== "N/A"
        ? `${deptCode}-${section}`
        : "N/A"

      return {
        id: student.id,
        name: userData?.full_name || "Unknown",
        roll: student.roll_number,
        class: classLabel,
        year: studentRow?.year ?? "N/A",
        registration_photo: student.registration_photo_url,
        created_at: student.created_at,
      }
    }

    const pending = await Promise.all((pendingStudents || []).map(enrichStudent))
    const approved = await Promise.all((approvedStudents || []).map(enrichStudent))

    return Response.json({ pending, approved })
  } catch (error: any) {
    console.error("Admin face approvals API error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
