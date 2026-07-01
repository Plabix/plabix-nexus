# Install & local setup

## Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) account (free tier is enough to start)
- An [OpenAI](https://platform.openai.com) API key (or any OpenAI-compatible provider — see the README)

## 1. Install dependencies

```bash
npm install
```

## 2. Create a Supabase project

1. Create a new project at [supabase.com](https://supabase.com/dashboard).
2. Wait for provisioning to finish, then open **Project Settings → API**. You'll need:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret — it bypasses Row Level Security)

## 3. Run the database migrations

The schema lives in `supabase/migrations/`, in the order it must be applied:

| File | What it does |
|---|---|
| `0001_init_schema.sql` | Extensions (`pgvector`), enums, and every table |
| `0002_rls_policies.sql` | Row Level Security policies — the actual multi-tenant boundary |
| `0003_functions.sql` | New-user bootstrapping trigger, `updated_at` triggers, the `match_document_chunks` vector search RPC, and the rate-limit RPC |
| `0004_storage.sql` | The `documents` storage bucket and its access policies |

**Option A — Supabase CLI (recommended):**

```bash
npm install -g supabase
supabase login
supabase link --project-ref your-project-ref
supabase db push
```

**Option B — SQL Editor:** open **SQL Editor** in the Supabase dashboard and run each file in `supabase/migrations/` in order, top to bottom, pasting the contents of each one and clicking "Run".

## 4. Configure email confirmation (optional but recommended)

By default, Supabase requires email confirmation before a session is issued. This works out of the box with Supabase's built-in email sending for development. For production, configure a custom SMTP provider under **Project Settings → Auth → SMTP** so confirmation emails don't land in spam or hit Supabase's low sending limits.

Under **Authentication → URL Configuration**, add your site's URL (e.g. `http://localhost:3000` for local dev, your Vercel URL for production) to **Redirect URLs** — the app's `/auth/callback` route depends on this.

## 5. Set environment variables

```bash
cp .env.example .env.local
```

Fill in the values from step 2, plus your OpenAI key:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-your-openai-key
```

See `.env.example` for the full list, including optional variables for pointing at a different OpenAI-compatible provider or model.

## 6. Run it

```bash
npm run dev
```

Visit `http://localhost:3000`, sign up (this creates your organization), confirm your email if required, and you're in.

## 7. Verify everything works

```bash
npm run type-check   # TypeScript strict mode
npm run lint          # ESLint
npm run build          # Production build
```

## Troubleshooting

- **"Missing or invalid environment variables" at runtime** — you're missing a required var in `.env.local`. The error message lists exactly which one.
- **Sign-up succeeds but you're stuck on "check your email"** — email confirmation is on by default. Either confirm via the email Supabase sends, or turn off "Confirm email" under **Authentication → Providers → Email** for local development.
- **Upload succeeds but the document stays "processing" forever** — check your server logs for the actual embedding/LLM error; it's almost always an invalid or rate-limited `OPENAI_API_KEY`.
- **"relation does not exist" errors** — a migration didn't run. Re-check step 3; migrations must run in filename order.
- **Build warning: "A Node.js API is used (process.version...) which is not supported in the Edge Runtime"** — this comes from webpack tracing `@supabase/ssr`'s shared export file, not from any code in this project (the middleware here only ever imports `createServerClient`, never `createBrowserClient`). It's a known, harmless warning in the current Supabase + Next.js Edge Runtime combination and does not affect the build output or app behavior.
