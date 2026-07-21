-- ============================================================================
-- Migration 0010: Storage Buckets
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('resumes', 'resumes', false, 10485760, array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']),
  ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp']),
  ('company-logos', 'company-logos', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']),
  ('portfolios', 'portfolios', false, 20971520, null),
  ('certificates', 'certificates', false, 10485760, array['application/pdf', 'image/png', 'image/jpeg'])
on conflict (id) do nothing;

-- resumes bucket: candidate can manage their own folder (folder name = candidate_id)
create policy "resumes_owner_select" on storage.objects
  for select using (bucket_id = 'resumes' and (auth.uid()::text = (storage.foldername(name))[1] or public.is_staff()));

create policy "resumes_owner_insert" on storage.objects
  for insert with check (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "resumes_owner_delete" on storage.objects
  for delete using (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);

-- avatars: public read, owner write
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars_owner_write" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "avatars_owner_update" on storage.objects
  for update using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- company logos: public read, staff write
create policy "company_logos_public_read" on storage.objects
  for select using (bucket_id = 'company-logos');

create policy "company_logos_staff_write" on storage.objects
  for insert with check (bucket_id = 'company-logos' and public.is_staff());

-- portfolios & certificates: owner-only
create policy "portfolios_owner_select" on storage.objects
  for select using (bucket_id = 'portfolios' and (auth.uid()::text = (storage.foldername(name))[1] or public.is_staff()));

create policy "portfolios_owner_insert" on storage.objects
  for insert with check (bucket_id = 'portfolios' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "certificates_owner_select" on storage.objects
  for select using (bucket_id = 'certificates' and (auth.uid()::text = (storage.foldername(name))[1] or public.is_staff()));

create policy "certificates_owner_insert" on storage.objects
  for insert with check (bucket_id = 'certificates' and auth.uid()::text = (storage.foldername(name))[1]);
