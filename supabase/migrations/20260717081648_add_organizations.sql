create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

create or replace function public.is_organization_member(p_organization_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = p_organization_id
      and om.user_id = auth.uid()
  );
$$;

create or replace function public.is_organization_admin(p_organization_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = p_organization_id
      and om.user_id = auth.uid()
      and om.role in ('owner', 'admin')
  );
$$;

revoke all on function public.is_organization_member(uuid) from public;
revoke all on function public.is_organization_admin(uuid) from public;
grant execute on function public.is_organization_member(uuid) to authenticated;
grant execute on function public.is_organization_admin(uuid) to authenticated;

create or replace function public.create_organization_with_owner(p_name text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_organization public.organizations%rowtype;
  v_name text := trim(coalesce(p_name, ''));
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión para crear una organización.';
  end if;

  if v_name = '' then
    raise exception 'El nombre de la organización es obligatorio.';
  end if;

  insert into public.organizations (name, created_by)
  values (v_name, v_user_id)
  returning * into v_organization;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_organization.id, v_user_id, 'owner');

  return to_jsonb(v_organization) || jsonb_build_object('role', 'owner');
end;
$$;

revoke all on function public.create_organization_with_owner(text) from public;
grant execute on function public.create_organization_with_owner(text) to authenticated;

drop policy if exists "Members can view organizations" on public.organizations;
create policy "Members can view organizations"
  on public.organizations
  for select
  to authenticated
  using (public.is_organization_member(id));

drop policy if exists "Authenticated users can create organizations" on public.organizations;
create policy "Authenticated users can create organizations"
  on public.organizations
  for insert
  to authenticated
  with check (created_by = (select auth.uid()));

drop policy if exists "Organization admins can update organizations" on public.organizations;
create policy "Organization admins can update organizations"
  on public.organizations
  for update
  to authenticated
  using (public.is_organization_admin(id))
  with check (public.is_organization_admin(id));

drop policy if exists "Members can view organization members" on public.organization_members;
create policy "Members can view organization members"
  on public.organization_members
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_organization_member(organization_id)
  );

drop policy if exists "Users can join owned organization on creation" on public.organization_members;
create policy "Users can join owned organization on creation"
  on public.organization_members
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and role = 'owner'
    and exists (
      select 1
      from public.organizations organization
      where organization.id = organization_members.organization_id
        and organization.created_by = (select auth.uid())
    )
  );

drop policy if exists "Organization admins can add members" on public.organization_members;
create policy "Organization admins can add members"
  on public.organization_members
  for insert
  to authenticated
  with check (public.is_organization_admin(organization_id));

drop policy if exists "Organization admins can update members" on public.organization_members;
create policy "Organization admins can update members"
  on public.organization_members
  for update
  to authenticated
  using (public.is_organization_admin(organization_id))
  with check (public.is_organization_admin(organization_id));

drop policy if exists "Organization admins can remove members" on public.organization_members;
create policy "Organization admins can remove members"
  on public.organization_members
  for delete
  to authenticated
  using (public.is_organization_admin(organization_id));

alter table public.projects
  add column if not exists organization_id uuid null references public.organizations(id) on delete cascade;

do $$
declare
  v_lufthansa_id uuid;
  v_created_by uuid;
begin
  select user_id
  into v_created_by
  from public.projects
  order by created_at
  limit 1;

  if v_created_by is not null then
    insert into public.organizations (name, created_by)
    values ('Lufthansa', v_created_by)
    on conflict do nothing
    returning id into v_lufthansa_id;

    if v_lufthansa_id is null then
      select id
      into v_lufthansa_id
      from public.organizations
      where name = 'Lufthansa'
      order by created_at
      limit 1;
    end if;

    update public.projects
    set organization_id = v_lufthansa_id
    where organization_id is null;

    insert into public.organization_members (organization_id, user_id, role)
    select
      v_lufthansa_id,
      memberships.user_id,
      case
        when bool_or(memberships.role = 'owner') then 'owner'
        when bool_or(memberships.created_project) then 'owner'
        else 'member'
      end
    from (
      select user_id, 'owner'::text as role, true as created_project
      from public.projects
      where organization_id = v_lufthansa_id
      union all
      select pm.user_id, pm.role, false as created_project
      from public.project_members pm
      join public.projects p on p.id = pm.project_id
      where p.organization_id = v_lufthansa_id
    ) memberships
    group by memberships.user_id
    on conflict (organization_id, user_id) do update
      set role = case
        when public.organization_members.role = 'owner' then 'owner'
        when excluded.role = 'owner' then 'owner'
        else excluded.role
      end;
  end if;
end;
$$;

alter table public.projects
  alter column organization_id set not null;

create index if not exists projects_organization_id_idx
  on public.projects(organization_id, created_at desc);

create index if not exists organization_members_user_id_idx
  on public.organization_members(user_id, created_at desc);

drop policy if exists "Organization members can view organization projects" on public.projects;
create policy "Organization members can view organization projects"
  on public.projects
  for select
  to authenticated
  using (public.is_organization_member(organization_id));

drop policy if exists "Organization members can create projects" on public.projects;
create policy "Organization members can create projects"
  on public.projects
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_organization_member(organization_id)
  );

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

drop policy if exists "Project owners can delete projects" on public.projects;
create policy "Project owners can delete projects"
  on public.projects
  for delete
  to authenticated
  using (public.is_project_owner(id));

drop policy if exists "Project creators can join owned projects" on public.project_members;
create policy "Project creators can join owned projects"
  on public.project_members
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and role = 'owner'
    and exists (
      select 1
      from public.projects project
      where project.id = project_members.project_id
        and project.user_id = (select auth.uid())
    )
  );

drop function if exists public.create_project_with_defaults(text, text, text, text[]);

create or replace function public.create_project_with_defaults(
  p_title text,
  p_description text,
  p_project_key text,
  p_organization_id uuid,
  p_tags text[] default array[]::text[]
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
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión para crear un proyecto.';
  end if;

  if p_organization_id is null or not public.is_organization_member(p_organization_id) then
    raise exception 'Debes seleccionar una organización válida.';
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
    epic_sequence
  )
  values (
    v_user_id,
    p_organization_id,
    trim(p_title),
    nullif(trim(coalesce(p_description, '')), ''),
    v_normalized_key,
    0,
    0
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

revoke all on function public.create_project_with_defaults(text, text, text, uuid, text[]) from public;
grant execute on function public.create_project_with_defaults(text, text, text, uuid, text[]) to authenticated;

create or replace function public.accept_project_invitation(p_invitation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
  v_invitee_id uuid;
  v_organization_id uuid;
begin
  select invitation.project_id, invitation.invitee_id, project.organization_id
    into v_project_id, v_invitee_id, v_organization_id
  from public.project_invitations invitation
  join public.projects project on project.id = invitation.project_id
  where invitation.id = p_invitation_id
    and invitation.status = 'pending'
  for update;

  if v_project_id is null then
    raise exception 'Invitation not found or already handled';
  end if;

  if v_invitee_id <> auth.uid() then
    raise exception 'Only the invited user can accept this invitation';
  end if;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_organization_id, v_invitee_id, 'member')
  on conflict (organization_id, user_id) do nothing;

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

revoke all on function public.accept_project_invitation(uuid) from public;
grant execute on function public.accept_project_invitation(uuid) to authenticated;

grant select, insert, update, delete on public.organizations to authenticated;
grant select, insert, update, delete on public.organization_members to authenticated;
