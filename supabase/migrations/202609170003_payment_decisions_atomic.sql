begin;
create table public.payment_decision_operations (
  id uuid primary key,
  actor uuid not null,
  request_id uuid not null references public.insurance_requests(id) on delete cascade,
  payment_id uuid not null references public.payments(id) on delete cascade,
  payload jsonb not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.payment_decision_operations enable row level security;
create policy payment_decision_operations_server on public.payment_decision_operations
  for all to service_role using (true) with check (true);
revoke all on public.payment_decision_operations from public,anon,authenticated;
grant all on public.payment_decision_operations to service_role;
grant usage on schema auth to service_role;
grant select(id,raw_app_meta_data) on auth.users to service_role;

create function public.decide_payment(
  p_request_id uuid,p_payment_id uuid,p_submitted_at timestamptz,
  p_action text,p_reason text,p_actor uuid,p_operation_id uuid
) returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare dossier public.insurance_requests%rowtype; payment public.payments%rowtype;
  previous public.payment_decision_operations%rowtype; actor_role text;
  payload jsonb; result jsonb; stamp timestamptz := clock_timestamp();
  request_status text; payment_status text; reason text := btrim(coalesce(p_reason,''));
begin
  if p_operation_id is null or p_actor is null or p_request_id is null or p_payment_id is null or
     p_action is null or p_action not in ('confirm_payment','reject_payment') or
     (p_action='reject_payment' and (reason='' or length(reason)>4000)) then
    raise exception using errcode='22023',message='Invalid payment decision';
  end if;
  select raw_app_meta_data->>'role' into actor_role from auth.users where id=p_actor;
  if actor_role is null or actor_role not in ('admin','agent') then
    raise exception using errcode='42501',message='Actor not allowed';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('payment-decision:'||p_operation_id::text,0));
  select * into dossier from public.insurance_requests where id=p_request_id for update;
  if not found then raise exception using errcode='P0002',message='Request missing'; end if;
  if actor_role='agent' and dossier.assigned_agent_id is distinct from p_actor then
    raise exception using errcode='42501',message='Request reassigned';
  end if;
  payload := jsonb_build_object('requestId',p_request_id,'paymentId',p_payment_id,
    'submittedAt',p_submitted_at,'action',p_action,
    'reason',case when p_action='reject_payment' then reason else null end);
  select * into previous from public.payment_decision_operations where id=p_operation_id;
  if found then
    if previous.actor is distinct from p_actor or previous.payload is distinct from payload then
      raise exception using errcode='40001',message='Operation reused with different decision';
    end if;
    return previous.result;
  end if;
  if dossier.status<>'payment_review' then
    raise exception using errcode='40001',message='Request no longer under review';
  end if;
  select * into payment from public.payments where id=p_payment_id and request_id=p_request_id for update;
  if not found then raise exception using errcode='P0002',message='Payment missing'; end if;
  if payment.status<>'submitted' or payment.submitted_at is distinct from p_submitted_at then
    raise exception using errcode='40001',message='Payment changed';
  end if;
  request_status := case when p_action='confirm_payment' then 'payment_confirmed' else 'payment_rejected' end;
  payment_status := case when p_action='confirm_payment' then 'confirmed' else 'rejected' end;
  update public.insurance_requests set status=request_status,updated_at=stamp where id=p_request_id;
  update public.payments set status=payment_status,verified_at=stamp,verified_by=p_actor,
    rejection_reason=case when p_action='reject_payment' then reason else null end where id=p_payment_id;
  insert into public.activity_logs(request_id,user_id,action,description) values
    (p_request_id,p_actor,
     case when p_action='confirm_payment' then 'payment_confirmed' else 'payment_rejected' end,
     case when p_action='confirm_payment' then 'Paiement confirmé.' else 'Paiement refusé. Motif : '||reason end);
  result := jsonb_build_object('success',true,'action',p_action,'status',request_status);
  insert into public.payment_decision_operations(id,actor,request_id,payment_id,payload,result)
    values(p_operation_id,p_actor,p_request_id,p_payment_id,payload,result);
  return result;
end $$;
revoke all on function public.decide_payment(uuid,uuid,timestamptz,text,text,uuid,uuid) from public,anon,authenticated;
grant execute on function public.decide_payment(uuid,uuid,timestamptz,text,text,uuid,uuid) to service_role;
notify pgrst,'reload schema';
commit;
