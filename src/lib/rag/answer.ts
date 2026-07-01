import { getChatLLM } from "@/lib/ai/llm";
import { retrieveRelevantChunks, type RetrievedChunk } from "@/lib/rag/retrieve";
import { truncate } from "@/lib/utils";
import type { Citation } from "@/types/database";

export const NOT_FOUND_MESSAGE =
  "I couldn't find this information in your uploaded documents. Try rephrasing the question, or upload a document that covers this topic.";

/** NDJSON event types streamed from the chat route to the client. */
export type ChatStreamEvent =
  | { type: "token"; content: string }
  | { type: "citations"; citations: Citation[] }
  | { type: "done" }
  | { type: "error"; message: string };

function encodeEvent(event: ChatStreamEvent): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(event)}\n`);
}

function buildSystemPrompt(sources: RetrievedChunk[]): string {
  const sourceBlocks = sources
    .map((s, i) => `[${i + 1}] (from "${s.documentTitle}"):\n${s.content}`)
    .join("\n\n---\n\n");

  return [
    "You are a careful research assistant answering questions using only the organization's own uploaded documents.",
    "",
    "Rules you must follow exactly:",
    '1. Answer using ONLY the numbered sources below. Never use outside knowledge, even if you are confident it is correct.',
    "2. Every factual sentence must end with the bracketed number(s) of the source(s) it came from, e.g. \"Employees get 15 PTO days per year [1].\"",
    `3. If the sources do not contain the answer, respond with exactly this sentence and nothing else: "${NOT_FOUND_MESSAGE}"`,
    "4. Be concise and direct. Use short paragraphs or bullet points where helpful.",
    "",
    "Sources:",
    sourceBlocks,
  ].join("\n");
}

/** Extracts unique [n] citation markers from generated text, in order of first appearance. */
function parseCitedSourceNumbers(answer: string): number[] {
  const seen = new Set<number>();
  const ordered: number[] = [];
  for (const match of answer.matchAll(/\[(\d+)\]/g)) {
    const n = Number(match[1]);
    if (!seen.has(n)) {
      seen.add(n);
      ordered.push(n);
    }
  }
  return ordered;
}

/** Maps cited [n] markers in the generated answer back to full citation metadata. */
export function buildCitations(answer: string, sources: RetrievedChunk[]): Citation[] {
  return parseCitedSourceNumbers(answer)
    .map((n) => sources[n - 1])
    .filter((s): s is RetrievedChunk => Boolean(s))
    .map((s) => ({
      documentId: s.documentId,
      documentTitle: s.documentTitle,
      chunkId: s.chunkId,
      chunkIndex: s.chunkIndex,
      snippet: truncate(s.content, 280),
    }));
}

/**
 * Runs full RAG: retrieves relevant chunks, then streams a cited answer as
 * NDJSON events. If retrieval finds nothing above the similarity floor, the
 * "not found" message is emitted directly without ever calling the LLM —
 * deterministic, fast, and impossible for the model to override.
 */
export function streamRagAnswer(question: string, organizationId: string, documentIds?: string[]) {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const sources = await retrieveRelevantChunks(question, organizationId, { documentIds });

        if (sources.length === 0) {
          controller.enqueue(encodeEvent({ type: "token", content: NOT_FOUND_MESSAGE }));
          controller.enqueue(encodeEvent({ type: "citations", citations: [] }));
          controller.enqueue(encodeEvent({ type: "done" }));
          controller.close();
          return;
        }

        const llm = getChatLLM({ streaming: true, temperature: 0.1 });
        const stream = await llm.stream([
          { role: "system", content: buildSystemPrompt(sources) },
          { role: "user", content: question },
        ]);

        let fullAnswer = "";
        for await (const chunk of stream) {
          const content = typeof chunk.content === "string" ? chunk.content : "";
          if (content) {
            fullAnswer += content;
            controller.enqueue(encodeEvent({ type: "token", content }));
          }
        }

        const citations = buildCitations(fullAnswer, sources);
        controller.enqueue(encodeEvent({ type: "citations", citations }));
        controller.enqueue(encodeEvent({ type: "done" }));
        controller.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Something went wrong generating a response.";
        controller.enqueue(encodeEvent({ type: "error", message }));
        controller.close();
      }
    },
  });
}
