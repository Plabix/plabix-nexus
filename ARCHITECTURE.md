# Architecture

## Overview

Plabix Nexus is a multi-tenant Next.js application. Every organization's documents, chats, and API keys are isolated by Postgres Row Level Security (RLS) — not just by application-layer `WHERE` clauses — so a bug in a query is not a tenant-isolation bug.

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Browser   │────▶│  Next.js (App     │────▶│   Supabase       │
│  (React 19) │◀────│  Router, Vercel)  │◀────│  Postgres +      │
└─────────────┘     │                   │     │  pgvector +      │
                     │  ┌─────────────┐ │     │  Storage + Auth  │
                     │  │ RAG pipeline│ │     └─────────────────┘
                     │  │ (LangChain) │─┼────▶┌─────────────────┐
                     │  └─────────────┘ │     │     OpenAI       │
                     └──────────────────┘     │ (chat + embed)   │
                                               └─────────────────┘
```

## Multi-tenancy

- Every signup (`src/app/(auth)/actions.ts` → Supabase `signUp`) fires the `handle_new_user` Postgres trigger (`supabase/migrations/0003_functions.sql`), which creates a new `organizations` row and a `profiles` row linking the new auth user to it as `owner`.
- Every domain table (`documents`, `document_chunks`, `chat_sessions`, `chat_messages`, `api_keys`, `rate_limit_events`) carries an `organization_id` column.
- RLS policies (`supabase/migrations/0002_rls_policies.sql`) restrict every `select`/`insert`/`update`/`delete` to rows where `organization_id = current_organization_id()` — a `security definer` SQL function that looks up the caller's org from `profiles`. This means even a request that skips application-level filtering still can't read or write another tenant's data, as long as it uses the anon/authenticated Postgres role.
- Uploaded files live in Supabase Storage under `documents/{organization_id}/{document_id}/{file_name}` — storage policies (`0004_storage.sql`) check that the first path segment matches the caller's organization, so the path prefix is a second, independent enforcement of the same boundary.
- The **service-role client** (`src/lib/supabase/admin.ts`) intentionally bypasses RLS. It's used only in the RAG pipeline (`src/lib/rag/ingest.ts`, `src/lib/rag/retrieve.ts`) where the server already knows the correct `organization_id` from the authenticated request and needs to write chunk embeddings without per-row RLS overhead. It is marked `import "server-only"` so an accidental client-side import fails at build time.

## Auth flow

- Supabase Auth issues httpOnly cookies. `src/lib/supabase/server.ts` creates a per-request client that reads/writes those cookies via `@supabase/ssr`, so Server Components, Route Handlers, and Server Actions all see the same session.
- `src/middleware.ts` (via `src/lib/supabase/middleware.ts`) refreshes the session on every navigation and redirects unauthenticated users away from `/dashboard/*`.
- `src/lib/auth/session.ts` exposes `requireProfile()` (throws/redirects if unauthenticated) and `requireAdminProfile()` (also requires `owner`/`admin` role) — every protected Server Component and API route calls one of these first.

## Document ingestion pipeline

`POST /api/documents` (`src/app/api/documents/route.ts`) runs synchronously, end to end, inside the request:

1. **Validate** — file type/size checked against `src/lib/validation/schemas.ts`.
2. **Store** — the raw file is uploaded to Supabase Storage; a `documents` row is created with `status: pending`.
3. **Extract** (`src/lib/rag/extract.ts`) — text is pulled out per file type: `pdf-parse` for PDF, `mammoth` for `.docx`, direct UTF-8 decoding for `.txt`/`.md`.
4. **Chunk** (`src/lib/rag/chunk.ts`) — LangChain's `RecursiveCharacterTextSplitter` breaks the text into overlapping chunks sized for the embedding model's context window.
5. **Embed** (`src/lib/ai/embeddings.ts`) — each chunk is embedded via `text-embedding-3-small` (configurable) and inserted into `document_chunks.embedding` (a `vector(1536)` pgvector column) using the service-role client.
6. **Finalize** — the document's `status` moves to `ready` (or `failed`, with `error_message` set, if any step throws) and `chunk_count` is recorded.

This is intentionally synchronous rather than queued — the operation is fast enough for typical document sizes to fit comfortably inside a serverless function's timeout, and it keeps the system simpler with one fewer moving part. If you need to support very large files or bulk imports, the natural extension point is to swap step 3–6 for a background job (e.g. a queue + worker, or a Vercel/Supabase Edge Function triggered by the storage upload) without touching steps 1–2 or the RLS/schema layer.

## RAG chat pipeline

`POST /api/chat/sessions/:id/messages` (`src/app/api/chat/sessions/[id]/messages/route.ts`):

1. The user's message is persisted immediately.
2. `src/lib/rag/retrieve.ts` embeds the question and calls the `match_document_chunks` Postgres function (`0003_functions.sql`) — a pgvector cosine-similarity search (`<=>` operator) scoped to `organization_id`, returning the top-K most relevant chunks.
3. `src/lib/rag/answer.ts` (`streamRagAnswer`) builds a prompt that:
   - Includes only the retrieved chunks as context, each labeled `[1]`, `[2]`, etc.
   - Instructs the model to answer **only** from the provided context and to explicitly say the information wasn't found if the context doesn't cover the question — this is a prompt-level constraint, not a code-level one, and it is worth stating explicitly: the model can still occasionally cite something out of context. Retrieval quality (embedding model, chunk size, top-K) is the main lever for controlling this in practice.
   - Streams the answer token-by-token as newline-delimited JSON events (`{"type":"token","content":"..."}`), followed by a final `{"type":"citations","citations":[...]}` event mapping each `[n]` marker to its source document and snippet.
4. The Route Handler proxies that stream straight to the client while also accumulating it server-side, so the completed assistant message (with citations) is persisted to `chat_messages` the moment the stream ends — a page refresh mid-answer doesn't lose the conversation.
5. The client (`src/components/dashboard/chat-interface.tsx`) reads the stream incrementally and renders citation markers as interactive chips (`src/components/dashboard/citation-chip.tsx`) that show the source snippet on click.

## Rate limiting

`src/lib/rate-limit.ts` wraps the `check_rate_limit` Postgres function, which counts rows in `rate_limit_events` within a trailing window per `(organization_id, route)` and atomically records the new event if under the limit — safe under concurrent requests because the check-and-insert happens inside a single `security definer` function call, not as two round-trips from the application. This avoids needing an external store (Redis) for a feature this size, at the cost of one extra table; see `DEPLOYMENT.md` for when to swap it out.

## Error handling

- `src/lib/api-error.ts` centralizes how thrown errors (Zod validation errors, Supabase errors, generic `Error`s) become HTTP responses with an appropriate status code and a safe, user-facing message — internal error details are logged server-side but never leaked to the client.
- Next.js `error.tsx` boundaries at the root and dashboard level catch render-time errors; `not-found.tsx` handles missing routes.
- Client components that call the API surface failures via toast notifications (`sonner`) rather than silent failures.

## Why these specific trade-offs

- **Synchronous ingestion over a job queue**: fewer moving parts, no extra infrastructure (queue, worker, webhook) to deploy and monitor, at the cost of ingestion time being bounded by the serverless function timeout. Acceptable for the documents this product targets (handbooks, policies, contracts — typically well under a few hundred pages).
- **Postgres-backed rate limiting over Redis**: one fewer external dependency to provision and pay for; revisit if request volume grows enough that the extra table write becomes a measurable bottleneck.
- **Hand-authored Supabase types over generated ones**: this project was built without a live Supabase project to run `supabase gen types` against. `src/types/database.ts` is structured to be a drop-in replacement — once you have a live project, running `supabase gen types typescript --linked > src/types/database.ts` will keep everything working with no other code changes, since all query code goes through the same `Database` generic.
