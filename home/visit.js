export const THEME_IDS=['thirst','rest','breath','silence','release','light','window','path','invitation','companionship','wounds','forgiveness','waiting','tears','beginning','morning','seed','encounter','gratitude','peace'];
const read=(s,k,d)=>{try{return JSON.parse(s.getItem(k))??d;}catch{return d;}};
const write=(s,k,v)=>{try{s.setItem(k,JSON.stringify(v));return true;}catch{return false;}};
export function selectSpace(local,session,forced,random=Math.random){
 if(THEME_IDS.includes(forced))return forced;
 let state=read(local,'camum-space-bag',read(session,'camum-space-bag',{remaining:[],last:null}));
 if(!state||!Array.isArray(state.remaining))state={remaining:[],last:null};
 let bag=[...new Set(state.remaining.filter(x=>THEME_IDS.includes(x)))];
 if(!bag.length){bag=[...THEME_IDS];for(let i=bag.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}
 if(bag[0]===state.last)[bag[0],bag[1]]=[bag[1],bag[0]];}
 const id=bag.shift();write(local,'camum-space-bag',{remaining:bag,last:id});write(session,'camum-space-bag',{remaining:bag,last:id});write(session,'camum-space-visit',id);return id;
}
export function readProgress(storage,id){const n=read(storage,'camum-space-step-'+id,0);return Number.isInteger(n)&&n>=0&&n<4?n:0;}
export function saveProgress(storage,id,step){return write(storage,'camum-space-step-'+id,step);}
export function readSaved(storage){const v=read(storage,'camum-design-shelf',{programs:[],spaces:[]});return v&&Array.isArray(v.programs)&&Array.isArray(v.spaces)?v:{programs:[],spaces:[]};}
export function saveShelf(storage,saved){return write(storage,'camum-design-shelf',saved);}
