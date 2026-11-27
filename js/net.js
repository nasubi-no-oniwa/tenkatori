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
      // 名乗りなおし（＝別人になる）は、合言葉がもう使えないとはっきり言われたときだけ（11/24）。
      // それ以外の失敗（通信・混雑など）で別人にしてしまうと、仕官がやり直しになる。3回つづけてだめなら、あきらめて名乗りなおす
      let msg = ''; try { msg = String(((await r.json()).error || {}).message || ''); } catch (e) { }
      const dead = r.status === 400 && /TOKEN_EXPIRED|USER_DISABLED|USER_NOT_FOUND|INVALID_REFRESH_TOKEN/.test(msg), bad = (saved.bad || 0) + 1;
      if (!dead && !((r.status === 400 || r.status === 403) && bad >= 3)) { if (r.status === 400 || r.status === 403) store(sk, { rt: saved.rt, uid: saved.uid, bad }); throw new Error('auth ' + r.status); }
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
  // 止められている（BAN）か（11/26）：取る・書くが断られたとき、「先をこされた」と出さずに、止められていると知らせる
  N.amBanned = async function () { if (N.fake) return false; try { return (await rest('ban/' + N.uid())) === true; } catch (e) { return false; } };
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
    if (N.wait() > 0 && !(N.inNr(i) && N.nrReady()) && !(N.kiAtk(i) && N.kiReady())) return { ok: false, why: 'wait', via };   // 奇襲：仕掛けた軍は、相手の軍のマスを1分で取れる   // 狼煙の国のマスは1分で取れる
    return { ok: true, via, w };
  };
  const alive = (j, f) => CASTLE.has(j) || ADJ[j].some(x => N.cells[x] === f || N.cells[x] === 'w');
  N.takeable = function () { const me = N.me, out = []; if (!me || !N.cells) return out; for (let i = 0; i < NC; i++) if (N.cells[i] !== me.f && !CASTLE.has(i) && ADJ[i].some(j => N.cells[j] === me.f && alive(j, me.f))) out.push(i); return out; };
  // ---------- 早取りの時間割（11/17）：陣営ごとに1日1時間「2分で1マス」。0・6・12・18時の1時間は全陣営「5分で1マス」 ----------
  const HR = 3600000, DAY = 86400000, JST = 9 * HR;
  N.dayStart = t => Math.floor(((t == null ? N.now() : t) + JST) / DAY) * DAY - JST;   // 日本時間のその日の0時
  N.sched = {}; N.day = {};   // N.day[その日の0時] = { h, k：決戦地, rc：米俵のマス（Set）, x：決戦地のほうびの1時間 {時: 武将} }
  N.loadSched = async function () {
    const d = N.dayStart(); if (N.sched[d]) return N.sched[d];
    if (N.loadSched.at && Date.now() - N.loadSched.at < 60000) return null; N.loadSched.at = Date.now();
    let v = null;
    if (N.fake) v = FK.day(d);
    else try { v = await rest('schd/' + d); } catch (e) { }
    if (v && typeof v.h === 'string' && v.h.length === 24) {
      N.sched[d] = v.h; N.day[d] = { h: v.h, k: v.k || '', x: v.x || {}, rc: new Set(String(v.rc || '').split(',').filter(Boolean).map(Number)) };
      N.loadGk(d).catch(() => { });
      N.loadRice().catch(() => { });
    }
    return N.sched[d] || null;
  };
  // 兵糧集め（11/18）：今日の米俵の取られぐあい（rg）と、陣営ごとの兵糧の数（rice）
  N.rg = {}; N.rice = {}; N.riceDay = 0;
  N.loadRice = async function () {
    const d = N.dayStart(); if (!N.day[d]) return;
    if (N.fake) { if (N.riceDay !== d) { N.rg = {}; N.rice = FK.rice(); N.riceDay = d; } N.claimRice().catch(() => { }); return; }
    const [g, r] = await Promise.all([rest('rg/' + d), rest('rice/' + d)]); N.rg = g || {}; N.rice = r || {}; N.riceDay = d;
    // 決戦地のほうびの1時間（x）は、0時よりあとに入ることがあるので、10分おきに読みなおす
    N.claimRice().catch(() => { });
    if (!(N.loadRice.xAt > Date.now() - 600000)) { N.loadRice.xAt = Date.now(); try { const x = await rest('schd/' + d + '/x'); if (x && N.day[d]) N.day[d].x = x; } catch (e) { } }
  };
  // 領内の米俵（11/23）：いま自分の陣営のマスにある、まだだれも取っていない米俵を、蔵に入れる（操作はいらない。ルールが確かめる）
  N.claimRice = async function () {
    const me = N.me, d = N.dayStart(), C = N.claimRice; C.tried = C.tried || {};
    if (!me || C.busy || !N.cells || !N.day[d] || N.riceDay !== d || typeof N.rice[me.f] !== 'number' || N.ended() || (N.s && N.s.stop)) return 0;
    C.busy = 1; let n = 0;
    try {
      for (const i of N.riceLeft()) {
        if (N.cells[i] !== me.f || C.tried[d + ':' + i]) continue; C.tried[d + ':' + i] = 1;
        try {
          if (!N.fake) await update({ ['u/' + N.uid() + '/rk']: String(i), ['rg/' + d + '/' + i]: { f: me.f, t: SV }, ['rice/' + d + '/' + me.f]: INC(1) });
          N.rg[i] = { f: me.f, t: N.now() }; N.rice[me.f] = (N.rice[me.f] || 0) + 1; n++;
        } catch (e) { }   // ほかの人が先に入れた・地図が古かった、など
      }
    } finally { C.busy = 0; }
    if (n && N.onRice) N.onRice(n);
    return n;
  };
  N.riceLeft = () => { const dd = N.day[N.dayStart()]; if (!dd || N.riceDay !== N.dayStart()) return []; return [...dd.rc].filter(i => !N.rg[i]); };
  N.isRice = i => { const dd = N.day[N.dayStart()]; return !!(dd && N.riceDay === N.dayStart() && dd.rc.has(i) && !N.rg[i]); };
  N.morale = L => { const n = +(N.rice[L]) || 0; return n >= 12 ? 3 : n >= 7 ? 2 : n >= 3 ? 1 : 0; };
  N.baseWait = L => { const w = TK.WAIT - N.morale(L) * 600000, hv = N.s && N.s.hv, now = N.now(); return hv && hv.f === L && now >= hv.a && now < hv.b ? w / 2 : w; };   // s/hv：待ち時間が半分の時間（11/28 お詫び）
  N.slotAt = t => { const d = N.dayStart(t), h = N.sched[d]; if (!h) return null; const i = Math.floor((t - d) / HR), x = (N.day[d] && N.day[d].x) || {}; return { a: d + i * HR, e: d + (i + 1) * HR, f: h[i], f2: x[i] || '', i }; };
  // 下剋上（11/27から）：gk/{その日の0時} はその軍の人にだけ読める。読めて自分の軍なら、その日の早取りは半分
  N.gk = {};
  N.loadGk = async function (d) {
    if (N.fake) { N.gk[d] = /[?&]gk=1/.test(location.search) && N.me ? N.me.f : ''; return; }
    if (!N.me || !N.uid()) return; let v = null; try { v = await rest('gk/' + d, null, true); } catch (e) { }
    N.gk[d] = v === N.me.f ? v : '';
  };
  N.isGk = (f, t) => { const d = N.dayStart(t); if (N.gk[d] === undefined && N.me && !N.isGk.busy) { N.isGk.busy = 1; N.loadGk(d).finally(() => { N.isGk.busy = 0; }); }   // 11/28：名簿より先に時間割を読んだとき、下剋上を読みそびれていた
    return !!(f && N.gk[d] && N.gk[d] === f); };
  N.fastFor = (sl, f) => { if (!sl || !f) return 0; const k = N.isGk(f, sl.a) ? 0.5 : 1; return (sl.f === f || sl.f2 === f || sl.f === '!') ? TK.FASTT * k : sl.f === '*' ? TK.ALLT * k : 0; };   // '!'：最終決戦（全軍2分）
  // ---------- 狼煙（11/26から、毎日3回×3か国）：nrd/{その日の0時}/{0〜2} は上がってから読める。上がって30分、その国のマスは全軍1分 ----------
  // ---------- 奇襲（11/26から、毎日9回）：kid/{その日の0時}/{0〜8} は、始まってから、仕掛けた軍と仕掛けられた軍の人だけ読める ----------
  N.ki = {};
  N.loadKi = async function (d) {
    d = d || N.dayStart(); const o = N.ki[d] = N.ki[d] || {}; if (!N.me || N.loadKi.at > Date.now() - 25000) return; N.loadKi.at = Date.now();
    for (let b = 0; b < 10; b++) { const st = b < 9 ? d + b * 9600000 : d, en = b < 9 ? d + (b + 1) * 9600000 : d + 86400000; if (o[b] !== undefined || st > N.now()) continue;   // 9番は、管理人が足した追加の奇襲
      if (N.fake) { if (/[?&]ki=/.test(location.search) && b === Math.floor((N.now() - d) / 9600000)) { const oth = N.armies().filter(L => L !== N.me.f); o[b] = { a: N.now() - 60000, f: /ki=def/.test(location.search) ? oth[0] : N.me.f, g: /ki=def/.test(location.search) ? N.me.f : oth[0], k: String(N.now() - 60000) }; } continue; }
      try { const v = await rest('kid/' + d + '/' + b, null, true); if (v && typeof v.a === 'number') o[b] = v; else if (en < N.now()) o[b] = null; } catch (e) { if (en < N.now()) o[b] = null; } }
  };
  N.kiList = () => Object.values(N.ki[N.dayStart()] || {}).filter(v => v && v.a <= N.now()).sort((x, y) => x.a - y.a);
  N.kiNow = () => N.kiList().find(v => N.now() < v.a + 1800000) || null;
  N.kiAtk = i => { const v = N.kiNow(), me = N.me; return !!(v && me && v.f === me.f && N.cells && N.cells[i] === v.g); };
  N.kiReady = () => { const v = N.kiNow(), me = N.me; if (!v || !me || v.f !== me.f) return false; const now = N.now(); return (!me.t || now - me.t >= 60000) && (!me.j || now >= me.j + (TK.JOINT || 0)); };
  // 奇襲で相手のマスを取れるまでの残り（奇襲を仕掛けた軍の人だけ。ほかは Infinity）
  N.kiWait = () => { const v = N.kiNow(), me = N.me; if (!v || !me || v.f !== me.f) return Infinity; const now = N.now(); return Math.max(0, me.t ? me.t + 60000 - now : 0, me.j ? me.j + (TK.JOINT || 0) - now : 0); };
  N.nr = {};   // N.nr[その日の0時] = { 0: {a,p:[国],k}, ... }
  N.loadNr = async function (d) {
    d = d || N.dayStart(); const o = N.nr[d] = N.nr[d] || {}; if (N.loadNr.at > Date.now() - 60000) return; N.loadNr.at = Date.now();
    for (let b = 0; b < 3; b++) { if (o[b] || d + b * 8 * 3600000 > N.now()) continue;
      if (N.fake) { if (/[?&]nr=1/.test(location.search) && b === Math.floor((N.now() - d) / 28800000)) { const ps = [M.prov[N.takeable()[0] || 0], 3, 7]; o[b] = { a: N.now() - 60000, p: ps, k: String(N.now() - 60000) }; } continue; }
      try { const v = await rest('nrd/' + d + '/' + b); if (v && typeof v.a === 'number') o[b] = v; } catch (e) { } }
  };
  N.nrList = () => Object.values(N.nr[N.dayStart()] || {}).filter(v => v.a <= N.now()).sort((x, y) => x.a - y.a);
  N.nrNow = () => N.nrList().find(v => N.now() < v.a + 1800000) || null;
  N.inNr = i => { const v = N.nrNow(); return !!(v && (v.p || []).includes(M.prov[i])); };
  N.nrReady = () => { const me = N.me; if (!me || !N.nrNow()) return false; const now = N.now(); return (!me.t || now - me.t >= 60000) && (!me.j || now >= me.j + (TK.JOINT || 0)); };
  N.fastNow = () => { const me = N.me, sl = N.slotAt(N.now()); return me && N.fastFor(sl, me.f) ? sl : null; };
  // 今日の自分の陣営の番（なければ null）
  N.mySlot = f => { const d = N.dayStart(), h = N.sched[d]; if (!h || !f) return null; const i = h.indexOf(f); return i < 0 ? null : { a: d + i * HR, e: d + (i + 1) * HR, f, i }; };
  N.wait = () => {
    const me = N.me; if (!me) return 0; const now = N.now(), b = me.j ? me.j + (TK.JOINT || 0) : 0;
    let best = me.t ? me.t + N.baseWait(me.f) : 0;
    if (me.t && best > now) {   // 早取りの時間が先に来るなら、そちらで取れる時刻
      for (let hs = Math.floor(now / HR) * HR; hs < best; hs += HR) { const iv = N.fastFor(N.slotAt(hs + 1), me.f); if (!iv) continue; const c = Math.max(hs, me.t + iv); if (c < hs + HR) { best = Math.min(best, c); break; } }
    }
    return Math.max(0, Math.max(best, b) - now);
  };
  N.endOK = () => !!(N.s && N.s.end && N.s.end.k !== 'half');   // 前の版の画面が書いた2500マスの印（half）では終わらない（11/25）
  N.ended = () => N.endOK() || N.now() > TK.END;
  // 掲示板の封鎖（11/25）：天下統一か終戦から24時間たったら、読むだけ
  N.boardClosed = () => N.now() > TK.END + 86400000 || (N.endOK() && N.now() > (+N.s.end.t || 0) + 86400000);
  // エンドロールの元（毎日の処理が、終わったときに作る。fin が true のものだけ使う。?roll=1 なら作りかけでも見る）
  N.loadReplay = async function () {
    if (N.fake) return FK.replay();
    const v = await rest('rp'); if (!v || typeof v.f !== 'string') return null;
    if (!v.fin && !/[?&]roll=1/.test((G.location && G.location.search) || '')) return null; return v;
  };
  // 終わったときの天下人（半分とった武将。時間切れなら、安土城を占領している武将。だれも占領していなければ、いちばん多い武将。同じ数なら並んで天下人）
  // 名所の占領：そのマスを全部、同じ陣営が持っていれば、その陣営（だれも占領していなければ ''）
  N.LM = M.lm || [];
  N.holder = function (lm, cells) { cells = cells || N.cells; if (!cells) return ''; const L = cells[lm.c[0]]; if (L === 'w') return ''; for (const i of lm.c) if (cells[i] !== L) return ''; return L; };
  N.holders = function (cells) { const o = {}; for (const lm of N.LM) o[lm.id] = N.holder(lm, cells); return o; };
  N.KEY = N.LM.find(l => l.id === 'azuchi') || null;        // 天下分け目の城
  N.winners = function () { if (N.endOK() && N.s.end.f) return [N.s.end.f]; if (N.KEY && N.cells) { const h = N.holder(N.KEY); if (h) return [h];
    // 裏の決まり（11/27 なすP）：安土城を押さえた軍がなければ、安土城のマスを一番多く持っている軍。同じ数なら天下太平（何軍も返す）
    const c = {}; for (const i of N.KEY.c) { const L = N.cells[i]; if (L && L !== 'w') c[L] = (c[L] || 0) + 1; } let mx = 0, w = []; for (const [L, n] of Object.entries(c)) { if (n > mx) { mx = n; w = [L]; } else if (n === mx) w.push(L); } if (w.length) return w; }
    let mx = -1, w = []; for (const f of TK.F) { const n = N.s.n[f.L] || 0; if (n > mx) { mx = n; w = [f.L]; } else if (n === mx) w.push(f.L); } return w; };
  // 天下太平（11/27 なすP）：4000マスも安土城もなく、いちばんマスの多い軍が同じ数で並んだとき（天下人なし）
  N.peace = () => N.ended() && N.winners().length > 1;
  // いちばんマスの少ない武将（寝返れる先。同じ数なら全員）
  N.weakest = function () { let mn = 1e9, w = []; for (const L of N.armies()) { const n = N.s.n[L] || 0; if (n < mn) { mn = n; w = [L]; } else if (n === mn) w.push(L); } return w; };
  N.defectWait = () => { const me = N.me; if (!me) return 0; const a = me.d ? me.d + TK.DEFECT : 0, b = me.j ? me.j + (TK.JOIND || 0) : 0; return Math.max(0, Math.max(a, b) - N.now()); };

  // ---------- 読む ----------
  let stateAt = 0;
  N.loadState = async function () {
    const s = N.fake ? FK.state() : await rest('s'); N.s = Object.assign({ n: {}, m: {}, ver: 0 }, s || {}); stateAt = Date.now();
    // 新しい版の画面が出たら（av が変わったら）、開いたままの画面を1回だけ読みなおす（三つ巴の切りかえなど、11/24）
    if (!N.fake) { const av = +N.s.av || 0; if (N.av0 === undefined) N.av0 = av; else if (av !== N.av0) { let done = ''; try { done = sessionStorage.getItem('tk_av'); sessionStorage.setItem('tk_av', String(av)); } catch (e) { } if (done !== String(av) && G.location && G.location.reload) G.location.reload(); } }
    return N.s;
  };
  // ---------- 三つ巴（11/24）：s/mg＝家→軍。まとまったあとは、陣営（f）は軍、家（h）は元の家 ----------
  N.mg = () => (N.s && N.s.mg) || null;
  N.armyOf = L => { const g = N.mg(); return g && g[L] ? g[L] : L; };
  N.armies = () => { const g = N.mg(); return g ? TK.F.map(f => f.L).filter(L => g[L] === L) : TK.F.map(f => f.L); };
  N.meOK = false;   // 「仕えているか」を、データベースで確かめられたか（読めなかっただけのときに、診断へ戻さないため。11/24）
  N.loadMe = async function () { if (N.fake) { N.me = FK.me(); N.meOK = true; return N.me; } await N.token(false); const v = await rest('u/' + N.uid(), null, true); N.me = v && v.f ? v : null; N.meOK = true;
    if (N.me && !N.me.fp) { N.me.fp = N.fp(); update({ ['u/' + N.uid() + '/fp']: N.me.fp }).catch(() => { }); }   // すでに仕官している人も、端末の指紋を1回だけ記録する（11/26、遊び方は変わらない）
    return N.me; };
  function applyLog(list) { for (const e of list) { if (e.y === 't' && e.c != null && N.cells) N.cells[+e.c] = e.f; if (e.t > N.lastT) N.lastT = e.t; } }
  // full：地図をまるごと読んだ時刻。覚えた地図は、6時間に1回はまるごと読みなおす（ずれたままにしない。11/24）
  let fullAt = 0; const FULLMS = 6 * 3600 * 1000;
  function saveCells() { store('tk_c', { c: N.cells.join(''), t: N.lastT, ver: N.s.ver || 0, at: Date.now(), full: fullAt }); }
  // 地図を読む。戻り値：前に見たあとに起きたこと（記録の並び。はじめてなら空）
  N.loadCells = async function () {
    if (N.fake) { N.cells = FK.cells(); N.lastT = Date.now(); return []; }
    const cache = store('tk_c');
    if (cache && typeof cache.c === 'string' && cache.c.length === NC && cache.ver === (N.s.ver || 0) && Date.now() - cache.at < 36 * 3600 * 1000 && cache.full && Date.now() - cache.full < FULLMS) {
      try {
        const v = await rest('log', { orderBy: 't', startAt: cache.t + 1, limitToLast: 700 }); const list = sorted(v);
        if (list.length < 700) { N.cells = cache.c.split(''); N.lastT = cache.t; fullAt = cache.full; applyLog(list); saveCells(); return list; }
      } catch (e) { }
    }
    const last = sorted(await rest('log', { orderBy: 't', limitToLast: 1 }));
    const c = await rest('c');
    const arr = new Array(NC); for (let i = 0; i < NC; i++) arr[i] = (c && c[i]) || M.own[i];
    N.cells = arr; N.lastT = last.length ? last[0].t - 1 : 0; fullAt = Date.now(); saveCells(); return [];
  };
  // 地図をまるごと読みなおす（取れないマスがあったとき・長く閉じていたとき）
  N.fullCells = async function () { if (N.fake) return; store('tk_c', null); await N.loadCells(); };
  // 読みなおし（30秒ごと）：増えた記録だけ。戻り値：新しい記録
  N.poll = async function () {
    if (!N.sched[N.dayStart()]) N.loadSched().catch(() => { }); else N.loadRice().catch(() => { });
    N.loadNr().catch(() => { }); N.loadKi().catch(() => { });
    if (N.fake) return FK.poll();
    const ver = N.s.ver || 0;
    const list = sorted(await rest('log', { orderBy: 't', startAt: N.lastT + 1, limitToLast: 400 }));
    // 400件ちょうど返ってきたら、その前にも読めていない記録がある（スマホを長く寝かせたあとなど）。つぎはぎにせず、まるごと読みなおす（11/24）
    if (list.length >= 400 || (fullAt && Date.now() - fullAt > FULLMS)) { await N.loadState().catch(() => { }); await N.fullCells(); return [{ reload: true }]; }
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
  // ---------- 端末の指紋（11/26）：画面・機種・言語・時間帯・文字の描き方などから作る短い記号。同じ端末の同じブラウザなら同じになる ----------
  const h53 = (str, seed = 0) => { let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed; for (let i = 0; i < str.length; i++) { const ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); } h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909); return 4294967296 * (2097151 & h2) + (h1 >>> 0); };
  N.fp = function () {
    if (N.fp.v) return N.fp.v; const p = [];
    try { const sc = G.screen || {}, nv = G.navigator || {}; p.push(sc.width, sc.height, sc.colorDepth, G.devicePixelRatio, nv.userAgent, (nv.languages || []).join(','), nv.language, nv.platform, nv.hardwareConcurrency, nv.deviceMemory, nv.maxTouchPoints); } catch (e) { }
    try { p.push(Intl.DateTimeFormat().resolvedOptions().timeZone); } catch (e) { }
    try { const c = G.document.createElement('canvas'); c.width = 240; c.height = 60; const x = c.getContext('2d'); x.textBaseline = 'top'; x.font = '16px "Hiragino Mincho ProN", serif'; x.fillStyle = '#c8321f'; x.fillRect(4, 4, 90, 24); x.fillStyle = 'rgba(30,90,200,.7)'; x.fillText('天下取りマース 🍆 Tk,é', 6, 8); x.strokeStyle = '#1f9d55'; x.arc(180, 30, 18, 0, 5); x.stroke(); p.push(c.toDataURL()); } catch (e) { }
    try { const g = G.document.createElement('canvas').getContext('webgl'); const d = g && g.getExtension('WEBGL_debug_renderer_info'); if (d) p.push(g.getParameter(d.UNMASKED_VENDOR_WEBGL), g.getParameter(d.UNMASKED_RENDERER_WEBGL)); } catch (e) { }
    p.push(G.TK_FPSALT || '');   // 試験のときだけ、人ごとにちがう指紋にする
    return (N.fp.v = h53(p.join('|')).toString(36).padStart(6, '0').slice(0, 16));
  };
  // この端末で、10分以内に別の人が仕官しているか（仕官の前に知らせる）
  N.fpRecent = async function () { if (N.fake) return null; try { await N.token(false); const v = await rest('fpj/' + N.fp(), null, true); return v && typeof v.t === 'number' && v.u !== N.uid() && N.now() - v.t < 600000 ? v : null; } catch (e) { return null; } };
  N.join = async function (L, name) {
    name = N.cleanName(name); if (!name) throw new Error('name');
    if (!N.fake) await N.token(false);
    const u = N.uid(), A = N.armyOf(L);   // 三つ巴のあとは、家（L）が入った軍（A）に仕える
    const fp = N.fp();
    await update(Object.assign({ ['u/' + u + '/f']: A, ['u/' + u + '/h']: L, ['u/' + u + '/n']: name, ['u/' + u + '/j']: SV, ['s/m/' + A]: INC(1) }, N.fake ? {} : { ['u/' + u + '/fp']: fp, ['fpj/' + fp]: { t: SV, u } }));
    await N.loadMe(); return N.me;
  };
  N.take = async function (i) {
    const me = N.me, ck = N.canTake(i); if (!ck.ok) { const e = new Error(ck.why); e.why = ck.why; throw e; }
    const u = N.uid(), id = pid(), prev = N.cells[i];
    const w = { ['c/' + i]: me.f, ['ct/' + i]: SV, ['u/' + u + '/t']: SV, ['u/' + u + '/c']: String(i), ['u/' + u + '/v']: String(ck.via), ['u/' + u + '/l']: id, ['u/' + u + '/w']: String(ck.w == null ? ck.via : ck.w), ['s/n/' + me.f]: INC(1), ['s/n/' + prev]: INC(-1),
      ['log/' + id]: Object.assign({ t: SV, y: 't', c: String(i), f: me.f, p: prev, n: me.n, h: me.h, u }, me.r ? { r: true } : {}) };
    { const sl = N.fastNow(); if (sl) w['u/' + u + '/q'] = String(sl.a); }
    if (N.inNr(i)) w['u/' + u + '/qn'] = N.nrNow().k;
    if (N.kiAtk(i)) w['u/' + u + '/qk'] = N.kiNow().k;   // 奇襲の相手のマスなら、奇襲のかぎもいっしょに書く   // 狼煙の国のマスなら、狼煙のかぎもいっしょに書く   // 早取りの時間なら、その時間の始まりの時刻もいっしょに書く
    // 兵糧集め：今日の日付（士気の短縮に使う）と、米俵のマスなら兵糧+1
    const td = N.dayStart(), rice = N.isRice(i) && typeof N.rice[me.f] === 'number';
    if (N.day[td]) w['u/' + u + '/qd'] = String(td);
    if (rice) { w['rg/' + td + '/' + i] = { f: me.f, t: SV }; w['rice/' + td + '/' + me.f] = INC(1); }
    // この一手で名所を占領した・相手の占領をくずしたときは、記録に入れる（戦況に出す）
    const lm = N.LM.find(l => l.c.includes(i));
    if (lm) { const was = N.holder(lm); if (was && was !== me.f) w['log/' + id].x = lm.id; if (lm.c.every(c => c === i || N.cells[c] === me.f)) w['log/' + id].k = lm.id; }
    await update(w);
    N.cells[i] = me.f; N.s.n[me.f] = (N.s.n[me.f] || 0) + 1; N.s.n[prev] = (N.s.n[prev] || 0) - 1;
    if (rice) { N.rg[i] = { f: me.f, t: N.now() }; N.rice[me.f] = (N.rice[me.f] || 0) + 1; }
    me.t = N.now(); const k = (store('tk_k') || 0) + 1; store('tk_k', k);
    N.loadMe().catch(() => { }); N.loadState().catch(() => { });
    return { i, prev, n: N.s.n[me.f], k, rice };
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
  // 管理人がピン止めした書きこみ（bp/{板}/{番号}）
  N.pins = async function (room) {
    if (N.fake) return FK.pins ? FK.pins(room) : [];
    const v = await rest('bp/' + room, null, room !== 'all'); return v ? Object.entries(v).map(([id, e]) => Object.assign({ id }, e)) : [];
  };
  N.board = async function (room, since) {
    if (N.fake) return FK.board(room, since);
    const auth = room !== 'all';
    const v = since ? await rest('b/' + room, { orderBy: 't', startAt: since + 1, limitToFirst: 60 }, auth) : await rest('b/' + room, { orderBy: 't', limitToLast: 50 }, auth);
    return sorted(v).filter(e => e.t <= N.now() + 5000);   // 時刻つきで先に書いてあるお知らせ（奇襲など）は、その時刻まで出さない
  };
  N.post = async function (room, m) {
    const me = N.me, u = N.uid(); m = String(m || '').replace(/[\u0000-\u001f]/g, ' ').trim(); m = Array.from(m).slice(0, 100).join(''); if (!m) throw new Error('empty');
    if (N.fake) return FK.post(room, m);
    await update({ ['u/' + u + '/bt']: SV, ['b/' + room + '/' + pid()]: Object.assign({ t: SV, u, n: me.n, h: me.h, f: me.f, m }, me.r ? { r: true } : {}) });
  };
  // 天下人予想（11/26〜11/29 24時）：1人1回。仕えている人だけ
  N.PREDEND = Date.UTC(2026, 10, 29, 15);
  N.myPred = async function () { if (N.fake) return FK.pred || null; if (!N.uid()) return null; try { return await rest('pred/' + N.uid(), null, true); } catch (e) { return null; } };
  N.predict = async function (f) { const me = N.me; if (N.fake) { FK.pred = { f, t: Date.now(), n: me.n, h: me.h }; return FK.pred; } await update({ ['pred/' + N.uid()]: { f, t: SV, n: me.n, h: me.h } }); return { f }; };
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
      // ?mg=1：三つ巴のあとを試す（マスの多い上位3家に、城の近い家をまとめる）
      if (/[?&]mg=1/.test(location.search)) {
        const top = TK.F.map(f => f.L).sort((a, b) => FK.n[b] - FK.n[a]).slice(0, 3), xy = L => [M.cells[2 * M.castle[L]], M.cells[2 * M.castle[L] + 1]];
        FK.mg = {}; for (const f of TK.F) { const [x, y] = xy(f.L); FK.mg[f.L] = top.includes(f.L) ? f.L : top.slice().sort((a, b) => { const [ax, ay] = xy(a), [bx, by] = xy(b); return Math.hypot(ax - x, ay - y) - Math.hypot(bx - x, by - y); })[0]; }
        FK.c = FK.c.map(L => L === 'w' ? L : FK.mg[L]); FK.n = { w: 0 }; for (const f of TK.F) FK.n[f.L] = 0; for (const L of FK.c) FK.n[L]++;
        const m2 = {}; for (const f of TK.F) m2[f.L] = 0; for (const f of TK.F) m2[FK.mg[f.L]] += FK.m[f.L]; FK.m = m2;
        FK.hk = {}; for (const f of TK.F) FK.hk[f.L] = (f.i * 13) % 40;
        if (FK.u && FK.mg[FK.u.f] !== FK.u.f) FK.u.f = FK.mg[FK.u.f];
      }
      const warm = +(new URLSearchParams(location.search).get('warm') || 0); for (let i = 0; i < warm; i++) FK.bot(true);
    },
    save() { store('tk_fake', { c: FK.c.join(''), u: FK.u }); },
    state() { FK.init(); return Object.assign({ n: Object.assign({}, FK.n), m: Object.assign({}, FK.m), ver: 0, end: FK.end, pin: '' }, FK.mg ? { mg: FK.mg, hk: FK.hk, mt: 1, nodf: true } : {}); },
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
  FK.day = d => { const h = FK.sched(d), rc = []; while (rc.length < 40) { const i = Math.floor(Math.random() * NC); if (!CASTLE.has(i) && !rc.includes(i)) rc.push(i); } return { h, k: 'sekigahara', rc: rc.join(','), x: {} }; };
  FK.rice = () => { const r = {}; for (const f of TK.F) r[f.L] = Math.floor(Math.random() * 14); return r; };
  FK.sched = d => { const L = 'abcdefghijklmnopqrst'.split(''); for (let i = L.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [L[i], L[j]] = [L[j], L[i]]; } let h = ''; for (let i = 0; i < 24; i++) h += i % 6 === 0 ? '*' : L.shift(); return h; };
  // にせもの：今の地図を目指して、白い地図から少しずつ埋まっていく移り変わり（試し用）
  FK.replay = () => { FK.init(); const NCn = NC, own = M.own, fin = FK.c, nf = 200, mi = 150, fr = []; const order = []; for (let i = 0; i < NCn; i++) if (fin[i] !== own[i]) order.push(i); order.sort(() => Math.random() - .5);
    let k = 0; for (let f = 0; f < nf; f++) { let o = ''; const to = Math.round(order.length * (f + 1) / nf); for (; k < to; k++) o += order[k].toString(36).padStart(3, '0') + fin[order[k]]; fr.push(o); }
    const top = FK.names.map((n, i) => [n, TK.F[i % 20].L, TK.F[i % 20].L, 300 - i * 17]); return { t0: Date.UTC(2026, 10, 15, 17), hr: 3600000, nf, mi, f: fr.join('|'), top, pred: { w: 'a', n: 63, all: 200, names: FK.names.map((n, i) => [n, TK.F[i % 20].L]) }, fin: true }; };
  N.FK = FK;
})(window);
