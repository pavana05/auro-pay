ALTER TABLE public.recurring_payments
  ALTER COLUMN favorite_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'p2p',
  ADD COLUMN IF NOT EXISTS day_of_week int,
  ADD COLUMN IF NOT EXISTS day_of_month int,
  ADD COLUMN IF NOT EXISTS last_run_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_status text,
  ADD COLUMN IF NOT EXISTS run_count int NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.validate_recurring_payment()
RETURNS trigger
LANGUAGE plpgsql
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

DROP TRIGGER IF EXISTS trg_validate_recurring_payment ON public.recurring_payments;
CREATE TRIGGER trg_validate_recurring_payment
  BEFORE INSERT OR UPDATE ON public.recurring_payments
  FOR EACH ROW EXECUTE FUNCTION public.validate_recurring_payment();

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net  WITH SCHEMA extensions;