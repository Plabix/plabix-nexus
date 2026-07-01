import { NextResponse, type NextRequest } from "next/server";

import { apiError } from "@/lib/api-error";
import { requireAdminProfile, requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { updateOrganizationSchema } from "@/lib/validation/schemas";

/** GET /api/organization — fetch the caller's organization. */
export async function GET() {
  try {
    const profile = await requireProfile();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", profile.organization_id)
      .single();

    if (error) throw error;

    return NextResponse.json({ organization: data });
  } catch (error) {
    return apiError(error);
  }
}

/** PATCH /api/organization — rename the organization (admins only). */
export async function PATCH(request: NextRequest) {
  try {
    const profile = await requireAdminProfile();
    const body = updateOrganizationSchema.parse(await request.json());

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("organizations")
      .update({ name: body.name })
      .eq("id", profile.organization_id)
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ organization: data });
  } catch (error) {
    return apiError(error);
  }
}
