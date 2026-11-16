// 最初の地図をデータベースに入れる（tk/c がまだないときだけ。あるときは何もしない＝遊んでいる途中の地図は絶対に書きかえない）
import fs from 'fs';
import { token, api } from './fb.mjs';
import { build } from './mapseed.mjs';
const m = JSON.parse(fs.readFileSync('data/map.json', 'utf8'));
const tok = await token();
const has = await api('GET', '/tk/c.json?shallow=true', undefined, tok);
if (has && has !== 'null') { console.log('地図はもう入っています。何もしません'); process.exit(0); }
const d = build(m);
await api('PATCH', '/tk.json', d, tok);
console.log('地図を入れました', m.n, 'マス', JSON.stringify(d.s.n));
