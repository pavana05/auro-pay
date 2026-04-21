-- Gate analytics events
CREATE TABLE public.gate_analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  path text,
  platform text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_gate_analytics_events_created_at ON public.gate_analytics_events (created_at DESC);
CREATE INDEX idx_gate_analytics_events_event_type ON public.gate_analytics_events (event_type);

ALTER TABLE public.gate_analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert gate analytics events"
  ON public.gate_analytics_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view gate analytics events"
  ON public.gate_analytics_events FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete gate analytics events"
  ON public.gate_analytics_events FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- iOS waitlist
CREATE TABLE public.ios_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_ios_waitlist_created_at ON public.ios_waitlist (created_at DESC);

ALTER TABLE public.ios_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can join iOS waitlist"
  ON public.ios_waitlist FOR INSERT
  WITH CHECK (email IS NOT NULL AND length(email) > 3 AND email LIKE '%@%.%');

CREATE POLICY "Admins can view iOS waitlist"
  ON public.ios_waitlist FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete iOS waitlist entries"
  ON public.ios_waitlist FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));