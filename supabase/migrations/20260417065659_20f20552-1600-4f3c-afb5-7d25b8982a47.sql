CREATE OR REPLACE FUNCTION public.validate_recurring_payment()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.kind NOT IN ('p2p', 'topup') THEN
    RAISE EXCEPTION 'Invalid kind: %', NEW.kind;
  END IF;
  IF NEW.kind = 'p2p' AND NEW.favorite_id IS NULL THEN
    RAISE EXCEPTION 'p2p recurring payments require a favorite_id';
  END IF;
  IF NEW.amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;
  RETURN NEW;
END;
$$;