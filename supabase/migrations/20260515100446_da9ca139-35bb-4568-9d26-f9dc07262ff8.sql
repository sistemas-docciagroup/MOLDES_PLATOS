INSERT INTO public.user_roles (user_id, role)
SELECT id, 'administrador'::public.app_role
FROM public.profiles
WHERE email = 'alfonsop@docciagroup.com'
ON CONFLICT (user_id, role) DO NOTHING;