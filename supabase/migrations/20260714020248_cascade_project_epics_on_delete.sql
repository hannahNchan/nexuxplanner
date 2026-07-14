alter table public.epics
drop constraint if exists epics_project_id_fkey;

alter table public.epics
add constraint epics_project_id_fkey
foreign key (project_id)
references public.projects(id)
on delete cascade;
