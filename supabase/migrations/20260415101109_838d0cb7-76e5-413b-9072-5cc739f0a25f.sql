
-- Storage bucket for reward images
INSERT INTO storage.buckets (id, name, public) VALUES ('reward-images', 'reward-images', true);

-- Storage policies
CREATE POLICY "Anyone can view reward images"
ON storage.objects FOR SELECT
USING (bucket_id = 'reward-images');

CREATE POLICY "Admins can upload reward images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'reward-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update reward images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'reward-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete reward images"
ON storage.objects FOR DELETE
USING (bucket_id = 'reward-images' AND has_role(auth.uid(), 'admin'::app_role));

-- Reward redemptions table
CREATE TABLE public.reward_redemptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reward_id UUID NOT NULL REFERENCES public.rewards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  redeemed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create own redemptions"
ON public.reward_redemptions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own redemptions"
ON public.reward_redemptions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all redemptions"
ON public.reward_redemptions FOR SELECT
TO public
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger to increment used_count on reward when redeemed
CREATE OR REPLACE FUNCTION public.increment_reward_used_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.rewards SET used_count = COALESCE(used_count, 0) + 1 WHERE id = NEW.reward_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_reward_redeemed
AFTER INSERT ON public.reward_redemptions
FOR EACH ROW
EXECUTE FUNCTION public.increment_reward_used_count();

-- Unique constraint: one redemption per user per reward
CREATE UNIQUE INDEX idx_reward_redemptions_unique ON public.reward_redemptions(reward_id, user_id);
