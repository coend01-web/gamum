// CAMUM v0.21: reusable, pure discovery helpers. Only approved public_catalog rows are passed in.
export const topicGroups = [
  ['내 마음의 필요',['쉼','침묵','말씀','관계','식별','화해','기도','자연']],
  ['피정 방식',['개인','나눔','걷기','관상','묵상','체험','공동체','자유']],
  ['특별한 주제',['영신수련','성경','청년','청소년','가족','대림','전례','초심자']]
];
const aliases = {
  쉼:['rest'],침묵:['silence','silent','quiet','partial-silence'],말씀:['scripture','lectio'],
  관계:['relationship','connection'],식별:['discernment','ignatian'],화해:['reconciliation'],
  기도:['prayer','guided','eucharistic'],자연:['ecology','walking'],
  개인:['self-directed','solitude'],나눔:['sharing'],걷기:['walking'],
  관상:['contemplative'],묵상:['reflective','lectio'],체험:['experience','monastic'],
  공동체:['community'],자유:['self-directed'],영신수련:['ignatian'],
  성경:['scripture','lectio'],청년:['youth'],청소년:['teen'],가족:['family'],
  대림:['liturgical-season'],전례:['liturgical-season'],초심자:['beginner-friendly']
};
export const displayTopic = value => String(value??'').trim().normalize('NFC');
export function matchesTopics(row,selected=[]){
  const direct=new Set((Array.isArray(row.tags)?row.tags:[]).map(displayTopic));
  const features=new Set(Object.values(row.taxonomy||{}).flatMap(v=>Array.isArray(v)?v:[]).map(displayTopic));
  return selected.every(tag=>{
    const name=displayTopic(tag);
    return direct.has(name)||features.has(name)||(aliases[name]||[]).some(t=>features.has(t));
  });
}
export const validRows=(rows,now=Date.now())=>rows.filter(r=>!r.demo&&r.catalogKind!=='concert'&&
  Number.isFinite(Date.parse(r.start))&&Number.isFinite(Date.parse(r.end))&&Date.parse(r.end)>=now);
export function onDate(row,day){
  if(!/^\d{4}-\d\d-\d\d$/.test(day))return false;
  return row.start?.slice(0,10)<=day&&row.end?.slice(0,10)>=day;
}
export function inMonth(row,year,month){
  const first=`${year}-${String(month+1).padStart(2,'0')}-01`;
  const last=`${year}-${String(month+1).padStart(2,'0')}-${String(new Date(Date.UTC(year,month+1,0)).getUTCDate()).padStart(2,'0')}`;
  return row.start?.slice(0,10)<=last&&row.end?.slice(0,10)>=first;
}
export function districtFromAddress(address,region){
  const value=String(address||'').trim().replace(/\s+/g,' ');
  if(!value)return '세부지역 미확인';
  const tokens=value.split(' ');
  const city=tokens[0]||'';
  // The DB stores province and free-form address, not a guaranteed district code.
  const known=region||'';
  const startsProvince=city===known||city.startsWith(known)||
    ['서울특별시','부산광역시','대구광역시','인천광역시','광주광역시','대전광역시','울산광역시',
     '세종특별자치시','경기도','강원특별자치도','강원도','충청북도','충청남도',
     '전북특별자치도','전라북도','전라남도','경상북도','경상남도','제주특별자치도'].includes(city);
  const candidate=(startsProvince?tokens[1]:tokens[0])||'';
  return /(?:시|군|구)$/.test(candidate)?candidate:'세부지역 미확인';
}
export function placeKey(row){return [row.region,row.address,row.place].map(v=>String(v||'').trim()).join('∣');}
export function groupPlaces(rows,region){
  const centers=new Map();
  for(const row of rows.filter(r=>r.region===region)){
    const key=placeKey(row);
    if(!centers.has(key))centers.set(key,{key,region,place:row.place,address:row.address,
      district:districtFromAddress(row.address,row.region),sessions:[]});
    centers.get(key).sessions.push(row);
  }
  for(const place of centers.values())place.sessions.sort((a,b)=>Date.parse(a.start)-Date.parse(b.start));
  return [...centers.values()].sort((a,b)=>a.district.localeCompare(b.district,'ko')||a.place.localeCompare(b.place,'ko'));
}
