alter table public.activity_events
  add column if not exists event_key text null;

create unique index if not exists activity_events_event_key_uidx
  on public.activity_events(event_key)
  where event_key is not null;

create index if not exists activity_events_organization_created_idx
  on public.activity_events(organization_id, created_at desc);

create index if not exists activity_events_type_created_idx
  on public.activity_events(event_type, created_at desc);

create or replace function public.normalize_activity_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_auth_user_id uuid := auth.uid();
  v_project_organization_id uuid;
  v_task_project_id uuid;
  v_task_sprint_id uuid;
  v_sprint_project_id uuid;
begin
  new.event_type := lower(trim(coalesce(new.event_type, '')));
  new.payload := coalesce(new.payload, '{}'::jsonb);
  new.event_key := nullif(trim(coalesce(new.event_key, '')), '');

  if new.event_type = '' then
    raise exception 'activity_events.event_type is required.';
  end if;

  if new.actor_id is null then
    new.actor_id := v_auth_user_id;
  end if;

  if new.actor_id is null then
    raise exception 'activity_events.actor_id is required.';
  end if;

  if v_auth_user_id is not null and new.actor_id <> v_auth_user_id then
    raise exception 'activity_events.actor_id must match the authenticated user.';
  end if;

  if new.project_id is not null then
    select project.organization_id
      into v_project_organization_id
    from public.projects project
    where project.id = new.project_id;

    if v_project_organization_id is null then
      raise exception 'activity_events.project_id does not reference an existing project.';
    end if;

    if new.organization_id is null then
      new.organization_id := v_project_organization_id;
    elsif new.organization_id <> v_project_organization_id then
      raise exception 'activity_events.organization_id does not match project organization.';
    end if;
  end if;

  if new.organization_id is null then
    raise exception 'activity_events must be scoped to an organization or project.';
  end if;

  if new.task_id is not null then
    select task.project_id, task.sprint_id
      into v_task_project_id, v_task_sprint_id
    from public.tasks task
    where task.id = new.task_id;

    if v_task_project_id is null then
      raise exception 'activity_events.task_id does not reference an existing task.';
    end if;

    if new.project_id is null then
      new.project_id := v_task_project_id;

      select project.organization_id
        into new.organization_id
      from public.projects project
      where project.id = new.project_id;
    elsif new.project_id <> v_task_project_id then
      raise exception 'activity_events.task_id does not belong to activity_events.project_id.';
    end if;

    if new.sprint_id is null and v_task_sprint_id is not null then
      new.sprint_id := v_task_sprint_id;
    elsif new.sprint_id is not null
      and v_task_sprint_id is not null
      and new.sprint_id <> v_task_sprint_id then
      raise exception 'activity_events.sprint_id does not match task sprint.';
    end if;
  end if;

  if new.sprint_id is not null then
    select sprint.project_id
      into v_sprint_project_id
    from public.sprints sprint
    where sprint.id = new.sprint_id;

    if v_sprint_project_id is null then
      raise exception 'activity_events.sprint_id does not reference an existing sprint.';
    end if;

    if new.project_id is null then
      new.project_id := v_sprint_project_id;

      select project.organization_id
        into new.organization_id
      from public.projects project
      where project.id = new.project_id;
    elsif new.project_id <> v_sprint_project_id then
      raise exception 'activity_events.sprint_id does not belong to activity_events.project_id.';
    end if;
  end if;

  if new.created_at is null then
    new.created_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists normalize_activity_event_before_insert on public.activity_events;
create trigger normalize_activity_event_before_insert
  before insert on public.activity_events
  for each row
  execute function public.normalize_activity_event();

create or replace function public.record_activity_event(
  p_event_type text,
  p_organization_id uuid default null,
  p_project_id uuid default null,
  p_sprint_id uuid default null,
  p_task_id uuid default null,
  p_actor_id uuid default null,
  p_payload jsonb default '{}'::jsonb,
  p_event_key text default null
)
returns public.activity_events
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_event public.activity_events%rowtype;
begin
  insert into public.activity_events (
    organization_id,
    project_id,
    sprint_id,
    task_id,
    actor_id,
    event_type,
    payload,
    event_key
  )
  values (
    p_organization_id,
    p_project_id,
    p_sprint_id,
    p_task_id,
    coalesce(p_actor_id, auth.uid()),
    p_event_type,
    coalesce(p_payload, '{}'::jsonb),
    nullif(trim(coalesce(p_event_key, '')), '')
  )
  on conflict (event_key) where event_key is not null
  do update set event_key = excluded.event_key
  returning * into v_event;

  return v_event;
end;
$$;

revoke all on function public.normalize_activity_event() from public;
revoke execute on function public.normalize_activity_event() from PUBLIC, anon, authenticated;

revoke all on function public.record_activity_event(text, uuid, uuid, uuid, uuid, uuid, jsonb, text) from public;
revoke execute on function public.record_activity_event(text, uuid, uuid, uuid, uuid, uuid, jsonb, text) from PUBLIC, anon, authenticated;

drop policy if exists "Users can view accessible activity events" on public.activity_events;
create policy "Users can view accessible activity events"
  on public.activity_events
  for select
  to authenticated
  using (
    (
      project_id is not null
      and public.can_view_project(project_id)
    )
    or (
      project_id is null
      and organization_id is not null
      and public.can_view_organization(organization_id)
    )
  );
