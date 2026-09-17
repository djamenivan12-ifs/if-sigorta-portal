BEGIN;
CREATE TABLE public.workflow_operations (
 request_id uuid NOT NULL REFERENCES public.insurance_requests(id) ON DELETE CASCADE,
 operation_key text NOT NULL, actor_id uuid, payload jsonb NOT NULL, result jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(request_id,operation_key)
);
ALTER TABLE public.workflow_operations ENABLE ROW LEVEL SECURITY;
CREATE POLICY workflow_service ON public.workflow_operations TO service_role USING(true) WITH CHECK(true);
REVOKE ALL ON public.workflow_operations FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.workflow_operations TO service_role;
CREATE TABLE public.notification_outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_key text NOT NULL UNIQUE,
 request_id uuid REFERENCES public.insurance_requests(id) ON DELETE CASCADE,
 template text NOT NULL, payload jsonb NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','sent','failed')),
 attempts integer NOT NULL DEFAULT 0, available_at timestamptz NOT NULL DEFAULT now(),
 lease_token uuid, leased_at timestamptz, last_error text, sent_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;
CREATE POLICY outbox_service ON public.notification_outbox TO service_role USING(true) WITH CHECK(true);
REVOKE ALL ON public.notification_outbox FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.notification_outbox TO service_role;
CREATE INDEX outbox_pending ON public.notification_outbox(available_at,created_at) WHERE status IN ('pending','failed','processing');

CREATE FUNCTION public.submit_payment_receipt(p_request_id uuid,p_actor_id uuid,p_partner_id uuid,
 p_request_code text,p_country text,p_phone text,p_pending_path text,p_document jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE r public.insurance_requests%ROWTYPE; c public.clients%ROWTYPE; pay public.payments%ROWTYPE;
 previous public.workflow_operations%ROWTYPE; result jsonb; stamp timestamptz:=clock_timestamp();
 action text; key text:='receipt:'||p_pending_path; old_path text; role text;
BEGIN
 SELECT * INTO r FROM public.insurance_requests WHERE id=p_request_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Dossier introuvable.' USING ERRCODE='P0002'; END IF;
 IF p_partner_id IS NOT NULL THEN
  SELECT raw_app_meta_data->>'role' INTO role FROM auth.users WHERE id=p_actor_id;
  IF role IS DISTINCT FROM 'partner' OR r.source<>'partner' OR r.partner_id IS DISTINCT FROM p_partner_id
    OR NOT EXISTS(SELECT 1 FROM public.partners WHERE id=p_partner_id AND auth_user_id=p_actor_id AND is_active)
   THEN RAISE EXCEPTION 'Accès partenaire refusé.' USING ERRCODE='42501'; END IF;
 ELSE
  SELECT * INTO c FROM public.clients WHERE id=r.client_id;
  IF r.source<>'direct' OR r.request_code IS DISTINCT FROM p_request_code OR c.whatsapp_country_code IS DISTINCT FROM p_country
   OR regexp_replace(c.whatsapp_number,'[^0-9]','','g') IS DISTINCT FROM p_phone
   THEN RAISE EXCEPTION 'Les informations ne correspondent pas au dossier.' USING ERRCODE='42501'; END IF;
 END IF;
 SELECT * INTO previous FROM public.workflow_operations WHERE request_id=r.id AND operation_key=key;
 IF FOUND THEN
  IF previous.actor_id IS DISTINCT FROM p_actor_id OR previous.payload IS DISTINCT FROM (p_document-'storage_path')
   THEN RAISE EXCEPTION 'La soumission a changé.' USING ERRCODE='40001'; END IF;
  RETURN previous.result;
 END IF;
 IF r.status NOT IN ('waiting_payment','payment_rejected') THEN RAISE EXCEPTION 'Le statut du dossier a changé. Actualisez la page.' USING ERRCODE='40001'; END IF;
 IF p_pending_path IS NULL OR p_document IS NULL OR NOT (p_document ?& ARRAY['storage_path','mime_type','file_size','original_file_name']) OR NOT (p_document->>'storage_path' LIKE r.id::text||'/payment_receipt/%') OR
    p_document->>'mime_type' NOT IN ('application/pdf','image/jpeg','image/png') OR
    (p_document->>'file_size')::bigint NOT BETWEEN 1 AND 10485760 OR
    coalesce(p_document->>'original_file_name','')='' OR
    NOT (p_pending_path LIKE CASE WHEN p_partner_id IS NOT NULL THEN 'pending/partner/'||p_partner_id::text||'/payment/'||r.id::text||'/%'
      WHEN r.status='payment_rejected' THEN 'pending/direct/payment-reupload/'||r.id::text||'/%' ELSE 'pending/direct/payment/'||r.id::text||'/%' END)
 THEN RAISE EXCEPTION 'Justificatif invalide.' USING ERRCODE='22023'; END IF;
 SELECT * INTO pay FROM public.payments WHERE request_id=r.id FOR UPDATE;
 IF (r.status='waiting_payment' AND FOUND) OR (r.status='payment_rejected' AND (NOT FOUND OR pay.status<>'rejected'))
 THEN RAISE EXCEPTION 'Le paiement a changé.' USING ERRCODE='40001'; END IF;
 SELECT storage_path INTO old_path FROM public.uploaded_documents WHERE request_id=r.id AND document_type='payment_receipt';
 INSERT INTO public.uploaded_documents(request_id,document_type,storage_path,original_file_name,mime_type,file_size,uploaded_at)
 VALUES(r.id,'payment_receipt',p_document->>'storage_path',p_document->>'original_file_name',p_document->>'mime_type',(p_document->>'file_size')::bigint,stamp)
 ON CONFLICT(request_id,document_type) DO UPDATE SET storage_path=excluded.storage_path,original_file_name=excluded.original_file_name,
 mime_type=excluded.mime_type,file_size=excluded.file_size,uploaded_at=excluded.uploaded_at;
 IF r.status='waiting_payment' THEN
  INSERT INTO public.payments(request_id,payment_method,expected_amount,status,submitted_at)
  VALUES(r.id,'bank_transfer',r.calculated_price,'submitted',stamp);
 ELSE
  UPDATE public.payments SET status='submitted',submitted_at=stamp,verified_at=NULL,verified_by=NULL,rejection_reason=NULL WHERE id=pay.id;
 END IF;
 UPDATE public.insurance_requests SET status='payment_review',updated_at=stamp WHERE id=r.id;
 action:=CASE WHEN r.status='payment_rejected' THEN 'payment_reuploaded' ELSE 'payment_submitted' END;
 INSERT INTO public.activity_logs(request_id,user_id,action,description) VALUES(r.id,p_actor_id,action,'Justificatif de paiement enregistré.');
 result:=jsonb_build_object('success',true,'status','payment_review','requestId',r.id,'requestCode',r.request_code);
 INSERT INTO public.workflow_operations VALUES(r.id,key,p_actor_id,p_document-'storage_path',result,stamp);
 INSERT INTO public.notification_outbox(event_key,request_id,template,payload)
 VALUES(r.id::text||':'||key,r.id,'payment_admin',jsonb_build_object('requestCode',r.request_code,'source',r.source,'amount',r.calculated_price)) ON CONFLICT(event_key) DO NOTHING;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.submit_payment_receipt(uuid,uuid,uuid,text,text,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.submit_payment_receipt(uuid,uuid,uuid,text,text,text,text,jsonb) TO service_role;

CREATE FUNCTION public.adopt_insurance_policies(p_request_id uuid,p_actor_id uuid,p_expected_updated_at timestamptz,
 p_start date,p_end date,p_policies jsonb,p_operation_key text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE r public.insurance_requests%ROWTYPE; previous public.workflow_operations%ROWTYPE;
 item jsonb; yr integer; old_path text; role text; years jsonb; complete boolean; became boolean;
 final_status text; stamp timestamptz:=clock_timestamp(); result jsonb; payload jsonb;
 c public.clients%ROWTYPE; partner public.partners%ROWTYPE;
BEGIN
 SELECT raw_app_meta_data->>'role' INTO role FROM auth.users WHERE id=p_actor_id;
 SELECT * INTO r FROM public.insurance_requests WHERE id=p_request_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Dossier introuvable.' USING ERRCODE='P0002'; END IF;
 IF role IS NULL OR role NOT IN ('admin','agent') OR (role='agent' AND r.assigned_agent_id IS DISTINCT FROM p_actor_id)
 THEN RAISE EXCEPTION 'Accès refusé après réattribution.' USING ERRCODE='42501'; END IF;
 payload:=jsonb_build_object('start',p_start,'end',p_end,'policies',(SELECT coalesce(jsonb_agg(value-'finalPath'-'pendingPath'),'[]') FROM jsonb_array_elements(p_policies))); 
 SELECT * INTO previous FROM public.workflow_operations WHERE request_id=r.id AND operation_key='policy:'||p_operation_key;
 IF FOUND THEN
  IF previous.actor_id IS DISTINCT FROM p_actor_id OR previous.payload IS DISTINCT FROM payload THEN RAISE EXCEPTION 'Opération modifiée.' USING ERRCODE='40001'; END IF;
  RETURN previous.result;
 END IF;
 IF r.updated_at IS DISTINCT FROM p_expected_updated_at OR r.status NOT IN ('policy_preparation','policy_available')
 THEN RAISE EXCEPTION 'Le dossier a changé. Actualisez la page.' USING ERRCODE='40001'; END IF;
 IF p_operation_key IS NULL OR length(p_operation_key)>2000 OR p_start IS NULL OR p_end IS NULL OR p_end<=p_start OR jsonb_typeof(p_policies)<>'array' OR jsonb_array_length(p_policies)>2
 THEN RAISE EXCEPTION 'Dates ou polices invalides.' USING ERRCODE='22023'; END IF;
 IF (SELECT count(*)<>count(DISTINCT value->>'policyYear') FROM jsonb_array_elements(p_policies))
 THEN RAISE EXCEPTION 'Année en double.' USING ERRCODE='22023'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_policies) LOOP
  yr:=(item->>'policyYear')::integer;
  IF NOT (item ?& ARRAY['policyYear','mimeType','fileSize','finalPath','originalFileName','pendingPath']) OR yr NOT BETWEEN 1 AND r.insurance_duration_years OR item->>'mimeType'<>'application/pdf' OR
   (item->>'fileSize')::bigint NOT BETWEEN 1 AND 10485760 OR NOT (item->>'finalPath' LIKE r.id::text||'/insurance_policy/year_'||yr::text||'/%')
  THEN RAISE EXCEPTION 'Police invalide.' USING ERRCODE='22023'; END IF;
  SELECT storage_path INTO old_path FROM public.insurance_policies WHERE request_id=r.id AND policy_year=yr;
  INSERT INTO public.insurance_policies(request_id,policy_year,storage_path,uploaded_at)
  VALUES(r.id,yr,item->>'finalPath',stamp) ON CONFLICT(request_id,policy_year) DO UPDATE SET storage_path=excluded.storage_path,uploaded_at=excluded.uploaded_at;
  INSERT INTO public.uploaded_documents(request_id,document_type,storage_path,original_file_name,mime_type,file_size,uploaded_at)
  VALUES(r.id,CASE yr WHEN 1 THEN 'insurance_policy_year_1' ELSE 'insurance_policy_year_2' END,item->>'finalPath',item->>'originalFileName','application/pdf',(item->>'fileSize')::bigint,stamp)
  ON CONFLICT(request_id,document_type) DO UPDATE SET storage_path=excluded.storage_path,original_file_name=excluded.original_file_name,mime_type=excluded.mime_type,file_size=excluded.file_size,uploaded_at=excluded.uploaded_at;
  INSERT INTO public.activity_logs(request_id,user_id,action,description)
  VALUES(r.id,p_actor_id,CASE WHEN old_path IS NULL THEN 'policy_uploaded_year_' ELSE 'policy_replaced_year_' END||yr::text,'Police annuelle enregistrée.');
 END LOOP;
 SELECT coalesce(jsonb_agg(policy_year ORDER BY policy_year),'[]') INTO years FROM public.insurance_policies WHERE request_id=r.id AND coalesce(storage_path,'')<>'';
 complete:=years @> '[1]'::jsonb AND (r.insurance_duration_years=1 OR years @> '[2]'::jsonb);
 final_status:=CASE WHEN complete THEN 'policy_available' ELSE 'policy_preparation' END;
 became:=complete AND r.status='policy_preparation';
 UPDATE public.insurance_requests SET status=final_status,policy_start_date=p_start,policy_end_date=p_end,updated_at=stamp WHERE id=r.id;
 IF complete AND r.source='direct' THEN
  INSERT INTO public.insurance_renewals(request_id,client_id,status,updated_at) VALUES(r.id,r.client_id,'pending',stamp) ON CONFLICT(request_id) DO NOTHING;
 END IF;
 IF became THEN
  SELECT * INTO c FROM public.clients WHERE id=r.client_id;
  SELECT * INTO partner FROM public.partners WHERE id=r.partner_id;
  INSERT INTO public.notification_outbox(event_key,request_id,template,payload)
  VALUES(r.id::text||':policy_available',r.id,CASE WHEN r.source='partner' THEN 'partner_policy_available' ELSE 'policy_available' END,
   jsonb_build_object('actorId',p_actor_id,'phoneNumber',CASE WHEN r.source='partner' THEN partner.whatsapp_country_code||partner.whatsapp_number ELSE c.whatsapp_country_code||c.whatsapp_number END,
   'matricule',r.request_code,'firstName',c.first_name,'preferredLanguage',r.preferred_language,'partnerName',coalesce(partner.manager_name,partner.company_name),'clientName',c.first_name)) ON CONFLICT(event_key) DO NOTHING;
 END IF;
 result:=jsonb_build_object('success',true,'completed',complete,'status',final_status,'existingYears',years,'policyStartDate',p_start,'policyEndDate',p_end,'whatsappNotificationTriggered',became);
 INSERT INTO public.workflow_operations VALUES(r.id,'policy:'||p_operation_key,p_actor_id,payload,result,stamp);
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.adopt_insurance_policies(uuid,uuid,timestamptz,date,date,jsonb,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.adopt_insurance_policies(uuid,uuid,timestamptz,date,date,jsonb,text) TO service_role;
CREATE FUNCTION public.claim_notifications(p_limit integer DEFAULT 3)
RETURNS SETOF public.notification_outbox LANGUAGE sql SECURITY INVOKER SET search_path=public,pg_temp AS $$
 UPDATE public.notification_outbox SET status='processing',lease_token=gen_random_uuid(),leased_at=clock_timestamp(),attempts=attempts+1
 WHERE id IN (SELECT id FROM public.notification_outbox WHERE status IN ('pending','failed') AND available_at<=now() AND attempts<5 ORDER BY created_at LIMIT least(greatest(p_limit,1),3) FOR UPDATE SKIP LOCKED) RETURNING *;
$$;
CREATE FUNCTION public.finish_notification(p_id uuid,p_token uuid,p_error text DEFAULT NULL,p_retry boolean DEFAULT false)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE event public.notification_outbox%ROWTYPE;
BEGIN
 UPDATE public.notification_outbox SET status=CASE WHEN p_error IS NULL THEN 'sent' ELSE 'failed' END,
 sent_at=CASE WHEN p_error IS NULL THEN clock_timestamp() ELSE NULL END,last_error=left(p_error,500),
 available_at=CASE WHEN p_error IS NULL OR NOT p_retry THEN 'infinity'::timestamptz ELSE now()+interval '5 minutes'*attempts END,
 lease_token=NULL,leased_at=NULL WHERE id=p_id AND lease_token=p_token AND status='processing' RETURNING * INTO event;
 IF NOT FOUND THEN RETURN false;END IF;
 IF p_error IS NULL AND event.template IN ('policy_available','partner_policy_available') THEN INSERT INTO public.activity_logs(request_id,user_id,action,description) VALUES(event.request_id,(event.payload->>'actorId')::uuid,CASE event.template WHEN 'policy_available' THEN 'policy_whatsapp_sent' ELSE 'partner_policy_whatsapp_sent' END,'Notification acceptée par le fournisseur.');END IF;RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.claim_notifications(integer),public.finish_notification(uuid,uuid,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_notifications(integer),public.finish_notification(uuid,uuid,text,boolean) TO service_role;
COMMIT;
