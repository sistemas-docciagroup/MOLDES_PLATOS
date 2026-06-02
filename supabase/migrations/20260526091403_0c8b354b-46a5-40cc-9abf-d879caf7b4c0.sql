CREATE TYPE public.incidencia_estado AS ENUM ('pendiente', 'reparado', 'descartado');

CREATE TABLE public.incidencias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  molde TEXT,
  descripcion TEXT NOT NULL,
  transcripcion TEXT NOT NULL,
  estado public.incidencia_estado NOT NULL DEFAULT 'pendiente',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.incidencias ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_incidencias_created_at ON public.incidencias(created_at DESC);
CREATE INDEX idx_incidencias_estado ON public.incidencias(estado);

CREATE TYPE public.app_role AS ENUM ('operario', 'encargado', 'administrador');
CREATE TYPE public.puesto_trabajo AS ENUM ('preparacion_molde', 'desmoldeo', 'repaso', 'valvula', 'empaquetado');
CREATE TYPE public.gravedad AS ENUM ('baja', 'media', 'alta');
CREATE TYPE public.reparacion_estado AS ENUM ('en_reparacion', 'reparado', 'descartado');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  puesto public.puesto_trabajo NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('encargado','administrador'));
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Authenticated can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'administrador'));
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'administrador'));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'administrador'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'administrador'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre, email, puesto)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'puesto')::public.puesto_trabajo, 'preparacion_molde')
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'operario');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE public.incidencias
  ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN puesto public.puesto_trabajo,
  ADD COLUMN gravedad public.gravedad NOT NULL DEFAULT 'media',
  ADD COLUMN zona TEXT,
  ADD COLUMN motivo_corto TEXT,
  ADD COLUMN foto_url TEXT,
  ADD COLUMN foto_nombre TEXT,
  ADD COLUMN foto_subida_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_incidencias_user_id ON public.incidencias(user_id);
CREATE INDEX IF NOT EXISTS idx_incidencias_puesto ON public.incidencias(puesto);

CREATE POLICY "Operarios view own incidencias" ON public.incidencias FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Staff view all incidencias" ON public.incidencias FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Authenticated insert own incidencias" ON public.incidencias FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Staff update incidencias" ON public.incidencias FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));

CREATE TABLE public.reparaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  molde TEXT NOT NULL,
  motivo_corto TEXT,
  descripcion TEXT NOT NULL,
  transcripcion TEXT,
  foto_url TEXT,
  foto_nombre TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  puesto public.puesto_trabajo NOT NULL DEFAULT 'preparacion_molde',
  gravedad public.gravedad NOT NULL DEFAULT 'media',
  estado public.reparacion_estado NOT NULL DEFAULT 'en_reparacion',
  fecha_envio TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_cierre TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reparaciones ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_reparaciones_estado ON public.reparaciones(estado);
CREATE INDEX idx_reparaciones_user_id ON public.reparaciones(user_id);

CREATE TRIGGER trg_reparaciones_updated_at
BEFORE UPDATE ON public.reparaciones
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Operarios view own reparaciones" ON public.reparaciones FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Staff view all reparaciones" ON public.reparaciones FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Preparacion users insert reparaciones" ON public.reparaciones FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.puesto = 'preparacion_molde')
);
CREATE POLICY "Staff update reparaciones" ON public.reparaciones FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));

INSERT INTO storage.buckets (id, name, public) VALUES ('incidencias-fotos', 'incidencias-fotos', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read incidencia photos" ON storage.objects FOR SELECT USING (bucket_id = 'incidencias-fotos');
CREATE POLICY "Authenticated upload to own folder" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'incidencias-fotos' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Authenticated delete own photos" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'incidencias-fotos' AND auth.uid()::text = (storage.foldername(name))[1]
);