/* Pure recommendation engine. No DOM, network, persistence, or invented sessions. */
(function (scope) {
  'use strict';
  const labels = {
    rest:'쉼', solitude:'혼자 머무는 시간', quiet:'고요함', reflective:'생각을 돌아보기', learning:'배움',
    connection:'대화', sharing:'나눔', community:'공동체', reconciliation:'화해', relationship:'관계',
    discernment:'길 찾기', renewal:'새로운 시작', experience:'새로운 경험', movement:'움직임',
    'one-on-one':'일대일 대화', guided:'안내', music:'음악', service:'봉사',
    'partial-silence':'부분 침묵', flexible:'유연한 일정', contemplative:'관상',
    'self-directed':'개인 자유피정','beginner-friendly':'입문 안내', scripture:'성경·말씀', lectio:'렉시오 디비나',
    lecture:'강의', walking:'걷기', arts:'예술', praise:'찬양', ecology:'생태영성',
    ignatian:'영신수련', silent:'대침묵', silence:'침묵', formation:'신앙교육',
    'faith-renewal':'신앙 재시작','liturgical-season':'전례 시기', monastic:'수도생활 체험',
    eucharistic:'성체조배', marian:'성모신심', charismatic:'성령쇄신', online:'온라인', commuter:'통원', daytime:'당일'
  };
  // Strong/direct = 3, related = 1, weak inference = .5. No tradition inferred from nature/music alone.
  const links = {
    rest:{rest:3,'self-directed':1}, solitude:{'self-directed':3,silence:1,silent:1},
    quiet:{silence:3,silent:3,contemplative:1}, contemplative:{contemplative:3,silence:1},
    reflective:{reflective:3,scripture:.5,lectio:.5,lecture:.5}, learning:{learning:3,lecture:1,formation:1,scripture:.5,lectio:.5},
    connection:{sharing:3,relationship:1,'one-on-one':1}, sharing:{sharing:3,community:1},community:{community:3,sharing:1},
    reconciliation:{reconciliation:3,relationship:1}, relationship:{relationship:3,reconciliation:1},
    discernment:{discernment:3,ignatian:1},renewal:{'faith-renewal':3,'beginner-friendly':1,'liturgical-season':1},
    movement:{walking:3,experience:1,service:.5,ecology:.5},experience:{experience:3,arts:1,walking:1,service:.5,ecology:.5},
    'one-on-one':{'one-on-one':3,guided:1},guided:{guided:3,'beginner-friendly':1},
    'beginner-friendly':{'beginner-friendly':3},music:{music:3,praise:3},
    'partial-silence':{'partial-silence':3},service:{service:3},
    flexible:{daytime:1,commuter:1,online:1},'self-directed':{'self-directed':3}
  };
  const axes = {rest:'need',quiet:'need',reconciliation:'need',relationship:'need',discernment:'need',renewal:'need',community:'need',connection:'need',service:'need',reflective:'content',learning:'content',music:'content'};
  const interests = {
    scripture:['scripture','lectio'],silence:['silence','silent','contemplative'],ignatian:['ignatian','discernment'],
    eucharistic:['eucharistic'],marian:['marian'],praise:['praise','charismatic'],monastic:['monastic'],
    family:['relationship','family'],ecology:['ecology','service']
  };
  const durationLabels={day:'하루 정도','one-night':'1박 2일','two-three-nights':'2~3박',long:'긴 시간','non-residential':'숙박 없이',flexible:'미정'};
  const companyLabels={solo:'혼자',friends:'친구·지인',couple:'배우자',family:'가족',group:'본당·단체',flexible:'미정'};
  const ms = v => v ? new Date(v).getTime() : NaN;
  const present = v => v !== '' && v !== null && v !== undefined;
  const numeric = v => present(v) && Number.isFinite(Number(v));
  const http = v => /^https?:\/\//i.test(v||'');
  function preferences(questions,answers) {
    const raw={},axisTotals={},selected=[];let duration='flexible',company='flexible';
    questions.forEach((q,i)=>{const o=q.opts[answers[i]];if(!o)return;selected.push(i);
      if(o.preference){duration=o.preference.duration||duration;company=o.preference.company||company;return;}
      const total=Object.values(o.weights).reduce((a,b)=>a+b,0);
      for(const [key,value] of Object.entries(o.weights)){const axis=axes[key]||'format',weight=value/total;raw[key]=(raw[key]||0)+weight;axisTotals[axis]=(axisTotals[axis]||0)+weight;}
    });
    const weights=Object.fromEntries(Object.entries(raw).map(([k,v])=>[k,v/axisTotals[axes[k]||'format']]));
    return {weights,raw,duration,company,answered:selected.length};
  }
  function profile(pref) {
    const w=pref.raw, scores={쉼:w.rest||0,침묵:(w.quiet||0)+(w.contemplative||0),성찰:(w.reflective||0)+(w.learning||0),관계:(w.connection||0)+(w.sharing||0)+(w.relationship||0)+(w.reconciliation||0)+(w.community||0)+(w.service||0),경험:(w.experience||0)+(w.movement||0),식별:w.discernment||0,개인:w.solitude||0,시작:(w.renewal||0)+(w.guided||0)+(w['beginner-friendly']||0)};
    return Object.values(scores).some(x=>x>0)?Object.entries(scores).sort((a,b)=>b[1]-a[1])[0][0]:'열림';
  }
  function nights(session) {
    if(!Number.isFinite(ms(session.start))||!Number.isFinite(ms(session.end))||ms(session.end)<ms(session.start))return null;
    // Calendar dates, not 24-hour periods: daylight-saving changes must not alter nights.
    return Math.round((Date.parse(session.end.slice(0,10))-Date.parse(session.start.slice(0,10)))/86400000);
  }
  function durationMatches(value,s) {
    const n=nights(s);if(n===null)return false;
    return value==='flexible'||!value?true:value==='day'?n===0:value==='one-night'?n===1:value==='two-three-nights'?n>=2&&n<=3:value==='long'?n>=4:value==='non-residential'?['daytime','online','commuter'].includes(s.mode):false;
  }
  function status(s,now=Date.now()) {
    if(!Number.isFinite(ms(s.start))||!Number.isFinite(ms(s.end)))return {label:'일정 확인 필요',closed:false};
    if(ms(s.end)<now)return {label:'종료',closed:true};
    // Verified operational status is authoritative; never recommend paused/waitlisted sessions as open.
    if(s.demo===false&&['paused','waiting','ended'].includes(s.status))return {label:{paused:'접수 일시중지',waiting:'대기 접수',ended:'종료'}[s.status],closed:true};
    const verified=Number.isFinite(ms(s.checkedAt))&&now-ms(s.checkedAt)>=0&&now-ms(s.checkedAt)<=15*60000;
    if(s.status==='closed'||s.status==='cancelled'||(verified&&s.remaining===0))return {label:s.status==='cancelled'?'취소':'모집 마감',closed:true};
    if(Number.isFinite(ms(s.applicationEnd))&&ms(s.applicationEnd)<now)return {label:'접수 기간 종료',closed:true};
    if(Number.isFinite(ms(s.applicationStart))&&ms(s.applicationStart)>now)return {label:'접수 예정',closed:false};
    if(verified&&s.status==='paused')return {label:'접수 일시중지',closed:true};
    if(verified&&s.status==='open')return {label:'접수 중 · 주최 확인',closed:false};
    return {label:'주최 측 확인 필요',closed:false};
  }
  function eligibility(p,s,c,pref,now) {
    const reject=[],unknown=[];const r=p.requirements||{};const company=c.company||pref.company;
    if(!p.demo&&(!p.source?.verified||!http(p.source?.url)||!Number.isFinite(ms(p.source?.checkedAt))))unknown.push('공식 공고');
    if(!s.demo&&(!s.source?.verified||!http(s.source?.url)||!Number.isFinite(ms(s.source?.checkedAt))))unknown.push('모집 회차 출처');
    if(!p.demo&&!http(s.applicationUrl)&&!s.phone)unknown.push('공식 연락·신청 경로');
    if(!Number.isFinite(ms(s.start))||nights(s)===null)unknown.push('정확한 일정');
    else if(ms(s.start)<=now)reject.push('이미 시작한 회차');
    if(status(s,now).closed)reject.push('모집 종료');
    if(c.region&&s.region!==c.region)(s.region?reject:unknown).push('지역');
    if(c.dateFrom&&s.start?.slice(0,10)<c.dateFrom)reject.push('가능한 시작일');
    if(c.dateTo&&s.end?.slice(0,10)>c.dateTo)reject.push('가능한 종료일');
    if(c.durationRequired&&!durationMatches(c.duration||pref.duration,s))reject.push('필수 기간');
    if(c.mode&&c.mode!=='any'){
      if(!s.mode)unknown.push('숙박·참여 방식');
      else if(c.mode==='no-night'?!['daytime','commuter','online'].includes(s.mode):s.mode!==c.mode)reject.push('필수 참여 방식');
    }
    if(numeric(c.budget)){
      if(!numeric(s.fee)||s.feeUnit!=='person'||s.feeComplete!==true)unknown.push('1인당 전체 참가비');
      else if(Number(s.fee)>Number(c.budget))reject.push('예산');
    }
    // Incomplete records never become confirmed eligible by a high preference score.
    if(r.complete!==true)unknown.push('참가 대상·동행·선행 조건');
    const ages=[c.age,c.childAge,c.youngestAge,c.oldestAge].filter(numeric).map(Number);
    if(c.minors&&!numeric(c.childAge))unknown.push('동행 자녀 나이');
    if(numeric(r.minAge)||numeric(r.maxAge)){
      if(!ages.length)unknown.push('참가자 나이');
      if((numeric(c.partySize)&&Number(c.partySize)>1||['friends','couple','family','group'].includes(company))&&(!numeric(c.youngestAge)&&!numeric(c.childAge)||!numeric(c.oldestAge)))unknown.push('동행 전체의 연령 범위');
      if(ages.some(x=>numeric(r.minAge)&&x<Number(r.minAge)||numeric(r.maxAge)&&x>Number(r.maxAge)))reject.push('연령 제한');
    }
    if(r.gender&&r.gender!=='any'){
      if(!c.gender)unknown.push('참가자 성별');else if(c.gender!==r.gender)reject.push('성별 제한');
    }
    if(r.roles?.length&&!r.roles.includes('any')){
      if(!c.role)unknown.push('참가 대상');else if(!r.roles.includes(c.role))reject.push('특정 대상 전용');
    }
    if(r.vocationOnly&&c.vocation!=='yes')(c.vocation==='no'?reject:unknown).push('성소 관심자 조건');
    if(r.marriedOnly&&c.married!=='yes')(c.married==='no'?reject:unknown).push('혼인 조건');
    if(r.faith&&r.faith!=='any'&&c.faith!==r.faith)(c.faith?reject:unknown).push('신앙 단계');
    if(r.companies?.length){
      if(company==='flexible'&&!r.companies.includes('solo'))unknown.push('동행 조건');
      else if(company!=='flexible'&&!r.companies.includes(company)){
        // Q10 is a preference; only explicit mandatory company or exclusive programs exclude.
        if(c.companyRequired||!r.companies.includes('solo'))reject.push('동행 조건');
        else unknown.push('희망 동행 허용 여부');
      }
    } else unknown.push('동행 허용 여부');
    if(numeric(r.minParty)||numeric(r.maxParty)){
      if(!numeric(c.partySize))unknown.push('동행 인원');
      else if(numeric(r.minParty)&&Number(c.partySize)<r.minParty||numeric(r.maxParty)&&Number(c.partySize)>r.maxParty)reject.push('인원 조건');
    }
    if(numeric(c.partySize)&&numeric(s.capacity)&&Number(c.partySize)>Number(s.capacity))reject.push('회차 정원');
    if(numeric(c.partySize)&&numeric(s.remaining)&&status(s,now).label==='접수 중 · 주최 확인'&&Number(c.partySize)>Number(s.remaining))reject.push('확인된 잔여석');
    if(r.prerequisites?.length){
      if(c.experience==='first')reject.push('선행 수련 필수');
      else if(!r.prerequisites.every(x=>(c.courses||[]).includes(x)))unknown.push('주최가 요구하는 선행 과정 이수');
    }
    return {state:reject.length?'excluded':unknown.length?'unconfirmed':'eligible',reasons:[...new Set(reject.length?reject:unknown)]};
  }
  function score(p,s,pref,c={}) {
    const features=new Set(Object.values(p.taxonomy||{}).flat()),hits=[];let value=0;
    // Per-axis normalized preferences; each tag uses its strongest supported intersection.
    for(const [key,weight] of Object.entries(pref.weights)){
      const map=links[key]||{[key]:3};const matches=Object.entries(map).filter(([tag])=>features.has(tag)).sort((a,b)=>b[1]-a[1]);
      if(matches.length){const [tag,strength]=matches[0];value+=weight*strength;hits.push({tag,preference:key,strength,weight});}
    }
    if(c.interest&&interests[c.interest]){const tag=interests[c.interest].find(x=>features.has(x));if(tag){value+=2;hits.push({tag,preference:'explicit',strength:3,weight:1});}}
    if(durationMatches(c.duration||pref.duration,s)&&(c.duration||pref.duration)!=='flexible')value+=.5;
    if(p.requirements?.companies?.includes(c.company||pref.company)&&(c.company||pref.company)!=='flexible')value+=.25;
    if(features.has('silent')&&(nights(s)||0)>=4)value-=2*((pref.weights['partial-silence']||0)+(pref.weights.flexible||0)+(pref.weights.sharing||0));
    hits.sort((a,b)=>b.weight*b.strength-a.weight*a.strength);
    const h=hits[0];const reason=h?(h.preference==='explicit'?`직접 고른 관심 영성과 공고의 ‘${labels[h.tag]||h.tag}’이 맞닿아요.`:h.strength===.5?`생각하고 배우는 시간을 선호하셨어요. 안내의 ‘${labels[h.tag]||h.tag}’을 가볍게 살펴볼 수 있어요.`:`‘${labels[h.preference]||h.preference}’을 선호한 답과 안내의 ‘${labels[h.tag]||h.tag}’이 맞닿아요.`):'입력한 참가 조건을 확인할 수 있는 회차입니다. 세부 내용을 살펴보세요.';
    return {score:value,reason,hits};
  }
  function recommend({questions,answers={},programs=[],sessions=[],conditions={},now=Date.now()}) {
    const pref=preferences(questions,answers),eligible=[],unconfirmed=[],excluded=[];
    for(const s of sessions){const p=programs.find(x=>x.id===s.programId);if(!p)continue;
      const fit=eligibility(p,s,conditions,pref,now),item={p,s,fit,...score(p,s,pref,conditions),status:status(s,now)};
      (fit.state==='eligible'?eligible:fit.state==='unconfirmed'?unconfirmed:excluded).push(item);
    }
    eligible.sort((a,b)=>b.score-a.score||ms(a.s.start)-ms(b.s.start)||a.p.id.localeCompare(b.p.id));
    const chosen=[],pool=[...eligible];
    while(chosen.length<3&&pool.length){
      // Diversity is only a tie/near-tie adjustment, never a substitute for qualification.
      const best=pool[0].score;const shortlist=pool.filter(x=>x.score>=best-.25);
      shortlist.sort((a,b)=>{const cost=x=>chosen.filter(y=>y.p.organization===x.p.organization).length*.12+chosen.filter(y=>y.s.region===x.s.region).length*.06;return (b.score-cost(b))-(a.score-cost(a));});
      const next=shortlist[0];chosen.push(next);for(let i=pool.length-1;i>=0;i--)if(pool[i].p.id===next.p.id)pool.splice(i,1);
    }
    return {items:chosen,eligible,unconfirmed,excluded,pref,top:profile(pref),likes:Object.entries(pref.raw).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([k])=>labels[k]).filter(Boolean)};
  }
  const legacyTags={쉼:'rest',침묵:'silence',개인:'self-directed',자유:'self-directed',성경:'scripture',말씀:'scripture',나눔:'sharing',공동체:'community',걷기:'walking',관상:'contemplative',초심자:'beginner-friendly',영신수련:'ignatian',식별:'discernment',가족:'family',관계:'relationship',체험:'experience',화해:'reconciliation',대림:'liturgical-season',전례:'liturgical-season'};
  function adaptLegacy(programs,sessions,centers,sync={}) {
    return {
      programs:programs.map(p=>{const center=centers.find(c=>c.id===p.placeId)||{};return {id:p.id,title:p.title,organization:center.organization||center.name,demo:true,
        taxonomy:{features:[...new Set((p.tags||[]).map(t=>legacyTags[t]).filter(Boolean))]},
        // Absence of a restriction is not proof that it is unrestricted. No invented qualifications.
        requirements:{complete:false,minAge:p.audience==='adult'?18:null,companies:null,prerequisites:null},
        source:{url:null,verified:false},audience:p.demoAudience||({adult:'성인',youth:'청년',teen:'청소년',family:'가족',all:'누구나'}[p.audience]),legacy:p,...p.recommendation,id:p.id};}),
      sessions:sessions.map(s=>{const p=programs.find(p=>p.id===s.programId)||{},center=centers.find(c=>c.id===p.placeId)||{},event=sync[s.id];return {...s,demo:true,region:center.region,place:center.name,
        mode:nights(s)===0?'daytime':null,fee:p.fee,feeUnit:null,feeComplete:false,
        status:s.manualState==='closed'?'closed':event?.status||'unknown',remaining:event?.remaining,checkedAt:event?.syncedAt,
        phone:p.demoPhone||null,applicationUrl:p.demoLink||null,source:{verified:false},...s.recommendation,id:s.id,programId:s.programId};})
    };
  }
  scope.GAMUM_RECOMMEND={labels,links,interests,durationLabels,companyLabels,preferences,profile,nights,durationMatches,status,eligibility,score,recommend,adaptLegacy};
})(typeof window==='undefined'?globalThis:window);
