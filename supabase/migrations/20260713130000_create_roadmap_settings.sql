create table if not exists public.roadmap_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null,
  child_level_issue_scheduling boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint roadmap_settings_user_project_unique unique (user_id, project_id)
);

alter table public.roadmap_settings enable row level security;

drop policy if exists "Users can read their roadmap settings" on public.roadmap_settings;
create policy "Users can read their roadmap settings"
on public.roadmap_settings
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their roadmap settings" on public.roadmap_settings;
create policy "Users can insert their roadmap settings"
on public.roadmap_settings
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their roadmap settings" on public.roadmap_settings;
create policy "Users can update their roadmap settings"
on public.roadmap_settings
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select, insert, update on public.roadmap_settings to authenticated;
