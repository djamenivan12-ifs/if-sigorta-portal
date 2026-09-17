BEGIN;
ALTER TABLE public.insurance_companies ADD COLUMN business_code text UNIQUE;
DO $$ DECLARE ids uuid[];BEGIN SELECT array_agg(DISTINCT insurance_company_id) INTO ids FROM public.insurance_nationality_rates WHERE nationality='CG' AND effective_from='2026-09-17';
 IF cardinality(ids) IS DISTINCT FROM 1 THEN RAISE EXCEPTION 'Exactly one initial Skyline tariff owner is required';END IF;
 UPDATE public.insurance_companies SET business_code='skyline' WHERE id=ids[1];END $$;
CREATE FUNCTION public.insurer_business_code_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN IF OLD.business_code IS NOT NULL AND NEW.business_code IS DISTINCT FROM OLD.business_code THEN RAISE EXCEPTION 'Insurer business code is immutable';END IF;RETURN NEW;END $$;
CREATE TRIGGER insurer_business_code_immutable BEFORE UPDATE ON public.insurance_companies FOR EACH ROW EXECUTE FUNCTION public.insurer_business_code_immutable();
REVOKE ALL ON FUNCTION public.insurer_business_code_immutable() FROM PUBLIC,anon,authenticated;
CREATE TABLE public.insurer_request_events(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,request_id uuid NOT NULL,
 captured_at timestamptz NOT NULL DEFAULT clock_timestamp(),event_type text NOT NULL CHECK(event_type IN ('baseline','change','delete')),snapshot jsonb NOT NULL);
CREATE TABLE public.accounting_capture_metadata(id boolean PRIMARY KEY DEFAULT true CHECK(id),started_at timestamptz NOT NULL DEFAULT clock_timestamp());
INSERT INTO public.accounting_capture_metadata DEFAULT VALUES;
ALTER TABLE public.insurer_request_events ENABLE ROW LEVEL SECURITY;ALTER TABLE public.accounting_capture_metadata ENABLE ROW LEVEL SECURITY;
CREATE POLICY ledger_service ON public.insurer_request_events TO service_role USING(true) WITH CHECK(true);
CREATE POLICY capture_service ON public.accounting_capture_metadata TO service_role USING(true) WITH CHECK(true);
REVOKE ALL ON public.insurer_request_events,public.accounting_capture_metadata FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.insurer_request_events,public.accounting_capture_metadata TO service_role;
GRANT USAGE,SELECT ON SEQUENCE public.insurer_request_events_id_seq TO service_role;
CREATE INDEX insurer_event_lookup ON public.insurer_request_events(request_id,captured_at DESC,id DESC);
CREATE FUNCTION public.insurer_request_snapshot(r public.insurance_requests) RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path=public,pg_temp AS $$
 SELECT jsonb_build_object('id',r.id,'request_code',r.request_code,'partner_id',r.partner_id,'insurance_company_id',r.insurance_company_id,'calculated_age',r.calculated_age,'insurance_duration_years',r.insurance_duration_years,'actual_insurance_cost',r.actual_insurance_cost,'insurance_company_selected_at',r.insurance_company_selected_at,'status',r.status);
$$;
INSERT INTO public.insurer_request_events(request_id,event_type,snapshot) SELECT id,'baseline',public.insurer_request_snapshot(r) FROM public.insurance_requests r;
CREATE FUNCTION public.capture_insurer_request() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
 IF TG_OP='DELETE' THEN INSERT INTO public.insurer_request_events(request_id,event_type,snapshot) VALUES(OLD.id,'delete',public.insurer_request_snapshot(OLD));RETURN OLD;
 ELSIF TG_OP='INSERT' OR public.insurer_request_snapshot(OLD) IS DISTINCT FROM public.insurer_request_snapshot(NEW) THEN INSERT INTO public.insurer_request_events(request_id,event_type,snapshot) VALUES(NEW.id,'change',public.insurer_request_snapshot(NEW));END IF;RETURN NEW;
END $$;
CREATE TRIGGER capture_insurer_request AFTER INSERT OR UPDATE OR DELETE ON public.insurance_requests FOR EACH ROW EXECUTE FUNCTION public.capture_insurer_request();
CREATE FUNCTION public.accounting_state_at(p_day date) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=public,pg_temp AS $$
 SELECT jsonb_build_object('covered',p_day>=(SELECT (started_at AT TIME ZONE 'Europe/Istanbul')::date FROM public.accounting_capture_metadata),
 'startedAt',(SELECT started_at FROM public.accounting_capture_metadata),
 'requests',(SELECT coalesce(jsonb_agg(snapshot),'[]') FROM (SELECT DISTINCT ON(request_id) event_type,snapshot FROM public.insurer_request_events WHERE captured_at < ((p_day+1)::timestamp AT TIME ZONE 'Europe/Istanbul') ORDER BY request_id,captured_at DESC,id DESC) t WHERE event_type<>'delete'));
$$;
REVOKE ALL ON FUNCTION public.insurer_request_snapshot(public.insurance_requests),public.capture_insurer_request(),public.accounting_state_at(date) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.insurer_request_snapshot(public.insurance_requests),public.capture_insurer_request(),public.accounting_state_at(date) TO service_role;
CREATE INDEX IF NOT EXISTS insurance_requests_partner_created_idx ON public.insurance_requests(partner_id,created_at DESC,id) WHERE source='partner';
CREATE INDEX IF NOT EXISTS insurance_requests_agent_status_idx ON public.insurance_requests(assigned_agent_id,status,created_at DESC,id);
CREATE INDEX IF NOT EXISTS activity_logs_request_created_idx ON public.activity_logs(request_id,created_at DESC,id);
COMMIT;
