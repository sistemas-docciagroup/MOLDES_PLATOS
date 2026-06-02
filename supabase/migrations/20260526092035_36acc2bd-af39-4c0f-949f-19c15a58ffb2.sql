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

INSERT INTO public.permisos_puesto_botones (scope, categoria, button_id, button_name, visible)
SELECT s.scope, 'of', 'borrar_of', 'Borrar OF', false
FROM (VALUES
  ('preparacion_molde'),('desmoldeo'),('repaso'),('valvula'),
  ('empaquetado'),('reparacion_moldes')
) AS s(scope)
ON CONFLICT DO NOTHING;

-- Contador piezas
CREATE TABLE IF NOT EXISTS public.contador_piezas_molde (
  numero_molde text PRIMARY KEY,
  piezas_desde_ultima_reparacion integer NOT NULL DEFAULT 0,
  piezas_totales integer NOT NULL DEFAULT 0,
  total_reparaciones integer NOT NULL DEFAULT 0,
  fecha_ultima_reparacion timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contador_piezas_molde ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth read contador_piezas_molde" ON public.contador_piezas_molde;
CREATE POLICY "auth read contador_piezas_molde" ON public.contador_piezas_molde FOR SELECT TO authenticated USING (true);

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
END; $$;

DROP TRIGGER IF EXISTS trg_incrementar_contador_piezas ON public.fabricaciones_of;
CREATE TRIGGER trg_incrementar_contador_piezas AFTER INSERT ON public.fabricaciones_of
  FOR EACH ROW EXECUTE FUNCTION public.incrementar_contador_piezas();

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
END; $$;

DROP TRIGGER IF EXISTS trg_reset_contador_al_reparar ON public.reparaciones;
CREATE TRIGGER trg_reset_contador_al_reparar AFTER UPDATE ON public.reparaciones
  FOR EACH ROW EXECUTE FUNCTION public.reset_contador_al_reparar();

REVOKE EXECUTE ON FUNCTION public.incrementar_contador_piezas() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reset_contador_al_reparar() FROM PUBLIC, anon, authenticated;

-- Colores
DO $$ BEGIN CREATE TYPE public.tipo_color AS ENUM ('basico','delicado'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE IF NOT EXISTS public.colores_fabricacion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  color text NOT NULL UNIQUE,
  tipo_color public.tipo_color NOT NULL DEFAULT 'delicado',
  permite_molde_con_incidencia boolean NOT NULL DEFAULT false,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.colores_fabricacion ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth read colores_fabricacion" ON public.colores_fabricacion;
CREATE POLICY "auth read colores_fabricacion" ON public.colores_fabricacion FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "admin insert colores_fabricacion" ON public.colores_fabricacion;
CREATE POLICY "admin insert colores_fabricacion" ON public.colores_fabricacion FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));
DROP POLICY IF EXISTS "admin update colores_fabricacion" ON public.colores_fabricacion;
CREATE POLICY "admin update colores_fabricacion" ON public.colores_fabricacion FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'administrador'::app_role));
DROP POLICY IF EXISTS "admin delete colores_fabricacion" ON public.colores_fabricacion;
CREATE POLICY "admin delete colores_fabricacion" ON public.colores_fabricacion FOR DELETE TO authenticated USING (has_role(auth.uid(), 'administrador'::app_role));

INSERT INTO public.colores_fabricacion (color, tipo_color, permite_molde_con_incidencia) VALUES
  ('Blanco','basico',true),('Talco','basico',true),('Pergamon','basico',true),
  ('Gris cemento','basico',true),('Grafito','delicado',false),('Negro','delicado',false)
ON CONFLICT (color) DO NOTHING;

-- Canal color en estado_actual_molde
DO $$ BEGIN CREATE TYPE public.estado_canal_color AS ENUM ('ok','observacion','bloqueado'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
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

-- flujo_picar
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS flujo_picar text NOT NULL DEFAULT 'moldes';
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_flujo_picar_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_flujo_picar_check CHECK (flujo_picar IN ('moldes','producto'));
UPDATE public.profiles SET flujo_picar = 'producto'
 WHERE puesto IN ('repaso','valvula','empaquetado','desmoldeo') AND flujo_picar = 'moldes';

CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF public.has_role(auth.uid(), 'administrador'::app_role) THEN RETURN NEW; END IF;
  IF NEW.puesto IS DISTINCT FROM OLD.puesto OR NEW.activo IS DISTINCT FROM OLD.activo
     OR NEW.puede_ver_moldes IS DISTINCT FROM OLD.puede_ver_moldes
     OR NEW.puede_ver_historial IS DISTINCT FROM OLD.puede_ver_historial
     OR NEW.puede_crear_incidencias IS DISTINCT FROM OLD.puede_crear_incidencias
     OR NEW.email IS DISTINCT FROM OLD.email OR NEW.id IS DISTINCT FROM OLD.id
     OR NEW.flujo_picar IS DISTINCT FROM OLD.flujo_picar
  THEN RAISE EXCEPTION 'No puedes modificar tus permisos, puesto, email, flujo o estado activo.'; END IF;
  RETURN NEW;
END; $function$;

-- Recomendaciones de bloqueo
DO $$ BEGIN CREATE TYPE public.recomendacion_bloqueo_canal AS ENUM ('basicos','delicados','ambos'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.recomendacion_bloqueo_estado AS ENUM ('pendiente','aceptada','rechazada'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE IF NOT EXISTS public.recomendaciones_bloqueo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_molde text NOT NULL,
  canal public.recomendacion_bloqueo_canal NOT NULL,
  motivo text NOT NULL,
  usuario_id uuid NOT NULL,
  usuario_nombre text NOT NULL,
  puesto public.puesto_trabajo,
  estado public.recomendacion_bloqueo_estado NOT NULL DEFAULT 'pendiente',
  revisada_por uuid,
  revisada_por_nombre text,
  fecha_revision timestamptz,
  motivo_revision text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_recomendaciones_bloqueo_estado ON public.recomendaciones_bloqueo (estado);
CREATE INDEX IF NOT EXISTS idx_recomendaciones_bloqueo_molde ON public.recomendaciones_bloqueo (numero_molde);
ALTER TABLE public.recomendaciones_bloqueo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth read recomendaciones_bloqueo" ON public.recomendaciones_bloqueo;
CREATE POLICY "auth read recomendaciones_bloqueo" ON public.recomendaciones_bloqueo FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth insert own recomendaciones_bloqueo" ON public.recomendaciones_bloqueo;
CREATE POLICY "auth insert own recomendaciones_bloqueo" ON public.recomendaciones_bloqueo FOR INSERT TO authenticated WITH CHECK (auth.uid() = usuario_id);
DROP POLICY IF EXISTS "admin/preparacion update recomendaciones_bloqueo" ON public.recomendaciones_bloqueo;
CREATE POLICY "admin/preparacion update recomendaciones_bloqueo" ON public.recomendaciones_bloqueo FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'administrador'::app_role) OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.puesto = 'preparacion_molde'::puesto_trabajo));

INSERT INTO public.permisos_puesto_botones (scope, button_id, button_name, categoria, visible)
SELECT s.scope, 'btn_bloquear_canal', 'Bloquear básico/delicado', 'acciones',
       CASE WHEN s.scope IN ('preparacion_molde','encargado') THEN true ELSE false END
FROM (VALUES ('preparacion_molde'),('desmoldeo'),('repaso'),('valvula'),('empaquetado'),('reparacion_moldes'),('encargado')) AS s(scope)
ON CONFLICT DO NOTHING;

INSERT INTO public.permisos_puesto_botones (scope, button_id, button_name, categoria, visible)
SELECT s.scope, 'btn_recomendaciones_bloqueo', 'Recomendaciones de bloqueo', 'acciones',
       CASE WHEN s.scope IN ('preparacion_molde','encargado') THEN true ELSE false END
FROM (VALUES ('preparacion_molde'),('desmoldeo'),('repaso'),('valvula'),('empaquetado'),('reparacion_moldes'),('encargado')) AS s(scope)
ON CONFLICT DO NOTHING;

-- origen incidencias_producto
ALTER TABLE public.incidencias_producto
  ADD COLUMN IF NOT EXISTS origen TEXT NOT NULL DEFAULT 'producto' CHECK (origen IN ('molde','producto'));

-- Defectos predefinidos
DO $$ BEGIN CREATE TYPE public.tipo_defecto AS ENUM ('producto','molde'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
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
DROP POLICY IF EXISTS "auth read defectos_predefinidos" ON public.defectos_predefinidos;
CREATE POLICY "auth read defectos_predefinidos" ON public.defectos_predefinidos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "admin insert defectos_predefinidos" ON public.defectos_predefinidos;
CREATE POLICY "admin insert defectos_predefinidos" ON public.defectos_predefinidos FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'administrador'::app_role));
DROP POLICY IF EXISTS "admin update defectos_predefinidos" ON public.defectos_predefinidos;
CREATE POLICY "admin update defectos_predefinidos" ON public.defectos_predefinidos FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'administrador'::app_role));
DROP POLICY IF EXISTS "admin delete defectos_predefinidos" ON public.defectos_predefinidos;
CREATE POLICY "admin delete defectos_predefinidos" ON public.defectos_predefinidos FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'administrador'::app_role));

DROP TRIGGER IF EXISTS trg_defectos_predefinidos_updated_at ON public.defectos_predefinidos;
CREATE TRIGGER trg_defectos_predefinidos_updated_at BEFORE UPDATE ON public.defectos_predefinidos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.incidencias_producto ADD COLUMN IF NOT EXISTS defectos text[] NOT NULL DEFAULT ARRAY[]::text[];

INSERT INTO public.defectos_predefinidos (tipo, nombre, orden) VALUES
  ('producto','Mancha',10),('producto','Rayón',20),('producto','Burbuja',30),
  ('producto','Color incorrecto',40),('producto','Medida fuera de rango',50),
  ('molde','Rebaba',10),('molde','Falta de relleno',20),('molde','Marca de molde',30),
  ('molde','Desgaste molde',40),('molde','Suciedad molde',50)
ON CONFLICT (tipo, nombre) DO NOTHING;

-- moldes_maestro delete policy (idempotent)
DROP POLICY IF EXISTS "admin/preparacion delete moldes_maestro" ON public.moldes_maestro;
CREATE POLICY "admin/preparacion delete moldes_maestro" ON public.moldes_maestro FOR DELETE TO authenticated
USING (public.has_role(auth.uid(),'administrador'::app_role) OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.puesto = 'preparacion_molde'::puesto_trabajo));

-- of_molde_asignado
CREATE TABLE IF NOT EXISTS public.of_molde_asignado (
  numero_of text PRIMARY KEY,
  numero_molde text NOT NULL,
  modelo text, medida text, color text,
  asignado_por_id uuid, asignado_por_nombre text,
  puesto puesto_trabajo,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.of_molde_asignado ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth read of_molde_asignado" ON public.of_molde_asignado;
CREATE POLICY "auth read of_molde_asignado" ON public.of_molde_asignado FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "admin/preparacion insert of_molde_asignado" ON public.of_molde_asignado;
CREATE POLICY "admin/preparacion insert of_molde_asignado" ON public.of_molde_asignado FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'administrador'::app_role) OR EXISTS (SELECT 1 FROM profiles p WHERE p.id=auth.uid() AND p.puesto='preparacion_molde'::puesto_trabajo));
DROP POLICY IF EXISTS "admin/preparacion update of_molde_asignado" ON public.of_molde_asignado;
CREATE POLICY "admin/preparacion update of_molde_asignado" ON public.of_molde_asignado FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'administrador'::app_role) OR EXISTS (SELECT 1 FROM profiles p WHERE p.id=auth.uid() AND p.puesto='preparacion_molde'::puesto_trabajo));

DROP TRIGGER IF EXISTS tg_of_molde_asignado_updated ON public.of_molde_asignado;
CREATE TRIGGER tg_of_molde_asignado_updated BEFORE UPDATE ON public.of_molde_asignado
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_of_molde_asignado_numero_molde ON public.of_molde_asignado(numero_molde);

-- alertas_vistas
CREATE TABLE IF NOT EXISTS public.alertas_vistas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tipo text NOT NULL,
  referencia_id text NOT NULL,
  numero_molde text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tipo, referencia_id)
);
ALTER TABLE public.alertas_vistas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users read own alertas_vistas" ON public.alertas_vistas;
CREATE POLICY "users read own alertas_vistas" ON public.alertas_vistas FOR SELECT TO authenticated USING (auth.uid()=user_id);
DROP POLICY IF EXISTS "users insert own alertas_vistas" ON public.alertas_vistas;
CREATE POLICY "users insert own alertas_vistas" ON public.alertas_vistas FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);
CREATE INDEX IF NOT EXISTS idx_alertas_vistas_user_molde ON public.alertas_vistas(user_id, numero_molde);

-- foto y transcripcion en recomendaciones_bloqueo
ALTER TABLE public.recomendaciones_bloqueo
  ADD COLUMN IF NOT EXISTS foto_url text,
  ADD COLUMN IF NOT EXISTS transcripcion text;