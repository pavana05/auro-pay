CREATE TABLE public.admin_user_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_user_id uuid NOT NULL,
  admin_user_id uuid NOT NULL,
  note text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_user_notes_target ON public.admin_user_notes(target_user_id, created_at DESC);

ALTER TABLE public.admin_user_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all admin notes"
  ON public.admin_user_notes FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert admin notes"
  ON public.admin_user_notes FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND admin_user_id = auth.uid());

CREATE POLICY "Admins can delete admin notes"
  ON public.admin_user_notes FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));