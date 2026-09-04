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
      'title', v_task.title,
      'subtitle', v_task.subtitle,
      'column_id', v_task.column_id,
      'sprint_id', v_task.sprint_id,
      'issue_type_id', v_task.issue_type_id,
      'priority_id', v_task.priority_id,
      'story_points', v_task.story_points,
      'assignee_id', v_task.assignee_id,
      'epic_id', v_task.epic_id,
      'is_unassigned', v_task.assignee_id is null,
      'in_backlog', v_task.in_backlog
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
