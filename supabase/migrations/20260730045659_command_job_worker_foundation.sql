alter table public.command_jobs
  add column if not exists max_attempts integer not null default 5,
  add column if not exists locked_at timestamptz null,
  add column if not exists locked_by text null,
  add column if not exists job_key text null,
  add column if not exists updated_at timestamptz not null default now();

update public.command_jobs
set job_key = nullif(payload ->> 'job_key', '')
where job_key is null;

create unique index if not exists command_jobs_job_key_uidx
  on public.command_jobs(job_key)
  where job_key is not null;

create index if not exists command_jobs_worker_claim_idx
  on public.command_jobs(queue_name, status, available_at, created_at)
  where status in ('queued', 'failed');

create index if not exists command_jobs_processing_lock_idx
  on public.command_jobs(status, locked_at)
  where status = 'processing';

create or replace function public.enqueue_command_job(
  p_queue_name text,
  p_job_type text,
  p_payload jsonb,
  p_delay_seconds integer default 0
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job_id uuid;
  v_job_key text := nullif(coalesce(p_payload, '{}'::jsonb) ->> 'job_key', '');
begin
  if nullif(trim(coalesce(p_queue_name, '')), '') is null then
    raise exception 'queue_name is required';
  end if;

  if nullif(trim(coalesce(p_job_type, '')), '') is null then
    raise exception 'job_type is required';
  end if;

  insert into public.command_jobs (
    queue_name,
    job_type,
    payload,
    available_at,
    job_key
  )
  values (
    trim(p_queue_name),
    trim(p_job_type),
    coalesce(p_payload, '{}'::jsonb),
    now() + make_interval(secs => greatest(coalesce(p_delay_seconds, 0), 0)),
    v_job_key
  )
  on conflict (job_key) where job_key is not null do update
    set updated_at = public.command_jobs.updated_at
  returning id into v_job_id;

  return v_job_id;
end;
$$;

revoke all on function public.enqueue_command_job(text, text, jsonb, integer) from public;
revoke all on function public.enqueue_command_job(text, text, jsonb, integer) from anon;
revoke all on function public.enqueue_command_job(text, text, jsonb, integer) from authenticated;

create or replace function public.claim_command_jobs(
  p_queue_name text,
  p_limit integer default 10,
  p_worker_id text default null
)
returns setof public.command_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if nullif(trim(coalesce(p_queue_name, '')), '') is null then
    raise exception 'queue_name is required';
  end if;

  return query
  with picked as (
    select job.id
    from public.command_jobs job
    where job.queue_name = trim(p_queue_name)
      and job.status in ('queued', 'failed')
      and job.available_at <= now()
      and job.attempts < job.max_attempts
    order by job.available_at asc, job.created_at asc
    limit least(greatest(coalesce(p_limit, 10), 1), 50)
    for update skip locked
  )
  update public.command_jobs job
  set
    status = 'processing',
    attempts = job.attempts + 1,
    locked_at = now(),
    locked_by = nullif(trim(coalesce(p_worker_id, '')), ''),
    last_error = null,
    updated_at = now()
  from picked
  where job.id = picked.id
  returning job.*;
end;
$$;

revoke all on function public.claim_command_jobs(text, integer, text) from public;
revoke all on function public.claim_command_jobs(text, integer, text) from anon;
revoke all on function public.claim_command_jobs(text, integer, text) from authenticated;

create or replace function public.complete_command_job(
  p_job_id uuid,
  p_worker_id text default null
)
returns public.command_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job public.command_jobs%rowtype;
begin
  update public.command_jobs job
  set
    status = 'done',
    processed_at = now(),
    locked_at = null,
    locked_by = null,
    last_error = null,
    updated_at = now()
  where job.id = p_job_id
    and job.status = 'processing'
    and (
      nullif(trim(coalesce(p_worker_id, '')), '') is null
      or job.locked_by = nullif(trim(coalesce(p_worker_id, '')), '')
    )
  returning job.* into v_job;

  if v_job.id is null then
    raise exception 'No processing command job found for completion.';
  end if;

  return v_job;
end;
$$;

revoke all on function public.complete_command_job(uuid, text) from public;
revoke all on function public.complete_command_job(uuid, text) from anon;
revoke all on function public.complete_command_job(uuid, text) from authenticated;

create or replace function public.fail_command_job(
  p_job_id uuid,
  p_error text,
  p_retry_delay_seconds integer default 60,
  p_worker_id text default null
)
returns public.command_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job public.command_jobs%rowtype;
begin
  update public.command_jobs job
  set
    status = 'failed',
    available_at = now() + make_interval(secs => greatest(coalesce(p_retry_delay_seconds, 60), 0)),
    locked_at = null,
    locked_by = null,
    last_error = left(coalesce(p_error, 'Command job failed'), 2000),
    updated_at = now()
  where job.id = p_job_id
    and job.status = 'processing'
    and (
      nullif(trim(coalesce(p_worker_id, '')), '') is null
      or job.locked_by = nullif(trim(coalesce(p_worker_id, '')), '')
    )
  returning job.* into v_job;

  if v_job.id is null then
    raise exception 'No processing command job found for failure.';
  end if;

  return v_job;
end;
$$;

revoke all on function public.fail_command_job(uuid, text, integer, text) from public;
revoke all on function public.fail_command_job(uuid, text, integer, text) from anon;
revoke all on function public.fail_command_job(uuid, text, integer, text) from authenticated;

create or replace function public.reset_stale_command_jobs(
  p_timeout_seconds integer default 300
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
begin
  update public.command_jobs job
  set
    status = 'failed',
    available_at = now(),
    locked_at = null,
    locked_by = null,
    last_error = 'Worker lock expired before completion.',
    updated_at = now()
  where job.status = 'processing'
    and job.locked_at < now() - make_interval(secs => greatest(coalesce(p_timeout_seconds, 300), 1));

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.reset_stale_command_jobs(integer) from public;
revoke all on function public.reset_stale_command_jobs(integer) from anon;
revoke all on function public.reset_stale_command_jobs(integer) from authenticated;
