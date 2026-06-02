ALTER TABLE public.incidencias_producto
  ADD COLUMN IF NOT EXISTS origen TEXT NOT NULL DEFAULT 'producto'
  CHECK (origen IN ('molde', 'producto'));