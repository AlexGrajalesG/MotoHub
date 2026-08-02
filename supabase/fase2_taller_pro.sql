-- ============================================================================
-- Fase 2 - Mi Taller Pro: precios flexibles, dashboard y gestion de citas
-- ============================================================================

-- 1. Servicios: modelo de precio flexible
-- tipo_precio:
--   'fijo'    -> precio_base es el precio final (ej. mano de obra de un servicio estandar)
--   'desde'   -> precio_base es un "desde" (mano de obra), el cliente paga ademas los repuestos usados
--   'cotizar' -> sin precio_base, se cotiza segun el caso
alter table servicios
  add column if not exists tipo_precio text not null default 'fijo'
  check (tipo_precio in ('fijo', 'desde', 'cotizar'));

alter table servicios
  alter column precio_base drop not null;

alter table servicios
  add constraint servicios_precio_segun_tipo check (
    (tipo_precio = 'cotizar' and precio_base is null)
    or (tipo_precio in ('fijo', 'desde') and precio_base is not null)
  );

-- 2. Citas: campos para gestion desde el negocio
alter table citas add column if not exists precio_acordado numeric(10,2);
alter table citas add column if not exists notas_negocio text;

-- 3. RLS: el negocio puede ver y actualizar las citas de su negocio
drop policy if exists citas_select_negocio on citas;
create policy citas_select_negocio on citas for select to authenticated
  using (
    exists (
      select 1 from negocios
      where negocios.id = citas.negocio_id
        and negocios.propietario_id = auth.uid()
    )
  );

drop policy if exists citas_update_negocio on citas;
create policy citas_update_negocio on citas for update to authenticated
  using (
    exists (
      select 1 from negocios
      where negocios.id = citas.negocio_id
        and negocios.propietario_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from negocios
      where negocios.id = citas.negocio_id
        and negocios.propietario_id = auth.uid()
    )
  );

-- 4. RLS: el negocio puede ver datos basicos del cliente y vehiculo
-- de las citas que le hicieron (no acceso general a usuarios/vehiculos)
drop policy if exists usuarios_select_negocio_citas on usuarios;
create policy usuarios_select_negocio_citas on usuarios for select to authenticated
  using (
    exists (
      select 1 from citas
      join negocios on negocios.id = citas.negocio_id
      where citas.usuario_id = usuarios.id
        and negocios.propietario_id = auth.uid()
    )
  );

drop policy if exists vehiculos_select_negocio_citas on vehiculos;
create policy vehiculos_select_negocio_citas on vehiculos for select to authenticated
  using (
    exists (
      select 1 from citas
      join negocios on negocios.id = citas.negocio_id
      where citas.vehiculo_id = vehiculos.id
        and negocios.propietario_id = auth.uid()
    )
  );
