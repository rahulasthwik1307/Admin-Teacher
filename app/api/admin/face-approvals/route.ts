import { NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest) {
  const supabaseAdmin = createAdminClient()
  try {
    // Fetch ALL pending students — not filtered by teacher
    const { data: pendingStudents } = await supabaseAdmin
      .from("students")
      .select(`
        id, roll_number, registration_photo_url, created_at, year,
        class:classes ( section, department:departments ( code ) ),
        user:users ( full_name )
      `)
      .eq("is_approved", false)
      .eq("is_rejected", false)
      .not("embedding_a", "is", null)

    const { data: approvedStudents } = await supabaseAdmin
      .from("students")
      .select(`
        id, roll_number, registration_photo_url, created_at, year,
        class:classes ( section, department:departments ( code ) ),
        user:users ( full_name )
      `)
      .eq("is_approved", true)
      .not("embedding_a", "is", null)

    function mapStudent(student: any) {
      const classData = student.class as any
      const section = classData?.section ?? "N/A"
      const deptCode = classData?.department?.code ?? "N/A"
      const classLabel = deptCode !== "N/A" && section !== "N/A"
        ? `${deptCode}-${section}` : "N/A"

      return {
        id: student.id,
        name: student.user?.full_name || "Unknown",
        roll: student.roll_number,
        class: classLabel,
        year: student.year ?? "N/A",
        registration_photo: student.registration_photo_url,
        created_at: student.created_at,
      }
    }

    const pending = (pendingStudents || []).map(mapStudent)
    const approved = (approvedStudents || []).map(mapStudent)

    return Response.json({ pending, approved })
  } catch (error: any) {
    console.error("Admin face approvals API error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
