-- DEVELOPMENT PROJECT ONLY. All synthetic rows are rolled back; no passwords are set.
-- This verifies hosted SQL/RLS under simulated JWT claims, NOT real sign-in or Edge/MFA enrollment.
begin;
create temporary table camum_qa(id text primary key, value uuid) on commit drop;
insert into camum_qa values ('a',gen_random_uuid()),('b',gen_random_uuid()),('sa',gen_random_uuid()),('sb',gen_random_uuid()),('oa',gen_random_uuid()),('ob',gen_random_uuid()),('ha',gen_random_uuid()),('hb',gen_random_uuid());
grant select on camum_qa to authenticated;
insert into auth.users(id,email,email_confirmed_at) select value,'camum-rollback-'||value||'@example.invalid',now() from camum_qa where id in ('a','b');
insert into auth.sessions(id,user_id,created_at) select s.value,u.value,now() from camum_qa s join camum_qa u on (s.id='sa' and u.id='a') or (s.id='sb' and u.id='b');
insert into public.organizations(id,name,status,official_url,management_number) select value,'가상 ROLLBACK 검사 '||id,'approved','https://example.invalid','QA-ROLLBACK-'||value from camum_qa where id in ('oa','ob');
insert into public.organization_credentials(organization_id,auth_user_id,login_email,state,changed_at) select o.value,u.value,'camum-rollback-'||u.value||'@example.invalid','active',now() from camum_qa o join camum_qa u on (o.id='oa' and u.id='a') or (o.id='ob' and u.id='b');
insert into camum_private.institution_sessions(session_id,user_id,organization_id) select (select value from camum_qa where id='s'||x), (select value from camum_qa where id=x), (select value from camum_qa where id='o'||x) from unnest(array['a','b']) x;
insert into public.retreat_houses(id,organization_id,name,region,address) select (select value from camum_qa where id='h'||x),(select value from camum_qa where id='o'||x),'가상 ROLLBACK 시설 '||x,'경기','가상 검사 주소' from unnest(array['a','b']) x;
select set_config('request.jwt.claim.sub',(select value::text from camum_qa where id='a'),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',(select value from camum_qa where id='a'),'session_id',(select value from camum_qa where id='sa'),'role','authenticated','aal','aal1')::text,true);
set local role authenticated;
do $$ begin
 if (select count(*) from public.organizations)<>1 or not exists(select 1 from public.organizations where id=(select value from camum_qa where id='oa')) then raise exception 'FAIL: tenant A isolation';end if;
 if exists(select 1 from public.retreat_houses where organization_id=(select value from camum_qa where id='ob')) then raise exception 'FAIL: B house exposed';end if;
 begin perform 1 from camum_private.cbck_directory_staging;raise exception 'FAIL: private directory directly readable';exception when insufficient_privilege then null;end;
 begin perform public.ops_directory_search();raise exception 'FAIL: institution can enumerate directory';exception when insufficient_privilege then null;end;
 begin perform public.ops_save_house((select value from camum_qa where id='ob'),jsonb_build_object('name','attack','region','경기','address','가상 공격'));raise exception 'FAIL: cross-tenant write';exception when insufficient_privilege then null;end;
 if has_function_privilege('authenticated','public.ops_auth_directory_request(text,text)','execute') or has_function_privilege('anon','public.ops_auth_reset_info(text)','execute') then raise exception 'FAIL: server-only helper exposed';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',(select value::text from camum_qa where id='b'),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',(select value from camum_qa where id='b'),'session_id',(select value from camum_qa where id='sb'),'role','authenticated','aal','aal1')::text,true);
set local role authenticated;
do $$ begin
 if (select count(*) from public.organizations)<>1 or exists(select 1 from public.retreat_houses where organization_id=(select value from camum_qa where id='oa')) then raise exception 'FAIL: tenant B isolation';end if;
end $$;
reset role;
update auth.users set encrypted_password='rollback-test-no-valid-password' where id=(select value from camum_qa where id='b');
set local role authenticated;
do $$ begin
 if (select count(*) from public.organizations)<>0 or (public.ops_bootstrap()->>'session_valid')::boolean then raise exception 'FAIL: revoked session retained access';end if;
end $$;
reset role;
set local role anon;
do $$ begin
 begin perform public.ops_directory_search();raise exception 'FAIL: anonymous directory access';exception when insufficient_privilege then null;end;
end $$;
reset role;
select 'PASS: hosted SQL tenant isolation, private staging, server-only helpers, password-change trigger, revoked session and anonymous access; fixtures rolled back' as verification;
rollback;
