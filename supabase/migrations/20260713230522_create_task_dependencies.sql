create table if not exists public.task_dependencies (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  depends_on_task_id uuid not null references public.tasks(id) on delete cascade,
  dependency_type text not null default 'finish-to-start',
  lag_days integer not null default 0,
  created_at timestamptz not null default now(),
  constraint task_dependencies_no_self_reference check (task_id <> depends_on_task_id),
  constraint task_dependencies_type_check check (
    dependency_type in ('finish-to-start', 'start-to-start', 'finish-to-finish', 'start-to-finish')
  ),
  constraint task_dependencies_unique unique (task_id, depends_on_task_id)
);

alter table public.task_dependencies enable row level security;

drop policy if exists "Users can read task dependencies" on public.task_dependencies;
create policy "Users can read task dependencies"
on public.task_dependencies
for select
to authenticated
using (
  exists (
    select 1
    from public.tasks dependent_task
    left join public.projects direct_project
      on direct_project.id = dependent_task.project_id
    left join public.columns dependent_column
      on dependent_column.id = dependent_task.column_id
    left join public.projects column_project
      on column_project.id = dependent_column.project_id
    where dependent_task.id = task_dependencies.task_id
      and (direct_project.user_id = (select auth.uid()) or column_project.user_id = (select auth.uid()))
  )
  and exists (
    select 1
    from public.tasks source_task
    left join public.projects direct_project
      on direct_project.id = source_task.project_id
    left join public.columns source_column
      on source_column.id = source_task.column_id
    left join public.projects column_project
      on column_project.id = source_column.project_id
    where source_task.id = task_dependencies.depends_on_task_id
      and (direct_project.user_id = (select auth.uid()) or column_project.user_id = (select auth.uid()))
  )
);

drop policy if exists "Users can insert task dependencies" on public.task_dependencies;
create policy "Users can insert task dependencies"
on public.task_dependencies
for insert
to authenticated
with check (
  exists (
    select 1
    from public.tasks dependent_task
    left join public.projects direct_project
      on direct_project.id = dependent_task.project_id
    left join public.columns dependent_column
      on dependent_column.id = dependent_task.column_id
    left join public.projects column_project
      on column_project.id = dependent_column.project_id
    where dependent_task.id = task_dependencies.task_id
      and (direct_project.user_id = (select auth.uid()) or column_project.user_id = (select auth.uid()))
  )
  and exists (
    select 1
    from public.tasks source_task
    left join public.projects direct_project
      on direct_project.id = source_task.project_id
    left join public.columns source_column
      on source_column.id = source_task.column_id
    left join public.projects column_project
      on column_project.id = source_column.project_id
    where source_task.id = task_dependencies.depends_on_task_id
      and (direct_project.user_id = (select auth.uid()) or column_project.user_id = (select auth.uid()))
  )
);

drop policy if exists "Users can delete task dependencies" on public.task_dependencies;
create policy "Users can delete task dependencies"
on public.task_dependencies
for delete
to authenticated
using (
  exists (
    select 1
    from public.tasks dependent_task
    left join public.projects direct_project
      on direct_project.id = dependent_task.project_id
    left join public.columns dependent_column
      on dependent_column.id = dependent_task.column_id
    left join public.projects column_project
      on column_project.id = dependent_column.project_id
    where dependent_task.id = task_dependencies.task_id
      and (direct_project.user_id = (select auth.uid()) or column_project.user_id = (select auth.uid()))
  )
);

grant select, insert, delete on public.task_dependencies to authenticated;
