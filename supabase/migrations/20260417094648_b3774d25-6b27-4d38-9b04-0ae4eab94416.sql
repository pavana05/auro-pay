
-- Trigger: when a parent links a teen, notify the teen via SECURITY DEFINER (bypasses RLS)
CREATE OR REPLACE FUNCTION public.notify_teen_on_parent_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_name text;
BEGIN
  IF NEW.is_active IS DISTINCT FROM true THEN
    RETURN NEW;
  END IF;
  SELECT COALESCE(full_name, 'Your parent') INTO v_parent_name
  FROM profiles WHERE id = NEW.parent_id;

  INSERT INTO notifications (user_id, title, body, type)
  VALUES (
    NEW.teen_id,
    '🔗 Parent linked',
    v_parent_name || ' just linked with you on AuroPay',
    'parent_link'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_teen_on_parent_link ON public.parent_teen_links;
CREATE TRIGGER trg_notify_teen_on_parent_link
AFTER INSERT ON public.parent_teen_links
FOR EACH ROW EXECUTE FUNCTION public.notify_teen_on_parent_link();

-- Ensure realtime is enabled on notifications + parent_teen_links
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'parent_teen_links'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.parent_teen_links';
  END IF;
END $$;

ALTER TABLE public.notifications REPLICA IDENTITY FULL;
