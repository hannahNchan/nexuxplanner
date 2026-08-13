with checks as (
  select
    'organization_members_without_organization' as check_name,
    count(*)::bigint as failures
  from public.organization_members child
  left join public.organizations parent on parent.id = child.organization_id
  where parent.id is null

  union all
  select
    'projects_without_organization',
    count(*)::bigint
  from public.projects child
  left join public.organizations parent on parent.id = child.organization_id
  where child.organization_id is not null
    and parent.id is null

  union all
  select
    'project_members_without_project',
    count(*)::bigint
  from public.project_members child
  left join public.projects parent on parent.id = child.project_id
  where parent.id is null

  union all
  select
    'columns_without_project',
    count(*)::bigint
  from public.columns child
  left join public.projects parent on parent.id = child.project_id
  where parent.id is null

  union all
  select
    'sprints_without_project',
    count(*)::bigint
  from public.sprints child
  left join public.projects parent on parent.id = child.project_id
  where parent.id is null

  union all
  select
    'epics_without_project',
    count(*)::bigint
  from public.epics child
  left join public.projects parent on parent.id = child.project_id
  where parent.id is null

  union all
  select
    'tasks_without_project',
    count(*)::bigint
  from public.tasks child
  left join public.projects parent on parent.id = child.project_id
  where parent.id is null

  union all
  select
    'tasks_with_missing_column',
    count(*)::bigint
  from public.tasks child
  left join public.columns parent on parent.id = child.column_id
  where child.column_id is not null
    and parent.id is null

  union all
  select
    'tasks_with_missing_sprint',
    count(*)::bigint
  from public.tasks child
  left join public.sprints parent on parent.id = child.sprint_id
  where child.sprint_id is not null
    and parent.id is null

  union all
  select
    'tasks_with_missing_epic',
    count(*)::bigint
  from public.tasks child
  left join public.epics parent on parent.id = child.epic_id
  where child.epic_id is not null
    and parent.id is null

  union all
  select
    'task_dependencies_with_missing_task',
    count(*)::bigint
  from public.task_dependencies child
  left join public.tasks task on task.id = child.task_id
  left join public.tasks dependency on dependency.id = child.depends_on_task_id
  where task.id is null
    or dependency.id is null

  union all
  select
    'epic_dependencies_with_missing_epic',
    count(*)::bigint
  from public.epic_dependencies child
  left join public.epics epic on epic.id = child.epic_id
  left join public.epics dependency on dependency.id = child.depends_on_epic_id
  where epic.id is null
    or dependency.id is null

  union all
  select
    'activity_events_with_missing_project',
    count(*)::bigint
  from public.activity_events child
  left join public.projects parent on parent.id = child.project_id
  where child.project_id is not null
    and parent.id is null

  union all
  select
    'notifications_with_missing_task',
    count(*)::bigint
  from public.user_notifications child
  left join public.tasks parent on parent.id = child.task_id
  where child.task_id is not null
    and parent.id is null

  union all
  select
    'automation_runs_with_missing_rule',
    count(*)::bigint
  from public.automation_runs child
  left join public.automation_rules parent on parent.id = child.rule_id
  where parent.id is null
)
select *
from checks
order by check_name;

select
  project_id,
  count(*) as active_sprints
from public.sprints
where status = 'active'
group by project_id
having count(*) > 1
order by active_sprints desc, project_id;

select
  task.project_id as task_project_id,
  epic.project_id as epic_project_id,
  count(*) as cross_project_task_epic_links
from public.tasks task
join public.epics epic on epic.id = task.epic_id
where task.project_id <> epic.project_id
group by task.project_id, epic.project_id;
