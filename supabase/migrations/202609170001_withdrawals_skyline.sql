begin;
create table public.insurance_company_withdrawals (
 id uuid primary key default gen_random_uuid(),
 insurance_company_id uuid not null references public.insurance_companies(id),
 amount numeric not null check(amount>0 and amount<=999999999.99 and amount=round(amount,2)),
 withdrawal_date date not null, reason text not null check(length(btrim(reason)) between 1 and 1000),
 reference text check(length(reference)<=200), created_by uuid not null,
 created_at timestamptz not null default now(), cancelled_at timestamptz, cancelled_by uuid,
 check ((cancelled_at is null)=(cancelled_by is null))
);
alter table public.insurance_company_withdrawals enable row level security;
revoke all on public.insurance_company_withdrawals from public,anon,authenticated;
grant select,insert,update on public.insurance_company_withdrawals to service_role;
create index on public.insurance_company_withdrawals(insurance_company_id,withdrawal_date);

create table public.insurance_nationality_rates (
 id uuid primary key default gen_random_uuid(), insurance_company_id uuid not null references public.insurance_companies(id),
 nationality text not null check(nationality='CG'), min_age int not null check(min_age>=0), max_age int not null check(max_age>=min_age),
 one_year_cost numeric not null check(one_year_cost>=0 and one_year_cost=round(one_year_cost,2)),
 two_year_cost numeric not null check(two_year_cost>=0 and two_year_cost=round(two_year_cost,2)),
 one_year_price numeric not null check(one_year_price>0 and one_year_price=round(one_year_price,2)),
 two_year_price numeric not null check(two_year_price>0 and two_year_price=round(two_year_price,2)),
 effective_from date not null,
 exclude using gist(insurance_company_id with =, nationality with =, effective_from with =, int4range(min_age,max_age,'[]') with &&)
);
alter table public.insurance_nationality_rates enable row level security;
revoke all on public.insurance_nationality_rates from public,anon,authenticated;
grant select on public.insurance_nationality_rates to service_role;
-- Explicitly fail if the existing Skyline company cannot be identified. No new insurer is invented.
do $$ declare cid uuid; n int; begin
 select count(*),min(id::text)::uuid into n,cid from public.insurance_companies where lower(btrim(name)) in ('skyline','skyline sigorta');
 if n<>1 then raise exception 'Exactly one Skyline insurer is required before applying the tariff grid'; end if;
 insert into public.insurance_nationality_rates(insurance_company_id,nationality,min_age,max_age,one_year_cost,two_year_cost,one_year_price,two_year_price,effective_from)
 select cid,'CG',a,b,c,d,e,f,'2026-09-17'::date from (values
 (0,15,1275,2550,1500,3000),(16,25,425,850,525,1050),(26,35,510,1020,650,1300),
 (36,45,595,1190,750,1500),(46,55,722.5,1445,850,1700)) as prices(a,b,c,d,e,f);
end $$;
alter table public.insurance_requests add column quote_nationality text,
 add column nationality_rate_id uuid references public.insurance_nationality_rates(id);

-- Rates are versioned by adding a new grid; an issued quote keeps its immutable row.
create function public.nationality_rate_immutable() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin raise exception using errcode='22023',message='Add a new effective grid instead of modifying an existing quote rate'; end $$;
create trigger nationality_rate_immutable before update or delete on public.insurance_nationality_rates for each row execute function public.nationality_rate_immutable();
revoke all on function public.nationality_rate_immutable() from public,anon,authenticated;

-- Independently enforce the frozen insurer cost, even if a write bypasses the route.
create function public.enforce_nationality_request_cost() returns trigger language plpgsql set search_path=public,pg_temp as $$
declare r public.insurance_nationality_rates%rowtype; expected numeric; begin
 if tg_op='UPDATE' and old.nationality_rate_id is not null and new.nationality_rate_id is distinct from old.nationality_rate_id then
  raise exception using errcode='22023',message='Quote tariff cannot be replaced';
 end if;
 if new.nationality_rate_id is not null then
  select * into r from public.insurance_nationality_rates where id=new.nationality_rate_id;
  if not found or new.calculated_age not between r.min_age and r.max_age or new.insurance_duration_years not in (1,2) then
   raise exception using errcode='22023',message='Quote tariff does not match dossier';
  end if;
  if (new.created_at at time zone 'Europe/Istanbul')::date<r.effective_from then
   raise exception using errcode='22023',message='Quote predates nationality grid';
  end if;
  if new.partner_id is null and new.calculated_price is distinct from
    (case when new.insurance_duration_years=1 then r.one_year_price else r.two_year_price end) then
   raise exception using errcode='22023',message='Client price must match frozen quote';
  end if;
  if new.insurance_company_id is not null then
   expected=case when new.insurance_duration_years=1 then r.one_year_cost else r.two_year_cost end;
   if new.insurance_company_id<>r.insurance_company_id or new.actual_insurance_cost is distinct from expected then
    raise exception using errcode='22023',message='Insurer debit must match frozen tariff';
   end if;
  end if;
 end if;
 return new;
end $$;
create trigger enforce_nationality_request_cost before insert or update on public.insurance_requests for each row execute function public.enforce_nationality_request_cost();
revoke all on function public.enforce_nationality_request_cost() from public,anon,authenticated;

-- Preserve the previous accounting implementation and wrap the two new actions.
alter function public.accounting_write(text,jsonb,uuid) rename to accounting_write_base;
create function public.accounting_write(p_action text,p_payload jsonb,p_actor uuid) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare w public.insurance_company_withdrawals%rowtype; op public.accounting_operations%rowtype;
 cid uuid; oid uuid; val numeric; wd date; today date; available numeric; historical numeric; result jsonb;
begin
 if p_action not in ('withdrawal','cancel_withdrawal') then return public.accounting_write_base(p_action,p_payload,p_actor); end if;
 perform pg_advisory_xact_lock(214701,9313);
 if p_actor is null then raise exception using errcode='22023',message='Actor required'; end if;
 oid=(p_payload->>'operationId')::uuid;
 if oid is null then raise exception using errcode='22023',message='Operation required'; end if;
 select * into op from public.accounting_operations where id=oid;
 if found then
  if op.actor<>p_actor or op.action<>p_action or op.payload<>p_payload then raise exception using errcode='40001',message='Operation conflict'; end if;
  return op.result;
 end if;
 today=(now() at time zone 'Europe/Istanbul')::date;
 if p_action='cancel_withdrawal' then
  select * into w from public.insurance_company_withdrawals where id=(p_payload->>'id')::uuid for update;
  if not found then raise exception using errcode='P0002',message='Withdrawal missing'; end if;
  if w.cancelled_at is null then
   update public.insurance_company_withdrawals set cancelled_at=clock_timestamp(),cancelled_by=p_actor where id=w.id returning * into w;
  end if;
 else
  cid=(p_payload->>'insuranceCompanyId')::uuid;
  perform 1 from public.insurance_companies where id=cid and is_active for update;
  if not found then raise exception using errcode='22023',message='Company unavailable'; end if;
  val=(p_payload->>'amount')::numeric; wd=(p_payload->>'withdrawalDate')::date;
  if val is null or val<=0 or val>999999999.99 or val<>round(val,2) or wd is null or wd>today
    or length(btrim(coalesce(p_payload->>'reason',''))) not between 1 and 1000 then
   raise exception using errcode='22023',message='Invalid withdrawal';
  end if;
  -- This lock also serializes against policy transitions made by existing routes.
  lock table public.insurance_requests in share row exclusive mode;
  if exists(select 1 from public.insurance_requests where insurance_company_id=cid and status in ('policy_available','policy_preparation') and
    (actual_insurance_cost is null or actual_insurance_cost<0 or insurance_company_selected_at is null)) then
   raise exception using errcode='P0001',message='Unknown insurer commitments';
  end if;
  select coalesce(sum(amount),0) into available from public.insurance_company_deposits where insurance_company_id=cid and deposit_date<=today;
  available=available-coalesce((select sum(amount) from public.insurance_company_withdrawals where insurance_company_id=cid and cancelled_at is null),0)
    -coalesce((select sum(actual_insurance_cost) from public.insurance_requests where insurance_company_id=cid and status in ('policy_available','policy_preparation')),0);
  select coalesce(sum(amount),0) into historical from public.insurance_company_deposits where insurance_company_id=cid and deposit_date<=wd;
  historical=historical-coalesce((select sum(amount) from public.insurance_company_withdrawals where insurance_company_id=cid and withdrawal_date<=wd and (cancelled_at is null or (cancelled_at at time zone 'Europe/Istanbul')::date>wd)),0)
   -coalesce((select sum(actual_insurance_cost) from public.insurance_requests where insurance_company_id=cid and status='policy_available' and (insurance_company_selected_at at time zone 'Europe/Istanbul')::date<=wd),0);
  if val>available or val>historical then raise exception using errcode='P0001',message='Insufficient insurer balance'; end if;
  insert into public.insurance_company_withdrawals(insurance_company_id,amount,withdrawal_date,reason,reference,created_by)
  values(cid,val,wd,btrim(p_payload->>'reason'),p_payload->>'reference',p_actor) returning * into w;
 end if;
 result=jsonb_build_object('withdrawal',to_jsonb(w));
 insert into public.accounting_operations(id,actor,action,payload,result) values(oid,p_actor,p_action,p_payload,result);
 return result;
end $$;
revoke all on function public.accounting_write(text,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.accounting_write(text,jsonb,uuid) to service_role;
notify pgrst,'reload schema';
commit;
