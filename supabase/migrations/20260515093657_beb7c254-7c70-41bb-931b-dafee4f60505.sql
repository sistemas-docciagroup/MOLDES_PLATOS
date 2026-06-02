ALTER TABLE public.incidencias DROP COLUMN IF EXISTS estado;
ALTER TABLE public.incidencias ADD COLUMN IF NOT EXISTS color text;