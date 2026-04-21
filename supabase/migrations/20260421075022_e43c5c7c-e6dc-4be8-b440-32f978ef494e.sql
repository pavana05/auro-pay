ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS permissions_completed_at TIMESTAMPTZ;