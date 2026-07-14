delete from public.epic_tasks et
using public.epics e, public.tasks t
where e.id = et.epic_id
  and t.id = et.task_id
  and e.project_id is distinct from t.project_id;

update public.tasks t
set epic_id = null,
    updated_at = now()
from public.epics e
where e.id = t.epic_id
  and e.project_id is distinct from t.project_id;

delete from public.epic_dependencies ed
using public.epics dependent_epic, public.epics source_epic
where dependent_epic.id = ed.epic_id
  and source_epic.id = ed.depends_on_epic_id
  and dependent_epic.project_id is distinct from source_epic.project_id;

delete from public.task_dependencies td
using public.tasks dependent_task, public.tasks source_task
where dependent_task.id = td.task_id
  and source_task.id = td.depends_on_task_id
  and dependent_task.project_id is distinct from source_task.project_id;

create or replace function public.ensure_epic_task_same_project()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  epic_project_id uuid;
  task_project_id uuid;
begin
  select project_id into epic_project_id
  from public.epics
  where id = new.epic_id;

  select project_id into task_project_id
  from public.tasks
  where id = new.task_id;

  if epic_project_id is null or task_project_id is null or epic_project_id is distinct from task_project_id then
    raise exception 'Epic and task must belong to the same project.';
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_epic_task_same_project_before_write on public.epic_tasks;
create trigger ensure_epic_task_same_project_before_write
before insert or update of epic_id, task_id on public.epic_tasks
for each row execute function public.ensure_epic_task_same_project();

create or replace function public.ensure_task_epic_same_project()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  epic_project_id uuid;
begin
  if new.epic_id is null then
    return new;
  end if;

  select project_id into epic_project_id
  from public.epics
  where id = new.epic_id;

  if epic_project_id is null or new.project_id is null or epic_project_id is distinct from new.project_id then
    raise exception 'Task epic must belong to the same project as the task.';
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_task_epic_same_project_before_write on public.tasks;
create trigger ensure_task_epic_same_project_before_write
before insert or update of project_id, epic_id on public.tasks
for each row execute function public.ensure_task_epic_same_project();

create or replace function public.ensure_epic_dependency_same_project()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  dependent_project_id uuid;
  source_project_id uuid;
begin
  select project_id into dependent_project_id
  from public.epics
  where id = new.epic_id;

  select project_id into source_project_id
  from public.epics
  where id = new.depends_on_epic_id;

  if dependent_project_id is null or source_project_id is null or dependent_project_id is distinct from source_project_id then
    raise exception 'Epic dependencies must stay within a single project.';
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_epic_dependency_same_project_before_write on public.epic_dependencies;
create trigger ensure_epic_dependency_same_project_before_write
before insert or update of epic_id, depends_on_epic_id on public.epic_dependencies
for each row execute function public.ensure_epic_dependency_same_project();

create or replace function public.ensure_task_dependency_same_project()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  dependent_project_id uuid;
  source_project_id uuid;
begin
  select project_id into dependent_project_id
  from public.tasks
  where id = new.task_id;

  select project_id into source_project_id
  from public.tasks
  where id = new.depends_on_task_id;

  if dependent_project_id is null or source_project_id is null or dependent_project_id is distinct from source_project_id then
    raise exception 'Task dependencies must stay within a single project.';
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_task_dependency_same_project_before_write on public.task_dependencies;
create trigger ensure_task_dependency_same_project_before_write
before insert or update of task_id, depends_on_task_id on public.task_dependencies
for each row execute function public.ensure_task_dependency_same_project();
