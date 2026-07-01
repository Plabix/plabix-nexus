import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { getServerEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Service-role Supabase client. BYPASSES ROW LEVEL SECURITY — never import
 * this into client-facing code or expose it to a request handler that
 * doesn't first verify the caller's organization membership itself.
 *
 * Used by the document ingestion pipeline (writing embeddings on behalf of
 * a background job) and the vector search RPC call, both of which already
 * scope every query by an organization_id taken from the authenticated
 * user's own session before this client is touched.
 */
export function createAdminClient() {
  const env = getServerEnv();
  return createSupabaseClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
