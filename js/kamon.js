// =============================================
//  天下取りマース  家紋（20の家の紋を、線と図形だけで描く。絵のファイルは使わない）
//   TK.kamon(名前, 大きさpx, 色) → canvas（同じものは作りおきを返す）
// =============================================
(function (G) {
  const TK = G.TK = G.TK || {};
  const PI = Math.PI, TAU = PI * 2;
  const mk = n => { const c = document.createElement('canvas'); c.width = c.height = n; return c; };
  // 半径1の円の中に描く。cut(…) の中で描いた形は、くりぬきになる
  function pen(ctx) {
    const P = {
      disc(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); },
      ring(r1, r2, x = 0, y = 0) { ctx.beginPath(); ctx.arc(x, y, r1, 0, TAU); ctx.arc(x, y, r2, 0, TAU, true); ctx.fill('evenodd'); },
      poly(pts) { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill(); },
      rect(x, y, w, h) { ctx.fillRect(x, y, w, h); },
      line(x1, y1, x2, y2, w) { ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); },
      ell(x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); ctx.fill(); },
      cut(fn) { ctx.save(); ctx.globalCompositeOperation = 'destination-out'; fn(); ctx.restore(); },
      at(x, y, rot, s, fn) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); fn(); ctx.restore(); },
      clipCircle(r, fn) { ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.clip(); fn(); ctx.restore(); },
      // ハートの葉（先が原点、ふくらみが上）
      heart(w, h) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-w * 1.25, -h * 0.45, -w * 0.9, -h * 1.12, 0, -h * 0.78); ctx.bezierCurveTo(w * 0.9, -h * 1.12, w * 1.25, -h * 0.45, 0, 0); ctx.fill(); },
      // 先のとがった葉（根もとが原点、先が上）
      leaf(w, h) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-w, -h * 0.25, -w, -h * 0.75, 0, -h); ctx.bezierCurveTo(w, -h * 0.75, w, -h * 0.25, 0, 0); ctx.fill(); },
      ctx,
    };
    return P;
  }
  // 木瓜（外のふち＋中の唐花）
  function mokko(P) {
    const lobe = s => { for (let i = 0; i < 5; i++) { const a = -PI / 2 + i * TAU / 5; P.disc(Math.cos(a) * 0.56 * s, Math.sin(a) * 0.56 * s, 0.44 * s); } P.disc(0, 0, 0.6 * s); };
    lobe(1); P.cut(() => lobe(0.82));
    for (let i = 0; i < 5; i++) { const a = -PI / 2 + i * TAU / 5; P.ell(Math.cos(a) * 0.37, Math.sin(a) * 0.37, 0.17, 0.25, a + PI / 2); }
    P.cut(() => { P.disc(0, 0, 0.16); for (let i = 0; i < 5; i++) { const a = -PI / 2 + i * TAU / 5; P.line(Math.cos(a) * 0.2, Math.sin(a) * 0.2, Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0.03); } });
    P.disc(0, 0, 0.1);
  }
  const hanabishi = (P, s) => { for (let i = 0; i < 4; i++) { const a = i * PI / 2; P.at(0, 0, a, s, () => P.leaf(i % 2 ? 0.2 : 0.26, i % 2 ? 0.62 : 1)); } P.cut(() => P.disc(0, 0, 0.13 * s)); P.disc(0, 0, 0.07 * s); };
  const hex = (P, r) => P.poly([0, 1, 2, 3, 4, 5].map(i => [Math.cos(i * PI / 3) * r, Math.sin(i * PI / 3) * r]));
  const D = {
    mokko,
    takedabishi(P) { const a = 0.99, b = 0.66, g = 0.045; for (const [cx, cy] of [[0, -b / 2], [0, b / 2], [-a / 2, 0], [a / 2, 0]]) P.poly([[cx - a / 2 + g, cy], [cx, cy - b / 2 + g * 0.67], [cx + a / 2 - g, cy], [cx, cy + b / 2 - g * 0.67]]); },
    bi(P) { P.ring(1, 0.86); const c = P.ctx; c.font = '900 1.34px "Yuji Syuku","Shippori Mincho","Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('毘', 0, 0.06); },
    tatemitsu(P) { P.ring(1, 0.84); P.clipCircle(0.76, () => { for (const x of [-0.44, 0, 0.44]) P.rect(x - 0.13, -1, 0.26, 2); }); },
    aoi(P) {
      P.ring(1, 0.88);
      for (let i = 0; i < 3; i++) { const a = i * TAU / 3; P.at(Math.sin(a) * 0.09, -Math.cos(a) * 0.09, a, 1, () => { P.heart(0.44, 0.78); P.cut(() => { P.line(0, -0.06, 0, -0.6, 0.035); P.line(0, -0.14, -0.25, -0.5, 0.028); P.line(0, -0.14, 0.25, -0.5, 0.028); P.line(0, -0.3, -0.13, -0.66, 0.022); P.line(0, -0.3, 0.13, -0.66, 0.022); }); }); }
      P.cut(() => P.disc(0, 0, 0.1)); P.disc(0, 0, 0.055);
    },
    kiri(P) {
      // 葉が3枚、その上に花の茎が3本（まん中に7つ、左右に5つ）
      for (const [a, s, y] of [[PI, 0.98, 0.02], [PI - 1.02, 0.84, -0.02], [PI + 1.02, 0.84, -0.02]]) P.at(0, y, a, s, () => { P.leaf(0.5, 0.95); P.cut(() => { P.line(0, -0.1, 0, -0.84, 0.04); for (const k of [-1, 1]) { P.line(0, -0.25, k * 0.26, -0.5, 0.03); P.line(0, -0.45, k * 0.2, -0.68, 0.028); } }); });
      const stalk = (x, top, n, tilt) => { P.at(x, -0.02, tilt, 1, () => { P.line(0, 0, 0, -top, 0.045); for (let i = 0; i < n; i++) { const yy = -top + 0.02 + Math.floor(i / 2) * 0.165 - (i === 0 ? 0.05 : 0), xx = i === 0 ? 0 : (i % 2 ? -0.1 : 0.1); P.disc(xx, yy, 0.068); } }); };
      stalk(0, 0.92, 7, 0); stalk(-0.36, 0.64, 5, -0.42); stalk(0.36, 0.64, 5, 0.42);
    },
    ichimonji(P) { const c = P.ctx; c.beginPath(); c.moveTo(-0.8, -0.72); c.quadraticCurveTo(0, -0.84, 0.78, -0.78); c.quadraticCurveTo(0.86, -0.66, 0.74, -0.54); c.quadraticCurveTo(0, -0.6, -0.76, -0.5); c.quadraticCurveTo(-0.9, -0.6, -0.8, -0.72); c.fill(); P.disc(0, -0.16, 0.27); P.disc(-0.35, 0.47, 0.27); P.disc(0.35, 0.47, 0.27); },
    maruju(P) { P.ring(1, 0.8); P.rect(-0.105, -0.86, 0.21, 1.72); P.rect(-0.86, -0.105, 1.72, 0.21); },
    uroko(P) { const T = [0, -0.92], L = [-0.98, 0.78], R = [0.98, 0.78], m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], g = 0.03; const TL = m(T, L), TR = m(T, R), LR = m(L, R); P.poly([T, [TL[0] + g, TL[1] - g], [TR[0] - g, TR[1] - g]]); P.poly([[TL[0] - g, TL[1] + g], L, [LR[0] - g * 1.6, LR[1]], ]); P.poly([[TR[0] + g, TR[1] + g], [LR[0] + g * 1.6, LR[1]], R]); },
    akadori(P) {
      // 赤鳥：上に輪のついた、くしの形
      P.ring(0.24, 0.11, 0, -0.68); P.rect(-0.07, -0.5, 0.14, 0.2);
      const c = P.ctx; c.beginPath(); c.moveTo(-0.78, 0.08); c.quadraticCurveTo(-0.78, -0.36, 0, -0.36); c.quadraticCurveTo(0.78, -0.36, 0.78, 0.08); c.closePath(); c.fill();
      for (let i = 0; i < 7; i++) { const x = -0.78 + i * (1.56 - 0.12) / 6; P.rect(x, 0.04, 0.12, 0.8 - Math.abs(i - 3) * 0.035); }
      P.cut(() => P.line(-0.6, -0.08, 0.6, -0.08, 0.035));
    },
    nami(P) {
      // 立波：2つの波がしらが巻き、しぶきが飛ぶ
      const head = (x, y, s, f) => P.at(x, y, 0, s, () => { P.ctx.scale(f, 1); P.disc(0, 0, 0.5); P.cut(() => { P.disc(0.16, 0.13, 0.37); }); P.ctx.beginPath(); P.ctx.arc(0.2, 0.2, 0.2, PI * 0.9, PI * 2.2); P.ctx.lineWidth = 0.075; P.ctx.lineCap = 'round'; P.ctx.stroke(); });
      const c = P.ctx; c.beginPath(); c.moveTo(-0.95, 0.8); c.quadraticCurveTo(-0.9, 0.1, -0.52, -0.3); c.quadraticCurveTo(-0.3, 0.3, 0.1, 0.38); c.quadraticCurveTo(0.2, 0.0, 0.5, -0.14); c.quadraticCurveTo(0.7, 0.4, 0.95, 0.8); c.closePath(); c.fill();
      head(-0.4, -0.36, 0.86, 1); head(0.52, -0.14, 0.66, 1);
      P.cut(() => { c.lineWidth = 0.05; c.beginPath(); c.moveTo(-0.7, 0.62); c.quadraticCurveTo(-0.3, 0.42, 0.0, 0.62); c.quadraticCurveTo(0.3, 0.8, 0.66, 0.6); c.stroke(); });
      for (const [x, y, r] of [[0.1, -0.78, 0.07], [0.32, -0.62, 0.055], [-0.02, -0.56, 0.05], [0.86, -0.52, 0.055], [0.98, -0.3, 0.045], [-0.84, -0.66, 0.05]]) P.disc(x, y, r);
    },
    mitsumokko(P) { for (const [x, y] of [[0, -0.46], [-0.5, 0.42], [0.5, 0.42]]) P.at(x, y, 0, 0.5, () => { const sub = TK.kamon('mokko', 256, '#fff'); P.ctx.drawImage(sub, -1, -1, 2, 2); }); },
    kikko(P) { for (const [x, y] of [[0, -0.47], [-0.5, 0.4], [0.5, 0.4]]) P.at(x, y, PI / 6, 1, () => { hex(P, 0.5); P.cut(() => hex(P, 0.42)); hex(P, 0.37); P.cut(() => hex(P, 0.31)); P.ctx.rotate(-PI / 6); hanabishi(P, 0.25); }); },
    rokumon(P) { for (const y of [-0.34, 0.34]) for (const x of [-0.64, 0, 0.64]) { P.disc(x, y, 0.29); P.cut(() => P.rect(x - 0.1, y - 0.1, 0.2, 0.2)); } },
    futatsubiki(P) { P.ring(1, 0.84); P.clipCircle(0.76, () => { P.rect(-1, -0.4, 2, 0.28); P.rect(-1, 0.12, 2, 0.28); }); },
    ougi(P) {
      // 五本骨の扇に月
      const c = P.ctx, py = 0.8, r = 1.62, a0 = -PI / 2 - 0.92, a1 = -PI / 2 + 0.92;
      c.beginPath(); c.moveTo(0, py); c.arc(0, py, r, a0, a1); c.closePath(); c.fill();
      P.cut(() => { c.beginPath(); c.moveTo(0, py); c.arc(0, py, 0.62, a0 - 0.2, a1 + 0.2); c.closePath(); c.fill(); for (let i = 1; i < 6; i++) { const a = a0 + (a1 - a0) * i / 6; P.line(Math.cos(a) * 0.62, py + Math.sin(a) * 0.62, Math.cos(a) * r, py + Math.sin(a) * r, 0.022); } P.disc(0, -0.3, 0.3); });
      P.disc(0, -0.3, 0.215);
      for (let i = 0; i < 5; i++) { const a = a0 + 0.12 + (a1 - a0 - 0.24) * i / 4; P.line(0, py, Math.cos(a) * 0.66, py + Math.sin(a) * 0.66, 0.06); }
      P.disc(0, py, 0.09);
    },
    yotsume(P) { const s = 0.7, g = 0.06; for (const x of [-1, 1]) for (const y of [-1, 1]) { const cx = x * (s / 2 + g), cy = y * (s / 2 + g); P.rect(cx - s / 2, cy - s / 2, s, s); P.cut(() => P.rect(cx - 0.13, cy - 0.13, 0.26, 0.26)); } },
    katabami(P) {
      const one = (x, y, s) => P.at(x, y, 0, s, () => { for (let i = 0; i < 3; i++) P.at(0, 0, i * TAU / 3, 1, () => { P.heart(0.6, 1); P.cut(() => P.line(0, -0.1, 0, -0.62, 0.07)); }); P.cut(() => P.disc(0, 0, 0.13)); P.disc(0, 0, 0.07); });
      one(0, 0, 0.31); for (let i = 0; i < 6; i++) { const a = -PI / 2 + i * PI / 3; one(Math.cos(a) * 0.66, Math.sin(a) * 0.66, 0.31); }
    },
    gyoyo(P) {
      // 抱き杏葉：2枚の葉が、向かい合って抱きあう
      for (const f of [-1, 1]) P.at(0, 0, 0, 1, () => { const c = P.ctx; c.scale(f, 1); c.beginPath(); c.rect(-1.2, -1.2, 1.17, 2.4); c.clip(); P.disc(-0.2, 0.08, 0.78); P.cut(() => { P.disc(0.2, 0.0, 0.7); }); P.cut(() => { c.lineWidth = 0.035; for (let i = 0; i < 6; i++) { const a = PI * 0.68 + i * 0.27; c.beginPath(); c.moveTo(-0.2 + Math.cos(a) * 0.56, 0.08 + Math.sin(a) * 0.56); c.lineTo(-0.2 + Math.cos(a) * 0.76, 0.08 + Math.sin(a) * 0.76); c.stroke(); } }); });
      P.at(0, -0.66, 0, 1, () => { hanabishi(P, 0.24); }); P.poly([[0, 0.5], [0.13, 0.7], [0, 0.9], [-0.13, 0.7]]); P.disc(0, 0.02, 0.1);
    },
    hiashi(P) { P.disc(0, 0, 0.33); P.cut(() => P.disc(0, 0, 0.24)); P.disc(0, 0, 0.17); for (let i = 0; i < 12; i++) { const a = i * TAU / 12, w = 0.2; P.poly([[Math.cos(a - w * 0.5) * 0.4, Math.sin(a - w * 0.5) * 0.4], [Math.cos(a - w) * 1, Math.sin(a - w) * 1], [Math.cos(a + w) * 1, Math.sin(a + w) * 1], [Math.cos(a + w * 0.5) * 0.4, Math.sin(a + w * 0.5) * 0.4]]); } },
  };
  const cache = new Map();
  TK.kamon = function (id, px, color) {
    px = Math.max(8, Math.round(px)); const key = id + '|' + px + '|' + color;
    if (cache.has(key)) return cache.get(key);
    const c = mk(px), ctx = c.getContext('2d');
    ctx.translate(px / 2, px / 2); ctx.scale(px / 2 * 0.94, px / 2 * 0.94);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#fff';
    (D[id] || D.maruju)(pen(ctx));
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-in'; ctx.fillStyle = color; ctx.fillRect(0, 0, px, px);
    cache.set(key, c); return c;
  };
  // 色の丸の上に白い家紋（武将の印）
  TK.crest = function (f, px, opt) {
    opt = opt || {}; const key = 'crest|' + f.L + '|' + px + '|' + (opt.flat ? 1 : 0);
    if (cache.has(key)) return cache.get(key);
    const c = mk(px), ctx = c.getContext('2d'), r = px / 2;
    ctx.beginPath(); ctx.arc(r, r, r * 0.98, 0, TAU); ctx.fillStyle = f.col; ctx.fill();
    if (!opt.flat) { const g = ctx.createRadialGradient(r * 0.7, r * 0.6, r * 0.1, r, r, r); g.addColorStop(0, 'rgba(255,255,255,.22)'); g.addColorStop(1, 'rgba(0,0,0,.18)'); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = Math.max(1, px * 0.035); ctx.strokeStyle = 'rgba(255,240,200,.75)'; ctx.stroke(); }
    const k = TK.kamon(f.kamon, Math.round(px * 0.74), TK.ink(f.col)); ctx.drawImage(k, (px - k.width) / 2, (px - k.height) / 2);
    cache.set(key, c); return c;
  };
  // 名所の印（和紙の丸に、墨の絵）。kind：mt 山／castle 城／field 合戦場／city 都・町／shrine 神社／temple 寺／mine 金銀山。key：天下分け目の城（朱と金）
  TK.badge = function (kind, px, key) {
    px = Math.max(10, Math.round(px)); const k = 'badge|' + kind + '|' + px + '|' + (key ? 1 : 0); if (cache.has(k)) return cache.get(k);
    const c = mk(px), x = c.getContext('2d'), r = px / 2; x.translate(r, r); x.scale(r, r);
    x.beginPath(); x.arc(0, 0, 0.94, 0, TAU); x.fillStyle = key ? '#c8321f' : '#f6eed8'; x.fill(); x.lineWidth = 0.11; x.strokeStyle = key ? '#f0d27a' : '#241b14'; x.stroke();
    const ink = key ? '#fff3da' : '#241b14'; x.fillStyle = ink; x.strokeStyle = ink; x.lineCap = 'round'; x.lineJoin = 'round';
    const poly = pts => { x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.closePath(); x.fill(); };
    const roof = (y, w, h) => { x.beginPath(); x.moveTo(-w, y); x.quadraticCurveTo(-w * 0.45, y - h * 0.35, 0, y - h); x.quadraticCurveTo(w * 0.45, y - h * 0.35, w, y); x.closePath(); x.fill(); };
    if (kind === 'mt') { poly([[-0.72, 0.46], [-0.2, -0.46], [0.2, -0.46], [0.72, 0.46]]); x.fillStyle = key ? '#c8321f' : '#f6eed8'; poly([[-0.2, -0.46], [0.2, -0.46], [0.32, -0.2], [0.14, -0.3], [0, -0.14], [-0.14, -0.3], [-0.32, -0.2]]); }
    else if (kind === 'castle') { roof(-0.22, 0.34, 0.3); x.fillRect(-0.24, -0.22, 0.48, 0.2); roof(0.14, 0.56, 0.3); x.fillRect(-0.4, 0.14, 0.8, 0.22); poly([[-0.62, 0.56], [-0.48, 0.34], [0.48, 0.34], [0.62, 0.56]]); }
    else if (kind === 'field') { x.lineWidth = 0.13; for (const s of [-1, 1]) { x.beginPath(); x.moveTo(s * 0.5, -0.52); x.lineTo(-s * 0.42, 0.44); x.stroke(); x.beginPath(); x.moveTo(-s * 0.56, 0.2); x.lineTo(-s * 0.22, 0.42); x.stroke(); } }
    else if (kind === 'city') { roof(-0.1, 0.62, 0.34); x.fillRect(-0.46, -0.1, 0.16, 0.56); x.fillRect(0.3, -0.1, 0.16, 0.56); x.fillRect(-0.08, -0.1, 0.16, 0.56); x.fillRect(-0.56, 0.4, 1.12, 0.12); }
    else if (kind === 'shrine') { x.lineWidth = 0.14; x.beginPath(); x.moveTo(-0.62, -0.36); x.quadraticCurveTo(0, -0.5, 0.62, -0.36); x.stroke(); x.lineWidth = 0.1; x.beginPath(); x.moveTo(-0.46, -0.1); x.lineTo(0.46, -0.1); x.stroke(); x.lineWidth = 0.13; for (const s of [-1, 1]) { x.beginPath(); x.moveTo(s * 0.34, -0.36); x.lineTo(s * 0.38, 0.52); x.stroke(); } }
    else if (kind === 'temple') { roof(-0.3, 0.3, 0.26); roof(0.02, 0.44, 0.24); roof(0.34, 0.58, 0.24); x.fillRect(-0.16, -0.3, 0.32, 0.1); x.fillRect(-0.24, 0.02, 0.48, 0.1); x.fillRect(-0.34, 0.34, 0.68, 0.16); x.fillRect(-0.03, -0.72, 0.06, 0.2); }
    else { poly([[0, -0.56], [0.5, -0.14], [0.3, 0.5], [-0.3, 0.5], [-0.5, -0.14]]); x.strokeStyle = key ? '#c8321f' : '#f6eed8'; x.lineWidth = 0.06; x.beginPath(); x.moveTo(-0.5, -0.14); x.lineTo(0.5, -0.14); x.moveTo(0, -0.56); x.lineTo(-0.18, -0.14); x.lineTo(0, 0.5); x.lineTo(0.18, -0.14); x.closePath(); x.stroke(); }
    cache.set(k, c); return c;
  };
  // その色の上にのせる文字・家紋の色（明るい色には墨、暗い色には白）
  TK.lum = function (hex) { const n = parseInt(hex.slice(1), 16), f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(n >> 16) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255); };
  TK.ink = hex => TK.lum(hex) > 0.42 ? '#1d1712' : '#fff8e7';
})(window);
