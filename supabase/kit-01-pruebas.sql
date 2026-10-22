-- Pruebas de permisos de kit-01-base.sql. Se corren contra la base real SIN dejar rastro: todo va en una
-- transacción que termina en rollback. Uso: psql "$URI" -v ON_ERROR_STOP=1 -q -t -f kit-01-pruebas.sql | grep NOTICE
-- (si la migración ya está aplicada, correr solo la parte de PRUEBAS envuelta en begin; ... rollback;)
begin;
-- Kit Comercial Meleia · migración 01 · base común a los 4 módulos.
-- Empresas, cuentas con rol por empresa, datos por empresa con permisos por fila (RLS)
-- e historial de cambios que nadie puede editar desde la plataforma.
-- Se ejecuta una sola vez, dentro de una transacción. Antes: ~/Respaldos/Meleia-plataforma/respaldo.sh


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

-- ===== PRUEBAS =====
insert into auth.users (id, email, aud, role) values
 ('00000000-0000-0000-0000-0000000000a1','resp-a@prueba.local','authenticated','authenticated'),
 ('00000000-0000-0000-0000-0000000000b1','resp-b@prueba.local','authenticated','authenticated'),
 ('00000000-0000-0000-0000-0000000000d1','demo@prueba.local','authenticated','authenticated'),
 ('00000000-0000-0000-0000-0000000000f1','admin@prueba.local','authenticated','authenticated');
insert into public.empresas values ('emp-a','Empresa A',true,now()),('emp-b','Empresa B',true,now());
insert into public.miembros values
 ('00000000-0000-0000-0000-0000000000a1','emp-a','responsable'),
 ('00000000-0000-0000-0000-0000000000b1','emp-b','responsable'),
 ('00000000-0000-0000-0000-0000000000d1','emp-a','demostrador'),
 ('00000000-0000-0000-0000-0000000000d1','emp-b','demostrador');
insert into public.administradores values ('00000000-0000-0000-0000-0000000000f1');

create function pg_temp.como(u text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub',u,'role','authenticated')::text, true);
  perform set_config('role','authenticated', true);
end $$;
create function pg_temp.prueba(nombre text, ok boolean) returns void language plpgsql as $$
begin raise notice '% %', case when ok then 'OK   ' else 'FALLA' end, nombre; end $$;

-- Responsable A crea y edita en su empresa
select pg_temp.como('00000000-0000-0000-0000-0000000000a1');
insert into public.datos (empresa_id, coleccion, id, data) values ('emp-a','riesgos','r-01','{"id":"r-01","nombre":"x"}');
update public.datos set data='{"id":"r-01","nombre":"y"}' where empresa_id='emp-a' and id='r-01';
select pg_temp.prueba('A ve 1 registro propio', (select count(*) from public.datos)=1);
select pg_temp.prueba('A ve solo su empresa', (select count(*) from public.empresas)=1);
select pg_temp.prueba('A ve su historial (2)', (select count(*) from public.historial)=2);
select pg_temp.prueba('historial guarda quién', (select bool_and(usuario='00000000-0000-0000-0000-0000000000a1') from public.historial));
-- A no puede escribir en B
do $$ begin
  begin insert into public.datos (empresa_id, coleccion, id, data) values ('emp-b','riesgos','r-99','{"id":"r-99"}');
    perform pg_temp.prueba('A NO escribe en B', false);
  exception when insufficient_privilege or check_violation then perform pg_temp.prueba('A NO escribe en B', true); end;
end $$;
-- A no puede editar ni borrar el historial
do $$ begin
  begin update public.historial set accion='borrar'; perform pg_temp.prueba('historial NO editable', false);
  exception when insufficient_privilege then perform pg_temp.prueba('historial NO editable', true); end;
  begin delete from public.historial; perform pg_temp.prueba('historial NO borrable', false);
  exception when insufficient_privilege then perform pg_temp.prueba('historial NO borrable', true); end;
  begin insert into public.miembros values ('00000000-0000-0000-0000-0000000000a1','emp-b','responsable'); perform pg_temp.prueba('A NO se da acceso a B', false);
  exception when insufficient_privilege then perform pg_temp.prueba('A NO se da acceso a B', true); end;
  begin update public.datos set empresa_id='emp-b' where id='r-01'; perform pg_temp.prueba('A NO mueve registro a B', false);
  exception when insufficient_privilege or raise_exception or check_violation then perform pg_temp.prueba('A NO mueve registro a B', true); end;
end $$;
reset role;

-- Responsable B no ve nada de A
select pg_temp.como('00000000-0000-0000-0000-0000000000b1');
select pg_temp.prueba('B no ve datos de A', (select count(*) from public.datos)=0);
select pg_temp.prueba('B no ve historial de A', (select count(*) from public.historial)=0);
update public.datos set data='{"id":"r-01","hack":1}' where empresa_id='emp-a';
reset role;
select pg_temp.prueba('el update de B no tocó A', (select data->>'nombre' from public.datos where id='r-01')='y');

-- Demostrador lee ambas, no escribe
select pg_temp.como('00000000-0000-0000-0000-0000000000d1');
select pg_temp.prueba('demostrador ve 2 empresas', (select count(*) from public.empresas)=2);
select pg_temp.prueba('demostrador lee datos de A', (select count(*) from public.datos)=1);
do $$ begin
  begin insert into public.datos (empresa_id, coleccion, id, data) values ('emp-a','riesgos','r-02','{"id":"r-02"}'); perform pg_temp.prueba('demostrador NO escribe', false);
  exception when insufficient_privilege or check_violation then perform pg_temp.prueba('demostrador NO escribe', true); end;
end $$;
delete from public.datos;
reset role;
select pg_temp.prueba('el delete del demostrador no borró', (select count(*) from public.datos)=1);

-- Admin GH
select pg_temp.como('00000000-0000-0000-0000-0000000000f1');
select pg_temp.prueba('admin ve 2 empresas', (select count(*) from public.empresas)=2);
insert into public.datos (empresa_id, coleccion, id, data) values ('emp-b','riesgos','r-03','{"id":"r-03"}');
select pg_temp.prueba('admin escribe en B', (select count(*) from public.datos where empresa_id='emp-b')=1);
reset role;

-- Anónimo
set local role anon;
do $$ begin
  begin perform count(*) from public.datos; perform pg_temp.prueba('anónimo NO lee datos', false);
  exception when insufficient_privilege then perform pg_temp.prueba('anónimo NO lee datos', true); end;
  begin insert into public.registros (coleccion,id,data) values ('evaluaciones','x','{"id":"x"}'); perform pg_temp.prueba('anónimo NO escribe en tabla Demo A', false);
  exception when insufficient_privilege then perform pg_temp.prueba('anónimo NO escribe en tabla Demo A', true); end;
end $$;
reset role;
rollback;
