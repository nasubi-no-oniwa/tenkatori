# 巻物の中身（data/scroll/*.json）を js/scroll.js にまとめる： python3 tools/mkscroll.py
import json
D = {}
for f in 'abcd': D.update(json.load(open(f'data/scroll/{f}.json', encoding='utf-8')))
order = 'abcdefghijklmnopqrst'
js = "// 巻物：20人の武将の功績（4言語）。中身は data/scroll/*.json、作り方は python3 tools/mkscroll.py\n(function (G) { const TK = G.TK = G.TK || {}; TK.SCROLL = " + json.dumps({k: D[k] for k in order}, ensure_ascii=False, separators=(',', ':')) + "; })(window);\n"
open('js/scroll.js', 'w', encoding='utf-8').write(js)
print('js/scroll.js', len(js.encode('utf-8')) // 1024, 'KB')
