create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid null references auth.users(id) on delete set null,
  project_id uuid null references public.projects(id) on delete cascade,
  task_id uuid null references public.tasks(id) on delete cascade,
  type text not null check (type in ('task_assigned')),
  title text not null,
  message text not null,
  read_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists user_notifications_user_read_created_idx
  on public.user_notifications(user_id, read_at, created_at desc);

alter table public.user_notifications enable row level security;

drop policy if exists "Users can view own notifications" on public.user_notifications;
create policy "Users can view own notifications"
  on public.user_notifications
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users can update own notifications" on public.user_notifications;
create policy "Users can update own notifications"
  on public.user_notifications
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

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

  v_actor_id := auth.uid();

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

drop trigger if exists task_assignment_notification_trigger on public.tasks;
create trigger task_assignment_notification_trigger
  after insert or update of assignee_id
  on public.tasks
  for each row
  execute function public.create_task_assignment_notification();

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

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'tasks'
  ) then
    alter publication supabase_realtime add table public.tasks;
  end if;
end;
$$;
