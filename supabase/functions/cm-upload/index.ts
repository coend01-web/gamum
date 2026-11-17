import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ message: 'POST only' }, 405);
  try {
    const { files } = await req.json();
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
    if (!Array.isArray(files) || files.length === 0 || files.length > 60) return json({ message: '그림은 한 번에 60장까지 올릴 수 있습니다.' }, 400);
    if (files.some((f) => !EXT[String(f && f.type)])) return json({ message: 'jpg·png·webp·gif 그림만 올릴 수 있습니다.' }, 400);
    const ip = (req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown').split(',').pop()!.trim();
    const { data: ok, error: e1 } = await admin.rpc('cm_public_upload_allowance', { p_ip: ip, p_files: files.length });
    if (e1 || !ok) return json({ message: '오늘 올릴 수 있는 그림 수를 초과했거나 업로드를 준비하지 못했습니다. 잠시 후 다시 시도해 주세요.' }, e1?.code === 'P0001' ? 429 : 503);
    const day = new Date().toISOString().slice(0, 10);
    const out = [];
    for (const f of files) {
      const ext = EXT[String(f && f.type)];
      if (!ext) return json({ message: 'jpg·png·webp·gif 그림만 올릴 수 있습니다.' }, 400);
      const path = `${day}/${crypto.randomUUID()}.${ext}`;
      const { data, error } = await admin.storage.from('cm-media').createSignedUploadUrl(path);
      if (error) return json({ message: '업로드 주소를 만들지 못했습니다.' }, 500);
      const { data: pub } = admin.storage.from('cm-media').getPublicUrl(path);
      out.push({ path, signedUrl: data.signedUrl, publicUrl: pub.publicUrl });
    }
    return json({ uploads: out });
  } catch (_e) {
    return json({ message: '요청을 읽지 못했습니다.' }, 400);
  }
});
