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
    'sprint_completed',
    'sprint_due_soon',
    'sprint_overdue'
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
