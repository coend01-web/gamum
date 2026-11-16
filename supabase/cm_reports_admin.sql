alter table cm.posts add column if not exists hidden boolean not null default false;
alter table cm.comments add column if not exists hidden boolean not null default false;

create table if not exists cm.reports (
  id bigserial primary key,
  target_type text not null check (target_type in ('post','comment')),
  target_id bigint not null,
  reason text not null check (char_length(reason) between 1 and 40),
  detail text not null default '' check (char_length(detail) <= 300),
  reporter text not null,
  created_at timestamptz not null default now(),
  resolved boolean not null default false,
  unique (target_type, target_id, reporter)
);
alter table cm.reports enable row level security;

-- 공개 목록·글 보기에서 가려진 글·댓글 빼기
create or replace function public.cm_posts(p_category text default null, p_q text default null, p_page int default 1) returns json
language sql stable security definer set search_path = '' as $$
  with f as (
    select p.*, (select count(*) from cm.comments c where c.post_id = p.id and not c.deleted and not c.hidden) as ncom
    from cm.posts p
    where not p.deleted and not p.hidden
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
  update cm.posts set views = views + 1 where id = p_id and not deleted and not hidden;
  select json_build_object('id', p.id, 'category', p.category, 'title', p.title, 'body', p.body, 'nickname', p.nickname,
      'member', p.member_id is not null, 'username', m.username, 'guest', p.guest_pw_hash is not null,
      'views', p.views, 'likes', p.likes, 'created_at', p.created_at, 'updated_at', p.updated_at,
      'prev', (select max(id) from cm.posts where id < p.id and not deleted and not hidden), 'next', (select min(id) from cm.posts where id > p.id and not deleted and not hidden),
      'comments', coalesce((select json_agg(json_build_object('id', c.id, 'nickname', c.nickname, 'member', c.member_id is not null,
          'username', cm2.username, 'body', c.body, 'created_at', c.created_at) order by c.id)
        from cm.comments c left join cm.members cm2 on cm2.id = c.member_id where c.post_id = p.id and not c.deleted and not c.hidden), '[]'))
    into r from cm.posts p left join cm.members m on m.id = p.member_id where p.id = p_id and not p.deleted and not p.hidden;
  return r;
end $$;

-- 신고하기: 같은 사람(로그인 회원 또는 접속 주소)은 같은 대상에 한 번만. 5명 이상이 신고하면 자동으로 가림
create or replace function public.cm_report(p_token text, p_type text, p_id bigint, p_reason text, p_detail text) returns text
language plpgsql security definer set search_path = '' as $$
declare m cm.members := cm.who(p_token); who text; n int;
begin
  perform cm.limit_hit('report:' || cm.client_ip(), 20, interval '1 hour');
  if p_type not in ('post','comment') then raise exception '잘못된 신고입니다.' using errcode = 'P0001'; end if;
  if p_type = 'post' and not exists (select 1 from cm.posts where id = p_id and not deleted) then raise exception '없는 글입니다.' using errcode = 'P0001'; end if;
  if p_type = 'comment' and not exists (select 1 from cm.comments where id = p_id and not deleted) then raise exception '없는 댓글입니다.' using errcode = 'P0001'; end if;
  who := coalesce('m:' || m.id::text, 'ip:' || cm.hash_token(cm.client_ip()));
  insert into cm.reports(target_type, target_id, reason, detail, reporter)
    values (p_type, p_id, left(trim(p_reason), 40), left(coalesce(trim(p_detail), ''), 300), who)
    on conflict (target_type, target_id, reporter) do nothing;
  if not found then return 'dup'; end if;
  select count(*) into n from cm.reports where target_type = p_type and target_id = p_id and not resolved;
  if n >= 5 then
    if p_type = 'post' then update cm.posts set hidden = true where id = p_id and category <> '공지';
    else update cm.comments set hidden = true where id = p_id; end if;
  end if;
  return 'ok';
end $$;

create or replace function cm.require_admin(p_token text) returns cm.members language plpgsql
set search_path = '' as $$
declare a cm.members := cm.who(p_token);
begin
  if a.id is null or not a.is_admin then raise exception '관리자만 할 수 있습니다.' using errcode = 'P0001'; end if;
  return a;
end $$;

-- 관리자: 신고 목록(대상별로 묶음)
create or replace function public.cm_admin_reports(p_token text) returns json
language plpgsql security definer set search_path = '' as $$
begin
  perform cm.require_admin(p_token);
  return coalesce((select json_agg(r order by r.last_at desc) from (
    select x.target_type, x.target_id, count(*) as n, max(x.created_at) as last_at,
      json_agg(json_build_object('reason', x.reason, 'detail', x.detail, 'at', x.created_at) order by x.created_at) as items,
      case when x.target_type = 'post' then (select json_build_object('title', p.title, 'body', left(p.body, 200), 'nickname', p.nickname, 'hidden', p.hidden, 'deleted', p.deleted, 'post_id', p.id) from cm.posts p where p.id = x.target_id)
           else (select json_build_object('title', '댓글', 'body', left(c.body, 200), 'nickname', c.nickname, 'hidden', c.hidden, 'deleted', c.deleted, 'post_id', c.post_id) from cm.comments c where c.id = x.target_id) end as target
    from cm.reports x where not x.resolved group by x.target_type, x.target_id) r), '[]');
end $$;

-- 관리자: 신고 처리(지우기 / 문제 없음)
create or replace function public.cm_admin_resolve(p_token text, p_type text, p_id bigint, p_delete boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform cm.require_admin(p_token);
  if p_type = 'post' then
    if p_delete then update cm.posts set deleted = true where id = p_id; else update cm.posts set hidden = false where id = p_id; end if;
  else
    if p_delete then update cm.comments set deleted = true where id = p_id; else update cm.comments set hidden = false where id = p_id; end if;
  end if;
  update cm.reports set resolved = true where target_type = p_type and target_id = p_id;
end $$;

-- 관리자: 최근 글·댓글(가려진 것 포함)
create or replace function public.cm_admin_recent(p_token text) returns json
language plpgsql security definer set search_path = '' as $$
begin
  perform cm.require_admin(p_token);
  return json_build_object(
    'posts', coalesce((select json_agg(r) from (select p.id, p.category, p.title, p.nickname, p.member_id is not null as member, p.hidden, p.created_at,
        (select count(*) from cm.reports x where x.target_type = 'post' and x.target_id = p.id and not x.resolved) as reports
      from cm.posts p where not p.deleted order by p.id desc limit 50) r), '[]'),
    'comments', coalesce((select json_agg(r) from (select c.id, c.post_id, left(c.body, 80) as body, c.nickname, c.member_id is not null as member, c.hidden, c.created_at
      from cm.comments c where not c.deleted order by c.id desc limit 50) r), '[]'));
end $$;

-- 관리자: 글·댓글 바로 지우기
create or replace function public.cm_admin_delete(p_token text, p_type text, p_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform cm.require_admin(p_token);
  if p_type = 'post' then update cm.posts set deleted = true where id = p_id; else update cm.comments set deleted = true where id = p_id; end if;
  update cm.reports set resolved = true where target_type = p_type and target_id = p_id;
end $$;

-- 관리자: 회원 목록
create or replace function public.cm_admin_members(p_token text, p_q text) returns json
language plpgsql security definer set search_path = '' as $$
begin
  perform cm.require_admin(p_token);
  return coalesce((select json_agg(r) from (
    select m.username, m.nickname, m.is_admin, m.is_author, m.created_at,
      (select count(*) from cm.posts p where p.member_id = m.id and not p.deleted) as posts,
      (select count(*) from cm.comments c where c.member_id = m.id and not c.deleted) as comments,
      (select max(s.last_seen) from cm.sessions s where s.member_id = m.id) as last_seen
    from cm.members m
    where p_q is null or p_q = '' or m.username ilike '%' || p_q || '%' or m.nickname ilike '%' || p_q || '%'
    order by m.created_at desc limit 200) r), '[]');
end $$;

-- 관리자: 회원 내보내기(관리자 계정은 불가)
create or replace function public.cm_admin_remove_member(p_token text, p_username text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform cm.require_admin(p_token);
  if exists (select 1 from cm.members where username = lower(trim(p_username)) and is_admin) then raise exception '관리자 계정은 내보낼 수 없습니다.' using errcode = 'P0001'; end if;
  delete from cm.members where username = lower(trim(p_username));
  if not found then raise exception '그런 아이디가 없습니다.' using errcode = 'P0001'; end if;
end $$;

revoke all on function cm.require_admin(text) from public, anon, authenticated;
do $$ declare f text; begin
  for f in select p.oid::regprocedure::text from pg_proc p where p.pronamespace = 'public'::regnamespace
    and p.proname in ('cm_posts','cm_post','cm_report','cm_admin_reports','cm_admin_resolve','cm_admin_recent','cm_admin_delete','cm_admin_members','cm_admin_remove_member') loop
    execute 'revoke all on function ' || f || ' from public';
    execute 'grant execute on function ' || f || ' to anon, authenticated';
  end loop;
end $$;
