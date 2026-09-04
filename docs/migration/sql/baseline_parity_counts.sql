with counts as (
  select
    'public_tables' as kind,
    count(*)::bigint as total
  from information_schema.tables
  where table_schema = 'public'
    and table_type = 'BASE TABLE'
  union all
  select
    'public_columns',
    count(*)::bigint
  from information_schema.columns
  where table_schema = 'public'
  union all
  select
    'public_constraints',
    count(*)::bigint
  from pg_constraint c
  join pg_class rel on rel.oid = c.conrelid
  join pg_namespace n on n.oid = rel.relnamespace
  where n.nspname = 'public'
  union all
  select
    'public_indexes',
    count(*)::bigint
  from pg_indexes
  where schemaname = 'public'
  union all
  select
    'public_policies',
    count(*)::bigint
  from pg_policies
  where schemaname = 'public'
  union all
  select
    'storage_policies',
    count(*)::bigint
  from pg_policies
  where schemaname = 'storage'
  union all
  select
    'public_triggers',
    count(*)::bigint
  from information_schema.triggers
  where event_object_schema = 'public'
  union all
  select
    'public_functions',
    count(*)::bigint
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
  union all
  select
    'public_enums',
    count(*)::bigint
  from pg_type t
  join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public'
    and t.typtype = 'e'
)
select *
from counts
order by kind;

select
  proname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and proname in (
    'create_task_command',
    'assign_task_command',
    'move_task_column_command',
    'complete_sprint_command',
    'create_organization_command',
    'create_project_command',
    'claim_command_jobs',
    'run_command_job_maintenance',
    'scan_sprint_deadlines'
  )
order by proname;
