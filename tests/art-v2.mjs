import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
const base='c023a1136413808a885360079b04aa95e156ee27';
const themes=JSON.parse(fs.readFileSync('design/themes.json'));
const manifest=JSON.parse(fs.readFileSync('design/art-v2/manifest.json'));
assert.deepEqual(manifest.map(a=>a.id),themes.map(t=>t.id));
assert.equal(new Set(manifest.map(a=>a.mood)).size,20);
let total=0;const hashes=new Set();
for(const a of manifest){assert.match(a.alt,/AI 제작 가상 공간/);assert.ok(a.alt.endsWith('실제 시설 사진이 아닙니다.'));for(const [key,limit] of [['desktop',500000],['mobile',180000],['thumbnail',75000]]){const bytes=fs.readFileSync('design/'+a[key]);assert.equal(bytes[0],255);assert.equal(bytes[1],216);assert.ok(bytes.length<limit,`${a.id} ${key} image budget`);hashes.add(crypto.createHash('sha256').update(bytes).digest('hex'));total+=bytes.length;}for(const key of ['desktopPosition','mobilePosition'])assert.match(a[key],/^\d+% \d+%$/);}
assert.equal(hashes.size,60);assert.ok(total<10*1024*1024);
for(const file of ['design/themes.json','design/visit.js','assets/js/quiz-data.js','assets/js/recommendation.js','assets/js/demo-catalog.js','index.html','legacy.html','ops/domain.js'])assert.ok(fs.readFileSync(file).equals(execFileSync('git',['show',`${base}:${file}`])),`${file} unchanged`);
const old=execFileSync('git',['show',`${base}:design/spaces.js`],{encoding:'utf8'}),now=fs.readFileSync('design/spaces.js','utf8');
assert.equal(now.slice(now.indexOf("main.addEventListener('click'")),old.slice(old.indexOf("main.addEventListener('click'")),'all existing interaction and catalog handlers unchanged');
const css=fs.readFileSync('design/spaces.css','utf8');assert.ok(css.startsWith(execFileSync('git',['show',`${base}:design/spaces.css`],{encoding:'utf8'})),'original layout CSS unchanged');
assert.ok(now.includes('${a.mobile}'));assert.ok(now.includes('${a.thumbnail}'));assert.ok(now.includes('AI로 만든 가상 공간'));
console.log(`PASS: 20 distinct art directions, 60 JPEG derivatives (${total} bytes); responsive references; layout, 80 reflection stages, quiz engine and handlers unchanged.`);
