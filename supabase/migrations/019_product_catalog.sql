-- Candidate 019: coordinate numbering with Admin. NOT APPLIED to production.
begin;

create table public.property_images (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  url text not null check (length(url) <= 2048 and url ~ '^https://[^[:space:]]+$'),
  alt_text text not null default '' check (length(alt_text) <= 160),
  position integer not null check (position between 0 and 19),
  unique (property_id, position)
);
create table public.property_amenities (
  property_id uuid not null references public.properties(id) on delete cascade,
  code text not null check (code ~ '^[a-z][a-z0-9_]{0,49}$'),
  label text not null check (length(btrim(label)) between 1 and 80),
  primary key (property_id, code)
);
alter table public.property_images enable row level security;
alter table public.property_amenities enable row level security;
revoke all on public.property_images, public.property_amenities from public, anon, authenticated;
grant select, insert, update, delete on public.property_images, public.property_amenities to authenticated;

create policy product_images_staff_read on public.property_images for select to authenticated
using (private.has_staff_permission('properties.view'));
create policy product_images_staff_write on public.property_images for all to authenticated
using (private.has_staff_permission('properties.manage'))
with check (private.has_staff_permission('properties.manage'));
create policy product_amenities_staff_read on public.property_amenities for select to authenticated
using (private.has_staff_permission('properties.view'));
create policy product_amenities_staff_write on public.property_amenities for all to authenticated
using (private.has_staff_permission('properties.manage'))
with check (private.has_staff_permission('properties.manage'));

create function public.product_catalog_v1(
  p_destination text default '', p_guests integer default 1,
  p_type text default '', p_max_rate bigint default null,
  p_sort text default 'newest', p_page integer default 1,
  p_id uuid default null
) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare result jsonb;
begin
  if p_destination is null or length(p_destination) > 80
    or p_guests is null or p_guests < 1 or p_guests > 100
    or p_type is null or p_type not in ('','apartment','house','villa','studio','serviced_apartment','hotel','other')
    or p_sort is null or p_sort not in ('newest','price_low','price_high')
    or p_page is null or p_page < 1 or p_page > 1000
    or (p_max_rate is not null and (p_max_rate < 0 or p_max_rate > 9007199254740991)) then
    raise exception 'Invalid catalog filters' using errcode = '22023';
  end if;

  with eligible as (
    select p.id, p.title, p.description, p.property_type, p.area, p.city, p.state,
      p.country, p.bedrooms, p.bathrooms, p.max_guests, p.nightly_rate_kobo,
      p.currency_code, p.cover_image_url, p.created_at
    from public.properties p
    join public.user_accounts ua on ua.user_id = p.host_id
    join public.host_profiles hp on hp.user_id = p.host_id
    where p.status = 'approved' and ua.status = 'active' and ua.is_host
      and hp.kyc_status = 'verified'
      and p.currency_code = 'NGN'
      and p.nightly_rate_kobo between 0 and 9007199254740991
      and (p_id is null or p.id = p_id)
      and (p_destination = '' or strpos(lower(p.city), lower(btrim(p_destination))) > 0
        or strpos(lower(coalesce(p.area,'')), lower(btrim(p_destination))) > 0)
      and p.max_guests >= p_guests
      and (p_type = '' or p.property_type::text = p_type)
      and (p_max_rate is null or p.nightly_rate_kobo <= p_max_rate)
    order by
      case when p_sort = 'price_low' then p.nightly_rate_kobo end asc,
      case when p_sort = 'price_high' then p.nightly_rate_kobo end desc,
      case when p_sort = 'newest' then p.created_at end desc,
      p.id asc
    limit 13 offset (p_page - 1) * 12
  ), numbered as (
    select e.*, row_number() over (order by
      case when p_sort = 'price_low' then e.nightly_rate_kobo end asc,
      case when p_sort = 'price_high' then e.nightly_rate_kobo end desc,
      case when p_sort = 'newest' then e.created_at end desc, e.id asc) as ordinal
    from eligible e
  ), projected as (
    select n.ordinal, jsonb_build_object(
      'id',n.id,'title',n.title,'description',n.description,'property_type',n.property_type,
      'area',n.area,'city',n.city,'state',n.state,'country',n.country,
      'bedrooms',n.bedrooms,'bathrooms',n.bathrooms,'max_guests',n.max_guests,
      'nightly_rate_kobo',n.nightly_rate_kobo::text,'currency_code',n.currency_code,
      'cover_image_url',n.cover_image_url,
      'images',coalesce((select jsonb_agg(jsonb_build_object(
        'id',i.id,'url',i.url,'alt_text',i.alt_text,'position',i.position) order by i.position,i.id)
        from public.property_images i where i.property_id = n.id),'[]'::jsonb),
      'amenities',coalesce((select jsonb_agg(jsonb_build_object('code',a.code,'label',a.label) order by a.label,a.code)
        from (select pa.code,pa.label from public.property_amenities pa
          where pa.property_id = n.id order by pa.label,pa.code limit 50) a),'[]'::jsonb)
    ) as item from numbered n where n.ordinal <= 12
  ) select jsonb_build_object('items',coalesce((select jsonb_agg(item order by ordinal) from projected),'[]'::jsonb),
      'has_more',exists(select 1 from numbered where ordinal = 13)) into result;
  return result;
end;
$$;
revoke all on function public.product_catalog_v1(text,integer,text,bigint,text,integer,uuid) from public, anon, authenticated;
grant execute on function public.product_catalog_v1(text,integer,text,bigint,text,integer,uuid) to anon, authenticated;
comment on function public.product_catalog_v1(text,integer,text,bigint,text,integer,uuid)
is 'Phase 2 read-only NGN catalog. Approved property + active verified host; explicit public projection.';
notify pgrst, 'reload schema';
commit;
