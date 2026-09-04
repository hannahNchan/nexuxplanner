create or replace function public.move_task_column_command(
  p_project_id uuid,
  p_task_id uuid,
  p_column_id uuid,
  p_position integer default null
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
  v_previous_column_id uuid;
  v_next_position integer;
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión para mover tareas.';
  end if;

  if p_project_id is null or not public.can_mutate_project(p_project_id) then
    raise exception 'No tienes permisos para mover tareas en este proyecto.';
  end if;

  if p_task_id is null then
    raise exception 'La tarea es requerida.';
  end if;

  if p_column_id is null then
    raise exception 'La columna destino es requerida.';
  end if;

  select *
    into v_project
  from public.projects
  where id = p_project_id;

  if v_project.id is null then
    raise exception 'El proyecto no existe.';
  end if;

  if not exists (
    select 1
    from public.columns column_record
    where column_record.id = p_column_id
      and column_record.project_id = p_project_id
  ) then
    raise exception 'La columna no pertenece al proyecto activo.';
  end if;

  select *
    into v_task
  from public.tasks
  where id = p_task_id
    and project_id = p_project_id
  for update;

  if not found then
    raise exception 'La tarea no pertenece al proyecto activo.';
  end if;

  v_previous_column_id := v_task.column_id;

  if p_position is null then
    select coalesce(max(position), -1) + 1
      into v_next_position
    from public.tasks
    where project_id = p_project_id
      and column_id = p_column_id
      and sprint_id is not distinct from v_task.sprint_id
      and id <> p_task_id;
  else
    v_next_position := greatest(p_position, 0);
  end if;

  update public.tasks
  set
    column_id = p_column_id,
    position = v_next_position,
    in_backlog = false,
    updated_at = now()
  where id = p_task_id
    and project_id = p_project_id
  returning * into v_task;

  if p_column_id is distinct from v_previous_column_id then
    perform public.record_activity_event(
      'task.moved',
      v_project.organization_id,
      p_project_id,
      v_task.sprint_id,
      v_task.id,
      v_user_id,
      jsonb_build_object(
        'previous_column_id', v_previous_column_id,
        'column_id', p_column_id,
        'task_id_display', v_task.task_id_display
      ),
      'task-moved:' || v_task.id || ':' || extract(epoch from v_task.updated_at)::text
    );
  end if;

  return v_task;
end;
$$;

revoke all on function public.move_task_column_command(uuid, uuid, uuid, integer) from public;
revoke execute on function public.move_task_column_command(uuid, uuid, uuid, integer) from PUBLIC, anon;
grant execute on function public.move_task_column_command(uuid, uuid, uuid, integer) to authenticated;
