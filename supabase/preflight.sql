-- Read-only evidence collection. Run against a schema export/staging first.
select table_name,column_name,data_type,udt_name,is_nullable
from information_schema.columns
where table_schema='public' and table_name in
('profiles','user_accounts','host_profiles','properties','bookings','property_images','property_amenities')
order by table_name,ordinal_position;
select schemaname,tablename,policyname,roles,cmd,qual,with_check
from pg_policies where schemaname='public' and tablename in
('profiles','user_accounts','host_profiles','properties','bookings') order by tablename,policyname;
select table_name,grantee,privilege_type from information_schema.role_table_grants
where table_schema='public' and table_name in ('properties','user_accounts','host_profiles') order by table_name,grantee;
select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid),p.prosecdef,p.proconfig
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where (n.nspname='private' and p.proname='has_staff_permission')
or (n.nspname='public' and p.proname='product_catalog_v1');
