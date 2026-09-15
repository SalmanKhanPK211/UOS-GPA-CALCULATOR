GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.handle_new_user_role() TO supabase_auth_admin;

-- Backfill profiles for any existing users missing one (e.g. Google sign-ins)
INSERT INTO public.profiles (id, first_name, last_name, email, department, contact_number)
SELECT u.id,
       COALESCE(u.raw_user_meta_data->>'first_name', split_part(COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', ''), ' ', 1), NULL),
       COALESCE(u.raw_user_meta_data->>'last_name', NULLIF(split_part(COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', ''), ' ', 2), ''), NULL),
       u.email,
       u.raw_user_meta_data->>'department',
       u.raw_user_meta_data->>'contact_number'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Backfill roles: keep existing admin, everyone else gets 'user'
INSERT INTO public.user_roles (user_id, role)
SELECT u.id,
       CASE WHEN NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin')
                 AND u.id = (SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1)
            THEN 'admin'::app_role ELSE 'user'::app_role END
FROM auth.users u
LEFT JOIN public.user_roles r ON r.user_id = u.id
WHERE r.user_id IS NULL
ON CONFLICT DO NOTHING;