// Loaded ONLY by an explicit ?sandbox=1 on localhost. No production authentication.
export function createSandboxClient(){
 let name=sessionStorage.getItem('camum-sandbox-user')||'';
 const request=async(action,args={})=>{const r=await fetch('/__sandbox',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,user:name,...args})});const data=await r.json();if(!r.ok)throw Error(data.error);return data;};
 return {async edge(){throw Error('실제 비밀번호·MFA 검증은 개발용 Supabase 연결 후 실행합니다. 이 화면은 가상 로컬 테스트입니다.');},async institutionLogin(){throw Error('가상 테스트는 아래 테스트 계정 버튼을 이용해 주세요. 실제 기관 비밀번호 인증은 Supabase 연결이 필요합니다.');},async user(){return name?request('user'):null;},async login(who){name=who;sessionStorage.setItem('camum-sandbox-user',name);return request('user');},async logout(){name='';sessionStorage.removeItem('camum-sandbox-user');},rpc:(name,args={})=>request('rpc',{name,args}),list:(table,filter={})=>request('list',{table,filter})};
}
