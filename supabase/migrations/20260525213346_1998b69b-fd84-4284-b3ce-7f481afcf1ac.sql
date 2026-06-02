
ALTER TABLE public.recomendaciones_bloqueo
  ADD COLUMN IF NOT EXISTS foto_url text,
  ADD COLUMN IF NOT EXISTS transcripcion text;
