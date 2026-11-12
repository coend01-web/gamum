const themes=await fetch('themes.json').then(r=>r.json());
const form=document.querySelector('#compare-controls'),space=form.elements.space,view=form.elements.view,size=form.elements.size;
for(const t of themes){const o=document.createElement('option');o.value=t.id;o.textContent=`${t.number} · ${t.name}`;space.append(o);}
const params=new URLSearchParams(location.search);
if(themes.some(t=>t.id===params.get('space')))space.value=params.get('space');
if(['home','minute','gallery'].includes(params.get('view')))view.value=params.get('view');
if(['360','390','768','1440'].includes(params.get('size')))size.value=params.get('size');
function scaleFrames(){for(const frame of document.querySelectorAll('#v2, #v3')){const shell=frame.parentElement,w=Number(size.value),available=shell.parentElement.clientWidth,scale=Math.min(1,available/w);frame.style.width=w+'px';frame.style.height=(w>700?1000:844)+'px';frame.style.transform=`scale(${scale})`;shell.style.width=w*scale+'px';shell.style.height=(w>700?1000:844)*scale+'px';}}
// Review-only alignment for the preserved V2 page, whose initial async anchor is not restored.
for(const frame of document.querySelectorAll('#v2, #v3'))frame.addEventListener('load',()=>{
 const doc=frame.contentDocument;if(!doc)return;
 const align=()=>{const main=doc.querySelector('main');if(!main||main.getAttribute('aria-busy')==='true')return false;
  if(view.value==='minute'){const target=doc.querySelector('#minute');if(target)frame.contentWindow.scrollTo({top:target.offsetTop-24,behavior:'instant'});}return true;};
 if(!align()){const observer=new MutationObserver(()=>{if(align())observer.disconnect();});observer.observe(doc.body,{childList:true,subtree:true,attributes:true,attributeFilter:['aria-busy']});}
});
function update(){const q=`?space=${space.value}#${view.value}`;for(const [id,file] of [['v2','v2.html'],['v3','index.html']]){document.querySelector('#'+id).src=file+q;document.querySelector('#open-'+id).href=file+q;}history.replaceState(null,'',`?space=${space.value}&view=${view.value}&size=${size.value}`);scaleFrames();}
form.addEventListener('change',update);form.addEventListener('submit',e=>e.preventDefault());new ResizeObserver(scaleFrames).observe(document.querySelector('.comparison'));update();
const reviews={release:'접힌 리넨과 낮은 돌턱이 사람의 흔적을 남깁니다. 빈 공간의 따뜻한 반사광을 살리기 위해 기존 사진과 모바일 구도를 유지했습니다.',wounds:'닳은 벽의 층에서 부드러운 측광과 깊은 벽감으로 시선이 이어집니다. 상처를 과장하는 대신 돌봄의 감각을 유지하고, 묵상에는 옅은 장밋빛을 연결했습니다.',waiting:'안개 너머 작은 잎과 돌턱의 미세한 온기가 기다림 속의 생기를 전합니다. 희망을 인위적인 소품으로 더하지 않고 은녹색 공간으로 이어지게 했습니다.',tears:'차가운 빗방울 사이에 이미 작은 따뜻한 반사광이 있습니다. 슬픔과 온기를 함께 유지하며, 묵상 글자는 사진 밖의 밝고 차분한 면에 놓았습니다.'};
for(const [id,description] of Object.entries(reviews)){const t=themes.find(t=>t.id===id),article=document.createElement('article'),a=document.createElement('a'),img=document.createElement('img'),h=document.createElement('h3'),p=document.createElement('p');a.href=`art-v2/${id}.jpg`;a.target='_blank';a.rel='noopener';a.setAttribute('aria-label',`${t.name} 기존 이미지 확대`);img.src=`art-v2/${id}-720.jpg`;img.width=720;img.height=480;img.loading='lazy';img.alt=`${t.name} · 보존한 AI 제작 가상 공간`;h.textContent=`${t.number} ${t.name} — 원본 유지`;p.textContent=description;a.append(img);article.append(a,h,p);document.querySelector('#image-reviews').append(article);}
