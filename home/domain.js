export const regions=['서울','경기','인천','강원','충북','충남','대전','세종','전북','광주','전남','경북','대구','경남','부산','울산','제주'];
export const statusLabels={scheduled:'모집 예정',open:'접수 중',waiting:'대기 접수',paused:'일시중단',closed:'조기마감',cancelled:'취소',ended:'종료'};
export const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function https(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
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
