ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS latitude numeric(9,6),
  ADD COLUMN IF NOT EXISTS longitude numeric(9,6),
  ADD COLUMN IF NOT EXISTS location_city text,
  ADD COLUMN IF NOT EXISTS location_region text,
  ADD COLUMN IF NOT EXISTS location_country text,
  ADD COLUMN IF NOT EXISTS location_source text,
  ADD COLUMN IF NOT EXISTS location_captured_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_transactions_location_city
  ON public.transactions (location_city)
  WHERE location_city IS NOT NULL;