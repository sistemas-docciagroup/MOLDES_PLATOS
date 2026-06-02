CREATE TYPE public.incidencia_estado AS ENUM ('pendiente', 'reparado', 'descartado');

CREATE TABLE public.incidencias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  molde TEXT,
  descripcion TEXT NOT NULL,
  transcripcion TEXT NOT NULL,
  estado public.incidencia_estado NOT NULL DEFAULT 'pendiente',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.incidencias ENABLE ROW LEVEL SECURITY;

-- Public app: no auth, allow anyone to read/write incidencias
CREATE POLICY "Anyone can view incidencias" ON public.incidencias FOR SELECT USING (true);
CREATE POLICY "Anyone can insert incidencias" ON public.incidencias FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update incidencias" ON public.incidencias FOR UPDATE USING (true);

CREATE INDEX idx_incidencias_created_at ON public.incidencias(created_at DESC);
CREATE INDEX idx_incidencias_estado ON public.incidencias(estado);