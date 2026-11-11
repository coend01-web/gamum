import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {THEME_IDS,selectSpace,readProgress,saveProgress,readSaved,saveShelf} from '../design/visit.js';
const themes=JSON.parse(fs.readFileSync(new URL('../design/themes.json',import.meta.url)));
assert.deepEqual(themes.map(t=>t.id),THEME_IDS);assert.equal(new Set(themes.map(t=>t.title)).size,20);
const texts=themes.flatMap(t=>t.reflection.map(r=>r.text));assert.equal(texts.length,80);assert.equal(new Set(texts).size,80);
const luminance=h=>{const c=h.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722};
const contrast=(a,b)=>(Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);
const hashes=new Set();let size=0;
for(const t of themes){assert.ok(t.editorialStatus.includes('편집 검수'));assert.ok(t.visualAlt.includes('실제 시설 사진이 아닙니다'));assert.equal(t.reflection.length,4);const v=t.reflection[1];assert.match(v.url,/^https:\/\/bible\.cbck\.or\.kr\/Knb\//);assert.ok(v.excerpt);assert.ok(v.text.split(/\s+/).length<=25);for(const color of [t.accent,'#273a32','#5c675e'])assert.ok(contrast(color,t.paper)>=4.5,`${t.id} text contrast`);
 for(const suffix of ['','.mobile']){const svg=fs.readFileSync(new URL(`../design/visuals/${t.id}${suffix}.svg`,import.meta.url),'utf8');assert.match(svg,/<title/);assert.match(svg,/<desc/);assert.ok(!/<script|<image|https?:\/\//i.test(svg.replace('http://www.w3.org/2000/svg','')));hashes.add(crypto.createHash('sha256').update(svg).digest('hex'));size+=Buffer.byteLength(svg);}}
assert.equal(hashes.size,40);assert.ok(size<150000);
class Store {constructor(){this.v={};}getItem(k){return this.v[k]??null;}setItem(k,v){this.v[k]=v;}}
let local=new Store(),last=null;
for(let cycle=0;cycle<10;cycle++){const seen=new Set();for(let i=0;i<20;i++){const session=new Store(),id=selectSpace(local,session);assert.notEqual(id,last);assert.equal(selectSpace(local,session),id);assert.ok(!seen.has(id));seen.add(id);last=id;}assert.equal(seen.size,20);}
const session=new Store(),before=JSON.stringify(local.v);assert.equal(selectSpace(local,session,'seed'),'seed');assert.equal(JSON.stringify(local.v),before);
for(const id of THEME_IDS)for(let i=0;i<4;i++){saveProgress(session,id,i);assert.equal(readProgress(session,id),i);}
session.setItem('camum-space-step-light','99');assert.equal(readProgress(session,'light'),0);
const broken={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}};assert.ok(THEME_IDS.includes(selectSpace(broken,broken)));assert.equal(readProgress(broken,'light'),0);assert.equal(saveShelf(broken,{programs:[],spaces:[]}),false);
assert.deepEqual(readSaved(broken),{programs:[],spaces:[]});saveShelf(local,{programs:['demo:r01'],spaces:['light']});assert.deepEqual(readSaved(local).spaces,['light']);
const original=fs.readFileSync(new URL('../index.html',import.meta.url));assert.ok(original.equals(fs.readFileSync(new URL('../legacy.html',import.meta.url))),'legacy entry preserves original');
const config=JSON.parse(fs.readFileSync(new URL('../design/catalog-config.json',import.meta.url)));assert.equal(config.readOnly,true);assert.match(config.publishableKey,/^sb_publishable_/);assert.equal(config.environment,'development');
const js=fs.readFileSync(new URL('../design/spaces.js',import.meta.url),'utf8');assert.ok(js.includes('/rest/v1/rpc/public_catalog'));assert.ok(!js.includes('service_role'));assert.ok(js.includes("document.querySelector('.skip').addEventListener"));
const css=fs.readFileSync(new URL('../design/spaces.css',import.meta.url),'utf8');assert.ok(css.includes('prefers-reduced-motion:reduce'));assert.ok(css.includes(':focus-visible'));assert.ok(fs.existsSync(new URL('../design/fonts/OFL.txt',import.meta.url)));
console.log(`PASS: 20 themes / 80 unique stages / 40 original SVGs (${size} bytes); text contrast; 200 shuffled visits; refresh progress; blocked storage; original entry retained; read-only catalogue.`);
