-- Habilita lectura global para administradores/moderadores en panel admin.
-- Ejecutar en Supabase SQL Editor.

begin;

-- 1) Grants de tabla para lecturas/escrituras que usa el panel
grant select, update, delete on public.pedidos to authenticated;
grant select, update, delete on public.detalle_pedidos to authenticated;
grant select, update, delete on public.perfiles to authenticated;

-- 2) Función helper para saber si el usuario actual es admin/moderador
create or replace function public.is_admin_user()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.perfiles p
    where p.id = auth.uid()
      and p.rol in ('administrador', 'moderador')
  );
$$;

grant execute on function public.is_admin_user() to authenticated;

-- 3) Policies de admin para ver todo en panel
create policy if not exists pedidos_admin_ver_todos on public.pedidos
for select
to authenticated
using (public.is_admin_user());

create policy if not exists detalle_pedidos_admin_ver_todos on public.detalle_pedidos
for select
to authenticated
using (public.is_admin_user());

create policy if not exists perfiles_admin_ver_todos on public.perfiles
for select
to authenticated
using (public.is_admin_user());

commit;
