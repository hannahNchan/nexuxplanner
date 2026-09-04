revoke execute on function public.can_edit_project(uuid) from PUBLIC, anon;
grant execute on function public.can_edit_project(uuid) to authenticated;

revoke execute on function public.enqueue_command_job(text, text, jsonb, integer) from PUBLIC, anon, authenticated;

revoke execute on function public.create_task_command(uuid, text, text, text, text, uuid, uuid, integer, uuid, uuid, text, uuid, uuid, text) from PUBLIC, anon;
grant execute on function public.create_task_command(uuid, text, text, text, text, uuid, uuid, integer, uuid, uuid, text, uuid, uuid, text) to authenticated;

revoke execute on function public.assign_task_command(uuid, uuid, uuid) from PUBLIC, anon;
grant execute on function public.assign_task_command(uuid, uuid, uuid) to authenticated;

revoke execute on function public.complete_sprint_command(uuid, uuid, jsonb) from PUBLIC, anon;
grant execute on function public.complete_sprint_command(uuid, uuid, jsonb) to authenticated;
