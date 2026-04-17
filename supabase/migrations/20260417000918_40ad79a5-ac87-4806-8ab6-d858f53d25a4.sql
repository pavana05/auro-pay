ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS card_online_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS card_international_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS card_contactless_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS card_atm_enabled boolean NOT NULL DEFAULT true;