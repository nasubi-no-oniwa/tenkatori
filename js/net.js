// =============================================
//  天下取りマース  みんなとつながる（Firebase ft-blue の tk の下）
//   データの形とルールは tools/mkrules.mjs の頭に書いてある
//   通信を減らす工夫
//    ・常時接続を使わない（開いたとき・マスを取ったとき・30秒ごとの読みなおしだけ）
//    ・地図はスマホに覚えておき、次からは「前に見たあとに動いたマス」だけを読む
//   ?offline=1 をつけると、データベースにつながず、ひとりで試せる（ほかの陣営は自動で動く）
// =============================================
(function (G) {
  const TK = G.TK, M = G.TK_MAP;
  const N = TK.NET = {};
  const late = ms => new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms));
  const store = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } };
  N.store = store;
  const cfg = () => G.TK_CONFIG || null;
  const P = ((cfg() && cfg().prefix) || 'tk') + '/';     // 試験のときだけ、別の場所（tkt）を使う
  N.fake = /[?&]offline=1/.test((G.location && G.location.search) || '') || !(cfg() && cfg().apiKey);
  const DB = () => cfg().databaseURL.replace(/\/$/, '');
  N.offset = 0; N.now = () => Date.now() + N.offset;
  N.me = null; N.s = { n: {}, m: {}, ver: 0 }; N.cells = null; N.lastT = 0;
  // ---------- 名乗り（匿名） ----------
  const AUTH = G.TK_AUTHURL || { up: 'https://identitytoolkit.googleapis.com/v1/accounts:signUp', ref: 'https://securetoken.googleapis.com/v1/token' };
  const T = {};
  async function signIn() {
    const key = cfg().apiKey, sk = 'tk_auth', saved = store(sk);
    if (saved && saved.rt) {
      const r = await Promise.race([fetch(AUTH.ref + '?key=' + key, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(saved.rt) }), late(12000)]);
      if (r.ok) { const j = await r.json(); T.tok = j.id_token; T.exp = Date.now() + (Math.max(300, +j.expires_in || 3600) - 240) * 1000; T.uid = j.user_id; store(sk, { rt: j.refresh_token, uid: j.user_id }); return T.tok; }
      if (r.status !== 400 && r.status !== 403) throw new Error('auth ' + r.status);
      store(sk, { rt: '' });
    }
    const r = await Promise.race([fetch(AUTH.up + '?key=' + key, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"returnSecureToken":true}' }), late(12000)]);
    if (!r.ok) throw new Error('auth ' + r.status);
    const j = await r.json(); T.tok = j.idToken; T.exp = Date.now() + (Math.max(300, +j.expiresIn || 3600) - 240) * 1000; T.uid = j.localId;
    store(sk, { rt: j.refreshToken, uid: j.localId });
    return T.tok;
  }
  N.token = function (force) {
    if (!force && T.tok && Date.now() < T.exp) return Promise.resolve(T.tok);
    if (!T.p) T.p = signIn().finally(() => { T.p = null; });
    return T.p;
  };
  N.uid = () => N.fake ? 'me' : (T.uid || null);
  // ---------- 通信 ----------
  const q2s = q => q ? Object.entries(q).map(([k, v]) => k + '=' + encodeURIComponent(/^(limitTo|shallow)/.test(k) ? String(v) : JSON.stringify(v))).join('&') : '';
  async function rest(path, q, auth) {
    let qs = q2s(q); if (auth) qs += (qs ? '&' : '') + 'auth=' + encodeURIComponent(await N.token(false));
    const r = await Promise.race([fetch(DB() + '/' + P + path + '.json' + (qs ? '?' + qs : ''), { cache: 'no-store' }), late(15000)]);
    if (!r.ok) { const e = new Error('http ' + r.status); if (r.status === 401 || r.status === 403) e.code = 'PERMISSION_DENIED'; throw e; }
    return r.json();
  }
  async function write(method, path, val, root) {
    for (let i = 0; ; i++) {
      const t = await N.token(i > 0);
      const r = await Promise.race([fetch(DB() + '/' + (root ? '' : P) + path + '.json?print=silent&auth=' + encodeURIComponent(t), { method, body: JSON.stringify(val), cache: 'no-store' }), late(15000)]);
      if (r.ok) return null;
      const txt = await r.text().catch(() => '');
      if (i === 0 && r.status === 401 && /token|auth/i.test(txt) && !/permission/i.test(txt)) continue;
      const e = new Error('http ' + r.status); if (r.status === 401 || r.status === 403) e.code = 'PERMISSION_DENIED'; else if (r.status === 400) e.code = 'BAD_REQUEST'; throw e;
    }
  }
  const update = w => N.fake ? FK.update(w) : write('PATCH', '', w);
  N.rest = rest; N.write = write; N.update = update;
  const SV = { '.sv': 'timestamp' }, INC = n => ({ '.sv': { increment: n } });
  const AZ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let seqN = 0;
  const pid = () => { let s = Date.now().toString(36) + (seqN++ % 1296).toString(36).padStart(2, '0'); for (let i = 0; i < 9; i++) s += AZ[Math.floor(Math.random() * AZ.length)]; return s; };
  N.pid = pid;
  N.cleanName = s => Array.from(String(s || '').replace(/[<>&"'\\\/.#$\[\]\n\r\t​-‏‪-‮]/g, '').trim()).slice(0, 8).join('');
  N.cleanX = s => { s = String(s || '').trim().replace(/^@/, ''); return /^[A-Za-z0-9_]{1,15}$/.test(s) ? s : ''; };
  const sorted = v => Object.keys(v || {}).map(k => Object.assign({ id: k }, v[k])).filter(x => x && typeof x.t === 'number').sort((a, b) => a.t - b.t);

  // ---------- 地図の骨組み（となりの表・天守閣） ----------
  const NC = M.n; const pos = new Map();
  for (let i = 0; i < NC; i++) pos.set(M.cells[2 * i] + ',' + M.cells[2 * i + 1], i);
  const ADJ = Array.from({ length: NC }, () => []);
  for (let i = 0; i < NC; i++) { const x = M.cells[2 * i], y = M.cells[2 * i + 1]; for (const [dx, dy] of [[1, 0], [0, 1]]) { const j = pos.get((x + dx) + ',' + (y + dy)); if (j !== undefined) { ADJ[i].push(j); ADJ[j].push(i); } } }
  for (const [a, b] of M.sea) { ADJ[a].push(b); ADJ[b].push(a); }
  N.ADJ = ADJ; N.cellAt = (x, y) => { const v = pos.get(x + ',' + y); return v === undefined ? -1 : v; };
  const CASTLE = new Map(); for (const L in M.castle) CASTLE.set(M.castle[L], L);
  N.CASTLE = CASTLE;
  // そのマスを取れるか：{ ok, via：足場のマス, why }
  N.canTake = function (i) {
    const me = N.me; if (!me || !N.cells) return { ok: false, why: 'nome' };
    if (N.cells[i] === me.f) return { ok: false, why: 'mine' };
    if (CASTLE.has(i)) return { ok: false, why: 'castle' };
    const mine = ADJ[i].filter(j => N.cells[j] === me.f);
    if (!mine.length) return { ok: false, why: 'far' };
    // 足場にできるのは、天守閣か、となりに自分の陣営のマスか白いマスがあるマス（四方を敵に囲まれた1マスは、足場にできない）
    let via, w = null;
    for (const j of mine) { if (CASTLE.has(j)) { via = j; break; } const k = ADJ[j].find(x => N.cells[x] === me.f || N.cells[x] === 'w'); if (k !== undefined) { via = j; w = k; break; } }
    if (via === undefined) return { ok: false, why: 'boxed' };
    if (N.ended()) return { ok: false, why: 'end', via };
    if (N.s.stop) return { ok: false, why: 'stop', via };
    if (N.wait() > 0) return { ok: false, why: 'wait', via };
    return { ok: true, via, w };
  };
  const alive = (j, f) => CASTLE.has(j) || ADJ[j].some(x => N.cells[x] === f || N.cells[x] === 'w');
  N.takeable = function () { const me = N.me, out = []; if (!me || !N.cells) return out; for (let i = 0; i < NC; i++) if (N.cells[i] !== me.f && !CASTLE.has(i) && ADJ[i].some(j => N.cells[j] === me.f && alive(j, me.f))) out.push(i); return out; };
  N.wait = () => { const me = N.me; if (!me || !me.t) return 0; return Math.max(0, me.t + TK.WAIT - N.now()); };
  N.ended = () => !!(N.s && N.s.end) || N.now() > TK.END;
  // 終わったときの天下人（半分とった武将。時間切れなら、安土城を占領している武将。だれも占領していなければ、いちばん多い武将。同じ数なら並んで天下人）
  // 名所の占領：そのマスを全部、同じ陣営が持っていれば、その陣営（だれも占領していなければ ''）
  N.LM = M.lm || [];
  N.holder = function (lm, cells) { cells = cells || N.cells; if (!cells) return ''; const L = cells[lm.c[0]]; if (L === 'w') return ''; for (const i of lm.c) if (cells[i] !== L) return ''; return L; };
  N.holders = function (cells) { const o = {}; for (const lm of N.LM) o[lm.id] = N.holder(lm, cells); return o; };
  N.KEY = N.LM.find(l => l.id === 'azuchi') || null;        // 天下分け目の城
  N.winners = function () { if (N.s.end && N.s.end.f) return [N.s.end.f]; if (N.KEY && N.cells) { const h = N.holder(N.KEY); if (h) return [h]; } let mx = -1, w = []; for (const f of TK.F) { const n = N.s.n[f.L] || 0; if (n > mx) { mx = n; w = [f.L]; } else if (n === mx) w.push(f.L); } return w; };
  // いちばんマスの少ない武将（寝返れる先。同じ数なら全員）
  N.weakest = function () { let mn = 1e9, w = []; for (const f of TK.F) { const n = N.s.n[f.L] || 0; if (n < mn) { mn = n; w = [f.L]; } else if (n === mn) w.push(f.L); } return w; };
  N.defectWait = () => { const me = N.me; if (!me || !me.d) return 0; return Math.max(0, me.d + TK.DEFECT - N.now()); };

  // ---------- 読む ----------
  let stateAt = 0;
  N.loadState = async function () { const s = N.fake ? FK.state() : await rest('s'); N.s = Object.assign({ n: {}, m: {}, ver: 0 }, s || {}); stateAt = Date.now(); return N.s; };
  N.loadMe = async function () { if (N.fake) { N.me = FK.me(); return N.me; } await N.token(false); const v = await rest('u/' + N.uid(), null, true); N.me = v && v.f ? v : null; return N.me; };
  function applyLog(list) { for (const e of list) { if (e.y === 't' && e.c != null && N.cells) N.cells[+e.c] = e.f; if (e.t > N.lastT) N.lastT = e.t; } }
  function saveCells() { store('tk_c', { c: N.cells.join(''), t: N.lastT, ver: N.s.ver || 0, at: Date.now() }); }
  // 地図を読む。戻り値：前に見たあとに起きたこと（記録の並び。はじめてなら空）
  N.loadCells = async function () {
    if (N.fake) { N.cells = FK.cells(); N.lastT = Date.now(); return []; }
    const cache = store('tk_c');
    if (cache && typeof cache.c === 'string' && cache.c.length === NC && cache.ver === (N.s.ver || 0) && Date.now() - cache.at < 36 * 3600 * 1000) {
      try {
        const v = await rest('log', { orderBy: 't', startAt: cache.t + 1, limitToLast: 700 }); const list = sorted(v);
        if (list.length < 700) { N.cells = cache.c.split(''); N.lastT = cache.t; applyLog(list); saveCells(); return list; }
      } catch (e) { }
    }
    const last = sorted(await rest('log', { orderBy: 't', limitToLast: 1 }));
    const c = await rest('c');
    const arr = new Array(NC); for (let i = 0; i < NC; i++) arr[i] = (c && c[i]) || M.own[i];
    N.cells = arr; N.lastT = last.length ? last[0].t - 1 : 0; saveCells(); return [];
  };
  // 読みなおし（30秒ごと）：増えた記録だけ。戻り値：新しい記録
  N.poll = async function () {
    if (N.fake) return FK.poll();
    const ver = N.s.ver || 0;
    const list = sorted(await rest('log', { orderBy: 't', startAt: N.lastT + 1, limitToLast: 400 }));
    if (list.length || Date.now() - stateAt > 300000) { const s = await N.loadState(); if ((s.ver || 0) !== ver) { store('tk_c', null); await N.loadCells(); return [{ reload: true }]; } }
    applyLog(list); if (list.length) saveCells(); return list;
  };
  // 読みなおしの間隔（秒）。管理画面で変えられる（人が増えて通信が多くなったら、長くする）
  N.pollSec = () => Math.max(20, Math.min(600, +(N.s && N.s.pi) || 30));
  N.recent = async function (n) { if (N.fake) return FK.log.slice(-n); return sorted(await rest('log', { orderBy: 't', limitToLast: n || 40 })); };
  // 時計合わせ（データベースの時計とのずれ）と、開いている印
  N.ping = async function () {
    if (N.fake) return; const uid = N.uid(); if (!uid) return;
    try { const t0 = Date.now(); await update({ ['on/' + uid]: Object.assign({ t: SV }, N.me ? { f: N.me.f } : {}) }); const t = await rest('on/' + uid + '/t', null, true); const t1 = Date.now(); if (typeof t === 'number') N.offset = Math.round(t - (t0 + t1) / 2); } catch (e) { }
  };
  // ---------- 書く ----------
  N.join = async function (L, name) {
    name = N.cleanName(name); if (!name) throw new Error('name');
    if (!N.fake) await N.token(false);
    const u = N.uid();
    await update({ ['u/' + u + '/f']: L, ['u/' + u + '/h']: L, ['u/' + u + '/n']: name, ['u/' + u + '/j']: SV, ['s/m/' + L]: INC(1) });
    await N.loadMe(); return N.me;
  };
  N.take = async function (i) {
    const me = N.me, ck = N.canTake(i); if (!ck.ok) { const e = new Error(ck.why); e.why = ck.why; throw e; }
    const u = N.uid(), id = pid(), prev = N.cells[i];
    const w = { ['c/' + i]: me.f, ['ct/' + i]: SV, ['u/' + u + '/t']: SV, ['u/' + u + '/c']: String(i), ['u/' + u + '/v']: String(ck.via), ['u/' + u + '/l']: id, ['u/' + u + '/w']: String(ck.w == null ? ck.via : ck.w), ['s/n/' + me.f]: INC(1), ['s/n/' + prev]: INC(-1),
      ['log/' + id]: Object.assign({ t: SV, y: 't', c: String(i), f: me.f, p: prev, n: me.n, h: me.h, u }, me.r ? { r: true } : {}) };
    // この一手で名所を占領した・相手の占領をくずしたときは、記録に入れる（戦況に出す）
    const lm = N.LM.find(l => l.c.includes(i));
    if (lm) { const was = N.holder(lm); if (was && was !== me.f) w['log/' + id].x = lm.id; if (lm.c.every(c => c === i || N.cells[c] === me.f)) w['log/' + id].k = lm.id; }
    if ((N.s.n[me.f] || 0) + 1 >= TK.HALF) w['s/end'] = { f: me.f, t: SV, k: 'half' };
    await update(w);
    N.cells[i] = me.f; N.s.n[me.f] = (N.s.n[me.f] || 0) + 1; N.s.n[prev] = (N.s.n[prev] || 0) - 1;
    me.t = N.now(); const k = (store('tk_k') || 0) + 1; store('tk_k', k);
    N.loadMe().catch(() => { }); N.loadState().catch(() => { });
    return { i, prev, n: N.s.n[me.f], k };
  };
  // そのマスが「同時」の取り合い中か（取られてから10秒以内か）
  N.clashing = async function (i) { if (N.fake) return false; try { const ct = await rest('ct/' + i); return typeof ct === 'number' && N.now() - ct < 12000; } catch (e) { return false; } };
  // 同時に攻めこんで敗れた：マスは取れないが、一手は使う（1時間待ち）
  N.lose = async function (i) {
    const me = N.me, u = N.uid(), id = pid(); if (N.fake) return;
    await update({ ['u/' + u + '/t']: SV, ['u/' + u + '/c']: String(i), ['u/' + u + '/l']: id, ['log/' + id]: Object.assign({ t: SV, y: 'f', c: String(i), f: me.f, p: N.cells[i], n: me.n, h: me.h, u }, me.r ? { r: true } : {}) });
    me.t = N.now(); N.loadMe().catch(() => { });
  };
  N.defect = async function (to) {
    const me = N.me, u = N.uid(), id = pid(), from = me.f;
    await update({ ['u/' + u + '/f']: to, ['u/' + u + '/d']: SV, ['u/' + u + '/r']: true, ['u/' + u + '/l']: id, ['s/m/' + to]: INC(1), ['s/m/' + from]: INC(-1), ['log/' + id]: { t: SV, y: 'd', f: to, p: from, n: me.n, h: me.h, r: true, u } });
    await N.loadMe(); await N.loadState().catch(() => { }); return N.me;
  };
  // 掲示板（room：'all'＝全体、a〜t＝陣営の軍議）
  N.board = async function (room, since) {
    if (N.fake) return FK.board(room, since);
    const auth = room !== 'all';
    const v = since ? await rest('b/' + room, { orderBy: 't', startAt: since + 1, limitToFirst: 60 }, auth) : await rest('b/' + room, { orderBy: 't', limitToLast: 50 }, auth);
    return sorted(v);
  };
  N.post = async function (room, m) {
    const me = N.me, u = N.uid(); m = String(m || '').replace(/[\u0000-\u001f]/g, ' ').trim(); m = Array.from(m).slice(0, 100).join(''); if (!m) throw new Error('empty');
    if (N.fake) return FK.post(room, m);
    await update({ ['u/' + u + '/bt']: SV, ['b/' + room + '/' + pid()]: Object.assign({ t: SV, u, n: me.n, h: me.h, f: me.f, m }, me.r ? { r: true } : {}) });
  };
  N.ask = async function (m, x, l, name) {
    if (N.fake) return; await N.token(false); const u = N.uid();
    await update({ ['u/' + u + '/a']: SV, ['ask/' + pid()]: { t: SV, u, m: Array.from(String(m || '')).slice(0, 300).join(''), x: N.cleanX(x), l: l || 'ja', n: String(name || '').slice(0, 30) } });
  };

  // =============================================
  //  ひとりで試す用のにせもの（?offline=1）
  // =============================================
  const FK = {
    c: null, log: [], n: null, m: null, b: { all: [] },
    init() {
      if (FK.c) return; const sv = store('tk_fake'); FK.c = (sv && sv.c && sv.c.length === NC) ? sv.c.split('') : M.own.split('');
      FK.n = { w: 0 }; FK.m = {}; for (const f of TK.F) { FK.n[f.L] = 0; FK.m[f.L] = 20 + (f.i * 37) % 60; } for (const L of FK.c) FK.n[L]++;
      FK.u = (sv && sv.u) || null; FK.end = null;
      const warm = +(new URLSearchParams(location.search).get('warm') || 0); for (let i = 0; i < warm; i++) FK.bot(true);
    },
    save() { store('tk_fake', { c: FK.c.join(''), u: FK.u }); },
    state() { FK.init(); return { n: Object.assign({}, FK.n), m: Object.assign({}, FK.m), ver: 0, end: FK.end, pin: '' }; },
    me() { FK.init(); return FK.u ? Object.assign({}, FK.u) : null; },
    cells() { FK.init(); return FK.c.slice(); },
    names: ['与作', '権兵衛', 'おりん', '小太郎', '弥助', 'お市', '半蔵', '佐助', 'たぬき', '茶々', '五右衛門', 'かえで'],
    bot(quiet) {
      // どこかの陣営が、となりのマスを1つ取る
      for (let k = 0; k < 40; k++) {
        const i = Math.floor(Math.random() * NC), L = FK.c[i]; if (L === 'w' || (FK.u && L === FK.u.f && Math.random() < 0.7)) continue;
        let cand = ADJ[i].filter(j => FK.c[j] !== L && !CASTLE.has(j)); const wh = cand.filter(j => FK.c[j] === 'w'); if (wh.length && Math.random() < 0.85) cand = wh; cand = cand.filter(j => FK.c[j] === 'w' || FK.n[FK.c[j]] > 8); if (!cand.length) continue;
        const j = cand[Math.floor(Math.random() * cand.length)], p = FK.c[j];
        FK.c[j] = L; FK.n[L]++; FK.n[p]--; const e = { id: pid(), t: Date.now(), y: 't', c: String(j), f: L, p, n: FK.names[Math.floor(Math.random() * FK.names.length)], h: L };
        if (!quiet) FK.log.push(e); return e;
      }
      return null;
    },
    poll() { const out = []; const k = 1 + Math.floor(Math.random() * 3); for (let i = 0; i < k; i++) { const e = FK.bot(); if (e) out.push(e); } N.s = Object.assign(N.s, FK.state()); applyLog(out); return out; },
    update(w) {
      FK.init(); const u = 'u/me/';
      if (w[u + 'f'] && w[u + 'n']) { FK.u = { f: w[u + 'f'], h: w[u + 'h'], n: w[u + 'n'], j: Date.now() }; FK.m[FK.u.f]++; }
      else if (w[u + 'd']) { FK.m[FK.u.f]--; FK.u.f = w[u + 'f']; FK.u.d = Date.now(); FK.u.r = true; FK.m[FK.u.f]++; for (const k in w) if (k.startsWith('log/')) FK.log.push(Object.assign({ id: k.slice(4) }, w[k], { t: Date.now() })); }
      else if (w[u + 't']) {
        for (const k in w) { if (k.startsWith('c/')) { const i = +k.slice(2), p = FK.c[i]; FK.c[i] = w[k]; FK.n[w[k]]++; FK.n[p]--; } if (k.startsWith('log/')) FK.log.push(Object.assign({ id: k.slice(4) }, w[k], { t: Date.now() })); }
        FK.u.t = /[?&]nowait=1/.test(location.search) ? 0 : Date.now(); if (w['s/end']) FK.end = { f: FK.u.f, t: Date.now(), k: 'half' };
      }
      FK.save(); return Promise.resolve(null);
    },
    board(room) { FK.init(); if (!FK.b[room]) FK.b[room] = [{ id: 'x1', t: Date.now() - 3600000, n: '権兵衛', h: room, f: room, m: '北から攻めるのがよさそうです' }, { id: 'x2', t: Date.now() - 600000, n: 'なすP', m: '開戦しました。ご武運を。', g: true }]; return FK.b[room].slice(); },
    post(room, m) { FK.board(room); FK.b[room].push({ id: pid(), t: Date.now(), n: FK.u.n, h: FK.u.h, f: FK.u.f, m, r: FK.u.r }); },
  };
  N.FK = FK;
})(window);
