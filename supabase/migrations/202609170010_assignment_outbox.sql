BEGIN;
CREATE OR REPLACE FUNCTION public.assign_request(p_request uuid,p_actor uuid,p_expected_agent uuid,p_agent uuid,p_email text,p_name text,p_client_name text) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE r public.insurance_requests%ROWTYPE; event_id uuid; result jsonb;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_actor AND raw_app_meta_data->>'role'='admin') THEN RAISE EXCEPTION 'Accès refusé.' USING ERRCODE='42501'; END IF;
 SELECT * INTO r FROM insurance_requests WHERE id=p_request FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Dossier introuvable.' USING ERRCODE='P0002';END IF;
 IF r.assigned_agent_id IS NOT DISTINCT FROM p_agent THEN RETURN jsonb_build_object('unchanged',true,'eventId',null);END IF;
 IF r.assigned_agent_id IS DISTINCT FROM p_expected_agent THEN RAISE EXCEPTION 'Attribution modifiée. Actualisez la page.' USING ERRCODE='40001';END IF;
 IF p_agent IS NOT NULL AND NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_agent AND raw_app_meta_data->>'role' IN ('admin','agent')) THEN RAISE EXCEPTION 'Agent invalide.' USING ERRCODE='42501';END IF;
 UPDATE insurance_requests SET assigned_agent_id=p_agent,assigned_at=CASE WHEN p_agent IS NULL THEN NULL ELSE now() END,updated_at=now() WHERE id=p_request;
 INSERT INTO activity_logs(request_id,user_id,action,description) VALUES(p_request,p_actor,CASE WHEN p_agent IS NULL THEN 'request_unassigned' ELSE 'request_assigned' END,CASE WHEN p_agent IS NULL THEN 'Attribution supprimée.' ELSE 'Dossier attribué à '||coalesce(p_name,'Agent')||'.' END);
 IF p_agent IS NOT NULL AND p_agent<>p_actor THEN
  event_id:=gen_random_uuid();
  INSERT INTO notification_outbox(id,event_key,request_id,template,payload) VALUES(event_id,'assignment:'||event_id,p_request,'assignment_email',jsonb_build_object('agentId',p_agent,'actorId',p_actor,'agentEmail',p_email,'agentName',p_name,'requestCode',r.request_code,'clientName',p_client_name));
 END IF;
 RETURN jsonb_build_object('unchanged',false,'eventId',event_id);
END $$;
REVOKE ALL ON FUNCTION public.assign_request(uuid,uuid,uuid,uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.assign_request(uuid,uuid,uuid,uuid,text,text,text) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
