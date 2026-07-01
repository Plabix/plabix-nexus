-- ============================================================================
-- 0001_init_schema.sql
-- Core schema for Second Brain as a Service.
-- Multi-tenant: every domain table carries organization_id and is scoped by
-- Row Level Security policies defined in 0002_rls_policies.sql.
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "vector";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.member_role as enum ('owner', 'admin', 'member');
create type public.document_status as enum ('pending', 'processing', 'ready', 'failed');
create type public.message_role as enum ('user', 'assistant');

-- ---------------------------------------------------------------------------
-- Organizations — the tenant boundary. Every other table hangs off this.
-- ---------------------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.organizations is 'Tenant boundary. All data is scoped to an organization.';

-- ---------------------------------------------------------------------------
-- Profiles — one row per auth.users row, links a person to an organization.
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  full_name text,
  avatar_url text,
  role public.member_role not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Application-level user profile, one per Supabase auth user.';

create index profiles_organization_id_idx on public.profiles (organization_id);

-- ---------------------------------------------------------------------------
-- Documents — uploaded source files in the knowledge base.
-- ---------------------------------------------------------------------------

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  uploaded_by uuid not null references public.profiles (id) on delete set null,
  title text not null check (char_length(title) between 1 and 250),
  file_name text not null,
  file_type text not null check (file_type in ('pdf', 'docx', 'txt', 'md')),
  file_size_bytes bigint not null check (file_size_bytes > 0),
  storage_path text not null unique,
  status public.document_status not null default 'pending',
  error_message text,
  chunk_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.documents is 'One row per uploaded source document.';

create index documents_organization_id_idx on public.documents (organization_id);
create index documents_status_idx on public.documents (organization_id, status);

-- ---------------------------------------------------------------------------
-- Document chunks — the unit of retrieval. Embedding column powers pgvector
-- similarity search. text-embedding-3-small produces 1536-dimensional
-- vectors; change the dimension here if you swap embedding models.
-- ---------------------------------------------------------------------------

create table public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  token_count integer not null default 0,
  embedding vector(1536),
  created_at timestamptz not null default now(),
  unique (document_id, chunk_index)
);

comment on table public.document_chunks is 'Chunked, embedded document text used for RAG retrieval.';

create index document_chunks_organization_id_idx on public.document_chunks (organization_id);
create index document_chunks_document_id_idx on public.document_chunks (document_id);

-- IVFFlat index for approximate nearest-neighbor cosine search. Rebuild
-- (or increase `lists`) as the corpus grows past a few hundred thousand rows.
create index document_chunks_embedding_idx
  on public.document_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- ---------------------------------------------------------------------------
-- Chat sessions and messages.
-- ---------------------------------------------------------------------------

create table public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index chat_sessions_org_user_idx on public.chat_sessions (organization_id, user_id);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  role public.message_role not null,
  content text not null,
  -- citations: [{ "documentId": "...", "documentTitle": "...", "chunkId": "...", "chunkIndex": 0, "snippet": "..." }]
  citations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index chat_messages_session_id_idx on public.chat_messages (session_id, created_at);
create index chat_messages_organization_id_idx on public.chat_messages (organization_id);

-- ---------------------------------------------------------------------------
-- API keys — organization-scoped keys for programmatic access. We never
-- store the raw key, only a SHA-256 hash plus a short prefix for display.
-- ---------------------------------------------------------------------------

create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete set null,
  name text not null check (char_length(name) between 1 and 80),
  key_prefix text not null,
  key_hash text not null unique,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index api_keys_organization_id_idx on public.api_keys (organization_id);

-- ---------------------------------------------------------------------------
-- Rate limit events — a lightweight, DB-backed sliding-window log. Adequate
-- for a serverless deployment without an external store like Redis; rows
-- older than the window are pruned by the rate-limit function itself.
-- ---------------------------------------------------------------------------

create table public.rate_limit_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  route text not null,
  created_at timestamptz not null default now()
);

create index rate_limit_events_lookup_idx
  on public.rate_limit_events (organization_id, route, created_at);
