create or replace function public.is_project_member(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.project_members pm
    where pm.project_id = p_project_id
      and pm.user_id = auth.uid()
  );
$$;

create or replace function public.is_project_owner(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.project_members pm
    where pm.project_id = p_project_id
      and pm.user_id = auth.uid()
      and pm.role = 'owner'
  );
$$;

revoke all on function public.is_project_member(uuid) from public;
revoke all on function public.is_project_owner(uuid) from public;
grant execute on function public.is_project_member(uuid) to authenticated;
grant execute on function public.is_project_owner(uuid) to authenticated;

drop policy if exists "Users can view project members" on public.project_members;
create policy "Users can view project members"
  on public.project_members
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_project_member(project_id)
    or public.is_project_owner(project_id)
  );

drop policy if exists "Project owners can add members" on public.project_members;
create policy "Project owners can add members"
  on public.project_members
  for insert
  to authenticated
  with check (public.is_project_owner(project_id));

drop policy if exists "Project owners can update members" on public.project_members;
create policy "Project owners can update members"
  on public.project_members
  for update
  to authenticated
  using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

drop policy if exists "Project owners can remove members" on public.project_members;
create policy "Project owners can remove members"
  on public.project_members
  for delete
  to authenticated
  using (public.is_project_owner(project_id));

drop policy if exists "Members can view joined projects" on public.projects;
create policy "Members can view joined projects"
  on public.projects
  for select
  to authenticated
  using (public.is_project_member(id));

drop policy if exists "Project members can view related invitations" on public.project_invitations;
create policy "Project members can view related invitations"
  on public.project_invitations
  for select
  to authenticated
  using (
    invitee_id = (select auth.uid())
    or inviter_id = (select auth.uid())
    or public.is_project_member(project_id)
  );

drop policy if exists "Project owners can create invitations" on public.project_invitations;
create policy "Project owners can create invitations"
  on public.project_invitations
  for insert
  to authenticated
  with check (
    inviter_id = (select auth.uid())
    and invitee_id <> (select auth.uid())
    and public.is_project_owner(project_id)
    and not exists (
      select 1
      from public.project_members existing_member
      where existing_member.project_id = project_invitations.project_id
        and existing_member.user_id = project_invitations.invitee_id
    )
  );

drop policy if exists "Members can view project tags" on public.project_tags;
create policy "Members can view project tags"
  on public.project_tags
  for select
  to authenticated
  using (public.is_project_member(project_id));

drop policy if exists "Members can view project columns" on public.columns;
create policy "Members can view project columns"
  on public.columns
  for select
  to authenticated
  using (public.is_project_member(project_id));

drop policy if exists "Members can view column order" on public.column_order;
create policy "Members can view column order"
  on public.column_order
  for select
  to authenticated
  using (public.is_project_member(project_id));

drop policy if exists "Members can view project sprints" on public.sprints;
create policy "Members can view project sprints"
  on public.sprints
  for select
  to authenticated
  using (public.is_project_member(project_id));

drop policy if exists "Members can view project tasks" on public.tasks;
create policy "Members can view project tasks"
  on public.tasks
  for select
  to authenticated
  using (public.is_project_member(project_id));

drop policy if exists "Members can update project tasks" on public.tasks;
create policy "Members can update project tasks"
  on public.tasks
  for update
  to authenticated
  using (public.is_project_member(project_id))
  with check (public.is_project_member(project_id));
