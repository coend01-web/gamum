const {createClient}=window.supabase;
import {validateConfig} from './domain.js';
import {startMfa} from './mfa.js';
export const sandbox= ['localhost','127.0.0.1'].includes(location.hostname)&&new URLSearchParams(location.search).get('sandbox')==='1';
export function configuration(){try{return JSON.parse(localStorage.getItem('camum-dev-connection')||'null');}catch{return null;}}
export function saveConfiguration(url,key){if(!validateConfig(url,key))throw Error('개발용 Supabase URL과 sb_publishable_로 시작하는 공개 키만 입력해 주세요.');localStorage.setItem('camum-dev-connection',JSON.stringify({url,key}));}
export async function connect(){
 if(sandbox)return (await import('/tests/sandbox-client.js')).createSandboxClient();
 const cfg=configuration();if(!cfg)return null;
 if(!validateConfig(cfg.url,cfg.key))throw Error('개발 연결 정보를 다시 설정해 주세요.');
 const sb=createClient(cfg.url,cfg.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'camum-ops-auth'}});
 const edge=async(action,values={})=>{const {data,error}=await sb.functions.invoke('institution-auth',{body:{action,...values}});if(error)throw Error('기관 인증 요청을 완료하지 못했습니다. 연결·입력 내용을 확인하거나 중앙관리자에게 문의해 주세요.');if(data?.error)throw Error(data.error);return data;};
 const check=({data,error})=>{if(error)throw Error(error.message);return data;};
 return {auth:sb.auth,edge,async institutionLogin(number,password){const data=await edge('login',{number,password});check(await sb.auth.setSession(data.session));},async mfaStart(){return startMfa(sb.auth.mfa);},async mfaVerify(id,code){return check(await sb.auth.mfa.challengeAndVerify({factorId:id,code}));},async rpc(name,args={}){return check(await sb.rpc(name,args));},async list(table,filter={}){let q=sb.from(table).select('*');for(const [k,v]of Object.entries(filter))q=q.eq(k,v);let all=[];for(let from=0;;from+=500){const data=check(await q.range(from,from+499));all.push(...data);if(data.length<500)return all;}},async user(){const session=check(await sb.auth.getSession());return session?.session?check(await sb.auth.getUser())?.user:null;},async login(email,password){return check(await sb.auth.signInWithPassword({email,password}));},async signup(email,password){return check(await sb.auth.signUp({email,password,options:{emailRedirectTo:location.origin+location.pathname}}));},async logout(){check(await sb.auth.signOut());}};
}
