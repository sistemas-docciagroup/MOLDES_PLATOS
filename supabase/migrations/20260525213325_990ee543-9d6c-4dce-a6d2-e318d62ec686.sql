
-- Tabla OF <-> molde asignado
CREATE TABLE IF NOT EXISTS public.of_molde_asignado (
  numero_of text PRIMARY KEY,
  numero_molde text NOT NULL,
  modelo text,
  medida text,
  color text,
  asignado_por_id uuid,
  asignado_por_nombre text,
  puesto puesto_trabajo,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.of_molde_asignado ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read of_molde_asignado"
  ON public.of_molde_asignado FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "admin/preparacion insert of_molde_asignado"
  ON public.of_molde_asignado FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'administrador'::app_role)
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.puesto = 'preparacion_molde'::puesto_trabajo
    )
  );

CREATE POLICY "admin/preparacion update of_molde_asignado"
  ON public.of_molde_asignado FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'administrador'::app_role)
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.puesto = 'preparacion_molde'::puesto_trabajo
    )
  );

CREATE TRIGGER tg_of_molde_asignado_updated
  BEFORE UPDATE ON public.of_molde_asignado
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_of_molde_asignado_numero_molde
  ON public.of_molde_asignado(numero_molde);

-- Tabla alertas vistas por usuario
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

CREATE POLICY "users read own alertas_vistas"
  ON public.alertas_vistas FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "users insert own alertas_vistas"
  ON public.alertas_vistas FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_alertas_vistas_user_molde
  ON public.alertas_vistas(user_id, numero_molde);
