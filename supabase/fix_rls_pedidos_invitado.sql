-- Reparacion robusta de RLS para pedidos (usuario + invitado)
-- Ejecutar en Supabase SQL Editor sobre el proyecto activo.

begin;

-- 1) Asegurar RLS activo
alter table public.pedidos enable row level security;
alter table public.detalle_pedidos enable row level security;

-- 2) Permisos base API
grant usage on schema public to anon, authenticated;
grant insert, select, update on public.pedidos to anon, authenticated;
grant insert, select on public.detalle_pedidos to anon, authenticated;
grant usage, select on sequence public.secuencia_folio_pedido to anon, authenticated;

-- Funcion auxiliar para validar si un pedido puede recibir detalle.
-- SECURITY DEFINER evita el bloqueo por RLS al consultar public.pedidos desde una policy.
drop function if exists public.pedido_permitido_para_insert_detalle(uuid);
create or replace function public.pedido_permitido_para_insert_detalle(p_pedido_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.pedidos p
    where p.id = p_pedido_id
      and (
        p.usuario_id = auth.uid()
        or p.usuario_id is null
      )
  );
$$;

grant execute on function public.pedido_permitido_para_insert_detalle(uuid) to anon, authenticated;

-- 3) Limpiar TODAS las policies actuales de pedidos/detalle_pedidos
do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('pedidos', 'detalle_pedidos')
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- 4) Policies de pedidos
-- Ver: solo pedidos propios (si hay sesion)
create policy pedidos_ver_propios on public.pedidos
for select
to authenticated
using (usuario_id = auth.uid());

-- Insertar: permitir 2 casos en una misma policy para cualquier rol API
-- A) Usuario logueado: usuario_id debe ser auth.uid()
-- B) Invitado: usuario_id null + datos invitado completos
create policy pedidos_insertar_publico on public.pedidos
for insert
to public
with check (
  (
    auth.uid() is not null
    and usuario_id = auth.uid()
  )
  or
  (
    usuario_id is null
    and nullif(trim(nombre_invitado), '') is not null
    and nullif(trim(telefono_invitado), '') is not null
    and nullif(trim(correo_invitado), '') is not null
  )
);

-- Actualizar: solo dueno autenticado
create policy pedidos_actualizar_propios on public.pedidos
for update
to authenticated
using (usuario_id = auth.uid())
with check (usuario_id = auth.uid());

-- 5) Policies de detalle_pedidos
-- Ver: solo detalle de pedidos propios
create policy detalle_pedidos_ver_propios on public.detalle_pedidos
for select
to authenticated
using (
  exists (
    select 1
    from public.pedidos p
    where p.id = detalle_pedidos.pedido_id
      and p.usuario_id = auth.uid()
  )
);

-- Insertar detalle:
-- - autenticado: pedido propio
-- - invitado: pedido invitado (usuario_id null)
create policy detalle_pedidos_insertar_publico on public.detalle_pedidos
for insert
to public
with check (public.pedido_permitido_para_insert_detalle(pedido_id));

commit;

-- Verificacion recomendada (ejecutar despues):
-- select schemaname, tablename, policyname, roles, cmd
-- from pg_policies
-- where schemaname = 'public' and tablename in ('pedidos', 'detalle_pedidos')
-- order by tablename, policyname;
