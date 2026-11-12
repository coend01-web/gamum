// Assemble an allowlisted public tree; no operations code or development settings.
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';
const target=path.resolve(process.argv[2]||'../outputs/camum-final-public');
if(fs.existsSync(target)&&fs.readdirSync(target).length)throw Error('Use a new empty output folder to preserve previous builds.');
fs.mkdirSync(target,{recursive:true});
const baseline='2a624d6fd0a3a4c68c32b2d5c59281c69bbd0ecc';
for(const name of execFileSync('git',['ls-tree','-r','--name-only',baseline],{encoding:'utf8'}).trim().split('\n')){
 const dest=path.join(target,name);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,execFileSync('git',['show',baseline+':'+name],{maxBuffer:20*1024*1024}));
}
fs.copyFileSync(path.join(target,'index.html'),path.join(target,'legacy.html'));
fs.cpSync('home',path.join(target,'home'),{recursive:true});
fs.copyFileSync('scripts/public-entry.html',path.join(target,'index.html'));
fs.writeFileSync(path.join(target,'.nojekyll'),'');
console.log('Public tree ready: '+target);
