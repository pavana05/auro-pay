CREATE OR REPLACE FUNCTION public.resolve_unknown_states()
RETURNS TABLE(scanned int, resolved int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_scanned int := 0;
  v_resolved int := 0;
  r record;
  v_code text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;

  FOR r IN
    SELECT id, phone FROM profiles
    WHERE COALESCE(state_source, 'unknown') = 'unknown'
      AND phone IS NOT NULL
  LOOP
    v_scanned := v_scanned + 1;
    v_code := public.infer_state_from_phone(r.phone);
    IF v_code IS NOT NULL THEN
      UPDATE profiles SET state_code = v_code, state_source = 'inferred' WHERE id = r.id;
      v_resolved := v_resolved + 1;
    END IF;
  END LOOP;

  INSERT INTO audit_logs (admin_user_id, target_type, target_id, action, details)
  VALUES (auth.uid(), 'system', NULL, 'bulk_resolve_unknown_states',
    jsonb_build_object('scanned', v_scanned, 'resolved', v_resolved));

  RETURN QUERY SELECT v_scanned, v_resolved;
END;
$$;