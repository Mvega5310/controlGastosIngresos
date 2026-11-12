-- Esquema de FinControl en Supabase.
--
-- Ejecútalo una sola vez en el editor SQL del proyecto:
-- https://supabase.com/dashboard  ->  tu proyecto  ->  SQL Editor  ->  New query
--
-- Una sola tabla guarda todas las colecciones. La aplicación hace todos sus
-- cálculos en el dispositivo y nunca consulta el servidor por contenido, solo
-- por "qué ha cambiado", así que una tabla por entidad no aportaría nada y
-- multiplicaría el esquema, las políticas y los disparadores por seis.

create table if not exists public.registros (
  usuario_id    uuid        not null references auth.users (id) on delete cascade,
  coleccion     text        not null,
  id            text        not null,
  -- El registro entero, tal y como lo guarda el dispositivo.
  datos         jsonb       not null,
  -- Marca del dispositivo. Decide quién gana un conflicto.
  actualizado_en text       not null,
  -- Marca del dispositivo al borrar. Un borrado deja rastro para que el otro
  -- aparato se entere; si desapareciera sin más, lo volvería a subir.
  eliminado_en  text,
  -- Marca del servidor. Responde a "qué ha cambiado aquí desde la última vez".
  -- Es una marca distinta de actualizado_en a propósito: son relojes distintos.
  servidor_en   timestamptz not null default now(),
  primary key (usuario_id, coleccion, id)
);

-- Para traer solo lo cambiado desde el último corte.
create index if not exists registros_por_cambio
  on public.registros (usuario_id, coleccion, servidor_en);

-- El servidor pone su propia marca en cada escritura; no se fía de la que
-- mande el cliente, cuyo reloj puede estar desajustado o manipulado.
create or replace function public.sellar_servidor()
returns trigger language plpgsql as $$
begin
  new.servidor_en := now();
  return new;
end $$;

drop trigger if exists registros_sellar on public.registros;
create trigger registros_sellar
  before insert or update on public.registros
  for each row execute function public.sellar_servidor();

-- Hora del servidor, para que el cliente guarde el corte en el reloj correcto.
create or replace function public.ahora_servidor()
returns timestamptz language sql stable as $$ select now() $$;

-- Cada usuario solo alcanza sus propias filas. Lo impone la base de datos, no
-- el código de la aplicación: aunque alguien manipulara el cliente, no podría
-- leer ni escribir datos de otra persona.
alter table public.registros enable row level security;

drop policy if exists registros_leer on public.registros;
create policy registros_leer on public.registros
  for select using (auth.uid() = usuario_id);

drop policy if exists registros_insertar on public.registros;
create policy registros_insertar on public.registros
  for insert with check (auth.uid() = usuario_id);

drop policy if exists registros_actualizar on public.registros;
create policy registros_actualizar on public.registros
  for update using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);

drop policy if exists registros_borrar on public.registros;
create policy registros_borrar on public.registros
  for delete using (auth.uid() = usuario_id);
