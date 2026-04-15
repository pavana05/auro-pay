
-- Chores/Tasks system
CREATE TABLE public.chores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL,
  teen_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  reward_amount INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  proof_image_url TEXT,
  due_date DATE,
  is_recurring BOOLEAN DEFAULT false,
  recurrence TEXT DEFAULT 'weekly',
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ
);

ALTER TABLE public.chores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can manage chores" ON public.chores FOR ALL USING (auth.uid() = parent_id);
CREATE POLICY "Teens can view their chores" ON public.chores FOR SELECT USING (auth.uid() = teen_id);
CREATE POLICY "Teens can update their chores" ON public.chores FOR UPDATE USING (auth.uid() = teen_id);

-- Achievements system
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '🏆',
  category TEXT DEFAULT 'general',
  points INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view achievements" ON public.achievements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can view own achievements" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert achievements" ON public.user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Streaks
CREATE TABLE public.user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_login_date DATE,
  total_logins INTEGER DEFAULT 0,
  streak_coins INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own streaks" ON public.user_streaks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Friends system
CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  friend_id UUID NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own friendships" ON public.friendships FOR ALL USING (auth.uid() = user_id OR auth.uid() = friend_id) WITH CHECK (auth.uid() = user_id);

-- Support tickets
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  assigned_to UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE public.ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own tickets" ON public.support_tickets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all tickets" ON public.support_tickets FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own ticket messages" ON public.ticket_messages FOR ALL USING (EXISTS (SELECT 1 FROM public.support_tickets WHERE id = ticket_messages.ticket_id AND user_id = auth.uid()));
CREATE POLICY "Admins can manage all ticket messages" ON public.ticket_messages FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Scratch cards
CREATE TABLE public.scratch_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  reward_type TEXT DEFAULT 'coins',
  reward_value INTEGER DEFAULT 0,
  is_scratched BOOLEAN DEFAULT false,
  transaction_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  scratched_at TIMESTAMPTZ
);

ALTER TABLE public.scratch_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own scratch cards" ON public.scratch_cards FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Seed achievements
INSERT INTO public.achievements (key, title, description, icon, category, points) VALUES
  ('first_transaction', 'First Transaction', 'Complete your first transaction', '💸', 'money', 10),
  ('savings_starter', 'Savings Starter', 'Create your first savings goal', '🎯', 'savings', 15),
  ('budget_master', 'Budget Master', 'Stay within budget for a full month', '📊', 'budget', 50),
  ('streak_7', 'Week Warrior', 'Maintain a 7-day login streak', '🔥', 'streak', 25),
  ('streak_30', 'Monthly Champion', '30-day login streak', '⭐', 'streak', 100),
  ('social_butterfly', 'Social Butterfly', 'Add 5 friends', '🦋', 'social', 20),
  ('bill_splitter', 'Bill Splitter', 'Split your first bill', '🧾', 'social', 15),
  ('chore_champion', 'Chore Champion', 'Complete 10 chores', '🧹', 'chores', 30),
  ('first_reward', 'Reward Hunter', 'Redeem your first reward', '🎁', 'rewards', 10),
  ('kyc_verified', 'Verified User', 'Complete KYC verification', '✅', 'account', 20);
