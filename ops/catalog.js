import {connect,sandbox} from './client.js';
import {requirementsHTML,normalizeCatalog,safe,https,regions,catalogFromRows,visibleStatus} from './domain.js';
import {profiles,spiritualGuides,saintSources} from './guides.js';
import {topicGroups,matchesTopics,validRows,onDate,inMonth,groupPlaces} from './discovery.js';
import '../assets/js/quiz-data.js';import '../assets/js/recommendation.js';
const root=document.querySelector('#app'),message=document.querySelector('#message'),engine=window.GAMUM_RECOMMEND,questions=window.GAMUM_QUIZ;
const seoulNow=new Date(Date.now()+9*3600000);
let api,rows=[],step=0,answers={},conditions={},minute=0;
let selectedTopics=[],selectedDay='',selectedRegion='',selectedDistrict='',selectedPlace='';
let calYear=seoulNow.getUTCFullYear(),calMonth=seoulNow.getUTCMonth();
const store='camum-approved-shelf-v021';let saved=[];try{saved=JSON.parse(localStorage.getItem(store)||'[]');if(!Array.isArray(saved))saved=[];}catch{}
const date=v=>new Date(v).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'});
const options=(name,label,values,value='')=>`<label>${label}<select name="${name}"><option value="">선택 안 함</option>${values.map(v=>{const [k,t]=Array.isArray(v)?v:[v,v];return `<option value="${safe(k)}" ${value===k?'selected':''}>${safe(t)}</option>`;}).join('')}</select></label>`;
const input=(name,label,type='text',value='',extra='')=>`<label>${label}<input name="${name}" type="${type}" value="${safe(value)}" ${extra}></label>`;
function card(s,reason=''){return `<article><span class="badge">${sandbox?'가상 테스트 자료 · 실제 신청 불가':'승인된 공식 안내'}</span><h3>${safe(s.title)}</h3><p>${safe(s.organization)}</p>${reason?`<p>${safe(reason)}</p>`:''}<dl><dt>일정</dt><dd>${date(s.start)} ~ ${date(s.end)}</dd><dt>장소</dt><dd>${safe(s.region)} · ${safe(s.place)}</dd><dt>대상</dt><dd>${safe(s.audience)}</dd><dt>참가비</dt><dd>${Number(s.fee).toLocaleString()}원 / ${{person:'1인',family:'가족',group:'단체'}[s.feeUnit]||'확인 필요'}${s.feeComplete?'':' · 추가 비용 확인 필요'}</dd><dt>모집</dt><dd>${visibleStatus(s)}</dd><dt>신청 방법</dt><dd>${safe(s.phone||'공식 신청 페이지 확인')}</dd></dl><p class="muted">확인: ${date(s.checkedAt)} · 실시간 잔여석이 아닙니다.</p><div class="actions"><a class="button secondary" href="#session/${s.id}">상세·신청 안내</a><button class="secondary" data-save="${s.programId}">${saved.includes(s.programId)?'서랍에서 빼기':'서랍에 담기'}</button></div></article>`;}
function minuteView(){const g=spiritualGuides['쉼'],parts=[g.comfort,`${g.verse} (${g.reference})`,g.question,g.prayer];return `<section class="panel"><h2>오늘, 1분 머뭄</h2><p>${safe(parts[minute])}</p><button data-minute="${(minute+1)%4}" class="secondary">${minute===3?'처음으로':'다음'} · ${minute+1}/4</button></section>`;}
function home(){return `<h1>잠시, 머물러도 괜찮습니다.</h1><p>지금 나에게 필요한 머뭄을 찾아보세요.</p><div class="grid">${[['discover','나를 찾아가는 머뭄','일상 속 10가지 질문'],['themes','주제로 찾는 머뭄','쉼·말씀·관계 등'],['calendar','날짜로 찾는 머뭄','참여할 수 있는 일정'],['places','장소로 찾는 머뭄','지역과 피정의 집']].map(([id,title,desc])=>`<a class="button secondary" href="#${id}"><strong>${title}</strong><br>${desc}</a>`).join('')}</div>${minuteView()}<p>실제 접수·입금·환불은 각 수도회의 공식 안내를 따라 진행합니다.</p><button data-refresh class="secondary">최신 승인 자료 불러오기</button>`;}

function resultList(items,emptyText='선택한 조건에 해당하는 피정이 없습니다.'){
 return `<div class="card-list">${items.map(s=>card(s)).join('')||`<div class="empty"><p>${safe(rows.length?'': '현재 승인되어 공개된 실제 피정이 없습니다. ')}${safe(rows.length?emptyText:'가입한 기관이 피정을 승인받아 공개하면 여기에 표시됩니다.')}</p><a class="button secondary" href="#home">다른 방식으로 찾기</a></div>`}</div>`;
}
function themesView(){
 const upcoming=validRows(rows),list=upcoming.filter(s=>matchesTopics(s,selectedTopics));
 const standard=new Set(topicGroups.flatMap(([,tags])=>tags));
 const extras=[...new Set(rows.flatMap(s=>Array.isArray(s.tags)?s.tags:[]))].filter(t=>!standard.has(t)&&t.trim());
 const groups=[...topicGroups,...(extras.length?[['등록된 다른 주제',extras]]:[])];
 return `<section class="discovery"><p class="kicker">머뭄 발견 · 두 번째 길</p><h1>주제로 찾는 머뭄</h1><p class="muted">지금 끌리는 주제를 눌러 보세요. 여러 개를 선택하면 모두 포함하는 피정을 보여드립니다.</p>
 <section class="panel topic-panel">${groups.map(([title,tags])=>`<div class="topic-group"><h2>${safe(title)}</h2><div class="tag-cloud">${tags.map(tag=>`<button type="button" class="topic-chip ${selectedTopics.includes(tag)?'active':''}" data-topic="${safe(tag)}" aria-pressed="${selectedTopics.includes(tag)}">#${safe(tag)}</button>`).join('')}</div></div>`).join('')}
 <button type="button" class="text-link" data-clear-topics>선택 초기화</button></section>
 <div class="result-title"><h2>관련 피정 <span>${list.length}개 회차</span></h2></div>${resultList(list,'선택한 주제를 모두 포함하는 피정이 없습니다. 해시태그를 줄여 보세요.')}</section>`;
}
function calendarView(){
 const upcoming=validRows(rows),days=new Date(Date.UTC(calYear,calMonth+1,0)).getUTCDate();
 const offset=new Date(Date.UTC(calYear,calMonth,1)).getUTCDay();
 const monthRows=upcoming.filter(s=>inMonth(s,calYear,calMonth));
 const list=selectedDay?monthRows.filter(s=>onDate(s,selectedDay)):monthRows;
 let cells='<span class="weekday">일</span><span class="weekday">월</span><span class="weekday">화</span><span class="weekday">수</span><span class="weekday">목</span><span class="weekday">금</span><span class="weekday">토</span>';
 for(let i=0;i<offset;i++)cells+='<span aria-hidden="true"></span>';
 for(let day=1;day<=days;day++){
  const dateKey=`${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  const count=monthRows.filter(s=>onDate(s,dateKey)).length;
  cells+=`<button type="button" class="calendar-day ${count?'has-retreat':''} ${selectedDay===dateKey?'selected':''}" data-day="${dateKey}" aria-pressed="${selectedDay===dateKey}" aria-label="${calMonth+1}월 ${day}일, ${count}개 피정"><span>${day}</span>${count?'<i aria-hidden="true"></i>':''}</button>`;
 }
 return `<section class="discovery"><p class="kicker">머뭄 발견 · 세 번째 길</p><h1>날짜로 찾는 머뭄</h1><p class="muted">표시된 날짜를 누르면 그날 진행되는 실제 피정을 볼 수 있습니다.</p>
 <div class="calendar-layout"><div class="panel"><div class="calendar-header"><button type="button" class="secondary" data-month="prev" aria-label="이전 달">←</button><strong>${calYear}년 ${calMonth+1}월</strong><button type="button" class="secondary" data-month="next" aria-label="다음 달">→</button></div><div class="calendar-grid">${cells}</div><button type="button" class="text-link" data-month="all">이번 달 전체 일정</button></div>
 <div><div class="result-title"><h2>${selectedDay?safe(selectedDay)+'의 머뭄':`${calMonth+1}월의 머뭄`} <span>${list.length}개 회차</span></h2></div>${resultList(list,'선택한 날짜에 등록된 피정이 없습니다. 다른 날짜를 눌러보세요.')}</div></div></section>`;
}
function placesView(){
 const upcoming=validRows(rows);
 const centers=selectedRegion?groupPlaces(upcoming,selectedRegion):[];
 const districts=[...new Set(centers.map(x=>x.district))];
 const available=centers.filter(x=>!selectedDistrict||x.district===selectedDistrict);
 const chosen=centers.find(x=>x.key===selectedPlace);
 return `<section class="discovery"><p class="kicker">머뭄 발견 · 네 번째 길</p><h1>장소로 찾는 머뭄</h1><p class="muted">지역을 선택하면 그 지역의 피정 장소와 다음 일정을 보여드립니다.</p>
 <div class="region-tabs">${regions.map(r=>`<button type="button" class="region-chip ${selectedRegion===r?'active':''}" data-region="${safe(r)}" aria-pressed="${selectedRegion===r}">${safe(r)}</button>`).join('')}</div>
 ${!selectedRegion?'<p class="muted region-hint">먼저 지역을 선택해 주세요.</p>':`<div class="places-layout"><div><h2>${safe(selectedRegion)}의 피정 장소</h2><div class="district-tabs"><button type="button" data-district="" class="region-chip ${!selectedDistrict?'active':''}">전체</button>${districts.map(d=>`<button type="button" data-district="${safe(d)}" class="region-chip ${selectedDistrict===d?'active':''}">${safe(d)}</button>`).join('')}</div>
 <div class="place-list">${available.map(place=>{const next=place.sessions[0];return `<button type="button" class="place-item ${selectedPlace===place.key?'active':''}" data-place="${safe(place.key)}" aria-expanded="${selectedPlace===place.key}"><strong>${safe(place.place||'이름 확인 필요')}</strong><span>${safe(place.district)} · ${safe(place.address||'공식 주소 확인 필요')}</span><small>다음 회차 ${safe(next.start.slice(0,10))} · ${safe(visibleStatus(next))}</small></button>`}).join('')||'<p class="empty">이 지역에 공개된 피정 장소가 없습니다.</p>'}</div></div>
 <div><div class="result-title"><h2>${chosen?safe(chosen.place)+'의 일정':'장소별 피정 일정'}</h2></div>${chosen?resultList(chosen.sessions,'이 장소의 공개 회차가 없습니다.'):'<p class="muted">피정의 집을 누르면 해당 장소의 실제 프로그램과 회차가 펼쳐집니다.</p>'}</div></div>`}
 </section>`;
}

function quiz(){if(step>=questions.length)return result();const q=questions[step];return `<section class="quiz-shell"><p>나를 찾아가는 머뭄 · ${step+1} / 10</p><h1 id="quiz-title" tabindex="-1">${safe(q.q)}</h1><div class="quiz-options">${q.opts.map((o,i)=>`<button data-answer="${i}">${safe(o.text)}</button>`).join('')}</div><div class="actions"><button class="secondary" data-back ${step===0?'disabled':''}>이전</button><button class="secondary" data-skip>건너뛰기</button><a href="#home">홈으로</a></div></section>`;}
function conditionsForm(){const c=conditions;return `<form id="conditions" class="panel"><h2>조건 조정</h2><p>조건이 확인되지 않은 피정은 추천에 포함하지 않습니다.</p><div class="form-grid">${options('region','지역',regions,c.region)}${input('dateFrom','가능한 시작일','date',c.dateFrom)}${input('dateTo','가능한 종료일','date',c.dateTo)}${input('budget','1인 전체 예산','number',c.budget,'min="0"')}${input('age','내 나이','number',c.age,'min="0" max="120"')}${input('youngestAge','동행 중 가장 어린 나이','number',c.youngestAge,'min="0"')}${input('oldestAge','동행 중 가장 많은 나이','number',c.oldestAge,'min="0" max="120"')}${input('childAge','미성년 자녀 나이','number',c.childAge,'min="0" max="17"')}${input('partySize','전체 동행 인원','number',c.partySize,'min="1"')}${options('company','동행',Object.entries(engine.companyLabels),c.company)}${options('duration','기간',Object.entries(engine.durationLabels),c.duration)}${options('mode','진행 방식',[['daytime','당일'],['residential','숙박'],['commuter','통원'],['online','온라인'],['no-night','숙박 불가']],c.mode)}${options('gender','참가 성별',[['female','여성'],['male','남성']],c.gender)}${options('role','대상 자격',[['lay','평신도'],['religious','수도자'],['clergy','성직자'],['any','별도 자격 없음']],c.role)}${options('faith','신앙 단계',[['catholic','가톨릭 신자'],['catechumen','예비신자'],['other','그 외']],c.faith)}${options('vocation','성소 관심자 여부',[['yes','해당'],['no','해당 없음']],c.vocation)}${options('married','혼인 조건',[['yes','혼인함'],['no','해당 없음']],c.married)}${options('experience','피정 경험',[['first','처음'],['experienced','경험 있음']],c.experience)}${input('courses','이수한 선행 과정 (쉼표로 구분)','text',c.courses?.join(', '))}</div>${[['durationRequired','기간은 필수 조건'],['companyRequired','동행은 필수 조건'],['minors','미성년 자녀 동행']].map(([k,t])=>`<label><input name="${k}" type="checkbox" ${c[k]?'checked':''}> ${t}</label>`).join('')}<button>추천 다시 확인</button></form>`;}
function result(){const data=engine.recommend({questions,answers,conditions,...catalogFromRows(rows)}),key=data.top,g=spiritualGuides[key]||spiritualGuides['쉼'],pr=profiles[key]||profiles['쉼'];return `<h1>${safe(pr[0])}</h1><p>${safe(pr[1])}</p><p class="muted">지금의 선호를 살펴보는 안내이며, 성격이나 신앙을 판정하지 않습니다.</p><h2>조건에 맞는 추천 머뭄 ${data.items.length}개</h2><div class="card-list">${data.items.map(x=>card(x.s,x.reason)).join('')||'<p>현재 확인된 참가 조건에 맞는 피정이 없습니다. 아래에서 조건을 조정해 주세요.</p>'}</div>${data.unconfirmed.length?`<p>참가 자격을 더 확인해야 하는 회차 ${data.unconfirmed.length}개는 추천에서 제외했습니다.</p>`:''}${conditionsForm()}<section class="panel"><h2>${safe(g.opening)}</h2><p>${safe(g.comfort)}</p><h2>함께 읽을 성경</h2><blockquote>${safe(g.verse)}</blockquote><a href="${g.url}" target="_blank" rel="noopener noreferrer">가톨릭 새번역 · ${safe(g.reference)}</a><h2>영적 길동무 · ${safe(g.saint)}</h2><p>${safe(g.saintStory)}</p><a href="${saintSources[key]||saintSources['쉼']}" target="_blank" rel="noopener noreferrer">성인 이야기 출처</a><h2>묵상 질문</h2><p>${safe(g.question)}</p><h2>짧은 기도</h2><p>${safe(g.prayer)}</p></section><button data-restart>10문항 다시 하기</button>`;}
async function render(){const [page='home',id]=location.hash.slice(1).split('/');document.body.classList.toggle('quiz',page==='discover'&&step<10);
 if(page==='session'){const s=rows.find(r=>r.id===id);if(!s){root.innerHTML='<h1>현재 공개되지 않은 회차입니다.</h1><a href="#home">홈으로</a>';return;}const reviews=await api.rpc('public_reviews',{p_session:id});root.innerHTML=`<h1>${safe(s.title)}</h1>${card(s)}<section class="panel"><h2>프로그램 안내</h2><p>${safe(s.description)}</p><p>주소: ${safe(s.address)}</p><h2>참가 조건</h2><p>${safe(s.audience)}</p>${requirementsHTML(s.requirements)}${https(s.applicationUrl)&&!sandbox?`<a class="button" href="${safe(https(s.applicationUrl))}" target="_blank" rel="noopener noreferrer">공식 신청 페이지로 이동</a>`:`<p class="notice">${sandbox?'가상 테스트 자료 — 실제 신청할 수 없습니다.':'공식 연락처로 신청 방법을 확인해 주세요.'}</p>`}<p>연락처: ${safe(s.phone||'공식 안내 참고')}</p><button class="secondary" data-subscribe="${s.programId}">새 일정·모집 변경 알림 받기</button><button class="secondary" data-unsubscribe="${s.programId}">알림 해제</button></section><section><h2>현장 확인을 거친 후기</h2>${reviews.map(r=>`<article>${safe(r.body)}</article>`).join('')||'<p>공개된 후기가 없습니다.</p>'}</section>`;return;}
 if(page==='review'){root.innerHTML=`<h1>참가 후기 작성</h1><p>현장에서 받은 일회용 확인 링크와 이메일이 확인된 로그인 계정이 필요합니다. 이름·전화번호·다른 참가자의 사적인 이야기는 적지 마세요. 운영자 확인 후 익명 공개됩니다.</p><form id="review" data-code="${safe(id)}"><label>후기<textarea name="body" required minlength="10" maxlength="1500"></textarea></label><button>검토 요청</button></form>`;return;}
 root.innerHTML=page==='home'?home():page==='themes'?themesView():page==='calendar'?calendarView():page==='places'?placesView():page==='discover'?quiz():page==='shelf'?`<h1>나의 머뭄 서랍</h1><p>이 기기에 저장한 승인 피정입니다. 공개 중지된 자료는 표시하지 않습니다.</p><div class="card-list">${rows.filter(r=>saved.includes(r.programId)).map(s=>card(s)).join('')||'<p>저장한 공개 피정이 없습니다.</p>'}</div><a href="../index.html#shelf">기존 v0.2 시연 서랍</a>`:home();}
root.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;const d=b.dataset;try{
 if('answer'in d||'skip'in d){const y=scrollY;if('answer'in d)answers[step]=Number(d.answer);else delete answers[step];step++;await render();document.querySelector('#quiz-title')?.focus({preventScroll:true});window.scrollTo(0,y);return;}
 if('back'in d){step=Math.max(0,step-1);await render();return;}
 if('restart'in d){step=0;answers={};conditions={};await render();return;}
 if(d.save){saved=saved.includes(d.save)?saved.filter(x=>x!==d.save):[...saved,d.save];localStorage.setItem(store,JSON.stringify(saved));await render();return;}
 if('minute'in d){minute=Number(d.minute);await render();return;}
 if('refresh'in d){rows=normalizeCatalog(await api.rpc('public_catalog'));await render();message.textContent='최신 승인 자료를 불러왔습니다.';return;}
 if(d.subscribe||d.unsubscribe){await api.rpc('ops_subscribe',{p_program:d.subscribe||d.unsubscribe,p_enabled:!!d.subscribe});message.textContent='알림 설정을 저장했습니다. 수도회 운영실의 내 알림에서 확인할 수 있습니다.';}
 }catch(e){message.textContent=e.message;}});
root.addEventListener('submit',async e=>{e.preventDefault();const f=e.target,d=Object.fromEntries(new FormData(f));try{
 if(f.id==='conditions'){conditions={...d,courses:(d.courses||'').split(',').map(x=>x.trim()).filter(Boolean),durationRequired:!!d.durationRequired,companyRequired:!!d.companyRequired,minors:!!d.minors};await render();return;}
 if(f.id==='search'){const filtered=rows.filter(s=>(!d.region||s.region===d.region)&&(!d.tag||s.tags.includes(d.tag))&&(!d.from||s.start.slice(0,10)>=d.from)&&(!d.to||s.end.slice(0,10)<=d.to)&&(!d.budget||s.feeUnit==='person'&&s.feeComplete&&s.fee<=Number(d.budget))&&Date.parse(s.end)>Date.now());document.querySelector('#matches').innerHTML=filtered.map(s=>card(s)).join('')||'<p>조건에 맞는 공개 회차가 없습니다.</p>';return;}
 if(f.id==='review'){await api.rpc('ops_submit_review',{p_code:f.dataset.code,p_body:d.body});root.innerHTML='<h1>후기 검토를 요청했습니다.</h1><p>개인정보 확인 후 익명으로 공개합니다.</p>';}
 }catch(e){message.textContent=e.message;}});
window.addEventListener('hashchange',()=>{message.textContent='';render().catch(e=>message.textContent=e.message);});
if(sandbox){document.querySelector('#environment').textContent='가상 로컬 테스트 자료 · 실제 수도회·신청 아님';document.querySelector('#ops-link').href='index.html?sandbox=1';}
try{api=await connect();if(!api){root.innerHTML='<h1>개발용 데이터베이스 연결이 필요합니다.</h1><p>가상 자료를 실제 피정으로 채우지 않습니다.</p><a href="index.html">운영실에서 연결 설정</a>';}
 else {rows=normalizeCatalog(await api.rpc('public_catalog'));await render();}}catch(e){message.textContent=e.message;root.innerHTML='<h1>승인된 자료를 불러오지 못했습니다.</h1><p>연결을 확인한 뒤 새로고침해 주세요.</p>';}
