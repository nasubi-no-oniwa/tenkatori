// ゲームの通信の部分（js/net.js）そのものを、本物の ft-blue の試験用の場所（tkt）につないで動かす（終わったら消す）
import fs from 'fs'; import vm from 'vm';
import { token, api } from './fb.mjs';
import { build } from './mapseed.mjs';
const map = JSON.parse(fs.readFileSync('data/map.json', 'utf8'));
const tok = await token();
await api('PUT', '/tkt.json', build(map), tok);
function client() {
  const mem = {};
  const ctx = { console, Math, Map, Set, Array, Object, JSON, Number, String, Promise, Error, Date, URL, URLSearchParams, encodeURIComponent, fetch, setTimeout, clearTimeout,
    localStorage: { getItem: k => mem[k] === undefined ? null : mem[k], setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } }, location: { search: '' } };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.TK_MAP = map; ctx.TK_CONFIG = { apiKey: 'AIzaSyB2iLUuAyxSJ45RewGrbyLg0sYLsC7njIo', databaseURL: 'https://ft-blue-default-rtdb.asia-southeast1.firebasedatabase.app', prefix: 'tkt' };
  vm.createContext(ctx);
  for (const f of ['data.js', 'net.js']) vm.runInContext(fs.readFileSync('js/' + f, 'utf8'), ctx, { filename: f });
  return ctx.TK.NET;
}
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ○ ' + m); } else { fail++; console.log('  × ' + m); } };
const fails = async (p) => { try { await p; return false; } catch (e) { return true; } };
try {
  const A = client(), B = client();
  ok(A.fake === false, 'データベースにつなぐ設定になっている');
  await A.loadState(); ok(A.s.n.c === 197 && A.s.n.w === 3870, '最初の勢力が読める（上杉197・白3870）');
  await A.token(); ok(await A.loadMe() === null, '仕える前は、自分の記録がない');
  await A.join('a', '与作'); ok(A.me && A.me.f === 'a' && A.me.n === '与作', 'Aが織田に仕える');
  let ev = await A.loadCells(); ok(A.cells.length === 5000 && ev.length === 0, '地図を読む（5000マス）');
  const ta = A.takeable(); ok(ta.length > 5, '取れるマスがある（' + ta.length + '）');
  ok(A.wait() > 0 && A.canTake(ta[0]).why === 'wait', '仕えた直後は、1時間たつまで最初の1マスを取れない（あと ' + Math.round(A.wait() / 60000) + '分）');
  ok(await fails(A.take(ta[0])), '仕えた直後に取ろうとしても、はじかれる');
  await api('PATCH', '/tkt/u/' + A.uid() + '.json', { j: 1 }, tok); await A.loadMe();   // 仕官の時刻を昔にして続ける
  ok(A.wait() === 0 && A.canTake(ta[0]).ok, '仕官して時間がたてば、すぐ取れる');
  const prev = A.cells[ta[0]], r = await A.take(ta[0]); ok(A.cells[ta[0]] === 'a' && r.n === 14, 'Aがマスを取る（織田14マス）');
  await A.ping(); ok(Math.abs(A.offset) < 120000, '時計合わせができる（ずれ ' + A.offset + 'ms）');
  await A.loadMe(); ok(A.wait() > 1 * 3600 * 1000 - 120000 && A.canTake(ta[1]).why === 'wait', '取ったあとは1時間待ち（あと ' + Math.round(A.wait() / 60000) + '分）');
  ok(await fails(A.update({ ['c/' + ta[1]]: 'a' })), '待っている間は、じかに書いてもはじかれる');
  await B.token(); await B.join('k', '太郎'); await api('PATCH', '/tkt/u/' + B.uid() + '.json', { j: 1 }, tok); await B.loadMe(); await B.loadState(); ev = await B.loadCells(); ok(B.cells[ta[0]] === 'a' && B.s.n.a === 14 && B.s.n[prev] === (prev === 'w' ? 3869 : B.s.n[prev]), 'Bから見ても、織田のマスが増えている');
  const tb = B.takeable().find(i => B.cells[i] === 'a' && i !== ta[0]); // 斎藤のとなりの織田のマス（Aが取ったばかりのマスは「同時」になるので外す）
  if (tb !== undefined) { await B.take(tb); ok(B.cells[tb] === 'k', 'Bが織田のマスを奪う'); const l = await A.poll(); ok(l.some(e => +e.c === tb && e.f === 'k') && A.cells[tb] === 'k' && A.s.n.a === 13, 'Aの読みなおしで、奪われたことがわかる'); }
  else { const w = B.takeable()[0]; await B.take(w); const l = await A.poll(); ok(l.some(e => +e.c === w) && A.cells[w] === 'k', 'Aの読みなおしで、Bの動きがわかる'); }
  ok(await A.clashing(ta[0]) === true, '取られたばかりのマスは「同時」の取り合い中とわかる');
  if (B.canTake(ta[0]).via !== undefined && B.wait() === 0) { ok(await fails(B.take(ta[0])), 'マスの多い斎藤は、同時には取れない'); }
  ok((await B.recent(10)).length === 2, '戦況に2件');
  await A.post('a', '美濃を攻めよう'); await B.post('all', 'よろしく');
  ok((await A.board('a')).length === 1 && (await A.board('all')).length === 1, '軍議と全体の板が読める');
  ok(await fails(B.board('a')), 'Bは織田の軍議を読めない');
  ok(await fails(A.post('a', 'すぐもう一回')), '続けては書けない');
  await A.loadState(); const weak = A.weakest(); ok(weak.includes('t') && !weak.includes('c'), 'いちばん少ない武将がわかる（' + weak.join(',') + '）');
  const to = weak.find(L => L !== 'a'); await A.defect(to); ok(A.me.f === to && A.me.h === 'a' && A.me.r === true && A.defectWait() > 0, 'Aが寝返る（名前の国は尾張のまま）');
  ok(await fails(A.defect('b')), '続けては寝返れない');
  await B.ask('ランキングがほしいです', 'nasu_p', 'ja', '斎藤道三 太郎'); ok(true, '質問を送れる');
  const C = client(); await C.loadState(); ev = await C.loadCells(); ok(C.cells.join('') === B.cells.join('').replace(/./g, (ch, i) => B.cells[i]), '仕えていない人も地図を読める');
} catch (e) { fail++; console.log('  × 途中で止まりました：' + (e && e.stack || e)); }
finally { await api('DELETE', '/tkt.json', undefined, tok).catch(() => { }); }
console.log(`\nゲームの通信の試験：合格 ${pass} ／ 不合格 ${fail}`);
process.exit(fail ? 1 : 0);
