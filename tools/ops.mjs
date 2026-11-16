// 管理の操作を GitHub の上から行う（手で動かす）
//  stop  ：開戦準備中にする（ふつうの人は、仕官もマスを取ることもできない。地図は見られる。GMモードは使える）
//  open  ：開戦準備中を外す
//  launch：公開。マス・戦況・仕えた人・掲示板・質問を全部消して最初の地図に戻し、開戦準備中を外す
import fs from 'fs';
import { token, api } from './fb.mjs';
import { build } from './mapseed.mjs';
const op = process.argv[2], tok = await token();
if (op === 'stop') { await api('PATCH', '/tk/s.json', { stop: true }, tok); console.log('開戦準備中にしました'); }
else if (op === 'open') { await api('DELETE', '/tk/s/stop.json', undefined, tok); console.log('開戦準備中を外しました'); }
else if (op === 'launch') {
  const d = build(JSON.parse(fs.readFileSync('data/map.json', 'utf8'))); d.s.ver = Date.now();   // ver を変えると、みんなのスマホに残った古い地図も読みなおされる
  await api('PUT', '/tk.json', d, tok);
  const after = JSON.parse(await api('GET', '/tk/s.json', undefined, tok));
  console.log('全部消して、最初の地図に戻しました', JSON.stringify(after.n), '開戦準備中：', !!after.stop);
} else { console.log('op は stop / open / launch のどれかにしてください'); process.exit(1); }
