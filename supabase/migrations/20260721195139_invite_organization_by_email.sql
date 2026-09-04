alter table public.organization_invitations
  add column if not exists invitee_email text;

create or replace function public.create_organization_invitation_by_email(
  p_organization_id uuid,
  p_email text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_inviter_id uuid := auth.uid();
  v_invitee_id uuid;
  v_email text := lower(trim(coalesce(p_email, '')));
  v_invitation_id uuid;
begin
  if v_inviter_id is null then
    raise exception 'Debes iniciar sesión para invitar personas.';
  end if;

  if p_organization_id is null then
    raise exception 'La organización es obligatoria.';
  end if;

  if v_email = '' then
    raise exception 'El correo es obligatorio.';
  end if;

  if v_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
    raise exception 'Escribe un correo válido.';
  end if;

  if not public.is_organization_admin(p_organization_id) then
    raise exception 'Solo owner/admin pueden invitar personas a la organización.';
  end if;

  select users.id
    into v_invitee_id
  from auth.users users
  where lower(users.email) = v_email
  limit 1;

  if v_invitee_id is null then
    raise exception 'No encontramos una cuenta registrada con ese correo.';
  end if;

  if v_invitee_id = v_inviter_id then
    raise exception 'No puedes invitarte a ti misma a la organización.';
  end if;

  if exists (
    select 1
    from public.organization_members member
    where member.organization_id = p_organization_id
      and member.user_id = v_invitee_id
  ) then
    raise exception 'Este usuario ya pertenece a la organización.';
  end if;

  insert into public.organization_invitations (
    organization_id,
    inviter_id,
    invitee_id,
    invitee_email
  )
  values (
    p_organization_id,
    v_inviter_id,
    v_invitee_id,
    v_email
  )
  returning id into v_invitation_id;

  return v_invitation_id;
exception
  when unique_violation then
    raise exception 'Este usuario ya tiene una invitación pendiente.';
end;
$$;

revoke all on function public.create_organization_invitation_by_email(uuid, text) from public;
grant execute on function public.create_organization_invitation_by_email(uuid, text) to authenticated;
