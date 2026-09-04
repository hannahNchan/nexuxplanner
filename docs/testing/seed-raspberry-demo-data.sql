do $$
declare
  v_owner_id uuid := '233e89ba-df18-4740-a948-beec0574e529';
  v_org_id uuid;
  v_project record;
  v_project_id uuid;
  v_column_ids uuid[];
  v_active_sprint_id uuid;
  v_future_sprint_id uuid;
  v_epic_id uuid;
  v_epic_names text[];
  v_epic_colors text[] := array['#2563EB', '#0891B2', '#7C3AED', '#EA580C', '#16A34A'];
  v_phase_ids uuid[];
  v_issue_type_ids uuid[];
  v_priority_ids uuid[];
  v_points text[] := array['1', '2', '3', '5', '8', '13'];
  v_task_titles text[] := array[
    'Definir criterios de aceptación',
    'Diseñar flujo principal',
    'Validar permisos y roles',
    'Crear estados vacíos',
    'Implementar vista densa',
    'Conectar realtime',
    'Agregar validaciones de formulario',
    'Revisar navegación móvil',
    'Pulir microcopy',
    'Instrumentar evento de actividad',
    'Probar errores de red',
    'Optimizar consulta inicial',
    'Configurar notificación',
    'Documentar edge case',
    'Preparar dataset de QA',
    'Corregir ordenamiento',
    'Ajustar estado de carga',
    'Revisar accesibilidad',
    'Actualizar reporte',
    'Cerrar revisión funcional'
  ];
  v_subtitles text[] := array[
    'Escenario base listo para pruebas manuales',
    'Debe cubrir navegación, permisos y datos reales',
    'Incluye validación contra organización y proyecto',
    'Requiere feedback visual con MUI',
    'Preparado para probar board, backlog y roadmap'
  ];
  v_epic_idx integer;
  v_task_idx integer;
  v_task_sequence integer;
  v_epic_sequence integer;
  v_start_date date;
  v_end_date date;
begin
  if not exists (select 1 from auth.users where id = v_owner_id) then
    raise exception 'Seed owner user % does not exist in auth.users.', v_owner_id;
  end if;

  delete from public.organizations
  where name = 'NexusPlanner QA Labs'
    and created_by = v_owner_id;

  select array_agg(id order by position)
    into v_phase_ids
  from public.epic_phases
  where name in ('Backlog', 'Planificación', 'En Desarrollo', 'En Pruebas', 'Completado');

  select array_agg(id order by position)
    into v_issue_type_ids
  from public.issue_types
  where name in ('Task', 'Bug', 'Story');

  select array_agg(id order by position)
    into v_priority_ids
  from public.priorities
  where name in ('Low', 'Medium', 'High', 'Highest');

  if coalesce(array_length(v_phase_ids, 1), 0) < 5 then
    raise exception 'Seed requires at least 5 usable epic phases.';
  end if;

  if coalesce(array_length(v_issue_type_ids, 1), 0) < 3 then
    raise exception 'Seed requires Task, Bug and Story issue types.';
  end if;

  if coalesce(array_length(v_priority_ids, 1), 0) < 4 then
    raise exception 'Seed requires Low, Medium, High and Highest priorities.';
  end if;

  insert into public.organizations (name, logo_url, created_by)
  values ('NexusPlanner QA Labs', null, v_owner_id)
  returning id into v_org_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_org_id, v_owner_id, 'owner');

  for v_project in
    select *
    from (
      values
        (
          'AEROQA',
          'Aero Operations Console',
          'Proyecto ficticio para probar planeación operacional, tablero Scrum, roadmap y cierre de trabajo aeronáutico.',
          array[
            'Planificación de vuelos',
            'Asignación de tripulación',
            'Control de mantenimiento',
            'Alertas operativas',
            'Experiencia del pasajero'
          ]::text[],
          array['qa', 'aviation', 'operations']::text[]
        ),
        (
          'COMQA',
          'Commerce Growth Platform',
          'Proyecto ficticio para validar un producto de ecommerce con campañas, checkout, analítica y soporte postventa.',
          array[
            'Catálogo inteligente',
            'Checkout y pagos',
            'Promociones dinámicas',
            'Analítica comercial',
            'Soporte postventa'
          ]::text[],
          array['qa', 'commerce', 'growth']::text[]
        )
    ) as projects(project_key, title, description, epic_names, tags)
  loop
    insert into public.projects (
      user_id,
      organization_id,
      title,
      description,
      project_key,
      task_sequence,
      epic_sequence,
      allow_board_task_creation,
      visibility
    )
    values (
      v_owner_id,
      v_org_id,
      v_project.title,
      v_project.description,
      v_project.project_key,
      0,
      0,
      true,
      'organization'
    )
    returning id into v_project_id;

    insert into public.project_members (project_id, user_id, role)
    values (v_project_id, v_owner_id, 'owner');

    insert into public.project_tags (project_id, tag)
    select v_project_id, tag
    from unnest(v_project.tags) as tag;

    with inserted_columns as (
      insert into public.columns (project_id, name, position)
      values
        (v_project_id, 'Por hacer', 0),
        (v_project_id, 'En progreso', 1),
        (v_project_id, 'En revisión', 2),
        (v_project_id, 'Hecho', 3)
      returning id, position
    )
    select array_agg(id order by position)
      into v_column_ids
    from inserted_columns;

    insert into public.column_order (project_id, column_ids)
    values (v_project_id, to_jsonb(v_column_ids));

    insert into public.sprints (
      project_id,
      name,
      goal,
      status,
      start_date,
      end_date
    )
    values (
      v_project_id,
      'Sprint actual - ' || v_project.project_key,
      'Validar tablero, backlog lateral, asignaciones, prioridades, story points y roadmap con datos ficticios.',
      'active',
      date_trunc('day', now()) - interval '1 day',
      date_trunc('day', now()) + interval '6 days'
    )
    returning id into v_active_sprint_id;

    insert into public.sprints (
      project_id,
      name,
      goal,
      status,
      start_date,
      end_date
    )
    values (
      v_project_id,
      'Sprint siguiente - ' || v_project.project_key,
      'Reservado para probar planeación futura y cierre de sprint con tareas incompletas.',
      'future',
      date_trunc('day', now()) + interval '7 days',
      date_trunc('day', now()) + interval '20 days'
    )
    returning id into v_future_sprint_id;

    v_epic_names := v_project.epic_names;
    v_task_sequence := 0;
    v_epic_sequence := 0;

    for v_epic_idx in 1..5 loop
      v_epic_sequence := v_epic_sequence + 1;
      v_start_date := current_date + ((v_epic_idx - 1) * 7);
      v_end_date := v_start_date + 20;

      insert into public.epics (
        user_id,
        project_id,
        name,
        color,
        owner_id,
        phase_id,
        estimated_effort,
        epic_id_display,
        start_date,
        end_date
      )
      values (
        v_owner_id,
        v_project_id,
        v_epic_names[v_epic_idx],
        v_epic_colors[v_epic_idx],
        v_owner_id,
        v_phase_ids[least(v_epic_idx, array_length(v_phase_ids, 1))],
        case
          when v_epic_idx in (1, 2) then 'M'
          when v_epic_idx in (3, 4) then 'L'
          else 'XL'
        end,
        v_project.project_key || '-' || v_epic_sequence::text,
        v_start_date,
        v_end_date
      )
      returning id into v_epic_id;

      for v_task_idx in 1..20 loop
        v_task_sequence := v_task_sequence + 1;

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
          v_project_id,
          v_column_ids[((v_task_idx - 1) % 4) + 1],
          v_active_sprint_id,
          v_epic_id,
          v_task_titles[v_task_idx] || ' - ' || v_epic_names[v_epic_idx],
          v_subtitles[((v_task_idx - 1) % array_length(v_subtitles, 1)) + 1],
          '<p><strong>Contexto:</strong> tarea ficticia creada para probar NexusPlanner con datos realistas.</p>' ||
          '<p><strong>Objetivo:</strong> validar el flujo de ' || lower(v_epic_names[v_epic_idx]) ||
          ' dentro del proyecto ' || v_project.title || '.</p>' ||
          '<p><strong>QA:</strong> revisar permisos, columnas, badges, avatar, filtros, ordenamiento y roadmap.</p>',
          v_task_idx,
          v_issue_type_ids[((v_task_idx - 1) % array_length(v_issue_type_ids, 1)) + 1],
          v_priority_ids[((v_task_idx - 1) % array_length(v_priority_ids, 1)) + 1],
          v_points[((v_task_idx - 1) % array_length(v_points, 1)) + 1],
          case when v_task_idx % 5 in (0, 1, 3) then v_owner_id else null end,
          v_project.project_key || '-' || v_task_sequence::text,
          false,
          v_start_date + ((v_task_idx - 1) % 10),
          v_start_date + ((v_task_idx - 1) % 10) + 3
        );
      end loop;
    end loop;

    with ordered_tasks as (
      select
        id,
        row_number() over (partition by project_id, column_id order by task_id_display) - 1 as next_position
      from public.tasks
      where project_id = v_project_id
        and column_id is not null
    )
    update public.tasks task
    set position = ordered_tasks.next_position
    from ordered_tasks
    where task.id = ordered_tasks.id;

    update public.projects
    set
      task_sequence = v_task_sequence,
      epic_sequence = v_epic_sequence,
      updated_at = now()
    where id = v_project_id;

    insert into public.activity_events (organization_id, project_id, actor_id, event_type, payload)
    values (
      v_org_id,
      v_project_id,
      v_owner_id,
      'project.seeded',
      jsonb_build_object(
        'projectKey', v_project.project_key,
        'epics', 5,
        'tasks', v_task_sequence,
        'activeSprintId', v_active_sprint_id,
        'futureSprintId', v_future_sprint_id
      )
    );
  end loop;
end;
$$;

select
  organization.name as organization,
  count(distinct project.id) as projects,
  count(distinct sprint.id) as sprints,
  count(distinct epic.id) as epics,
  count(distinct task.id) as tasks
from public.organizations organization
left join public.projects project on project.organization_id = organization.id
left join public.sprints sprint on sprint.project_id = project.id
left join public.epics epic on epic.project_id = project.id
left join public.tasks task on task.project_id = project.id
where organization.name = 'NexusPlanner QA Labs'
group by organization.name;
