-- ============================================================================
-- Fase 2 - Chat por cita + Registro de servicio con aprobacion + Walk-in
-- Ejecutar en Supabase Dashboard -> SQL Editor
--
-- REQUIERE haber ejecutado antes: supabase/fase2_notificaciones.sql
-- (este archivo extiende el check de notificaciones.tipo)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tabla mensajes_cita — chat interno por cita (trabajo)
-- ----------------------------------------------------------------------------
create table if not exists mensajes_cita (
  id              uuid default gen_random_uuid() primary key,
  cita_id         uuid references citas(id) on delete cascade not null,
  autor_id        uuid references auth.users(id) on delete cascade not null,
  rol_autor       text not null check (rol_autor in ('propietario', 'mecanico', 'negocio')),

  tipo_mensaje    text not null default 'texto' check (tipo_mensaje in ('texto', 'registro_servicio', 'sistema')),
  texto           text,
  adjuntos        jsonb default '[]'::jsonb,  -- [{ "url": "...", "tipo": "foto" | "factura" | "documento" }]

  -- referencia al registro de historial cuando tipo_mensaje = 'registro_servicio'
  historial_id    uuid references historial_mantenimiento(id) on delete set null,

  created_at      timestamptz default now()
);

create index if not exists idx_mensajes_cita_cita on mensajes_cita(cita_id, created_at);

alter table mensajes_cita enable row level security;

drop policy if exists mensajes_cita_select on mensajes_cita;
create policy mensajes_cita_select on mensajes_cita for select to authenticated
  using (
    exists (
      select 1 from citas c
      left join negocios n on n.id = c.negocio_id
      left join mecanicos m on m.negocio_id = c.negocio_id and m.usuario_id = auth.uid()
      where c.id = mensajes_cita.cita_id
        and (c.usuario_id = auth.uid() or n.propietario_id = auth.uid() or m.usuario_id is not null)
    )
  );

drop policy if exists mensajes_cita_insert on mensajes_cita;
create policy mensajes_cita_insert on mensajes_cita for insert to authenticated
  with check (
    autor_id = auth.uid()
    and exists (
      select 1 from citas c
      left join negocios n on n.id = c.negocio_id
      left join mecanicos m on m.negocio_id = c.negocio_id and m.usuario_id = auth.uid()
      where c.id = mensajes_cita.cita_id
        and (c.usuario_id = auth.uid() or n.propietario_id = auth.uid() or m.usuario_id is not null)
    )
  );

alter publication supabase_realtime add table mensajes_cita;


-- ----------------------------------------------------------------------------
-- 2. historial_mantenimiento — vincular con citas + flujo de aprobacion
-- ----------------------------------------------------------------------------
alter table historial_mantenimiento add column if not exists cita_id uuid references citas(id) on delete set null;
alter table historial_mantenimiento add column if not exists aprobado_propietario boolean;
-- aprobado_propietario: null = pendiente o no aplica (creado_por = 'propietario'), true = aceptado, false = rechazado

create index if not exists idx_historial_cita on historial_mantenimiento(cita_id);

-- el negocio/mecanico de la cita puede crear un registro pendiente de aprobacion
drop policy if exists historial_insert_negocio on historial_mantenimiento;
create policy historial_insert_negocio on historial_mantenimiento for insert to authenticated
  with check (
    cita_id is not null
    and creado_por in ('negocio', 'mecanico')
    and exists (
      select 1 from citas c
      left join negocios n on n.id = c.negocio_id
      left join mecanicos m on m.negocio_id = c.negocio_id and m.usuario_id = auth.uid()
      where c.id = historial_mantenimiento.cita_id
        and c.vehiculo_id = historial_mantenimiento.vehiculo_id
        and (n.propietario_id = auth.uid() or m.usuario_id is not null)
    )
  );

-- el negocio/mecanico puede ver el estado (pendiente/aceptado/rechazado) de los registros que crearon
drop policy if exists historial_select_negocio on historial_mantenimiento;
create policy historial_select_negocio on historial_mantenimiento for select to authenticated
  using (
    cita_id is not null
    and exists (
      select 1 from citas c
      left join negocios n on n.id = c.negocio_id
      left join mecanicos m on m.negocio_id = c.negocio_id and m.usuario_id = auth.uid()
      where c.id = historial_mantenimiento.cita_id
        and (n.propietario_id = auth.uid() or m.usuario_id is not null)
    )
  );

-- nota: el propietario ya puede SELECT/UPDATE (incl. aprobado_propietario) via la policy
-- "propietario gestiona su historial" (for all) que existe desde Fase 1.


-- ----------------------------------------------------------------------------
-- 3. citas — soporte para ordenes walk-in (sin cita previa en la app)
-- ----------------------------------------------------------------------------
alter table citas add column if not exists origen text not null default 'app' check (origen in ('app', 'walk_in'));


-- ----------------------------------------------------------------------------
-- 4. RPC: buscar cliente por telefono (para crear ordenes walk-in)
-- ----------------------------------------------------------------------------
create or replace function buscar_usuario_por_telefono(p_telefono text)
returns table (id uuid, nombre text, vehiculos jsonb)
language sql security definer set search_path = public
as $$
  select u.id, u.nombre,
    coalesce(
      jsonb_agg(jsonb_build_object('id', v.id, 'placa', v.placa, 'marca', v.marca, 'modelo', v.modelo))
        filter (where v.id is not null),
      '[]'::jsonb
    )
  from usuarios u
  left join vehiculos v on v.propietario_id = u.id and v.activo
  where u.telefono = p_telefono
  group by u.id, u.nombre;
$$;

revoke all on function buscar_usuario_por_telefono(text) from public;
grant execute on function buscar_usuario_por_telefono(text) to authenticated;


-- ----------------------------------------------------------------------------
-- 5. notificaciones — nuevos tipos para registros de servicio
-- ----------------------------------------------------------------------------
alter table notificaciones drop constraint if exists notificaciones_tipo_check;
alter table notificaciones add constraint notificaciones_tipo_check
  check (tipo in ('cita_nueva', 'cita_estado', 'registro_servicio_nuevo', 'registro_servicio_resuelto'));


-- ----------------------------------------------------------------------------
-- 6. Trigger: negocio/mecanico crea registro pendiente
--    -> notifica al propietario + agrega card al chat de la cita
-- ----------------------------------------------------------------------------
create or replace function fn_historial_negocio_creado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cita citas%rowtype;
  v_rol  text;
begin
  if new.cita_id is null or new.creado_por not in ('negocio', 'mecanico') then
    return new;
  end if;

  select * into v_cita from citas where id = new.cita_id;
  if v_cita.id is null then
    return new;
  end if;

  insert into notificaciones (usuario_id, tipo, titulo, cuerpo, cita_id)
  values (
    v_cita.usuario_id, 'registro_servicio_nuevo', 'Nuevo registro de servicio',
    initcap(new.tipo) || ' · revisa los detalles y confirma para agregarlo a tu historial',
    new.cita_id
  );

  v_rol := case when exists (
    select 1 from mecanicos where usuario_id = auth.uid() and negocio_id = v_cita.negocio_id
  ) then 'mecanico' else 'negocio' end;

  insert into mensajes_cita (cita_id, autor_id, rol_autor, tipo_mensaje, historial_id)
  values (new.cita_id, auth.uid(), v_rol, 'registro_servicio', new.id);

  return new;
end;
$$;

drop trigger if exists trg_historial_negocio_creado on historial_mantenimiento;
create trigger trg_historial_negocio_creado
after insert on historial_mantenimiento
for each row execute function fn_historial_negocio_creado();


-- ----------------------------------------------------------------------------
-- 7. Trigger: propietario acepta/rechaza el registro
--    -> aceptado: actualiza/crea recordatorio (mismos intervalos del auto-recordatorio)
--    -> rechazado: notifica al negocio
--    -> ambos casos: mensaje de sistema en el chat
-- ----------------------------------------------------------------------------
create or replace function fn_historial_aprobacion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cita            citas%rowtype;
  v_intervalo_km    int;
  v_intervalo_dias  int;
begin
  -- solo actuar la primera vez que se resuelve (pendiente -> aceptado/rechazado)
  if old.aprobado_propietario is not null or new.aprobado_propietario is null then
    return new;
  end if;

  select * into v_cita from citas where id = new.cita_id;

  if new.aprobado_propietario then
    v_intervalo_km := case new.tipo
      when 'aceite' then 2500
      when 'cadena' then 2000
      when 'frenos' then 10000
      when 'llantas' then 20000
      else null end;

    v_intervalo_dias := case new.tipo
      when 'bateria' then 365
      when 'soat' then 365
      when 'revision_tecnica' then 365
      else null end;

    if v_intervalo_km is not null and new.km_en_servicio is not null then
      update recordatorios set km_limite = new.km_en_servicio + v_intervalo_km, notificacion_enviada = false, estado = 'pendiente'
        where vehiculo_id = new.vehiculo_id and tipo = new.tipo and estado = 'pendiente';
      if not found then
        insert into recordatorios (vehiculo_id, tipo, km_limite) values (new.vehiculo_id, new.tipo, new.km_en_servicio + v_intervalo_km);
      end if;
    elsif v_intervalo_dias is not null then
      update recordatorios set fecha_limite = new.fecha + v_intervalo_dias, notificacion_enviada = false, estado = 'pendiente'
        where vehiculo_id = new.vehiculo_id and tipo = new.tipo and estado = 'pendiente';
      if not found then
        insert into recordatorios (vehiculo_id, tipo, fecha_limite) values (new.vehiculo_id, new.tipo, new.fecha + v_intervalo_dias);
      end if;
    end if;

    insert into mensajes_cita (cita_id, autor_id, rol_autor, tipo_mensaje, texto)
    values (new.cita_id, auth.uid(), 'propietario', 'sistema', 'Registro de servicio aceptado y agregado al historial');
  else
    if v_cita.negocio_id is not null then
      insert into notificaciones (usuario_id, tipo, titulo, cuerpo, cita_id)
      select n.propietario_id, 'registro_servicio_resuelto', 'Registro rechazado',
             'El cliente rechazo el registro de ' || new.tipo || '. Revisa el chat de la cita.', new.cita_id
      from negocios n where n.id = v_cita.negocio_id;
    end if;

    insert into mensajes_cita (cita_id, autor_id, rol_autor, tipo_mensaje, texto)
    values (new.cita_id, auth.uid(), 'propietario', 'sistema', 'Registro de servicio rechazado');
  end if;

  return new;
end;
$$;

drop trigger if exists trg_historial_aprobacion on historial_mantenimiento;
create trigger trg_historial_aprobacion
after update on historial_mantenimiento
for each row execute function fn_historial_aprobacion();
