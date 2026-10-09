-- Business conflicts are final outcomes, not serialization failures.
-- PostgREST 14 retries SQLSTATE 40001 indefinitely. PT409 returns HTTP 409.
-- Preserve each installed function, owner, ACL, security mode and settings.
-- Safe to replay after the emergency production repair on 2026-10-09.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
DO $fix$
DECLARE fn record; original text; corrected text;
BEGIN
  FOR fn IN SELECT p.oid FROM pg_proc p WHERE p.oid IN (
    SELECT to_regprocedure(signature) FROM unnest(ARRAY[
      'public.accounting_write(text,jsonb,uuid)',
      'public.accounting_write_base(text,jsonb,uuid)',
      'public.adopt_insurance_policies(uuid,uuid,timestamp with time zone,date,date,jsonb,text)',
      'public.adopt_prepared_document()',
      'public.assign_request(uuid,uuid,uuid,uuid,text,text,text)',
      'public.create_direct_request(uuid,jsonb,uuid,jsonb,jsonb)',
      'public.create_nationality_grid(uuid,uuid,date,date,jsonb)',
      'public.create_partner_request(uuid,uuid,uuid,jsonb,jsonb,uuid,jsonb,jsonb)',
      'public.decide_payment(uuid,uuid,timestamp with time zone,text,text,uuid,uuid)',
      'public.record_client_refund(uuid,uuid,uuid,numeric,date,text,text,text,text)',
      'public.save_bank_settings(uuid,jsonb,jsonb)',
      'public.save_partner_draft(uuid,uuid,bigint,jsonb)',
      'public.save_price_grid(jsonb,jsonb,uuid)',
      'public.submit_payment_receipt(uuid,uuid,uuid,text,text,text,text,jsonb)',
      'public.update_renewal(uuid,uuid,text)'
    ]) AS target(signature)
  ) LOOP
    original := pg_get_functiondef(fn.oid);
    corrected := regexp_replace(original, '(errcode\s*=\s*)''40001''', '\1''PT409''', 'gi');
    IF corrected IS DISTINCT FROM original THEN EXECUTE corrected; END IF;
  END LOOP;
END $fix$;
COMMIT;
