import { createClient as createSupabaseClient, SupabaseClient } from "@supabase/supabase-js"

/**
 * Generates or retrieves a stable, unique ID for the current browser tab.
 * Stored in window.sessionStorage so it persists across page refreshes (F5)
 * within the same tab, but is completely isolated from other tabs.
 */
export function getTabId(): string {
  if (typeof window === "undefined") return "server"
  try {
    let tabId = window.sessionStorage.getItem("fa_tab_id")
    if (!tabId) {
      tabId = "tab_" + Math.random().toString(36).substring(2, 10) + "_" + Date.now().toString(36)
      window.sessionStorage.setItem("fa_tab_id", tabId)
    }
    return tabId
  } catch {
    return "tab_default"
  }
}

let cachedClient: SupabaseClient | null = null
let cachedTabId: string | null = null

/**
 * Creates or returns the tab-scoped browser Supabase client.
 * 
 * Each tab uses its own unique storageKey (`fa_auth_session_${tabId}`) backed
 * by window.sessionStorage.
 * 
 * This guarantees:
 * 1) Admin in Tab 1, Teacher A in Tab 2, Teacher B in Tab 3 are 100% isolated.
 * 2) Supabase Auth BroadcastChannels are scoped to the specific tab, preventing
 *    cross-tab event leakage.
 * 3) Web Locks API contention across tabs is avoided.
 */
export function createClient(): SupabaseClient {
  if (typeof window === "undefined") {
    return createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    )
  }

  const tabId = getTabId()
  if (cachedClient && cachedTabId === tabId) {
    return cachedClient
  }

  const storageKey = `fa_auth_session_${tabId}`

  const client = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storage: window.sessionStorage,
        storageKey,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        lock: async (_name, _acquireTimeout, fn) => await fn(),
      },
    }
  )

  cachedClient = client
  cachedTabId = tabId

  // Set up automatic Authorization header injection for /api/* fetch requests
  setupApiFetchInterceptor(client)

  return client
}

let isFetchInterceptorSetup = false

/**
 * Intercepts window.fetch calls to local /api/* routes and attaches the
 * current tab's Supabase access token in the Authorization header.
 * This guarantees that server-side API routes always receive the authentic
 * user identity of the specific tab making the call.
 */
function setupApiFetchInterceptor(supabase: SupabaseClient) {
  if (typeof window === "undefined" || isFetchInterceptorSetup) return
  isFetchInterceptorSetup = true

  const originalFetch = window.fetch

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    try {
      const urlStr = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url

      // Only attach auth tokens to local internal API routes
      if (urlStr.startsWith("/api/") || (urlStr.startsWith(window.location.origin) && urlStr.includes("/api/"))) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          const headers = new Headers(init?.headers || (typeof input === "object" && "headers" in input ? input.headers : undefined))
          if (!headers.has("Authorization")) {
            headers.set("Authorization", `Bearer ${session.access_token}`)
          }
          const modifiedInit: RequestInit = {
            ...init,
            headers,
          }
          return originalFetch.call(this, input, modifiedInit)
        }
      }
    } catch {
      // On any interceptor failure, fallback to original fetch
    }

    return originalFetch.apply(this, [input, init])
  }
}
