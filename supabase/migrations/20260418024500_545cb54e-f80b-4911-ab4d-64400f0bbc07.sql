-- Pending parent approvals for large teen P2P payments
CREATE TABLE public.pending_payment_approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teen_id UUID NOT NULL,
  parent_id UUID NOT NULL,
  favorite_id UUID,
  amount INTEGER NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '48 hours'),
  decision_note TEXT
);

CREATE INDEX idx_pending_payment_approvals_parent ON public.pending_payment_approvals(parent_id, status);
CREATE INDEX idx_pending_payment_approvals_teen ON public.pending_payment_approvals(teen_id, status);

ALTER TABLE public.pending_payment_approvals ENABLE ROW LEVEL SECURITY;

-- Teens can view + create their own pending approvals
CREATE POLICY "Teens can view own pending approvals"
ON public.pending_payment_approvals FOR SELECT
USING (auth.uid() = teen_id);

CREATE POLICY "Teens can create own pending approvals"
ON public.pending_payment_approvals FOR INSERT
WITH CHECK (auth.uid() = teen_id);

-- Parents can view + update approvals targeted at them
CREATE POLICY "Parents can view their pending approvals"
ON public.pending_payment_approvals FOR SELECT
USING (auth.uid() = parent_id);

CREATE POLICY "Parents can update their pending approvals"
ON public.pending_payment_approvals FOR UPDATE
USING (auth.uid() = parent_id);

-- Admins manage all
CREATE POLICY "Admins can manage all pending approvals"
ON public.pending_payment_approvals FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Notify parent on pending approval insert
CREATE OR REPLACE FUNCTION public.notify_parent_on_pending_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_teen_name text;
BEGIN
  SELECT COALESCE(full_name, 'Your teen') INTO v_teen_name FROM profiles WHERE id = NEW.teen_id;
  INSERT INTO notifications (user_id, title, body, type)
  VALUES (
    NEW.parent_id,
    '🔔 Approval needed',
    v_teen_name || ' wants to send ₹' || (NEW.amount/100.0)::text || COALESCE(' — ' || NEW.note, ''),
    'parent_approval'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_parent_on_pending_approval
  AFTER INSERT ON public.pending_payment_approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_parent_on_pending_approval();