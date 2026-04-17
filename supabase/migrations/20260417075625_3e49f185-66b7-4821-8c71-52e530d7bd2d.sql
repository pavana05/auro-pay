ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS card_number text,
  ADD COLUMN IF NOT EXISTS card_holder_name text,
  ADD COLUMN IF NOT EXISTS card_expiry_month int,
  ADD COLUMN IF NOT EXISTS card_expiry_year int,
  ADD COLUMN IF NOT EXISTS card_issued_at timestamptz;

-- Backfill: deterministic 16-digit placeholder card per wallet (prefix 4929 = test Visa BIN)
UPDATE public.wallets
SET
  card_number = '4929' || lpad((('x' || substr(md5(id::text), 1, 12))::bit(48)::bigint % 1000000000000)::text, 12, '0'),
  card_expiry_month = 1 + (('x' || substr(md5(id::text), 12, 2))::bit(8)::int % 12),
  card_expiry_year  = 2027 + (('x' || substr(md5(id::text), 14, 2))::bit(8)::int % 5),
  card_issued_at = COALESCE(card_issued_at, created_at, now())
WHERE card_number IS NULL;