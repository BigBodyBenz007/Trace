-- READ ONLY. Run as postgres in the NEW, EMPTY Production Supabase project
-- after the existing 20261024_shared_package_labels.sql migration.
-- Returns counts/permissions only; no credentials, identities or photos.
select jsonb_build_object(
 'tables', (select jsonb_agg(jsonb_build_object(
   'name', c.relname, 'rls_enabled', c.relrowsecurity,
   'anon_access', has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'),
   'authenticated_access', has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'),
   'server_can_read_write', has_table_privilege('service_role',c.oid,'SELECT')
     and has_table_privilege('service_role',c.oid,'INSERT')
     and has_table_privilege('service_role',c.oid,'UPDATE')
     and has_table_privilege('service_role',c.oid,'DELETE')) order by c.relname)
   from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relname in ('trace_label_submissions','trace_label_versions','trace_label_limits')),
 'command_function', (select jsonb_build_object(
   'exists',true,'security_invoker',not p.prosecdef,
   'anon_execute',has_function_privilege('anon',p.oid,'EXECUTE'),
   'authenticated_execute',has_function_privilege('authenticated',p.oid,'EXECUTE'),
   'server_execute',has_function_privilege('service_role',p.oid,'EXECUTE'))
   from pg_proc p where p.oid='public.trace_labels_command(text,jsonb)'::regprocedure),
 'storage_rls', (select jsonb_object_agg(c.relname,c.relrowsecurity)
   from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='storage' and c.relname in ('buckets','objects')),
 'evidence_bucket', (select jsonb_build_object('private',not public,
   'file_size_limit',file_size_limit,'allowed_mime_types',allowed_mime_types)
   from storage.buckets where id='trace-label-evidence'),
 'label_table_policies', (select coalesce(jsonb_agg(jsonb_build_object('table',tablename,'policy',policyname,'roles',roles)),'[]'::jsonb)
   from pg_policies where schemaname='public' and tablename in ('trace_label_submissions','trace_label_versions','trace_label_limits')),
 'storage_policies', (select coalesce(jsonb_agg(jsonb_build_object('table',tablename,'policy',policyname,'roles',roles)),'[]'::jsonb)
   from pg_policies where schemaname='storage' and tablename in ('buckets','objects')),
 'automatic_rls', (select coalesce(jsonb_agg(jsonb_build_object('trigger',evtname,'enabled',evtenabled)),'[]'::jsonb)
   from pg_event_trigger where evtname='ensure_rls'),
 'initial_counts',jsonb_build_object(
   'submissions',(select count(*) from public.trace_label_submissions),
   'versions',(select count(*) from public.trace_label_versions),
   'active_versions',(select count(*) from public.trace_label_versions where active),
   'private_photos',(select count(*) from storage.objects where bucket_id='trace-label-evidence')),
 'owner_account', (select jsonb_build_object('user_count',count(*),
   'all_emails_confirmed',bool_and(email_confirmed_at is not null),
   'all_passwords_set',bool_and(coalesce(encrypted_password,'')<>'')) from auth.users)
);
