-- ============================================================================
-- 0004_storage.sql
-- Storage bucket for uploaded source documents, with policies that mirror
-- the organization-scoping used everywhere else. Files are stored under
-- `{organization_id}/{document_id}/{file_name}` so the path prefix itself
-- enforces tenant boundaries alongside RLS.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  26214400, -- 25 MB
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown'
  ]
)
on conflict (id) do nothing;

create policy "members can read files in their organization folder"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = public.current_organization_id()::text
  );

create policy "members can upload files into their organization folder"
  on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = public.current_organization_id()::text
  );

create policy "members can delete files in their organization folder"
  on storage.objects for delete
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = public.current_organization_id()::text
  );
