import { randomUUID } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { apiError, rateLimitedResponse } from "@/lib/api-error";
import { requireProfile } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { detectFileType } from "@/lib/rag/extract";
import { ingestDocument } from "@/lib/rag/ingest";
import { createClient } from "@/lib/supabase/server";
import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE_BYTES } from "@/lib/validation/schemas";

export const maxDuration = 60;

/** GET /api/documents?q=search — list documents in the caller's organization. */
export async function GET(request: NextRequest) {
  try {
    const profile = await requireProfile();
    const supabase = await createClient();
    const q = request.nextUrl.searchParams.get("q")?.trim();

    let query = supabase
      .from("documents")
      .select("*")
      .eq("organization_id", profile.organization_id)
      .order("created_at", { ascending: false });

    if (q) {
      query = query.ilike("title", `%${q}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ documents: data });
  } catch (error) {
    return apiError(error);
  }
}

/** POST /api/documents — upload a new document and run it through the RAG ingestion pipeline. */
export async function POST(request: NextRequest) {
  try {
    const profile = await requireProfile();

    const withinLimit = await checkRateLimit("upload", profile.organization_id, profile.id);
    if (!withinLimit) return rateLimitedResponse();

    const formData = await request.formData();
    const file = formData.get("file");
    const titleInput = formData.get("title");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file was uploaded." }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "The uploaded file is empty." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Files must be 25 MB or smaller." },
        { status: 400 }
      );
    }

    const fileType = detectFileType(file.name, file.type);
    if (!fileType || !ACCEPTED_FILE_TYPES.includes(file.type as (typeof ACCEPTED_FILE_TYPES)[number])) {
      return NextResponse.json(
        { error: "Unsupported file type. Upload a PDF, DOCX, TXT, or Markdown file." },
        { status: 400 }
      );
    }

    const title =
      typeof titleInput === "string" && titleInput.trim().length > 0
        ? titleInput.trim()
        : file.name.replace(/\.[^./]+$/, "");

    const documentId = randomUUID();
    const storagePath = `${profile.organization_id}/${documentId}/${file.name}`;

    const supabase = await createClient();

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(storagePath, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      return NextResponse.json(
        { error: `Failed to upload file: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data: document, error: insertError } = await supabase
      .from("documents")
      .insert({
        id: documentId,
        organization_id: profile.organization_id,
        uploaded_by: profile.id,
        title,
        file_name: file.name,
        file_type: fileType,
        file_size_bytes: file.size,
        storage_path: storagePath,
        status: "pending",
      })
      .select("*")
      .single();

    if (insertError || !document) {
      await supabase.storage.from("documents").remove([storagePath]);
      return NextResponse.json(
        { error: `Failed to save document record: ${insertError?.message}` },
        { status: 500 }
      );
    }

    try {
      await ingestDocument(documentId);
    } catch (ingestionError) {
      // Document row already reflects status 'failed' with an error_message
      // (ingestDocument sets this itself) — return 200 with that state so
      // the client can show it in the list rather than a hard failure.
      console.error("Ingestion failed:", ingestionError);
    }

    const { data: finalDocument } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();

    return NextResponse.json({ document: finalDocument ?? document }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
