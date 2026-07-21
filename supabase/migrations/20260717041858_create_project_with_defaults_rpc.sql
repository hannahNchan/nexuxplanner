create unique index if not exists projects_project_key_upper_unique
on public.projects (upper(project_key));

create or replace function public.create_project_with_defaults(
  p_title text,
  p_description text,
  p_project_key text,
  p_tags text[] default array[]::text[]
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_project public.projects%rowtype;
  v_column_ids uuid[];
  v_normalized_key text := upper(trim(coalesce(p_project_key, '')));
  v_tags text[];
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión para crear un proyecto.';
  end if;

  if trim(coalesce(p_title, '')) = '' then
    raise exception 'El nombre del proyecto es obligatorio.';
  end if;

  if v_normalized_key = '' then
    raise exception 'Las siglas del proyecto son obligatorias.';
  end if;

  if v_normalized_key !~ '^[A-Z0-9]{2,10}$' then
    raise exception 'Las siglas deben tener entre 2 y 10 caracteres (solo mayúsculas y números).';
  end if;

  if exists (
    select 1
    from public.projects
    where upper(project_key) = v_normalized_key
  ) then
    raise exception 'Las siglas "%" ya están en uso por otro proyecto.', v_normalized_key
      using errcode = '23505';
  end if;

  select coalesce(array_agg(distinct normalized_tag order by normalized_tag), array[]::text[])
  into v_tags
  from (
    select trim(tag_value) as normalized_tag
    from unnest(coalesce(p_tags, array[]::text[])) as tags(tag_value)
    where trim(tag_value) <> ''
  ) normalized_tags;

  insert into public.projects (
    user_id,
    title,
    description,
    project_key,
    task_sequence,
    epic_sequence
  )
  values (
    v_user_id,
    trim(p_title),
    nullif(trim(coalesce(p_description, '')), ''),
    v_normalized_key,
    0,
    0
  )
  returning * into v_project;

  insert into public.project_members (
    project_id,
    user_id,
    role
  )
  values (
    v_project.id,
    v_user_id,
    'owner'
  );

  if array_length(v_tags, 1) > 0 then
    insert into public.project_tags (
      project_id,
      tag
    )
    select v_project.id, tag
    from unnest(v_tags) as tags(tag);
  end if;

  with inserted_columns as (
    insert into public.columns (
      project_id,
      name,
      position
    )
    values
      (v_project.id, 'Por hacer', 0),
      (v_project.id, 'En progreso', 1),
      (v_project.id, 'En revisión', 2),
      (v_project.id, 'Hecho', 3)
    returning id, position
  )
  select array_agg(id order by position)
  into v_column_ids
  from inserted_columns;

  if coalesce(array_length(v_column_ids, 1), 0) <> 4 then
    raise exception 'No se pudieron crear las columnas iniciales del proyecto.';
  end if;

  insert into public.column_order (
    project_id,
    column_ids
  )
  values (
    v_project.id,
    to_jsonb(v_column_ids)
  )
  on conflict (project_id) do update
  set column_ids = excluded.column_ids;

  return to_jsonb(v_project) || jsonb_build_object('tags', to_jsonb(v_tags));
end;
$$;

revoke all on function public.create_project_with_defaults(text, text, text, text[]) from public;
grant execute on function public.create_project_with_defaults(text, text, text, text[]) to authenticated;
