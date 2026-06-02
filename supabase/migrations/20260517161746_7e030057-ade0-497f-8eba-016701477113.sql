
ALTER TABLE public.reparaciones
  ADD COLUMN IF NOT EXISTS usuario_repara uuid REFERENCES auth.users(id) ON DELETE SET NULL;

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

CREATE POLICY "Authenticated read historial estado"
  ON public.historial_estado_molde FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Preparacion o admin insert historial estado"
  ON public.historial_estado_molde FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND (
      public.has_role(auth.uid(), 'administrador'::public.app_role)
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.puesto = 'preparacion_molde'::public.puesto_trabajo)
    )
  );
