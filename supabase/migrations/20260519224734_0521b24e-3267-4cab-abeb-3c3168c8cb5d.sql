
-- Enums
CREATE TYPE public.estado_oficial_molde AS ENUM (
  'ok','seguir_produccion','observacion','mandar_reparacion','en_reparacion','reparado','descartado'
);

CREATE TYPE public.picada_resultado AS ENUM (
  'fabricacion_autorizada','fabricacion_con_aviso','fabricacion_bloqueada',
  'incidencia_registrada','recomendacion_registrada','enviado_reparacion'
);

-- moldes_maestro
CREATE TABLE public.moldes_maestro (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_molde text NOT NULL UNIQUE,
  modelo text NOT NULL,
  medida text NOT NULL,
  codigo_rfid_futuro text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.moldes_maestro ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read moldes_maestro" ON public.moldes_maestro
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin/preparacion insert moldes_maestro" ON public.moldes_maestro
  FOR INSERT TO authenticated WITH CHECK (
    has_role(auth.uid(),'administrador') OR
    EXISTS(SELECT 1 FROM profiles p WHERE p.id=auth.uid() AND p.puesto='preparacion_molde')
  );

CREATE POLICY "admin/preparacion update moldes_maestro" ON public.moldes_maestro
  FOR UPDATE TO authenticated USING (
    has_role(auth.uid(),'administrador') OR
    EXISTS(SELECT 1 FROM profiles p WHERE p.id=auth.uid() AND p.puesto='preparacion_molde')
  );

-- estado_actual_molde
CREATE TABLE public.estado_actual_molde (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_molde text NOT NULL UNIQUE,
  estado_actual public.estado_oficial_molde NOT NULL DEFAULT 'ok',
  puede_fabricar boolean NOT NULL DEFAULT true,
  restriccion_color text,
  recomendacion_actual text,
  incidencia_activa_id uuid,
  decidido_por_usuario_id uuid,
  decidido_por_nombre text,
  fecha_decision timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.estado_actual_molde ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read estado_actual_molde" ON public.estado_actual_molde
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin/preparacion insert estado_actual_molde" ON public.estado_actual_molde
  FOR INSERT TO authenticated WITH CHECK (
    has_role(auth.uid(),'administrador') OR
    EXISTS(SELECT 1 FROM profiles p WHERE p.id=auth.uid() AND p.puesto='preparacion_molde')
  );

CREATE POLICY "admin/preparacion update estado_actual_molde" ON public.estado_actual_molde
  FOR UPDATE TO authenticated USING (
    has_role(auth.uid(),'administrador') OR
    EXISTS(SELECT 1 FROM profiles p WHERE p.id=auth.uid() AND p.puesto='preparacion_molde')
  );

CREATE TRIGGER trg_estado_actual_molde_updated
  BEFORE UPDATE ON public.estado_actual_molde
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- recomendaciones_molde
CREATE TABLE public.recomendaciones_molde (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_molde text NOT NULL,
  usuario_id uuid NOT NULL,
  usuario_nombre text NOT NULL,
  puesto public.puesto_trabajo,
  recomendacion text NOT NULL,
  texto_original text,
  foto_url text,
  incidencia_relacionada_id uuid,
  fecha_hora timestamptz NOT NULL DEFAULT now(),
  revisada boolean NOT NULL DEFAULT false,
  revisada_por uuid,
  fecha_revision timestamptz
);
ALTER TABLE public.recomendaciones_molde ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read recomendaciones_molde" ON public.recomendaciones_molde
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth insert own recomendaciones_molde" ON public.recomendaciones_molde
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "admin/preparacion update recomendaciones_molde" ON public.recomendaciones_molde
  FOR UPDATE TO authenticated USING (
    has_role(auth.uid(),'administrador') OR
    EXISTS(SELECT 1 FROM profiles p WHERE p.id=auth.uid() AND p.puesto='preparacion_molde')
  );

-- picadas_of
CREATE TABLE public.picadas_of (
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
  estado_molde_en_momento public.estado_oficial_molde,
  puede_fabricar boolean,
  tenia_incidencia_activa boolean DEFAULT false,
  resultado public.picada_resultado NOT NULL,
  incidencia_id uuid,
  recomendacion_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.picadas_of ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own picadas_of" ON public.picadas_of
  FOR SELECT TO authenticated USING (auth.uid() = usuario_id);

CREATE POLICY "staff view all picadas_of" ON public.picadas_of
  FOR SELECT TO authenticated USING (is_staff(auth.uid()));

CREATE POLICY "auth insert own picadas_of" ON public.picadas_of
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = usuario_id);

CREATE INDEX idx_picadas_of_molde ON public.picadas_of(numero_molde);
CREATE INDEX idx_picadas_of_of ON public.picadas_of(numero_of);
CREATE INDEX idx_recomendaciones_molde_molde ON public.recomendaciones_molde(numero_molde);

-- Seed catálogo demo
INSERT INTO public.moldes_maestro (numero_molde, modelo, medida) VALUES
  ('M-1001','Plato Stone','120x70'),
  ('M-2001','Plato Slate','140x80'),
  ('M-3001','Plato Liso','160x90');

INSERT INTO public.estado_actual_molde (numero_molde, estado_actual, puede_fabricar) VALUES
  ('M-1001','ok',true),
  ('M-2001','ok',true),
  ('M-3001','ok',true);

-- Permisos del botón nuevo btn_picar_of
INSERT INTO public.permisos_puesto_botones (button_id, button_name, categoria, scope, visible) VALUES
  ('btn_picar_of','Picar OF','incidencia','preparacion_molde',true),
  ('btn_picar_of','Picar OF','incidencia','desmoldeo',true),
  ('btn_picar_of','Picar OF','incidencia','repaso',false),
  ('btn_picar_of','Picar OF','incidencia','valvula',false),
  ('btn_picar_of','Picar OF','incidencia','empaquetado',false),
  ('btn_picar_of','Picar OF','incidencia','reparacion_moldes',false),
  ('btn_picar_of','Picar OF','incidencia','encargado',true);
