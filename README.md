# Second Brain — RAG chat for your documents

Upload your organization's documents and ask them questions in plain language. Every answer is generated **only** from what's in your uploaded knowledge base, and every claim is cited back to the source document — if the answer isn't in your documents, Second Brain says so instead of guessing.

```
"Summarize our employee handbook."
"What is our refund policy?"
"How do we onboard new employees?"
"Show documents mentioning Client X."
```

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router), React 19, TypeScript (strict) |
| UI | Tailwind CSS v4, shadcn/ui-style components (Radix primitives), lucide-react |
| Auth | Supabase Auth (email/password, cookie-based sessions) |
| Database | Supabase Postgres + pgvector |
| Storage | Supabase Storage |
| RAG | LangChain (`@langchain/openai`, `@langchain/textsplitters`) |
| LLM / Embeddings | OpenAI (`gpt-4o-mini`, `text-embedding-3-small` by default — swappable) |
| Deployment | Vercel |

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for how the pieces fit together and [`FOLDER_STRUCTURE.md`](./FOLDER_STRUCTURE.md) for a guided tour of the codebase.

## Features

- **Multi-tenant from day one** — every signup gets its own organization; all data is isolated by Postgres Row Level Security, not just application code.
- **Document ingestion** — PDF, DOCX, TXT, and Markdown, with automatic text extraction, chunking, and embedding.
- **Cited RAG chat** — streaming answers with inline `[n]` citation markers linked to the exact source passage; a deterministic "not found" response when nothing relevant exists in the knowledge base.
- **Knowledge base management** — search, rename, and delete documents; live status while a document is being processed.
- **Organization settings** — rename your org, manage API keys (created once, shown once, stored only as a hash).
- **Dark mode / light mode** — system-aware, togglable, persisted.
- **Rate limiting** — sliding-window limits per organization on chat and upload endpoints, enforced in Postgres so it's correct across concurrent serverless invocations.
- **Responsive** — usable from a phone to a widescreen monitor.

## Quick start

```bash
npm install
cp .env.example .env.local   # then fill in real values — see INSTALL.md
npm run dev
```

Full setup (Supabase project, running the SQL migrations, OpenAI key) is in [`INSTALL.md`](./INSTALL.md). Deploying to Vercel is in [`DEPLOYMENT.md`](./DEPLOYMENT.md).

## Scripts

```bash
npm run dev          # start the dev server
npm run build        # production build
npm run start        # run the production build locally
npm run lint         # ESLint
npm run lint:fix     # ESLint with autofix
npm run type-check   # tsc --noEmit
```

## Swapping the LLM provider

Chat completions and embeddings are accessed exclusively through LangChain's provider-agnostic classes (`src/lib/ai/llm.ts`, `src/lib/ai/embeddings.ts`).

- **Any OpenAI-compatible endpoint** (Azure OpenAI, OpenRouter, a local vLLM/Ollama server): set `OPENAI_BASE_URL` and the model name env vars — no code changes needed.
- **A different provider entirely**: swap the `ChatOpenAI` / `OpenAIEmbeddings` constructors in those two files for LangChain's equivalent classes. Everything downstream in `src/lib/rag/` depends only on LangChain's `BaseChatModel` / `Embeddings` interfaces.

## License

Provided as-is for you to build on.
