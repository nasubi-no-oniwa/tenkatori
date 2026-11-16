// =============================================
//  天下取りマース  ドット絵の演出（道具箱の pixelfx を使う）
//   TK.fx(名前, 画面のx, 画面のy, 設定)：その場所で演出を1回流す
//   名前：take（マスを取った）／firework（花火）／confetti（紙吹雪）／dark（寝返り）／sun（後光・止めるまで続く）／sakura（桜・止めるまで続く）
// =============================================
import { createFrame, clearFrame, createFx, composite } from './pixelfx/core/index.js';
import * as collect from './pixelfx/fx/pickups/collect-burst.js';
import * as firework from './pixelfx/fx/explosions/firework-burst.js';
import * as confetti from './pixelfx/fx/ui/confetti.js';
import * as sunburst from './pixelfx/fx/holy/sunburst.js';
import * as dark from './pixelfx/fx/shadow/dark-explosion.js';
import * as sakura from './pixelfx/fx/weather/cherry-blossoms.js';
const TK = window.TK;
const GOLD = ['#2a1604', '#5a3208', '#96600e', '#d09a1c', '#f6cc3c', '#ffe98a', '#fff7cf', '#ffffff'];
const MOD = { take: [collect, { palette: GOLD }], firework: [firework, {}], confetti: [confetti, {}], sun: [sunburst, {}], dark: [dark, {}], sakura: [sakura, {}] };
const cv = document.getElementById('fx'), ctx = cv.getContext('2d');
let PX = 3, frame = null, img = null, list = [], raf = 0, last = 0;
function size() {
  const w = window.innerWidth, h = window.innerHeight; PX = w > 900 ? 4 : 3;
  const fw = Math.ceil(w / PX), fh = Math.ceil(h / PX);
  if (frame && frame.w === fw && frame.h === fh) return;
  cv.width = fw; cv.height = fh; frame = createFrame(fw, fh); img = new ImageData(fw, fh);
}
function tick(t) {
  raf = 0; const dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t;
  size(); clearFrame(frame);
  list = list.filter(f => !f.done());
  for (const f of list) { f.update(dt); f.draw(frame, 'back'); f.draw(frame, 'front'); }
  composite(frame, img.data, null); ctx.putImageData(img, 0, 0);
  if (list.length) raf = requestAnimationFrame(tick); else ctx.clearRect(0, 0, cv.width, cv.height);
}
TK.fx = function (name, x, y, opt) {
  const m = MOD[name]; if (!m) return null; size();
  const o = Object.assign({ x: Math.round(x / PX), y: Math.round(y / PX), seed: 1 + Math.floor(Math.random() * 9999) }, m[1], opt || {});
  const f = createFx(m[0], o); list.push(f);
  if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
  return f;
};
// 花火をいくつか続けて上げる
TK.fireworks = function (n, cols) {
  const w = window.innerWidth, h = window.innerHeight;
  const pals = cols || [['#3d0a0a', '#701515', '#b02222', '#f53c3c', '#ff8686', '#ffd2d2', '#ffffff'], ['#3d2a0a', '#705015', '#b08a22', '#f5cc3c', '#ffe686', '#fff6d2', '#ffffff'], ['#0a2a3d', '#154a70', '#227ab0', '#3cb4f5', '#86d6ff', '#d2f0ff', '#ffffff']];
  for (let i = 0; i < n; i++) setTimeout(() => TK.fx('firework', w * (0.18 + Math.random() * 0.64), h * (0.2 + Math.random() * 0.3), { palette: pals[i % pals.length] }), i * 650 + Math.random() * 250);
};
window.dispatchEvent(new Event('tk-fx-ready'));
