// Actual Auth/Edge/RLS integration. Only run after a separate development project is configured.
// node --env-file=/private/path/camum-dev.env tests/ops-hosted.mjs
import assert from 'node:assert/strict';import {createClient} from '@supabase/supabase-js';
import {requirements,session} from './ops-db-support.mjs';
const e=process.env;
if(e.CAMUM_ALLOW_DEVELOPMENT_WRITES!=='yes')throw Error('Development-write opt-in is required. Never run against production.');
for(const k of ['SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','CAMUM_DEV_ORIGIN','CAMUM_OPERATOR_EMAIL','CAMUM_OPERATOR_PASSWORD','CAMUM_OPERATOR_MFA_CODE'])if(!e[k])throw Error('Missing local setting: '+k);
const make=()=>createClient(e.SUPABASE_URL,e.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const operator=make(),anon=make(),created=[],clients=[];
const check=({data,error})=>{if(error)throw Error('Hosted test request failed; inspect the development project without printing credentials.');return data;};
const call=async(c,name,args={})=>check(await c.rpc(name,args));
check(await operator.auth.signInWithPassword({email:e.CAMUM_OPERATOR_EMAIL,password:e.CAMUM_OPERATOR_PASSWORD}));
const factor=check(await operator.auth.mfa.listFactors()).totp.find(f=>f.status==='verified');if(!factor)throw Error('Enroll central-operator MFA first.');
check(await operator.auth.mfa.challengeAndVerify({factorId:factor.id,code:e.CAMUM_OPERATOR_MFA_CODE}));assert.ok((await call(operator,'ops_bootstrap')).operator);
const edge=async(action,args={},c)=>{const bearer=c?(await c.auth.getSession()).data.session?.access_token:null;const r=await fetch(e.SUPABASE_URL+'/functions/v1/institution-auth',{method:'POST',headers:{apikey:e.SUPABASE_PUBLISHABLE_KEY,Origin:e.CAMUM_DEV_ORIGIN,'Content-Type':'application/json',...(bearer?{Authorization:'Bearer '+bearer}:{})},body:JSON.stringify({action,...args})});return {status:r.status,...await r.json()};};
try{
 for(const letter of ['A','B']){
 const org=await call(operator,'ops_create_organization',{p_name:'가상 개발검사 '+letter+' '+new Date().toISOString(),p_url:'https://example.org'});created.push(org);await call(operator,'ops_review_organization',{p_id:org,p_status:'approved'});
 const row=check(await operator.from('organizations').select('management_number').eq('id',org).single());const number=row.management_number;
 const issued=await edge('issue-reset',{number,note:'별도 개발환경의 가상 기관 계정 발급 검사 — 실제 기관 확인 아님'},operator);assert.equal(issued.status,200);
 const password='Development-only-'+crypto.randomUUID();assert.equal((await edge('complete-reset',{token:issued.token,newPassword:password})).status,200);
 const login=await edge('login',{number,password});assert.equal(login.status,200);const client=make();check(await client.auth.setSession(login.session));clients.push({client,org,number,password});
 }
 const [a,b]=clients;const house=await call(a.client,'ops_save_house',{p_org:a.org,p_data:{name:'가상 개발검사 시설',region:'경기',address:'가상 주소'}});
 const program=await call(a.client,'ops_save_program',{p_org:a.org,p_data:{house_id:house,title:'가상 실제 로그인·저장 검사',description:'실제 모집·신청 불가',audience:'가상 검사',requirements,taxonomy:{features:['rest']},tags:['쉼'],official_url:'https://example.org',application_url:'https://example.org'}});
 assert.deepEqual(check(await b.client.from('retreat_programs').select('id').eq('id',program)),[]);
 assert.ok((await b.client.rpc('ops_save_sessions',{p_program:program,p_rows:[session()]})).error);
 assert.ok((await a.client.rpc('ops_review_organization',{p_id:a.org,p_status:'approved'})).error);
 assert.ok(!(await call(anon,'public_catalog')).some(s=>s.programId===program));
 await call(a.client,'ops_save_sessions',{p_program:program,p_rows:Array.from({length:40},(_,i)=>session(10+i))});
 await call(a.client,'ops_program_state',{p_id:program,p_state:'pending',p_version:1});await call(operator,'ops_program_state',{p_id:program,p_state:'published',p_version:2});
 assert.equal((await call(anon,'public_catalog')).filter(s=>s.programId===program).length,40);
 const row=check(await a.client.from('retreat_sessions').select('*').eq('program_id',program).limit(1))[0];await call(a.client,'ops_save_sessions',{p_program:program,p_rows:[{...row,status:'closed'}]});
 assert.equal((await call(anon,'public_catalog')).filter(s=>s.programId===program&&s.status==='closed').length,1);
 const next='Development-only-'+crypto.randomUUID();assert.equal((await edge('change-password',{number:a.number,oldPassword:a.password,newPassword:next},a.client)).status,200);
 assert.deepEqual(check(await a.client.from('retreat_programs').select('id').eq('id',program)),[],'old JWT blocked');
 assert.notEqual((await edge('login',{number:a.number,password:a.password})).status,200);
 const fresh=await edge('login',{number:a.number,password:next});assert.equal(fresh.status,200);const freshClient=make();check(await freshClient.auth.setSession(fresh.session));assert.equal(check(await freshClient.from('retreat_sessions').select('id').eq('program_id',program)).length,40);
 assert.equal((await edge('recover',{number:a.number})).token,undefined,'number cannot reset password');
 console.log('PASS: hosted institution login, central MFA, A/B RLS, 40 sessions, public approval, early close, password rotation, revoked JWT and persisted data.');await freshClient.auth.signOut();
}finally{
 for(const org of created){const {error}=await operator.rpc('ops_review_organization',{p_id:org,p_status:'suspended'});if(error)console.error('A synthetic organization could not be suspended. Inspect development data before release.');}
 for(const {client}of clients)await client.auth.signOut();await operator.auth.signOut();
}
