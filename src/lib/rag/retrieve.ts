import { embedQuery } from "@/lib/ai/embeddings";
import { createAdminClient } from "@/lib/supabase/admin";

export interface RetrievedChunk {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  chunkIndex: number;
  content: string;
  similarity: number;
}

const DEFAULT_MATCH_COUNT = 8;
/** Below this cosine similarity, a chunk is treated as not actually relevant. */
const MIN_SIMILARITY = 0.72;

/**
 * Embeds a query and retrieves the most similar document chunks for an
 * organization via the `match_document_chunks` Postgres function (pgvector
 * cosine distance under an IVFFlat index). Joins back to `documents` for
 * display titles needed in citations.
 */
export async function retrieveRelevantChunks(
  query: string,
  organizationId: string,
  options?: { documentIds?: string[]; matchCount?: number }
): Promise<RetrievedChunk[]> {
  const admin = createAdminClient();
  const queryEmbedding = await embedQuery(query);

  const { data, error } = await admin.rpc("match_document_chunks", {
    query_embedding: queryEmbedding,
    match_organization_id: organizationId,
    match_count: options?.matchCount ?? DEFAULT_MATCH_COUNT,
    match_document_ids: options?.documentIds ?? null,
  });

  if (error) {
    throw new Error(`Vector search failed: ${error.message}`);
  }

  const matches = (data ?? []).filter((m) => m.similarity >= MIN_SIMILARITY);
  if (matches.length === 0) return [];

  const documentIds = Array.from(new Set(matches.map((m) => m.document_id)));
  const { data: documents, error: docsError } = await admin
    .from("documents")
    .select("id, title")
    .in("id", documentIds);

  if (docsError) {
    throw new Error(`Failed to load document titles: ${docsError.message}`);
  }

  const titleById = new Map((documents ?? []).map((d) => [d.id, d.title]));

  return matches.map((m) => ({
    chunkId: m.id,
    documentId: m.document_id,
    documentTitle: titleById.get(m.document_id) ?? "Untitled document",
    chunkIndex: m.chunk_index,
    content: m.content,
    similarity: m.similarity,
  }));
}
