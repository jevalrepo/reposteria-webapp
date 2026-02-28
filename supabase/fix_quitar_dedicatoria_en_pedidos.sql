-- Quita dedicatoria de pedidos y la asegura en detalle_pedidos
-- Ejecutar en Supabase SQL Editor

begin;

-- Asegurar que dedicatoria exista a nivel detalle (correcto)
alter table public.detalle_pedidos
add column if not exists dedicatoria text;

-- Quitar dedicatoria a nivel pedido (si existe)
alter table public.pedidos
drop constraint if exists pedidos_dedicatoria_largo_chk;

alter table public.pedidos
drop column if exists dedicatoria;

commit;

