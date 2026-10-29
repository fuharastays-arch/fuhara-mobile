-- Run ONLY in an empty disposable database named fuhara_catalog_test:
-- psql -v ON_ERROR_STOP=1 -d fuhara_catalog_test -f tests/sql/catalog.sql
\set ON_ERROR_STOP on
do $$ begin
  if current_database() <> 'fuhara_catalog_test' then
    raise exception 'Refusing to run outside disposable fuhara_catalog_test';
  end if;
end $$;
create role anon nologin;
create role authenticated nologin;
create schema auth;
create schema private;
grant usage on schema public, auth, private to anon, authenticated;
create function auth.uid() returns uuid language sql stable as
$$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
-- Test-only substitute for the existing staff permission engine. Never deployed.
create function private.has_staff_permission(permission text) returns boolean language sql stable as
$$ select permission = any(string_to_array(current_setting('test.staff_permissions',true),',')) $$;
create function public.set_updated_at() returns trigger language plpgsql as
$$ begin new.updated_at=now();return new;end $$;
-- Dependency fixture: source-confirmed columns, not a full Supabase schema.
create table public.profiles(id uuid primary key);
create table public.staff_profiles(id uuid primary key);
create table public.user_accounts(user_id uuid primary key references public.profiles(id),status text not null,is_host boolean not null);
create table public.host_profiles(user_id uuid primary key references public.profiles(id),kyc_status text not null);
grant select on public.user_accounts,public.host_profiles to authenticated;
\ir 006_properties_baseline.sql
create temporary table before_policies as select * from pg_policies where tablename='properties';
create temporary table before_columns as select * from information_schema.columns where table_schema='public' and table_name in ('profiles','user_accounts','host_profiles','properties');
create temporary table before_grants as select * from information_schema.role_table_grants where table_schema='public' and table_name='properties';
\ir ../../supabase/migrations/019_product_catalog.sql
create function public.test_assert_true(ok boolean, message text) returns void language plpgsql as
$$ begin if ok is distinct from true then raise exception 'FAIL: %',message; end if; raise notice 'PASS: %',message; end $$;
select public.test_assert_true(not exists((select * from before_policies except select * from pg_policies where tablename='properties') union all (select * from pg_policies where tablename='properties' except select * from before_policies)), 'existing property policies unchanged');
select public.test_assert_true(not exists(select * from before_columns except select * from information_schema.columns), 'existing columns unchanged');
select public.test_assert_true(not exists((select * from before_grants except select * from information_schema.role_table_grants) union all (select * from information_schema.role_table_grants where table_schema='public' and table_name='properties' except select * from before_grants)), 'existing property grants unchanged');
select public.test_assert_true((select prosecdef and proconfig @> array['search_path=""'] from pg_proc where oid='public.product_catalog_v1(text,integer,text,bigint,text,integer,uuid)'::regprocedure), 'fixed definer search path');
insert into public.profiles values ('10000000-0000-4000-8000-000000000001'),('10000000-0000-4000-8000-000000000002'),('10000000-0000-4000-8000-000000000003'),('10000000-0000-4000-8000-000000000004');
insert into public.user_accounts values ('10000000-0000-4000-8000-000000000001','active',true),('10000000-0000-4000-8000-000000000002','suspended',true),('10000000-0000-4000-8000-000000000003','active',true),('10000000-0000-4000-8000-000000000004','active',false);
insert into public.host_profiles values ('10000000-0000-4000-8000-000000000001','verified'),('10000000-0000-4000-8000-000000000002','verified'),('10000000-0000-4000-8000-000000000003','pending'),('10000000-0000-4000-8000-000000000004','verified');
insert into public.properties (id,host_id,title,nightly_rate_kobo,status,address_line,area) values
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Eligible',10000,'approved','SECRET ADDRESS','Maitama'),
('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','Pending',10000,'pending',null,null),
('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','Rejected',10000,'rejected',null,null),
('20000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001','Suspended',10000,'suspended',null,null),
('20000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000002','Inactive host',10000,'approved',null,null),
('20000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000003','Unverified host',10000,'approved',null,null),
('20000000-0000-4000-8000-000000000007','10000000-0000-4000-8000-000000000004','No host capability',10000,'approved',null,null);
insert into public.property_images(property_id,url,alt_text,position) values ('20000000-0000-4000-8000-000000000001','https://example.test/a.jpg','Gallery',0),('20000000-0000-4000-8000-000000000002','https://example.test/private.jpg','Not public',0);
insert into public.property_amenities values ('20000000-0000-4000-8000-000000000001','wifi','Wi-Fi');
set role anon;
select public.test_assert_true(jsonb_array_length(public.product_catalog_v1()->'items')=1,'anon sees only approved active verified host');
select public.test_assert_true(public.product_catalog_v1()#>>'{items,0,nightly_rate_kobo}'='10000','integer rate transported as decimal string');
select public.test_assert_true(public.product_catalog_v1()::text not like '%SECRET%' and not (public.product_catalog_v1()#>'{items,0}') ?| array['host_id','address_line','reviewed_by','rejection_reason'],'no private fields');
select public.test_assert_true(public.product_catalog_v1()#>>'{items,0,images,0,alt_text}'='Gallery' and public.product_catalog_v1()#>>'{items,0,amenities,0,label}'='Wi-Fi','real related content projected');
select public.test_assert_true(jsonb_array_length(public.product_catalog_v1(p_id=>'20000000-0000-4000-8000-000000000002')->'items')=0,'pending detail is hidden');
select public.test_assert_true(jsonb_array_length(public.product_catalog_v1(p_destination=>'%')->'items')=0,'search wildcards treated literally');
select public.test_assert_true(jsonb_array_length(public.product_catalog_v1(p_destination=>'MAITAMA')->'items')=1,'case-insensitive neighbourhood search');
select public.test_assert_true(jsonb_array_length(public.product_catalog_v1(p_guests=>2)->'items')=0,'guest capacity filter');
select public.test_assert_true(jsonb_array_length(public.product_catalog_v1(p_max_rate=>9999)->'items')=0,'price filter in kobo');
do $$ begin
  begin perform * from public.properties; raise exception 'anon read allowed'; exception when insufficient_privilege then null; end;
  begin perform * from public.property_images; raise exception 'anon media read allowed'; exception when insufficient_privilege then null; end;
  begin perform public.product_catalog_v1(p_page=>1001); raise exception 'unbounded page allowed'; exception when invalid_parameter_value then null; end;
  begin perform public.product_catalog_v1(p_guests=>0); raise exception 'invalid guests allowed'; exception when invalid_parameter_value then null; end;
  begin perform public.product_catalog_v1(p_sort=>'sql injection'); raise exception 'invalid sort allowed'; exception when invalid_parameter_value then null; end;
  raise notice 'PASS: anon table denial and invalid argument checks';
end $$;
reset role;
set role authenticated;
set request.jwt.claim.sub='10000000-0000-4000-8000-000000000001';
select public.test_assert_true((select count(*) from public.properties)=4,'owner property reads unchanged');
select public.test_assert_true((select count(*) from public.property_images)=0,'owner cannot read staff-only media table directly');
select public.test_assert_true(jsonb_array_length(public.product_catalog_v1()->'items')=1,'authenticated catalog uses same publication rule');
do $$ begin
  begin insert into public.property_amenities values ('20000000-0000-4000-8000-000000000001','pool','Pool'); raise exception 'owner media write allowed'; exception when insufficient_privilege then null; end;
  raise notice 'PASS: owner cannot bypass moderation';
end $$;
set request.jwt.claim.sub='10000000-0000-4000-8000-000000000099';
select public.test_assert_true((select count(*) from public.properties)=0,'ordinary guest direct property read remains restricted');
set test.staff_permissions='properties.view';
select public.test_assert_true((select count(*) from public.properties)=7,'staff still sees all property statuses');
select public.test_assert_true((select count(*) from public.property_images)=2,'staff read permission sees media including pending');
set test.staff_permissions='properties.view,properties.manage';
insert into public.property_amenities values ('20000000-0000-4000-8000-000000000001','pool','Pool');
update public.property_amenities set label='Swimming pool' where code='pool';
delete from public.property_amenities where code='pool';
select public.test_assert_true((select count(*) from public.property_amenities)=1,'authorized staff CRUD works');
reset role;
update public.user_accounts set status='disabled' where user_id='10000000-0000-4000-8000-000000000001';
select public.test_assert_true(jsonb_array_length(public.product_catalog_v1()->'items')=0,'host deactivation immediately hides catalog');
update public.user_accounts set status='active' where user_id='10000000-0000-4000-8000-000000000001';
insert into public.properties(id,host_id,title,nightly_rate_kobo,status,created_at)
select ('30000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'10000000-0000-4000-8000-000000000001','Page '||n,n*10000,'approved','2026-01-01'::timestamptz from generate_series(1,13) n;
select public.test_assert_true(jsonb_array_length(public.product_catalog_v1()->'items')=12 and (public.product_catalog_v1()->>'has_more')::boolean,'bounded page and has_more');
select public.test_assert_true(jsonb_array_length(public.product_catalog_v1(p_page=>2)->'items')=2 and not (public.product_catalog_v1(p_page=>2)->>'has_more')::boolean,'last page');
select public.test_assert_true(public.product_catalog_v1(p_sort=>'price_high')#>>'{items,0,nightly_rate_kobo}'='130000','descending numeric price sort');
select public.test_assert_true(public.product_catalog_v1(p_sort=>'price_low')#>>'{items,0,id}'='20000000-0000-4000-8000-000000000001','deterministic UUID price tie-break');
update public.properties set currency_code='USD' where title='Eligible';
select public.test_assert_true(jsonb_array_length(public.product_catalog_v1(p_id=>'20000000-0000-4000-8000-000000000001')->'items')=0,'unsupported currency withheld');
update public.properties set currency_code='NGN',nightly_rate_kobo=9007199254740992 where title='Eligible';
select public.test_assert_true(jsonb_array_length(public.product_catalog_v1(p_id=>'20000000-0000-4000-8000-000000000001')->'items')=0,'unsafe numeric rate withheld');
\echo All catalog SQL role checks passed.
