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
  // 端末の指紋（11/26）：ふだんは人ごとにちがう指紋で仕官する（x.fp で指紋を決められる。x.fp === false なら指紋なし）
  const fpOf = u => ('f' + String(u).toLowerCase().replace(/[^0-9a-z]/g, '')).slice(0, 16).padEnd(6, '0');
  const join = (u, f, nm, x = {}) => { const fp = x.fp === undefined ? fpOf(u) : x.fp; const y = Object.assign({}, x); delete y.fp;
    return drv.update(Object.assign({ ['u/' + u + '/f']: f, ['u/' + u + '/h']: f, ['u/' + u + '/n']: nm, ['u/' + u + '/j']: SV, ['s/m/' + f]: INC(1) }, fp ? { ['u/' + u + '/fp']: fp, ['fpj/' + fp]: { t: SV, u } } : {}, y), u); };
  const take = (u, c, v, f, p, nm, x = {}) => { const id = pid(), w = x.w !== undefined ? x.w : (c > v ? v - 1 : v + 1); return drv.update(Object.assign({ ['c/' + c]: f, ['u/' + u + '/t']: SV, ['u/' + u + '/c']: String(c), ['u/' + u + '/v']: String(v), ['u/' + u + '/l']: id, ['s/n/' + f]: INC(1), ['s/n/' + p]: INC(-1), ['log/' + id]: Object.assign({ t: SV, y: 't', c: String(c), f, p, n: nm, h: x.h || f, u: x.u || u }, x.r ? { r: true } : {}, x.k ? { k: x.k } : {}, x.xx ? { x: x.xx } : {}) }, w === null ? {} : { ['u/' + u + '/w']: String(w) }, x.noct ? {} : { ['ct/' + c]: SV }, x.more || {}), u); };

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

  const age = (...us) => drv.admin(Object.fromEntries(us.map(u => ['u/' + u + '/j', 1])));   // 仕官の時刻を昔にする（作り直し対策の待ちを過ぎた人として試す）
  log('2) マスを取る');
  await no(take(A, 2, 1, 'a', 'w', '与作'), '仕官して1時間たつまで、最初の1マスは取れない');
  await age(A, B, C);
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
  await no(take(A, 2, 1, 'a', 'w', '与作', { noct: 1 }), '取った時刻を書かずには取れない');
  await no(drv.update({ 'ct/2': SV }, A), '取った時刻だけを書きかえられない');
  await yes(take(A, 2, 1, 'a', 'w', '与作'), 'Aが白いマス2を取る');
  ok((await drv.read('c/2', B)).val === 'a', 'マス2が織田のものになった');
  ok((await drv.read('s/n/a', B)).val === 3 && (await drv.read('s/n/w', B)).val === 2, '織田3マス・白2マス');
  await no(take(A, 3, 2, 'a', 'w', '与作'), '1時間たつまで次は取れない');
  await yes(take(B, 4, 5, 'b', 'w', '太郎'), 'Bが白いマス4を取る');
  await no(take(C, 7, 6, 'b', 'c', '次郎'), '天守閣は取れない');
  await yes(take(C, 3, 4, 'b', 'w', '次郎'), 'Cが白いマス3を取る（Bが取ったばかりのマスを足場に）');
  if (drv.advance) {
    await drv.advance(1 * 3600 * 1000 - 5000); await no(take(A, 3, 2, 'a', 'b', '与作'), '1時間の5秒前はまだ取れない');
    await drv.advance(6000); await yes(take(A, 3, 2, 'a', 'b', '与作'), '1時間たつと、武田のマス3を奪える');
    ok((await drv.read('s/n/a', B)).val === 4 && (await drv.read('s/n/b', B)).val === 3, '織田4マス・武田3マス');
    await drv.advance(1 * 3600 * 1000 + 1000); await yes(take(B, 3, 4, 'b', 'a', '太郎'), '武田がマス3を取り返す');
  }
  const lg = (await drv.read('log', E)).val || {};
  ok(Object.keys(lg).length >= 3, '取った記録がだれでも読める（' + Object.keys(lg).length + '件）');

  log('3) 掲示板');
  const post = (u, room, o, x = {}) => drv.update(Object.assign({ ['u/' + u + '/bt']: SV, ['b/' + room + '/' + pid()]: Object.assign({ t: SV, u }, o) }, x), u);
  await yes(post(A, 'a', { n: '与作', h: 'a', f: 'a', m: '美濃を攻めよう' }), 'Aが織田の軍議に書く');
  await no(post(A, 'a', { n: '与作', h: 'a', f: 'a', m: 'すぐもう一回' }), '30秒たつまで次は書けない');
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
  { const N1 = await drv.user('N1'); await yes(join(N1, 'a', '新入り'), '新入りが織田に仕える'); await no(defect(N1, 'a', 'd', '新入り', 'a'), '仕官して3日たつまで寝返れない'); }
  await no(defect(A, 'a', 'b', '与作', 'a'), 'マスがいちばん少なくない武将へは寝返れない');
  await yes(defect(A, 'a', 'd', '与作', 'a'), 'Aが、いちばん少ない武将（同じ数のうちの1人）へ寝返る');
  ok((await drv.read('u/' + A, A)).val.h === 'a', '名前の国は、最初に仕えた武将のまま');
  await no(defect(A, 'd', 'e', '与作', 'a'), '3日たつまで次は寝返れない');
  ok(!(await drv.read('b/a', A)).ok && (await drv.read('b/d', A)).ok, '寝返ると、前の軍議は読めず、新しい軍議が読める');
  if (drv.advance) { await drv.advance(3 * 24 * 3600 * 1000 + 1000); await yes(defect(A, 'd', 'e', '与作', 'a'), '3日たつと、また寝返れる'); }
  // 三つ巴（11/24）：寝返りの受付をやめたら、だれも寝返れない
  { const N2 = await drv.user('N2'); await yes(join(N2, 'b', '古参'), '古参が武田に仕える'); await age(N2); await drv.admin({ ['u/' + N2 + '/j']: 1, 's/nodf': true });
    const weak = Object.entries((await drv.read('s/n', N2)).val || {}).filter(([L]) => L !== 'w' && L !== 'b').sort((x, y) => x[1] - y[1]);
    await no(defect(N2, 'b', weak[0][0], '古参', 'b'), '寝返りの受付をやめたら、いちばん少ない武将へも寝返れない');
    await drv.admin({ 's/nodf': null }); }
  // 三つ巴（11/24）：家→軍の表（s/mg）ができたら、軍にだけ仕えられる。家は、その軍に入った家ならよい
  { const mg = {}; for (const L of 'abcdefghijklmnopqrst') mg[L] = 'abcdefghij'.includes(L) ? 'a' : 'k'; mg.k = 'k';
    await drv.admin({ 's/mg': mg });
    const M1 = await drv.user('M1'), M2 = await drv.user('M2'), M3 = await drv.user('M3'), M4 = await drv.user('M4');
    await no(join(M1, 'b', '消えた家'), 'まとまって消えた家（武田）には仕えられない');
    await yes(join(M2, 'a', '武田の与力', { ['u/' + M2 + '/h']: 'b' }), '武田の家として、武田が入った軍（織田）に仕えられる');
    ok((await drv.read('u/' + M2, M2)).val.h === 'b', '家（h）は武田のまま');
    await no(join(M3, 'a', 'よその家', { ['u/' + M3 + '/h']: 'm' }), '別の軍に入った家（浅井→斎藤軍）を名乗って織田軍には仕えられない');
    await yes(join(M4, 'k', '斎藤の者'), '軍の家（斎藤）にはそのまま仕えられる');
    await drv.admin({ 's/mg': null }); }

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
    await yes(join(F, 'e', '五郎'), 'Fが徳川に仕える'); await yes(join(G2, 'a', '六郎'), 'Gが織田に仕える'); await yes(join(H, 'e', '七郎'), 'Hが徳川に仕える'); await age(F, G2, H);
    await drv.admin({ 'c/1': 'b', 'c/2': 'b', 'c/3': 'e', 'c/4': 'b' });
    await no(take(F, 4, 3, 'e', 'b', '五郎', { w: 2 }), '四方を敵に囲まれた1マスは、足場にできない');
    await no(take(F, 4, 3, 'e', 'b', '五郎', { w: null }), '足場のとなりを言わずには取れない');
    await no(take(F, 4, 3, 'e', 'b', '五郎', { w: 6 }), '足場のとなりでないマスを言っても取れない');
    await drv.admin({ 'c/2': 'w', 's/n/w': 5 });
    await yes(take(F, 4, 3, 'e', 'b', '五郎', { w: 2 }), 'となりに白いマスがあれば、足場にできる');
    await yes(take(H, 2, 3, 'e', 'w', '七郎', { w: 2 }), '白いマスを取るときは、その白いマスが「となり」になる');
    await yes(take(G2, 1, 0, 'a', 'b', '六郎', { w: null, k: 'fuji', xx: 'aso' }), '天守閣は、囲まれていても足場にできる（名所の占領・くずしも記録に入れられる）');
    await drv.admin({ 'c/1': 'a', 'c/2': 'b', 'c/3': 'b', 'c/4': 'b' }); }

  log('6c) 同時に取り合ったとき（10秒以内）：マスの少ない陣営が勝つ。負けたほうも一手を失う');
  { const P = await drv.user('P'), Q1 = await drv.user('Q1'), Q2 = await drv.user('Q2'), Q3 = await drv.user('Q3'), Q4 = await drv.user('Q4');
    await yes(join(P, 'a', '八郎'), 'Pが織田に仕える'); for (const [q, nm] of [[Q1, '九郎'], [Q2, '十郎'], [Q3, '十一'], [Q4, '十二']]) await yes(join(q, 'b', nm), nm + 'が武田に仕える'); await age(P, Q1, Q2, Q3, Q4);
    await drv.admin({ 'c/1': 'a', 'c/2': 'w', 'c/3': 'b', 'ct/2': null, 's/n/a': 5, 's/n/b': 9, 's/n/w': 5 });
    await yes(take(P, 2, 1, 'a', 'w', '八郎'), '織田（5マス）が白いマス2を取る');
    await no(take(Q1, 2, 3, 'b', 'a', '九郎'), 'すぐあとに来た武田（9マス）は、マスが多いので取れない');
    { const id = pid(); await yes(drv.update({ ['u/' + Q1 + '/t']: SV, ['u/' + Q1 + '/c']: '2', ['u/' + Q1 + '/l']: id, ['log/' + id]: { t: SV, y: 'f', c: '2', f: 'b', p: 'a', n: '九郎', h: 'b', u: Q1 } }, Q1), '負けた武田の人は「同時に攻めこんで敗れた」と記録して、一手を失う'); }
    await no(take(Q1, 4, 3, 'b', 'b', '九郎'), '敗れた人は、1時間たつまで取れない');
    await drv.admin({ 's/n/b': 3 });
    await yes(take(Q2, 2, 3, 'b', 'a', '十郎'), '武田のほうが少ない（3マス）なら、同時でも武田のものになる');
    ok((await drv.read('c/2', P)).val === 'b', 'マス2は武田のもの');
    await drv.admin({ 'c/2': 'a', 's/n/a': 6, 's/n/b': 5, 'ct/2': SV });
    { let won = 0; for (const q of [Q3, Q4]) { if (await take(q, 2, 3, 'b', (await drv.read('c/2', q)).val, q === Q3 ? '十一' : '十二')) { won++; break; } } ok(drv.advance ? won === 1 : true, '同じ数（5マスと5マス）なら、くじ（時計の偶数・奇数）で決まる'); }
    if (drv.advance) { await drv.admin({ 'c/2': 'a', 's/n/a': 5, 's/n/b': 9, 'ct/2': SV }); const Q5 = await drv.user('Q5'); await yes(join(Q5, 'b', '十三'), '十三が武田に仕える'); await age(Q5); await no(take(Q5, 2, 3, 'b', 'a', '十三'), '10秒以内は、マスの多い武田は取れない'); await drv.advance(11000); await yes(take(Q5, 2, 3, 'b', 'a', '十三'), '10秒をすぎれば、いつもどおり奪える'); }
    await drv.admin({ 'c/1': 'a', 'c/2': 'b', 'c/3': 'b', 'c/4': 'b', 'ct/1': null, 'ct/2': null }); }

  log('6d) 早取りの時間（番の陣営は2分・全陣営の時間は5分で1マス）');
  {
    const X = await drv.user('X6d'), Y = await drv.user('Y6d');
    await yes(join(X, 'a', '早取り'), 'Xが織田に仕える'); await yes(join(Y, 'b', '待ち人'), 'Yが武田に仕える'); await age(X, Y);
    const K1 = '17' + String(Date.now()).slice(-11), K2 = '18' + String(Date.now()).slice(-11), K3 = '19' + String(Date.now()).slice(-11);
    await drv.admin({ ['sch/' + K1]: { a: SV, f: 'a' }, ['sch/' + K2]: { a: SV, f: '*' }, ['sch/' + K3]: { a: 1000, f: 'a' } });
    const tq = (u, q) => drv.update(Object.assign({ ['u/' + u + '/t']: SV }, q ? { ['u/' + u + '/q']: q } : {}), u);
    await yes(tq(X), 'Xが1マス取る（最初の1マスは待ちなし）'); await yes(tq(Y), 'Yも1マス取る');
    await no(tq(X, K1), '番の時間でも、2分たつまでは取れない');
    await no(drv.update({ ['u/' + X + '/q']: K1 }, X), '番の時刻だけを書くことはできない');
    await no(drv.read('sch/' + K1, X).then(r => r.ok), '時間割の中身（ルール用）は読めない');
    if (drv.advance) {
      await drv.advance(2 * 60 * 1000);
      await yes(tq(X, K1), '番の陣営（織田）は2分で次が取れる');
      await no(tq(Y, K1), 'ほかの陣営（武田）は織田の番の時刻を使えない');
      await no(tq(Y, K2), '全陣営の時間でも、5分たつまでは取れない');
      await drv.advance(3 * 60 * 1000);
      await yes(tq(Y, K2), '全陣営の時間は、どの陣営も5分で次が取れる');
      await drv.advance(2 * 60 * 1000);
      await no(tq(X, K3), '終わった時間の番は使えない');
      await no(tq(X, '1234567890123'), 'ない時間の番は使えない');
      await yes(tq(X, K1), 'まだ1時間の中なら、番の時刻で取れる');
      await drv.advance(54 * 60 * 1000);
      await no(tq(X, K1), '番の1時間を過ぎたら、その番の時刻ではもう取れない');
      await no(tq(X), '番が終わったら、いつもどおり1時間待ち');
      await drv.advance(6 * 60 * 1000);
      await yes(tq(X), '1時間待てば、いつもどおり取れる');
    }
    await drv.admin({ ['schd/D1']: { r: 1000, h: 'a'.repeat(24) }, ['schd/D2']: { r: 9999999999999, h: 'b'.repeat(24) } });
    ok((await drv.read('schd/D1', X)).ok, 'その日になった時間割は読める');
    ok(!(await drv.read('schd/D2', X)).ok, 'まだ来ていない日の時間割は読めない');
    await no(drv.update({ ['schd/D3']: { r: 1000, h: 'c'.repeat(24) } }, X), '時間割は書きかえられない');
    await drv.admin({ ['sch/' + K1]: null, ['sch/' + K2]: null, ['sch/' + K3]: null, ['schd/D1']: null, ['schd/D2']: null });
  }
  log('6g) 下剋上（その日の下剋上の軍は、早取りが1分・全軍の時間が2分半。どの軍かは、その軍の人にしか読めない）');
  {
    const X = await drv.user('X6g'), Y = await drv.user('Y6g');
    await yes(join(X, 'a', '下剋上'), 'Xが織田に仕える'); await yes(join(Y, 'b', 'ふつう'), 'Yが武田に仕える'); await age(X, Y);
    const K4 = '27' + String(Date.now()).slice(-11), K5 = '28' + String(Date.now()).slice(-11), DG = '29' + String(Date.now()).slice(-11);
    await drv.admin({ ['sch/' + K4]: { a: SV, f: 'a' }, ['sch/' + K5]: { a: SV, f: '*' }, ['schd/' + DG]: { r: SV, h: 'a'.repeat(24) }, ['gk/' + DG]: 'a' });
    const tg = (u, q, qd) => drv.update(Object.assign({ ['u/' + u + '/t']: SV }, q ? { ['u/' + u + '/q']: q } : {}, qd ? { ['u/' + u + '/qd']: qd } : {}), u);
    ok((await drv.read('gk/' + DG, X)).ok, '下剋上の軍の人は、下剋上に選ばれたと読める');
    ok(!(await drv.read('gk/' + DG, Y)).ok, 'ほかの軍の人は、どの軍が下剋上か読めない');
    await no(drv.update({ ['gk/' + DG]: 'b' }, Y), '下剋上の軍は書きかえられない');
    await yes(tg(X), 'Xが1マス取る'); await yes(tg(Y), 'Yも1マス取る');
    if (drv.advance) {
      await drv.advance(60 * 1000 + 500);
      await no(tg(X, K4), '下剋上でも、今日の日付（qd）なしでは1分では取れない');
      await yes(tg(X, K4, DG), '下剋上の軍は、自軍の番に1分で次が取れる');
      await drv.advance(60 * 1000 + 500);
      await no(tg(Y, K5, DG), 'ほかの軍は、今日の日付を書いても2分半では取れない');
      await drv.advance(29 * 1000);
      await no(tg(X, K5, DG), '下剋上の軍でも、全軍の時間は2分半たつまでは取れない');
      await drv.advance(61 * 1000);
      await yes(tg(X, K5, DG), '下剋上の軍は、全軍の時間に2分半で次が取れる');
      await drv.advance(90 * 1000);
      await yes(tg(Y, K5, DG), 'ほかの軍は、全軍の時間はいつもどおり5分');
    }
    await drv.admin({ ['sch/' + K4]: null, ['sch/' + K5]: null, ['schd/' + DG]: null, ['gk/' + DG]: null });
  }
  log('6k) 待ち時間が半分の時間（s/hv：その軍は、その時間だけふだんの1時間が30分）');
  {
    const X = await drv.user('X6k'), Y = await drv.user('Y6k');
    await yes(join(X, 'a', '半分'), 'Xが織田に仕える'); await yes(join(Y, 'b', 'ふつう'), 'Yが武田に仕える'); await age(X, Y);
    const old = (await drv.read('s/hv', X)).val;   // 本番に入っている値は、あとで戻す
    await drv.admin({ 's/hv': { f: 'a', a: SV, b: Date.now() + 3 * 3600000 } });
    const tg = u => drv.update({ ['u/' + u + '/t']: SV }, u);
    await no(drv.update({ 's/hv': { f: 'b', a: 1, b: 2 } }, Y), '半分の時間は、ふつうの人には書きかえられない');
    await yes(tg(X), 'Xが1マス取る'); await yes(tg(Y), 'Yも1マス取る');
    if (drv.advance) {
      await drv.advance(29 * 60 * 1000);
      await no(tg(X), '半分の時間でも、30分たつまでは取れない');
      await drv.advance(61 * 1000);
      await yes(tg(X), '半分の時間の軍は、30分で次が取れる');
      await no(tg(Y), 'ほかの軍は、いつもどおり1時間たつまで取れない');
    }
    await drv.admin({ 's/hv': old === undefined ? null : old });
  }
  log('6h) 最終決戦（"!" の時間は全軍2分）・狼煙（その国のマスは30分間1分）・天下人予想（1人1回、軍だけ）');
  {
    const X = await drv.user('X6h'), Y = await drv.user('Y6h');
    await yes(join(X, 'a', '決戦'), 'Xが織田に仕える'); await yes(join(Y, 'b', '狼煙'), 'Yが武田に仕える'); await age(X, Y);
    const K6 = '37' + String(Date.now()).slice(-11), NK = '38' + String(Date.now()).slice(-11);
    await drv.admin({ ['sch/' + K6]: { a: SV, f: '!' }, ['nr/' + NK]: { a: SV, p: 1, c: { 5: true, 6: true } } });
    const tg = (u, o) => drv.update(Object.assign({ ['u/' + u + '/t']: SV }, Object.fromEntries(Object.entries(o || {}).map(([k, v]) => ['u/' + u + '/' + k, v]))), u);
    await yes(tg(X), 'Xが1マス取る'); await yes(tg(Y, { c: '5' }), 'Yも1マス取る');
    ok(!(await drv.read('nr/' + NK, Y)).ok, '狼煙の国のマスの一覧（決まり用）は読めない');
    if (drv.advance) {
      await drv.advance(60 * 1000 + 500);
      await yes(tg(Y, { c: '5', qn: NK }), '狼煙の国のマスは、1分で次が取れる');
      await drv.advance(60 * 1000 + 500);
      await no(tg(Y, { c: '9', qn: NK }), '狼煙の国でないマスは、1分では取れない');
      await yes(tg(X, { q: K6 }), '最終決戦の時間は、どの軍も2分で次が取れる');
      await drv.advance(30 * 60 * 1000);
      await no(tg(Y, { c: '6', qn: NK }), '狼煙は30分で終わる');
    }
    await drv.admin({ ['sch/' + K6]: null, ['nr/' + NK]: null, 's/mg': { a: 'a', b: 'a', c: 'c' } });
    const pr = (u, f, n, h) => drv.update({ ['pred/' + u]: { f, t: SV, n, h } }, u);
    await no(pr(X, 'b', '決戦', 'a'), '軍でない家は予想できない');
    await no(pr(X, 'a', 'にせ', 'a'), '自分の名前でなければ予想できない');
    await yes(pr(X, 'a', '決戦', 'a'), '軍を1つ予想できる');
    await no(pr(X, 'c', '決戦', 'a'), '予想は1回だけ');
    ok((await drv.read('pred/' + X, X)).ok && !(await drv.read('pred/' + X, Y)).ok, '予想は本人にしか読めない');
    await drv.admin({ 's/mg': null, ['pred/' + X]: null });
  }
  log('6i) 奇襲（30分間、仕掛けた軍は仕掛けられた軍のマスだけ1分で取れる。知らされるのはその2軍だけ）');
  {
    const X = await drv.user('X6i'), Y = await drv.user('Y6i'), Z = await drv.user('Z6i');
    await yes(join(X, 'a', '奇襲'), 'Xが織田に仕える'); await yes(join(Y, 'b', '守り'), 'Yが武田に仕える'); await yes(join(Z, 'c', 'よそ'), 'Zが上杉に仕える'); await age(X, Y, Z);
    const KK = '47' + String(Date.now()).slice(-11), DK = '48' + String(Date.now()).slice(-11);
    await drv.admin({ ['ki/' + KK]: { a: SV, f: 'a', g: 'b' }, ['kid/' + DK + '/0']: { a: SV, f: 'a', g: 'b', k: KK }, 'c/7': 'b', 'c/8': 'c' });
    const tg = (u, o) => drv.update(Object.assign({ ['u/' + u + '/t']: SV }, Object.fromEntries(Object.entries(o || {}).map(([k, v]) => ['u/' + u + '/' + k, v]))), u);
    ok((await drv.read('kid/' + DK + '/0', X)).ok && (await drv.read('kid/' + DK + '/0', Y)).ok, '仕掛けた軍と仕掛けられた軍は、奇襲を読める');
    ok(!(await drv.read('kid/' + DK + '/0', Z)).ok, 'ほかの軍は、奇襲を読めない');
    ok(!(await drv.read('ki/' + KK, X)).ok, '奇襲の決まり用のデータは読めない');
    await yes(tg(X), 'Xが1マス取る'); await yes(tg(Y), 'Yも1マス取る');
    if (drv.advance) {
      await drv.advance(60 * 1000 + 500);
      await no(tg(X, { c: '8', qk: KK }), '仕掛けられた軍でないマスは、1分では取れない');
      await no(tg(Y, { c: '7', qk: KK }), '仕掛けられた軍の人は、奇襲を使えない');
      await yes(tg(X, { c: '7', qk: KK }), '仕掛けた軍は、仕掛けられた軍のマスを1分で取れる');
      await drv.advance(30 * 60 * 1000);
      await no(tg(X, { c: '7', qk: KK }), '奇襲は30分で終わる');
    }
    await drv.admin({ ['ki/' + KK]: null, ['kid/' + DK]: null });
  }
  log('6j) 端末の指紋（同じ指紋で10分以内の2つめの仕官ははじく。指紋なしの仕官もはじく）');
  {
    const P1 = await drv.user('P1fp'), P2 = await drv.user('P2fp'), P3 = await drv.user('P3fp'), FP = 'samefp' + String(Date.now()).slice(-6);
    await no(join(P1, 'a', '指紋なし', { fp: false }), '指紋なしでは仕官できない');
    await yes(join(P1, 'a', '一人目', { fp: FP }), '指紋つきで仕官できる');
    ok((await drv.read('fpj/' + FP, P2)).ok, '指紋のさいごの仕官は読める（仕官の前に知らせるため）');
    await no(join(P2, 'a', '二人目', { fp: FP }), '同じ指紋で10分以内の2つめの仕官は、はじかれる');
    await no(drv.update({ ['fpj/' + FP]: { t: SV, u: P2 } }, P2), '指紋の記録だけを書きかえることはできない');
    if (drv.advance) { await drv.advance(10 * 60 * 1000 + 1000); await yes(join(P3, 'b', '三人目', { fp: FP }), '10分たてば、同じ指紋でも仕官できる（同じ機種の別の人のため）'); }
  }
  log('6e) ピン止め（管理人だけが書ける。読めるのは掲示板と同じ人）');
  {
    const P1 = await drv.user('P6e'); await yes(join(P1, 'b', '読む人'), '武田に仕える');
    await drv.admin({ 'bp/all/PINtest0001': { t: 1, n: 'なすP', m: '全体のピン', g: true }, 'bp/a/PINtest0002': { t: 1, n: 'なすP', m: '織田のピン', g: true } });
    ok((await drv.read('bp/all', P1)).ok, '全体のピン止めはだれでも読める');
    ok(!(await drv.read('bp/a', P1)).ok, 'ほかの陣営のピン止めは読めない');
    await no(drv.update({ 'bp/all/PINtest0003': { t: SV, n: 'にせ', m: 'ピンにしたい', g: true } }, P1), 'ふつうの人はピン止めできない');
    await no(drv.update({ 'bp/all/PINtest0001': null }, P1), 'ふつうの人はピン止めを外せない');
    await drv.admin({ 'bp/all/PINtest0001': null, 'bp/a/PINtest0002': null });
  }
  log('6f) 兵糧集め（米俵を取ると陣営の兵糧が1増える。3・7・12俵で待ちが50・40・30分）と決戦地のほうび（f2）');
  {
    const R1 = await drv.user('R6f'), R2 = await drv.user('S6f');
    await yes(join(R1, 'b', '米取り'), 'R1が武田に仕える'); await yes(join(R2, 'b', '米二'), 'R2も武田に仕える'); await age(R1, R2);
    const D = '16' + String(Date.now()).slice(-11), D2 = '15' + String(Date.now()).slice(-11);
    const rice0 = {}; for (const L of 'abcdefghijklmnopqrst') rice0[L] = 0;
    await drv.admin({ ['schd/' + D]: { r: SV, h: '*'.repeat(24) }, ['rc/' + D]: { 2: true, 3: true, 4: true }, ['rice/' + D]: rice0, ['schd/' + D2]: { r: 1000, h: '*'.repeat(24) }, ['rice/' + D2]: rice0 });
    // 米俵だけ書く（マスを取らずに）はできない
    await no(drv.update({ ['rg/' + D + '/3']: { f: 'b', t: SV }, ['rice/' + D + '/b']: INC(1) }, R1), '米俵だけを取ったことにはできない');
    // マス3（いま武田のもの）を取りなおして米俵、はできない（自分の陣営のマス）。マス2（織田のもの）を取って米俵
    const cur2 = (await drv.read('c/2', R1)).val, cur4 = (await drv.read('c/4', R1)).val;
    log('    （マス2の持ち主：' + cur2 + '　マス4の持ち主：' + cur4 + '）');
    const tr = (u, c, v, p, nm, rice, more) => { const x = { more: Object.assign({}, more || {}) }; if (rice) Object.assign(x.more, { ['rg/' + D + '/' + c]: { f: 'b', t: SV }, ['rice/' + D + '/b']: INC(1) }); return take(u, c, v, 'b', p, nm, x); };
    await no(drv.update({ ['rice/' + D + '/b']: INC(1) }, R1), '兵糧の数だけを増やせない');
    await no(drv.update({ ['rice/' + D + '/b']: INC(5), ['rg/' + D + '/2']: { f: 'b', t: SV } }, R1), '一度に5俵は増やせない');
    await no(drv.update({ ['rice/' + D2 + '/b']: INC(1) }, R1), 'ほかの日の兵糧も増やせない');
    await drv.admin({ 'c/2': 'a', 'c/3': 'b', 'c/4': 'b', 'ct/2': 1 });
    { await no(tr(R1, 2, 3, 'a', '米取り', false, { ['rg/' + D + '/2']: { f: 'b', t: SV }, ['rice/' + D + '/b']: INC(2) }), '米俵1つで兵糧を2増やすことはできない'); }
    if (true) { await yes(tr(R1, 2, 3, 'a', '米取り', true), 'R1が米俵のマス2を取って、兵糧が1増える'); ok((await drv.read('rice/' + D + '/b', R1)).val === 1, '武田の兵糧が1俵'); ok((await drv.read('rg/' + D + '/2', R2)).val.f === 'b', '米俵2は武田が取った'); }
    await no(drv.update({ ['rg/' + D + '/2']: { f: 'b', t: SV }, ['rice/' + D + '/b']: INC(1), ['u/' + R2 + '/t']: SV, ['u/' + R2 + '/c']: '2' }, R2), '取られた米俵は二度は数えない');
    // 領内の米俵（11/23）：いま自分の陣営のマスにある米俵は、その陣営の人が蔵に入れられる（マス3・4は武田のもの。5は米俵ではない）
    {
      const Z = await drv.user('Z6f'); await yes(join(Z, 'a', '織田の者'), 'Zが織田に仕える');
      const claim = (u, c, f, n = 1, x = {}) => drv.update(Object.assign({ ['u/' + u + '/rk']: String(c), ['rg/' + D + '/' + c]: { f, t: SV }, ['rice/' + D + '/' + f]: INC(n) }, x), u);
      await no(claim(Z, 3, 'a'), 'ほかの陣営のマスにある米俵は、蔵に入れられない');
      await no(claim(Z, 3, 'b'), 'ほかの陣営の蔵に入れることもできない');
      await no(claim(R2, 5, 'b'), '米俵のないマスでは、蔵に入れられない');
      await no(claim(R2, 2, 'b'), 'もう取られた米俵は、蔵に入れられない');
      await no(claim(R2, 3, 'b', 2), '領内の米俵1つで、兵糧を2増やすことはできない');
      await no(drv.update({ ['u/' + R2 + '/rk']: '3', ['rice/' + D + '/b']: INC(1) }, R2), '米俵の記録を書かずに、兵糧だけは増やせない');
      await no(drv.update({ ['u/' + R2 + '/rk']: '3', ['rg/' + D + '/3']: { f: 'b', t: SV } }, R2), '兵糧を増やさずに、米俵の記録だけは書けない');
      await no(drv.update({ ['u/' + R2 + '/rk']: '3', ['rg/' + D + '/3']: { f: 'b', t: SV }, ['rg/' + D + '/4']: { f: 'b', t: SV }, ['rice/' + D + '/b']: INC(1) }, R2), '一度に2つの米俵は入れられない');
      const before = (await drv.read('rice/' + D + '/b', R2)).val;
      await yes(claim(R2, 3, 'b'), '領内（武田のマス3）の米俵を、武田の人が蔵に入れる');
      ok((await drv.read('rice/' + D + '/b', R2)).val === before + 1, '武田の兵糧が1増えた');
      await no(claim(R1, 3, 'b'), '同じ米俵を、もう一度は入れられない');
      await yes(claim(R1, 4, 'b'), '別の人が、領内（マス4）の米俵を蔵に入れる');
    }
    // 士気：兵糧を3俵にして、50分で取れるか
    await drv.admin({ ['rice/' + D + '/b']: 3 });
    const tq = (u, x) => drv.update(Object.assign({ ['u/' + u + '/t']: SV }, x || {}), u);
    await yes(tq(R2), 'R2が1マス取る（最初）');
    if (drv.advance) {
      await drv.advance(50 * 60 * 1000);
      await no(tq(R2), '日付（qd）を書かないと、士気の短縮は使えない');
      await no(tq(R2, { ['u/' + R2 + '/qd']: D2 }), 'ほかの日の兵糧では短縮できない');
      await yes(tq(R2, { ['u/' + R2 + '/qd']: D }), '兵糧3俵なら50分で次が取れる');
      await drv.advance(40 * 60 * 1000);
      await no(tq(R2, { ['u/' + R2 + '/qd']: D }), '3俵のときは40分では取れない');
      await drv.admin({ ['rice/' + D + '/b']: 7 });
      await yes(tq(R2, { ['u/' + R2 + '/qd']: D }), '7俵なら40分で取れる');
      await drv.admin({ ['rice/' + D + '/b']: 12 });
      await drv.advance(30 * 60 * 1000);
      await yes(tq(R2, { ['u/' + R2 + '/qd']: D }), '12俵なら30分で取れる');
      // 決戦地のほうび：f2 の陣営も2分で取れる
      const K = '14' + String(Date.now()).slice(-11);
      await drv.admin({ ['sch/' + K]: { a: SV, f: 'a', f2: 'b' } });
      await drv.advance(2 * 60 * 1000);
      await yes(tq(R2, { ['u/' + R2 + '/q']: K }), '決戦地のほうびの陣営（f2）も、その時間は2分で取れる');
      await drv.admin({ ['sch/' + K]: null });
    }
    await drv.admin({ ['schd/' + D]: null, ['rc/' + D]: null, ['rice/' + D]: null, ['rg/' + D]: null, ['schd/' + D2]: null, ['rice/' + D2]: null });
  }
  log('7) 天下統一（11/25から：毎日24時に4000マス。2500マスでは止まらない）');
  await yes(join(D, 'b', '三郎'), 'Dが武田に仕える'); await age(D);
  const nb = (await drv.read('s/n/b', D)).val;
  await drv.admin({ 's/n/b': 2499 });
  const c2 = (await drv.read('c/2', D)).val, c3 = (await drv.read('c/3', D)).val;
  // 武田のとなりにある、武田でないマスを探す（2 か 1）
  const tgt = c2 !== 'b' ? 2 : 1, via = tgt + 1, prev = (await drv.read('c/' + tgt, D)).val;
  await no(drv.update({ 's/end': { f: 'b', t: SV, k: 'half' } }, D), '2500マスに届かないのに終わりにはできない');
  await no(drv.update({ 's/end': { f: 'b', t: SV, k: 'day' } }, D), '遊ぶ人は「24時の天下統一」を書けない');
  await no(take(D, tgt, via, 'b', prev, '三郎', { more: { 's/end': { f: 'b', t: SV, k: 'half' } } }), '遊ぶ人は終わりの印（2500マス）を書けない');
  await yes(take(D, tgt, via, 'b', prev, '三郎'), '2500マス目も、終わりの印なしでふつうに取れる');
  ok(!(await drv.read('s/end', E)).val, '2500マスでは終わらない');
  await yes(join(E, 'c', '四郎'), '2500マスの印では止まらない（仕えられる）');
  await drv.admin({ 's/end': { f: 'b', t: 1, k: 'day' } });
  ok(((await drv.read('s/end', E)).val || {}).k === 'day', '24時の判定で、天下人は武田');
  { const F2 = await drv.user('F2'); await no(join(F2, 'c', '五郎'), '天下統一のあとは仕えられない'); }
  await yes(ask(E, '楽しかった'), '終わったあとも質問は送れる');
  // 掲示板の封鎖（11/25）：天下統一から24時間たったら書けない。24時間たつまでは書ける
  await no(post(E, 'all', { n: '四郎', h: 'c', f: 'c', m: 'おつかれさま' }), '天下統一から24時間たったら、掲示板に書けない');
  await drv.admin({ 's/end/t': SV });
  await yes(post(E, 'all', { n: '四郎', h: 'c', f: 'c', m: 'おつかれさま' }), '天下統一から24時間たつまでは、掲示板に書ける');
  ok((await drv.read('b/all', E)).ok, '封鎖のあとも読める');
  return { pass, fail };
}
