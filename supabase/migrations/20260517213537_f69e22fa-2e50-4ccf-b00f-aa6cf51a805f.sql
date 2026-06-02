-- 1. Tabla nueva para incidencias de producto (no afectan a moldes)
CREATE TABLE public.incidencias_producto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  puesto public.puesto_trabajo,
  descripcion text NOT NULL,
  transcripcion text,
  motivo_corto text,
  molde text,
  pedido text,
  foto_url text,
  foto_nombre text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.incidencias_producto ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated insert own incidencias_producto"
  ON public.incidencias_producto FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own incidencias_producto"
  ON public.incidencias_producto FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Staff view all incidencias_producto"
  ON public.incidencias_producto FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff update incidencias_producto"
  ON public.incidencias_producto FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff delete incidencias_producto"
  ON public.incidencias_producto FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE TRIGGER update_incidencias_producto_updated_at
  BEFORE UPDATE ON public.incidencias_producto
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Registrar el botón nuevo en permisos_puesto_botones (visible=false por defecto para cada scope)
INSERT INTO public.permisos_puesto_botones (scope, button_id, button_name, categoria, visible)
SELECT scope, 'btn_incidencias_producto', 'Incidencias de producto', 'incidencia', false
FROM (VALUES
  ('preparacion_molde'),('desmoldeo'),('repaso'),('valvula'),
  ('empaquetado'),('reparacion_moldes'),('encargado')
) AS s(scope)
ON CONFLICT (scope, button_id) DO NOTHING;