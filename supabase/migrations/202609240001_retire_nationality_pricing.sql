-- Apply before deploying the application change. No historical amounts are rewritten.
begin;
create or replace function public.enforce_nationality_request_cost() returns trigger language plpgsql set search_path=public,pg_temp as $$
declare r public.insurance_nationality_rates%rowtype; standard public.insurance_cost_rates%rowtype; begin
 if tg_op='INSERT' and new.nationality_rate_id is not null then
  raise exception using errcode='22023',message='Nationality pricing is retired';
 end if;
 if tg_op='UPDATE' and old.nationality_rate_id is null and new.nationality_rate_id is not null then
  raise exception using errcode='22023',message='Nationality pricing is retired';
 end if;
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
  -- Retain costs already frozen before retirement. For an unassigned legacy
  -- quote, the first insurer selection uses the same standard rate as everyone.
  if tg_op='UPDATE' and old.insurance_company_id is not null then
   if (new.insurance_company_id,new.insurance_cost_rate_id,new.actual_insurance_cost)
      is distinct from (old.insurance_company_id,old.insurance_cost_rate_id,old.actual_insurance_cost) then
    raise exception using errcode='22023',message='Frozen insurer cost cannot be replaced';
   end if;
  elsif new.insurance_company_id is not null then
   select * into standard from public.insurance_cost_rates
    where insurance_company_id=new.insurance_company_id and is_active
      and duration_years=new.insurance_duration_years
      and new.calculated_age between min_age and max_age
      and effective_from <= (now() at time zone 'Europe/Istanbul')::date
    order by effective_from desc,created_at desc limit 1;
   if not found or new.insurance_cost_rate_id is distinct from standard.id
      or new.actual_insurance_cost is distinct from standard.real_cost then
    raise exception using errcode='22023',message='Insurer cost must match standard rate';
   end if;
  end if;
 end if;
 return new;
end $$;

-- Existing special grids remain immutable historical records only.
revoke execute on function public.create_nationality_grid(uuid,uuid,date,date,jsonb) from service_role;
notify pgrst,'reload schema';
commit;
