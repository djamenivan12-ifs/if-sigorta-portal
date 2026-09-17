BEGIN;
ALTER TABLE public.insurance_requests ADD COLUMN client_snapshot jsonb;
CREATE TABLE public.partner_submission_operations(partner_id uuid NOT NULL REFERENCES public.partners(id),submission_id uuid NOT NULL,
 actor_id uuid NOT NULL,payload jsonb NOT NULL,result jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(partner_id,submission_id));
CREATE TABLE public.partner_request_drafts(partner_id uuid PRIMARY KEY REFERENCES public.partners(id) ON DELETE CASCADE,
 payload jsonb NOT NULL,version bigint NOT NULL DEFAULT 1,updated_at timestamptz NOT NULL DEFAULT now(),expires_at timestamptz NOT NULL DEFAULT now()+interval '7 days');
ALTER TABLE public.partner_submission_operations ENABLE ROW LEVEL SECURITY;ALTER TABLE public.partner_request_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY submissions_service ON public.partner_submission_operations TO service_role USING(true) WITH CHECK(true);
CREATE POLICY drafts_service ON public.partner_request_drafts TO service_role USING(true) WITH CHECK(true);
REVOKE ALL ON public.partner_submission_operations,public.partner_request_drafts FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.partner_submission_operations,public.partner_request_drafts TO service_role;
CREATE FUNCTION public.create_partner_request(p_partner_id uuid,p_actor_id uuid,p_submission_id uuid,p_payload jsonb,
 p_client jsonb,p_existing_client_id uuid,p_request jsonb,p_documents jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE previous public.partner_submission_operations%ROWTYPE;c public.clients%ROWTYPE;r public.insurance_requests%ROWTYPE;doc jsonb;result jsonb;
BEGIN
 IF p_submission_id IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users u JOIN public.partners p ON p.auth_user_id=u.id
 WHERE u.id=p_actor_id AND u.raw_app_meta_data->>'role'='partner' AND p.id=p_partner_id AND p.is_active)
 THEN RAISE EXCEPTION 'Accès partenaire refusé.' USING ERRCODE='42501';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_partner_id::text||p_submission_id::text,0));
 SELECT * INTO previous FROM public.partner_submission_operations WHERE partner_id=p_partner_id AND submission_id=p_submission_id;
 IF FOUND THEN IF previous.actor_id IS DISTINCT FROM p_actor_id OR previous.payload IS DISTINCT FROM p_payload
  THEN RAISE EXCEPTION 'Soumission modifiée.' USING ERRCODE='40001';END IF;RETURN previous.result;END IF;
 IF p_existing_client_id IS NOT NULL THEN
  SELECT * INTO c FROM public.clients WHERE id=p_existing_client_id FOR KEY SHARE;
  IF NOT FOUND OR upper(btrim(c.first_name)) IS DISTINCT FROM p_client->>'first_name' OR upper(btrim(c.last_name)) IS DISTINCT FROM p_client->>'last_name'
   OR c.birth_date IS DISTINCT FROM (p_client->>'birth_date')::date THEN RAISE EXCEPTION 'Identité du client modifiée.' USING ERRCODE='40001';END IF;
 ELSE
  c:=jsonb_populate_record(NULL::public.clients,p_client||jsonb_build_object('id',gen_random_uuid(),'created_at',now(),'updated_at',now()));
  INSERT INTO public.clients SELECT c.*;
 END IF;
 r:=jsonb_populate_record(NULL::public.insurance_requests,p_request||jsonb_build_object('id',p_submission_id,'client_id',c.id,'source','partner','partner_id',p_partner_id,'status','waiting_payment','created_at',now(),'updated_at',now(),'client_snapshot',p_client));
 IF r.insurance_duration_years NOT IN (1,2) OR r.calculated_price IS NULL OR r.calculated_price<=0 OR jsonb_typeof(p_documents)<>'array' OR jsonb_array_length(p_documents) NOT BETWEEN 1 AND 3
 THEN RAISE EXCEPTION 'Dossier invalide.' USING ERRCODE='22023';END IF;
 INSERT INTO public.insurance_requests SELECT r.*;
 FOR doc IN SELECT value FROM jsonb_array_elements(p_documents) LOOP
  IF doc->>'document_type' NOT IN ('passport','kimlik_front','kimlik_back') OR NOT (doc->>'storage_path' LIKE r.id::text||'/%') THEN RAISE EXCEPTION 'Document invalide.' USING ERRCODE='22023';END IF;
  INSERT INTO public.uploaded_documents(request_id,document_type,storage_path,original_file_name,mime_type,file_size,uploaded_at)
  VALUES(r.id,doc->>'document_type',doc->>'storage_path',doc->>'original_file_name',doc->>'mime_type',(doc->>'file_size')::bigint,now());
 END LOOP;
 INSERT INTO public.activity_logs(request_id,user_id,action,description) VALUES(r.id,p_actor_id,'request_created','Dossier créé par le partenaire.');
 result:=jsonb_build_object('success',true,'requestId',r.id,'requestCode',r.request_code,'status',r.status,'source',r.source,'calculatedAge',r.calculated_age,'calculatedPrice',r.calculated_price,'duration',r.insurance_duration_years,'hasKimlik',r.has_kimlik,'insuranceStartDate',r.insurance_start_date);
 INSERT INTO public.partner_submission_operations(partner_id,submission_id,actor_id,payload,result) VALUES(p_partner_id,p_submission_id,p_actor_id,p_payload,result);
 DELETE FROM public.partner_request_drafts WHERE partner_id=p_partner_id AND payload->>'submissionId'=p_submission_id::text;
 RETURN result;
END $$;
CREATE FUNCTION public.save_partner_draft(p_partner_id uuid,p_actor_id uuid,p_expected_version bigint,p_payload jsonb)
RETURNS bigint LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE v bigint;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.partners p JOIN auth.users u ON u.id=p.auth_user_id WHERE p.id=p_partner_id AND p.auth_user_id=p_actor_id AND p.is_active AND u.raw_app_meta_data->>'role'='partner')
 THEN RAISE EXCEPTION 'Accès refusé.' USING ERRCODE='42501';END IF;
 IF p_payload IS NULL OR jsonb_typeof(p_payload)<>'object' OR octet_length(p_payload::text)>32768 THEN RAISE EXCEPTION 'Brouillon invalide.' USING ERRCODE='22023';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_partner_id::text,0));
 SELECT version INTO v FROM public.partner_request_drafts WHERE partner_id=p_partner_id FOR UPDATE;
 IF coalesce(v,0) IS DISTINCT FROM p_expected_version THEN RAISE EXCEPTION 'Brouillon modifié dans une autre fenêtre.' USING ERRCODE='40001';END IF;
 INSERT INTO public.partner_request_drafts(partner_id,payload,version,updated_at,expires_at) VALUES(p_partner_id,p_payload,1,now(),now()+interval '7 days')
 ON CONFLICT(partner_id) DO UPDATE SET payload=excluded.payload,version=partner_request_drafts.version+1,updated_at=now(),expires_at=excluded.expires_at RETURNING version INTO v;
 RETURN v;
END $$;
REVOKE ALL ON FUNCTION public.create_partner_request(uuid,uuid,uuid,jsonb,jsonb,uuid,jsonb,jsonb),public.save_partner_draft(uuid,uuid,bigint,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_partner_request(uuid,uuid,uuid,jsonb,jsonb,uuid,jsonb,jsonb),public.save_partner_draft(uuid,uuid,bigint,jsonb) TO service_role;
COMMIT;
