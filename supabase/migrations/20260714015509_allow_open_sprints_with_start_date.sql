alter table public.sprints
drop constraint if exists sprints_date_order_check;

alter table public.sprints
add constraint sprints_date_order_check
check (
  end_date is null
  or (start_date is not null and end_date > start_date)
);
