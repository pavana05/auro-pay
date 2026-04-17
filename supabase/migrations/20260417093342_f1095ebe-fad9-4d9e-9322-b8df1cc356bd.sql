
-- 1) Extend anomaly scanner with velocity-attack rule
CREATE OR REPLACE FUNCTION public.scan_transaction_anomalies(_lookback_minutes integer DEFAULT 60)
 RETURNS TABLE(flagged_count integer, scanned_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  v_velocity_count int;
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

    SELECT w.user_id INTO v_uid FROM wallets w WHERE w.id = r.wallet_id;
    IF v_uid IS NULL THEN CONTINUE; END IF;

    -- Rule A: 3× outlier vs 30-day baseline
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

    IF v_count >= 5 AND v_avg > 0 THEN
      v_mult := r.amount::numeric / v_avg;
      v_z := CASE WHEN v_stddev > 0 THEN (r.amount - v_avg) / v_stddev ELSE NULL END;

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
        CONTINUE; -- already flagged this txn
      END IF;
    END IF;

    -- Rule B: Velocity attack — 5+ successful debits in any 10-minute window
    SELECT COUNT(*)::int
    INTO v_velocity_count
    FROM transactions t3
    JOIN wallets w3 ON w3.id = t3.wallet_id
    WHERE w3.user_id = v_uid
      AND t3.type = 'debit'
      AND t3.status = 'success'
      AND t3.created_at BETWEEN r.created_at - interval '10 minutes' AND r.created_at;

    IF v_velocity_count >= 5 THEN
      INSERT INTO flagged_transactions (
        transaction_id, wallet_id, user_id, amount,
        baseline_avg, baseline_stddev, zscore, multiplier,
        reason, detail, severity
      ) VALUES (
        r.id, r.wallet_id, v_uid, r.amount,
        0, 0, NULL, v_velocity_count,
        'Velocity attack',
        v_velocity_count || ' successful debits in 10 minutes (latest ₹' || (r.amount/100.0)::text || ')' ||
        COALESCE(' · ' || r.merchant_name, ''),
        'high'
      ) ON CONFLICT (transaction_id) DO NOTHING;

      v_flagged := v_flagged + 1;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_flagged, v_scanned;
END;
$function$;

-- 2) Auto-freeze wallet + notify user when flag is confirmed_fraud
CREATE OR REPLACE FUNCTION public.handle_confirmed_fraud()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'confirmed_fraud'
     AND (OLD.status IS DISTINCT FROM 'confirmed_fraud') THEN

    UPDATE public.wallets
       SET is_frozen = true
     WHERE id = NEW.wallet_id
       AND COALESCE(is_frozen, false) = false;

    INSERT INTO public.notifications (user_id, title, body, type)
    VALUES (
      NEW.user_id,
      '🔒 Account locked pending review',
      'A recent transaction was flagged as suspicious and confirmed by our security team. Your wallet has been frozen pending review. Please contact support if you believe this is a mistake.',
      'fraud_lock'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_flagged_confirmed_fraud ON public.flagged_transactions;
CREATE TRIGGER trg_flagged_confirmed_fraud
AFTER UPDATE ON public.flagged_transactions
FOR EACH ROW
EXECUTE FUNCTION public.handle_confirmed_fraud();
