// 管理の操作を GitHub の上から行う（手で動かす）
//  stop  ：開戦準備中にする（ふつうの人は、仕官もマスを取ることもできない。地図は見られる。GMモードは使える）
//  open  ：開戦準備中を外す
//  reset ：マス・戦況・仕えた人・掲示板・質問を全部消して最初の地図に戻す（開戦準備中のまま）
//  launch：公開。マス・戦況・仕えた人・掲示板・質問を全部消して最初の地図に戻し、開戦準備中を外す
import fs from 'fs';
import { token, api } from './fb.mjs';
import { build } from './mapseed.mjs';
const op = process.argv[2], tok = await token();
// 地図（名所・天守閣）と武将の名前
globalThis.window = globalThis; await import('../js/mapdata.js'); await import('../js/data.js');
const RULE4000 = '【天下統一】毎日24時の時点で4000マス以上の軍が天下統一！ 2500マスでは終わらない。11/30の23:59までに届かなければ、安土城を押さえた軍が天下人。';
const MAP = globalThis.TK_MAP; globalThis.TK_FNAME = L => { const f = (globalThis.TK.F || []).find(x => x.L === L); return f ? f.nm[0] : L; };
if (op === 'stop') { await api('PATCH', '/tk/s.json', { stop: true }, tok); console.log('開戦準備中にしました'); }
else if (op === 'notice') {
  // お知らせを掲示板に書いてピン止めする（11/24）。q：data/notice/ のファイル名。all の並びのとおり上から出るよう、時刻を1秒ずつずらす
  const nt = JSON.parse(fs.readFileSync('data/notice/' + (process.argv[3] || '').trim() + '.json', 'utf8')), now = Date.now(), w = {};
  const AZ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', id = k => 'gm' + now.toString(36) + k + Array.from({ length: 8 }, () => AZ[Math.floor(Math.random() * 62)]).join('');
  // del：前に出したなすPのお知らせ（番号が del で始まるもの）を、書きこみもピン止めも消す
  if (nt.del) for (const room of ['all', ...'abcdefghijklmnopqrst']) for (const pre of ['b', 'bp']) {
    const v = JSON.parse(await api('GET', '/tk/' + pre + '/' + room + '.json?shallow=true', undefined, tok)) || {};
    for (const i of Object.keys(v)) if (i.startsWith(nt.del)) w[pre + '/' + room + '/' + i] = null;
  }
  nt.all.forEach((m, k) => { const i = id(k), e = { t: now - k * 1000, u: 'gm', n: 'なすP', m, g: true }; w['b/all/' + i] = e; w['bp/all/' + i] = { t: e.t, n: e.n, m, g: true }; });
  for (const [L, m] of Object.entries(nt.rooms || {})) { const i = id(L), e = { t: now, u: 'gm', n: 'なすP', m, g: true }; w['b/' + L + '/' + i] = e; w['bp/' + L + '/' + i] = { t: now, n: e.n, m, g: true }; }
  // edit：すでに出したなすPの書きこみ（全体）のうち、find をふくむものの文を書きかえる（ピン止めの写しも）
  if (nt.edit) { const [b, bp] = await Promise.all([api('GET', '/tk/b/all.json', undefined, tok), api('GET', '/tk/bp/all.json', undefined, tok)].map(p => p.then(x => JSON.parse(x) || {})));
    for (const ed of nt.edit) for (const [src, pre] of [[b, 'b/all/'], [bp, 'bp/all/']]) for (const [i, e] of Object.entries(src)) if (e && e.g && String(e.m).includes(ed.find)) w[pre + i + '/m'] = ed.m; }
  // swap：全部の板（全体と20家の軍議）の、なすPの書きこみの中の文字を置きかえる（ピン止めの写しも）
  if (nt.swap) for (const room of ['all', ...'abcdefghijklmnopqrst']) for (const pre of ['b', 'bp']) {
    const v = JSON.parse(await api('GET', '/tk/' + pre + '/' + room + '.json' + (pre === 'b' ? '?orderBy="t"&limitToLast=60' : ''), undefined, tok)) || {};
    for (const [i, e] of Object.entries(v)) if (e && e.g && !w[pre + '/' + room + '/' + i + '/m']) { let m = String(e.m); for (const [x, y] of nt.swap) m = m.split(x).join(y); if (m !== e.m) w[pre + '/' + room + '/' + i + '/m'] = m; }
  }
  if (Object.keys(w).length) await api('PATCH', '/tk.json', w, tok); console.log('書いた・ピン止めした・書きかえた：' + Object.keys(w).length + 'か所');
}
else if (op === 'merge') {
  // 三つ巴（11/24 23:59）：マスの多い上位3家を「軍」にして、ほかの17家を城の近い軍にまとめる。q に go と入れたときだけ本当に動かす（空なら下見だけ）
  //  近さが同じくらい（差が1マス未満）なら、家臣の少ない軍へ。家（h）と家紋はそのまま。前の地図と所属は tkbak/{時刻} に控える
  const go = (process.argv[3] || '').trim() === 'go', get = async p => JSON.parse(await api('GET', p, undefined, tok));
  const LS = 'abcdefghijklmnopqrst'.split(''), FN = globalThis.TK_FNAME;
  // h に 2359 のような時刻を入れると、日本時間のその時刻まで待ってから動かす（12時間より先なら、もう過ぎたとみなしてすぐ動かす）
  // 2355-0000 のように書くと、23:55 に止めてまとめ、0:00 まで止めたままにしてから再開する（11/24）
  const [at, reopen] = (process.argv[4] || '').trim().split('-');
  if (/^\d{4}$/.test(at)) { const HR = 3600000, JST = 9 * HR, d0 = Math.floor((Date.now() + JST) / 86400000) * 86400000 - JST, tg = d0 + (+at.slice(0, 2)) * HR + (+at.slice(2)) * 60000, ms = tg - Date.now();
    if (ms > 0 && ms < 12 * HR) { console.log('日本時間 ' + at + ' まで ' + Math.round(ms / 1000) + '秒待ちます'); await new Promise(r => setTimeout(r, ms)); } }
  let s = await get('/tk/s.json');
  if (s.mg) { console.log('もうまとまっています：' + JSON.stringify(s.mg)); process.exit(0); }
  if (go) { await api('PATCH', '/tk/s.json', { stop: true }, tok); console.log('止めました。書きこみが落ちつくのを待ちます'); await new Promise(r => setTimeout(r, 12000)); s = await get('/tk/s.json'); }
  const [c0, u] = await Promise.all([get('/tk/c.json'), go ? get('/tk/u.json') : Promise.resolve({})]);
  const c = Array.isArray(c0) ? c0.slice() : Object.assign([], c0);
  const top = LS.slice().sort((a, b) => (s.n[b] || 0) - (s.n[a] || 0)).slice(0, 3);
  const xy = L => [MAP.cells[2 * MAP.castle[L]], MAP.cells[2 * MAP.castle[L] + 1]], mg = {};
  const mem = {}; for (const T of top) mem[T] = s.m[T] || 0;
  // 家臣の多い家から順に決める（同じくらいの近さのときに、人数をならせるように）
  for (const L of LS.filter(L => !top.includes(L)).sort((a, b) => (s.m[b] || 0) - (s.m[a] || 0))) {
    const [x, y] = xy(L), ds = top.map(T => { const [a, b2] = xy(T); return [Math.hypot(a - x, b2 - y), T]; }).sort((p, q) => p[0] - q[0]);
    const near = ds.filter(d => d[0] - ds[0][0] < 1).sort((p, q) => mem[p[1]] - mem[q[1]]);
    mg[L] = near[0][1]; mem[mg[L]] += s.m[L] || 0;
    console.log('  ' + FN(L) + ' → ' + FN(mg[L]) + '　' + ds.map(d => FN(d[1]) + d[0].toFixed(2)).join(' '));
  }
  for (const T of top) mg[T] = T;
  const n2 = { w: 0 }, m2 = {}; for (const L of LS) { n2[L] = 0; m2[L] = 0; }
  const cw = {}; c.forEach((L, i) => { if (L && L !== 'w' && mg[L] !== L) { cw['c/' + i] = mg[L]; c[i] = mg[L]; } }); c.forEach(L => { if (L) n2[L] = (n2[L] || 0) + 1; });
  for (const L of LS) m2[mg[L]] += s.m[L] || 0;
  for (const T of top) console.log(FN(T) + '軍：' + LS.filter(L => mg[L] === T).map(FN).join('・') + '｜' + n2[T] + 'マス｜家臣' + m2[T] + '人');
  if (top.some(T => n2[T] >= 2500)) { console.log('2500マスをこえる軍があるので、止めます'); if (go) await api('DELETE', '/tk/s/stop.json', undefined, tok); process.exit(1); }
  if (!go) { console.log('下見だけです（q に go と入れると本当に動かします）'); process.exit(0); }
  const now = Date.now();
  await api('PUT', '/tkbak/' + now + '.json', { c: c0, s, uf: Object.fromEntries(Object.entries(u).filter(([, x]) => x && x.f).map(([id, x]) => [id, x.f])) }, tok);
  console.log('控えを tkbak/' + now + ' に残しました');
  const w = Object.assign({}, cw);
  for (const [id, x] of Object.entries(u)) if (x && x.f && mg[x.f] !== x.f) w['u/' + id + '/f'] = mg[x.f];
  for (const L of LS) { w['s/n/' + L] = n2[L]; w['s/m/' + L] = m2[L]; } w['s/n/w'] = n2.w;
  Object.assign(w, { 's/mg': mg, 's/mt': now, 's/ver': now, 's/av': now, 's/hk': Object.fromEntries(LS.map(L => [L, 0])) });
  // 「見込み」のピン止めを外し、確定のお知らせを出す
  const bp = (await get('/tk/bp.json')) || {};
  for (const [room, list] of Object.entries(bp)) for (const [i, e] of Object.entries(list || {})) if (e && e.g && /見込み|三つ巴へ|23:5|今夜0時/.test(String(e.m))) w['bp/' + room + '/' + i] = null;
  const pid = k => 'gm' + now.toString(36) + k + Math.random().toString(36).slice(2, 10), post = (room, k, m, pin) => { const i = pid(k), e = { t: now - k * 1000, u: 'gm', n: 'なすP', m, g: true }; w['b/' + room + '/' + i] = e; if (pin) w['bp/' + room + '/' + i] = { t: e.t, n: e.n, m, g: true }; };
  const SN = L => FN(L).replace(/(氏康|元就|昌幸|信長|信玄|謙信|政宗|家康|秀吉|義久|義元|道三|義景|長政|義光|義重|経久|元親|宗麟|隆信)$/, '');
  post('all', 0, '【三つ巴、開戦】天下は三つに割れた！ ' + top.map(T => SN(T) + '軍（' + n2[T] + 'マス）').join('・') + '。ここからは軍と軍の戦い。寝返りはできない。2500マスを取った軍が天下統一！', true);
  post('all', 1, top.map(T => SN(T) + '軍←' + LS.filter(L => mg[L] === T && L !== T).map(SN).join('・')).join('　'), true);
  for (const T of top) post(T, 0, '【三つ巴、開戦】' + LS.filter(L => mg[L] === T && L !== T).map(SN).join('・') + 'の与力の皆の者、よくぞ来た！ 今日からこの軍議で、ともに天下を取りにいく。', true);
  await api('PATCH', '/tk.json', w, tok);
  console.log('まとめました：マス ' + Object.keys(cw).length + '・家臣 ' + Object.keys(w).filter(k => /^u\//.test(k)).length + '人');
  await ensureSched(true);
  if (/^\d{4}$/.test(reopen || '')) {   // 再開の時刻まで止めたままにする（0000 なら次の日の0時。12時間より先なら待たない）
    const HR = 3600000, JST = 9 * HR, DAY = 86400000, d0 = Math.floor((Date.now() + JST) / DAY) * DAY - JST;
    let tg = d0 + (+reopen.slice(0, 2)) * HR + (+reopen.slice(2)) * 60000; if (tg < Date.now() - HR) tg += DAY;
    const ms = tg - Date.now(); if (ms > 0 && ms < 12 * HR) { console.log('再開の ' + reopen + ' まで ' + Math.round(ms / 1000) + '秒、止めたまま待ちます'); await new Promise(r => setTimeout(r, ms + 2000)); }
  }
  await api('DELETE', '/tk/s/stop.json', undefined, tok); console.log('止めるのを外しました（開戦）');
}
else if (op === 'nodf') { await api('PATCH', '/tk/s.json', { nodf: true }, tok); console.log('寝返りの受付をやめました'); }
else if (op === 'ver') { await api('PATCH', '/tk/s.json', { ver: Date.now(), av: Date.now() }, tok); console.log('地図の版の番号を上げました（みんなのスマホの地図が読みなおされます）'); }
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
  await revertIds(ids, u, ban, logo, c0);
} else if (op === 'quick') {
  // 仕官してすぐ寝返った人を探す。q：何分以内の寝返りを対象にするか（ふだんは60）。h に go と入れたときだけ、止めて取ったマスも戻す（入れなければ一覧だけ）
  const lim = (+(process.argv[3] || '') || 60) * 60000, go = (process.argv[4] || '').trim() === 'go';
  const get = async p => JSON.parse(await api('GET', p, undefined, tok)) || {};
  const [u, ban0, logo, c0] = await Promise.all([get('/tk/u.json'), get('/tk/ban.json'), get('/tk/log.json'), get('/tk/c.json')]);
  const first = {}, firstD = {}, takes = {};
  for (const e of Object.values(logo)) {
    if (!e || !e.u || typeof e.t !== 'number') continue;
    if (first[e.u] == null || e.t < first[e.u]) first[e.u] = e.t;
    if (e.y === 'd' && (firstD[e.u] == null || e.t < firstD[e.u])) firstD[e.u] = e.t;
    if (e.y === 't') takes[e.u] = (takes[e.u] || 0) + 1;
  }
  const hist = {}, hit = [];
  for (const [id, x] of Object.entries(u)) {
    if (!x || !x.r) continue;
    const d = firstD[id] != null ? firstD[id] : x.d, j = typeof x.j === 'number' ? x.j : first[id];
    if (typeof d !== 'number' || typeof j !== 'number') continue;
    const dt = d - j, b = dt < 600000 ? '10分未満' : dt < 3600000 ? '1時間未満' : dt < 6 * 3600000 ? '6時間未満' : dt < 86400000 ? '1日未満' : '1日以上';
    hist[b] = (hist[b] || 0) + 1;
    if (dt <= lim) hit.push({ id, x, dt, tk: takes[id] || 0 });
  }
  console.log('寝返った人全部の、仕官から寝返りまでの時間：' + JSON.stringify(hist));
  console.log((lim / 60000) + '分以内に寝返った人：' + hit.length + '人（止め済み ' + hit.filter(o => ban0[o.id]).length + '人）');
  hit.sort((a, b) => a.dt - b.dt);
  for (const o of hit) console.log('  ' + o.id + '　名前：' + o.x.n + '　本拠：' + o.x.h + '→いま：' + o.x.f + '　寝返りまで：' + Math.round(o.dt / 60000) + '分　取ったマス：' + o.tk + (ban0[o.id] ? '　止め済み' : ''));
  const byName = {}; for (const o of hit) byName[o.x.n] = (byName[o.x.n] || 0) + 1;
  console.log('名前ごと：' + JSON.stringify(Object.entries(byName).sort((a, b) => b[1] - a[1]).slice(0, 40)));
  if (go) {
    const ids = new Set(hit.map(o => o.id)), w = {};
    for (const id of ids) w['ban/' + id] = true;
    let posts = 0;
    for (const room of ['all', ...'abcdefghijklmnopqrst']) { const b = await get('/tk/b/' + room + '.json'); for (const [pid, m] of Object.entries(b)) if (m && ids.has(m.u)) { w['b/' + room + '/' + pid] = null; posts++; } }
    await api('PATCH', '/tk.json', w, tok);
    console.log('止めました：' + ids.size + '人。消した書きこみ：' + posts + '件');
    const ban = Object.assign({}, ban0); for (const id of ids) ban[id] = true;
    const all = new Set(Object.keys(ban).filter(k => ban[k]));   // 前に止めた人のマスと続いていても、まとめて戻せるように
    await revertIds(all, u, ban, logo, await get('/tk/c.json'));
  }
} else if (op === 'sched') {
  await ensureSched((process.argv[3] || '').trim() === 'redo');
} else if (op === 'daily') {
  // 毎日0時すぎに自動で動く（.github/workflows/daily.yml）。何回流しても同じ結果になる
  //  ①これからの日の時間割・米俵・決戦地がそろっているか ②きのうの決戦地の結果（勝った陣営は今日の早取りの番が2時間）③きのうの一番槍の発表
  await ensureSched(false);
  const HR = 3600000, DAY = 86400000, JST = 9 * HR, now = Date.now(), d = Math.floor((now + JST) / DAY) * DAY - JST, y = d - DAY;
  await sweepRice(d);
  const get = async p => JSON.parse(await api('GET', p, undefined, tok));
  const pid = () => 'D' + now.toString(36) + Math.random().toString(36).slice(2, 10);
  const FN = globalThis.TK_FNAME, w = {};
  const [ys, ts, kz, s, ban] = await Promise.all([get('/tk/schd/' + y + '.json'), get('/tk/schd/' + d + '.json'), get('/tk/kz/' + y + '.json'), get('/tk/s.json'), get('/tk/ban.json')]);
  const H = i => i + '時';
  let logo = null; const getLog = async () => logo || (logo = (await get('/tk/log.json?orderBy="t"&startAt=' + (y - 7 * DAY))) || {});
  // ② 決戦地
  if (ys && ys.k && !kz) {
    const lm = MAP.lm.find(l => l.id === ys.k), lg = Object.values(await getLog()).filter(e => e && e.y === 't'), c = (await get('/tk/c.json')) || {};
    const own = {}; for (const i of lm.c) {
      const es = lg.filter(e => +e.c === i).sort((a, b) => a.t - b.t), before = es.filter(e => e.t < d), after = es.filter(e => e.t >= d);
      own[i] = before.length ? before[before.length - 1].f : after.length ? after[0].p : c[i];
    }
    const vals = lm.c.map(i => own[i] && s && s.mg && s.mg[own[i]] ? s.mg[own[i]] : own[i]), L = vals.every(v => v === vals[0]) && vals[0] !== 'w' ? vals[0] : '';   // 三つ巴のあとは、家を軍に読みかえる
    // ほうびの1時間：自分の番のとなりの時間。この処理がおくれて、となりがもう始まっていたら、これから始まる時間のうち一番早いものにする（11/21）
    const e = L && ts && ts.h ? pickBonusHour(ts.h, L, Math.floor((now - d) / HR)) : -1;
    if (e >= 0) { w['sch/' + (d + e * HR) + '/f2'] = L; w['schd/' + d + '/x'] = { [e]: L }; }
    w['kz/' + y] = { L, e, t: now };
    const nm = lm.n[0];
    const mine = L && ts && ts.h ? ts.h.indexOf(L) : -1, adj = e >= 0 && Math.abs(e - mine) === 1 && ts.h.split(L).length === 2;
    const m = !L ? `お知らせ：きのうの決戦地「${nm}」は、24時にどの陣営も押さえきれなかった。`
      : adj ? `お知らせ：きのうの決戦地「${nm}」は${FN(L)}が守りぬいた！ ほうびに、本日の${FN(L)}の早取りの番は2時間（${H(Math.min(mine, e))}〜${H(Math.max(mine, e) + 1)}）。`
        : `お知らせ：きのうの決戦地「${nm}」は${FN(L)}が守りぬいた！ ほうびに、本日の${H(e)}〜${H(e + 1)}も、${FN(L)}は2分で1マス取れる。`;
    if (e >= 0 || !L) w['b/all/' + pid()] = { t: now, u: 'gm', n: 'なすP', m, g: true };
    else w['b/all/' + pid()] = { t: now, u: 'gm', n: 'なすP', m: `お知らせ：きのうの決戦地「${nm}」は${FN(L)}が守りぬいた！`, g: true };
    console.log('決戦地 ' + nm + '：' + (L ? FN(L) + '（2時間目：' + e + '時）' : 'だれも押さえていない'));
  } else console.log('決戦地：' + (kz ? 'もう出しています' : 'きのうの決戦地がありません'));
  // ③ 一番槍
  if (!(s && s.ich && s.ich.d === d)) {
    const cnt = {}, last = {}; for (const e of Object.values(await getLog())) if (e && e.y === 't' && e.u && e.t >= y && e.t < d && !(ban && ban[e.u])) { cnt[e.u] = (cnt[e.u] || 0) + 1; last[e.u] = e; }
    const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
    if (top) {
      const e = last[top[0]], u = (await get('/tk/u/' + top[0] + '.json')) || {};
      w['s/ich'] = { d, u: top[0], n: u.n || e.n, h: u.h || e.h, f: u.f || e.f, c: top[1] };
      w['b/all/' + pid() + 'i'] = { t: now + 1, u: 'gm', n: 'なすP', m: `お知らせ：きのうの一番槍は「${u.n || e.n}」（${FN(u.f || e.f)}軍）！ 1日で${top[1]}マスを取った。本日一日、名前に「一番槍」がつく。`, g: true };
      console.log('一番槍：' + (u.n || e.n) + ' ' + top[1] + 'マス');
    } else { w['s/ich'] = { d, u: '', c: 0 }; console.log('一番槍：きのうはだれも取っていません'); }
  } else console.log('一番槍：もう出しています');
  // ④ 与力の手柄番付（三つ巴のあと、11/24）：三つ巴になってから取ったマスを、家（h）ごとに数える。止めた人はのぞく
  if (s && s.mt) {
    const lg = (await get('/tk/log.json?orderBy="t"&startAt=' + s.mt)) || {}, hk = {};
    for (const L of 'abcdefghijklmnopqrst') hk[L] = 0;
    for (const e of Object.values(lg)) if (e && e.y === 't' && e.h && hk[e.h] !== undefined && !(ban && ban[e.u])) hk[e.h]++;
    w['s/hk'] = hk; console.log('与力の手柄：' + JSON.stringify(hk));
  }
  // ⑤ 天下統一の判定（11/25から）：きのうの24時ちょうどのマスの数を、いまの数から24時より後の記録を差し引いて求める。4000マス以上の軍が天下統一
  if (s && s.mt && !(s.end && s.end.k !== 'half')) {
    const n0 = Object.assign({}, s.n), lg = (await get('/tk/log.json?orderBy="t"&startAt=' + d)) || {};
    for (const e of Object.values(lg)) if (e && e.y === 't' && e.t >= d) { n0[e.f] = (n0[e.f] || 0) - 1; n0[e.p] = (n0[e.p] || 0) + 1; }
    const win = Object.keys(n0).filter(L => L !== 'w' && n0[L] >= 4000)[0];
    console.log('24時のマス：' + JSON.stringify(n0) + (win ? '　→ 天下統一：' + FN(win) : '　→ 4000マスの軍なし'));
    if (win) { w['s/end'] = { f: win, t: d, k: 'day' }; w['b/all/' + pid() + 'w'] = { t: now + 2, u: 'gm', n: 'なすP', m: `お知らせ：24時、${FN(win)}軍が${n0[win]}マスを治め、天下統一を果たした！ 天下取りマース、これにて終戦。`, g: true }; }
  }
  if (s && s.end && s.end.k === 'half' && !w['s/end']) w['s/end'] = null;   // 前の版の画面が書いた2500マスの印は消す
  // 終わっていたら（天下統一か、11/30 23:59 の終戦）、エンドロールの元を作る（まだなら）
  { const ended = w['s/end'] || (s && s.end && s.end.k !== 'half') || now > Date.UTC(2026, 10, 30, 14, 59, 59, 999);
    if (ended) { const rp = await get('/tk/rp/fin.json'); if (!rp) { if (Object.keys(w).length) { await api('PATCH', '/tk.json', w, tok); for (const k in w) delete w[k]; }
      const s2 = await get('/tk/s.json'); await buildReplay(s2); await api('PUT', '/tk/rp/fin.json', true, tok); } } }
  // 一番槍のピン止めを、今日の分に入れかえる（全体と3軍の軍議）
  if (w['s/ich'] && w['s/ich'].u) {
    const ich = w['s/ich'], m = `お知らせ：きのうの一番槍は「${ich.n}」（${FN(ich.f)}軍）！ 1日で${ich.c}マスを取った。本日一日、名前に「一番槍」がつく。`;
    for (const room of pinRooms(s)) { const v = (await get('/tk/bp/' + room + '.json?shallow=true')) || {}; for (const i of Object.keys(v)) if (i.startsWith('ich')) w['bp/' + room + '/' + i] = null; w['bp/' + room + '/ich' + d] = { t: now + 1, n: 'なすP', m, g: true }; }
  }
  if (Object.keys(w).length) await api('PATCH', '/tk.json', w, tok);
} else if (op === 'replay') {
  // エンドロールの元を、いまの記録で作る（試し・作りなおし）
  await buildReplay(JSON.parse(await api('GET', '/tk/s.json', undefined, tok)));
} else if (op === 'pins') {
  // ピン止めを「一番槍」と「天下統一の決まり」だけにする（早取りの時間割は画面が自動で一番上に出す。11/25）
  const get = async p => JSON.parse(await api('GET', p, undefined, tok)), s = await get('/tk/s.json'), FN = globalThis.TK_FNAME, w = {}, now = Date.now();
  for (const room of ['all', ...'abcdefghijklmnopqrst']) { const v = (await get('/tk/bp/' + room + '.json?shallow=true')) || {}; for (const i of Object.keys(v)) w['bp/' + room + '/' + i] = null; }
  for (const room of pinRooms(s)) {
    w['bp/' + room + '/rule4000'] = { t: now, n: 'なすP', m: RULE4000, g: true };
    if (s.ich && s.ich.u) w['bp/' + room + '/ich' + s.ich.d] = { t: now + 1, n: 'なすP', m: `お知らせ：きのうの一番槍は「${s.ich.n}」（${FN(s.ich.f)}軍）！ 1日で${s.ich.c}マスを取った。本日一日、名前に「一番槍」がつく。`, g: true };
  }
  if (s.end && s.end.k === 'half') w['s/end'] = null;
  w['s/av'] = now;   // 開いている画面を新しい版に読みなおさせる
  await api('PATCH', '/tk.json', w, tok); console.log('ピン止めをそろえました：' + pinRooms(s).join(','));
} else if (op === 'bots') {
  // Bot らしい人を探す（11/18）。q：何点以上を対象にするか（ふだん 3）。h に go と入れたときだけ、止めて取ったマスも戻す
  //  見るところ：①決まりの最短の間隔ぴったりで取りつづける ②眠らない（24時間のうち20時間以上で取っている） ③間隔のばらつきが小さすぎる（機械のように一定）
  //             ④同じ名前・似た名前の人が短い間にたくさん仕官 ⑤仕官してちょうど1時間で最初の1マス
  const lim = +(process.argv[3] || '') || 3, go = (process.argv[4] || '').trim() === 'go';
  const get = async p => JSON.parse(await api('GET', p, undefined, tok)) || {};
  const [u, ban0, logo, schd] = await Promise.all([get('/tk/u.json'), get('/tk/ban.json'), get('/tk/log.json'), get('/tk/schd.json')]);
  const HR = 3600000, DAYM = 86400000, JST = 9 * HR, day = t => Math.floor((t + JST) / DAYM) * DAYM - JST;
  const need = e => { const d = day(e.t), h = schd[d] && schd[d].h; const L = h ? h[Math.floor((e.t - d) / HR)] : ''; return L === e.f ? 120000 : L === '*' ? 300000 : HR; };
  const by = {}; for (const e of Object.values(logo)) if (e && e.y === 't' && e.u) (by[e.u] = by[e.u] || []).push(e);
  const nameCnt = {}; for (const x of Object.values(u)) if (x && x.n) { const k = String(x.n).replace(/[0-9０-９_\-ー]+$/, ''); nameCnt[k] = (nameCnt[k] || 0) + 1; }
  const res = [];
  for (const [id, list] of Object.entries(by)) {
    if (ban0[id]) continue; const x = u[id] || {}; list.sort((a, b) => a.t - b.t);
    const n = list.length; let tight = 0, ivs = []; const hrs = new Set();
    for (let i = 0; i < n; i++) { hrs.add(Math.floor((list[i].t - day(list[i].t)) / HR) + ':' + day(list[i].t));
      if (i) { const iv = list[i].t - list[i - 1].t, nd = need(list[i]); ivs.push(iv); if (iv >= nd && iv <= nd + 60000) tight++; } }
    // 24時間の窓で、何時間に取っているか（いちばん多い窓）
    let wake = 0; for (let i = 0; i < n; i++) { const hs = new Set(); for (let j = i; j < n && list[j].t - list[i].t < DAYM; j++) hs.add(Math.floor(list[j].t / HR)); wake = Math.max(wake, hs.size); }
    const nm = ivs.filter(v => v >= HR && v < HR + 600000); const mean = nm.reduce((a, b) => a + b, 0) / (nm.length || 1);
    const sd = Math.sqrt(nm.reduce((a, b) => a + (b - mean) ** 2, 0) / (nm.length || 1));
    const nk = String(x.n || '').replace(/[0-9０-９_\-ー]+$/, '');
    let sc = 0, why = [];
    if (ivs.length >= 8 && tight / ivs.length >= 0.85) { sc += 2; why.push('最短ぴったり' + tight + '/' + ivs.length); }
    if (wake >= 20) { sc += 2; why.push('24時間で' + wake + '時間'); } else if (wake >= 17) { sc += 1; why.push('24時間で' + wake + '時間'); }
    if (nm.length >= 6 && sd < 8000) { sc += 2; why.push('間隔のぶれ' + (sd / 1000).toFixed(1) + '秒'); }
    if (nk && nameCnt[nk] >= 5) { sc += 1; why.push('同じ名前' + nameCnt[nk] + '人'); }
    if (x.j && list[0] && list[0].t - x.j >= HR && list[0].t - x.j < HR + 20000) { sc += 1; why.push('仕官ちょうど1時間で最初'); }
    if (sc >= 1) res.push({ id, n: x.n, f: x.f, take: n, sc, why: why.join('・') });
  }
  res.sort((a, b) => b.sc - a.sc || b.take - a.take);
  console.log('調べた人（マスを取ったことがある人）：' + Object.keys(by).length + '人');
  console.log(lim + '点以上：' + res.filter(r => r.sc >= lim).length + '人');
  for (const r of res.slice(0, 80)) console.log('  ' + r.sc + '点　' + r.id + '　' + r.n + '（' + r.f + '）　取った' + r.take + '回　' + r.why);
  if (go) {
    const ids = new Set(res.filter(r => r.sc >= lim).map(r => r.id)), w = {};
    for (const id of ids) w['ban/' + id] = true;
    if (ids.size) await api('PATCH', '/tk.json', w, tok);
    console.log('止めました：' + ids.size + '人');
    const ban = Object.assign({}, ban0); for (const id of ids) ban[id] = true;
    await revertIds(new Set(ids), u, ban, logo, await get('/tk/c.json'));
  }
} else if (op === 'fac') {
  // 陣営の家臣を調べる（11/18）。q：陣営の記号（毛利＝g）
  const L = (process.argv[3] || '').trim();
  const get = async p => JSON.parse(await api('GET', p, undefined, tok)) || {};
  const [u, ban, logo, on] = await Promise.all([get('/tk/u.json'), get('/tk/ban.json'), get('/tk/log.json'), get('/tk/on.json')]);
  const takes = {}; for (const e of Object.values(logo)) if (e && e.y === 't' && e.u) takes[e.u] = (takes[e.u] || 0) + 1;
  const all = Object.entries(u).filter(([id, x]) => x && x.f);
  const cnt = {}; for (const [id, x] of all) if (!ban[id]) cnt[x.f] = (cnt[x.f] || 0) + 1;
  console.log('陣営ごとの家臣（止めた人をのぞく）：' + JSON.stringify(Object.entries(cnt).sort((a, b) => b[1] - a[1])));
  const mem = all.filter(([id, x]) => x.f === L);
  const jst = t => t ? new Date(t + 9 * 3600000).toISOString().slice(5, 16).replace('T', ' ') : '—';
  console.log(L + ' の家臣：' + mem.length + '人（止めた人 ' + mem.filter(([id]) => ban[id]).length + '人）／ 1マスも取っていない人 ' + mem.filter(([id]) => !takes[id]).length + '人 ／ 本拠が別の陣営（寝返ってきた）' + mem.filter(([id, x]) => x.h !== L).length + '人');
  const hist = {}; for (const [id, x] of mem) { const k = jst(x.j).slice(0, 11) + '0'; hist[k] = (hist[k] || 0) + 1; }
  console.log('仕官した時刻（10分ごと）：'); for (const [k, v] of Object.entries(hist).sort()) console.log('  ' + k + '  ' + '■'.repeat(Math.min(v, 60)) + ' ' + v);
  const nm = {}; for (const [id, x] of mem) nm[x.n] = (nm[x.n] || 0) + 1;
  console.log('名前（多い順）：' + JSON.stringify(Object.entries(nm).sort((a, b) => b[1] - a[1]).slice(0, 40)));
  for (const [id, x] of mem.sort((a, b) => (a[1].j || 0) - (b[1].j || 0))) console.log('  ' + jst(x.j) + '　' + id + '　' + x.n + '　本拠' + x.h + '　取った' + (takes[id] || 0) + '回　最後に取った' + jst(x.t) + (x.r ? '　寝返り' : '') + (ban[id] ? '　止め済み' : '') + (on[id] ? '　いま開いている' : ''));
} else if (op === 'rice') {
  // 領内の米俵を、いますぐ蔵に入れる（毎日の処理と同じ）
  const DAY = 86400000, JST = 9 * 3600000; await sweepRice(Math.floor((Date.now() + JST) / DAY) * DAY - JST);
} else if (op === 'status') {
  // いまの戦況を書き出す（投稿用の画像を作るため、11/19）
  const HR = 3600000, DAY = 86400000, JST = 9 * HR, now = Date.now(), d = Math.floor((now + JST) / DAY) * DAY - JST;
  const get = async p => JSON.parse(await api('GET', p, undefined, tok));
  const [s, c, td, yd, kz, rice, rg, ban] = await Promise.all([get('/tk/s.json'), get('/tk/c.json'), get('/tk/schd/' + d + '.json'), get('/tk/schd/' + (d - DAY) + '.json'), get('/tk/kz/' + (d - DAY) + '.json'), get('/tk/rice/' + d + '.json'), get('/tk/rg/' + d + '.json?shallow=true'), get('/tk/ban.json?shallow=true')]);
  const cells = Array.isArray(c) ? c : Object.assign([], c);
  const out = { now, d, n: s.n, m: s.m, ich: s.ich || null, end: s.end || null, today: td ? { h: td.h, k: td.k, x: td.x || null } : null, yk: yd ? yd.k : null, kz, rice, rgTaken: Object.keys(rg || {}).length, ban: Object.keys(ban || {}).length };
  console.log('STATUS ' + JSON.stringify(out));
  console.log('CELLS ' + cells.map(x => x || 'w').join(''));
} else { console.log('op は stop / open / reset / launch / find / ban / revert / quick / sched / bots / fac / daily のどれかにしてください'); process.exit(1); }

// 領内の米俵（11/23）：いま色のついたマスにある、まだだれも取っていない今日の米俵を、その陣営の蔵に入れる（その陣営のだれも開いていないときのため）
async function sweepRice(d) {
  const get = async p => JSON.parse(await api('GET', p, undefined, tok)) || {};
  const [rc, rg, c] = await Promise.all([get('/tk/rc/' + d + '.json'), get('/tk/rg/' + d + '.json'), get('/tk/c.json')]);
  const w = {}, cnt = {}, now = Date.now();
  for (const i of Object.keys(rc)) { const L = c[i]; if (rg[i] || !L || L === 'w') continue; w['rg/' + d + '/' + i] = { f: L, t: now }; cnt[L] = (cnt[L] || 0) + 1; }
  for (const [L, n] of Object.entries(cnt)) w['rice/' + d + '/' + L] = { '.sv': { increment: n } };
  if (Object.keys(w).length) await api('PATCH', '/tk.json', w, tok);
  console.log('領内の米俵を蔵に入れた：' + JSON.stringify(cnt) + '（まだ白いマスにある米俵：' + Object.keys(rc).filter(i => !rg[i] && !w['rg/' + d + '/' + i]).length + '俵）');
}
// 決戦地のほうびの1時間を決める。h：今日の時間割（24文字）、L：ほうびの陣営、cur：いまの時（0〜23）。まだ始まっていない時間から選ぶ。なければ -1
export function pickBonusHour(h, L, cur) {
  const i = h.indexOf(L), free = k => k > cur && k < 24 && h[k] !== L;
  for (const k of [i + 1, i - 1]) if (k >= 0 && free(k)) return k;
  for (let k = cur + 1; k < 24; k++) if (free(k) && h[k] !== '*') return k;
  for (let k = cur + 1; k < 24; k++) if (free(k)) return k;
  return -1;
}
// 時間割・米俵・決戦地を、今日から 11/30 まで作る（まだない日・足りない日だけ。すでに見えている日の時間割は変えない）
async function ensureSched(redo) {
  const HR = 3600000, DAY = 86400000, JST = 9 * HR, END = Date.UTC(2026, 10, 30, 14, 59, 59, 999);
  const get = async p => JSON.parse(await api('GET', p, undefined, tok)) || {};
  const have = await get('/tk/schd.json'), now = Date.now();
  // 三つ巴（11/24）：s/mg があれば、早取りは軍ごとに1日2時間（ほかの時間は '-'＝ふだん）。米俵は20俵
  const mg = await get('/tk/s/mg.json'), ARM = Object.keys(mg).length ? 'abcdefghijklmnopqrst'.split('').filter(L => mg[L] === L) : null, RICE = ARM ? 20 : 40;
  const d0 = Math.floor((now + JST) / DAY) * DAY - JST, FAST = [0, 6, 12, 18];
  const slots = [...Array(24).keys()].filter(i => !FAST.includes(i));
  const castle = new Set(Object.values(MAP.castle)), LMS = MAP.lm.filter(l => l.id !== 'azuchi').map(l => l.id);
  let prev = have[d0 - DAY] ? have[d0 - DAY].h : null, prevK = have[d0 - DAY] ? have[d0 - DAY].k : null;
  const w = {}, made = [];
  for (let d = d0; d <= END; d += DAY) {
    const old = have[d]; let h = old && old.h;
    const keep = old && !(redo && d > now);
    if (!keep) {
      for (let tries = 0; tries < 5000; tries++) {   // くじ。前の日と同じ時間に同じ陣営が来ないようにする
        const L = ARM ? [...ARM, ...ARM, ...Array(slots.length - 2 * ARM.length).fill('-')] : 'abcdefghijklmnopqrst'.split(''); for (let i = L.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [L[i], L[j]] = [L[j], L[i]]; }
        const a = Array(24).fill('*'); slots.forEach((i, k) => a[i] = L[k]);
        if (ARM && ARM.some(A => { const ix = a.flatMap((x, i) => x === A ? [i] : []); return ix[1] - ix[0] < 3; })) continue;   // 同じ軍の2回は、3時間以上あける
        if (!prev || a.every((x, i) => x === '*' || x === '-' || prev[i] !== x)) { h = a.join(''); break; }
      }
      w['schd/' + d + '/r'] = d; w['schd/' + d + '/h'] = h; for (let i = 0; i < 24; i++) w['sch/' + (d + i * HR)] = { a: d + i * HR, f: h[i] };
    }
    if (!(old && old.k && old.rc) || (redo && d > now)) {   // 米俵と決戦地（11/18 から）。redo のときは、まだ来ていない日も作りなおす
      let k; do { k = LMS[Math.floor(Math.random() * LMS.length)]; } while (k === prevK && LMS.length > 1);
      const rc = new Set(); while (rc.size < RICE) { const i = Math.floor(Math.random() * MAP.n); if (!castle.has(i)) rc.add(i); }
      w['schd/' + d + '/k'] = k; w['schd/' + d + '/rc'] = [...rc].join(',');
      w['rc/' + d] = Object.fromEntries([...rc].map(i => [i, true]));
      w['rice/' + d] = Object.fromEntries('abcdefghijklmnopqrst'.split('').map(L => [L, 0]));
      made.push(new Date(d + JST).toISOString().slice(5, 10) + ' ' + h + ' 決戦地 ' + k + (keep ? '（時間割はそのまま）' : ''));
      prevK = k;
    } else prevK = old.k;
    prev = h;
  }
  if (Object.keys(w).length) await api('PATCH', '/tk.json', w, tok);
  console.log('作った・足した日：' + made.length + '日'); for (const m of made) console.log('  ' + m);
}

async function revertIds(ids, u, ban, logo, c0) {
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
}

// ピン止めを置く板：全体と、軍の軍議（三つ巴のあと）
function pinRooms(s) { const mg = (s && s.mg) || null; return ['all', ...(mg ? 'abcdefghijklmnopqrst'.split('').filter(L => mg[L] === L) : [])]; }

// エンドロールの元（11/25）：開戦から終わりまでの地図の移り変わりを1時間ごとのコマにし、マスを多く取った人と合わせて rp に置く
//  コマ：前のコマから変わったマスだけを「マス番号（36進3けた）＋持ち主1文字」で並べる。三つ巴の切りかえ（mt）は控え（tkbak）の地図を軍にまとめて入れる
async function buildReplay(s) {
  const HR = 3600000, get = async p => JSON.parse(await api('GET', p, undefined, tok));
  const [lg0, c0, ban, u] = await Promise.all([get('/tk/log.json'), get('/tk/c.json'), get('/tk/ban.json'), get('/tk/u.json')]);
  const lg = Object.values(lg0 || {}).filter(e => e && e.y === 't' && e.c != null && typeof e.t === 'number').sort((a, b) => a.t - b.t);
  const cur = Array.isArray(c0) ? c0 : Object.assign([], c0), N = MAP.n;
  const endT = s.end && s.end.k !== 'half' ? Math.max(s.end.t, ...(lg.length ? [] : [0])) : Math.min(Date.now(), Date.UTC(2026, 10, 30, 14, 59, 59, 999));
  const t0 = Math.floor((lg.length ? lg[0].t : endT) / HR) * HR, nF = Math.max(1, Math.ceil((endT - t0) / HR));
  let bak = null; if (s.mt) bak = await get('/tk/tkbak/' + s.mt + '/c.json');
  const st = MAP.own.split(''), prev = st.slice(), frames = []; let k = 0, mi = -1;
  const snap = () => { let o = ''; for (let i = 0; i < N; i++) if (st[i] !== prev[i]) { o += i.toString(36).padStart(3, '0') + st[i]; prev[i] = st[i]; } frames.push(o); };
  for (let f = 0; f < nF; f++) {
    const e1 = t0 + (f + 1) * HR;
    while (k < lg.length && lg[k].t < e1) {
      if (s.mt && mi < 0 && lg[k].t >= s.mt) break;
      st[+lg[k].c] = lg[k].f; k++;
    }
    if (s.mt && mi < 0 && s.mt < e1) {   // 三つ巴の切りかえ
      if (bak) for (let i = 0; i < N; i++) { const L = bak[i] || MAP.own[i]; st[i] = L === 'w' ? 'w' : (s.mg[L] || L); }
      else for (let i = 0; i < N; i++) if (st[i] !== 'w') st[i] = s.mg[st[i]] || st[i];
      mi = f;
      while (k < lg.length && lg[k].t < e1) { st[+lg[k].c] = lg[k].f; k++; }
    }
    if (f === nF - 1) for (let i = 0; i < N; i++) st[i] = cur[i] || MAP.own[i];   // 最後のコマは、いまの地図にそろえる（止めた人のマスを戻した分など）
    snap();
  }
  const cnt = {}; for (const e of lg) if (e.u && !(ban && ban[e.u])) cnt[e.u] = (cnt[e.u] || 0) + 1;
  const top = Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([id, n]) => { const x = (u && u[id]) || {}; const e = lg.find(z => z.u === id) || {}; return [x.n || e.n || '?', x.h || e.h || '', x.f || e.f || '', n]; });
  const rp = { t0, hr: HR, nf: nF, mi, f: frames.join('|'), top, at: Date.now(), ver: 1 };
  await api('PUT', '/tk/rp.json', rp, tok);
  console.log('エンドロールの元を作りました：' + nF + 'コマ（' + new Date(t0 + 9 * HR).toISOString().slice(0, 16) + '〜）・三つ巴は' + mi + 'コマ目・' + rp.f.length + '文字・上位' + top.length + '人（1位 ' + (top[0] || []).join(' ') + '）');
}
