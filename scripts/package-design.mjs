// Copies only browser assets; never include private DB files, credentials or source history.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const destination=path.resolve(process.argv[2]||'');
if(!process.argv[2]||destination===root||destination.startsWith(root+path.sep))throw Error('Use a separate preview checkout outside the application repository.');
const dist=path.join(destination,'dist');await fs.mkdir(dist,{recursive:true});
const allowed=new Set(['.html','.js','.css','.json','.svg','.woff2','.png','.webp','.jpg','.jpeg','.txt']);
async function copy(dir){for(const entry of await fs.readdir(path.join(root,dir),{withFileTypes:true})){const relative=path.join(dir,entry.name);if(entry.name.startsWith('.')||entry.name.includes('config.local')||entry.isSymbolicLink())continue;if(entry.isDirectory())await copy(relative);else if(allowed.has(path.extname(entry.name))||entry.name.endsWith('LICENSE')){const target=path.join(dist,relative);await fs.mkdir(path.dirname(target),{recursive:true});await fs.copyFile(path.join(root,relative),target);}}}
for(const dir of ['design','assets','ops'])await copy(dir);
await fs.copyFile(path.join(root,'legacy.html'),path.join(dist,'legacy.html'));
await fs.writeFile(path.join(dist,'index.html'),'<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=design/index.html"><title>가뭄. — 빛이 머무는 자리</title><a href="design/index.html">가뭄. 디자인 검토판 열기</a></html>');
console.log('Prepared browser-only preview assets:',dist);
