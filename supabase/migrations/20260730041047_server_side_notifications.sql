alter table public.user_notifications
  add column if not exists organization_id uuid null references public.organizations(id) on delete cascade,
  add column if not exists payload jsonb not null default '{}'::jsonb,
  add column if not exists dedupe_key text null;

alter table public.user_notifications
  drop constraint if exists user_notifications_type_check;

alter table public.user_notifications
  add constraint user_notifications_type_check
  check (
    type in (
      'task_assigned',
      'project_member_added',
      'organization_member_added',
      'sprint_completed'
    )
  );

update public.user_notifications notification
set organization_id = project.organization_id
from public.projects project
where notification.organization_id is null
  and notification.project_id = project.id;

create unique index if not exists user_notifications_dedupe_key_uidx
  on public.user_notifications(dedupe_key)
  where dedupe_key is not null;

create index if not exists user_notifications_organization_created_idx
  on public.user_notifications(organization_id, created_at desc);

create index if not exists user_notifications_project_created_idx
  on public.user_notifications(project_id, created_at desc);

create or replace function public.create_user_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_actor_id uuid default null,
  p_organization_id uuid default null,
  p_project_id uuid default null,
  p_task_id uuid default null,
  p_payload jsonb default '{}'::jsonb,
  p_dedupe_key text default null,
  p_skip_if_actor boolean default true
)
returns public.user_notifications
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := coalesce(p_actor_id, auth.uid());
  v_type text := lower(trim(coalesce(p_type, '')));
  v_title text := trim(coalesce(p_title, ''));
  v_message text := trim(coalesce(p_message, ''));
  v_organization_id uuid := p_organization_id;
  v_project_organization_id uuid;
  v_task_project_id uuid;
  v_notification public.user_notifications%rowtype;
begin
  if p_user_id is null then
    raise exception 'Notification recipient is required.';
  end if;

  if p_skip_if_actor and v_actor_id is not null and p_user_id = v_actor_id then
    return null;
  end if;

  if v_type not in (
    'task_assigned',
    'project_member_added',
    'organization_member_added',
    'sprint_completed'
  ) then
    raise exception 'Unsupported notification type: %', v_type;
  end if;

  if v_title = '' then
    raise exception 'Notification title is required.';
  end if;

  if v_message = '' then
    raise exception 'Notification message is required.';
  end if;

  if p_project_id is not null then
    select project.organization_id
      into v_project_organization_id
    from public.projects project
    where project.id = p_project_id;

    if v_project_organization_id is null then
      raise exception 'Notification project does not exist.';
    end if;

    if v_organization_id is null then
      v_organization_id := v_project_organization_id;
    elsif v_organization_id <> v_project_organization_id then
      raise exception 'Notification organization does not match project.';
    end if;
  end if;

  if p_task_id is not null then
    select task.project_id
      into v_task_project_id
    from public.tasks task
    where task.id = p_task_id;

    if v_task_project_id is null then
      raise exception 'Notification task does not exist.';
    end if;

    if p_project_id is null then
      select project.organization_id
        into v_organization_id
      from public.projects project
      where project.id = v_task_project_id;
    elsif p_project_id <> v_task_project_id then
      raise exception 'Notification task does not belong to project.';
    end if;
  end if;

  insert into public.user_notifications (
    user_id,
    actor_id,
    organization_id,
    project_id,
    task_id,
    type,
    title,
    message,
    payload,
    dedupe_key
  )
  values (
    p_user_id,
    v_actor_id,
    v_organization_id,
    p_project_id,
    p_task_id,
    v_type,
    v_title,
    v_message,
    coalesce(p_payload, '{}'::jsonb),
    nullif(trim(coalesce(p_dedupe_key, '')), '')
  )
  on conflict (dedupe_key) where dedupe_key is not null
  do update set dedupe_key = excluded.dedupe_key
  returning * into v_notification;

  return v_notification;
end;
$$;

revoke all on function public.create_user_notification(uuid, text, text, text, uuid, uuid, uuid, uuid, jsonb, text, boolean) from public;
revoke execute on function public.create_user_notification(uuid, text, text, text, uuid, uuid, uuid, uuid, jsonb, text, boolean) from PUBLIC, anon, authenticated;

create or replace function public.create_task_assignment_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid;
  v_project public.projects%rowtype;
  v_task_label text;
begin
  if new.assignee_id is null then
    return new;
  end if;

  if tg_op = 'UPDATE' and new.assignee_id is not distinct from old.assignee_id then
    return new;
  end if;

  begin
    v_actor_id := nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
  exception
    when others then
      v_actor_id := null;
  end;

  if v_actor_id is null then
    v_actor_id := auth.uid();
  end if;

  select *
    into v_project
  from public.projects
  where id = new.project_id;

  v_task_label := coalesce(new.task_id_display, new.title, 'tarea');

  perform public.create_user_notification(
    new.assignee_id,
    'task_assigned',
    'Ticket asignado',
    'Te asignaron ' || v_task_label || coalesce(' en ' || v_project.title, ''),
    v_actor_id,
    v_project.organization_id,
    new.project_id,
    new.id,
    jsonb_build_object(
      'taskId', new.id,
      'taskIdDisplay', new.task_id_display,
      'taskTitle', new.title,
      'projectId', new.project_id,
      'projectTitle', v_project.title
    ),
    null,
    true
  );

  return new;
end;
$$;

drop trigger if exists task_assignment_notification_trigger on public.tasks;
create trigger task_assignment_notification_trigger
  after insert or update of assignee_id
  on public.tasks
  for each row
  execute function public.create_task_assignment_notification();

create or replace function public.create_project_member_added_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_project public.projects%rowtype;
begin
  select *
    into v_project
  from public.projects
  where id = new.project_id;

  perform public.create_user_notification(
    new.user_id,
    'project_member_added',
    'Nuevo acceso a proyecto',
    'Te agregaron al proyecto ' || coalesce(v_project.title, 'sin nombre') || '.',
    v_actor_id,
    v_project.organization_id,
    new.project_id,
    null,
    jsonb_build_object(
      'projectId', new.project_id,
      'projectTitle', v_project.title,
      'role', new.role
    ),
    'project_member_added:' || new.id::text,
    true
  );

  return new;
end;
$$;

drop trigger if exists project_member_added_notification_trigger on public.project_members;
create trigger project_member_added_notification_trigger
  after insert on public.project_members
  for each row
  execute function public.create_project_member_added_notification();

create or replace function public.create_organization_member_added_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_organization public.organizations%rowtype;
begin
  select *
    into v_organization
  from public.organizations
  where id = new.organization_id;

  perform public.create_user_notification(
    new.user_id,
    'organization_member_added',
    'Nuevo acceso a organización',
    'Ahora perteneces a ' || coalesce(v_organization.name, 'esta organización') || '.',
    v_actor_id,
    new.organization_id,
    null,
    null,
    jsonb_build_object(
      'organizationId', new.organization_id,
      'organizationName', v_organization.name,
      'role', new.role
    ),
    'organization_member_added:' || new.id::text,
    true
  );

  return new;
end;
$$;

drop trigger if exists organization_member_added_notification_trigger on public.organization_members;
create trigger organization_member_added_notification_trigger
  after insert on public.organization_members
  for each row
  execute function public.create_organization_member_added_notification();

create or replace function public.create_sprint_completed_notifications()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_project public.projects%rowtype;
  v_member record;
begin
  if new.status <> 'closed' then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status is not distinct from new.status then
    return new;
  end if;

  select *
    into v_project
  from public.projects
  where id = new.project_id;

  for v_member in
    select project_member.user_id
    from public.project_members project_member
    where project_member.project_id = new.project_id
  loop
    perform public.create_user_notification(
      v_member.user_id,
      'sprint_completed',
      'Sprint completado',
      'Se cerró el sprint ' || coalesce(new.name, 'sin nombre') || '.',
      v_actor_id,
      v_project.organization_id,
      new.project_id,
      null,
      jsonb_build_object(
        'projectId', new.project_id,
        'projectTitle', v_project.title,
        'sprintId', new.id,
        'sprintName', new.name
      ),
      'sprint_completed:' || new.id::text || ':' || v_member.user_id::text,
      true
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists sprint_completed_notifications_trigger on public.sprints;
create trigger sprint_completed_notifications_trigger
  after update of status on public.sprints
  for each row
  execute function public.create_sprint_completed_notifications();

grant select, update on public.user_notifications to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'user_notifications'
  ) then
    alter publication supabase_realtime add table public.user_notifications;
  end if;
end;
$$;
