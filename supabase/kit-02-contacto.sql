-- E59 (8-nov-2026): formulario de contacto de Credenciales (opción a: base propia).
-- Seguridad desde el diseño: cualquiera puede ENVIAR un mensaje, pero solo los administradores de Meleia pueden
-- leerlo. Nadie puede editarlo ni borrarlo desde la plataforma. Los límites de tamaño viven en la base, no en la pantalla.
-- Antes de correrlo: ~/Respaldos/Meleia-plataforma/respaldo.sh (debe decir OK).
-- Riesgo aceptado (pendiente de decisión): sin captcha ni límite por remitente, alguien podría llenar la tabla de
-- mensajes basura. El formulario trae un campo trampa oculto que descarta los envíos automáticos más simples.

create table if not exists public.contactos (
  id         bigint generated always as identity primary key,
  creado     timestamptz not null default now(),
  nombre     text not null check (char_length(nombre) between 1 and 120),
  apellidos  text not null check (char_length(apellidos) between 1 and 120),
  correo     text not null check (char_length(correo) <= 200 and correo ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  telefono   text not null check (char_length(telefono) between 5 and 40),
  pais       text not null check (char_length(pais) <= 60),
  rol        text not null check (char_length(rol) <= 80),
  empresa    text not null check (char_length(empresa) between 1 and 200),
  mensaje    text check (mensaje is null or char_length(mensaje) <= 2000)
);

alter table public.contactos enable row level security;

revoke all on public.contactos from anon, authenticated;
grant insert (nombre, apellidos, correo, telefono, pais, rol, empresa, mensaje) on public.contactos to anon, authenticated;
grant select on public.contactos to authenticated;

create policy "enviar contacto" on public.contactos
  for insert to anon, authenticated with check (true);
create policy "leer contactos solo administradores" on public.contactos
  for select to authenticated using (public.es_admin());
