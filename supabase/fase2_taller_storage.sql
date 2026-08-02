-- ================================================================
-- MIGRACIÓN: Storage — Foto de perfil del negocio
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Bucket 'fotos' (público), path: negocios/{negocio_id}/foto.{ext}
-- ================================================================

DROP POLICY IF EXISTS negocio_sube_su_foto     ON storage.objects;
DROP POLICY IF EXISTS negocio_actualiza_su_foto ON storage.objects;
DROP POLICY IF EXISTS negocio_elimina_su_foto   ON storage.objects;

CREATE POLICY negocio_sube_su_foto
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'fotos'
  AND (storage.foldername(name))[1] = 'negocios'
  AND EXISTS (
    SELECT 1 FROM negocios
    WHERE negocios.id::text = (storage.foldername(name))[2]
    AND negocios.propietario_id = auth.uid()
  )
);

CREATE POLICY negocio_actualiza_su_foto
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'fotos'
  AND (storage.foldername(name))[1] = 'negocios'
  AND EXISTS (
    SELECT 1 FROM negocios
    WHERE negocios.id::text = (storage.foldername(name))[2]
    AND negocios.propietario_id = auth.uid()
  )
);

CREATE POLICY negocio_elimina_su_foto
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'fotos'
  AND (storage.foldername(name))[1] = 'negocios'
  AND EXISTS (
    SELECT 1 FROM negocios
    WHERE negocios.id::text = (storage.foldername(name))[2]
    AND negocios.propietario_id = auth.uid()
  )
);
