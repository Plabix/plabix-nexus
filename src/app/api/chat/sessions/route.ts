import { NextResponse, type NextRequest } from "next/server";

import { apiError } from "@/lib/api-error";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createSessionSchema } from "@/lib/validation/schemas";

/** GET /api/chat/sessions — list the caller's chat sessions, most recent first. */
export async function GET() {
  try {
    const profile = await requireProfile();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("organization_id", profile.organization_id)
      .eq("user_id", profile.id)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ sessions: data });
  } catch (error) {
    return apiError(error);
  }
}

/** POST /api/chat/sessions — start a new chat session. */
export async function POST(request: NextRequest) {
  try {
    const profile = await requireProfile();
    const body = createSessionSchema.parse(await request.json().catch(() => ({})));

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("chat_sessions")
      .insert({
        organization_id: profile.organization_id,
        user_id: profile.id,
        title: body.title ?? "New chat",
      })
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ session: data }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
