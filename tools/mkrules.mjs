// データベースのルールを作る → database.rules.tk.json（ft-blue の中の tk の下だけ。ほかのゲームの部分にはさわらない）
//
//  データの形（tk/ の下）
//   c/{マス番号}        : 持ち主（a〜t＝武将、w＝だれのものでもない）
//   adj/{マス}/{となり}  : true   となりどうしの表（海のつながりも入る。最初に入れたら変えない）
//   k/{マス}            : 武将    天守閣のマス（だれにも取られない）
//   s/n/{武将}          : その武将のマスの数（w も数える） ／ s/m/{武将}：家臣の数
//   s/end               : { f：天下人, t, k：'half' }   半分とった武将が出たら入る（入ると書きこめなくなる）
//   s/stop              : true   管理人の一時停止 ／ s/pin：管理人のお知らせ ／ s/ver：管理人がマスを直した回数
//   u/{匿名ID}          : { f：仕える武将, h：最初に仕えた武将（名前の国）, n：名前, j：仕えた時刻, t：最後に取った時刻, c：取ったマス, v：足場にしたとなりのマス, w：足場のとなりの、自分の陣営か白のマス,
//                          l：そのときの記録の番号, d：最後に寝返った時刻, r：寝返ったことがある, bt：最後に板へ書いた時刻, a：最後に質問を送った時刻 }
//   ct/{マス番号}       : そのマスが最後に取られた時刻（10秒以内に別の陣営が取りにきたら「同時」。マスの少ない陣営が勝ち、同じ数ならくじ）
//   log/{番号}          : { t, y：'t' 取った／'d' 寝返った／'f' 同時に攻めこんで敗れた, c：マス, f：新しい持ち主, p：前の持ち主, n：名前, h, r, u：匿名ID, k：この一手で占領した名所, x：この一手で占領をくずした名所 }
//   b/{板}/{番号}       : 掲示板 { t, u, n, h, r, f, m, g：管理人 }   板は all（全体）と a〜t（陣営ごと。その陣営の人だけ読み書きできる）
//   sch/schd           : 早取りの時間割（下を見る）
//   ask/{番号}          : なすPへの質問・要望（管理人だけ読める）   on/{匿名ID}：いま開いている人   ban/{匿名ID}：書きこめなくした人
//  管理のかぎは Fairies' Tower・エンピツライフと同じ（ft_admin/key・ft_admins）
import fs from 'fs';
const END = Date.UTC(2026, 10, 30, 14, 59, 59, 999);          // 2026-11-30 23:59:59（日本時間）
const JOINT = 1 * 3600 * 1000, JOIND = 72 * 3600 * 1000;   // 作り直し対策（11/17）：仕官してから最初の1マスまで1時間・最初の寝返りまで3日
const FASTT = 2 * 60 * 1000, ALLT = 5 * 60 * 1000;   // 早取り：番の陣営は2分・全陣営の時間は5分で1マス
const WAIT = 1 * 3600 * 1000, DEFECT = 3 * 24 * 3600 * 1000, HALF = 2500, CLASH = 10000;   // CLASH：同じマスが10秒以内に取り合いになったら「同時」
const LET = 'abcdefghijklmnopqrst'.split('');
const ADMIN = "(auth != null && root.child('ft_admin/key').exists() && root.child('ft_admins/' + auth.uid).val() === root.child('ft_admin/key').val())";
const OPEN = `(!root.child('tk/s/end').exists() && !root.child('tk/s/stop').exists() && now <= ${END})`;
const ME = "root.child('tk/u/' + auth.uid)";
const NOBAN = "!root.child('tk/ban/' + auth.uid).exists()";
// 書いたあとの tk（場所の深さごとに、上へたどる回数がちがう）
const up = n => 'newData' + '.parent()'.repeat(n);
const tk = {};
// ---------- マス ----------
{
  const T = up(2), U = `${T}.child('u/' + auth.uid)`;
  tk.c = {
    '.read': true,
    $c: {
      '.write': `${ADMIN} || (${OPEN} && auth != null && ${NOBAN} && ${ME}.child('f').exists() && newData.exists() && data.exists()`
        + ` && newData.val() === ${ME}.child('f').val() && ${U}.child('f').val() === ${ME}.child('f').val() && data.val() !== newData.val()`
        + ` && !root.child('tk/k/' + $c).exists()`
        + ` && ${U}.child('t').val() === now && ${U}.child('c').val() === $c`
        + ` && root.child('tk/adj/' + $c + '/' + ${U}.child('v').val()).exists() && root.child('tk/c/' + ${U}.child('v').val()).val() === newData.val()`
        // 足場のマスは、天守閣か、となりに自分の陣営のマスか白いマスが1つはあること（四方を敵に囲まれた1マスは、足場にできない）。w：そのとなりのマス
        + ` && (root.child('tk/k/' + ${U}.child('v').val()).exists() || (root.child('tk/adj/' + ${U}.child('v').val() + '/' + ${U}.child('w').val()).exists() && (root.child('tk/c/' + ${U}.child('w').val()).val() === newData.val() || root.child('tk/c/' + ${U}.child('w').val()).val() === 'w')))`
        + ` && ${T}.child('s/n/' + newData.val()).val() === root.child('tk/s/n/' + newData.val()).val() + 1`
        + ` && ${T}.child('s/n/' + data.val()).val() === root.child('tk/s/n/' + data.val()).val() - 1`
        + ` && (${T}.child('s/n/' + newData.val()).val() < ${HALF} || ${T}.child('s/end/f').val() === newData.val())`
        // 同時（そのマスが取られてから10秒以内）：マスの少ない陣営だけが取れる。同じ数ならくじ（データベースの時計が偶数のミリ秒なら取れる）
        + ` && ${T}.child('ct/' + $c).val() === now && (!root.child('tk/ct/' + $c).exists() || now - root.child('tk/ct/' + $c).val() >= ${CLASH}`
        + ` || root.child('tk/s/n/' + newData.val()).val() < root.child('tk/s/n/' + data.val()).val() - 1`
        + ` || (root.child('tk/s/n/' + newData.val()).val() === root.child('tk/s/n/' + data.val()).val() - 1 && now % 2 === 0)))`,
      '.validate': "$c.matches(/^[0-9]{1,4}$/) && newData.isString() && newData.val().matches(/^[a-tw]$/)",
    },
  };
}
// マスが最後に取られた時刻（同時かどうかを決める）
{
  const T = up(2), U = `${T}.child('u/' + auth.uid)`;
  tk.ct = { '.read': true, $c: { '.write': `${ADMIN} || (auth != null && ${U}.child('t').val() === now && ${U}.child('c').val() === $c && ${T}.child('c/' + $c).val() === ${U}.child('f').val())`, '.validate': "$c.matches(/^[0-9]{1,4}$/) && newData.val() === now" } };
}
tk.adj = { '.read': false, '.write': false };
tk.k = { '.read': false, '.write': false };
// ---------- 数（マスの数・家臣の数）と、終わり ----------
{
  const T = up(3), U = `${T}.child('u/' + auth.uid)`, C = `${U}.child('c').val()`;
  tk.s = {
    '.read': true,
    n: {
      $f: {
        // マスを1つ取ったとき：取った側は＋1、取られた側は−1（どちらも、同じ書きこみでそのマスが本当に動いたときだけ）
        '.write': `${ADMIN} || (auth != null && data.exists() && ${U}.child('t').val() === now && (`
          + `(newData.val() === data.val() + 1 && ${T}.child('c/' + ${C}).val() === $f && root.child('tk/c/' + ${C}).val() !== $f)`
          + ` || (newData.val() === data.val() - 1 && root.child('tk/c/' + ${C}).val() === $f && ${T}.child('c/' + ${C}).val() !== $f)))`,
        '.validate': "$f.matches(/^[a-tw]$/) && newData.isNumber() && newData.val() >= 0 && newData.val() <= 5000",
      },
    },
    m: {
      $f: {
        // 仕えた・寝返ったとき：入った側は＋1、出た側は−1
        '.write': `${ADMIN} || (auth != null && data.exists() && (`
          + `(newData.val() === data.val() + 1 && ${U}.child('f').val() === $f && ${ME}.child('f').val() !== $f)`
          + ` || (newData.val() === data.val() - 1 && ${ME}.child('f').val() === $f && ${U}.child('f').exists() && ${U}.child('f').val() !== $f)))`,
        '.validate': "$f.matches(/^[a-t]$/) && newData.isNumber() && newData.val() >= 0",
      },
    },
    end: {
      '.write': `${ADMIN} || (auth != null && !data.exists() && newData.exists() && ${up(2)}.child('s/n/' + newData.child('f').val()).val() >= ${HALF} && ${ME}.child('f').val() === newData.child('f').val())`,
      '.validate': "newData.hasChildren(['f', 't', 'k'])",
      f: { '.validate': "newData.isString() && newData.val().matches(/^[a-t]$/)" },
      t: { '.validate': 'newData.val() === now' },
      k: { '.validate': "newData.isString() && newData.val().matches(/^(half|time|gm)$/)" },
      $other: { '.validate': false },
    },
    stop: { '.write': ADMIN, '.validate': 'newData.val() === true' },
    pin: { '.write': ADMIN, '.validate': 'newData.isString() && newData.val().length <= 300' },
    ver: { '.write': ADMIN, '.validate': 'newData.isNumber()' },
    pi: { '.write': ADMIN, '.validate': 'newData.isNumber() && newData.val() >= 20 && newData.val() <= 600' },   // 読みなおしの間隔（秒）
    $other: { '.validate': false },
  };
}
// ---------- 人 ----------
{
  const T = up(3), SELF = "auth != null && auth.uid === $uid";
  // 早取り（11/17）：sch/{1時間の始まり} = { a：始まりの時刻, f：番の武将（* は全陣営） }。番の陣営は2分、全陣営の時間は5分で1マス
  const Q = "newData.parent().child('q').val()", S = `root.child('tk/sch/' + ${Q})`;
  const FAST = `(newData.parent().child('q').isString() && ${S}.child('a').isNumber() && now >= ${S}.child('a').val() && now < ${S}.child('a').val() + 3600000`
    + ` && ((${S}.child('f').val() === newData.parent().child('f').val() && now - data.val() >= ${FASTT}) || (${S}.child('f').val() === '*' && now - data.val() >= ${ALLT})))`;
  const least = LET.map(h => `root.child('tk/s/n/' + newData.val()).val() <= root.child('tk/s/n/${h}').val()`).join(' && ');
  tk.u = {
    $uid: {
      '.read': `(${SELF}) || ${ADMIN}`,
      '.write': `!newData.exists() && ${ADMIN}`,
      f: {
        '.write': `${SELF} && ${OPEN} && ${NOBAN} && newData.exists() && (`
          // はじめて仕える
          + `(!data.exists() && newData.parent().child('h').val() === newData.val() && newData.parent().child('j').val() === now && newData.parent().child('n').exists()`
          + ` && ${T}.child('s/m/' + newData.val()).val() === root.child('tk/s/m/' + newData.val()).val() + 1)`
          // 寝返る（3日に1回。マスがいちばん少ない武将のところへだけ。同じ数ならどれでもよい）
          + ` || (data.exists() && newData.val() !== data.val() && (!data.parent().child('d').exists() || now - data.parent().child('d').val() >= ${DEFECT}) && data.parent().child('j').isNumber() && now - data.parent().child('j').val() >= ${JOIND}`
          + ` && newData.parent().child('d').val() === now && newData.parent().child('r').val() === true && ${least}`
          + ` && ${T}.child('s/m/' + newData.val()).val() === root.child('tk/s/m/' + newData.val()).val() + 1`
          + ` && ${T}.child('s/m/' + data.val()).val() === root.child('tk/s/m/' + data.val()).val() - 1))`,
        '.validate': "newData.isString() && newData.val().matches(/^[a-t]$/)",
      },
      h: { '.write': `${SELF} && !data.exists() && !data.parent().child('f').exists()`, '.validate': "newData.isString() && newData.val() === newData.parent().child('f').val()" },
      n: { '.write': `${SELF} && !data.exists() && !data.parent().child('f').exists()`, '.validate': "newData.isString() && newData.val().length >= 1 && newData.val().length <= 8 && newData.parent().child('f').exists()" },
      j: { '.write': `${SELF} && !data.exists()`, '.validate': "newData.val() === now && newData.parent().child('f').exists()" },
      t: { '.write': `${SELF} && ${OPEN}`, '.validate': `newData.val() === now && (!data.exists() || now - data.val() >= ${WAIT} || ${FAST}) && newData.parent().child('f').exists() && newData.parent().child('j').isNumber() && now - newData.parent().child('j').val() >= ${JOINT}` },
      c: { '.write': SELF, '.validate': "newData.isString() && newData.val().matches(/^[0-9]{1,4}$/) && newData.parent().child('t').val() === now" },
      // q：早取りの時間に取ったとき、その時間の始まりの時刻（sch のかぎ）。マスを取るのと同時に書く
      q: { '.write': SELF, '.validate': "newData.isString() && newData.val().matches(/^[0-9]{13}$/) && newData.parent().child('t').val() === now" },
      v: { '.write': SELF, '.validate': "newData.isString() && newData.val().matches(/^[0-9]{1,4}$/) && newData.parent().child('t').val() === now" },
      w: { '.write': SELF, '.validate': "newData.isString() && newData.val().matches(/^[0-9]{1,4}$/) && newData.parent().child('t').val() === now" },
      l: { '.write': SELF, '.validate': "newData.isString() && newData.val().matches(/^[A-Za-z0-9_-]{8,30}$/)" },
      d: { '.write': SELF, '.validate': "newData.val() === now && data.parent().child('f').exists() && newData.parent().child('f').val() !== data.parent().child('f').val()" },
      r: { '.write': SELF, '.validate': "newData.val() === true && (data.val() === true || newData.parent().child('d').val() === now)" },
      bt: { '.write': `${SELF} && newData.exists()`, '.validate': "newData.val() === now && (!data.exists() || now - data.val() >= 30000)" },
      a: { '.write': `${SELF} && newData.exists()`, '.validate': "newData.val() === now && (!data.exists() || now - data.val() >= 60000)" },
      $other: { '.validate': false },
    },
  };
}
// ---------- 早取りの時間割（管理人が先に書いておく。その日の0時になるまでだれも読めない） ----------
//   sch/{1時間の始まり}  : { a：始まり, f：番の武将 a〜t か *（全陣営） }   ルールで使う（読めない）
//   schd/{その日の0時}   : { r：見えるようになる時刻（＝その日の0時）, h：24文字（0時から1時間ごとの番。* は全陣営） }
tk.sch = { '.read': false, '.write': ADMIN };
tk.schd = { '.write': ADMIN, $d: { '.read': "data.child('r').val() <= now" } };
// ---------- 記録（だれがどこを取ったか・だれが寝返ったか） ----------
{
  const T = up(2), U = `${T}.child('u/' + auth.uid)`;
  const who = `newData.child('n').val() === ${U}.child('n').val() && newData.child('h').val() === ${U}.child('h').val() && (newData.child('r').val() === true) === (${U}.child('r').val() === true)`;
  tk.log = {
    '.read': true, '.indexOn': ['t'],
    $id: {
      '.write': `${ADMIN} || (auth != null && !data.exists() && newData.exists() && ${U}.child('l').val() === $id && newData.child('t').val() === now && ${who} && (`
        + `(newData.child('y').val() === 't' && ${U}.child('t').val() === now && newData.child('c').val() === ${U}.child('c').val()`
        + ` && newData.child('f').val() === ${T}.child('c/' + newData.child('c').val()).val() && newData.child('p').val() === root.child('tk/c/' + newData.child('c').val()).val() && newData.child('p').val() !== newData.child('f').val())`
        + ` || (newData.child('y').val() === 'f' && ${U}.child('t').val() === now && newData.child('c').val() === ${U}.child('c').val()`
        + ` && newData.child('f').val() === ${ME}.child('f').val() && newData.child('p').val() === root.child('tk/c/' + newData.child('c').val()).val() && newData.child('p').val() !== newData.child('f').val()`
        + ` && ${T}.child('c/' + newData.child('c').val()).val() === newData.child('p').val())`
        + ` || (newData.child('y').val() === 'd' && ${U}.child('d').val() === now && !newData.child('c').exists()`
        + ` && newData.child('f').val() === ${U}.child('f').val() && newData.child('p').val() === ${ME}.child('f').val())))`,
      '.validate': "$id.matches(/^[A-Za-z0-9_-]{8,30}$/) && newData.hasChildren(['t', 'y', 'f', 'p', 'n', 'h'])",
      t: { '.validate': true }, y: { '.validate': "newData.isString() && newData.val().matches(/^(t|d|f)$/)" },
      c: { '.validate': "newData.isString() && newData.val().matches(/^[0-9]{1,4}$/)" },
      f: { '.validate': "newData.isString() && newData.val().matches(/^[a-t]$/)" },
      p: { '.validate': "newData.isString() && newData.val().matches(/^[a-tw]$/)" },
      n: { '.validate': 'newData.isString() && newData.val().length <= 8' },
      h: { '.validate': "newData.isString() && newData.val().matches(/^[a-t]$/)" },
      r: { '.validate': 'newData.val() === true' },
      u: { '.validate': 'newData.val() === auth.uid' },
      k: { '.validate': "newData.isString() && newData.val().matches(/^[a-z]{2,16}$/) && newData.parent().child('y').val() === 't'" },
      x: { '.validate': "newData.isString() && newData.val().matches(/^[a-z]{2,16}$/) && newData.parent().child('y').val() === 't'" },
      $other: { '.validate': false },
    },
  };
}
// ---------- 掲示板（全体と、陣営ごとの軍議） ----------
{
  const T = up(3), U = `${T}.child('u/' + auth.uid)`;
  tk.b = {
    $room: {
      '.read': `$room === 'all' || ${ADMIN} || (auth != null && ${ME}.child('f').val() === $room)`,
      '.indexOn': ['t'],
      '.validate': "$room.matches(/^(all|[a-t])$/)",
      $id: {
        '.write': `${ADMIN} || (auth != null && ${NOBAN} && !data.exists() && newData.exists() && !newData.child('g').exists()`
          + ` && newData.child('u').val() === auth.uid && newData.child('t').val() === now && ${U}.child('bt').val() === now`
          + ` && ${ME}.child('f').exists() && ($room === 'all' || ${ME}.child('f').val() === $room)`
          + ` && newData.child('n').val() === ${ME}.child('n').val() && newData.child('h').val() === ${ME}.child('h').val() && newData.child('f').val() === ${ME}.child('f').val()`
          + ` && (newData.child('r').val() === true) === (${ME}.child('r').val() === true))`,
        '.validate': "$id.matches(/^[A-Za-z0-9_-]{8,30}$/) && newData.hasChildren(['t', 'u', 'n', 'm'])",
        t: { '.validate': 'newData.isNumber()' }, u: { '.validate': 'newData.isString()' },
        n: { '.validate': 'newData.isString() && newData.val().length <= 12' },
        h: { '.validate': "newData.isString() && newData.val().matches(/^[a-t]$/)" },
        f: { '.validate': "newData.isString() && newData.val().matches(/^[a-t]$/)" },
        r: { '.validate': 'newData.val() === true' },
        m: { '.validate': 'newData.isString() && newData.val().length >= 1 && newData.val().length <= 100' },
        g: { '.validate': 'newData.val() === true' },
        $other: { '.validate': false },
      },
    },
  };
}
// ---------- なすPへの質問・要望（1人1分に1回まで。終わったあとも送れる） ----------
tk.ask = {
  '.read': ADMIN, '.indexOn': ['t'],
  $id: {
    '.write': `(auth != null && !data.exists() && newData.exists() && newData.child('u').val() === auth.uid && newData.child('t').val() === now && ${up(2)}.child('u/' + auth.uid + '/a').val() === now) || (!newData.exists() && ${ADMIN})`,
    '.validate': "$id.matches(/^[A-Za-z0-9_-]{8,30}$/) && newData.hasChildren(['t', 'u', 'm', 'l'])",
    t: { '.validate': true }, u: { '.validate': 'newData.isString()' },
    m: { '.validate': 'newData.isString() && newData.val().length >= 1 && newData.val().length <= 300' },
    x: { '.validate': "newData.isString() && newData.val().matches(/^[A-Za-z0-9_]{0,15}$/)" },
    l: { '.validate': "newData.isString() && newData.val().matches(/^(ja|en|zh|ko)$/)" },
    n: { '.validate': 'newData.isString() && newData.val().length <= 30' },
    $other: { '.validate': false },
  },
};
// ---------- いま開いている人（管理人だけ読める。1人20秒に1回まで）。本人は自分の時刻だけ読める（時計合わせに使う） ----------
tk.on = {
  '.read': ADMIN, '.indexOn': ['t'],
  $uid: {
    '.read': "auth != null && auth.uid === $uid",
    '.write': `(auth != null && auth.uid === $uid && newData.exists()) || (!newData.exists() && ${ADMIN})`,
    '.validate': "newData.hasChildren(['t']) && newData.child('t').val() === now && (!data.exists() || now - data.child('t').val() >= 20000)",
    t: { '.validate': 'newData.isNumber()' },
    f: { '.validate': "newData.isString() && newData.val().matches(/^[a-t]$/)" },
    $other: { '.validate': false },
  },
};
tk.ban = { '.read': ADMIN, $uid: { '.read': "auth != null && auth.uid === $uid", '.write': ADMIN, '.validate': 'newData.val() === true' } };
const out = JSON.stringify(tk, null, 1);
fs.writeFileSync(new URL('../database.rules.tk.json', import.meta.url), out);
console.log('database.rules.tk.json を作りました', Object.keys(tk).join(' '), out.length, 'バイト');
