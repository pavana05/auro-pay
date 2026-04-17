-- Rate limit table for teen phone lookups
CREATE TABLE public.teen_lookup_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_teen_lookup_log_user_time ON public.teen_lookup_log (user_id, created_at DESC);

ALTER TABLE public.teen_lookup_log ENABLE ROW LEVEL SECURITY;

-- No client-side access; only the SECURITY DEFINER RPC writes/reads it.
CREATE POLICY "Admins can view lookup log"
  ON public.teen_lookup_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Update the RPC to enforce 10 calls/min per authenticated user
CREATE OR REPLACE FUNCTION public.lookup_teen_by_phone(_phone text)
RETURNS TABLE(id uuid, full_name text, avatar_url text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_recent_count int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  -- Count calls in the last 60 seconds
  SELECT COUNT(*) INTO v_recent_count
  FROM public.teen_lookup_log
  WHERE user_id = v_uid
    AND created_at >= now() - interval '1 minute';

  IF v_recent_count >= 10 THEN
    RAISE EXCEPTION 'Too many lookups. Try again in a minute.' USING ERRCODE = 'P0001';
  END IF;

  -- Log this attempt (note: STABLE function can still INSERT via SECURITY DEFINER)
  INSERT INTO public.teen_lookup_log (user_id) VALUES (v_uid);

  -- Opportunistic cleanup: delete rows older than 1 hour for this user (~5% chance)
  IF random() < 0.05 THEN
    DELETE FROM public.teen_lookup_log
    WHERE user_id = v_uid AND created_at < now() - interval '1 hour';
  END IF;

  RETURN QUERY
  SELECT p.id, p.full_name, p.avatar_url
  FROM public.profiles p
  WHERE p.phone = _phone
    AND p.role = 'teen'
  LIMIT 1;
END;
$function$;