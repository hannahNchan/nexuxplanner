drop policy if exists "Organization admins can manage organization logos" on storage.objects;

create policy "Organization admins can manage organization logos"
  on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'project-assets'
    and (storage.foldername(name))[1] = 'organization-logos'
    and public.is_organization_admin(((storage.foldername(name))[2])::uuid)
  )
  with check (
    bucket_id = 'project-assets'
    and (storage.foldername(name))[1] = 'organization-logos'
    and public.is_organization_admin(((storage.foldername(name))[2])::uuid)
  );
