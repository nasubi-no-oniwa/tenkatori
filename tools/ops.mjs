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
const MAP = globalThis.TK_MAP; globalThis.TK_FNAME = L => { const f = (globalThis.TK.F || []).find(x => x.L === L); return f ? f.nm[0] : L; };
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
    const vals = lm.c.map(i => own[i]), L = vals.every(v => v === vals[0]) && vals[0] !== 'w' ? vals[0] : '';
    // ほうびの1時間：自分の番のとなりの時間。この処理がおくれて、となりがもう始まっていたら、これから始まる時間のうち一番早いものにする（11/21）
    const e = L && ts && ts.h ? pickBonusHour(ts.h, L, Math.floor((now - d) / HR)) : -1;
    if (e >= 0) { w['sch/' + (d + e * HR) + '/f2'] = L; w['schd/' + d + '/x'] = { [e]: L }; }
    w['kz/' + y] = { L, e, t: now };
    const nm = lm.n[0];
    const mine = L && ts && ts.h ? ts.h.indexOf(L) : -1, adj = e >= 0 && Math.abs(e - mine) === 1;
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
  if (Object.keys(w).length) await api('PATCH', '/tk.json', w, tok);
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
  const HR = 3600000, DAY = 86400000, JST = 9 * HR, END = Date.UTC(2026, 10, 30, 14, 59, 59, 999), RICE = 40;
  const get = async p => JSON.parse(await api('GET', p, undefined, tok)) || {};
  const have = await get('/tk/schd.json'), now = Date.now();
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
        const L = 'abcdefghijklmnopqrst'.split(''); for (let i = L.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [L[i], L[j]] = [L[j], L[i]]; }
        const a = Array(24).fill('*'); slots.forEach((i, k) => a[i] = L[k]);
        if (!prev || a.every((x, i) => x === '*' || prev[i] !== x)) { h = a.join(''); break; }
      }
      w['schd/' + d + '/r'] = d; w['schd/' + d + '/h'] = h; for (let i = 0; i < 24; i++) w['sch/' + (d + i * HR)] = { a: d + i * HR, f: h[i] };
    }
    if (!(old && old.k && old.rc)) {   // 米俵と決戦地（11/18 から）
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
