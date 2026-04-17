-- Update handle_confirmed_fraud trigger to also write a wallet_auto_freeze audit log
-- so the freeze is traceable to the triggering flag, not just the flag update.
CREATE OR REPLACE FUNCTION public.handle_confirmed_fraud()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_was_frozen boolean;
BEGIN
  IF NEW.status = 'confirmed_fraud'
     AND (OLD.status IS DISTINCT FROM 'confirmed_fraud') THEN

    SELECT COALESCE(is_frozen, false) INTO v_was_frozen
      FROM public.wallets WHERE id = NEW.wallet_id;

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

    -- Auto-freeze audit trail: links the freeze back to the flag that triggered it.
    -- admin_user_id falls back to resolved_by, then to the wallet owner if neither is set
    -- (NOT NULL column on audit_logs).
    INSERT INTO public.audit_logs (admin_user_id, action, target_type, target_id, details)
    VALUES (
      COALESCE(NEW.resolved_by, auth.uid(), NEW.user_id),
      'wallet_auto_freeze',
      'wallet',
      NEW.wallet_id::text,
      jsonb_build_object(
        'flag_id', NEW.id,
        'transaction_id', NEW.transaction_id,
        'reason', NEW.reason,
        'detail', NEW.detail,
        'severity', NEW.severity,
        'resolution_note', NEW.resolution_note,
        'was_already_frozen', v_was_frozen,
        'triggered_by', 'flag_confirmed_fraud'
      )
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Ensure the trigger is attached (it should already exist but is idempotent)
DROP TRIGGER IF EXISTS trg_flagged_transactions_confirmed_fraud ON public.flagged_transactions;
CREATE TRIGGER trg_flagged_transactions_confirmed_fraud
  AFTER UPDATE ON public.flagged_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_confirmed_fraud();