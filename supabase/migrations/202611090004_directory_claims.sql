-- Private directory review and verified claims. Directory listing is NOT a partnership.
begin;
alter table camum_private.cbck_directory_staging
 add column canonical_source_record_id text references camum_private.cbck_directory_staging(source_record_id),
 add column parent_source_record_id text references camum_private.cbck_directory_staging(source_record_id),
 add column affiliation_state text not null default 'unverified' check(affiliation_state in ('unverified','source_matched','verified')),
 add column operator_name text not null default '',
 add column evidence_url text not null default '',
 add column source_note text not null default '',
 add column version integer not null default 1,
 add check(canonical_source_record_id is distinct from source_record_id),
 add check(parent_source_record_id is distinct from source_record_id);
create index on camum_private.cbck_directory_staging(parent_source_record_id);
alter table public.retreat_houses add column facility_number text unique check(facility_number ~ '^CAM-H-[0-9]{6}$');
create table camum_private.directory_claims(
 id uuid primary key default gen_random_uuid(), source_record_id text not null references camum_private.cbck_directory_staging,
 reply_contact text not null check(length(reply_contact) between 5 and 250),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 organization_id uuid references public.organizations, verification_note text not null default '',
 verified_by uuid references auth.users, created_at timestamptz not null default now(), reviewed_at timestamptz
);
create table camum_private.directory_events(
 id bigint generated always as identity primary key, source_record_id text not null,
 actor_id uuid references auth.users, action text not null, note text not null, created_at timestamptz not null default now()
);
alter table camum_private.directory_claims enable row level security;
alter table camum_private.directory_events enable row level security;
revoke all on camum_private.directory_claims,camum_private.directory_events from public,anon,authenticated;

-- Serialize reservation import with number allocation. Never silently renumber an existing reservation.
create function camum_private.guard_directory_reservation() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(210021);
 if tg_op='UPDATE' and (new.provisional_management_number is distinct from old.provisional_management_number or new.provisional_facility_number is distinct from old.provisional_facility_number) then raise exception '예약 번호 변경 금지';end if;
 if tg_op='INSERT' and exists(select 1 from camum_private.cbck_directory_staging prior where prior.source_record_id=new.source_record_id and (prior.provisional_management_number is distinct from new.provisional_management_number or prior.provisional_facility_number is distinct from new.provisional_facility_number)) then raise exception '기존 예약과 입력 번호 불일치';end if;
 if exists(select 1 from public.organizations o where o.management_number=new.provisional_management_number and o.id is distinct from new.organization_id and not exists(select 1 from camum_private.cbck_directory_staging prior where prior.source_record_id=new.source_record_id and prior.organization_id=o.id and prior.provisional_management_number=new.provisional_management_number)) then raise exception '기존 기관 번호와 예약 번호 충돌: 가져오기 중단';end if;
 if exists(select 1 from public.retreat_houses h where h.facility_number=new.provisional_facility_number and h.id is distinct from new.retreat_house_id and not exists(select 1 from camum_private.cbck_directory_staging prior where prior.source_record_id=new.source_record_id and prior.retreat_house_id=h.id and prior.provisional_facility_number=new.provisional_facility_number)) then raise exception '기존 시설 번호와 충돌';end if;
 return new;end $$;
create trigger directory_number_guard before insert or update on camum_private.cbck_directory_staging for each row execute function camum_private.guard_directory_reservation();
create or replace function camum_private.next_number() returns text language plpgsql volatile security definer set search_path='' as $$
declare v text;begin
 perform pg_advisory_xact_lock(210021);
 loop
  v:=nextval('camum_private.institution_number_seq')::text;v:='CAM-'||lpad(v,greatest(6,length(v)),'0');
  exit when not exists(select 1 from camum_private.cbck_directory_staging where provisional_management_number=v)
    and not exists(select 1 from public.organizations where management_number=v);
 end loop;return v;end $$;

create function public.ops_directory_search(p_query text default '',p_kind text default 'all',p_offset integer default 0) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;begin
 if not camum_private.is_operator() then raise exception '중앙관리자 MFA 필요' using errcode='42501';end if;
 if p_kind not in ('all','organization','house','review','unclaimed') or p_offset<0 or length(p_query)>200 then raise exception '검색 조건 오류';end if;
 with filtered as (select s.*,o.official_name parent_name from camum_private.cbck_directory_staging s left join camum_private.cbck_directory_staging o on o.source_record_id=s.parent_source_record_id
 where s.canonical_source_record_id is null and
 (p_query='' or position(lower(p_query) in lower(s.official_name||' '||coalesce(s.provisional_management_number,s.provisional_facility_number,'')||' '||s.operator_name))>0)
 and (p_kind='all' or p_kind='organization' and s.provisional_management_number is not null or p_kind='house' and s.source_section='retreat_house'
 or p_kind='review' and s.review_state<>'verified' or p_kind='unclaimed' and s.provisional_management_number is not null and s.claim_state='unclaimed'))
 select jsonb_build_object('total',(select count(*) from filtered),'rows',coalesce((select jsonb_agg(to_jsonb(f)) from (select * from filtered order by official_name,source_record_id limit 30 offset p_offset) f),'[]'::jsonb),
 'counts',(select jsonb_build_object('unique_records',count(distinct cbck_code),'source_rows',count(*),'organizations',count(provisional_management_number),'facilities',count(provisional_facility_number),'approved',count(*) filter(where organization_id is not null and provisional_management_number is not null),'claimed',count(*) filter(where claim_state='claimed' and provisional_management_number is not null)) from camum_private.cbck_directory_staging)) into result;
 return result;end $$;

create function public.ops_directory_detail(p_id text) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;begin
 if not camum_private.is_operator() then raise exception '중앙관리자 MFA 필요' using errcode='42501';end if;
 select jsonb_build_object('record',to_jsonb(s),'related',coalesce((select jsonb_agg(to_jsonb(h)) from camum_private.cbck_directory_staging h where h.parent_source_record_id=p_id or h.canonical_source_record_id=p_id),'[]'::jsonb),
 'claims',coalesce((select jsonb_agg(to_jsonb(c)) from camum_private.directory_claims c where c.source_record_id=p_id),'[]'::jsonb),
 'events',coalesce((select jsonb_agg(to_jsonb(e)) from camum_private.directory_events e where e.source_record_id=p_id),'[]'::jsonb)) into result
 from camum_private.cbck_directory_staging s where s.source_record_id=p_id;
 if result is null then raise exception '명부 기록 없음';end if;return result;end $$;

create function public.ops_directory_review(p_id text,p_version integer,p_decision text,p_target text,p_note text,p_evidence text) returns void language plpgsql security definer set search_path='' as $$
declare s camum_private.cbck_directory_staging;t camum_private.cbck_directory_staging;begin
 if not camum_private.is_operator() then raise exception '중앙관리자 MFA 필요' using errcode='42501';end if;
 perform pg_advisory_xact_lock(210021);
 select * into s from camum_private.cbck_directory_staging where source_record_id=p_id for update;
 if s.source_record_id is null or s.version is distinct from p_version then raise exception '자료가 변경되었습니다. 다시 확인하세요';end if;
 if s.organization_id is not null or s.retreat_house_id is not null then raise exception '활성화한 기록은 이 화면에서 재연결할 수 없습니다';end if;
 if length(trim(coalesce(p_note,'')))<10 or length(p_note)>1000 or coalesce(p_evidence,'') !~ '^https://[^[:space:]@]+$' then raise exception '검증 근거 URL과 확인 기록 필요';end if;
 if p_decision in ('duplicate','affiliate') then
 select * into t from camum_private.cbck_directory_staging where source_record_id=p_target;
 if t.source_record_id is null or t.provisional_management_number is null or t.canonical_source_record_id is not null or t.source_record_id=p_id or t.review_state='rejected' then raise exception '검증할 본부 후보를 선택하세요';end if;
 end if;
 if p_decision='duplicate' then
 if s.source_section='retreat_house' or exists(select 1 from camum_private.cbck_directory_staging where (canonical_source_record_id=p_id or parent_source_record_id=p_id) and (organization_id is not null or retreat_house_id is not null)) then raise exception '시설 또는 활성 하위 기록이 있는 기관은 자동 병합 불가';end if;
 update camum_private.cbck_directory_staging set canonical_source_record_id=p_target,version=version+1 where canonical_source_record_id=p_id;
 update camum_private.cbck_directory_staging set parent_source_record_id=p_target,affiliation_state='unverified',review_state='affiliation_review',review_note='부모 후보 병합 후 소속 재검토 필요',version=version+1 where parent_source_record_id=p_id;
 update camum_private.cbck_directory_staging set canonical_source_record_id=p_target,review_state='duplicate_review' where source_record_id=p_id;
 elsif p_decision='affiliate' then
 update camum_private.cbck_directory_staging set parent_source_record_id=p_target,affiliation_state='verified',review_state='verified' where source_record_id=p_id;
 elsif p_decision='verify' then
 if s.provisional_management_number is null or s.canonical_source_record_id is not null then raise exception '독립 본부 후보만 기관으로 검증할 수 있습니다';end if;
 update camum_private.cbck_directory_staging set review_state='verified' where source_record_id=p_id;
 elsif p_decision='review' then
 update camum_private.cbck_directory_staging set review_state='affiliation_review',affiliation_state='unverified',parent_source_record_id=null where source_record_id=p_id;
 elsif p_decision='reject' then
 update camum_private.cbck_directory_staging set review_state='rejected' where source_record_id=p_id;
 else raise exception '검토 구분 오류';end if;
 update camum_private.cbck_directory_staging set reviewer_id=auth.uid(),reviewed_at=now(),review_note=trim(p_note),evidence_url=p_evidence,version=version+1,updated_at=now() where source_record_id=p_id;
 insert into camum_private.directory_events(source_record_id,actor_id,action,note) values(p_id,auth.uid(),p_decision,p_note);
 end $$;

-- Edge-only intake: an application is not identity proof. Generic response prevents directory enumeration.
create function public.ops_auth_directory_request(p_code text,p_contact text) returns void language plpgsql security definer set search_path='' as $$
declare sid text;begin
 if p_code !~ '^[0-9]{6,16}$' or length(trim(coalesce(p_contact,''))) not between 5 and 250 then raise exception '신청 입력 확인 필요';end if;
 select coalesce(canonical_source_record_id,source_record_id) into sid from camum_private.cbck_directory_staging where cbck_code=p_code and source_section<>'retreat_house' order by provisional_management_number nulls last limit 1;
 if sid is null then return;end if;
 if not exists(select 1 from camum_private.directory_claims where source_record_id=sid and reply_contact=trim(p_contact) and status='pending') then
 insert into camum_private.directory_claims(source_record_id,reply_contact) values(sid,trim(p_contact));end if;
 end $$;
create function public.ops_directory_claims() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not camum_private.is_operator() then raise exception '중앙관리자 MFA 필요' using errcode='42501';end if;
 return coalesce((select jsonb_agg(to_jsonb(c)||jsonb_build_object('official_name',s.official_name)) from camum_private.directory_claims c join camum_private.cbck_directory_staging s using(source_record_id) where c.status='pending'),'[]'::jsonb);end $$;
create function public.ops_directory_approve_claim(p_claim uuid,p_source text,p_url text,p_note text) returns uuid language plpgsql security definer set search_path='' as $$
declare c camum_private.directory_claims;s camum_private.cbck_directory_staging;result uuid;begin
 if not camum_private.is_operator() then raise exception '중앙관리자 MFA 필요' using errcode='42501';end if;
 perform pg_advisory_xact_lock(210021);
 select * into c from camum_private.directory_claims where id=p_claim for update;
 select * into s from camum_private.cbck_directory_staging where source_record_id=p_source for update;
 if c.id is null or c.status<>'pending' or s.source_record_id is null or s.review_state<>'verified' or s.canonical_source_record_id is not null or s.provisional_management_number is null then raise exception '신청과 본부 검증을 먼저 완료하세요';end if;
 if c.source_record_id<>p_source and not exists(select 1 from camum_private.cbck_directory_staging where source_record_id=c.source_record_id and ((parent_source_record_id=p_source and affiliation_state='verified') or canonical_source_record_id=p_source)) then raise exception '신청 기관과 검증한 운영 주체가 다릅니다';end if;
 if length(trim(coalesce(p_note,'')))<10 or length(p_note)>1000 then raise exception '기존 공식 연락처로 담당 권한 확인 기록 필요';end if;
 if s.organization_id is not null then raise exception '이미 승인한 기관입니다. 기존 기관 복구 절차를 사용하세요';end if;
 insert into public.organizations(name,official_url,status,management_number) values(s.official_name,p_url,'approved',s.provisional_management_number) returning id into result;
 insert into public.organization_credentials(organization_id) values(result);
 update camum_private.cbck_directory_staging set organization_id=result,version=version+1,updated_at=now() where source_record_id=p_source;
 update camum_private.directory_claims set status='approved',organization_id=result,verification_note=p_note,verified_by=auth.uid(),reviewed_at=now() where id=p_claim;
 insert into camum_private.directory_events(source_record_id,actor_id,action,note) values(p_source,auth.uid(),'claim.approved',p_note);
 perform camum_private.log(result,'directory.claim_approved_no_password',result);return result;end $$;
create function public.ops_directory_reject_claim(p_claim uuid,p_note text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not camum_private.is_operator() then raise exception '중앙관리자 MFA 필요' using errcode='42501';end if;
 if length(trim(coalesce(p_note,'')))<10 then raise exception '반려 사유 필요';end if;
 update camum_private.directory_claims set status='rejected',verification_note=p_note,verified_by=auth.uid(),reviewed_at=now() where id=p_claim and status='pending';end $$;

create function public.ops_directory_activate_house(p_source text,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare s camum_private.cbck_directory_staging;org uuid;result uuid;begin
 if not camum_private.is_operator() then raise exception '중앙관리자 MFA 필요' using errcode='42501';end if;
 select * into s from camum_private.cbck_directory_staging where source_record_id=p_source for update;
 select o.id into org from camum_private.cbck_directory_staging p join public.organizations o on o.id=p.organization_id where p.source_record_id=s.parent_source_record_id and p.review_state='verified' and o.status='approved';
 if s.source_section is distinct from 'retreat_house' or s.affiliation_state<>'verified' or s.review_state<>'verified' or org is null or s.retreat_house_id is not null then raise exception '시설 소속 검증·기관 가입 승인 필요';end if;
 if length(trim(coalesce(p_data->>'address','')))<5 or length(trim(coalesce(p_data->>'region','')))<2 then raise exception '확인한 시설 주소와 지역 필요';end if;
 if coalesce(p_data->>'official_url','')<>'' and p_data->>'official_url' !~ '^https://[^[:space:]@]+$' then raise exception '공식 URL 확인 필요';end if;
 insert into public.retreat_houses(organization_id,name,region,address,official_url,facility_number) values(org,s.official_name,p_data->>'region',p_data->>'address',coalesce(p_data->>'official_url',''),s.provisional_facility_number) returning id into result;
 update camum_private.cbck_directory_staging set retreat_house_id=result,organization_id=org,version=version+1 where source_record_id=p_source;
 perform camum_private.log(org,'directory.house_verified',result);return result;end $$;

-- Recheck approval when redeeming, not only when displaying the invitation.
create or replace function public.ops_auth_redeem_reset(p_hash text) returns jsonb language plpgsql security definer set search_path='' as $$
 declare r camum_private.credential_resets;u uuid;begin
 select * into r from camum_private.credential_resets where token_hash=p_hash and used_at is null and expires_at>now() for update;
 if r.token_hash is null then raise exception '만료되었거나 사용된 재설정 링크';end if;
 perform 1 from public.organizations where id=r.organization_id and status='approved' for update;
 if not found then raise exception '승인된 기관만 비밀번호를 설정할 수 있습니다';end if;
 update camum_private.credential_resets set used_at=now() where token_hash=p_hash;
 u=public.ops_auth_rotate(r.organization_id);
 if u is null then raise exception '발급된 기관 계정이 없습니다';end if;
 return jsonb_build_object('org',r.organization_id,'user_id',u,'email',(select login_email from public.organization_credentials where organization_id=r.organization_id));end; $$;
-- A valid, expiring bearer invitation exposes ONLY its own institution for confirmation.
create function public.ops_auth_reset_info(p_hash text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('name',o.name,'number',o.management_number,'houses',coalesce((select jsonb_agg(h.name) from public.retreat_houses h where h.organization_id=o.id),'[]'::jsonb))
 from camum_private.credential_resets r join public.organizations o on o.id=r.organization_id
 where r.token_hash=p_hash and r.used_at is null and r.expires_at>now() and o.status='approved'; $$;
create function camum_private.directory_credential_state() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.state='active' and exists(select 1 from camum_private.cbck_directory_staging where organization_id=new.organization_id and provisional_management_number is not null) then
 if not exists(select 1 from camum_private.directory_claims c join public.organizations o on o.id=c.organization_id where c.organization_id=new.organization_id and c.status='approved' and o.status='approved') then raise exception '기관 가입 승인 전 활성화 불가';end if;
 update camum_private.cbck_directory_staging set claim_state='claimed',updated_at=now() where organization_id=new.organization_id and provisional_management_number is not null;
 end if;return new;end $$;
create trigger directory_account_activation after update of state on public.organization_credentials for each row execute function camum_private.directory_credential_state();

-- Explicit grants: no direct staging access, including for signed-in institution users.
revoke all on function camum_private.guard_directory_reservation(),camum_private.directory_credential_state() from public,anon,authenticated;
do $$ declare f record;begin
 for f in select p.oid::regprocedure sig,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and (p.proname like 'ops_directory_%' or p.proname in ('ops_auth_directory_request','ops_auth_reset_info')) loop
 execute format('revoke all on function %s from public,anon,authenticated',f.sig);
 execute format('grant execute on function %s to %I',f.sig,case when f.proname like 'ops_auth_%' then 'service_role' else 'authenticated' end);
 end loop;end $$;
commit;
