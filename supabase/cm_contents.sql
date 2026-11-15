create table cm.works (
  id bigserial primary key,
  kind text not null check (kind in ('webtoon','novel','video','essay','audio')),
  title text not null check (char_length(title) between 1 and 80),
  author text not null default '' check (char_length(author) <= 40),
  intro text not null default '' check (char_length(intro) <= 1000),
  cover_url text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table cm.episodes (
  id bigserial primary key,
  work_id bigint not null references cm.works(id) on delete cascade,
  no int not null default 1,
  title text not null check (char_length(title) between 1 and 80),
  ref text not null default '' check (char_length(ref) <= 60),
  body text not null default '' check (char_length(body) <= 50000),
  video_url text,
  images text[] not null default '{}',
  published boolean not null default false,
  views int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on cm.episodes (work_id, no);
alter table cm.works enable row level security;
alter table cm.episodes enable row level security;

create or replace function cm.is_admin(p_token text) returns boolean language sql
set search_path = '' as $$ select coalesce((cm.who(p_token)).is_admin, false) $$;

create or replace function public.cm_works(p_kind text, p_token text default null) returns json
language plpgsql security definer set search_path = '' as $$
declare adm boolean := cm.is_admin(p_token);
begin
  return coalesce((select json_agg(r) from (
    select w.id, w.kind, w.title, w.author, w.intro, w.cover_url, w.published, w.updated_at,
      (select count(*) from cm.episodes e where e.work_id = w.id and (adm or e.published)) as eps,
      (select max(e.created_at) from cm.episodes e where e.work_id = w.id and (adm or e.published)) as last_at
    from cm.works w where w.kind = p_kind and (adm or w.published)
    order by coalesce((select max(e.created_at) from cm.episodes e where e.work_id = w.id and (adm or e.published)), w.created_at) desc) r), '[]');
end $$;

create or replace function public.cm_work(p_id bigint, p_token text default null) returns json
language plpgsql security definer set search_path = '' as $$
declare adm boolean := cm.is_admin(p_token); r json;
begin
  select json_build_object('id', w.id, 'kind', w.kind, 'title', w.title, 'author', w.author, 'intro', w.intro, 'cover_url', w.cover_url, 'published', w.published,
    'episodes', coalesce((select json_agg(json_build_object('id', e.id, 'no', e.no, 'title', e.title, 'ref', e.ref, 'published', e.published,
        'thumb', e.images[1], 'views', e.views, 'created_at', e.created_at) order by e.no, e.id)
      from cm.episodes e where e.work_id = w.id and (adm or e.published)), '[]'))
  into r from cm.works w where w.id = p_id and (adm or w.published);
  return r;
end $$;

create or replace function public.cm_episode(p_id bigint, p_token text default null) returns json
language plpgsql security definer set search_path = '' as $$
declare adm boolean := cm.is_admin(p_token); e cm.episodes; r json;
begin
  select * into e from cm.episodes where id = p_id;
  if not found or not (adm or (e.published and exists (select 1 from cm.works w where w.id = e.work_id and w.published))) then return null; end if;
  if not adm then update cm.episodes set views = views + 1 where id = p_id; end if;
  select json_build_object('id', e.id, 'work_id', e.work_id, 'work_title', w.title, 'kind', w.kind, 'author', w.author,
    'no', e.no, 'title', e.title, 'ref', e.ref, 'body', e.body, 'video_url', e.video_url, 'images', e.images, 'published', e.published,
    'views', e.views + case when adm then 0 else 1 end, 'created_at', e.created_at,
    'prev', (select x.id from cm.episodes x where x.work_id = e.work_id and (adm or x.published) and (x.no, x.id) < (e.no, e.id) order by x.no desc, x.id desc limit 1),
    'next', (select x.id from cm.episodes x where x.work_id = e.work_id and (adm or x.published) and (x.no, x.id) > (e.no, e.id) order by x.no, x.id limit 1))
  into r from cm.works w where w.id = e.work_id;
  return r;
end $$;

create or replace function public.cm_work_save(p_token text, p_id bigint, p_kind text, p_title text, p_author text, p_intro text, p_cover_url text, p_published boolean) returns bigint
language plpgsql security definer set search_path = '' as $$
declare nid bigint;
begin
  if not cm.is_admin(p_token) then raise exception '관리자만 할 수 있습니다.' using errcode = 'P0001'; end if;
  if p_id is null then
    insert into cm.works(kind, title, author, intro, cover_url, published) values (p_kind, trim(p_title), trim(coalesce(p_author, '')), coalesce(p_intro, ''), nullif(p_cover_url, ''), coalesce(p_published, false)) returning id into nid;
  else
    update cm.works set kind = p_kind, title = trim(p_title), author = trim(coalesce(p_author, '')), intro = coalesce(p_intro, ''), cover_url = nullif(p_cover_url, ''), published = coalesce(p_published, false), updated_at = now() where id = p_id returning id into nid;
  end if;
  return nid;
end $$;

create or replace function public.cm_work_delete(p_token text, p_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not cm.is_admin(p_token) then raise exception '관리자만 할 수 있습니다.' using errcode = 'P0001'; end if;
  delete from cm.works where id = p_id;
end $$;

create or replace function public.cm_episode_save(p_token text, p_id bigint, p_work bigint, p_no int, p_title text, p_ref text, p_body text, p_video_url text, p_images text[], p_published boolean) returns bigint
language plpgsql security definer set search_path = '' as $$
declare nid bigint;
begin
  if not cm.is_admin(p_token) then raise exception '관리자만 할 수 있습니다.' using errcode = 'P0001'; end if;
  if p_id is null then
    insert into cm.episodes(work_id, no, title, ref, body, video_url, images, published)
      values (p_work, coalesce(p_no, (select coalesce(max(no), 0) + 1 from cm.episodes where work_id = p_work)), trim(p_title), trim(coalesce(p_ref, '')), coalesce(p_body, ''), nullif(p_video_url, ''), coalesce(p_images, '{}'), coalesce(p_published, false))
      returning id into nid;
  else
    update cm.episodes set no = coalesce(p_no, no), title = trim(p_title), ref = trim(coalesce(p_ref, '')), body = coalesce(p_body, ''), video_url = nullif(p_video_url, ''), images = coalesce(p_images, '{}'), published = coalesce(p_published, false), updated_at = now()
      where id = p_id returning id into nid;
  end if;
  update cm.works set updated_at = now() where id = p_work;
  return nid;
end $$;

create or replace function public.cm_episode_delete(p_token text, p_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not cm.is_admin(p_token) then raise exception '관리자만 할 수 있습니다.' using errcode = 'P0001'; end if;
  delete from cm.episodes where id = p_id;
end $$;

-- 업로드 함수(Edge Function)가 쓰는 관리자 확인. service_role만 부를 수 있다.
create or replace function public.cm_check_admin(p_token text) returns boolean
language sql security definer set search_path = '' as $$ select cm.is_admin(p_token) $$;

revoke all on function cm.is_admin(text) from public, anon, authenticated;
do $$ declare f text; begin
  for f in select p.oid::regprocedure::text from pg_proc p where p.pronamespace = 'public'::regnamespace
    and p.proname in ('cm_works','cm_work','cm_episode','cm_work_save','cm_work_delete','cm_episode_save','cm_episode_delete') loop
    execute 'revoke all on function ' || f || ' from public';
    execute 'grant execute on function ' || f || ' to anon, authenticated';
  end loop;
end $$;
revoke all on function public.cm_check_admin(text) from public, anon, authenticated;
grant execute on function public.cm_check_admin(text) to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cm-media', 'cm-media', true, 10485760, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;
