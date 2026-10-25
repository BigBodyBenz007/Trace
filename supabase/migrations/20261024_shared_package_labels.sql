-- Run once in the selected Supabase project's SQL Editor. No public/browser role
-- receives table, RPC or private-photo access. Vercel's server is the sole client.
begin;
create table if not exists public.trace_label_submissions (
 id uuid primary key, proof text not null, status text not null default 'uploading'
 check(status in ('uploading','pending','approved','rejected','withdrawn')),
 revision integer not null default 0, panel jsonb not null, metadata jsonb not null default '{}',
 photos jsonb not null default '[]', fingerprint text not null,
 created_at timestamptz not null default now(), submitted_at timestamptz,
 history jsonb not null default '[]'
);
create table if not exists public.trace_label_versions (
 id uuid primary key default gen_random_uuid(), submission_id uuid not null references public.trace_label_submissions(id),
 barcode text not null, panel jsonb not null, active boolean not null default true,
 published_at timestamptz not null default now(), owner_id uuid not null,
 reinstates uuid references public.trace_label_versions(id)
);
create index if not exists trace_label_versions_barcode on public.trace_label_versions(barcode);
create table if not exists public.trace_label_limits (
 key text not null, bucket timestamptz not null, count integer not null, primary key(key,bucket)
);
alter table public.trace_label_submissions enable row level security;
alter table public.trace_label_versions enable row level security;
alter table public.trace_label_limits enable row level security;
revoke all on public.trace_label_submissions, public.trace_label_versions, public.trace_label_limits from public,anon,authenticated;
grant all on public.trace_label_submissions, public.trace_label_versions, public.trace_label_limits to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('trace-label-evidence','trace-label-evidence',false,2097152,array['image/jpeg'])
 on conflict(id) do update set public=false,file_size_limit=2097152,allowed_mime_types=array['image/jpeg'];
-- Do not add storage.objects policies for anon/authenticated on this bucket.
create or replace function public.trace_labels_command(p_action text,p_data jsonb)
 returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare s trace_label_submissions; v trace_label_versions; n integer; limit_count integer;
 role_name text; event jsonb; new_id uuid; start_bucket timestamptz;
begin
 if p_action='rate' then
   start_bucket:=date_trunc('hour',now());
   limit_count:=case p_data->>'kind' when 'auth' then 12 when 'upload' then 120 else 600 end;
   delete from trace_label_limits where bucket<now()-interval '2 days';
   insert into trace_label_limits(key,bucket,count) values((p_data->>'kind')||':'||(p_data->>'key'),start_bucket,1)
    on conflict(key,bucket) do update set count=trace_label_limits.count+1 returning count into n;
   if n>limit_count then return 'false'::jsonb; end if;
   insert into trace_label_limits(key,bucket,count) values('global:'||(p_data->>'kind'),start_bucket,1)
    on conflict(key,bucket) do update set count=trace_label_limits.count+1 returning count into n;
   return to_jsonb(n<=case p_data->>'kind' when 'auth' then 30 when 'upload' then 1000 else 5000 end);
 end if;
 if p_action='start' then
   -- Lock a singleton quota row so simultaneous creates cannot exceed the cap.
   perform pg_advisory_xact_lock(7472616365);
   select * into s from trace_label_submissions where id=(p_data->>'id')::uuid for update;
   if found then
     if s.proof<>p_data->>'proof' or s.panel<>p_data->'panel' then raise exception 'retry-conflict'; end if;
     return jsonb_build_object('id',s.id,'status',s.status,'revision',s.revision);
   end if;
   if (select count(*) from trace_label_submissions where created_at>now()-interval '1 day')>=100
     or (select count(*) from trace_label_submissions where status in ('uploading','pending'))>=100 then raise exception 'upload-limit'; end if;
   insert into trace_label_submissions(id,proof,panel,metadata,fingerprint)
    values((p_data->>'id')::uuid,p_data->>'proof',p_data->'panel',p_data->'metadata',p_data->>'fingerprint') returning * into s;
   return jsonb_build_object('id',s.id,'status',s.status,'revision',s.revision);
 end if;
 select * into s from trace_label_submissions where id=(p_data->>'id')::uuid for update;
 if not found then raise exception 'not-found'; end if;
 if p_action in ('check-upload','photo','finish') then
   if s.proof<>p_data->>'proof' then raise exception 'not-found'; end if;
   if s.status<>'uploading' then return to_jsonb(s)-'proof'; end if;
   if s.created_at<now()-interval '24 hours' then raise exception 'upload-expired'; end if;
   if p_action='check-upload' then return to_jsonb(s)-'proof'; end if;
   if p_action='photo' then
     role_name:=p_data->'photo'->>'role';
     if exists(select 1 from jsonb_array_elements(s.photos) p where p->>'role'=role_name) then
       -- The API removes the losing upload after this conflict; retry reads winner.
       raise exception 'retry-conflict';
     end if;
     perform pg_advisory_xact_lock(7472616366);
     if (select coalesce(sum((p->>'bytes')::bigint),0) from trace_label_submissions t,
       lateral jsonb_array_elements(t.photos) p)+(p_data->'photo'->>'bytes')::bigint>524288000 then raise exception 'upload-limit'; end if;
     update trace_label_submissions set photos=photos||jsonb_build_array(p_data->'photo'),revision=revision+1 where id=s.id returning * into s;
     return to_jsonb(s)-'proof';
   end if;
   foreach role_name in array array['barcode','package','nutrition'] loop
     if not exists(select 1 from jsonb_array_elements(s.photos) p where p->>'role'=role_name) then raise exception 'missing-evidence'; end if;
   end loop;
   if (s.panel->>'ingredientsConfirmed')::boolean and not exists(select 1 from jsonb_array_elements(s.photos) p where p->>'role'='ingredients') then raise exception 'missing-evidence'; end if;
   update trace_label_submissions set status='pending',submitted_at=now(),revision=revision+1 where id=s.id returning * into s;
   return to_jsonb(s)-'proof';
 end if;
 if p_action<>'decide' then raise exception 'unsupported-command'; end if;
 if s.revision<>(p_data->>'revision')::integer then raise exception 'revision-conflict'; end if;
 event:=jsonb_build_object('id',gen_random_uuid(),'at',now(),'ownerId',p_data->>'actor','action',p_data->>'action',
   'reason',p_data->>'reason','submittedPanel',s.panel,'finalPanel',p_data->'panel');
 if p_data->>'action'='approve' then
   if s.status<>'pending' then raise exception 'revision-conflict'; end if;
   insert into trace_label_versions(submission_id,barcode,panel,owner_id)
     values(s.id,p_data->'panel'->>'barcode',p_data->'panel',(p_data->>'actor')::uuid) returning id into new_id;
   event:=event||jsonb_build_object('versionId',new_id);
   s.status:='approved';
 elsif p_data->>'action'='reject' then
   if s.status<>'pending' then raise exception 'revision-conflict'; end if;
   s.status:='rejected';
 elsif p_data->>'action' in ('withdraw','restore') then
   select * into v from trace_label_versions where id=(p_data->>'versionId')::uuid and submission_id=s.id for update;
   if not found then raise exception 'not-found'; end if;
   if p_data->>'action'='withdraw' then
     if not v.active then raise exception 'revision-conflict'; end if;
     update trace_label_versions set active=false where id=v.id;
     s.status:=case when exists(select 1 from trace_label_versions where submission_id=s.id and active) then 'approved' else 'withdrawn' end;
     event:=event||jsonb_build_object('versionId',v.id,'finalPanel',v.panel);
   else
     if v.active then raise exception 'revision-conflict'; end if;
     insert into trace_label_versions(submission_id,barcode,panel,owner_id,reinstates)
       values(s.id,v.barcode,v.panel,(p_data->>'actor')::uuid,v.id) returning id into new_id;
     s.status:='approved';
     event:=event||jsonb_build_object('versionId',new_id,'reinstates',v.id,'finalPanel',v.panel);
   end if;
 else raise exception 'unsupported-command';
 end if;
 update trace_label_submissions set status=s.status,revision=revision+1,history=history||jsonb_build_array(event)
   where id=s.id returning * into s;
 return to_jsonb(s)-'proof';
end $$;
revoke all on function public.trace_labels_command(text,jsonb) from public,anon,authenticated;
grant execute on function public.trace_labels_command(text,jsonb) to service_role;
commit;
