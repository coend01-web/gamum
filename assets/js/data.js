// 모든 기관, 프로그램, 일정은 UI 개발용 가상 데이터입니다. 실서비스 게시 금지.
(function () {
  const today = new Date();
  const date = (offset, hour=10) => { const d=new Date(today.getFullYear(),today.getMonth(),today.getDate()+offset,hour,0,0); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(hour).padStart(2,'0')}:00:00`; };
  const centers = [
    ['p01','숲길의 집','경기','고요한 숲과 산책로','숲'],['p02','은총의 정원','서울','도심의 작은 정원','도심'],['p03','바람의 수도원','강원','산과 계곡','산'],
    ['p04','평화의 뜰','충남','넓은 들판','자연'],['p05','해안의 집','부산','바다와 가까운 공간','바다'],['p06','제주의 숨','제주','오름과 바람','자연'],
    ['p07','말씀의 집','대전','대중교통 접근이 쉬운 공간','도심'],['p08','별빛의 집','경북','차분한 시골 마을','자연'],['p09','정원의 쉼','전남','정원과 숲','숲']
  ].map(([id,name,region,description,environment])=>({id,name,region,description,environment,organization:`${name} 운영기관 (가상)`,address:`${region} 지역 · 상세 주소 미등록` }));
  const programInputs=[
    ['r01','잠시 멈추는 침묵의 시간','p01',['침묵','쉼','기도','개인'],['침묵','쉼','개인'], '분주한 일상에서 잠시 물러나 조용한 시간을 보내는 머뭄입니다.','침묵 속에서 나와 하느님의 목소리에 귀 기울이는 시간', 2,78000,'adult',18,25,'external'],
    ['r02','청년과 함께 읽는 복음','p02',['청년','성경','말씀','나눔'],['말씀','배움','공동체'], '말씀을 읽고 서로의 질문을 나누는 청년 머뭄입니다.','말씀을 통해 나의 일상을 새롭게 바라보는 시간', 9,20000,'youth',1,40,'linked'],
    ['r03','숲에서 걷는 기도','p03',['걷기','자연','기도','쉼'],['자연','쉼','활동'], '숲을 걸으며 기도와 개인 묵상을 경험합니다.','한 걸음씩 걷는 동안 조용히 마음을 정돈하는 시간', 15,45000,'all',1,18,'external'],
    ['r04','말씀과 함께하는 2박 3일','p04',['성경','침묵','말씀','묵상'],['말씀','침묵','배움'], '성경 본문을 천천히 읽고 개인 묵상에 머무는 시간입니다.','말씀의 깊이를 발견하는 고요한 여정', 22,155000,'adult',3,25,'external'],
    ['r05','바닷가에서 쉬어 가는 하루','p05',['쉼','자연','당일','자유'],['쉼','자연','자유'], '하루 동안 쉼과 자유 시간을 누리는 머뭄입니다.','바다 가까이에서 일상의 호흡을 되찾는 시간', 6,18000,'all',1,16,'external'],
    ['r06','제주의 고요한 머뭄','p06',['개인','침묵','자연','장기'],['개인','침묵','자연'], '제주의 풍경 안에서 조용히 머무는 개인 중심 프로그램입니다.','오름과 바람 사이, 오롯이 자신과 마주하는 시간', 34,210000,'adult',3,12,'external'],
    ['r07','처음 시작하는 관상기도','p07',['관상','기도','초심자','영성'],['관상','기도','배움'], '관상기도를 처음 접하는 사람을 위한 차근차근한 안내입니다.','기도를 시작하는 사람을 위한 다정한 첫걸음', 12,30000,'all',1,35,'external'],
    ['r08','삶의 선택을 위한 영신수련','p08',['영신수련','식별','침묵','기도'],['식별','침묵','기도'], '인생의 방향을 고민하는 이들을 위한 영적 성찰의 시간입니다.','길을 찾을 때 잠시 멈춰 서는 용기', 45,190000,'adult',3,20,'external'],
    ['r09','가족이 함께 머무는 주말','p09',['가족','관계','나눔','공동체'],['관계','공동체','쉼'], '가족이 함께 머물고 서로를 바라보는 시간을 가집니다.','가까운 사람과 새롭게 만나는 주말', 27,80000,'family',2,24,'external'],
    ['r10','청소년을 위한 영성 캠프','p01',['청소년','성경','공동체','체험'],['배움','공동체','활동'], '청소년이 함께 체험하고 말씀을 나누는 프로그램입니다.','함께 웃고 질문하며 자라는 시간', 17,90000,'teen',2,30,'linked'],
    ['r11','용서와 화해의 길','p04',['화해','관계','기도','묵상'],['관계','기도','침묵'], '화해의 의미를 돌아보고 기도하는 시간입니다.','서두르지 않고 마음의 문을 여는 시간', 39,55000,'adult',1,20,'external'],
    ['r12','대림의 기다림과 말씀','p07',['대림','전례','성경','말씀'],['말씀','기도','배움'], '전례 시기의 의미를 말씀 안에서 살피는 프로그램입니다.','기다림의 시간을 새로운 눈으로 보는 하루', 55,22000,'all',1,30,'external']
  ];
  const programs=programInputs.map(([id,title,placeId,tags,traits,description,subtitle,offset,fee,audience,nights,capacity,channel],i)=>({id,title,placeId,tags,traits,description,subtitle,fee,audience,nights,capacity,channel, color:i%4,videoUrl:null,photoUrl:null,source:'가상 시연 데이터',reviewCount:0}));
  const sessions=programInputs.map(([id,title,placeId,tags,traits,description,subtitle,offset,fee,audience,nights,capacity,channel],i)=>({
    id:`s${String(i+1).padStart(2,'0')}`,programId:id,start:date(offset,10),end:date(offset+nights-1,16),applicationStart:date(offset-55,9),applicationEnd:date(offset-2,18),capacity, channel,
    admissions:'first_come',manualState:'unknown',lastConfirmed:null,externalId:channel==='linked'?(i===1?'external-youth-001':'external-youth-002'):null,
    schedule:[{time:'10:00',label:'도착 및 안내'},{time:'11:00',label:'프로그램 시작'},{time:'13:30',label:'기도와 성찰'},{time:'16:00',label:'마침 및 파견'}]
  }));
  sessions.push({ ...sessions[0],id:'s13',start:date(44,10),end:date(45,16),applicationStart:date(4,9),applicationEnd:date(42,18)});
  sessions.push({ ...sessions[1],id:'s14',start:date(42,10),end:date(42,16),applicationStart:date(12,9),applicationEnd:date(39,18), externalId:null,channel:'external'});
  window.GAMUM_DEMO={centers,programs,sessions};
})();
