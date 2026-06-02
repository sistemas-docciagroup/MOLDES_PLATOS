-- Create user in auth.users; trigger handle_new_user will create profile + operario role
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'alfonsop@docciagroup.com',
  crypt('Alfonsito91##', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"nombre":"Alfonso","puesto":"preparacion_molde"}'::jsonb,
  '', '', '', ''
);

-- Promote to administrador
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'administrador'::app_role
FROM auth.users
WHERE email = 'alfonsop@docciagroup.com'
ON CONFLICT (user_id, role) DO NOTHING;