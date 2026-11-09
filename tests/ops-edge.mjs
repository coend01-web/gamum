// Edge handler tests with real PostgreSQL migration and a deliberately fake Auth provider.
// This does NOT establish that hosted Supabase Auth or JWT configuration is correct.
import assert from 'node:assert/strict';import vm from 'node:vm';import {stripTypeScriptTypes} from 'node:module';import {readFile} from 'node:fs/promises';
import {createDatabase,seed,ids,rpcTx} from './ops-db-support.mjs';
const db=await createDatabase(),{a}=await seed(db);await db.query("update organizations set status='approved' where id=$1",[a]);
const number=(await db.query('select management_number from organizations where id=$1',[a])).rows[0].management_number;
const passwordStore=new Map([[ids.owner,'test-old-password-only']]),tokens=new Map();let handler;
async function mint(id,aal='aal1'){const sid=crypto.randomUUID();await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[sid,id]);const claims={sub:id,session_id:sid,aal};const token='test.'+Buffer.from(JSON.stringify(claims)).toString('base64url')+'.not-a-signature';tokens.set(token,claims);return {access_token:token,refresh_token:'test-refresh',user:{id}};}
async function queryToken(token,fn){const c=tokens.get(token);if(!c)throw Error('fake provider rejected token');return db.transaction(async tx=>{await tx.exec('set local role authenticated');await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[c.sub]);await tx.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify(c)]);return fn(tx);});}
function createClient(_url,key,options={}){const bearer=options.global?.headers?.Authorization?.replace('Bearer ','');return {
 async rpc(name,args){try{return {data:key==='test-service-key'?await rpcTx(db,name,args):await queryToken(bearer,tx=>rpcTx(tx,name,args)),error:null};}catch{return {data:null,error:{message:'test database denied'}};}},
 auth:{async getUser(token){const c=tokens.get(token);return {data:{user:c?{id:c.sub}:null},error:c?null:{message:'invalid'}};},async signInWithPassword({email,password}){const u=(await db.query('select id from auth.users where email=$1',[email])).rows[0];if(!u||passwordStore.get(u.id)!==password)return {data:{},error:{message:'invalid'}};const session=await mint(u.id);return {data:{session,user:{id:u.id}},error:null};},admin:{
 async updateUserById(id,data){passwordStore.set(id,data.password);const hash=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(data.password))).toString('hex');await db.query('update auth.users set encrypted_password=$2,email=coalesce($3,email) where id=$1',[id,hash,data.email||null]);return {data:{user:{id}},error:null};},
 async createUser({email,password}){const id=crypto.randomUUID();passwordStore.set(id,password);await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[id,email]);return {data:{user:{id}},error:null};},async deleteUser(id){await db.query('delete from auth.users where id=$1',[id]);return {data:{},error:null};}
 }}
};}
const env={SUPABASE_URL:'https://development.example',SUPABASE_ANON_KEY:'test-public-key',SUPABASE_SERVICE_ROLE_KEY:'test-service-key',CAMUM_ALLOWED_ORIGINS:'http://127.0.0.1:8771',CAMUM_RATE_SALT:'test-only-salt-32-bytes-never-production'};
const source=(await readFile('supabase/functions/institution-auth/index.ts','utf8')).replace(/^import .*supabase-js.*;$/m,'');const compiled=stripTypeScriptTypes(source,{mode:'strip'});
vm.runInNewContext(compiled,{createClient,crypto,Request,Response,TextEncoder,TextDecoder,atob,Deno:{env:{get:k=>env[k]},serve:fn=>handler=fn}});
let n=0;const ok=(x,m)=>{assert.ok(x,m);n++;};
async function call(data,token,origin='http://127.0.0.1:8771'){const response=await handler(new Request('http://test/institution-auth',{method:'POST',headers:{origin,'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:JSON.stringify(data)}));return {status:response.status,...await response.json()};}
ok((await call({action:'login',number,password:'wrong'})).status===401,'wrong password rejected');
const login=await call({action:'login',number,password:'test-old-password-only'});ok(login.status===200,'broker login');const old=login.session.access_token;
ok((await queryToken(old,tx=>rpcTx(tx,'ops_bootstrap'))).session_valid,'registered broker session valid');
const change=await call({action:'change-password',number,oldPassword:'test-old-password-only',newPassword:'test-new-password-only'},old);ok(change.status===200,'password change through broker');
ok(!(await queryToken(old,tx=>rpcTx(tx,'ops_bootstrap'))).session_valid,'old JWT denied immediately');
ok((await call({action:'login',number,password:'test-old-password-only'})).status===401,'old password cannot log in');
ok((await call({action:'login',number,password:'test-new-password-only'})).status===200,'new password can log in');
const recovery=await call({action:'recover',number});ok(recovery.status===200&&!recovery.token,'number alone only requests recovery');
const centralAal1=await mint(ids.operator,'aal1');ok((await call({action:'issue-reset',number,note:'가상 기관 공식 연락처 확인 테스트 완료'},centralAal1.access_token)).status===403,'MFA mandatory for reset issuance');
const central=await mint(ids.operator,'aal2');const issued=await call({action:'issue-reset',number,note:'가상 기관 공식 연락처 확인 테스트 완료'},central.access_token);ok(issued.status===200&&issued.token.length===64,'operator verified one-time reset link');
ok((await call({action:'complete-reset',token:issued.token,newPassword:'test-recovered-password'})).status===200,'redeem reset');
ok((await call({action:'complete-reset',token:issued.token,newPassword:'test-recovered-password'})).status!==200,'reset replay rejected');
ok((await call({action:'login',number,password:'test-recovered-password'})).status===200,'recovered credential can log in');
ok((await call({action:'login',number,password:'test-recovered-password'},null,'https://untrusted.example')).status===403,'unapproved origin denied');
const fresh=await call({action:'login',number,password:'test-recovered-password'});await db.query("update auth.users set encrypted_password='test-direct-provider-change' where id=$1",[ids.owner]);ok(!(await queryToken(fresh.session.access_token,tx=>rpcTx(tx,'ops_bootstrap'))).session_valid,'direct provider password change also invalidates sessions');
const newOrg=await queryToken(central.access_token,tx=>rpcTx(tx,'ops_create_organization',{p_name:'가상 기관 첫 발급 검사',p_url:'https://example.org'}));await queryToken(central.access_token,tx=>rpcTx(tx,'ops_review_organization',{p_id:newOrg,p_status:'approved'}));
const newNumber=(await db.query('select management_number from organizations where id=$1',[newOrg])).rows[0].management_number;
const first=await call({action:'issue-reset',number:newNumber,note:'가상 기관 첫 발급 시 공식 확인 경로 테스트'},central.access_token);ok(first.status===200,'first institution Auth account provisioned without showing a password');
ok((await call({action:'complete-reset',token:first.token,newPassword:'test-new-institution-password'})).status===200,'first institution password initialized');
ok((await call({action:'login',number:newNumber,password:'test-new-institution-password'})).status===200,'first institution number login');
console.log(`PASS: ${n} Edge handler checks with fake Auth + PostgreSQL, including old password refusal, revoked JWTs, verified reset, MFA and replay. Hosted Auth still required.`);await db.close();
