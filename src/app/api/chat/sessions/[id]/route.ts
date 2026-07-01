import { NextResponse, type NextRequest } from "next/server";

import { apiError } from "@/lib/api-error";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** GET /api/chat/sessions/:id — fetch a session with its full message history. */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const profile = await requireProfile();
    const supabase = await createClient();

    const { data: session, error: sessionError } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("id", id)
      .eq("organization_id", profile.organization_id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Chat session not found." }, { status: 404 });
    }

    const { data: messages, error: messagesError } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("session_id", id)
      .order("created_at", { ascending: true });

    if (messagesError) throw messagesError;

    return NextResponse.json({ session, messages });
  } catch (error) {
    return apiError(error);
  }
}

/** DELETE /api/chat/sessions/:id — delete a session and its messages. */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const profile = await requireProfile();
    const supabase = await createClient();

    const { error } = await supabase
      .from("chat_sessions")
      .delete()
      .eq("id", id)
      .eq("organization_id", profile.organization_id)
      .eq("user_id", profile.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
