"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import {
  validateActiveSession,
  clearTabSession,
  getTabRole,
} from "@/lib/auth/session-manager"

/**
 * Session guard hook for portal layouts.
 * 
 * Enforces:
 * 1) Role authorization (Teacher cannot access Admin, Admin cannot access Teacher).
 * 2) Server-authoritative Single Active Session per account:
 *    If the SAME account logs in from another tab or device, this session is automatically
 *    detected as superseded and gracefully signed out.
 * 3) Multi-account independence:
 *    Different accounts (e.g. Admin + Teacher A, or Teacher A + Teacher B) have distinct
 *    records and never invalidate each other.
 */
export function useSessionGuard(expectedRole: "teacher" | "admin") {
  const router = useRouter()
  const isCheckingRef = useRef(false)
  const hasSupersededRef = useRef(false)

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null

    async function checkSession() {
      if (isCheckingRef.current || hasSupersededRef.current) return
      isCheckingRef.current = true

      try {
        const supabase = createClient()
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
          await clearTabSession()
          router.replace("/login")
          return
        }

        // Verify user role
        const { data: userProfile } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .maybeSingle()

        if (!userProfile || userProfile.role !== expectedRole) {
          await clearTabSession()
          router.replace("/login")
          return
        }

        // If teacher, verify is_active
        if (expectedRole === "teacher") {
          const { data: teacherProfile } = await supabase
            .from("teachers")
            .select("is_active")
            .eq("id", user.id)
            .maybeSingle()

          if (teacherProfile && teacherProfile.is_active === false) {
            await clearTabSession()
            router.replace("/login?error=disabled")
            return
          }
        }

        // Check if this session is the authoritative active session for this account
        const validation = await validateActiveSession(user.id)
        if (!validation.isValid && validation.reason === "superseded") {
          hasSupersededRef.current = true
          await clearTabSession()
          toast.error("Session Expired", {
            description:
              "Your account was logged in from another location or tab.",
          })
          router.replace("/login?error=session_superseded")
          return
        }
      } catch (err) {
        console.error("Session guard error:", err)
      } finally {
        isCheckingRef.current = false
      }
    }

    // Initial check on mount
    checkSession()

    // Event-driven checks on tab focus and visibility change
    const handleFocus = () => checkSession()
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkSession()
      }
    }

    window.addEventListener("focus", handleFocus)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    // Lightweight periodic check (every 25 seconds)
    intervalId = setInterval(checkSession, 25000)

    return () => {
      window.removeEventListener("focus", handleFocus)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      if (intervalId) clearInterval(intervalId)
    }
  }, [expectedRole, router])
}
