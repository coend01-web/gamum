-- 가뭄 회원(아이디+비밀번호, 이메일 없음)·피정담기·게시판
-- 표는 API에 노출되지 않는 cm 스키마에 두고, 사이트는 public의 함수(rpc)로만 접근한다.
create schema if not exists cm;
revoke all on schema cm from public, anon, authenticated;

create table cm.members (
  id uuid primary key default gen_random_uuid(),
  username text not null unique check (username ~ '^[a-z0-9_]{4,20}$'),
  nickname text not null check (char_length(nickname) between 2 and 12),
  pw_hash text not null,
  recovery_hash text not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);
create table cm.sessions (
  token_hash text primary key,
  member_id uuid not null references cm.members(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
create table cm.saved (
  member_id uuid not null references cm.members(id) on delete cascade,
  item_id text not null check (char_length(item_id) <= 120),
  created_at timestamptz not null default now(),
  primary key (member_id, item_id)
);
create table cm.posts (
  id bigserial primary key,
  member_id uuid references cm.members(id) on delete set null,
  nickname text not null,
  guest_pw_hash text,
  category text not null default '자유' check (category in ('공지','자유','피정 후기','질문','기도 지향','묵상·필사','정보')),
  title text not null check (char_length(title) between 2 and 80),
  body text not null check (char_length(body) between 2 and 10000),
  views int not null default 0,
  likes int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  deleted boolean not null default false
);
create index on cm.posts (created_at desc) where not deleted;
create table cm.comments (
  id bigserial primary key,
  post_id bigint not null references cm.posts(id) on delete cascade,
  member_id uuid references cm.members(id) on delete set null,
  nickname text not null,
  guest_pw_hash text,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  deleted boolean not null default false
);
create index on cm.comments (post_id, id);
create table cm.rate (key text not null, at timestamptz not null default now());
create index on cm.rate (key, at);

alter table cm.members enable row level security;
alter table cm.sessions enable row level security;
alter table cm.saved enable row level security;
alter table cm.posts enable row level security;
alter table cm.comments enable row level security;
alter table cm.rate enable row level security;

-- 내부 도우미 ------------------------------------------------------------
create or replace function cm.hash_token(t text) returns text language sql immutable
set search_path = '' as $$ select encode(extensions.digest(t, 'sha256'), 'hex') $$;

create or replace function cm.new_token() returns text language sql volatile
set search_path = '' as $$ select encode(extensions.gen_random_bytes(32), 'hex') $$;

create or replace function cm.new_recovery() returns text language plpgsql volatile
set search_path = '' as $$
declare a text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; r text := ''; b bytea := extensions.gen_random_bytes(8);
begin
  for i in 0..7 loop r := r || substr(a, (get_byte(b, i) % 32) + 1, 1); if i = 3 then r := r || '-'; end if; end loop;
  return r;
end $$;

create or replace function cm.who(p_token text) returns cm.members language plpgsql
set search_path = '' as $$
declare m cm.members;
begin
  if p_token is null or p_token = '' then return null; end if;
  select mm.* into m from cm.sessions s join cm.members mm on mm.id = s.member_id where s.token_hash = cm.hash_token(p_token);
  if found then update cm.sessions set last_seen = now() where token_hash = cm.hash_token(p_token); end if;
  return m;
end $$;

create or replace function cm.limit_hit(p_key text, p_max int, p_window interval) returns void language plpgsql
set search_path = '' as $$
begin
  delete from cm.rate where at < now() - interval '1 day';
  if (select count(*) from cm.rate where key = p_key and at > now() - p_window) >= p_max then
    raise exception '잠시 후에 다시 시도해 주세요.' using errcode = 'P0001';
  end if;
  insert into cm.rate(key) values (p_key);
end $$;

create or replace function cm.client_ip() returns text language sql stable
set search_path = '' as $$
  select coalesce(split_part(nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for', ',', 1), 'unknown')
$$;

create or replace function cm.member_json(m cm.members) returns json language sql stable
set search_path = '' as $$ select json_build_object('username', m.username, 'nickname', m.nickname, 'is_admin', m.is_admin, 'created_at', m.created_at) $$;

create or replace function cm.start_session(p_member uuid) returns text language plpgsql
set search_path = '' as $$
declare t text := cm.new_token();
begin
  delete from cm.sessions where member_id = p_member and last_seen < now() - interval '180 days';
  insert into cm.sessions(token_hash, member_id) values (cm.hash_token(t), p_member);
  return t;
end $$;

-- 회원 ------------------------------------------------------------------
create or replace function public.cm_register(p_username text, p_password text, p_nickname text) returns json
language plpgsql security definer set search_path = '' as $$
declare u text := lower(trim(p_username)); n text := trim(p_nickname); rc text := cm.new_recovery(); m cm.members;
begin
  perform cm.limit_hit('reg:' || cm.client_ip(), 5, interval '1 hour');
  if u !~ '^[a-z0-9_]{4,20}$' then raise exception '아이디는 영문 소문자·숫자·밑줄로 4~20자입니다.' using errcode = 'P0001'; end if;
  if char_length(coalesce(p_password, '')) < 6 then raise exception '비밀번호는 6자 이상입니다.' using errcode = 'P0001'; end if;
  if char_length(coalesce(n, '')) not between 2 and 12 then raise exception '닉네임은 2~12자입니다.' using errcode = 'P0001'; end if;
  if exists (select 1 from cm.members where username = u) then raise exception '이미 쓰고 있는 아이디입니다.' using errcode = 'P0001'; end if;
  insert into cm.members(username, nickname, pw_hash, recovery_hash)
    values (u, n, extensions.crypt(p_password, extensions.gen_salt('bf')), extensions.crypt(rc, extensions.gen_salt('bf')))
    returning * into m;
  return json_build_object('token', cm.start_session(m.id), 'recovery', rc, 'member', cm.member_json(m));
end $$;

create or replace function public.cm_login(p_username text, p_password text) returns json
language plpgsql security definer set search_path = '' as $$
declare m cm.members;
begin
  perform cm.limit_hit('login:' || cm.client_ip(), 20, interval '10 minutes');
  select * into m from cm.members where username = lower(trim(p_username));
  if not found or m.pw_hash <> extensions.crypt(coalesce(p_password, ''), m.pw_hash) then
    raise exception '아이디나 비밀번호가 맞지 않습니다.' using errcode = 'P0001';
  end if;
  return json_build_object('token', cm.start_session(m.id), 'member', cm.member_json(m));
end $$;

create or replace function public.cm_logout(p_token text) returns void
language sql security definer set search_path = '' as $$ delete from cm.sessions where token_hash = cm.hash_token(p_token) $$;

create or replace function public.cm_me(p_token text) returns json
language plpgsql security definer set search_path = '' as $$
declare m cm.members := cm.who(p_token);
begin return case when m.id is null then null else cm.member_json(m) end; end $$;

create or replace function public.cm_update_profile(p_token text, p_nickname text, p_old_password text, p_new_password text) returns json
language plpgsql security definer set search_path = '' as $$
declare m cm.members := cm.who(p_token);
begin
  if m.id is null then raise exception '다시 로그인해 주세요.' using errcode = 'P0001'; end if;
  if p_nickname is not null and trim(p_nickname) <> '' then
    if char_length(trim(p_nickname)) not between 2 and 12 then raise exception '닉네임은 2~12자입니다.' using errcode = 'P0001'; end if;
    update cm.members set nickname = trim(p_nickname) where id = m.id;
  end if;
  if p_new_password is not null and p_new_password <> '' then
    if m.pw_hash <> extensions.crypt(coalesce(p_old_password, ''), m.pw_hash) then raise exception '지금 비밀번호가 맞지 않습니다.' using errcode = 'P0001'; end if;
    if char_length(p_new_password) < 6 then raise exception '비밀번호는 6자 이상입니다.' using errcode = 'P0001'; end if;
    update cm.members set pw_hash = extensions.crypt(p_new_password, extensions.gen_salt('bf')) where id = m.id;
  end if;
  select * into m from cm.members where id = m.id;
  return cm.member_json(m);
end $$;

create or replace function public.cm_recover(p_username text, p_recovery text, p_new_password text) returns json
language plpgsql security definer set search_path = '' as $$
declare m cm.members; rc text := cm.new_recovery();
begin
  perform cm.limit_hit('recover:' || cm.client_ip(), 10, interval '1 hour');
  select * into m from cm.members where username = lower(trim(p_username));
  if not found or m.recovery_hash <> extensions.crypt(upper(trim(coalesce(p_recovery, ''))), m.recovery_hash) then
    raise exception '아이디나 복구 코드가 맞지 않습니다.' using errcode = 'P0001';
  end if;
  if char_length(coalesce(p_new_password, '')) < 6 then raise exception '비밀번호는 6자 이상입니다.' using errcode = 'P0001'; end if;
  update cm.members set pw_hash = extensions.crypt(p_new_password, extensions.gen_salt('bf')), recovery_hash = extensions.crypt(rc, extensions.gen_salt('bf')) where id = m.id;
  delete from cm.sessions where member_id = m.id;
  return json_build_object('token', cm.start_session(m.id), 'recovery', rc, 'member', cm.member_json(m));
end $$;

create or replace function public.cm_delete_account(p_token text, p_password text) returns void
language plpgsql security definer set search_path = '' as $$
declare m cm.members := cm.who(p_token);
begin
  if m.id is null then raise exception '다시 로그인해 주세요.' using errcode = 'P0001'; end if;
  if m.pw_hash <> extensions.crypt(coalesce(p_password, ''), m.pw_hash) then raise exception '비밀번호가 맞지 않습니다.' using errcode = 'P0001'; end if;
  delete from cm.members where id = m.id;
end $$;

-- 관리자: 비밀번호 초기화(새 비밀번호를 돌려줌)
create or replace function public.cm_admin_reset(p_token text, p_username text) returns text
language plpgsql security definer set search_path = '' as $$
declare a cm.members := cm.who(p_token); np text := lower(replace(cm.new_recovery(), '-', ''));
begin
  if a.id is null or not a.is_admin then raise exception '관리자만 할 수 있습니다.' using errcode = 'P0001'; end if;
  update cm.members set pw_hash = extensions.crypt(np, extensions.gen_salt('bf')) where username = lower(trim(p_username));
  if not found then raise exception '그런 아이디가 없습니다.' using errcode = 'P0001'; end if;
  delete from cm.sessions where member_id = (select id from cm.members where username = lower(trim(p_username)));
  return np;
end $$;

-- 피정담기 ----------------------------------------------------------------
create or replace function public.cm_saved_list(p_token text) returns text[]
language plpgsql security definer set search_path = '' as $$
declare m cm.members := cm.who(p_token);
begin
  if m.id is null then raise exception '다시 로그인해 주세요.' using errcode = 'P0001'; end if;
  return coalesce((select array_agg(item_id order by created_at desc) from cm.saved where member_id = m.id), '{}');
end $$;

create or replace function public.cm_saved_set(p_token text, p_item text, p_on boolean) returns text[]
language plpgsql security definer set search_path = '' as $$
declare m cm.members := cm.who(p_token);
begin
  if m.id is null then raise exception '다시 로그인해 주세요.' using errcode = 'P0001'; end if;
  if p_on then
    if (select count(*) from cm.saved where member_id = m.id) >= 300 then raise exception '담기는 300개까지입니다.' using errcode = 'P0001'; end if;
    insert into cm.saved(member_id, item_id) values (m.id, p_item) on conflict do nothing;
  else delete from cm.saved where member_id = m.id and item_id = p_item; end if;
  return public.cm_saved_list(p_token);
end $$;

create or replace function public.cm_saved_merge(p_token text, p_items text[]) returns text[]
language plpgsql security definer set search_path = '' as $$
declare m cm.members := cm.who(p_token);
begin
  if m.id is null then raise exception '다시 로그인해 주세요.' using errcode = 'P0001'; end if;
  insert into cm.saved(member_id, item_id) select m.id, x from unnest(p_items[1:300]) x where char_length(x) <= 120 on conflict do nothing;
  return public.cm_saved_list(p_token);
end $$;

-- 게시판 ------------------------------------------------------------------
create or replace function public.cm_posts(p_category text default null, p_q text default null, p_page int default 1) returns json
language sql stable security definer set search_path = '' as $$
  with f as (
    select p.*, (select count(*) from cm.comments c where c.post_id = p.id and not c.deleted) as ncom
    from cm.posts p
    where not p.deleted
      and (p_category is null or p_category = '' or p.category = p_category)
      and (p_q is null or p_q = '' or p.title ilike '%' || p_q || '%' or p.body ilike '%' || p_q || '%' or p.nickname ilike '%' || p_q || '%')
  )
  select json_build_object(
    'total', (select count(*) from f),
    'rows', coalesce((select json_agg(r) from (
      select id, category, title, nickname, (member_id is not null) as member, views, likes, ncom, created_at
      from f order by (category = '공지') desc, id desc limit 30 offset greatest(coalesce(p_page, 1) - 1, 0) * 30) r), '[]'))
$$;

create or replace function public.cm_post(p_id bigint) returns json
language plpgsql security definer set search_path = '' as $$
declare r json;
begin
  update cm.posts set views = views + 1 where id = p_id and not deleted;
  select json_build_object('id', p.id, 'category', p.category, 'title', p.title, 'body', p.body, 'nickname', p.nickname,
      'member', p.member_id is not null, 'username', m.username, 'guest', p.guest_pw_hash is not null,
      'views', p.views, 'likes', p.likes, 'created_at', p.created_at, 'updated_at', p.updated_at,
      'prev', (select max(id) from cm.posts where id < p.id and not deleted), 'next', (select min(id) from cm.posts where id > p.id and not deleted),
      'comments', coalesce((select json_agg(json_build_object('id', c.id, 'nickname', c.nickname, 'member', c.member_id is not null,
          'username', cm2.username, 'body', c.body, 'created_at', c.created_at) order by c.id)
        from cm.comments c left join cm.members cm2 on cm2.id = c.member_id where c.post_id = p.id and not c.deleted), '[]'))
    into r from cm.posts p left join cm.members m on m.id = p.member_id where p.id = p_id and not p.deleted;
  return r;
end $$;

create or replace function public.cm_post_write(p_token text, p_nickname text, p_guest_pw text, p_category text, p_title text, p_body text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare m cm.members := cm.who(p_token); nid bigint;
begin
  perform cm.limit_hit('post:' || cm.client_ip(), 5, interval '10 minutes');
  if p_category = '공지' and not coalesce(m.is_admin, false) then raise exception '공지는 관리자만 쓸 수 있습니다.' using errcode = 'P0001'; end if;
  if m.id is null then
    if char_length(trim(coalesce(p_nickname, ''))) not between 2 and 12 then raise exception '닉네임은 2~12자입니다.' using errcode = 'P0001'; end if;
    if char_length(coalesce(p_guest_pw, '')) < 4 then raise exception '글 비밀번호는 4자 이상입니다.' using errcode = 'P0001'; end if;
  end if;
  insert into cm.posts(member_id, nickname, guest_pw_hash, category, title, body)
    values (m.id, case when m.id is null then trim(p_nickname) else m.nickname end,
            case when m.id is null then extensions.crypt(p_guest_pw, extensions.gen_salt('bf')) end,
            coalesce(nullif(p_category, ''), '자유'), trim(p_title), p_body)
    returning id into nid;
  return nid;
end $$;

create or replace function cm.can_edit(p_owner uuid, p_hash text, p_token text, p_guest_pw text) returns boolean language plpgsql
set search_path = '' as $$
declare m cm.members := cm.who(p_token);
begin
  if m.id is not null and (m.is_admin or m.id = p_owner) then return true; end if;
  return p_owner is null and p_hash is not null and p_hash = extensions.crypt(coalesce(p_guest_pw, ''), p_hash);
end $$;

create or replace function public.cm_post_edit(p_id bigint, p_token text, p_guest_pw text, p_category text, p_title text, p_body text) returns void
language plpgsql security definer set search_path = '' as $$
declare p cm.posts;
begin
  select * into p from cm.posts where id = p_id and not deleted;
  if not found or not cm.can_edit(p.member_id, p.guest_pw_hash, p_token, p_guest_pw) then raise exception '글 비밀번호가 맞지 않거나 권한이 없습니다.' using errcode = 'P0001'; end if;
  if p_category = '공지' and not coalesce((cm.who(p_token)).is_admin, false) then raise exception '공지는 관리자만 쓸 수 있습니다.' using errcode = 'P0001'; end if;
  update cm.posts set category = coalesce(nullif(p_category, ''), category), title = trim(p_title), body = p_body, updated_at = now() where id = p_id;
end $$;

create or replace function public.cm_post_check(p_id bigint, p_token text, p_guest_pw text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare p cm.posts;
begin
  perform cm.limit_hit('check:' || cm.client_ip(), 20, interval '10 minutes');
  select * into p from cm.posts where id = p_id and not deleted;
  return found and cm.can_edit(p.member_id, p.guest_pw_hash, p_token, p_guest_pw);
end $$;

create or replace function public.cm_post_delete(p_id bigint, p_token text, p_guest_pw text) returns void
language plpgsql security definer set search_path = '' as $$
declare p cm.posts;
begin
  select * into p from cm.posts where id = p_id and not deleted;
  if not found or not cm.can_edit(p.member_id, p.guest_pw_hash, p_token, p_guest_pw) then raise exception '글 비밀번호가 맞지 않거나 권한이 없습니다.' using errcode = 'P0001'; end if;
  update cm.posts set deleted = true where id = p_id;
end $$;

create or replace function public.cm_post_like(p_id bigint) returns int
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  perform cm.limit_hit('like:' || cm.client_ip() || ':' || p_id, 1, interval '1 day');
  update cm.posts set likes = likes + 1 where id = p_id and not deleted returning likes into n;
  return n;
end $$;

create or replace function public.cm_comment_write(p_post bigint, p_token text, p_nickname text, p_guest_pw text, p_body text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare m cm.members := cm.who(p_token); nid bigint;
begin
  perform cm.limit_hit('cmt:' || cm.client_ip(), 10, interval '10 minutes');
  if not exists (select 1 from cm.posts where id = p_post and not deleted) then raise exception '없는 글입니다.' using errcode = 'P0001'; end if;
  if m.id is null then
    if char_length(trim(coalesce(p_nickname, ''))) not between 2 and 12 then raise exception '닉네임은 2~12자입니다.' using errcode = 'P0001'; end if;
    if char_length(coalesce(p_guest_pw, '')) < 4 then raise exception '댓글 비밀번호는 4자 이상입니다.' using errcode = 'P0001'; end if;
  end if;
  insert into cm.comments(post_id, member_id, nickname, guest_pw_hash, body)
    values (p_post, m.id, case when m.id is null then trim(p_nickname) else m.nickname end,
            case when m.id is null then extensions.crypt(p_guest_pw, extensions.gen_salt('bf')) end, trim(p_body))
    returning id into nid;
  return nid;
end $$;

create or replace function public.cm_comment_delete(p_id bigint, p_token text, p_guest_pw text) returns void
language plpgsql security definer set search_path = '' as $$
declare c cm.comments;
begin
  select * into c from cm.comments where id = p_id and not deleted;
  if not found or not cm.can_edit(c.member_id, c.guest_pw_hash, p_token, p_guest_pw) then raise exception '댓글 비밀번호가 맞지 않거나 권한이 없습니다.' using errcode = 'P0001'; end if;
  update cm.comments set deleted = true where id = p_id;
end $$;

-- 권한: 사이트(anon)는 위 public 함수만 부를 수 있다.
revoke all on all functions in schema cm from public, anon, authenticated;
do $$ declare f text; begin
  for f in select p.oid::regprocedure::text from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'cm\_%' loop
    execute 'revoke all on function ' || f || ' from public';
    execute 'grant execute on function ' || f || ' to anon, authenticated';
  end loop;
end $$;
