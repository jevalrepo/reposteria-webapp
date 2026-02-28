-- ============================================================================
-- ESQUEMA COMPLETO (ESPANOL) PARA SUPABASE
-- Reconstruye el ambiente desde cero.
-- Incluye:
-- - Catalogo (categorias, subcategorias, productos)
-- - Perfiles
-- - Direcciones de clientes
-- - Pedidos (con usuario o invitado)
-- - Detalle de pedidos
-- - Validaciones pickup/delivery
-- - Folio humano unico para rastreo
-- - Triggers y RLS
-- ============================================================================

begin;

create extension if not exists pgcrypto;

-- ============================================================================
-- LIMPIEZA (RECREACION COMPLETA)
-- ============================================================================

drop table if exists public.detalle_pedidos cascade;
drop table if exists public.pedidos cascade;
drop table if exists public.direcciones_clientes cascade;
drop table if exists public.productos cascade;
drop table if exists public.subcategorias cascade;
drop table if exists public.categorias cascade;
drop table if exists public.perfiles cascade;

drop function if exists public.asignar_folio_pedido() cascade;
drop function if exists public.validar_direccion_del_pedido() cascade;
drop function if exists public.actualizar_fecha_modificacion() cascade;
drop function if exists public.sincronizar_perfil_desde_auth() cascade;

drop sequence if exists public.secuencia_folio_pedido;

-- ============================================================================
-- FUNCIONES BASE
-- ============================================================================

create or replace function public.actualizar_fecha_modificacion()
returns trigger
language plpgsql
as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

-- ============================================================================
-- CATALOGO
-- ============================================================================

create table public.categorias (
  id text primary key,
  nombre text not null,
  slug text not null unique,
  emoji text,
  orden integer not null default 0,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table public.subcategorias (
  id text primary key,
  categoria_id text not null references public.categorias(id) on delete cascade,
  nombre text not null,
  slug text not null unique,
  orden integer not null default 0,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table public.productos (
  id text primary key,
  sku text unique,
  categoria_id text not null references public.categorias(id) on delete restrict,
  subcategoria_id text not null references public.subcategorias(id) on delete restrict,
  nombre text not null,
  descripcion text not null,
  precio numeric(12,2) not null check (precio >= 0),
  imagenes text[] not null default '{}',
  porciones text,
  etiquetas text[] not null default '{}',
  dietas text[] not null default '{}',
  destacado boolean not null default false,
  disponible boolean not null default true,
  horas_preparacion integer not null default 24 check (horas_preparacion >= 0),
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index categorias_orden_idx on public.categorias(orden);
create index subcategorias_categoria_orden_idx on public.subcategorias(categoria_id, orden);
create index productos_categoria_subcategoria_idx on public.productos(categoria_id, subcategoria_id);
create index productos_activo_disponible_idx on public.productos(activo, disponible);

-- ============================================================================
-- PERFILES
-- ============================================================================

create table public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  correo_electronico text,
  nombre_completo text,
  url_avatar text,
  rol text not null default 'cliente' check (rol in ('cliente', 'administrador', 'personal')),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index perfiles_rol_idx on public.perfiles(rol);

create or replace function public.sincronizar_perfil_desde_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  metadatos jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  nombre_detectado text;
  avatar_detectado text;
begin
  nombre_detectado := nullif(trim(
    coalesce(
      metadatos->>'full_name',
      metadatos->>'name',
      concat_ws(' ', metadatos->>'given_name', metadatos->>'family_name')
    )
  ), '');

  avatar_detectado := nullif(trim(coalesce(metadatos->>'avatar_url', metadatos->>'picture')), '');

  insert into public.perfiles (id, correo_electronico, nombre_completo, url_avatar)
  values (new.id, new.email, nombre_detectado, avatar_detectado)
  on conflict (id) do update
  set
    correo_electronico = excluded.correo_electronico,
    nombre_completo = coalesce(excluded.nombre_completo, public.perfiles.nombre_completo),
    url_avatar = coalesce(excluded.url_avatar, public.perfiles.url_avatar),
    actualizado_en = now();

  return new;
end;
$$;

create trigger trigger_sincronizar_perfil_auth
after insert or update of email, raw_user_meta_data on auth.users
for each row
execute function public.sincronizar_perfil_desde_auth();

-- Backfill inicial de perfiles
insert into public.perfiles (id, correo_electronico, nombre_completo, url_avatar)
select
  u.id,
  u.email,
  nullif(trim(
    coalesce(
      u.raw_user_meta_data->>'full_name',
      u.raw_user_meta_data->>'name',
      concat_ws(' ', u.raw_user_meta_data->>'given_name', u.raw_user_meta_data->>'family_name')
    )
  ), ''),
  nullif(trim(coalesce(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture')), '')
from auth.users u
on conflict (id) do update
set
  correo_electronico = excluded.correo_electronico,
  nombre_completo = coalesce(excluded.nombre_completo, public.perfiles.nombre_completo),
  url_avatar = coalesce(excluded.url_avatar, public.perfiles.url_avatar),
  actualizado_en = now();

-- ============================================================================
-- DIRECCIONES DE CLIENTES
-- ============================================================================

create table public.direcciones_clientes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  etiqueta text not null default 'Casa',
  nombre_recibe text not null,
  telefono text,
  calle_numero text not null,
  interior_referencia text,
  colonia text,
  ciudad text not null,
  estado text not null,
  codigo_postal text not null,
  notas_entrega text,
  es_predeterminada boolean not null default false,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index direcciones_clientes_usuario_idx on public.direcciones_clientes(usuario_id);
create unique index direcciones_clientes_unica_predeterminada_idx
  on public.direcciones_clientes(usuario_id)
  where es_predeterminada;

-- ============================================================================
-- PEDIDOS Y DETALLE
-- ============================================================================

create sequence public.secuencia_folio_pedido start 1;

create table public.pedidos (
  id uuid primary key default gen_random_uuid(),
  folio text not null unique,

  -- Usuario registrado (opcional)
  usuario_id uuid references auth.users(id) on delete set null,

  -- Invitado (obligatorio si no hay usuario)
  nombre_invitado text,
  telefono_invitado text,
  correo_invitado text,

  -- Entrega
  tipo_entrega text not null check (tipo_entrega in ('recoger_en_tienda', 'envio_a_domicilio')),
  direccion_cliente_id uuid references public.direcciones_clientes(id) on delete set null,
  direccion_envio_texto text,

  -- Estado del pedido (en espanol)
  estado text not null default 'pendiente' check (
    estado in (
      'pendiente',
      'confirmado',
      'en_preparacion',
      'listo_para_entrega',
      'en_camino',
      'entregado',
      'cancelado'
    )
  ),

  notas text,
  moneda text not null default 'MXN',
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  costo_envio numeric(12,2) not null default 0 check (costo_envio >= 0),
  total numeric(12,2) not null default 0 check (total >= 0),

  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),

  -- Reglas:
  -- 1) Debe existir usuario_id o datos completos de invitado.
  constraint pedidos_cliente_o_invitado_chk check (
    usuario_id is not null
    or (
      nullif(trim(nombre_invitado), '') is not null
      and nullif(trim(telefono_invitado), '') is not null
      and nullif(trim(correo_invitado), '') is not null
    )
  ),

  -- 2) Si es invitado, no debe tener direccion_cliente_id (usa texto libre).
  constraint pedidos_invitado_sin_direccion_cliente_chk check (
    usuario_id is not null or direccion_cliente_id is null
  ),

  -- 3) Si es envio a domicilio, direccion obligatoria (de cliente o texto).
  constraint pedidos_envio_requiere_direccion_chk check (
    tipo_entrega <> 'envio_a_domicilio'
    or (
      direccion_cliente_id is not null
      or nullif(trim(direccion_envio_texto), '') is not null
    )
  ),

  -- 4) Si es recoger en tienda, no debe llevar direccion.
  constraint pedidos_recoger_sin_direccion_chk check (
    tipo_entrega <> 'recoger_en_tienda'
    or (
      direccion_cliente_id is null
      and nullif(trim(direccion_envio_texto), '') is null
    )
  )
);

create table public.detalle_pedidos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  producto_id text references public.productos(id) on delete set null,
  nombre_producto text not null,
  precio_unitario numeric(12,2) not null check (precio_unitario >= 0),
  cantidad integer not null check (cantidad > 0),
  dedicatoria text,
  creado_en timestamptz not null default now()
);

create index pedidos_usuario_idx on public.pedidos(usuario_id);
create index pedidos_folio_idx on public.pedidos(folio);
create index pedidos_estado_idx on public.pedidos(estado);
create index pedidos_fecha_idx on public.pedidos(creado_en desc);
create index detalle_pedidos_pedido_idx on public.detalle_pedidos(pedido_id);

-- ============================================================================
-- TRIGGERS DE VALIDACION Y FOLIO
-- ============================================================================

create or replace function public.asignar_folio_pedido()
returns trigger
language plpgsql
as $$
begin
  if new.folio is null or trim(new.folio) = '' then
    new.folio := 'PED-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('public.secuencia_folio_pedido')::text, 6, '0');
  end if;
  return new;
end;
$$;

create or replace function public.validar_direccion_del_pedido()
returns trigger
language plpgsql
as $$
declare
  usuario_direccion uuid;
begin
  if new.direccion_cliente_id is not null then
    select dc.usuario_id
      into usuario_direccion
    from public.direcciones_clientes dc
    where dc.id = new.direccion_cliente_id;

    if usuario_direccion is null then
      raise exception 'La direccion seleccionada no existe.';
    end if;

    if new.usuario_id is null then
      raise exception 'Un pedido invitado no puede usar direccion de cliente registrada.';
    end if;

    if usuario_direccion <> new.usuario_id then
      raise exception 'La direccion no pertenece al usuario del pedido.';
    end if;
  end if;

  return new;
end;
$$;

create trigger trigger_pedidos_asignar_folio
before insert on public.pedidos
for each row
execute function public.asignar_folio_pedido();

create trigger trigger_pedidos_validar_direccion
before insert or update on public.pedidos
for each row
execute function public.validar_direccion_del_pedido();

create trigger trigger_categorias_actualizado_en
before update on public.categorias
for each row execute function public.actualizar_fecha_modificacion();

create trigger trigger_subcategorias_actualizado_en
before update on public.subcategorias
for each row execute function public.actualizar_fecha_modificacion();

create trigger trigger_productos_actualizado_en
before update on public.productos
for each row execute function public.actualizar_fecha_modificacion();

create trigger trigger_perfiles_actualizado_en
before update on public.perfiles
for each row execute function public.actualizar_fecha_modificacion();

create trigger trigger_direcciones_clientes_actualizado_en
before update on public.direcciones_clientes
for each row execute function public.actualizar_fecha_modificacion();

create trigger trigger_pedidos_actualizado_en
before update on public.pedidos
for each row execute function public.actualizar_fecha_modificacion();

-- ============================================================================
-- RLS (ROW LEVEL SECURITY)
-- ============================================================================

alter table public.categorias enable row level security;
alter table public.subcategorias enable row level security;
alter table public.productos enable row level security;
alter table public.perfiles enable row level security;
alter table public.direcciones_clientes enable row level security;
alter table public.pedidos enable row level security;
alter table public.detalle_pedidos enable row level security;

-- Catalogo publico de lectura
create policy categorias_lectura_publica on public.categorias
for select using (true);

create policy subcategorias_lectura_publica on public.subcategorias
for select using (true);

create policy productos_lectura_publica on public.productos
for select using (true);

-- Perfiles: cada usuario ve y modifica el suyo
create policy perfiles_ver_propio on public.perfiles
for select using (auth.uid() = id);

create policy perfiles_insertar_propio on public.perfiles
for insert with check (auth.uid() = id);

create policy perfiles_actualizar_propio on public.perfiles
for update using (auth.uid() = id) with check (auth.uid() = id);

-- Direcciones: cada usuario maneja las suyas
create policy direcciones_ver_propias on public.direcciones_clientes
for select using (auth.uid() = usuario_id);

create policy direcciones_insertar_propias on public.direcciones_clientes
for insert with check (auth.uid() = usuario_id);

create policy direcciones_actualizar_propias on public.direcciones_clientes
for update using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);

create policy direcciones_eliminar_propias on public.direcciones_clientes
for delete using (auth.uid() = usuario_id);

-- Pedidos:
-- 1) Usuario autenticado: ver/crear/editar solo los propios.
create policy pedidos_ver_propios on public.pedidos
for select using (auth.uid() = usuario_id);

create policy pedidos_insertar_propios on public.pedidos
for insert with check (auth.uid() = usuario_id);

create policy pedidos_actualizar_propios on public.pedidos
for update using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);

-- 2) Invitado (anon): permitir crear pedidos sin usuario.
create policy pedidos_insertar_invitado on public.pedidos
for insert
to anon
with check (
  usuario_id is null
  and nullif(trim(nombre_invitado), '') is not null
  and nullif(trim(telefono_invitado), '') is not null
  and nullif(trim(correo_invitado), '') is not null
);

-- Detalle de pedidos:
-- Lectura para el dueno autenticado del pedido.
create policy detalle_pedidos_ver_propios on public.detalle_pedidos
for select using (
  exists (
    select 1
    from public.pedidos p
    where p.id = detalle_pedidos.pedido_id
      and p.usuario_id = auth.uid()
  )
);

-- Insercion para pedidos propios autenticados.
create policy detalle_pedidos_insertar_propios on public.detalle_pedidos
for insert with check (
  exists (
    select 1
    from public.pedidos p
    where p.id = detalle_pedidos.pedido_id
      and p.usuario_id = auth.uid()
  )
);

-- Insercion anon para pedidos invitados.
create policy detalle_pedidos_insertar_invitado on public.detalle_pedidos
for insert
to anon
with check (
  exists (
    select 1
    from public.pedidos p
    where p.id = detalle_pedidos.pedido_id
      and p.usuario_id is null
  )
);

commit;

