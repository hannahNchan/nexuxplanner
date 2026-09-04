create extension if not exists pg_cron with schema pg_catalog;

alter table public.user_notifications
  drop constraint if exists user_notifications_type_check;

alter table public.user_notifications
  add constraint user_notifications_type_check
  check (
    type in (
      'task_assigned',
      'project_member_added',
      'organization_member_added',
      'sprint_completed',
      'sprint_due_soon',
      'sprint_overdue'
    )
  );

create or replace function public.run_command_job_maintenance(
  p_stale_timeout_seconds integer default 300
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reset_count integer := 0;
begin
  v_reset_count := public.reset_stale_command_jobs(
    greatest(coalesce(p_stale_timeout_seconds, 300), 60)
  );

  return jsonb_build_object(
    'reset_stale_jobs', v_reset_count,
    'ran_at', now()
  );
end;
$$;

revoke all on function public.run_command_job_maintenance(integer) from public;
revoke all on function public.run_command_job_maintenance(integer) from anon;
revoke all on function public.run_command_job_maintenance(integer) from authenticated;

create or replace function public.scan_sprint_deadlines(
  p_today date default current_date
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_due_soon_count integer := 0;
  v_overdue_count integer := 0;
  v_sprint record;
  v_member record;
begin
  for v_sprint in
    select
      sprint.id,
      sprint.project_id,
      sprint.name,
      sprint.end_date,
      project.organization_id,
      project.title as project_title
    from public.sprints sprint
    join public.projects project on project.id = sprint.project_id
    where sprint.status = 'active'
      and sprint.end_date is not null
      and sprint.end_date::date = p_today + 1
  loop
    for v_member in
      select project_member.user_id
      from public.project_members project_member
      where project_member.project_id = v_sprint.project_id
    loop
      perform public.create_user_notification(
        v_member.user_id,
        'sprint_due_soon',
        'Sprint por vencer',
        'El sprint ' || coalesce(v_sprint.name, 'sin nombre') || ' termina mañana.',
        null,
        v_sprint.organization_id,
        v_sprint.project_id,
        null,
        jsonb_build_object(
          'projectId', v_sprint.project_id,
          'projectTitle', v_sprint.project_title,
          'sprintId', v_sprint.id,
          'sprintName', v_sprint.name,
          'endDate', v_sprint.end_date
        ),
        'sprint_due_soon:' || v_sprint.id::text || ':' || v_member.user_id::text,
        false
      );

      v_due_soon_count := v_due_soon_count + 1;
    end loop;
  end loop;

  for v_sprint in
    select
      sprint.id,
      sprint.project_id,
      sprint.name,
      sprint.end_date,
      project.organization_id,
      project.title as project_title
    from public.sprints sprint
    join public.projects project on project.id = sprint.project_id
    where sprint.status = 'active'
      and sprint.end_date is not null
      and sprint.end_date::date < p_today
  loop
    for v_member in
      select project_member.user_id
      from public.project_members project_member
      where project_member.project_id = v_sprint.project_id
    loop
      perform public.create_user_notification(
        v_member.user_id,
        'sprint_overdue',
        'Sprint vencido',
        'El sprint ' || coalesce(v_sprint.name, 'sin nombre') || ' ya venció y requiere cierre.',
        null,
        v_sprint.organization_id,
        v_sprint.project_id,
        null,
        jsonb_build_object(
          'projectId', v_sprint.project_id,
          'projectTitle', v_sprint.project_title,
          'sprintId', v_sprint.id,
          'sprintName', v_sprint.name,
          'endDate', v_sprint.end_date,
          'daysOverdue', p_today - v_sprint.end_date::date
        ),
        'sprint_overdue:' || v_sprint.id::text || ':' || v_member.user_id::text || ':' || p_today::text,
        false
      );

      v_overdue_count := v_overdue_count + 1;
    end loop;
  end loop;

  return jsonb_build_object(
    'due_soon_notifications_attempted', v_due_soon_count,
    'overdue_notifications_attempted', v_overdue_count,
    'ran_for_date', p_today,
    'ran_at', now()
  );
end;
$$;

revoke all on function public.scan_sprint_deadlines(date) from public;
revoke all on function public.scan_sprint_deadlines(date) from anon;
revoke all on function public.scan_sprint_deadlines(date) from authenticated;

do $$
begin
  if exists (
    select 1
    from cron.job
    where jobname = 'nexusplanner-command-job-maintenance'
  ) then
    perform cron.unschedule('nexusplanner-command-job-maintenance');
  end if;

  if exists (
    select 1
    from cron.job
    where jobname = 'nexusplanner-sprint-deadline-scan'
  ) then
    perform cron.unschedule('nexusplanner-sprint-deadline-scan');
  end if;
end;
$$;

select cron.schedule(
  'nexusplanner-command-job-maintenance',
  '*/5 * * * *',
  $$select public.run_command_job_maintenance(300);$$
);

select cron.schedule(
  'nexusplanner-sprint-deadline-scan',
  '15 8 * * *',
  $$select public.scan_sprint_deadlines(current_date);$$
);
