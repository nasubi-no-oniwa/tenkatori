// ルールの試験（にせのデータベースで）：node test/rules-test.mjs
import fs from 'fs';
import { createRequire } from 'module';
import { run, seed } from './scenario.mjs';
const require = createRequire(import.meta.url);
const { DB } = require('../tools/rtdb.cjs');
const tk = JSON.parse(fs.readFileSync(new URL('../database.rules.tk.json', import.meta.url), 'utf8'));
const db = new DB({ rules: { '.read': false, '.write': false, ft_admin: { '.read': false, '.write': false }, ft_admins: { $uid: { '.read': false, '.write': 'auth != null && auth.uid === $uid' } }, tk } });
db.now = 1795000000000;
db.data = { tk: seed() };
const fill = v => { if (v && typeof v === 'object') { if (v['.sv'] === 'timestamp') return db.now; if (v['.sv']) return v; const o = Array.isArray(v) ? [] : {}; for (const k in v) o[k] = fill(v[k]); return o; } return v; };
const setAt = (o, parts, v) => { let x = o; for (let i = 0; i < parts.length - 1; i++) { if (x[parts[i]] == null || typeof x[parts[i]] !== 'object') x[parts[i]] = {}; x = x[parts[i]]; } if (v === null) delete x[parts[parts.length - 1]]; else x[parts[parts.length - 1]] = v; };
let last = '';
const drv = {
  user: async n => 'uid_' + n,
  update: async (obj, uid) => { db.now += 7; const o = {}; for (const k in obj) o['tk/' + k] = fill(obj[k]); const r = db.update(o, uid ? { uid } : null); last = r.why || ''; return r.ok; },
  read: async (p, uid) => { const okk = db.canRead('tk/' + p, uid ? { uid } : null); return { ok: okk, val: okk ? db.get('tk/' + p) : undefined }; },
  admin: async obj => { for (const k in obj) setAt(db.data, ('tk/' + k).split('/'), fill(obj[k])); },
  advance: async ms => { db.now += ms; },
};
const r = await run(drv, m => console.log(m + (m.startsWith('  ×') ? '   ← ' + last : '')));
// 管理人
db.data.ft_admin = { key: 'KAGI' }; db.data.ft_admins = { uid_GM: 'KAGI' };
let p = r.pass, f = r.fail; const ok = (c, m) => { if (c) { p++; console.log('  ○ ' + m); } else { f++; console.log('  × ' + m + '  ' + last); } };
console.log('8) 管理人');
const up = async (o, u) => drv.update(o, u);
ok(await up({ 'b/a/GMpost00001': { t: db.now + 7, u: 'uid_GM', n: 'なすP', m: '管理人です', g: true } }, 'uid_GM'), '管理人は陣営の軍議に書ける');
ok(!(await up({ 'b/a/GMpost00002': { t: db.now + 7, u: 'uid_X', n: 'なすP', m: 'にせ管理人', g: true } }, 'uid_X')), 'かぎのない人は管理人として書けない');
ok((await drv.read('b/a', 'uid_GM')).ok && (await drv.read('ask', 'uid_GM')).ok, '管理人は全部の板と質問を読める');
ok(await up({ 'b/a/GMpost00001': null }, 'uid_GM'), '管理人は書きこみを消せる');
ok(await up({ 'c/2': 'w', 's/ver': 1 }, 'uid_GM'), '管理人はマスを直せる');
ok(await up({ 's/stop': true }, 'uid_GM') && await up({ 's/pin': 'お知らせ' }, 'uid_GM'), '管理人は一時停止とお知らせができる');
ok(!(await up({ 's/stop': true }, 'uid_X')), 'かぎのない人は一時停止できない');
console.log(`\n合格 ${p} ／ 不合格 ${f}`);
process.exit(f ? 1 : 0);
