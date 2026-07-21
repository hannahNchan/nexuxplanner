do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'project_members_project_user_unique'
  ) then
    alter table public.project_members
      add constraint project_members_project_user_unique
      unique (project_id, user_id);
  end if;
end;
$$;

create table if not exists public.project_invitations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  inviter_id uuid not null references auth.users(id) on delete cascade,
  invitee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz null,
  constraint project_invitations_no_self_invite check (inviter_id <> invitee_id)
);

create unique index if not exists project_invitations_pending_unique
  on public.project_invitations(project_id, invitee_id)
  where status = 'pending';

create index if not exists project_invitations_invitee_status_idx
  on public.project_invitations(invitee_id, status, created_at desc);

alter table public.project_invitations enable row level security;

drop policy if exists "Project members can view related invitations" on public.project_invitations;
create policy "Project members can view related invitations"
  on public.project_invitations
  for select
  to authenticated
  using (
    invitee_id = (select auth.uid())
    or inviter_id = (select auth.uid())
    or exists (
      select 1
      from public.project_members pm
      where pm.project_id = project_invitations.project_id
        and pm.user_id = (select auth.uid())
    )
  );

drop policy if exists "Project owners can create invitations" on public.project_invitations;
create policy "Project owners can create invitations"
  on public.project_invitations
  for insert
  to authenticated
  with check (
    inviter_id = (select auth.uid())
    and invitee_id <> (select auth.uid())
    and exists (
      select 1
      from public.project_members pm
      where pm.project_id = project_invitations.project_id
        and pm.user_id = (select auth.uid())
        and pm.role = 'owner'
    )
    and not exists (
      select 1
      from public.project_members existing_member
      where existing_member.project_id = project_invitations.project_id
        and existing_member.user_id = project_invitations.invitee_id
    )
  );

create or replace function public.accept_project_invitation(p_invitation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
  v_invitee_id uuid;
begin
  select project_id, invitee_id
    into v_project_id, v_invitee_id
  from public.project_invitations
  where id = p_invitation_id
    and status = 'pending'
  for update;

  if v_project_id is null then
    raise exception 'Invitation not found or already handled';
  end if;

  if v_invitee_id <> auth.uid() then
    raise exception 'Only the invited user can accept this invitation';
  end if;

  insert into public.project_members (project_id, user_id, role)
  values (v_project_id, v_invitee_id, 'member')
  on conflict (project_id, user_id) do nothing;

  update public.project_invitations
  set status = 'accepted',
      responded_at = now()
  where id = p_invitation_id;

  return v_project_id;
end;
$$;

create or replace function public.decline_project_invitation(p_invitation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
  v_invitee_id uuid;
begin
  select project_id, invitee_id
    into v_project_id, v_invitee_id
  from public.project_invitations
  where id = p_invitation_id
    and status = 'pending'
  for update;

  if v_project_id is null then
    raise exception 'Invitation not found or already handled';
  end if;

  if v_invitee_id <> auth.uid() then
    raise exception 'Only the invited user can decline this invitation';
  end if;

  update public.project_invitations
  set status = 'declined',
      responded_at = now()
  where id = p_invitation_id;

  return v_project_id;
end;
$$;

revoke all on function public.accept_project_invitation(uuid) from public;
revoke all on function public.decline_project_invitation(uuid) from public;
grant execute on function public.accept_project_invitation(uuid) to authenticated;
grant execute on function public.decline_project_invitation(uuid) to authenticated;

drop policy if exists "Members can view joined projects" on public.projects;
create policy "Members can view joined projects"
  on public.projects
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.project_members pm
      where pm.project_id = projects.id
        and pm.user_id = (select auth.uid())
    )
  );

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

drop policy if exists "Members can view project tags" on public.project_tags;
create policy "Members can view project tags"
  on public.project_tags
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.project_members pm
      where pm.project_id = project_tags.project_id
        and pm.user_id = (select auth.uid())
    )
  );

drop policy if exists "Members can view project columns" on public.columns;
create policy "Members can view project columns"
  on public.columns
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.project_members pm
      where pm.project_id = columns.project_id
        and pm.user_id = (select auth.uid())
    )
  );

drop policy if exists "Members can view column order" on public.column_order;
create policy "Members can view column order"
  on public.column_order
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.project_members pm
      where pm.project_id = column_order.project_id
        and pm.user_id = (select auth.uid())
    )
  );

drop policy if exists "Members can view project sprints" on public.sprints;
create policy "Members can view project sprints"
  on public.sprints
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.project_members pm
      where pm.project_id = sprints.project_id
        and pm.user_id = (select auth.uid())
    )
  );

drop policy if exists "Members can view project tasks" on public.tasks;
create policy "Members can view project tasks"
  on public.tasks
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.project_members pm
      where pm.project_id = tasks.project_id
        and pm.user_id = (select auth.uid())
    )
  );

drop policy if exists "Members can update project tasks" on public.tasks;
create policy "Members can update project tasks"
  on public.tasks
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.project_members pm
      where pm.project_id = tasks.project_id
        and pm.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.project_members pm
      where pm.project_id = tasks.project_id
        and pm.user_id = (select auth.uid())
    )
  );

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'project_invitations'
  ) then
    alter publication supabase_realtime add table public.project_invitations;
  end if;
end;
$$;
