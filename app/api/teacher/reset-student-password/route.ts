import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const { student_id, roll_number } = body

    if (!student_id) return NextResponse.json({ error: "Missing student_id" }, { status: 400 })

    const admin = createAdminClient()

    // Reset password to default
    const { error } = await admin.auth.admin.updateUserById(student_id, {
      password: 'Student@1234',
    })

    if (error) return NextResponse.json({ error: "Failed to reset password" }, { status: 500 })

    // Set must_change_password flag
    await admin.from('users').update({ must_change_password: true }).eq('id', student_id)

    // Log it
    await admin.from('system_logs').insert({
      performed_by: user.id,
      action_type: 'security',
      description: `Student password reset by teacher: ${roll_number}`,
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('reset-student-password error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
