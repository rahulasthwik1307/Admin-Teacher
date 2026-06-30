import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    // Verify the caller is authenticated
    const supabase = await createClient();
    const {
      data: { user: caller },
    } = await supabase.auth.getUser();

    if (!caller) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check caller role
    const { data: callerProfile } = await supabase
      .from("users")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (!callerProfile || !["admin", "teacher"].includes(callerProfile.role)) {
      return NextResponse.json(
        { error: "Forbidden: insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "Missing required field: userId" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Step 1: Delete all storage files for this student (entire folder)
    try {
      const { data: fileList, error: listErr } = await adminClient.storage
        .from("face-registrations")
        .list(userId);

      if (!listErr && fileList && fileList.length > 0) {
        const filePaths = fileList.map((file: { name: string }) => `${userId}/${file.name}`);
        const { error: storageErr } = await adminClient.storage
          .from("face-registrations")
          .remove(filePaths);
        if (storageErr) {
          console.error("Delete user error (storage):", storageErr);
        } else {
          console.log(`Storage: deleted ${filePaths.length} files for user ${userId}`);
        }
      }
    } catch (storageErr) {
      console.error("Delete user error (storage fetch):", storageErr);
    }

    // Delete auth FIRST — if this fails, we stop before corrupting data
    const { error: authDelErr } = await adminClient.auth.admin.deleteUser(userId)
    if (authDelErr) {
      console.error("Delete user error (auth):", authDelErr)
      // Auth deletion failed — do NOT delete students/users rows
      // Return error so frontend knows deletion failed
      return NextResponse.json({ error: "Failed to delete user account. Please try again." }, { status: 500 })
    }

    // Auth deleted successfully — now clean up database rows
    const { error: studentDelErr } = await adminClient
      .from("students")
      .delete()
      .eq("id", userId)
    if (studentDelErr) {
      console.error("Delete user error (students table):", studentDelErr)
    }

    const { error: userDelErr } = await adminClient
      .from("users")
      .delete()
      .eq("id", userId)
    if (userDelErr) {
      console.error("Delete user error (users table):", userDelErr)
    }

    // Always return success so the frontend UI can refresh locally
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete user error (catch block):", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
