import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { roll_number } = body

    if (!roll_number || typeof roll_number !== "string") {
      return NextResponse.json(
        { error: "Roll number is required" },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    // Verify student exists and is approved
    const { data: student, error: studentError } = await admin
      .from("students")
      .select("id, is_approved, is_rejected, embedding_a")
      .eq("roll_number", roll_number.trim().toUpperCase())
      .maybeSingle()

    if (studentError || !student) {
      return NextResponse.json(
        { error: "No student found with this roll number" },
        { status: 404 }
      )
    }

    if (!student.is_approved) {
      return NextResponse.json(
        { error: "Account not yet approved. Contact your teacher." },
        { status: 403 }
      )
    }

    if (student.is_rejected) {
      return NextResponse.json(
        { error: "Account has been rejected. Contact your teacher." },
        { status: 403 }
      )
    }

    if (!student.embedding_a) {
      return NextResponse.json(
        { error: "Face not registered. Contact your teacher." },
        { status: 403 }
      )
    }

    // Generate a magic link session using admin
    const email = `${roll_number.trim().toLowerCase()}@nnrg.student`

    const { data: linkData, error: linkError } =
      await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
      })

    if (linkError || !linkData) {
      return NextResponse.json(
        { error: "Failed to generate session. Try again." },
        { status: 500 }
      )
    }

    // Exchange the hashed token from generateLink to mint a real session
    const tokenHash = linkData.properties?.hashed_token
    if (!tokenHash) {
      return NextResponse.json(
        { error: "Failed to generate session token." },
        { status: 500 }
      )
    }

    const { data: otpSession, error: otpError } =
      await admin.auth.verifyOtp({
        token_hash: tokenHash,
        type: "magiclink",
      })

    if (otpError || !otpSession.session) {
      return NextResponse.json(
        { error: "Failed to create temporary session." },
        { status: 500 }
      )
    }

    console.log("FORGOT_PASSWORD_SESSION_DEBUG", {
      accessTokenLength: otpSession.session.access_token?.length,
      refreshTokenLength: otpSession.session.refresh_token?.length,
      refreshToken: otpSession.session.refresh_token,
      userId: otpSession.session.user.id,
    })

    return NextResponse.json({
      access_token: otpSession.session.access_token,
      refresh_token: otpSession.session.refresh_token,
    })
  } catch (e) {
    console.error("forgot-password-token error:", e)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}