
-- Financial lessons table
CREATE TABLE public.financial_lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'budgeting',
  content_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  coin_reward INTEGER NOT NULL DEFAULT 10,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view lessons"
ON public.financial_lessons FOR SELECT
TO authenticated
USING (true);

-- Lesson completions table
CREATE TABLE public.lesson_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lesson_id UUID NOT NULL REFERENCES public.financial_lessons(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

ALTER TABLE public.lesson_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own completions"
ON public.lesson_completions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own completions"
ON public.lesson_completions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Enable realtime for notification-relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chores;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_messages;
