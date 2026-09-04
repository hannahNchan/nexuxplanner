create table if not exists public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  description text null,
  enabled boolean not null default true,
  trigger_event text not null,
  conditions jsonb not null default '[]'::jsonb,
  actions jsonb not null default '[]'::jsonb,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_run_at timestamptz null,
  constraint automation_rules_name_not_empty check (btrim(name) <> ''),
  constraint automation_rules_trigger_event_not_empty check (btrim(trigger_event) <> ''),
  constraint automation_rules_conditions_array check (jsonb_typeof(conditions) = 'array'),
  constraint automation_rules_actions_array check (jsonb_typeof(actions) = 'array')
);

create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.automation_rules(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  activity_event_id uuid null references public.activity_events(id) on delete set null,
  status text not null default 'pending',
  event_type text not null,
  actions_attempted integer not null default 0,
  actions_succeeded integer not null default 0,
  actions_failed integer not null default 0,
  result jsonb not null default '{}'::jsonb,
  error_message text null,
  created_at timestamptz not null default now(),
  completed_at timestamptz null,
  constraint automation_runs_status_check check (status in ('pending', 'succeeded', 'failed', 'partial'))
);

create index if not exists automation_rules_project_enabled_idx
  on public.automation_rules(project_id, enabled, trigger_event);

create index if not exists automation_rules_organization_idx
  on public.automation_rules(organization_id, created_at desc);

create index if not exists automation_runs_rule_created_idx
  on public.automation_runs(rule_id, created_at desc);

create index if not exists automation_runs_project_created_idx
  on public.automation_runs(project_id, created_at desc);

alter table public.automation_rules enable row level security;
alter table public.automation_runs enable row level security;

drop policy if exists "Users can view accessible automation rules" on public.automation_rules;
create policy "Users can view accessible automation rules"
  on public.automation_rules
  for select
  to authenticated
  using (public.can_view_project(project_id));

drop policy if exists "Project owners can create automation rules" on public.automation_rules;
create policy "Project owners can create automation rules"
  on public.automation_rules
  for insert
  to authenticated
  with check (
    public.can_manage_project(project_id)
    and exists (
      select 1
      from public.projects project
      where project.id = project_id
        and project.organization_id = organization_id
    )
  );

drop policy if exists "Project owners can update automation rules" on public.automation_rules;
create policy "Project owners can update automation rules"
  on public.automation_rules
  for update
  to authenticated
  using (public.can_manage_project(project_id))
  with check (
    public.can_manage_project(project_id)
    and exists (
      select 1
      from public.projects project
      where project.id = project_id
        and project.organization_id = organization_id
    )
  );

drop policy if exists "Project owners can delete automation rules" on public.automation_rules;
create policy "Project owners can delete automation rules"
  on public.automation_rules
  for delete
  to authenticated
  using (public.can_manage_project(project_id));

drop policy if exists "Users can view accessible automation runs" on public.automation_runs;
create policy "Users can view accessible automation runs"
  on public.automation_runs
  for select
  to authenticated
  using (public.can_view_project(project_id));

grant select, insert, update, delete on public.automation_rules to authenticated;
grant select on public.automation_runs to authenticated;

create or replace function public.touch_automation_rule_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  if new.created_by is null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists touch_automation_rule_updated_at_before_write on public.automation_rules;
create trigger touch_automation_rule_updated_at_before_write
  before insert or update on public.automation_rules
  for each row
  execute function public.touch_automation_rule_updated_at();

create or replace function public.automation_event_value(
  p_event public.activity_events,
  p_field text
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
stable
as $$
declare
  v_field text := trim(coalesce(p_field, ''));
begin
  if v_field = 'event_type' then
    return p_event.event_type;
  elsif v_field = 'project_id' then
    return p_event.project_id::text;
  elsif v_field = 'organization_id' then
    return p_event.organization_id::text;
  elsif v_field = 'task_id' then
    return p_event.task_id::text;
  elsif v_field = 'sprint_id' then
    return p_event.sprint_id::text;
  elsif v_field = 'actor_id' then
    return p_event.actor_id::text;
  elsif v_field = 'payload' then
    return p_event.payload::text;
  elsif v_field <> '' then
    return p_event.payload #>> string_to_array(v_field, '.');
  end if;

  return null;
end;
$$;

create or replace function public.automation_condition_matches(
  p_condition jsonb,
  p_event public.activity_events
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
stable
as $$
declare
  v_field text := coalesce(p_condition->>'field', '');
  v_operator text := lower(coalesce(p_condition->>'operator', 'equals'));
  v_expected text := coalesce(p_condition->>'value', '');
  v_actual text := public.automation_event_value(p_event, v_field);
begin
  if coalesce(p_condition->>'type', 'field') = 'always' then
    return true;
  end if;

  if v_operator in ('equals', 'eq') then
    return coalesce(v_actual, '') = v_expected;
  elsif v_operator in ('not_equals', 'neq') then
    return coalesce(v_actual, '') <> v_expected;
  elsif v_operator = 'contains' then
    return position(lower(v_expected) in lower(coalesce(v_actual, ''))) > 0;
  elsif v_operator = 'not_empty' then
    return nullif(trim(coalesce(v_actual, '')), '') is not null;
  elsif v_operator = 'empty' then
    return nullif(trim(coalesce(v_actual, '')), '') is null;
  end if;

  return false;
end;
$$;

create or replace function public.automation_rule_matches_event(
  p_rule public.automation_rules,
  p_event public.activity_events
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
stable
as $$
declare
  v_condition jsonb;
begin
  if p_rule.enabled is not true then
    return false;
  end if;

  if p_rule.project_id <> p_event.project_id then
    return false;
  end if;

  if p_rule.trigger_event <> p_event.event_type then
    return false;
  end if;

  for v_condition in
    select value
    from jsonb_array_elements(coalesce(p_rule.conditions, '[]'::jsonb))
  loop
    if not public.automation_condition_matches(v_condition, p_event) then
      return false;
    end if;
  end loop;

  return true;
end;
$$;

create or replace function public.execute_automation_action(
  p_rule public.automation_rules,
  p_event public.activity_events,
  p_run_id uuid,
  p_action jsonb,
  p_action_index integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_type text := lower(coalesce(p_action->>'type', ''));
  v_title text := coalesce(nullif(trim(p_action->>'title'), ''), 'Automatización ejecutada');
  v_message text := coalesce(
    nullif(trim(p_action->>'message'), ''),
    'La regla "' || p_rule.name || '" se ejecutó para el evento ' || p_event.event_type || '.'
  );
  v_member record;
  v_created_count integer := 0;
  v_job_type text;
begin
  if v_type = 'notify_project_owners' then
    for v_member in
      select user_id
      from public.project_members
      where project_id = p_rule.project_id
        and role = 'owner'
    loop
      perform public.create_user_notification(
        v_member.user_id,
        'automation_rule',
        v_title,
        v_message,
        p_event.actor_id,
        p_event.organization_id,
        p_event.project_id,
        p_event.task_id,
        jsonb_build_object(
          'automationRuleId', p_rule.id,
          'automationRunId', p_run_id,
          'activityEventId', p_event.id,
          'eventType', p_event.event_type,
          'action', p_action
        ),
        'automation_rule:' || p_run_id::text || ':' || p_action_index::text || ':' || v_member.user_id::text,
        false
      );
      v_created_count := v_created_count + 1;
    end loop;

    return jsonb_build_object('type', v_type, 'notifications_created', v_created_count);
  elsif v_type = 'notify_actor' then
    if p_event.actor_id is null then
      return jsonb_build_object('type', v_type, 'notifications_created', 0, 'skipped', 'event_without_actor');
    end if;

    perform public.create_user_notification(
      p_event.actor_id,
      'automation_rule',
      v_title,
      v_message,
      p_event.actor_id,
      p_event.organization_id,
      p_event.project_id,
      p_event.task_id,
      jsonb_build_object(
        'automationRuleId', p_rule.id,
        'automationRunId', p_run_id,
        'activityEventId', p_event.id,
        'eventType', p_event.event_type,
        'action', p_action
      ),
      'automation_rule:' || p_run_id::text || ':' || p_action_index::text || ':' || p_event.actor_id::text,
      false
    );

    return jsonb_build_object('type', v_type, 'notifications_created', 1);
  elsif v_type in ('enqueue_email', 'enqueue_webhook') then
    v_job_type := case
      when v_type = 'enqueue_email' then 'automation.email'
      else 'automation.webhook'
    end;

    perform public.enqueue_command_job(
      v_job_type,
      'queued',
      jsonb_build_object(
        'job_key', v_job_type || ':' || p_run_id::text || ':' || p_action_index::text,
        'automationRuleId', p_rule.id,
        'automationRunId', p_run_id,
        'activityEventId', p_event.id,
        'eventType', p_event.event_type,
        'projectId', p_event.project_id,
        'organizationId', p_event.organization_id,
        'action', p_action
      ),
      0
    );

    return jsonb_build_object('type', v_type, 'job_type', v_job_type, 'queued', true);
  end if;

  raise exception 'Unsupported automation action type: %', v_type;
end;
$$;

create or replace function public.evaluate_automation_rules_for_activity_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rule public.automation_rules%rowtype;
  v_action jsonb;
  v_action_index integer;
  v_actions_attempted integer;
  v_actions_succeeded integer;
  v_actions_failed integer;
  v_result jsonb;
  v_action_result jsonb;
  v_run_id uuid;
  v_error_message text;
begin
  if new.project_id is null then
    return new;
  end if;

  for v_rule in
    select *
    from public.automation_rules rule
    where rule.project_id = new.project_id
      and rule.enabled is true
      and rule.trigger_event = new.event_type
  loop
    if not public.automation_rule_matches_event(v_rule, new) then
      continue;
    end if;

    insert into public.automation_runs (
      rule_id,
      organization_id,
      project_id,
      activity_event_id,
      status,
      event_type,
      result
    )
    values (
      v_rule.id,
      new.organization_id,
      new.project_id,
      new.id,
      'pending',
      new.event_type,
      jsonb_build_object('actions', '[]'::jsonb)
    )
    returning id into v_run_id;

    v_actions_attempted := 0;
    v_actions_succeeded := 0;
    v_actions_failed := 0;
    v_result := jsonb_build_object('actions', '[]'::jsonb);
    v_error_message := null;
    v_action_index := 0;

    for v_action in
      select value
      from jsonb_array_elements(coalesce(v_rule.actions, '[]'::jsonb))
    loop
      v_action_index := v_action_index + 1;
      v_actions_attempted := v_actions_attempted + 1;

      begin
        v_action_result := public.execute_automation_action(v_rule, new, v_run_id, v_action, v_action_index);
        v_actions_succeeded := v_actions_succeeded + 1;
        v_result := jsonb_set(
          v_result,
          '{actions}',
          (v_result->'actions') || jsonb_build_array(v_action_result),
          true
        );
      exception
        when others then
          v_actions_failed := v_actions_failed + 1;
          v_error_message := coalesce(v_error_message || ' | ', '') || sqlerrm;
          v_result := jsonb_set(
            v_result,
            '{actions}',
            (v_result->'actions') || jsonb_build_array(
              jsonb_build_object('type', coalesce(v_action->>'type', ''), 'error', sqlerrm)
            ),
            true
          );
      end;
    end loop;

    update public.automation_runs
    set
      status = case
        when v_actions_failed = 0 then 'succeeded'
        when v_actions_succeeded = 0 then 'failed'
        else 'partial'
      end,
      actions_attempted = v_actions_attempted,
      actions_succeeded = v_actions_succeeded,
      actions_failed = v_actions_failed,
      result = v_result,
      error_message = v_error_message,
      completed_at = now()
    where id = v_run_id;

    update public.automation_rules
    set last_run_at = now()
    where id = v_rule.id;
  end loop;

  return new;
end;
$$;

drop trigger if exists evaluate_automation_rules_after_activity_event on public.activity_events;
create trigger evaluate_automation_rules_after_activity_event
  after insert on public.activity_events
  for each row
  execute function public.evaluate_automation_rules_for_activity_event();

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'automation_rules'
  ) then
    alter publication supabase_realtime add table public.automation_rules;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'automation_runs'
  ) then
    alter publication supabase_realtime add table public.automation_runs;
  end if;
end;
$$;

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
      'sprint_overdue',
      'automation_rule'
    )
  );

do $$
declare
  v_function_sql text;
begin
  select pg_get_functiondef(
    'public.create_user_notification(uuid,text,text,text,uuid,uuid,uuid,uuid,jsonb,text,boolean)'::regprocedure
  )
    into v_function_sql;

  if position('automation_rule' in v_function_sql) = 0 then
    v_function_sql := replace(
      v_function_sql,
      '''sprint_overdue''',
      '''sprint_overdue'',
    ''automation_rule'''
    );

    execute v_function_sql;
  end if;
end;
$$;

revoke all on function public.create_user_notification(uuid, text, text, text, uuid, uuid, uuid, uuid, jsonb, text, boolean) from public;
revoke execute on function public.create_user_notification(uuid, text, text, text, uuid, uuid, uuid, uuid, jsonb, text, boolean) from PUBLIC, anon, authenticated;

revoke all on function public.touch_automation_rule_updated_at() from public;
revoke execute on function public.touch_automation_rule_updated_at() from PUBLIC, anon, authenticated;

revoke all on function public.automation_event_value(public.activity_events, text) from public;
revoke execute on function public.automation_event_value(public.activity_events, text) from PUBLIC, anon, authenticated;

revoke all on function public.automation_condition_matches(jsonb, public.activity_events) from public;
revoke execute on function public.automation_condition_matches(jsonb, public.activity_events) from PUBLIC, anon, authenticated;

revoke all on function public.automation_rule_matches_event(public.automation_rules, public.activity_events) from public;
revoke execute on function public.automation_rule_matches_event(public.automation_rules, public.activity_events) from PUBLIC, anon, authenticated;

revoke all on function public.execute_automation_action(public.automation_rules, public.activity_events, uuid, jsonb, integer) from public;
revoke execute on function public.execute_automation_action(public.automation_rules, public.activity_events, uuid, jsonb, integer) from PUBLIC, anon, authenticated;

revoke all on function public.evaluate_automation_rules_for_activity_event() from public;
revoke execute on function public.evaluate_automation_rules_for_activity_event() from PUBLIC, anon, authenticated;
