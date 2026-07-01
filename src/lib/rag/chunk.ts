import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export interface TextChunk {
  index: number;
  content: string;
}

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 150;

/**
 * Splits extracted document text into overlapping chunks sized for
 * embedding. Recursive splitting tries paragraph, then sentence, then word
 * boundaries before falling back to a hard cut, which keeps chunks
 * semantically coherent far more often than a fixed-width split.
 */
export async function chunkText(text: string): Promise<TextChunk[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
    separators: ["\n\n", "\n", ". ", " ", ""],
  });

  const pieces = await splitter.splitText(normalizeWhitespace(text));

  return pieces
    .map((content) => content.trim())
    .filter((content) => content.length > 0)
    .map((content, index) => ({ index, content }));
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{4,}/g, "\n\n\n");
}

/** Rough token estimate (no tokenizer dependency needed for display purposes). */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}
