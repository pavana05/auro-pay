-- Flagged transactions table for the anomaly engine
CREATE TABLE public.flagged_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL,
  wallet_id uuid NOT NULL,
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  baseline_avg numeric NOT NULL,
  baseline_stddev numeric,
  zscore numeric,
  multiplier numeric NOT NULL,
  reason text NOT NULL,
  detail text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  resolved_by uuid,
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT flagged_transactions_unique_txn UNIQUE (transaction_id)
);

CREATE INDEX idx_flagged_txn_status ON public.flagged_transactions(status, created_at DESC);
CREATE INDEX idx_flagged_txn_user ON public.flagged_transactions(user_id);

ALTER TABLE public.flagged_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view flagged transactions"
  ON public.flagged_transactions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update flagged transactions"
  ON public.flagged_transactions FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete flagged transactions"
  ON public.flagged_transactions FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role / edge function inserts; no public insert policy needed.

-- Anomaly detection: scan recent debits and flag 3x outliers vs user's 30-day baseline
CREATE OR REPLACE FUNCTION public.scan_transaction_anomalies(_lookback_minutes int DEFAULT 60)
RETURNS TABLE(flagged_count int, scanned_count int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_flagged int := 0;
  v_scanned int := 0;
  r record;
  v_avg numeric;
  v_stddev numeric;
  v_count int;
  v_mult numeric;
  v_z numeric;
  v_uid uuid;
  v_severity text;
BEGIN
  FOR r IN
    SELECT t.id, t.wallet_id, t.amount, t.merchant_name, t.category, t.created_at
    FROM transactions t
    WHERE t.type = 'debit'
      AND t.status = 'success'
      AND t.created_at >= now() - (_lookback_minutes || ' minutes')::interval
      AND NOT EXISTS (SELECT 1 FROM flagged_transactions f WHERE f.transaction_id = t.id)
  LOOP
    v_scanned := v_scanned + 1;

    -- Per-user baseline over last 30 days, excluding the current txn
    SELECT w.user_id INTO v_uid FROM wallets w WHERE w.id = r.wallet_id;
    IF v_uid IS NULL THEN CONTINUE; END IF;

    SELECT
      COALESCE(AVG(t2.amount), 0)::numeric,
      COALESCE(STDDEV_SAMP(t2.amount), 0)::numeric,
      COUNT(*)::int
    INTO v_avg, v_stddev, v_count
    FROM transactions t2
    JOIN wallets w2 ON w2.id = t2.wallet_id
    WHERE w2.user_id = v_uid
      AND t2.type = 'debit'
      AND t2.status = 'success'
      AND t2.id <> r.id
      AND t2.created_at >= now() - interval '30 days';

    -- Need at least 5 historical txns and a non-zero baseline
    IF v_count < 5 OR v_avg <= 0 THEN CONTINUE; END IF;

    v_mult := r.amount::numeric / v_avg;
    v_z := CASE WHEN v_stddev > 0 THEN (r.amount - v_avg) / v_stddev ELSE NULL END;

    -- 3x rule
    IF v_mult >= 3 THEN
      v_severity := CASE WHEN v_mult >= 6 THEN 'high' ELSE 'medium' END;

      INSERT INTO flagged_transactions (
        transaction_id, wallet_id, user_id, amount,
        baseline_avg, baseline_stddev, zscore, multiplier,
        reason, detail, severity
      ) VALUES (
        r.id, r.wallet_id, v_uid, r.amount,
        round(v_avg, 2), round(v_stddev, 2), round(v_z, 2), round(v_mult, 2),
        '3× spending outlier',
        'Debit of ₹' || (r.amount/100.0)::text ||
        ' is ' || round(v_mult, 1)::text || '× the user''s 30-day average of ₹' || round(v_avg/100.0, 2)::text ||
        ' (n=' || v_count || COALESCE(', z=' || round(v_z,1)::text, '') || ')' ||
        COALESCE(' · ' || r.merchant_name, ''),
        v_severity
      ) ON CONFLICT (transaction_id) DO NOTHING;

      v_flagged := v_flagged + 1;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_flagged, v_scanned;
END;
$$;

-- Realtime for the new table
ALTER PUBLICATION supabase_realtime ADD TABLE public.flagged_transactions;
ALTER TABLE public.flagged_transactions REPLICA IDENTITY FULL;