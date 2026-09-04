select
  e.extname,
  e.extversion,
  n.nspname as schema_name
from pg_extension e
join pg_namespace n on n.oid = e.extnamespace
where e.extname in (
  'pg_cron',
  'pg_graphql',
  'pg_stat_statements',
  'pgcrypto',
  'supabase_vault',
  'uuid-ossp',
  'pg_net'
)
order by e.extname;

select
  exists(
    select 1
    from information_schema.schemata
    where schema_name = 'cron'
  ) as cron_schema_exists,
  exists(
    select 1
    from information_schema.tables
    where table_schema = 'cron'
      and table_name = 'job'
  ) as cron_job_table_exists,
  (
    select count(*)
    from cron.job
  ) as cron_jobs;

select
  count(*) as public_tables
from information_schema.tables
where table_schema = 'public'
  and table_type = 'BASE TABLE';

select
  schemaname,
  tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
order by schemaname, tablename;
