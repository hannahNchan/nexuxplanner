alter table public.projects
  add column if not exists visibility text not null default 'organization'
  check (visibility in ('organization', 'private'));

create or replace function public.can_view_project(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.projects project
    where project.id = p_project_id
      and (
        public.is_project_member(project.id)
        or (
          project.visibility = 'organization'
          and public.is_organization_member(project.organization_id)
        )
      )
  );
$$;

revoke all on function public.can_view_project(uuid) from public;
grant execute on function public.can_view_project(uuid) to authenticated;

create table if not exists public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  inviter_id uuid not null references auth.users(id) on delete cascade,
  invitee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz null,
  constraint organization_invitations_no_self_invite check (inviter_id <> invitee_id)
);

create unique index if not exists organization_invitations_pending_unique
  on public.organization_invitations(organization_id, invitee_id)
  where status = 'pending';

create index if not exists organization_invitations_invitee_status_idx
  on public.organization_invitations(invitee_id, status, created_at desc);

alter table public.organization_invitations enable row level security;

drop policy if exists "Organization invitation participants can view invitations" on public.organization_invitations;
create policy "Organization invitation participants can view invitations"
  on public.organization_invitations
  for select
  to authenticated
  using (
    invitee_id = (select auth.uid())
    or inviter_id = (select auth.uid())
    or public.is_organization_admin(organization_id)
  );

drop policy if exists "Organization admins can create invitations" on public.organization_invitations;
create policy "Organization admins can create invitations"
  on public.organization_invitations
  for insert
  to authenticated
  with check (
    inviter_id = (select auth.uid())
    and invitee_id <> (select auth.uid())
    and public.is_organization_admin(organization_id)
    and not exists (
      select 1
      from public.organization_members member
      where member.organization_id = organization_invitations.organization_id
        and member.user_id = organization_invitations.invitee_id
    )
  );

create or replace function public.accept_organization_invitation(p_invitation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization_id uuid;
  v_invitee_id uuid;
begin
  select organization_id, invitee_id
    into v_organization_id, v_invitee_id
  from public.organization_invitations
  where id = p_invitation_id
    and status = 'pending'
  for update;

  if v_organization_id is null then
    raise exception 'Invitation not found or already handled';
  end if;

  if v_invitee_id <> auth.uid() then
    raise exception 'Only the invited user can accept this invitation';
  end if;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_organization_id, v_invitee_id, 'member')
  on conflict (organization_id, user_id) do nothing;

  update public.organization_invitations
  set status = 'accepted',
      responded_at = now()
  where id = p_invitation_id;

  return v_organization_id;
end;
$$;

create or replace function public.decline_organization_invitation(p_invitation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization_id uuid;
  v_invitee_id uuid;
begin
  select organization_id, invitee_id
    into v_organization_id, v_invitee_id
  from public.organization_invitations
  where id = p_invitation_id
    and status = 'pending'
  for update;

  if v_organization_id is null then
    raise exception 'Invitation not found or already handled';
  end if;

  if v_invitee_id <> auth.uid() then
    raise exception 'Only the invited user can decline this invitation';
  end if;

  update public.organization_invitations
  set status = 'declined',
      responded_at = now()
  where id = p_invitation_id;

  return v_organization_id;
end;
$$;

revoke all on function public.accept_organization_invitation(uuid) from public;
revoke all on function public.decline_organization_invitation(uuid) from public;
grant execute on function public.accept_organization_invitation(uuid) to authenticated;
grant execute on function public.decline_organization_invitation(uuid) to authenticated;

drop policy if exists "Members can view joined projects" on public.projects;
drop policy if exists "Organization members can view organization projects" on public.projects;
create policy "Users can view accessible projects"
  on public.projects
  for select
  to authenticated
  using (public.can_view_project(id));

drop policy if exists "Project owners can update projects" on public.projects;
create policy "Project owners can update projects"
  on public.projects
  for update
  to authenticated
  using (public.is_project_owner(id))
  with check (
    public.is_project_owner(id)
    and public.is_organization_member(organization_id)
  );

drop policy if exists "Project owners can add members" on public.project_members;
drop policy if exists "Project creators can join owned projects" on public.project_members;
create policy "Project owners can add organization members"
  on public.project_members
  for insert
  to authenticated
  with check (
    (
      role = 'owner'
      and user_id = (select auth.uid())
      and exists (
        select 1
        from public.projects project
        where project.id = project_members.project_id
          and project.user_id = (select auth.uid())
      )
    )
    or (
      public.is_project_owner(project_id)
      and exists (
        select 1
        from public.projects project
        where project.id = project_members.project_id
          and public.is_organization_member(project.organization_id)
      )
      and exists (
        select 1
        from public.organization_members org_member
        join public.projects project on project.organization_id = org_member.organization_id
        where project.id = project_members.project_id
          and org_member.user_id = project_members.user_id
      )
    )
  );

drop policy if exists "Users can view project members" on public.project_members;
create policy "Users can view accessible project members"
  on public.project_members
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.can_view_project(project_id)
  );

drop policy if exists "Organization members can view visible project tags" on public.project_tags;
create policy "Organization members can view visible project tags"
  on public.project_tags
  for select
  to authenticated
  using (public.can_view_project(project_id));

drop policy if exists "Organization members can view visible project columns" on public.columns;
create policy "Organization members can view visible project columns"
  on public.columns
  for select
  to authenticated
  using (public.can_view_project(project_id));

drop policy if exists "Organization members can view visible column order" on public.column_order;
create policy "Organization members can view visible column order"
  on public.column_order
  for select
  to authenticated
  using (public.can_view_project(project_id));

drop policy if exists "Organization members can view visible project sprints" on public.sprints;
create policy "Organization members can view visible project sprints"
  on public.sprints
  for select
  to authenticated
  using (public.can_view_project(project_id));

drop policy if exists "Organization members can view visible project tasks" on public.tasks;
create policy "Organization members can view visible project tasks"
  on public.tasks
  for select
  to authenticated
  using (public.can_view_project(project_id));

drop policy if exists "Organization members can view visible project epics" on public.epics;
create policy "Organization members can view visible project epics"
  on public.epics
  for select
  to authenticated
  using (project_id is not null and public.can_view_project(project_id));

drop policy if exists "Organization members can view visible project notes" on public.editor_notes;
create policy "Organization members can view visible project notes"
  on public.editor_notes
  for select
  to authenticated
  using (project_id is not null and public.can_view_project(project_id));

drop policy if exists "Organization members can view visible roadmap settings" on public.roadmap_settings;
create policy "Organization members can view visible roadmap settings"
  on public.roadmap_settings
  for select
  to authenticated
  using (project_id is not null and public.can_view_project(project_id));

drop function if exists public.create_project_with_defaults(text, text, text, uuid, text[]);

create or replace function public.create_project_with_defaults(
  p_title text,
  p_description text,
  p_project_key text,
  p_organization_id uuid,
  p_tags text[] default array[]::text[],
  p_visibility text default 'organization'
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_project public.projects%rowtype;
  v_column_ids uuid[];
  v_normalized_key text := upper(trim(coalesce(p_project_key, '')));
  v_tags text[];
  v_visibility text := coalesce(nullif(trim(p_visibility), ''), 'organization');
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión para crear un proyecto.';
  end if;

  if p_organization_id is null or not public.is_organization_member(p_organization_id) then
    raise exception 'Debes seleccionar una organización válida.';
  end if;

  if v_visibility not in ('organization', 'private') then
    raise exception 'Visibilidad de proyecto inválida.';
  end if;

  if trim(coalesce(p_title, '')) = '' then
    raise exception 'El nombre del proyecto es obligatorio.';
  end if;

  if v_normalized_key = '' then
    raise exception 'Las siglas del proyecto son obligatorias.';
  end if;

  if v_normalized_key !~ '^[A-Z0-9]{2,10}$' then
    raise exception 'Las siglas deben tener entre 2 y 10 caracteres (solo mayúsculas y números).';
  end if;

  if exists (
    select 1
    from public.projects
    where upper(project_key) = v_normalized_key
  ) then
    raise exception 'Las siglas "%" ya están en uso por otro proyecto.', v_normalized_key
      using errcode = '23505';
  end if;

  select coalesce(array_agg(distinct normalized_tag order by normalized_tag), array[]::text[])
  into v_tags
  from (
    select trim(tag_value) as normalized_tag
    from unnest(coalesce(p_tags, array[]::text[])) as tags(tag_value)
    where trim(tag_value) <> ''
  ) normalized_tags;

  insert into public.projects (
    user_id,
    organization_id,
    title,
    description,
    project_key,
    task_sequence,
    epic_sequence,
    visibility
  )
  values (
    v_user_id,
    p_organization_id,
    trim(p_title),
    nullif(trim(coalesce(p_description, '')), ''),
    v_normalized_key,
    0,
    0,
    v_visibility
  )
  returning * into v_project;

  insert into public.project_members (
    project_id,
    user_id,
    role
  )
  values (
    v_project.id,
    v_user_id,
    'owner'
  );

  if array_length(v_tags, 1) > 0 then
    insert into public.project_tags (
      project_id,
      tag
    )
    select v_project.id, tag
    from unnest(v_tags) as tags(tag);
  end if;

  with inserted_columns as (
    insert into public.columns (
      project_id,
      name,
      position
    )
    values
      (v_project.id, 'Por hacer', 0),
      (v_project.id, 'En progreso', 1),
      (v_project.id, 'En revisión', 2),
      (v_project.id, 'Hecho', 3)
    returning id, position
  )
  select array_agg(id order by position)
  into v_column_ids
  from inserted_columns;

  if coalesce(array_length(v_column_ids, 1), 0) <> 4 then
    raise exception 'No se pudieron crear las columnas iniciales del proyecto.';
  end if;

  insert into public.column_order (
    project_id,
    column_ids
  )
  values (
    v_project.id,
    to_jsonb(v_column_ids)
  )
  on conflict (project_id) do update
  set column_ids = excluded.column_ids;

  return to_jsonb(v_project) || jsonb_build_object('tags', to_jsonb(v_tags));
end;
$$;

revoke all on function public.create_project_with_defaults(text, text, text, uuid, text[], text) from public;
grant execute on function public.create_project_with_defaults(text, text, text, uuid, text[], text) to authenticated;

grant select, insert, update on public.organization_invitations to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'organization_invitations'
  ) then
    alter publication supabase_realtime add table public.organization_invitations;
  end if;
end;
$$;
