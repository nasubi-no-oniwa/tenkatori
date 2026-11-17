// =============================================
//  天下取りマース  武将20人と診断10問のデータ
//   L：データベースでの印（a〜t）／ nm：名前（日本語・英語・繁体中文・韓国語）／ home：名前の頭につく国 ／ col：色 ／ kamon：家紋
//   v：診断用の性格（革・義・謀・攻・守・華・雅・野）
// =============================================
(function (G) {
  const TK = G.TK = G.TK || {};
  //            革 義 謀 攻 守 華 雅 野
  const F = [
    { L: 'a', nm: ['織田信長', 'Oda Nobunaga', '織田信長', '오다 노부나가'], home: ['尾張', 'Owari', '尾張', '오와리'], castle: ['清洲城', 'Kiyosu Castle', '清洲城', '기요스성'], col: '#d1232f', kamon: 'mokko', v: [3, 0, 1, 2, 0, 2, 0, 3],
      type: ['常識をこわす革命児', 'The Rule-Breaking Revolutionary', '打破常識的革命兒', '상식을 부수는 혁명아'],
      desc: ['古いしきたりより、新しいやり方。思いついたら、もう動いている。', 'New ways over old customs. By the time you think of it, you are already moving.', '比起舊規矩，更愛新做法。想到的時候，人已經動起來了。', '낡은 관습보다 새로운 방식. 떠올린 순간 이미 움직이고 있다.'] },
    { L: 'b', nm: ['武田信玄', 'Takeda Shingen', '武田信玄', '다케다 신겐'], home: ['甲斐', 'Kai', '甲斐', '가이'], castle: ['躑躅ヶ崎館', 'Tsutsujigasaki', '躑躅崎館', '쓰쓰지가사키관'], col: '#7d1736', kamon: 'takedabishi', v: [0, 1, 2, 3, 1, 0, 0, 2],
      type: ['動かざること山のごとし', 'Immovable as a Mountain', '不動如山', '움직이지 않음이 산과 같다'],
      desc: ['準備をつくし、勝てる戦しかしない。人こそが城。', 'You prepare for everything and only fight battles you can win. People are your castle.', '準備萬全，只打能贏的仗。人就是城。', '준비를 다하고 이길 싸움만 한다. 사람이 곧 성이다.'] },
    { L: 'c', nm: ['上杉謙信', 'Uesugi Kenshin', '上杉謙信', '우에스기 겐신'], home: ['越後', 'Echigo', '越後', '에치고'], castle: ['春日山城', 'Kasugayama Castle', '春日山城', '가스가야마성'], col: '#4fb4e6', kamon: 'bi', v: [0, 3, 0, 3, 0, 0, 1, 0],
      type: ['義のためなら損もする', 'Honor Before Profit', '為了義，吃虧也甘願', '의를 위해서라면 손해도 본다'],
      desc: ['損得より、筋を通す。困っている人を放っておけない。', 'Principle over gain. You cannot walk past someone in trouble.', '比起得失，更重道理。看到有人有難就放不下。', '손익보다 도리. 곤란한 사람을 그냥 두지 못한다.'] },
    { L: 'd', nm: ['伊達政宗', 'Date Masamune', '伊達政宗', '다테 마사무네'], home: ['陸奥', 'Mutsu', '陸奧', '무쓰'], castle: ['米沢城', 'Yonezawa Castle', '米澤城', '요네자와성'], col: '#1a2f7a', kamon: 'tatemitsu', v: [2, 0, 1, 1, 0, 3, 1, 3],
      type: ['遅れてきた派手好き', 'The Flashy Latecomer', '遲來的華麗派', '늦게 온 멋쟁이'],
      desc: ['目立ってこそ人生。野心も、おしゃれも、手を抜かない。', 'Life is for standing out. You never cut corners on ambition or style.', '人生就是要顯眼。野心和打扮都不馬虎。', '눈에 띄어야 인생. 야심도 멋도 대충 하지 않는다.'] },
    { L: 'e', nm: ['徳川家康', 'Tokugawa Ieyasu', '德川家康', '도쿠가와 이에야스'], home: ['三河', 'Mikawa', '三河', '미카와'], castle: ['岡崎城', 'Okazaki Castle', '岡崎城', '오카자키성'], col: '#f2b705', kamon: 'aoi', v: [0, 1, 2, 0, 3, 0, 0, 1],
      type: ['待てば天下が転がってくる', 'Wait, and the Realm Comes to You', '等著，天下自己滾過來', '기다리면 천하가 굴러온다'],
      desc: ['あせらず、じっと待てる。最後に笑うのはあなた。', 'You can wait without rushing. You are the one who laughs last.', '不急不躁，耐得住等待。最後笑的人是你。', '서두르지 않고 가만히 기다릴 줄 안다. 마지막에 웃는 사람은 당신.'] },
    { L: 'f', nm: ['豊臣秀吉', 'Toyotomi Hideyoshi', '豐臣秀吉', '도요토미 히데요시'], home: ['播磨', 'Harima', '播磨', '하리마'], castle: ['姫路城', 'Himeji Castle', '姬路城', '히메지성'], col: '#a37f14', kamon: 'kiri', v: [2, 0, 2, 0, 0, 3, 0, 2],
      type: ['人の心をつかむ天才', 'Genius at Winning Hearts', '抓住人心的天才', '사람의 마음을 사로잡는 천재'],
      desc: ['明るさと工夫で、どこまでも成り上がる。', 'With cheer and cleverness, you climb as high as you like.', '靠開朗和巧思，一路往上爬。', '밝은 성격과 꾀로 어디까지든 올라간다.'] },
    { L: 'g', nm: ['毛利元就', 'Mori Motonari', '毛利元就', '모리 모토나리'], home: ['安芸', 'Aki', '安藝', '아키'], castle: ['吉田郡山城', 'Yoshida-Koriyama Castle', '吉田郡山城', '요시다고리야마성'], col: '#1f9d55', kamon: 'ichimonji', v: [0, 1, 3, 0, 2, 0, 0, 1],
      type: ['三本の矢の策士', 'Schemer of the Three Arrows', '三支箭的謀士', '세 개의 화살의 책사'],
      desc: ['力より知恵。小さな国から、たくらみひとつで大きくなる。', 'Wits over force. From a small domain, one good scheme makes you great.', '智慧勝過力量。從小國出發，靠一個計謀壯大。', '힘보다 지혜. 작은 나라에서 계책 하나로 커진다.'] },
    { L: 'h', nm: ['島津義久', 'Shimazu Yoshihisa', '島津義久', '시마즈 요시히사'], home: ['薩摩', 'Satsuma', '薩摩', '사쓰마'], castle: ['内城', 'Uchi Castle', '內城', '우치성'], col: '#1b1b1f', kamon: 'maruju', v: [0, 2, 0, 3, 2, 0, 0, 0],
      type: ['折れない鉄の結束', 'An Unbreakable Bond', '折不斷的鐵之團結', '꺾이지 않는 강철 결속'],
      desc: ['攻めても退いても強い。仲間と決めたら、最後まで。', 'Strong in attack and in retreat. Once you side with your people, you see it through.', '進攻撤退都強。一旦認定夥伴，就走到最後。', '공격도 후퇴도 강하다. 동료라 정했으면 끝까지 간다.'] },
    { L: 'i', nm: ['北条氏康', 'Hojo Ujiyasu', '北條氏康', '호조 우지야스'], home: ['相模', 'Sagami', '相模', '사가미'], castle: ['小田原城', 'Odawara Castle', '小田原城', '오다와라성'], col: '#2f74dd', kamon: 'uroko', v: [0, 2, 0, 0, 3, 0, 1, 0],
      type: ['民を守る堅い城', 'The Fortress That Shields Its People', '守護百姓的堅城', '백성을 지키는 굳센 성'],
      desc: ['守ることにかけては天下一。足もとをおろそかにしない。', 'No one defends better. You never neglect what is under your own feet.', '論防守天下第一。從不忽略腳下的事。', '지키는 일이라면 천하제일. 발밑을 소홀히 하지 않는다.'] },
    { L: 'j', nm: ['今川義元', 'Imagawa Yoshimoto', '今川義元', '이마가와 요시모토'], home: ['駿河', 'Suruga', '駿河', '스루가'], castle: ['今川館', 'Imagawa Residence', '今川館', '이마가와관'], col: '#b39ddb', kamon: 'akadori', v: [0, 0, 0, 0, 1, 1, 3, 1],
      type: ['雅を愛する海道一の弓取り', 'The Elegant Lord of the Eastern Sea Road', '愛好風雅的海道第一弓', '풍류를 사랑하는 해도 제일의 무사'],
      desc: ['教養も実力もある名門。どうせ勝つなら、優雅に勝ちたい。', 'A noble house with both culture and power. If you must win, win gracefully.', '有教養也有實力的名門。要贏，就要贏得優雅。', '교양도 실력도 있는 명문. 이길 거라면 우아하게 이기고 싶다.'] },
    { L: 'k', nm: ['斎藤道三', 'Saito Dosan', '齋藤道三', '사이토 도산'], home: ['美濃', 'Mino', '美濃', '미노'], castle: ['稲葉山城', 'Inabayama Castle', '稻葉山城', '이나바야마성'], col: '#7a4a21', kamon: 'nami', v: [1, 0, 3, 0, 0, 0, 0, 3],
      type: ['下剋上のマムシ', 'The Viper Who Seized a Province', '下剋上的蝮蛇', '하극상의 살무사'],
      desc: ['身ひとつから国を盗る。欲しいものは、頭を使って手に入れる。', 'From nothing, you steal a whole province. What you want, you get with your head.', '白手起家奪下一國。想要的東西，用腦袋弄到手。', '맨몸으로 나라를 훔친다. 갖고 싶은 것은 머리를 써서 손에 넣는다.'] },
    { L: 'l', nm: ['朝倉義景', 'Asakura Yoshikage', '朝倉義景', '아사쿠라 요시카게'], home: ['越前', 'Echizen', '越前', '에치젠'], castle: ['一乗谷城', 'Ichijodani Castle', '一乘谷城', '이치조다니성'], col: '#c2187a', kamon: 'mitsumokko', v: [0, 0, 0, 0, 2, 0, 3, 0],
      type: ['都より美しい城下町', 'A Castle Town Lovelier Than the Capital', '比京都更美的城下町', '수도보다 아름다운 성 아랫마을'],
      desc: ['争いより、文化と平和。好きなものに囲まれていたい。', 'Culture and peace over conflict. You want to live surrounded by what you love.', '比起爭鬥，更愛文化與和平。想被喜歡的東西圍繞。', '다툼보다 문화와 평화. 좋아하는 것들에 둘러싸여 있고 싶다.'] },
    { L: 'm', nm: ['浅井長政', 'Azai Nagamasa', '淺井長政', '아자이 나가마사'], home: ['近江', 'Omi', '近江', '오미'], castle: ['小谷城', 'Odani Castle', '小谷城', '오다니성'], col: '#8a8d93', kamon: 'kikko', v: [0, 3, 0, 0, 1, 0, 1, 0],
      type: ['義理に生きるまっすぐな人', 'Straight and True to Old Debts', '為情義而活的正直之人', '의리에 사는 곧은 사람'],
      desc: ['得な道より、恩のある道を選ぶ。', 'You choose the path of gratitude over the path of gain.', '比起有利的路，更會選有恩情的路。', '이득이 되는 길보다 은혜가 있는 길을 택한다.'] },
    { L: 'n', nm: ['真田昌幸', 'Sanada Masayuki', '真田昌幸', '사나다 마사유키'], home: ['信濃', 'Shinano', '信濃', '시나노'], castle: ['上田城', 'Ueda Castle', '上田城', '우에다성'], col: '#f2731d', kamon: 'rokumon', v: [1, 0, 3, 1, 2, 0, 0, 0],
      type: ['小さくても大軍を追い返す', 'Small, Yet Turns Back Great Armies', '雖小也能擊退大軍', '작아도 대군을 물리친다'],
      desc: ['表も裏も使いこなす。数で負けても、知恵で勝つ。', 'You play both sides of the board. Outnumbered, you still win with your wits.', '表裡都運用自如。人數輸了，也能靠智慧贏。', '겉과 속을 모두 쓸 줄 안다. 수로 져도 지혜로 이긴다.'] },
    { L: 'o', nm: ['最上義光', 'Mogami Yoshiaki', '最上義光', '모가미 요시아키'], home: ['出羽', 'Dewa', '出羽', '데와'], castle: ['山形城', 'Yamagata Castle', '山形城', '야마가타성'], col: '#9bd13b', kamon: 'futatsubiki', v: [0, 1, 2, 0, 1, 0, 1, 2],
      type: ['羽州の狐', 'The Fox of Dewa', '羽州之狐', '우슈의 여우'],
      desc: ['家族思いで計算高い。静かに、確実に、領地を広げる。', 'Devoted to family and sharp with numbers. Quietly, surely, you widen your land.', '重視家人又精於計算。安靜而確實地擴張領地。', '가족을 아끼고 계산이 빠르다. 조용하고 확실하게 영지를 넓힌다.'] },
    { L: 'p', nm: ['佐竹義重', 'Satake Yoshishige', '佐竹義重', '사타케 요시시게'], home: ['常陸', 'Hitachi', '常陸', '히타치'], castle: ['太田城', 'Ota Castle', '太田城', '오타성'], col: '#14532d', kamon: 'ougi', v: [0, 2, 0, 2, 2, 0, 0, 0],
      type: ['鬼と呼ばれた律儀者', 'The Dutiful One They Called an Ogre', '被稱為鬼的守信之人', '귀신이라 불린 의리파'],
      desc: ['戦えば鬼、約束は必ず守る。頼られると強い。', 'An ogre in battle, and you always keep your word. You are strongest when relied upon.', '打起仗來像鬼，約定一定遵守。被依靠時最強。', '싸우면 귀신, 약속은 반드시 지킨다. 의지받을 때 강하다.'] },
    { L: 'q', nm: ['尼子経久', 'Amago Tsunehisa', '尼子經久', '아마고 쓰네히사'], home: ['出雲', 'Izumo', '出雲', '이즈모'], castle: ['月山富田城', 'Gassan-Toda Castle', '月山富田城', '갓산토다성'], col: '#7c3aed', kamon: 'yotsume', v: [0, 0, 3, 1, 0, 1, 0, 2],
      type: ['謀で国をとる謀聖', 'The Sage of Schemes', '以謀略取國的謀聖', '모략으로 나라를 얻는 모성'],
      desc: ['物惜しみしない気前のよさと、底の見えない策略。', 'Open-handed generosity, and schemes with no visible bottom.', '出手大方，謀略卻深不見底。', '아낌없이 베푸는 통과 바닥이 보이지 않는 책략.'] },
    { L: 'r', nm: ['長宗我部元親', 'Chosokabe Motochika', '長宗我部元親', '조소카베 모토치카'], home: ['土佐', 'Tosa', '土佐', '도사'], castle: ['岡豊城', 'Oko Castle', '岡豐城', '오코성'], col: '#0e9aa7', kamon: 'katabami', v: [2, 1, 0, 2, 0, 0, 0, 2],
      type: ['姫若子から鬼若子へ', 'From Little Princess to Young Ogre', '從姬若子到鬼若子', '공주 도련님에서 귀신 도련님으로'],
      desc: ['おとなしく見えて、やるときはやる。小さな所から統一をねらう。', 'You look gentle, but you deliver when it counts. From a small corner, you aim to unite it all.', '看似文靜，該出手時就出手。從小地方瞄準統一。', '얌전해 보여도 할 때는 한다. 작은 곳에서 통일을 노린다.'] },
    { L: 's', nm: ['大友宗麟', 'Otomo Sorin', '大友宗麟', '오토모 소린'], home: ['豊後', 'Bungo', '豐後', '분고'], castle: ['大友館', 'Otomo Residence', '大友館', '오토모관'], col: '#f58fb0', kamon: 'gyoyo', v: [3, 0, 0, 0, 0, 1, 2, 0],
      type: ['南蛮に夢を見た王', 'The King Who Dreamed of Distant Shores', '夢想南蠻的王', '남만에 꿈을 꾼 왕'],
      desc: ['新しい文化も考えも、まず受け入れる。世界を見ている。', 'New cultures and new ideas, you welcome them first. Your eyes are on the wider world.', '新的文化和想法都先接納。眼裡看的是世界。', '새로운 문화도 생각도 먼저 받아들인다. 세계를 보고 있다.'] },
    { L: 't', nm: ['龍造寺隆信', 'Ryuzoji Takanobu', '龍造寺隆信', '류조지 다카노부'], home: ['肥前', 'Hizen', '肥前', '히젠'], castle: ['村中城', 'Muranaka Castle', '村中城', '무라나카성'], col: '#6e7f1d', kamon: 'hiashi', v: [0, 0, 0, 3, 0, 0, 0, 3],
      type: ['肥前の熊', 'The Bear of Hizen', '肥前之熊', '히젠의 곰'],
      desc: ['欲しいものは力でつかむ。勢いに乗ったら、だれにも止められない。', 'What you want, you take by force. Once you have momentum, no one can stop you.', '想要的東西用力量抓住。一旦乘勢，誰也擋不住。', '갖고 싶은 것은 힘으로 잡는다. 기세를 타면 아무도 막지 못한다.'] },
  ];
  TK.F = F;
  TK.FI = {}; F.forEach((f, i) => { f.i = i; TK.FI[f.L] = f; });
  TK.WHITE = '#efe5cc';

  // ---------- 診断（4択×10問）。答えの組が同じなら、必ず同じ武将になる ----------
  //   t：その答えで増える性格 [革,義,謀,攻,守,華,雅,野]
  const Q = [
    { q: ['朝、目がさめた。まず何をする？', 'You wake up in the morning. What do you do first?', '早上醒來，先做什麼？', '아침에 눈을 떴다. 먼저 무엇을 할까?'],
      a: [[['今日の予定をひっくり返す新しい案を思いつく', 'Think up a new idea that overturns today\'s plans', '想出一個推翻今天計畫的新點子', '오늘 일정을 뒤엎을 새 아이디어를 떠올린다'], [2, 0, 0, 0, 0, 0, 0, 0]],
          [['昨日した約束を確かめる', 'Check the promises you made yesterday', '確認昨天許下的約定', '어제 한 약속을 확인한다'], [0, 2, 0, 0, 0, 0, 0, 0]],
          [['まわりの様子をそっと探る', 'Quietly find out what everyone is up to', '悄悄打探周圍的動靜', '주변 상황을 슬쩍 살핀다'], [0, 0, 2, 0, 0, 0, 0, 0]],
          [['とりあえず走る', 'Just start running', '總之先跑起來', '일단 달린다'], [0, 0, 0, 2, 0, 0, 0, 0]]] },
    { q: ['殿から「好きにせよ」と一国をもらった。どうする？', 'Your lord gives you a province and says, "Do as you like." What now?', '主公賞你一國，說「隨你處置」。你怎麼做？', '주군이 "마음대로 하라"며 한 나라를 주었다. 어떻게 할까?'],
      a: [[['守りを固めて、民の暮らしを整える', 'Strengthen the defenses and look after the people', '鞏固防守，安頓百姓的生活', '수비를 굳히고 백성의 살림을 돌본다'], [0, 0, 0, 0, 2, 0, 0, 0]],
          [['すぐ隣の国へ攻めこむ', 'Invade the neighboring province at once', '立刻攻打隔壁的國家', '곧바로 옆 나라로 쳐들어간다'], [0, 0, 0, 2, 0, 0, 0, 1]],
          [['茶会と歌会を開く', 'Hold a tea gathering and a poetry party', '舉辦茶會和歌會', '다회와 시회를 연다'], [0, 0, 0, 0, 0, 0, 2, 0]],
          [['派手な城を建てて、みんなを驚かせる', 'Build a dazzling castle to astonish everyone', '蓋一座華麗的城，讓大家嚇一跳', '화려한 성을 지어 모두를 놀라게 한다'], [0, 0, 0, 0, 0, 2, 0, 0]]] },
    { q: ['自分より強い相手と戦うことになった。', 'You must fight an enemy stronger than you.', '要和比自己強的對手開戰了。', '나보다 강한 상대와 싸우게 되었다.'],
      a: [[['正面からぶつかる', 'Charge straight at them', '正面硬碰硬', '정면으로 부딪친다'], [0, 0, 0, 2, 0, 0, 0, 0]],
          [['相手の中に、先に味方を作っておく', 'Make allies inside the enemy camp beforehand', '先在敵人內部拉攏自己人', '상대 안에 미리 내 편을 만들어 둔다'], [0, 0, 2, 0, 0, 0, 0, 0]],
          [['城にこもって、相手が疲れるのを待つ', 'Hole up in the castle and wait for them to tire', '守在城裡，等對方累垮', '성에 틀어박혀 상대가 지치기를 기다린다'], [0, 0, 0, 0, 2, 0, 0, 0]],
          [['だれも見たことのない武器を用意する', 'Prepare a weapon no one has ever seen', '準備誰都沒見過的武器', '아무도 본 적 없는 무기를 준비한다'], [2, 0, 0, 0, 0, 0, 0, 0]]] },
    { q: ['友が困っている。でも、助けると自分が損をする。', 'A friend is in trouble, but helping will cost you.', '朋友有難，可是幫了自己會吃虧。', '벗이 곤란에 빠졌다. 하지만 도우면 내가 손해를 본다.'],
      a: [[['損をしても助ける', 'Help anyway, whatever it costs', '吃虧也要幫', '손해를 봐도 돕는다'], [0, 3, 0, 0, 0, 0, 0, 0]],
          [['助けるふりをして、恩を売っておく', 'Pretend to help and bank the favor', '假裝幫忙，先賣個人情', '돕는 척하며 은혜를 팔아 둔다'], [0, 0, 2, 0, 0, 0, 0, 0]],
          [['助けて、あとで倍にして返してもらう', 'Help, then collect double later', '幫了之後，要他加倍奉還', '돕고 나서 나중에 두 배로 돌려받는다'], [0, 0, 0, 0, 0, 0, 0, 2]],
          [['みんなを巻きこんで、祭りにして片づける', 'Rope everyone in and turn it into a festival', '把大家都拉進來，辦成一場祭典解決', '모두를 끌어들여 잔치로 만들어 해결한다'], [0, 0, 0, 0, 0, 2, 0, 0]]] },
    { q: ['いちばんほしいものは？', 'What do you want most?', '最想要的是什麼？', '가장 갖고 싶은 것은?'],
      a: [[['天下', 'The whole realm', '天下', '천하'], [0, 0, 0, 0, 0, 0, 0, 3]],
          [['信じられる仲間', 'Companions you can trust', '可以信任的夥伴', '믿을 수 있는 동료'], [0, 2, 0, 0, 0, 0, 0, 0]],
          [['だれにも攻め落とされない城', 'A castle no one can ever take', '誰也攻不下的城', '누구에게도 함락되지 않는 성'], [0, 0, 0, 0, 2, 0, 0, 0]],
          [['海のむこうの珍しい品', 'Rare goods from across the sea', '海那一邊的珍奇寶物', '바다 건너의 진귀한 물건'], [1, 0, 0, 0, 0, 0, 1, 0]]] },
    { q: ['宴の席で、あなたは？', 'At a banquet, you are the one who…', '在宴席上，你是？', '연회 자리에서 당신은?'],
      a: [[['いちばん目立つ着物であらわれる', 'Arrives in the most eye-catching robes', '穿著最顯眼的和服登場', '가장 눈에 띄는 옷을 입고 나타난다'], [0, 0, 0, 0, 0, 3, 0, 0]],
          [['すみで歌をよんでいる', 'Composes poems in the corner', '在角落吟詩', '구석에서 시를 읊고 있다'], [0, 0, 0, 0, 0, 0, 2, 0]],
          [['みんなの話をこっそり聞いている', 'Quietly listens in on every conversation', '偷偷聽著大家的談話', '모두의 이야기를 몰래 듣고 있다'], [0, 0, 2, 0, 0, 0, 0, 0]],
          [['飲みくらべで全員を倒す', 'Drinks everyone under the table', '拚酒把所有人放倒', '술 겨루기로 모두를 쓰러뜨린다'], [0, 0, 0, 2, 0, 0, 0, 0]]] },
    { q: ['長い行列に並ぶことになった。', 'You find yourself in a very long line.', '得排一條很長的隊。', '긴 줄에 서게 되었다.'],
      a: [[['何時間でも待つ', 'Wait, however many hours it takes', '幾個小時都等', '몇 시간이든 기다린다'], [0, 0, 0, 0, 3, 0, 0, 0]],
          [['別の入口を探す', 'Look for another entrance', '找別的入口', '다른 입구를 찾는다'], [1, 0, 1, 0, 0, 0, 0, 0]],
          [['行列そのものをなくす方法を考える', 'Think of a way to get rid of lines altogether', '想辦法讓排隊這件事消失', '줄 자체를 없앨 방법을 생각한다'], [2, 0, 0, 0, 0, 0, 0, 0]],
          [['先頭まで行って、ゆずってくれと頼んでみる', 'Walk to the front and ask them to let you in', '走到最前面，拜託人家讓一下', '맨 앞으로 가서 양보해 달라고 부탁해 본다'], [0, 0, 0, 0, 0, 1, 0, 1]]] },
    { q: ['家来が大きな失敗をした。', 'One of your retainers has made a serious blunder.', '家臣犯了大錯。', '부하가 큰 실수를 저질렀다.'],
      a: [[['いっしょに責めを負う', 'Share the blame with them', '一起承擔責任', '함께 책임을 진다'], [0, 2, 0, 0, 0, 0, 0, 0]],
          [['その失敗を、次の策に生かす', 'Turn the blunder into your next stratagem', '把這次失敗用在下一個計策上', '그 실수를 다음 계책에 살린다'], [0, 0, 2, 0, 0, 0, 0, 0]],
          [['笑って許し、ほうびまでやる', 'Laugh, forgive them, and even give a reward', '笑著原諒，還給賞賜', '웃으며 용서하고 상까지 준다'], [0, 0, 0, 0, 0, 2, 0, 0]],
          [['きびしくしかる', 'Scold them severely', '嚴厲斥責', '엄하게 꾸짖는다'], [0, 0, 0, 1, 0, 0, 0, 1]]] },
    { q: ['戦のない日は、何をしている？', 'What do you do on a day without battle?', '沒有戰事的日子，你在做什麼？', '싸움이 없는 날에는 무엇을 할까?'],
      a: [[['絵や茶や庭を楽しむ', 'Enjoy painting, tea, and gardens', '欣賞畫、茶和庭園', '그림과 차와 정원을 즐긴다'], [0, 0, 0, 0, 0, 0, 3, 0]],
          [['体をきたえる', 'Train your body', '鍛鍊身體', '몸을 단련한다'], [0, 0, 0, 2, 0, 0, 0, 0]],
          [['家でじっくり次の手を考える', 'Stay in and think out your next move', '在家慢慢想下一步', '집에서 차분히 다음 수를 생각한다'], [0, 0, 1, 0, 1, 0, 0, 0]],
          [['新しいもの、新しい土地を見に行く', 'Go out to see new things and new lands', '去看新東西、新地方', '새로운 것, 새로운 땅을 보러 간다'], [2, 0, 0, 0, 0, 0, 0, 0]]] },
    { q: ['最後に。あなたの人生をひと文字で。', 'Lastly: your life in a single character.', '最後。用一個字形容你的人生。', '마지막으로. 당신의 인생을 한 글자로.'],
      a: [[['義', '義 (Honor)', '義', '의(義)'], [0, 3, 0, 0, 0, 0, 0, 0]],
          [['攻', '攻 (Attack)', '攻', '공(攻)'], [0, 0, 0, 2, 0, 0, 0, 1]],
          [['忍', '忍 (Patience)', '忍', '인(忍)'], [0, 0, 0, 0, 3, 0, 0, 0]],
          [['夢', '夢 (Dream)', '夢', '몽(夢)'], [0, 0, 0, 0, 0, 1, 0, 2]]] },
  ];
  TK.Q = Q;
  // 20人にまんべんなく当たるように計算で決めた下駄（tools/tune-quiz.mjs で作る）
  TK.BIAS = [0.154, 0, 0.504, 0.014, 0.314, 0.23, 0.579, 0.556, 0.672, 1.245, 1.421, 1.817, 0.477, 0.314, 0.479, 0.476, 0.757, 0.305, 1.161, 0.984];
  // 答え（0〜3 が10個）→ 武将の番号。性格の向きがいちばん近い武将。同点は番号の小さいほう
  const NORM = F.map(f => Math.sqrt(f.v.reduce((s, x) => s + x * x, 0)));
  TK.judge = function (ans) {
    const t = [0, 0, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < Q.length; i++) { const w = Q[i].a[ans[i]][1]; for (let k = 0; k < 8; k++) t[k] += w[k]; }
    let best = 0, bs = -1e9;
    for (let i = 0; i < F.length; i++) { let s = 0; for (let k = 0; k < 8; k++) s += t[k] * F[i].v[k]; s = s / NORM[i] + TK.BIAS[i]; if (s > bs + 1e-9) { bs = s; best = i; } }
    return best;
  };
  // ---------- 決まりの数字 ----------
  TK.JOINT = 1 * 3600 * 1000;                    // 仕官してから最初の1マスまで（作り直し対策、11/17）
  TK.JOIND = 24 * 3600 * 1000;                   // 仕官してから最初の寝返りまで（同上）
  TK.WAIT = 1 * 3600 * 1000;                     // 1マス取ったら1時間待つ（11/17に3時間から変更）
  TK.DEFECT = 3 * 24 * 3600 * 1000;              // 寝返りは3日に1回
  TK.HALF = 2500;                                // 半分とったら天下統一
  TK.END = Date.UTC(2026, 10, 30, 14, 59, 59, 999);  // 2026-11-30 23:59:59（日本時間）で終わり
})(typeof window !== 'undefined' ? window : globalThis);
