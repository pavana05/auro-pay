-- Zenzo Points / Rewards
CREATE TABLE public.zenzo_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  points INTEGER NOT NULL DEFAULT 0,
  type TEXT NOT NULL CHECK (type IN ('earned','redeemed')),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_zenzo_points_user ON public.zenzo_points(user_id, created_at DESC);

ALTER TABLE public.zenzo_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own points"
  ON public.zenzo_points FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own points"
  ON public.zenzo_points FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all points"
  ON public.zenzo_points FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Financial Health Score
CREATE TABLE public.health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  level TEXT NOT NULL DEFAULT 'Bronze',
  breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_health_scores_user ON public.health_scores(user_id, computed_at DESC);

ALTER TABLE public.health_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own health score"
  ON public.health_scores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own health score"
  ON public.health_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all health scores"
  ON public.health_scores FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));