import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const supabaseAdmin = createAdminClient();
  try {
    const searchParams = request.nextUrl.searchParams;
    const teacherId = searchParams.get("teacher_id");

    if (!teacherId) {
      return Response.json({ error: "teacher_id is required" }, { status: 400 });
    }

    // Fetch students needing approval
    const { data: students, error } = await supabaseAdmin
      .from("students")
      .select("id, roll_number, registration_photo, created_at")
      .eq("created_by", teacherId)
      .eq("is_approved", false)
      .not("embedding_a", "is", null);

    if (error) {
      console.error("Error fetching students:", error);
      return Response.json({ error: "Failed to fetch students" }, { status: 500 });
    }

    if (!students || students.length === 0) {
      return Response.json({ pending: [] });
    }

    // For each student fetch name from users table
    const studentsWithNames = await Promise.all(
      students.map(async (student: { id: string; roll_number: string; registration_photo: string | null; created_at: string }) => {
        const { data: userData } = await supabaseAdmin
          .from("users")
          .select("full_name")
          .eq("id", student.id)
          .single();

        return {
          id: student.id,
          name: userData?.full_name || "Unknown",
          roll: student.roll_number,
          registration_photo: student.registration_photo,
          created_at: student.created_at,
        };
      })
    );

    return Response.json({ pending: studentsWithNames });
  } catch (error: any) {
    console.error("Face approvals API error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}