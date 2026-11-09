// Vanilla ES modules; no compilation of app code. Vendor the pinned SDK locally for CSP/offline reproducibility.
import {mkdir,copyFile} from 'node:fs/promises';
await mkdir('ops/vendor',{recursive:true});
await copyFile('node_modules/@supabase/supabase-js/dist/umd/supabase.js','ops/vendor/supabase.js');
await copyFile('node_modules/@supabase/supabase-js/LICENSE','ops/vendor/SUPABASE-LICENSE');
console.log('Pinned Supabase SDK copied. Operations pages use native ES modules.');

await copyFile('node_modules/qrcode-generator/dist/qrcode.mjs','ops/vendor/qrcode.js');
