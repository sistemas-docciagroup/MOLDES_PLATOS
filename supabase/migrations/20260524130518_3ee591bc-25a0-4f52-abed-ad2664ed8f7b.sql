-- =========================================
-- FASE 2: Borrado lógico de OF + permiso
-- =========================================
ALTER TABLE public.fabricaciones_of
  ADD COLUMN IF NOT EXISTS eliminada boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS eliminada_at timestamptz,
  ADD COLUMN IF NOT EXISTS eliminada_por uuid,
  ADD COLUMN IF NOT EXISTS eliminada_por_nombre text,
  ADD COLUMN IF NOT EXISTS motivo_eliminacion text;

CREATE INDEX IF NOT EXISTS idx_fabricaciones_of_eliminada ON public.fabricaciones_of(eliminada);

-- Insertar botón "borrar_of" para todos los puestos (visible=false por defecto, admin lo activa)
INSERT INTO public.permisos_puesto_botones (scope, categoria, button_id, button_name, visible)
SELECT s.scope, 'of', 'borrar_of', 'Borrar OF', false
FROM (VALUES
  ('preparacion_molde'),('desmoldeo'),('repaso'),('valvula'),
  ('empaquetado'),('reparacion_moldes')
) AS s(scope)
ON CONFLICT DO NOTHING;

-- =========================================
-- FASE 3: Contador de piezas por molde
-- =========================================
CREATE TABLE IF NOT EXISTS public.contador_piezas_molde (
  numero_molde text PRIMARY KEY,
  piezas_desde_ultima_reparacion integer NOT NULL DEFAULT 0,
  piezas_totales integer NOT NULL DEFAULT 0,
  total_reparaciones integer NOT NULL DEFAULT 0,
  fecha_ultima_reparacion timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contador_piezas_molde ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read contador_piezas_molde"
  ON public.contador_piezas_molde FOR SELECT
  TO authenticated USING (true);

-- Trigger: incrementar al insertar fabricación (no incluye 'enviado_reparacion')
CREATE OR REPLACE FUNCTION public.incrementar_contador_piezas()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.resultado IN ('fabricacion_ok','fabricacion_con_incidencia','fabricacion_con_observacion') THEN
    INSERT INTO public.contador_piezas_molde (numero_molde, piezas_desde_ultima_reparacion, piezas_totales, updated_at)
    VALUES (NEW.numero_molde, 1, 1, now())
    ON CONFLICT (numero_molde) DO UPDATE
      SET piezas_desde_ultima_reparacion = contador_piezas_molde.piezas_desde_ultima_reparacion + 1,
          piezas_totales = contador_piezas_molde.piezas_totales + 1,
          updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_incrementar_contador_piezas ON public.fabricaciones_of;
CREATE TRIGGER trg_incrementar_contador_piezas
  AFTER INSERT ON public.fabricaciones_of
  FOR EACH ROW EXECUTE FUNCTION public.incrementar_contador_piezas();

-- Trigger: reset al marcar reparación como reparado
CREATE OR REPLACE FUNCTION public.reset_contador_al_reparar()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.estado = 'reparado' AND (OLD.estado IS DISTINCT FROM 'reparado') THEN
    INSERT INTO public.contador_piezas_molde (numero_molde, piezas_desde_ultima_reparacion, total_reparaciones, fecha_ultima_reparacion, updated_at)
    VALUES (NEW.molde, 0, 1, now(), now())
    ON CONFLICT (numero_molde) DO UPDATE
      SET piezas_desde_ultima_reparacion = 0,
          total_reparaciones = contador_piezas_molde.total_reparaciones + 1,
          fecha_ultima_reparacion = now(),
          updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reset_contador_al_reparar ON public.reparaciones;
CREATE TRIGGER trg_reset_contador_al_reparar
  AFTER UPDATE ON public.reparaciones
  FOR EACH ROW EXECUTE FUNCTION public.reset_contador_al_reparar();

-- =========================================
-- FASE 4: Clasificación de colores
-- =========================================
DO $$ BEGIN
  CREATE TYPE public.tipo_color AS ENUM ('basico','delicado');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.colores_fabricacion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  color text NOT NULL UNIQUE,
  tipo_color public.tipo_color NOT NULL DEFAULT 'delicado',
  permite_molde_con_incidencia boolean NOT NULL DEFAULT false,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.colores_fabricacion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read colores_fabricacion"
  ON public.colores_fabricacion FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin insert colores_fabricacion"
  ON public.colores_fabricacion FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "admin update colores_fabricacion"
  ON public.colores_fabricacion FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "admin delete colores_fabricacion"
  ON public.colores_fabricacion FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'administrador'::app_role));

-- Seed colores básicos y ejemplos delicados
INSERT INTO public.colores_fabricacion (color, tipo_color, permite_molde_con_incidencia) VALUES
  ('Blanco', 'basico', true),
  ('Talco', 'basico', true),
  ('Pergamon', 'basico', true),
  ('Gris cemento', 'basico', true),
  ('Grafito', 'delicado', false),
  ('Negro', 'delicado', false)
ON CONFLICT (color) DO NOTHING;
