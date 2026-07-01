import { NextResponse, type NextRequest } from "next/server";

import { apiError } from "@/lib/api-error";
import { requireAdminProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** DELETE /api/api-keys/:id — revoke an API key (admins only). */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const profile = await requireAdminProfile();
    const supabase = await createClient();

    const { error } = await supabase
      .from("api_keys")
      .delete()
      .eq("id", id)
      .eq("organization_id", profile.organization_id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
