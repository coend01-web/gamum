import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url),ctx={console};ctx.window=ctx;vm.createContext(ctx);
for(const file of ['data','demo-catalog','quiz-data','recommendation'])vm.runInContext(fs.readFileSync(new URL(`assets/js/${file}.js`,root),'utf8'),ctx);
const E=ctx.GAMUM_RECOMMEND,raw=ctx.GAMUM_DEMO,original=JSON.stringify(raw),demo=ctx.GAMUM_DEMO_CATALOG.enrich(raw);
const catalog=E.adaptLegacy(demo.programs,demo.sessions,demo.centers);
const cases={
 쉼:{answers:[0,0,0,0,0,0,0,0,0,0],first:'r01'},
 말씀:{answers:[3,4,2,4,2,2,1,1,2,0],first:'r04'},
 화해:{answers:[2,1,1,1,1,1,1,2,0,0],first:'r11'},
 식별:{answers:[3,2,2,2,2,2,1,1,2,0],first:'r08'},
 찬양:{answers:[2,3,1,3,4,1,4,3,0,4],first:'r12'},
 가족:{answers:[2,1,1,3,1,1,4,2,1,3],first:'r09'}
};
const run=(a=[],conditions={},cat=catalog)=>E.recommend({questions:ctx.GAMUM_QUIZ,answers:Object.fromEntries(a.map((x,i)=>[i,x])),conditions,...cat});
const report=[];
for(const [name,c]of Object.entries(cases)){
 const r=run(c.answers);assert.equal(r.items.length,3,name);assert.equal(r.items[0].p.id,c.first,name);
 assert.equal(new Set(r.items.map(x=>x.p.id)).size,3);
 assert.ok(r.items.every(x=>x.p.demo&&x.s.demo&&x.fit.state==='eligible'));
 report.push({scenario:name,answers:c.answers.map(x=>x+1),recommendations:r.items.map(x=>({id:x.p.id,title:x.p.title}))});
}
assert.equal(new Set(report.map(x=>x.recommendations[0].id)).size,6);
assert.equal(JSON.stringify(raw),original,'original fields untouched');
assert.equal(demo.programs.length,12);assert.equal(demo.sessions.length,14);
assert.ok(demo.programs.every(p=>p.recommendation.requirements.complete&&p.recommendation.source.verified===false));
assert.ok(demo.sessions.every(s=>s.recommendation.feeComplete&&s.recommendation.feeUnit==='person'&&!s.recommendation.applicationUrl&&!s.recommendation.phone));
assert.ok(run().unconfirmed.some(x=>x.p.id==='r02'),'youth age not guessed');
assert.ok(run([], {age:25}).eligible.some(x=>x.p.id==='r02'));
assert.ok(!run([], {age:40}).eligible.some(x=>x.p.id==='r02'));
assert.ok(run([], {age:15}).eligible.some(x=>x.p.id==='r10'));
assert.ok(!run([], {age:30}).eligible.some(x=>x.p.id==='r10'));
assert.ok(!run(cases.가족.answers).eligible.some(x=>x.p.id==='r06'),'solo-only does not allow family');
assert.ok(!run(cases.가족.answers,{minors:true}).items.length,'minor age missing still requires confirmation');
assert.ok(run(cases.가족.answers,{minors:true,childAge:7}).eligible.some(x=>x.p.id==='r09'));
assert.ok(run([], {mode:'no-night'}).items.every(x=>x.s.mode==='daytime'));
assert.ok(!run([], {budget:0}).items.length,'hard budget still excludes all');
assert.equal(run([], {region:'부산'}).items.length,1,'do not fill one result');
assert.equal(run([], {region:'충남'}).items.length,2,'do not fill two results');
const closed={...catalog,sessions:catalog.sessions.map(s=>({...s,status:'closed'}))};assert.equal(run([],{},closed).items.length,0);
const real={...catalog,programs:catalog.programs.map(p=>({...p,demo:false})),sessions:catalog.sessions.map(s=>({...s,demo:false}))};
assert.equal(run([],{},real).items.length,0,'fictional qualifications cannot verify real records');
const unmarked=E.adaptLegacy(raw.programs,raw.sessions,raw.centers);assert.equal(run([],{},unmarked).items.length,0,'missing metadata still excluded');
const realSeed={...raw,programs:raw.programs.map(p=>({...p,source:'실제 공식 공고',demo:false}))};
assert.ok(ctx.GAMUM_DEMO_CATALOG.enrich(realSeed).programs.every(p=>!p.recommendation),'do not enrich real sources');
const withMetadata={...raw,programs:raw.programs.map(p=>({...p,recommendation:{demo:false,requirements:{complete:false}}}))};
assert.ok(ctx.GAMUM_DEMO_CATALOG.enrich(withMetadata).programs.every(p=>p.recommendation.demo===false),'existing metadata preserved');
const extraSessions={...raw,sessions:[{...raw.sessions[0],id:'new-real-session'},{...raw.sessions[1],demo:false},{...raw.sessions[2],source:'실제 공고'}]};
assert.ok(ctx.GAMUM_DEMO_CATALOG.enrich(extraSessions).sessions.every(s=>!s.recommendation),'only original fictional sessions enriched');
assert.ok(demo.programs.find(p=>p.id==='r12').recommendation.demoPlan.includes('찬양 20분'));
console.log('PASS: 6 distinct answer scenarios; explicit fictional metadata; age/company/mode/budget restrictions; 0/1/2/3 results; real-source guard.');
console.log(JSON.stringify(report,null,2));
export {report,cases};
