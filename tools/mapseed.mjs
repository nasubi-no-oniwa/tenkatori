// 最初の地図をデータベースに入れる形に直す（マスの持ち主・となりの表・天守閣・数）
export function build(m) {
  const N = m.n, c = m.own.split(''), adj = {}, pos = new Map();
  for (let i = 0; i < N; i++) pos.set(m.cells[2 * i] + ',' + m.cells[2 * i + 1], i);
  const link = (a, b) => { (adj[a] = adj[a] || {})[b] = true; (adj[b] = adj[b] || {})[a] = true; };
  for (let i = 0; i < N; i++) { const x = m.cells[2 * i], y = m.cells[2 * i + 1]; for (const [dx, dy] of [[1, 0], [0, 1]]) { const j = pos.get((x + dx) + ',' + (y + dy)); if (j !== undefined) link(i, j); } }
  for (const [a, b] of m.sea) link(a, b);
  const n = { w: 0 }, mm = {}, k = {};
  for (const L of 'abcdefghijklmnopqrst') { n[L] = 0; mm[L] = 0; }
  for (const L of c) n[L]++;
  for (const L in m.castle) k[m.castle[L]] = L;
  if (Object.keys(adj).length !== N) throw new Error('となりのないマスがあります');
  return { c, adj, k, s: { n, m: mm, ver: 0 } };
}
