-- Latest policy: one permanent institution number + shared password; no staff signup requirement.
begin;
create table public.organization_types(code text primary key,label text not null);
insert into public.organization_types values ('convent','수도회'),('retreat_operator','피정의 집 운영기관'),('diocese','교구'),('parish','본당'),('apostolate','사도직 단체'),('music_organization','생활성가 단체');
alter table public.organization_types enable row level security;
grant select on public.organization_types to authenticated;
create policy types_read on public.organization_types for select to authenticated using(true);
create sequence camum_private.institution_number_seq;
create function camum_private.next_number() returns text language sql volatile security definer set search_path='' as $$ select 'CAM-'||lpad(v,greatest(6,length(v)),'0') from (select nextval('camum_private.institution_number_seq')::text v) n; $$;
alter table public.organizations add column management_number text not null default camum_private.next_number() unique;
alter table public.organizations add column organization_type text not null default 'convent' references public.organization_types;
alter table public.retreat_programs add column if not exists catalog_kind text not null default 'retreat' check(catalog_kind='retreat');
-- Future people/artists can reference these stable UUIDs through many-to-many join tables.
-- Concerts/cultural events belong in separate event/session tables, never this retreat catalog.
create table public.organization_credentials(
 organization_id uuid primary key references public.organizations, auth_user_id uuid unique references auth.users,
 login_email text unique, state text not null default 'unissued' check(state in ('unissued','rotating','active','disabled')),
 changed_at timestamptz not null default now()
);
create table camum_private.institution_sessions(
 session_id uuid primary key, user_id uuid not null references auth.users, organization_id uuid not null references public.organizations,
 created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '24 hours'
);
create index on camum_private.institution_sessions(user_id);
create table camum_private.credential_resets(
 token_hash text primary key, organization_id uuid not null references public.organizations,
 expires_at timestamptz not null default now()+interval '30 minutes', used_at timestamptz,
 verified_by uuid not null references auth.users, verification_note text not null check(length(verification_note) between 10 and 1000)
);
create table camum_private.auth_buckets(key text primary key, started_at timestamptz not null, attempts integer not null);
create table public.credential_recovery_requests(
 id uuid primary key default gen_random_uuid(), management_number text not null, created_at timestamptz not null default now(), resolved_at timestamptz
);
create table public.security_events(
 id bigint generated always as identity primary key, organization_id uuid references public.organizations,
 event text not null, created_at timestamptz not null default now()
);
alter table public.audit_events add column session_id uuid;
alter table public.organization_credentials enable row level security;
alter table public.credential_recovery_requests enable row level security;
alter table public.security_events enable row level security;
revoke all on public.organization_credentials,public.credential_recovery_requests,public.security_events from public,anon,authenticated;
grant select on public.credential_recovery_requests,public.security_events to authenticated;

create function camum_private.session_valid() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from auth.sessions a where a.user_id=auth.uid() and a.id::text=auth.jwt()->>'session_id') and (
 not exists(select 1 from public.organization_credentials c where c.auth_user_id=auth.uid())
 or exists(select 1 from public.organization_credentials c join camum_private.institution_sessions s on s.user_id=c.auth_user_id and s.organization_id=c.organization_id where c.auth_user_id=auth.uid() and c.state='active' and s.session_id::text=auth.jwt()->>'session_id' and s.expires_at>now() and exists(select 1 from auth.sessions a where a.id=s.session_id and a.user_id=s.user_id))); $$;
create or replace function camum_private.is_operator() returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(auth.jwt()->>'aal','')='aal2' and exists(select 1 from auth.sessions a where a.user_id=auth.uid() and a.id::text=auth.jwt()->>'session_id') and exists(select 1 from camum_private.operators where user_id=auth.uid()) and not exists(select 1 from public.organization_credentials where auth_user_id=auth.uid()); $$;
create or replace function camum_private.role_in(org uuid) returns text language sql stable security definer set search_path='' as $$
 select case when not camum_private.session_valid() then null
 when exists(select 1 from public.organization_credentials where organization_id=org and auth_user_id=auth.uid() and state='active') then 'owner'
 else (select role from public.organization_members where organization_id=org and user_id=auth.uid()) end; $$;
create or replace function camum_private.my_email() returns text language sql stable security definer set search_path='' as $$
 select lower(email) from auth.users where id=auth.uid() and email_confirmed_at is not null and camum_private.session_valid(); $$;
create or replace function camum_private.log(org uuid,act text,entity uuid) returns void language sql security definer set search_path='' as $$
 insert into public.audit_events(organization_id,actor_id,action,entity_id,session_id) values(org,auth.uid(),act,entity,nullif(auth.jwt()->>'session_id','')::uuid); $$;
create or replace function public.ops_bootstrap() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('operator',camum_private.is_operator(),'operator_account',exists(select 1 from camum_private.operators where user_id=auth.uid()),'user_id',auth.uid(),'session_valid',camum_private.session_valid(),'institution_account',exists(select 1 from public.organization_credentials where auth_user_id=auth.uid())); $$;
-- Enrollment/issuing is controlled centrally. Existing optional member structures remain for future use.
create or replace function public.ops_create_organization(p_name text,p_url text) returns uuid language plpgsql security definer set search_path='' as $$
 declare result uuid; begin
 if not camum_private.is_operator() then raise exception 'MFA를 완료한 중앙관리자만 기관을 등록할 수 있습니다' using errcode='42501'; end if;
 insert into public.organizations(name,official_url) values(trim(p_name),trim(p_url)) returning id into result;
 insert into public.organization_credentials(organization_id) values(result);
 perform camum_private.log(result,'organization.created',result);return result;end; $$;
create function public.ops_set_organization_type(p_org uuid,p_type text) returns void language plpgsql security definer set search_path='' as $$
 begin if not camum_private.is_operator() then raise exception '중앙관리자 MFA 필요' using errcode='42501';end if;
 update public.organizations set organization_type=p_type where id=p_org;perform camum_private.log(p_org,'organization.type_changed',p_org);end; $$;
create policy recovery_operator on public.credential_recovery_requests for select to authenticated using(camum_private.is_operator());
create policy security_visible on public.security_events for select to authenticated using(camum_private.is_operator() or camum_private.role_in(organization_id)='owner');
-- Restrictive policies also gate ancillary data for revoked shared sessions.
do $$ declare t text;begin
 foreach t in array array['organizations','organization_members','organization_invites','retreat_houses','retreat_programs','retreat_sessions','audit_events','program_subscriptions','notifications','attendance_codes','retreat_reviews','credential_recovery_requests','security_events'] loop
 execute format('create policy active_session on public.%I as restrictive for select to authenticated using (camum_private.session_valid())',t);
 end loop;end $$;

-- All auth_* RPCs below are service_role-only. They are called by the Edge Function AFTER checks.
create function public.ops_auth_lookup(p_number text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('org',o.id,'number',o.management_number,'user_id',c.auth_user_id,'email',c.login_email,'state',c.state,'organization_status',o.status)
 from public.organizations o join public.organization_credentials c on c.organization_id=o.id where o.management_number=p_number; $$;
create function public.ops_auth_bind(p_org uuid,p_user uuid,p_email text) returns void language plpgsql security definer set search_path='' as $$
 begin update public.organization_credentials set auth_user_id=p_user,login_email=p_email,state='rotating',changed_at=now() where organization_id=p_org and auth_user_id is null;
 if not found then raise exception '기관 계정이 이미 발급되었거나 없습니다';end if;end; $$;
create function public.ops_auth_attempt(p_number text,p_ip_hash text) returns boolean language plpgsql security definer set search_path='' as $$
 declare k text; n integer; limit_value integer; allowed boolean=true;org uuid;begin
 if length(p_number)>40 or p_ip_hash !~ '^[a-f0-9]{64}$' then return false;end if;
 insert into camum_private.auth_buckets values('global',now(),1) on conflict(key) do update set attempts=case when camum_private.auth_buckets.started_at<now()-interval '15 minutes' then 1 else camum_private.auth_buckets.attempts+1 end,started_at=case when camum_private.auth_buckets.started_at<now()-interval '15 minutes' then now() else camum_private.auth_buckets.started_at end returning attempts into n;
 if n>2000 then return false;end if;
 delete from camum_private.auth_buckets where started_at<now()-interval '1 day';
 foreach k in array array['number:'||case when exists(select 1 from public.organizations where management_number=p_number) then p_number else 'unknown' end,'network:'||p_ip_hash] loop
 limit_value=case when k like 'number:%' then 10 else 60 end;
 insert into camum_private.auth_buckets values(k,now(),1) on conflict(key) do update set attempts=case when camum_private.auth_buckets.started_at<now()-interval '15 minutes' then 1 else camum_private.auth_buckets.attempts+1 end,started_at=case when camum_private.auth_buckets.started_at<now()-interval '15 minutes' then now() else camum_private.auth_buckets.started_at end returning attempts into n;
 if n>limit_value then allowed=false;end if;
 if n=limit_value+1 then select id into org from public.organizations where management_number=p_number;insert into public.security_events(organization_id,event) values(org,'로그인/복구 요청 제한 적용: 15분 잠금');end if;
 end loop;return allowed;end; $$;
create function public.ops_auth_register_session(p_org uuid,p_user uuid,p_session uuid) returns void language plpgsql security definer set search_path='' as $$
 begin
 if not exists(select 1 from public.organization_credentials c join public.organizations o on o.id=c.organization_id where c.organization_id=p_org and c.auth_user_id=p_user and c.state='active' and exists(select 1 from auth.sessions a where a.id=p_session and a.user_id=p_user and a.created_at>=c.changed_at) and o.status not in ('suspended','rejected')) then raise exception '계정 사용 불가';end if;
 insert into camum_private.institution_sessions(session_id,user_id,organization_id) values(p_session,p_user,p_org) on conflict do nothing;
 end; $$;
create function public.ops_auth_begin_change(p_org uuid,p_user uuid,p_session uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.organization_credentials c set state='rotating',changed_at=now() where c.organization_id=p_org and c.auth_user_id=p_user and c.state='active' and exists(select 1 from camum_private.institution_sessions s where s.organization_id=p_org and s.user_id=p_user and s.session_id=p_session and s.expires_at>now());
 if not found then raise exception '이미 해제되었거나 변경 중인 세션입니다';end if;
 delete from camum_private.institution_sessions where organization_id=p_org;
 insert into public.security_events(organization_id,event) values(p_org,'인수인계: 기존 모든 기관 세션 무효화');end; $$;
create function public.ops_auth_rotate(p_org uuid) returns uuid language plpgsql security definer set search_path='' as $$
 declare result uuid;begin update public.organization_credentials set state='rotating',changed_at=now() where organization_id=p_org returning auth_user_id into result;
 delete from camum_private.institution_sessions where organization_id=p_org;
 insert into public.security_events(organization_id,event) values(p_org,'인수인계: 기존 모든 기관 세션 무효화');return result;end; $$;
create function public.ops_auth_activate(p_org uuid) returns void language sql security definer set search_path='' as $$
 update public.organization_credentials set state='active',changed_at=now() where organization_id=p_org and auth_user_id is not null; $$;
create function public.ops_auth_issue_reset(p_org uuid,p_hash text,p_operator uuid,p_note text) returns void language plpgsql security definer set search_path='' as $$
 begin
 if not exists(select 1 from camum_private.operators where user_id=p_operator) or p_hash !~ '^[a-f0-9]{64}$' then raise exception '잘못된 재설정 발급';end if;
 update camum_private.credential_resets set used_at=now() where organization_id=p_org and used_at is null;
 insert into camum_private.credential_resets(token_hash,organization_id,verified_by,verification_note) values(p_hash,p_org,p_operator,p_note);
 update public.credential_recovery_requests set resolved_at=now() where management_number=(select management_number from public.organizations where id=p_org) and resolved_at is null;
 insert into public.audit_events(organization_id,actor_id,action,entity_id) values(p_org,p_operator,'credential.reset_verified',p_org);end; $$;
create function public.ops_auth_redeem_reset(p_hash text) returns jsonb language plpgsql security definer set search_path='' as $$
 declare r camum_private.credential_resets;u uuid;begin
 select * into r from camum_private.credential_resets where token_hash=p_hash and used_at is null and expires_at>now() for update;
 if r.token_hash is null then raise exception '만료되었거나 사용된 재설정 링크';end if;
 update camum_private.credential_resets set used_at=now() where token_hash=p_hash;
 u=public.ops_auth_rotate(r.organization_id);
 if u is null then raise exception '발급된 기관 계정이 없습니다';end if;
 return jsonb_build_object('org',r.organization_id,'user_id',u,'email',(select login_email from public.organization_credentials where organization_id=r.organization_id));end; $$;
create function public.ops_auth_recovery_request(p_number text) returns void language sql security definer set search_path='' as $$
 insert into public.credential_recovery_requests(management_number) select management_number from public.organizations where management_number=p_number; $$;

revoke all on all tables in schema camum_private from public,anon,authenticated;
revoke execute on function camum_private.next_number(),camum_private.session_valid() from public,anon,authenticated;
grant execute on function camum_private.session_valid() to authenticated;
revoke all on function public.ops_set_organization_type(uuid,text) from public,anon;
grant execute on function public.ops_set_organization_type(uuid,text) to authenticated;
do $$ declare f record;begin
 for f in select p.oid::regprocedure sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'ops_auth_%' loop
 execute format('revoke all on function %s from public, anon, authenticated',f.sig);
 execute format('grant execute on function %s to service_role',f.sig);
 end loop;end $$;
-- Provider-level credential changes also revoke app sessions, even if the browser bypasses our UI.
create function camum_private.provider_credentials_changed() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.encrypted_password is distinct from old.encrypted_password or new.email is distinct from old.email then
 delete from camum_private.institution_sessions where user_id=new.id;
 update public.organization_credentials set state='rotating',changed_at=now() where auth_user_id=new.id;
 end if;return new;end; $$;
create trigger camum_credentials_changed after update of encrypted_password,email on auth.users for each row execute function camum_private.provider_credentials_changed();
revoke execute on function camum_private.provider_credentials_changed() from public,anon,authenticated;
create or replace function public.ops_read_notification(p_id uuid) returns void language sql security definer set search_path='' as $$ update public.notifications set read_at=now() where id=p_id and user_id=auth.uid() and camum_private.session_valid(); $$;
commit;
