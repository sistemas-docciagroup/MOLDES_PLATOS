ALTER TABLE public.profiles ALTER COLUMN puesto DROP NOT NULL;
ALTER TABLE public.reparaciones ADD COLUMN IF NOT EXISTS descripcion_reparacion text;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  INSERT INTO public.profiles (id, nombre, email, puesto)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
    NEW.email,
    NULLIF(NEW.raw_user_meta_data->>'puesto', '')::public.puesto_trabajo
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'operario') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $function$;

CREATE POLICY "Reparacion users update reparaciones" ON public.reparaciones FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.puesto = 'reparacion_moldes'));

CREATE POLICY "Reparacion users view reparaciones" ON public.reparaciones FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.puesto = 'reparacion_moldes'));

DO $$ BEGIN CREATE TYPE public.estado_molde AS ENUM ('seguir_produccion', 'observacion', 'mandar_reparacion'); EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE public.incidencias
  ADD COLUMN IF NOT EXISTS estado_molde public.estado_molde NOT NULL DEFAULT 'seguir_produccion',
  ADD COLUMN IF NOT EXISTS tipo_fallo TEXT;

CREATE INDEX IF NOT EXISTS idx_incidencias_molde_lower ON public.incidencias (lower(molde));
CREATE INDEX IF NOT EXISTS idx_incidencias_estado_m ON public.incidencias (estado_molde);
CREATE INDEX IF NOT EXISTS idx_incidencias_created ON public.incidencias (created_at DESC);

CREATE OR REPLACE VIEW public.moldes_estado_actual AS
SELECT DISTINCT ON (lower(i.molde))
  i.molde, i.estado_molde, i.motivo_corto, i.descripcion, i.foto_url, i.puesto,
  i.created_at AS fecha,
  EXTRACT(DAY FROM (now() - i.created_at))::int AS dias
FROM public.incidencias i
WHERE i.molde IS NOT NULL AND length(trim(i.molde)) > 0
ORDER BY lower(i.molde), i.created_at DESC;
ALTER VIEW public.moldes_estado_actual SET (security_invoker = true);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS puede_ver_moldes BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS puede_ver_historial BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS puede_crear_incidencias BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE public.permisos_puesto_botones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL, button_id text NOT NULL, button_name text NOT NULL, categoria text NOT NULL,
  visible boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scope, button_id)
);
ALTER TABLE public.permisos_puesto_botones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read permisos" ON public.permisos_puesto_botones FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins insert permisos" ON public.permisos_puesto_botones FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));
CREATE POLICY "Admins update permisos" ON public.permisos_puesto_botones FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'administrador'::app_role));
CREATE POLICY "Admins delete permisos" ON public.permisos_puesto_botones FOR DELETE TO authenticated USING (has_role(auth.uid(), 'administrador'::app_role));
CREATE TRIGGER trg_permisos_updated_at BEFORE UPDATE ON public.permisos_puesto_botones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

WITH buttons(button_id, button_name, categoria) AS (VALUES
  ('btn_registrar_incidencia','Registrar incidencia','incidencia'),
  ('btn_grabar_voz','Grabar voz','incidencia'),
  ('btn_anadir_foto','Añadir foto','incidencia'),
  ('btn_estado_moldes','Estado moldes','moldes'),
  ('btn_buscar_molde','Buscar molde','moldes'),
  ('btn_historial_molde','Historial molde','moldes'),
  ('btn_mandar_reparacion','Mandar a reparación','reparacion'),
  ('btn_moldes_reparacion','Moldes en reparación','reparacion'),
  ('btn_validar_reparacion','Validar reparación','reparacion'),
  ('btn_cambiar_estado','Cambiar estado','acciones'),
  ('btn_panel_admin','Panel admin','admin'),
  ('btn_usuarios','Usuarios','admin'),
  ('btn_estadisticas','Estadísticas','admin'),
  ('btn_permisos_puesto','Permisos por puesto','admin'),
  ('btn_exportar','Exportar','acciones'),
  ('btn_filtros','Filtros','acciones'),
  ('btn_ver_foto','Ver foto','acciones'),
  ('btn_eliminar_incidencia','Eliminar incidencia','acciones'),
  ('btn_editar_incidencia','Editar incidencia','acciones')
),
scopes(scope) AS (VALUES ('preparacion_molde'),('desmoldeo'),('repaso'),('valvula'),('empaquetado'),('reparacion_moldes'),('encargado'))
INSERT INTO public.permisos_puesto_botones (scope, button_id, button_name, categoria, visible)
SELECT s.scope, b.button_id, b.button_name, b.categoria, false FROM scopes s CROSS JOIN buttons b;

ALTER TABLE public.permisos_puesto_botones REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.permisos_puesto_botones;

CREATE POLICY "Staff delete incidencias" ON public.incidencias FOR DELETE TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Users delete own incidencias" ON public.incidencias FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER TABLE public.reparaciones ADD COLUMN IF NOT EXISTS usuario_repara uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.historial_estado_molde (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  molde text NOT NULL,
  estado_anterior public.estado_molde,
  estado_nuevo public.estado_molde NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_historial_estado_molde_lower ON public.historial_estado_molde (lower(molde));
CREATE INDEX IF NOT EXISTS idx_historial_estado_molde_created ON public.historial_estado_molde (created_at DESC);
ALTER TABLE public.historial_estado_molde ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read historial estado" ON public.historial_estado_molde FOR SELECT TO authenticated USING (true);
CREATE POLICY "Preparacion o admin insert historial estado" ON public.historial_estado_molde FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND (public.has_role(auth.uid(), 'administrador') OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.puesto = 'preparacion_molde')));

CREATE TABLE public.incidencias_producto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  puesto public.puesto_trabajo,
  descripcion text NOT NULL, transcripcion text, motivo_corto text, molde text, pedido text,
  foto_url text, foto_nombre text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.incidencias_producto ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated insert own incidencias_producto" ON public.incidencias_producto FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users view own incidencias_producto" ON public.incidencias_producto FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Staff view all incidencias_producto" ON public.incidencias_producto FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff update incidencias_producto" ON public.incidencias_producto FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff delete incidencias_producto" ON public.incidencias_producto FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));
CREATE TRIGGER update_incidencias_producto_updated_at BEFORE UPDATE ON public.incidencias_producto FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.permisos_puesto_botones (scope, button_id, button_name, categoria, visible)
SELECT scope, 'btn_incidencias_producto', 'Incidencias de producto', 'incidencia', false
FROM (VALUES ('preparacion_molde'),('desmoldeo'),('repaso'),('valvula'),('empaquetado'),('reparacion_moldes'),('encargado')) AS s(scope)
ON CONFLICT (scope, button_id) DO NOTHING;

CREATE TYPE public.estado_oficial_molde AS ENUM ('ok','seguir_produccion','observacion','mandar_reparacion','en_reparacion','reparado','descartado');
CREATE TYPE public.picada_resultado AS ENUM ('fabricacion_autorizada','fabricacion_con_aviso','fabricacion_bloqueada','incidencia_registrada','recomendacion_registrada','enviado_reparacion');

CREATE TABLE public.moldes_maestro (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_molde text NOT NULL UNIQUE,
  modelo text, medida text, codigo_rfid_futuro text, notas text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.moldes_maestro ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read moldes_maestro" ON public.moldes_maestro FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin/preparacion insert moldes_maestro" ON public.moldes_maestro FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'administrador') OR EXISTS(SELECT 1 FROM profiles p WHERE p.id=auth.uid() AND p.puesto='preparacion_molde'));
CREATE POLICY "admin/preparacion update moldes_maestro" ON public.moldes_maestro FOR UPDATE TO authenticated USING (has_role(auth.uid(),'administrador') OR EXISTS(SELECT 1 FROM profiles p WHERE p.id=auth.uid() AND p.puesto='preparacion_molde'));
CREATE POLICY "admin/preparacion delete moldes_maestro" ON public.moldes_maestro FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'administrador'::app_role) OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.puesto = 'preparacion_molde'::puesto_trabajo));

CREATE TABLE public.estado_actual_molde (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_molde text NOT NULL UNIQUE,
  estado_actual public.estado_oficial_molde NOT NULL DEFAULT 'ok',
  puede_fabricar boolean NOT NULL DEFAULT true,
  restriccion_color text, recomendacion_actual text,
  incidencia_activa_id uuid, decidido_por_usuario_id uuid, decidido_por_nombre text,
  fecha_decision timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.estado_actual_molde ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read estado_actual_molde" ON public.estado_actual_molde FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin/preparacion insert estado_actual_molde" ON public.estado_actual_molde FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'administrador') OR EXISTS(SELECT 1 FROM profiles p WHERE p.id=auth.uid() AND p.puesto='preparacion_molde'));
CREATE POLICY "admin/preparacion update estado_actual_molde" ON public.estado_actual_molde FOR UPDATE TO authenticated USING (has_role(auth.uid(),'administrador') OR EXISTS(SELECT 1 FROM profiles p WHERE p.id=auth.uid() AND p.puesto='preparacion_molde'));
CREATE TRIGGER trg_estado_actual_molde_updated BEFORE UPDATE ON public.estado_actual_molde FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.recomendaciones_molde (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_molde text NOT NULL,
  usuario_id uuid NOT NULL, usuario_nombre text NOT NULL,
  puesto public.puesto_trabajo,
  recomendacion text NOT NULL, texto_original text, foto_url text,
  incidencia_relacionada_id uuid,
  fecha_hora timestamptz NOT NULL DEFAULT now(),
  revisada boolean NOT NULL DEFAULT false,
  revisada_por uuid, fecha_revision timestamptz
);
ALTER TABLE public.recomendaciones_molde ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read recomendaciones_molde" ON public.recomendaciones_molde FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert own recomendaciones_molde" ON public.recomendaciones_molde FOR INSERT TO authenticated WITH CHECK (auth.uid() = usuario_id);
CREATE POLICY "admin/preparacion update recomendaciones_molde" ON public.recomendaciones_molde FOR UPDATE TO authenticated USING (has_role(auth.uid(),'administrador') OR EXISTS(SELECT 1 FROM profiles p WHERE p.id=auth.uid() AND p.puesto='preparacion_molde'));

CREATE TABLE public.picadas_of (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_of text NOT NULL, modelo text, medida text, color text,
  numero_molde text NOT NULL,
  usuario_id uuid NOT NULL, usuario_nombre text NOT NULL,
  puesto public.puesto_trabajo,
  fecha_hora timestamptz NOT NULL DEFAULT now(),
  estado_molde_en_momento public.estado_oficial_molde,
  puede_fabricar boolean,
  tenia_incidencia_activa boolean DEFAULT false,
  resultado public.picada_resultado NOT NULL,
  incidencia_id uuid, recomendacion_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.picadas_of ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own picadas_of" ON public.picadas_of FOR SELECT TO authenticated USING (auth.uid() = usuario_id);
CREATE POLICY "staff view all picadas_of" ON public.picadas_of FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "auth insert own picadas_of" ON public.picadas_of FOR INSERT TO authenticated WITH CHECK (auth.uid() = usuario_id);
CREATE INDEX idx_picadas_of_molde ON public.picadas_of(numero_molde);
CREATE INDEX idx_picadas_of_of ON public.picadas_of(numero_of);
CREATE INDEX idx_recomendaciones_molde_molde ON public.recomendaciones_molde(numero_molde);

INSERT INTO public.permisos_puesto_botones (button_id, button_name, categoria, scope, visible) VALUES
  ('btn_picar_of','Picar OF','incidencia','preparacion_molde',true),
  ('btn_picar_of','Picar OF','incidencia','desmoldeo',true),
  ('btn_picar_of','Picar OF','incidencia','repaso',false),
  ('btn_picar_of','Picar OF','incidencia','valvula',false),
  ('btn_picar_of','Picar OF','incidencia','empaquetado',false),
  ('btn_picar_of','Picar OF','incidencia','reparacion_moldes',false),
  ('btn_picar_of','Picar OF','incidencia','encargado',true);

DROP POLICY IF EXISTS "Authenticated can view all profiles" ON public.profiles;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Staff view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'administrador'::app_role) THEN RETURN NEW; END IF;
  IF NEW.puesto IS DISTINCT FROM OLD.puesto OR NEW.activo IS DISTINCT FROM OLD.activo
     OR NEW.puede_ver_moldes IS DISTINCT FROM OLD.puede_ver_moldes
     OR NEW.puede_ver_historial IS DISTINCT FROM OLD.puede_ver_historial
     OR NEW.puede_crear_incidencias IS DISTINCT FROM OLD.puede_crear_incidencias
     OR NEW.email IS DISTINCT FROM OLD.email OR NEW.id IS DISTINCT FROM OLD.id
  THEN RAISE EXCEPTION 'No puedes modificar tus permisos, puesto, email o estado activo.'; END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_prevent_profile_privilege_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_privilege_escalation BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;

DO $$ BEGIN CREATE TYPE public.fabricacion_resultado AS ENUM ('fabricacion_ok','fabricacion_con_incidencia','fabricacion_con_observacion','enviado_reparacion'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.molde_modelos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_molde text NOT NULL, modelo text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (numero_molde, modelo)
);
CREATE INDEX IF NOT EXISTS idx_molde_modelos_numero ON public.molde_modelos(numero_molde);
CREATE INDEX IF NOT EXISTS idx_molde_modelos_modelo ON public.molde_modelos(modelo);
ALTER TABLE public.molde_modelos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read molde_modelos" ON public.molde_modelos FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin/preparacion insert molde_modelos" ON public.molde_modelos FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'administrador'::app_role) OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.puesto = 'preparacion_molde'::puesto_trabajo));
CREATE POLICY "admin/preparacion delete molde_modelos" ON public.molde_modelos FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'administrador'::app_role) OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.puesto = 'preparacion_molde'::puesto_trabajo));

ALTER TABLE public.reparaciones
  ADD COLUMN IF NOT EXISTS numero_of text,
  ADD COLUMN IF NOT EXISTS foto_url_2 text,
  ADD COLUMN IF NOT EXISTS foto_nombre_2 text;

CREATE TABLE IF NOT EXISTS public.fabricaciones_of (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_of text NOT NULL, modelo text, medida text, color text,
  numero_molde text NOT NULL,
  usuario_id uuid NOT NULL, usuario_nombre text NOT NULL,
  puesto public.puesto_trabajo,
  fecha_hora timestamptz NOT NULL DEFAULT now(),
  resultado public.fabricacion_resultado NOT NULL,
  texto_incidencia text, observacion text,
  incidencia_id uuid, reparacion_id uuid,
  eliminada boolean NOT NULL DEFAULT false,
  eliminada_at timestamptz, eliminada_por uuid, eliminada_por_nombre text, motivo_eliminacion text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fab_of_molde ON public.fabricaciones_of(numero_molde);
CREATE INDEX IF NOT EXISTS idx_fab_of_of ON public.fabricaciones_of(numero_of);
CREATE INDEX IF NOT EXISTS idx_fab_of_user ON public.fabricaciones_of(usuario_id);
CREATE INDEX IF NOT EXISTS idx_fabricaciones_of_eliminada ON public.fabricaciones_of(eliminada);
ALTER TABLE public.fabricaciones_of ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own fabricaciones_of" ON public.fabricaciones_of FOR SELECT TO authenticated USING (auth.uid() = usuario_id);
CREATE POLICY "staff view all fabricaciones_of" ON public.fabricaciones_of FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "auth insert own fabricaciones_of" ON public.fabricaciones_of FOR INSERT TO authenticated WITH CHECK (auth.uid() = usuario_id);
CREATE POLICY "staff/preparacion update fabricaciones_of" ON public.fabricaciones_of FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.puesto = 'preparacion_molde'));

INSERT INTO public.permisos_puesto_botones (scope, button_id, button_name, categoria, visible)
SELECT s.scope, 'btn_gestion_moldes', 'Gestión de moldes', 'admin',
  CASE WHEN s.scope IN ('preparacion_molde','encargado') THEN true ELSE false END
FROM (VALUES ('preparacion_molde'),('desmoldeo'),('repaso'),('valvula'),('empaquetado'),('reparacion_moldes'),('encargado')) AS s(scope)
ON CONFLICT DO NOTHING;

INSERT INTO public.permisos_puesto_botones (scope, button_id, button_name, categoria, visible)
SELECT s, 'btn_of_fabricadas', 'OF fabricadas', 'acciones',
  CASE WHEN s IN ('encargado','preparacion_molde') THEN true ELSE false END
FROM unnest(ARRAY['preparacion_molde','desmoldeo','repaso','valvula','empaquetado','reparacion_moldes','encargado']) AS s
ON CONFLICT DO NOTHING;

INSERT INTO public.permisos_puesto_botones (scope, button_id, button_name, categoria, visible)
SELECT s, 'btn_cambiar_molde_of', 'Cambiar molde de OF', 'acciones',
  CASE WHEN s IN ('encargado','preparacion_molde') THEN true ELSE false END
FROM unnest(ARRAY['preparacion_molde','desmoldeo','repaso','valvula','empaquetado','reparacion_moldes','encargado']) AS s
ON CONFLICT DO NOTHING;

INSERT INTO public.permisos_puesto_botones (scope, categoria, button_id, button_name, visible)
SELECT s.scope, 'of', 'borrar_of', 'Borrar OF', false
FROM (VALUES ('preparacion_molde'),('desmoldeo'),('repaso'),('valvula'),('empaquetado'),('reparacion_moldes')) AS s(scope)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.historial_cambios_of (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fabricacion_of_id uuid NOT NULL,
  numero_of text NOT NULL, molde_anterior text, molde_nuevo text NOT NULL, motivo_cambio text NOT NULL,
  usuario_id uuid NOT NULL, usuario_nombre text NOT NULL,
  puesto puesto_trabajo,
  fecha_hora timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_historial_cambios_of_fabricacion ON public.historial_cambios_of (fabricacion_of_id);
CREATE INDEX IF NOT EXISTS idx_historial_cambios_of_numero ON public.historial_cambios_of (numero_of);
ALTER TABLE public.historial_cambios_of ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff view all historial_cambios_of" ON public.historial_cambios_of FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "users view own historial_cambios_of" ON public.historial_cambios_of FOR SELECT TO authenticated USING (auth.uid() = usuario_id);
CREATE POLICY "auth insert own historial_cambios_of" ON public.historial_cambios_of FOR INSERT TO authenticated WITH CHECK (auth.uid() = usuario_id);