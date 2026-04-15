
-- Function to check budget thresholds and create notifications
CREATE OR REPLACE FUNCTION public.check_budget_threshold()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_category text;
  v_budget record;
  v_spent_pct numeric;
BEGIN
  -- Only check debit transactions with success status
  IF NEW.type != 'debit' OR NEW.status != 'success' THEN
    RETURN NEW;
  END IF;

  -- Get user_id from wallet
  SELECT user_id INTO v_user_id FROM wallets WHERE id = NEW.wallet_id;
  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_category := COALESCE(NEW.category, 'other');

  -- Check if there's a budget for this category in current month
  SELECT * INTO v_budget
  FROM budgets
  WHERE user_id = v_user_id
    AND category = v_category
    AND month = to_char(now(), 'YYYY-MM')
  LIMIT 1;

  IF v_budget IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calculate new spent percentage
  v_spent_pct := ((COALESCE(v_budget.spent, 0) + NEW.amount)::numeric / v_budget.monthly_limit::numeric) * 100;

  -- Check if crossing 80% threshold (alert_threshold)
  IF v_spent_pct >= COALESCE(v_budget.alert_threshold, 80)
     AND ((COALESCE(v_budget.spent, 0)::numeric / v_budget.monthly_limit::numeric) * 100) < COALESCE(v_budget.alert_threshold, 80) THEN
    INSERT INTO notifications (user_id, title, body, type)
    VALUES (
      v_user_id,
      '⚠️ Budget Alert: ' || initcap(v_category),
      'You have used ' || round(v_spent_pct) || '% of your ₹' || (v_budget.monthly_limit / 100) || ' ' || initcap(v_category) || ' budget this month.',
      'budget_alert'
    );
  END IF;

  -- Check if crossing 100%
  IF v_spent_pct >= 100
     AND ((COALESCE(v_budget.spent, 0)::numeric / v_budget.monthly_limit::numeric) * 100) < 100 THEN
    INSERT INTO notifications (user_id, title, body, type)
    VALUES (
      v_user_id,
      '🚨 Budget Exceeded: ' || initcap(v_category),
      'You have exceeded your ₹' || (v_budget.monthly_limit / 100) || ' ' || initcap(v_category) || ' budget! Total spent: ₹' || round((COALESCE(v_budget.spent, 0) + NEW.amount)::numeric / 100, 2),
      'budget_exceeded'
    );
  END IF;

  -- Update the budget spent amount
  UPDATE budgets
  SET spent = COALESCE(spent, 0) + NEW.amount
  WHERE id = v_budget.id;

  RETURN NEW;
END;
$$;

-- Create trigger on transactions table
CREATE TRIGGER check_budget_on_transaction
AFTER INSERT ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.check_budget_threshold();
