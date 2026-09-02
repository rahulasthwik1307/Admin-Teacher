import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const supabaseAdmin = createAdminClient();
  try {
    const supabase = await createClient();
    const {
      data: { user: caller },
    } = await supabase.auth.getUser();

    if (!caller) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify caller is an admin using the application's standard role check
    const { data: callerProfile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (profileError || !callerProfile || callerProfile.role !== "admin") {
      return Response.json(
        { error: "Forbidden: admin access required" },
        { status: 403 }
      );
    }

    const { studentId } = await request.json();

    if (!studentId) {
      return Response.json({ error: "studentId is required" }, { status: 400 });
    }

    // Fetch student info for audit trail before updating
    const { data: studentInfo } = await supabaseAdmin
      .from("students")
      .select("roll_number, user:users(full_name)")
      .eq("id", studentId)
      .maybeSingle();

    const studentName = (studentInfo as any)?.user?.full_name ?? "Student";
    const rollNumber = studentInfo?.roll_number ?? "";
    const studentLabel = rollNumber ? `${studentName} (${rollNumber})` : studentName;

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
        embedding_up: null,
        embedding_down: null,
        face_embedding: null,
        registration_photo_url: null,
        face_registered: false,
        verification_threshold: null,
        face_template_updated_at: null,
        face_template_version: 1,
      })
      .eq("id", studentId);

    if (error) {
      console.error("DB update error:", error);
      return Response.json({ error: "Failed to update student" }, { status: 500 });
    }

    // Log the rejection to system_logs
    await supabaseAdmin.from("system_logs").insert({
      performed_by: caller.id,
      action_type: "update",
      description: `Student face registration rejected and reset: ${studentLabel}`,
    });

    return Response.json({ success: true });
  } catch (error: any) {
    console.error("Admin reject face API error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
