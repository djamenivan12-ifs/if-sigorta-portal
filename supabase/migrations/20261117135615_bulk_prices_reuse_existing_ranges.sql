begin;
create or replace function public.save_all_partner_price_grids(p_ranges jsonb,p_revision text)
returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare snapshot jsonb; partner jsonb; result jsonb; partner_ranges jsonb;
begin
  if jsonb_typeof(p_ranges) is distinct from 'array' then
    raise exception using errcode='22023',message='Invalid price grid';
  end if;
  if jsonb_array_length(p_ranges) not between 1 and 200 or
     exists(select 1 from jsonb_array_elements(p_ranges) r where r ? 'id') then
    raise exception using errcode='22023',message='Supply a new grid without row ids';
  end if;
  -- Same first lock as individual grid saves. Freeze membership until commit too.
  lock table public.partner_price_ranges in share row exclusive mode;
  lock table public.partners in share mode;
  snapshot := public.all_partner_price_snapshot();
  if snapshot->>'revision' is distinct from p_revision then
    raise exception using errcode='PT409',message='Partners or prices changed';
  end if;
  if jsonb_array_length(snapshot->'partners')=0 then
    raise exception using errcode='22023',message='No partners';
  end if;
  for partner in select value from jsonb_array_elements(snapshot->'partners') loop
    -- Reuse this partner's row IDs for matching age bands. Production also has
    -- UNIQUE(partner_id,minimum_age,maximum_age), which is not deferrable.
    select jsonb_agg(r.value || coalesce((
      select jsonb_build_object('id',e.value->'id')
      from jsonb_array_elements(partner->'ranges') e(value)
      where e.value->'minimumAge'=r.value->'minimumAge'
        and e.value->'maximumAge'=r.value->'maximumAge'
    ),'{}'::jsonb) order by r.ord)
    into partner_ranges
    from jsonb_array_elements(p_ranges) with ordinality r(value,ord);
    -- New bounds can temporarily overlap removed bounds until replacement ends.
    set constraints partner_price_ranges_active_no_overlap deferred;
    perform public.save_price_grid(partner_ranges,partner->'ranges',(partner->>'id')::uuid);
  end loop;
  result := public.all_partner_price_snapshot();
  return jsonb_build_object('updatedCount',jsonb_array_length(result->'partners'),'revision',result->>'revision');
end $$;

notify pgrst,'reload schema';
commit;
