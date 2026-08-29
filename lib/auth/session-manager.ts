import { createClient } from "@/lib/supabase/client"

const SESSION_TOKEN_KEY = "fa_active_session_token"
const TAB_ROLE_KEY = "fa_tab_role"

/**
 * Registers a new active session in the database for the given user.
 * This ensures that:
 * 1) The current login becomes the sole authoritative active session for this account.
 * 2) Any older sessions for the SAME account (in other tabs or devices) are invalidated.
 * 3) Different accounts (e.g. Admin vs Teacher A, or Teacher A vs Teacher B) have their own rows
 *    and remain completely independent.
 */
export async function registerActiveSession(
  userId: string,
  role: "teacher" | "admin"
): Promise<string> {
  const sessionTokenId = crypto.randomUUID()

  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(SESSION_TOKEN_KEY, sessionTokenId)
      window.sessionStorage.setItem(TAB_ROLE_KEY, role)
    } catch {
      // Ignore storage access errors
    }
  }

  const supabase = createClient()
  const { error } = await supabase
    .from("user_active_sessions")
    .upsert(
      {
        user_id: userId,
        session_token_id: sessionTokenId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )

  if (error) {
    console.error("Failed to register active session in database:", error)
  }

  return sessionTokenId
}

/**
 * Gets the locally stored active session token ID for this tab.
 */
export function getActiveSessionTokenId(): string | null {
  if (typeof window === "undefined") return null
  try {
    return window.sessionStorage.getItem(SESSION_TOKEN_KEY)
  } catch {
    return null
  }
}

/**
 * Gets the role assigned to this tab.
 */
export function getTabRole(): string | null {
  if (typeof window === "undefined") return null
  try {
    return window.sessionStorage.getItem(TAB_ROLE_KEY)
  } catch {
    return null
  }
}

/**
 * Validates the tab's session against the authoritative server-side record.
 * 
 * Returns:
 * - { isValid: true } if this session is the active session.
 * - { isValid: false, reason: "superseded" } if a newer session was registered for this account.
 * - { isValid: false, reason: "no_session" } if no local session exists.
 */
export async function validateActiveSession(
  userId: string
): Promise<{ isValid: boolean; reason?: "superseded" | "no_session" | "error" }> {
  const localToken = getActiveSessionTokenId()
  if (!localToken) {
    return { isValid: false, reason: "no_session" }
  }

  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("user_active_sessions")
      .select("session_token_id")
      .eq("user_id", userId)
      .maybeSingle()

    if (error) {
      console.error("Session validation query error:", error)
      // On transient network errors, don't prematurely invalidate
      return { isValid: true }
    }

    if (!data) {
      // No active session record found in DB yet (could be first login)
      return { isValid: true }
    }

    if (data.session_token_id !== localToken) {
      // A new login occurred for this same account elsewhere
      return { isValid: false, reason: "superseded" }
    }

    return { isValid: true }
  } catch (err) {
    console.error("Session validation error:", err)
    return { isValid: true }
  }
}

/**
 * Clears the session for the current tab only.
 * Does NOT destroy sessions of other tabs.
 */
export async function clearTabSession(): Promise<void> {
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.removeItem(SESSION_TOKEN_KEY)
      window.sessionStorage.removeItem(TAB_ROLE_KEY)

      // Clear any sb-* tokens in sessionStorage for this tab
      const keysToRemove: string[] = []
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const key = window.sessionStorage.key(i)
        if (key && (key.startsWith("sb-") || key.includes("auth-token"))) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach((k) => window.sessionStorage.removeItem(k))
    } catch {
      // Ignore
    }
  }

  try {
    const supabase = createClient()
    await supabase.auth.signOut()
  } catch {
    // Ignore signOut errors on cleanup
  }
}
