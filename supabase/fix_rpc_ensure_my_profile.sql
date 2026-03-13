-- Asegura que cada usuario autenticado tenga su fila en public.perfiles.
-- Ejecutar en Supabase SQL Editor.

create or replace function public.ensure_my_profile()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  auth_user record;
  nombre_detectado text;
  avatar_detectado text;
begin
  if uid is null then
    return;
  end if;

  select id, email, raw_user_meta_data
  into auth_user
  from auth.users
  where id = uid;

  if auth_user.id is null then
    return;
  end if;

  nombre_detectado := nullif(trim(
    coalesce(
      auth_user.raw_user_meta_data->>'full_name',
      auth_user.raw_user_meta_data->>'name',
      concat_ws(' ', auth_user.raw_user_meta_data->>'given_name', auth_user.raw_user_meta_data->>'family_name')
    )
  ), '');

  avatar_detectado := nullif(trim(coalesce(auth_user.raw_user_meta_data->>'avatar_url', auth_user.raw_user_meta_data->>'picture')), '');

  insert into public.perfiles (id, correo_electronico, nombre_completo, url_avatar)
  values (auth_user.id, auth_user.email, nombre_detectado, avatar_detectado)
  on conflict (id) do update
  set
    correo_electronico = excluded.correo_electronico,
    nombre_completo = coalesce(public.perfiles.nombre_completo, excluded.nombre_completo),
    url_avatar = coalesce(public.perfiles.url_avatar, excluded.url_avatar),
    actualizado_en = now();
end;
$$;

grant execute on function public.ensure_my_profile() to authenticated;
