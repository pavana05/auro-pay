CREATE TABLE public.recurring_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  favorite_id uuid NOT NULL REFERENCES public.quick_pay_favorites(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  frequency text NOT NULL DEFAULT 'monthly',
  next_run_at timestamp with time zone NOT NULL,
  is_active boolean DEFAULT true,
  note text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.recurring_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own recurring payments"
  ON public.recurring_payments FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);