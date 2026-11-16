// 診断で20人にまんべんなく当たるように、下駄（TK.BIAS）を計算で決める → js/data.js に書きこむ
//  答えの組み合わせ 4^10＝1,048,576 通りを全部数える
import fs from 'fs';
const path = new URL('../js/data.js', import.meta.url);
let src = fs.readFileSync(path, 'utf8');
globalThis.window = globalThis; (0, eval)(src);
const TK = globalThis.TK, F = TK.F, Q = TK.Q;
const NORM = F.map(f => Math.hypot(...f.v));
// 答えの組ごとの性格（8つ）を先に作る
const N = 4 ** 10, T = new Int8Array(N * 8);
for (let c = 0; c < N; c++) { let x = c; for (let i = 0; i < 10; i++) { const w = Q[i].a[x & 3][1]; x >>= 2; for (let k = 0; k < 8; k++) T[c * 8 + k] += w[k]; } }
const base = new Float32Array(N * 20);
for (let c = 0; c < N; c++) for (let i = 0; i < 20; i++) { let s = 0; for (let k = 0; k < 8; k++) s += T[c * 8 + k] * F[i].v[k]; base[c * 20 + i] = s / NORM[i]; }
function count(bias) { const n = new Array(20).fill(0); for (let c = 0; c < N; c++) { let b = 0, bs = -1e9; for (let i = 0; i < 20; i++) { const s = base[c * 20 + i] + bias[i]; if (s > bs + 1e-9) { bs = s; b = i; } } n[b]++; } return n; }
let bias = new Array(20).fill(0), lr = 1.2;
for (let it = 0; it < 140; it++) {
  const n = count(bias); const mx = Math.max(...n) / N, mn = Math.min(...n) / N;
  if (it % 20 === 0) console.log(it, '最大', (mx * 100).toFixed(2) + '%', '最小', (mn * 100).toFixed(2) + '%');
  for (let i = 0; i < 20; i++) bias[i] += lr * (0.05 - n[i] / N) * 4;
  lr *= 0.985;
}
bias = bias.map(b => Math.round((b - Math.min(...bias)) * 1000) / 1000);
const n = count(bias);
console.log(F.map((f, i) => f.nm[0] + ' ' + (n[i] / N * 100).toFixed(1) + '%').join('  '));
src = src.replace(/TK\.BIAS = \[[^\]]*\];/, 'TK.BIAS = [' + bias.join(', ') + '];');
fs.writeFileSync(path, src);
console.log('下駄を書きこみました', bias.join(','));
