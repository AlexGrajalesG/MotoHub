-- ============================================================================
-- Fase 2 - Mecanicos en citas/chat, Calificaciones mutuas, Catalogo de productos
-- Ejecutar en Supabase Dashboard -> SQL Editor
--
-- REQUIERE haber ejecutado antes: fase2_notificaciones.sql y fase2_chat_taller.sql
-- (la tabla `mecanicos` ya existe desde fase2_servicios.sql)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. citas — asignacion opcional de mecanico ("solo centro" si queda null)
-- ----------------------------------------------------------------------------
alter table citas add column if not exists mecanico_id uuid references mecanicos(id) on delete set null;

-- RLS: cualquier mecanico activo del negocio puede ver y actualizar las citas del negocio
-- (no solo las asignadas a el — asi puede tomar las que no tienen mecanico asignado)
drop policy if exists citas_select_mecanico on citas;
create policy citas_select_mecanico on citas for select to authenticated
  using (
    exists (
      select 1 from mecanicos m
      where m.negocio_id = citas.negocio_id and m.usuario_id = auth.uid() and m.activo
    )
  );

drop policy if exists citas_update_mecanico on citas;
create policy citas_update_mecanico on citas for update to authenticated
  using (
    exists (
      select 1 from mecanicos m
      where m.negocio_id = citas.negocio_id and m.usuario_id = auth.uid() and m.activo
    )
  )
  with check (
    exists (
      select 1 from mecanicos m
      where m.negocio_id = citas.negocio_id and m.usuario_id = auth.uid() and m.activo
    )
  );


-- ----------------------------------------------------------------------------
-- 2. mecanicos — RLS (la tabla ya existe desde fase2_servicios.sql sin policies)
-- ----------------------------------------------------------------------------
alter table mecanicos enable row level security;

drop policy if exists mecanicos_select_propio on mecanicos;
create policy mecanicos_select_propio on mecanicos for select to authenticated
  using (usuario_id = auth.uid());

drop policy if exists mecanicos_select_negocio on mecanicos;
create policy mecanicos_select_negocio on mecanicos for select to authenticated
  using (
    exists (select 1 from negocios where negocios.id = mecanicos.negocio_id and negocios.propietario_id = auth.uid())
  );

drop policy if exists mecanicos_insert_negocio on mecanicos;
create policy mecanicos_insert_negocio on mecanicos for insert to authenticated
  with check (
    exists (select 1 from negocios where negocios.id = mecanicos.negocio_id and negocios.propietario_id = auth.uid())
  );

drop policy if exists mecanicos_update_negocio on mecanicos;
create policy mecanicos_update_negocio on mecanicos for update to authenticated
  using (
    exists (select 1 from negocios where negocios.id = mecanicos.negocio_id and negocios.propietario_id = auth.uid())
  )
  with check (
    exists (select 1 from negocios where negocios.id = mecanicos.negocio_id and negocios.propietario_id = auth.uid())
  );

drop policy if exists mecanicos_delete_negocio on mecanicos;
create policy mecanicos_delete_negocio on mecanicos for delete to authenticated
  using (
    exists (select 1 from negocios where negocios.id = mecanicos.negocio_id and negocios.propietario_id = auth.uid())
  );

-- Trigger: al agregar un mecanico, asegura que su usuario tenga el rol 'mecanico'
create or replace function fn_mecanico_agrega_rol()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update usuarios
  set roles = array_append(roles, 'mecanico')
  where id = new.usuario_id and not ('mecanico' = any(roles));
  return new;
end;
$$;

drop trigger if exists trg_mecanico_agrega_rol on mecanicos;
create trigger trg_mecanico_agrega_rol
after insert on mecanicos
for each row execute function fn_mecanico_agrega_rol();


-- ----------------------------------------------------------------------------
-- 3. calificaciones — mutuas (propietario <-> negocio / mecanico), 1-5 estrellas
-- ----------------------------------------------------------------------------
create table if not exists calificaciones (
  id            uuid default gen_random_uuid() primary key,
  cita_id       uuid references citas(id) on delete cascade not null,
  autor_id      uuid references auth.users(id) on delete cascade not null,
  autor_rol     text not null check (autor_rol in ('propietario', 'negocio')),
  destino_tipo  text not null check (destino_tipo in ('negocio', 'mecanico', 'usuario')),
  destino_id    uuid not null,
  estrellas     int not null check (estrellas between 1 and 5),
  comentario    text,
  created_at    timestamptz default now(),
  unique (cita_id, autor_id, destino_tipo)
);

create index if not exists idx_calificaciones_destino on calificaciones(destino_tipo, destino_id);

alter table calificaciones enable row level security;

-- cualquiera autenticado puede leer (promedios publicos en cards de negocio/servicios)
drop policy if exists calificaciones_select_all on calificaciones;
create policy calificaciones_select_all on calificaciones for select to authenticated
  using (true);

-- solo se puede calificar una cita completada, y solo participantes de esa cita
drop policy if exists calificaciones_insert_participante on calificaciones;
create policy calificaciones_insert_participante on calificaciones for insert to authenticated
  with check (
    autor_id = auth.uid()
    and exists (
      select 1 from citas c
      left join negocios n on n.id = c.negocio_id
      where c.id = calificaciones.cita_id
        and c.estado = 'completada'
        and (
          (autor_rol = 'propietario' and c.usuario_id = auth.uid())
          or (autor_rol = 'negocio' and n.propietario_id = auth.uid())
        )
    )
  );


-- ----------------------------------------------------------------------------
-- 4. productos — catalogo (solo lectura por ahora, sin carrito/pago)
-- ----------------------------------------------------------------------------
create table if not exists productos (
  id              uuid default gen_random_uuid() primary key,
  negocio_id      uuid references negocios(id) on delete cascade not null,
  nombre          text not null,
  descripcion     text,
  precio          numeric(10,2) not null,
  stock           int default 0,
  fotos           text[] default array[]::text[],
  compatible_con  text[] default array['motos', 'carros'],
  activo          boolean default true,
  created_at      timestamptz default now()
);

create index if not exists idx_productos_negocio on productos(negocio_id);

alter table productos enable row level security;

drop policy if exists productos_select_authenticated on productos;
create policy productos_select_authenticated on productos for select to authenticated
  using (activo = true);

drop policy if exists productos_manage_own on productos;
create policy productos_manage_own on productos for all to authenticated
  using (
    exists (select 1 from negocios where negocios.id = productos.negocio_id and negocios.propietario_id = auth.uid())
  )
  with check (
    exists (select 1 from negocios where negocios.id = productos.negocio_id and negocios.propietario_id = auth.uid())
  );
