
-- Ejecuta este script en Supabase SQL Editor para habilitar pedidos como invitado
-- sin reconstruir todo el esquema.

begin;

grant usage on schema public to anon, authenticated;
grant insert on public.pedidos to anon, authenticated;
grant insert on public.detalle_pedidos to anon, authenticated;
grant usage, select on sequence public.secuencia_folio_pedido to anon, authenticated;

commit;

