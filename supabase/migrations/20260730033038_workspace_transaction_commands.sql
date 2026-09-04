create or replace function public.create_organization_command(
  p_name text,
  p_logo_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_organization public.organizations%rowtype;
  v_name text := trim(coalesce(p_name, ''));
  v_logo_url text := nullif(trim(coalesce(p_logo_url, '')), '');
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión para crear una organización.';
  end if;

  if v_name = '' then
    raise exception 'El nombre de la organización es obligatorio.';
  end if;

  insert into public.organizations (name, logo_url, created_by)
  values (v_name, v_logo_url, v_user_id)
  returning * into v_organization;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_organization.id, v_user_id, 'owner');

  insert into public.activity_events (
    organization_id,
    actor_id,
    event_type,
    payload
  )
  values (
    v_organization.id,
    v_user_id,
    'organization.created',
    jsonb_build_object('organizationId', v_organization.id, 'name', v_organization.name)
  );

  perform public.enqueue_command_job(
    'nexusplanner-events',
    'activity.organization_created',
    jsonb_build_object('organizationId', v_organization.id, 'actorId', v_user_id)
  );

  return to_jsonb(v_organization) || jsonb_build_object('role', 'owner');
end;
$$;

create or replace function public.create_project_command(
  p_title text,
  p_description text,
  p_project_key text,
  p_organization_id uuid,
  p_tags text[] default array[]::text[],
  p_visibility text default 'organization'
)
returns jsonb
language plpgsql
security definer
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

  insert into public.project_members (project_id, user_id, role)
  values (v_project.id, v_user_id, 'owner');

  if array_length(v_tags, 1) > 0 then
    insert into public.project_tags (project_id, tag)
    select v_project.id, tag
    from unnest(v_tags) as tags(tag);
  end if;

  with inserted_columns as (
    insert into public.columns (project_id, name, position)
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

  insert into public.column_order (project_id, column_ids)
  values (v_project.id, to_jsonb(v_column_ids))
  on conflict (project_id) do update
  set column_ids = excluded.column_ids;

  insert into public.activity_events (
    organization_id,
    project_id,
    actor_id,
    event_type,
    payload
  )
  values (
    p_organization_id,
    v_project.id,
    v_user_id,
    'project.created',
    jsonb_build_object(
      'projectId', v_project.id,
      'organizationId', p_organization_id,
      'projectKey', v_project.project_key,
      'title', v_project.title
    )
  );

  perform public.enqueue_command_job(
    'nexusplanner-events',
    'activity.project_created',
    jsonb_build_object(
      'projectId', v_project.id,
      'organizationId', p_organization_id,
      'actorId', v_user_id
    )
  );

  return to_jsonb(v_project) || jsonb_build_object('tags', to_jsonb(v_tags));
end;
$$;

create or replace function public.create_organization_invitation_command(
  p_organization_id uuid,
  p_email text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_inviter_id uuid := auth.uid();
  v_invitee_id uuid;
  v_email text := lower(trim(coalesce(p_email, '')));
  v_invitation_id uuid;
begin
  if v_inviter_id is null then
    raise exception 'Debes iniciar sesión para invitar personas.';
  end if;

  if p_organization_id is null then
    raise exception 'La organización es obligatoria.';
  end if;

  if v_email = '' then
    raise exception 'El correo es obligatorio.';
  end if;

  if v_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
    raise exception 'Escribe un correo válido.';
  end if;

  if not public.is_organization_admin(p_organization_id) then
    raise exception 'Solo owner/admin pueden invitar personas a la organización.';
  end if;

  select users.id
    into v_invitee_id
  from auth.users users
  where lower(users.email) = v_email
  limit 1;

  if v_invitee_id is null then
    raise exception 'No encontramos una cuenta registrada con ese correo.';
  end if;

  if v_invitee_id = v_inviter_id then
    raise exception 'No puedes invitarte a ti misma a la organización.';
  end if;

  if exists (
    select 1
    from public.organization_members member
    where member.organization_id = p_organization_id
      and member.user_id = v_invitee_id
  ) then
    raise exception 'Este usuario ya pertenece a la organización.';
  end if;

  insert into public.organization_invitations (
    organization_id,
    inviter_id,
    invitee_id
  )
  values (
    p_organization_id,
    v_inviter_id,
    v_invitee_id
  )
  returning id into v_invitation_id;

  insert into public.activity_events (
    organization_id,
    actor_id,
    event_type,
    payload
  )
  values (
    p_organization_id,
    v_inviter_id,
    'organization.invitation_created',
    jsonb_build_object(
      'invitationId', v_invitation_id,
      'organizationId', p_organization_id,
      'inviteeId', v_invitee_id
    )
  );

  perform public.enqueue_command_job(
    'nexusplanner-events',
    'notification.organization_invitation_created',
    jsonb_build_object(
      'invitationId', v_invitation_id,
      'organizationId', p_organization_id,
      'inviteeId', v_invitee_id,
      'actorId', v_inviter_id
    )
  );

  return v_invitation_id;
exception
  when unique_violation then
    raise exception 'Este usuario ya tiene una invitación pendiente.';
end;
$$;

create or replace function public.create_organization_invitation_for_user_command(
  p_organization_id uuid,
  p_invitee_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_inviter_id uuid := auth.uid();
  v_invitation_id uuid;
begin
  if v_inviter_id is null then
    raise exception 'Debes iniciar sesión para invitar personas.';
  end if;

  if p_organization_id is null then
    raise exception 'La organización es obligatoria.';
  end if;

  if p_invitee_id is null then
    raise exception 'El usuario invitado es obligatorio.';
  end if;

  if not public.is_organization_admin(p_organization_id) then
    raise exception 'Solo owner/admin pueden invitar personas a la organización.';
  end if;

  if p_invitee_id = v_inviter_id then
    raise exception 'No puedes invitarte a ti misma a la organización.';
  end if;

  if exists (
    select 1
    from public.organization_members member
    where member.organization_id = p_organization_id
      and member.user_id = p_invitee_id
  ) then
    raise exception 'Este usuario ya pertenece a la organización.';
  end if;

  insert into public.organization_invitations (
    organization_id,
    inviter_id,
    invitee_id
  )
  values (
    p_organization_id,
    v_inviter_id,
    p_invitee_id
  )
  returning id into v_invitation_id;

  insert into public.activity_events (
    organization_id,
    actor_id,
    event_type,
    payload
  )
  values (
    p_organization_id,
    v_inviter_id,
    'organization.invitation_created',
    jsonb_build_object(
      'invitationId', v_invitation_id,
      'organizationId', p_organization_id,
      'inviteeId', p_invitee_id
    )
  );

  perform public.enqueue_command_job(
    'nexusplanner-events',
    'notification.organization_invitation_created',
    jsonb_build_object(
      'invitationId', v_invitation_id,
      'organizationId', p_organization_id,
      'inviteeId', p_invitee_id,
      'actorId', v_inviter_id
    )
  );

  return v_invitation_id;
exception
  when unique_violation then
    raise exception 'Este usuario ya tiene una invitación pendiente.';
end;
$$;

create or replace function public.accept_organization_invitation_command(p_invitation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_organization_id uuid;
  v_invitee_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión para responder invitaciones.';
  end if;

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

  insert into public.activity_events (
    organization_id,
    actor_id,
    event_type,
    payload
  )
  values (
    v_organization_id,
    v_invitee_id,
    'organization.invitation_accepted',
    jsonb_build_object('invitationId', p_invitation_id, 'organizationId', v_organization_id)
  );

  perform public.enqueue_command_job(
    'nexusplanner-events',
    'activity.organization_invitation_accepted',
    jsonb_build_object(
      'invitationId', p_invitation_id,
      'organizationId', v_organization_id,
      'actorId', v_invitee_id
    )
  );

  return v_organization_id;
end;
$$;

create or replace function public.decline_organization_invitation_command(p_invitation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_organization_id uuid;
  v_invitee_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión para responder invitaciones.';
  end if;

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

create or replace function public.update_organization_member_role_command(
  p_organization_id uuid,
  p_member_id uuid,
  p_role text
)
returns public.organization_members
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_member public.organization_members%rowtype;
  v_updated_member public.organization_members%rowtype;
  v_role text := lower(trim(coalesce(p_role, '')));
  v_owner_count integer;
begin
  if v_actor_id is null then
    raise exception 'Debes iniciar sesión para cambiar roles.';
  end if;

  if v_role not in ('owner', 'admin', 'member') then
    raise exception 'Rol de organización inválido.';
  end if;

  if not public.is_organization_admin(p_organization_id) then
    raise exception 'Solo owner/admin pueden cambiar roles de organización.';
  end if;

  select *
    into v_member
  from public.organization_members
  where id = p_member_id
    and organization_id = p_organization_id
  for update;

  if v_member.id is null then
    raise exception 'Miembro de organización no encontrado.';
  end if;

  if v_member.role = 'owner' and v_role <> 'owner' then
    select count(*)
      into v_owner_count
    from public.organization_members
    where organization_id = p_organization_id
      and role = 'owner';

    if v_owner_count <= 1 then
      raise exception 'La organización debe conservar al menos un owner.';
    end if;
  end if;

  update public.organization_members
  set role = v_role
  where id = p_member_id
  returning * into v_updated_member;

  insert into public.activity_events (
    organization_id,
    actor_id,
    event_type,
    payload
  )
  values (
    p_organization_id,
    v_actor_id,
    'organization.member_role_updated',
    jsonb_build_object(
      'memberId', p_member_id,
      'userId', v_member.user_id,
      'previousRole', v_member.role,
      'role', v_role
    )
  );

  return v_updated_member;
end;
$$;

create or replace function public.remove_organization_member_command(
  p_organization_id uuid,
  p_member_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_member public.organization_members%rowtype;
  v_owner_count integer;
begin
  if v_actor_id is null then
    raise exception 'Debes iniciar sesión para quitar miembros.';
  end if;

  if not public.is_organization_admin(p_organization_id) then
    raise exception 'Solo owner/admin pueden quitar miembros de la organización.';
  end if;

  select *
    into v_member
  from public.organization_members
  where id = p_member_id
    and organization_id = p_organization_id
  for update;

  if v_member.id is null then
    raise exception 'Miembro de organización no encontrado.';
  end if;

  if v_member.role = 'owner' then
    select count(*)
      into v_owner_count
    from public.organization_members
    where organization_id = p_organization_id
      and role = 'owner';

    if v_owner_count <= 1 then
      raise exception 'La organización debe conservar al menos un owner.';
    end if;
  end if;

  delete from public.project_members project_member
  using public.projects project
  where project.id = project_member.project_id
    and project.organization_id = p_organization_id
    and project_member.user_id = v_member.user_id;

  delete from public.organization_members
  where id = p_member_id;

  insert into public.activity_events (
    organization_id,
    actor_id,
    event_type,
    payload
  )
  values (
    p_organization_id,
    v_actor_id,
    'organization.member_removed',
    jsonb_build_object('memberId', p_member_id, 'userId', v_member.user_id)
  );

  return v_member.user_id;
end;
$$;

create or replace function public.add_project_member_command(
  p_project_id uuid,
  p_user_id uuid,
  p_role text default 'member'
)
returns public.project_members
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_project public.projects%rowtype;
  v_role text := lower(trim(coalesce(p_role, 'member')));
  v_member public.project_members%rowtype;
begin
  if v_actor_id is null then
    raise exception 'Debes iniciar sesión para agregar miembros al proyecto.';
  end if;

  if v_role not in ('owner', 'member') then
    raise exception 'Rol de proyecto inválido.';
  end if;

  select *
    into v_project
  from public.projects
  where id = p_project_id
  for update;

  if v_project.id is null then
    raise exception 'Proyecto no encontrado.';
  end if;

  if not public.is_project_owner(p_project_id) then
    raise exception 'Solo owners del proyecto pueden agregar colaboradores.';
  end if;

  if not exists (
    select 1
    from public.organization_members organization_member
    where organization_member.organization_id = v_project.organization_id
      and organization_member.user_id = p_user_id
  ) then
    raise exception 'El usuario debe pertenecer primero a la organización.';
  end if;

  insert into public.project_members (project_id, user_id, role)
  values (p_project_id, p_user_id, v_role)
  returning * into v_member;

  insert into public.activity_events (
    organization_id,
    project_id,
    actor_id,
    event_type,
    payload
  )
  values (
    v_project.organization_id,
    p_project_id,
    v_actor_id,
    'project.member_added',
    jsonb_build_object('userId', p_user_id, 'role', v_role)
  );

  return v_member;
exception
  when unique_violation then
    raise exception 'Este usuario ya es miembro del proyecto.';
end;
$$;

create or replace function public.remove_project_member_command(
  p_project_id uuid,
  p_member_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_project public.projects%rowtype;
  v_member public.project_members%rowtype;
  v_owner_count integer;
begin
  if v_actor_id is null then
    raise exception 'Debes iniciar sesión para quitar colaboradores.';
  end if;

  select *
    into v_project
  from public.projects
  where id = p_project_id
  for update;

  if v_project.id is null then
    raise exception 'Proyecto no encontrado.';
  end if;

  if not public.is_project_owner(p_project_id) then
    raise exception 'Solo owners del proyecto pueden quitar colaboradores.';
  end if;

  select *
    into v_member
  from public.project_members
  where id = p_member_id
    and project_id = p_project_id
  for update;

  if v_member.id is null then
    raise exception 'Miembro de proyecto no encontrado.';
  end if;

  if v_member.role = 'owner' then
    select count(*)
      into v_owner_count
    from public.project_members
    where project_id = p_project_id
      and role = 'owner';

    if v_owner_count <= 1 then
      raise exception 'El proyecto debe conservar al menos un owner.';
    end if;
  end if;

  delete from public.project_members
  where id = p_member_id;

  insert into public.activity_events (
    organization_id,
    project_id,
    actor_id,
    event_type,
    payload
  )
  values (
    v_project.organization_id,
    p_project_id,
    v_actor_id,
    'project.member_removed',
    jsonb_build_object('memberId', p_member_id, 'userId', v_member.user_id)
  );

  return v_member.user_id;
end;
$$;

create or replace function public.create_project_invitation_command(
  p_project_id uuid,
  p_invitee_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_inviter_id uuid := auth.uid();
  v_project public.projects%rowtype;
  v_invitation_id uuid;
begin
  if v_inviter_id is null then
    raise exception 'Debes iniciar sesión para invitar personas al proyecto.';
  end if;

  if p_invitee_id is null then
    raise exception 'El usuario invitado es obligatorio.';
  end if;

  if p_invitee_id = v_inviter_id then
    raise exception 'No puedes invitarte a ti misma al proyecto.';
  end if;

  select *
    into v_project
  from public.projects
  where id = p_project_id
  for update;

  if v_project.id is null then
    raise exception 'Proyecto no encontrado.';
  end if;

  if not public.is_project_owner(p_project_id) then
    raise exception 'Solo owners del proyecto pueden invitar colaboradores.';
  end if;

  if not exists (
    select 1
    from public.organization_members organization_member
    where organization_member.organization_id = v_project.organization_id
      and organization_member.user_id = p_invitee_id
  ) then
    raise exception 'El usuario debe pertenecer primero a la organización.';
  end if;

  if exists (
    select 1
    from public.project_members project_member
    where project_member.project_id = p_project_id
      and project_member.user_id = p_invitee_id
  ) then
    raise exception 'Este usuario ya es miembro del proyecto.';
  end if;

  insert into public.project_invitations (
    project_id,
    inviter_id,
    invitee_id
  )
  values (
    p_project_id,
    v_inviter_id,
    p_invitee_id
  )
  returning id into v_invitation_id;

  insert into public.activity_events (
    organization_id,
    project_id,
    actor_id,
    event_type,
    payload
  )
  values (
    v_project.organization_id,
    p_project_id,
    v_inviter_id,
    'project.invitation_created',
    jsonb_build_object('invitationId', v_invitation_id, 'inviteeId', p_invitee_id)
  );

  perform public.enqueue_command_job(
    'nexusplanner-events',
    'notification.project_invitation_created',
    jsonb_build_object(
      'invitationId', v_invitation_id,
      'projectId', p_project_id,
      'inviteeId', p_invitee_id,
      'actorId', v_inviter_id
    )
  );

  return v_invitation_id;
exception
  when unique_violation then
    raise exception 'Este usuario ya tiene una invitación pendiente.';
end;
$$;

create or replace function public.accept_project_invitation_command(p_invitation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_project_id uuid;
  v_invitee_id uuid;
  v_organization_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión para responder invitaciones.';
  end if;

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

  if not exists (
    select 1
    from public.organization_members organization_member
    where organization_member.organization_id = v_organization_id
      and organization_member.user_id = v_invitee_id
  ) then
    raise exception 'Debes pertenecer a la organización antes de aceptar acceso al proyecto.';
  end if;

  insert into public.project_members (project_id, user_id, role)
  values (v_project_id, v_invitee_id, 'member')
  on conflict (project_id, user_id) do nothing;

  update public.project_invitations
  set status = 'accepted',
      responded_at = now()
  where id = p_invitation_id;

  insert into public.activity_events (
    organization_id,
    project_id,
    actor_id,
    event_type,
    payload
  )
  values (
    v_organization_id,
    v_project_id,
    v_invitee_id,
    'project.invitation_accepted',
    jsonb_build_object('invitationId', p_invitation_id)
  );

  return v_project_id;
end;
$$;

create or replace function public.decline_project_invitation_command(p_invitation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_project_id uuid;
  v_invitee_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión para responder invitaciones.';
  end if;

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

revoke execute on function public.create_organization_command(text, text) from PUBLIC, anon;
grant execute on function public.create_organization_command(text, text) to authenticated;

revoke execute on function public.create_project_command(text, text, text, uuid, text[], text) from PUBLIC, anon;
grant execute on function public.create_project_command(text, text, text, uuid, text[], text) to authenticated;

revoke execute on function public.create_organization_invitation_command(uuid, text) from PUBLIC, anon;
grant execute on function public.create_organization_invitation_command(uuid, text) to authenticated;

revoke execute on function public.create_organization_invitation_for_user_command(uuid, uuid) from PUBLIC, anon;
grant execute on function public.create_organization_invitation_for_user_command(uuid, uuid) to authenticated;

revoke execute on function public.accept_organization_invitation_command(uuid) from PUBLIC, anon;
grant execute on function public.accept_organization_invitation_command(uuid) to authenticated;

revoke execute on function public.decline_organization_invitation_command(uuid) from PUBLIC, anon;
grant execute on function public.decline_organization_invitation_command(uuid) to authenticated;

revoke execute on function public.update_organization_member_role_command(uuid, uuid, text) from PUBLIC, anon;
grant execute on function public.update_organization_member_role_command(uuid, uuid, text) to authenticated;

revoke execute on function public.remove_organization_member_command(uuid, uuid) from PUBLIC, anon;
grant execute on function public.remove_organization_member_command(uuid, uuid) to authenticated;

revoke execute on function public.add_project_member_command(uuid, uuid, text) from PUBLIC, anon;
grant execute on function public.add_project_member_command(uuid, uuid, text) to authenticated;

revoke execute on function public.remove_project_member_command(uuid, uuid) from PUBLIC, anon;
grant execute on function public.remove_project_member_command(uuid, uuid) to authenticated;

revoke execute on function public.create_project_invitation_command(uuid, uuid) from PUBLIC, anon;
grant execute on function public.create_project_invitation_command(uuid, uuid) to authenticated;

revoke execute on function public.accept_project_invitation_command(uuid) from PUBLIC, anon;
grant execute on function public.accept_project_invitation_command(uuid) to authenticated;

revoke execute on function public.decline_project_invitation_command(uuid) from PUBLIC, anon;
grant execute on function public.decline_project_invitation_command(uuid) to authenticated;
