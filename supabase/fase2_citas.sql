-- ================================================================
-- MIGRACIÓN: Tabla de citas / solicitudes
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ================================================================

CREATE TABLE IF NOT EXISTS citas (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id        uuid REFERENCES auth.users(id)  ON DELETE CASCADE NOT NULL,
  negocio_id        uuid REFERENCES negocios(id)    ON DELETE CASCADE NOT NULL,
  servicio_id       uuid REFERENCES servicios(id)   ON DELETE SET NULL,
  vehiculo_id       uuid REFERENCES vehiculos(id)   ON DELETE SET NULL,
  fecha_solicitada  date NOT NULL,
  hora_solicitada   time,
  descripcion       text,
  estado            text DEFAULT 'pendiente'
                    CHECK (estado IN ('pendiente', 'confirmada', 'cancelada', 'completada')),
  created_at        timestamptz DEFAULT now()
);

ALTER TABLE citas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "citas_insert_own" ON citas FOR INSERT TO authenticated
WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "citas_select_own" ON citas FOR SELECT TO authenticated
USING (usuario_id = auth.uid());

CREATE POLICY "citas_update_own" ON citas FOR UPDATE TO authenticated
USING (usuario_id = auth.uid());
