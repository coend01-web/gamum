import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const html = readFileSync('design/platform-shell.html','utf8');
const css = readFileSync('design/platform-shell.css','utf8');
const js = readFileSync('design/platform-shell.js','utf8');
let n=0;
function check(value,message){assert.ok(value,message);n++;}
for(const id of ['retreat','music','speakers','market']){
  check(html.includes('id="'+id+'"'), id+' section exists');
  check(html.includes('data-module="'+id+'"'),id+' nav exists');
}
for(const href of ['../index.html#discover','../index.html#themes','../index.html#calendar','../index.html#places']){
  check(html.includes(href),'Original retreat entry preserved: '+href);
}
check(html.includes('id="one-minute"'),'1-minute content retained');
check(html.includes('id="stage-select"'),'stage review control present');
check(html.includes('data-stage-min="2"') && html.includes('data-stage-min="3"') && html.includes('data-stage-min="4"'),'stage limits exist');
check(html.includes('hidden>생활성가') && html.includes('hidden>신부님') && html.includes('hidden>가뭄 마켓'),'future nav hidden in stage1');
check(js.includes('history.replaceState'),'stage can be linked directly');
check(js.includes('aria-current'),'navigation state accessible');
check(css.includes('@media(max-width:600px)') && css.includes('@media(max-width:950px)'),'responsive layouts');
check(css.includes('prefers-reduced-motion'),'reduced-motion handling');
check(css.includes('[hidden]{display:none!important}'),'hidden future modules remain hidden despite CSS');
check(!html.match(/https?:\/\/(?:coend01-web\.github\.io|supabase\.co)\/.*(insert|delete)/),'no live writes');
check(!js.includes('supabase') && !js.includes('fetch('),'preview never calls backend');
console.log('CAMUM design shell checks passed:',n);
