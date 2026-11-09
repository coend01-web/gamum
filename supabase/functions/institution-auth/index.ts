// Server only. No password, reset token, JWT or raw IP logging. Requires a dedicated development deployment.
import {createClient} from 'npm:@supabase/supabase-js@2.119.0';
const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const allowedOrigins=(Deno.env.get('CAMUM_ALLOWED_ORIGINS')||'').split(',').map(x=>x.trim()).filter(Boolean);
const salt=Deno.env.get('CAMUM_RATE_SALT')||'';
const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
const publicClient=()=>createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
const hex=(a:ArrayBuffer)=>[...new Uint8Array(a)].map(x=>x.toString(16).padStart(2,'0')).join('');
const hash=async(s:string)=>hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
const random=()=>hex(crypto.getRandomValues(new Uint8Array(32)).buffer);
const rpc=async(name:string,args:Record<string,unknown>)=>{const {data,error}=await admin.rpc(name,args);if(error)throw Error('계정 처리를 완료하지 못했습니다. 중앙관리자에게 문의해 주세요.');return data;};
const passwordOK=(v:unknown)=>typeof v==='string'&&v.length>=12&&v.length<=128;
const payload=(jwt:string)=>JSON.parse(atob(jwt.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin')||'',headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':allowedOrigins.includes(origin)?origin:'null','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'};
 const reply=(status:number,data:unknown)=>new Response(JSON.stringify(data),{status,headers});
 if(!allowedOrigins.includes(origin)||salt.length<32)return reply(403,{error:'허용된 개발 사이트에서만 사용할 수 있습니다.'});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply(405,{error:'POST required'});
 try{
 if(Number(req.headers.get('content-length')||0)>8192)return reply(413,{error:'요청이 너무 큽니다.'});
 const reader=req.body?.getReader();let total=0,body='';if(!reader)throw Error('요청 없음');const decoder=new TextDecoder();for(;;){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>8192){await reader.cancel();return reply(413,{error:'요청이 너무 큽니다.'});}body+=decoder.decode(value,{stream:true});}body+=decoder.decode();const d=JSON.parse(body);
 const number=String(d.number||'').toUpperCase().trim();
 const ip=(req.headers.get('x-forwarded-for')||'unknown').split(',').at(-1)?.trim()||'unknown';
 // Account-wide limit remains effective even if an untrusted forwarding header is spoofed.
 const ipHash=await hash(salt+'|'+ip);
 if(['login','recover','complete-reset'].includes(d.action)){
 if(!await rpc('ops_auth_attempt',{p_number:d.action==='complete-reset'?'reset:'+(await hash(String(d.token||''))).slice(0,16):number.slice(0,40),p_ip_hash:ipHash}))return reply(429,{error:'시도가 많습니다. 15분 뒤 다시 시도해 주세요.'});}
 if(d.action==='login'){
 const info=await rpc('ops_auth_lookup',{p_number:number});if(!info||!info.user_id||info.state!=='active'||['suspended','rejected'].includes(info.organization_status))return reply(401,{error:'기관 관리번호와 비밀번호를 확인해 주세요.'});
 const client=publicClient();const {data,error}=await client.auth.signInWithPassword({email:info.email,password:String(d.password||'')});
 if(error||!data.session||data.user.id!==info.user_id)return reply(401,{error:'기관 관리번호와 비밀번호를 확인해 주세요.'});
 await rpc('ops_auth_register_session',{p_org:info.org,p_user:data.user.id,p_session:payload(data.session.access_token).session_id});
 return reply(200,{session:data.session,number});
 }
 if(d.action==='recover'){await rpc('ops_auth_recovery_request',{p_number:number});return reply(200,{message:'요청을 접수했습니다. 중앙관리자가 기존 공식 연락처로 기관을 확인한 뒤 재설정을 안내합니다. 관리번호만으로 비밀번호는 바뀌지 않습니다.'});}
 if(d.action==='complete-reset'){
 if(!passwordOK(d.newPassword)||!/^[a-f0-9]{64}$/.test(d.token||''))return reply(400,{error:'새 비밀번호는 12~128자로 입력하고 재설정 링크를 확인해 주세요.'});
 const ticket=await rpc('ops_auth_redeem_reset',{p_hash:await hash(d.token)});
 const {error}=await admin.auth.admin.updateUserById(ticket.user_id,{password:d.newPassword,email:ticket.email,email_confirm:true});if(error)throw Error('안전하게 잠근 상태입니다. 중앙관리자에게 새 재설정 링크를 요청해 주세요.');
 await rpc('ops_auth_activate',{p_org:ticket.org});return reply(200,{message:'비밀번호를 설정하고 기존 모든 기관 세션을 해제했습니다. 기관 관리번호로 다시 로그인해 주세요.'});
 }
 const token=(req.headers.get('authorization')||'').replace(/^Bearer /i,'');const scoped=createClient(url,anon,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:identity,error:identityError}=await scoped.auth.getUser(token);if(identityError||!identity.user)return reply(401,{error:'로그인이 필요합니다.'});
 const {data:claims,error:claimError}=await scoped.rpc('ops_bootstrap');if(claimError||!claims?.session_valid)return reply(401,{error:'만료된 기관 세션입니다. 다시 로그인해 주세요.'});
 if(d.action==='change-password'){
 if(!passwordOK(d.newPassword))return reply(400,{error:'새 비밀번호는 12~128자로 입력해 주세요.'});
 const info=await rpc('ops_auth_lookup',{p_number:number});if(!info||info.user_id!==identity.user.id)return reply(403,{error:'다른 기관의 비밀번호를 변경할 수 없습니다.'});
 if(!await rpc('ops_auth_attempt',{p_number:number,p_ip_hash:ipHash}))return reply(429,{error:'15분 뒤 다시 시도해 주세요.'});
 const client=publicClient();const check=await client.auth.signInWithPassword({email:info.email,password:String(d.oldPassword||'')});if(check.error)return reply(401,{error:'현재 비밀번호를 확인해 주세요.'});
 await rpc('ops_auth_begin_change',{p_org:info.org,p_user:identity.user.id,p_session:payload(token).session_id});const {error}=await admin.auth.admin.updateUserById(info.user_id,{password:d.newPassword});if(error)throw Error('계정을 안전하게 잠갔습니다. 중앙관리자에게 문의해 주세요.');
 await rpc('ops_auth_activate',{p_org:info.org});return reply(200,{message:'비밀번호 변경 완료. 기존 모든 기관 세션이 해제되었습니다. 다시 로그인해 주세요.'});
 }
 if(d.action==='issue-reset'){
 if(!claims.operator||claims.institution_account)return reply(403,{error:'중앙관리자 MFA 인증이 필요합니다.'});
 if(typeof d.note!=='string'||d.note.trim().length<10)return reply(400,{error:'기존 공식 연락처로 확인한 기록을 입력해 주세요.'});
 let info=await rpc('ops_auth_lookup',{p_number:number});if(!info||info.organization_status!=='approved')return reply(400,{error:'승인된 기관만 계정을 발급·복구할 수 있습니다.'});
 if(!info.user_id){const email=random()+'@institution.camum.invalid';const {data,error}=await admin.auth.admin.createUser({email,password:random(),email_confirm:true});if(error||!data.user)throw Error('기관 계정 발급 실패');
 try{await rpc('ops_auth_bind',{p_org:info.org,p_user:data.user.id,p_email:email});}catch(e){await admin.auth.admin.deleteUser(data.user.id);throw e;}}
 const resetToken=random();await rpc('ops_auth_issue_reset',{p_org:info.org,p_hash:await hash(resetToken),p_operator:identity.user.id,p_note:d.note.trim()});
 return reply(200,{token:resetToken,number,expiresInMinutes:30});
 }
 return reply(400,{error:'지원하지 않는 작업입니다.'});
 }catch{return reply(400,{error:'요청을 완료하지 못했습니다. 다시 확인하거나 중앙관리자에게 문의해 주세요.'});}
});
