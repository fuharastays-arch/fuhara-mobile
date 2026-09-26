-- Fuhara Stays
-- Properties foundation

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'property_status'
  ) then
    create type public.property_status as enum (
      'pending',
      'approved',
      'rejected',
      'suspended'
    );
  end if;
end
$$;


do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'property_type'
  ) then
    create type public.property_type as enum (
      'apartment',
      'house',
      'villa',
      'studio',
      'serviced_apartment',
      'hotel',
      'other'
    );
  end if;
end
$$;


create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),

  host_id uuid not null
    references public.profiles(id)
    on delete cascade,

  title text not null,

  description text,

  property_type public.property_type
    not null
    default 'apartment',

  address_line text,

  area text,

  city text not null
    default 'Abuja',

  state text not null
    default 'FCT',

  country text not null
    default 'Nigeria',

  bedrooms integer not null default 1
    check (bedrooms >= 0),

  bathrooms numeric(4,1) not null default 1
    check (bathrooms >= 0),

  max_guests integer not null default 1
    check (max_guests > 0),

  nightly_rate_kobo bigint not null
    check (nightly_rate_kobo >= 0),

  currency_code text not null
    default 'NGN',

  cover_image_url text,

  status public.property_status
    not null
    default 'pending',

  submitted_at timestamptz
    default now(),

  reviewed_at timestamptz,

  reviewed_by uuid
    references public.staff_profiles(id)
    on delete set null,

  rejection_reason text,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now()
);


create index if not exists properties_host_id_idx
on public.properties(host_id);

create index if not exists properties_status_idx
on public.properties(status);

create index if not exists properties_city_idx
on public.properties(city);


drop trigger if exists set_properties_updated_at
on public.properties;

create trigger set_properties_updated_at
before update
on public.properties
for each row
execute function public.set_updated_at();


alter table public.properties
enable row level security;


-- Hosts may view their own properties.

drop policy if exists "Hosts can view own properties"
on public.properties;

create policy "Hosts can view own properties"
on public.properties
for select
to authenticated
using (
  auth.uid() = host_id
);


-- Verified hosts may submit properties.

drop policy if exists "Verified hosts can create properties"
on public.properties;

create policy "Verified hosts can create properties"
on public.properties
for insert
to authenticated
with check (
  auth.uid() = host_id
  and status = 'pending'
  and exists (
    select 1
    from public.user_accounts ua
    join public.host_profiles hp
      on hp.user_id = ua.user_id
    where ua.user_id = auth.uid()
      and ua.is_host = true
      and ua.status = 'active'
      and hp.kyc_status = 'verified'
  )
);


-- Staff with properties.view may see all properties.

drop policy if exists "Staff with properties.view can view properties"
on public.properties;

create policy "Staff with properties.view can view properties"
on public.properties
for select
to authenticated
using (
  private.has_staff_permission('properties.view')
);


-- Staff with properties.manage may create properties.

drop policy if exists "Staff with properties.manage can create properties"
on public.properties;

create policy "Staff with properties.manage can create properties"
on public.properties
for insert
to authenticated
with check (
  private.has_staff_permission('properties.manage')
);


-- Staff with properties.manage may update properties.

drop policy if exists "Staff with properties.manage can update properties"
on public.properties;

create policy "Staff with properties.manage can update properties"
on public.properties
for update
to authenticated
using (
  private.has_staff_permission('properties.manage')
)
with check (
  private.has_staff_permission('properties.manage')
);


grant select, insert, update
on table public.properties
to authenticated;