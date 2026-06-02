INSERT INTO public.user_roles (user_id, role)
SELECT id, 'administrador'::app_role FROM public.profiles WHERE email = 'alfonsop@docciagroup.com'
ON CONFLICT DO NOTHING;