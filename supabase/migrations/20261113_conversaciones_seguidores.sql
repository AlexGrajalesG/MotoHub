-- Conversaciones fuera de las citas: chat directo entre cuentas (estilo TikTok) y consulta a un negocio.
--
-- Reglas del chat directo:
--   * Si se siguen los dos (amigos), se escriben libremente.
--   * Si no, quien inicia puede enviar UN solo mensaje (solicitud). No puede enviar otro hasta que el otro acepte.
--   * El destinatario acepta, rechaza o bloquea. Si rechaza, el que inició no puede volver a escribir.
--   * Un bloqueo (tabla bloqueos, ya usada en Comunidad) corta seguir y escribir en ambos sentidos.
--
-- Todas las escrituras pasan por funciones SECURITY DEFINER: las tablas no tienen politicas de INSERT/UPDATE/DELETE.

-- ============================================================
-- Tablas
-- ============================================================
create table if not exists public.seguidores (
  seguidor_id uuid not null references public.usuarios(id) on delete cascade,
  seguido_id  uuid not null references public.usuarios(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (seguidor_id, seguido_id),
  constraint seguidores_no_a_si_mismo check (seguidor_id <> seguido_id)
);
create index if not exists seguidores_seguido_idx on public.seguidores (seguido_id);

create table if not exists public.conversaciones (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('directa', 'consulta_negocio')),
  estado text not null default 'activa' check (estado in ('solicitud', 'activa', 'rechazada')),
  iniciada_por uuid not null references public.usuarios(id) on delete cascade,
  negocio_id uuid references public.negocios(id) on delete cascade,
  par_a uuid references public.usuarios(id) on delete cascade,
  par_b uuid references public.usuarios(id) on delete cascade,
  created_at timestamptz not null default now(),
  ultimo_mensaje_at timestamptz,
  constraint conv_directa_par check (tipo <> 'directa' or (par_a is not null and par_b is not null and par_a < par_b)),
  constraint conv_consulta_negocio check (tipo <> 'consulta_negocio' or negocio_id is not null)
);
create unique index if not exists conv_directa_unica on public.conversaciones (par_a, par_b) where tipo = 'directa';
create unique index if not exists conv_consulta_unica on public.conversaciones (negocio_id, iniciada_por) where tipo = 'consulta_negocio';

create table if not exists public.conversacion_participantes (
  conversacion_id uuid not null references public.conversaciones(id) on delete cascade,
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  rol text not null check (rol in ('par', 'cliente', 'negocio', 'mecanico')),
  leido_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (conversacion_id, usuario_id)
);
create index if not exists conv_part_usuario_idx on public.conversacion_participantes (usuario_id);

create table if not exists public.mensajes_conversacion (
  id uuid primary key default gen_random_uuid(),
  conversacion_id uuid not null references public.conversaciones(id) on delete cascade,
  autor_id uuid not null references public.usuarios(id) on delete cascade,
  texto text not null check (char_length(texto) between 1 and 2000),
  adjuntos jsonb not null default '[]'::jsonb,
  eliminado_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists mensajes_conv_idx on public.mensajes_conversacion (conversacion_id, created_at desc);

create table if not exists public.reportes_mensaje (
  id uuid primary key default gen_random_uuid(),
  mensaje_id uuid not null references public.mensajes_conversacion(id) on delete cascade,
  reportado_por uuid not null references public.usuarios(id) on delete cascade,
  motivo text check (motivo is null or char_length(motivo) <= 300),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'revisado')),
  created_at timestamptz not null default now(),
  unique (mensaje_id, reportado_por)
);

-- ============================================================
-- Permisos y RLS: solo lectura directa; escrituras por funciones
-- ============================================================
alter table public.seguidores enable row level security;
alter table public.conversaciones enable row level security;
alter table public.conversacion_participantes enable row level security;
alter table public.mensajes_conversacion enable row level security;
alter table public.reportes_mensaje enable row level security;

revoke all on public.seguidores, public.conversaciones, public.conversacion_participantes,
  public.mensajes_conversacion, public.reportes_mensaje from anon, authenticated, public;
grant select on public.seguidores, public.conversaciones, public.conversacion_participantes,
  public.mensajes_conversacion to authenticated;

-- Pertenencia a una conversacion (INVOKER: lee solo las filas propias de participantes, sin recursion)
create or replace function public.es_participante(p_conversacion uuid)
returns boolean
language sql
stable
security invoker
set search_path to 'public'
as $$
  select exists (
    select 1 from public.conversacion_participantes p
    where p.conversacion_id = p_conversacion and p.usuario_id = auth.uid()
  );
$$;
revoke execute on function public.es_participante(uuid) from public, anon;
grant execute on function public.es_participante(uuid) to authenticated;

drop policy if exists seguidores_select_propio on public.seguidores;
create policy seguidores_select_propio on public.seguidores for select to authenticated
  using (seguidor_id = auth.uid() or seguido_id = auth.uid());

drop policy if exists conv_participantes_select_propio on public.conversacion_participantes;
create policy conv_participantes_select_propio on public.conversacion_participantes for select to authenticated
  using (usuario_id = auth.uid());

drop policy if exists conversaciones_select_participante on public.conversaciones;
create policy conversaciones_select_participante on public.conversaciones for select to authenticated
  using (public.es_participante(id));

drop policy if exists mensajes_conv_select_participante on public.mensajes_conversacion;
create policy mensajes_conv_select_participante on public.mensajes_conversacion for select to authenticated
  using (public.es_participante(conversacion_id));

-- Realtime para mensajes y cambios de estado de la conversacion
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'mensajes_conversacion') then
    alter publication supabase_realtime add table public.mensajes_conversacion;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversaciones') then
    alter publication supabase_realtime add table public.conversaciones;
  end if;
end $$;

-- ============================================================
-- Ayudas internas (no se exponen a la app: revelarian bloqueos ajenos)
-- ============================================================
create or replace function public.hay_bloqueo(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.bloqueos
    where (bloqueador_id = a and bloqueado_id = b) or (bloqueador_id = b and bloqueado_id = a)
  );
$$;

create or replace function public.son_amigos(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (select 1 from public.seguidores where seguidor_id = a and seguido_id = b)
     and exists (select 1 from public.seguidores where seguidor_id = b and seguido_id = a);
$$;

revoke execute on function public.hay_bloqueo(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.son_amigos(uuid, uuid) from public, anon, authenticated;

-- Un bloqueo corta los seguimientos en ambos sentidos
create or replace function public.fn_bloqueo_corta_seguidores()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  delete from public.seguidores
  where (seguidor_id = new.bloqueador_id and seguido_id = new.bloqueado_id)
     or (seguidor_id = new.bloqueado_id and seguido_id = new.bloqueador_id);
  return new;
end;
$$;
revoke execute on function public.fn_bloqueo_corta_seguidores() from public, anon, authenticated;

drop trigger if exists trg_bloqueo_corta_seguidores on public.bloqueos;
create trigger trg_bloqueo_corta_seguidores after insert on public.bloqueos
  for each row execute function public.fn_bloqueo_corta_seguidores();

-- Si pasan a seguirse los dos, la solicitud pendiente o rechazada entre ellos se abre
create or replace function public.fn_seguidor_abre_conversacion()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if exists (select 1 from public.seguidores where seguidor_id = new.seguido_id and seguido_id = new.seguidor_id) then
    update public.conversaciones
    set estado = 'activa'
    where tipo = 'directa'
      and par_a = least(new.seguidor_id, new.seguido_id)
      and par_b = greatest(new.seguidor_id, new.seguido_id)
      and estado <> 'activa';
  end if;
  return new;
end;
$$;
revoke execute on function public.fn_seguidor_abre_conversacion() from public, anon, authenticated;

drop trigger if exists trg_seguidor_abre_conversacion on public.seguidores;
create trigger trg_seguidor_abre_conversacion after insert on public.seguidores
  for each row execute function public.fn_seguidor_abre_conversacion();

-- ============================================================
-- Seguir
-- ============================================================
create or replace function public.seguir_usuario(p_usuario_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if auth.uid() is null then raise exception 'No autorizado'; end if;
  if p_usuario_id = auth.uid() then raise exception 'No puedes seguirte a ti mismo'; end if;
  if not exists (select 1 from public.usuarios u where u.id = p_usuario_id and u.eliminacion_solicitada_at is null)
     or public.hay_bloqueo(auth.uid(), p_usuario_id) then
    raise exception 'Cuenta no disponible';
  end if;
  insert into public.seguidores (seguidor_id, seguido_id) values (auth.uid(), p_usuario_id)
    on conflict do nothing;
end;
$$;

create or replace function public.dejar_de_seguir(p_usuario_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if auth.uid() is null then raise exception 'No autorizado'; end if;
  delete from public.seguidores where seguidor_id = auth.uid() and seguido_id = p_usuario_id;
end;
$$;

-- ============================================================
-- Buscar una cuenta por @usuario exacto (sin listados: evita rastrear cuentas)
-- ============================================================
create or replace function public.buscar_cuenta(p_nombre_usuario text)
returns table (id uuid, nombre text, nombre_usuario text, foto_url text)
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_handle text := lower(trim(both '@' from trim(coalesce(p_nombre_usuario, ''))));
begin
  if auth.uid() is null then raise exception 'No autorizado'; end if;
  if char_length(v_handle) < 3 then return; end if;
  return query
    select u.id, u.nombre, u.nombre_usuario, u.foto_url
    from public.usuarios u
    where u.nombre_usuario = v_handle
      and u.id <> auth.uid()
      and u.eliminacion_solicitada_at is null
      and not public.hay_bloqueo(auth.uid(), u.id);
end;
$$;

-- ============================================================
-- Relacion con otra cuenta (para mostrar Seguir / Amigos / Escribir)
-- ============================================================
create or replace function public.estado_relacion(p_otro uuid)
returns table (yo_sigo boolean, me_sigue boolean, amigos boolean, yo_bloquee boolean, conversacion_id uuid, conversacion_estado text)
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then raise exception 'No autorizado'; end if;
  return query
    select
      exists (select 1 from public.seguidores s where s.seguidor_id = v_me and s.seguido_id = p_otro),
      exists (select 1 from public.seguidores s where s.seguidor_id = p_otro and s.seguido_id = v_me),
      public.son_amigos(v_me, p_otro),
      exists (select 1 from public.bloqueos b where b.bloqueador_id = v_me and b.bloqueado_id = p_otro),
      c.id,
      c.estado
    from (select 1) base
    left join public.conversaciones c
      on c.tipo = 'directa' and c.par_a = least(v_me, p_otro) and c.par_b = greatest(v_me, p_otro);
end;
$$;

-- ============================================================
-- Iniciar conversaciones
-- ============================================================
create or replace function public.iniciar_chat_directo(p_otro uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_me uuid := auth.uid();
  v_a uuid;
  v_b uuid;
  v_id uuid;
begin
  if v_me is null then raise exception 'No autorizado'; end if;
  if p_otro = v_me then raise exception 'No puedes escribirte a ti mismo'; end if;
  if not exists (select 1 from public.usuarios u where u.id = p_otro and u.eliminacion_solicitada_at is null)
     or public.hay_bloqueo(v_me, p_otro) then
    raise exception 'No puedes escribirle a esta cuenta';
  end if;

  v_a := least(v_me, p_otro);
  v_b := greatest(v_me, p_otro);

  select c.id into v_id from public.conversaciones c where c.tipo = 'directa' and c.par_a = v_a and c.par_b = v_b;
  if v_id is not null then return v_id; end if;

  if (select count(*) from public.conversaciones c
      where c.tipo = 'directa' and c.iniciada_por = v_me and c.created_at > now() - interval '24 hours') >= 20 then
    raise exception 'LIMITE_DIARIO';
  end if;

  insert into public.conversaciones (tipo, estado, iniciada_por, par_a, par_b)
  values ('directa', case when public.son_amigos(v_me, p_otro) then 'activa' else 'solicitud' end, v_me, v_a, v_b)
  returning id into v_id;

  insert into public.conversacion_participantes (conversacion_id, usuario_id, rol)
  values (v_id, v_me, 'par'), (v_id, p_otro, 'par');
  return v_id;
exception when unique_violation then
  select c.id into v_id from public.conversaciones c where c.tipo = 'directa' and c.par_a = v_a and c.par_b = v_b;
  return v_id;
end;
$$;

create or replace function public.iniciar_consulta_negocio(p_negocio_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_me uuid := auth.uid();
  v_dueno uuid;
  v_id uuid;
begin
  if v_me is null then raise exception 'No autorizado'; end if;
  select n.propietario_id into v_dueno from public.negocios n where n.id = p_negocio_id;
  if v_dueno is null then raise exception 'Negocio no disponible'; end if;
  if v_dueno = v_me then raise exception 'No puedes consultar tu propio negocio'; end if;
  if public.hay_bloqueo(v_me, v_dueno) then raise exception 'No puedes escribirle a este negocio'; end if;

  select c.id into v_id from public.conversaciones c
  where c.tipo = 'consulta_negocio' and c.negocio_id = p_negocio_id and c.iniciada_por = v_me;
  if v_id is not null then return v_id; end if;

  if (select count(*) from public.conversaciones c
      where c.tipo = 'consulta_negocio' and c.iniciada_por = v_me and c.created_at > now() - interval '24 hours') >= 20 then
    raise exception 'LIMITE_DIARIO';
  end if;

  insert into public.conversaciones (tipo, estado, iniciada_por, negocio_id)
  values ('consulta_negocio', 'activa', v_me, p_negocio_id)
  returning id into v_id;

  insert into public.conversacion_participantes (conversacion_id, usuario_id, rol)
  values (v_id, v_me, 'cliente'), (v_id, v_dueno, 'negocio');
  return v_id;
exception when unique_violation then
  select c.id into v_id from public.conversaciones c
  where c.tipo = 'consulta_negocio' and c.negocio_id = p_negocio_id and c.iniciada_por = v_me;
  return v_id;
end;
$$;

-- El dueno suma a un mecanico activo de su equipo a una consulta de su negocio
create or replace function public.agregar_mecanico_a_consulta(p_conversacion uuid, p_usuario_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_conv public.conversaciones%rowtype;
begin
  if auth.uid() is null then raise exception 'No autorizado'; end if;
  select * into v_conv from public.conversaciones c where c.id = p_conversacion and c.tipo = 'consulta_negocio';
  if not found
     or not exists (select 1 from public.negocios n where n.id = v_conv.negocio_id and n.propietario_id = auth.uid()) then
    raise exception 'No autorizado';
  end if;
  if not exists (select 1 from public.mecanicos m where m.negocio_id = v_conv.negocio_id and m.usuario_id = p_usuario_id and m.activo) then
    raise exception 'Esa persona no es mecanico activo de tu equipo';
  end if;
  insert into public.conversacion_participantes (conversacion_id, usuario_id, rol)
  values (p_conversacion, p_usuario_id, 'mecanico')
  on conflict do nothing;
end;
$$;

create or replace function public.quitar_mecanico_de_consulta(p_conversacion uuid, p_usuario_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if auth.uid() is null then raise exception 'No autorizado'; end if;
  if not exists (
    select 1 from public.conversaciones c join public.negocios n on n.id = c.negocio_id
    where c.id = p_conversacion and c.tipo = 'consulta_negocio' and n.propietario_id = auth.uid()
  ) then
    raise exception 'No autorizado';
  end if;
  delete from public.conversacion_participantes
  where conversacion_id = p_conversacion and usuario_id = p_usuario_id and rol = 'mecanico';
end;
$$;

-- ============================================================
-- Responder una solicitud, enviar mensajes, marcar leido
-- ============================================================
create or replace function public.responder_solicitud(p_conversacion uuid, p_aceptar boolean)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_conv public.conversaciones%rowtype;
begin
  if auth.uid() is null then raise exception 'No autorizado'; end if;
  select * into v_conv from public.conversaciones c where c.id = p_conversacion for update;
  if not found or v_conv.tipo <> 'directa' or auth.uid() not in (v_conv.par_a, v_conv.par_b) or v_conv.iniciada_por = auth.uid() then
    raise exception 'No autorizado';
  end if;
  if v_conv.estado <> 'solicitud' then raise exception 'La solicitud ya fue respondida'; end if;
  update public.conversaciones set estado = case when p_aceptar then 'activa' else 'rechazada' end where id = p_conversacion;
end;
$$;

create or replace function public.enviar_mensaje_conversacion(p_conversacion uuid, p_texto text)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_me uuid := auth.uid();
  v_conv public.conversaciones%rowtype;
  v_texto text := btrim(coalesce(p_texto, ''));
  v_otro uuid;
  v_id uuid;
begin
  if v_me is null then raise exception 'No autorizado'; end if;
  if char_length(v_texto) not between 1 and 2000 then raise exception 'MENSAJE_INVALIDO'; end if;

  -- Bloqueo de fila: dos envios simultaneos no pueden saltarse el limite de una solicitud
  select * into v_conv from public.conversaciones c where c.id = p_conversacion for update;
  if not found or not exists (
    select 1 from public.conversacion_participantes p where p.conversacion_id = p_conversacion and p.usuario_id = v_me
  ) then
    raise exception 'No autorizado';
  end if;

  if exists (
    select 1 from public.conversacion_participantes p
    where p.conversacion_id = p_conversacion and p.usuario_id <> v_me and public.hay_bloqueo(v_me, p.usuario_id)
  ) then
    raise exception 'BLOQUEADO';
  end if;

  if v_conv.tipo = 'directa' and v_conv.estado <> 'activa' then
    v_otro := case when v_conv.par_a = v_me then v_conv.par_b else v_conv.par_a end;
    if public.son_amigos(v_me, v_otro) then
      update public.conversaciones set estado = 'activa' where id = p_conversacion;
    elsif v_me = v_conv.iniciada_por then
      if v_conv.estado = 'rechazada' then raise exception 'SOLICITUD_RECHAZADA'; end if;
      if exists (select 1 from public.mensajes_conversacion m where m.conversacion_id = p_conversacion and m.autor_id = v_me) then
        raise exception 'SOLICITUD_PENDIENTE';
      end if;
    else
      -- Quien recibio la solicitud y responde la acepta
      update public.conversaciones set estado = 'activa' where id = p_conversacion;
    end if;
  end if;

  insert into public.mensajes_conversacion (conversacion_id, autor_id, texto)
  values (p_conversacion, v_me, v_texto)
  returning id into v_id;

  update public.conversaciones set ultimo_mensaje_at = now() where id = p_conversacion;
  update public.conversacion_participantes set leido_at = now()
  where conversacion_id = p_conversacion and usuario_id = v_me;
  return v_id;
end;
$$;

create or replace function public.marcar_conversacion_leida(p_conversacion uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if auth.uid() is null then raise exception 'No autorizado'; end if;
  update public.conversacion_participantes set leido_at = now()
  where conversacion_id = p_conversacion and usuario_id = auth.uid();
end;
$$;

-- Quienes participan (nombre visible, sin telefono ni datos personales)
create or replace function public.participantes_conversacion(p_conversacion uuid)
returns table (usuario_id uuid, nombre text, nombre_usuario text, foto_url text, rol text)
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.conversacion_participantes p where p.conversacion_id = p_conversacion and p.usuario_id = auth.uid()
  ) then
    raise exception 'No autorizado';
  end if;
  return query
    select p.usuario_id,
           case when p.rol = 'negocio' then coalesce(n.nombre, u.nombre) else u.nombre end,
           u.nombre_usuario, u.foto_url, p.rol
    from public.conversacion_participantes p
    join public.usuarios u on u.id = p.usuario_id
    join public.conversaciones c on c.id = p.conversacion_id
    left join public.negocios n on n.id = c.negocio_id
    where p.conversacion_id = p_conversacion;
end;
$$;

-- ============================================================
-- Bandeja de conversaciones (reemplaza la lectura directa de nombres ajenos)
-- p_como: 'cliente' = chat directo y consultas que hice; 'negocio' = consultas de mi negocio (dueno o mecanico)
-- ============================================================
create or replace function public.bandeja_conversaciones(p_como text)
returns table (
  conversacion_id uuid,
  tipo text,
  estado text,
  contraparte_nombre text,
  contraparte_usuario text,
  ultimo_texto text,
  ultimo_at timestamptz,
  ultimo_autor_id uuid,
  no_leido boolean,
  solicitud_recibida boolean,
  orden_at timestamptz
)
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  if auth.uid() is null then raise exception 'No autorizado'; end if;
  if p_como is null or p_como not in ('cliente', 'negocio') then
    raise exception 'Parametro invalido: p_como debe ser cliente o negocio';
  end if;

  return query
  select
    c.id,
    c.tipo,
    c.estado,
    case
      when c.tipo = 'directa' then ou.nombre
      when me.rol = 'cliente' then n.nombre
      else cu.nombre
    end,
    case
      when c.tipo = 'directa' then ou.nombre_usuario
      when me.rol = 'cliente' then null
      else cu.nombre_usuario
    end,
    ult.texto,
    ult.created_at,
    ult.autor_id,
    exists (
      select 1 from public.mensajes_conversacion m2
      where m2.conversacion_id = c.id
        and m2.autor_id <> auth.uid()
        and m2.created_at > coalesce(me.leido_at, '-infinity'::timestamptz)
    ),
    (c.tipo = 'directa' and c.estado = 'solicitud' and c.iniciada_por <> auth.uid()),
    ult.created_at
  from public.conversacion_participantes me
  join public.conversaciones c on c.id = me.conversacion_id
  left join public.negocios n on n.id = c.negocio_id
  left join public.usuarios cu on cu.id = c.iniciada_por
  left join public.usuarios ou
    on c.tipo = 'directa' and ou.id = case when c.par_a = auth.uid() then c.par_b else c.par_a end
  join lateral (
    select m.texto, m.created_at, m.autor_id
    from public.mensajes_conversacion m
    where m.conversacion_id = c.id
    order by m.created_at desc
    limit 1
  ) ult on true
  where me.usuario_id = auth.uid()
    and (
      (p_como = 'cliente' and (c.tipo = 'directa' or me.rol = 'cliente'))
      or (p_como = 'negocio' and me.rol in ('negocio', 'mecanico'))
    )
    -- Quien rechazo una solicitud ya no la ve
    and not (c.tipo = 'directa' and c.estado = 'rechazada' and c.iniciada_por <> auth.uid())
    -- Las cuentas que yo bloquee no aparecen
    and not exists (
      select 1 from public.bloqueos b
      where b.bloqueador_id = auth.uid()
        and b.bloqueado_id = case
          when c.tipo = 'directa' then ou.id
          when me.rol <> 'cliente' then c.iniciada_por
          else null
        end
    )
  order by ult.created_at desc
  limit 200;
end;
$$;

-- ============================================================
-- Reportes y moderacion: quien modera ve solo los mensajes reportados
-- ============================================================
create or replace function public.reportar_mensaje(p_mensaje_id uuid, p_motivo text default null)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_msg public.mensajes_conversacion%rowtype;
begin
  if auth.uid() is null then raise exception 'No autorizado'; end if;
  select * into v_msg from public.mensajes_conversacion m where m.id = p_mensaje_id;
  if not found or not exists (
    select 1 from public.conversacion_participantes p
    where p.conversacion_id = v_msg.conversacion_id and p.usuario_id = auth.uid()
  ) then
    raise exception 'No autorizado';
  end if;
  if v_msg.autor_id = auth.uid() then raise exception 'No puedes reportar tu propio mensaje'; end if;
  insert into public.reportes_mensaje (mensaje_id, reportado_por, motivo)
  values (p_mensaje_id, auth.uid(), nullif(left(btrim(coalesce(p_motivo, '')), 300), ''));
exception when unique_violation then
  raise exception 'Ya reportaste este mensaje';
end;
$$;

create or replace function public.cola_moderacion_chat()
returns table (
  mensaje_id uuid, texto text, autor_nombre text, autor_usuario text,
  tipo_conversacion text, created_at timestamptz, total_reportes bigint, motivos text[]
)
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  if not public.fn_es_moderador(auth.uid()) then raise exception 'No autorizado'; end if;
  return query
    select m.id, m.texto, u.nombre, u.nombre_usuario, c.tipo, m.created_at,
           count(r.id), coalesce(array_agg(r.motivo) filter (where r.motivo is not null), '{}')
    from public.reportes_mensaje r
    join public.mensajes_conversacion m on m.id = r.mensaje_id
    join public.conversaciones c on c.id = m.conversacion_id
    join public.usuarios u on u.id = m.autor_id
    where r.estado = 'pendiente' and m.eliminado_at is null
    group by m.id, u.nombre, u.nombre_usuario, c.tipo
    order by count(r.id) desc, m.created_at desc;
end;
$$;

create or replace function public.moderar_mensaje(p_mensaje_id uuid, p_accion text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.fn_es_moderador(auth.uid()) then raise exception 'No autorizado'; end if;
  if p_accion not in ('descartar', 'eliminar') then raise exception 'Accion invalida'; end if;
  if p_accion = 'eliminar' then
    update public.mensajes_conversacion
    set texto = 'Mensaje eliminado por moderacion', adjuntos = '[]'::jsonb, eliminado_at = now()
    where id = p_mensaje_id;
  end if;
  update public.reportes_mensaje set estado = 'revisado' where mensaje_id = p_mensaje_id;
end;
$$;

-- ============================================================
-- Permisos de ejecucion: solo usuarios con sesion
-- ============================================================
do $$
declare
  f text;
begin
  foreach f in array array[
    'seguir_usuario(uuid)', 'dejar_de_seguir(uuid)', 'buscar_cuenta(text)', 'estado_relacion(uuid)',
    'iniciar_chat_directo(uuid)', 'iniciar_consulta_negocio(uuid)',
    'agregar_mecanico_a_consulta(uuid, uuid)', 'quitar_mecanico_de_consulta(uuid, uuid)',
    'responder_solicitud(uuid, boolean)', 'enviar_mensaje_conversacion(uuid, text)',
    'marcar_conversacion_leida(uuid)', 'participantes_conversacion(uuid)',
    'bandeja_conversaciones(text)', 'reportar_mensaje(uuid, text)',
    'cola_moderacion_chat()', 'moderar_mensaje(uuid, text)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
