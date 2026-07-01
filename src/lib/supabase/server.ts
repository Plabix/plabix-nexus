import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { getClientEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Supabase client for use in Server Components, Route Handlers, and Server
 * Actions. Operates as the signed-in user — every query goes through RLS.
 *
 * Must be awaited and called fresh per-request (Next.js's `cookies()` is
 * request-scoped), so this is a factory, not a singleton.
 */
export async function createClient() {
  const env = getClientEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component without a mutable response —
            // safe to ignore because middleware refreshes the session on
            // every navigation anyway.
          }
        },
      },
    }
  );
}
