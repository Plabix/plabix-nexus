# Folder structure

```
second-brain-saas/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Login/signup — shared minimal layout, no dashboard chrome
│   │   │   ├── actions.ts            # Server Actions: login, signup, logout
│   │   │   ├── layout.tsx
│   │   │   ├── login/
│   │   │   └── signup/
│   │   ├── api/                      # Route Handlers (REST-ish JSON API)
│   │   │   ├── api-keys/             # List/create/revoke organization API keys
│   │   │   ├── chat/sessions/        # Chat session + streaming message endpoints
│   │   │   ├── documents/            # Upload, list/search, rename, delete
│   │   │   └── organization/         # Read/update org profile
│   │   ├── auth/
│   │   │   ├── callback/route.ts     # Exchanges Supabase's email-confirmation code for a session
│   │   │   └── auth-code-error/      # Shown if that exchange fails
│   │   ├── dashboard/                # Everything behind auth
│   │   │   ├── layout.tsx            # Loads the session, renders the shell (sidebar/topbar)
│   │   │   ├── page.tsx              # Overview / stats
│   │   │   ├── chat/                 # Chat list layout + empty state + [sessionId] conversation
│   │   │   ├── documents/            # Knowledge base management
│   │   │   └── settings/             # Organization / API keys / appearance tabs
│   │   ├── globals.css               # Design tokens (CSS variables) + Tailwind v4 theme
│   │   ├── layout.tsx                # Root layout: theme provider, toaster
│   │   ├── page.tsx                  # Public landing page
│   │   ├── not-found.tsx
│   │   ├── error.tsx / global-error.tsx  (dashboard/error.tsx, app/global-error.tsx)
│   │
│   ├── components/
│   │   ├── ui/                       # Hand-built shadcn/ui-style primitives (Button, Dialog, Table, …)
│   │   ├── dashboard/                # App-specific components (chat, documents, settings, shell/nav)
│   │   └── theme-provider.tsx
│   │
│   ├── lib/
│   │   ├── ai/                       # Thin LangChain wrappers — swap providers here only
│   │   │   ├── llm.ts                 # Chat model factory
│   │   │   └── embeddings.ts          # Embedding model factory
│   │   ├── auth/
│   │   │   └── session.ts             # requireProfile() / requireAdminProfile()
│   │   ├── rag/                      # The RAG pipeline, one concern per file
│   │   │   ├── extract.ts             # File → plain text (pdf-parse / mammoth / plain decode)
│   │   │   ├── chunk.ts               # Plain text → overlapping chunks
│   │   │   ├── ingest.ts              # Orchestrates extract → chunk → embed → persist
│   │   │   ├── retrieve.ts            # Question → embedding → pgvector similarity search
│   │   │   └── answer.ts              # Retrieved chunks → streamed, cited answer
│   │   ├── supabase/
│   │   │   ├── client.ts              # Browser client (Client Components)
│   │   │   ├── server.ts              # Server client (Server Components / Route Handlers / Actions)
│   │   │   ├── middleware.ts          # Session refresh used by src/middleware.ts
│   │   │   └── admin.ts               # Service-role client — bypasses RLS, server-only, use sparingly
│   │   ├── validation/
│   │   │   └── schemas.ts             # Every Zod schema used by API routes and forms
│   │   ├── api-error.ts               # Uniform error → HTTP response mapping
│   │   ├── api-keys.ts                # API key generation/hashing
│   │   ├── env.ts                     # Validated, typed access to environment variables
│   │   ├── rate-limit.ts              # Wraps the check_rate_limit Postgres RPC
│   │   └── utils.ts                   # cn(), formatBytes(), truncate(), getInitials()
│   │
│   ├── types/
│   │   └── database.ts                # Hand-authored equivalent of `supabase gen types typescript`
│   │
│   └── middleware.ts                  # Route protection + session refresh (runs on every request)
│
├── supabase/
│   └── migrations/                    # Numbered, run in order — see INSTALL.md
│       ├── 0001_init_schema.sql        # Extensions, enums, tables, indexes
│       ├── 0002_rls_policies.sql       # Row Level Security — the tenant-isolation boundary
│       ├── 0003_functions.sql          # Triggers + match_document_chunks + check_rate_limit RPCs
│       └── 0004_storage.sql            # Storage bucket + its access policies
│
├── .env.example                        # Every environment variable, documented
├── README.md
├── INSTALL.md
├── DEPLOYMENT.md
├── ARCHITECTURE.md
└── FOLDER_STRUCTURE.md                 # This file
```

## Where to make common changes

| I want to… | Start here |
|---|---|
| Change chunk size / overlap | `src/lib/rag/chunk.ts` |
| Change how many chunks are retrieved per question | `src/lib/rag/retrieve.ts` |
| Change the answer prompt / citation format | `src/lib/rag/answer.ts` |
| Add a supported file type | `src/lib/rag/extract.ts`, `src/lib/validation/schemas.ts`, `supabase/migrations/0001_init_schema.sql` (`file_type` check constraint), `supabase/migrations/0004_storage.sql` (`allowed_mime_types`) |
| Add a new dashboard page | `src/app/dashboard/<name>/page.tsx`, then add a link in `src/components/dashboard/nav.tsx` |
| Add a new table | New migration file in `supabase/migrations/`, then extend `src/types/database.ts` (or regenerate it against a live project) |
| Change rate limits | `src/lib/rate-limit.ts` |
| Change the color palette / fonts | `src/app/globals.css` |
