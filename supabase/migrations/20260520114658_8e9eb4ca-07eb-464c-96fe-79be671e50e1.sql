
-- 1) Enum nuevo para resultado fabricación
DO $$ BEGIN
  CREATE TYPE public.fabricacion_resultado AS ENUM (
    'fabricacion_ok',
    'fabricacion_con_incidencia',
    'fabricacion_con_observacion',
    'enviado_reparacion'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) moldes_maestro: aflojar modelo/medida + nota
ALTER TABLE public.moldes_maestro
  ALTER COLUMN modelo DROP NOT NULL,
  ALTER COLUMN medida DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS notas text;

-- 3) Tabla molde_modelos (N:N)
CREATE TABLE IF NOT EXISTS public.molde_modelos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_molde text NOT NULL,
  modelo text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (numero_molde, modelo)
);
CREATE INDEX IF NOT EXISTS idx_molde_modelos_numero ON public.molde_modelos(numero_molde);
CREATE INDEX IF NOT EXISTS idx_molde_modelos_modelo ON public.molde_modelos(modelo);

ALTER TABLE public.molde_modelos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read molde_modelos" ON public.molde_modelos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin/preparacion insert molde_modelos" ON public.molde_modelos
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'administrador'::app_role)
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.puesto = 'preparacion_molde'::puesto_trabajo)
  );

CREATE POLICY "admin/preparacion delete molde_modelos" ON public.molde_modelos
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'administrador'::app_role)
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.puesto = 'preparacion_molde'::puesto_trabajo)
  );

-- 4) Backfill desde moldes_maestro
INSERT INTO public.molde_modelos (numero_molde, modelo)
SELECT numero_molde, modelo
FROM public.moldes_maestro
WHERE modelo IS NOT NULL
ON CONFLICT DO NOTHING;

-- 5) reparaciones: nuevas columnas
ALTER TABLE public.reparaciones
  ADD COLUMN IF NOT EXISTS numero_of text,
  ADD COLUMN IF NOT EXISTS foto_url_2 text,
  ADD COLUMN IF NOT EXISTS foto_nombre_2 text;

-- 6) fabricaciones_of
CREATE TABLE IF NOT EXISTS public.fabricaciones_of (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_of text NOT NULL,
  modelo text,
  medida text,
  color text,
  numero_molde text NOT NULL,
  usuario_id uuid NOT NULL,
  usuario_nombre text NOT NULL,
  puesto public.puesto_trabajo,
  fecha_hora timestamptz NOT NULL DEFAULT now(),
  resultado public.fabricacion_resultado NOT NULL,
  texto_incidencia text,
  observacion text,
  incidencia_id uuid,
  reparacion_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fab_of_molde ON public.fabricaciones_of(numero_molde);
CREATE INDEX IF NOT EXISTS idx_fab_of_of ON public.fabricaciones_of(numero_of);
CREATE INDEX IF NOT EXISTS idx_fab_of_user ON public.fabricaciones_of(usuario_id);

ALTER TABLE public.fabricaciones_of ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own fabricaciones_of" ON public.fabricaciones_of
  FOR SELECT TO authenticated USING (auth.uid() = usuario_id);

CREATE POLICY "staff view all fabricaciones_of" ON public.fabricaciones_of
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE POLICY "auth insert own fabricaciones_of" ON public.fabricaciones_of
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = usuario_id);

-- 7) Permiso nuevo btn_gestion_moldes
INSERT INTO public.permisos_puesto_botones (scope, button_id, button_name, categoria, visible)
SELECT s.scope, 'btn_gestion_moldes', 'Gestión de moldes', 'admin',
       CASE WHEN s.scope IN ('preparacion_molde','encargado') THEN true ELSE false END
FROM (VALUES
  ('preparacion_molde'),('desmoldeo'),('repaso'),('valvula'),
  ('empaquetado'),('reparacion_moldes'),('encargado')
) AS s(scope)
ON CONFLICT DO NOTHING;
