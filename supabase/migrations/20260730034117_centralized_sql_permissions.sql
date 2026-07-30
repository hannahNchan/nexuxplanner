create or replace function public.current_organization_role(p_organization_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select member.role
  from public.organization_members member
  where member.organization_id = p_organization_id
    and member.user_id = (select auth.uid())
  limit 1;
$$;

create or replace function public.current_project_role(p_project_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select member.role
  from public.project_members member
  where member.project_id = p_project_id
    and member.user_id = (select auth.uid())
  limit 1;
$$;

create or replace function public.can_view_organization(p_organization_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_organization_role(p_organization_id) is not null;
$$;

create or replace function public.can_manage_organization(p_organization_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.current_organization_role(p_organization_id), '') in ('owner', 'admin');
$$;

create or replace function public.can_create_project_in_organization(p_organization_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.can_view_organization(p_organization_id);
$$;

create or replace function public.can_view_project(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.projects project
    where project.id = p_project_id
      and (
        public.current_project_role(project.id) is not null
        or (
          project.visibility = 'organization'
          and public.can_view_organization(project.organization_id)
        )
      )
  );
$$;

create or replace function public.can_mutate_project(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_project_role(p_project_id) is not null;
$$;

create or replace function public.can_manage_project(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.current_project_role(p_project_id), '') = 'owner';
$$;

create or replace function public.can_add_project_member(
  p_project_id uuid,
  p_user_id uuid
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.projects project
    where project.id = p_project_id
      and public.can_manage_project(project.id)
      and exists (
        select 1
        from public.organization_members organization_member
        where organization_member.organization_id = project.organization_id
          and organization_member.user_id = p_user_id
      )
      and not exists (
        select 1
        from public.project_members project_member
        where project_member.project_id = project.id
          and project_member.user_id = p_user_id
      )
  );
$$;

create or replace function public.can_invite_to_organization(p_organization_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.can_manage_organization(p_organization_id);
$$;

create or replace function public.can_invite_to_project(
  p_project_id uuid,
  p_user_id uuid
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.can_add_project_member(p_project_id, p_user_id);
$$;

create or replace function public.can_assign_project_user(
  p_project_id uuid,
  p_user_id uuid
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select p_user_id is null
    or exists (
      select 1
      from public.project_members member
      where member.project_id = p_project_id
        and member.user_id = p_user_id
    );
$$;

create or replace function public.is_organization_member(p_organization_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.can_view_organization(p_organization_id);
$$;

create or replace function public.is_organization_admin(p_organization_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.can_manage_organization(p_organization_id);
$$;

create or replace function public.is_project_member(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.can_mutate_project(p_project_id);
$$;

create or replace function public.is_project_owner(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.can_manage_project(p_project_id);
$$;

create or replace function public.can_edit_project(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.can_mutate_project(p_project_id);
$$;

revoke execute on function public.current_organization_role(uuid) from PUBLIC, anon;
grant execute on function public.current_organization_role(uuid) to authenticated;

revoke execute on function public.current_project_role(uuid) from PUBLIC, anon;
grant execute on function public.current_project_role(uuid) to authenticated;

revoke execute on function public.can_view_organization(uuid) from PUBLIC, anon;
grant execute on function public.can_view_organization(uuid) to authenticated;

revoke execute on function public.can_manage_organization(uuid) from PUBLIC, anon;
grant execute on function public.can_manage_organization(uuid) to authenticated;

revoke execute on function public.can_create_project_in_organization(uuid) from PUBLIC, anon;
grant execute on function public.can_create_project_in_organization(uuid) to authenticated;

revoke execute on function public.can_view_project(uuid) from PUBLIC, anon;
grant execute on function public.can_view_project(uuid) to authenticated;

revoke execute on function public.can_mutate_project(uuid) from PUBLIC, anon;
grant execute on function public.can_mutate_project(uuid) to authenticated;

revoke execute on function public.can_manage_project(uuid) from PUBLIC, anon;
grant execute on function public.can_manage_project(uuid) to authenticated;

revoke execute on function public.can_add_project_member(uuid, uuid) from PUBLIC, anon;
grant execute on function public.can_add_project_member(uuid, uuid) to authenticated;

revoke execute on function public.can_invite_to_organization(uuid) from PUBLIC, anon;
grant execute on function public.can_invite_to_organization(uuid) to authenticated;

revoke execute on function public.can_invite_to_project(uuid, uuid) from PUBLIC, anon;
grant execute on function public.can_invite_to_project(uuid, uuid) to authenticated;

revoke execute on function public.can_assign_project_user(uuid, uuid) from PUBLIC, anon;
grant execute on function public.can_assign_project_user(uuid, uuid) to authenticated;

revoke execute on function public.is_organization_member(uuid) from PUBLIC, anon;
grant execute on function public.is_organization_member(uuid) to authenticated;

revoke execute on function public.is_organization_admin(uuid) from PUBLIC, anon;
grant execute on function public.is_organization_admin(uuid) to authenticated;

revoke execute on function public.is_project_member(uuid) from PUBLIC, anon;
grant execute on function public.is_project_member(uuid) to authenticated;

revoke execute on function public.is_project_owner(uuid) from PUBLIC, anon;
grant execute on function public.is_project_owner(uuid) to authenticated;

revoke execute on function public.can_edit_project(uuid) from PUBLIC, anon;
grant execute on function public.can_edit_project(uuid) to authenticated;
