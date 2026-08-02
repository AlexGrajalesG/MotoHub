-- ================================================================
-- MIGRACIÓN: Historial — Recomendaciones, Anexos y Mensajes
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ================================================================

-- Nuevas columnas en historial_mantenimiento
ALTER TABLE historial_mantenimiento ADD COLUMN IF NOT EXISTS recomendaciones text[] DEFAULT array[]::text[];
ALTER TABLE historial_mantenimiento ADD COLUMN IF NOT EXISTS anexos text[] DEFAULT array[]::text[];

-- Tabla de mensajes / bitácora por registro
CREATE TABLE IF NOT EXISTS historial_mensajes (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  historial_id uuid REFERENCES historial_mantenimiento(id) ON DELETE CASCADE NOT NULL,
  autor_id     uuid REFERENCES auth.users(id) NOT NULL,
  autor_nombre text NOT NULL,
  autor_tipo   text DEFAULT 'propietario' CHECK (autor_tipo IN ('propietario', 'mecanico')),
  texto        text NOT NULL,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE historial_mensajes ENABLE ROW LEVEL SECURITY;

-- Propietario puede leer y escribir mensajes de sus propios vehículos
CREATE POLICY "leer_mensajes_propios"
ON historial_mensajes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM historial_mantenimiento hm
    JOIN vehiculos v ON v.id = hm.vehiculo_id
    WHERE hm.id = historial_mensajes.historial_id
    AND v.propietario_id = auth.uid()
  )
);

CREATE POLICY "insertar_mensajes_propios"
ON historial_mensajes FOR INSERT
WITH CHECK (
  autor_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM historial_mantenimiento hm
    JOIN vehiculos v ON v.id = hm.vehiculo_id
    WHERE hm.id = historial_mensajes.historial_id
    AND v.propietario_id = auth.uid()
  )
);
