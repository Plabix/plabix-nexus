-- ============================================================================
-- 0003_functions.sql
-- Trigger functions and RPCs: new-user bootstrapping, updated_at
-- maintenance, vector similarity search, and rate limiting.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

create trigger chat_sessions_set_updated_at
  before update on public.chat_sessions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- New user bootstrapping. Every signup creates its own organization (the
-- user becomes its owner) unless an invite flow assigns them to an existing
-- one in application code before this fires. Org name and slug are taken
-- from auth metadata set at signUp() time, falling back to sensible
-- defaults so the trigger never fails sign-up.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
  org_name text;
  org_slug text;
  full_name text;
begin
  org_name := coalesce(new.raw_user_meta_data ->> 'organization_name', 'My Organization');
  full_name := new.raw_user_meta_data ->> 'full_name';

  org_slug := lower(regexp_replace(org_name, '[^a-zA-Z0-9]+', '-', 'g'))
    || '-' || substr(replace(new.id::text, '-', ''), 1, 6);

  insert into public.organizations (name, slug)
  values (org_name, org_slug)
  returning id into new_org_id;

  insert into public.profiles (id, organization_id, full_name, role)
  values (new.id, new_org_id, full_name, 'owner');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Vector similarity search, scoped to an organization. Called from the
-- server with the service-role client (RLS is bypassed there by design),
-- so the organization filter below is the only tenant boundary for this
-- function — callers must always pass the caller's own organization_id.
-- ---------------------------------------------------------------------------

create or replace function public.match_document_chunks(
  query_embedding vector(1536),
  match_organization_id uuid,
  match_count int default 8,
  match_document_ids uuid[] default null
)
returns table (
  id uuid,
  document_id uuid,
  chunk_index int,
  content text,
  similarity float
)
language sql
stable
as $$
  select
    dc.id,
    dc.document_id,
    dc.chunk_index,
    dc.content,
    1 - (dc.embedding <=> query_embedding) as similarity
  from public.document_chunks dc
  where dc.organization_id = match_organization_id
    and dc.embedding is not null
    and (match_document_ids is null or dc.document_id = any (match_document_ids))
  order by dc.embedding <=> query_embedding
  limit least(greatest(match_count, 1), 50);
$$;

-- ---------------------------------------------------------------------------
-- Rate limiting: counts events for an organization+route in the trailing
-- window and prunes old rows opportunistically. Returns true when the
-- caller is still within the limit (and records the event), false when
-- the limit has been exceeded (and does not record the event).
-- ---------------------------------------------------------------------------

create or replace function public.check_rate_limit(
  p_organization_id uuid,
  p_user_id uuid,
  p_route text,
  p_max_events int,
  p_window_seconds int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  window_start timestamptz := now() - make_interval(secs => p_window_seconds);
  current_count int;
begin
  delete from public.rate_limit_events
  where organization_id = p_organization_id
    and route = p_route
    and created_at < window_start - interval '1 hour';

  select count(*) into current_count
  from public.rate_limit_events
  where organization_id = p_organization_id
    and route = p_route
    and created_at >= window_start;

  if current_count >= p_max_events then
    return false;
  end if;

  insert into public.rate_limit_events (organization_id, user_id, route)
  values (p_organization_id, p_user_id, p_route);

  return true;
end;
$$;
