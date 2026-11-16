// =============================================
//  天下取りマース  3Dの場面（three.js）
//   title ：5000マスを立体の駒にした日本を、ゆっくり飛んで見せる（タイトル・診断のうしろ）
//   banner：仕える武将ののぼり旗がはためく（武将が決まったとき・寝返ったとき・天下統一）
//   off   ：止める（地図で遊んでいるあいだは描かない）
// =============================================
import * as THREE from 'three';
const TK = window.TK, M = window.TK_MAP, N = TK.NET;
const cv = document.getElementById('gl');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: 'high-performance' }); } catch (e) { renderer = null; }
if (renderer) {
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12;
  const W = M.W, H = M.H, NC = M.n; let mode = 'off', raf = 0, t0 = performance.now(), want = null;
  const cam = new THREE.PerspectiveCamera(36, 1, 0.1, 600);
  const hash = i => { let x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const col = L => new THREE.Color(L === 'w' ? '#d9ccab' : TK.FI[L].col);

  // ---------- タイトル：立体の日本 ----------
  const sT = new THREE.Scene(); sT.fog = new THREE.Fog(0x120e0b, 120, 330);
  sT.add(new THREE.HemisphereLight(0xfff1d6, 0x1a2630, 1.15));
  const sun = new THREE.DirectionalLight(0xffe2b0, 2.3); sun.position.set(-60, 90, 40); sT.add(sun);
  const rim = new THREE.DirectionalLight(0x6fa8ff, 0.7); rim.position.set(70, 30, -60); sT.add(rim);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), new THREE.MeshStandardMaterial({ color: 0x16323f, roughness: 0.35, metalness: 0.25 })); sea.rotation.x = -Math.PI / 2; sea.position.y = -0.02; sT.add(sea);
  const tiles = new THREE.InstancedMesh(new THREE.BoxGeometry(0.93, 1, 0.93).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ roughness: 0.62, metalness: 0.06 }), NC); sT.add(tiles);
  const castles = new Set(Object.values(M.castle)); const dummy = new THREE.Object3D();
  function setCells(cells) {
    for (let i = 0; i < NC; i++) {
      const L = cells[i], x = M.cells[2 * i] - W / 2 + .5, z = M.cells[2 * i + 1] - H / 2 + .5;
      const h = castles.has(i) ? 3.2 : L === 'w' ? 0.32 + hash(i) * 0.16 : 0.95 + hash(i) * 0.55;
      dummy.position.set(x, 0, z); dummy.scale.set(1, h, 1); dummy.updateMatrix(); tiles.setMatrixAt(i, dummy.matrix);
      const c = col(L); if (L !== 'w') c.offsetHSL(0, 0, (hash(i + 7) - 0.5) * 0.07); else c.offsetHSL(0, 0, (hash(i + 3) - 0.5) * 0.05); tiles.setColorAt(i, c);
    }
    tiles.instanceMatrix.needsUpdate = true; if (tiles.instanceColor) tiles.instanceColor.needsUpdate = true;
  }
  // 天守閣の上に、武将の印を浮かべる
  const marks = [];
  for (const f of TK.F) { const i = M.castle[f.L]; const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(TK.crest(f, 160)), depthTest: true, fog: true })); sp.material.map.colorSpace = THREE.SRGBColorSpace; sp.position.set(M.cells[2 * i] - W / 2 + .5, 7.5, M.cells[2 * i + 1] - H / 2 + .5); sp.scale.set(6.4, 6.4, 1); sT.add(sp); marks.push(sp); }
  // 名所：富士山（雪をかぶった山）と、安土城（金の塔）。ほかの名所は小さな金の印
  for (const lm of (M.lm || [])) {
    const x = lm.x - W / 2, z = lm.y - H / 2;
    if (lm.id === 'fuji') { const m = new THREE.Mesh(new THREE.ConeGeometry(2.3, 5.2, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0x4f6a8f, roughness: 0.8 })); m.position.set(x, 3.3, z); sT.add(m); const cap = new THREE.Mesh(new THREE.ConeGeometry(0.98, 2.2, 24), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 })); cap.position.set(x, 4.85, z); sT.add(cap); }
    else if (lm.id === 'azuchi') { const g = new THREE.MeshStandardMaterial({ color: 0xe3b84f, roughness: 0.3, metalness: 0.85, emissive: 0x5a3a00, emissiveIntensity: 0.6 }); let y = 1.2; for (const [w, h] of [[2.2, 1.0], [1.6, 0.9], [1.0, 0.8]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), g); b.position.set(x, y + h / 2, z); sT.add(b); y += h; } const r = new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.9, 4), new THREE.MeshStandardMaterial({ color: 0xc8321f, roughness: 0.5 })); r.rotation.y = Math.PI / 4; r.position.set(x, y + 0.45, z); sT.add(r); }
    else { const o = new THREE.Mesh(new THREE.OctahedronGeometry(lm.c.length > 4 ? 0.9 : 0.6), new THREE.MeshStandardMaterial({ color: 0xf0c850, roughness: 0.3, metalness: 0.8, emissive: 0x6a4a00, emissiveIntensity: 0.5 })); o.position.set(x, 2.6, z); sT.add(o); }
  }
  // 飛ぶ道すじ（九州 → 近畿 → 関東 → 東北 → もどる）
  const PATH = [[32, 133], [58, 112], [86, 100], [108, 92], [128, 86], [138, 56]].map(p => new THREE.Vector3(p[0] - W / 2, 0, p[1] - H / 2));
  const curve = new THREE.CatmullRomCurve3(PATH), tgt = new THREE.Vector3();
  function frameTitle(t) {
    const k = (t / 1000 / 70) % 1, u = k < 0.5 ? k * 2 : 2 - k * 2, e = u * u * (3 - 2 * u);
    curve.getPoint(e, tgt); const a = Math.sin(t / 9000) * 0.5 - 0.5, narrow = cam.aspect < 0.8, d = narrow ? 120 : 62;
    cam.position.set(tgt.x + Math.sin(a) * d, narrow ? 112 : 50, tgt.z + Math.cos(a) * d); cam.lookAt(tgt.x, 0, tgt.z + (narrow ? 6 : -6));
    const ms = narrow ? 6.4 : 4.4; for (let i = 0; i < marks.length; i++) marks[i].scale.set(ms, ms, 1);
    for (let i = 0; i < marks.length; i++) marks[i].position.y = 7.5 + Math.sin(t / 700 + i) * 0.35;
    renderer.render(sT, cam);
  }

  // ---------- のぼり旗 ----------
  const sB = new THREE.Scene();
  sB.add(new THREE.HemisphereLight(0xfff4dd, 0x2a2018, 1.5)); const key = new THREE.DirectionalLight(0xfff0cf, 2.2); key.position.set(-3, 5, 6); sB.add(key);
  const back = new THREE.DirectionalLight(0xffc56b, 1.4); back.position.set(4, 2, -6); sB.add(back);
  const FW = 2.5, FH = 5.4, SX = 14, SY = 28;
  const flagGeo = new THREE.PlaneGeometry(FW, FH, SX, SY); const flagMat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.82, metalness: 0.02 });
  const flag = new THREE.Mesh(flagGeo, flagMat); const rig = new THREE.Group(); sB.add(rig); rig.add(flag);
  const lac = new THREE.MeshStandardMaterial({ color: 0x1a120c, roughness: 0.35, metalness: 0.3 }), gold = new THREE.MeshStandardMaterial({ color: 0xd9b45a, roughness: 0.3, metalness: 0.85 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 8.4, 10), lac); pole.position.set(-FW / 2 - 0.1, -1.2, 0); rig.add(pole);
  const barM = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, FW + 0.35, 8), lac); barM.rotation.z = Math.PI / 2; barM.position.set(-0.05, FH / 2 + 0.06, 0); rig.add(barM);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.42, 10), gold); tip.position.set(-FW / 2 - 0.1, 3.2, 0); rig.add(tip);
  // 後光（金の光のすじ）
  const rayTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d'); x.translate(256, 256); for (let i = 0; i < 28; i++) { x.rotate(Math.PI * 2 / 28); const g = x.createLinearGradient(0, 0, 250, 0); g.addColorStop(0, 'rgba(255,225,150,.55)'); g.addColorStop(1, 'rgba(255,225,150,0)'); x.fillStyle = g; x.beginPath(); x.moveTo(0, 0); x.lineTo(250, -(i % 2 ? 9 : 20)); x.lineTo(250, (i % 2 ? 9 : 20)); x.closePath(); x.fill(); } const g = x.createRadialGradient(0, 0, 0, 0, 0, 180); g.addColorStop(0, 'rgba(255,240,200,.6)'); g.addColorStop(1, 'rgba(255,240,200,0)'); x.fillStyle = g; x.beginPath(); x.arc(0, 0, 180, 0, 7); x.fill(); return new THREE.CanvasTexture(c); })();
  const rays = new THREE.Mesh(new THREE.PlaneGeometry(17, 17), new THREE.MeshBasicMaterial({ map: rayTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8 })); rays.position.set(0, 0.3, -3.2); sB.add(rays);
  // 金の粉
  const PN = 220, pg = new THREE.BufferGeometry(), pp = new Float32Array(PN * 3); for (let i = 0; i < PN; i++) { pp[i * 3] = (hash(i) - 0.5) * 12; pp[i * 3 + 1] = (hash(i + 99) - 0.5) * 13; pp[i * 3 + 2] = (hash(i + 199) - 0.5) * 6 - 0.5; } pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  const dust = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xffdf8a, size: 0.07, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })); sB.add(dust);
  // 天守閣（箱と屋根を重ねた、かんたんな城）
  const castle = new THREE.Group(); { const wall = new THREE.MeshStandardMaterial({ color: 0xefe6d2, roughness: 0.8 }), roof = new THREE.MeshStandardMaterial({ color: 0x23201f, roughness: 0.5, metalness: 0.25 }), stone = new THREE.MeshStandardMaterial({ color: 0x5b554c, roughness: 0.95 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.7, 0.9, 4), stone); base.rotation.y = Math.PI / 4; base.position.y = 0.45; castle.add(base);
    let y = 0.9; for (const [w, h] of [[1.55, 0.62], [1.15, 0.55], [0.78, 0.5]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), wall); b.position.y = y + h / 2; castle.add(b); const r = new THREE.Mesh(new THREE.ConeGeometry(w * 0.98, 0.42, 4), roof); r.rotation.y = Math.PI / 4; r.position.y = y + h + 0.16; castle.add(r); y += h + 0.2; }
    for (const s of [-1, 1]) { const k = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.3, 6), gold); k.position.set(s * 0.22, y + 0.2, 0); castle.add(k); } }
  castle.position.set(2.5, -4.6, -2.2); castle.scale.setScalar(1.05); castle.rotation.y = -0.5; sB.add(castle);
  function flagTexture(f, goldish) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 1106; const x = c.getContext('2d'), ink = TK.ink(f.col);
    x.fillStyle = f.col; x.fillRect(0, 0, 512, 1106);
    const g = x.createLinearGradient(0, 0, 512, 1106); g.addColorStop(0, 'rgba(255,255,255,.16)'); g.addColorStop(.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.24)'); x.fillStyle = g; x.fillRect(0, 0, 512, 1106);
    x.strokeStyle = goldish ? '#f0d27a' : (ink === '#fff8e7' ? 'rgba(255,248,231,.55)' : 'rgba(29,23,18,.5)'); x.lineWidth = 7; x.strokeRect(22, 22, 468, 1062);
    x.drawImage(TK.kamon(f.kamon, 380, ink), 66, 86);
    const nm = f.nm[0]; x.fillStyle = ink; x.textAlign = 'center'; x.textBaseline = 'middle'; const n = Array.from(nm).length, fs = Math.min(122, 560 / n); x.font = `400 ${fs}px ${TK.FONT_T}`;
    Array.from(nm).forEach((ch, i) => x.fillText(ch, 256, 520 + fs * 0.62 + i * fs * 1.06));
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  }
  const P0 = flagGeo.attributes.position.array.slice(); let gust = 1, bGold = 0;
  function frameBanner(t) {
    const s = t / 1000, pos = flagGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) { const x = P0[i * 3], y = P0[i * 3 + 1], u = (x + FW / 2) / FW; const w = Math.sin(u * 4.2 - s * 3.4 + y * 0.9) * 0.2 + Math.sin(u * 7.5 - s * 5.1 - y * 1.7) * 0.07; pos.array[i * 3 + 2] = w * u * gust; pos.array[i * 3] = x - u * u * 0.12 * (1 + Math.sin(s * 1.3)) * gust; }
    pos.needsUpdate = true; flagGeo.computeVertexNormals();
    rays.rotation.z = s * 0.08; rays.material.opacity = (bGold ? 1 : 0.7) + Math.sin(s * 1.7) * 0.12;
    const dp = dust.geometry.attributes.position; for (let i = 0; i < PN; i++) { let y = dp.array[i * 3 + 1] + 0.006 + hash(i + 5) * 0.012; if (y > 6.5) y = -6.5; dp.array[i * 3 + 1] = y; dp.array[i * 3] += Math.sin(s + i) * 0.002; } dp.needsUpdate = true;
    rig.rotation.y = Math.sin(s * 0.5) * 0.12 - 0.12;
    renderer.render(sB, cam);
  }
  function placeBanner() {
    // 縦長の画面では、旗を上のほうに見せる（下は説明の札がのる）
    const narrow = cam.aspect < 0.9; cam.fov = 36; cam.position.set(0, narrow ? -2.6 : -0.6, narrow ? 21 : 15); cam.lookAt(0, narrow ? -3.4 : -1.2, 0); cam.updateProjectionMatrix();
    rays.position.y = 0.3; castle.visible = true; castle.position.set(narrow ? 2.4 : 4.2, narrow ? -3.4 : -3.6, -2.2);
  }
  function resize() { const w = window.innerWidth, h = window.innerHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); if (mode === 'banner') placeBanner(); }
  window.addEventListener('resize', resize);
  function loop(t) { raf = 0; if (mode === 'off' || document.hidden) return; if (mode === 'title') frameTitle(t - t0); else frameBanner(t - t0); raf = requestAnimationFrame(loop); }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && mode !== 'off' && !raf) raf = requestAnimationFrame(loop); });
  TK.scene = {
    setCells,
    mode(m, o) {
      o = o || {}; mode = m; cv.style.visibility = m === 'off' ? 'hidden' : 'visible';
      if (m === 'title') { cam.fov = 36; setCells(N.cells || (N.store('tk_c') || {}).c || M.own); resize(); cv.style.filter = o.dim ? 'brightness(.5) blur(2px)' : ''; }
      if (m === 'banner') { cv.style.filter = ''; const f = o.f || TK.F[0]; if (flagMat.map) flagMat.map.dispose(); flagMat.map = flagTexture(f, o.gold); flagMat.needsUpdate = true; bGold = o.gold ? 1 : 0; resize(); placeBanner();
        if (window.gsap) { rig.scale.set(1, 0.02, 1); rig.position.y = 6; gsap.to(rig.scale, { y: 1, duration: 1.1, ease: 'elastic.out(1,0.6)', delay: 0.25 }); gsap.to(rig.position, { y: 0, duration: 0.9, ease: 'power3.out', delay: 0.15 }); gust = 2.4; gsap.to({ v: 2.4 }, { v: 1, duration: 2.4, onUpdate() { gust = this.targets()[0].v; } }); castle.scale.setScalar(0.01); gsap.to(castle.scale, { x: 1.05, y: 1.05, z: 1.05, duration: 0.8, delay: 0.9, ease: 'back.out(1.7)' }); } }
      if (m !== 'off' && !raf) raf = requestAnimationFrame(loop);
    },
  };
  resize();
  if (TK.sceneWant) TK.scene.mode(TK.sceneWant[0], TK.sceneWant[1]);
} else { TK.scene = { mode() { }, setCells() { } }; }
