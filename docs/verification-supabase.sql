-- READ ONLY: run against a test copy or in the SQL editor with administrative read access.
-- Do not apply schema changes from guesses. Review these results before designing migrations.
select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns where table_schema = 'public'
order by table_name, ordinal_position;

select n.nspname as schema_name,c.relname as table_name,c.relrowsecurity as rls_enabled,
 c.relforcerowsecurity as rls_forced
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname in ('public','storage') and c.relkind='r';

select schemaname,tablename,policyname,roles,cmd,qual,with_check
from pg_policies where schemaname in ('public','storage') order by schemaname,tablename;

select table_name,constraint_name,constraint_type from information_schema.table_constraints
where table_schema='public' order by table_name,constraint_name;

select schemaname,tablename,indexname,indexdef from pg_indexes
where schemaname='public' order by tablename,indexname;

select event_object_table,trigger_name,event_manipulation,action_statement
from information_schema.triggers where trigger_schema='public';

select routine_name,routine_type,data_type from information_schema.routines
where routine_schema='public' order by routine_name;

select id,name,public,file_size_limit,allowed_mime_types from storage.buckets;
