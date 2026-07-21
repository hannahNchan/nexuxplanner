alter table public.tasks replica identity full;
alter table public.user_notifications replica identity full;

grant select on public.tasks to authenticated;
grant select, update on public.user_notifications to authenticated;

create or replace function public.create_task_assignment_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_project_title text;
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

  if v_actor_id is not null and new.assignee_id = v_actor_id then
    return new;
  end if;

  select title
    into v_project_title
  from public.projects
  where id = new.project_id;

  v_task_label := coalesce(new.task_id_display, new.title, 'tarea');

  insert into public.user_notifications (
    user_id,
    actor_id,
    project_id,
    task_id,
    type,
    title,
    message
  )
  values (
    new.assignee_id,
    v_actor_id,
    new.project_id,
    new.id,
    'task_assigned',
    'Ticket asignado',
    'Te asignaron ' || v_task_label || coalesce(' en ' || v_project_title, '')
  );

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'tasks'
  ) then
    alter publication supabase_realtime add table public.tasks;
  end if;

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
