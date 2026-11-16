// 最初の地図をデータベースに入れる（tk/c がまだないときだけ。あるときは何もしない＝遊んでいる途中の地図は絶対に書きかえない）
import fs from 'fs';
import { token, api } from './fb.mjs';
const m = JSON.parse(fs.readFileSync('data/map.json', 'utf8'));
const tok = await token();
const has = await api('GET', '/tk/c.json?shallow=true', undefined, tok);
if (has && has !== 'null') { console.log('地図はもう入っています。何もしません'); process.exit(0); }
const N = m.n, c = m.own.split(''), adj = {}, pos = new Map();
for (let i = 0; i < N; i++) pos.set(m.cells[2 * i] + ',' + m.cells[2 * i + 1], i);
const link = (a, b) => { (adj[a] = adj[a] || {})[b] = true; (adj[b] = adj[b] || {})[a] = true; };
for (let i = 0; i < N; i++) { const x = m.cells[2 * i], y = m.cells[2 * i + 1]; for (const [dx, dy] of [[1, 0], [0, 1]]) { const j = pos.get((x + dx) + ',' + (y + dy)); if (j !== undefined) link(i, j); } }
for (const [a, b] of m.sea) link(a, b);
const n = { w: 0 }, mm = {}, k = {};
for (const L of 'abcdefghijklmnopqrst') { n[L] = 0; mm[L] = 0; }
for (const L of c) n[L]++;
for (const L in m.castle) k[m.castle[L]] = L;
if (Object.keys(adj).length !== N) throw new Error('となりのないマスがあります');
await api('PATCH', '/tk.json', { c, adj, k, s: { n, m: mm, ver: 0 } }, tok);
console.log('地図を入れました', N, 'マス', JSON.stringify(n));
