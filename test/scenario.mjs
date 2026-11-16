// ルールの試験の台本（にせのデータベースでも、本物の ft-blue の試験用の場所 tkt でも、同じ台本を流す）
//  drv：{ user(名前)→匿名ID, update(書きこみ, 匿名ID)→true/false, read(場所, 匿名ID)→{ok,val}, admin(書きこみ), advance(ミリ秒)（にせのときだけ）, real }
export const SV = { '.sv': 'timestamp' }, INC = n => ({ '.sv': { increment: n } });
let seq = 0; const pid = () => 'T' + Date.now().toString(36) + (seq++).toString(36).padStart(3, '0') + 'abcdefgh';
// 試験用の小さな地図：マス 0〜7 が一列。0・1＝織田(a)、5・6＝武田(b)、7＝上杉(c)の天守閣、ほかは白。天守閣は 0・6・7
export function seed() {
  const c = ['a', 'a', 'w', 'w', 'w', 'b', 'b', 'c'], adj = {}, n = { w: 3 }, m = {};
  for (let i = 0; i < 8; i++) { adj[i] = {}; if (i > 0) adj[i][i - 1] = true; if (i < 7) adj[i][i + 1] = true; }
  for (const L of 'abcdefghijklmnopqrst') { n[L] = 1; m[L] = 0; }
  n.a = 2; n.b = 2;
  return { c, adj, k: { 0: 'a', 6: 'b', 7: 'c' }, s: { n, m, ver: 0 } };
}
export async function run(drv, log = console.log) {
  let pass = 0, fail = 0;
  const ok = (c, m) => { if (c) { pass++; log('  ○ ' + m); } else { fail++; log('  × ' + m); } };
  const yes = async (p, m) => ok(await p === true, m), no = async (p, m) => ok(await p === false, m + '（はじかれる）');
  const A = await drv.user('A'), B = await drv.user('B'), C = await drv.user('C'), D = await drv.user('D'), E = await drv.user('E');
  const join = (u, f, nm, x = {}) => drv.update(Object.assign({ ['u/' + u + '/f']: f, ['u/' + u + '/h']: f, ['u/' + u + '/n']: nm, ['u/' + u + '/j']: SV, ['s/m/' + f]: INC(1) }, x), u);
  const take = (u, c, v, f, p, nm, x = {}) => { const id = pid(), w = x.w !== undefined ? x.w : (c > v ? v - 1 : v + 1); return drv.update(Object.assign({ ['c/' + c]: f, ['u/' + u + '/t']: SV, ['u/' + u + '/c']: String(c), ['u/' + u + '/v']: String(v), ['u/' + u + '/l']: id, ['s/n/' + f]: INC(1), ['s/n/' + p]: INC(-1), ['log/' + id]: Object.assign({ t: SV, y: 't', c: String(c), f, p, n: nm, h: x.h || f, u: x.u || u }, x.r ? { r: true } : {}) }, w === null ? {} : { ['u/' + u + '/w']: String(w) }, x.more || {}), u); };

  log('1) 仕える');
  await no(drv.update({ ['u/' + A + '/f']: 'a', ['u/' + A + '/h']: 'b', ['u/' + A + '/n']: '与作', ['u/' + A + '/j']: SV, ['s/m/a']: INC(1) }, A), '名前の国を別の武将にはできない');
  await no(drv.update({ ['u/' + A + '/f']: 'a', ['u/' + A + '/h']: 'a', ['u/' + A + '/n']: '与作', ['u/' + A + '/j']: SV }, A), '家臣の数を増やさずには仕えられない');
  await no(join(A, 'a', '九文字の名前はだめ'), '名前は8文字まで');
  await no(drv.update({ ['u/' + B + '/f']: 'a', ['u/' + B + '/h']: 'a', ['u/' + B + '/n']: 'にせ', ['u/' + B + '/j']: SV, ['s/m/a']: INC(1) }, A), '他人の名前では仕えられない');
  await yes(join(A, 'a', '与作'), 'Aが織田に仕える');
  await no(drv.update({ ['u/' + A + '/n']: '改名' }, A), '名前はあとから変えられない');
  await no(join(A, 'b', '与作'), '診断のやり直しで武将を変えられない');
  await yes(join(B, 'b', '太郎'), 'Bが武田に仕える');
  await yes(join(C, 'b', '次郎'), 'Cが武田に仕える');
  ok((await drv.read('s/m/b', A)).val === 2, '武田の家臣が2人');
  ok((await drv.read('u/' + A, A)).val.f === 'a', '自分の記録は読める');
  ok(!(await drv.read('u/' + A, B)).ok, '他人の記録は読めない');

  log('2) マスを取る');
  await no(take(A, 4, 1, 'a', 'w', '与作'), 'となりでないマスは取れない');
  await no(take(A, 2, 3, 'a', 'w', '与作'), '足場が自分の陣営のマスでないと取れない');
  await no(take(A, 1, 0, 'a', 'a', '与作'), '自分の陣営のマスは取れない');
  await no(take(A, 2, 1, 'b', 'w', '与作'), '別の陣営の色では取れない');
  { const id = pid(); await no(drv.update({ ['c/2']: 'a', ['u/' + A + '/t']: SV, ['u/' + A + '/c']: '2', ['u/' + A + '/v']: '1', ['u/' + A + '/l']: id, ['log/' + id]: { t: SV, y: 't', c: '2', f: 'a', p: 'w', n: '与作', h: 'a' } }, A), 'マスの数を数えずには取れない'); }
  await no(take(A, 2, 1, 'a', 'w', '与作', { more: { 'c/3': 'a' } }), '1回で2マスは取れない');
  await no(take(A, 2, 1, 'a', 'b', '与作'), '前の持ち主をいつわれない');
  await no(drv.update({ 's/n/a': INC(1) }, A), 'マスの数だけを増やせない');
  await no(drv.update({ 'c/2': 'a' }, A), 'マスだけを書きかえられない');
  await no(take(A, 2, 1, 'a', 'w', 'にせ者'), '記録の名前をいつわれない');
  await no(take(A, 2, 1, 'a', 'w', '与作', { u: B }), '記録の匿名IDをいつわれない');
  await yes(take(A, 2, 1, 'a', 'w', '与作'), 'Aが白いマス2を取る');
  ok((await drv.read('c/2', B)).val === 'a', 'マス2が織田のものになった');
  ok((await drv.read('s/n/a', B)).val === 3 && (await drv.read('s/n/w', B)).val === 2, '織田3マス・白2マス');
  await no(take(A, 3, 2, 'a', 'w', '与作'), '3時間たつまで次は取れない');
  await yes(take(B, 4, 5, 'b', 'w', '太郎'), 'Bが白いマス4を取る');
  await no(take(C, 7, 6, 'b', 'c', '次郎'), '天守閣は取れない');
  await yes(take(C, 3, 4, 'b', 'w', '次郎'), 'Cが白いマス3を取る（Bが取ったばかりのマスを足場に）');
  if (drv.advance) {
    await drv.advance(3 * 3600 * 1000 - 5000); await no(take(A, 3, 2, 'a', 'b', '与作'), '3時間の5秒前はまだ取れない');
    await drv.advance(6000); await yes(take(A, 3, 2, 'a', 'b', '与作'), '3時間たつと、武田のマス3を奪える');
    ok((await drv.read('s/n/a', B)).val === 4 && (await drv.read('s/n/b', B)).val === 3, '織田4マス・武田3マス');
    await drv.advance(3 * 3600 * 1000 + 1000); await yes(take(B, 3, 4, 'b', 'a', '太郎'), '武田がマス3を取り返す');
  }
  const lg = (await drv.read('log', E)).val || {};
  ok(Object.keys(lg).length >= 3, '取った記録がだれでも読める（' + Object.keys(lg).length + '件）');

  log('3) 掲示板');
  const post = (u, room, o, x = {}) => drv.update(Object.assign({ ['u/' + u + '/bt']: SV, ['b/' + room + '/' + pid()]: Object.assign({ t: SV, u }, o) }, x), u);
  await yes(post(A, 'a', { n: '与作', h: 'a', f: 'a', m: '美濃を攻めよう' }), 'Aが織田の軍議に書く');
  await no(post(A, 'a', { n: '与作', h: 'a', f: 'a', m: 'すぐもう一回' }), '15秒たつまで次は書けない');
  await no(post(B, 'a', { n: '太郎', h: 'b', f: 'b', m: 'しのびこむ' }), '他の陣営の軍議には書けない');
  ok(!(await drv.read('b/a', B)).ok, '他の陣営の軍議は読めない');
  ok((await drv.read('b/a', A)).ok, '自分の陣営の軍議は読める');
  await no(post(B, 'all', { n: 'なすP', h: 'b', f: 'b', m: '名前をいつわる' }), '名前をいつわって書けない');
  await no(post(B, 'all', { n: '太郎', h: 'b', f: 'b', m: 'あ'.repeat(101) }), '100文字をこえて書けない');
  await no(post(B, 'all', { n: '太郎', h: 'b', f: 'b', m: '管理人のふり', g: true }), '管理人の印はつけられない');
  await yes(post(B, 'all', { n: '太郎', h: 'b', f: 'b', m: 'よろしく' }), 'Bが全体の板に書く');
  ok((await drv.read('b/all', E)).ok, '全体の板はだれでも読める');

  log('4) 寝返り');
  const defect = (u, from, to, nm, h) => { const id = pid(); return drv.update({ ['u/' + u + '/f']: to, ['u/' + u + '/d']: SV, ['u/' + u + '/r']: true, ['u/' + u + '/l']: id, ['s/m/' + to]: INC(1), ['s/m/' + from]: INC(-1), ['log/' + id]: { t: SV, y: 'd', f: to, p: from, n: nm, h, r: true } }, u); };
  await no(defect(A, 'a', 'b', '与作', 'a'), 'マスがいちばん少なくない武将へは寝返れない');
  await yes(defect(A, 'a', 'd', '与作', 'a'), 'Aが、いちばん少ない武将（同じ数のうちの1人）へ寝返る');
  ok((await drv.read('u/' + A, A)).val.h === 'a', '名前の国は、最初に仕えた武将のまま');
  await no(defect(A, 'd', 'e', '与作', 'a'), '3日たつまで次は寝返れない');
  ok(!(await drv.read('b/a', A)).ok && (await drv.read('b/d', A)).ok, '寝返ると、前の軍議は読めず、新しい軍議が読める');
  if (drv.advance) { await drv.advance(3 * 24 * 3600 * 1000 + 1000); await yes(defect(A, 'd', 'e', '与作', 'a'), '3日たつと、また寝返れる'); }

  log('5) なすPへの質問・いま開いている人');
  const ask = (u, m) => drv.update({ ['u/' + u + '/a']: SV, ['ask/' + pid()]: { t: SV, u, m, l: 'ja', x: '', n: '武田の太郎' } }, u);
  await yes(ask(B, 'ランキングがほしいです'), '質問を送れる');
  await no(ask(B, 'すぐもう一回'), '1分たつまで次は送れない');
  ok(!(await drv.read('ask', B)).ok, '質問は管理人しか読めない');
  await yes(drv.update({ ['on/' + B]: { t: SV, f: 'b' } }, B), '開いている印をつけられる');
  ok(typeof (await drv.read('on/' + B + '/t', B)).val === 'number', '自分の時刻を読める（時計合わせ）');

  log('6) 書きこめなくした人');
  await drv.admin({ ['ban/' + C]: true });
  if (drv.advance) await drv.advance(4 * 3600 * 1000);
  await no(post(C, 'all', { n: '次郎', h: 'b', f: 'b', m: 'あらし' }), '書きこめなくした人は板に書けない');

  log('6b) 囲まれたマスは足場にできない（天守閣は別）');
  { const F = await drv.user('F'), G2 = await drv.user('G'), H = await drv.user('H');
    await yes(join(F, 'e', '五郎'), 'Fが徳川に仕える'); await yes(join(G2, 'a', '六郎'), 'Gが織田に仕える'); await yes(join(H, 'e', '七郎'), 'Hが徳川に仕える');
    await drv.admin({ 'c/1': 'b', 'c/2': 'b', 'c/3': 'e', 'c/4': 'b' });
    await no(take(F, 4, 3, 'e', 'b', '五郎', { w: 2 }), '四方を敵に囲まれた1マスは、足場にできない');
    await no(take(F, 4, 3, 'e', 'b', '五郎', { w: null }), '足場のとなりを言わずには取れない');
    await no(take(F, 4, 3, 'e', 'b', '五郎', { w: 6 }), '足場のとなりでないマスを言っても取れない');
    await drv.admin({ 'c/2': 'w', 's/n/w': 5 });
    await yes(take(F, 4, 3, 'e', 'b', '五郎', { w: 2 }), 'となりに白いマスがあれば、足場にできる');
    await yes(take(H, 2, 3, 'e', 'w', '七郎', { w: 2 }), '白いマスを取るときは、その白いマスが「となり」になる');
    await yes(take(G2, 1, 0, 'a', 'b', '六郎', { w: null }), '天守閣は、囲まれていても足場にできる');
    await drv.admin({ 'c/1': 'a', 'c/2': 'b', 'c/3': 'b', 'c/4': 'b' }); }

  log('7) 天下統一（半分の2500マス）');
  await yes(join(D, 'b', '三郎'), 'Dが武田に仕える');
  const nb = (await drv.read('s/n/b', D)).val;
  await drv.admin({ 's/n/b': 2499 });
  const c2 = (await drv.read('c/2', D)).val, c3 = (await drv.read('c/3', D)).val;
  // 武田のとなりにある、武田でないマスを探す（2 か 1）
  const tgt = c2 !== 'b' ? 2 : 1, via = tgt + 1, prev = (await drv.read('c/' + tgt, D)).val;
  await no(take(D, tgt, via, 'b', prev, '三郎'), '2500マス目は、終わりの印なしでは取れない');
  await no(drv.update({ 's/end': { f: 'b', t: SV, k: 'half' } }, D), '2500マスに届かないのに終わりにはできない');
  await yes(take(D, tgt, via, 'b', prev, '三郎', { more: { 's/end': { f: 'b', t: SV, k: 'half' } } }), '2500マス目を取ると天下統一');
  ok(((await drv.read('s/end', E)).val || {}).f === 'b', '天下人は武田');
  await no(join(E, 'c', '四郎'), '終わったあとは仕えられない');
  await yes(ask(E, '楽しかった'), '終わったあとも質問は送れる');
  return { pass, fail };
}
