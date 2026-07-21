with canonical_epic_links as (
  select distinct on (et.task_id)
    et.task_id,
    et.epic_id
  from public.epic_tasks et
  join public.tasks t on t.id = et.task_id
  join public.epics e on e.id = et.epic_id
  where t.epic_id is null
    and t.project_id is not null
    and e.project_id = t.project_id
  order by et.task_id, et.created_at desc, et.id desc
)
update public.tasks t
set epic_id = canonical_epic_links.epic_id,
    updated_at = now()
from canonical_epic_links
where t.id = canonical_epic_links.task_id
  and t.epic_id is null;

drop trigger if exists ensure_epic_task_same_project_before_write on public.epic_tasks;
drop table if exists public.epic_tasks;
drop function if exists public.ensure_epic_task_same_project();
