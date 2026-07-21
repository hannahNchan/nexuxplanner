drop policy if exists "Invitees can view invited projects" on public.projects;
create policy "Invitees can view invited projects"
  on public.projects
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.project_invitations invitation
      where invitation.project_id = projects.id
        and invitation.invitee_id = (select auth.uid())
        and invitation.status = 'pending'
    )
  );
