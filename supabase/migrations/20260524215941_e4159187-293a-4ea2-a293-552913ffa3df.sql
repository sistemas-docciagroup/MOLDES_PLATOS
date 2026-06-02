
DO $$ BEGIN
  CREATE TYPE public.estado_canal_color AS ENUM ('ok', 'observacion', 'bloqueado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.estado_actual_molde
  ADD COLUMN IF NOT EXISTS estado_basicos public.estado_canal_color NOT NULL DEFAULT 'ok',
  ADD COLUMN IF NOT EXISTS motivo_basicos text,
  ADD COLUMN IF NOT EXISTS fecha_estado_basicos timestamptz,
  ADD COLUMN IF NOT EXISTS decidido_por_basicos_id uuid,
  ADD COLUMN IF NOT EXISTS decidido_por_basicos_nombre text,
  ADD COLUMN IF NOT EXISTS estado_delicados public.estado_canal_color NOT NULL DEFAULT 'ok',
  ADD COLUMN IF NOT EXISTS motivo_delicados text,
  ADD COLUMN IF NOT EXISTS fecha_estado_delicados timestamptz,
  ADD COLUMN IF NOT EXISTS decidido_por_delicados_id uuid,
  ADD COLUMN IF NOT EXISTS decidido_por_delicados_nombre text;

-- Sembrar colores básicos por defecto
INSERT INTO public.colores_fabricacion (color, tipo_color, permite_molde_con_incidencia, activo)
VALUES
  ('Blanco', 'basico', true, true),
  ('Talco', 'basico', true, true),
  ('Pergamon', 'basico', true, true),
  ('Gris cemento', 'basico', true, true)
ON CONFLICT DO NOTHING;
