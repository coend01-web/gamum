const friendlyName = 'CAMUM 중앙관리자';
const check = ({data, error}) => { if (error) throw error; return data; };

// auth-js already prefixes its SVG with a data URL. Encode the SVG only once.
export function qrImageSource(value) {
  const prefix = /^data:image\/svg\+xml(?:;[^,]*)?,/i;
  let svg = String(value || '').replace(prefix, '').trim();
  if (svg.startsWith('%3C') || svg.startsWith('%3c')) svg = decodeURIComponent(svg);
  if (!svg.startsWith('<svg') && !svg.startsWith('<?xml')) throw Error('인증 앱 QR을 준비하지 못했습니다. 다시 로그인해 주세요.');
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

export async function startMfa(mfa) {
  const factors = check(await mfa.listFactors());
  const verified = factors.totp.find(f => f.status === 'verified');
  if (verified) return {id: verified.id};
  // A reload loses the in-memory QR. Replace only this app's unfinished setup;
  // never remove a verified factor or one belonging to another setup.
  for (const factor of factors.all || []) {
    if (factor.factor_type === 'totp' && factor.status === 'unverified' && factor.friendly_name === friendlyName) {
      check(await mfa.unenroll({factorId: factor.id}));
    }
  }
  const enrolled = check(await mfa.enroll({factorType: 'totp', friendlyName}));
  return {id: enrolled.id, qr: qrImageSource(enrolled.totp.qr_code)};
}
