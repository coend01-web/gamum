-- 수도회·피정의 집 담당자(기관 계정), 피정 올리기, 문의(DM)
alter table cm.members add column if not exists is_org boolean not null default false;
alter table cm.members add column if not exists org_name text;

create table if not exists cm.retreats (
  id bigserial primary key,
  org_id uuid not null references cm.members(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 80),
  description text not null default '' check (char_length(description) <= 4000),
  tags text[] not null default '{}',
  audience text not null default '누구나' check (char_length(audience) <= 40),
  place text not null default '' check (char_length(place) <= 80),
  region text not null default '' check (char_length(region) <= 20),
  address text not null default '' check (char_length(address) <= 160),
  start_date date not null,
  end_date date not null,
  apply_end date,
  fee int check (fee is null or fee between 0 and 10000000),
  capacity int check (capacity is null or capacity between 1 and 10000),
  apply_url text check (apply_url is null or apply_url ~ '^https?://'),
  phone text check (char_length(phone) <= 40),
  photo_url text,
  closed boolean not null default false,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  review_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);
create index if not exists retreats_org on cm.retreats(org_id);
alter table cm.retreats enable row level security;

create table if not exists cm.messages (
  id bigserial primary key,
  org_id uuid not null references cm.members(id) on delete cascade,
  from_id uuid references cm.members(id) on delete set null,
  from_name text not null,
  retreat_id bigint references cm.retreats(id) on delete set null,
  body text not null check (char_length(body) between 2 and 2000),
  reply text check (char_length(reply) <= 2000),
  replied_at timestamptz,
  read_by_org boolean not null default false,
  read_by_user boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists messages_org on cm.messages(org_id, id desc);
create index if not exists messages_from on cm.messages(from_id, id desc);
alter table cm.messages enable row level security;

create or replace function cm.member_json(m cm.members) returns json language sql stable
set search_path = '' as $$ select json_build_object('username', m.username, 'nickname', m.nickname, 'is_admin', m.is_admin,
  'is_author', m.is_author or m.is_admin, 'is_org', m.is_org, 'org_name', m.org_name, 'created_at', m.created_at) $$;

create or replace function cm.can_upload(p_token text) returns boolean language sql
set search_path = '' as $$ select coalesce((select m.is_admin or m.is_author or m.is_org from cm.members m where m.id = (cm.who(p_token)).id), false) $$;

create or replace function cm.require_org(p_token text) returns cm.members language plpgsql
set search_path = '' as $$
declare m cm.members := cm.who(p_token);
begin
  if m.id is null or not m.is_org then raise exception '기관 담당자만 쓸 수 있습니다. 다시 로그인해 주세요.' using errcode = 'P0001'; end if;
  return m;
end $$;

create or replace function cm.retreat_json(r cm.retreats) returns json language sql stable
set search_path = '' as $$ select json_build_object('id', r.id, 'title', r.title, 'description', r.description, 'tags', r.tags, 'audience', r.audience,
  'place', r.place, 'region', r.region, 'address', r.address, 'start_date', r.start_date, 'end_date', r.end_date, 'apply_end', r.apply_end,
  'fee', r.fee, 'capacity', r.capacity, 'apply_url', r.apply_url, 'phone', r.phone, 'photo_url', r.photo_url, 'closed', r.closed,
  'status', r.status, 'review_note', r.review_note, 'updated_at', r.updated_at) $$;

-- 관리자: 기관 계정 만들기
create or replace function public.cm_admin_create_org(p_token text, p_org_name text, p_username text, p_password text) returns json
language plpgsql security definer set search_path = '' as $$
declare u text := lower(trim(p_username)); m cm.members; rc text := cm.new_recovery();
begin
  perform cm.require_admin(p_token);
  if char_length(trim(coalesce(p_org_name, ''))) < 2 then raise exception '수도회·피정의 집 이름을 넣어 주세요.' using errcode = 'P0001'; end if;
  if u !~ '^[a-z0-9_]{4,20}$' then raise exception '아이디는 영문 소문자·숫자·밑줄로 4~20자입니다.' using errcode = 'P0001'; end if;
  if char_length(coalesce(p_password, '')) < 6 then raise exception '비밀번호는 6자 이상입니다.' using errcode = 'P0001'; end if;
  if exists (select 1 from cm.members where username = u) then raise exception '이미 쓰고 있는 아이디입니다.' using errcode = 'P0001'; end if;
  insert into cm.members(username, nickname, pw_hash, recovery_hash, is_org, org_name)
    values (u, left(trim(p_org_name), 12), extensions.crypt(p_password, extensions.gen_salt('bf')), extensions.crypt(rc, extensions.gen_salt('bf')), true, trim(p_org_name))
    returning * into m;
  return json_build_object('username', m.username, 'org_name', m.org_name, 'recovery', rc);
end $$;

create or replace function public.cm_admin_orgs(p_token text) returns json
language plpgsql security definer set search_path = '' as $$
begin
  perform cm.require_admin(p_token);
  return coalesce((select json_agg(r order by r.org_name) from (
    select m.username, m.org_name, m.created_at,
      (select count(*) from cm.retreats x where x.org_id = m.id) as retreats,
      (select count(*) from cm.messages x where x.org_id = m.id and x.reply is null) as waiting,
      (select max(s.last_seen) from cm.sessions s where s.member_id = m.id) as last_seen
    from cm.members m where m.is_org) r), '[]');
end $$;

-- 관리자: 피정 승인
create or replace function public.cm_admin_retreats(p_token text, p_status text) returns json
language plpgsql security definer set search_path = '' as $$
begin
  perform cm.require_admin(p_token);
  return coalesce((select json_agg(x order by (x->>'updated_at') desc) from (
    select (cm.retreat_json(r)::jsonb || jsonb_build_object('org_name', m.org_name))::json as x
    from cm.retreats r join cm.members m on m.id = r.org_id
    where p_status is null or p_status = '' or r.status = p_status) q), '[]');
end $$;

create or replace function public.cm_admin_review_retreat(p_token text, p_id bigint, p_approve boolean, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform cm.require_admin(p_token);
  update cm.retreats set status = case when p_approve then 'approved' else 'rejected' end, review_note = left(coalesce(trim(p_note), ''), 300) where id = p_id;
end $$;

-- 기관: 첫 화면(받은 문의 + 내 피정)
create or replace function public.cm_org_home(p_token text) returns json
language plpgsql security definer set search_path = '' as $$
declare m cm.members := cm.require_org(p_token);
begin
  return json_build_object('org_name', m.org_name,
    'messages', coalesce((select json_agg(json_build_object('id', x.id, 'from_name', x.from_name, 'body', x.body, 'reply', x.reply, 'replied_at', x.replied_at,
        'read', x.read_by_org, 'created_at', x.created_at, 'retreat', (select r.title from cm.retreats r where r.id = x.retreat_id)) order by x.id desc)
      from (select * from cm.messages where org_id = m.id order by id desc limit 100) x), '[]'),
    'retreats', coalesce((select json_agg(cm.retreat_json(r) order by r.start_date desc) from cm.retreats r where r.org_id = m.id), '[]'));
end $$;

create or replace function public.cm_org_read(p_token text, p_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare m cm.members := cm.require_org(p_token);
begin update cm.messages set read_by_org = true where id = p_id and org_id = m.id; end $$;

create or replace function public.cm_org_reply(p_token text, p_id bigint, p_reply text) returns void
language plpgsql security definer set search_path = '' as $$
declare m cm.members := cm.require_org(p_token);
begin
  if char_length(trim(coalesce(p_reply, ''))) < 1 then raise exception '답장을 적어 주세요.' using errcode = 'P0001'; end if;
  update cm.messages set reply = left(trim(p_reply), 2000), replied_at = now(), read_by_org = true, read_by_user = false where id = p_id and org_id = m.id;
  if not found then raise exception '없는 문의입니다.' using errcode = 'P0001'; end if;
end $$;

create or replace function public.cm_org_retreat_save(p_token text, p_id bigint, p jsonb) returns bigint
language plpgsql security definer set search_path = '' as $$
declare m cm.members := cm.require_org(p_token); nid bigint; url text := nullif(trim(p->>'apply_url'), '');
begin
  if url is not null and url !~ '^https?://' then url := 'https://' || url; end if;
  if p_id is null then
    insert into cm.retreats(org_id, title, description, tags, audience, place, region, address, start_date, end_date, apply_end, fee, capacity, apply_url, phone, photo_url)
    values (m.id, trim(p->>'title'), coalesce(p->>'description', ''), coalesce(array(select jsonb_array_elements_text(p->'tags')), '{}'), coalesce(nullif(p->>'audience', ''), '누구나'),
      coalesce(p->>'place', ''), coalesce(p->>'region', ''), coalesce(p->>'address', ''), (p->>'start_date')::date, coalesce(nullif(p->>'end_date', '')::date, (p->>'start_date')::date),
      nullif(p->>'apply_end', '')::date, nullif(p->>'fee', '')::int, nullif(p->>'capacity', '')::int, url, nullif(trim(p->>'phone'), ''), nullif(p->>'photo_url', ''))
    returning id into nid;
  else
    update cm.retreats set title = trim(p->>'title'), description = coalesce(p->>'description', ''), tags = coalesce(array(select jsonb_array_elements_text(p->'tags')), '{}'),
      audience = coalesce(nullif(p->>'audience', ''), '누구나'), place = coalesce(p->>'place', ''), region = coalesce(p->>'region', ''), address = coalesce(p->>'address', ''),
      start_date = (p->>'start_date')::date, end_date = coalesce(nullif(p->>'end_date', '')::date, (p->>'start_date')::date), apply_end = nullif(p->>'apply_end', '')::date,
      fee = nullif(p->>'fee', '')::int, capacity = nullif(p->>'capacity', '')::int, apply_url = url, phone = nullif(trim(p->>'phone'), ''), photo_url = nullif(p->>'photo_url', ''),
      status = case when status = 'rejected' then 'pending' else status end, updated_at = now()
    where id = p_id and org_id = m.id returning id into nid;
    if nid is null then raise exception '없는 피정입니다.' using errcode = 'P0001'; end if;
  end if;
  return nid;
end $$;

create or replace function public.cm_org_retreat_set(p_token text, p_id bigint, p_action text) returns void
language plpgsql security definer set search_path = '' as $$
declare m cm.members := cm.require_org(p_token);
begin
  if p_action = 'close' then update cm.retreats set closed = true, updated_at = now() where id = p_id and org_id = m.id;
  elsif p_action = 'open' then update cm.retreats set closed = false, updated_at = now() where id = p_id and org_id = m.id;
  elsif p_action = 'delete' then delete from cm.retreats where id = p_id and org_id = m.id;
  else raise exception '알 수 없는 작업입니다.' using errcode = 'P0001'; end if;
end $$;

-- 신자: 문의 보내기(로그인 필요), 내 문의 보기
create or replace function public.cm_ask(p_token text, p_retreat bigint, p_body text) returns void
language plpgsql security definer set search_path = '' as $$
declare m cm.members := cm.who(p_token); r cm.retreats;
begin
  if m.id is null then raise exception '로그인하면 문의를 보낼 수 있습니다.' using errcode = 'P0001'; end if;
  perform cm.limit_hit('ask:' || m.id::text, 10, interval '1 hour');
  select * into r from cm.retreats where id = p_retreat and status = 'approved';
  if not found then raise exception '문의할 수 없는 피정입니다.' using errcode = 'P0001'; end if;
  if char_length(trim(coalesce(p_body, ''))) < 2 then raise exception '문의 내용을 적어 주세요.' using errcode = 'P0001'; end if;
  insert into cm.messages(org_id, from_id, from_name, retreat_id, body) values (r.org_id, m.id, m.nickname, r.id, left(trim(p_body), 2000));
end $$;

create or replace function public.cm_my_questions(p_token text) returns json
language plpgsql security definer set search_path = '' as $$
declare m cm.members := cm.who(p_token);
begin
  if m.id is null then raise exception '다시 로그인해 주세요.' using errcode = 'P0001'; end if;
  update cm.messages set read_by_user = true where from_id = m.id and reply is not null and not read_by_user;
  return coalesce((select json_agg(json_build_object('id', x.id, 'org_name', o.org_name, 'retreat', r.title, 'retreat_id', r.id, 'body', x.body, 'reply', x.reply,
      'replied_at', x.replied_at, 'created_at', x.created_at) order by x.id desc)
    from cm.messages x join cm.members o on o.id = x.org_id left join cm.retreats r on r.id = x.retreat_id where x.from_id = m.id), '[]');
end $$;

create or replace function public.cm_unread(p_token text) returns json
language plpgsql security definer set search_path = '' as $$
declare m cm.members := cm.who(p_token);
begin
  if m.id is null then return json_build_object('org', 0, 'user', 0); end if;
  return json_build_object(
    'org', case when m.is_org then (select count(*) from cm.messages where org_id = m.id and not read_by_org) else 0 end,
    'user', (select count(*) from cm.messages where from_id = m.id and not read_by_user));
end $$;

-- 공개: 승인된 피정을 피정 찾기 형식으로
create or replace function public.cm_public_retreats() returns json
language sql stable security definer set search_path = '' as $$
  select coalesce(json_agg(json_build_object(
    'id', 'cmr-' || r.id, 'programId', 'cmp-' || r.id, 'cmId', r.id, 'title', r.title, 'description', r.description, 'organization', m.org_name,
    'tags', r.tags, 'audience', r.audience, 'place', r.place, 'region', r.region, 'address', r.address,
    'start', r.start_date::text || 'T09:00:00+09:00', 'end', r.end_date::text || 'T17:00:00+09:00',
    'applicationEnd', case when r.apply_end is null then null else r.apply_end::text || 'T23:59:00+09:00' end,
    'fee', r.fee, 'feeUnit', 'person', 'feeComplete', r.fee is not null, 'capacity', r.capacity,
    'applicationUrl', r.apply_url, 'phone', r.phone, 'photoUrl', r.photo_url,
    'status', case when r.closed then 'closed' else 'open' end,
    'demo', false, 'published', true, 'approval', 'approved', 'catalogKind', 'retreat', 'source', m.org_name) order by r.start_date), '[]')
  from cm.retreats r join cm.members m on m.id = r.org_id
  where r.status = 'approved' and r.end_date >= current_date - 1
$$;

revoke all on function cm.require_org(text) from public, anon, authenticated;
do $$ declare f text; begin
  for f in select p.oid::regprocedure::text from pg_proc p where p.pronamespace = 'public'::regnamespace
    and p.proname in ('cm_admin_create_org','cm_admin_orgs','cm_admin_retreats','cm_admin_review_retreat','cm_org_home','cm_org_read','cm_org_reply',
      'cm_org_retreat_save','cm_org_retreat_set','cm_ask','cm_my_questions','cm_unread','cm_public_retreats') loop
    execute 'revoke all on function ' || f || ' from public';
    execute 'grant execute on function ' || f || ' to anon, authenticated';
  end loop;
end $$;
