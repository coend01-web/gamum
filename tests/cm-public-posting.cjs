const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
for(const f of process.argv.slice(2)){
 let me=null;const ctx={window:{CM_API:{rpc:()=>Promise.resolve(null),safe:String,token:()=>null,me:()=>me}},document:{addEventListener:()=>{}},location:{hash:''},setTimeout:()=>{}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(f,'utf8'),ctx);
 for(const [hash,marker] of [['#cedit/work/new/webtoon','data-work-form="0"'],['#cedit/ep/2/new','data-ep-form="0"']]){
 ctx.location.hash=hash;const html=ctx.window.CM_PAGES.cedit();assert(html.includes(marker));assert(html.includes('checked disabled'));assert(!html.includes('data-ep-del'));
 }
 for(const hash of ['#cedit/work/2','#cedit/ep/2/2']){ctx.location.hash=hash;assert(ctx.window.CM_PAGES.cedit().includes('로그인하세요'));}
 me={id:'member'};ctx.location.hash='#cedit/ep/2/new';assert(ctx.window.CM_PAGES.cedit().includes('data-ep-form="0"'));
 console.log(f+': PASS guest creation, public state, edit protection, member access');
}

