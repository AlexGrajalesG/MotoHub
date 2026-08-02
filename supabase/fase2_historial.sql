-- ================================================================
-- MIGRACIÓN: Historial enriquecido — Fase 2
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ================================================================

ALTER TABLE historial_mantenimiento ADD COLUMN IF NOT EXISTS negocio_nombre text;
ALTER TABLE historial_mantenimiento ADD COLUMN IF NOT EXISTS mecanico_nombre text;
ALTER TABLE historial_mantenimiento ADD COLUMN IF NOT EXISTS fotos text[] DEFAULT array[]::text[];
ALTER TABLE historial_mantenimiento ADD COLUMN IF NOT EXISTS factura_url text;
ALTER TABLE historial_mantenimiento ADD COLUMN IF NOT EXISTS detalles jsonb;
ALTER TABLE historial_mantenimiento ADD COLUMN IF NOT EXISTS creado_por text DEFAULT 'propietario'
  CHECK (creado_por IN ('propietario', 'mecanico', 'negocio'));
