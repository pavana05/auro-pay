-- 1. Drop the broad policy added previously
DROP POLICY IF EXISTS "Authenticated can lookup profile by phone" ON public.profiles;

-- 2. Narrow SECURITY DEFINER lookup function:
--    Returns ONLY id/full_name/avatar_url for teen profiles matching the phone.
CREATE OR REPLACE FUNCTION public.lookup_teen_by_phone(_phone text)
RETURNS TABLE (
  id uuid,
  full_name text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.avatar_url
  FROM public.profiles p
  WHERE p.phone = _phone
    AND p.role = 'teen'
  LIMIT 1;
$$;

-- 3. Only authenticated users can call it (anon cannot probe phone numbers)
REVOKE ALL ON FUNCTION public.lookup_teen_by_phone(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lookup_teen_by_phone(text) TO authenticated;
