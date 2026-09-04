create or replace function public.normalize_sprint_report_before_write()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.report_type = 'sprint_summary' and new.closed_at is not null then
    new.sprint_status := 'closed';
    new.snapshot := jsonb_set(
      coalesce(new.snapshot, '{}'::jsonb),
      '{sprint,status}',
      to_jsonb('closed'::text),
      true
    );
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.normalize_sprint_report_before_write() from public;
revoke all on function public.normalize_sprint_report_before_write() from anon;
revoke all on function public.normalize_sprint_report_before_write() from authenticated;

drop trigger if exists normalize_sprint_report_before_write_trigger on public.sprint_reports;
create trigger normalize_sprint_report_before_write_trigger
  before insert or update on public.sprint_reports
  for each row
  execute function public.normalize_sprint_report_before_write();

update public.sprint_reports
set
  sprint_status = 'closed',
  snapshot = jsonb_set(
    coalesce(snapshot, '{}'::jsonb),
    '{sprint,status}',
    to_jsonb('closed'::text),
    true
  ),
  updated_at = now()
where report_type = 'sprint_summary'
  and closed_at is not null
  and sprint_status <> 'closed';
