BEGIN;
ALTER TABLE public.partners ADD COLUMN preferred_language text NOT NULL DEFAULT 'fr' CHECK (preferred_language IN ('fr','en','tr'));
CREATE TABLE public.payment_reminders (
 request_id uuid PRIMARY KEY REFERENCES public.insurance_requests(id) ON DELETE CASCADE,
 token uuid NOT NULL DEFAULT gen_random_uuid(),
 status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','sent','skipped','failed')),
 created_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz,
 provider_message_id text
);
ALTER TABLE public.payment_reminders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_reminders FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.payment_reminders TO service_role;
CREATE POLICY reminders_service ON public.payment_reminders TO service_role USING (true) WITH CHECK (true);
CREATE INDEX payment_reminder_candidates ON public.insurance_requests(created_at) WHERE status='waiting_payment';

-- Only service-role workers may inspect recipients. This does not bypass RLS.
CREATE FUNCTION public.payment_reminder_recipient(p_request uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public,pg_temp AS $$
 SELECT jsonb_build_object(
  'requestId',r.id,'requestCode',r.request_code,'source',r.source,
  'name',CASE WHEN r.source='partner' THEN coalesce(nullif(p.manager_name,''),p.company_name) ELSE c.first_name END,
  'phoneNumber',CASE WHEN r.source='partner' THEN p.whatsapp_country_code||p.whatsapp_number ELSE c.whatsapp_country_code||c.whatsapp_number END,
  'language',CASE WHEN r.source='partner' THEN p.preferred_language ELSE r.preferred_language END)
 FROM public.insurance_requests r JOIN public.clients c ON c.id=r.client_id
 LEFT JOIN public.partners p ON p.id=r.partner_id
 WHERE r.id=p_request AND r.status='waiting_payment' AND r.created_at <= now()-interval '15 minutes'
 AND (r.source='direct' OR (r.source='partner' AND p.is_active))
 AND NOT EXISTS (SELECT 1 FROM public.payments pay WHERE pay.request_id=r.id)
 AND NOT EXISTS (SELECT 1 FROM public.uploaded_documents d WHERE d.request_id=r.id AND d.document_type='payment_receipt');
$$;
CREATE FUNCTION public.claim_payment_reminders(p_since timestamptz)
RETURNS TABLE(request_id uuid, token uuid) LANGUAGE sql SECURITY INVOKER SET search_path=public,pg_temp AS $$
 WITH candidates AS (
 SELECT r.id FROM public.insurance_requests r
 WHERE p_since IS NOT NULL AND r.created_at>=p_since AND r.created_at<=now()-interval '15 minutes'
 AND r.status='waiting_payment'
 AND NOT EXISTS(SELECT 1 FROM public.payment_reminders m WHERE m.request_id=r.id)
 AND public.payment_reminder_recipient(r.id) IS NOT NULL
 ORDER BY r.created_at LIMIT 3 FOR UPDATE OF r SKIP LOCKED
 )
 INSERT INTO public.payment_reminders(request_id) SELECT id FROM candidates
 ON CONFLICT DO NOTHING RETURNING payment_reminders.request_id,payment_reminders.token;
$$;
REVOKE ALL ON FUNCTION public.payment_reminder_recipient(uuid),public.claim_payment_reminders(timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.payment_reminder_recipient(uuid),public.claim_payment_reminders(timestamptz) TO service_role;
COMMIT;
