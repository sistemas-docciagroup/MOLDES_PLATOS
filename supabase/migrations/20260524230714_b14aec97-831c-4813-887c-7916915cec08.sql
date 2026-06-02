
-- ===== Recomendaciones de bloqueo de canal (básico/delicado) =====

CREATE TYPE public.recomendacion_bloqueo_canal AS ENUM ('basicos', 'delicados', 'ambos');
CREATE TYPE public.recomendacion_bloqueo_estado AS ENUM ('pendiente', 'aceptada', 'rechazada');

CREATE TABLE public.recomendaciones_bloqueo (
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

CREATE INDEX idx_recomendaciones_bloqueo_estado ON public.recomendaciones_bloqueo (estado);
CREATE INDEX idx_recomendaciones_bloqueo_molde ON public.recomendaciones_bloqueo (numero_molde);

ALTER TABLE public.recomendaciones_bloqueo ENABLE ROW LEVEL SECURITY;

-- Lectura para todos los autenticados (necesario para que cualquier puesto vea sus propias enviadas
-- y para que quienes revisan vean el listado completo)
CREATE POLICY "auth read recomendaciones_bloqueo"
  ON public.recomendaciones_bloqueo
  FOR SELECT TO authenticated
  USING (true);

-- Insert: solo el propio usuario
CREATE POLICY "auth insert own recomendaciones_bloqueo"
  ON public.recomendaciones_bloqueo
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = usuario_id);

-- Update: staff/preparacion (los que revisan). Igual que recomendaciones_molde.
CREATE POLICY "admin/preparacion update recomendaciones_bloqueo"
  ON public.recomendaciones_bloqueo
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'administrador'::app_role)
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.puesto = 'preparacion_molde'::puesto_trabajo)
  );

-- Trigger updated_at
CREATE TRIGGER update_recomendaciones_bloqueo_updated_at
BEFORE UPDATE ON public.recomendaciones_bloqueo
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== Sembrar los nuevos botones en permisos_puesto_botones =====
-- Botón para crear (operarios) y para revisar (staff)

INSERT INTO public.permisos_puesto_botones (scope, button_id, button_name, categoria, visible)
SELECT s.scope, 'btn_bloquear_canal', 'Bloquear básico/delicado', 'acciones',
       CASE WHEN s.scope IN ('preparacion_molde','encargado') THEN true ELSE false END
FROM (VALUES
  ('preparacion_molde'),('desmoldeo'),('repaso'),('valvula'),
  ('empaquetado'),('reparacion_moldes'),('encargado')
) AS s(scope)
ON CONFLICT DO NOTHING;

INSERT INTO public.permisos_puesto_botones (scope, button_id, button_name, categoria, visible)
SELECT s.scope, 'btn_recomendaciones_bloqueo', 'Recomendaciones de bloqueo', 'acciones',
       CASE WHEN s.scope IN ('preparacion_molde','encargado') THEN true ELSE false END
FROM (VALUES
  ('preparacion_molde'),('desmoldeo'),('repaso'),('valvula'),
  ('empaquetado'),('reparacion_moldes'),('encargado')
) AS s(scope)
ON CONFLICT DO NOTHING;
