
ALTER TABLE public.profiles ALTER COLUMN puesto DROP NOT NULL;

ALTER TABLE public.reparaciones ADD COLUMN IF NOT EXISTS descripcion_reparacion text;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, nombre, email, puesto)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
    NEW.email,
    NULLIF(NEW.raw_user_meta_data->>'puesto', '')::public.puesto_trabajo
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'operario')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $function$;

CREATE POLICY "Reparacion users update reparaciones"
ON public.reparaciones
FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.puesto = 'reparacion_moldes')
);

CREATE POLICY "Reparacion users view reparaciones"
ON public.reparaciones
FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.puesto = 'reparacion_moldes')
);
