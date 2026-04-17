-- Limit increase requests from teen → parent
CREATE TABLE public.limit_increase_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teen_id uuid NOT NULL,
  parent_id uuid NOT NULL,
  limit_type text NOT NULL CHECK (limit_type IN ('daily','monthly')),
  current_limit integer NOT NULL,
  requested_limit integer NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.limit_increase_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teens can manage own requests"
  ON public.limit_increase_requests FOR ALL
  USING (auth.uid() = teen_id)
  WITH CHECK (auth.uid() = teen_id);

CREATE POLICY "Parents can view requests for them"
  ON public.limit_increase_requests FOR SELECT
  USING (auth.uid() = parent_id);

CREATE POLICY "Parents can update requests for them"
  ON public.limit_increase_requests FOR UPDATE
  USING (auth.uid() = parent_id);

-- Parent actions audit/timeline
CREATE TABLE public.parent_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL,
  teen_id uuid NOT NULL,
  action_type text NOT NULL,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.parent_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can manage own actions"
  ON public.parent_actions FOR ALL
  USING (auth.uid() = parent_id)
  WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "Teens can view actions on them"
  ON public.parent_actions FOR SELECT
  USING (auth.uid() = teen_id);

CREATE INDEX idx_parent_actions_teen ON public.parent_actions(teen_id, created_at DESC);
CREATE INDEX idx_limit_requests_parent ON public.limit_increase_requests(parent_id, status);