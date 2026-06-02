
-- Nuevo enum para el estado del molde tras la incidencia
DO $$ BEGIN
  CREATE TYPE public.estado_molde AS ENUM ('seguir_produccion', 'observacion', 'mandar_reparacion');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Añadir columnas a incidencias
ALTER TABLE public.incidencias
  ADD COLUMN IF NOT EXISTS estado_molde public.estado_molde NOT NULL DEFAULT 'seguir_produccion',
  ADD COLUMN IF NOT EXISTS tipo_fallo TEXT;

-- Índices para búsqueda y listados
CREATE INDEX IF NOT EXISTS idx_incidencias_molde_lower
  ON public.incidencias (lower(molde));
CREATE INDEX IF NOT EXISTS idx_incidencias_estado
  ON public.incidencias (estado_molde);
CREATE INDEX IF NOT EXISTS idx_incidencias_created
  ON public.incidencias (created_at DESC);

-- Vista: estado actual de cada molde (incidencia más reciente)
CREATE OR REPLACE VIEW public.moldes_estado_actual AS
SELECT DISTINCT ON (lower(i.molde))
  i.molde,
  i.estado_molde,
  i.motivo_corto,
  i.descripcion,
  i.foto_url,
  i.puesto,
  i.created_at AS fecha,
  EXTRACT(DAY FROM (now() - i.created_at))::int AS dias
FROM public.incidencias i
WHERE i.molde IS NOT NULL AND length(trim(i.molde)) > 0
ORDER BY lower(i.molde), i.created_at DESC;
