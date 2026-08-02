-- ================================================================
-- MIGRACIÓN: Flujo 2 — Órdenes walk-in (negocio crea cita en nombre de un cliente)
-- Ejecutar en Supabase (SQL Editor o MCP)
-- ================================================================

-- RPC: crea una cita 'walk_in' a nombre de un cliente ya registrado en Rodix.
-- SECURITY DEFINER porque citas_insert_own exige usuario_id = auth.uid(),
-- y aqui quien inserta es el negocio, no el cliente.
create or replace function crear_orden_walkin(
  p_negocio_id  uuid,
  p_cliente_id  uuid,
  p_vehiculo_id uuid default null,
  p_estado      text default 'confirmada'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cita_id uuid;
begin
  if not exists (
    select 1 from negocios where id = p_negocio_id and propietario_id = auth.uid()
  ) then
    raise exception 'No autorizado';
  end if;

  if p_estado not in ('confirmada', 'completada') then
    raise exception 'Estado invalido para walk-in';
  end if;

  insert into citas (usuario_id, negocio_id, vehiculo_id, fecha_solicitada, hora_solicitada, estado, origen)
  values (p_cliente_id, p_negocio_id, p_vehiculo_id, current_date, current_time, p_estado, 'walk_in')
  returning id into v_cita_id;

  return v_cita_id;
end;
$$;

revoke all on function crear_orden_walkin(uuid, uuid, uuid, text) from public;
grant execute on function crear_orden_walkin(uuid, uuid, uuid, text) to authenticated;
