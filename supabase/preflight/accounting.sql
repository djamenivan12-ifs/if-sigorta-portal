-- READ ONLY: inspect on a test copy before migration.
select a.id as first_rate,b.id as second_rate,a.insurance_company_id,a.duration_years,a.effective_from
from public.insurance_cost_rates a join public.insurance_cost_rates b
on a.id<b.id and a.insurance_company_id=b.insurance_company_id and a.duration_years=b.duration_years
and a.effective_from=b.effective_from and a.is_active and b.is_active
and a.min_age<=b.max_age and b.min_age<=a.max_age;
select lower(btrim(name)) as normalized_name,count(*) from public.insurance_companies group by lower(btrim(name)) having count(*)>1;
select id from public.insurance_cost_rates where min_age<0 or max_age<min_age or max_age>10000 or duration_years not in(1,2) or real_cost<0 or real_cost>999999999.99 or real_cost<>round(real_cost,2);
select tg.tgname,pg_get_triggerdef(tg.oid),pg_get_functiondef(tg.tgfoid) from pg_trigger tg where tg.tgrelid='public.insurance_cost_rates'::regclass and not tg.tgisinternal;
select conname,pg_get_constraintdef(oid) from pg_constraint where conrelid in ('public.insurance_cost_rates'::regclass,'public.insurance_companies'::regclass);
select routine_name from information_schema.routines where routine_schema='public' and routine_name like 'accounting_%';
