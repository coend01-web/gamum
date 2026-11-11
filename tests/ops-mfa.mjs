import assert from 'node:assert/strict';
import {qrImageSource, startMfa} from '../ops/mfa.js';
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><path fill="#123" d="M0 0h32v32H0z"/></svg>';
const source = qrImageSource(svg);
assert.equal(decodeURIComponent(source.split(',')[1]), svg);
assert.equal(qrImageSource('data:image/svg+xml;utf-8,' + svg), source);
assert.equal(qrImageSource(source), source);
assert.throws(() => qrImageSource('https://example.org/secret'));
const calls = [];
const pending = {id:'pending',factor_type:'totp',status:'unverified',friendly_name:'CAMUM 중앙관리자'};
const api = {
  async listFactors() {return {data:{totp:[],all:[pending,{...pending,id:'other',friendly_name:'Other app'}]}};},
  async unenroll({factorId}) {calls.push(factorId);return {data:{}};},
  async enroll() {calls.push('enroll');return {data:{id:'new',totp:{qr_code:'data:image/svg+xml;utf-8,'+svg}}};}
};
assert.deepEqual(await startMfa(api), {id:'new',qr:source});
assert.deepEqual(calls, ['pending','enroll']);
calls.length = 0;
api.listFactors = async () => ({data:{totp:[{id:'verified',status:'verified'}],all:[pending]}});
assert.deepEqual(await startMfa(api), {id:'verified'});
assert.deepEqual(calls, []);
api.listFactors = async () => ({error:new Error('offline')});
await assert.rejects(startMfa(api), /offline/);
console.log('PASS: 9 MFA checks — SDK SVG rendering, reload recovery, verified-factor preservation, and fail-closed errors.');
