// いま ft-blue に入っているルールを読み、tk（天下取りマース）と tkt（試験用の場所）だけを差しかえて戻す（ほかのゲームの部分はそのまま）
import fs from 'fs';
import { token, api } from './fb.mjs';
function strip(s) {
  let o = '', i = 0, q = null;
  while (i < s.length) {
    const c = s[i], n = s[i + 1];
    if (q) { o += c; if (c === '\\') { o += n; i += 2; continue; } if (c === q) q = null; i++; continue; }
    if (c === '"' || c === "'") { q = c; o += c; i++; continue; }
    if (c === '/' && n === '/') { while (i < s.length && s[i] !== '\n') i++; continue; }
    if (c === '/' && n === '*') { i += 2; while (i < s.length && !(s[i] === '*' && s[i + 1] === '/')) i++; i += 2; continue; }
    o += c; i++;
  }
  return o.replace(/,(\s*[}\]])/g, '$1');
}
const parse = s => { try { return JSON.parse(s); } catch (e) { return JSON.parse(strip(s)); } };
const tok = await token();
const cur = await api('GET', '/.settings/rules.json', undefined, tok);
const obj = parse(cur);
if (!obj || !obj.rules || typeof obj.rules !== 'object') throw new Error('いまのルールが読めませんでした');
const keys = Object.keys(obj.rules).filter(k => k !== 'tk' && k !== 'tkt');
console.log('いまのルール：', Object.keys(obj.rules).join(' '));
fs.writeFileSync(process.env.RUNNER_TEMP + '/before.json', cur);
const src = fs.readFileSync('database.rules.tk.json', 'utf8');
const tk = JSON.parse(src), tkt = JSON.parse(src.replace(/'tk\//g, "'tkt/"));
obj.rules.tk = tk; obj.rules.tkt = tkt;
await api('PUT', '/.settings/rules.json', JSON.stringify(obj, null, 2), tok);
const after = parse(await api('GET', '/.settings/rules.json', undefined, tok));
const rest = Object.keys(after.rules).filter(k => k !== 'tk' && k !== 'tkt');
const ok = rest.length === keys.length && rest.every(k => JSON.stringify(after.rules[k]) === JSON.stringify(parse(cur).rules[k])) && JSON.stringify(after.rules.tk) === JSON.stringify(tk);
console.log(ok ? '反映しました（tk・tkt。ほかの ' + keys.length + ' 個はそのまま）' : '反映のあとの確認が合いません');
if (!ok) process.exit(1);
