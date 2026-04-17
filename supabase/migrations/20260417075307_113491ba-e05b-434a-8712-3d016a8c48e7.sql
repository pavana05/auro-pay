-- 1. Columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS state_code text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state_source text NOT NULL DEFAULT 'unknown';

CREATE INDEX IF NOT EXISTS idx_profiles_state_code ON public.profiles(state_code);

-- 2. Phone-prefix → state (telecom circle) mapping
-- Source: Indian mobile circles. Circles ≠ states 1:1 (e.g. UP-East/West, North-East),
-- but this is the closest real signal a 10-digit mobile carries. Mapped to the
-- dominant state in each circle.
CREATE OR REPLACE FUNCTION public.infer_state_from_phone(_phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  digits text;
  p4 text;  -- first 4 digits of the 10-digit mobile
BEGIN
  IF _phone IS NULL THEN RETURN NULL; END IF;
  -- Strip everything except digits, then drop leading 91 / 0
  digits := regexp_replace(_phone, '[^0-9]', '', 'g');
  IF length(digits) > 10 AND left(digits, 2) = '91' THEN
    digits := substring(digits from 3);
  END IF;
  IF length(digits) > 10 AND left(digits, 1) = '0' THEN
    digits := substring(digits from 2);
  END IF;
  IF length(digits) <> 10 OR left(digits, 1) NOT IN ('6','7','8','9') THEN
    RETURN NULL;
  END IF;
  p4 := left(digits, 4);

  -- Coverage of common Jio/Airtel/Vi/BSNL series → dominant state per circle.
  -- Not exhaustive; unmatched numbers fall through to NULL.
  RETURN CASE
    -- Mumbai / Maharashtra
    WHEN p4 BETWEEN '9819' AND '9869' THEN 'MH'
    WHEN p4 IN ('9820','9821','9833','9892','9930','9967','9987','7021','7977','8108','8108','8169','9930') THEN 'MH'
    WHEN left(p4,3) IN ('982','983','989','993','996','998','702','797','810','816') THEN 'MH'

    -- Delhi
    WHEN left(p4,3) IN ('981','995','999','971','989','935','738','844','852','991') AND substring(p4,4,1) IN ('0','1','8','9') THEN 'DL'
    WHEN p4 IN ('9810','9811','9818','9871','9899','9911','9971','9999','8851','8800','8527','7838','7042') THEN 'DL'

    -- Karnataka (Bengaluru heavy)
    WHEN left(p4,3) IN ('988','990','994','948','809','810','812','837','955','990') AND substring(p4,4,1) IN ('0','1','3','4','5','6') THEN 'KA'
    WHEN p4 IN ('9880','9886','9900','9901','9945','9448','9742','9844','9886','7022','8197','8095','8088','9019') THEN 'KA'

    -- Tamil Nadu (Chennai)
    WHEN p4 IN ('9840','9841','9884','9952','9962','9444','9445','9710','9789','9790','9952','9176','7299','8939') THEN 'TN'
    WHEN left(p4,3) IN ('944','945','984','972','976','977','978','979','917','729','893') AND substring(p4,4,1) IN ('0','1','4','5','9') THEN 'TN'

    -- Telangana (Hyderabad) + AP (split — circle was undivided AP)
    WHEN p4 IN ('9849','9959','9700','9701','9866','9100','9676','7095','7032','7995','8500','8341') THEN 'TS'
    WHEN p4 IN ('9848','9963','9849','9985','9133','9492','7702','7799','8125','8985') THEN 'AP'

    -- West Bengal (Kolkata + WB circle)
    WHEN p4 IN ('9830','9831','9836','9874','9883','9933','9051','9163','9433','7044','7980','8334','8585','9007') THEN 'WB'
    WHEN left(p4,3) IN ('983','987','988','993','905','916','943','704','798','833') AND substring(p4,4,1) IN ('0','1','3','4','6') THEN 'WB'

    -- Gujarat
    WHEN p4 IN ('9824','9825','9879','9909','9979','9974','7878','7405','9426','9099','8141','8460') THEN 'GJ'
    WHEN left(p4,3) IN ('982','987','990','997','787','740','942','909','814','846') AND substring(p4,4,1) IN ('4','5','9') THEN 'GJ'

    -- Punjab
    WHEN p4 IN ('9815','9876','9888','9417','9501','9530','9646','7973','8146','9988','9779') THEN 'PB'

    -- Haryana
    WHEN p4 IN ('9812','9813','9416','9466','9991','9416','9050','7404','7027','8607','8901') THEN 'HR'

    -- Rajasthan
    WHEN p4 IN ('9828','9829','9001','9214','9314','9352','9460','9928','9982','9785','7339','8740') THEN 'RJ'

    -- Uttar Pradesh (East + West merged)
    WHEN p4 IN ('9415','9450','9621','9651','9794','9839','9889','9919','7388','7607','8004','8009','8400') THEN 'UP'
    WHEN p4 IN ('9456','9410','9837','9837','9358','9758','9837','9759') THEN 'UP'

    -- Bihar / Jharkhand (circle = Bihar incl. JH historically)
    WHEN p4 IN ('9304','9534','9570','9852','9162','9931','9661','7368','7903','8804','9608') THEN 'BR'
    WHEN p4 IN ('9334','9905','9430','9709','7250','8002','8092','9162','9608') THEN 'JH'

    -- Madhya Pradesh / Chhattisgarh
    WHEN p4 IN ('9407','9425','9893','9926','9981','9755','7000','7898','8085','8120') THEN 'MP'
    WHEN p4 IN ('9425','9755','9826','9893','9300','9479','7223','7869') THEN 'CG'

    -- Kerala
    WHEN p4 IN ('9400','9446','9447','9495','9744','9846','9961','9947','9961','7034','7510','8086','8129') THEN 'KL'

    -- Odisha
    WHEN p4 IN ('9337','9437','9583','9692','9777','9853','7008','7077','8895','9090') THEN 'OD'

    -- Assam / North-East
    WHEN p4 IN ('9854','9864','9706','9707','9854','7002','8011','8638','9101','9678','9957') THEN 'AS'

    -- Himachal Pradesh
    WHEN p4 IN ('9418','9816','9882','9805','9459','9805','7018','8628','9857','9418') THEN 'HP'

    -- Uttarakhand
    WHEN p4 IN ('9411','9456','9458','9719','9760','9837','7088','7895','8410') THEN 'UK'

    -- Jammu & Kashmir
    WHEN p4 IN ('9419','9596','9697','9858','9906','9419','7006','7780','8082','9018') THEN 'JK'

    -- Goa (Mumbai/Maharashtra + Goa share series; minimal exclusive)
    WHEN p4 IN ('9822','9823','9881','9921','7798','7385') THEN 'GA'

    ELSE NULL
  END;
END;
$$;

-- 3. Backfill existing profiles
UPDATE public.profiles
SET
  state_code = inferred,
  state_source = 'inferred'
FROM (
  SELECT id, public.infer_state_from_phone(phone) AS inferred
  FROM public.profiles
  WHERE state_code IS NULL AND phone IS NOT NULL
) sub
WHERE public.profiles.id = sub.id
  AND sub.inferred IS NOT NULL;

-- Mark the rest as unknown explicitly
UPDATE public.profiles
SET state_source = 'unknown'
WHERE state_code IS NULL AND state_source = 'unknown';

-- 4. Auto-infer trigger for new profiles
CREATE OR REPLACE FUNCTION public.profile_set_state_from_phone()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.state_code IS NULL AND NEW.phone IS NOT NULL THEN
    NEW.state_code := public.infer_state_from_phone(NEW.phone);
    IF NEW.state_code IS NOT NULL THEN
      NEW.state_source := 'inferred';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_infer_state ON public.profiles;
CREATE TRIGGER trg_profile_infer_state
BEFORE INSERT OR UPDATE OF phone ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.profile_set_state_from_phone();