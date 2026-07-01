-- ============================================================================
-- 0002_rls_policies.sql
-- Row Level Security: every table is scoped to the caller's organization,
-- derived from their profiles row. This is the actual tenant-isolation
-- boundary — application code must never bypass it except via the
-- service-role key in trusted server-only code paths (e.g. the embedding
-- worker), which deliberately skips RLS.
-- ============================================================================

-- Helper: the calling user's organization_id, looked up once per statement.
create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.profiles where id = auth.uid();
$$;

-- Helper: whether the calling user is an owner or admin of their org.
create or replace function public.is_org_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('owner', 'admin')
  );
$$;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.api_keys enable row level security;
alter table public.rate_limit_events enable row level security;

-- organizations: members can read their own org; only admins can update it.
create policy "members can view their organization"
  on public.organizations for select
  using (id = public.current_organization_id());

create policy "admins can update their organization"
  on public.organizations for update
  using (id = public.current_organization_id() and public.is_org_admin());

-- profiles: members can view profiles in their own org; users can update
-- their own profile; admins can update roles within their org.
create policy "members can view profiles in their organization"
  on public.profiles for select
  using (organization_id = public.current_organization_id());

create policy "users can update their own profile"
  on public.profiles for update
  using (id = auth.uid());

create policy "admins can update member profiles in their organization"
  on public.profiles for update
  using (organization_id = public.current_organization_id() and public.is_org_admin());

-- documents: full CRUD scoped to organization membership.
create policy "members can view documents in their organization"
  on public.documents for select
  using (organization_id = public.current_organization_id());

create policy "members can insert documents in their organization"
  on public.documents for insert
  with check (organization_id = public.current_organization_id());

create policy "members can update documents in their organization"
  on public.documents for update
  using (organization_id = public.current_organization_id());

create policy "members can delete documents in their organization"
  on public.documents for delete
  using (organization_id = public.current_organization_id());

-- document_chunks: read-only from the client; writes happen via the
-- service-role key in the ingestion pipeline, which bypasses RLS.
create policy "members can view chunks in their organization"
  on public.document_chunks for select
  using (organization_id = public.current_organization_id());

-- chat_sessions: a user can see and manage their own sessions, and admins
-- can view all sessions in the organization for support/audit purposes.
create policy "users can view their own chat sessions"
  on public.chat_sessions for select
  using (
    organization_id = public.current_organization_id()
    and (user_id = auth.uid() or public.is_org_admin())
  );

create policy "users can create chat sessions in their organization"
  on public.chat_sessions for insert
  with check (organization_id = public.current_organization_id() and user_id = auth.uid());

create policy "users can update their own chat sessions"
  on public.chat_sessions for update
  using (organization_id = public.current_organization_id() and user_id = auth.uid());

create policy "users can delete their own chat sessions"
  on public.chat_sessions for delete
  using (organization_id = public.current_organization_id() and user_id = auth.uid());

-- chat_messages: visible to the owner of the parent session (or admins).
create policy "users can view messages in accessible sessions"
  on public.chat_messages for select
  using (
    organization_id = public.current_organization_id()
    and exists (
      select 1 from public.chat_sessions s
      where s.id = chat_messages.session_id
        and (s.user_id = auth.uid() or public.is_org_admin())
    )
  );

create policy "users can insert messages into their own sessions"
  on public.chat_messages for insert
  with check (
    organization_id = public.current_organization_id()
    and exists (
      select 1 from public.chat_sessions s
      where s.id = chat_messages.session_id and s.user_id = auth.uid()
    )
  );

-- api_keys: only admins can manage them; the raw key is never stored or
-- returned by select (key_hash is meaningless to a client without the salt
-- logic, but we still restrict to admins to limit exposure of metadata).
create policy "admins can view api keys in their organization"
  on public.api_keys for select
  using (organization_id = public.current_organization_id() and public.is_org_admin());

create policy "admins can create api keys in their organization"
  on public.api_keys for insert
  with check (organization_id = public.current_organization_id() and public.is_org_admin());

create policy "admins can update api keys in their organization"
  on public.api_keys for update
  using (organization_id = public.current_organization_id() and public.is_org_admin());

create policy "admins can delete api keys in their organization"
  on public.api_keys for delete
  using (organization_id = public.current_organization_id() and public.is_org_admin());

-- rate_limit_events: written by server-side code only (service role);
-- members can view their own organization's events for transparency.
create policy "members can view rate limit events in their organization"
  on public.rate_limit_events for select
  using (organization_id = public.current_organization_id());
