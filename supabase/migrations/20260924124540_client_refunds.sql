begin;
create table public.client_refunds (
 id uuid primary key,
 payment_id uuid not null references public.payments(id) on delete restrict,
 request_id uuid not null references public.insurance_requests(id) on delete restrict,
 amount numeric(12,2) not null check(amount>0 and amount<=999999999.99),
 refund_date date not null,
 payment_method text not null check(payment_method in ('bank_transfer','cash','card','other')),
 reason text not null check(length(btrim(reason)) between 1 and 1000),
 reference text not null check(length(btrim(reference)) between 1 and 200),
 proof_path text,
 created_by uuid not null,
 created_at timestamptz not null default now(),
 voided_at timestamptz,
 voided_by uuid,
 void_reason text,
 check ((voided_at is null and voided_by is null and void_reason is null) or
        (voided_at is not null and voided_by is not null and length(btrim(void_reason)) between 1 and 1000))
);
alter table public.client_refunds enable row level security;
create policy client_refunds_service on public.client_refunds to service_role using (true) with check (true);
revoke all on public.client_refunds from public,anon,authenticated;
grant select,insert,update on public.client_refunds to service_role;
create index client_refunds_payment_idx on public.client_refunds(payment_id);
create index client_refunds_request_idx on public.client_refunds(request_id);
create index client_refunds_date_idx on public.client_refunds(refund_date);

create function public.guard_client_refund_history() returns trigger
language plpgsql set search_path=public,pg_temp as $$
begin
 if tg_op='DELETE' then raise exception 'Refund history is permanent' using errcode='22023'; end if;
 if (to_jsonb(new)-'voided_at'-'voided_by'-'void_reason') is distinct from
    (to_jsonb(old)-'voided_at'-'voided_by'-'void_reason') or old.voided_at is not null or new.voided_at is null then
  raise exception 'Only a first, documented void is permitted' using errcode='22023';
 end if;
 return new;
end $$;
create trigger guard_client_refund_history before update or delete on public.client_refunds
for each row execute function public.guard_client_refund_history();

create function public.record_client_refund(p_actor uuid,p_id uuid,p_payment uuid,p_amount numeric,p_date date,p_method text,p_reason text,p_reference text,p_proof text default null)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare p public.payments%rowtype; r public.client_refunds%rowtype; total numeric;
begin
 if not exists(select 1 from auth.users where id=p_actor and raw_app_meta_data->>'role'='admin') then
  raise exception 'Administrator required' using errcode='42501'; end if;
 if p_id is null or p_payment is null or p_amount is null or p_amount<=0 or p_amount>999999999.99 or p_amount<>round(p_amount,2)
 or p_date is null or p_date>(now() at time zone 'Europe/Istanbul')::date
 or p_method is null or p_method not in ('bank_transfer','cash','card','other')
 or length(btrim(coalesce(p_reason,''))) not between 1 and 1000
 or length(btrim(coalesce(p_reference,''))) not between 1 and 200
 or (p_proof is not null and p_proof !~ ('^'||p_actor::text||'/'||p_id::text||'/[0-9a-f]{64}\.(pdf|png|jpg)$')) then
  raise exception 'Invalid refund' using errcode='22023'; end if;
 -- All refunds of this payment serialize here, including concurrent partial refunds.
 select * into p from public.payments where id=p_payment for update;
 if not found then raise exception 'Payment not found' using errcode='P0002'; end if;
 select * into r from public.client_refunds where id=p_id;
 if found then
  if (r.payment_id,r.amount,r.refund_date,r.payment_method,r.reason,r.reference,r.proof_path,r.created_by)
    is distinct from (p_payment,p_amount,p_date,p_method,btrim(p_reason),btrim(p_reference),p_proof,p_actor) then
   raise exception 'Operation conflict' using errcode='40001'; end if;
  return to_jsonb(r);
 end if;
 if p.status<>'confirmed' or p.expected_amount is null or p.expected_amount<=0 then
  raise exception 'Confirmed payment required' using errcode='P0001'; end if;
 if p.verified_at is null or p_date<(p.verified_at at time zone 'Europe/Istanbul')::date then
  raise exception 'Refund must follow confirmation' using errcode='22023'; end if;
 select coalesce(sum(amount),0) into total from public.client_refunds where payment_id=p_payment and voided_at is null;
 if total+p_amount>p.expected_amount then raise exception 'Refund exceeds collected payment' using errcode='P0001'; end if;
 insert into public.client_refunds(id,payment_id,request_id,amount,refund_date,payment_method,reason,reference,proof_path,created_by)
 values(p_id,p_payment,p.request_id,p_amount,p_date,p_method,btrim(p_reason),btrim(p_reference),p_proof,p_actor) returning * into r;
 return to_jsonb(r);
end $$;

create function public.void_client_refund(p_actor uuid,p_id uuid,p_reason text)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare r public.client_refunds%rowtype; pid uuid;
begin
 if not exists(select 1 from auth.users where id=p_actor and raw_app_meta_data->>'role'='admin') then
  raise exception 'Administrator required' using errcode='42501'; end if;
 if length(btrim(coalesce(p_reason,''))) not between 1 and 1000 then raise exception 'Reason required' using errcode='22023'; end if;
 select payment_id into pid from public.client_refunds where id=p_id;
 if not found then raise exception 'Refund not found' using errcode='P0002'; end if;
 perform 1 from public.payments where id=pid for update;
 select * into r from public.client_refunds where id=p_id for update;
 if r.voided_at is not null then return to_jsonb(r); end if;
 update public.client_refunds set voided_at=clock_timestamp(),voided_by=p_actor,void_reason=btrim(p_reason) where id=p_id returning * into r;
 return to_jsonb(r);
end $$;

create function public.guard_refunded_payment() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if exists(select 1 from public.client_refunds where payment_id=old.id and voided_at is null)
 and (new.request_id,new.expected_amount,new.status,new.verified_at) is distinct from (old.request_id,old.expected_amount,old.status,old.verified_at) then
  raise exception 'Payment has recorded refunds' using errcode='22023'; end if;
 return new;
end $$;
create trigger guard_refunded_payment before update on public.payments for each row execute function public.guard_refunded_payment();
revoke all on function public.record_client_refund(uuid,uuid,uuid,numeric,date,text,text,text,text),public.void_client_refund(uuid,uuid,text),public.guard_client_refund_history(),public.guard_refunded_payment() from public,anon,authenticated;
grant execute on function public.record_client_refund(uuid,uuid,uuid,numeric,date,text,text,text,text),public.void_client_refund(uuid,uuid,text) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('refund-proofs','refund-proofs',false,4194304,array['application/pdf','image/jpeg','image/png']);
notify pgrst,'reload schema';
commit;
