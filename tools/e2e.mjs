// 本物の ft-blue で、ルールが台本どおりに動くか確かめる（試験用の場所 tkt だけを使う。終わったら消す）
import { token, api, DBURL } from './fb.mjs';
import { run, seed } from '../test/scenario.mjs';
const KEY = 'AIzaSyB2iLUuAyxSJ45RewGrbyLg0sYLsC7njIo', P = '/tkt';
const tok = await token();
await api('PUT', P + '.json', seed(), tok);
const toks = {};
const drv = {
  real: true,
  user: async () => { const r = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + KEY, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"returnSecureToken":true}' }); if (!r.ok) throw new Error('匿名ログインができません ' + r.status + ' ' + (await r.text()).slice(0, 200)); const j = await r.json(); toks[j.localId] = j.idToken; return j.localId; },
  update: async (obj, uid) => { const r = await fetch(DBURL + P + '.json?print=silent&auth=' + encodeURIComponent(toks[uid]), { method: 'PATCH', body: JSON.stringify(obj) }); if (!r.ok && r.status !== 401 && r.status !== 403 && r.status !== 400) console.log('    （http ' + r.status + '）'); return r.ok; },
  read: async (p, uid) => { const r = await fetch(DBURL + P + '/' + p + '.json?auth=' + encodeURIComponent(toks[uid])); return { ok: r.ok, val: r.ok ? await r.json() : undefined }; },
  admin: async obj => { await api('PATCH', P + '.json', obj, tok); },
};
let res;
try { res = await run(drv); } finally { await api('DELETE', P + '.json', undefined, tok).catch(() => { }); }
console.log(`\n本物のデータベースでの試験：合格 ${res.pass} ／ 不合格 ${res.fail}`);
process.exit(res.fail ? 1 : 0);
