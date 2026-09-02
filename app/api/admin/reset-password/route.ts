import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    // Verify the caller is an authenticated admin
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check admin role
    const { data: callerProfile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!callerProfile || callerProfile.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Fetch target user details for role-specific password and audit trail
    const { data: targetUser, error: userError } = await adminClient
      .from("users")
      .select(`
        id, full_name, role,
        teacher:teachers(teacher_id_code),
        student:students(roll_number)
      `)
      .eq("id", userId)
      .maybeSingle();

    if (userError || !targetUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const role = targetUser.role;
    if (role !== "student" && role !== "teacher") {
      return NextResponse.json(
        { error: "Invalid target user role for password reset" },
        { status: 400 }
      );
    }

    const isStudent = role === "student";
    const defaultPassword = isStudent ? "Student@1234" : "Teacher@1234";

    const studentRoll = (targetUser.student as any)?.roll_number;
    const teacherCode = (targetUser.teacher as any)?.teacher_id_code;
    const targetLabel = isStudent
      ? `${targetUser.full_name || "Student"} (${studentRoll || "No Roll"})`
      : teacherCode
      ? `${targetUser.full_name || "Teacher"} (${teacherCode})`
      : targetUser.full_name || "Teacher";

    // Use admin client to reset the user's password in Supabase Auth
    const { error: resetError } = await adminClient.auth.admin.updateUserById(
      userId,
      { password: defaultPassword }
    );

    if (resetError) {
      return NextResponse.json(
        { error: resetError.message },
        { status: 500 }
      );
    }

    // Update must_change_password flag
    const { error: updateError } = await adminClient
      .from("users")
      .update({ must_change_password: true })
      .eq("id", userId);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    // Log the successful password reset to system_logs
    await adminClient.from("system_logs").insert({
      performed_by: user.id,
      action_type: "reset",
      description: `Password reset for ${isStudent ? "student" : "teacher"}: ${targetLabel}`,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Reset password error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

