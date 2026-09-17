BEGIN;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;
DO $migration$ DECLARE ns text;BEGIN SELECT n.nspname INTO ns FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace WHERE e.extname='unaccent';
 EXECUTE format('CREATE FUNCTION public.admin_normalize_search(p_text text) RETURNS text LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public,pg_temp AS %L','SELECT lower('||quote_ident(ns)||'.unaccent(coalesce(p_text,'''')::text))');END $migration$;
REVOKE ALL ON FUNCTION public.admin_normalize_search(text) FROM PUBLIC,anon,authenticated;GRANT EXECUTE ON FUNCTION public.admin_normalize_search(text) TO service_role;
CREATE FUNCTION public.admin_requests_page(p_actor uuid,p_filters jsonb,p_page integer DEFAULT 1,p_search_mode boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE role text;result jsonb;
BEGIN
 SELECT raw_app_meta_data->>'role' INTO role FROM auth.users WHERE id=p_actor;
 IF role IS NULL OR role NOT IN ('admin','agent') THEN RAISE EXCEPTION 'Accès refusé.' USING ERRCODE='42501';END IF;
 WITH scoped AS NOT MATERIALIZED (
  SELECT r.id,r.request_code,r.status,r.source,r.partner_id,r.assigned_agent_id,r.passport_number,r.kimlik_number,r.calculated_price,r.insurance_duration_years,r.created_at,
   jsonb_build_object('first_name',coalesce(r.client_snapshot->>'first_name',c.first_name),'last_name',coalesce(r.client_snapshot->>'last_name',c.last_name),'nationality',coalesce(r.client_snapshot->>'nationality',c.nationality),'whatsapp_country_code',coalesce(r.client_snapshot->>'whatsapp_country_code',c.whatsapp_country_code),'whatsapp_number',coalesce(r.client_snapshot->>'whatsapp_number',c.whatsapp_number)) AS client,
   CASE WHEN partner.id IS NULL THEN NULL ELSE jsonb_build_object('code',partner.code,'company_name',partner.company_name) END AS partner
  FROM public.insurance_requests r LEFT JOIN public.clients c ON c.id=r.client_id LEFT JOIN public.partners partner ON partner.id=r.partner_id
  WHERE role='admin' OR r.assigned_agent_id IS NULL OR r.assigned_agent_id=p_actor
 ),filtered AS NOT MATERIALIZED (
 SELECT * FROM scoped r WHERE
 (coalesce(p_filters->>'status','')='' OR status=p_filters->>'status') AND
 (coalesce(p_filters->>'source','') NOT IN ('direct','partner') OR source=p_filters->>'source') AND
 (coalesce(p_filters->>'duration','') NOT IN ('1','2') OR insurance_duration_years=(p_filters->>'duration')::integer) AND
 (coalesce(p_filters->>'nationality','')='' OR lower(btrim(client->>'nationality'))=lower(btrim(p_filters->>'nationality'))) AND
 (coalesce(p_filters->>'dateFrom','')='' OR created_at>=((p_filters->>'dateFrom')::date::timestamp AT TIME ZONE 'Europe/Istanbul')) AND
 (coalesce(p_filters->>'dateTo','')='' OR created_at<(((p_filters->>'dateTo')::date+1)::timestamp AT TIME ZONE 'Europe/Istanbul')) AND
 (coalesce(p_filters->>'agent','')='' OR (p_filters->>'agent'='me' AND assigned_agent_id=p_actor) OR (p_filters->>'agent'='unassigned' AND assigned_agent_id IS NULL) OR (role='admin' AND assigned_agent_id::text=p_filters->>'agent') OR (role='agent' AND p_filters->>'agent' NOT IN ('me','unassigned'))) AND
 (NOT p_search_mode OR coalesce(p_filters->>'search','')<>'') AND
 (coalesce(p_filters->>'search','')='' OR EXISTS(SELECT 1 FROM unnest(ARRAY[request_code,client->>'first_name',client->>'last_name',(client->>'first_name')||' '||(client->>'last_name'),(client->>'last_name')||' '||(client->>'first_name'),passport_number,kimlik_number,CASE WHEN p_search_mode THEN client->>'nationality' ELSE NULL END]) term WHERE strpos(lower(CASE WHEN p_search_mode THEN public.admin_normalize_search(coalesce(term,'')) ELSE coalesce(term,'') END),lower(CASE WHEN p_search_mode THEN public.admin_normalize_search(btrim(p_filters->>'search')) ELSE btrim(p_filters->>'search') END))>0)
 OR (regexp_replace(p_filters->>'search','[^0-9]','','g')<>'' AND strpos(regexp_replace((client->>'whatsapp_country_code')||(client->>'whatsapp_number'),'[^0-9]','','g'),regexp_replace(p_filters->>'search','[^0-9]','','g'))>0))
 ),totals AS (SELECT count(*) AS n FROM filtered),paging AS (SELECT n,least(greatest(coalesce(p_page,1),1),greatest(ceil(n/20.0)::integer,1)) AS page FROM totals)
 SELECT jsonb_build_object('rows',(SELECT coalesce(jsonb_agg(row),'[]') FROM (SELECT * FROM filtered ORDER BY created_at DESC,id LIMIT 20 OFFSET (paging.page-1)*20) row),'total',n,'page',page,'pages',greatest(ceil(n/20.0)::integer,1),
 'nationalities',(SELECT coalesce(jsonb_agg(nationality ORDER BY nationality),'[]') FROM (SELECT DISTINCT btrim(client->>'nationality') AS nationality FROM scoped WHERE coalesce(btrim(client->>'nationality'),'')<>'') ns)) INTO result FROM paging;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.admin_requests_page(uuid,jsonb,integer,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_requests_page(uuid,jsonb,integer,boolean) TO service_role;
NOTIFY pgrst,'reload schema';COMMIT;
