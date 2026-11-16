// =============================================
//  天下取りマース  画面の流れ（タイトル → 診断 → 仕官 → 地図 → マスを取る）
// =============================================
(function (G) {
  const TK = G.TK, N = TK.NET, MP = TK.MAP, M = G.TK_MAP, t = TK.t;
  const $ = id => document.getElementById(id);
  const URLG = 'https://nasubi-no-oniwa.github.io/tenkatori/';
  const TAGS = '#天下取りマース #ブラウザゲーム';
  const ev = (n, o) => { try { if (typeof gtag === 'function') gtag('event', n, Object.assign({ game: 'tenkatori' }, o || {})); } catch (e) { } };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let scr = 'title', mapInit = false, pollT = 0, selCell = -1, busy = false, endShown = false, lastSeenLog = 0, newLog = 0;
  // 3Dの場面（読みこみが終わる前に頼まれた分は、覚えておいて後で出す）
  const scene = (mode, o) => { TK.sceneWant = [mode, o || {}]; if (TK.scene) TK.scene.mode(mode, o || {}); };

  // ---------- Xに投稿（紹介ツイートを引用する。引用するツイートは、なすびのお庭の quote/ のページで貼りかえられる） ----------
  let QUOTE = {};
  fetch('https://ft-red-default-rtdb.asia-southeast1.firebasedatabase.app/xquote/g/tenkatori.json').then(r => r.json()).then(d => { if (d && typeof d === 'object') QUOTE = d; }).catch(() => { });
  function quoteURL() { const u = (TK.lang() === 'ja' ? QUOTE.ja : QUOTE.en) || ''; return /^https:\/\/x\.com\/[A-Za-z0-9_]{1,15}\/status\/\d{5,25}$/.test(u) ? u : ''; }
  function xIntent(text) { const q = quoteURL(); return 'https://x.com/intent/post?text=' + encodeURIComponent(q ? text + '\n' + URLG : text) + '&url=' + encodeURIComponent(q || URLG); }
  const postX = text => { window.open(xIntent(text + '\n' + TAGS), '_blank'); };
  // 画像つき：スマホは共有の画面から。できない端末は、画像を保存してから投稿の画面を開く
  async function postImg(canvas, text, msgEl, name) {
    const blob = await new Promise(r => canvas.toBlob(r, 'image/png')); const file = new File([blob], (name || 'tenkatori') + '.png', { type: 'image/png' });
    const full = text + '\n' + TAGS + '\n' + URLG + (quoteURL() ? '\n' + quoteURL() : '');
    if (navigator.canShare && navigator.canShare({ files: [file] })) { try { ev('x_share'); await navigator.share({ files: [file], text: full }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    if (msgEl) msgEl.textContent = t('x_saved'); setTimeout(() => postX(text), 700);
  }
  const fontReady = async txt => { try { await Promise.race([Promise.all([document.fonts.load('40px "Yuji Syuku"', txt), document.fonts.load('700 24px "Shippori Mincho B1"', txt)]), sleep(1500)]); } catch (e) { } };
  // 投稿用の絵（1200×675）：地図の上に、和紙の札をのせる
  async function card(opt) {
    const lines = [opt.title].concat(opt.sub || []); await fontReady(lines.join('') + '天下取りマース');
    const c = MP.snapshot({ focus: opt.focus, z: opt.z, ax: opt.focus != null ? 0.66 : 0.62, ay: opt.focus != null ? 0.42 : 0.5, scale: 1.55 }), x = c.getContext('2d'), w = c.width, h = c.height;
    const g = x.createLinearGradient(0, 0, w * 0.62, 0); g.addColorStop(0, 'rgba(14,10,8,.9)'); g.addColorStop(0.55, 'rgba(14,10,8,.55)'); g.addColorStop(1, 'rgba(14,10,8,0)'); x.fillStyle = g; x.fillRect(0, 0, w * 0.62, h);
    const f = opt.f; let y = 86;
    if (f) { x.save(); x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = 14; x.drawImage(TK.crest(f, 264), 56, 56, 132, 132); x.restore(); y = 250; }
    x.textBaseline = 'alphabetic'; x.fillStyle = '#fff5dc'; x.shadowColor = 'rgba(0,0,0,.8)'; x.shadowBlur = 10;
    const wrap = (txt, font, size, maxW, lh, col) => { x.font = font.replace('SZ', size); x.fillStyle = col; let line = ''; for (const ch of Array.from(txt)) { if (ch === '\n' || x.measureText(line + ch).width > maxW) { x.fillText(line, 60, y); y += lh; line = ch === '\n' ? '' : ch; } else line += ch; } if (line) { x.fillText(line, 60, y); y += lh; } };
    wrap(opt.title, '400 SZpx ' + TK.FONT_T, opt.big || 62, 640, (opt.big || 62) * 1.22, '#fff5dc'); y += 8;
    for (const s of opt.sub || []) wrap(s, '700 SZpx ' + TK.FONT_B, 31, 640, 44, '#ecd58f');
    x.shadowBlur = 8; x.font = '400 46px ' + TK.FONT_T; x.fillStyle = '#fff5dc'; x.textAlign = 'right'; x.fillText('天下取りマース', w - 40, h - 62);
    x.font = '700 21px ' + TK.FONT_B; x.fillStyle = '#ecd58f'; x.fillText('nasubi-no-oniwa.github.io/tenkatori', w - 40, h - 30); x.textAlign = 'left';
    return c;
  }

  // ---------- 画面の切りかえ ----------
  function show(id) {
    scr = id;
    for (const s of ['title', 'quiz', 'reveal', 'game']) $(s).hidden = s !== id;
    $('map').hidden = id !== 'game'; if (id !== 'game') { $('cell').hidden = true; clearInterval(pollT); pollT = 0; }
    if (G.gsap && id !== 'game') gsap.fromTo('#' + id, { opacity: 0 }, { opacity: 1, duration: 0.4 });
  }
  let toastT = 0;
  function toast(m, ms) { const e = $('toast'); e.textContent = m; e.hidden = false; if (G.gsap) gsap.fromTo(e, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.25 }); clearTimeout(toastT); toastT = setTimeout(() => { e.hidden = true; }, ms || 3200); }
  const rankOf = L => { const n = N.s.n[L] || 0; let r = 1; for (const f of TK.F) if ((N.s.n[f.L] || 0) > n) r++; return r; };
  const sortedF = () => TK.F.slice().sort((a, b) => (N.s.n[b.L] || 0) - (N.s.n[a.L] || 0) || a.i - b.i);
  const drawCrest = (cv, f) => { const c = cv.getContext('2d'); c.clearRect(0, 0, cv.width, cv.height); c.drawImage(TK.crest(f, cv.width), 0, 0); };

  // ---------- ことば ----------
  function applyLang() {
    document.title = '天下取りマース'; $('tSub').textContent = t('title_sub'); $('tTag').textContent = t('title_tag');
    $('bHow').textContent = t('how'); $('bLang').textContent = '言語 / Language'; $('bAsk').textContent = t('askbtn'); $('bWatch').textContent = t('watch');
    $('qBack').textContent = '‹ ' + t('back'); $('rvYou').textContent = t('rv_you'); $('rvNameL').textContent = t('rv_name'); $('rvName').placeholder = t('rv_ph'); $('rvNote').textContent = t('rv_note'); $('rvJoin').textContent = t('rv_join');
    $('rvX').textContent = t('x_post'); $('rvXi').textContent = t('x_img'); $('rvGo').textContent = t('tk_back');
    const nv = $('nav').querySelectorAll('button'); ['nav_power', 'nav_board', 'nav_log', 'nav_defect', 'nav_more'].forEach((k, i) => { nv[i].querySelector('span').textContent = t(k); });
    $('tkX').textContent = t('x_post'); $('tkXi').textContent = t('x_img'); $('tkBack').textContent = t('tk_back');
    $('enX').textContent = t('x_post'); $('enXi').textContent = t('x_img'); $('enMap').textContent = t('en_map');
    renderTitle(); if (scr === 'quiz') renderQ(); if (scr === 'game') { updateHud(); MP.kick(); if (selCell >= 0) showCell(selCell); }
  }
  function renderTitle() {
    const ended = N.ended();
    $('tClock').textContent = ended ? t('t_ended') : t('t_until', { t: TK.dur(TK.END - N.now()) });
    $('bStart').textContent = ended ? t('en_map') : N.me ? t('cont') : t('start');
    $('bWatch').hidden = !!N.me || ended;
    const pin = N.s && N.s.pin; $('tPin').hidden = !pin; if (pin) $('tPin').innerHTML = '<b>' + esc(t('notice')) + '</b>' + esc(pin);
  }

  // ---------- 診断 ----------
  let ans = [], qi = 0;
  function startQuiz() { ans = []; qi = 0; show('quiz'); scene('title', { dim: 1 }); renderQ(); ev('quiz_start'); }
  function renderQ() {
    const q = TK.Q[qi]; $('qNo').textContent = t('q_no', { n: qi + 1 }) + ' / 10'; $('qBar').style.width = (qi * 10) + '%';
    $('qText').textContent = TK.L(q.q); const box = $('qAns'); box.innerHTML = '';
    q.a.forEach((a, k) => { const b = document.createElement('button'); b.className = 'qa'; b.innerHTML = '<i>' + '一二三四'[k] + '</i><span>' + esc(TK.L(a[0])) + '</span>'; b.onclick = () => pick(k); box.appendChild(b); });
    if (G.gsap) { gsap.fromTo('#qText', { opacity: 0, x: 18 }, { opacity: 1, x: 0, duration: 0.35, ease: 'power2.out' }); gsap.fromTo('.qa', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.3, stagger: 0.06, delay: 0.08, ease: 'power2.out' }); }
  }
  function pick(k) { ans[qi] = k; if (qi < 9) { qi++; renderQ(); } else { $('qBar').style.width = '100%'; const fi = TK.judge(ans); N.store('tk_quiz', { a: ans, f: fi }); ev('quiz_done', { warlord: TK.F[fi].L }); showReveal(TK.F[fi], 'new'); } }

  // ---------- 仕える武将が決まる場面（mode：new＝はじめて、defect＝寝返ったあと） ----------
  let rvF = null, rvMode = 'new';
  function showReveal(f, mode) {
    rvF = f; rvMode = mode; show('reveal'); $('reveal').scrollTop = 0; scene('banner', { f });
    $('rvType').textContent = '「' + TK.L(f.type) + '」'; $('rvServe').textContent = mode === 'defect' ? t('df_done', { name: TK.fname(f) }) : t('rv_serve', { name: TK.fname(f) });
    $('rvDesc').textContent = TK.L(f.desc); $('rvCastle').textContent = TK.L(f.castle) + '　' + TK.kuni(M.prov[M.castle[f.L]]);
    $('rvHome').textContent = TK.lang() === 'en' ? '' : TK.L(f.home) + (TK.lang() === 'ja' ? 'の' : TK.lang() === 'zh' ? '的' : '의');
    $('rvForm').hidden = mode !== 'new'; $('rvGo').hidden = mode === 'new'; $('rvErr').textContent = ''; $('rvMsg').textContent = '';
    $('rvYou').hidden = mode !== 'new'; $('rvType').hidden = false;
    if (G.gsap) { gsap.fromTo('#rvType', { opacity: 0, scale: 1.25 }, { opacity: 1, scale: 1, duration: 0.7, ease: 'back.out(1.6)', delay: 0.5 }); gsap.fromTo('.rvbox', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.6, delay: 1.1, ease: 'power3.out' }); }
    setTimeout(() => { if (TK.fx) { TK.fx('take', innerWidth / 2, innerHeight * 0.36); if (mode === 'defect') TK.fx('dark', innerWidth / 2, innerHeight * 0.5); } }, 600);
  }
  const quizText = f => t('sh_quiz', { type: TK.L(f.type), name: TK.fname(f) });
  async function quizCard(f) { return card({ f, title: '「' + TK.L(f.type) + '」', sub: [t('rv_serve', { name: TK.fname(f) }), TK.L(f.castle) + '　' + TK.kuni(M.prov[M.castle[f.L]])], focus: M.castle[f.L], z: 17, big: 54 }); }
  async function join() {
    if (busy) return; const name = N.cleanName($('rvName').value); if (!name) { $('rvErr').textContent = t('rv_noname'); return; }
    busy = true; $('rvJoin').disabled = true; $('rvErr').textContent = '';
    try { await N.join(rvF.L, name); ev('join', { warlord: rvF.L }); if (TK.fx) TK.fx('confetti', innerWidth / 2, innerHeight * 0.6); await sleep(500); await enterGame(true); }
    catch (e) { $('rvErr').textContent = t('net_err'); try { await N.loadMe(); if (N.me) await enterGame(true); } catch (e2) { } }
    busy = false; $('rvJoin').disabled = false;
  }

  // ---------- 地図の画面 ----------
  function updateHud() {
    const me = N.me, f = me ? TK.FI[me.f] : null;
    if (f) { drawCrest($('hudCrest'), f); $('hudName').textContent = TK.who(me.n, me.h, me.r); $('hudArmy').textContent = TK.army(f) + '　' + t('cells', { n: N.s.n[f.L] || 0 }) + '・' + t('rank', { n: rankOf(f.L) }); }
    else { const c = $('hudCrest').getContext('2d'); c.clearRect(0, 0, 126, 126); c.drawImage(TK.kamon('rokumon', 100, '#c9a44c'), 13, 13); $('hudName').textContent = t('watch'); $('hudArmy').textContent = N.ended() ? t('t_ended') : '▶ ' + t('start'); }
    tick(); const pin = N.s.pin; $('pinBar').hidden = !pin; if (pin) $('pinBar').textContent = t('notice') + '：' + pin;
    const em = $('nav').children[2].querySelector('em'); if (newLog > 0) { if (!em) { const e = document.createElement('em'); e.textContent = newLog > 99 ? '99+' : newLog; $('nav').children[2].appendChild(e); } else em.textContent = newLog > 99 ? '99+' : newLog; } else if (em) em.remove();
  }
  let wasReady = null;
  function tick() {
    if (scr === 'title') { renderTitle(); return; } if (scr !== 'game') return;
    const tm = $('hudTimer');
    if (N.ended()) { tm.className = ''; $('hudTL').textContent = ''; $('hudT').textContent = t('t_ended'); $('hudT').style.fontSize = '14px'; if (!endShown) checkEnd(); return; }
    if (!N.me) { tm.className = ''; $('hudTL').textContent = t('t_until', { t: '' }).replace(/\s+$/, ''); $('hudT').textContent = TK.dur(TK.END - N.now()); $('hudT').style.fontSize = '15px'; return; }
    $('hudT').style.fontSize = ''; const w = N.wait(), ready = w <= 0;
    tm.className = ready ? 'ready' : ''; $('hudTL').textContent = t('hud_wait'); $('hudT').textContent = ready ? t('hud_ready') : TK.clock(w);
    if (ready !== wasReady) { wasReady = ready; refreshGlow(); if (selCell >= 0) showCell(selCell); }
    else if (!ready && selCell >= 0 && !$('cell').hidden) { const ck = N.canTake(selCell); if (ck.why === 'wait') $('cellWhy').textContent = t('why_wait', { t: TK.clock(w) }); }
  }
  function refreshGlow() { MP.setGlow(N.me && !N.ended() ? N.takeable() : [], N.me && N.wait() <= 0 && !N.s.stop); }
  function showCell(i) {
    selCell = i; MP.select(i); const box = $('cell'); if (i < 0) { box.hidden = true; return; }
    const L = N.cells[i], f = TK.FI[L] || null, cas = N.CASTLE.get(i);
    $('cellProv').textContent = TK.kuni(M.prov[i]);
    $('cellCrest').hidden = !f; $('cellChip').hidden = !!f; if (f) drawCrest($('cellCrest'), f);
    $('cellOwner').textContent = cas ? t('cs_castle', { name: TK.fname(TK.FI[cas]) }) : f ? TK.army(f) : t('cs_white');
    const ck = N.canTake(i); $('cellGo').hidden = !ck.ok; $('cellGo').textContent = L === 'w' ? t('cs_takew') : t('cs_take');
    $('cellWhy').hidden = ck.ok; if (!ck.ok) $('cellWhy').textContent = ck.why === 'wait' ? t('why_wait', { t: TK.clock(N.wait()) }) : t('why_' + ck.why);
    const was = box.hidden; box.hidden = false; if (was && G.gsap) gsap.fromTo(box, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.25, ease: 'power2.out' });
  }
  async function refreshAll() { try { await Promise.all([N.loadMe(), N.poll()]); } catch (e) { } MP.repaint(); refreshGlow(); updateHud(); }
  async function doTake() {
    if (busy || selCell < 0) return; const i = selCell; busy = true; $('cellGo').disabled = true;
    try {
      const res = await N.take(i); ev('take'); N.store('tk_seen', N.now());
      const p = MP.screenOf(i); MP.repaint(); MP.flash(i, '#ffe08a', 1300); refreshGlow(); updateHud(); showCell(-1);
      if (TK.fx) TK.fx('take', p.x, p.y + 20);
      if (G.gsap) gsap.fromTo('#map', { x: -7 }, { x: 0, duration: 0.5, ease: 'elastic.out(1.2,0.25)' });
      try { navigator.vibrate && navigator.vibrate([30, 40, 60]); } catch (e) { }
      await sleep(1250); await showTaken(res); checkEnd();
    } catch (e) {
      if (e && (e.code === 'PERMISSION_DENIED' || e.code === 'BAD_REQUEST')) { await refreshAll(); showCell(-1); toast(t('tk_fail')); }
      else if (e && e.why) { showCell(i); } else toast(t('net_err'));
    }
    busy = false; $('cellGo').disabled = false;
  }
  // ---------- マスを取ったあとの画面（結果画面） ----------
  let tkCanvas = null, tkText = '';
  async function showTaken(res) {
    const me = N.me, f = TK.FI[me.f], pf = TK.FI[res.prev] || null, p = TK.kuni(M.prov[res.i]), n = N.s.n[f.L] || res.n, r = rankOf(f.L);
    $('tkTitle').textContent = t(pf ? 'tk_title' : 'tk_titlew', { p }); $('tkFrom').hidden = !pf; if (pf) $('tkFrom').textContent = t('tk_from', { name: TK.fname(pf) });
    $('tkCount').textContent = t('tk_count', { name: TK.fname(f), n, r });
    const at = new Date(Date.now() + N.wait()); $('tkNext').textContent = t('tk_next', { t: at.getHours() + ':' + String(at.getMinutes()).padStart(2, '0') }); $('tkMsg').textContent = '';
    const who = TK.who(me.n, me.h, me.r);
    tkText = pf ? t('sh_take', { army: TK.army(f), who, p, from: TK.fname(pf), n, r }) : t('sh_takew', { army: TK.army(f), who, p, n, r });
    tkCanvas = await card({ f, title: t(pf ? 'tk_title' : 'tk_titlew', { p }), sub: [who, t('tk_count', { name: TK.fname(f), n, r })], focus: res.i, z: 30, big: 56 });
    const cv = $('tkImg'), c = cv.getContext('2d'); c.drawImage(tkCanvas, 0, 0, cv.width, cv.height);
    $('taken').hidden = false; $('taken').scrollTop = 0;
    if (G.gsap) { gsap.fromTo('#taken', { opacity: 0 }, { opacity: 1, duration: 0.3 }); gsap.fromTo('#taken .card', { y: 50, scale: 0.94 }, { y: 0, scale: 1, duration: 0.5, ease: 'back.out(1.5)' }); }
    if (TK.fx) setTimeout(() => TK.fx('confetti', innerWidth / 2, innerHeight * 0.5), 250);
  }
  async function enterGame(fresh) {
    show('game'); scene('off'); $('loading').classList.remove('off'); $('loading').textContent = t('loading');
    if (!mapInit) { MP.init($('map'), (i) => { if (!$('panel').hidden) return; showCell(i); }); mapInit = true; }
    let events = [];
    try { await N.loadState(); if (!N.me && !N.fake && (N.store('tk_auth') || {}).rt) await N.loadMe().catch(() => { }); events = await N.loadCells(); } catch (e) { toast(t('net_err'), 6000); if (!N.cells) N.cells = M.own.split(''); }
    MP.resize(); MP.repaint(); wasReady = null; refreshGlow(); updateHud();
    if (N.me) MP.focusFaction(N.me.f, 0); else MP.fit(0);
    $('loading').classList.add('off');
    if (fresh && N.me && G.gsap) { const z = MP.view.z; MP.view.z = z * 0.45; MP.go(MP.view.x, MP.view.y, z, 1.6); }
    if (N.me) N.ping().then(() => tick());
    clearInterval(pollT); pollT = setInterval(poll, 30000);
    // 留守の間の戦況
    const seen = N.store('tk_seen'); lastSeenLog = N.lastT;
    if (N.me && seen && events.length) { const my = N.me.f; let gain = 0, lost = 0; const by = {}; for (const e of events) { if (e.y !== 't' || e.t <= seen) continue; if (e.f === my) gain++; else if (e.p === my) { lost++; by[e.f] = (by[e.f] || 0) + 1; } } if (gain + lost > 0) openPanel('away', { gain, lost, by }); }
    N.store('tk_seen', N.now());
    checkEnd();
  }
  async function poll() {
    if (scr !== 'game' || document.hidden) return;
    try { const list = await N.poll(); let ch = false; for (const e of list) { if (e.reload) { ch = true; continue; } if (e.y === 't') { ch = true; MP.flash(+e.c, TK.FI[e.f] ? '#fff' : '#fff', 1100); } newLog++; } if (ch) { MP.repaint(); refreshGlow(); } updateHud(); if (selCell >= 0 && !$('cell').hidden) showCell(selCell); N.store('tk_seen', N.now()); checkEnd(); } catch (e) { }
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && scr === 'game') poll(); });

  // ---------- 巻物（勢力・軍議・戦況・寝返り・その他） ----------
  let pKind = '', bdRoom = '', bdT = 0, bdLast = 0;
  function openPanel(kind, arg) {
    pKind = kind; clearInterval(bdT); const T = $('pTitle'), B = $('pBody'), F = $('pFoot'), TB = $('pTabs'); B.innerHTML = ''; F.innerHTML = ''; TB.innerHTML = ''; B.scrollTop = 0;
    const me = N.me;
    if (kind === 'power') {
      T.textContent = t('nav_power'); const list = sortedF(), top = N.s.n[list[0].L] || 0;
      let h = `<div class="pwTop"><span>${esc(t('pw_half'))}</span><span>${top} / ${TK.HALF}</span></div><div class="pwBar"><i style="width:${Math.min(100, top / TK.HALF * 100).toFixed(1)}%;background:${list[0].col}"></i></div><div class="pwTop"><span>${esc(N.ended() ? t('t_ended') : t('t_until', { t: TK.dur(TK.END - N.now()) }))}</span><span>${esc(t('pw_white', { n: N.s.n.w || 0 }))}</span></div>`;
      list.forEach((f, k) => { const n = N.s.n[f.L] || 0; h += `<div class="pw${me && me.f === f.L ? ' me' : ''}" data-l="${f.L}"><span class="r">${rankOf(f.L)}</span><canvas width="90" height="90" data-c="${f.L}"></canvas><div class="nm">${esc(TK.fname(f))}<small>${esc(t('pw_members', { n: N.s.m[f.L] || 0 }))}</small><div class="bar"><i style="width:${Math.min(100, n / Math.max(1, top) * 100).toFixed(1)}%;background:${f.col}"></i></div></div><span class="n">${n}<small>${esc(t('cells', { n: '' }).trim())}</small></span></div>`; });
      B.innerHTML = h; B.querySelectorAll('canvas').forEach(c => drawCrest(c, TK.FI[c.dataset.c])); B.querySelectorAll('.pw').forEach(r => r.onclick = () => { closePanel(); MP.focusFaction(r.dataset.l); });
    } else if (kind === 'board') {
      T.textContent = t('nav_board'); const rooms = me ? [[me.f, t('bd_mine', { name: TK.fname(TK.FI[me.f]) })], ['all', t('bd_all')]] : [['all', t('bd_all')]];
      if (!rooms.some(r => r[0] === bdRoom)) bdRoom = rooms[0][0]; if (arg && arg.room) bdRoom = arg.room;
      rooms.forEach(([r, nm]) => { const b = document.createElement('button'); b.textContent = nm; b.className = r === bdRoom ? 'on' : ''; b.onclick = () => { bdRoom = r; openPanel('board'); }; TB.appendChild(b); });
      B.innerHTML = `<p class="note">${esc(bdRoom === 'all' ? '' : t('bd_only'))}</p><div id="bdList"><p class="note">${esc(t('loading'))}</p></div>`;
      if (me) { F.innerHTML = `<div class="bdIn"><input id="bdM" maxlength="100" placeholder="${esc(t('bd_ph'))}" enterkeyhint="send"><button id="bdS" class="btn main">${esc(t('bd_send'))}</button></div>`; const send = async () => { const v = $('bdM').value; if (!v.trim()) return; $('bdS').disabled = true; try { await N.post(bdRoom, v); $('bdM').value = ''; await loadBoard(true); } catch (e) { toast(e && (e.code === 'PERMISSION_DENIED' || e.code === 'BAD_REQUEST') ? t('bd_wait') : t('net_err')); } $('bdS').disabled = false; }; $('bdS').onclick = send; $('bdM').onkeydown = e => { if (e.key === 'Enter' && !e.isComposing) send(); }; }
      else F.innerHTML = `<p class="note" style="text-align:center">${esc(t('bd_need'))}</p>`;
      bdLast = 0; loadBoard(true); bdT = setInterval(() => loadBoard(false), 20000);
    } else if (kind === 'log') {
      T.textContent = t('nav_log'); B.innerHTML = `<p class="note">${esc(t('loading'))}</p>`; newLog = 0; updateHud();
      N.recent(60).then(list => { if (pKind !== 'log') return; if (!list.length) { B.innerHTML = `<p class="note">${esc(t('lg_empty'))}</p>`; return; } const now = N.now(); B.innerHTML = list.reverse().map(e => { const f = TK.FI[e.f], pf = TK.FI[e.p], who = '<b>' + esc(TK.who(e.n, e.h, e.r)) + '</b>'; const txt = e.y === 'd' ? t('lg_defect', { who, from: esc(pf ? TK.fname(pf) : ''), to: esc(TK.fname(f)) }) : pf ? t('lg_take', { who, p: esc(TK.kuni(M.prov[+e.c])), from: esc(TK.fname(pf)) }) : t('lg_takew', { who, p: esc(TK.kuni(M.prov[+e.c])) }); return `<div class="lg" data-c="${e.y === 't' ? +e.c : -1}"><i style="background:${f ? f.col : '#fff'}"></i><div>${txt}</div><span>${esc(TK.ago(e.t, now))}</span></div>`; }).join(''); B.querySelectorAll('.lg').forEach(r => r.onclick = () => { const c = +r.dataset.c; if (c >= 0) { closePanel(); MP.focusCell(c, 18); MP.flash(c, '#fff', 1500); } }); }).catch(() => { B.innerHTML = `<p class="note">${esc(t('net_err'))}</p>`; });
    } else if (kind === 'defect') {
      T.textContent = t('nav_defect'); let h = `<p>${esc(t('df_body'))}</p>`;
      if (!me) h += `<p class="note">${esc(t('why_nome'))}</p>`; else if (N.ended()) h += `<p class="note">${esc(t('t_ended'))}</p>`;
      else { const w = N.defectWait(), weak = N.weakest().filter(L => L !== me.f); if (w > 0) h += `<p style="font-weight:800;color:var(--shu2)">${esc(t('df_wait', { t: TK.dur(w) }))}</p>`; h += `<p class="note" style="margin-top:12px">${esc(t('df_to'))}</p>`; if (!weak.length) h += `<p style="font-weight:800">${esc(t('df_none'))}</p>`; for (const L of weak) { const f = TK.FI[L]; h += `<div class="dfTo"><canvas width="114" height="114" data-c="${L}"></canvas><b>${esc(TK.fname(f))}<br><small style="font-weight:500;color:var(--sub)">${esc(t('cells', { n: N.s.n[L] || 0 }))}</small></b>${w > 0 ? '' : `<button class="btn" data-go="${L}">${esc(t('df_yes'))}</button>`}</div>`; } }
      B.innerHTML = h; B.querySelectorAll('canvas').forEach(c => drawCrest(c, TK.FI[c.dataset.c]));
      B.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { const f = TK.FI[b.dataset.go]; B.innerHTML = `<p style="font-family:var(--ft);font-size:20px;line-height:1.6;text-align:center;margin:18px 0">${esc(t('df_sure', { name: TK.fname(f) }))}</p>`; F.innerHTML = `<div class="row2"><button class="btn" id="dfN">${esc(t('df_no'))}</button><button class="btn main" id="dfY">${esc(t('df_yes'))}</button></div>`; $('dfN').onclick = () => openPanel('defect'); $('dfY').onclick = async () => { $('dfY').disabled = true; try { await N.defect(f.L); ev('defect'); closePanel(); showReveal(f, 'defect'); } catch (e) { await refreshAll(); toast(e && (e.code === 'PERMISSION_DENIED' || e.code === 'BAD_REQUEST') ? t('tk_fail') : t('net_err')); openPanel('defect'); } }; });
    } else if (kind === 'more') {
      T.textContent = t('nav_more'); const items = [['mr_me', () => { closePanel(); if (N.me) MP.focusFaction(N.me.f); }, !!me], ['mr_fit', () => { closePanel(); MP.fit(); }, true], ['how', () => openPanel('how'), true], ['mr_share', shareState, true], ['mr_lang', () => openPanel('lang'), true], ['askbtn', () => openPanel('ask'), true], ['mr_title', () => { closePanel(); show('title'); scene('title'); renderTitle(); }, true], ['mr_home', () => { location.href = 'https://nasubi-no-oniwa.github.io/'; }, true]];
      const d = document.createElement('div'); d.className = 'menu'; for (const [k, fn, on] of items) { if (!on) continue; const b = document.createElement('button'); b.className = 'btn sm'; b.textContent = t(k); b.onclick = fn; d.appendChild(b); } B.appendChild(d); B.insertAdjacentHTML('beforeend', '<p class="note" id="mrMsg" style="margin-top:10px"></p>');
    } else if (kind === 'how') {
      T.textContent = t('how'); B.innerHTML = '<ol class="how">' + [1, 2, 3, 4, 5, 6].map(i => '<li>' + esc(t('how' + i)) + '</li>').join('') + '</ol>';
    } else if (kind === 'lang') {
      T.textContent = '言語 / Language'; const d = document.createElement('div'); d.className = 'langs'; [['ja', '日本語'], ['en', 'English'], ['zh', '繁體中文'], ['ko', '한국어']].forEach(([l, nm]) => { const b = document.createElement('button'); b.className = 'btn sm' + (TK.lang() === l ? ' main' : ''); b.textContent = nm; b.onclick = () => { TK.setLang(l); applyLang(); closePanel(); }; d.appendChild(b); }); B.appendChild(d);
    } else if (kind === 'ask') {
      T.textContent = t('askbtn'); B.innerHTML = `<textarea id="akM" maxlength="300" placeholder="${esc(t('ak_ph'))}"></textarea><input id="akX" maxlength="16" placeholder="${esc(t('ak_x'))}" autocomplete="off"><p class="note" id="akMsg"></p>`;
      F.innerHTML = `<button class="btn main" id="akS">${esc(t('ak_send'))}</button>`; $('akS').onclick = async () => { const m = $('akM').value.trim(); if (!m) return; $('akS').disabled = true; try { await N.ask(m, $('akX').value, TK.lang(), me ? TK.fname(TK.FI[me.f]) + ' ' + me.n : ''); B.innerHTML = `<p style="text-align:center;font-weight:800;margin:26px 0">${esc(t('ak_done'))}</p>`; F.innerHTML = ''; ev('ask'); } catch (e) { $('akMsg').textContent = e && (e.code === 'PERMISSION_DENIED' || e.code === 'BAD_REQUEST') ? t('ak_wait') : t('net_err'); $('akS').disabled = false; } };
    } else if (kind === 'away') {
      T.textContent = t('aw_title'); let h = `<div class="aw"><div class="g">${esc(t('aw_gain'))}<b>＋${arg.gain}</b></div><div class="l">${esc(t('aw_lost'))}<b>−${arg.lost}</b></div></div>`;
      const top = Object.entries(arg.by).sort((a, b) => b[1] - a[1])[0]; if (top) h += `<p style="font-weight:800;text-align:center">${esc(t('aw_by', { name: TK.fname(TK.FI[top[0]]), n: top[1] }))}</p>`;
      B.innerHTML = h; F.innerHTML = `<button class="btn main" id="awOk">${esc(t('aw_ok'))}</button>`; $('awOk').onclick = closePanel;
    }
    const p = $('panel'), was = p.hidden; p.hidden = false; if (was && G.gsap) { gsap.fromTo(p, { opacity: 0 }, { opacity: 1, duration: 0.2 }); gsap.fromTo('.pbox', { y: 60 }, { y: 0, duration: 0.35, ease: 'power3.out' }); }
  }
  function closePanel() { clearInterval(bdT); $('panel').hidden = true; pKind = ''; }
  async function loadBoard(first) {
    if (pKind !== 'board') return; const room = bdRoom;
    try {
      const list = await N.board(room, first ? 0 : bdLast); if (pKind !== 'board' || room !== bdRoom) return; const box = $('bdList'); if (!box) return;
      if (first) box.innerHTML = list.length ? '' : `<p class="note">${esc(t('bd_empty'))}</p>`; else if (list.length && box.querySelector('.note')) box.innerHTML = '';
      const now = N.now(); for (const e of list) { if (e.t <= bdLast && !first) continue; const f = TK.FI[e.f]; const d = document.createElement('div'); d.className = 'msg' + (e.g ? ' gm' : ''); d.innerHTML = `<div class="h">${e.g ? '' : `<i style="background:${f ? f.col : '#999'}"></i>`}<b>${e.g ? esc(t('gm')) : esc(TK.who(e.n, e.h, e.r))}</b>${!e.g && f && room === 'all' ? esc(TK.army(f)) : ''}<span>${esc(TK.ago(e.t, now))}</span></div><p>${esc(e.m)}</p>`; box.appendChild(d); bdLast = Math.max(bdLast, e.t); }
      if (first || list.length) $('pBody').scrollTop = 1e6;
    } catch (e) { const box = $('bdList'); if (box && first) box.innerHTML = `<p class="note">${esc(e && e.code === 'PERMISSION_DENIED' ? t('bd_only') : t('net_err'))}</p>`; }
  }
  // いまの戦況を投稿
  function stateText() { const s = sortedF(); return t('sh_state', { a: TK.fname(s[0]), an: N.s.n[s[0].L] || 0, b: TK.fname(s[1]), bn: N.s.n[s[1].L] || 0, c: TK.fname(s[2]), cn: N.s.n[s[2].L] || 0 }); }
  async function shareState() { const s = sortedF(); const c = await card({ title: t('title_sub'), sub: [1, 2, 3].map(k => t('rank', { n: k }) + '　' + TK.fname(s[k - 1]) + '　' + t('cells', { n: N.s.n[s[k - 1].L] || 0 })), big: 50 }); postImg(c, stateText(), $('mrMsg'), 'tenkatori_map'); }

  // ---------- 終わり（天下統一・時間切れ） ----------
  let enCanvas = null;
  async function checkEnd() {
    if (endShown || !N.ended() || scr !== 'game') return; endShown = true; refreshGlow();
    try { await N.loadState(); } catch (e) { }
    const win = N.winners().map(L => TK.FI[L]), f = win[0], half = !!(N.s.end && N.s.end.k === 'half'), names = win.map(TK.fname).join('・');
    $('enT').textContent = half ? t('en_title') : t('t_ended'); $('enS').textContent = t(half ? 'en_half' : 'en_time', { name: names });
    $('enWin').hidden = !(N.me && win.some(w => w.L === N.me.f)); $('enWin').textContent = t('en_win');
    $('enList').innerHTML = sortedF().slice(0, 5).map(x => `<div class="pw"><span class="r">${rankOf(x.L)}</span><canvas width="90" height="90" data-c="${x.L}"></canvas><div class="nm">${esc(TK.fname(x))}</div><span class="n">${N.s.n[x.L] || 0}</span></div>`).join(''); $('enList').querySelectorAll('canvas').forEach(c => drawCrest(c, TK.FI[c.dataset.c]));
    $('taken').hidden = true; closePanel(); showCell(-1); $('endscr').hidden = false; $('map').hidden = true; $('game').hidden = true; scene('banner', { f, gold: 1 });
    if (G.gsap) { gsap.fromTo('#enT', { opacity: 0, scale: 2.2 }, { opacity: 1, scale: 1, duration: 0.9, ease: 'power4.out' }); gsap.fromTo('#enS', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, delay: 0.7 }); gsap.fromTo('.enbox', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.6, delay: 1.2 }); }
    if (TK.fireworks) TK.fireworks(6);
    enCanvas = await card({ f, title: half ? t('en_title') : t('t_ended'), sub: [t(half ? 'en_half' : 'en_time', { name: names }), t('cells', { n: N.s.n[f.L] || 0 })], big: 76 });
    ev('end_view');
  }
  const endText = () => { const f = TK.FI[N.winners()[0]]; return t('sh_end', { name: N.winners().map(L => TK.fname(TK.FI[L])).join('・'), n: N.s.n[f.L] || 0 }); };

  // ---------- ボタン ----------
  $('bStart').onclick = () => { if (N.me || N.ended()) enterGame(); else startQuiz(); };
  $('bWatch').onclick = () => enterGame(); $('bHow').onclick = () => openPanel('how'); $('bLang').onclick = () => openPanel('lang'); $('bAsk').onclick = () => openPanel('ask');
  $('qBack').onclick = () => { if (qi > 0) { qi--; renderQ(); } else { show('title'); scene('title'); } };
  $('rvJoin').onclick = join; $('rvName').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.target.blur(); join(); } });
  $('rvX').onclick = () => postX(quizText(rvF)); $('rvXi').onclick = async () => postImg(await quizCard(rvF), quizText(rvF), $('rvMsg'), 'tenkatori_' + rvF.L);
  $('rvGo').onclick = () => enterGame(true);
  $('hudMe').onclick = () => { if (N.me) MP.focusFaction(N.me.f); else if (!N.ended()) startQuiz(); };
  $('zIn').onclick = () => MP.zoomBy(1.6); $('zOut').onclick = () => MP.zoomBy(1 / 1.6); $('zMe').onclick = () => { if (N.me) MP.focusFaction(N.me.f); else MP.fit(); };
  $('nav').querySelectorAll('button').forEach(b => b.onclick = () => { showCell(-1); openPanel(b.dataset.p); });
  $('cellX').onclick = () => showCell(-1); $('cellGo').onclick = doTake;
  $('pClose').onclick = closePanel; $('panel').addEventListener('click', e => { if (e.target === $('panel')) closePanel(); });
  $('tkBack').onclick = () => { $('taken').hidden = true; if (N.me) MP.focusFaction(N.me.f); };
  $('tkX').onclick = () => postX(tkText); $('tkXi').onclick = () => tkCanvas && postImg(tkCanvas, tkText, $('tkMsg'), 'tenkatori_take');
  $('enX').onclick = () => postX(endText()); $('enXi').onclick = () => enCanvas && postImg(enCanvas, endText(), $('enMsg'), 'tenkatori_end');
  $('enMap').onclick = () => { $('endscr').hidden = true; $('map').hidden = false; $('game').hidden = false; scene('off'); MP.resize(); MP.fit(); };
  // ダブルタップ・2本指で、ページそのものが大きくならないようにする（地図は自分で広げる）
  let lastTouch = 0;
  document.addEventListener('touchend', e => { const now = Date.now(); if (now - lastTouch < 320 && !/^(INPUT|TEXTAREA)$/.test(e.target.tagName)) e.preventDefault(); lastTouch = now; }, { passive: false });
  for (const n of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(n, e => e.preventDefault(), { passive: false });
  document.addEventListener('dblclick', e => e.preventDefault());

  // ---------- はじまり ----------
  TK.app = { openPanel, closePanel, enterGame, showReveal, startQuiz, showTaken, card, checkEnd };
  (async function boot() {
    TK.setLang(TK.lang()); applyLang(); scene('title');
    await fontReady('毘天下取りマース一二三四勢議報返他');
    try { await Promise.race([N.loadState(), sleep(6000)]); } catch (e) { }
    try { if (!N.fake) { if ((N.store('tk_auth') || {}).rt) await Promise.race([N.loadMe(), sleep(6000)]); } else await N.loadMe(); } catch (e) { }
    renderTitle(); $('loading').classList.add('off'); setInterval(tick, 1000);
    const q = new URLSearchParams(location.search);
    if (q.get('go') === 'map') enterGame(); else if (q.get('go') === 'quiz') startQuiz(); else if (q.get('go') === 'reveal') showReveal(TK.F[+(q.get('f') || 0)], 'new');
  })();
})(window);
