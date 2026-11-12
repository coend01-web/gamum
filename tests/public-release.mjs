import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {execFileSync} from 'node:child_process';
const root=path.resolve(process.argv[2]||'.'),read=p=>fs.readFileSync(path.join(root,p)),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const themes=JSON.parse(read('home/themes.json'));assert.equal(themes.length,20);assert.equal(themes.flatMap(t=>t.reflection).length,80);
assert.equal(sha(read('home/themes.json')),'d33d3f494c771e220e2a9bafab22c601efa3c1f28aef1f1b20fdb1ed136a3877');
const images=fs.readdirSync(path.join(root,'home/art-v2')).filter(x=>x.endsWith('.jpg')).sort();assert.equal(images.length,60);assert.equal(sha(Buffer.concat(images.map(x=>read('home/art-v2/'+x)))),'448e82e55d4536c3a93baa148df156dca84fccd35dc69309c32054d907b8e84d');
assert.deepEqual(read('legacy.html'),execFileSync('git',['show','2a624d6fd0a3a4c68c32b2d5c59281c69bbd0ecc:index.html'],{maxBuffer:20e6}));
assert(read('index.html').toString().includes('home/index.html'));
for(const file of ['app.js','index.html','domain.js','guides.js','visit.js'])assert(!/supabase|catalog-config|service_role|sb_secret_|[.][.]\/ops\//i.test(read('home/'+file).toString()),file+' references development backend');
const {selectSpace,saveProgress,readProgress}=await import(new URL('file://'+path.join(root,'home/visit.js')));
const mem=()=>{const m=new Map();return {getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v)}};const local=mem(),session=mem();let last;for(let cycle=0;cycle<10;cycle++){const ids=[];for(let i=0;i<20;i++){const next=selectSpace(local,session);assert.notEqual(next,last);ids.push(next);last=next}assert.equal(new Set(ids).size,20)}
saveProgress(session,'rest',2);assert.equal(selectSpace(local,session,'rest'),'rest');assert.equal(readProgress(session,'rest'),2);
const app=read('home/app.js').toString();assert.equal((app.match(/selectSpace\(/g)||[]).length,1);assert(!/find\([^\n]*selectSpace/.test(app));assert(!/href="#gallery"|gallery\(\)|편집 검수|새번역 발췌/.test(app));assert(app.includes('현재 등록된 모집 일정이 없습니다.'));assert(app.includes('가상 시연 · 신청 불가'));assert(app.includes('(${safe(r.reference)})'));
console.log('PASS public frontend: exact original images/manuscripts, recoverable legacy, no development backend, 200 balanced refreshes, saved progress, accurate empty and demo states.');
