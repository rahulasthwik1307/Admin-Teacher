import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

// Simple in-memory rate limiter — max 3 attempts per IP per 15 minutes
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_MAX = 3
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return { allowed: true, retryAfterSeconds: 0 }
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000)
    return { allowed: false, retryAfterSeconds }
  }

  entry.count++
  return { allowed: true, retryAfterSeconds: 0 }
}

export async function POST(request: Request) {
  try {
    // Rate limiting — get client IP from Vercel headers
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown"

    const rateCheck = checkRateLimit(ip)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: `Too many attempts. Please wait ${Math.ceil(rateCheck.retryAfterSeconds / 60)} minute(s) before trying again.`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateCheck.retryAfterSeconds),
          },
        }
      )
    }
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

    // Sign in the user directly using admin to get a valid session
    const { data: sessionData, error: sessionError } =
      await admin.auth.admin.getUserById(student.id)

    if (sessionError || !sessionData.user) {
      return NextResponse.json(
        { error: "Failed to retrieve user." },
        { status: 500 }
      )
    }

    // Use generateLink to create a valid one-time session
    const email = `${roll_number.trim().toLowerCase()}@nnrg.student`

    const { data: linkData, error: linkError } =
      await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: {
          redirectTo: "https://attend-secure.vercel.app",
        },
      })

    if (linkError || !linkData) {
      console.error("generateLink error:", linkError)
      return NextResponse.json(
        { error: "Failed to generate session. Try again." },
        { status: 500 }
      )
    }

    // Exchange the hashed token for a real session
    const tokenHash = linkData.properties?.hashed_token
    if (!tokenHash) {
      return NextResponse.json(
        { error: "Failed to generate session token." },
        { status: 500 }
      )
    }

    // Use the anon client to verify the OTP — this produces a real user session
    const { createClient: createAnonClient } = await import("@supabase/supabase-js")
    const anonClient = createAnonClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: otpData, error: otpError } = await anonClient.auth.verifyOtp({
      token_hash: tokenHash,
      type: "email",
    })

    if (otpError || !otpData.session) {
      console.error("verifyOtp error:", otpError)
      return NextResponse.json(
        { error: "Failed to create session. Try again." },
        { status: 500 }
      )
    }

    console.log("FORGOT_PASSWORD_SESSION_DEBUG", {
      accessTokenLength: otpData.session.access_token.length,
      refreshTokenLength: otpData.session.refresh_token.length,
    })

    return NextResponse.json({
      access_token: otpData.session.access_token,
      refresh_token: otpData.session.refresh_token,
    })
  } catch (e) {
    console.error("forgot-password-token error:", e)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}