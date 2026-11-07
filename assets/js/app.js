(() => {
'use strict';
const $ = s => document.querySelector(s);
const root = $('#app');
const seed = window.GAMUM_DEMO;
const state = { programs:seed.programs, centers:seed.centers, sessions:seed.sessions, sync:{}, page:'home', quizStep:0, answers:{}, selectedTags:[], sortOrder:'date', selectedRegion:'경기', mode:window.matchMedia?.('(max-width:680px)').matches?'buttons':'map', month:new Date().getMonth(), year:new Date().getFullYear(), selectedDay:null, qrStage:'auto', demoOverrides:{}, hasApi:false };
state.demoConvent = {
 house:'은총의 뜰 (가상 수도회)', title:'처음 만나는 침묵 피정', intro:'기도와 침묵 안에서 한 걸음 쉬어 가는 하루입니다.', audience:'성인 신자', region:'경기', tag:'침묵', fee:'35000', phone:'', apply:'',
 date:new Date(Date.now()+25*86400000).toISOString().slice(0,10), capacity:'24', regStart:new Date().toISOString().slice(0,10), regEnd:new Date(Date.now()+23*86400000).toISOString().slice(0,10), application:'담당자에게 문의'
};
state.demoStep=0;
state.demoCreatedId=null;
const themes = [
 ['내 마음의 필요',['쉼','침묵','말씀','관계','식별','화해','기도','자연']],
 ['피정 방식',['개인','나눔','걷기','관상','묵상','체험','공동체','자유']],
 ['특별한 주제',['영신수련','성경','청년','청소년','가족','대림','전례','초심자']]
];
const regions=['서울','경기','인천','강원','충북','충남','대전','세종','전북','광주','전남','경북','대구','경남','부산','울산','제주'];
const regionPoints={서울:[39,22],인천:[29,26],경기:[46,28],강원:[70,22],충북:[55,42],충남:[38,47],대전:[49,54],세종:[42,41],전북:[41,67],광주:[36,81],전남:[40,90],경북:[70,57],대구:[67,75],경남:[58,86],부산:[76,91],울산:[82,80],제주:[24,95]};
const questions=window.GAMUM_QUIZ;
const recommendation=window.GAMUM_RECOMMEND;
state.conditions={};
const profiles = {
 '쉼':['숨을 고르는 사람','많은 것을 해내는 대신, 잠시 쉬어도 괜찮은 시간을 찾고 있군요.'],
 '침묵':['고요한 샘을 찾는 사람','조용한 공간에서 자신과 하느님의 목소리를 더 가까이 듣고 싶은 마음입니다.'],
 '말씀':['말씀의 빛을 찾는 사람','새로운 배움과 성경의 언어로 일상을 다시 보고 싶은 마음입니다.'],
 '관계':['다정한 연결을 찾는 사람','함께 머무는 시간 속에서 사람과 관계의 의미를 되새겨 보고 싶군요.'],
 '자연':['길 위에서 쉬어 가는 사람','풍경 속에서 걸으며 마음의 속도를 조금 늦추는 시간이 어울립니다.'],
 '식별':['나만의 길을 찾는 사람','삶의 선택과 방향을 조용히 돌아보고 싶은 마음입니다.'],
 '기도':['기도의 자리를 찾는 사람','하느님 앞에 머물며 기도의 깊이를 조금 더 발견하고 싶은 마음입니다.'],
 '개인':['오롯한 시간을 찾는 사람','누군가의 속도에 맞추지 않고 자신의 걸음으로 머물고 싶은 마음입니다.']
};
Object.assign(profiles,{
 '성찰':['생각의 여백을 찾는 사람','책과 이야기처럼, 마음에 남은 생각을 천천히 펼쳐 보는 시간은 어떨까요?'],
 '경험':['새로운 순간을 만나는 사람','익숙한 일상에서 한 걸음 나와, 직접 느끼고 경험하는 시간을 찾아보세요.'],
 '시작':['작은 시작을 준비하는 사람','모든 것을 알지 못해도 괜찮아요. 안내를 따라 한 걸음 시작해 보세요.'],
 '열림':['나에게 맞는 시간을 찾는 사람','정해진 유형 없이, 편한 조건부터 골라보셔도 괜찮습니다.']
});
// 유형은 진단명이 아니라 지금의 머뭄을 묵상하도록 돕는 안내 카드입니다.
// 성경은 한국천주교주교회의 새번역의 짧은 발췌문과 공식 장 링크를 사용합니다.
// 정식 서비스에서 성경 본문을 게시하려면 주교회의의 저작권 사용 승인을 확인하세요.
const spiritualGuides = {
 '쉼': {
  opening:'많이 바빴을 당신에게',
  comfort:'해야 할 일과 누군가의 기대를 따라가느라, 정작 자신의 숨소리를 듣는 시간은 부족하지 않았나요? 당신에게 지금 필요한 것은 더 많은 성취가 아니라 잠시 앉아 있어도 괜찮은 자리일지 모릅니다. 쉬는 시간에도 무언가를 증명할 필요는 없습니다.',
  verse:'내가 너희에게 안식을 주겠다.', reference:'마태오 11,28', url:'https://bible.cbck.or.kr/Knb/Mt/11',
  saint:'성녀 마르타', saintStory:'손님을 맞느라 분주했던 마르타에게 예수님은 필요한 한 가지를 일깨워 주셨습니다(루카 10,38-42). 마르타의 성실함을 부정하기보다, 분주함 가운데 주님께 시선을 돌려 보라는 초대로 읽어 보세요.',
  question:'나는 언제부터 쉬는 순간에도 해야 할 일을 생각했을까요?',
  prayer:'주님, 서두르지 않아도 당신이 저를 받아 주심을 믿게 하소서.'
 },
 '침묵': {
  opening:'수많은 소리 속에서 나의 목소리를 잊은 당신에게',
  comfort:'하루는 이야기로 가득했는데, 마음은 오히려 비어 있는 것 같을 때가 있습니다. 조용함이 낯설더라도 괜찮습니다. 침묵은 아무 말도 하지 못하는 시간이 아니라, 무엇이 소중한지 다시 들을 수 있는 시간입니다.',
  verse:'내 안에 머물러라. 나도 너희 안에 머무르겠다.', reference:'요한 15,4', url:'https://bible.cbck.or.kr/Knb/Jn/15',
  saint:'아빌라의 성녀 데레사', saintStory:'데레사 성녀는 기도를 하느님과의 친밀한 만남으로 가르쳤고, 「영혼의 성」에서 내면의 여정을 이야기했습니다. 고요함을 잘하는 사람이 되기보다, 사랑받는 사람으로 머물러 보세요.',
  question:'오늘 잠시 침묵한다면 내 안에서 가장 먼저 들려올 말은 무엇일까요?',
  prayer:'주님, 침묵이 두려운 순간에도 당신의 현존 안에 머무르게 하소서.'
 },
 '말씀': {
  opening:'답을 서두르지 않고 찾고 있는 당신에게',
  comfort:'질문이 많은 사람은 믿음이 부족한 사람이 아닙니다. 오히려 무엇을 믿고 어떻게 살아야 할지 진지하게 고민하는 사람일 수 있습니다. 오늘 모든 답을 얻지 않아도 괜찮습니다. 말씀 한 문장이 오래도록 삶을 비추기도 하니까요.',
  verse:'우리 마음이 타오르지 않았던가!', reference:'루카 24,32', url:'https://bible.cbck.or.kr/Knb/Lk/24',
  saint:'성 예로니모', saintStory:'예로니모 성인은 성경 연구와 번역에 깊이 헌신했습니다. 성경을 많이 아는 것 자체보다 그 말씀을 통해 그리스도를 더 알아 가는 길을 떠올려 보세요.',
  question:'요즘 내가 하느님께 꼭 여쭙고 싶은 질문 하나는 무엇인가요?',
  prayer:'주님, 제 질문을 피하지 않고 말씀 안에서 당신을 만나게 하소서.'
 },
 '관계': {
  opening:'사람들 사이에서 마음이 바빴을 당신에게',
  comfort:'누군가를 이해하려 애쓰는 동안 자신의 마음은 돌보지 못했을지도 모릅니다. 모든 관계를 당장 회복할 필요는 없습니다. 먼저 있는 그대로의 마음을 바라보고, 작은 친절 하나를 다시 선택해도 충분합니다.',
  verse:'서로 사랑하여라.', reference:'요한 13,34', url:'https://bible.cbck.or.kr/Knb/Jn/13',
  saint:'성 빈첸시오 아 바오로', saintStory:'빈첸시오 성인은 어려운 이웃을 돌보는 구체적인 사랑을 실천했습니다. 거창한 관계의 해답보다, 오늘 내 곁의 한 사람에게 건넬 작은 마음을 생각해 보세요.',
  question:'누구에게 좋은 사람이 되려 애쓰느라 내 마음을 놓쳤을까요?',
  prayer:'주님, 저와 이웃을 조금 더 부드러운 눈으로 바라보게 하소서.'
 },
 '자연': {
  opening:'바쁘게 걷다가 풍경을 놓쳤을 당신에게',
  comfort:'어디를 향해 가는지만 생각하다 보면 지금 발 딛고 선 땅을 잊기 쉽습니다. 잠깐 고개를 들고 바람을 느껴 보세요. 오늘은 멀리 가지 않아도, 작은 풍경 하나가 마음을 다시 열어 줄 수 있습니다.',
  verse:'잔잔한 물가로 나를 이끄시어', reference:'시편 23,2', url:'https://bible.cbck.or.kr/Knb/Ps/23',
  saint:'아시시의 성 프란치스코', saintStory:'프란치스코 성인은 피조물을 형제자매처럼 바라보며 창조주를 찬미했습니다. 주변 풍경을 소비할 대상이 아니라 함께 살아가는 선물로 바라보는 시간을 가져 보세요.',
  question:'내 마음이 편안해졌던 마지막 풍경은 어디였나요?',
  prayer:'주님, 당신께서 지으신 세상의 작은 아름다움을 다시 보게 하소서.'
 },
 '식별': {
  opening:'중요한 선택 앞에 서 있는 당신에게',
  comfort:'빨리 결정해야 한다는 말이 오히려 마음을 복잡하게 만들 수 있습니다. 아직 방향을 정하지 못했어도 괜찮습니다. 식별은 정답을 맞히는 시험이 아니라 마음의 움직임을 찬찬히 살피는 여정입니다.',
  verse:'당신 말씀은 제 발에 등불, 저의 길에 빛입니다.', reference:'시편 119,105', url:'https://bible.cbck.or.kr/Knb/Ps/119',
  saint:'로욜라의 성 이냐시오', saintStory:'이냐시오 성인은 자신의 삶을 돌아보며 마음의 움직임을 식별하는 길을 발전시켰습니다. 선택을 서두르기보다 무엇이 하느님과 이웃을 향한 자유를 넓히는지 살펴보세요.',
  question:'두려움이 없다면, 나는 어떤 선택을 조용히 바라보게 될까요?',
  prayer:'주님, 조급함보다 자유로움 안에서 한 걸음을 선택하게 하소서.'
 },
 '기도': {
  opening:'기도하고 싶은데 말이 떠오르지 않는 당신에게',
  comfort:'기도를 잘해야 한다는 부담 때문에 오히려 기도를 미루기도 합니다. 아무런 감흥이 없어도 괜찮습니다. 마음에 있는 한마디를 그대로 올려드리는 것에서 시작해 보세요. 하느님 앞에 머무는 시간은 성적표가 아닙니다.',
  verse:'끊임없이 기도하십시오.', reference:'1테살 5,17', url:'https://bible.cbck.or.kr/Knb/1Thes/5',
  saint:'소화 데레사 성녀', saintStory:'소화 데레사 성녀는 일상의 작은 사랑과 신뢰로 하느님께 나아가는 길을 보여 주었습니다. 오늘의 기도도 대단한 말보다 솔직한 마음에서 시작할 수 있습니다.',
  question:'지금 하느님께 가장 솔직하게 드리고 싶은 한마디는 무엇인가요?',
  prayer:'주님, 멋진 말이 없어도 제 마음을 있는 그대로 받아 주소서.'
 },
 '개인': {
  opening:'모두를 위해 시간을 내느라 나를 잊었을 당신에게',
  comfort:'많은 사람의 속도에 맞추느라 자신의 걸음은 늦춰 두지 않았나요? 잠시 혼자 있는 것은 누군가를 밀어내는 일이 아닙니다. 오롯한 시간 안에서 자신과 하느님을 다시 만날 수 있습니다. 무엇을 해내지 않는 시간도 소중합니다.',
  verse:'너희는 따로 외딴곳으로 가서 좀 쉬어라.', reference:'마르코 6,31', url:'https://bible.cbck.or.kr/Knb/Mk/6',
  saint:'성 샤를 드 푸코', saintStory:'샤를 드 푸코 성인은 나자렛의 숨은 삶과 기도를 깊이 사랑했고, 사하라에서 사람들의 형제가 되어 살고자 했습니다. 혼자 머무는 시간이 다시 누군가와 만날 힘을 기르는 시간일 수도 있습니다.',
  question:'누구의 기대도 없는 오늘, 나는 어떻게 나 자신을 돌보고 싶나요?',
  prayer:'주님, 제 걸음이 느리더라도 그 안에서 당신을 만나게 하소서.'
 }
};
// New everyday headings reuse the existing, sourced spiritual readings; they do not assign a tradition.
for(const [key,source] of Object.entries({'성찰':'말씀','경험':'자연','시작':'기도','열림':'쉼'}))spiritualGuides[key]={...spiritualGuides[source]};
const saintSources={"쉼": "https://bible.cbck.or.kr/Knb/Lk/10", "침묵": "https://www.vatican.va/content/benedict-xvi/en/audiences/2011/documents/hf_ben-xvi_aud_20110202.html", "말씀": "https://www.vatican.va/content/benedict-xvi/en/audiences/2007/documents/hf_ben-xvi_aud_20071107.html", "관계": "https://press.vatican.va/content/salastampa/en/bollettino/pubblico/2017/03/15/holy.html", "자연": "https://www.vatican.va/content/benedict-xvi/en/audiences/2010/documents/hf_ben-xvi_aud_20100127.html", "식별": "https://www.vatican.va/content/francesco/en/audiences/2022/documents/20220907-udienza-generale.html", "기도": "https://www.vatican.va/content/benedict-xvi/en/audiences/2011/documents/hf_ben-xvi_aud_20110406.html", "개인": "https://www.vatican.va/content/francesco/en/audiences/2023/documents/20231018-udienza-generale.html"};
for(const [key,source] of Object.entries({'성찰':'말씀','경험':'자연','시작':'기도','열림':'쉼'}))saintSources[key]=saintSources[source];
function miniRetreat(profileKey) {
 const g=spiritualGuides[profileKey]||spiritualGuides['쉼'];
 return `<section class="guided-retreat" id="my-moment" aria-label="나를 위한 짧은 머뭄">
 <div class="guide-heading"><span class="guide-overline">가뭄의 작은 피정 · 약 1~2분</span><h2>지금 여기서, 잠시 머물러 보세요</h2><p>읽는 것만으로도 괜찮습니다. 서두르지 않아도 됩니다.</p></div>
 <article class="guide-card guide-comfort"><span class="guide-step">01 <b>마음을 다독이는 말</b></span><h3>${safe(g.opening)}</h3><p>${safe(g.comfort)}</p></article>
 <article class="guide-card guide-word"><span class="guide-step">02 <b>오늘의 말씀</b></span><blockquote>“${safe(g.verse)}”</blockquote><div class="scripture-foot"><strong>${safe(g.reference)}</strong><a href="${g.url}" target="_blank" rel="noopener noreferrer">성경 본문 읽기 ↗</a></div><p class="subtle">한국천주교주교회의 『성경』 새번역에서 짧게 발췌했습니다.</p></article>
 <article class="guide-card guide-saint"><span class="guide-step">03 <b>오늘의 영적 길동무</b></span><h3>${safe(g.saint)}</h3><p>${safe(g.saintStory)}</p><a class="source-link" href="${saintSources[profileKey]||saintSources['쉼']}" target="_blank" rel="noopener noreferrer">성인 이야기 출처 읽기 ↗</a><p class="subtle">출처를 바탕으로 쓴 묵상 안내입니다. 성격이나 신앙을 판정하는 검사가 아닙니다.</p></article>
 <article class="guide-card guide-pause"><span class="guide-step">04 <b>잠깐 머무르기</b></span><p class="guide-instruction">말씀을 한번 더 읽고, 이 질문을 마음에 담아보세요.</p><div class="reflection-question">${safe(g.question)}</div><div class="quiet-prayer"><strong>짧은 기도</strong><p>${safe(g.prayer)}</p></div><p class="subtle">묵상한 내용이나 개인적인 답변은 저장하지 않습니다.</p><button class="primary guided-next" ${state.page==='result'?'data-action="nav" data-to="themes"':'data-action="jump-section" data-target="suggested-retreats"'}>나에게 어울리는 머뭄•피정 보기 ↓</button></article>
 </section>`;
}
const safe = v => String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad = n => String(n).padStart(2,'0');
const localDate = v => new Date(v);
const dformat = v => {let d=localDate(v);return `${d.getMonth()+1}월 ${d.getDate()}일`};
const dateLong = v => {let d=localDate(v);return `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일`};
const isoDay = v => {const d=localDate(v);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};
const fee = p => p.fee===0?'무료':`${p.fee.toLocaleString('ko-KR')}원`;
const center = p => state.centers.find(c=>c.id===p.placeId);
const prog = s => state.programs.find(p=>p.id===s.programId);
const sessionsFor = id => state.sessions.filter(s=>s.programId===id).sort((a,b)=>localDate(a.start)-localDate(b.start));
const upcoming = s => localDate(s.end).getTime() >= Date.now();
const sessionsUpcoming = () => state.sessions.filter(upcoming).sort((a,b)=>localDate(a.start)-localDate(b.start));
const getSync = s => state.demoOverrides[s.id] || state.sync[s.id];
function availability(s){
 const now=Date.now();
 if(localDate(s.end).getTime()<now) return {label:'종료',tone:'closed',precise:false};
 if(localDate(s.applicationStart).getTime()>now) return {label:'접수 예정',tone:'upcoming',precise:false};
 if(localDate(s.applicationEnd).getTime()<now) return {label:'접수 기간 종료',tone:'closed',precise:false};
 if(s.manualState==='closed') return {label:'모집 마감',tone:'closed',precise:false};
 const sync=getSync(s);
 if(sync){
   const age=now-new Date(sync.syncedAt).getTime();
   if(Number.isFinite(age)&&age>=0&&age<=15*60*1000){
     if(sync.status==='closed'||sync.remaining===0)return {label:'모집 마감',tone:'closed',precise:true,sync};
     if(sync.status==='paused')return {label:'접수 일시중지',tone:'unknown',precise:true,sync};
     if(sync.status==='open'&&Number.isInteger(sync.remaining))return {label:'접수 중 · 자동 연동',tone:'linked',precise:true,sync};
   }
   return {label:'정보 확인 필요',tone:'unknown',precise:false,stale:true};
 }
 if(s.manualState==='open'&&Number.isFinite(new Date(s.lastConfirmed).getTime())&&now-new Date(s.lastConfirmed).getTime()>=0&&now-new Date(s.lastConfirmed).getTime()<=15*60*1000)return {label:'접수 중 · 기관 확인',tone:'linked',precise:true};
 return {label:'주최 측 확인 필요',tone:'unknown',precise:false};
}
function statusHtml(s){const a=availability(s);return `<span class="status ${a.tone}">${safe(a.label)}</span>`}
const entranceIcons = {
 discover:'<path d="M12 21s-8-5.5-8-11a4.5 4.5 0 0 1 8-2.7A4.5 4.5 0 0 1 20 10c0 5.5-8 11-8 11Z"/>',
 themes:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6m10-6v6M3 11h18m-13 5h2m4 0h2"/>',
 places:'<path d="M19 10c0 5-7 12-7 12S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/>'
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${entranceIcons[name]}</svg>`;
const audienceLabel = p => p.demoAudience || ({adult:'성인',youth:'청년',teen:'청소년',family:'가족',all:'누구나'}[p.audience] || '주최 측 확인 필요');
const dateRange = s => `${dateLong(s.start)}${isoDay(s.start)===isoDay(s.end)?'':` ~ ${dateLong(s.end)}`}`;
function card(p,s,reason){
 const c=center(p);s=s||sessionsFor(p.id).find(upcoming);if(!s)return '';const liked=isFav('program',p.id);
 return `<article class="retreat-card"><div class="art"><span class="art-tag">시연용 프로그램</span><button class="bookmark-fab ${liked?'saved':''}" data-action="toggle-favorite" data-kind="program" data-id="${p.id}" aria-pressed="${liked}" aria-label="${safe(p.title)} ${liked?'서랍에서 삭제':'서랍에 담기'}">${liked?'♥ 담았어요':'♡ 저장'}</button></div>
 <div class="retreat-card-body"><div class="card-meta">${safe(c.organization)}</div><h3><a class="card-title" href="#program/${p.id}">${safe(p.title)}</a></h3><div class="pill-line">${p.tags.slice(0,3).map(t=>`<span class="chip sm">${safe(t)}</span>`).join('')}</div>
 ${reason?`<p class="match-explain">추천 이유 · ${safe(reason)}</p>`:''}
 <dl class="card-facts"><div><dt>날짜</dt><dd>${dateRange(s)}</dd></div><div><dt>장소</dt><dd>${safe(c.region)} · ${safe(c.name)}</dd></div><div><dt>대상</dt><dd>${safe(audienceLabel(p))}</dd></div></dl>
 <div class="card-footer"><div class="price">${fee(p)}<small>참가비 예시</small></div>${statusHtml(s)}</div>
 <p class="card-contact">연락처 · ${safe(p.demoPhone||'미등록')}<br/>신청 · ${p.demoLink?'기관 링크 입력됨 (시연)':'주최 기관 직접 접수 · 신청처 미등록'}</p>
 <a class="card-cta" href="#program/${p.id}">일정·신청 안내 보기 <span aria-hidden="true">↗</span></a></div></article>`;
}
function resultsCards(items){if(items.length===0)return `<div class="empty"><strong>조건에 맞는 머뭄•피정을 찾지 못했어요.</strong>다른 주제·날짜·지역을 선택하면 새로운 프로그램을 볼 수 있습니다.<br/><small>현재 모든 데이터는 가상 예시입니다.</small></div>`;return `<div class="card-grid">${items.map(({p,s,reason})=>card(p,s,reason)).join('')}</div>`}
function distinctResults(ss){const used=new Set;const res=[];for(const s of ss){if(!used.has(s.programId)){used.add(s.programId);res.push({p:prog(s),s})}}return res}
function pageTop(title,description,kicker='머뭄•피정'){return `<section class="page-top"><a class="back-link" href="#home">← 가뭄 홈</a><div class="eyebrow" style="margin-top:24px">${kicker}</div><h1>${title}</h1><p>${description}</p></section>`}
// 사용자 개인의 '서랍'만 브라우저에 저장합니다. 입력한 질문 답변이나 묵상 내용은 저장하지 않습니다.
const STORAGE_KEY='gamum-demov05-stays';
function readStore(){try{const d=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');return d&&typeof d==='object'?{visits:Number(d.visits)||0,favorites:Array.isArray(d.favorites)?d.favorites.filter(x=>x&&['program','word','result'].includes(x.kind)&&typeof x.id==='string').slice(0,120):[]}: {visits:0,favorites:[]}}catch{return {visits:0,favorites:[]}}}
const store=readStore();store.visits+=1;
function writeStore(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(store));return true}catch{return false}}
writeStore();
function favoriteCount(){return store.favorites.length}
function isFav(kind,id){return store.favorites.some(x=>x.kind===kind&&x.id===id)}
function toggleFav(kind,id){const index=store.favorites.findIndex(x=>x.kind===kind&&x.id===id);let added=false;if(index>=0){store.favorites.splice(index,1)}else{store.favorites.unshift({kind,id,date:new Date().toISOString()});added=true}const ok=writeStore();render();toast(!ok?'이 환경에서는 기기 저장이 제한될 수 있어요.':added?'나의 머뭄 서랍에 담았어요.':'서랍에서 꺼냈어요.');return added}
const moodGuides={
 'tired':{name:'지쳤어요',symbol:'☁',title:'많이 애썼을 당신에게',comfort:'하루의 무게를 견디느라 자신을 돌아볼 틈이 없었을지도 모릅니다. 지금 이 순간만큼은 무언가를 증명하지 않아도 좋겠습니다.',reference:'마태오 11,28',scripture:'예수님께서는 수고하고 무거운 짐을 진 이들을 당신께 초대하십니다.',question:'오늘 내가 내려놓아도 괜찮을 짐 하나는 무엇인가요?',prayer:'주님, 모든 것을 다 해내지 못한 오늘도 당신 앞에서 쉬게 하소서.'},
 'tangled':{name:'마음이 복잡해요',symbol:'◌',title:'답을 찾지 못한 당신에게',comfort:'해결해야 할 일들이 한꺼번에 밀려와도, 모든 답을 오늘 내릴 필요는 없습니다. 잠시 한 가지 생각만 내려놓아 보세요.',reference:'요한 14,27',scripture:'예수님께서는 당신의 평화를 제자들에게 남겨 주십니다.',question:'지금 내 마음을 가장 소란스럽게 하는 것은 무엇인가요?',prayer:'주님, 저의 복잡한 마음 안에도 당신의 평화를 허락하소서.'},
 'lonely':{name:'외로워요',symbol:'♡',title:'혼자라고 느끼는 당신에게',comfort:'때로는 많은 사람과 함께 있어도 마음이 외로울 수 있습니다. 그 마음을 숨기지 않아도 괜찮습니다. 오늘은 하느님께 있는 그대로 말씀드려 보세요.',reference:'이사야 43,1-4',scripture:'하느님께서 당신 백성을 귀하게 여기시고 사랑하신다는 말씀을 떠올려 보세요.',question:'지금 내게 가장 듣고 싶은 말은 무엇인가요?',prayer:'주님, 저의 외로움 안에서도 당신의 사랑을 기억하게 하소서.'},
 'grateful':{name:'감사해요',symbol:'☼',title:'오늘의 선물을 기억하는 당신에게',comfort:'기쁜 마음을 대수롭지 않게 지나치지 않아도 됩니다. 이 감사가 어디서 왔는지 잠시 떠올려 보세요.',reference:'1테살로니카 5,18',scripture:'바오로 사도는 모든 일에 감사하라고 권고합니다.',question:'오늘 내게 주어진 작은 선물 하나는 무엇인가요?',prayer:'주님, 익숙한 하루에 숨어 있는 은총을 알아보게 하소서.'}
};
state.mood='tired';state.momentOpen=false;state.momentStep=0;state.momentFinished=false;state.momentExpanded=true;
function momentReading(g){
 const step=state.momentStep||0;
 const pages=[`<span class="step-label">01 / 04 · 마음을 다독이는 말</span><h3>${safe(g.title)}</h3><p>${safe(g.comfort)}</p>`,
 `<span class="step-label">02 / 04 · 오늘의 말씀</span><div class="reading-verse"><h3>${safe(g.reference)}</h3><p>${safe(g.scripture)}</p><p class="gentle-note">성경을 바탕으로 쓴 묵상 안내입니다. 성경 원문 인용은 아닙니다.</p></div>`,
 `<span class="step-label">03 / 04 · 잠시 묵상하기</span><p class="reading-reflect">${safe(g.question)}</p><p>답을 적지 않아도 괜찮습니다.<br/>잠시 마음에 머물러 보세요.</p>`,
 `<span class="step-label">04 / 04 · 짧은 기도</span><h3>이 마음을 주님께</h3><p class="reading-reflect">${safe(g.prayer)}</p><div class="moment-actions"><button class="secondary small" data-action="save-word" data-id="${safe(state.mood)}">${isFav('word',state.mood)?'✓ 서랍에 담았어요':'♡ 말씀·묵상 담기'}</button><button class="secondary small" data-action="copy-moment" data-id="${safe(state.mood)}">↗ 친구에게 나누기</button></div>`];
 return `<div class="moment-progress" aria-hidden="true">${pages.map((_,i)=>`<i class="${i<=step?'done':''}"></i>`).join('')}</div>${pages[step]}<div class="moment-navigation"><button class="text-btn" data-action="moment-back" ${step===0?'disabled':''}>← 이전</button><button class="primary" data-action="${step<3?'moment-next':'moment-finish'}">${step<3?'다음으로 →':'머뭄 마치기'}</button></div>`;
}
function momentView(){const g=moodGuides[state.mood];return `<section class="fan-section compact-moment" id="one-minute" aria-label="오늘, 1분 머뭄"><div id="moment-disclosure"><div class="moment-heading"><span class="moment-summary-copy"><strong>오늘, 1분 머뭄</strong><span>피정을 떠나지 않는 날에도, 잠깐의 고요.</span></span></div><div class="moment-layout ${state.momentOpen?'reading-open':''}"><div class="moment-pick"><h3>오늘 내 마음의 날씨는?</h3><div class="mood-grid">${Object.entries(moodGuides).map(([key,m])=>`<button class="mood-opt ${state.mood===key?'active':''}" data-action="select-mood" data-id="${key}" aria-pressed="${state.mood===key}"><span aria-hidden="true">${m.symbol}</span>${m.name}</button>`).join('')}</div><button class="primary" data-action="open-moment">${state.momentOpen?'처음부터 다시 머물기':'1분 머뭄 시작'} ↗</button></div>${state.momentOpen?`<div class="moment-reading" tabindex="-1" aria-label="1분 머뭄 읽기">${momentReading(g)}</div>`:state.momentFinished?'<p class="moment-finished">오늘도, 잘 머물렀습니다. 잠깐의 고요가 당신의 하루에 함께하기를 바랍니다.</p>':''}</div></div></section>`}

function faqView(){return `<div class="soft-accordion"><details><summary>혼자 가도 괜찮을까요?</summary><p>많은 피정은 개인으로 참여할 수 있지만 프로그램마다 참가 조건이 다릅니다. '개인 참가 가능'과 '단체 신청 전용'을 구분해서 안내할 예정입니다.</p></details><details><summary>신앙생활을 오래 쉬었는데 참여할 수 있나요?</summary><p>그럴 수 있습니다. 다만 프로그램별 대상·전제 조건이 다르므로 신청 전에 내용을 확인하세요. 가뭄은 처음 참여하는 분에게도 이해하기 쉬운 설명을 지향합니다.</p></details><details><summary>침묵 피정에서는 무엇을 하나요?</summary><p>보통 일정 시간 대화를 줄이고 기도와 말씀 묵상에 집중합니다. 미사, 강의, 개별 면담 여부는 피정마다 다르므로 상세 페이지에서 확인하세요.</p></details><details><summary>신청·참가비는 어디서 처리하나요?</summary><p>현재 시연판에는 실제 신청 기능이 없습니다. 정식 서비스 초기에는 각 수도회가 안내하는 공식 신청처와 납부 방식으로 연결하는 것을 목표로 합니다.</p></details></div>`}
function shelfView(){return `${pageTop('나의 머뭄 서랍','한 번 마음에 닿았던 말씀과 피정을 다시 만나는 자리입니다.','MY STAY COLLECTION')}${store.favorites.length?`<div class="shelf-items">${store.favorites.map(f=>{
 if(f.kind==='program'){const p=state.programs.find(x=>x.id===f.id);if(!p)return '';const c=center(p);return `<article class="shelf-item"><div><span class="eyebrow">가보고 싶은 머뭄 · 시연용</span><strong>${safe(p.title)}</strong><p>${safe(c?.name||'')} · ${safe(p.tags.slice(0,3).join(' · '))}</p></div><div class="button-row"><button class="primary small" data-action="program" data-id="${safe(p.id)}">피정 보기</button><button class="secondary small" data-action="toggle-favorite" data-kind="program" data-id="${safe(p.id)}">삭제</button></div></article>`}
 if(f.kind==='word'){const g=moodGuides[f.id];if(!g)return '';return `<article class="shelf-item"><div><span class="eyebrow">내 마음에 남긴 말씀</span><strong>${safe(g.title)}</strong><p>${safe(g.reference)} · ${safe(g.question)}</p></div><div class="button-row"><button class="primary small" data-action="open-saved-moment" data-id="${safe(f.id)}">다시 묵상</button><button class="secondary small" data-action="toggle-favorite" data-kind="word" data-id="${safe(f.id)}">삭제</button></div></article>`}
 if(f.kind==='result'){const p=profiles[f.id];if(!p)return '';return `<article class="shelf-item"><div><span class="eyebrow">나의 머뭄 발견</span><strong>${safe(p[0])}</strong><p>${safe(p[1])}</p></div><div class="button-row"><button class="primary small" data-action="nav" data-to="result?p=${encodeURIComponent(f.id)}">다시 읽기</button><button class="secondary small" data-action="toggle-favorite" data-kind="result" data-id="${safe(f.id)}">삭제</button></div></article>`}
 return ''}).join('')}</div>`:`<div class="shelf-empty"><div style="font-size:40px;color:#72957c" aria-hidden="true">♡</div><h2>아직 담아둔 머뭄이 없어요.</h2><p>마음에 남은 말씀이나 가보고 싶은 피정을 저장해 보세요.<br/>한 번 담아둔 곳에서 다음 머뭄을 시작할 수 있습니다.</p><button class="primary" data-action="nav" data-to="home">첫 화면에서 시작하기 ↗</button></div>`}<div class="shelf-note"><strong>시연판 저장 안내</strong><br/>이 서랍은 회원 계정이나 서버가 아니라 현재 사용하는 브라우저의 저장 공간에만 보관됩니다. 다른 기기로 자동 동기화되지 않고 브라우저 데이터를 지우면 없어질 수 있습니다. 10문항 답변과 개인 묵상 내용은 자동 저장하지 않습니다.</div>`}
function wordSaveButton(id){return `<button class="secondary small" data-action="toggle-favorite" data-kind="result" data-id="${safe(id)}">${isFav('result',id)?'✓ 내 서랍에 담겼어요':'♡ 이 결과를 서랍에 담기'}</button>`}
async function shareText(text){try{if(navigator.share && location.protocol!=='file:'){await navigator.share({title:'가뭄 · 머뭄',text});return}}catch(e){if(e.name==='AbortError')return;}try{await navigator.clipboard.writeText(text);toast('나눌 문장을 복사했어요.');return}catch{}try{const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.left='-9999px';document.body.appendChild(ta);ta.select();const ok=document.execCommand('copy');ta.remove();if(ok){toast('나눌 문장을 복사했어요.');return}}catch{}toast('이 브라우저에서 복사가 제한됩니다.');}
function wrapLines(ctx,text,x,y,maxWidth,lineHeight,maxLines){let line='',count=0;const words=Array.from(text);for(const char of words){if(ctx.measureText(line+char).width>maxWidth && line){ctx.fillText(line,x,y);y+=lineHeight;count++;line=''}line+=char;if(count>=maxLines-1)break;}if(line)ctx.fillText(line,x,y);return y+lineHeight;}
async function exportResultCard(key){const p=profiles[key]||profiles['쉼'],g=spiritualGuides[key]||spiritualGuides['쉼'];const c=document.createElement('canvas');c.width=1080;c.height=1350;const a=c.getContext('2d');a.fillStyle='#F2F4EB';a.fillRect(0,0,1080,1350);a.fillStyle='#D6E2D5';a.beginPath();a.arc(900,150,265,0,2*Math.PI);a.fill();a.strokeStyle='#9BB19E';a.lineWidth=3;a.strokeRect(45,45,990,1260);a.textAlign='center';a.fillStyle='#3B624C';a.font='700 40px sans-serif';a.fillText('가뭄 · 가톨릭 머뭄',540,160);a.fillStyle='#6E8C77';a.font='700 31px sans-serif';a.fillText('나의 머뭄 발견',540,325);a.fillStyle='#2C513E';a.font='700 64px sans-serif';let y=wrapLines(a,p[0],540,425,890,87,3);a.font='35px sans-serif';a.fillStyle='#4E6C5B';y=wrapLines(a,p[1],540,y+66,820,59,4);a.strokeStyle='#BDD0C0';a.lineWidth=2;a.beginPath();a.moveTo(230,885);a.lineTo(850,885);a.stroke();a.fillStyle='#6D7F71';a.font='29px sans-serif';a.fillText('함께 읽을 성경',540,970);a.font='700 46px sans-serif';a.fillStyle='#2A5040';a.fillText(g.reference,540,1050);a.font='30px sans-serif';a.fillStyle='#657E69';a.fillText('마음의 여정, 머뭄에서 시작되다',540,1190);const filename=`gamum-my-stay-${key}.png`;return new Promise(resolve=>{c.toBlob(blob=>{if(!blob){toast('이미지 생성에 실패했어요.');resolve(false);return}const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);toast('결과 카드를 이미지로 만들었어요.');resolve(true)},'image/png')})}

function home(){return `<section class="hero home-intro"><div class="hero-copy"><div class="eyebrow">가톨릭 머뭄 · GAMUM</div><h1>잠시,<br/><em>머물러도 괜찮습니다.</em></h1><p>당신에게 필요한 머뭄•피정을 찾아보세요.</p></div><figure class="hero-photo"><img src="assets/images/quiet-cloister.png" alt="부드러운 자연광이 드는 고요한 회랑과 작은 정원. AI로 만든 분위기 이미지입니다." width="1536" height="1024" fetchpriority="high"/><figcaption>AI 분위기 이미지 · 실제 시설 아님</figcaption></figure></section>
 <section id="find-stay" aria-label="네 가지 머뭄 탐색"><div class="section-head"><h2>어떤 길로 찾아볼까요?</h2></div>
 <div class="intro-grid">${[['discover','나를 찾아가는 머뭄','10개의 질문으로 내 마음부터'],['themes','주제로 찾는 머뭄','쉼·침묵·말씀, 끌리는 주제로'],['calendar','날짜로 찾는 머뭄','내가 머물 수 있는 날에'],['places','장소로 찾는 머뭄','가까운 곳부터, 원하는 지역으로']].map(([route,title,description])=>`<button class="entrance" data-action="nav" data-to="${route}"><span class="glyph">${icon(route)}</span><strong>${title}</strong><small>${description}</small><span class="arrow" aria-hidden="true">↗</span></button>`).join('')}</div></section>
 ${momentView()}`}
function guideView(){return `${pageTop('머뭄•피정이 처음이신가요?','거창한 준비보다 작은 궁금증을 풀어보세요.','이용 안내')}<section class="first-guide">${faqView()}</section><section class="guide-shelf-note"><h2>나의 머뭄 서랍</h2><p>말씀과 머뭄 결과, 가보고 싶은 피정을 한곳에 모아두세요. 다음에 오면 저장한 자리에서 다시 시작할 수 있습니다.</p><a href="#shelf" class="source-link">내 서랍 열기 ↗</a></section><section class="ad-slot" aria-label="성지순례 별도 광고 예시"><div><strong>성지순례, 또 다른 머뭄</strong><p>향후 검증된 성지순례 제휴 정보가 소개될 별도 공간입니다. 지금은 광고를 운영하지 않습니다.</p></div><span class="ad-label">광고·제휴 예정</span></section>`}

function recommend(){
 const catalog=recommendation.adaptLegacy(state.programs,state.sessions,state.centers,{...state.sync,...state.demoOverrides});
 return recommendation.recommend({questions,answers:state.answers,conditions:state.conditions,...catalog});
}
function quizQuestion(){const q=questions[state.quizStep],last=state.quizStep===questions.length-1;return `<span class="eyebrow">QUESTION ${pad(state.quizStep+1)}</span><h2 id="quiz-question" tabindex="-1">${safe(q.q)}</h2><div class="quiz-choices">${q.opts.map((o,i)=>`<button class="quiz-choice ${state.answers[state.quizStep]===i?'chosen':''}" data-action="quiz-answer" data-idx="${i}" aria-pressed="${state.answers[state.quizStep]===i}"><span>${safe(o.text)}</span><span aria-hidden="true">${state.answers[state.quizStep]===i?'✓':'↗'}</span></button>`).join('')}</div><div class="quiz-bottom"><button class="text-btn" data-action="quiz-back" ${state.quizStep===0?'disabled':''}>← 이전</button><button class="text-btn" data-action="quiz-skip">${last?'건너뛰고 결과 보기':'건너뛰기 →'}</button>${last?`<button class="primary" data-action="quiz-finish" ${state.answers[state.quizStep]===undefined?'disabled':''}>결과 보기</button>`:''}</div>`}
function quiz(){if(state.quizStep>=questions.length)return quizResults();return `<section class="quiz-page"><div class="quiz-intro"><a class="back-link" href="#home">← 피정 찾기</a><h1>나를 찾아가는 머뭄</h1><p>정답은 없어요. 지금의 마음에 가까운 답을 골라보세요.</p></div><div class="quiz"><div class="quiz-progress"><span>일상 속 작은 발견</span><strong>${state.quizStep+1} / 10</strong></div><div class="progress" role="progressbar" aria-label="질문 진행" aria-valuemin="0" aria-valuemax="10" aria-valuenow="${state.quizStep+1}"><div style="width:${(state.quizStep+1)*10}%"></div></div><div class="panel quiz-panel" aria-labelledby="quiz-question">${quizQuestion()}</div><p class="notice">심리·신앙 진단이 아니에요. 답변은 저장하지 않습니다.</p></div></section>`}
function updateQuizQuestion(){
 if(state.quizStep>=questions.length){render();root.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});return}
 const panel=$('.quiz-panel');if(!panel){render();return}const position=window.scrollY;
 panel.innerHTML=quizQuestion();$('.quiz-progress strong').textContent=`${state.quizStep+1} / 10`;
 $('.progress').setAttribute('aria-valuenow',state.quizStep+1);$('.progress div').style.width=`${(state.quizStep+1)*10}%`;
 $('#quiz-question').focus({preventScroll:true});window.scrollTo({top:position,behavior:'instant'});
}
function recommendationCard(item){const {p,s,reason,status}=item,liked=isFav('program',p.id);const external=url=>/^https?:\/\//i.test(url||'')?safe(url):null;
 return `<article class="retreat-card"><div class="art"><span class="art-tag">${p.demo?'가상 시연 프로그램':'공식 공고 확인'}</span><button class="bookmark-fab" data-action="toggle-favorite" data-kind="program" data-id="${safe(p.id)}" aria-label="${safe(p.title)} ${liked?'서랍에서 삭제':'서랍에 담기'}" aria-pressed="${liked}">${liked?'♥ 담았어요':'♡ 저장'}</button></div><div class="retreat-card-body"><div class="card-meta">${safe(p.organization)}</div><h3>${safe(p.title)}</h3><p class="match-explain">${safe(reason)}</p><dl class="card-facts"><div><dt>날짜</dt><dd>${dateRange(s)} (${recommendation.nights(s)}박)</dd></div><div><dt>장소</dt><dd>${safe(s.region)} · ${safe(s.place)}</dd></div><div><dt>대상</dt><dd>${safe(p.audience||'공고의 참가 자격 참고')}</dd></div><div><dt>참가비</dt><dd>${Number.isFinite(Number(s.fee))&&s.fee!==null?Number(s.fee).toLocaleString('ko-KR')+'원':'확인 필요'}${s.feeUnit==='person'?' / 1인':''}${p.demo?' · 가상 금액':''}</dd></div></dl><p class="status">${safe(status.label)}</p><p class="notice">${s.checkedAt?'모집 확인: '+safe(dateLong(s.checkedAt)):'모집 확인 시각 미등록'} · 참가 확정은 주최 측에서 안내합니다.</p><p class="card-contact">연락처 · ${safe(s.phone||'미등록 — 주최 측 확인 필요')}</p>${external(s.applicationUrl)?`<a class="card-cta" href="${external(s.applicationUrl)}" target="_blank" rel="noopener noreferrer">${p.demo?'입력된 신청 링크 (가상 시연)':'공식 신청 방법 확인'} ↗</a>`:'<p class="notice">신청 방법 · 공식 신청처 미등록</p>'}<a class="source-link" href="#session/${safe(s.id)}">회차 상세 보기 ↗</a></div></article>`;
}
function recommendationOptions(data){const c=state.conditions;const select=(key,label,entries,def='')=>`<label class="form-field" for="condition-${key}"><span>${label}</span><select name="${key}" id="condition-${key}">${entries.map(([v,t])=>`<option value="${safe(v)}" ${(c[key]??def)===v?'selected':''}>${t}</option>`).join('')}</select></label>`;
 const input=(key,label,type='number',attrs='')=>`<label class="form-field" for="condition-${key}"><span>${label}</span><input name="${key}" id="condition-${key}" type="${type}" value="${safe(c[key]??'')}" ${attrs}/></label>`;
 const check=(key,label)=>`<label class="check-field"><input type="checkbox" name="${key}" ${c[key]?'checked':''}/> ${label}</label>`;
 return `<section id="recommendation-options" class="recommendation-options" aria-labelledby="options-heading"><h2 id="options-heading">추천을 조금 더 정확하게</h2><p>선택 사항이에요. 날짜·지역·예산은 입력하면 꼭 지킬 조건이 됩니다. 질문은 다시 하지 않아도 돼요.</p><form id="recommendation-form"><div class="condition-grid">${select('region','지역',[['','어디든'],...regions.map(x=>[x,x])])}${input('dateFrom','가능한 첫날','date')}${input('dateTo','가능한 마지막 날','date')}${input('budget','1인당 전체 예산 상한 (원)','number','min="0" step="1000" inputmode="numeric"')}${select('duration','머물고 싶은 시간',Object.entries(recommendation.durationLabels),data.pref.duration)}${select('company','함께 떠날 사람',Object.entries(recommendation.companyLabels),data.pref.company)}</div><div class="condition-flags">${check('durationRequired','이 기간만 가능해요')}${check('companyRequired','이 동행 조건은 꼭 필요해요')}</div><details class="advanced-conditions" ${Object.keys(c).length?'open':''}><summary>참가 대상·숙박·경험·관심 영성 더 고르기</summary><div class="condition-grid">${select('mode','꼭 필요한 참여 방식',[['any','아직 정하지 않았어요'],['no-night','숙박 불가 (당일·통원·온라인)'],['daytime','당일만 가능'],['residential','숙박형'],['commuter','통원형'],['online','온라인']], 'any')}${input('age','본인 나이 (만 나이)','number','min="0" max="120" step="1" inputmode="numeric"')}${input('youngestAge','동행 중 가장 적은 나이','number','min="0" max="120" step="1" inputmode="numeric"')}${input('oldestAge','동행 중 가장 많은 나이','number','min="0" max="120" step="1" inputmode="numeric"')}${input('partySize','본인 포함 동행 인원','number','min="1" max="500" step="1" inputmode="numeric"')}${input('childAge','자녀 중 가장 어린 나이','number','min="0" max="17" step="1" inputmode="numeric"')}${select('gender','참가자 성별 (제한 확인용)',[['','미정·응답하지 않음'],['female','모두 여성'],['male','모두 남성'],['mixed','다양한 성별']])}${select('role','참가 대상',[['','미정·응답하지 않음'],['lay','평신도'],['clergy','성직자'],['religious','수도자']])}${select('married','혼인 조건',[['','미정·응답하지 않음'],['yes','배우자와 혼인 관계'],['no','해당하지 않음']])}${select('vocation','성소 관심자 전용 참여',[['','미정·응답하지 않음'],['yes','성소 관심자로 참여 희망'],['no','해당하지 않음']])}${select('faith','신앙 단계',[['','미정·응답하지 않음'],['baptized','세례받은 신자'],['catechumen','예비신자'],['other','그 외']])}${select('experience','피정 경험',[['','아직 알려주지 않았어요'],['first','이번이 처음'],['some','참여 경험 있음'],['advanced','심화 경험 있음']])}${input('courses','이수한 선행 과정명 (쉼표로 구분)','text','placeholder="주최가 요구하는 정확한 과정명"')}${select('interest','관심 영성',[['','잘 모르겠어요'],['scripture','말씀·성경'],['silence','침묵·관상'],['ignatian','영신수련·식별'],['eucharistic','성체조배'],['marian','성모신심'],['praise','찬양·성령'],['monastic','수도생활 체험'],['family','가족·관계'],['ecology','생태영성·봉사']])}</div>${check('minors','미성년 자녀도 함께해요')}<p class="notice">심화 경험이 있어도 특정 선행 과정을 이수한 것으로 간주하지 않아요. 입력한 조건은 이 화면에서만 사용하며 저장·공유하지 않습니다.</p></details><p id="condition-error" role="alert"></p><div class="button-row"><button class="primary" type="submit">이 조건으로 다시 찾기</button><button class="text-btn" type="button" data-action="reset-conditions">조건 넓혀 다시 찾기</button></div></form><p id="recommendation-update" tabindex="-1" role="status">현재 추천 ${data.items.length}개 · ${data.unconfirmed.length}개 회차는 참가 대상 확인 필요</p><a href="#suggested-retreats" class="source-link" data-action="jump-section" data-target="suggested-retreats">바뀐 추천 보기 ↑</a></section>`;
}
function quizResults(){const data=recommend(),profile=profiles[data.top]||profiles['쉼'];return `<div class="result-shell result-first"><section class="result-heading" aria-label="나의 머뭄 결과"><p class="result-kicker">일상 속 10가지 질문 · 나의 머뭄</p><h1>${safe(profile[0])}</h1><p class="result-summary">${safe(profile[1])}</p><p class="notice">지금의 마음을 돌아보는 안내이며 성격·신앙 판정이 아닙니다.</p></section><section id="suggested-retreats" class="suggested-retreats" aria-label="추천 머뭄 피정"><div class="section-head"><div><h2>조건에 맞는 머뭄 ${data.items.length}개</h2><p>확인된 참가 조건에 맞는 회차만 최대 3개 보여드려요.</p></div></div><p class="demo-data-note">현재 등록된 ${state.programs.length}개 프로그램과 일정은 모두 가상 시연 자료입니다. 실제 신청은 되지 않습니다.</p>${data.items.length?`<div class="card-grid">${data.items.map(recommendationCard).join('')}</div>`:`<div class="empty"><strong>지금은 참가 조건을 확인할 수 있는 추천이 없어요.</strong><p>${data.unconfirmed.length?'기존 가상 자료에 참가 자격·동행 허용·선행 조건이 빠져 있어 추천을 보류했어요.':'입력한 조건과 모집 일정을 함께 만족하는 회차가 없어요.'}</p><button class="secondary" data-action="jump-section" data-target="recommendation-options">조건 확인·조정하기 ↓</button></div>`}<p class="notice">${data.unconfirmed.length}개 회차: 참가 대상 확인 필요 · ${data.excluded.length}개 회차: 조건 불일치 또는 모집 종료. 확인되지 않은 자격과 잔여석을 임의로 채우지 않습니다.</p>${data.pref.answered===0?'<p class="notice">모든 질문을 건너뛰었어요. 편한 탐색 방법으로 둘러보세요.</p>':''}<div class="button-row"><button class="secondary" data-action="nav" data-to="themes">전체 피정 둘러보기</button><button class="text-btn" data-action="nav" data-to="calendar">날짜로 찾기</button></div><details class="recommendation-why"><summary>추천 기준 알아보기</summary><p>${data.likes.length?`답변에서 ${data.likes.map(safe).join(' · ')}에 관심이 나타났어요.`:'답변 없이도 참가 조건부터 확인할 수 있어요.'} 일상 선호는 특정 영성 전통으로 단정하지 않습니다. 참가 자격 확인을 먼저 하고, 확인된 특징 안에서만 순서를 정합니다.</p></details></section>${recommendationOptions(data)}${miniRetreat(data.top)}<details class="result-tools"><summary>결과 저장·공유와 다시 하기</summary><p class="notice">유형 문장과 묵상 안내만 저장해요. 답변·개인 조건·추천 목록은 저장하거나 공유하지 않습니다.</p><div class="button-row">${wordSaveButton(data.top)}<button class="secondary small" data-action="download-result" data-profile="${safe(data.top)}">↓ 결과 이미지 카드 저장</button><button class="secondary small" data-action="share-result" data-profile="${safe(data.top)}">친구에게 결과 문장 나누기 ↗</button><button class="text-btn" data-action="quiz-restart">10가지 질문 다시 하기</button></div></details></div>`;}

function sharedResult(profileKey){const p=profiles[profileKey]||profiles['쉼'];return `${pageTop('친구가 공유한 머뭄 이야기','이런 시간은 어떠세요? 나도 마음 여행을 시작할 수 있어요.','가뭄 공유 카드')}<div class="result-hero"><div class="big-icon">✦</div><h2>${safe(p[0])}</h2><p>${safe(p[1])}</p><button class="primary" data-action="nav" data-to="discover">나도 10가지 질문 해보기 ↗</button><div style="margin-top:13px">${wordSaveButton(profileKey)}</div></div>${miniRetreat(profileKey)}`}
function sortedItems(items){return [...items].sort((a,b)=>state.sortOrder==='fee-asc'?a.p.fee-b.p.fee:state.sortOrder==='fee-desc'?b.p.fee-a.p.fee:localDate(a.s.start)-localDate(b.s.start))}
function themesView(){const selected=state.selectedTags;const ss=sessionsUpcoming().filter(s=>selected.every(t=>prog(s).tags.includes(t)));return `${pageTop('주제로 찾는 머뭄•피정','지금 끌리는 주제를 자유롭게 골라보세요. 여러 가지를 함께 선택해도 괜찮습니다.','두 번째 입구')}<div class="panel" style="margin-top:23px">${themes.map(([title,tags])=>`<div class="category-group"><h3>${title}</h3><div class="tag-cloud">${tags.map(t=>`<button class="chip ${selected.includes(t)?'selected':''}" data-action="toggle-tag" data-tag="${safe(t)}" aria-pressed="${selected.includes(t)}">${safe(t)}</button>`).join('')}</div></div>`).join('')}<button class="text-btn" data-action="clear-tags">선택 초기화 ↺</button></div><div class="result-bar"><h2>조건에 맞는 머뭄 <span class="muted">${distinctResults(ss).length}</span></h2><label class="sort-control">정렬 <select id="retreatSort">${[['date','가까운 날짜순'],['fee-asc','낮은 참가비순'],['fee-desc','높은 참가비순']].map(([value,label])=>`<option value="${value}" ${state.sortOrder===value?'selected':''}>${label}</option>`).join('')}</select></label></div><p class="notice">선택한 주제를 모두 포함하는 시연 프로그램입니다.</p>${resultsCards(sortedItems(distinctResults(ss)))}`}
function calCells(){const first=new Date(state.year,state.month,1);const firstWeek=first.getDay();const count=new Date(state.year,state.month+1,0).getDate();let out='';for(let i=0;i<firstWeek;i++)out+='<div class="day empty-day"></div>';for(let day=1;day<=count;day++){const ymd=`${state.year}-${pad(state.month+1)}-${pad(day)}`;const has=sessionsUpcoming().some(s=>isoDay(s.start)<=ymd&&isoDay(s.end)>=ymd);out+=`<button class="day ${has?'has-session':''} ${state.selectedDay===ymd?'selected':''}" data-action="cal-day" data-date="${ymd}" aria-label="${state.year}년 ${state.month+1}월 ${day}일${has?' · 피정 있음':''}" aria-pressed="${state.selectedDay===ymd}"><span>${day}</span>${has?'<i class="dot"></i>':''}</button>`}return out}
function sessionPreview(s){const p=prog(s),c=center(p);return `<button class="mini-session" data-action="program" data-id="${p.id}"><div class="title-row"><strong>${safe(p.title)}</strong>${statusHtml(s)}</div><p>${safe(c.organization)}<br/>장소 · ${safe(c.region)} · ${safe(c.name)}<br/>날짜 · ${dateRange(s)}<br/>대상 · ${safe(audienceLabel(p))}</p><div class="price">${fee(p)} <span class="subtle">참가비 예시</span></div><p>연락처 · ${safe(p.demoPhone||'미등록')}<br/>신청 · 주최 기관 직접 접수 (시연)</p><span class="link-like">일정·신청 안내 보기 ↗</span></button>`}
function calendarView(){const selected=state.selectedDay;const monthFirst=`${state.year}-${pad(state.month+1)}-01`,monthLast=`${state.year}-${pad(state.month+1)}-${pad(new Date(state.year,state.month+1,0).getDate())}`;const ss=sessionsUpcoming().filter(s=>selected?isoDay(s.start)<=selected&&isoDay(s.end)>=selected:isoDay(s.end)>=monthFirst&&isoDay(s.start)<=monthLast);return `${pageTop('날짜로 찾는 머뭄•피정','내게 허락된 시간을 달력에서 골라보세요. 여러 날에 걸친 피정은 해당 날짜마다 표시됩니다.','세 번째 입구')}<div class="calendar-layout"><section class="panel"><div class="calendar-header"><button class="icon-btn" aria-label="이전 달" data-action="cal-prev">←</button><strong>${state.year}년 ${state.month+1}월</strong><button class="icon-btn" aria-label="다음 달" data-action="cal-next">→</button></div><div class="calendar-grid">${['일','월','화','수','목','금','토'].map(d=>`<span class="weekday">${d}</span>`).join('')}${calCells()}</div><div class="hr"></div><div class="button-row"><button class="secondary small" data-action="cal-reset">이번 달 전체 일정</button><span class="subtle">표시된 점: 해당 날짜에 진행되는 머뭄</span></div></section><section><div class="title-row"><h2 style="font-size:19px">${selected?`${selected.slice(5).replace('-','월 ')}일의 머뭄`: `${state.month+1}월의 머뭄`}</h2><strong>${ss.length}개 회차</strong></div><div class="mini-list">${ss.length?ss.map(sessionPreview).join(''):'<div class="empty">선택한 날짜에 등록된 시연 프로그램이 없습니다.</div>'}</div></section></div>`}
function placesView(){const reg=state.selectedRegion;const cs=state.centers.filter(c=>c.region===reg);const ss=sessionsUpcoming().filter(s=>center(prog(s)).region===reg);const small=state.mode==='buttons';return `${pageTop('장소로 찾는 머뭄•피정','어디에서 머무느냐도 중요하니까요. 지역을 한 번 선택하면 그곳의 예정된 피정을 바로 보여드립니다.','네 번째 입구')}<div class="places-layout"><section class="panel"><div class="title-row"><h2 style="font-size:19px">전국 지역 선택</h2><div class="button-row"><button class="secondary small" data-action="map-mode" data-mode="map" aria-pressed="${!small}">지도</button><button class="secondary small" data-action="map-mode" data-mode="buttons" aria-pressed="${small}">지역명</button></div></div><div class="region-tabs" style="margin-top:15px">${(small?[]:regions.slice(0,7)).map(r=>`<button class="region-tab ${reg===r?'active':''}" data-action="region" data-region="${r}" aria-pressed="${reg===r}">${r}</button>`).join('')}</div>${small?`<div class="region-tabs">${regions.map(r=>`<button class="region-tab ${reg===r?'active':''}" data-action="region" data-region="${r}" aria-pressed="${reg===r}">${r}</button>`).join('')}</div>`:`<div class="geo-schematic" aria-label="한국의 지역을 고르는 간략 위치도"><svg viewBox="0 0 300 400" aria-hidden="true"><path d="M111 23 L175 20 196 48 223 75 236 108 224 148 239 186 218 210 234 248 210 294 207 336 157 350 122 326 94 294 100 244 77 213 88 184 65 136 84 108 82 71Z" fill="#d4e4d7" stroke="#a8c6ad" stroke-width="2"/><path d="M47 358 C72 350 78 360 72 377 C53 386 38 369 47 358Z" fill="#d4e4d7" stroke="#a8c6ad" stroke-width="2"/></svg>${regions.map(r=>{const [x,y]=regionPoints[r];return `<button class="map-point ${reg===r?'active':''}" data-action="region" data-region="${r}" aria-pressed="${reg===r}" style="left:${x}%;top:${Math.min(y,94)}%">${r}</button>`}).join('')}</div><div class="map-note">위치 이해를 돕는 개략도입니다. 실제 행정 경계 지도는 정식 개발에서 적용합니다.</div>`}</section><section><div class="title-row"><h2 style="font-size:20px">${reg}의 머뭄•피정</h2><span class="subtle">장소 ${cs.length}곳 · 예정 회차 ${ss.length}개</span></div><div class="locations-list" style="margin-top:18px">${cs.length?cs.map(c=>{const items=ss.filter(s=>prog(s).placeId===c.id);return `<div class="place-row"><strong>${safe(c.name)}</strong><p>${safe(c.description)} · ${safe(c.organization)}</p>${items.map(sessionPreview).join('')}</div>`}).join(''):'<div class="empty"><strong>현재 등록된 시연용 장소가 없어요.</strong>실제 운영 때는 해당 지역 기관이 등록되면 자동으로 표시됩니다.</div>'}</div></section></div>`}
function programView(id){const p=state.programs.find(x=>x.id===id);if(!p)return notFound();const c=center(p);const ss=sessionsFor(p.id).filter(upcoming);return `${pageTop(safe(p.title),safe(p.subtitle),'머뭄•피정 상세')}<div class="hero-art"><strong>${safe(c.region)} · ${safe(c.name)}</strong><p>실제 시설 사진 준비 중 · 현재는 가상 프로그램입니다.</p></div><div class="detail-columns"><div><div class="detail-block"><h2>이 머뭄은 어떤 시간인가요?</h2><p>${safe(p.description)}</p><div class="tag-cloud">${p.tags.map(t=>`<span class="chip sm">${safe(t)}</span>`).join('')}</div></div><div class="detail-block"><h2>준비 사항과 숙박</h2><p>준비물·숙박 형태·식사 제공 여부는 아직 등록되지 않았습니다. 실제 신청 전 주최 기관의 안내를 확인해 주세요.</p></div><div class="detail-block"><h2>미리 만나보기</h2><div class="panel" style="background:#f3f7f2"><strong>영상·사진 소개 공간</strong><p>공식적으로 제공된 영상이 없을 때는 임의의 영상을 만들어 넣지 않습니다. 추후 수도회가 직접 등록할 수 있습니다.</p></div></div><div class="detail-block"><h2>다가오는 회차</h2>${ss.length?ss.map(s=>`<div class="session-row"><div><h4>${dateLong(s.start)} ~ ${dateLong(s.end)}</h4><p>${safe(s.admissions==='first_come'?'선착순 모집':'신청 방식 별도 확인')} · ${fee(p)} · ${safe(p.audience==='teen'?'청소년 대상':p.audience==='youth'?'청년 대상':'참가 자격 상세 확인')}</p>${statusHtml(s)}<p class="subtle" style="margin-top:7px">${availability(s).precise&&getSync(s)?.remaining!=null?`시연용 연동 잔여 ${getSync(s).remaining}석 · `:''}신청 확정은 주최 측에서만 가능합니다.</p></div><button class="secondary small" data-action="session" data-id="${s.id}">회차 정보 ↗</button></div>`).join(''):'<p>예정된 회차가 아직 없습니다.</p>'}</div><div class="detail-block"><h2>참가자의 이야기</h2><div class="panel"><strong>후기를 준비하고 있어요</strong><p>종료된 실제 회차의 후기를 이 프로그램에 차곡차곡 모읍니다. 가상의 후기는 공개하지 않습니다.</p><button class="secondary small" data-action="qr" data-id="${p.id}">QR 안내 화면 미리보기 ↗</button></div></div></div><aside><div class="panel" style="position:sticky;top:100px"><div class="eyebrow">RETREAT INFORMATION</div><h2 style="font-size:19px">${safe(c.name)}</h2><div class="info-row"><span>지역</span><strong>${safe(c.region)}</strong></div><div class="info-row"><span>운영기관</span><strong>${safe(c.organization)}</strong></div><div class="info-row"><span>기간</span><strong>${p.nights===1?'당일':`${p.nights-1}박 ${p.nights}일`}</strong></div><div class="info-row"><span>참가 대상</span><strong>${safe(audienceLabel(p))}</strong></div><div class="info-row"><span>참가비 예시</span><strong>${fee(p)}</strong></div><div class="hr"></div><div class="info-row"><span>연락처 (시연)</span><strong>${safe(p.demoPhone||'미등록')}</strong></div>${p.demoLink?`<div class="info-row"><span>신청 링크 (시연)</span><strong>기관 링크 입력됨 · 실제 연결 안 함</strong></div>`:``}<div class="helper">현재는 가상 프로그램으로 공식 신청처가 연결되지 않습니다. 실제 배포 전 기관 인증과 신청 링크 검증이 필요합니다.</div><div class="shelf-favorite-control"><button class="secondary" data-action="toggle-favorite" data-kind="program" data-id="${safe(p.id)}">${isFav('program',p.id)?'♥ 내 서랍에 담겼어요':'♡ 나의 머뭄 서랍에 담기'}</button></div><button class="primary" disabled style="width:100%;margin-top:14px">공식 신청처 미등록</button></div></aside></div>`}
function sessionView(id){const s=state.sessions.find(x=>x.id===id);if(!s)return notFound();const p=prog(s),c=center(p),a=availability(s),sync=getSync(s);return `${pageTop(safe(p.title),`${dateLong(s.start)} ~ ${dateLong(s.end)} · ${safe(c.name)}`,'회차 모집 정보')}<div class="split"><section class="panel"><h2>신청 안내</h2><div class="info-row"><span>모집 방식</span><strong>${s.admissions==='first_come'?'선착순':'개별 확인'}</strong></div><div class="info-row"><span>접수 기간</span><strong>${dateLong(s.applicationStart)} ~ ${dateLong(s.applicationEnd)}</strong></div><div class="info-row"><span>현재 상태</span>${statusHtml(s)}</div><div class="info-row"><span>정원</span><strong>${s.capacity}명 (시연용)</strong></div><div class="info-row"><span>신청 방식</span><strong>주최 기관 직접 접수</strong></div>${a.precise&&sync?.remaining!=null?`<p class="helper">시연용 연동 정보: 잔여 ${sync.remaining}석 · 최신 수신 ${new Date(sync.syncedAt).toLocaleString('ko-KR')}</p>`:`<p class="helper">실시간 재고가 확인되지 않았으므로 남은 자리를 표시하지 않습니다. 실제 모집 마감 여부는 주최 기관에 확인해야 합니다.</p>`}<button class="primary" disabled style="width:100%">공식 신청 링크 미연결 (시연용)</button></section><section class="panel"><h2>프로그램 일과 예시</h2>${s.schedule.map(x=>`<div class="info-row"><span>${safe(x.time)}</span><strong>${safe(x.label)}</strong></div>`).join('')}<p class="notice">일과표는 가상 예시이며 실제 운영 내용이 아닙니다.</p><button class="secondary small" data-action="program" data-id="${p.id}">프로그램 전체 소개 ↗</button></section></div>`}
function qrView(id){const p=state.programs.find(x=>x.id===id);if(!p)return notFound();const ordered=sessionsFor(id),now=Date.now(),lastEnded=[...ordered].reverse().find(x=>localDate(x.end).getTime()<=now&&now-localDate(x.end).getTime()<=72*60*60*1000),s=lastEnded||ordered.find(upcoming)||ordered.at(-1);const endTime=s?localDate(s.end).getTime():0;const naturalStage=s&&now>=endTime&&now-endTime<=72*60*60*1000?'review':'info';const stage=state.qrStage==='auto'?naturalStage:state.qrStage;return `${pageTop('하나의 QR, 두 가지 시간','같은 QR코드를 피정 안내와 종료 후 후기에 모두 사용하는 구상입니다.','고정 QR 동작 시연')}<div class="qr-screen panel"><h2>${safe(p.title)}</h2><p class="muted">실제 서비스에서는 서버 시각과 회차를 기준으로 화면이 자동 전환됩니다.</p>${state.hasApi?`<div class="panel" style="text-align:center;margin:18px 0"><img src="/api/qr/${safe(p.id)}.png" alt="이 프로그램의 고정 QR코드" width="156" height="156"/><p class="subtle">고정 QR 시연: 서버가 실행 중인 기기에서만 접근 가능합니다.</p></div>`:''}<div class="tab-row"><button class="chip ${stage==='info'?'selected':''}" data-action="qr-stage" data-stage="info">진행 중 화면 시연</button><button class="chip ${stage==='review'?'selected':''}" data-action="qr-stage" data-stage="review">종료 후 화면 시연</button></div><div class="hr"></div>${stage==='info'?`<h2>오늘의 머뭄 안내</h2><p>${safe(p.description)}</p>${s?.schedule.map(x=>`<div class="info-row"><span>${safe(x.time)}</span><strong>${safe(x.label)}</strong></div>`).join('')||''}<p class="helper">진행 중에는 후기 작성 버튼이 나오지 않습니다.</p>`:`<h2>오늘의 머뭄은 어떠셨나요?</h2><p>다음에 이곳을 찾을 분에게 작은 이야기를 남겨주세요.</p><div class="form-field"><label for="reviewTo">어떤 분에게 권하고 싶으세요?</label><select id="reviewTo"><option>처음 머뭄을 떠나는 분</option><option>혼자 기도하고 싶은 분</option><option>성경을 깊이 읽고 싶은 분</option><option>쉼이 필요한 분</option></select></div><div class="form-field"><label for="reviewText">마음에 남은 순간 (선택)</label><textarea id="reviewText" rows="4" maxlength="600" placeholder="고해성사·영적동반의 개인적 비밀 내용은 작성하지 말아주세요."></textarea></div><button class="primary" data-action="review-demo">후기 작성 흐름 체험</button><p class="notice">시연 화면에서는 후기가 서버에 저장되거나 공개되지 않습니다. QR만으로 실제 참가가 인증되지는 않습니다.</p>`}</div>`}
function adminView(){const p=state.programs.find(x=>x.id==='r02'),s=state.sessions.find(x=>x.id==='s02'),a=availability(s),sync=getSync(s);return `${pageTop('수도회 관리 화면 미리보기','담당자께서 복잡한 과정을 거치지 않고 프로그램을 관리하는 모습을 확인하기 위한 시연입니다.','운영자 화면 · 가상 데이터')}<div class="helper" style="margin:23px 0">이 화면에는 로그인·권한 검사가 아직 없습니다. 실제 기관 운영용 관리 시스템이 아니며, 여기서 바꾸는 값은 화면 시연에만 적용됩니다.</div><div class="demo-admin-grid"><section class="panel"><div class="eyebrow">PROGRAM</div><h2>우리 기관 프로그램</h2><h3>${safe(p.title)}</h3><p class="muted">태그: ${p.tags.join(' · ')}</p><div class="info-row"><span>다음 회차</span><strong>${dateLong(s.start)}</strong></div><div class="info-row"><span>모집 방식</span><strong>선착순</strong></div><div class="info-row"><span>상태</span>${statusHtml(s)}</div><div class="button-row" style="margin-top:16px"><button class="secondary small" data-action="manual-close">이 회차 모집 마감 시연</button><button class="secondary small" data-action="manual-reset">초기화</button></div></section><section class="panel"><div class="eyebrow">INTEGRATION</div><h2>외부 예약 연동</h2><div class="info-row"><span>연동 방식</span><strong>보안 웹훅 / API</strong></div><div class="info-row"><span>현재 상태</span><strong>${sync?'시연 데이터 적용됨':'실제 연동 없음'}</strong></div><div class="info-row"><span>잔여석</span><strong>${a.precise&&sync?.remaining!=null?`${sync.remaining}석 (시연)`:'검증 전 표시 안 함'}</strong></div><div class="button-row" style="margin-top:16px"><button class="primary small" data-action="simulate-sync">연동 이벤트 시연</button><button class="secondary small" data-action="clear-sync">연동 초기화</button></div><p class="notice" style="margin-top:14px">진짜 연동은 기관의 동의·접근 권한·보안 서명 설정 후 활성화됩니다. 오래된 데이터는 확인 필요로 자동 전환됩니다.</p></section></div><section class="panel" style="margin-top:19px"><h2>실제 수도회 담당자 기능 — 다음 구현</h2><p class="muted">기관 인증·로그인, 프로그램 등록, 반복 회차 복사, AI 소개 초안 승인, 영상 업로드, QR 인쇄, 연동 설정, 권한별 변경 기록이 필요합니다.</p><div class="pill-line">${['기관별 보안 권한','반복 회차','AI 초안 승인','QR·후기','신청처 연동'].map(t=>`<span class="chip sm">${t}</span>`).join('')}</div></section>`}

function conventView(){return `
 <section class="convent-hero"><div><div class="eyebrow">FOR RELIGIOUS COMMUNITIES · 수도회 제안용</div><h1>정성껏 준비한 피정,<br/>더 많은 신자에게 닿도록.</h1><p>신자들은 피정을 찾기 어렵고, 수도회는 좋은 프로그램을 알리기 어렵습니다. 가뭄은 그 사이를 잇는 <b>무료 피정 안내 플랫폼</b>을 준비하고 있습니다.</p><div class="button-row" style="margin-top:22px"><button class="primary" data-action="start-convent">우리 피정 등록 체험하기 ↗</button><button class="secondary" data-action="nav" data-to="home">신자 화면 보기</button></div></div><div class="convent-quote">“피정을 찾는 사람에게는 길을,<br/>피정을 준비하는 수도회에는 기회를.”</div></section>
 <div class="section-head tight"><div><div class="eyebrow">WHY GAMUM</div><h2>수녀님들께 어떤 도움이 될까요?</h2></div></div>
 <div class="convent-grid"><article class="convent-mini"><div class="eyebrow">01 · 발견</div><b>흩어진 홍보를 한곳에</b><p>신자들이 지역·날짜·주제·마음의 필요에 따라 피정을 찾아보고, 수도회와 연결됩니다.</p></article><article class="convent-mini"><div class="eyebrow">02 · 관리</div><b>다음 일정만 간편하게</b><p>프로그램 소개는 한 번 작성하고, 회차별 날짜·참가비·모집 상태를 간단히 갱신하는 운영을 목표로 합니다.</p></article><article class="convent-mini"><div class="eyebrow">03 · 원칙</div><b>수수료 없이, 기존 방식대로</b><p>수도회 등록·홍보는 무료로 제공하는 것이 원칙입니다. 피정비 수납과 신청 확인은 수도회가 기존 방식대로 관리합니다.</p></article></div>
 <div class="convent-banner"><div><strong style="font-size:20px">수녀님이 직접 3단계를 눌러 보세요.</strong><p>① 프로그램 소개 작성 → ② 실제 일정·모집 조건 입력 → ③ 신자 화면 미리보기. 모두 가상 시연입니다.</p></div><button class="secondary" data-action="start-convent">등록 체험 시작 ↗</button></div>
 <section class="panel"><div class="title-row"><div><div class="eyebrow">REALISTIC WORKFLOW</div><h2>접수와 입금은 어떻게 되나요?</h2></div></div>
 <div class="info-row"><span>신자</span><strong>가뭄에서 프로그램·연락처·신청 방법 확인</strong></div>
 <div class="info-row"><span>수도회</span><strong>기존 신청처·계좌·확정 절차 유지</strong></div>
 <div class="info-row"><span>가뭄</span><strong>소개·일정·모집 상태 노출, 알림 기능 확장</strong></div>
 <p class="notice">기관이 직접 확정하지 않은 좌석은 '잔여석 있음'으로 표시하지 않습니다. 자동 연동은 기관 동의와 보안 검토 후 별도 도입합니다.</p></section>
 <div class="convent-safety"><b>현재 단계에 대한 정확한 안내</b><br/>지금 보시는 웹사이트는 정식 서비스가 아닌 시연판입니다. 실제 기관 인증·담당자 계정·온라인 접수·외부 예약 연동·개인정보 저장은 아직 구현되지 않았습니다. 오늘 입력한 내용은 브라우저 안에서만 시연되며 서버로 전송되지 않습니다.</div>
 <div style="display:flex;gap:12px;flex-wrap:wrap;margin:20px 0 45px"><button class="secondary" data-action="nav" data-to="admin">모집 마감과 외부 연동 시연 ↗</button><button class="secondary" data-action="nav" data-to="qr/r02">QR 후기 화면 시연 ↗</button></div>`}
const demoField = (label, key, type='text', placeholder='', extra='')=>`<div class="form-field"><label for="demo-${key}">${label}</label>${type==='textarea'?`<textarea id="demo-${key}" data-demo-field="${key}" placeholder="${placeholder}" ${extra}>${safe(state.demoConvent[key]||'')}</textarea>`: type==='select'?`<select id="demo-${key}" data-demo-field="${key}">${extra}</select>`:`<input id="demo-${key}" data-demo-field="${key}" type="${type}" value="${safe(state.demoConvent[key]||'')}" placeholder="${placeholder}" ${extra}/>`}</div>`;
function demoConventView(){const d=state.demoConvent; const step=state.demoStep; const stepNames=['프로그램','회차 일정','신자 화면'];
return `${pageTop('우리 피정 등록 체험','복잡한 회원가입 없이 등록 흐름을 미리 경험해 보세요. 실제 저장·공개는 되지 않습니다.','수도회 담당자 · 3단계 시연')}
 <div class="convent-steps">${stepNames.map((x,i)=>`<span class="step-chip ${i===step?'on':''}">${i+1}. ${x}</span>`).join('')}</div>
 <div class="demo-form-layout"><section class="panel">${step===0?`
  <h2>① 피정 프로그램 소개</h2><p class="muted">일상적인 안내문을 적으면 됩니다. AI 소개글 초안 기능은 정식 개발 예정입니다.</p>
  ${demoField('수도회·피정의 집 이름','house')}
  ${demoField('프로그램 이름','title')}
  ${demoField('프로그램 소개','intro','textarea','이 피정은 어떤 분을 위한 시간인가요?')}
  <div class="demo-field-row">${demoField('지역','region','select','', ['서울','경기','강원','충남','전남','경북','부산','제주','대전'].map(x=>`<option ${x===d.region?'selected':''}>${x}</option>`).join(''))}${demoField('주제','tag','select','',['침묵','말씀','관상','쉼','청년','가족','성경','화해'].map(x=>`<option ${x===d.tag?'selected':''}>${x}</option>`).join(''))}</div>
  ${demoField('참가 대상','audience')}
  `:step===1?`
  <h2>② 날짜와 신청 방법</h2><p class="muted">기존 신청처를 그대로 안내할 수 있습니다. 모르는 사항은 나중에 수정할 수 있어요.</p>
  <div class="demo-field-row">${demoField('피정 시작일','date','date')}${demoField('정원','capacity','number','','min="1" max="1000"')}</div>
  <div class="demo-field-row">${demoField('접수 시작일','regStart','date')}${demoField('접수 마감일','regEnd','date')}</div>
  <div class="demo-field-row">${demoField('참가비 (원)','fee','number','','min="0"')}${demoField('담당자 연락처 (선택)','phone','tel','예: 기관 공식 연락처')}</div>
  ${demoField('기존 신청 링크 (선택)','apply','url','https://...')}
  <p class="demo-help">정식 서비스에서는 수도회가 모집 마감 버튼을 누르면 노출 상태도 변경됩니다. 현재는 잔여석이 확인되지 않아 항상 '주최 측 확인 필요'로 보여줍니다.</p>
  `:`<h2>③ 신자에게 이렇게 보여집니다</h2><p class="muted">제출한 값으로 미리보기 카드를 만들었습니다. 실제 사이트나 외부로 보내지지 않습니다.</p>
  <div class="demo-preview"><div class="eyebrow">MOMENT OF STAY · 등록 미리보기</div><h2>${safe(d.title)}</h2><p>${safe(d.intro)}</p><div class="info-row"><span>운영</span><strong>${safe(d.house)}</strong></div><div class="info-row"><span>지역·주제</span><strong>${safe(d.region)} · ${safe(d.tag)}</strong></div><div class="info-row"><span>시작일</span><strong>${safe(d.date)}</strong></div><div class="info-row"><span>참가 대상</span><strong>${safe(d.audience)}</strong></div><div class="info-row"><span>참가비</span><strong>${Number(d.fee||0).toLocaleString('ko-KR')}원</strong></div><div class="info-row"><span>연락처</span><strong>${safe(d.phone||'미등록')}</strong></div><p class="notice" style="margin:15px 0 0">신청은 수도회의 기존 창구를 통해 진행됩니다. 여기서는 예약·결제가 되지 않습니다.</p></div>`}
 <div class="demo-wizard-footer">${step>0?`<button class="secondary" data-action="convent-back">이전 단계</button>`:`<button class="secondary" data-action="nav" data-to="convent">제안 화면</button>`}${step<2?`<button class="primary" data-action="convent-next">다음 단계 ↗</button>`:`<button class="primary" data-action="convent-publish">신자 화면에서 보기 (시연) ↗</button>`}</div>
 </section><aside class="demo-wizard-aside"><div class="eyebrow">GAMUM · 핵심 약속</div><h3>새로운 업무를 늘리지 않도록</h3><p>수도회의 운영 방식은 그대로 존중하고, 신자들이 정보를 더 쉽게 발견하도록 연결하겠습니다.</p><div class="info-row"><span>등록 비용</span><strong>무료 원칙</strong></div><div class="info-row"><span>피정비 수납</span><strong>수도회 직접</strong></div><div class="info-row"><span>참가 확정</span><strong>수도회 직접</strong></div><div class="info-row"><span>자료 수정</span><strong>수도회 직접</strong></div><p class="notice">정식 서비스 전 운영 정책과 개인정보 보호 절차를 마련합니다.</p></aside></div>`}
function publishConventDemo(){const d=state.demoConvent;if(!d.title.trim()||!d.house.trim()){toast('피정명과 기관 이름을 먼저 입력해 주세요.');state.demoStep=0;render();return}
 const id='demo-r-'+String(Date.now()),placeId='demo-p-'+String(Date.now());
 state.centers.unshift({id:placeId,name:d.house,region:d.region,organization:d.house,description:'기관 담당자가 작성한 가상 예시',environment:'실내',address:d.region+' 지역 · 상세 주소 미등록'});
 state.programs.unshift({id,title:d.title,placeId,tags:[d.tag],traits:[d.tag],description:d.intro,subtitle:'수도회가 직접 작성한 피정 소개 (시연)',fee:Number(d.fee)||0,audience:'all',demoAudience:d.audience,nights:1,capacity:Number(d.capacity)||24,channel:'external',color:1,source:'시연 중 입력한 가상 자료',reviewCount:0,demoPhone:d.phone,demoLink:d.apply});
 const start=(d.date||new Date().toISOString().slice(0,10))+'T10:00:00';
 state.sessions.unshift({id:'demo-s-'+String(Date.now()),programId:id,start,end:(d.date||new Date().toISOString().slice(0,10))+'T17:00:00',applicationStart:(d.regStart||d.date)+'T09:00:00',applicationEnd:(d.regEnd||d.date)+'T18:00:00',capacity:Number(d.capacity)||24,channel:'external',admissions:'first_come',manualState:'unknown',lastConfirmed:null,externalId:null,schedule:[{time:'10:00',label:'시작 및 안내 (시연)'},{time:'13:00',label:'기도와 묵상 (시연)'},{time:'17:00',label:'마침 (시연)'}]});
 state.demoCreatedId=id;nav('program/'+id);toast('시연용 프로그램을 만들었습니다. 실제 공개되지는 않습니다.');
}
function notFound(){return `${pageTop('페이지를 찾지 못했어요','첫 화면으로 돌아가 다시 찾아보세요.')}<button class="primary" data-action="nav" data-to="home">처음으로</button>`}
function render(){document.body?.classList.toggle('quiz-active',location.hash.startsWith('#discover')&&state.quizStep<questions.length);const previousPage=state.page;const resultToolsOpen=$('.result-tools')?.open;const active=document.activeElement;const focusData=active?.closest('[data-action]')?.dataset;let hash=decodeURIComponent(location.hash.slice(1))||'home',parts=hash.split('?')[0].split('/'),page=parts[0];state.page=page;$('.main-nav a.active')?.classList.remove('active');const navPage=['discover','themes','calendar','places','program','session','result'].includes(page)?'home':page;$(`[data-nav="${navPage}"]`)?.classList.add('active');root.innerHTML=page==='home'?home():page==='discover'?quiz():page==='result'?sharedResult(new URLSearchParams(hash.split('?')[1]||'').get('p')||'쉼'):page==='shelf'?shelfView():page==='guide'?guideView():page==='themes'?themesView():page==='calendar'?calendarView():page==='places'?placesView():page==='program'?programView(parts[1]):page==='session'?sessionView(parts[1]):page==='qr'?qrView(parts[1]):page==='admin'?adminView():page==='convent'?conventView():page==='convent-register'?demoConventView():notFound();const counter=$('#shelfCount');if(counter)counter.textContent=favoriteCount();if(previousPage===page&&resultToolsOpen&&$('.result-tools'))$('.result-tools').open=true;document.querySelectorAll('.main-nav a').forEach(a=>{if(a.dataset.nav===navPage)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
 if(focusData&&previousPage===page){const matching=Array.from(root.querySelectorAll('[data-action]')).find(el=>Object.entries(focusData).every(([key,value])=>el.dataset[key]===value));(matching||root).focus({preventScroll:true});}
 else if(previousPage!==page){root.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}
}
function nav(page){const current=location.hash.slice(1);if(current===page)render();else location.hash=page;window.scrollTo({top:0,behavior:'instant'});}
function focusMoment(){const reading=$('.moment-reading');reading?.focus({preventScroll:true});if(window.matchMedia('(max-width:760px)').matches)reading?.scrollIntoView({block:'center',behavior:'auto'});}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),3400)}
async function copy(text){try{await navigator.clipboard.writeText(text);toast('링크를 복사했어요.')}catch{toast('복사를 지원하지 않는 환경입니다.')}}
root.addEventListener('click',async e=>{
 const b=e.target.closest('[data-action]');if(!b)return;const act=b.dataset.action;
  if(act==='select-mood'){state.mood=b.dataset.id;state.momentOpen=false;state.momentStep=0;state.momentFinished=false;render();document.getElementById('one-minute')?.scrollIntoView({block:'start'});return}
  if(act==='open-moment'){state.momentOpen=true;state.momentStep=0;state.momentFinished=false;render();focusMoment();return}
  if(act==='moment-next'||act==='moment-back'){state.momentStep=Math.max(0,Math.min(3,state.momentStep+(act==='moment-next'?1:-1)));render();focusMoment();return}
  if(act==='moment-finish'){state.momentOpen=false;state.momentFinished=true;render();focusMoment();return}
  if(act==='save-word'){toggleFav('word',b.dataset.id);return}
  if(act==='toggle-favorite'){toggleFav(b.dataset.kind,b.dataset.id);return}
  if(act==='open-saved-moment'){state.mood=b.dataset.id;state.momentOpen=true;state.momentStep=0;state.momentFinished=false;nav('home');setTimeout(()=>document.getElementById('one-minute')?.scrollIntoView({block:'start',behavior:'smooth'}),35);return}
  if(act==='copy-moment'){const g=moodGuides[b.dataset.id];if(g)await shareText(`가뭄 · 오늘 1분 머뭄\n${g.title}\n${g.comfort}\n함께 읽을 성경 ${g.reference}\n${g.question}\n${g.prayer}`);return}
  if(act==='download-result'){await exportResultCard(b.dataset.profile);return}
 if(act==='start-convent'){state.demoStep=0;nav('convent-register');return}
 if(act==='convent-back'){state.demoStep=Math.max(0,state.demoStep-1);render();return}
 if(act==='convent-next'){
   const d=state.demoConvent;
   if(state.demoStep===0&&(!d.title.trim()||!d.house.trim())){toast('피정 이름과 기관 이름을 입력해 주세요.');return}
   if(state.demoStep===1&&(!d.date||!d.capacity||Number(d.capacity)<1)){toast('피정 날짜와 정원을 확인해 주세요.');return}
   state.demoStep=Math.min(2,state.demoStep+1);render();window.scrollTo(0,0);return
 }
 if(act==='convent-publish'){publishConventDemo();return}
 if(act==='nav'){nav(b.dataset.to);return}
 if(act==='program'||act==='session'||act==='qr'){nav(`${act}/${b.dataset.id}`);return}
 if(act==='quiz-answer'){state.answers[state.quizStep]=Number(b.dataset.idx);if(state.quizStep<questions.length-1)state.quizStep++;updateQuizQuestion();return}
 if(act==='quiz-finish'){state.quizStep=questions.length;updateQuizQuestion();return}
 if(act==='quiz-back'){state.quizStep=Math.max(0,state.quizStep-1);updateQuizQuestion();return}
 if(act==='quiz-skip'){delete state.answers[state.quizStep];state.quizStep++;updateQuizQuestion();return}
 if(act==='jump-section'){e.preventDefault();document.getElementById(b.dataset.target)?.scrollIntoView({behavior:'smooth',block:'start'});return}
 if(act==='quiz-restart'){state.answers={};state.conditions={};state.quizStep=0;nav('discover');return}
 if(act==='reset-conditions'){state.conditions={duration:'flexible',company:'flexible'};render();$('#recommendation-options')?.scrollIntoView({block:'start'});return}
  if(act==='share-result'){const p=b.dataset.profile,g=spiritualGuides[p]||spiritualGuides['쉼'];const pr=profiles[p]||profiles['쉼'];await shareText(`가뭄 · 나의 머뭄 결과\n${pr[0]}\n${pr[1]}\n함께 읽을 성경: ${g.reference}\n가뭄 · 가톨릭 머뭄`);return}
 if(act==='toggle-tag'){const t=b.dataset.tag;state.selectedTags=state.selectedTags.includes(t)?state.selectedTags.filter(x=>x!==t):[...state.selectedTags,t];render();return}
 if(act==='clear-tags'){state.selectedTags=[];render();return}
 if(act==='cal-prev'||act==='cal-next'){const newMonth=new Date(state.year,state.month+(act==='cal-prev'?-1:1),1);state.month=newMonth.getMonth();state.year=newMonth.getFullYear();state.selectedDay=null;render();return}
 if(act==='cal-day'){state.selectedDay=b.dataset.date;render();return}
 if(act==='cal-reset'){state.selectedDay=null;render();return}
 if(act==='map-mode'){state.mode=b.dataset.mode;render();return}
 if(act==='region'){state.selectedRegion=b.dataset.region;render();return}
 if(act==='qr-stage'){state.qrStage=b.dataset.stage;render();return}
 if(act==='review-demo'){toast('후기 입력 시연입니다. 실제 저장되지 않습니다.');return}
 if(act==='simulate-sync'){state.demoOverrides.s02={status:'open',remaining:3,capacity:40,syncedAt:new Date().toISOString(),source:'demo-local'};render();toast('가상 외부 예약 데이터가 반영되었습니다.');return}
 if(act==='clear-sync'){delete state.demoOverrides.s02;render();return}
 if(act==='manual-close'){const s=state.sessions.find(s=>s.id==='s02');s.manualState='closed';render();toast('시연용 모집 마감 상태로 변경되었습니다.');return}
 if(act==='manual-reset'){const s=state.sessions.find(s=>s.id==='s02');s.manualState='unknown';render();return}
});
root.addEventListener('submit',e=>{
 if(e.target.id!=='recommendation-form')return;e.preventDefault();
 const form=e.target;if(!form.reportValidity())return;
 const values=Object.fromEntries(new FormData(form));
 if(values.dateFrom&&values.dateTo&&values.dateFrom>values.dateTo){$('#condition-error').textContent='가능한 마지막 날짜를 시작 날짜 이후로 골라주세요.';return}
 if(values.minors&&!values.childAge&&values.childAge!=='0'){$('#condition-error').textContent='동행하는 자녀 중 가장 어린 나이를 알려주세요.';return}
 state.conditions={...values,minors:!!values.minors,durationRequired:!!values.durationRequired,companyRequired:!!values.companyRequired,courses:(values.courses||'').split(',').map(x=>x.trim()).filter(Boolean)};
 const y=window.scrollY;render();$('#recommendation-update').focus({preventScroll:true});window.scrollTo({top:y,behavior:'instant'});
});
root.addEventListener('input',e=>{const key=e.target.dataset.demoField;if(key)state.demoConvent[key]=e.target.value});
root.addEventListener('change',e=>{if(e.target.id==='retreatSort'){state.sortOrder=e.target.value;render();$('#retreatSort')?.focus({preventScroll:true});return}const key=e.target.dataset.demoField;if(key)state.demoConvent[key]=e.target.value});
root.addEventListener('keydown',e=>{const b=e.target.closest('.retreat-card[role="button"]');if(b&&!e.target.closest('button,a')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();nav('program/'+b.dataset.id)}});
$('.skip-link').addEventListener('click',e=>{e.preventDefault();root.focus();});
$('#organizerLink').addEventListener('click',()=>nav('convent'));
window.addEventListener('hashchange',render);
async function loadSync(){try{const response=await fetch('/api/catalog-status',{signal:AbortSignal.timeout(1700)});if(!response.ok)return;const d=await response.json();state.sync=d.sessions||{};state.hasApi=true;render()}catch{}}
render();if(location.protocol!=='file:' && document.documentElement.dataset.statusApi==='enabled')loadSync();
})();
