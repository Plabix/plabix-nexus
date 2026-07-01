import { NextResponse, type NextRequest } from "next/server";

import { apiError } from "@/lib/api-error";
import { generateApiKey } from "@/lib/api-keys";
import { requireAdminProfile } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createApiKeySchema } from "@/lib/validation/schemas";

/** GET /api/api-keys — list API keys for the organization (admins only, never returns secrets). */
export async function GET() {
  try {
    const profile = await requireAdminProfile();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("api_keys")
      .select("id, name, key_prefix, last_used_at, revoked_at, created_at")
      .eq("organization_id", profile.organization_id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ apiKeys: data });
  } catch (error) {
    return apiError(error);
  }
}

/**
 * POST /api/api-keys — create a new API key. The raw secret is returned
 * exactly once in this response and is never retrievable again.
 *
 * Uses the admin client for the insert because the key_hash column, while
 * not literally secret on its own, should never be selectable by a normal
 * client query — service-role write keeps the write path identical to how
 * a future programmatic-access verification flow would look it up.
 */
export async function POST(request: NextRequest) {
  try {
    const profile = await requireAdminProfile();
    const body = createApiKeySchema.parse(await request.json());

    const { rawKey, displayPrefix, hash } = generateApiKey();
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("api_keys")
      .insert({
        organization_id: profile.organization_id,
        created_by: profile.id,
        name: body.name,
        key_prefix: displayPrefix,
        key_hash: hash,
      })
      .select("id, name, key_prefix, last_used_at, revoked_at, created_at")
      .single();

    if (error) throw error;

    return NextResponse.json({ apiKey: data, rawKey }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
