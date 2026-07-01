import { OpenAIEmbeddings } from "@langchain/openai";

import { getEmbeddingModel, getServerEnv } from "@/lib/env";

/**
 * Embeddings are accessed through LangChain's provider-agnostic interface.
 * To switch providers later, swap this constructor for another LangChain
 * embeddings class (e.g. CohereEmbeddings) — nothing else in the RAG
 * pipeline needs to change since it only depends on `embedTexts`/`embedQuery`.
 */
function getEmbeddingsClient() {
  const env = getServerEnv();
  if (!env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is not configured. Add it to .env.local to enable document ingestion and chat."
    );
  }
  return new OpenAIEmbeddings({
    apiKey: env.OPENAI_API_KEY,
    model: getEmbeddingModel(),
    configuration: env.OPENAI_BASE_URL ? { baseURL: env.OPENAI_BASE_URL } : undefined,
  });
}

const EMBED_BATCH_SIZE = 96;

/** Embeds many texts in batches, preserving input order in the output. */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const client = getEmbeddingsClient();
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += EMBED_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBED_BATCH_SIZE);
    const vectors = await client.embedDocuments(batch);
    results.push(...vectors);
  }

  return results;
}

/** Embeds a single query string (e.g. a chat question) for vector search. */
export async function embedQuery(text: string): Promise<number[]> {
  const client = getEmbeddingsClient();
  return client.embedQuery(text);
}
