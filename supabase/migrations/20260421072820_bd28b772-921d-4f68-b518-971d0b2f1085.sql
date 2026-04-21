-- ─────────────────────────────────────────────────────────────
-- 1. profiles.is_pro flag (denormalized for fast feature gating)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_pro boolean NOT NULL DEFAULT false;

-- ─────────────────────────────────────────────────────────────
-- 2. subscription_plans — the catalog
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id text PRIMARY KEY,                       -- e.g. 'pro_monthly', 'pro_annual'
  name text NOT NULL,                        -- 'AuroPay Pro — Monthly'
  tagline text,                              -- 'Best for trying it out'
  amount_paise integer NOT NULL,             -- 29900 = ₹299.00
  currency text NOT NULL DEFAULT 'INR',
  interval text NOT NULL,                    -- 'monthly' | 'yearly'
  interval_count integer NOT NULL DEFAULT 1,
  razorpay_plan_id text,                     -- filled in via env / admin later
  is_active boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans"
  ON public.subscription_plans
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage plans"
  ON public.subscription_plans
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Seed the two plans
INSERT INTO public.subscription_plans
  (id, name, tagline, amount_paise, interval, is_featured, features, sort_order)
VALUES
  (
    'pro_monthly',
    'AuroPay Pro',
    'Premium money tools for serious users',
    29900,
    'monthly',
    true,
    '[
      {"icon":"infinity","label":"Unlimited bill splits, recurring payments & savings goals"},
      {"icon":"zero","label":"Zero platform fee on every transfer"},
      {"icon":"sparkles","label":"AI financial insights & smart spending coach"},
      {"icon":"chart","label":"Advanced expense analytics & monthly PDF reports"},
      {"icon":"users","label":"Up to 5 linked teens (vs 2 on Free)"},
      {"icon":"shield","label":"Instant parent approvals + fraud-alert SMS"},
      {"icon":"fingerprint","label":"Biometric quick-pay & priority UPI processing"},
      {"icon":"headset","label":"Premium 24×7 priority support chat"}
    ]'::jsonb,
    1
  ),
  (
    'pro_annual',
    'AuroPay Pro',
    'Save 30% — best value',
    249900,
    'yearly',
    false,
    '[
      {"icon":"infinity","label":"Unlimited bill splits, recurring payments & savings goals"},
      {"icon":"zero","label":"Zero platform fee on every transfer"},
      {"icon":"sparkles","label":"AI financial insights & smart spending coach"},
      {"icon":"chart","label":"Advanced expense analytics & monthly PDF reports"},
      {"icon":"users","label":"Up to 5 linked teens (vs 2 on Free)"},
      {"icon":"shield","label":"Instant parent approvals + fraud-alert SMS"},
      {"icon":"fingerprint","label":"Biometric quick-pay & priority UPI processing"},
      {"icon":"headset","label":"Premium 24×7 priority support chat"},
      {"icon":"gift","label":"Save ₹1,089 — equivalent to ~₹208/month"}
    ]'::jsonb,
    2
  )
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 3. user_subscriptions — actual subscription records
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id text NOT NULL REFERENCES public.subscription_plans(id),
  razorpay_subscription_id text UNIQUE,
  razorpay_customer_id text,
  status text NOT NULL DEFAULT 'created',     -- created | authenticated | active | paused | cancelled | expired | completed | halted
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  cancelled_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_subscriptions_user_id_idx
  ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS user_subscriptions_status_idx
  ON public.user_subscriptions(status);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON public.user_subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions"
  ON public.user_subscriptions
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all subscriptions"
  ON public.user_subscriptions
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ─────────────────────────────────────────────────────────────
-- 4. updated_at triggers
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at_subscription()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_subscriptions_updated_at ON public.user_subscriptions;
CREATE TRIGGER trg_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_subscription();

DROP TRIGGER IF EXISTS trg_subscription_plans_updated_at ON public.subscription_plans;
CREATE TRIGGER trg_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_subscription();

-- ─────────────────────────────────────────────────────────────
-- 5. Sync profiles.is_pro from active subscriptions
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_profile_is_pro()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_user uuid;
  v_has_active boolean;
BEGIN
  v_target_user := COALESCE(NEW.user_id, OLD.user_id);

  SELECT EXISTS (
    SELECT 1 FROM public.user_subscriptions
    WHERE user_id = v_target_user
      AND status IN ('active', 'authenticated')
      AND (current_period_end IS NULL OR current_period_end > now())
  ) INTO v_has_active;

  UPDATE public.profiles
     SET is_pro = v_has_active
   WHERE id = v_target_user
     AND is_pro IS DISTINCT FROM v_has_active;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_is_pro_iud ON public.user_subscriptions;
CREATE TRIGGER trg_sync_profile_is_pro_iud
  AFTER INSERT OR UPDATE OR DELETE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_is_pro();