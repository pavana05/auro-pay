CREATE POLICY "Admins can view all quick pay favorites"
ON public.quick_pay_favorites
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));