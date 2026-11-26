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
  let pollAt = 0;
  let lastTake = null;                       // 自分が最後に取ったマス（同時に攻めこまれて奪われたときの知らせ用）
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
  const rankOf = L => { const n = N.s.n[L] || 0; let r = 1; for (const A of N.armies()) if ((N.s.n[A] || 0) > n) r++; return r; };
  const sortedF = () => N.armies().map(L => TK.FI[L]).sort((a, b) => (N.s.n[b.L] || 0) - (N.s.n[a.L] || 0) || a.i - b.i);
  const drawCrest = (cv, f) => { const c = cv.getContext('2d'); c.clearRect(0, 0, cv.width, cv.height); c.drawImage(TK.crest(f, cv.width), 0, 0); };

  // ---------- 名所：占領の知らせ（テロップ） ----------
  let lmPrev = null; const telQ = []; let telOn = false;
  function telop(html, lm, lost) { telQ.push([html, lm, lost]); if (telQ.length > 4) telQ.splice(0, telQ.length - 4); if (!telOn) telNext(); }
  function telNext() {
    const it = telQ.shift(), e = $('telop'); if (!it || scr !== 'game') { telOn = false; e.hidden = true; telQ.length = 0; return; }
    telOn = true; e.innerHTML = it[0]; e.className = it[2] ? 'lost' : ''; e.hidden = false;
    if (it[1]) { for (const i of it[1].c) MP.flash(i, it[2] ? '#cfd8dc' : '#ffe08a', 1600); }
    if (TK.fx && !it[2]) TK.fx('take', innerWidth / 2, e.getBoundingClientRect().top + 60);
    if (G.gsap) { gsap.fromTo(e, { opacity: 0, xPercent: 12 }, { opacity: 1, xPercent: 0, duration: 0.45, ease: 'power3.out' }); gsap.to(e, { opacity: 0, xPercent: -8, duration: 0.4, delay: 3.1, ease: 'power2.in', onComplete: telNext }); } else setTimeout(telNext, 3500);
  }
  function checkLM(quiet) {
    if (!N.cells) return; const now = N.holders(); if (!lmPrev) lmPrev = N.store('tk_lm') || now;
    if (!quiet) for (const lm of N.LM) { const a = lmPrev[lm.id] || '', b = now[lm.id] || ''; if (a === b) continue; const name = esc(TK.L(lm.n)); if (b) telop(t('lm_occ', { army: esc(TK.army(TK.FI[b])), name }), lm, false); else if (TK.FI[a]) telop(t('lm_lost', { army: esc(TK.army(TK.FI[a])), name }), lm, true); }
    lmPrev = now; N.store('tk_lm', now); updateKey();
  }
  function updateKey() {
    const k = N.KEY, b = $('keyBar'); if (!k || !N.cells) { b.hidden = true; return; } b.hidden = false;
    const h = N.holder(k), c = $('keyIc').getContext('2d'); c.clearRect(0, 0, 66, 66); c.drawImage(h ? TK.crest(TK.FI[h], 66) : TK.badge('castle', 66, true), 0, 0);
    $('keyTx').textContent = h ? t('key_hold', { army: TK.army(TK.FI[h]) }) : t('key_none');
    // 本日の決戦地（11/18）
    const dd = N.day[N.dayStart()], ks = dd && dd.k && N.LM.find(l => l.id === dd.k), kb = $('ksBar'); MP.kessen = ks ? ks.id : '';
    if (ks && ks.id === 'azuchi') { $('keyTx').textContent = t('key_final', { st: h ? TK.army(TK.FI[h]) : t('lm_none') }); if (kb) kb.hidden = true; return; }   // 最終日：決戦地は安土城（上の帯にまとめる）
    if (!kb) return; kb.hidden = !ks; if (!ks) return;
    const kh = N.holder(ks), kc = $('ksIc').getContext('2d'); kc.clearRect(0, 0, 66, 66); kc.drawImage(kh ? TK.crest(TK.FI[kh], 66) : TK.badge(ks.k, 66, true), 0, 0);
    $('ksTx').textContent = t('ks_tx', { name: TK.L(ks.n), st: lmStatus(ks) });
  }
  const lmOf = i => N.LM.find(l => l.c.includes(i)) || null;
  const lmLead = lm => { const cnt = {}; for (const i of lm.c) { const L = N.cells[i]; if (L !== 'w') cnt[L] = (cnt[L] || 0) + 1; } const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0]; return top ? { L: top[0], n: top[1] } : null; };
  const lmStatus = lm => { const h = N.holder(lm); if (h) return t('lm_hold', { army: TK.army(TK.FI[h]) }); const ld = lmLead(lm); return ld ? TK.fname(TK.FI[ld.L]) + ' ' + ld.n + '/' + lm.c.length : t('lm_none'); };

  // ---------- ことば ----------
  function applyLang() {
    document.title = '天下取りマース'; $('tSub').textContent = t('title_sub'); $('tTag').textContent = t('title_tag');
    $('bHow').textContent = t('how'); $('bLang').textContent = '言語 / Language'; $('bAsk').textContent = t('askbtn'); $('bWatch').textContent = t('watch');
    $('qBack').textContent = '‹ ' + t('back'); $('rvYou').textContent = t('rv_you'); $('rvNameL').textContent = t('rv_name'); $('rvName').placeholder = t('rv_ph'); $('rvNote').textContent = t('rv_note'); $('rvJoin').textContent = t('rv_join');
    $('rvX').textContent = t('x_post'); $('rvXi').textContent = t('x_img'); $('rvGo').textContent = t('tk_back');
    const nv = $('nav').querySelectorAll('button'); ['nav_power', 'nav_board', 'nav_log', 'nav_defect', 'nav_scroll', 'nav_more'].forEach((k, i) => { if (nv[i]) nv[i].querySelector('span').textContent = t(k); }); if ($('scroll') && !$('scroll').hidden) renderScroll();
    $('tkX').textContent = t('x_post'); $('tkXi').textContent = t('x_img'); $('tkBack').textContent = t('tk_back');
    $('enRoll').textContent = t('roll_btn'); $('rollX').textContent = t('roll_skip'); $('enX').textContent = t('x_post'); $('enXi').textContent = t('x_img'); $('enMap').textContent = t('en_map');
    renderTitle(); if (scr === 'quiz') renderQ(); if (scr === 'game') { updateHud(); MP.kick(); if (selCell >= 0) showCell(selCell); }
  }
  function renderTitle() {
    const ended = N.ended(), prep = !!(N.s && N.s.stop) && !ended;
    $('tClock').textContent = ended ? t('t_ended') : prep ? t('prep') + '　' + t('prep_note') : t('t_until', { t: TK.dur(TK.END - N.now()) });
    $('bStart').textContent = ended ? t('en_map') : prep ? t('prep') : N.me ? t('cont') : t('start');
    $('bStart').disabled = prep && !N.me; $('bWatch').hidden = (!!N.me && !prep) || ended;
    const pin = N.s && N.s.pin; $('tPin').hidden = !pin; if (pin) $('tPin').innerHTML = '<b>' + esc(t('notice')) + '</b>' + esc(pin);
  }

  // ---------- 診断 ----------
  let ans = [], qi = 0;
  function startQuiz() { N.loadState().catch(() => { }); ans = []; qi = 0; show('quiz'); scene('title', { dim: 1 }); renderQ(); ev('quiz_start'); }
  function renderQ() {
    const q = TK.Q[qi]; $('qNo').textContent = t('q_no', { n: qi + 1 }) + ' / 10'; $('qBar').style.width = (qi * 10) + '%';
    $('qText').textContent = TK.L(q.q); const box = $('qAns'); box.innerHTML = '';
    q.a.forEach((a, k) => { const b = document.createElement('button'); b.className = 'qa'; b.innerHTML = '<i>' + '一二三四'[k] + '</i><span>' + esc(TK.L(a[0])) + '</span>'; b.onclick = () => pick(k); box.appendChild(b); });
    if (G.gsap) { gsap.fromTo('#qText', { opacity: 0, x: 18 }, { opacity: 1, x: 0, duration: 0.35, ease: 'power2.out' }); gsap.fromTo('.qa', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.3, stagger: 0.06, delay: 0.08, ease: 'power2.out' }); }
  }
  function pick(k) { ans[qi] = k; if (qi < 9) { qi++; renderQ(); } else { $('qBar').style.width = '100%'; const fi = TK.judge(ans, N.s && N.s.m, N.mg()); N.store('tk_quiz', { a: ans, f: fi }); ev('quiz_done', { warlord: TK.F[fi].L }); showReveal(TK.F[fi], 'new'); } }

  // ---------- 仕える武将が決まる場面（mode：new＝はじめて、defect＝寝返ったあと） ----------
  let rvF = null, rvMode = 'new';
  function showReveal(f, mode) {
    rvF = f; rvMode = mode; show('reveal'); $('reveal').scrollTop = 0; scene('banner', { f });
    $('rvType').textContent = '「' + TK.L(f.type) + '」'; $('rvServe').textContent = mode === 'defect' ? t('df_done', { name: TK.fname(f) }) : N.armyOf(f.L) !== f.L ? t('rv_serve_mg', { name: TK.fname(f), army: TK.army(TK.FI[N.armyOf(f.L)]) }) : t('rv_serve', { name: TK.fname(f) });
    $('rvDesc').textContent = TK.L(f.desc); $('rvCastle').textContent = TK.L(f.castle) + '　' + TK.kuni(M.prov[M.castle[f.L]]);
    $('rvHome').textContent = TK.lang() === 'en' ? '' : TK.L(f.home) + (TK.lang() === 'ja' ? 'の' : TK.lang() === 'zh' ? '的' : '의');
    $('rvForm').hidden = mode !== 'new'; $('rvGo').hidden = mode === 'new'; $('rvErr').textContent = ''; $('rvMsg').textContent = '';
    $('rvYou').hidden = mode !== 'new'; $('rvType').hidden = false; $('rvX').parentElement.hidden = mode !== 'new';
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

  // 本日の一番槍（11/18）：名前の前に「一番槍」
  const ichi = u => { const c = N.s && N.s.ich; return c && c.u && u && c.u === u && c.d === N.dayStart() ? '🏅' + t('ichi') + ' ' : ''; };
  // ---------- 早取りの時間割 ----------
  const fsH = i => { const lg = TK.lang(); return lg === 'ja' || lg === 'zh' ? i + '時' : (i < 10 ? '0' : '') + i + ':00'; };
  // 下剋上の軍の人の画面だけ、早取りの「2分」「5分」を「1分」「2分半」に書きかえる（11/27から）
  const gkTxt = s => { if (!N.me || !N.isGk(N.me.f)) return s; const L = TK.lang();
    return L === 'ja' ? s.replace(/2分/g, '1分').replace(/5分/g, '2分半') : L === 'en' ? s.replace(/2 minutes/g, '1 minute').replace(/5 minutes/g, '2.5 minutes').replace(/2 min/g, '1 min').replace(/5 min/g, '2.5 min')
      : L === 'zh' ? s.replace(/2分鐘/g, '1分鐘').replace(/5分鐘/g, '2.5分鐘') : s.replace(/2분/g, '1분').replace(/5분/g, '2분 30초'); };
  const nrNames = v => (v.p || []).map(p => TK.kuni(p)).join('・');
  function fastBar() {
    const el = $('fastBar'); if (!el) return; const me = N.me, now = N.now();
    let txt = '', hot = false;
    const nr = N.nrNow(), ki = me && N.kiNow();
    if (ki && !N.ended() && !N.s.stop) { hot = true; txt = t(ki.f === me.f ? 'fs_ki_atk' : 'fs_ki_def', { army: TK.army(TK.FI[ki.f === me.f ? ki.g : ki.f]), t: TK.clock(ki.a + 1800000 - now) }); }   // 奇襲（その2軍の人だけ）
    else if (me && nr && !N.ended() && !N.s.stop) { hot = true; txt = t('fs_nr', { list: nrNames(nr), t: TK.clock(nr.a + 1800000 - now) }); }   // 狼煙（いちばん先に出す）
    else if (me && !N.ended() && !N.s.stop && N.sched[N.dayStart()]) {
      const sl = N.fastNow();
      if (sl) { hot = true; txt = sl.f === '!' ? gkTxt(t('fs_hfin', { t: TK.clock(sl.e - now) })) : gkTxt(t(sl.f === '*' && sl.f2 !== me.f ? 'fs_hall' : 'fs_hmine', { t: TK.clock(sl.e - now) })); }
      else {   // 今日これから来る早取り（自分の番か全陣営）を1つ
        const d = N.dayStart(), hs = N.sched[d], xs = (N.day[d] && N.day[d].x) || {};   // 決戦地のほうびの1時間（xs）も自分の番として数える
        for (let i = Math.floor((now - d) / 3600000) + 1; i < 24; i++) { const mine = hs[i] === me.f || xs[i] === me.f; if (hs[i] === '!') { txt = gkTxt(t('fs_nfin', { a: fsH(i) })); break; } if (mine || hs[i] === '*') { txt = gkTxt(t(mine ? 'fs_nmine' : 'fs_nall', { a: fsH(i), b: fsH(i + 1) })); break; } }
      }
    }
    el.hidden = !txt; el.className = hot ? 'hot' : ''; if (txt && el.textContent !== txt) el.textContent = txt;
    $('pinBar').classList.toggle('low', !!txt);
  }
  // 掲示板に出す、なすPからのお知らせ（時間割から作る。だれかが書きこむのではないので、時間どおりに出る）
  const fsHM = ts => { const x = new Date(ts + 9 * 3600000); return x.getUTCHours() + ':' + String(x.getUTCMinutes()).padStart(2, '0'); };
  function sysPosts(room) {
    const d = N.dayStart(), hs = N.sched[d], now = N.now(), out = []; if (!hs) return out;
    const nm = L => TK.fname(TK.FI[L]);
    if (room === 'all') {
      const list = []; for (let i = 0; i < 24; i++) if (hs[i] !== '*' && TK.FI[hs[i]]) list.push(fsH(i) + ' ' + (N.mg() ? TK.army(TK.FI[hs[i]]) : nm(hs[i])));
      out.push({ id: 'd' + d, t: d, m: t('sy_day', { list: list.join('、') }) });
      const dd = N.day[d], ks = dd && dd.k && N.LM.find(l => l.id === dd.k);
      if (ks) out.push({ id: 'dk' + d, t: d, m: ks.id === 'azuchi' ? t('sy_kessen_az') : t('sy_kessen', { name: TK.L(ks.n) }) });
      if (hs.includes('!')) { const i0 = hs.indexOf('!'), a0 = d + i0 * 3600000; out.push({ id: 'dF' + d, t: d + 1, m: t('sy_final', { a: fsH(i0) }) }); if (now >= a0) out.push({ id: 'hF' + d, t: a0, m: t('sy_fin_now') }); }
      for (const v of N.nrList()) out.push({ id: 'n' + v.a, t: v.a, m: t('sy_nr', { list: nrNames(v), b: fsHM(v.a + 1800000) }) });
      if (dd && dd.rc && dd.rc.size) out.push({ id: 'dr' + d, t: d, m: t('sy_rice', { n: dd.rc.size }) });
      for (let i = 0; i < 24; i++) { const a = d + i * 3600000; if (a > now) break; if (now >= a + 3600000) continue; if (hs[i] === '*') out.push({ id: 'h' + a, t: a + 1, m: t('sy_hall', { b: fsH(i + 1) }) }); }   // 陣営ごとの番（2分）は、その陣営の軍議だけに出す
    } else {
      const ix = []; for (let i = 0; i < 24; i++) if (hs[i] === room) ix.push(i); if (!ix.length) return out;   // 三つ巴のあとは1日2回
      out.push({ id: 'd' + d, t: d, m: ix.length === 1 ? t('sy_fday', { a: fsH(ix[0]), b: fsH(ix[0] + 1) }) : t('sy_fday2', { list: ix.map(i => fsH(i) + '〜' + fsH(i + 1)).join('、') }) });
      for (const i of ix) { const a = d + i * 3600000; if (a <= now && now < a + 3600000) out.push({ id: 'h' + a, t: a + 1, m: t('sy_fnow', { b: fsH(i + 1) }) }); }
    }
    return out.filter(e => e.t <= now).map(e => Object.assign(e, { m: gkTxt(e.m), g: true, sys: true }));
  }
  // ---------- 地図の画面 ----------
  function updateHud() {
    const me = N.me, f = me ? TK.FI[me.f] : null;
    if (f) { drawCrest($('hudCrest'), f); $('hudName').textContent = TK.who(me.n, me.h, me.r); $('hudArmy').textContent = TK.army(f) + '　' + t('cells', { n: N.s.n[f.L] || 0 }) + '・' + t('rank', { n: rankOf(f.L) }) + (N.riceDay === N.dayStart() ? '　' + t('hud_rice', { n: N.rice[f.L] || 0, m: N.morale(f.L) }) : ''); $('hudName').textContent = ichi(N.uid()) + TK.who(me.n, me.h, me.r); }
    else { const c = $('hudCrest').getContext('2d'); c.clearRect(0, 0, 126, 126); c.drawImage(TK.kamon('rokumon', 100, '#c9a44c'), 13, 13); $('hudName').textContent = t('watch'); $('hudArmy').textContent = N.ended() ? t('t_ended') : N.s.stop ? t('prep') : '▶ ' + t('start'); }
    fastBar(); tick(); const pin = N.s.pin; $('pinBar').hidden = !pin; if (pin) $('pinBar').textContent = t('notice') + '：' + pin;
    const em = $('nav').children[2].querySelector('em'); if (newLog > 0) { if (!em) { const e = document.createElement('em'); e.textContent = newLog > 99 ? '99+' : newLog; $('nav').children[2].appendChild(e); } else em.textContent = newLog > 99 ? '99+' : newLog; } else if (em) em.remove();
  }
  let wasReady = null;
  function tick() {
    if (scr === 'title') { renderTitle(); return; } if (scr !== 'game') return;
    if (!N.sched[N.dayStart()]) N.loadSched().then(x => { if (x) { fastBar(); refreshGlow(); updateKey(); setTimeout(updateHud, 1500); } }).catch(() => { }); fastBar();
    const tm = $('hudTimer');
    if (N.ended()) { tm.className = ''; $('hudTL').textContent = ''; $('hudT').textContent = t('t_ended'); $('hudT').style.fontSize = '14px'; if (!endShown) checkEnd(); return; }
    if (!N.me) { tm.className = ''; $('hudTL').textContent = t('t_until', { t: '' }).replace(/\s+$/, ''); $('hudT').textContent = TK.dur(TK.END - N.now()); $('hudT').style.fontSize = '15px'; return; }
    if (N.s.stop) { tm.className = ''; $('hudTL').textContent = ''; $('hudT').textContent = t('prep'); $('hudT').style.fontSize = '14px'; return; }
    $('hudT').style.fontSize = ''; const w = N.wait(), ready = w <= 0 || N.nrReady() || N.kiReady();
    tm.className = ready ? 'ready' : ''; $('hudTL').textContent = t('hud_wait'); $('hudT').textContent = ready ? t('hud_ready') : TK.clock(w);
    if (ready !== wasReady) { wasReady = ready; refreshGlow(); if (selCell >= 0) showCell(selCell); }
    else if (!ready && selCell >= 0 && !$('cell').hidden) { const ck = N.canTake(selCell); if (ck.why === 'wait') $('cellWhy').textContent = t('why_wait', { t: TK.clock(w) }); }
  }
  function refreshGlow() { const nrOnly = N.me && N.wait() > 0 && N.nrReady(), kiOnly = N.me && N.wait() > 0 && N.kiReady(); MP.setGlow(N.me && !N.ended() ? N.takeable().filter(i => !(nrOnly || kiOnly) || (nrOnly && N.inNr(i)) || (kiOnly && N.kiAtk(i))) : [], N.me && (N.wait() <= 0 || nrOnly || kiOnly) && !N.s.stop); }
  function showCell(i) {
    selCell = i; MP.select(i); const box = $('cell'); if (i < 0) { box.hidden = true; return; }
    const L = N.cells[i], f = TK.FI[L] || null, cas = N.CASTLE.get(i);
    $('cellProv').textContent = TK.kuni(M.prov[i]);
    $('cellCrest').hidden = !f; $('cellChip').hidden = !!f; if (f) drawCrest($('cellCrest'), f);
    $('cellOwner').textContent = cas ? t('cs_castle', { name: TK.fname(TK.FI[cas]) }) : f ? TK.army(f) : t('cs_white');
    const lm = lmOf(i); $('cellLm').hidden = !lm; if (lm) $('cellLm').textContent = t('cs_lm', { name: TK.L(lm.n), st: lmStatus(lm) });
    const rc = $('cellRice'); if (rc) { rc.hidden = !N.isRice(i); rc.textContent = t('cs_rice'); }
    const ck = N.canTake(i); $('cellGo').hidden = !ck.ok; $('cellGo').textContent = L === 'w' ? t('cs_takew') : t('cs_take');
    $('cellWhy').hidden = ck.ok; if (!ck.ok) $('cellWhy').textContent = ck.why === 'wait' ? t('why_wait', { t: TK.clock(N.wait()) }) : t('why_' + ck.why);
    const was = box.hidden; box.hidden = false; if (was && G.gsap) gsap.fromTo(box, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.25, ease: 'power2.out' });
  }
  async function refreshAll() { try { await Promise.all([N.loadMe(), N.poll()]); } catch (e) { } MP.repaint(); refreshGlow(); updateHud(); checkLM(false); }
  async function doTake() {
    if (busy || selCell < 0) return; const i = selCell; busy = true; $('cellGo').disabled = true;
    try {
      const before = N.holders(), res = await N.take(i); ev('take'); N.store('tk_seen', N.now()); lastTake = { i, t: N.now() };
      const after = N.holders(); res.lm = N.LM.find(l => after[l.id] === N.me.f && before[l.id] !== N.me.f) || null; checkLM(false);
      const p = MP.screenOf(i); MP.repaint(); MP.flash(i, '#ffe08a', 1300); refreshGlow(); updateHud(); showCell(-1);
      if (TK.fx) TK.fx('take', p.x, p.y + 20);
      if (res.rice) { const L = N.me.f; toast(t('tk_rice', { n: N.rice[L] || 0, m: N.morale(L), w: Math.round(N.baseWait(L) / 60000) }), 4200); }
      if (G.gsap) gsap.fromTo('#map', { x: -7 }, { x: 0, duration: 0.5, ease: 'elastic.out(1.2,0.25)' });
      try { navigator.vibrate && navigator.vibrate([30, 40, 60]); } catch (e) { }
      await sleep(1250); await showTaken(res); checkEnd();
    } catch (e) {
      if (e && (e.code === 'PERMISSION_DENIED' || e.code === 'BAD_REQUEST')) {
        // 先をこされた。10秒以内なら「同時」：マスの少ない陣営が勝つ（同じ数ならくじ）。負けても一手を失う
        await refreshAll(); showCell(-1); let done = false;
        try {
          if (N.me && N.cells[i] !== N.me.f && await N.clashing(i)) {
            const foe = TK.FI[N.cells[i]];
            if (N.canTake(i).ok) { try { const res = await N.take(i); done = true; lastTake = { i, t: N.now() }; MP.repaint(); MP.flash(i, '#ffe08a', 1300); refreshGlow(); updateHud(); checkLM(false); toast(t('clash_win'), 2600); await sleep(1500); await showTaken(res); checkEnd(); } catch (e2) { if (!(e2 && (e2.code === 'PERMISSION_DENIED' || e2.code === 'BAD_REQUEST'))) throw e2; } }
            if (!done) { await N.lose(i).catch(() => { }); done = true; MP.flash(i, '#8a8d93', 1300); updateHud(); refreshGlow(); toast(t('clash_lose', { army: foe ? TK.army(foe) : '' }), 5000); if (TK.fx) { const p = MP.screenOf(i); TK.fx('dark', p.x, p.y + 30); } }
          }
        } catch (e3) { }
        if (!done) {
          toast(t('tk_fail'));
          // 覚えていた地図がずれていて取れないこともあるので、地図をまるごと読みなおす（1分に1回まで。11/24）
          if (!(doTake.fullAt > Date.now() - 60000)) { doTake.fullAt = Date.now(); N.fullCells().then(() => { MP.repaint(); refreshGlow(); updateHud(); checkLM(false); }).catch(() => { }); }
        }
      }
      else if (e && e.why) { showCell(i); } else toast(t('net_err'));
    }
    busy = false; $('cellGo').disabled = false;
  }
  // ---------- マスを取ったあとの画面（結果画面） ----------
  let tkCanvas = null, tkText = '';
  async function showTaken(res) {
    const me = N.me, f = TK.FI[me.f], pf = TK.FI[res.prev] || null, p = TK.kuni(M.prov[res.i]), n = N.s.n[f.L] || res.n, r = rankOf(f.L);
    const lmT = res.lm ? t('tk_lm', { name: TK.L(res.lm.n) }) : '';
    $('tkTitle').textContent = lmT || t(pf ? 'tk_title' : 'tk_titlew', { p }); $('tkFrom').hidden = !pf; if (pf) $('tkFrom').textContent = t('tk_from', { name: TK.fname(pf) });
    $('tkCount').textContent = t('tk_count', { name: TK.fname(f), n, r });
    const at = new Date(Date.now() + N.wait()); $('tkNext').textContent = t('tk_next', { t: at.getHours() + ':' + String(at.getMinutes()).padStart(2, '0') }); $('tkMsg').textContent = '';
    const who = TK.who(me.n, me.h, me.r);
    tkText = res.lm ? t('sh_lm', { army: TK.army(f), name: TK.L(res.lm.n), who }) : pf ? t('sh_take', { army: TK.army(f), who, p, from: TK.fname(pf), n, r }) : t('sh_takew', { army: TK.army(f), who, p, n, r });
    tkCanvas = await card({ f, title: lmT || t(pf ? 'tk_title' : 'tk_titlew', { p }), sub: [who, t('tk_count', { name: TK.fname(f), n, r })], focus: res.i, z: 30, big: 56 });
    const cv = $('tkImg'), c = cv.getContext('2d'); c.drawImage(tkCanvas, 0, 0, cv.width, cv.height);
    $('taken').hidden = false; $('taken').scrollTop = 0;
    if (G.gsap) { gsap.fromTo('#taken', { opacity: 0 }, { opacity: 1, duration: 0.3 }); gsap.fromTo('#taken .card', { y: 50, scale: 0.94 }, { y: 0, scale: 1, duration: 0.5, ease: 'back.out(1.5)' }); }
    if (TK.fx) setTimeout(() => { TK.fx('confetti', innerWidth / 2, innerHeight * 0.5); if (res.lm && TK.fireworks) TK.fireworks(3); }, 250);
  }
  async function enterGame(fresh) {
    show('game'); scene('off'); $('loading').classList.remove('off'); $('loading').textContent = t('loading');
    if (!mapInit) { MP.init($('map'), (i) => { if (!$('panel').hidden) return; showCell(i); }); mapInit = true; }
    let events = [];
    try { await N.loadState(); if (!N.me && !N.fake && (N.store('tk_auth') || {}).rt) await N.loadMe().catch(() => { }); events = await N.loadCells(); } catch (e) { toast(t('net_err'), 6000); if (!N.cells) N.cells = M.own.split(''); }
    MP.resize(); MP.repaint(); wasReady = null; refreshGlow(); updateHud(); setTimeout(() => checkLM(false), 1800);
    if (N.me) MP.focusFaction(N.me.f, 0); else MP.fit(0);
    $('loading').classList.add('off');
    if (fresh && N.me && G.gsap) { const z = MP.view.z; MP.view.z = z * 0.45; MP.go(MP.view.x, MP.view.y, z, 1.6); }
    if (N.me) N.ping().then(() => tick());
    clearInterval(pollT); pollAt = Date.now(); pollT = setInterval(() => { if (Date.now() - pollAt >= N.pollSec() * 1000 - 500) { pollAt = Date.now(); poll(); } }, 5000);
    // 留守の間の戦況
    const seen = N.store('tk_seen'); lastSeenLog = N.lastT;
    if (N.me && seen && events.length) { const my = N.me.f; let gain = 0, lost = 0; const by = {}; for (const e of events) { if (e.y !== 't' || e.t <= seen) continue; if (e.f === my) gain++; else if (e.p === my) { lost++; by[e.f] = (by[e.f] || 0) + 1; } } if (gain + lost > 0) openPanel('away', { gain, lost, by }); }
    N.store('tk_seen', N.now());
    checkEnd();
  }
  async function poll() {
    if (scr !== 'game' || document.hidden) return;
    try { const list = await N.poll(); let ch = false; for (const e of list) { if (e.reload) { ch = true; continue; } if (e.y === 't') { ch = true; MP.flash(+e.c, '#fff', 1100); if (lastTake && N.me && +e.c === lastTake.i && e.f !== N.me.f && e.t - lastTake.t < 15000 && TK.FI[e.f]) { toast(t('clash_lost', { army: TK.army(TK.FI[e.f]) }), 5000); lastTake = null; } } newLog++; } if (ch) { MP.repaint(); refreshGlow(); checkLM(false); } updateHud(); if (selCell >= 0 && !$('cell').hidden) showCell(selCell); N.store('tk_seen', N.now()); checkEnd(); } catch (e) { }
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && scr === 'game') poll(); });

  // ---------- 巻物（勢力・軍議・戦況・寝返り・その他） ----------
  let pKind = '', bdRoom = '', bdT = 0, bdLast = 0, bdSeen = new Set();
  function openPanel(kind, arg) {   // 下のボタンから開く画面だけ、一番上に広告の帯（data-ad）
    pKind = kind; clearInterval(bdT); if (['power', 'sites', 'sched', 'board', 'log', 'defect', 'more'].includes(kind)) $('panel').dataset.ad = '1'; else delete $('panel').dataset.ad; const T = $('pTitle'), B = $('pBody'), F = $('pFoot'), TB = $('pTabs'); B.innerHTML = ''; F.innerHTML = ''; TB.innerHTML = ''; B.scrollTop = 0;
    const me = N.me;
    if (kind === 'power' || kind === 'sites' || kind === 'sched') {
      T.textContent = t('nav_power'); [['power', t('nav_power')], ['sched', t('fs_tab')], ['sites', t('lm_tab') + '（' + N.LM.length + '）']].forEach(([k, nm]) => { const b = document.createElement('button'); b.textContent = nm; b.className = k === kind ? 'on' : ''; b.onclick = () => openPanel(k); TB.appendChild(b); });
    }
    if (kind === 'sched') {
      const d = N.dayStart(), hs = N.sched[d], now = N.now();
      let h = `<p class="note">${esc(t('fs_note'))}</p>` + (me && N.isGk(me.f) ? `<p class="note" style="color:var(--shu2);font-weight:800">${esc(t('gk_note'))}</p>` : '');
      if (!hs) { h += `<p class="note">${esc(t('fs_none'))}</p>`; N.loadSched().then(x => { if (x && pKind === 'sched') openPanel('sched'); }); }
      else for (let i = 0; i < 24; i++) {
        const L = hs[i], a = d + i * 3600000, f = TK.FI[L], cur = now >= a && now < a + 3600000, past = now >= a + 3600000;
        const x2 = ((N.day[d] || {}).x || {})[i], f2 = x2 && TK.FI[x2];
        if (L === '-' && f2) { h += `<div class="fsRow${cur ? ' cur' : ''}${past ? ' past' : ''}${me && me.f === x2 ? ' me' : ''}"><b>${esc(fsH(i))}〜${esc(fsH(i + 1))}</b><canvas width="60" height="60" data-c="${x2}"></canvas><span>${esc(TK.army(f2))}<br><small>${esc(t('fs_x', { name: TK.fname(f2) }))}</small></span><em>${esc(me && me.f === x2 ? gkTxt(t('fs_2')) : t('fs_2'))}</em></div>`; continue; }
        if (L === '!') { h += `<div class="fsRow${cur ? ' cur' : ''}${past ? ' past' : ''} me"><b>${esc(fsH(i))}〜${esc(fsH(i + 1))}</b><i>⚔</i><span>${esc(t('fs_final'))}</span><em>${esc(gkTxt(t('fs_2')))}</em></div>`; continue; }
        if (L === '-') { h += `<div class="fsRow nr${cur ? ' cur' : ''}${past ? ' past' : ''}"><b>${esc(fsH(i))}〜${esc(fsH(i + 1))}</b><i>・</i><span>${esc(t('fs_norm'))}</span><em>${esc(t('fs_60'))}</em></div>`; continue; }
        h += `<div class="fsRow${cur ? ' cur' : ''}${past ? ' past' : ''}${me && (me.f === L || me.f === x2) ? ' me' : ''}"><b>${esc(fsH(i))}〜${esc(fsH(i + 1))}</b>${f ? `<canvas width="60" height="60" data-c="${L}"></canvas><span>${esc(TK.fname(f))}${f2 ? '<br><small>' + esc(t('fs_x', { name: TK.fname(f2) })) + '</small>' : ''}</span><em>${esc(me && (me.f === L || me.f === x2) ? gkTxt(t('fs_2')) : t('fs_2'))}</em>` : `<i>⚡</i><span>${esc(t('fs_all'))}</span><em>${esc(gkTxt(t('fs_5')))}</em>`}</div>`;
      }
      B.innerHTML = h; B.querySelectorAll('canvas[data-c]').forEach(c => drawCrest(c, TK.FI[c.dataset.c]));
      const c = B.querySelector('.fsRow.cur'); if (c) setTimeout(() => c.scrollIntoView({ block: 'center' }), 30);
    } else if (kind === 'sites') {
      let h = `<p class="note">${esc(t('lm_note'))}</p>`;
      N.LM.forEach((lm, k) => { const hd = N.holder(lm); h += `<div class="lmRow" data-k="${k}"><canvas width="102" height="102" data-b="${k}"></canvas><div class="nm">${esc(TK.L(lm.n))}<small>${esc(TK.kuni(M.prov[lm.c[0]]))}・${esc(t('cells', { n: lm.c.length }))}</small></div><div class="st${hd ? '' : ' no'}">${hd ? `<canvas width="72" height="72" data-c="${hd}"></canvas>` : ''}${esc(hd ? TK.fname(TK.FI[hd]) : lmStatus(lm))}</div></div>`; });
      B.innerHTML = h; B.querySelectorAll('canvas[data-b]').forEach(c => { const lm = N.LM[+c.dataset.b]; c.getContext('2d').drawImage(TK.badge(lm.k, 102, lm.id === 'azuchi'), 0, 0); }); B.querySelectorAll('canvas[data-c]').forEach(c => drawCrest(c, TK.FI[c.dataset.c]));
      B.querySelectorAll('.lmRow').forEach(r => r.onclick = () => { closePanel(); MP.focusLM(N.LM[+r.dataset.k]); });
    } else if (kind === 'power') {
      const list = sortedF(), top = N.s.n[list[0].L] || 0;
      let h = `<div class="pwTop"><span>${esc(t('pw_half'))}</span><span>${top} / ${TK.HALF}</span></div><div class="pwBar"><i style="width:${Math.min(100, top / TK.HALF * 100).toFixed(1)}%;background:${list[0].col}"></i></div><div class="pwTop"><span>${esc(N.ended() ? t('t_ended') : t('t_until', { t: TK.dur(TK.END - N.now()) }))}</span><span>${esc(t('pw_white', { n: N.s.n.w || 0 }))}</span></div>`;
      list.forEach((f, k) => { const n = N.s.n[f.L] || 0; h += `<div class="pw${me && me.f === f.L ? ' me' : ''}" data-l="${f.L}"><span class="r">${rankOf(f.L)}</span><canvas width="90" height="90" data-c="${f.L}"></canvas><div class="nm">${esc(N.mg() ? TK.army(f) : TK.fname(f))}<small>${N.mg() ? esc(t('pw_with', { list: TK.F.filter(x => N.mg()[x.L] === f.L && x.L !== f.L).map(x => TK.fname(x)).join('・') })) + '<br>' : ''}${esc(t('pw_members', { n: N.s.m[f.L] || 0 }))}${N.riceDay === N.dayStart() ? '・' + esc(t('hud_rice', { n: N.rice[f.L] || 0, m: N.morale(f.L) })) : ''}</small><div class="bar"><i style="width:${Math.min(100, n / Math.max(1, top) * 100).toFixed(1)}%;background:${f.col}"></i></div></div><span class="n">${n}<small>${esc(t('cells', { n: '' }).trim())}</small></span></div>`; });
      // 三つ巴（11/24）：与力の手柄番付（まとまったあとに取ったマスを、家ごとに数える。1時間ごと）
      if (N.mg()) { const g = N.mg(), hk = N.s.hk || {}, ys = TK.F.filter(f => g[f.L] && g[f.L] !== f.L).sort((a, b) => (hk[b.L] || 0) - (hk[a.L] || 0) || a.i - b.i);
        h += `<h3 class="pwH">${esc(t('pw_yoriki'))}</h3><p class="note">${esc(t('pw_yoriki_n'))}</p>`;
        ys.forEach((f, k) => { h += `<div class="pw yr${me && me.h === f.L ? ' me' : ''}" data-l="${g[f.L]}"><span class="r">${k + 1}</span><canvas width="90" height="90" data-c="${f.L}"></canvas><div class="nm">${esc(TK.fname(f))}<small>${esc(TK.army(TK.FI[g[f.L]]))}</small></div><span class="n">${hk[f.L] || 0}<small>${esc(t('cells', { n: '' }).trim())}</small></span></div>`; }); }
      B.innerHTML = h; B.querySelectorAll('canvas').forEach(c => drawCrest(c, TK.FI[c.dataset.c])); B.querySelectorAll('.pw').forEach(r => r.onclick = () => { closePanel(); MP.focusFaction(r.dataset.l); });
    } else if (kind === 'board') {
      T.textContent = t('nav_board'); const rooms = me ? [[me.f, t('bd_mine', { name: TK.fname(TK.FI[me.f]) })], ['all', t('bd_all')]] : [['all', t('bd_all')]];
      if (!rooms.some(r => r[0] === bdRoom)) bdRoom = rooms[0][0]; if (arg && arg.room) bdRoom = arg.room;
      rooms.forEach(([r, nm]) => { const b = document.createElement('button'); b.textContent = nm; b.className = r === bdRoom ? 'on' : ''; b.onclick = () => { bdRoom = r; openPanel('board'); }; TB.appendChild(b); });
      B.innerHTML = `<p class="note">${esc(bdRoom === 'all' ? '' : t('bd_only'))}</p><div id="bdPin"></div><div id="bdList"><p class="note">${esc(t('loading'))}</p></div>`;
      if (N.boardClosed()) F.innerHTML = `<p class="note" style="margin:0">${esc(t('bd_closed'))}</p>`;
      else if (me) { F.innerHTML = `<div class="bdIn"><input id="bdM" maxlength="100" placeholder="${esc(t('bd_ph'))}" enterkeyhint="send"><button id="bdS" class="btn main">${esc(t('bd_send'))}</button></div>`; const send = async () => { const v = $('bdM').value; if (!v.trim()) return; $('bdS').disabled = true; try { await N.post(bdRoom, v); $('bdM').value = ''; await loadBoard(true); } catch (e) { toast(e && (e.code === 'PERMISSION_DENIED' || e.code === 'BAD_REQUEST') ? t('bd_wait') : t('net_err')); } $('bdS').disabled = false; }; $('bdS').onclick = send; $('bdM').onkeydown = e => { if (e.key === 'Enter' && !e.isComposing) send(); }; }
      else F.innerHTML = `<p class="note" style="text-align:center">${esc(t('bd_need'))}</p>`;
      bdLast = 0; loadBoard(true); bdT = setInterval(() => loadBoard(false), 30000);
    } else if (kind === 'log') {
      T.textContent = t('nav_log'); B.innerHTML = `<p class="note">${esc(t('loading'))}</p>`; newLog = 0; updateHud();
      N.recent(60).then(list => { if (pKind !== 'log') return; if (!list.length) { B.innerHTML = `<p class="note">${esc(t('lg_empty'))}</p>`; return; } const now = N.now(); B.innerHTML = list.reverse().map(e => { const f = TK.FI[e.f], pf = TK.FI[e.p], who = '<b>' + esc(ichi(e.u) + TK.who(e.n, e.h, e.r)) + '</b>'; const txt = e.y === 'f' ? t('lg_fail', { who, p: esc(TK.kuni(M.prov[+e.c])), to: esc(pf ? TK.fname(pf) : '') }) : e.y === 'd' ? t('lg_defect', { who, from: esc(pf ? TK.fname(pf) : ''), to: esc(TK.fname(f)) }) : pf ? t('lg_take', { who, p: esc(TK.kuni(M.prov[+e.c])), from: esc(TK.fname(pf)) }) : t('lg_takew', { who, p: esc(TK.kuni(M.prov[+e.c])) }); const lmK = e.k && N.LM.find(l => l.id === e.k), lmX = e.x && N.LM.find(l => l.id === e.x); let ex = '';
        if (lmK && f) ex += `<div class="lg lm" data-c="${+e.c}"><i style="background:${f.col}"></i><div>${t('lg_lm', { army: esc(TK.army(f)), name: '<b>' + esc(TK.L(lmK.n)) + '</b>' })}</div><span>${esc(TK.ago(e.t, now))}</span></div>`;
        if (lmX && pf) ex += `<div class="lg lmx" data-c="${+e.c}"><i style="background:${pf.col}"></i><div>${t('lg_lmx', { army: esc(TK.army(pf)), name: '<b>' + esc(TK.L(lmX.n)) + '</b>' })}</div><span>${esc(TK.ago(e.t, now))}</span></div>`;
        return ex + `<div class="lg" data-c="${e.y === 'd' ? -1 : +e.c}"><i style="background:${f ? f.col : '#fff'}"></i><div>${txt}</div><span>${esc(TK.ago(e.t, now))}</span></div>`; }).join(''); B.querySelectorAll('.lg').forEach(r => r.onclick = () => { const c = +r.dataset.c; if (c >= 0) { closePanel(); MP.focusCell(c, 18); MP.flash(c, '#fff', 1500); } }); }).catch(() => { B.innerHTML = `<p class="note">${esc(t('net_err'))}</p>`; });
    } else if (kind === 'defect') {
      T.textContent = t('nav_defect'); let h = `<p>${esc(t(N.s.nodf ? 'df_off' : 'df_body'))}</p>`;
      if (N.s.nodf) { }   // 三つ巴（11/24）：寝返りの受付はおしまい
      else if (!me) h += `<p class="note">${esc(t('why_nome'))}</p>`; else if (N.ended()) h += `<p class="note">${esc(t('t_ended'))}</p>`;
      else if (N.s.stop) h += `<p class="note">${esc(t('prep'))}</p>`;
      else { const w = N.defectWait(), weak = N.weakest().filter(L => L !== me.f); if (w > 0) h += `<p style="font-weight:800;color:var(--shu2)">${esc(t('df_wait', { t: TK.dur(w) }))}</p>`; h += `<p class="note" style="margin-top:12px">${esc(t('df_to'))}</p>`; if (!weak.length) h += `<p style="font-weight:800">${esc(t('df_none'))}</p>`; for (const L of weak) { const f = TK.FI[L]; h += `<div class="dfTo"><canvas width="114" height="114" data-c="${L}"></canvas><b>${esc(TK.fname(f))}<br><small style="font-weight:500;color:var(--sub)">${esc(t('cells', { n: N.s.n[L] || 0 }))}</small></b>${w > 0 ? '' : `<button class="btn" data-go="${L}">${esc(t('df_yes'))}</button>`}</div>`; } }
      B.innerHTML = h; B.querySelectorAll('canvas').forEach(c => drawCrest(c, TK.FI[c.dataset.c]));
      B.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { const f = TK.FI[b.dataset.go]; B.innerHTML = `<p style="font-family:var(--ft);font-size:20px;line-height:1.6;text-align:center;margin:18px 0">${esc(t('df_sure', { name: TK.fname(f) }))}</p>`; F.innerHTML = `<div class="row2"><button class="btn" id="dfN">${esc(t('df_no'))}</button><button class="btn main" id="dfY">${esc(t('df_yes'))}</button></div>`; $('dfN').onclick = () => openPanel('defect'); $('dfY').onclick = async () => { $('dfY').disabled = true; try { await N.defect(f.L); ev('defect'); closePanel(); showReveal(f, 'defect'); } catch (e) { await refreshAll(); toast(e && (e.code === 'PERMISSION_DENIED' || e.code === 'BAD_REQUEST') ? t('tk_fail') : t('net_err')); openPanel('defect'); } }; });
    } else if (kind === 'more') {
      T.textContent = t('nav_more'); const items = [['mr_me', () => { closePanel(); if (N.me) MP.focusFaction(N.me.f); }, !!me], ['mr_fit', () => { closePanel(); MP.fit(); }, true], ['how', () => openPanel('how'), true], ['mr_share', shareState, true], ['mr_lang', () => openPanel('lang'), true], ['pd_btn', () => openPanel('pred'), true], ['askbtn', () => openPanel('ask'), true], ['mr_title', () => { closePanel(); show('title'); scene('title'); renderTitle(); }, true], ['mr_home', () => { location.href = 'https://nasubi-no-oniwa.github.io/'; }, true]];
      const d = document.createElement('div'); d.className = 'menu'; for (const [k, fn, on] of items) { if (!on) continue; const b = document.createElement('button'); b.className = 'btn sm'; b.textContent = t(k); b.onclick = fn; d.appendChild(b); } B.appendChild(d); B.insertAdjacentHTML('beforeend', '<p class="note" id="mrMsg" style="margin-top:10px"></p>');
    } else if (kind === 'pred') {
      // 天下人予想（11/26〜11/29 24時）：1人1回。当てた人の名前はエンドロールに流れる
      T.textContent = t('pd_btn'); B.innerHTML = `<p>${esc(t('pd_note'))}</p><div id="pdBox"><p class="note">${esc(t('loading'))}</p></div>`;
      N.myPred().then(p => { const box = $('pdBox'); if (!box || pKind !== 'pred') return;
        if (p && p.f) { box.innerHTML = `<p style="font-family:var(--ft);font-size:22px;text-align:center;margin:14px 0">${esc(t('pd_done', { army: TK.army(TK.FI[p.f]) }))}</p><button class="btn main" id="pdX">${esc(t('x_post'))}</button>`; $('pdX').onclick = () => postX(t('pd_x', { army: TK.army(TK.FI[p.f]) })); return; }
        if (!me) { box.innerHTML = `<p class="note">${esc(t('pd_need'))}</p>`; return; }
        if (N.now() >= N.PREDEND || N.ended() || !N.mg()) { box.innerHTML = `<p class="note">${esc(t('pd_closed'))}</p>`; return; }
        box.innerHTML = N.armies().map(L => `<button class="btn" data-pd="${L}" style="width:100%;margin:6px 0;border-left:8px solid ${TK.FI[L].col}">${esc(t('pd_go', { army: TK.army(TK.FI[L]) }))}</button>`).join('');
        box.querySelectorAll('[data-pd]').forEach(b => b.onclick = async () => { const L = b.dataset.pd; if (!confirm(t('pd_sure', { army: TK.army(TK.FI[L]) }))) return;
          try { await N.predict(L); ev('predict', { army: L }); openPanel('pred'); } catch (e) { toast(t('net_err')); } });
      });
    } else if (kind === 'how') {
      T.textContent = t('how'); B.innerHTML = '<ol class="how">' + (N.mg() ? [1, 11, 2, 9, 10, 8, 3, 4, 7, 5, 6] : [1, 2, 9, 10, 8, 3, 4, 7, 5, 6]).map(i => '<li>' + esc(t(i === 5 && N.s.nodf ? 'df_off' : 'how' + i, { n: N.mg() ? 20 : 40 })) + '</li>').join('') + '</ol>';
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
  function closePanel() { clearInterval(bdT); $('panel').hidden = true; delete $('panel').dataset.ad; pKind = ''; }
  // 掲示板：新しい書きこみが一番上。なすPのお知らせ（時間割から作るもの）も同じ流れに混ぜる。ピン止めは一番上に固定
  const bdMsg = (e, room, now, pin) => { const f = TK.FI[e.f], d = document.createElement('div'); d.className = 'msg' + (e.g ? ' gm' : '') + (pin ? ' pin' : ''); d.innerHTML = `<div class="h">${pin ? '<em>📌</em>' : ''}${e.g ? '' : `<i style="background:${f ? f.col : '#999'}"></i>`}<b>${e.g ? esc(t('gm')) : esc(ichi(e.u) + TK.who(e.n, e.h, e.r))}</b>${!e.g && f && room === 'all' ? esc(TK.army(f)) : ''}<span>${esc(TK.ago(e.t, now))}</span></div><p>${esc(e.m)}</p>`; return d; };
  async function loadBoard(first) {
    if (pKind !== 'board') return; const room = bdRoom;
    try {
      const [raw, pins] = await Promise.all([N.board(room, first ? 0 : bdLast), first || !(loadBoard.pt > Date.now() - 120000) ? N.pins(room).catch(() => null) : Promise.resolve(undefined)]);
      if (pKind !== 'board' || room !== bdRoom) return; const box = $('bdList'), pb = $('bdPin'); if (!box) return;
      const now = N.now();
      if (first) bdSeen = new Set();
      if (pins !== undefined) loadBoard.pins = pins || [];
      // ピン止めと、今日の時間割のお知らせ（0時に出るもの）は、一番上に固定する
      // 一番上に固定：今日の早取りの時間割（画面が作る）→ 管理人のピン止め（一番槍・天下統一の決まり）。決戦地と米俵のお知らせは流れの中へ（11/25）
      const top = sysPosts(room).filter(e => e.id === 'd' + N.dayStart()).concat((loadBoard.pins || []).slice().sort((x, y) => y.t - x.t));
      const tk = top.map(e => e.id).join();
      if (pb && (first || tk !== pb.dataset.k)) { loadBoard.pt = pins !== undefined ? Date.now() : loadBoard.pt; pb.dataset.k = tk; pb.innerHTML = ''; top.forEach(e => pb.appendChild(bdMsg(e, room, now, true))); }
      const sys = sysPosts(room).filter(e => e.id !== 'd' + N.dayStart() && !bdSeen.has(e.id));
      const list = raw.filter(e => first || e.t > bdLast).concat(sys).sort((x, y) => y.t - x.t);   // 新しい順
      if (first) box.innerHTML = list.length ? '' : `<p class="note">${esc(t('bd_empty'))}</p>`; else if (list.length && box.querySelector('.note')) box.innerHTML = '';
      const frag = document.createDocumentFragment();
      for (const e of list) { frag.appendChild(bdMsg(e, room, now)); if (e.sys) bdSeen.add(e.id); else bdLast = Math.max(bdLast, e.t); }
      if (first) box.appendChild(frag);
      else if (list.length) { box.insertBefore(frag, box.firstChild); }   // 新しいものは上に足す（順番が前後したときも、上に出る）
      if (first) $('pBody').scrollTop = 0;
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
    const win = N.winners().map(L => TK.FI[L]), f = win[0], half = !!(N.endOK() && (N.s.end.k === 'day' || N.s.end.k === 'gm')), names = win.map(TK.fname).join('・');
    $('enT').textContent = half ? t('en_title') : t('t_ended'); $('enT').style.fontSize = half ? '' : 'clamp(28px, 9vw, 50px)'; $('enT').style.letterSpacing = half ? '' : '.08em'; const byKey = !half && N.KEY && N.cells && N.holder(N.KEY) === f.L, enKey = half ? 'en_half' : byKey ? 'en_key' : 'en_time';
    $('enS').textContent = t(enKey, { name: names });
    $('enWin').hidden = !(N.me && win.some(w => w.L === N.me.f)); $('enWin').textContent = t('en_win');
    const g = N.mg(), hk = N.s.hk || {}, best = g ? TK.F.filter(x => g[x.L] === f.L && x.L !== f.L && (hk[x.L] || 0) > 0).sort((a, b) => (hk[b.L] || 0) - (hk[a.L] || 0))[0] : null;
    $('enList').innerHTML = (best ? `<p class="enYr">${esc(t('en_yoriki', { name: TK.fname(best), n: hk[best.L] }))}</p>` : '') + sortedF().slice(0, 5).map(x => `<div class="pw"><span class="r">${rankOf(x.L)}</span><canvas width="90" height="90" data-c="${x.L}"></canvas><div class="nm">${esc(TK.fname(x))}</div><span class="n">${N.s.n[x.L] || 0}</span></div>`).join(''); $('enList').querySelectorAll('canvas').forEach(c => drawCrest(c, TK.FI[c.dataset.c]));
    $('taken').hidden = true; closePanel(); showCell(-1); $('endscr').hidden = false; $('map').hidden = true; $('game').hidden = true; scene('banner', { f, gold: 1 });
    if (G.gsap) { gsap.fromTo('#enT', { opacity: 0, scale: 2.2 }, { opacity: 1, scale: 1, duration: 0.9, ease: 'power4.out' }); gsap.fromTo('#enS', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, delay: 0.7 }); gsap.fromTo('.enbox', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.6, delay: 1.2 }); }
    if (TK.fireworks) TK.fireworks(6);
    enCanvas = await card({ f, title: half ? t('en_title') : t('t_ended'), sub: [t(enKey, { name: names }), t('cells', { n: N.s.n[f.L] || 0 })], big: 76 });
    ev('end_view');
    // エンドロール：元ができていればボタンを出し、はじめて終わりの画面を見たときは一度だけ自動で流す
    N.loadReplay().then(rp => { if (!rp) return; rollRp = rp; $('enRoll').hidden = false; if (!N.store('tk_roll') || /[?&]roll=1/.test(location.search)) { N.store('tk_roll', 1); setTimeout(playRoll, 2200); } }).catch(() => { });
  }
  // ---------- エンドロール（11/25）：地図の移り変わりを約60秒で早送り → 名前を流す ----------
  let rollRp = null, rollOn = false;
  async function playRoll() {
    const rp = rollRp; if (!rp || rollOn) return; rollOn = true;
    const R = $('roll'), C = $('rollC'), x = C.getContext('2d'), fr = rp.f.split('|'), real = N.cells.slice(), st = M.own.split('');
    R.hidden = false; $('rollCr').style.opacity = 0; $('rollIn').style.transition = 'none'; $('rollIn').style.transform = ''; $('rollCap').style.opacity = 0; $('rollD').style.opacity = 1;
    const dpr = Math.min(2, G.devicePixelRatio || 1); C.width = innerWidth * dpr; C.height = innerHeight * dpr;
    let stop = false; const end = () => { stop = true; };
    $('rollX').onclick = () => { stop = true; finish(); };
    const draw = () => {
      N.cells = st; MP.repaint(); const b = MP.base(); N.cells = real;
      const w = C.width, h = C.height; x.fillStyle = '#0b1118'; x.fillRect(0, 0, w, h);
      const k = b.width / M.W, sx = bb[0] * k, sy = bb[1] * k, sw = (bb[2] - bb[0]) * k, sh = (bb[3] - bb[1]) * k, z = Math.min(w * 0.96 / sw, h * 0.8 / sh);
      x.imageSmoothingQuality = 'high'; x.drawImage(b, sx, sy, sw, sh, (w - sw * z) / 2, (h - sh * z) / 2 + h * 0.02, sw * z, sh * z);
    };
    const bb = [1e9, 1e9, 0, 0]; for (let i = 0; i < M.n; i++) { const cx = M.cells[2 * i], cy = M.cells[2 * i + 1]; bb[0] = Math.min(bb[0], cx); bb[1] = Math.min(bb[1], cy); bb[2] = Math.max(bb[2], cx + 1); bb[3] = Math.max(bb[3], cy + 1); }   // 陸のある範囲だけを大きく出す
    const apply = s => { for (let j = 0; j + 3 < s.length; j += 4) st[parseInt(s.substr(j, 3), 36)] = s[j + 3]; };
    const dt = 90000 / Math.max(1, fr.length), J = 9 * 3600000;
    const label = f => { const d = new Date(rp.t0 + (f + 1) * rp.hr + J); $('rollD').textContent = t('roll_date', { m: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours() }); $('rollBar').firstChild.style.width = ((f + 1) / fr.length * 100).toFixed(1) + '%'; };
    let t0 = performance.now(), drawn = 0;
    for (let f = 0; f < fr.length && !stop; f++) {
      apply(fr[f]); const due = t0 + (f + 1) * dt;
      if (performance.now() > due && f !== rp.mi && f < fr.length - 1 && performance.now() - drawn < 400) continue;   // 遅れているコマは描かずに先へ（約60秒に合わせる）
      label(f); draw(); drawn = performance.now();
      if (f === rp.mi) { $('rollCap').textContent = t('roll_mitsu'); if (G.gsap) gsap.fromTo('#rollCap', { opacity: 0, scale: 1.6 }, { opacity: 1, scale: 1, duration: .6, ease: 'power3.out' }); else $('rollCap').style.opacity = 1; await sleep(1800); t0 += 1800; if (G.gsap) gsap.to('#rollCap', { opacity: 0, duration: .5 }); else $('rollCap').style.opacity = 0; }
      const wait = due - performance.now(); if (wait > 0) await sleep(wait);
    }
    if (stop) return;
    await sleep(1200); credits();
    function credits() {
      const g = N.mg(), hk = N.s.hk || {}, win = N.winners().map(L => TK.FI[L]).filter(Boolean), W0 = win[0];
      let h = `<p class="big" style="font-size:16px;letter-spacing:.3em;color:#c9a44c">${esc(t('roll_win'))}</p><h2>${esc(win.map(f => g ? TK.army(f) : TK.fname(f)).join('・'))}</h2><small>${esc(W0 ? t('cells', { n: N.s.n[W0.L] || 0 }) : '')}</small>`;
      if (g) { h += `<h3>${esc(t('roll_armies'))}</h3>`; for (const L of N.armies().sort((a, b) => (N.s.n[b] || 0) - (N.s.n[a] || 0))) { const ys = TK.F.filter(f => g[f.L] === L && f.L !== L).map(TK.fname); h += `<p class="big" style="color:${TK.FI[L].col}">${esc(TK.army(TK.FI[L]))}</p><small>${esc(t('pw_with', { list: ys.join('・') }))}</small>`; }
        const best = W0 ? TK.F.filter(f => g[f.L] === W0.L && f.L !== W0.L && (hk[f.L] || 0) > 0).sort((a, b) => (hk[b.L] || 0) - (hk[a.L] || 0))[0] : null;
        if (best) h += `<h3>${esc(t('roll_best'))}</h3><p class="big">${esc(TK.fname(best))}</p><small>${esc(t('cells', { n: hk[best.L] }))}</small>`; }
      if (rp.top && rp.top.length) { h += `<h3>${esc(t('roll_top'))}</h3>`; rp.top.forEach((p, i) => { h += `<p class="tp"><b>${i + 1}</b>${esc(TK.who(p[0], p[1], false))}　${esc(t('cells', { n: p[3] }))}</p>`; }); }
      if (rp.pred && rp.pred.n) { h += `<h3>${esc(t('roll_pred', { n: rp.pred.n }))}</h3>`; rp.pred.names.forEach(p => { h += `<p class="tp">${esc(TK.who(p[0], p[1], false))}</p>`; }); if (rp.pred.n > rp.pred.names.length) h += `<small>${esc(t('roll_pred_more', { n: rp.pred.n - rp.pred.names.length }))}</small>`; }
      h += `<h3>${esc(t('roll_made'))}</h3><p class="big">なすびのお庭</p><h3 style="margin-top:90px;font-size:22px;letter-spacing:.2em;color:#fff5dc">${esc(t('roll_thx'))}</h3>`;
      const I = $('rollIn'); I.innerHTML = h; $('rollCr').style.transition = 'opacity 1s'; $('rollCr').style.opacity = 1; $('rollD').style.opacity = 0;
      const H2 = I.offsetHeight + innerHeight, sec = Math.max(25, Math.min(60, H2 / 45));
      requestAnimationFrame(() => { I.style.transition = `transform ${sec}s linear`; I.style.transform = `translateY(${-H2}px)`; });
      setTimeout(() => { if (!stop) finish(); }, sec * 1000 + 600);
    }
    function finish() { R.hidden = true; rollOn = false; N.cells = real; MP.repaint(); $('rollIn').style.transition = 'none'; }
  }
  const endText = () => { const f = TK.FI[N.winners()[0]]; return t('sh_end', { name: N.winners().map(L => TK.fname(TK.FI[L])).join('・'), n: N.s.n[f.L] || 0 }); };

  // ---------- 巻物（武将の功績）。最初は自分の陣営、上の家紋でほかの武将に切りかえ ----------
  let scL = null;
  const KD = '〇一二三四五六七八九';
  function scYear(y) {
    if (y == null) return '';
    const ap = typeof y === 'string' && y[0] === '~', n = String(y).replace('~', ''), lg = TK.lang();
    const kj = n.replace(/\d/g, d => KD[+d]);
    if (lg === 'ja') return kj + '年' + (ap ? 'ごろ' : '');
    if (lg === 'zh') return (ap ? '約' : '') + kj + '年';
    if (lg === 'ko') return n + '년' + (ap ? '경' : '');
    return (ap ? 'c. ' : '') + n;
  }
  function scLife(y) {
    const lg = TK.lang(), v = lg === 'ja' || lg === 'zh', f = n => n == null ? '？' : (v ? String(n).replace(/\d/g, d => KD[+d]) : String(n));
    return f(y[0]) + (v ? '〜' : '–') + f(y[1]);
  }
  // 巻物の中身は武将ごとのファイル（js/scroll/{記号}.js）。開いた武将の分だけ読みこむ
  function loadSc(L, cb) {
    if (TK.SC && TK.SC[L]) return cb();
    loadSc.q = loadSc.q || {}; if (loadSc.q[L]) { loadSc.q[L].push(cb); return; } loadSc.q[L] = [cb];
    const sc = document.createElement('script'); sc.src = 'js/scroll/' + L + '.js?v=4';
    const done = () => { const q = loadSc.q[L]; loadSc.q[L] = null; if (TK.SC && TK.SC[L]) q.forEach(f => f()); };
    sc.onload = done; sc.onerror = () => { loadSc.q[L] = null; sc.remove(); toast(TK.L(['読みこめませんでした。通信を確かめてください', 'Could not load. Check your connection.', '無法載入，請確認網路。', '불러오지 못했습니다. 통신을 확인해 주세요.']), 2000); };
    document.head.appendChild(sc);
  }
  function openScroll(L) {
    if (!$('scroll')) return;
    const to = L || (N.me && N.me.f) || scL || 'a';
    loadSc(to, () => {
      closePanel(); scL = to;
      $('scroll').hidden = false; renderScroll(true);
      if (G.gsap) gsap.fromTo('#scroll .maki', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' });
    });
  }
  function renderScroll(pickToo) {
    const P = $('scPick');
    if (pickToo || !P.children.length) {
      P.innerHTML = '';
      const order = TK.F.slice(); const mine = N.me && N.me.f;
      if (mine) order.sort((a, b) => (b.L === mine) - (a.L === mine));
      for (const f of order) {
        const b = document.createElement('button'); b.dataset.l = f.L; b.title = TK.L(f.nm); b.setAttribute('aria-label', TK.L(f.nm));
        if (f.L === mine) b.classList.add('me');
        const c = document.createElement('canvas'); c.width = 80; c.height = 80; drawCrest(c, f); b.appendChild(c);
        b.onclick = () => loadSc(f.L, () => { scL = f.L; renderScroll(false); if (G.gsap) gsap.fromTo('#scroll .kami', { opacity: 0.35 }, { opacity: 1, duration: 0.35 }); });
        P.appendChild(b);
      }
    }
    if (!TK.SC || !TK.SC[scL]) return;
    for (const b of P.children) b.classList.toggle('on', b.dataset.l === scL);
    const on = P.querySelector('.on'); if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'center' });
    const f = TK.FI[scL], d = TK.SC[scL], lg = TK.lang(), li = TK.langIndex(), B = $('scBody');
    const V = lg === 'ja' || lg === 'zh'; B.className = V ? 'v' : '';
    // 縦書きのときは、2〜3けたの数字は縦中横に、4けた以上は漢数字にする
    const vt = x => V ? String(x).split(/(\d+)/).map((p, i) => i % 2 ? (p.length >= 4 ? p.replace(/\d/g, c => KD[+c]) : `<span class="tcy">${p}</span>`) : esc(p)).join('') : esc(x);
    const secs = [];   // 目次：[見出しの言葉, id]
    if (d.bio) ['sc_c1', 'sc_c2', 'sc_c3', 'sc_c4'].forEach((k, i) => secs.push([t(k), 'scS' + i]));
    secs.push([t('sc_s'), 'scS4']); if (d.ep && d.ep.length) secs.push([t('sc_ep'), 'scS5']);
    let h = `<div class="maki"><i class="jiku"></i><div class="kami"><div class="mkHd"><canvas width="128" height="128"></canvas><div><div class="ttl">${esc(t('sc_title', { name: TK.L(f.nm) }))}</div><small>${esc(t('sc_home'))}：${esc(TK.L(f.home))}・${esc(TK.L(f.castle))}<br>${esc(scLife(d.y))}</small>${N.me && N.me.f === f.L ? `<span class="mine">${esc(t('sc_mine'))}</span>` : ''}</div></div>`;
    h += `<div class="mkTag">${vt(d.tag[li] || d.tag[0])}</div>`;
    h += `<div class="mkToc"><span>${esc(t('sc_toc'))}</span>${secs.map(([w, id], i) => `<button data-to="${id}"><i>${V ? KD[i + 1] : i + 1}</i>${esc(w)}</button>`).join('')}</div>`;
    if (d.bio) d.bio.forEach((c, i) => { h += `<div class="mkSec" id="scS${i}">${esc(t('sc_c' + (i + 1)))}</div>`; for (const para of String(c[li] || c[0]).split(/\n\n+/)) h += `<p class="bio">${vt(para)}</p>`; });
    h += `<div class="mkSec" id="scS4">${esc(t('sc_s'))}</div>`;
    for (const r of d.s) { const y = scYear(r[0]); h += `<div class="ev">${y ? `<b>${esc(y)}</b>` : '<b>◇</b>'}${vt(r[1 + li] || r[1])}</div>`; }
    if (d.ep && d.ep.length) { h += `<div class="mkSec" id="scS5">${esc(t('sc_ep'))}</div>`; for (const r of d.ep) h += `<div class="ev ep"><b>◆</b>${vt(r[li] || r[0])}</div>`; }
    h += '</div><i class="jiku"></i></div>';
    B.innerHTML = h; drawCrest(B.querySelector('.mkHd canvas'), f);
    B.querySelectorAll('.mkToc button').forEach(b => b.onclick = () => { const el = document.getElementById(b.dataset.to); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'start' }); });
    B.scrollTop = 0; B.scrollLeft = 0;
  }
  // ---------- ボタン ----------
  // 診断へ進んでよいか：true＝まだ仕えていない／false＝仕えている／null＝確かめられなかった（通信のせいで診断へ戻さない。11/24）
  async function needQuiz() {
    if (N.me) return false; if (N.fake || N.meOK || !(N.store('tk_auth') || {}).rt) return true;
    try { await Promise.race([N.loadMe(), sleep(10000).then(() => { throw new Error('timeout'); })]); } catch (e) { return null; }
    return !N.me;
  }
  let startBusy = false;
  $('bStart').onclick = async () => {
    if (N.me || N.ended()) return enterGame(); if (startBusy) return; startBusy = true;
    $('loading').textContent = t('loading'); $('loading').classList.remove('off');
    const r = await needQuiz(); $('loading').classList.add('off'); startBusy = false;
    if (r === null) { toast(t('net_err'), 5000); return; }
    if (r) startQuiz(); else { renderTitle(); enterGame(); }
  };
  $('keyBar').onclick = () => { if (N.KEY) MP.focusLM(N.KEY); };
  N.onRice = k => { const L = N.me.f; toast(t('tk_rice_own', { k, n: N.rice[L] || 0, m: N.morale(L), w: Math.round(N.baseWait(L) / 60000) }), 4500); MP.kick(); updateHud(); refreshGlow(); };
  $('fastBar').onclick = () => openPanel('sched');
  $('ksBar').onclick = () => { const dd = N.day[N.dayStart()], ks = dd && N.LM.find(l => l.id === dd.k); if (ks) MP.focusLM(ks); };
  $('bWatch').onclick = () => enterGame(); $('bHow').onclick = () => openPanel('how'); $('bLang').onclick = () => openPanel('lang'); $('bAsk').onclick = () => openPanel('ask');
  $('qBack').onclick = () => { if (qi > 0) { qi--; renderQ(); } else { show('title'); scene('title'); } };
  $('rvJoin').onclick = join; $('rvName').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.target.blur(); join(); } });
  $('rvX').onclick = () => postX(quizText(rvF)); $('rvXi').onclick = async () => postImg(await quizCard(rvF), quizText(rvF), $('rvMsg'), 'tenkatori_' + rvF.L);
  $('rvGo').onclick = () => enterGame(true);
  $('hudMe').onclick = async () => { if (N.me) return MP.focusFaction(N.me.f); if (N.ended() || N.s.stop) return; const r = await needQuiz(); if (r === null) toast(t('net_err'), 5000); else if (r) startQuiz(); else { updateHud(); refreshGlow(); MP.focusFaction(N.me.f); } };
  const setLM = on => { MP.showLM = on; $('zLm').className = on ? '' : 'off'; N.store('tk_lmui', on ? 1 : 0); MP.kick(); };
  $('zLm').onclick = () => { setLM(!MP.showLM); toast(TK.L(MP.showLM ? ['名所の札を出しました', 'Site labels on', '已顯示名所標示', '명소 표시를 켰습니다'] : ['名所の札をかくしました（金のふちは残ります）', 'Site labels off (gold outlines stay)', '已隱藏名所標示（金框保留）', '명소 표시를 껐습니다 (금색 테두리는 남습니다)']), 1800); };
  if (N.store('tk_lmui') === 0) setLM(false);
  $('zIn').onclick = () => MP.zoomBy(1.6); $('zOut').onclick = () => MP.zoomBy(1 / 1.6); $('zMe').onclick = () => { if (N.me) MP.focusFaction(N.me.f); else MP.fit(); };
  $('nav').querySelectorAll('button').forEach(b => b.onclick = () => { showCell(-1); if (b.dataset.p === 'scroll') openScroll(); else openPanel(b.dataset.p); });
  if ($('scX')) $('scX').onclick = () => { $('scroll').hidden = true; };
  $('cellX').onclick = () => showCell(-1); $('cellGo').onclick = doTake;
  $('pClose').onclick = closePanel; $('panel').addEventListener('click', e => { if (e.target === $('panel')) closePanel(); });
  $('tkBack').onclick = () => { $('taken').hidden = true; if (N.me) MP.focusFaction(N.me.f); };
  $('tkX').onclick = () => postX(tkText); $('tkXi').onclick = () => tkCanvas && postImg(tkCanvas, tkText, $('tkMsg'), 'tenkatori_take');
  $('enX').onclick = () => postX(endText()); $('enXi').onclick = () => enCanvas && postImg(enCanvas, endText(), $('enMsg'), 'tenkatori_end');
  $('enRoll').onclick = () => playRoll();
  $('enMap').onclick = () => { $('endscr').hidden = true; $('map').hidden = false; $('game').hidden = false; scene('off'); MP.resize(); MP.fit(); };
  // ダブルタップ・2本指で、ページそのものが大きくならないようにする（地図は自分で広げる）
  let lastTouch = 0;
  document.addEventListener('touchend', e => { const now = Date.now(); if (now - lastTouch < 320 && !/^(INPUT|TEXTAREA)$/.test(e.target.tagName)) e.preventDefault(); lastTouch = now; }, { passive: false });
  for (const n of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(n, e => e.preventDefault(), { passive: false });
  document.addEventListener('dblclick', e => e.preventDefault());

  // ---------- はじまり ----------
  TK.app = { roll: async () => { rollRp = await N.loadReplay(); playRoll(); }, openPanel, closePanel, enterGame, showReveal, startQuiz, showTaken, card, checkEnd, telop, checkLM, show };
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
