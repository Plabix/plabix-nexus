import { ChatOpenAI } from "@langchain/openai";

import { getChatModel, getServerEnv } from "@/lib/env";

/**
 * Chat completions go through LangChain's ChatOpenAI wrapper rather than
 * the raw OpenAI SDK. Swapping providers later (Anthropic, Mistral, a
 * local model via Ollama) means changing this one constructor — every
 * caller in lib/rag depends only on LangChain's BaseChatModel interface.
 */
export function getChatLLM(options?: { temperature?: number; streaming?: boolean }) {
  const env = getServerEnv();
  if (!env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is not configured. Add it to .env.local to enable document ingestion and chat."
    );
  }
  return new ChatOpenAI({
    apiKey: env.OPENAI_API_KEY,
    model: getChatModel(),
    temperature: options?.temperature ?? 0.1,
    streaming: options?.streaming ?? false,
    configuration: env.OPENAI_BASE_URL ? { baseURL: env.OPENAI_BASE_URL } : undefined,
  });
}
