INSERT INTO public.user_roles (user_id, role)
VALUES ('6227a0d4-13fe-4c76-bb29-2a5dc1ffb6db', 'administrador')
ON CONFLICT (user_id, role) DO NOTHING;