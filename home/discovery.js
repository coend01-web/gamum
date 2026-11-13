// Pure public discovery rules. Original v0.2 multi-tag intersection is retained.
export const topicGroups=[['내 마음의 필요',['쉼','침묵','말씀','관계','식별','화해','기도','자연']],['피정 방식',['개인','나눔','걷기','관상','묵상','체험','공동체','자유']],['특별한 주제',['영신수련','성경','청년','청소년','가족','대림','전례','초심자']]];
export const topicAliases={쉼:['rest'],침묵:['silence','silent','quiet','partial-silence'],말씀:['scripture','lectio'],관계:['relationship','connection'],식별:['discernment','ignatian'],화해:['reconciliation'],기도:['prayer','eucharistic','contemplative'],자연:['ecology'],개인:['self-directed','solitude'],나눔:['sharing'],걷기:['walking'],관상:['contemplative'],묵상:['reflective','lectio'],체험:['experience','monastic'],공동체:['community'],자유:['self-directed'],영신수련:['ignatian'],성경:['scripture','lectio'],청년:['youth'],청소년:['teen'],가족:['family'],대림:['advent'],전례:['liturgical-season'],초심자:['beginner-friendly']};
export function matchesTopics(program,selected=[]){const direct=new Set(program.tags||program.legacy?.tags||[]),features=new Set(Object.values(program.taxonomy||{}).flatMap(v=>Array.isArray(v)?v:[]));return selected.every(t=>direct.has(t)||features.has(t)||(topicAliases[t]||[]).some(x=>features.has(x)));}
export function koreaDay(value){if(!value)return '';const text=String(value);if(/^\d{4}-\d\d-\d\d(?:T\d\d:\d\d(?::\d\d)?)?$/.test(text))return text.slice(0,10);const date=new Date(text);if(!Number.isFinite(+date))return '';return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);}
export function onDate(session,day){return /^\d{4}-\d\d-\d\d$/.test(day)&&koreaDay(session.start)<=day&&koreaDay(session.end)>=day;}
export function monthDays(year,month){return new Date(Date.UTC(year,month+1,0)).getUTCDate();}
export function inMonth(s,year,month){const prefix=`${year}-${String(month+1).padStart(2,'0')}`;return koreaDay(s.start)<=`${prefix}-${monthDays(year,month)}`&&koreaDay(s.end)>=`${prefix}-01`;}
export function shiftMonth(year,month,delta){const d=new Date(Date.UTC(year,month+delta,1));return {year:d.getUTCFullYear(),month:d.getUTCMonth()};}
export function areaOf(session,areas){const region=areas.find(a=>a.id===session.regionId||a.aliases.includes(session.region));if(!region)return {region:null,district:null};const explicit=region.children.find(d=>d.id===session.districtId);if(explicit)return {region,district:explicit};const tokens=String(session.address||'').trim().normalize('NFC').split(/\s+/);if(region.aliases.includes(tokens[0]))tokens.shift();const district=[...region.children].sort((a,b)=>b.name.length-a.name.length).find(d=>d.name.split(' ').every((t,i)=>tokens[i]===t));return {region,district:district||null};}
export function matchesArea(session,areas,regionId='',districtId=''){if(!regionId)return true;const a=areaOf(session,areas);if(a.region?.id!==regionId)return false;if(!districtId)return true;let d=a.district;while(d){if(d.id===districtId)return true;d=a.region.children.find(x=>x.id===d.parent);}return false;}
export function actualRows(rows){return rows.filter(r=>r.demo===false&&r.approval==='approved'&&r.published===true&&(!r.catalogKind||r.catalogKind==='retreat')&&r.programId&&r.id&&Number.isFinite(Date.parse(r.start))&&Number.isFinite(Date.parse(r.end))&&Date.parse(r.end)>=Date.parse(r.start));}
export function searchItems(items,state,areas,engine,now=Date.now()){
 const pref={company:'flexible',duration:'flexible'},c=state.conditions||{};
 return items.filter(({p,s})=>Date.parse(s.end)>=now&&matchesTopics(p,state.tags||[])&&matchesArea(s,areas,state.regionId,state.districtId)&&(!state.day||onDate(s,state.day))&&(!state.monthOnly||inMonth(s,state.year,state.month))&&(!c.from||koreaDay(s.start)>=c.from)&&(!c.to||koreaDay(s.end)<=c.to)&&(!c.budget||(s.feeUnit==='person'&&s.feeComplete===true&&s.fee<=Number(c.budget)))&&(!c.age&&!c.role&&!c.company||engine.eligibility(p,s,{age:c.age,role:c.role,company:c.company},pref,now).state==='eligible'));
}
export function newSearch(now=new Date()){const [year,month]=koreaDay(now.toISOString()).split('-').map(Number);return {tags:[],regionId:'',districtId:'',conditions:{},year,month:month-1,day:'',monthOnly:false};}
export function newQuiz(){return {step:0,answers:{},conditions:{}};}
// Source selection uses the whole approved catalog, never the filtered result.
export const catalogMode=(rows,state='ready')=>state==='ready'&&rows.length===0?'demo':'approved';
export function topicDiagnosis(items,state,areas,engine,now=Date.now()){
 const tags=state.tags||[];if(!tags.length)return '';
 const available=searchItems(items,{...state,tags:[]},areas,engine,now);
 const counts=tags.map(tag=>({tag,count:available.filter(({p})=>matchesTopics(p,[tag])).length}));
 const missing=counts.filter(x=>!x.count).map(x=>'#'+x.tag);
 if(!available.length)return '현재 날짜·지역·참가 조건에 맞는 일정이 없습니다. 상세 조건이나 선택한 날짜·지역을 확인해 주세요.';
 if(missing.length)return `${missing.join(' · ')}에 해당하는 일정이 현재 다른 조건 안에 없습니다. 해당 태그를 해제해 보세요.`;
 return `각 주제의 일정은 있지만 ${tags.map(t=>'#'+t).join(' · ')}을 모두 포함하는 피정은 없습니다. 태그 하나를 해제하면 범위를 넓힐 수 있습니다.`;
}
