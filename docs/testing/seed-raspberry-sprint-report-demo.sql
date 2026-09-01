do $$
declare
  v_project public.projects%rowtype;
  v_sprint_id uuid;
  v_epic_ids uuid[];
  v_column_ids uuid[];
  v_issue_type_ids uuid[];
  v_priority_ids uuid[];
  v_existing_sprint_id uuid;
  v_task_number integer;
  v_task_index integer;
  v_column_index integer;
  v_story_points text[] := array['1', '2', '3', '5', '8', '13'];
  v_titles text[] := array[
    'JS profundo - execution context y call stack',
    'JS profundo - lexical scope y closures',
    'JS profundo - this, bind, call y apply',
    'JS profundo - prototype chain',
    'JS profundo - promesas y microtasks',
    'JS profundo - modules ESM vs CommonJS',
    'TypeScript - tipos primitivos y narrowing',
    'TypeScript - generics aplicados',
    'TypeScript - utility types',
    'React - estado local y derivado',
    'React - efectos y data fetching',
    'React - performance con memoizacion',
    'Node API - rutas REST',
    'Node API - validacion de entrada',
    'Node API - manejo centralizado de errores',
    'PostgreSQL - SELECT JOIN GROUP BY',
    'PostgreSQL - indices y EXPLAIN',
    'Supabase - RLS por proyecto',
    'Supabase - Edge Function command',
    'Testing - casos felices y errores',
    'Testing - mocks de servicios',
    'Arquitectura - capas frontend/backend',
    'CLI - comando para crear epica',
    'CLI - comando para planificar sprint',
    'Algoritmo diario - two pointers'
  ];
begin
  select *
    into v_project
  from public.projects
  where lower(title) = 'crecimiento'
  order by created_at desc
  limit 1;

  if v_project.id is null then
    raise exception 'No se encontro el proyecto crecimiento.';
  end if;

  select id
    into v_existing_sprint_id
  from public.sprints
  where project_id = v_project.id
    and name = 'Sprint demo cerrado - Reportes premium';

  if v_existing_sprint_id is not null then
    delete from public.sprint_reports where sprint_id = v_existing_sprint_id;
    delete from public.tasks where sprint_id = v_existing_sprint_id;
    delete from public.sprints where id = v_existing_sprint_id;
  end if;

  select array_agg(id order by created_at, id)
    into v_epic_ids
  from (
    select id, created_at
    from public.epics
    where project_id = v_project.id
    order by created_at, id
    limit 5
  ) epics;

  select array_agg(id order by position)
    into v_column_ids
  from public.columns
  where project_id = v_project.id;

  select array_agg(id order by position nulls last, name)
    into v_issue_type_ids
  from public.issue_types;

  select array_agg(id order by position nulls last, name)
    into v_priority_ids
  from public.priorities;

  if coalesce(array_length(v_epic_ids, 1), 0) = 0 then
    raise exception 'El proyecto crecimiento necesita al menos una epica para sembrar el reporte.';
  end if;

  if coalesce(array_length(v_column_ids, 1), 0) = 0 then
    raise exception 'El proyecto crecimiento necesita columnas para sembrar tareas.';
  end if;

  insert into public.sprints (
    project_id,
    name,
    goal,
    status,
    start_date,
    end_date
  )
  values (
    v_project.id,
    'Sprint demo cerrado - Reportes premium',
    'Sprint ficticio para revisar reportes con 50 tareas, puntos, epicas, responsables y estados finales variados.',
    'closed',
    current_date - interval '28 days',
    current_date - interval '14 days'
  )
  returning id into v_sprint_id;

  v_task_number := v_project.task_sequence;

  for v_task_index in 1..50 loop
    v_task_number := v_task_number + 1;
    v_column_index := case
      when v_task_index <= 28 then array_length(v_column_ids, 1)
      when v_task_index <= 37 then greatest(1, array_length(v_column_ids, 1) - 1)
      when v_task_index <= 44 then least(2, array_length(v_column_ids, 1))
      else 1
    end;

    insert into public.tasks (
      project_id,
      column_id,
      sprint_id,
      epic_id,
      title,
      subtitle,
      description,
      position,
      issue_type_id,
      priority_id,
      story_points,
      assignee_id,
      task_id_display,
      in_backlog,
      planned_start_date,
      planned_end_date
    )
    values (
      v_project.id,
      v_column_ids[v_column_index],
      v_sprint_id,
      v_epic_ids[((v_task_index - 1) % array_length(v_epic_ids, 1)) + 1],
      v_titles[((v_task_index - 1) % array_length(v_titles, 1)) + 1] || ' #' || v_task_index::text,
      case
        when v_task_index <= 28 then 'Terminada dentro del sprint demo.'
        when v_task_index <= 37 then 'Quedo lista para revision al cierre.'
        when v_task_index <= 44 then 'Avanzo parcialmente durante el sprint.'
        else 'No inicio antes del cierre.'
      end,
      '<p><strong>Contexto:</strong> tarea ficticia para validar el reporte de cierre de sprint.</p>' ||
      '<p><strong>Resultado esperado:</strong> revisar que aparezca en KPIs, estados, epicas, carga por responsable y tabla historica.</p>',
      v_task_index,
      case
        when coalesce(array_length(v_issue_type_ids, 1), 0) = 0 then null
        else v_issue_type_ids[((v_task_index - 1) % array_length(v_issue_type_ids, 1)) + 1]
      end,
      case
        when coalesce(array_length(v_priority_ids, 1), 0) = 0 then null
        else v_priority_ids[((v_task_index - 1) % array_length(v_priority_ids, 1)) + 1]
      end,
      v_story_points[((v_task_index - 1) % array_length(v_story_points, 1)) + 1],
      case when v_task_index % 4 = 0 then null else v_project.user_id end,
      v_project.project_key || '-' || v_task_number::text,
      false,
      (current_date - interval '28 days')::date + ((v_task_index - 1) % 15),
      (current_date - interval '28 days')::date + ((v_task_index - 1) % 15)
    );
  end loop;

  update public.projects
  set
    task_sequence = greatest(task_sequence, v_task_number),
    updated_at = now()
  where id = v_project.id;

  perform public.generate_sprint_report(v_project.id, v_sprint_id, v_project.user_id, '[]'::jsonb);

  raise notice 'Seeded sprint report demo for project %, sprint %.', v_project.title, v_sprint_id;
end;
$$;

select
  project.title as project,
  sprint.name as sprint,
  report.total_tasks,
  report.completed_tasks,
  report.incomplete_tasks,
  report.total_story_points,
  report.completed_story_points,
  report.story_point_completion_rate
from public.sprint_reports report
join public.projects project on project.id = report.project_id
join public.sprints sprint on sprint.id = report.sprint_id
where project.title = 'crecimiento'
  and sprint.name = 'Sprint demo cerrado - Reportes premium';
