-- CAMUM v0.21 development schema. Apply only to a separate development project.
begin;
create schema if not exists camum_private;
revoke all on schema camum_private from public;
create table camum_private.operators (user_id uuid primary key references auth.users(id));
create table public.organizations (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 2 and 120),
 status text not null default 'pending' check(status in ('pending','approved','rejected','suspended')),
 official_url text not null check(official_url ~ '^https://[^[:space:]@]+$'), created_at timestamptz not null default now()
);
create table public.organization_members (
 organization_id uuid not null references public.organizations, user_id uuid not null references auth.users,
 role text not null check(role in ('owner','admin','editor')), primary key(organization_id,user_id)
);
create table public.organization_invites (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations,
 email text not null, role text not null check(role in ('admin','editor')), expires_at timestamptz not null default now()+interval '7 days',
 accepted_at timestamptz, unique(organization_id,email)
);
create table public.retreat_houses (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations,
 name text not null check(length(name) between 1 and 120), region text not null, address text not null,
 phone text not null default '', official_url text not null default '', version integer not null default 1,
 unique(id,organization_id)
);
create table public.retreat_programs (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations,
 house_id uuid not null, catalog_kind text not null default 'retreat' check(catalog_kind='retreat'), title text not null check(length(title) between 2 and 160), description text not null default '',
 tags text[] not null default '{}', taxonomy jsonb not null default '{}', requirements jsonb not null default '{}',
 audience text not null default '', official_url text not null default '', application_url text not null default '', phone text not null default '',
 status text not null default 'draft' check(status in ('draft','pending','published','archived')),
 reviewed_at timestamptz, version integer not null default 1, updated_at timestamptz not null default now(),
 foreign key(house_id,organization_id) references public.retreat_houses(id,organization_id), unique(id,organization_id),
 check(jsonb_typeof(taxonomy)='object' and jsonb_typeof(requirements)='object'),
 check(application_url='' or application_url ~ '^https://[^[:space:]@]+$'), check(official_url='' or official_url ~ '^https://[^[:space:]@]+$')
);
create table public.retreat_sessions (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations, program_id uuid not null,
 starts_at timestamptz not null, ends_at timestamptz not null, application_start timestamptz not null, application_end timestamptz not null,
 fee numeric(12,0) not null check(fee>=0), fee_unit text not null check(fee_unit in ('person','family','group')), fee_complete boolean not null default false,
 capacity integer not null check(capacity>0), remaining integer, remaining_evidence text not null default '',
 mode text not null check(mode in ('daytime','residential','commuter','online')),
 status text not null default 'scheduled' check(status in ('scheduled','open','waiting','paused','closed','cancelled','ended')),
 application_url text not null default '', phone text not null default '', checked_at timestamptz not null default now(),
 version integer not null default 1, foreign key(program_id,organization_id) references public.retreat_programs(id,organization_id),
 unique(program_id,starts_at), check(ends_at>=starts_at), check(application_start<application_end and application_end<=starts_at),
 check(remaining is null or (remaining between 0 and capacity and length(remaining_evidence)>=5)),
 check(application_url='' or application_url ~ '^https://[^[:space:]@]+$')
);
create table public.audit_events (
 id bigint generated always as identity primary key, organization_id uuid references public.organizations,
 actor_id uuid, action text not null, entity_id uuid, created_at timestamptz not null default now()
);
create table public.program_subscriptions (
 user_id uuid not null references auth.users, program_id uuid not null references public.retreat_programs,
 primary key(user_id,program_id)
);
create table public.notifications (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users,
 program_id uuid not null references public.retreat_programs, message text not null, read_at timestamptz, created_at timestamptz not null default now()
);
create table public.attendance_codes (
 id uuid primary key default gen_random_uuid(), session_id uuid not null references public.retreat_sessions,
 expires_at timestamptz not null default now()+interval '1 day', claimed_by uuid references auth.users,
 unique(session_id,claimed_by)
);
create table public.retreat_reviews (
 id uuid primary key default gen_random_uuid(), session_id uuid not null references public.retreat_sessions,
 author_id uuid not null references auth.users, body text not null check(length(body) between 10 and 1500),
 status text not null default 'pending' check(status in ('pending','published','rejected')),
 created_at timestamptz not null default now(), unique(session_id,author_id)
);
create index on public.organization_members(user_id);
create index on public.retreat_programs(organization_id);
create index on public.retreat_sessions(organization_id,starts_at);
create index on public.retreat_sessions(program_id);
create index on public.audit_events(organization_id,created_at);
create index on public.notifications(user_id);

create function camum_private.is_operator() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from camum_private.operators where user_id=auth.uid()); $$;
create function camum_private.role_in(org uuid) returns text language sql stable security definer set search_path='' as $$
 select role from public.organization_members where organization_id=org and user_id=auth.uid(); $$;
create function camum_private.my_email() returns text language sql stable security definer set search_path='' as $$
 select lower(email) from auth.users where id=auth.uid() and email_confirmed_at is not null; $$;
create function camum_private.require_member(org uuid, manager boolean default false) returns void language plpgsql security definer set search_path='' as $$
 begin
 if auth.uid() is null or camum_private.role_in(org) is null or (manager and camum_private.role_in(org) not in ('owner','admin')) then raise exception '기관 권한이 없습니다' using errcode='42501'; end if;
 if exists(select 1 from public.organizations where id=org and status='suspended') then raise exception '이용이 중지된 기관입니다' using errcode='42501'; end if;
 end; $$;
create function camum_private.log(org uuid, act text, entity uuid) returns void language sql security definer set search_path='' as $$
 insert into public.audit_events(organization_id,actor_id,action,entity_id) values(org,auth.uid(),act,entity); $$;

-- No client receives INSERT/UPDATE/DELETE on these tables. Mutations use checked RPCs.
do $$ declare t text; begin
 foreach t in array array['organizations','organization_members','organization_invites','retreat_houses','retreat_programs','retreat_sessions','audit_events','program_subscriptions','notifications','attendance_codes','retreat_reviews'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 end loop;
end $$;
grant usage on schema camum_private to authenticated;
grant execute on function camum_private.role_in(uuid),camum_private.is_operator(),camum_private.my_email() to authenticated;
create policy org_read on public.organizations for select to authenticated using(camum_private.role_in(id) is not null or camum_private.is_operator());
create policy members_read on public.organization_members for select to authenticated using(camum_private.role_in(organization_id) in ('owner','admin') or user_id=auth.uid());
create policy invites_read on public.organization_invites for select to authenticated using(camum_private.role_in(organization_id) in ('owner','admin') or email=camum_private.my_email());
create policy houses_read on public.retreat_houses for select to authenticated using(camum_private.role_in(organization_id) is not null or camum_private.is_operator());
create policy programs_read on public.retreat_programs for select to authenticated using(camum_private.role_in(organization_id) is not null or camum_private.is_operator());
create policy sessions_read on public.retreat_sessions for select to authenticated using(camum_private.role_in(organization_id) is not null or camum_private.is_operator());
create policy audit_read on public.audit_events for select to authenticated using(camum_private.role_in(organization_id) in ('owner','admin') or camum_private.is_operator());
create policy subscriptions_read on public.program_subscriptions for select to authenticated using(user_id=auth.uid());
create policy notifications_read on public.notifications for select to authenticated using(user_id=auth.uid());
create policy codes_read on public.attendance_codes for select to authenticated using(claimed_by=auth.uid() or exists(select 1 from public.retreat_sessions s where s.id=session_id and camum_private.role_in(s.organization_id) in ('owner','admin')));
create policy reviews_read on public.retreat_reviews for select to authenticated using(author_id=auth.uid() or camum_private.is_operator());

create function public.ops_bootstrap() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('operator',camum_private.is_operator(),'user_id',auth.uid()); $$;
create function public.ops_create_organization(p_name text,p_url text) returns uuid language plpgsql security definer set search_path='' as $$
 declare result uuid; begin
 if camum_private.my_email() is null then raise exception '이메일 확인 후 로그인해 주세요'; end if;
 insert into public.organizations(name,official_url) values(trim(p_name),trim(p_url)) returning id into result;
 insert into public.organization_members values(result,auth.uid(),'owner');
 perform camum_private.log(result,'organization.created',result); return result; end; $$;
create function public.ops_review_organization(p_id uuid,p_status text) returns void language plpgsql security definer set search_path='' as $$
 begin
 if not camum_private.is_operator() then raise exception '운영자만 승인할 수 있습니다' using errcode='42501'; end if;
 if p_status not in ('approved','rejected','suspended') then raise exception '잘못된 승인 상태'; end if;
 update public.organizations set status=p_status where id=p_id;
 if not found then raise exception '기관을 찾을 수 없습니다'; end if;
 perform camum_private.log(p_id,'organization.'||p_status,p_id); end; $$;

create function public.ops_invite(p_org uuid,p_email text,p_role text) returns uuid language plpgsql security definer set search_path='' as $$
 declare result uuid; begin perform camum_private.require_member(p_org,true);
 if p_role not in ('admin','editor') or (p_role='admin' and camum_private.role_in(p_org)<>'owner') or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception '초대 역할과 이메일을 확인해 주세요'; end if;
 insert into public.organization_invites(organization_id,email,role) values(p_org,lower(trim(p_email)),p_role)
 on conflict(organization_id,email) do update set role=excluded.role,expires_at=now()+interval '7 days',accepted_at=null returning id into result;
 perform camum_private.log(p_org,'member.invited',result); return result; end; $$;
create function public.ops_accept_invite(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
 declare i public.organization_invites; begin
 select * into i from public.organization_invites where id=p_id for update;
 if i.id is null or i.email is distinct from camum_private.my_email() or i.expires_at<=now() or i.accepted_at is not null then raise exception '사용할 수 없는 초대입니다' using errcode='42501'; end if;
 if exists(select 1 from public.organizations where id=i.organization_id and status='suspended') then raise exception '기관 이용 중지'; end if;
 insert into public.organization_members values(i.organization_id,auth.uid(),i.role) on conflict do nothing;
 update public.organization_invites set accepted_at=now() where id=p_id;
 perform camum_private.log(i.organization_id,'member.accepted',p_id); end; $$;
create function public.ops_member_role(p_org uuid,p_user uuid,p_role text) returns void language plpgsql security definer set search_path='' as $$
 begin perform camum_private.require_member(p_org,true);
 perform 1 from public.organizations where id=p_org for update;
 if camum_private.role_in(p_org)<>'owner' or p_user=auth.uid() or p_role not in ('owner','admin','editor','remove') then raise exception '다른 회원의 권한은 소유자만 변경할 수 있습니다' using errcode='42501'; end if;
 if p_role='remove' then delete from public.organization_members where organization_id=p_org and user_id=p_user;
 else update public.organization_members set role=p_role where organization_id=p_org and user_id=p_user; end if;
 if not exists(select 1 from public.organization_members where organization_id=p_org and role='owner') then raise exception '최소 한 명의 소유자가 필요합니다'; end if;
 perform camum_private.log(p_org,'member.'||p_role,p_user); end; $$;

create function public.ops_save_house(p_org uuid,p_data jsonb,p_id uuid default null,p_version integer default null) returns uuid language plpgsql security definer set search_path='' as $$
 declare result uuid; begin perform camum_private.require_member(p_org);
 if p_id is null then insert into public.retreat_houses(organization_id,name,region,address,phone,official_url) values(p_org,p_data->>'name',p_data->>'region',p_data->>'address',coalesce(p_data->>'phone',''),coalesce(p_data->>'official_url','')) returning id into result;
 else update public.retreat_houses set name=p_data->>'name',region=p_data->>'region',address=p_data->>'address',phone=coalesce(p_data->>'phone',''),official_url=coalesce(p_data->>'official_url',''),version=version+1 where id=p_id and organization_id=p_org and version=p_version returning id into result;
 if result is null then raise exception '다른 담당자가 수정했거나 권한이 없습니다. 다시 불러와 주세요'; end if;
 -- A house change invalidates previously reviewed program location details.
 update public.retreat_programs set status='draft',reviewed_at=null,version=version+1 where house_id=p_id;
 end if; perform camum_private.log(p_org,'house.saved',result); return result; end; $$;

create function public.ops_save_program(p_org uuid,p_data jsonb,p_id uuid default null,p_version integer default null) returns uuid language plpgsql security definer set search_path='' as $$
 declare result uuid; begin perform camum_private.require_member(p_org);
 if p_id is null then
 insert into public.retreat_programs(organization_id,house_id,title,description,tags,taxonomy,requirements,audience,official_url,application_url,phone)
 values(p_org,(p_data->>'house_id')::uuid,p_data->>'title',coalesce(p_data->>'description',''),array(select jsonb_array_elements_text(coalesce(p_data->'tags','[]'))),coalesce(p_data->'taxonomy','{}'),coalesce(p_data->'requirements','{}'),coalesce(p_data->>'audience',''),coalesce(p_data->>'official_url',''),coalesce(p_data->>'application_url',''),coalesce(p_data->>'phone','')) returning id into result;
 else
 update public.retreat_programs set house_id=(p_data->>'house_id')::uuid,title=p_data->>'title',description=coalesce(p_data->>'description',''),tags=array(select jsonb_array_elements_text(coalesce(p_data->'tags','[]'))),taxonomy=coalesce(p_data->'taxonomy','{}'),requirements=coalesce(p_data->'requirements','{}'),audience=coalesce(p_data->>'audience',''),official_url=coalesce(p_data->>'official_url',''),application_url=coalesce(p_data->>'application_url',''),phone=coalesce(p_data->>'phone',''),status='draft',reviewed_at=null,updated_at=now(),version=version+1
 where id=p_id and organization_id=p_org and version=p_version returning id into result;
 if result is null then raise exception '다른 담당자가 수정했거나 권한이 없습니다. 다시 불러와 주세요'; end if;
 end if;
 perform camum_private.log(p_org,'program.saved',result); return result; end; $$;

create function public.ops_save_sessions(p_program uuid,p_rows jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
 declare p public.retreat_programs; r jsonb; sid uuid; result jsonb='[]'; begin
 select * into p from public.retreat_programs where id=p_program for update; perform camum_private.require_member(p.organization_id);
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows) not between 1 and 200 then raise exception '1회에 1~200개 회차를 저장해 주세요'; end if;
 for r in select value from jsonb_array_elements(p_rows) loop
 if r->>'id' is null then
 insert into public.retreat_sessions(organization_id,program_id,starts_at,ends_at,application_start,application_end,fee,fee_unit,fee_complete,capacity,remaining,remaining_evidence,mode,status,application_url,phone)
 values(p.organization_id,p.id,(r->>'starts_at')::timestamptz,(r->>'ends_at')::timestamptz,(r->>'application_start')::timestamptz,(r->>'application_end')::timestamptz,(r->>'fee')::numeric,r->>'fee_unit',coalesce((r->>'fee_complete')::boolean,false),(r->>'capacity')::integer,(r->>'remaining')::integer,coalesce(r->>'remaining_evidence',''),r->>'mode',coalesce(r->>'status','scheduled'),coalesce(r->>'application_url',''),coalesce(r->>'phone','')) returning id into sid;
 else
 update public.retreat_sessions set starts_at=(r->>'starts_at')::timestamptz,ends_at=(r->>'ends_at')::timestamptz,application_start=(r->>'application_start')::timestamptz,application_end=(r->>'application_end')::timestamptz,fee=(r->>'fee')::numeric,fee_unit=r->>'fee_unit',fee_complete=coalesce((r->>'fee_complete')::boolean,false),capacity=(r->>'capacity')::integer,remaining=(r->>'remaining')::integer,remaining_evidence=coalesce(r->>'remaining_evidence',''),mode=r->>'mode',status=r->>'status',application_url=coalesce(r->>'application_url',''),phone=coalesce(r->>'phone',''),checked_at=now(),version=version+1 where id=(r->>'id')::uuid and program_id=p.id and version=(r->>'version')::integer returning id into sid;
 if sid is null then raise exception '회차가 변경되었거나 수정 권한이 없습니다'; end if;
 end if;
 if p.status='published' and coalesce(r->>'application_url','')='' and coalesce(r->>'phone','')='' and p.application_url='' and p.phone='' then raise exception '공식 신청처가 필요합니다'; end if;
 result=result||jsonb_build_array(sid); perform camum_private.log(p.organization_id,'session.saved',sid);
 end loop; return result; end; $$;

create function camum_private.valid_requirements(r jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare k text; v jsonb; begin
 if jsonb_typeof(r) is distinct from 'object' then return false; end if;
 if r->'complete' is distinct from 'true'::jsonb or jsonb_typeof(r->'companies') is distinct from 'array' or jsonb_typeof(r->'roles') is distinct from 'array' or jsonb_typeof(r->'prerequisites') is distinct from 'array' then return false; end if;
 if jsonb_array_length(r->'companies')=0 or jsonb_array_length(r->'roles')=0 then return false; end if;
 if not (r ?& array['minAge','maxAge','gender','faith','vocationOnly','marriedOnly','minParty','maxParty']) then return false; end if;
 foreach k in array array['minAge','maxAge','minParty','maxParty'] loop
 if r->k <> 'null'::jsonb and (jsonb_typeof(r->k)<>'number' or (r->>k)::numeric<0 or (r->>k)::numeric<>trunc((r->>k)::numeric)) then return false; end if;
 end loop;
 if (r->>'minAge')::numeric>(r->>'maxAge')::numeric or (r->>'minParty')::numeric>(r->>'maxParty')::numeric then return false; end if;
 if r->>'gender' not in ('any','female','male') or r->>'faith' not in ('any','catholic','catechumen','other') or jsonb_typeof(r->'gender')<>'string' or jsonb_typeof(r->'faith')<>'string' then return false; end if;
 if jsonb_typeof(r->'vocationOnly') is distinct from 'boolean' or jsonb_typeof(r->'marriedOnly') is distinct from 'boolean' then return false; end if;
 for v in select value from jsonb_array_elements(r->'companies') loop if jsonb_typeof(v)<>'string' or v#>>'{}' not in ('solo','friends','couple','family','group') then return false; end if; end loop;
 foreach k in array array['roles','prerequisites'] loop for v in select value from jsonb_array_elements(r->k) loop if jsonb_typeof(v)<>'string' or length(v#>>'{}')=0 then return false; end if; end loop; end loop;
 return true;
 exception when others then return false;
end; $$;

create function public.ops_program_state(p_id uuid,p_state text,p_version integer) returns void language plpgsql security definer set search_path='' as $$
 declare p public.retreat_programs; begin select * into p from public.retreat_programs where id=p_id for update;
 if p.id is null or p.version<>p_version then raise exception '다시 불러온 뒤 변경해 주세요'; end if;
 if p_state='published' then
 if not camum_private.is_operator() or p.status<>'pending' then raise exception '운영자의 검토가 필요합니다' using errcode='42501'; end if;
 else perform camum_private.require_member(p.organization_id,true);
 if p_state not in ('draft','pending','archived') then raise exception '잘못된 상태'; end if; end if;
 if p_state in ('pending','published') then
 if not exists(select 1 from public.organizations where id=p.organization_id and status='approved') then raise exception '승인된 기관만 공개 검토를 요청할 수 있습니다'; end if;
 if not camum_private.valid_requirements(p.requirements) or p.official_url='' or (p.application_url='' and p.phone='') or p.audience='' or p.requirements->>'complete' is distinct from 'true'
 or jsonb_typeof(p.requirements->'companies') is distinct from 'array' or jsonb_array_length(p.requirements->'companies')=0
 or jsonb_typeof(p.requirements->'roles') is distinct from 'array' or jsonb_array_length(p.requirements->'roles')=0
 or jsonb_typeof(p.requirements->'prerequisites') is distinct from 'array'
 or not (p.requirements ?& array['minAge','maxAge','gender','faith','vocationOnly','marriedOnly','minParty','maxParty'])
 then raise exception '공식 출처·신청처·참가 조건을 모두 확인해 주세요'; end if;
 if not exists(select 1 from public.retreat_sessions where program_id=p.id) then raise exception '최소 한 개 회차가 필요합니다'; end if;
 end if;
 update public.retreat_programs set status=p_state,reviewed_at=case when p_state='published' then now() else null end,version=version+1,updated_at=now() where id=p_id;
 perform camum_private.log(p.organization_id,'program.'||p_state,p_id); end; $$;

-- Whitelisted public projection: no staff, emails, audit, private drafts or review authors.
create function public.public_catalog() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object(
 'catalogKind','retreat','id',s.id,'programId',p.id,'title',p.title,'description',p.description,'tags',p.tags,'taxonomy',p.taxonomy,'requirements',p.requirements,'audience',p.audience,
 'organization',o.name,'place',h.name,'region',h.region,'address',h.address,'start',s.starts_at,'end',s.ends_at,
 'applicationStart',s.application_start,'applicationEnd',s.application_end,'fee',s.fee,'feeUnit',s.fee_unit,'feeComplete',s.fee_complete,'capacity',s.capacity,
 'remaining',case when s.remaining_evidence<>'' and s.checked_at>now()-interval '15 minutes' then s.remaining else null end,
 'mode',s.mode,'status',case when s.ends_at<now() then 'ended' when s.status in ('closed','cancelled','paused','waiting') then s.status when s.application_end<now() then 'closed' when s.application_start>now() then 'scheduled' else s.status end,
 'checkedAt',s.checked_at,'applicationUrl',coalesce(nullif(s.application_url,''),p.application_url),'phone',coalesce(nullif(s.phone,''),p.phone),
 'source',jsonb_build_object('url',p.official_url,'verified',true,'checkedAt',p.reviewed_at),'demo',false
 ) order by s.starts_at),'[]'::jsonb)
 from public.retreat_sessions s join public.retreat_programs p on p.id=s.program_id join public.organizations o on o.id=p.organization_id join public.retreat_houses h on h.id=p.house_id
 where p.catalog_kind='retreat' and o.status='approved' and p.status='published' and p.reviewed_at is not null; $$;

create function public.ops_subscribe(p_program uuid,p_enabled boolean) returns void language plpgsql security definer set search_path='' as $$
 begin
 if auth.uid() is null or not camum_private.session_valid() then raise exception '로그인이 필요합니다' using errcode='42501'; end if;
 if p_enabled then
 if not exists(select 1 from public.retreat_programs p join public.organizations o on o.id=p.organization_id where p.id=p_program and p.status='published' and o.status='approved') then raise exception '공개 프로그램이 아닙니다'; end if;
 insert into public.program_subscriptions values(auth.uid(),p_program) on conflict do nothing;
 else delete from public.program_subscriptions where user_id=auth.uid() and program_id=p_program; end if; end; $$;
create function camum_private.session_notification() returns trigger language plpgsql security definer set search_path='' as $$
 begin
 if exists(select 1 from public.retreat_programs p join public.organizations o on o.id=p.organization_id where p.id=new.program_id and p.status='published' and o.status='approved') then
 insert into public.notifications(user_id,program_id,message) select user_id,new.program_id,'관심 피정의 일정·모집 정보가 변경되었습니다. 공식 안내를 확인해 주세요.' from public.program_subscriptions where program_id=new.program_id;
 end if; return new; end; $$;
create trigger session_notifications after insert or update on public.retreat_sessions for each row execute function camum_private.session_notification();
create function public.ops_read_notification(p_id uuid) returns void language sql security definer set search_path='' as $$ update public.notifications set read_at=now() where id=p_id and user_id=auth.uid(); $$;

create function public.ops_issue_attendance(p_session uuid) returns uuid language plpgsql security definer set search_path='' as $$
 declare s public.retreat_sessions; result uuid; begin select * into s from public.retreat_sessions where id=p_session; perform camum_private.require_member(s.organization_id,true);
 if now()<s.starts_at-interval '1 day' or now()>s.ends_at+interval '7 days' then raise exception '현장 확인 기간에만 발급할 수 있습니다'; end if;
 insert into public.attendance_codes(session_id) values(p_session) returning id into result;
 perform camum_private.log(s.organization_id,'attendance.issued',p_session); return result; end; $$;
create function public.ops_submit_review(p_code uuid,p_body text) returns void language plpgsql security definer set search_path='' as $$
 declare c public.attendance_codes; begin
 if camum_private.my_email() is null then raise exception '이메일 확인 후 로그인해 주세요' using errcode='42501'; end if;
 select * into c from public.attendance_codes where id=p_code for update;
 if c.id is null or c.expires_at<now() or c.claimed_by is not null then raise exception '유효하지 않거나 사용된 현장 확인 코드입니다'; end if;
 insert into public.retreat_reviews(session_id,author_id,body) values(c.session_id,auth.uid(),trim(p_body));
 update public.attendance_codes set claimed_by=auth.uid() where id=p_code; end; $$;
create function public.ops_review_moderate(p_id uuid,p_publish boolean) returns void language plpgsql security definer set search_path='' as $$
 begin if not camum_private.is_operator() then raise exception '운영자 권한 필요' using errcode='42501'; end if;
 update public.retreat_reviews set status=case when p_publish then 'published' else 'rejected' end where id=p_id;
 perform camum_private.log(null,'review.moderated',p_id); end; $$;
create function public.public_reviews(p_session uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('body',r.body,'created_at',r.created_at)),'[]') from public.retreat_reviews r join public.retreat_sessions s on s.id=r.session_id join public.retreat_programs p on p.id=s.program_id join public.organizations o on o.id=p.organization_id where r.session_id=p_session and r.status='published' and p.status='published' and o.status='approved'; $$;

-- Explicitly deny implicit PUBLIC EXECUTE (Supabase/Postgres defaults).
revoke execute on all functions in schema camum_private from public,anon,authenticated;
grant execute on function camum_private.role_in(uuid),camum_private.is_operator(),camum_private.my_email() to authenticated;
do $$ declare f record; begin
 for f in select p.oid::regprocedure sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and (p.proname like 'ops_%' or p.proname in ('public_catalog','public_reviews')) loop
 execute format('revoke all on function %s from public, anon, authenticated',f.sig);
 execute format('grant execute on function %s to authenticated',f.sig);
 end loop;
end $$;
grant execute on function public.public_catalog(),public.public_reviews(uuid) to anon;
alter table public.retreat_houses add constraint house_text_bounds check (length(region)>0 and length(address) between 1 and 500 and (official_url='' or official_url ~ '^https://[^[:space:]@]+$'));
alter table public.retreat_programs add constraint program_text_bounds check (length(description)<=20000 and length(audience)<=1000 and cardinality(tags)<=50 and pg_column_size(taxonomy)<10000 and pg_column_size(requirements)<10000);
alter table public.retreat_sessions add constraint reasonable_fee check (fee < 1000000000);
alter table public.retreat_sessions add constraint finite_dates check (isfinite(starts_at) and isfinite(ends_at) and isfinite(application_start) and isfinite(application_end));
commit;
