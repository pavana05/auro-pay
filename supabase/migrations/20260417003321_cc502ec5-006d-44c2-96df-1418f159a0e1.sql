ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS upi_id text;

-- Backfill: set upi_id to phone@auropay for existing profiles with phone
UPDATE public.profiles
SET upi_id = phone || '@auropay'
WHERE upi_id IS NULL AND phone IS NOT NULL AND phone <> '';