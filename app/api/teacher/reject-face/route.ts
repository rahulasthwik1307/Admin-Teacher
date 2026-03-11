import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const supabaseAdmin = createAdminClient();
  try {
    const { studentId } = await request.json();

    if (!studentId) {
      return Response.json({ error: "studentId is required" }, { status: 400 });
    }

    // Step 1: Delete all storage files for this student
    try {
      const { data: fileList } = await supabaseAdmin.storage
        .from("face-registrations")
        .list(studentId);

      if (fileList && fileList.length > 0) {
        const filePaths = fileList.map((f: { name: string }) => `${studentId}/${f.name}`);
        await supabaseAdmin.storage
          .from("face-registrations")
          .remove(filePaths);
        console.log(`Reject: deleted ${filePaths.length} files for ${studentId}`);
      }
    } catch (storageErr) {
      console.error("Storage cleanup error:", storageErr);
      // Non-fatal — continue with DB update
    }

    // Step 2: Update student record
    const { error } = await supabaseAdmin
      .from("students")
      .update({
        is_approved: false,
        is_rejected: true,
        embedding_a: null,
        embedding_b: null,
        embedding_c: null,
        registration_photo_url: null,
        face_registered: false,
      })
      .eq("id", studentId);

    if (error) {
      console.error("DB update error:", error);
      return Response.json({ error: "Failed to update student" }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error: any) {
    console.error("Reject face API error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
