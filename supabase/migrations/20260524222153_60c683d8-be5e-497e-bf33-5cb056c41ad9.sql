-- Add flujo_picar column to profiles to distinguish workflow after picking OF
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS flujo_picar text NOT NULL DEFAULT 'moldes';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_flujo_picar_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_flujo_picar_check
  CHECK (flujo_picar IN ('moldes', 'producto'));

-- Default existing users by puesto: abajo (repaso, valvula, empaquetado, desmoldeo) -> producto
UPDATE public.profiles
   SET flujo_picar = 'producto'
 WHERE puesto IN ('repaso', 'valvula', 'empaquetado', 'desmoldeo')
   AND flujo_picar = 'moldes';

-- Protect against privilege escalation: prevent non-admins from changing their own flujo_picar
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF public.has_role(auth.uid(), 'administrador'::app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.puesto IS DISTINCT FROM OLD.puesto
     OR NEW.activo IS DISTINCT FROM OLD.activo
     OR NEW.puede_ver_moldes IS DISTINCT FROM OLD.puede_ver_moldes
     OR NEW.puede_ver_historial IS DISTINCT FROM OLD.puede_ver_historial
     OR NEW.puede_crear_incidencias IS DISTINCT FROM OLD.puede_crear_incidencias
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.id IS DISTINCT FROM OLD.id
     OR NEW.flujo_picar IS DISTINCT FROM OLD.flujo_picar
  THEN
    RAISE EXCEPTION 'No puedes modificar tus permisos, puesto, email, flujo o estado activo.';
  END IF;

  RETURN NEW;
END;
$function$;