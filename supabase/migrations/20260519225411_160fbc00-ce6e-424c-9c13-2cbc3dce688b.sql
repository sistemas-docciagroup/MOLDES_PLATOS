-- 1. Restrict profile reads: a user can read their own profile; staff can read all.
DROP POLICY IF EXISTS "Authenticated can view all profiles" ON public.profiles;

CREATE POLICY "Users view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Staff view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

-- 2. Prevent privilege escalation via self-update of profiles.
-- The existing "Users can update own profile" policy allows users to update their row.
-- A trigger blocks them from changing permission/role-shaped fields unless they are admin.
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  THEN
    RAISE EXCEPTION 'No puedes modificar tus permisos, puesto, email o estado activo.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_privilege_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_privilege_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- 3. Linter: SECURITY DEFINER helpers should not be directly callable as RPC.
-- They keep working inside RLS (executed as owner) but we revoke direct EXECUTE.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM anon, authenticated, public;

-- 4. Lock down realtime.messages so authenticated clients cannot subscribe to
-- arbitrary channel topics. We only publish "permisos_puesto_botones"; an
-- authenticated user listening to that channel via postgres_changes is fine,
-- but raw broadcast/presence on arbitrary topics is denied by default.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'realtime' AND tablename = 'messages'
  ) THEN
    EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Deny all realtime topics by default" ON realtime.messages';
    EXECUTE 'CREATE POLICY "Deny all realtime topics by default" ON realtime.messages FOR SELECT TO authenticated USING (false)';
  END IF;
END $$;
