-- ============================================================================
-- Fase 2 - Notificaciones in-app de citas
-- Crea la tabla notificaciones + triggers que la alimentan automaticamente:
--   - Nueva cita solicitada  -> notifica al dueno del negocio
--   - Cambio de estado de cita -> notifica al cliente
-- ============================================================================

-- 1. Tabla notificaciones
create table if not exists notificaciones (
  id          uuid default gen_random_uuid() primary key,
  usuario_id  uuid references auth.users(id) on delete cascade not null,
  tipo        text not null check (tipo in ('cita_nueva', 'cita_estado')),
  titulo      text not null,
  cuerpo      text not null,
  cita_id     uuid references citas(id) on delete cascade,
  leida       boolean not null default false,
  created_at  timestamptz default now()
);

create index if not exists idx_notificaciones_usuario on notificaciones(usuario_id, leida);

alter table notificaciones enable row level security;

drop policy if exists notificaciones_select_own on notificaciones;
create policy notificaciones_select_own on notificaciones for select to authenticated
  using (usuario_id = auth.uid());

drop policy if exists notificaciones_update_own on notificaciones;
create policy notificaciones_update_own on notificaciones for update to authenticated
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

-- Habilitar Realtime para esta tabla
alter publication supabase_realtime add table notificaciones;

-- 2. Trigger: nueva cita -> notificar al dueno del negocio
create or replace function fn_notificar_cita_nueva()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_propietario      uuid;
  v_servicio_nombre  text;
  v_cuerpo           text;
begin
  select propietario_id into v_propietario from negocios where id = new.negocio_id;
  if v_propietario is null then
    return new;
  end if;

  if new.servicio_id is not null then
    select nombre into v_servicio_nombre from servicios where id = new.servicio_id;
  end if;

  v_cuerpo := coalesce(v_servicio_nombre, 'Servicio') || ' · ' || to_char(new.fecha_solicitada, 'DD/MM/YYYY')
    || case when new.hora_solicitada is not null then ' ' || to_char(new.hora_solicitada, 'HH24:MI') else '' end;

  insert into notificaciones (usuario_id, tipo, titulo, cuerpo, cita_id)
  values (v_propietario, 'cita_nueva', 'Nueva solicitud de cita', v_cuerpo, new.id);

  return new;
end;
$$;

drop trigger if exists trg_notificar_cita_nueva on citas;
create trigger trg_notificar_cita_nueva
after insert on citas
for each row execute function fn_notificar_cita_nueva();

-- 3. Trigger: cambio de estado de cita -> notificar al cliente
create or replace function fn_notificar_cita_estado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_negocio_nombre text;
  v_titulo         text;
  v_cuerpo         text;
begin
  if new.estado is distinct from old.estado then
    select nombre into v_negocio_nombre from negocios where id = new.negocio_id;

    v_titulo := case
      when new.estado = 'confirmada' then 'Cita confirmada'
      when new.estado = 'cancelada' and old.estado = 'pendiente' then 'Solicitud rechazada'
      when new.estado = 'cancelada' then 'Cita cancelada'
      when new.estado = 'completada' then 'Cita completada'
      else 'Cita actualizada'
    end;

    v_cuerpo := case
      when new.estado = 'confirmada' then coalesce(v_negocio_nombre, 'El negocio') || ' confirmo tu cita'
      when new.estado = 'cancelada' and old.estado = 'pendiente' then coalesce(v_negocio_nombre, 'El negocio') || ' rechazo tu solicitud de cita'
      when new.estado = 'cancelada' then coalesce(v_negocio_nombre, 'El negocio') || ' cancelo tu cita'
      when new.estado = 'completada' then coalesce(v_negocio_nombre, 'El negocio') || ' marco tu cita como completada'
      else 'El estado de tu cita cambio'
    end;

    insert into notificaciones (usuario_id, tipo, titulo, cuerpo, cita_id)
    values (new.usuario_id, 'cita_estado', v_titulo, v_cuerpo, new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notificar_cita_estado on citas;
create trigger trg_notificar_cita_estado
after update on citas
for each row execute function fn_notificar_cita_estado();
