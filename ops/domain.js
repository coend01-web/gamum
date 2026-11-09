export const regions=['서울','경기','인천','강원','충북','충남','대전','세종','전북','광주','전남','경북','대구','경남','부산','울산','제주'];
export const statusLabels={scheduled:'모집 예정',open:'접수 중',waiting:'대기 접수',paused:'일시중단',closed:'조기마감',cancelled:'취소',ended:'종료'};
export const roles={owner:'소유자',admin:'관리자',editor:'편집자'};
export const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function https(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
export function validateConfig(url,key){return /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url)&&/^sb_publishable_[A-Za-z0-9_-]+$/.test(key);}
export const columns=['starts_at','ends_at','application_start','application_end','fee','fee_unit','fee_complete','capacity','mode','status','application_url','phone'];
export function parseCSV(text){
 if(text.length>1024*1024)throw Error('파일은 1MB 이하로 나누어 주세요.');
 const rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else if(quoted||cell==='')quoted=!quoted;else throw Error('따옴표 형식이 잘못되었습니다.');}else if(c===','&&!quoted){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v!==''))rows.push(row);row=[];cell='';}else cell+=c;}
 if(quoted)throw Error('닫히지 않은 따옴표가 있습니다.');row.push(cell);if(row.some(v=>v!==''))rows.push(row);
 const headers=(rows.shift()||[]).map(v=>v.replace(/^\uFEFF/,'').trim());
 if(headers.length!==columns.length||columns.some(c=>!headers.includes(c)))throw Error('CSV 양식의 열 이름을 그대로 사용해 주세요.');
 return rows.map((r,i)=>{if(r.length!==headers.length)throw Error(`${i+2}행의 열 수가 맞지 않습니다.`);return Object.fromEntries(headers.map((h,j)=>[h,r[j].trim()]));});
}
export function validateSessions(rows,existing=[]){
 const errors=[],seen=new Set(existing.map(s=>new Date(s.starts_at).toISOString()));
 if(!rows.length||rows.length>200)errors.push('한 번에 1~200개 회차를 입력해 주세요.');
 const normalized=rows.map((r,i)=>{const fail=m=>errors.push(`${i+1}행: ${m}`);const out={...r};
 for(const k of ['starts_at','ends_at','application_start','application_end']){if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{1,6})?)?(?:Z|[+-]\d\d:\d\d)$/.test(r[k]||'')||!Number.isFinite(Date.parse(r[k])))fail('날짜와 시간대(+09:00)를 확인해 주세요.');}
 const a=Date.parse(r.starts_at),b=Date.parse(r.ends_at),c=Date.parse(r.application_start),d=Date.parse(r.application_end);
 if(b<a||c>=d||d>a)fail('시작·종료일 및 모집 기간의 순서를 확인해 주세요.');
 if(Number.isFinite(a)){const key=new Date(a).toISOString();if(seen.has(key)&&!r.id)fail('시작일이 중복되었습니다.');seen.add(key);}
 for(const k of ['fee','capacity']){if(String(r[k]).trim()===''||!Number.isInteger(Number(r[k]))||Number(r[k])<(k==='fee'?0:1))fail('참가비·정원은 올바른 정수로 입력해 주세요.');out[k]=Number(r[k]);}
 if(!['person','family','group'].includes(r.fee_unit))fail('비용 단위를 확인해 주세요.');
 if(![true,false,'true','false'].includes(r.fee_complete))fail('전체 비용 확인 값은 true 또는 false입니다.');out.fee_complete=r.fee_complete===true||r.fee_complete==='true';
 if(!['daytime','residential','commuter','online'].includes(r.mode)||!Object.hasOwn(statusLabels,r.status))fail('진행 방식·모집 상태를 확인해 주세요.');
 if(r.application_url&&!https(r.application_url))fail('신청 링크는 올바른 https 주소여야 합니다.');
 return out;});return {rows:normalized,errors};
}
export function repeatSessions(row,count,intervalDays){
 if(!Number.isInteger(count)||count<1||count>200||!Number.isInteger(intervalDays)||intervalDays<1)throw Error('반복은 1~200회, 간격은 1일 이상으로 입력해 주세요.');
 return Array.from({length:count},(_,i)=>{const next={...row};delete next.id;delete next.version;for(const k of ['starts_at','ends_at','application_start','application_end'])next[k]=new Date(Date.parse(row[k])+i*intervalDays*86400000).toISOString();return next;});
}
export const koreaTime=v=>new Date(Date.parse(v)+9*3600000).toISOString().replace('Z','+09:00');
export function normalizeCatalog(rows){return rows.map(r=>({...r,...Object.fromEntries(['start','end','applicationStart','applicationEnd'].map(k=>[k,koreaTime(r[k])]))}));}
export function catalogFromRows(rows){const programs=new Map(),sessions=[];
 for(const row of rows){if(row.demo!==false||(row.catalogKind&&row.catalogKind!=='retreat'))continue;
 programs.set(row.programId,{id:row.programId,title:row.title,description:row.description,organization:row.organization,taxonomy:row.taxonomy,requirements:row.requirements,source:row.source,audience:row.audience,demo:false});sessions.push({...row,demo:false});}
 return {programs:[...programs.values()],sessions};}
export function visibleStatus(s,now=Date.now()){
 if(Date.parse(s.end)<now)return '종료';if(['closed','cancelled','paused','waiting','ended'].includes(s.status))return statusLabels[s.status];
 if(Date.parse(s.applicationEnd)<now)return '모집 마감';if(Date.parse(s.applicationStart)>now)return '모집 예정';return statusLabels[s.status]||'주최 측 확인 필요';
}
export function requirementsHTML(r={}){
 const range=(a,b,unit)=>a==null&&b==null?'제한 없음':`${a??'제한 없음'} ~ ${b??'제한 없음'}${unit}`;
 const company={solo:'혼자',friends:'친구·지인',couple:'배우자',family:'가족',group:'단체'},role={any:'제한 없음',lay:'평신도',religious:'수도자',clergy:'성직자'};
 return `<dl><dt>연령</dt><dd>${range(r.minAge,r.maxAge,'세')}</dd><dt>동행</dt><dd>${safe((r.companies||[]).map(x=>company[x]||x).join(' · ')||'확인 필요')}</dd><dt>인원</dt><dd>${range(r.minParty,r.maxParty,'명')}</dd><dt>대상 자격</dt><dd>${safe((r.roles||[]).map(x=>role[x]||x).join(' · ')||'확인 필요')}</dd><dt>성별</dt><dd>${safe({any:'제한 없음',female:'여성',male:'남성'}[r.gender]||'확인 필요')}</dd><dt>신앙 단계</dt><dd>${safe({any:'제한 없음',catholic:'가톨릭 신자',catechumen:'예비신자',other:'기타'}[r.faith]||'확인 필요')}</dd><dt>선행 과정</dt><dd>${safe(r.prerequisites?.length?r.prerequisites.join(' · '):'필수 과정 없음')}</dd><dt>추가 조건</dt><dd>${r.vocationOnly?'성소 관심자 · ':''}${r.marriedOnly?'혼인한 부부':'공식 참가 안내 참조'}</dd></dl>`;
}
