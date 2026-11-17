begin;
-- Server-only snapshots include empty grids and inactive partners.
create function public.all_partner_price_snapshot()
returns jsonb language sql stable security invoker set search_path = public, pg_temp as $$
  with snapshot as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id',p.id,'name',p.company_name,'isActive',p.is_active,
      'ranges',public.price_grid_snapshot(p.id)) order by p.id),'[]'::jsonb) as partners
    from public.partners p
  )
  select jsonb_build_object('partners',partners,'revision',md5(partners::text)) from snapshot;
$$;

create function public.save_all_partner_price_grids(p_ranges jsonb,p_revision text)
returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare snapshot jsonb; partner jsonb; result jsonb;
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
    -- Each replacement inserts before removing old rows; defer until that save completes.
    set constraints partner_price_ranges_active_no_overlap deferred;
    perform public.save_price_grid(p_ranges,partner->'ranges',(partner->>'id')::uuid);
  end loop;
  result := public.all_partner_price_snapshot();
  return jsonb_build_object('updatedCount',jsonb_array_length(result->'partners'),'revision',result->>'revision');
end $$;

revoke all on function public.all_partner_price_snapshot() from public,anon,authenticated;
revoke all on function public.save_all_partner_price_grids(jsonb,text) from public,anon,authenticated;
grant execute on function public.all_partner_price_snapshot() to service_role;
grant execute on function public.save_all_partner_price_grids(jsonb,text) to service_role;
notify pgrst,'reload schema';
commit;
