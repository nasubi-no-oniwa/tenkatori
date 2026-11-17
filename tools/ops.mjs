// 管理の操作を GitHub の上から行う（手で動かす）
//  stop  ：開戦準備中にする（ふつうの人は、仕官もマスを取ることもできない。地図は見られる。GMモードは使える）
//  open  ：開戦準備中を外す
//  reset ：マス・戦況・仕えた人・掲示板・質問を全部消して最初の地図に戻す（開戦準備中のまま）
//  launch：公開。マス・戦況・仕えた人・掲示板・質問を全部消して最初の地図に戻し、開戦準備中を外す
import fs from 'fs';
import { token, api } from './fb.mjs';
import { build } from './mapseed.mjs';
const op = process.argv[2], tok = await token();
if (op === 'stop') { await api('PATCH', '/tk/s.json', { stop: true }, tok); console.log('開戦準備中にしました'); }
else if (op === 'open') { await api('DELETE', '/tk/s/stop.json', undefined, tok); console.log('開戦準備中を外しました'); }
else if (op === 'launch' || op === 'reset') {
  const d = build(JSON.parse(fs.readFileSync('data/map.json', 'utf8'))); d.s.ver = Date.now(); if (op === 'reset') d.s.stop = true;   // ver を変えると、みんなのスマホに残った古い地図も読みなおされる
  await api('PUT', '/tk.json', d, tok);
  const after = JSON.parse(await api('GET', '/tk/s.json', undefined, tok));
  console.log('全部消して、最初の地図に戻しました', JSON.stringify(after.n), '開戦準備中：', !!after.stop);
} else if (op === 'find' || op === 'ban') {
  // 荒らし対応。find：名前で探して、書きこみの数と中身を出すだけ／ban：見つけた人を止め（マスも板も書けなくする）、板の書きこみを消す
  const q = (process.argv[3] || '').trim(), h = (process.argv[4] || '').trim();
  if (!q) { console.log('探す名前（q）を入れてください'); process.exit(1); }
  const FN = 'abcdefghijklmnopqrst'.split('');
  const get = async p => JSON.parse(await api('GET', p, undefined, tok)) || {};
  const u = await get('/tk/u.json');
  const hit = Object.entries(u).filter(([id, x]) => x && typeof x.n === 'string' && x.n.includes(q) && (!h || x.h === h));
  console.log('名前に「' + q + '」をふくむ人' + (h ? '（本拠 ' + h + '）' : '') + '：' + hit.length + '人');
  const ids = new Set(hit.map(([id]) => id));
  const banned = await get('/tk/ban.json');
  for (const [id, x] of hit) console.log('  ' + id + '　名前：' + x.n + '　本拠：' + x.h + '　陣営：' + x.f + '　寝返り：' + (x.r ? 'あり' : 'なし') + '　止め済み：' + (banned[id] ? 'はい' : 'いいえ'));
  let posts = [];
  for (const room of ['all', ...FN]) {
    const b = await get('/tk/b/' + room + '.json');
    for (const [pid, m] of Object.entries(b)) if (m && (ids.has(m.u) || (typeof m.n === 'string' && m.n.includes(q) && (!h || m.h === h)))) posts.push({ room, pid, ...m });
  }
  posts.sort((a, b) => a.t - b.t);
  console.log('掲示板の書きこみ：' + posts.length + '件');
  for (const m of posts) console.log('  [' + m.room + '] ' + new Date(m.t + 9 * 3600000).toISOString().slice(5, 16).replace('T', ' ') + '　' + m.n + '（' + (m.u || '?') + '）：' + String(m.m).slice(0, 100));
  const ask = await get('/tk/ask.json'); const asks = Object.values(ask).filter(a => a && ids.has(a.u));
  console.log('なすPへの質問・要望：' + asks.length + '件'); for (const a of asks) console.log('  ' + String(a.m).slice(0, 100));
  const log = await get('/tk/log.json?orderBy="t"&limitToLast=3000'); const takes = Object.values(log).filter(e => e && ids.has(e.u));
  console.log('マスを取った回数（最近の記録の中）：' + takes.length + '回');
  for (const m of posts) { if (!ids.has(m.u) && m.u) ids.add(m.u); }
  if (op === 'ban') {
    const w = {};
    for (const id of ids) w['ban/' + id] = true;
    for (const m of posts) w['b/' + m.room + '/' + m.pid] = null;
    if (Object.keys(w).length) await api('PATCH', '/tk.json', w, tok);
    console.log('止めました：' + ids.size + '人（マスを取る・板に書く・質問を送るができなくなる）。消した書きこみ：' + posts.length + '件（中身は上に残しています）');
  }
} else if (op === 'revert') {
  // 止めた人（名前 q・本拠 h で探して、止め済みの人だけ）が取ったマスを、取られる前の持ち主に戻す。
  // そのあと誰かが取りなおしたマスはそのまま。勢力の数と家臣の数は数えなおす（何回流しても同じ結果になる）
  const q = (process.argv[3] || '').trim(), h = (process.argv[4] || '').trim();
  if (!q) { console.log('探す名前（q）を入れてください'); process.exit(1); }
  const get = async p => JSON.parse(await api('GET', p, undefined, tok)) || {};
  const [u, ban, logo, c0] = await Promise.all([get('/tk/u.json'), get('/tk/ban.json'), get('/tk/log.json'), get('/tk/c.json')]);
  const ids = new Set(Object.entries(u).filter(([id, x]) => x && typeof x.n === 'string' && x.n.includes(q) && (!h || x.h === h) && ban[id]).map(([id]) => id));
  console.log('戻す対象（止め済みの人）：' + ids.size + '人');
  const c = Array.isArray(c0) ? c0.slice() : Object.assign([], c0);
  const byCell = {};
  for (const e of Object.values(logo).filter(e => e && e.y === 't' && e.c != null).sort((a, b) => a.t - b.t)) (byCell[+e.c] = byCell[+e.c] || []).push(e);
  const w = {}, moved = {}; let n = 0, skip = 0;
  for (const [cell, list] of Object.entries(byCell)) {
    let k = list.length - 1; if (!ids.has(list[k].u)) continue;
    if (c[cell] !== list[k].f) { skip++; continue; }   // 記録といまの持ち主が合わないマスはさわらない
    while (k > 0 && ids.has(list[k - 1].u)) k--;
    const back = list[k].p || 'w';
    w['c/' + cell] = back; w['ct/' + cell] = null; c[cell] = back; n++;
    const key = list[list.length - 1].f + '→' + back; moved[key] = (moved[key] || 0) + 1;
  }
  const cnt = {}; for (const x of c) if (x) cnt[x] = (cnt[x] || 0) + 1;
  for (const L of ['w', ...'abcdefghijklmnopqrst']) w['s/n/' + L] = cnt[L] || 0;
  const mem = {}; for (const [id, x] of Object.entries(u)) if (x && x.f && !ban[id]) mem[x.f] = (mem[x.f] || 0) + 1;
  for (const L of 'abcdefghijklmnopqrst') w['s/m/' + L] = mem[L] || 0;
  w['s/ver'] = Date.now();   // みんなのスマホに残った古い地図を読みなおさせる
  await api('PATCH', '/tk.json', w, tok);
  console.log('戻したマス：' + n + '（記録と合わずさわらなかったマス：' + skip + '）');
  for (const [k2, v] of Object.entries(moved).sort((a, b) => b[1] - a[1])) console.log('  ' + k2 + '：' + v);
  console.log('勢力の数：' + JSON.stringify(cnt));
  console.log('家臣の数（止めた人をのぞく）：' + JSON.stringify(mem));
} else { console.log('op は stop / open / reset / launch / find / ban / revert のどれかにしてください'); process.exit(1); }
