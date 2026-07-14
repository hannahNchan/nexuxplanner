alter table public.editor_notes
add column if not exists project_id uuid references public.projects(id) on delete cascade;

alter table public.editor_notes
alter column board_id drop not null;

drop policy if exists "Users can view project notes" on public.editor_notes;
create policy "Users can view project notes"
on public.editor_notes
for select
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = editor_notes.project_id
      and projects.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can create project notes" on public.editor_notes;
create policy "Users can create project notes"
on public.editor_notes
for insert
to authenticated
with check (
  exists (
    select 1
    from public.projects
    where projects.id = editor_notes.project_id
      and projects.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can update project notes" on public.editor_notes;
create policy "Users can update project notes"
on public.editor_notes
for update
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = editor_notes.project_id
      and projects.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.projects
    where projects.id = editor_notes.project_id
      and projects.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can delete project notes" on public.editor_notes;
create policy "Users can delete project notes"
on public.editor_notes
for delete
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = editor_notes.project_id
      and projects.user_id = (select auth.uid())
  )
);
