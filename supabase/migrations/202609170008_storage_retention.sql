BEGIN;
CREATE TABLE public.document_preparations(storage_path text PRIMARY KEY,source_path text,request_id uuid,
 state text NOT NULL DEFAULT 'prepared' CHECK(state IN ('prepared','adopted','deleting','deleted')),
 created_at timestamptz NOT NULL DEFAULT now(),expires_at timestamptz NOT NULL DEFAULT now()+interval '24 hours',leased_at timestamptz);
ALTER TABLE public.document_preparations ENABLE ROW LEVEL SECURITY;
CREATE POLICY preparations_service ON public.document_preparations TO service_role USING(true) WITH CHECK(true);
REVOKE ALL ON public.document_preparations FROM PUBLIC,anon,authenticated;GRANT ALL ON public.document_preparations TO service_role;
CREATE FUNCTION public.prepare_document_copy(p_source text,p_final text,p_request uuid) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
 IF p_source IS NULL OR p_final IS NULL OR p_request IS NULL OR NOT (p_source LIKE 'pending/%') OR NOT(p_final LIKE p_request::text||'/%') OR position('..' IN p_source)>0 OR position('..' IN p_final)>0 THEN RAISE EXCEPTION 'Chemin invalide.' USING ERRCODE='22023';END IF;
 INSERT INTO public.document_preparations(storage_path,source_path,request_id) VALUES(p_source,NULL,p_request),(p_final,p_source,p_request) ON CONFLICT(storage_path) DO NOTHING;
END $$;
CREATE FUNCTION public.adopt_prepared_document() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE preparation public.document_preparations%ROWTYPE;
BEGIN
 IF TG_OP='UPDATE' AND NEW.storage_path IS NOT DISTINCT FROM OLD.storage_path THEN RETURN NEW;END IF;
 SELECT * INTO preparation FROM public.document_preparations WHERE storage_path=NEW.storage_path FOR UPDATE;
 -- Existing untracked documents are never candidates for this cleanup worker.
 IF NOT FOUND THEN RETURN NEW;END IF;
 IF preparation.state IN ('deleting','deleted') OR (preparation.expires_at<=now() AND (preparation.state='prepared' OR (NOT EXISTS(SELECT 1 FROM public.uploaded_documents WHERE storage_path=NEW.storage_path) AND NOT EXISTS(SELECT 1 FROM public.insurance_policies WHERE storage_path=NEW.storage_path)))) THEN RAISE EXCEPTION 'Préparation expirée. Téléversez à nouveau.' USING ERRCODE='40001';END IF;
 IF preparation.request_id IS DISTINCT FROM NEW.request_id THEN RAISE EXCEPTION 'Document associé à un autre dossier.' USING ERRCODE='42501';END IF;
 UPDATE public.document_preparations SET state='adopted' WHERE storage_path=NEW.storage_path;RETURN NEW;
END $$;
CREATE TRIGGER adopt_prepared_upload BEFORE INSERT OR UPDATE ON public.uploaded_documents FOR EACH ROW EXECUTE FUNCTION public.adopt_prepared_document();
CREATE TRIGGER adopt_prepared_policy BEFORE INSERT OR UPDATE ON public.insurance_policies FOR EACH ROW EXECUTE FUNCTION public.adopt_prepared_document();
CREATE FUNCTION public.claim_document_cleanup() RETURNS SETOF public.document_preparations LANGUAGE sql SECURITY INVOKER SET search_path=public,pg_temp AS $$
 UPDATE public.document_preparations SET state='deleting',leased_at=clock_timestamp() WHERE storage_path IN
 (SELECT p.storage_path FROM public.document_preparations p WHERE p.state<>'deleted' AND p.expires_at<=now() AND (p.state<>'deleting' OR p.leased_at<now()-interval '10 minutes')
 AND NOT EXISTS(SELECT 1 FROM public.uploaded_documents d WHERE d.storage_path=p.storage_path)
 AND NOT EXISTS(SELECT 1 FROM public.insurance_policies d WHERE d.storage_path=p.storage_path)
 ORDER BY p.created_at LIMIT 20 FOR UPDATE SKIP LOCKED) RETURNING *;
$$;
CREATE FUNCTION public.finish_document_cleanup(p_paths text[]) RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path=public,pg_temp AS $$
 UPDATE public.document_preparations SET state='deleted',leased_at=NULL WHERE storage_path=ANY(p_paths) AND state='deleting';
$$;
REVOKE ALL ON FUNCTION public.prepare_document_copy(text,text,uuid),public.adopt_prepared_document(),public.claim_document_cleanup(),public.finish_document_cleanup(text[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_document_copy(text,text,uuid),public.adopt_prepared_document(),public.claim_document_cleanup(),public.finish_document_cleanup(text[]) TO service_role;
CREATE INDEX preparations_retention ON public.document_preparations(expires_at,created_at) WHERE state<>'deleted';
CREATE INDEX IF NOT EXISTS uploaded_documents_storage_idx ON public.uploaded_documents(storage_path);
CREATE INDEX IF NOT EXISTS insurance_policies_storage_idx ON public.insurance_policies(storage_path);
COMMIT;
