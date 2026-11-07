import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const current=[fs.readFileSync(root+'assets/js/data.js','utf8'),fs.readFileSync(root+'assets/js/app.js','utf8')];
const original=execFileSync('git',['show','c9185d0fb7fad09a4022ae2d2b66cb0e49043aa7:index.html'],{cwd:root,encoding:'utf8'});
const oldScripts=[...original.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]);
function harness(scripts){
 const node={dataset:{},classList:{add(){},remove(){}},addEventListener(){},focus(){},innerHTML:'',textContent:''};
 const ctx={console,URLSearchParams,Date,setTimeout:()=>0,clearTimeout(){},location:{hash:'',protocol:'file:'},navigator:{},localStorage:{getItem:()=>null,setItem(){}},document:{activeElement:null,querySelector:()=>node,querySelectorAll:()=>[]},addEventListener(){},scrollTo(){},matchMedia:()=>({matches:false})};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(scripts[0],ctx);if(scripts===current)for(const file of ['quiz-data.js','recommendation.js'])vm.runInContext(fs.readFileSync(root+'assets/js/'+file,'utf8'),ctx);
 const exports='globalThis.test={state,questions,profiles,spiritualGuides,recommend,availability,card,render,publishConventDemo,store,miniRetreat'+(scripts===current?',momentReading,sortedItems,quizResults,home,guideView':'')+'};';
 const code=scripts[1].replace(/^render\(\);if.*$/m,'');const pos=code.lastIndexOf('})();');vm.runInContext(code.slice(0,pos)+exports+code.slice(pos),ctx);
 return {ctx,t:ctx.test,node};
}
const old=harness(oldScripts),now=harness(current);
for(const key of ['spiritualGuides'])for(const [id,value] of Object.entries(old.t[key]))assert.equal(JSON.stringify(now.t[key][id]),JSON.stringify(value),key+' '+id+' preserved');
assert.equal(now.t.questions.length,10);assert.equal(now.t.state.programs.length,12);assert.equal(now.t.state.sessions.length,14);
assert.deepEqual(JSON.parse(JSON.stringify(now.ctx.GAMUM_DEMO)),JSON.parse(JSON.stringify(old.ctx.GAMUM_DEMO)));
const s={...now.t.state.sessions[1],start:'2099-01-01T10:00:00',end:'2099-01-01T16:00:00',applicationStart:'2000-01-01',applicationEnd:'2099-01-01'};
assert.equal(now.t.availability(s).label,'주최 측 확인 필요');
s.manualState='closed';assert.equal(now.t.availability(s).label,'모집 마감');s.manualState='unknown';
now.t.state.demoOverrides[s.id]={status:'open',remaining:3,syncedAt:new Date().toISOString()};assert.equal(now.t.availability(s).precise,true);
now.t.state.demoOverrides[s.id].syncedAt='2000-01-01';assert.equal(now.t.availability(s).stale,true);
for(const route of ['home','discover','themes','calendar','places','program/r01','session/s01','qr/r02','admin','convent','convent-register','shelf','guide','result?p=쉼']){now.ctx.location.hash='#'+route;now.t.render();assert.ok(now.node.innerHTML.length>100,route);assert.ok(!now.node.innerHTML.includes('undefined'),route)}
const mood={title:'위로',comfort:'안내',reference:'성경',scripture:'말씀',question:'질문',prayer:'기도'};
for(let step=0;step<4;step++){now.t.state.momentStep=step;const html=now.t.momentReading(mood);assert.ok(html.includes(`0${step+1} / 04`));assert.equal((html.match(/class="step-label"/g)||[]).length,1)}
now.t.state.sortOrder='fee-asc';const sorted=now.t.sortedItems([{p:{fee:3}},{p:{fee:1}},{p:{fee:2}}]);assert.equal(sorted.map(x=>x.p.fee).join(','),'1,2,3');
now.t.state.demoConvent.audience='청년 신자';now.t.publishConventDemo();assert.equal(now.t.state.programs[0].demoAudience,'청년 신자');
const card=now.t.card(now.t.state.programs[0]);for(const label of ['날짜','장소','대상','연락처','신청','시연용'])assert.ok(card.includes(label));
console.log('PASS: original catalog unchanged; status freshness; 14 routes; 4 meditation steps; sorting; registration participant preservation; card information.');

const resultHTML=now.t.quizResults();assert.ok(resultHTML.indexOf('id="suggested-retreats"')<resultHTML.indexOf('id="my-moment"'));assert.equal((resultHTML.match(/class="retreat-card"/g)||[]).length,0);assert.equal((resultHTML.match(/class="guide-card /g)||[]).length,4);assert.equal((now.t.home().match(/class="entrance"/g)||[]).length,4);assert.equal((now.t.guideView().match(/<details>/g)||[]).length,4);console.log('PASS: new everyday questions and original spiritual content preserved; recommendations precede reflection; four home entrances and four FAQ entries retained.');

assert.ok(resultHTML.indexOf('id="recommendation-options"')>resultHTML.indexOf('id="suggested-retreats"'));assert.ok(resultHTML.indexOf('id="recommendation-options"')<resultHTML.indexOf('id="my-moment"'));assert.ok(!now.t.home().includes('<details id="moment-disclosure"'));
// Test-only eligibility metadata: never shipped as fictitious qualifications in the live catalog.
const resultPrograms=now.t.state.programs.filter(x=>/^r\d+$/.test(x.id)).slice(0,3);
now.t.state.answers={0:3};now.t.state.conditions={};
for(let count=0;count<=3;count++){
 for(let i=0;i<3;i++)resultPrograms[i].recommendation={requirements:{complete:i<count,companies:['solo','friends','couple','family','group'],roles:['any'],prerequisites:[]}};
 const html=now.t.quizResults();assert.equal((html.match(/class="retreat-card"/g)||[]).length,count);assert.ok(html.includes(`조건에 맞는 머뭄 ${count}개`));
}
console.log('PASS: result UI renders exactly 0, 1, 2, or 3 qualified demo cards, with no fillers.');
