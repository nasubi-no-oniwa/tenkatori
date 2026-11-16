// =============================================
//  天下取りマース  ことば（日本語・英語・繁体中文・韓国語）
// =============================================
(function (G) {
  const TK = G.TK, M = G.TK_MAP;
  const LANGS = ['ja', 'en', 'zh', 'ko'];
  let li = 0;
  try { const s = localStorage.getItem('tk_lang'); const q = new URLSearchParams(location.search).get('lang'); const n = (navigator.language || 'ja').toLowerCase(); const pick = q || s || (n.startsWith('ja') ? 'ja' : n.startsWith('ko') ? 'ko' : n.startsWith('zh') ? 'zh' : 'en'); li = Math.max(0, LANGS.indexOf(pick)); } catch (e) { }
  TK.langIndex = () => li; TK.lang = () => LANGS[li];
  TK.setLang = l => { li = Math.max(0, LANGS.indexOf(l)); try { localStorage.setItem('tk_lang', LANGS[li]); } catch (e) { } document.documentElement.lang = l === 'zh' ? 'zh-Hant' : l; };
  TK.L = a => Array.isArray(a) ? (a[li] != null ? a[li] : a[0]) : a;
  TK.FONT_T = '"Yuji Syuku","Shippori Mincho B1","Hiragino Mincho ProN","Yu Mincho","Noto Serif CJK JP","Noto Serif JP","Songti TC","Nanum Myeongjo",serif';
  TK.FONT_B = '"Shippori Mincho B1","Hiragino Mincho ProN","Yu Mincho","Noto Serif CJK JP","Noto Serif JP","Songti TC","Nanum Myeongjo","AppleMyungjo",serif';
  const S = {
    title: ['天下取りマース', 'Tenka-tori MASU', '奪取天下一格', '천하를 잡는 한 칸'],
    title_sub: ['3時間に1マス。みんなで国盗り。', 'One tile every 3 hours. Everyone fights for Japan.', '每3小時1格。大家一起奪天下。', '3시간에 한 칸. 모두 함께 천하 쟁탈.'],
    title_tag: ['戦国の日本を、5000マスで奪い合う', 'Sengoku Japan, split into 5,000 tiles', '把戰國日本分成5000格來爭奪', '전국시대 일본을 5000칸으로 나눠 다툰다'],
    start: ['仕官する（10の問い）', 'Enlist (10 questions)', '出仕（10道問題）', '출사하기 (10가지 질문)'],
    cont: ['戦場へもどる', 'Return to the field', '回到戰場', '전장으로 돌아가기'],
    watch: ['地図だけ見る', 'Just view the map', '只看地圖', '지도만 보기'],
    how: ['遊び方', 'How to play', '玩法', '플레이 방법'],
    askbtn: ['なすPへの質問・要望', 'Questions & requests to NasuP', '給NasuP的提問・建議', 'NasuP에게 질문·요청'],
    t_until: ['終戦まで あと{t}', '{t} until the war ends', '距離終戰還有{t}', '종전까지 {t}'],
    t_ended: ['戦は終わりました', 'The war is over', '戰爭已經結束', '전쟁이 끝났습니다'],
    d: ['{n}日', '{n}d ', '{n}天', '{n}일 '], h: ['{n}時間', '{n}h ', '{n}小時', '{n}시간 '], mi: ['{n}分', '{n}m', '{n}分', '{n}분'],
    how1: ['10の問いに答えると、仕える武将が決まります。答えが同じなら、いつも同じ武将です。', 'Answer 10 questions to learn which warlord you serve. The same answers always give the same warlord.', '回答10道問題，決定你侍奉的武將。答案相同，結果永遠相同。', '10가지 질문에 답하면 섬길 무장이 정해집니다. 답이 같으면 언제나 같은 무장입니다.'],
    how2: ['取れるのは、自軍の領地のとなりにある、ほかの陣営のマスか白いマス。1つ取ると、次は3時間後です。', 'You can take a tile next to your side\'s land: an enemy tile or a white one. After taking one, wait 3 hours for the next.', '能拿的是緊鄰我方領地的敵方格子或白色格子。拿了1格，下一格要等3小時。', '아군 영지 옆에 있는 적의 칸이나 흰 칸을 차지할 수 있습니다. 한 칸을 차지하면 다음은 3시간 뒤입니다.'],
    how3: ['天守閣のあるマスは、だれにも取れません。どの武将にも、最後の1マスは残ります。', 'A castle tile can never be taken. Every warlord always keeps one last tile.', '有天守閣的格子誰也拿不走。每位武將都會留下最後1格。', '천수각이 있는 칸은 누구도 차지할 수 없습니다. 어느 무장에게든 마지막 한 칸은 남습니다.'],
    how4: ['どれかの陣営が半分の2500マスを取るか、11月30日23時59分（日本時間）になったら終わりです。', 'It ends when one side holds half the map (2,500 tiles), or at 23:59 on Nov 30 (Japan time).', '任一陣營拿下一半的2500格，或到11月30日23點59分（日本時間）就結束。', '어느 진영이 절반인 2500칸을 차지하거나 11월 30일 23시 59분(일본 시간)이 되면 끝납니다.'],
    how5: ['3日に1回、マスがいちばん少ない武将のもとへ寝返れます。名前に「寝返った」がつきます。', 'Once every 3 days you may defect to the warlord with the fewest tiles. "Turncoat" is added to your name.', '每3天可以倒戈一次，投向格子最少的武將。名字前會加上「倒戈的」。', '3일에 한 번, 칸이 가장 적은 무장에게 배신해 갈 수 있습니다. 이름에 "배신한"이 붙습니다.'],
    how6: ['軍議の板で、同じ陣営の仲間と作戦を相談できます。地図は2本の指で広げられます。', 'Plan with your side on the war council board. Pinch with two fingers to zoom the map.', '可以在軍議板上和同陣營的夥伴商量作戰。地圖可用兩指放大。', '군의 게시판에서 같은 진영 동료와 작전을 의논할 수 있습니다. 지도는 두 손가락으로 확대됩니다.'],
    q_no: ['第{n}問', 'Question {n}', '第{n}題', '제{n}문'], back: ['もどる', 'Back', '返回', '뒤로'], close: ['閉じる', 'Close', '關閉', '닫기'],
    loading: ['読みこみ中…', 'Loading…', '讀取中…', '불러오는 중…'],
    rv_you: ['あなたは', 'You are', '你是', '당신은'],
    rv_serve: ['{name}に仕える', 'You serve {name}', '侍奉{name}', '{name}을(를) 섬긴다'],
    rv_name: ['名を名乗れ（8文字まで）', 'State your name (up to 8 letters)', '報上名來（最多8個字）', '이름을 대라 (8자까지)'],
    rv_ph: ['与作', 'Yosaku', '與作', '요사쿠'],
    rv_join: ['仕官する', 'Enlist', '出仕', '출사하다'],
    rv_note: ['名前と仕える武将は、あとから変えられません', 'Your name and warlord cannot be changed later', '名字和侍奉的武將之後不能更改', '이름과 섬기는 무장은 나중에 바꿀 수 없습니다'],
    rv_noname: ['名前を入れてください', 'Please enter a name', '請輸入名字', '이름을 입력해 주세요'],
    x_post: ['Xに投稿', 'Post on X', '發到X', 'X에 올리기'], x_img: ['画像つきで投稿', 'Post with image', '附圖發文', '이미지와 함께 올리기'], x_save: ['画像を保存', 'Save image', '儲存圖片', '이미지 저장'],
    x_saved: ['画像を保存しました。投稿の画面で、画像をつけてください。', 'Image saved. Attach it on the post screen.', '圖片已儲存。請在發文畫面附上圖片。', '이미지를 저장했습니다. 게시 화면에서 이미지를 첨부해 주세요.'],
    army: ['{name}軍', '{name}\'s army', '{name}軍', '{name}군'],
    hud_ready: ['出陣できます', 'Ready to march', '可以出陣', '출진 가능'], hud_wait: ['次の一手まで', 'Next move in', '距離下一手', '다음 수까지'],
    cells: ['{n}マス', '{n} tiles', '{n}格', '{n}칸'], rank: ['{n}位', '#{n}', '第{n}名', '{n}위'],
    nav_power: ['勢力', 'Powers', '勢力', '세력'], nav_board: ['軍議', 'Council', '軍議', '군의'], nav_log: ['戦況', 'Reports', '戰況', '전황'], nav_defect: ['寝返り', 'Defect', '倒戈', '배신'], nav_more: ['その他', 'More', '其他', '기타'],
    kuni: ['{p}国', '{p} Province', '{p}國', '{p}국'],
    cs_white: ['だれのものでもない土地', 'Unclaimed land', '無主之地', '주인 없는 땅'],
    cs_castle: ['{name}の天守閣', '{name}\'s castle', '{name}的天守閣', '{name}의 천수각'],
    cs_take: ['このマスを奪う', 'Seize this tile', '奪取這一格', '이 칸을 빼앗다'], cs_takew: ['このマスを取る', 'Take this tile', '拿下這一格', '이 칸을 차지하다'],
    why_mine: ['自軍の領地です', 'This is your side\'s land', '這是我方領地', '아군 영지입니다'],
    why_castle: ['天守閣は、だれにも奪えません', 'A castle can never be taken', '天守閣誰也奪不走', '천수각은 누구도 빼앗을 수 없습니다'],
    why_far: ['自軍の領地のとなりではありません', 'Not next to your side\'s land', '不在我方領地旁邊', '아군 영지 옆이 아닙니다'],
    why_wait: ['次の一手まで あと{t}', 'Next move in {t}', '距離下一手還有{t}', '다음 수까지 {t}'],
    why_end: ['戦は終わりました', 'The war is over', '戰爭已經結束', '전쟁이 끝났습니다'], why_stop: ['いま、なすPが戦を止めています', 'NasuP has paused the war for now', 'NasuP暫時停止了戰事', '지금 NasuP가 전쟁을 멈췄습니다'],
    why_nome: ['仕官すると、マスを取れます', 'Enlist to take tiles', '出仕後才能拿格子', '출사하면 칸을 차지할 수 있습니다'],
    tk_title: ['{p}の一マスを奪った！', 'You seized a tile in {p}!', '奪下了{p}的一格！', '{p}의 한 칸을 빼앗았다!'],
    tk_titlew: ['{p}の一マスを手に入れた！', 'You took a tile in {p}!', '拿下了{p}的一格！', '{p}의 한 칸을 차지했다!'],
    tk_from: ['{name}軍から', 'from {name}\'s army', '從{name}軍手中', '{name}군에게서'],
    tk_count: ['{name}軍　{n}マス（{r}位）', '{name}\'s army: {n} tiles (#{r})', '{name}軍　{n}格（第{r}名）', '{name}군　{n}칸 ({r}위)'],
    tk_next: ['次の一手は {t}', 'Next move at {t}', '下一手在 {t}', '다음 수는 {t}'],
    tk_back: ['地図にもどる', 'Back to the map', '回到地圖', '지도로 돌아가기'],
    tk_fail: ['先をこされました。地図を読みなおしました。', 'Someone moved first. The map has been refreshed.', '被搶先了。已重新讀取地圖。', '선수를 빼앗겼습니다. 지도를 다시 불러왔습니다.'],
    net_err: ['通信に失敗しました。少し待ってから、もう一度ためしてください。', 'Connection failed. Please wait a moment and try again.', '連線失敗。請稍候再試一次。', '통신에 실패했습니다. 잠시 후 다시 시도해 주세요.'],
    pw_half: ['天下統一まで（2500マス）', 'To unify the realm (2,500 tiles)', '距離統一天下（2500格）', '천하통일까지 (2500칸)'],
    pw_members: ['家臣{n}人', '{n} retainers', '家臣{n}人', '가신 {n}명'], pw_white: ['白いマス　{n}', 'White tiles: {n}', '白色格子　{n}', '흰 칸　{n}'],
    bd_mine: ['{name}軍の軍議', '{name}\'s council', '{name}軍的軍議', '{name}군의 군의'], bd_all: ['全体', 'Everyone', '全體', '전체'],
    bd_ph: ['100文字まで', 'Up to 100 characters', '最多100字', '100자까지'], bd_send: ['書く', 'Post', '發言', '쓰기'],
    bd_empty: ['まだ書きこみがありません', 'No posts yet', '還沒有留言', '아직 글이 없습니다'],
    bd_wait: ['少し待ってから書いてください', 'Please wait a little before posting again', '請稍等一下再發言', '잠시 기다린 뒤 써 주세요'],
    bd_only: ['この板は、同じ陣営の人だけが読み書きできます', 'Only members of your side can read and write here', '這個板只有同陣營的人能讀寫', '이 게시판은 같은 진영 사람만 읽고 쓸 수 있습니다'],
    bd_need: ['仕官すると書けます', 'Enlist to post', '出仕後才能發言', '출사하면 쓸 수 있습니다'],
    lg_take: ['{who} が {p} の一マスを {from}軍 から奪った', '{who} seized a tile in {p} from {from}', '{who} 從{from}軍手中奪下{p}的一格', '{who} 이(가) {p}의 한 칸을 {from}군에게서 빼앗았다'],
    lg_takew: ['{who} が {p} の白いマスを取った', '{who} took a white tile in {p}', '{who} 拿下了{p}的白色格子', '{who} 이(가) {p}의 흰 칸을 차지했다'],
    lg_defect: ['{who} が {from}軍 から {to}軍 へ寝返った', '{who} defected from {from} to {to}', '{who} 從{from}軍倒戈到{to}軍', '{who} 이(가) {from}군에서 {to}군으로 배신했다'],
    lg_empty: ['まだ動きがありません', 'Nothing has happened yet', '還沒有動靜', '아직 움직임이 없습니다'],
    now: ['たったいま', 'just now', '剛剛', '방금'], min_ago: ['{n}分前', '{n}m ago', '{n}分鐘前', '{n}분 전'], hr_ago: ['{n}時間前', '{n}h ago', '{n}小時前', '{n}시간 전'], day_ago: ['{n}日前', '{n}d ago', '{n}天前', '{n}일 전'],
    df_body: ['3日に1回、マスがいちばん少ない武将のもとへ寝返れます。名前の頭に「寝返った」がつき、元の陣営の軍議は読めなくなります。', 'Once every 3 days you may defect to the warlord with the fewest tiles. "Turncoat" is added to your name, and you lose access to your old side\'s council.', '每3天可以倒戈一次，投向格子最少的武將。名字前會加上「倒戈的」，也看不到原陣營的軍議。', '3일에 한 번, 칸이 가장 적은 무장에게 배신해 갈 수 있습니다. 이름 앞에 "배신한"이 붙고, 원래 진영의 군의는 읽을 수 없게 됩니다.'],
    df_to: ['寝返れる先（いちばんマスが少ない武将）', 'You may defect to (fewest tiles)', '可以倒戈的對象（格子最少的武將）', '배신해 갈 수 있는 곳 (칸이 가장 적은 무장)'],
    df_go: ['{name}に寝返る', 'Defect to {name}', '倒戈到{name}', '{name}에게 배신하다'],
    df_wait: ['次に寝返れるまで あと{t}', 'You can defect again in {t}', '距離下次能倒戈還有{t}', '다음 배신까지 {t}'],
    df_none: ['いま仕えている武将が、いちばんマスの少ない武将です', 'Your warlord already has the fewest tiles', '你現在侍奉的武將就是格子最少的', '지금 섬기는 무장이 칸이 가장 적은 무장입니다'],
    df_sure: ['本当に{name}に寝返りますか？　元にはもどせません。', 'Really defect to {name}? This cannot be undone.', '真的要倒戈到{name}嗎？無法復原。', '정말 {name}에게 배신하시겠습니까? 되돌릴 수 없습니다.'],
    df_yes: ['寝返る', 'Defect', '倒戈', '배신한다'], df_no: ['やめておく', 'Never mind', '算了', '그만둔다'],
    df_done: ['{name}に寝返った', 'You defected to {name}', '已倒戈到{name}', '{name}에게 배신했다'],
    aw_title: ['留守の間の戦況', 'While you were away', '你不在時的戰況', '자리를 비운 사이의 전황'],
    aw_gain: ['自軍が取ったマス', 'Tiles your side took', '我軍拿下的格子', '아군이 차지한 칸'], aw_lost: ['奪われたマス', 'Tiles lost', '被奪走的格子', '빼앗긴 칸'],
    aw_by: ['いちばん攻めてきたのは　{name}軍（{n}マス）', 'Biggest attacker: {name}\'s army ({n} tiles)', '攻得最兇的是　{name}軍（{n}格）', '가장 많이 쳐들어온 것은　{name}군 ({n}칸)'],
    aw_ok: ['出陣する', 'To battle', '出陣', '출진한다'],
    mr_share: ['いまの戦況を投稿', 'Share the current map', '分享目前戰況', '지금 전황 공유'], mr_lang: ['ことば', 'Language', '語言', '언어'], mr_title: ['タイトルへ', 'Title screen', '回標題', '타이틀로'],
    mr_home: ['なすびのお庭（ほかのゲーム）', 'Nasubi no Oniwa (more games)', '茄子的庭院（其他遊戲）', '가지의 정원 (다른 게임)'], mr_fit: ['日本ぜんぶを見る', 'View all of Japan', '看整個日本', '일본 전체 보기'], mr_me: ['自軍の領地へ', 'Go to my side\'s land', '回到我方領地', '아군 영지로'],
    ak_ph: ['質問・要望を書いてください（300文字まで）', 'Write your question or request (up to 300 characters)', '請寫下提問或建議（最多300字）', '질문·요청을 써 주세요 (300자까지)'],
    ak_x: ['XのID（返事がほしいとき。なくてもよい）', 'Your X ID (optional, if you want a reply)', 'X的ID（想要回覆時填寫，可不填）', 'X 아이디 (답을 원할 때. 없어도 됩니다)'],
    ak_send: ['送る', 'Send', '送出', '보내기'], ak_done: ['送りました。ありがとうございます。', 'Sent. Thank you!', '已送出。謝謝。', '보냈습니다. 감사합니다.'], ak_wait: ['1分たってから送ってください', 'Please wait a minute before sending again', '請過1分鐘再送', '1분 뒤에 보내 주세요'],
    en_title: ['天下統一', 'The Realm Is One', '天下統一', '천하통일'],
    en_half: ['{name}、天下人となる', '{name} rules all under heaven', '{name}成為天下人', '{name}, 천하인이 되다'],
    en_time: ['終戦。もっとも広い国を治めたのは　{name}', 'The war is over. The widest realm belongs to {name}', '終戰。治理最廣領土的是　{name}', '종전. 가장 넓은 땅을 다스린 것은　{name}'],
    en_win: ['あなたの仕えた武将が、天下を取りました', 'The warlord you served has taken the realm', '你侍奉的武將取得了天下', '당신이 섬긴 무장이 천하를 잡았습니다'],
    en_map: ['最後の地図を見る', 'See the final map', '看最後的地圖', '마지막 지도 보기'],
    nm_def: ['寝返った', 'Turncoat ', '倒戈的', '배신한 '],
    sh_quiz: ['【天下取りマース】\nわたしは「{type}」。\n{name}に仕えることになった。\n\n3時間に1マス、陣地を取る戦国の国盗り。', '[Tenka-tori MASU]\nI am "{type}".\nI now serve {name}.\n\nA Sengoku land-grab: one tile every 3 hours.', '【奪取天下一格】\n我是「{type}」。\n要侍奉{name}了。\n\n每3小時拿1格的戰國奪地戰。', '[천하를 잡는 한 칸]\n나는 "{type}".\n{name}을(를) 섬기게 되었다.\n\n3시간에 한 칸, 땅을 차지하는 전국 쟁탈전.'],
    sh_take: ['【天下取りマース】\n{army}の{who}、{p}の一マスを{from}軍から奪った！\n{army}　いま{n}マス（{r}位）', '[Tenka-tori MASU]\n{who} of {army} seized a tile in {p} from {from}!\n{army}: {n} tiles now (#{r})', '【奪取天下一格】\n{army}的{who}，從{from}軍手中奪下{p}的一格！\n{army}　現在{n}格（第{r}名）', '[천하를 잡는 한 칸]\n{army}의 {who}, {p}의 한 칸을 {from}군에게서 빼앗았다!\n{army}　지금 {n}칸 ({r}위)'],
    sh_takew: ['【天下取りマース】\n{army}の{who}、{p}の一マスを手に入れた！\n{army}　いま{n}マス（{r}位）', '[Tenka-tori MASU]\n{who} of {army} took a tile in {p}!\n{army}: {n} tiles now (#{r})', '【奪取天下一格】\n{army}的{who}，拿下了{p}的一格！\n{army}　現在{n}格（第{r}名）', '[천하를 잡는 한 칸]\n{army}의 {who}, {p}의 한 칸을 차지했다!\n{army}　지금 {n}칸 ({r}위)'],
    sh_state: ['【天下取りマース】\nいまの天下：1位 {a}（{an}マス）、2位 {b}（{bn}マス）、3位 {c}（{cn}マス）\n3時間に1マス、みんなで国盗り。', '[Tenka-tori MASU]\nThe realm now: #1 {a} ({an}), #2 {b} ({bn}), #3 {c} ({cn})\nOne tile every 3 hours. Everyone fights for Japan.', '【奪取天下一格】\n目前天下：第1名 {a}（{an}格）、第2名 {b}（{bn}格）、第3名 {c}（{cn}格）\n每3小時1格，大家一起奪天下。', '[천하를 잡는 한 칸]\n지금의 천하: 1위 {a} ({an}칸), 2위 {b} ({bn}칸), 3위 {c} ({cn}칸)\n3시간에 한 칸, 모두 함께 천하 쟁탈.'],
    sh_end: ['【天下取りマース】\n終戦。天下人は {name}（{n}マス）。', '[Tenka-tori MASU]\nThe war is over. {name} rules the realm ({n} tiles).', '【奪取天下一格】\n終戰。天下人是 {name}（{n}格）。', '[천하를 잡는 한 칸]\n종전. 천하인은 {name} ({n}칸).'],
    gm: ['なすP', 'NasuP', 'NasuP', 'NasuP'], notice: ['なすPより', 'From NasuP', 'NasuP的公告', 'NasuP의 알림'],
    follow: ['新作を毎日出してます　𝕏 なすPをフォロー', 'New games every day — follow NasuP on 𝕏', '每天推出新作　在𝕏追蹤NasuP', '매일 신작을 냅니다　𝕏 NasuP 팔로우'],
  };
  TK.t = function (k, v) { let s = TK.L(S[k] || [k]); if (v) for (const key in v) s = s.split('{' + key + '}').join(v[key]); return s; };
  // 国の名前（韓国語の読み）
  const KO = { '陸奥': '무쓰', '出羽': '데와', '常陸': '히타치', '下総': '시모사', '上総': '가즈사', '安房': '아와', '下野': '시모쓰케', '上野': '고즈케', '武蔵': '무사시', '相模': '사가미', '越後': '에치고', '佐渡': '사도', '越中': '엣추', '加賀': '가가', '能登': '노토', '越前': '에치젠', '若狭': '와카사', '甲斐': '가이', '信濃': '시나노', '美濃': '미노', '飛騨': '히다', '伊豆': '이즈', '駿河': '스루가', '遠江': '도토미', '尾張': '오와리', '三河': '미카와', '伊勢': '이세', '伊賀': '이가', '志摩': '시마', '紀伊': '기이', '近江': '오미', '山城': '야마시로', '丹波': '단바', '丹後': '단고', '摂津': '셋쓰', '河内': '가와치', '和泉': '이즈미', '播磨': '하리마', '但馬': '다지마', '淡路': '아와지', '大和': '야마토', '因幡': '이나바', '伯耆': '호키', '出雲': '이즈모', '石見': '이와미', '隠岐': '오키', '備前': '비젠', '備中': '빗추', '美作': '미마사카', '安芸': '아키', '備後': '빈고', '周防': '스오', '長門': '나가토', '阿波': '아와', '讃岐': '사누키', '伊予': '이요', '土佐': '도사', '筑前': '지쿠젠', '筑後': '지쿠고', '豊前': '부젠', '豊後': '분고', '肥前': '히젠', '肥後': '히고', '日向': '휴가', '薩摩': '사쓰마', '大隅': '오스미', '壱岐': '이키', '対馬': '쓰시마' };
  TK.provName = p => { const ja = M.provs[p]; return li === 1 ? M.roma[p] : li === 3 ? (KO[ja] || M.roma[p]) : ja; };
  TK.kuni = p => li === 0 || li === 2 ? TK.t('kuni', { p: TK.provName(p) }) : TK.provName(p);
  TK.fname = f => TK.L(f.nm);
  TK.army = f => TK.t('army', { name: TK.fname(f) });
  // 名前の見せ方：「（寝返った）尾張の与作」
  TK.who = function (n, h, r) { const f = TK.FI[h]; if (!f) return n; const home = TK.L(f.home), d = r ? TK.t('nm_def') : ''; return li === 0 ? d + home + 'の' + n : li === 1 ? d + n + ' of ' + home : li === 2 ? d + home + '的' + n : d + home + '의 ' + n; };
  TK.dur = function (ms) { const m = Math.max(0, Math.ceil(ms / 60000)), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60; return (d ? TK.t('d', { n: d }) : '') + (d || h ? TK.t('h', { n: h }) : '') + (d ? '' : TK.t('mi', { n: mm })); };
  TK.clock = function (ms) { const s = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60; return h + ':' + String(m).padStart(2, '0') + ':' + String(ss).padStart(2, '0'); };
  TK.ago = function (t, now) { const m = Math.floor(Math.max(0, now - t) / 60000); return m < 1 ? TK.t('now') : m < 60 ? TK.t('min_ago', { n: m }) : m < 1440 ? TK.t('hr_ago', { n: Math.floor(m / 60) }) : TK.t('day_ago', { n: Math.floor(m / 1440) }); };
})(window);
