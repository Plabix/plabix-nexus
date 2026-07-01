import { embedTexts } from "@/lib/ai/embeddings";
import { extractText } from "@/lib/rag/extract";
import { chunkText, estimateTokenCount } from "@/lib/rag/chunk";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupportedFileType } from "@/types/database";

export interface IngestResult {
  chunkCount: number;
}

/**
 * Runs the full ingestion pipeline for a single document that has already
 * been uploaded to storage and recorded in the `documents` table with
 * status 'pending': download -> extract -> chunk -> embed -> persist
 * chunks -> mark 'ready' (or 'failed' with a stored error message).
 *
 * Uses the service-role client because this typically runs outside the
 * uploading user's request lifecycle (or at least after their request has
 * already returned), but every operation is scoped to the document's own
 * organization_id, which was set under RLS at upload time.
 */
export async function ingestDocument(documentId: string): Promise<IngestResult> {
  const admin = createAdminClient();

  const { data: document, error: fetchError } = await admin
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .single();

  if (fetchError || !document) {
    throw new Error(`Document ${documentId} not found: ${fetchError?.message ?? "unknown error"}`);
  }

  try {
    await admin.from("documents").update({ status: "processing" }).eq("id", documentId);

    const { data: fileData, error: downloadError } = await admin.storage
      .from("documents")
      .download(document.storage_path);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file from storage: ${downloadError?.message}`);
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const text = await extractText(buffer, document.file_type as SupportedFileType);
    const chunks = await chunkText(text);

    if (chunks.length === 0) {
      throw new Error("Document produced no usable text chunks after extraction.");
    }

    const embeddings = await embedTexts(chunks.map((c) => c.content));

    const rows = chunks.map((chunk, i) => ({
      document_id: documentId,
      organization_id: document.organization_id,
      chunk_index: chunk.index,
      content: chunk.content,
      token_count: estimateTokenCount(chunk.content),
      embedding: embeddings[i],
    }));

    // Replace any prior chunks (covers re-ingestion / retry) before inserting.
    await admin.from("document_chunks").delete().eq("document_id", documentId);

    const BATCH_SIZE = 200;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const { error: insertError } = await admin
        .from("document_chunks")
        .insert(rows.slice(i, i + BATCH_SIZE));
      if (insertError) {
        throw new Error(`Failed to store chunks: ${insertError.message}`);
      }
    }

    await admin
      .from("documents")
      .update({ status: "ready", chunk_count: rows.length, error_message: null })
      .eq("id", documentId);

    return { chunkCount: rows.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown ingestion error";
    await admin
      .from("documents")
      .update({ status: "failed", error_message: message })
      .eq("id", documentId);
    throw error;
  }
}
