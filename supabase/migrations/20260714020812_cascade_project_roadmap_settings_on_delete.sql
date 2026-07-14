delete from public.roadmap_settings
where not exists (
  select 1
  from public.projects
  where projects.id = roadmap_settings.project_id
);

alter table public.roadmap_settings
drop constraint if exists roadmap_settings_project_id_fkey;

alter table public.roadmap_settings
add constraint roadmap_settings_project_id_fkey
foreign key (project_id)
references public.projects(id)
on delete cascade;
