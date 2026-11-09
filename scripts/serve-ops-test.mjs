// Local, synthetic-only browser test harness. Never deploy this server or expose on a network.
import http from 'node:http';import {readFile} from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {createDatabase,seed,asUser,rpcTx,ids} from '../tests/ops-db-support.mjs';
const db=await createDatabase();await seed(db);const root=fileURLToPath(new URL('../',import.meta.url));
const tables=new Set(['organizations','organization_members','organization_invites','retreat_houses','retreat_programs','retreat_sessions','audit_events','notifications','retreat_reviews','credential_recovery_requests','security_events']);
const server=http.createServer(async(req,res)=>{try{
 if(req.url==='/__sandbox'&&req.method==='POST'){
 if(req.headers.origin&&req.headers.origin!=='http://127.0.0.1:8771')throw Error('Wrong origin');
 let body='';for await(const chunk of req){body+=chunk;if(body.length>1024*1024)throw Error('Too large');}
 const d=JSON.parse(body);if(d.user&&!ids[d.user])throw Error('Unknown fixture user');let result;
 if(d.action==='user')result={id:ids[d.user],email:d.user+'@example.test'};
 else result=await asUser(db,d.user,async tx=>{if(d.action==='rpc')return rpcTx(tx,d.name,d.args);
 if(d.action==='list'&&tables.has(d.table)){const entries=Object.entries(d.filter||{});if(entries.some(([k])=>!['organization_id','program_id'].includes(k)))throw Error('Invalid filter');return (await tx.query(`select * from public.${d.table}${entries.length?' where '+entries.map(([k],i)=>k+'=$'+(i+1)).join(' and '):''}`,entries.map(([,v])=>v))).rows;}throw Error('Unknown request');});res.setHeader('Content-Type','application/json');res.end(JSON.stringify(result));return;
 }
 const url=new URL(req.url,'http://127.0.0.1'),rel=decodeURIComponent(url.pathname).replace(/^\/+/,''),file=path.resolve(root,rel||'ops/index.html');if(!file.startsWith(root)||file.includes('/.git/')||file.includes('/node_modules/'))throw Error('Forbidden path');
 const data=await readFile(file.endsWith('/')?path.join(file,'index.html'):file);res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.woff2':'font/woff2','.png':'image/png'})[path.extname(file)]||'text/plain');res.end(data);
 }catch(e){res.statusCode=req.url==='/__sandbox'?400:404;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:e.message}));}});
server.listen(8771,'127.0.0.1',()=>console.log('Synthetic local PostgreSQL sandbox: http://127.0.0.1:8771/ops/index.html?sandbox=1 (not actual Supabase Auth)'));
