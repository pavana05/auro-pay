
-- Bill splits table
CREATE TABLE public.bill_splits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL,
  title TEXT NOT NULL,
  total_amount INTEGER NOT NULL,
  category TEXT DEFAULT 'other',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.bill_splits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own splits" ON public.bill_splits FOR ALL TO authenticated
USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

-- Bill split members
CREATE TABLE public.bill_split_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  split_id UUID NOT NULL REFERENCES public.bill_splits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  share_amount INTEGER NOT NULL DEFAULT 0,
  is_paid BOOLEAN DEFAULT false,
  paid_at TIMESTAMP WITH TIME ZONE
);
ALTER TABLE public.bill_split_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own split memberships" ON public.bill_split_members FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Split creators can manage members" ON public.bill_split_members FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.bill_splits WHERE bill_splits.id = bill_split_members.split_id AND bill_splits.created_by = auth.uid()));

-- Now add the cross-reference policy on bill_splits
CREATE POLICY "Users can view splits they are part of" ON public.bill_splits FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.bill_split_members WHERE bill_split_members.split_id = bill_splits.id AND bill_split_members.user_id = auth.uid()));

-- Budgets table
CREATE TABLE public.budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  monthly_limit INTEGER NOT NULL,
  spent INTEGER DEFAULT 0,
  month TEXT NOT NULL,
  alert_threshold INTEGER DEFAULT 80,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own budgets" ON public.budgets FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Quick pay favorites
CREATE TABLE public.quick_pay_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  contact_name TEXT NOT NULL,
  contact_phone TEXT,
  contact_upi_id TEXT,
  avatar_emoji TEXT DEFAULT '👤',
  last_paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.quick_pay_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own favorites" ON public.quick_pay_favorites FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
