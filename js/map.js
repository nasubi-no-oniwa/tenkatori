// =============================================
//  天下取りマース  地図（上から見た2D。指で動かす・2本指で広げる。ダブルタップでは大きくならない）
//   下絵（陸・マスの色・海の道）は別のキャンバスに描いておき、動かすときはそれを貼るだけにして軽くする
// =============================================
(function (G) {
  const TK = G.TK, M = G.TK_MAP, N = TK.NET;
  const MP = TK.MAP = {};
  const W = M.W, H = M.H, NC = M.n, BASE = 12;      // 下絵は1マス12px
  const SEA = '#8fa9b1', SEA2 = '#7c98a3', INK = '#2a211a', PAPER = TK.WHITE;
  const cx = i => M.cells[2 * i], cy = i => M.cells[2 * i + 1];
  let cv, ctx, dpr = 1, vw = 0, vh = 0;
  const view = { x: W / 2, y: H / 2, z: 3 };        // 画面のまん中にくるマスの座標と、1マスの大きさ（CSS px）
  let base = null, bctx = null, dirty = true, landPath = null, raf = 0, need = true;
  let glow = [], glowOn = false, sel = -1, flash = [], onTap = null, minZ = 2, maxZ = 34;
  MP.view = view;
  function buildLand() {
    landPath = new Path2D();
    for (const rs of M.land) for (const r of rs) { r.forEach((p, i) => i ? landPath.lineTo(p[0], p[1]) : landPath.moveTo(p[0], p[1])); landPath.closePath(); }
  }
  // 海の模様（青海波を、うすく）
  function seaPattern(c) {
    const p = document.createElement('canvas'); p.width = 48; p.height = 24; const x = p.getContext('2d');
    x.fillStyle = SEA; x.fillRect(0, 0, 48, 24); x.strokeStyle = 'rgba(255,255,255,.09)'; x.lineWidth = 1;
    for (const [ox, oy] of [[0, 24], [48, 24], [24, 12], [-24, 12], [72, 12], [0, 0], [48, 0]]) for (const r of [22, 16, 10]) { x.beginPath(); x.arc(ox, oy, r, Math.PI, 0); x.stroke(); }
    return c.createPattern(p, 'repeat');
  }
  function colorOf(L) { return L === 'w' ? PAPER : TK.FI[L].col; }
  // 下絵を描きなおす（マスの色が変わったとき）
  function paintBase() {
    if (!base) { base = document.createElement('canvas'); base.width = W * BASE; base.height = H * BASE; bctx = base.getContext('2d'); }
    const c = bctx, cells = N.cells || M.own;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, base.width, base.height);
    c.setTransform(BASE, 0, 0, BASE, 0, 0);
    // 海の道（点線）
    c.save(); c.strokeStyle = 'rgba(255,250,235,.75)'; c.lineWidth = 0.16; c.setLineDash([0.35, 0.3]); c.lineCap = 'round';
    for (const [a, b] of M.sea) { c.beginPath(); c.moveTo(cx(a) + .5, cy(a) + .5); c.lineTo(cx(b) + .5, cy(b) + .5); c.stroke(); }
    c.restore();
    // 陸の影
    c.save(); c.translate(0.12, 0.2); c.fillStyle = 'rgba(20,35,45,.35)'; c.fill(landPath, 'evenodd'); c.restore();
    c.save(); c.clip(landPath, 'evenodd');
    c.fillStyle = PAPER; c.fillRect(0, 0, W, H);
    const g = 0.055;                                   // マスのすきま（■が見えるように）
    for (let k = 0; k < M.sliver.length; k += 3) { c.fillStyle = colorOf(cells[M.sliver[k + 2]]); c.fillRect(M.sliver[k] - 0.02, M.sliver[k + 1] - 0.02, 1.04, 1.04); }
    for (let i = 0; i < NC; i++) { c.fillStyle = colorOf(cells[i]); c.fillRect(cx(i) - 0.02, cy(i) - 0.02, 1.04, 1.04); }
    // マスの線（うすい墨）
    c.strokeStyle = 'rgba(40,30,20,.16)'; c.lineWidth = g; c.beginPath();
    for (let i = 0; i < NC; i++) { const x = cx(i), y = cy(i); c.moveTo(x, y); c.lineTo(x + 1, y); c.moveTo(x, y); c.lineTo(x, y + 1); }
    c.stroke();
    // 陣営のさかい（濃い線）
    c.strokeStyle = 'rgba(25,18,12,.7)'; c.lineWidth = 0.13; c.lineCap = 'square'; c.beginPath();
    for (let i = 0; i < NC; i++) { const x = cx(i), y = cy(i), a = cells[i]; const r = N.cellAt(x + 1, y), d = N.cellAt(x, y + 1); if (r >= 0 && cells[r] !== a) { c.moveTo(x + 1, y); c.lineTo(x + 1, y + 1); } if (d >= 0 && cells[d] !== a) { c.moveTo(x, y + 1); c.lineTo(x + 1, y + 1); } }
    c.stroke();
    // 名所のふち（金。占領されたら太い白。天下分け目の城は朱）
    for (const lm of N.LM) {
      const set = new Set(lm.c), hold = N.holder(lm, cells), key = lm.id === 'azuchi';
      c.beginPath(); for (const i of lm.c) { const x = cx(i), y = cy(i); if (!set.has(N.cellAt(x, y - 1))) { c.moveTo(x, y); c.lineTo(x + 1, y); } if (!set.has(N.cellAt(x, y + 1))) { c.moveTo(x, y + 1); c.lineTo(x + 1, y + 1); } if (!set.has(N.cellAt(x - 1, y))) { c.moveTo(x, y); c.lineTo(x, y + 1); } if (!set.has(N.cellAt(x + 1, y))) { c.moveTo(x + 1, y); c.lineTo(x + 1, y + 1); } }
      c.lineCap = 'round'; c.strokeStyle = 'rgba(20,14,8,.85)'; c.lineWidth = 0.34; c.stroke();
      c.strokeStyle = key ? '#ff5a3c' : hold ? '#ffffff' : '#f0c850'; c.lineWidth = 0.18; if (!hold) c.setLineDash([0.42, 0.34]); c.stroke(); c.setLineDash([]);
    }
    // 和紙のむら
    const gr = c.createLinearGradient(0, 0, W, H); gr.addColorStop(0, 'rgba(255,255,255,.07)'); gr.addColorStop(.5, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(60,30,0,.08)'); c.fillStyle = gr; c.fillRect(0, 0, W, H);
    c.restore();
    c.strokeStyle = INK; c.lineWidth = 0.1; c.lineJoin = 'round'; c.stroke(landPath);
    dirty = false;
  }
  MP.repaint = () => { dirty = true; need = true; };
  const sx = x => (x - view.x) * view.z + vw / 2, sy = y => (y - view.y) * view.z + vh / 2;
  MP.screenOf = i => ({ x: sx(cx(i) + .5), y: sy(cy(i) + .5) });
  function clampView() {
    view.z = Math.max(minZ, Math.min(maxZ, view.z));
    const mx = vw / 2 / view.z, my = vh / 2 / view.z;
    view.x = Math.max(Math.min(mx, W / 2) - 4, Math.min(W - Math.min(mx, W / 2) + 4, view.x));
    view.y = Math.max(Math.min(my, H / 2) - 4, Math.min(H - Math.min(my, H / 2) + 4, view.y));
  }
  let seaPat = null;
  function draw(t) {
    raf = 0; if (!cv || !vw) return;
    if (dirty) paintBase();
    const c = ctx; c.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!seaPat) seaPat = seaPattern(c);
    c.fillStyle = seaPat; c.save(); c.translate((-view.x * view.z * 0.5) % 48, (-view.y * view.z * 0.5) % 24); c.fillRect(-48, -24, vw + 96, vh + 48); c.restore();
    const vg = c.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.3, vw / 2, vh / 2, Math.max(vw, vh) * 0.8); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(15,30,45,.38)'); c.fillStyle = vg; c.fillRect(0, 0, vw, vh);
    c.imageSmoothingEnabled = view.z < BASE * 1.6; c.imageSmoothingQuality = 'high';
    c.drawImage(base, sx(0), sy(0), W * view.z, H * view.z);
    const z = view.z, cells = N.cells || M.own;
    // 取れるマス（光らせる）
    if (glow.length) {
      const a = glowOn ? 0.68 + 0.32 * Math.sin(t / 260) : 0.32;
      c.lineWidth = Math.max(1.2, z * 0.14); c.strokeStyle = glowOn ? `rgba(255,214,90,${a})` : `rgba(255,240,200,${a})`; c.fillStyle = glowOn ? `rgba(255,224,120,${a * 0.34})` : 'rgba(255,255,255,.08)';
      for (const i of glow) { const x = sx(cx(i)), y = sy(cy(i)); if (x < -z || y < -z || x > vw || y > vh) continue; c.fillRect(x, y, z, z); if (z >= 5) c.strokeRect(x + c.lineWidth / 2, y + c.lineWidth / 2, z - c.lineWidth, z - c.lineWidth); }
      if (glowOn) need = true;
    }
    // 取った・取られたばかりのマス（ぱっと光って消える）
    if (flash.length) {
      const now = performance.now(); flash = flash.filter(f => now - f.t0 < f.ms);
      for (const f of flash) { const k = (now - f.t0) / f.ms, x = sx(cx(f.i) + .5), y = sy(cy(f.i) + .5), r = z * (0.6 + k * 2.6); c.strokeStyle = f.col; c.globalAlpha = 1 - k; c.lineWidth = Math.max(1.5, z * 0.2 * (1 - k)); c.beginPath(); c.arc(x, y, r, 0, 6.283); c.stroke(); c.globalAlpha = (1 - k) * 0.7; c.fillStyle = '#fff'; c.fillRect(x - z / 2, y - z / 2, z, z); c.globalAlpha = 1; }
      need = true;
    }
    // 国の名前
    if (z >= 7.5) {
      c.textAlign = 'center'; c.textBaseline = 'middle'; const fs = Math.max(11, Math.min(22, z * 1.25)); c.font = `700 ${fs}px ${TK.FONT_B}`;
      for (let p = 0; p < M.provs.length; p++) { const l = M.plab[p]; if (!l) continue; const x = sx(l[0]), y = sy(l[1]); if (x < -60 || y < -20 || x > vw + 60 || y > vh + 20) continue; if (l[2] < 4 && z < 12) continue; const nm = TK.provName(p); c.lineWidth = 3.5; c.strokeStyle = 'rgba(244,236,214,.82)'; c.strokeText(nm, x, y); c.fillStyle = 'rgba(38,28,20,.86)'; c.fillText(nm, x, y); }
    }
    // 名所の札（印＋名前）。マスが見えるように、マスの上にはのせず、上のふちの外に出す。占領されていれば、その武将の家紋もつける
    if (z >= 3.4 && MP.showLM) {
      c.textBaseline = 'middle';
      for (const lm of N.LM) {
        let top = 1e9; for (const i of lm.c) top = Math.min(top, cy(i));
        const x = sx(lm.x), yt = sy(top), key = lm.id === 'azuchi';
        if (x < -90 || yt < -40 || x > vw + 90 || yt > vh + 60) continue;
        const h = N.holder(lm, cells), bs = Math.max(12, Math.min(22, z * 1.15)), showName = z >= 8.5;
        const nm = showName ? TK.L(lm.n) : '', fs = Math.max(10, Math.min(13.5, z * 0.72)); c.font = `800 ${fs}px ${TK.FONT_B}`;
        const tw = showName ? c.measureText(nm).width + 5 : 0, hw = h ? bs * 0.92 : 0, w = bs + tw + hw + 6, ht = bs + 4, px = x - w / 2, py = yt - ht - Math.max(2, z * 0.12);
        c.save(); c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 4; c.shadowOffsetY = 1.5; c.beginPath(); c.roundRect(px, py, w, ht, ht / 2); c.fillStyle = key ? 'rgba(120,24,12,.94)' : 'rgba(20,14,8,.9)'; c.fill(); c.restore();
        c.lineWidth = 1; c.strokeStyle = key ? '#ffb19f' : '#f0c850'; c.stroke();
        c.drawImage(TK.badge(lm.k, Math.round(bs * dpr), key), px + 2, py + 2, bs, bs);
        if (showName) { c.textAlign = 'left'; c.fillStyle = key ? '#ffe6df' : '#ffe9a8'; c.fillText(nm, px + bs + 4, py + ht / 2 + 0.5); }
        if (h) c.drawImage(TK.crest(TK.FI[h], Math.round(bs * dpr)), px + w - bs - 2, py + 2, bs, bs);
        // 札からマスへ、短い線でつなぐ
        c.beginPath(); c.moveTo(x, py + ht); c.lineTo(x, yt); c.strokeStyle = key ? '#ffb19f' : '#f0c850'; c.lineWidth = 1.5; c.stroke();
      }
    }
    // 天守閣（武将の印）
    const cs = Math.max(15, Math.min(46, z * 2.1));
    for (const f of TK.F) { const i = M.castle[f.L], x = sx(cx(i) + .5), y = sy(cy(i) + .5); if (x < -cs || y < -cs || x > vw + cs || y > vh + cs) continue; const im = TK.crest(f, Math.round(cs * dpr)); c.save(); c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 5; c.shadowOffsetY = 2; c.drawImage(im, x - cs / 2, y - cs / 2, cs, cs); c.restore(); if (N.me && N.me.f === f.L) { c.strokeStyle = '#ffe08a'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, cs / 2 + 2.5, 0, 6.283); c.stroke(); } }
    // 選んだマス
    if (sel >= 0) { const x = sx(cx(sel)), y = sy(cy(sel)); c.lineWidth = 2.5; c.strokeStyle = '#fff'; c.strokeRect(x - 1.5, y - 1.5, z + 3, z + 3); c.lineWidth = 1.2; c.strokeStyle = INK; c.strokeRect(x - 3.5, y - 3.5, z + 7, z + 7); }
    if (need) { need = false; kick(); }
  }
  function kick() { if (!raf) raf = requestAnimationFrame(draw); }
  MP.kick = () => { need = true; kick(); };
  function resize() {
    if (!cv) return; const r = cv.getBoundingClientRect(); if (r.width < 2) return;
    dpr = Math.min(2.5, G.devicePixelRatio || 1); vw = r.width; vh = r.height; cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr);
    minZ = Math.min(vw / (W - 20), vh / (H - 20)) * 0.9; clampView(); MP.kick();
  }
  MP.resize = resize;
  MP.init = function (canvas, tapFn) {
    cv = canvas; ctx = cv.getContext('2d'); onTap = tapFn; buildLand();
    new ResizeObserver(resize).observe(cv); resize();
    // 指の操作
    const pts = new Map(); let moved = 0, pinch = 0, downAt = 0, startV = null;
    const loc = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, loc(e)); if (pts.size === 1) { moved = 0; downAt = performance.now(); } if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); startV = { z: view.z }; moved = 99; } if (G.gsap) gsap.killTweensOf(view); });
    cv.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) return; const p = loc(e), o = pts.get(e.pointerId);
      if (pts.size === 1) { view.x -= (p.x - o.x) / view.z; view.y -= (p.y - o.y) / view.z; moved += Math.abs(p.x - o.x) + Math.abs(p.y - o.y); }
      pts.set(e.pointerId, p);
      if (pts.size === 2) { const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2; const wx = view.x + (mx - vw / 2) / view.z, wy = view.y + (my - vh / 2) / view.z; view.z = Math.max(minZ, Math.min(maxZ, startV.z * d / Math.max(1, pinch))); view.x = wx - (mx - vw / 2) / view.z; view.y = wy - (my - vh / 2) / view.z; }
      clampView(); MP.kick();
    });
    const up = e => { if (!pts.has(e.pointerId)) return; const p = pts.get(e.pointerId); pts.delete(e.pointerId); if (pts.size === 0 && moved < 9 && performance.now() - downAt < 600 && onTap) { const gx = Math.floor(view.x + (p.x - vw / 2) / view.z), gy = Math.floor(view.y + (p.y - vh / 2) / view.z); onTap(N.cellAt(gx, gy), p); } };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', e => pts.delete(e.pointerId));
    cv.addEventListener('wheel', e => { e.preventDefault(); const p = loc(e), wx = view.x + (p.x - vw / 2) / view.z, wy = view.y + (p.y - vh / 2) / view.z; view.z = Math.max(minZ, Math.min(maxZ, view.z * Math.exp(-e.deltaY * 0.0016))); view.x = wx - (p.x - vw / 2) / view.z; view.y = wy - (p.y - vh / 2) / view.z; clampView(); MP.kick(); }, { passive: false });
    cv.addEventListener('dblclick', e => e.preventDefault());
  };
  MP.showLM = true;                                  // 名所の札を出すか（右下の「名」ボタンで切りかえ）
  MP.setGlow = (list, on) => { glow = list || []; glowOn = !!on; MP.kick(); };
  MP.select = i => { sel = i; MP.kick(); };
  MP.flash = (i, col, ms) => { flash.push({ i, col: col || '#ffe08a', t0: performance.now(), ms: ms || 900 }); MP.kick(); };
  // 見る場所を動かす
  MP.go = function (x, y, z, dur) { const to = { x, y, z: Math.max(minZ, Math.min(maxZ, z)) }; if (G.gsap && dur !== 0) gsap.to(view, Object.assign({ duration: dur || 0.9, ease: 'power3.inOut', onUpdate: () => { clampView(); MP.kick(); } }, to)); else { Object.assign(view, to); clampView(); MP.kick(); } };
  MP.fit = dur => MP.go(W / 2, H / 2, minZ, dur);
  MP.focusLM = (lm, dur) => MP.go(lm.x, lm.y, Math.max(view.z, lm.c.length > 4 ? 15 : 18), dur);
  MP.focusCell = (i, z, dur) => MP.go(cx(i) + .5, cy(i) + .5, z || Math.max(view.z, 16), dur);
  MP.focusFaction = function (L, dur) {
    const cells = N.cells || M.own; let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let i = 0; i < NC; i++) if (cells[i] === L) { x0 = Math.min(x0, cx(i)); y0 = Math.min(y0, cy(i)); x1 = Math.max(x1, cx(i) + 1); y1 = Math.max(y1, cy(i) + 1); }
    if (x1 < 0) return MP.fit(dur);
    const z = Math.min(22, Math.min(vw / (x1 - x0 + 10), vh / (y1 - y0 + 12))); MP.go((x0 + x1) / 2, (y0 + y1) / 2, Math.max(z, 7), dur);
  };
  MP.zoomBy = k => MP.go(view.x, view.y, view.z * k, 0.35);
  // ---------- 投稿用の絵（1200×675）。focus：マス番号（そこを中心に大きく）。なければ日本ぜんぶ ----------
  MP.snapshot = function (opt) {
    opt = opt || {}; if (dirty || !base) paintBase();
    const w = opt.w || 1200, h = opt.h || 675, c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
    x.fillStyle = seaPattern(x); x.fillRect(0, 0, w, h);
    const vg = x.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, w * 0.7); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(15,30,45,.45)'); x.fillStyle = vg; x.fillRect(0, 0, w, h);
    let z, ox, oy;
    if (opt.focus != null && opt.focus >= 0) { z = opt.z || 26; ox = cx(opt.focus) + .5 - (w * (opt.ax || 0.5)) / z; oy = cy(opt.focus) + .5 - (h * (opt.ay || 0.5)) / z; }
    else { z = Math.min(w / (W - 16), h / (H - 44)) * (opt.scale || 1.5); ox = W * 0.52 - w * (opt.ax || 0.5) / z; oy = H * 0.56 - h * (opt.ay || 0.5) / z; }
    x.imageSmoothingQuality = 'high'; x.drawImage(base, -ox * z, -oy * z, W * z, H * z);
    const cs = Math.max(20, z * 2.2);
    for (const f of TK.F) { const i = M.castle[f.L], px = (cx(i) + .5 - ox) * z, py = (cy(i) + .5 - oy) * z; if (px < -cs || py < -cs || px > w + cs || py > h + cs) continue; x.save(); x.shadowColor = 'rgba(0,0,0,.5)'; x.shadowBlur = 6; x.shadowOffsetY = 2; x.drawImage(TK.crest(f, Math.round(cs * 2)), px - cs / 2, py - cs / 2, cs, cs); x.restore(); }
    for (const lm of N.LM) { let top = 1e9; for (const i of lm.c) top = Math.min(top, cy(i)); const bs = Math.max(14, Math.min(34, z * 1.2)), px = (lm.x - ox) * z, py = (top - oy) * z - bs * 0.62; if (px < -bs || py < -bs || px > w + bs || py > h + bs) continue; x.drawImage(TK.badge(lm.k, Math.round(bs * 2), lm.id === 'azuchi'), px - bs / 2, py - bs / 2, bs, bs); const hd = N.holder(lm); if (hd) x.drawImage(TK.crest(TK.FI[hd], Math.round(bs * 1.6)), px + bs * 0.4, py - bs / 2, bs * 0.8, bs * 0.8); }
    if (opt.focus != null && opt.focus >= 0 && !opt.nomark) { const px = (cx(opt.focus) - ox) * z, py = (cy(opt.focus) - oy) * z; x.lineWidth = 6; x.strokeStyle = '#fff'; x.strokeRect(px - 3, py - 3, z + 6, z + 6); x.lineWidth = 3; x.strokeStyle = '#c8321f'; x.strokeRect(px - 8, py - 8, z + 16, z + 16); }
    return c;
  };
  MP.base = () => { if (dirty || !base) paintBase(); return base; };
})(window);
