BEGIN;
ALTER TABLE public.insurance_requests ADD COLUMN submission_fingerprint text;
CREATE INDEX direct_request_recent_fingerprint ON public.insurance_requests(submission_fingerprint,created_at DESC)
 WHERE source='direct' AND status<>'cancelled';

-- Only form data contributes: generated codes, uploaded filenames, language and quotes do not.
CREATE FUNCTION public.direct_request_fingerprint(p_client jsonb,p_request jsonb)
RETURNS text LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path=public,pg_temp AS $$
 SELECT encode(sha256(convert_to(jsonb_build_object(
  'client',(SELECT jsonb_object_agg(k,upper(regexp_replace(btrim(coalesce(p_client->>k,'')),'[[:space:]]+',' ','g')))
    FROM unnest(ARRAY['first_name','last_name','father_name','birth_date','gender','nationality','province_id','district_id','neighborhood_id','street','building_number','apartment_number']) AS keys(k)),
  'country',btrim(p_client->>'whatsapp_country_code'),
  'phone',regexp_replace(p_client->>'whatsapp_number','[^0-9]','','g'),
  'passport',upper(regexp_replace(p_request->>'passport_number','[[:space:]]','','g')),
  'has_kimlik',p_request->'has_kimlik',
  'kimlik',CASE WHEN (p_request->>'has_kimlik')::boolean THEN regexp_replace(p_request->>'kimlik_number','[^0-9]','','g') END,
  'kimlik_expiration',CASE WHEN (p_request->>'has_kimlik')::boolean THEN p_request->>'kimlik_expiration_date' END,
  'insurance_start',CASE WHEN NOT (p_request->>'has_kimlik')::boolean THEN p_request->>'insurance_start_date' END,
  'duration',p_request->>'insurance_duration_years'
 )::text,'UTF8')),'hex');
$$;
REVOKE ALL ON FUNCTION public.direct_request_fingerprint(jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.direct_request_fingerprint(jsonb,jsonb) TO service_role;

CREATE FUNCTION public.create_direct_request(p_request_id uuid,p_client jsonb,p_existing_client_id uuid,p_request jsonb,p_documents jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE c public.clients%ROWTYPE;r public.insurance_requests%ROWTYPE;doc jsonb;
 fingerprint text;stamp timestamptz;reused boolean:=false;
BEGIN
 IF p_request_id IS NULL OR jsonb_typeof(p_client) IS DISTINCT FROM 'object' OR jsonb_typeof(p_request) IS DISTINCT FROM 'object'
  OR jsonb_typeof(p_documents) IS DISTINCT FROM 'array' OR jsonb_array_length(p_documents) NOT BETWEEN 1 AND 3
 THEN RAISE EXCEPTION 'Dossier invalide.' USING ERRCODE='22023';END IF;
 fingerprint:=public.direct_request_fingerprint(p_client,p_request);
 IF fingerprint IS NULL THEN RAISE EXCEPTION 'Données incomplètes.' USING ERRCODE='22023';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('direct-request:'||fingerprint,0));
 stamp:=clock_timestamp();
 SELECT q.* INTO r FROM public.insurance_requests q JOIN public.clients existing ON existing.id=q.client_id
 WHERE q.source='direct' AND q.status<>'cancelled'
   AND q.created_at>=stamp-interval '10 minutes' AND q.created_at<=stamp
   AND (q.submission_fingerprint=fingerprint OR (q.submission_fingerprint IS NULL AND
     public.direct_request_fingerprint(coalesce(q.client_snapshot,to_jsonb(existing)),to_jsonb(q))=fingerprint))
   AND EXISTS(SELECT 1 FROM public.uploaded_documents d WHERE d.request_id=q.id AND d.document_type='passport')
   AND (NOT q.has_kimlik OR (SELECT count(DISTINCT d.document_type) FROM public.uploaded_documents d WHERE d.request_id=q.id AND d.document_type IN ('kimlik_front','kimlik_back'))=2)
 ORDER BY q.created_at,q.id LIMIT 1 FOR UPDATE OF q;
 IF FOUND THEN reused:=true;
 ELSE
  IF p_existing_client_id IS NOT NULL THEN
   SELECT * INTO c FROM public.clients WHERE id=p_existing_client_id FOR KEY SHARE;
   IF NOT FOUND OR upper(btrim(c.first_name)) IS DISTINCT FROM p_client->>'first_name'
    OR upper(btrim(c.last_name)) IS DISTINCT FROM p_client->>'last_name'
    OR c.birth_date IS DISTINCT FROM (p_client->>'birth_date')::date
    OR c.whatsapp_country_code IS DISTINCT FROM p_client->>'whatsapp_country_code'
    OR regexp_replace(c.whatsapp_number,'[^0-9]','','g') IS DISTINCT FROM p_client->>'whatsapp_number'
   THEN RAISE EXCEPTION 'Identité du client modifiée.' USING ERRCODE='40001';END IF;
  ELSE
   c:=jsonb_populate_record(NULL::public.clients,p_client||jsonb_build_object('id',gen_random_uuid(),'created_at',stamp,'updated_at',stamp));
   INSERT INTO public.clients SELECT c.*;
  END IF;
  r:=jsonb_populate_record(NULL::public.insurance_requests,p_request||jsonb_build_object(
   'id',p_request_id,'client_id',c.id,'source','direct','partner_id',NULL,'status','waiting_payment',
   'created_at',stamp,'updated_at',stamp,'client_snapshot',p_client,'submission_fingerprint',fingerprint));
  IF r.insurance_duration_years NOT IN (1,2) OR r.calculated_price IS NULL OR r.calculated_price<=0 OR r.has_kimlik IS NULL
   OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_documents) d WHERE d->>'document_type'='passport')
   OR (r.has_kimlik AND (SELECT count(DISTINCT d->>'document_type') FROM jsonb_array_elements(p_documents) d WHERE d->>'document_type' IN ('kimlik_front','kimlik_back'))<>2)
  THEN RAISE EXCEPTION 'Dossier incomplet.' USING ERRCODE='22023';END IF;
  INSERT INTO public.insurance_requests SELECT r.*;
  FOR doc IN SELECT value FROM jsonb_array_elements(p_documents) LOOP
   IF doc->>'document_type' IS NULL OR doc->>'document_type' NOT IN ('passport','kimlik_front','kimlik_back')
     OR doc->>'storage_path' IS NULL OR NOT (doc->>'storage_path' LIKE r.id::text||'/'|| (doc->>'document_type') ||'/%')
     OR position('..' IN doc->>'storage_path')>0
     OR coalesce(doc->>'mime_type','') NOT IN ('application/pdf','image/jpeg','image/png')
     OR coalesce((doc->>'file_size')::bigint,0) NOT BETWEEN 1 AND 10485760 OR coalesce(doc->>'original_file_name','')=''
   THEN RAISE EXCEPTION 'Document invalide.' USING ERRCODE='22023';END IF;
   INSERT INTO public.uploaded_documents(request_id,document_type,storage_path,original_file_name,mime_type,file_size,uploaded_at)
   VALUES(r.id,doc->>'document_type',doc->>'storage_path',doc->>'original_file_name',doc->>'mime_type',(doc->>'file_size')::bigint,stamp);
  END LOOP;
  INSERT INTO public.activity_logs(request_id,user_id,action,description) VALUES(r.id,NULL,'request_created','Le dossier d’assurance a été créé par le client.');
 END IF;
 RETURN jsonb_build_object('success',true,'reused',reused,'requestId',r.id,'requestCode',r.request_code,
  'status',r.status,'calculatedAge',r.calculated_age,'calculatedPrice',r.calculated_price,'hasKimlik',r.has_kimlik,'insuranceStartDate',r.insurance_start_date);
END $$;
REVOKE ALL ON FUNCTION public.create_direct_request(uuid,jsonb,uuid,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_direct_request(uuid,jsonb,uuid,jsonb,jsonb) TO service_role;
COMMIT;
