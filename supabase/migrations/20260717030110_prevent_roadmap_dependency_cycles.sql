create or replace function public.ensure_epic_dependency_acyclic()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (
    with recursive dependency_path as (
      select
        ed.epic_id as current_epic_id,
        array[ed.depends_on_epic_id, ed.epic_id] as visited_epic_ids
      from public.epic_dependencies ed
      where ed.depends_on_epic_id = new.epic_id
        and ed.id is distinct from new.id

      union all

      select
        ed.epic_id,
        dependency_path.visited_epic_ids || ed.epic_id
      from dependency_path
      join public.epic_dependencies ed
        on ed.depends_on_epic_id = dependency_path.current_epic_id
      where ed.id is distinct from new.id
        and not ed.epic_id = any(dependency_path.visited_epic_ids)
    )
    select 1
    from dependency_path
    where current_epic_id = new.depends_on_epic_id
  ) then
    raise exception 'This epic dependency would create a cycle.';
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_epic_dependency_acyclic_before_write on public.epic_dependencies;
create trigger ensure_epic_dependency_acyclic_before_write
before insert or update of epic_id, depends_on_epic_id on public.epic_dependencies
for each row execute function public.ensure_epic_dependency_acyclic();

create or replace function public.ensure_task_dependency_acyclic()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (
    with recursive dependency_path as (
      select
        td.task_id as current_task_id,
        array[td.depends_on_task_id, td.task_id] as visited_task_ids
      from public.task_dependencies td
      where td.depends_on_task_id = new.task_id
        and td.id is distinct from new.id

      union all

      select
        td.task_id,
        dependency_path.visited_task_ids || td.task_id
      from dependency_path
      join public.task_dependencies td
        on td.depends_on_task_id = dependency_path.current_task_id
      where td.id is distinct from new.id
        and not td.task_id = any(dependency_path.visited_task_ids)
    )
    select 1
    from dependency_path
    where current_task_id = new.depends_on_task_id
  ) then
    raise exception 'This task dependency would create a cycle.';
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_task_dependency_acyclic_before_write on public.task_dependencies;
create trigger ensure_task_dependency_acyclic_before_write
before insert or update of task_id, depends_on_task_id on public.task_dependencies
for each row execute function public.ensure_task_dependency_acyclic();
