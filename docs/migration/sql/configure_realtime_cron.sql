do $$
declare
  realtime_tables text[] := array[
    'activity_events',
    'automation_rules',
    'automation_runs',
    'organization_invitations',
    'project_invitations',
    'tasks',
    'user_notifications'
  ];
  realtime_table text;
begin
  foreach realtime_table in array realtime_tables loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = realtime_table
    ) then
      execute format('alter publication supabase_realtime add table public.%I', realtime_table);
    end if;
  end loop;
end $$;

select cron.schedule(
  'nexusplanner-command-job-maintenance',
  '*/5 * * * *',
  'select public.run_command_job_maintenance(300);'
)
where not exists (
  select 1
  from cron.job
  where jobname = 'nexusplanner-command-job-maintenance'
);

select cron.schedule(
  'nexusplanner-sprint-deadline-scan',
  '15 8 * * *',
  'select public.scan_sprint_deadlines(current_date);'
)
where not exists (
  select 1
  from cron.job
  where jobname = 'nexusplanner-sprint-deadline-scan'
);

select pubname, schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
order by schemaname, tablename;

select jobid, jobname, schedule, command, active
from cron.job
where jobname in (
  'nexusplanner-command-job-maintenance',
  'nexusplanner-sprint-deadline-scan'
)
order by jobname;
