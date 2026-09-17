BEGIN;
CREATE UNIQUE INDEX bank_single_active ON public.bank_settings(is_active) WHERE is_active;
CREATE TABLE public.bank_settings_history(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),actor_id uuid NOT NULL,snapshot jsonb NOT NULL,changed_at timestamptz NOT NULL DEFAULT clock_timestamp());
ALTER TABLE public.bank_settings_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY bank_history_service ON public.bank_settings_history TO service_role USING(true) WITH CHECK(true);
REVOKE ALL ON public.bank_settings_history FROM PUBLIC,anon,authenticated;GRANT ALL ON public.bank_settings_history TO service_role;
CREATE FUNCTION public.save_bank_settings(p_actor uuid,p_expected jsonb,p_values jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE current public.bank_settings%ROWTYPE;result jsonb;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_actor AND raw_app_meta_data->>'role'='admin') THEN RAISE EXCEPTION 'Accès refusé.' USING ERRCODE='42501';END IF;
 LOCK TABLE public.bank_settings IN SHARE ROW EXCLUSIVE MODE;
 SELECT * INTO current FROM public.bank_settings WHERE is_active;
 IF jsonb_build_object('beneficiary',coalesce(current.beneficiary,''),'bankName',coalesce(current.bank_name,''),'iban',coalesce(current.iban,'')) IS DISTINCT FROM p_expected
 THEN RAISE EXCEPTION 'Coordonnées modifiées par un autre administrateur.' USING ERRCODE='40001';END IF;
 IF NOT (p_values ?& ARRAY['beneficiary','bankName','iban']) OR length(btrim(p_values->>'beneficiary')) NOT BETWEEN 1 AND 200 OR length(btrim(p_values->>'bankName')) NOT BETWEEN 1 AND 200 OR length(p_values->>'iban') NOT BETWEEN 15 AND 34 THEN RAISE EXCEPTION 'Coordonnées invalides.' USING ERRCODE='22023';END IF;
 IF current.id IS NULL THEN INSERT INTO public.bank_settings(beneficiary,bank_name,iban,is_active,created_at,updated_at) VALUES(p_values->>'beneficiary',p_values->>'bankName',p_values->>'iban',true,now(),now()) RETURNING * INTO current;
 ELSE UPDATE public.bank_settings SET beneficiary=p_values->>'beneficiary',bank_name=p_values->>'bankName',iban=p_values->>'iban',updated_at=clock_timestamp() WHERE id=current.id RETURNING * INTO current;END IF;
 result:=jsonb_build_object('beneficiary',current.beneficiary,'bankName',current.bank_name,'iban',current.iban);
 INSERT INTO public.bank_settings_history(actor_id,snapshot) VALUES(p_actor,result);RETURN result;
END $$;
CREATE FUNCTION public.update_renewal(p_id uuid,p_actor uuid,p_action text) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE renewal public.insurance_renewals%ROWTYPE;r public.insurance_requests%ROWTYPE;role text;rid uuid;target text;
BEGIN
 SELECT request_id INTO rid FROM public.insurance_renewals WHERE id=p_id;
 SELECT * INTO r FROM public.insurance_requests WHERE id=rid FOR UPDATE;
 SELECT * INTO renewal FROM public.insurance_renewals WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Renouvellement introuvable.' USING ERRCODE='P0002';END IF;
 SELECT raw_app_meta_data->>'role' INTO role FROM auth.users WHERE id=p_actor;
 IF role IS NULL OR role NOT IN ('admin','agent') OR (role='agent' AND r.assigned_agent_id IS NOT NULL AND r.assigned_agent_id<>p_actor) THEN RAISE EXCEPTION 'Accès refusé après réattribution.' USING ERRCODE='42501';END IF;
 IF p_action NOT IN ('contact','interest') OR p_action IS NULL THEN RAISE EXCEPTION 'Action invalide.' USING ERRCODE='22023';END IF;
 IF renewal.status NOT IN ('pending','contacted','interested') THEN RAISE EXCEPTION 'Renouvellement terminé.' USING ERRCODE='40001';END IF;
 target:=CASE WHEN p_action='interest' THEN 'interested' ELSE 'contacted' END;
 IF renewal.status='interested' OR renewal.status=target THEN RETURN jsonb_build_object('success',true,'status',renewal.status);END IF;
 UPDATE public.insurance_renewals SET status=target,updated_at=clock_timestamp(),contacted_at=CASE WHEN p_action='contact' THEN clock_timestamp() ELSE contacted_at END WHERE id=p_id;
 INSERT INTO public.activity_logs(request_id,user_id,action,description) VALUES(r.id,p_actor,CASE WHEN p_action='interest' THEN 'renewal_interested' ELSE 'renewal_contacted' END,'Suivi du renouvellement enregistré.');
 RETURN jsonb_build_object('success',true,'status',target);
END $$;
CREATE FUNCTION public.partner_requests_page(p_partner uuid,p_actor uuid,p_status text DEFAULT '',p_q text DEFAULT '',p_page integer DEFAULT 1)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE total bigint;page integer;rows jsonb;statuses text[];
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.partners p JOIN auth.users u ON u.id=p.auth_user_id WHERE p.id=p_partner AND p.auth_user_id=p_actor AND p.is_active AND u.raw_app_meta_data->>'role'='partner') THEN RAISE EXCEPTION 'Accès refusé.' USING ERRCODE='42501';END IF;
 statuses:=CASE p_status WHEN 'waiting' THEN ARRAY['waiting_payment','payment_rejected'] WHEN 'review' THEN ARRAY['payment_review'] WHEN 'processing' THEN ARRAY['payment_confirmed','policy_preparation'] WHEN 'available' THEN ARRAY['policy_available'] WHEN '' THEN NULL ELSE ARRAY[p_status] END;
 SELECT count(*) INTO total FROM public.insurance_requests r JOIN public.clients c ON c.id=r.client_id WHERE r.partner_id=p_partner AND r.source='partner' AND (statuses IS NULL OR r.status=ANY(statuses)) AND (p_q='' OR strpos(lower(r.request_code||' '||coalesce(r.client_snapshot->>'first_name',c.first_name)||' '||coalesce(r.client_snapshot->>'last_name',c.last_name)),lower(btrim(p_q)))>0);
 page:=least(greatest(coalesce(p_page,1),1),greatest(ceil(total/20.0)::integer,1));
 SELECT coalesce(jsonb_agg(row),'[]') INTO rows FROM (SELECT r.id,r.request_code,r.status,r.insurance_duration_years,r.calculated_price,r.created_at,
 jsonb_build_object('first_name',coalesce(r.client_snapshot->>'first_name',c.first_name),'last_name',coalesce(r.client_snapshot->>'last_name',c.last_name)) AS client
 FROM public.insurance_requests r JOIN public.clients c ON c.id=r.client_id WHERE r.partner_id=p_partner AND r.source='partner' AND (statuses IS NULL OR r.status=ANY(statuses)) AND (p_q='' OR strpos(lower(r.request_code||' '||coalesce(r.client_snapshot->>'first_name',c.first_name)||' '||coalesce(r.client_snapshot->>'last_name',c.last_name)),lower(btrim(p_q)))>0)
 ORDER BY r.created_at DESC,r.id LIMIT 20 OFFSET (page-1)*20) row;
 RETURN jsonb_build_object('rows',rows,'total',total,'page',page,'pages',greatest(ceil(total/20.0)::integer,1),'first',CASE WHEN total=0 THEN 0 ELSE (page-1)*20+1 END,'last',least(page*20,total));
END $$;
CREATE FUNCTION public.retry_notification(p_id uuid,p_actor uuid,p_reason text) RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_actor AND raw_app_meta_data->>'role'='admin') THEN RAISE EXCEPTION 'Accès refusé.' USING ERRCODE='42501';END IF;
 IF length(btrim(coalesce(p_reason,''))) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Vérification du fournisseur obligatoire.' USING ERRCODE='22023';END IF;
 UPDATE public.notification_outbox SET status='pending',available_at=now(),attempts=0,lease_token=NULL,leased_at=NULL,last_error='Relance vérifiée par '||p_actor::text||': '||p_reason
 WHERE id=p_id AND (status='failed' OR (status='processing' AND leased_at<now()-interval '10 minutes'));RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.save_bank_settings(uuid,jsonb,jsonb),public.update_renewal(uuid,uuid,text),public.partner_requests_page(uuid,uuid,text,text,integer),public.retry_notification(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_bank_settings(uuid,jsonb,jsonb),public.update_renewal(uuid,uuid,text),public.partner_requests_page(uuid,uuid,text,text,integer),public.retry_notification(uuid,uuid,text) TO service_role;
CREATE FUNCTION public.create_nationality_grid(p_actor uuid,p_company uuid,p_effective date,p_expected_latest date,p_bands jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE latest date;band jsonb;previous_end integer:=-1;result jsonb;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_actor AND raw_app_meta_data->>'role'='admin') THEN RAISE EXCEPTION 'Accès refusé.' USING ERRCODE='42501';END IF;
 PERFORM 1 FROM public.insurance_companies WHERE id=p_company AND business_code='skyline' AND is_active FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Assureur indisponible.' USING ERRCODE='22023';END IF;
 SELECT max(effective_from) INTO latest FROM public.insurance_nationality_rates WHERE insurance_company_id=p_company AND nationality='CG';
 IF latest IS DISTINCT FROM p_expected_latest THEN RAISE EXCEPTION 'Grille modifiée entre-temps.' USING ERRCODE='40001';END IF;
 IF p_effective IS NULL OR p_effective<=(now() AT TIME ZONE 'Europe/Istanbul')::date OR p_effective<=latest OR p_bands IS NULL OR jsonb_typeof(p_bands)<>'array' OR jsonb_array_length(p_bands) NOT BETWEEN 1 AND 121 THEN RAISE EXCEPTION 'Nouvelle grille future obligatoire.' USING ERRCODE='22023';END IF;
 FOR band IN SELECT value FROM jsonb_array_elements(p_bands) ORDER BY (value->>'min_age')::integer LOOP
  IF NOT (band ?& ARRAY['min_age','max_age','one_year_cost','two_year_cost','one_year_price','two_year_price']) OR (band->>'min_age')::integer<>previous_end+1 OR (band->>'max_age')::integer NOT BETWEEN (band->>'min_age')::integer AND 120 OR (band->>'one_year_cost')::numeric NOT BETWEEN 0 AND 999999999.99 OR (band->>'two_year_cost')::numeric NOT BETWEEN 0 AND 999999999.99 OR (band->>'one_year_price')::numeric NOT BETWEEN 0.01 AND 999999999.99 OR (band->>'two_year_price')::numeric NOT BETWEEN 0.01 AND 999999999.99
  THEN RAISE EXCEPTION 'Tranche invalide ou incomplète.' USING ERRCODE='22023';END IF;
  IF EXISTS(SELECT 1 FROM jsonb_each_text(band) v WHERE v.key IN ('one_year_cost','two_year_cost','one_year_price','two_year_price') AND v.value::numeric<>round(v.value::numeric,2)) THEN RAISE EXCEPTION 'Deux décimales maximum.' USING ERRCODE='22023';END IF;
  previous_end:=(band->>'max_age')::integer;
  INSERT INTO public.insurance_nationality_rates(insurance_company_id,nationality,min_age,max_age,one_year_cost,two_year_cost,one_year_price,two_year_price,effective_from)
  VALUES(p_company,'CG',(band->>'min_age')::integer,(band->>'max_age')::integer,(band->>'one_year_cost')::numeric,(band->>'two_year_cost')::numeric,(band->>'one_year_price')::numeric,(band->>'two_year_price')::numeric,p_effective);
 END LOOP;
 SELECT jsonb_agg(to_jsonb(r) ORDER BY min_age) INTO result FROM public.insurance_nationality_rates r WHERE insurance_company_id=p_company AND nationality='CG' AND effective_from=p_effective;RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.create_nationality_grid(uuid,uuid,date,date,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_nationality_grid(uuid,uuid,date,date,jsonb) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
