import { z } from "zod";

/**
 * Centralized environment variable validation.
 *
 * Importing from this module instead of reading `process.env` directly
 * means a missing/misconfigured variable fails fast with a clear message
 * the first time it's actually used, rather than causing a confusing
 * runtime error deep inside a request handler. Build-time (`next build`)
 * never evaluates these getters, so the app can still be built without
 * real secrets present (e.g. in CI).
 */

const serverSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_BASE_URL: z.string().url().optional(),
  OPENAI_CHAT_MODEL: z.string().min(1).optional(),
  OPENAI_EMBEDDING_MODEL: z.string().min(1).optional(),
});

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

type ServerEnv = z.infer<typeof serverSchema>;
type ClientEnv = z.infer<typeof clientSchema>;

let cachedServerEnv: ServerEnv | null = null;
let cachedClientEnv: ClientEnv | null = null;

/** Throws a descriptive error if required server-side env vars are missing. */
export function getServerEnv(): ServerEnv {
  if (cachedServerEnv) return cachedServerEnv;

  const parsed = serverSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
    OPENAI_CHAT_MODEL: process.env.OPENAI_CHAT_MODEL,
    OPENAI_EMBEDDING_MODEL: process.env.OPENAI_EMBEDDING_MODEL,
  });

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Missing or invalid environment variables. Copy .env.example to .env.local and fill in:\n${issues}`
    );
  }

  cachedServerEnv = parsed.data;
  return cachedServerEnv;
}

/** Throws a descriptive error if required public env vars are missing. */
export function getClientEnv(): ClientEnv {
  if (cachedClientEnv) return cachedClientEnv;

  const parsed = clientSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!parsed.success) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env.local and fill in your Supabase project credentials."
    );
  }

  cachedClientEnv = parsed.data;
  return cachedClientEnv;
}

/** Returns the configured OpenAI chat model, defaulting to gpt-4o-mini. */
export function getChatModel(): string {
  return process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
}

/** Returns the configured OpenAI embedding model, defaulting to text-embedding-3-small. */
export function getEmbeddingModel(): string {
  return process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
}

/** Dimension of the embedding model above — must match the pgvector column width. */
export const EMBEDDING_DIMENSIONS = 1536;
