-- Run first on a test copy. This migration never repairs or deletes historical data.
-- Any failed preflight rolls back the entire migration.
begin;
create extension if not exists btree_gist;
lock table public.insurance_cost_rates, public.insurance_companies in access exclusive mode;
do $$ begin
 if exists(select 1 from public.insurance_cost_rates a join public.insurance_cost_rates b on a.id<b.id and a.insurance_company_id=b.insurance_company_id and a.duration_years=b.duration_years and a.effective_from=b.effective_from and a.is_active and b.is_active and a.min_age<=b.max_age and b.min_age<=a.max_age) then
  raise exception 'Existing overlapping active rates: review before migrating';
 end if;
 if exists(select lower(btrim(name)) from public.insurance_companies group by lower(btrim(name)) having count(*)>1) then raise exception 'Existing duplicate company names: review before migrating'; end if;
end $$;
create unique index if not exists accounting_company_name_unique on public.insurance_companies(lower(btrim(name)));
alter table public.insurance_cost_rates add constraint accounting_rate_values check (min_age>=0 and max_age>=min_age and max_age<=10000 and duration_years in (1,2) and real_cost>=0 and real_cost<=999999999.99 and real_cost=round(real_cost,2));
alter table public.insurance_cost_rates add constraint accounting_no_overlap exclude using gist (insurance_company_id with =, duration_years with =, effective_from with =, int4range(min_age,max_age,'[]') with &&) where (is_active);
create table public.accounting_operations (
 id uuid primary key, actor uuid not null, action text not null, payload jsonb not null,
 result jsonb not null, created_at timestamptz not null default now()
);
alter table public.accounting_operations enable row level security;
revoke all on public.accounting_operations from public,anon,authenticated;
grant select,insert on public.accounting_operations to service_role;

-- All rate updates, including status changes, retain the prior value.
create function public.accounting_rate_history_trigger() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if (old.min_age,old.max_age,old.real_cost,old.effective_from,old.is_active) is distinct from (new.min_age,new.max_age,new.real_cost,new.effective_from,new.is_active) then
 insert into public.insurance_cost_rate_history(insurance_cost_rate_id,insurance_company_id,min_age,max_age,duration_years,real_cost,effective_from,is_active,changed_by,changed_at)
 values(old.id,old.insurance_company_id,old.min_age,old.max_age,old.duration_years,old.real_cost,old.effective_from,old.is_active,nullif(current_setting('app.accounting_actor',true),'')::uuid,clock_timestamp());
 end if;
 return new;
end $$;
create trigger accounting_rate_history before update on public.insurance_cost_rates for each row execute function public.accounting_rate_history_trigger();

create function public.accounting_write(p_action text,p_payload jsonb,p_actor uuid) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare
 c public.insurance_companies%rowtype; r public.insurance_cost_rates%rowtype;
 d public.insurance_company_deposits%rowtype; op public.accounting_operations%rowtype;
 item jsonb; result jsonb; oid uuid; cid uuid;
begin
 -- Serializes writes through this service; exclusion constraint also covers other writers.
 perform pg_advisory_xact_lock(214701,9313);
 if p_actor is null then raise exception using errcode='22023',message='Actor required'; end if;
 perform set_config('app.accounting_actor',p_actor::text,true);
 if p_action in ('deposit','create_rates','create_company') then
  oid=(p_payload->>'operationId')::uuid;
  if oid is null then raise exception using errcode='22023',message='Operation required'; end if;
  select * into op from public.accounting_operations where id=oid;
  if found then
   if op.actor<>p_actor or op.action<>p_action or op.payload<>p_payload then raise exception using errcode='40001',message='Operation conflict'; end if;
   return op.result;
  end if;
 end if;
 if p_action in ('deposit','create_rates') then
  cid=(p_payload->>'insuranceCompanyId')::uuid;
  select * into c from public.insurance_companies where id=cid for update;
  if not found or not c.is_active then raise exception using errcode='22023',message='Company unavailable'; end if;
 end if;
 if p_action='deposit' then
  if (p_payload->>'amount')::numeric<=0 or (p_payload->>'amount')::numeric>999999999.99 or (p_payload->>'amount')::numeric<>round((p_payload->>'amount')::numeric,2) then raise exception using errcode='22023',message='Invalid amount'; end if;
  insert into public.insurance_company_deposits(insurance_company_id,amount,deposit_date,payment_method,reference,note,created_by)
  values(cid,(p_payload->>'amount')::numeric,(p_payload->>'depositDate')::date,p_payload->>'paymentMethod',p_payload->>'reference',p_payload->>'note',p_actor) returning * into d;
  result=jsonb_build_object('deposit',to_jsonb(d));
 elsif p_action='create_rates' then
  if jsonb_array_length(p_payload->'rows') not between 1 and 100 then raise exception using errcode='22023',message='Invalid rows'; end if;
  for item in select value from jsonb_array_elements(p_payload->'rows') loop
   insert into public.insurance_cost_rates(insurance_company_id,min_age,max_age,duration_years,real_cost,effective_from,is_active) values
    (cid,(item->>'minAge')::int,(item->>'maxAge')::int,1,(item->>'oneYearCost')::numeric,(p_payload->>'effectiveFrom')::date,true),
    (cid,(item->>'minAge')::int,(item->>'maxAge')::int,2,(item->>'twoYearCost')::numeric,(p_payload->>'effectiveFrom')::date,true);
  end loop;
  result=jsonb_build_object('created',jsonb_array_length(p_payload->'rows')*2);
 elsif p_action='update_rate' then
  select * into r from public.insurance_cost_rates where id=(p_payload->>'id')::uuid for update;
  if not found then raise exception using errcode='P0002',message='Rate missing'; end if;
  if r.updated_at is distinct from (p_payload->>'version')::timestamptz then raise exception using errcode='40001',message='Rate changed'; end if;
  update public.insurance_cost_rates set min_age=(p_payload->>'minAge')::int,max_age=(p_payload->>'maxAge')::int,real_cost=(p_payload->>'realCost')::numeric,effective_from=(p_payload->>'effectiveFrom')::date,is_active=(p_payload->>'isActive')::boolean,updated_at=clock_timestamp() where id=r.id returning * into r;
  result=jsonb_build_object('rate',to_jsonb(r));
 elsif p_action in ('create_company','update_company') then
  if length(btrim(p_payload->>'name')) not between 1 and 120 or jsonb_typeof(p_payload->'isActive')<>'boolean' then raise exception using errcode='22023',message='Invalid company'; end if;
  if p_action='create_company' then
   insert into public.insurance_companies(name,is_active) values(btrim(p_payload->>'name'),(p_payload->>'isActive')::boolean) returning * into c;
  else
   select * into c from public.insurance_companies where id=(p_payload->>'id')::uuid for update;
   if not found then raise exception using errcode='P0002',message='Company missing'; end if;
   if c.updated_at is distinct from (p_payload->>'version')::timestamptz then raise exception using errcode='40001',message='Company changed'; end if;
   update public.insurance_companies set name=btrim(p_payload->>'name'),is_active=(p_payload->>'isActive')::boolean,updated_at=clock_timestamp() where id=c.id returning * into c;
  end if;
  result=jsonb_build_object('company',to_jsonb(c));
 else raise exception using errcode='22023',message='Unknown operation';
 end if;
 if oid is not null then insert into public.accounting_operations(id,actor,action,payload,result) values(oid,p_actor,p_action,p_payload,result); end if;
 return result;
end $$;
revoke all on function public.accounting_write(text,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.accounting_write(text,jsonb,uuid) to service_role;
revoke all on function public.accounting_rate_history_trigger() from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
