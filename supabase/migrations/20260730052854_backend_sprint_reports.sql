create table if not exists public.sprint_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  sprint_id uuid not null references public.sprints(id) on delete cascade,
  report_type text not null default 'sprint_summary',
  generated_by uuid null,
  sprint_name text not null,
  sprint_goal text null,
  sprint_status text not null,
  sprint_start_date date null,
  sprint_end_date date null,
  closed_at timestamptz null,
  total_tasks integer not null default 0,
  completed_tasks integer not null default 0,
  incomplete_tasks integer not null default 0,
  total_story_points numeric not null default 0,
  completed_story_points numeric not null default 0,
  incomplete_story_points numeric not null default 0,
  completion_rate numeric not null default 0,
  story_point_completion_rate numeric not null default 0,
  snapshot jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sprint_reports_type_check
    check (report_type in ('sprint_summary')),
  constraint sprint_reports_unique_type_per_sprint
    unique (project_id, sprint_id, report_type)
);

create index if not exists sprint_reports_project_generated_idx
  on public.sprint_reports(project_id, generated_at desc);

create index if not exists sprint_reports_sprint_idx
  on public.sprint_reports(sprint_id);

alter table public.sprint_reports enable row level security;

drop policy if exists "Project viewers can read sprint reports" on public.sprint_reports;
create policy "Project viewers can read sprint reports"
  on public.sprint_reports
  for select
  to authenticated
  using (public.can_view_project(project_id));

revoke all on public.sprint_reports from public;
revoke all on public.sprint_reports from anon;
revoke all on public.sprint_reports from authenticated;
grant select on public.sprint_reports to authenticated;

create or replace function public.story_points_to_number(p_value text)
returns numeric
language sql
immutable
as $$
  select case
    when nullif(trim(coalesce(p_value, '')), '') is null then 0
    when trim(p_value) ~ '^[0-9]+(\\.[0-9]+)?$' then trim(p_value)::numeric
    else 0
  end;
$$;

revoke all on function public.story_points_to_number(text) from public;
revoke all on function public.story_points_to_number(text) from anon;
revoke all on function public.story_points_to_number(text) from authenticated;

create or replace function public.generate_sprint_report(
  p_project_id uuid,
  p_sprint_id uuid,
  p_actor_id uuid default null,
  p_dispositions jsonb default '[]'::jsonb
)
returns public.sprint_reports
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_project public.projects%rowtype;
  v_sprint public.sprints%rowtype;
  v_report public.sprint_reports%rowtype;
  v_total_tasks integer := 0;
  v_completed_tasks integer := 0;
  v_incomplete_tasks integer := 0;
  v_total_story_points numeric := 0;
  v_completed_story_points numeric := 0;
  v_incomplete_story_points numeric := 0;
  v_completion_rate numeric := 0;
  v_story_point_completion_rate numeric := 0;
  v_tasks_snapshot jsonb := '[]'::jsonb;
  v_status_snapshot jsonb := '{}'::jsonb;
begin
  if p_project_id is null or p_sprint_id is null then
    raise exception 'project_id and sprint_id are required to generate a sprint report.';
  end if;

  if jsonb_typeof(coalesce(p_dispositions, '[]'::jsonb)) <> 'array' then
    raise exception 'Sprint report dispositions must be an array.';
  end if;

  select *
    into v_project
  from public.projects
  where id = p_project_id;

  if v_project.id is null then
    raise exception 'Project does not exist for sprint report.';
  end if;

  select *
    into v_sprint
  from public.sprints
  where id = p_sprint_id
    and project_id = p_project_id;

  if v_sprint.id is null then
    raise exception 'Sprint does not belong to project for sprint report.';
  end if;

  with task_rows as (
    select
      task.id,
      task.title,
      task.task_id_display,
      task.story_points,
      public.story_points_to_number(task.story_points) as story_points_number,
      task.assignee_id,
      task.epic_id,
      epic.name as epic_name,
      epic.color as epic_color,
      task.priority_id,
      priority.name as priority_name,
      priority.color as priority_color,
      task.column_id,
      column_record.name as column_name,
      column_record.position as column_position,
      task.position,
      task.created_at,
      task.updated_at,
      (
        column_record.id is not null
        and lower(trim(
          translate(
            column_record.name,
            'ÁÉÍÓÚÜÑáéíóúüñ',
            'AEIOUUNaeiouun'
          )
        )) in ('done', 'hecho', 'finalizado', 'completado', 'cerrado')
      ) as is_completed
    from public.tasks task
    left join public.columns column_record on column_record.id = task.column_id
    left join public.epics epic on epic.id = task.epic_id and epic.project_id = task.project_id
    left join public.priorities priority on priority.id = task.priority_id
    where task.project_id = p_project_id
      and task.sprint_id = p_sprint_id
  ),
  totals as (
    select
      count(*)::integer as total_tasks,
      count(*) filter (where is_completed)::integer as completed_tasks,
      count(*) filter (where not is_completed)::integer as incomplete_tasks,
      coalesce(sum(story_points_number), 0) as total_story_points,
      coalesce(sum(story_points_number) filter (where is_completed), 0) as completed_story_points,
      coalesce(sum(story_points_number) filter (where not is_completed), 0) as incomplete_story_points
    from task_rows
  ),
  tasks_json as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', id,
          'title', title,
          'task_id_display', task_id_display,
          'story_points', story_points,
          'story_points_number', story_points_number,
          'assignee_id', assignee_id,
          'epic_id', epic_id,
          'epic_name', epic_name,
          'epic_color', epic_color,
          'priority_id', priority_id,
          'priority_name', priority_name,
          'priority_color', priority_color,
          'column_id', column_id,
          'column_name', column_name,
          'is_completed', is_completed,
          'created_at', created_at,
          'updated_at', updated_at
        )
        order by coalesce(column_position, 999999), position, created_at
      ),
      '[]'::jsonb
    ) as tasks
    from task_rows
  ),
  status_json as (
    select coalesce(
      jsonb_object_agg(
        coalesce(column_name, 'Sin columna'),
        jsonb_build_object(
          'tasks', task_count,
          'story_points', story_points
        )
      ),
      '{}'::jsonb
    ) as status_totals
    from (
      select
        column_name,
        count(*)::integer as task_count,
        coalesce(sum(story_points_number), 0) as story_points
      from task_rows
      group by column_name
    ) grouped
  )
  select
    totals.total_tasks,
    totals.completed_tasks,
    totals.incomplete_tasks,
    totals.total_story_points,
    totals.completed_story_points,
    totals.incomplete_story_points,
    case
      when totals.total_tasks = 0 then 0
      else round((totals.completed_tasks::numeric / totals.total_tasks::numeric) * 100, 2)
    end,
    case
      when totals.total_story_points = 0 then 0
      else round((totals.completed_story_points / totals.total_story_points) * 100, 2)
    end,
    tasks_json.tasks,
    status_json.status_totals
  into
    v_total_tasks,
    v_completed_tasks,
    v_incomplete_tasks,
    v_total_story_points,
    v_completed_story_points,
    v_incomplete_story_points,
    v_completion_rate,
    v_story_point_completion_rate,
    v_tasks_snapshot,
    v_status_snapshot
  from totals
  cross join tasks_json
  cross join status_json;

  insert into public.sprint_reports (
    organization_id,
    project_id,
    sprint_id,
    report_type,
    generated_by,
    sprint_name,
    sprint_goal,
    sprint_status,
    sprint_start_date,
    sprint_end_date,
    closed_at,
    total_tasks,
    completed_tasks,
    incomplete_tasks,
    total_story_points,
    completed_story_points,
    incomplete_story_points,
    completion_rate,
    story_point_completion_rate,
    snapshot,
    generated_at,
    updated_at
  )
  values (
    v_project.organization_id,
    p_project_id,
    p_sprint_id,
    'sprint_summary',
    p_actor_id,
    v_sprint.name,
    v_sprint.goal,
    v_sprint.status,
    v_sprint.start_date,
    v_sprint.end_date,
    now(),
    v_total_tasks,
    v_completed_tasks,
    v_incomplete_tasks,
    v_total_story_points,
    v_completed_story_points,
    v_incomplete_story_points,
    v_completion_rate,
    v_story_point_completion_rate,
    jsonb_build_object(
      'sprint', jsonb_build_object(
        'id', v_sprint.id,
        'name', v_sprint.name,
        'goal', v_sprint.goal,
        'status', v_sprint.status,
        'start_date', v_sprint.start_date,
        'end_date', v_sprint.end_date
      ),
      'totals_by_status', v_status_snapshot,
      'tasks', v_tasks_snapshot,
      'dispositions', coalesce(p_dispositions, '[]'::jsonb)
    ),
    now(),
    now()
  )
  on conflict (project_id, sprint_id, report_type) do update
  set
    generated_by = excluded.generated_by,
    sprint_name = excluded.sprint_name,
    sprint_goal = excluded.sprint_goal,
    sprint_status = excluded.sprint_status,
    sprint_start_date = excluded.sprint_start_date,
    sprint_end_date = excluded.sprint_end_date,
    closed_at = excluded.closed_at,
    total_tasks = excluded.total_tasks,
    completed_tasks = excluded.completed_tasks,
    incomplete_tasks = excluded.incomplete_tasks,
    total_story_points = excluded.total_story_points,
    completed_story_points = excluded.completed_story_points,
    incomplete_story_points = excluded.incomplete_story_points,
    completion_rate = excluded.completion_rate,
    story_point_completion_rate = excluded.story_point_completion_rate,
    snapshot = excluded.snapshot,
    generated_at = excluded.generated_at,
    updated_at = now()
  returning * into v_report;

  return v_report;
end;
$$;

revoke all on function public.generate_sprint_report(uuid, uuid, uuid, jsonb) from public;
revoke all on function public.generate_sprint_report(uuid, uuid, uuid, jsonb) from anon;
revoke all on function public.generate_sprint_report(uuid, uuid, uuid, jsonb) from authenticated;

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

  perform public.generate_sprint_report(
    p_project_id,
    p_sprint_id,
    v_user_id,
    coalesce(p_dispositions, '[]'::jsonb)
  );

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
    'report.sprint_completed',
    jsonb_build_object(
      'job_key', 'report.sprint_completed:' || p_sprint_id::text,
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
