with ranked_active_sprints as (
  select
    id,
    row_number() over (
      partition by project_id
      order by updated_at desc nulls last, created_at desc nulls last, id desc
    ) as active_rank
  from public.sprints
  where status = 'active'
)
update public.sprints
set
  status = 'future',
  updated_at = now()
where id in (
  select id
  from ranked_active_sprints
  where active_rank > 1
);

create unique index if not exists sprints_one_active_per_project_idx
  on public.sprints (project_id)
  where status = 'active';
