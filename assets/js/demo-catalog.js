/* Fictional fixtures only. Never infer or copy these rules onto real announcements. */
(function(scope){
 'use strict';
 const all=['solo','friends','couple','family','group'];
 const entries={
  r01:{purpose:['rest'],format:['silence','self-directed'],companies:['solo','friends','couple'],plan:'자유 휴식과 개인 침묵 묵상. 연령 제한 없이 참여하는 가상 설정입니다.'},
  r02:{purpose:['scripture','learning'],format:['sharing','guided'],companies:['solo','friends','couple','group'],minAge:19,maxAge:39,plan:'만 19~39세 청년의 복음 읽기와 소그룹 나눔.'},
  r03:{purpose:['rest'],format:['walking','experience'],companies:all,plan:'숲길 걷기와 개인 묵상. 자연 선호를 특정 영성 전통으로 단정하지 않습니다.'},
  r04:{purpose:['scripture'],format:['lectio','learning','reflective','silence'],companies:['solo','friends','couple','group'],plan:'성경 읽기, 안내 강의, 개인 묵상. 선행 과정 없이 참여하는 가상 입문 구성입니다.'},
  r05:{purpose:['rest'],format:['self-directed','daytime'],companies:all,plan:'바닷가에서 자유롭게 쉬는 당일 프로그램. 선행 과정과 연령 제한 없음.'},
  r06:{purpose:['rest'],format:['self-directed','silence'],companies:['solo'],minAge:18,plan:'만 18세 이상, 혼자 참여하는 개인 침묵 시간. 선행 과정은 필요하지 않습니다.'},
  r07:{purpose:['contemplative','faith-renewal'],format:['guided','beginner-friendly'],companies:all,plan:'관상기도 첫걸음 안내와 짧은 실습. 첫 피정 참여 가능.'},
  r08:{purpose:['discernment'],tradition:['ignatian'],format:['guided','reflective'],companies:['solo','friends','couple','group'],plan:'삶의 선택을 돌아보는 입문 성찰과 안내. 성소 전용·심화 수련이 아니며 선행 과정 없음.'},
  r09:{purpose:['relationship','family'],format:['sharing','community'],companies:['family','couple'],plan:'가족 대화와 공동 활동. 자녀 동반 허용, 연령·혼인 여부 제한 없음.'},
  r10:{purpose:['scripture'],format:['experience','community','guided'],companies:['solo','friends','group'],minAge:13,maxAge:18,plan:'만 13~18세 청소년의 말씀·공동체 체험. 가상 청소년 전용 회차입니다.'},
  r11:{purpose:['reconciliation','relationship'],format:['one-on-one','reflective'],companies:all,plan:'화해 주제 묵상과 일대일 경청 시간. 선행 과정 없이 참여하는 가상 설정입니다.'},
  r12:{purpose:['scripture','liturgical-season'],format:['praise','music','community'],companies:all,plan:'대림 말씀 읽기와 함께 부르는 찬양 20분. 이번 추천 시연을 위해 명시한 가상 구성입니다.'}
 };
 const names={solo:'혼자',friends:'친구·지인',couple:'배우자',family:'가족',group:'본당·단체'};
 function enrich(seed){
  const programs=seed.programs.map(p=>{
   const e=entries[p.id];
   // Explicit opt-in by the original fictional source marker. Existing real/registered metadata wins.
   if(!e||p.source!=='가상 시연 데이터'||p.demo===false||p.recommendation)return {...p};
   const age=e.minAge?`만 ${e.minAge}세${e.maxAge?'~'+e.maxAge+'세':' 이상'}`:'연령 제한 없음';
   const audience=`${age} · ${e.companies.map(k=>names[k]).join('·')} 허용 (가상 설정)`;
   return {...p,demoAudience:audience,recommendation:{demo:true,fixtureVersion:'everyday-v2-demo-1',audience,
    taxonomy:{purpose:e.purpose,tradition:e.tradition||[],format:e.format},
    requirements:{complete:true,minAge:e.minAge??null,maxAge:e.maxAge??null,gender:'any',roles:['any'],faith:'any',
     companies:[...e.companies],marriedOnly:false,vocationOnly:false,minParty:null,maxParty:null,prerequisites:[]},
    source:{verified:false,url:null,kind:'fictional-fixture'},demoPlan:e.plan,
    demoConditions:`가상 시연 참가 조건: ${audience}. 성별·신앙 단계·직분 제한 없음. 첫 피정 참여 가능, 선행 과정 없음. 실제 기관의 조건이 아닙니다.`}};
  });
  const sessions=seed.sessions.map(s=>{
   const p=programs.find(p=>p.id===s.programId);
   const sampleProgram=s.id==='s13'?'r01':s.id==='s14'?'r02':/^s(0[1-9]|1[0-2])$/.test(s.id)?'r'+s.id.slice(1):null;
   if(p?.recommendation?.fixtureVersion!=='everyday-v2-demo-1'||s.recommendation||s.demo===false||sampleProgram!==s.programId||(s.source&&s.source!=='가상 시연 데이터'))return {...s};
   return {...s,recommendation:{demo:true,fixtureVersion:'everyday-v2-demo-1',
    mode:s.start.slice(0,10)===s.end.slice(0,10)?'daytime':'residential',
    fee:p.fee,feeUnit:'person',feeComplete:true,phone:null,applicationUrl:null,
    source:{verified:false,url:null,kind:'fictional-fixture'}}};
  });
  return {...seed,programs,sessions};
 }
 scope.GAMUM_DEMO_CATALOG={enrich};
})(typeof window==='undefined'?globalThis:window);
