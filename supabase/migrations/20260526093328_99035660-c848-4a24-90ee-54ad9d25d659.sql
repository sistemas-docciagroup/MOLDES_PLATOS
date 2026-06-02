CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Bypass para service role (operaciones server-side con supabaseAdmin)
  IF auth.uid() IS NULL OR current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;
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