create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid null references public.organizations(id) on delete cascade,
  project_id uuid null references public.projects(id) on delete cascade,
  sprint_id uuid null references public.sprints(id) on delete set null,
  task_id uuid null references public.tasks(id) on delete set null,
  actor_id uuid null references auth.users(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activity_events_project_created_idx
  on public.activity_events(project_id, created_at desc);

create index if not exists activity_events_actor_created_idx
  on public.activity_events(actor_id, created_at desc);

alter table public.activity_events enable row level security;

drop policy if exists "Users can view accessible activity events" on public.activity_events;
create policy "Users can view accessible activity events"
  on public.activity_events
  for select
  to authenticated
  using (
    project_id is not null
    and public.can_view_project(project_id)
  );

create table if not exists public.command_jobs (
  id uuid primary key default gen_random_uuid(),
  queue_name text not null,
  job_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'done', 'failed')),
  attempts integer not null default 0,
  last_error text null,
  created_at timestamptz not null default now(),
  available_at timestamptz not null default now(),
  processed_at timestamptz null
);

create index if not exists command_jobs_queue_status_available_idx
  on public.command_jobs(queue_name, status, available_at, created_at);

alter table public.command_jobs enable row level security;

create or replace function public.can_edit_project(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.project_members member
    where member.project_id = p_project_id
      and member.user_id = (select auth.uid())
      and member.role in ('owner', 'admin', 'member')
  );
$$;

revoke all on function public.can_edit_project(uuid) from public;
grant execute on function public.can_edit_project(uuid) to authenticated;

create or replace function public.enqueue_command_job(
  p_queue_name text,
  p_job_type text,
  p_payload jsonb,
  p_delay_seconds integer default 0
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job_id uuid;
  v_sent_to_pgmq boolean := false;
begin
  if to_regnamespace('pgmq') is not null then
    begin
      execute
        'select pgmq.send($1, $2, $3)'
        using p_queue_name, jsonb_build_object(
          'job_type', p_job_type,
          'payload', coalesce(p_payload, '{}'::jsonb)
        ), greatest(coalesce(p_delay_seconds, 0), 0);
      v_sent_to_pgmq := true;
    exception
      when undefined_function or undefined_table or invalid_schema_name then
        null;
    end;
  end if;

  if v_sent_to_pgmq then
    return gen_random_uuid();
  end if;

  insert into public.command_jobs (
    queue_name,
    job_type,
    payload,
    available_at
  )
  values (
    p_queue_name,
    p_job_type,
    coalesce(p_payload, '{}'::jsonb),
    now() + make_interval(secs => greatest(coalesce(p_delay_seconds, 0), 0))
  )
  returning id into v_job_id;

  return v_job_id;
end;
$$;

revoke all on function public.enqueue_command_job(text, text, jsonb, integer) from public;

create or replace function public.create_task_command(
  p_project_id uuid,
  p_title text,
  p_subtitle text default null,
  p_description text default null,
  p_destination text default 'backlog',
  p_column_id uuid default null,
  p_sprint_id uuid default null,
  p_position integer default 0,
  p_issue_type_id uuid default null,
  p_priority_id uuid default null,
  p_story_points text default null,
  p_assignee_id uuid default null,
  p_epic_id uuid default null,
  p_github_link text default null
)
returns public.tasks
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_project public.projects%rowtype;
  v_task public.tasks%rowtype;
  v_next_sequence integer;
  v_destination text := coalesce(nullif(trim(p_destination), ''), 'backlog');
  v_in_backlog boolean;
  v_column_id uuid := p_column_id;
  v_sprint_id uuid := p_sprint_id;
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión para crear tareas.';
  end if;

  if p_project_id is null or not public.can_edit_project(p_project_id) then
    raise exception 'No tienes permisos para crear tareas en este proyecto.';
  end if;

  if trim(coalesce(p_title, '')) = '' then
    raise exception 'El título de la tarea es obligatorio.';
  end if;

  if v_destination not in ('backlog', 'scrum') then
    raise exception 'Destino de tarea inválido.';
  end if;

  select *
    into v_project
  from public.projects
  where id = p_project_id
  for update;

  if v_project.id is null then
    raise exception 'El proyecto no existe.';
  end if;

  if p_epic_id is not null and not exists (
    select 1
    from public.epics epic
    where epic.id = p_epic_id
      and epic.project_id = p_project_id
  ) then
    raise exception 'La épica no pertenece al proyecto activo.';
  end if;

  if p_assignee_id is not null and not exists (
    select 1
    from public.project_members member
    where member.project_id = p_project_id
      and member.user_id = p_assignee_id
  ) then
    raise exception 'Solo puedes asignar tareas a miembros del proyecto.';
  end if;

  if v_destination = 'backlog' then
    v_in_backlog := true;
    v_column_id := null;
    v_sprint_id := null;
  else
    v_in_backlog := false;

    if v_column_id is null then
      select id
        into v_column_id
      from public.columns
      where project_id = p_project_id
      order by position asc
      limit 1;
    end if;

    if v_column_id is null or not exists (
      select 1
      from public.columns column_record
      where column_record.id = v_column_id
        and column_record.project_id = p_project_id
    ) then
      raise exception 'La columna no pertenece al proyecto activo.';
    end if;

    if v_sprint_id is not null and not exists (
      select 1
      from public.sprints sprint
      where sprint.id = v_sprint_id
        and sprint.project_id = p_project_id
        and sprint.status in ('active', 'future')
    ) then
      raise exception 'Solo puedes crear tareas en sprints activos o planificados del proyecto.';
    end if;
  end if;

  v_next_sequence := coalesce(v_project.task_sequence, 0) + 1;

  update public.projects
  set
    task_sequence = v_next_sequence,
    updated_at = now()
  where id = p_project_id;

  insert into public.tasks (
    project_id,
    title,
    task_id_display,
    subtitle,
    description,
    position,
    in_backlog,
    column_id,
    sprint_id,
    issue_type_id,
    priority_id,
    story_points,
    assignee_id,
    epic_id,
    github_link
  )
  values (
    p_project_id,
    trim(p_title),
    upper(v_project.project_key) || '-' || v_next_sequence::text,
    nullif(trim(coalesce(p_subtitle, '')), ''),
    nullif(p_description, ''),
    greatest(coalesce(p_position, 0), 0),
    v_in_backlog,
    v_column_id,
    v_sprint_id,
    p_issue_type_id,
    p_priority_id,
    nullif(trim(coalesce(p_story_points, '')), ''),
    p_assignee_id,
    p_epic_id,
    nullif(trim(coalesce(p_github_link, '')), '')
  )
  returning * into v_task;

  insert into public.activity_events (
    organization_id,
    project_id,
    sprint_id,
    task_id,
    actor_id,
    event_type,
    payload
  )
  values (
    v_project.organization_id,
    p_project_id,
    v_sprint_id,
    v_task.id,
    v_user_id,
    'task.created',
    jsonb_build_object(
      'destination', v_destination,
      'task_id_display', v_task.task_id_display,
      'title', v_task.title
    )
  );

  perform public.enqueue_command_job(
    'nexusplanner-events',
    'activity.task_created',
    jsonb_build_object(
      'project_id', p_project_id,
      'task_id', v_task.id,
      'actor_id', v_user_id
    )
  );

  return v_task;
end;
$$;

revoke all on function public.create_task_command(uuid, text, text, text, text, uuid, uuid, integer, uuid, uuid, text, uuid, uuid, text) from public;
grant execute on function public.create_task_command(uuid, text, text, text, text, uuid, uuid, integer, uuid, uuid, text, uuid, uuid, text) to authenticated;

create or replace function public.assign_task_command(
  p_project_id uuid,
  p_task_id uuid,
  p_assignee_id uuid default null
)
returns public.tasks
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_project public.projects%rowtype;
  v_task public.tasks%rowtype;
  v_previous_assignee uuid;
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión para asignar tareas.';
  end if;

  if p_project_id is null or not public.can_edit_project(p_project_id) then
    raise exception 'No tienes permisos para asignar tareas en este proyecto.';
  end if;

  select *
    into v_project
  from public.projects
  where id = p_project_id;

  if v_project.id is null then
    raise exception 'El proyecto no existe.';
  end if;

  select assignee_id
    into v_previous_assignee
  from public.tasks
  where id = p_task_id
    and project_id = p_project_id
  for update;

  if not found then
    raise exception 'La tarea no pertenece al proyecto activo.';
  end if;

  if p_assignee_id is not null and not exists (
    select 1
    from public.project_members member
    where member.project_id = p_project_id
      and member.user_id = p_assignee_id
  ) then
    raise exception 'Solo puedes asignar tareas a miembros del proyecto.';
  end if;

  update public.tasks
  set
    assignee_id = p_assignee_id,
    updated_at = now()
  where id = p_task_id
    and project_id = p_project_id
  returning * into v_task;

  if p_assignee_id is distinct from v_previous_assignee then
    insert into public.activity_events (
      organization_id,
      project_id,
      sprint_id,
      task_id,
      actor_id,
      event_type,
      payload
    )
    values (
      v_project.organization_id,
      p_project_id,
      v_task.sprint_id,
      v_task.id,
      v_user_id,
      'task.assigned',
      jsonb_build_object(
        'previous_assignee_id', v_previous_assignee,
        'assignee_id', p_assignee_id,
        'task_id_display', v_task.task_id_display
      )
    );

    perform public.enqueue_command_job(
      'nexusplanner-events',
      'notification.task_assigned',
      jsonb_build_object(
        'project_id', p_project_id,
        'task_id', v_task.id,
        'actor_id', v_user_id,
        'assignee_id', p_assignee_id
      )
    );
  end if;

  return v_task;
end;
$$;

revoke all on function public.assign_task_command(uuid, uuid, uuid) from public;
grant execute on function public.assign_task_command(uuid, uuid, uuid) to authenticated;

create or replace function public.complete_sprint_command(
  p_project_id uuid,
  p_sprint_id uuid,
  p_dispositions jsonb default '[]'::jsonb
)
returns public.sprints
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_project public.projects%rowtype;
  v_sprint public.sprints%rowtype;
  v_first_column_id uuid;
  v_completed_tasks integer := 0;
  v_incomplete_tasks integer := 0;
  v_disposition_count integer;
  v_invalid_disposition_count integer;
  v_task record;
  v_action text;
  v_target_sprint_id uuid;
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión para completar sprints.';
  end if;

  if p_project_id is null or not public.can_edit_project(p_project_id) then
    raise exception 'No tienes permisos para completar sprints en este proyecto.';
  end if;

  select *
    into v_project
  from public.projects
  where id = p_project_id;

  if v_project.id is null then
    raise exception 'El proyecto no existe.';
  end if;

  select *
    into v_sprint
  from public.sprints
  where id = p_sprint_id
    and project_id = p_project_id
  for update;

  if v_sprint.id is null then
    raise exception 'El sprint no pertenece al proyecto activo.';
  end if;

  if v_sprint.status <> 'active' then
    raise exception 'Solo puedes completar un sprint activo.';
  end if;

  if jsonb_typeof(coalesce(p_dispositions, '[]'::jsonb)) <> 'array' then
    raise exception 'Las decisiones de tareas incompletas deben enviarse como arreglo.';
  end if;

  create temporary table if not exists tmp_incomplete_tasks (
    task_id uuid primary key
  ) on commit drop;

  truncate table tmp_incomplete_tasks;

  insert into tmp_incomplete_tasks (task_id)
  select task.id
  from public.tasks task
  left join public.columns column_record on column_record.id = task.column_id
  where task.project_id = p_project_id
    and task.sprint_id = p_sprint_id
    and not (
      column_record.id is not null
      and lower(trim(
        translate(
          column_record.name,
          'ÁÉÍÓÚÜÑáéíóúüñ',
          'AEIOUUNaeiouun'
        )
      )) in ('done', 'hecho', 'finalizado', 'completado', 'cerrado')
    );

  select count(*) into v_incomplete_tasks from tmp_incomplete_tasks;

  select count(*)
    into v_completed_tasks
  from public.tasks task
  where task.project_id = p_project_id
    and task.sprint_id = p_sprint_id
    and not exists (
      select 1
      from tmp_incomplete_tasks incomplete
      where incomplete.task_id = task.id
    );

  select count(*)
    into v_disposition_count
  from jsonb_array_elements(coalesce(p_dispositions, '[]'::jsonb)) disposition
  where (disposition->>'taskId')::uuid in (select task_id from tmp_incomplete_tasks);

  if v_disposition_count <> v_incomplete_tasks then
    raise exception 'Cada tarea incompleta necesita una decisión antes de completar el sprint.';
  end if;

  select count(*)
    into v_invalid_disposition_count
  from jsonb_array_elements(coalesce(p_dispositions, '[]'::jsonb)) disposition
  where not exists (
    select 1
    from tmp_incomplete_tasks incomplete
    where incomplete.task_id = (disposition->>'taskId')::uuid
  );

  if v_invalid_disposition_count > 0 then
    raise exception 'Hay decisiones para tareas que no están incompletas en este sprint.';
  end if;

  select id
    into v_first_column_id
  from public.columns
  where project_id = p_project_id
  order by position asc
  limit 1;

  for v_task in
    select
      disposition,
      (disposition->>'taskId')::uuid as task_id
    from jsonb_array_elements(coalesce(p_dispositions, '[]'::jsonb)) disposition
  loop
    v_action := coalesce(v_task.disposition->>'destination', v_task.disposition->>'action');
    v_target_sprint_id := nullif(v_task.disposition->>'sprintId', '')::uuid;

    if v_action = 'backlog' then
      update public.tasks
      set
        sprint_id = null,
        in_backlog = true,
        column_id = null,
        updated_at = now()
      where id = v_task.task_id
        and project_id = p_project_id
        and sprint_id = p_sprint_id;
    elsif v_action in ('sprint', 'next_sprint', 'new_sprint') then
      if v_target_sprint_id is null then
        raise exception 'Las tareas movidas a sprint necesitan un sprint destino.';
      end if;

      if v_first_column_id is null then
        raise exception 'No se encontró una columna inicial para mover tareas al siguiente sprint.';
      end if;

      if not exists (
        select 1
        from public.sprints target_sprint
        where target_sprint.id = v_target_sprint_id
          and target_sprint.project_id = p_project_id
          and target_sprint.status = 'future'
      ) then
        raise exception 'Solo puedes mover tareas incompletas a sprints futuros del proyecto activo.';
      end if;

      update public.tasks
      set
        sprint_id = v_target_sprint_id,
        in_backlog = false,
        column_id = v_first_column_id,
        updated_at = now()
      where id = v_task.task_id
        and project_id = p_project_id
        and sprint_id = p_sprint_id;
    else
      raise exception 'Destino inválido para una tarea incompleta.';
    end if;
  end loop;

  update public.sprints
  set
    status = 'closed',
    updated_at = now()
  where id = p_sprint_id
    and project_id = p_project_id
  returning * into v_sprint;

  insert into public.activity_events (
    organization_id,
    project_id,
    sprint_id,
    actor_id,
    event_type,
    payload
  )
  values (
    v_project.organization_id,
    p_project_id,
    p_sprint_id,
    v_user_id,
    'sprint.completed',
    jsonb_build_object(
      'completed_tasks', v_completed_tasks,
      'incomplete_tasks', v_incomplete_tasks,
      'dispositions', coalesce(p_dispositions, '[]'::jsonb)
    )
  );

  perform public.enqueue_command_job(
    'nexusplanner-events',
    'metrics.sprint_completed',
    jsonb_build_object(
      'project_id', p_project_id,
      'sprint_id', p_sprint_id,
      'actor_id', v_user_id
    )
  );

  return v_sprint;
end;
$$;

revoke all on function public.complete_sprint_command(uuid, uuid, jsonb) from public;
grant execute on function public.complete_sprint_command(uuid, uuid, jsonb) to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'activity_events'
  ) then
    alter publication supabase_realtime add table public.activity_events;
  end if;
end;
$$;
