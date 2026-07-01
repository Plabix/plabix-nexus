import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { apiError, rateLimitedResponse } from "@/lib/api-error";
import { requireProfile } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { streamRagAnswer, type ChatStreamEvent } from "@/lib/rag/answer";
import { createClient } from "@/lib/supabase/server";
import { truncate } from "@/lib/utils";
import { sendMessageSchema } from "@/lib/validation/schemas";
import type { Citation } from "@/types/database";

export const maxDuration = 60;

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/chat/sessions/:id/messages — sends a user message, then streams
 * back the assistant's cited answer as newline-delimited JSON events
 * (see ChatStreamEvent). The user message and the completed assistant
 * message are both persisted before/after the stream, so a page refresh
 * mid-stream still leaves the conversation in a consistent state.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: sessionId } = await params;
    const profile = await requireProfile();

    const withinLimit = await checkRateLimit("chat", profile.organization_id, profile.id);
    if (!withinLimit) return rateLimitedResponse();

    const body = sendMessageSchema.parse({ ...(await request.json()), sessionId });

    const supabase = await createClient();

    const { data: session, error: sessionError } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("organization_id", profile.organization_id)
      .eq("user_id", profile.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Chat session not found." }, { status: 404 });
    }

    const { error: userMessageError } = await supabase.from("chat_messages").insert({
      session_id: sessionId,
      organization_id: profile.organization_id,
      role: "user",
      content: body.content,
    });

    if (userMessageError) throw userMessageError;

    if (session.title === "New chat") {
      await supabase
        .from("chat_sessions")
        .update({ title: truncate(body.content, 60) })
        .eq("id", sessionId);
    } else {
      await supabase.from("chat_sessions").update({ updated_at: new Date().toISOString() }).eq("id", sessionId);
    }

    const sourceStream = streamRagAnswer(body.content, profile.organization_id, body.documentIds);

    let fullAnswer = "";
    let citations: Citation[] = [];
    const decoder = new TextDecoder();

    const proxyStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const reader = sourceStream.getReader();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            controller.enqueue(value);
            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              if (!line.trim()) continue;
              const event = JSON.parse(line) as ChatStreamEvent;
              if (event.type === "token") fullAnswer += event.content;
              if (event.type === "citations") citations = event.citations;
            }
          }
        } finally {
          await supabase.from("chat_messages").insert({
            session_id: sessionId,
            organization_id: profile.organization_id,
            role: "assistant",
            content: fullAnswer,
            citations,
          });
          controller.close();
        }
      },
    });

    return new Response(proxyStream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
    return apiError(error);
  }
}

