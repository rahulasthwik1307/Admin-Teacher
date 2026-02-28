import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase admin client with the service_role key.
 * This client bypasses RLS and should ONLY be used in server-side code.
 * Never import this in client components.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
