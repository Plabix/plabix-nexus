# Deployment (Vercel)

This app is built for Vercel's Next.js runtime with no special configuration required beyond environment variables.

## 1. Push to GitHub

Vercel deploys from a Git repository. If you haven't already, push this project to GitHub (see the root `README.md` / your project's git remote).

## 2. Import the project into Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import your GitHub repository.
2. Framework preset: **Next.js** (auto-detected).
3. Build command / output directory: leave as default (`next build`, `.next`).

## 3. Set environment variables

In **Project Settings → Environment Variables**, add (for both Production and Preview environments):

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | From your Supabase project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | From your Supabase project |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret.** Never expose this to the client. |
| `OPENAI_API_KEY` | **Secret.** |
| `OPENAI_BASE_URL` | Optional — only if using a non-OpenAI provider |
| `OPENAI_CHAT_MODEL` | Optional — defaults to `gpt-4o-mini` |
| `OPENAI_EMBEDDING_MODEL` | Optional — defaults to `text-embedding-3-small` |

Use different Supabase projects for Preview vs. Production if you want isolated data; otherwise pointing both at the same project is fine for a small team.

## 4. Update Supabase redirect URLs

In your Supabase project, under **Authentication → URL Configuration**, add your Vercel deployment URL(s) to **Redirect URLs**:

```
https://your-app.vercel.app/auth/callback
https://your-custom-domain.com/auth/callback
```

Without this, email confirmation links will redirect to `/auth/auth-code-error`.

## 5. Deploy

Click **Deploy**. Vercel will run `npm install` and `next build` automatically. The chat API route sets `maxDuration = 60` for streaming responses — if you're on the Vercel Hobby plan, function duration is capped at 60s by default, which matches; on Pro you can raise it if you use larger models or longer contexts.

## 6. Run database migrations against the same project

If you haven't already run `supabase db push` (see `INSTALL.md`) against the Supabase project your production environment variables point to, do that now — the app will build and deploy fine without it, but every request will fail at runtime with "relation does not exist" until the schema exists.

## Post-deploy checklist

- [ ] Sign up for a new account on the deployed URL and confirm the flow works end-to-end (signup → email confirmation → dashboard).
- [ ] Upload a small `.txt` file and confirm it reaches `status: ready`.
- [ ] Ask a question in chat and confirm you get a cited answer.
- [ ] Check Vercel's function logs for any startup errors related to missing environment variables.

## Scaling notes

- **Rate limiting** is implemented as a Postgres-backed sliding window (`rate_limit_events` table + `check_rate_limit()` RPC), which is correct under concurrent serverless invocations without needing Redis. If your traffic grows enough that this table becomes a bottleneck, swap it for Upstash Redis or Vercel KV — the call sites are all isolated in `src/lib/rate-limit.ts`.
- **Vector search** uses an IVFFlat index (`document_chunks_embedding_idx`). IVFFlat needs a `REINDEX` (or an increased `lists` parameter) as your corpus grows past roughly a few hundred thousand chunks; for most single-organization or small-team deployments this won't matter for a long time.
- **File size limit** for uploads is capped at 25 MB at both the Supabase Storage bucket level and the API route — raise both together in `supabase/migrations/0004_storage.sql` and `src/lib/validation/schemas.ts` if you need larger documents.
