ALTER TABLE public.permisos_puesto_botones REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.permisos_puesto_botones;