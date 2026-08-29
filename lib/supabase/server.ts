import { createServerClient } from "@supabase/ssr"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { cookies, headers } from "next/headers"

/**
 * Creates a server-side Supabase client for Route Handlers and Server Components.
 * 
 * Supports:
 * 1) Bearer token authentication via incoming Authorization header (tab-isolated API requests).
 * 2) Cookie-based authentication fallback.
 */
export async function createClient() {
  try {
    const headerStore = await headers()
    const authHeader = headerStore.get("authorization")

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7).trim()
      if (token) {
        return createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            global: {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
            auth: {
              persistSession: false,
              autoRefreshToken: false,
            },
          }
        )
      }
    }
  } catch {
    // In environments where headers() is not accessible, proceed to cookie store
  }

  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Can be ignored if called from a Server Component
          }
        },
      },
    }
  )
}
