-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- 1. Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT UNIQUE,
  role TEXT CHECK (role IN ('teen', 'parent', 'admin')),
  avatar_url TEXT,
  aadhaar_verified BOOLEAN DEFAULT false,
  kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'verified', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- 2. Parent-teen links (before wallets, since wallet policy references it)
CREATE TABLE public.parent_teen_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  teen_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  pocket_money_amount INTEGER DEFAULT 0,
  pocket_money_frequency TEXT DEFAULT 'monthly' CHECK (pocket_money_frequency IN ('daily', 'weekly', 'monthly')),
  pocket_money_day INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.parent_teen_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents can view own links" ON public.parent_teen_links FOR SELECT USING (auth.uid() = parent_id);
CREATE POLICY "Parents can insert links" ON public.parent_teen_links FOR INSERT WITH CHECK (auth.uid() = parent_id);
CREATE POLICY "Parents can update links" ON public.parent_teen_links FOR UPDATE USING (auth.uid() = parent_id);
CREATE POLICY "Teens can view their links" ON public.parent_teen_links FOR SELECT USING (auth.uid() = teen_id);

-- 3. Wallets
CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  balance INTEGER DEFAULT 0,
  daily_limit INTEGER DEFAULT 50000,
  spent_today INTEGER DEFAULT 0,
  monthly_limit INTEGER DEFAULT 500000,
  spent_this_month INTEGER DEFAULT 0,
  is_frozen BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own wallet" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own wallet" ON public.wallets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own wallet" ON public.wallets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all wallets" ON public.wallets FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all wallets" ON public.wallets FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Parents can view linked teen wallet" ON public.wallets FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.parent_teen_links WHERE parent_id = auth.uid() AND teen_id = public.wallets.user_id AND is_active = true)
);

-- 4. Transactions
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES public.wallets(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('credit', 'debit')) NOT NULL,
  amount INTEGER NOT NULL,
  merchant_name TEXT,
  merchant_upi_id TEXT,
  category TEXT CHECK (category IN ('food', 'transport', 'education', 'shopping', 'entertainment', 'other')),
  razorpay_payment_id TEXT,
  razorpay_order_id TEXT,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.wallets WHERE id = public.transactions.wallet_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert own transactions" ON public.transactions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.wallets WHERE id = public.transactions.wallet_id AND user_id = auth.uid())
);
CREATE POLICY "Parents can view linked teen transactions" ON public.transactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.wallets w JOIN public.parent_teen_links ptl ON ptl.teen_id = w.user_id WHERE w.id = public.transactions.wallet_id AND ptl.parent_id = auth.uid() AND ptl.is_active = true)
);
CREATE POLICY "Admins can view all transactions" ON public.transactions FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- 5. Spending limits
CREATE TABLE public.spending_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teen_wallet_id UUID REFERENCES public.wallets(id) ON DELETE CASCADE NOT NULL,
  category TEXT CHECK (category IN ('food', 'transport', 'education', 'shopping', 'entertainment', 'other')),
  daily_limit INTEGER,
  is_blocked BOOLEAN DEFAULT false,
  set_by_parent_id UUID REFERENCES public.profiles(id)
);
ALTER TABLE public.spending_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents can manage spending limits" ON public.spending_limits FOR ALL USING (auth.uid() = set_by_parent_id);
CREATE POLICY "Teens can view their limits" ON public.spending_limits FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.wallets WHERE id = public.spending_limits.teen_wallet_id AND user_id = auth.uid())
);

-- 6. Savings goals
CREATE TABLE public.savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teen_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  target_amount INTEGER NOT NULL,
  current_amount INTEGER DEFAULT 0,
  deadline DATE,
  icon TEXT,
  color TEXT,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teens can manage own goals" ON public.savings_goals FOR ALL USING (auth.uid() = teen_id);

-- 7. Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can receive notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 8. KYC requests
CREATE TABLE public.kyc_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  aadhaar_number TEXT,
  aadhaar_name TEXT,
  date_of_birth DATE,
  digio_request_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  submitted_at TIMESTAMPTZ DEFAULT now(),
  verified_at TIMESTAMPTZ
);
ALTER TABLE public.kyc_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own KYC" ON public.kyc_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own KYC" ON public.kyc_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all KYC" ON public.kyc_requests FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 9. App settings
CREATE TABLE public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read settings" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage settings" ON public.app_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.app_settings (key, value) VALUES
  ('default_daily_limit', '50000'),
  ('max_wallet_balance', '10000000'),
  ('min_transaction_amount', '100'),
  ('maintenance_mode', 'false'),
  ('kyc_required', 'true');

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.kyc_requests;