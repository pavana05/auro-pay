ALTER TABLE public.savings_goals
  ADD COLUMN IF NOT EXISTS autosave_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS autosave_amount integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS autosave_frequency text NOT NULL DEFAULT 'weekly',
  ADD COLUMN IF NOT EXISTS autosave_next_run_at timestamptz,
  ADD COLUMN IF NOT EXISTS autosave_last_run_at timestamptz;

ALTER TABLE public.notifications REPLICA IDENTITY FULL;