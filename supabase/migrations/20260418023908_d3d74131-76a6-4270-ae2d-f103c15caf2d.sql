-- Block new auth.users inserts when admin has flipped disable_new_signups=true
CREATE OR REPLACE FUNCTION public.enforce_signup_disabled()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_disabled text;
BEGIN
  SELECT value INTO v_disabled FROM public.app_settings WHERE key = 'disable_new_signups';
  IF v_disabled = 'true' THEN
    RAISE EXCEPTION 'New signups are temporarily disabled by administrators.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_signup_disabled_trigger ON auth.users;
CREATE TRIGGER enforce_signup_disabled_trigger
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_signup_disabled();