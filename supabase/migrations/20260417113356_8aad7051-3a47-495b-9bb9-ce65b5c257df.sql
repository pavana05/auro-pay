-- Waitlist table for AuroPay early access landing page
CREATE TABLE public.waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  city TEXT,
  role TEXT CHECK (role IN ('teen', 'parent', 'both')),
  source TEXT NOT NULL DEFAULT 'landing_page',
  referral_code TEXT UNIQUE,
  referred_by UUID REFERENCES public.waitlist(id) ON DELETE SET NULL,
  is_contacted BOOLEAN NOT NULL DEFAULT FALSE,
  admin_notes TEXT,
  ip_country TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Length & format guards (server-side validation)
ALTER TABLE public.waitlist
  ADD CONSTRAINT waitlist_full_name_len CHECK (char_length(full_name) BETWEEN 1 AND 120),
  ADD CONSTRAINT waitlist_email_len CHECK (char_length(email) BETWEEN 3 AND 255),
  ADD CONSTRAINT waitlist_phone_len CHECK (char_length(phone) BETWEEN 5 AND 20),
  ADD CONSTRAINT waitlist_email_shape CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

CREATE INDEX waitlist_created_at_idx ON public.waitlist(created_at DESC);
CREATE INDEX waitlist_city_idx ON public.waitlist(city);
CREATE INDEX waitlist_role_idx ON public.waitlist(role);
CREATE INDEX waitlist_referred_by_idx ON public.waitlist(referred_by);
CREATE UNIQUE INDEX waitlist_email_lower_idx ON public.waitlist(LOWER(email));

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Anyone (anon or authenticated) can submit a waitlist entry
CREATE POLICY "Anyone can join waitlist"
  ON public.waitlist
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Public can read just the COUNT — but RLS is row-based, so we expose
-- an aggregate via a SECURITY DEFINER function instead. Admins can read all rows.
CREATE POLICY "Admins can view all waitlist entries"
  ON public.waitlist
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update waitlist entries"
  ON public.waitlist
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete waitlist entries"
  ON public.waitlist
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Public count function — lets the landing page show "Join 12,847 others"
-- without exposing any row data.
CREATE OR REPLACE FUNCTION public.get_waitlist_count()
RETURNS BIGINT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*) FROM public.waitlist;
$$;

GRANT EXECUTE ON FUNCTION public.get_waitlist_count() TO anon, authenticated;

-- Auto-generate referral_code on insert: AURO-<first3 of name>-<4 digits>
CREATE OR REPLACE FUNCTION public.set_waitlist_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_prefix TEXT;
  v_attempt INT := 0;
  v_code TEXT;
BEGIN
  IF NEW.referral_code IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_prefix := UPPER(REGEXP_REPLACE(COALESCE(NEW.full_name, 'USR'), '[^A-Za-z]', '', 'g'));
  IF char_length(v_prefix) < 3 THEN
    v_prefix := RPAD(v_prefix, 3, 'X');
  ELSE
    v_prefix := substring(v_prefix FROM 1 FOR 3);
  END IF;

  LOOP
    v_attempt := v_attempt + 1;
    v_code := 'AURO-' || v_prefix || '-' || LPAD((floor(random() * 9000) + 1000)::int::text, 4, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.waitlist WHERE referral_code = v_code) OR v_attempt > 8;
  END LOOP;

  NEW.referral_code := v_code;
  RETURN NEW;
END;
$$;

CREATE TRIGGER waitlist_set_referral_code
BEFORE INSERT ON public.waitlist
FOR EACH ROW
EXECUTE FUNCTION public.set_waitlist_referral_code();

-- Realtime: enable replica identity + add to publication so admin dashboard
-- can stream new signups live.
ALTER TABLE public.waitlist REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.waitlist;