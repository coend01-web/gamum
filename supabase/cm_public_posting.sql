-- 누구나 새 공개 작품/회차 등록. 기존 작품/회차 수정·삭제 권한은 cm.can_manage 그대로 유지.
create or replace function cm.public_post_limit(p_scope text, p_max integer) returns void
language plpgsql set search_path = '' as $$
declare k text := 'public-post:' || p_scope || ':' || md5(cm.client_ip());
begin
  perform pg_advisory_xact_lock(hashtextextended(k, 0));
  perform cm.limit_hit(k, p_max, interval '1 day');
end $$;
revoke all on function cm.public_post_limit(text,integer) from public, anon, authenticated;

create or replace function public.cm_work_save(p_token text, p_id bigint, p_kind text, p_title text, p_author text, p_intro text, p_cover_url text, p_published boolean, p_days text[] default '{}') returns bigint
language plpgsql security definer set search_path = '' as $$
declare nid bigint; m cm.members := cm.who(p_token); d text[] := array(select x from unnest(coalesce(p_days, '{}')) x where x in ('월','화','수','목','금','토','일'));
begin
  if p_id is null then
    perform cm.public_post_limit('works', 10);
    insert into cm.works(kind,title,author,intro,cover_url,published,owner_id,days)
      values(p_kind,trim(p_title),coalesce(nullif(trim(coalesce(p_author,'')),''),m.nickname,'비회원'),coalesce(p_intro,''),nullif(p_cover_url,''),case when m.id is null then true else coalesce(p_published,false) end,m.id,d) returning id into nid;
  else
    if not cm.can_manage(p_token,p_id) then raise exception '이 작품을 고칠 권한이 없습니다.' using errcode='P0001'; end if;
    update cm.works set kind=p_kind,title=trim(p_title),author=trim(coalesce(p_author,'')),intro=coalesce(p_intro,''),cover_url=nullif(p_cover_url,''),published=coalesce(p_published,false),days=d,updated_at=now() where id=p_id returning id into nid;
  end if;
  return nid;
end $$;

create or replace function public.cm_episode_save(p_token text, p_id bigint, p_work bigint, p_no integer, p_title text, p_ref text, p_body text, p_video_url text, p_images text[], p_published boolean, p_gap integer default 1) returns bigint
language plpgsql security definer set search_path = '' as $$
declare nid bigint; g smallint := least(greatest(coalesce(p_gap,1),0),2); can boolean := cm.can_manage(p_token,p_work); pub boolean;
begin
  if p_id is null then
    select published into pub from cm.works where id=p_work for update;
    if not found or not (pub or can) then raise exception '공개된 작품에만 회차를 올릴 수 있습니다.' using errcode='P0001'; end if;
    if p_no is not null and p_no < 0 then raise exception '회차 번호를 확인하세요.' using errcode='P0001'; end if;
    if cardinality(coalesce(p_images,'{}')) > 60 then raise exception '그림은 60장까지 올릴 수 있습니다.' using errcode='P0001'; end if;
    -- 같은 요청 재전송은 이미 저장한 회차 ID를 돌려준다. 원본을 덮어쓰지 않는다.
    select id into nid from cm.episodes where work_id=p_work and no=coalesce(p_no,-1) and title=trim(p_title)
      and body=coalesce(p_body,'') and images=coalesce(p_images,'{}') order by id desc limit 1;
    if nid is not null then return nid; end if;
    if exists(select 1 from cm.episodes where work_id=p_work and no=coalesce(p_no,-1) and title=trim(p_title)) then
      raise exception '같은 번호와 제목의 회차가 이미 있습니다. 기존 회차를 확인하세요.' using errcode='P0001';
    end if;
    perform cm.public_post_limit('episodes',30);
    insert into cm.episodes(work_id,no,title,ref,body,video_url,images,published,gap)
      values(p_work,coalesce(p_no,(select coalesce(max(no),0)+1 from cm.episodes where work_id=p_work)),trim(p_title),trim(coalesce(p_ref,'')),coalesce(p_body,''),nullif(p_video_url,''),coalesce(p_images,'{}'),case when can then coalesce(p_published,false) else true end,g) returning id into nid;
  else
    if not can then raise exception '이 회차를 고칠 권한이 없습니다.' using errcode='P0001'; end if;
    update cm.episodes set no=coalesce(p_no,no),title=trim(p_title),ref=trim(coalesce(p_ref,'')),body=coalesce(p_body,''),video_url=nullif(p_video_url,''),images=coalesce(p_images,'{}'),published=coalesce(p_published,false),gap=g,updated_at=now()
      where id=p_id and work_id=p_work returning id into nid;
  end if;
  update cm.works set updated_at=now() where id=p_work;
  return nid;
end $$;

-- 이미지는 새 무작위 경로만 발급. 서버 함수만 이용하며 직접 저장소 쓰기 권한은 열지 않는다.
create or replace function public.cm_public_upload_allowance(p_ip text,p_files integer) returns boolean
language plpgsql security definer set search_path = '' as $$
declare k text := 'public-upload:' || md5(left(coalesce(nullif(p_ip,''),'unknown'),200)); i integer;
begin
  if p_files is null or p_files<1 or p_files>60 then raise exception '그림은 1~60장까지 올릴 수 있습니다.' using errcode='P0001'; end if;
  perform pg_advisory_xact_lock(hashtextextended(k,0));
  for i in 1..p_files loop perform cm.limit_hit(k,120,interval '1 day'); end loop;
  return true;
end $$;
revoke all on function public.cm_public_upload_allowance(text,integer) from public, anon, authenticated;
grant execute on function public.cm_public_upload_allowance(text,integer) to service_role;
revoke all on function public.cm_work_save(text,bigint,text,text,text,text,text,boolean,text[]) from public;
grant execute on function public.cm_work_save(text,bigint,text,text,text,text,text,boolean,text[]) to anon,authenticated;
revoke all on function public.cm_episode_save(text,bigint,bigint,integer,text,text,text,text,text[],boolean,integer) from public;
grant execute on function public.cm_episode_save(text,bigint,bigint,integer,text,text,text,text,text[],boolean,integer) to anon,authenticated;
