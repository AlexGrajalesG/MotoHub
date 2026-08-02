-- ================================================================
-- MIGRACIÓN: Fase 2 — Tab Servicios
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ================================================================

-- ── 1. Agregar columnas que no estaban en el schema inicial ──

ALTER TABLE IF EXISTS negocios ADD COLUMN IF NOT EXISTS foto_url text;
ALTER TABLE IF EXISTS negocios ADD COLUMN IF NOT EXISTS telefono text;

-- ── 2. Crear tablas (IF NOT EXISTS por si ya existen) ──

CREATE TABLE IF NOT EXISTS negocios (
  id              uuid default gen_random_uuid() primary key,
  propietario_id  uuid references usuarios(id) on delete cascade not null,
  nombre          text not null,
  nit             text unique,
  descripcion     text,
  direccion       text,
  ciudad          text,
  tipo            text not null check (tipo in ('taller', 'tienda', 'concesionario', 'mixto')),
  atiende         text[] default array['motos', 'carros'],
  horario         jsonb,
  foto_url        text,
  telefono        text,
  activo          boolean default true,
  created_at      timestamptz default now()
);

CREATE TABLE IF NOT EXISTS servicios (
  id                uuid default gen_random_uuid() primary key,
  negocio_id        uuid references negocios(id) on delete cascade not null,
  nombre            text not null,
  descripcion       text,
  categoria         text not null check (categoria in ('mantenimiento', 'reparacion', 'diagnostico', 'estetico')),
  aplica_a          text[] default array['motos', 'carros'],
  duracion_minutos  int,
  precio_base       numeric(10,2) not null,
  activo            boolean default true,
  created_at        timestamptz default now()
);

CREATE TABLE IF NOT EXISTS mecanicos (
  id                 uuid default gen_random_uuid() primary key,
  usuario_id         uuid references usuarios(id) on delete cascade not null,
  negocio_id         uuid references negocios(id) on delete set null,
  especialidades     text[] default array[]::text[],
  anios_experiencia  int default 0,
  atiende            text[] default array['motos', 'carros'],
  activo             boolean default true,
  created_at         timestamptz default now()
);

-- ── 3. Habilitar RLS ──

ALTER TABLE negocios  ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE mecanicos ENABLE ROW LEVEL SECURITY;

-- ── 4. Políticas RLS ──

DROP POLICY IF EXISTS "negocios_select_authenticated" ON negocios;
DROP POLICY IF EXISTS "negocios_insert_own"           ON negocios;
DROP POLICY IF EXISTS "negocios_update_own"           ON negocios;
DROP POLICY IF EXISTS "negocios_delete_own"           ON negocios;
DROP POLICY IF EXISTS "servicios_select_authenticated" ON servicios;
DROP POLICY IF EXISTS "servicios_manage_own"           ON servicios;

-- Cualquier usuario autenticado puede leer negocios activos
CREATE POLICY "negocios_select_authenticated"
ON negocios FOR SELECT TO authenticated
USING (activo = true);

-- El propietario gestiona su propio negocio
CREATE POLICY "negocios_insert_own"
ON negocios FOR INSERT TO authenticated
WITH CHECK (propietario_id = auth.uid());

CREATE POLICY "negocios_update_own"
ON negocios FOR UPDATE TO authenticated
USING (propietario_id = auth.uid())
WITH CHECK (propietario_id = auth.uid());

CREATE POLICY "negocios_delete_own"
ON negocios FOR DELETE TO authenticated
USING (propietario_id = auth.uid());

-- Cualquier usuario autenticado puede leer servicios activos
CREATE POLICY "servicios_select_authenticated"
ON servicios FOR SELECT TO authenticated
USING (activo = true);

-- El dueño del negocio gestiona sus servicios
CREATE POLICY "servicios_manage_own"
ON servicios FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM negocios
    WHERE negocios.id = servicios.negocio_id
    AND   negocios.propietario_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM negocios
    WHERE negocios.id = servicios.negocio_id
    AND   negocios.propietario_id = auth.uid()
  )
);

-- ── 5. Usuario semilla (propietario ficticio para datos de prueba) ──

INSERT INTO auth.users (
  id, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  aud, role,
  raw_app_meta_data, raw_user_meta_data
) VALUES (
  '10000001-0000-0000-0000-000000000001'::uuid,
  'talleres-seed@rodix.internal',
  crypt('seed-only-no-login', gen_salt('bf')),
  now(), now(), now(),
  'authenticated', 'authenticated',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"nombre":"Talleres Demo Rodix"}'::jsonb
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.usuarios (id, nombre, roles)
VALUES (
  '10000001-0000-0000-0000-000000000001'::uuid,
  'Talleres Demo Rodix',
  array['negocio']
) ON CONFLICT (id) DO NOTHING;

-- ── 6. Datos de prueba — Negocios ──

INSERT INTO negocios (id, propietario_id, nombre, descripcion, ciudad, direccion, tipo, atiende, horario, telefono, activo)
VALUES
(
  '20000001-0000-0000-0000-000000000001'::uuid,
  '10000001-0000-0000-0000-000000000001'::uuid,
  'MotoExpress Servicio',
  'Especialistas en mantenimiento y reparacion de motos. Mas de 10 años de experiencia en el sector. Equipo certificado y repuestos originales.',
  'Bucaramanga',
  'Carrera 27 #45-12, Cabecera del Llano',
  'taller',
  array['motos'],
  '{"lunes":{"abre":"08:00","cierra":"18:00"},"martes":{"abre":"08:00","cierra":"18:00"},"miercoles":{"abre":"08:00","cierra":"18:00"},"jueves":{"abre":"08:00","cierra":"18:00"},"viernes":{"abre":"08:00","cierra":"17:00"},"sabado":{"abre":"08:00","cierra":"13:00"},"domingo":null}'::jsonb,
  '3151234567',
  true
),
(
  '20000001-0000-0000-0000-000000000002'::uuid,
  '10000001-0000-0000-0000-000000000001'::uuid,
  'AutoMoto Centro',
  'Taller multimarca para motos y carros. Diagnostico computarizado, frenos ABS y sistema electrico. Mecanicos certificados.',
  'Bucaramanga',
  'Avenida Quebradaseca #31-87, Centro',
  'mixto',
  array['motos', 'carros'],
  '{"lunes":{"abre":"07:30","cierra":"18:30"},"martes":{"abre":"07:30","cierra":"18:30"},"miercoles":{"abre":"07:30","cierra":"18:30"},"jueves":{"abre":"07:30","cierra":"18:30"},"viernes":{"abre":"07:30","cierra":"18:30"},"sabado":{"abre":"08:00","cierra":"14:00"},"domingo":null}'::jsonb,
  '3209876543',
  true
),
(
  '20000001-0000-0000-0000-000000000003'::uuid,
  '10000001-0000-0000-0000-000000000001'::uuid,
  'Full Rueda Bogota',
  'Centro de servicio especializado en motos. Cambio de llantas, frenos y mantenimiento preventivo. Atendemos todas las marcas.',
  'Bogota',
  'Calle 80 #68-43, Normandia',
  'taller',
  array['motos'],
  '{"lunes":{"abre":"08:00","cierra":"19:00"},"martes":{"abre":"08:00","cierra":"19:00"},"miercoles":{"abre":"08:00","cierra":"19:00"},"jueves":{"abre":"08:00","cierra":"19:00"},"viernes":{"abre":"08:00","cierra":"19:00"},"sabado":{"abre":"09:00","cierra":"15:00"},"domingo":{"abre":"10:00","cierra":"13:00"}}'::jsonb,
  '3012345678',
  true
),
(
  '20000001-0000-0000-0000-000000000004'::uuid,
  '10000001-0000-0000-0000-000000000001'::uuid,
  'Serviautos El Dorado',
  'Taller integral de carros y motos. Pintura, latoneria, mecanica general y revision tecnicomecanica. 15 años en el mercado.',
  'Bogota',
  'Autopista Sur #72-15, Kennedy',
  'mixto',
  array['motos', 'carros'],
  '{"lunes":{"abre":"08:00","cierra":"18:00"},"martes":{"abre":"08:00","cierra":"18:00"},"miercoles":{"abre":"08:00","cierra":"18:00"},"jueves":{"abre":"08:00","cierra":"18:00"},"viernes":{"abre":"08:00","cierra":"18:00"},"sabado":{"abre":"08:00","cierra":"16:00"},"domingo":null}'::jsonb,
  '3187654321',
  true
)
ON CONFLICT (id) DO NOTHING;

-- ── 7. Datos de prueba — Servicios ──

-- MotoExpress Servicio (motos)
INSERT INTO servicios (negocio_id, nombre, descripcion, categoria, aplica_a, duracion_minutos, precio_base, activo)
VALUES
('20000001-0000-0000-0000-000000000001', 'Cambio de aceite y filtro',    'Aceite sintetico 10W40, filtro de aceite y revision de niveles',             'mantenimiento', array['motos'],           30,  55000, true),
('20000001-0000-0000-0000-000000000001', 'Revision de frenos',           'Inspeccion y ajuste de frenos delantero y trasero, revision de pastillas',   'mantenimiento', array['motos'],           45,  40000, true),
('20000001-0000-0000-0000-000000000001', 'Ajuste de cadena y pinon',     'Tension, limpieza y lubricacion de cadena, revision de pinon conductor',     'mantenimiento', array['motos'],           30,  30000, true),
('20000001-0000-0000-0000-000000000001', 'Diagnostico electronico',      'Escaneo OBD, lectura de codigos de error y revision de sensores',             'diagnostico',   array['motos'],           45,  60000, true),
('20000001-0000-0000-0000-000000000001', 'Cambio de llantas (par)',       'Desmonte, balanceo e instalacion — precio por par sin incluir las llantas',  'reparacion',    array['motos'],           60,  35000, true),
('20000001-0000-0000-0000-000000000001', 'Lavado y aspirado',            'Lavado exterior, limpieza de motor, abrillantado de plasticos',               'estetico',      array['motos'],           45,  25000, true);

-- AutoMoto Centro (mixto)
INSERT INTO servicios (negocio_id, nombre, descripcion, categoria, aplica_a, duracion_minutos, precio_base, activo)
VALUES
('20000001-0000-0000-0000-000000000002', 'Mantenimiento 1000 km moto',   'Cambio aceite, filtro, bujia y revision general',                            'mantenimiento', array['motos'],            60,  80000, true),
('20000001-0000-0000-0000-000000000002', 'Mantenimiento 5000 km carro',  'Cambio aceite, filtro aceite, filtro aire, revision 30 puntos',              'mantenimiento', array['carros'],           90, 150000, true),
('20000001-0000-0000-0000-000000000002', 'Cambio pastillas de freno',    'Instalacion pastillas delanteras y traseras, incluye revision de discos',    'reparacion',    array['motos', 'carros'],  60, 120000, true),
('20000001-0000-0000-0000-000000000002', 'Revision tecnicomecanica',     'Preparacion y pre-revision para la tecnicomecanica oficial',                 'diagnostico',   array['motos', 'carros'],  60,  70000, true),
('20000001-0000-0000-0000-000000000002', 'Alineacion y balanceo',        'Alineacion computarizada y balanceo de 4 ruedas',                            'mantenimiento', array['carros'],           45,  90000, true),
('20000001-0000-0000-0000-000000000002', 'Cambio de bateria',            'Diagnostico de bateria, alternador y cambio si necesario',                   'reparacion',    array['motos', 'carros'],  30, 180000, true);

-- Full Rueda Bogota (motos)
INSERT INTO servicios (negocio_id, nombre, descripcion, categoria, aplica_a, duracion_minutos, precio_base, activo)
VALUES
('20000001-0000-0000-0000-000000000003', 'Cambio de llantas (par)',      'Desmonte, montaje y balanceo de llantas para moto',                          'reparacion',    array['motos'],            45,  30000, true),
('20000001-0000-0000-0000-000000000003', 'Parcheo de llanta',            'Reparacion de ponchada con parche en frio o caliente',                       'reparacion',    array['motos'],            20,  12000, true),
('20000001-0000-0000-0000-000000000003', 'Cambio de aceite moto',        'Aceite mineral o sintetico segun especificacion del fabricante',              'mantenimiento', array['motos'],            30,  45000, true),
('20000001-0000-0000-0000-000000000003', 'Revision frenos ABS',          'Diagnostico del sistema ABS, revision de discos y pastillas',                'diagnostico',   array['motos'],            60,  80000, true),
('20000001-0000-0000-0000-000000000003', 'Lavado y detallado',           'Lavado de motor, carroceria y detallado de partes plasticas',                'estetico',      array['motos'],            60,  35000, true);

-- Serviautos El Dorado (mixto)
INSERT INTO servicios (negocio_id, nombre, descripcion, categoria, aplica_a, duracion_minutos, precio_base, activo)
VALUES
('20000001-0000-0000-0000-000000000004', 'Latoneria y pintura',          'Correccion de golpes, pintura en poliuretano con acabado profesional',       'estetico',      array['carros'],          480, 350000, true),
('20000001-0000-0000-0000-000000000004', 'Mecanica general carro',       'Diagnostico y reparacion de motor, transmision y suspension',                'reparacion',    array['carros'],          120, 200000, true),
('20000001-0000-0000-0000-000000000004', 'Cambio de aceite carro',       'Aceite 5W30 sintetico y filtro original segun marca',                        'mantenimiento', array['carros'],           45, 130000, true),
('20000001-0000-0000-0000-000000000004', 'Mantenimiento moto 3000 km',   'Aceite, filtro, bujia, cables y lubricacion general',                        'mantenimiento', array['motos'],            60,  90000, true),
('20000001-0000-0000-0000-000000000004', 'Diagnostico carro',            'Escaneo computarizado, test de bateria y revision de alternador',             'diagnostico',   array['carros'],           60,  85000, true),
('20000001-0000-0000-0000-000000000004', 'Lavado completo',              'Lavado exterior e interior, encerado y abrillantado de superficies',          'estetico',      array['motos', 'carros'],  90,  40000, true);
