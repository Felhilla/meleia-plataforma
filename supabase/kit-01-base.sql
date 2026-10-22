-- Kit Comercial Meleia · migración 01 · base común a los 4 módulos.
-- Empresas, cuentas con rol por empresa, datos por empresa con permisos por fila (RLS)
-- e historial de cambios que nadie puede editar desde la plataforma.
-- Se ejecuta una sola vez, dentro de una transacción. Antes: ~/Respaldos/Meleia-plataforma/respaldo.sh

begin;

-- 0. La tabla del Demo A queda de solo lectura (antes cualquiera con el enlace podía escribir).
drop policy if exists "alta publica" on public.registros;
drop policy if exists "edicion publica" on public.registros;
revoke insert, update, delete on public.registros from anon;

-- 1. Empresas
create table public.empresas (
  id          text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  nombre      text not null check (length(nombre) between 2 and 120),
  -- true: se muestra en la muestra comercial (el demostrador la ve)
  muestra_comercial boolean not null default false,
  creada      timestamptz not null default now()
);

-- 2. Administradores GH (soporte técnico, ven y editan todo)
create table public.administradores (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- 3. Cuentas por empresa
--    responsable: lee y alimenta su empresa · demostrador: solo lee
create table public.miembros (
  user_id    uuid not null references auth.users(id) on delete cascade,
  empresa_id text not null references public.empresas(id) on delete cascade,
  rol        text not null check (rol in ('responsable', 'demostrador')),
  primary key (user_id, empresa_id)
);

-- 4. Datos de los módulos: un registro JSON por (empresa, colección, id)
create table public.datos (
  empresa_id text not null references public.empresas(id) on delete cascade,
  coleccion  text not null check (coleccion ~ '^[a-z0-9-]{2,40}$'),
  id         text not null check (id ~ '^[a-z0-9-]{1,80}$'),
  data       jsonb not null check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 50000),
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid(),
  primary key (empresa_id, coleccion, id)
);

-- 5. Historial: lo escribe solo el disparador; nadie lo edita ni lo borra
create table public.historial (
  n          bigint generated always as identity primary key,
  empresa_id text not null,
  coleccion  text not null,
  registro_id text not null,
  accion     text not null check (accion in ('crear', 'editar', 'borrar')),
  antes      jsonb,
  despues    jsonb,
  usuario    uuid,
  fecha      timestamptz not null default now()
);
create index historial_empresa_fecha on public.historial (empresa_id, fecha desc);

-- 6. Funciones de permiso (security definer: leen las tablas de permisos sin pasar por RLS)
create function public.es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.administradores where user_id = auth.uid());
$$;

create function public.puede_leer(e text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.es_admin()
      or exists (select 1 from public.miembros where user_id = auth.uid() and empresa_id = e);
$$;

create function public.puede_editar(e text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.es_admin()
      or exists (select 1 from public.miembros where user_id = auth.uid() and empresa_id = e and rol = 'responsable');
$$;

-- 7. Disparador del historial y de updated_at / updated_by
create function public.registrar_cambio() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.updated_at := now(); new.updated_by := auth.uid();
    insert into public.historial (empresa_id, coleccion, registro_id, accion, antes, despues, usuario)
    values (new.empresa_id, new.coleccion, new.id, 'crear', null, new.data, auth.uid());
    return new;
  elsif tg_op = 'UPDATE' then
    if new.empresa_id <> old.empresa_id or new.coleccion <> old.coleccion or new.id <> old.id then
      raise exception 'No se puede mover un registro de empresa, colección o id';
    end if;
    new.updated_at := now(); new.updated_by := auth.uid();
    insert into public.historial (empresa_id, coleccion, registro_id, accion, antes, despues, usuario)
    values (new.empresa_id, new.coleccion, new.id, 'editar', old.data, new.data, auth.uid());
    return new;
  else
    insert into public.historial (empresa_id, coleccion, registro_id, accion, antes, despues, usuario)
    values (old.empresa_id, old.coleccion, old.id, 'borrar', old.data, null, auth.uid());
    return old;
  end if;
end;
$$;

create trigger datos_historial
before insert or update or delete on public.datos
for each row execute function public.registrar_cambio();

-- 8. Permisos por fila
alter table public.empresas       enable row level security;
alter table public.administradores enable row level security;
alter table public.miembros       enable row level security;
alter table public.datos          enable row level security;
alter table public.historial      enable row level security;

create policy "empresas visibles" on public.empresas
  for select to authenticated using (public.puede_leer(id));

create policy "mis membresias" on public.miembros
  for select to authenticated using (user_id = auth.uid() or public.es_admin());

create policy "soy admin" on public.administradores
  for select to authenticated using (user_id = auth.uid());

create policy "leer datos" on public.datos
  for select to authenticated using (public.puede_leer(empresa_id));
create policy "crear datos" on public.datos
  for insert to authenticated with check (public.puede_editar(empresa_id));
create policy "editar datos" on public.datos
  for update to authenticated using (public.puede_editar(empresa_id)) with check (public.puede_editar(empresa_id));
create policy "borrar datos" on public.datos
  for delete to authenticated using (public.puede_editar(empresa_id));

create policy "leer historial" on public.historial
  for select to authenticated using (public.puede_leer(empresa_id));

-- 9. Privilegios: el público anónimo no ve nada; las cuentas solo lo que las políticas permiten.
--    Empresas, miembros y administradores se gestionan solo desde el panel de Supabase (GH).
revoke all on public.empresas, public.administradores, public.miembros, public.datos, public.historial from anon, authenticated;
grant select on public.empresas, public.administradores, public.miembros, public.historial to authenticated;
grant select, insert, update, delete on public.datos to authenticated;
revoke execute on function public.es_admin(), public.puede_leer(text), public.puede_editar(text), public.registrar_cambio() from public, anon;
grant execute on function public.es_admin(), public.puede_leer(text), public.puede_editar(text) to authenticated;

commit;
