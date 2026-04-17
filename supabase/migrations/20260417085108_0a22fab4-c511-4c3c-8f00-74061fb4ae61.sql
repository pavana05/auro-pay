-- Payment requests: a teen asks a contact to pay them.
CREATE TABLE public.payment_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id uuid NOT NULL,        -- who is asking for money
  recipient_id uuid NOT NULL,        -- who must pay (auropay user)
  amount integer NOT NULL CHECK (amount > 0),  -- paise
  note text,
  category text DEFAULT 'other',
  status text NOT NULL DEFAULT 'pending', -- pending | paid | declined | cancelled | expired
  remind_after_at timestamptz,       -- if set & in the future, hide until then ("remind me later")
  paid_transaction_id uuid,          -- transactions.id once paid
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days')
);

CREATE INDEX idx_payment_requests_recipient_status ON public.payment_requests (recipient_id, status, created_at DESC);
CREATE INDEX idx_payment_requests_requester ON public.payment_requests (requester_id, created_at DESC);

ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

-- Either party can view
CREATE POLICY "Parties can view payment requests"
  ON public.payment_requests FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

-- Requester creates the request, but cannot request from themselves
CREATE POLICY "Users can create payment requests"
  ON public.payment_requests FOR INSERT
  WITH CHECK (auth.uid() = requester_id AND requester_id <> recipient_id);

-- Requester can cancel; recipient can pay/decline/snooze (status + remind_after_at)
CREATE POLICY "Parties can update payment requests"
  ON public.payment_requests FOR UPDATE
  USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

-- Requester can delete their own request
CREATE POLICY "Requester can delete payment requests"
  ON public.payment_requests FOR DELETE
  USING (auth.uid() = requester_id);

-- Admin full access
CREATE POLICY "Admins can manage payment requests"
  ON public.payment_requests FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Notify recipient on insert + on remind_after_at clear (snooze finished updates handled in app)
CREATE OR REPLACE FUNCTION public.notify_payment_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
BEGIN
  SELECT COALESCE(full_name, 'Someone') INTO v_name FROM profiles WHERE id = NEW.requester_id;
  INSERT INTO notifications (user_id, title, body, type)
  VALUES (
    NEW.recipient_id,
    '💸 Payment request',
    v_name || ' is requesting ₹' || (NEW.amount/100.0)::text || COALESCE(' for ' || NEW.note, ''),
    'payment_request'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_payment_request
  AFTER INSERT ON public.payment_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_payment_request();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_requests;