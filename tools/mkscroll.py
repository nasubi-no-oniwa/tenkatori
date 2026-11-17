# 巻物の中身を js にまとめる： python3 tools/mkscroll.py
#  data/scroll/a〜d.json（年表・逸話）＋ data/scroll/bio/*.json（4章の伝記）→ js/scroll/{記号}.js（武将ごと。開いた武将の分だけ読みこむ）
#  js/scroll.js は、11/17 より前に開いたページのために、年表と逸話だけのものを残す
import json, glob, os
D = {}
for f in 'abcd': D.update(json.load(open(f'data/scroll/{f}.json', encoding='utf-8')))
B = {}
for f in sorted(glob.glob('data/scroll/bio/*.json')): B.update(json.load(open(f, encoding='utf-8')))
order = 'abcdefghijklmnopqrst'
# 書き足し（data/scroll/bio_add/*.json）：{記号: [[章0〜3, この段落のあとに入れる番号, ja, en, zh, ko], ...]}
for f in sorted(glob.glob('data/scroll/bio_add/*.json')):
    for k, adds in json.load(open(f, encoding='utf-8')).items():
        for ch, after, *tx in sorted(adds, key=lambda x: (x[0], -x[1])):
            for li in range(4):
                ps = B[k][ch][li].split('\n\n'); assert after < len(ps), (k, ch, after)
                ps.insert(after + 1, tx[li]); B[k][ch][li] = '\n\n'.join(ps)
missing = [k for k in order if k not in B or len(B[k]) != 4 or any(len(c) != 4 for c in B[k])]
assert not missing, ('伝記が足りない', missing)
js = "// 巻物：20人の武将の功績（4言語）。中身は data/scroll/*.json、作り方は python3 tools/mkscroll.py\n(function (G) { const TK = G.TK = G.TK || {}; TK.SCROLL = " + json.dumps({k: D[k] for k in order}, ensure_ascii=False, separators=(',', ':')) + "; })(window);\n"
open('js/scroll.js', 'w', encoding='utf-8').write(js)
os.makedirs('js/scroll', exist_ok=True)
tot = 0
for k in order:
    d = dict(D[k]); d['bio'] = B[k]
    s = "// 巻物：" + k + " の武将（年表・逸話・伝記4章、4言語）。作り方は python3 tools/mkscroll.py\n(function (G) { const TK = G.TK = G.TK || {}; (TK.SC = TK.SC || {})." + k + " = " + json.dumps(d, ensure_ascii=False, separators=(',', ':')) + "; })(window);\n"
    open(f'js/scroll/{k}.js', 'w', encoding='utf-8').write(s); tot += len(s.encode('utf-8'))
    print(k, len(s.encode('utf-8')) // 1024, 'KB', '伝記（日本語）', sum(len(c[0]) for c in B[k]), '字')
print('js/scroll.js', len(js.encode('utf-8')) // 1024, 'KB ／ js/scroll/ 合計', tot // 1024, 'KB')
