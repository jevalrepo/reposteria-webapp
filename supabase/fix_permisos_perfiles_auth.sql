-- Habilitar permisos + RLS para que cada usuario pueda crear/leer/actualizar su perfil.

alter table public.perfiles enable row level security;

grant select, insert, update on public.perfiles to authenticated;

grant select on public.perfiles to anon;

drop policy if exists perfiles_ver_propio on public.perfiles;
create policy perfiles_ver_propio on public.perfiles
for select
using (auth.uid() = id);

drop policy if exists perfiles_insertar_propio on public.perfiles;
create policy perfiles_insertar_propio on public.perfiles
for insert
with check (auth.uid() = id);

drop policy if exists perfiles_actualizar_propio on public.perfiles;
create policy perfiles_actualizar_propio on public.perfiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);
