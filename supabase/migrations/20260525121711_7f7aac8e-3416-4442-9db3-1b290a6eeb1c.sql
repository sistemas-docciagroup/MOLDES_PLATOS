
-- Tipo enum para el origen del defecto
DO $$ BEGIN
  CREATE TYPE public.tipo_defecto AS ENUM ('producto','molde');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Tabla de defectos predefinidos
CREATE TABLE IF NOT EXISTS public.defectos_predefinidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo public.tipo_defecto NOT NULL,
  nombre text NOT NULL,
  orden integer NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tipo, nombre)
);

ALTER TABLE public.defectos_predefinidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read defectos_predefinidos"
  ON public.defectos_predefinidos FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin insert defectos_predefinidos"
  ON public.defectos_predefinidos FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "admin update defectos_predefinidos"
  ON public.defectos_predefinidos FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "admin delete defectos_predefinidos"
  ON public.defectos_predefinidos FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'::app_role));

CREATE TRIGGER trg_defectos_predefinidos_updated_at
  BEFORE UPDATE ON public.defectos_predefinidos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Columna defectos en incidencias_producto
ALTER TABLE public.incidencias_producto
  ADD COLUMN IF NOT EXISTS defectos text[] NOT NULL DEFAULT ARRAY[]::text[];

-- Semilla básica
INSERT INTO public.defectos_predefinidos (tipo, nombre, orden) VALUES
  ('producto','Mancha',10),
  ('producto','Rayón',20),
  ('producto','Burbuja',30),
  ('producto','Color incorrecto',40),
  ('producto','Medida fuera de rango',50),
  ('molde','Rebaba',10),
  ('molde','Falta de relleno',20),
  ('molde','Marca de molde',30),
  ('molde','Desgaste molde',40),
  ('molde','Suciedad molde',50)
ON CONFLICT (tipo, nombre) DO NOTHING;
