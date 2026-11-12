// Asset encoding only: retain the original composition and color, no creative retouching.
// Usage (macOS): node scripts/encode-art-v2.mjs /absolute/path/to/originals
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const input=process.argv[2];if(!input)throw Error('Original PNG directory required');
const themes=JSON.parse(fs.readFileSync(path.join(root,'design/themes.json'),'utf8'));
const out=path.join(root,'design/art-v2');fs.mkdirSync(out,{recursive:true});
for(const t of themes)for(const [suffix,width,quality] of [['',1440,78],['-720',720,76],['-400',400,78]]){
 execFileSync('sips',['-s','format','jpeg','-s','formatOptions',String(quality),'-Z',String(width),path.join(input,t.id+'.png'),'--out',path.join(out,t.id+suffix+'.jpg')],{stdio:'ignore'});
}
const files=fs.readdirSync(out).filter(p=>p.endsWith('.jpg'));console.log(JSON.stringify({images:files.length,bytes:files.reduce((n,f)=>n+fs.statSync(path.join(out,f)).size,0),largest:Math.max(...files.map(f=>fs.statSync(path.join(out,f)).size))}));
