begin;
create extension if not exists btree_gist;

-- Deferred overlap checks allow a legitimate multi-row boundary swap in one transaction.
alter table public.insurance_price_ranges
  add constraint insurance_price_ranges_valid_values check
    (minimum_age >= 0 and maximum_age >= minimum_age and
     one_year_price > 0 and two_year_price > 0 and
     one_year_price::text not in ('NaN','Infinity','-Infinity') and
     two_year_price::text not in ('NaN','Infinity','-Infinity')),
  add constraint insurance_price_ranges_active_no_overlap exclude using gist
    (int8range(minimum_age::bigint,maximum_age::bigint,'[]') with &&)
    where (is_active) deferrable initially deferred;
alter table public.partner_price_ranges
  add constraint partner_price_ranges_valid_values check
    (minimum_age >= 0 and maximum_age >= minimum_age and
     one_year_price > 0 and two_year_price > 0 and
     one_year_price::text not in ('NaN','Infinity','-Infinity') and
     two_year_price::text not in ('NaN','Infinity','-Infinity')),
  add constraint partner_price_ranges_active_no_overlap exclude using gist
    (partner_id with =,int8range(minimum_age::bigint,maximum_age::bigint,'[]') with &&)
    where (is_active) deferrable initially deferred;

create function public.price_grid_snapshot(p_partner_id uuid default null)
returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare result jsonb; table_name text;
begin
  table_name := case when p_partner_id is null then 'insurance_price_ranges' else 'partner_price_ranges' end;
  execute format('select coalesce(jsonb_agg(jsonb_build_object(
    ''id'',id,''minimumAge'',minimum_age,''maximumAge'',maximum_age,
    ''oneYearPrice'',one_year_price,''twoYearPrice'',two_year_price,
    ''isActive'',is_active) order by id),''[]''::jsonb) from public.%I %s',
    table_name,case when p_partner_id is null then '' else 'where partner_id = $1' end)
    into result using p_partner_id;
  return result;
end $$;

create function public.save_price_grid(p_ranges jsonb,p_expected jsonb,p_partner_id uuid default null)
returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare table_name text; current_grid jsonb; r jsonb; row_id bigint; affected integer;
  submitted_ids bigint[] := '{}'; saved_ids bigint[] := '{}'; duplicate_count integer;
begin
  if jsonb_typeof(p_ranges) is distinct from 'array' or
     jsonb_typeof(p_expected) is distinct from 'array' then
    raise exception using errcode='22023',message='Invalid price grid';
  end if;
  if jsonb_array_length(p_ranges) not between 1 and 200 or jsonb_array_length(p_expected)>10000 then
    raise exception using errcode='22023',message='Invalid price grid length';
  end if;
  table_name := case when p_partner_id is null then 'insurance_price_ranges' else 'partner_price_ranges' end;
  -- Infrequent administration writes: also serialize writers that bypass this function.
  execute format('lock table public.%I in share row exclusive mode',table_name);
  if p_partner_id is not null then
    perform id from public.partners where id=p_partner_id for key share;
    if not found then raise exception using errcode='P0002',message='Partner missing'; end if;
  end if;
  current_grid := public.price_grid_snapshot(p_partner_id);
  if current_grid is distinct from p_expected then
    raise exception using errcode='40001',message='Price grid changed';
  end if;
  select count(*)-count(distinct value->>'id') into duplicate_count
    from jsonb_array_elements(p_ranges) where value ? 'id';
  if duplicate_count>0 then raise exception using errcode='22023',message='Duplicate price id'; end if;
  for r in select value from jsonb_array_elements(p_ranges) loop
    if jsonb_typeof(r) is distinct from 'object' or
       jsonb_typeof(r->'isActive') is distinct from 'boolean' or
       jsonb_typeof(r->'minimumAge') is distinct from 'number' or
       jsonb_typeof(r->'maximumAge') is distinct from 'number' or
       jsonb_typeof(r->'oneYearPrice') is distinct from 'number' or
       jsonb_typeof(r->'twoYearPrice') is distinct from 'number' or
       (r->>'minimumAge')::numeric <> trunc((r->>'minimumAge')::numeric) or
       (r->>'maximumAge')::numeric <> trunc((r->>'maximumAge')::numeric) then
      raise exception using errcode='22023',message='Invalid price values';
    end if;
    if r ? 'id' then
      if jsonb_typeof(r->'id') is distinct from 'number' or
         (r->>'id')::numeric <> trunc((r->>'id')::numeric) or (r->>'id')::numeric<=0 then
        raise exception using errcode='22023',message='Invalid price id';
      end if;
      row_id := (r->>'id')::bigint;
      if not exists(select 1 from jsonb_array_elements(current_grid) e where (e->>'id')::bigint=row_id) then
        raise exception using errcode='40001',message='Foreign or removed price id';
      end if;
      submitted_ids := array_append(submitted_ids,row_id);
      execute format('update public.%I set minimum_age=$1,maximum_age=$2,
        one_year_price=$3,two_year_price=$4,is_active=$5,updated_at=clock_timestamp()
        where id=$6 %s',table_name,case when p_partner_id is null then '' else 'and partner_id=$7' end)
        using (r->>'minimumAge')::integer,(r->>'maximumAge')::integer,
        (r->>'oneYearPrice')::numeric,(r->>'twoYearPrice')::numeric,
        (r->>'isActive')::boolean,row_id,p_partner_id;
      get diagnostics affected = row_count;
      if affected<>1 then raise exception using errcode='40001',message='Price removed'; end if;
    else
      execute format('insert into public.%I(minimum_age,maximum_age,one_year_price,two_year_price,is_active%s)
        values($1,$2,$3,$4,$5%s) returning id',table_name,
        case when p_partner_id is null then '' else ',partner_id' end,
        case when p_partner_id is null then '' else ',$6' end)
        into row_id using (r->>'minimumAge')::integer,(r->>'maximumAge')::integer,
        (r->>'oneYearPrice')::numeric,(r->>'twoYearPrice')::numeric,(r->>'isActive')::boolean,p_partner_id;
    end if;
    saved_ids := array_append(saved_ids,row_id);
  end loop;
  if p_partner_id is not null then
    delete from public.partner_price_ranges where partner_id=p_partner_id and not(id=any(saved_ids));
  end if;
  -- Validate before returning; a deferred commit failure must never look successful to the caller.
  if p_partner_id is null then
    set constraints insurance_price_ranges_active_no_overlap immediate;
  else
    set constraints partner_price_ranges_active_no_overlap immediate;
  end if;
  return public.price_grid_snapshot(p_partner_id);
end $$;

revoke all on function public.price_grid_snapshot(uuid) from public,anon,authenticated;
revoke all on function public.save_price_grid(jsonb,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.price_grid_snapshot(uuid) to service_role;
grant execute on function public.save_price_grid(jsonb,jsonb,uuid) to service_role;
notify pgrst,'reload schema';
commit;
