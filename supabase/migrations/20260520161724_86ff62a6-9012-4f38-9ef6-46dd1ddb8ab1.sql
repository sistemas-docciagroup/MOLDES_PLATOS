
-- Tabla de historial de cambios de molde en fabricaciones
CREATE TABLE IF NOT EXISTS public.historial_cambios_of (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fabricacion_of_id uuid NOT NULL,
  numero_of text NOT NULL,
  molde_anterior text,
  molde_nuevo text NOT NULL,
  motivo_cambio text NOT NULL,
  usuario_id uuid NOT NULL,
  usuario_nombre text NOT NULL,
  puesto puesto_trabajo,
  fecha_hora timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_historial_cambios_of_fabricacion ON public.historial_cambios_of (fabricacion_of_id);
CREATE INDEX IF NOT EXISTS idx_historial_cambios_of_numero ON public.historial_cambios_of (numero_of);

ALTER TABLE public.historial_cambios_of ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff view all historial_cambios_of"
  ON public.historial_cambios_of FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "users view own historial_cambios_of"
  ON public.historial_cambios_of FOR SELECT TO authenticated
  USING (auth.uid() = usuario_id);

CREATE POLICY "auth insert own historial_cambios_of"
  ON public.historial_cambios_of FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = usuario_id);

-- Permitir UPDATE de numero_molde en fabricaciones_of por staff o preparacion_molde
CREATE POLICY "staff/preparacion update fabricaciones_of"
  ON public.fabricaciones_of FOR UPDATE TO authenticated
  USING (
    public.is_staff(auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.puesto = 'preparacion_molde')
  );

-- Seed de los nuevos botones para todos los scopes
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
