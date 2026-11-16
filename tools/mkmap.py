# 戦国時代の日本を 5000 マスに分ける → data/map.json と js/mapdata.js
#  もとの形：国土地理院「地球地図日本」（jpn-atlas に入っている市区町村の形）。蝦夷（北海道）・琉球（沖縄・奄美）・伊豆諸島は入れない
#  使い方：python3 tools/mkmap.py <polbnda_jpn のある場所>
import sys, json, math, collections
import numpy as np
import shapefile
from PIL import Image, ImageDraw
from shapely.geometry import shape as shp_shape, Polygon, MultiPolygon
from shapely.ops import unary_union

SRC = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/work/geo/node_modules/jpn-atlas/build/polbnda_jpn'
OUT = sys.argv[2] if len(sys.argv) > 2 else '/home/claude/tenkatori'
N_CELLS = 5000
SUB = 8          # 1マスを 8×8 に分けて陸の割合を数える
THR = 0.35       # 陸がこの割合より多いマスを数える
MAXD = 9.5       # 島へ渡れる距離（マス）

# ---------- 図法（ランベルト正角円錐図法：マスが本物の正方形に近くなる） ----------
R = 6371.0
P1, P2, P0, L0 = math.radians(33), math.radians(39), math.radians(36), math.radians(135.5)
_n = math.log(math.cos(P1) / math.cos(P2)) / math.log(math.tan(math.pi / 4 + P2 / 2) / math.tan(math.pi / 4 + P1 / 2))
_F = math.cos(P1) * math.tan(math.pi / 4 + P1 / 2) ** _n / _n
_r0 = _F / math.tan(math.pi / 4 + P0 / 2) ** _n
def proj(lon, lat):
    r = _F / math.tan(math.pi / 4 + math.radians(lat) / 2) ** _n
    th = _n * (math.radians(lon) - L0)
    return R * r * math.sin(th), R * (_r0 - r * math.cos(th))   # x：東へ km、y：北へ km

# ---------- 令制国（県の中で、いちばん近い目印の国にする） ----------
ONE = {'02': '陸奥', '03': '陸奥', '04': '陸奥', '07': '陸奥', '05': '出羽', '06': '出羽', '09': '下野', '10': '上野', '11': '武蔵', '13': '武蔵',
       '16': '越中', '19': '甲斐', '20': '信濃', '25': '近江', '29': '大和', '30': '紀伊', '36': '阿波', '37': '讃岐', '38': '伊予', '39': '土佐',
       '41': '肥前', '43': '肥後', '45': '日向'}
SEED = {
 '08': {'常陸': [(36.37,140.47),(36.6,140.65),(36.08,140.2),(35.97,140.64),(36.77,140.35),(36.38,140.25),(36.31,139.98),(36.08,140.08),(36.2,140.1),(36.0,140.3)],
        '下総': [(36.19,139.70),(36.30,139.88),(36.05,139.89),(36.02,139.99),(35.91,140.05),(35.95,139.98),(36.11,139.80)]},
 '12': {'下総': [(35.61,140.12),(35.69,139.98),(35.87,139.97),(35.78,140.32),(35.73,140.83),(35.90,140.50),(35.72,140.22),(35.71,140.56),(35.95,139.87),(35.80,140.12),(35.76,140.67)],
        '上総': [(35.50,140.12),(35.38,139.92),(35.43,140.29),(35.56,140.37),(35.60,140.41),(35.15,140.32),(35.25,140.38),(35.33,139.90),(35.30,139.86),(35.28,140.24),(35.43,140.05),(35.52,140.3),(35.24,140.05)],
        '安房': [(34.99,139.87),(35.11,140.10),(35.04,139.84),(35.11,139.84),(35.02,139.98)]},
 '14': {'相模': [(35.26,139.15),(35.32,139.55),(35.34,139.49),(35.44,139.36),(35.57,139.37),(35.28,139.67),(35.33,139.35),(35.37,139.22),(35.23,139.02),(35.58,139.2),(35.14,139.62),(35.47,139.46),(35.45,139.39),(35.30,139.58),(35.48,139.1),(35.36,139.08)],
        '武蔵': [(35.45,139.63),(35.55,139.54),(35.53,139.70),(35.60,139.51)]},
 '15': {'越後': [(37.92,139.04),(37.45,138.85),(37.15,138.24),(38.22,139.48),(37.04,137.86),(37.23,138.96),(37.37,138.56),(37.13,138.76),(37.95,139.33),(37.68,139.46),(37.64,138.96),(37.07,138.88),(37.03,138.25),(36.93,138.82),(38.47,139.25),(37.75,139.1),(37.3,139.2),(38.1,139.6)],
        '佐渡': [(38.02,138.37),(37.9,138.4),(38.2,138.4)]},
 '17': {'加賀': [(36.56,136.65),(36.40,136.45),(36.30,136.31),(36.51,136.57),(36.2,136.65),(36.72,136.71),(36.67,136.73),(36.65,136.64),(36.44,136.55)],
        '能登': [(37.04,136.97),(37.39,136.90),(37.44,137.26),(36.89,136.78),(37.0,136.78),(37.23,136.91),(37.31,137.15),(36.99,136.90),(36.86,136.80)]},
 '18': {'越前': [(36.06,136.22),(35.65,136.06),(35.98,136.49),(36.06,136.50),(35.96,136.18),(35.90,136.17),(36.21,136.23),(36.17,136.23),(35.83,136.20),(35.89,136.34),(35.97,136.13),(36.09,136.30),(35.9,136.6)],
        '若狭': [(35.50,135.75),(35.60,135.94),(35.55,135.91),(35.49,135.55),(35.48,135.62)]},
 '21': {'美濃': [(35.42,136.76),(35.36,136.61),(35.50,136.92),(35.75,136.96),(35.49,137.50),(35.45,137.41),(35.33,137.13),(35.44,137.02),(35.49,136.57),(35.65,136.45),(35.48,136.68),(35.7,136.63),(35.51,136.78),(35.48,137.14),(35.58,137.19),(35.64,137.32),(35.36,137.25),(35.22,136.64),(35.31,136.56),(35.36,136.47),(35.54,137.12),(35.9,136.85),(35.6,137.45)],
        '飛騨': [(36.15,137.25),(36.24,137.19),(35.81,137.24),(36.26,136.91),(36.0,137.0),(36.3,137.5),(35.95,137.3)]},
 '22': {'伊豆': [(34.68,138.95),(34.97,139.10),(35.10,139.07),(34.98,138.95),(35.03,138.93),(35.12,138.92),(35.09,138.95),(34.77,138.78),(34.75,138.78),(34.65,138.86),(34.75,138.99),(34.77,139.04)],
        '駿河': [(34.98,138.38),(35.2,138.3),(35.10,138.86),(35.16,138.68),(35.22,138.62),(35.31,138.93),(35.17,138.91),(34.87,138.32),(34.87,138.26),(34.84,138.18),(35.02,138.49),(35.36,138.99),(35.05,138.08),(35.3,138.2)],
        '遠江': [(34.71,137.73),(34.87,137.82),(35.16,137.87),(34.72,137.85),(34.77,138.01),(34.75,137.92),(34.72,137.53),(34.64,138.13),(34.76,138.08),(34.74,138.22),(34.84,137.93),(34.77,138.25),(35.0,137.9)]},
 '23': {'尾張': [(35.18,136.91),(35.30,136.80),(35.38,136.94),(35.22,137.08),(35.25,136.97),(35.18,136.74),(35.11,136.72),(35.00,136.86),(34.89,136.94),(34.89,136.83),(34.72,136.93),(34.78,136.91),(35.02,136.90),(35.01,136.96),(35.05,137.01),(35.13,137.04),(35.22,136.84),(35.25,136.78),(34.98,136.97)],
        '三河': [(34.95,137.17),(35.08,137.16),(35.2,137.4),(34.77,137.39),(34.90,137.50),(34.67,137.26),(34.83,137.22),(34.86,137.06),(34.96,137.08),(34.99,137.00),(35.00,137.05),(34.88,136.99),(34.93,136.99),(35.09,137.07),(34.86,137.17),(34.83,137.38),(35.10,137.57),(35.08,137.70),(35.15,137.72)]},
 '24': {'伊勢': [(34.73,136.51),(34.55,136.27),(34.97,136.62),(35.06,136.68),(34.88,136.58),(34.86,136.45),(34.58,136.53),(34.43,136.2),(34.49,136.71),(35.12,136.56),(35.02,136.51),(34.50,136.55),(34.39,136.41),(34.44,136.62),(34.36,136.41),(34.35,136.70)],
        '伊賀': [(34.77,136.13),(34.63,136.11)], '志摩': [(34.33,136.83),(34.48,136.84)],
        '紀伊': [(34.07,136.19),(33.89,136.10),(34.21,136.34),(33.81,136.05),(33.73,136.01)]},
 '26': {'山城': [(35.01,135.77),(34.88,135.80),(34.87,135.71),(34.81,135.77),(34.74,135.82),(34.93,135.70),(34.85,135.86),(34.80,135.90),(34.76,135.94),(34.77,135.99)],
        '丹波': [(35.01,135.57),(35.11,135.47),(35.27,135.55),(35.16,135.42),(35.30,135.26),(35.30,135.13)],
        '丹後': [(35.47,135.39),(35.54,135.20),(35.62,135.06),(35.57,135.15),(35.68,135.29)]},
 '27': {'摂津': [(34.69,135.50),(34.78,135.47),(34.76,135.52),(34.85,135.62),(34.82,135.57),(34.82,135.43),(34.83,135.47),(34.88,135.66),(34.92,135.49),(34.97,135.41)],
        '河内': [(34.68,135.60),(34.81,135.65),(34.63,135.60),(34.77,135.63),(34.74,135.56),(34.71,135.62),(34.74,135.64),(34.79,135.68),(34.58,135.63),(34.56,135.61),(34.58,135.55),(34.50,135.60),(34.46,135.56),(34.50,135.56),(34.49,135.63),(34.46,135.62)],
        '和泉': [(34.57,135.48),(34.46,135.37),(34.48,135.42),(34.41,135.33),(34.44,135.36),(34.37,135.27),(34.36,135.24),(34.32,135.14)]},
 '28': {'摂津': [(34.69,135.20),(34.73,135.41),(34.74,135.34),(34.78,135.40),(34.80,135.36),(34.83,135.42),(34.89,135.23),(34.90,135.38)],
        '播磨': [(34.82,134.69),(34.65,134.99),(34.76,134.84),(34.80,134.99),(34.85,134.93),(34.93,134.84),(34.92,134.97),(34.99,134.97),(35.05,134.92),(34.75,134.39),(34.80,134.47),(34.86,134.55),(35.00,134.55),(35.2,134.55),(35.00,134.36),(34.87,134.36),(34.95,134.76),(34.99,134.76),(35.06,134.74)],
        '但馬': [(35.54,134.82),(35.40,134.77),(35.34,134.85),(35.63,134.63),(35.62,134.45)],
        '丹波': [(35.08,135.22),(35.18,135.04)], '淡路': [(34.34,134.89),(34.44,134.91),(34.30,134.78)]},
 '31': {'因幡': [(35.50,134.24),(35.58,134.33),(35.41,134.25),(35.34,134.40),(35.27,134.23)],
        '伯耆': [(35.43,133.33),(35.43,133.83),(35.54,133.23),(35.51,133.50),(35.50,133.69),(35.49,133.76),(35.49,133.87),(35.41,133.89),(35.24,133.44),(35.16,133.31),(35.28,133.49),(35.39,133.41),(35.34,133.33)]},
 '32': {'出雲': [(35.47,133.05),(35.37,132.75),(35.43,133.25),(35.29,132.90),(35.20,133.00),(35.00,132.71)],
        '石見': [(34.90,132.08),(34.68,131.84),(35.19,132.50),(35.01,132.22),(34.99,132.50),(35.08,132.59),(34.89,132.44),(34.47,131.77),(34.36,131.94)],
        '隠岐': [(36.21,133.32),(36.09,132.99),(36.10,133.10),(36.01,133.04)]},
 '33': {'備前': [(34.66,133.92),(34.49,133.95),(34.74,134.19),(34.67,134.09),(34.76,134.02),(34.80,134.16),(34.85,133.9)],
        '備中': [(34.59,133.77),(34.67,133.75),(34.79,133.62),(34.98,133.47),(34.51,133.51),(34.60,133.46),(34.63,133.59),(34.86,133.69)],
        '美作': [(35.07,134.00),(35.08,133.75),(35.25,133.65),(35.01,134.15),(35.09,133.93),(35.25,133.9),(35.12,134.18),(35.17,134.34),(34.93,133.96),(34.99,133.96),(35.18,133.57)]},
 '34': {'安芸': [(34.39,132.46),(34.25,132.57),(34.43,132.74),(34.35,132.33),(34.24,132.22),(34.67,132.71),(34.67,132.54),(34.8,132.3),(34.58,132.23),(34.22,132.44),(34.34,132.91),(34.27,132.91)],
        '備後': [(34.49,133.36),(34.41,133.20),(34.40,133.08),(34.57,133.24),(34.81,132.85),(34.86,133.02),(35.0,133.1),(34.59,133.06),(34.70,133.25)]},
 '35': {'周防': [(34.18,131.47),(34.05,131.56),(34.05,131.81),(33.96,131.94),(34.17,132.22),(34.3,132.0),(33.96,132.10),(33.93,132.20),(33.83,132.11),(34.3,131.6)],
        '長門': [(33.96,130.94),(34.2,131.0),(34.41,131.40),(34.37,131.18),(34.17,131.21),(33.95,131.25),(34.00,131.18),(34.50,131.47)]},
 '40': {'筑前': [(33.59,130.40),(33.56,130.20),(33.81,130.54),(33.51,130.52),(33.49,130.52),(33.42,130.67),(33.40,130.87),(33.65,130.69),(33.56,130.71),(33.74,130.73),(33.72,130.67),(33.85,130.67),(33.62,130.48),(33.62,130.53),(33.57,130.51),(33.50,130.42)],
        '筑後': [(33.32,130.51),(33.03,130.45),(33.16,130.41),(33.21,130.56),(33.2,130.8),(33.15,130.47),(33.35,130.76),(33.40,130.56)],
        '豊前': [(33.88,130.88),(33.73,130.98),(33.61,131.13),(33.64,130.81),(33.78,130.98),(33.70,130.92),(33.66,131.06),(33.57,130.85),(33.67,130.85),(33.60,130.82),(33.68,130.78),(33.62,130.87)]},
 '42': {'肥前': [(32.75,129.88),(33.18,129.72),(32.84,130.05),(32.79,130.37),(33.37,129.55),(32.70,128.84),(32.98,129.07),(33.19,129.06),(32.93,129.64),(33.34,129.71),(32.66,130.30),(32.9,129.96)],
        '壱岐': [(33.75,129.69)], '対馬': [(34.20,129.29),(34.65,129.47),(34.4,129.33)]},
 '44': {'豊後': [(33.24,131.61),(33.28,131.49),(33.13,131.80),(32.96,131.90),(32.97,131.40),(33.32,130.94),(32.98,131.58),(33.18,131.43),(33.57,131.73),(33.42,131.62),(33.37,131.53),(33.07,131.86),(33.28,131.15),(33.23,131.19),(33.56,131.45),(33.72,131.65)],
        '豊前': [(33.60,131.19),(33.45,131.1),(33.53,131.35)]},
 '46': {'薩摩': [(31.60,130.56),(31.81,130.30),(32.09,130.35),(32.01,130.19),(31.25,130.63),(31.27,130.30),(31.42,130.32),(31.38,130.44),(31.63,130.40),(31.71,130.27),(31.90,130.45),(32.06,130.61),(32.20,130.18),(31.85,129.87)],
        '大隅': [(31.38,130.85),(31.74,130.76),(31.73,130.63),(31.49,130.70),(31.65,131.02),(31.50,131.10),(31.34,130.95),(31.22,130.77),(31.30,130.80),(31.95,130.72),(30.73,131.00),(30.53,130.96),(30.41,130.90),(30.34,130.51)]},
}
# 国の読み（ローマ字）
ROMA = {'陸奥':'Mutsu','出羽':'Dewa','常陸':'Hitachi','下総':'Shimosa','上総':'Kazusa','安房':'Awa (Boso)','下野':'Shimotsuke','上野':'Kozuke','武蔵':'Musashi','相模':'Sagami','越後':'Echigo','佐渡':'Sado','越中':'Etchu','加賀':'Kaga','能登':'Noto','越前':'Echizen','若狭':'Wakasa','甲斐':'Kai','信濃':'Shinano','美濃':'Mino','飛騨':'Hida','伊豆':'Izu','駿河':'Suruga','遠江':'Totomi','尾張':'Owari','三河':'Mikawa','伊勢':'Ise','伊賀':'Iga','志摩':'Shima','紀伊':'Kii','近江':'Omi','山城':'Yamashiro','丹波':'Tamba','丹後':'Tango','摂津':'Settsu','河内':'Kawachi','和泉':'Izumi','播磨':'Harima','但馬':'Tajima','淡路':'Awaji','大和':'Yamato','因幡':'Inaba','伯耆':'Hoki','出雲':'Izumo','石見':'Iwami','隠岐':'Oki','備前':'Bizen','備中':'Bitchu','美作':'Mimasaka','安芸':'Aki','備後':'Bingo','周防':'Suo','長門':'Nagato','阿波':'Awa','讃岐':'Sanuki','伊予':'Iyo','土佐':'Tosa','筑前':'Chikuzen','筑後':'Chikugo','豊前':'Buzen','豊後':'Bungo','肥前':'Hizen','肥後':'Higo','日向':'Hyuga','薩摩':'Satsuma','大隅':'Osumi','壱岐':'Iki','対馬':'Tsushima'}

# ---------- 武将（a〜t）。最初の領地は、全盛期になる前の、これから伸びる時期の土地 ----------
#  rule：('prov', [国…]) その国ぜんぶ ／ ('near', [(緯度,経度,半径km)…], 国の絞りこみ) 城のまわり ／ ('north', 国, 緯度) その国の北
WAR = [
 ('a', '織田信長',   (35.216,136.840), ('near', [(35.216,136.84,15)], ['尾張'])),
 ('b', '武田信玄',   (35.686,138.577), ('prov', ['甲斐'])),
 ('c', '上杉謙信',   (37.147,138.212), ('prov', ['越後'])),
 ('d', '伊達政宗',   (37.910,140.105), ('near', [(37.91,140.105,32),(37.76,140.47,22)], ['出羽','陸奥'])),
 ('e', '徳川家康',   (34.956,137.160), ('prov', ['三河'])),
 ('f', '豊臣秀吉',   (34.839,134.694), ('near', [(34.839,134.694,30)], ['播磨'])),
 ('g', '毛利元就',   (34.672,132.705), ('near', [(34.672,132.705,16)], ['安芸'])),
 ('h', '島津義久',   (31.597,130.560), ('prov', ['薩摩'])),
 ('i', '北条氏康',   (35.251,139.153), ('prov', ['相模','伊豆'])),
 ('j', '今川義元',   (34.979,138.383), ('prov', ['駿河','遠江'])),
 ('k', '斎藤道三',   (35.434,136.782), ('prov', ['美濃'])),
 ('l', '朝倉義景',   (35.999,136.296), ('prov', ['越前'])),
 ('m', '浅井長政',   (35.459,136.277), ('north', '近江', 35.30)),
 ('n', '真田昌幸',   (36.404,138.244), ('near', [(36.404,138.244,18),(36.646,139.043,15)], ['信濃','上野'])),
 ('o', '最上義光',   (38.255,140.328), ('near', [(38.255,140.328,22)], ['出羽'])),
 ('p', '佐竹義重',   (36.543,140.523), ('north', '常陸', 36.33)),
 ('q', '尼子経久',   (35.360,133.185), ('prov', ['出雲'])),
 ('r', '長宗我部元親', (33.594,133.621), ('near', [(33.594,133.621,16)], ['土佐'])),
 ('s', '大友宗麟',   (33.240,131.610), ('prov', ['豊後'])),
 ('t', '龍造寺隆信', (33.250,130.300), ('near', [(33.25,130.30,16)], ['肥前'])),
]
# 海をはさんでつながる場所（手で決めた分。ほかの島は、近い陸へ自動でつなぐ）
HAND = [('関門', (33.957,130.940), (33.945,130.963)), ('明石', (34.648,134.995), (34.590,135.017)), ('鳴門', (34.262,134.662), (34.195,134.609)),
        ('備讃', (34.462,133.812), (34.322,133.858)), ('しまなみ', (34.409,133.205), (34.066,132.998)), ('豊予', (33.343,132.016), (33.252,131.872))]

# ---------- 形を読む ----------
rd = shapefile.Reader(SRC, encoding='utf-8', encodingErrors='replace')
polys = []   # (shapely polygon in km, 県, 国)
allprov = []
def addprov(p):
    if p not in allprov: allprov.append(p)
    return allprov.index(p)
def km(lat, lon): return proj(lon, lat)
SEEDKM = {pf: [(pv, km(la, lo)) for pv, ps in d.items() for la, lo in ps] for pf, d in SEED.items()}
for sr in rd.iterShapeRecords():
    code = sr.record['adm_code']; pf = code[:2]
    if pf in ('01', '47') or not code[:2].isdigit(): continue
    g = shp_shape(sr.shape.__geo_interface__)
    for pg in (g.geoms if isinstance(g, MultiPolygon) else [g]):
        if pg.is_empty: continue
        c = pg.centroid
        if c.y < 30.0: continue                      # 奄美・トカラより南は入れない
        if pf == '13' and c.y < 35.3: continue       # 伊豆諸島・小笠原は入れない
        ext = [proj(x, y) for x, y in pg.exterior.coords]
        holes = [[proj(x, y) for x, y in h.coords] for h in pg.interiors]
        q = Polygon(ext, holes)
        if not q.is_valid: q = q.buffer(0)
        if q.is_empty: continue
        if pf in ONE: pv = ONE[pf]
        else:
            cx, cy = q.centroid.x, q.centroid.y
            pv = min(SEEDKM[pf], key=lambda s: (s[1][0] - cx) ** 2 + (s[1][1] - cy) ** 2)[0]
        polys.append((q, pf, addprov(pv)))
print('形', len(polys), '国', len(allprov))
land = unary_union([p[0] for p in polys])
minx, miny, maxx, maxy = land.bounds
print('広さ km²', round(land.area), '幅', round(maxx - minx), '高さ', round(maxy - miny))

def raster(s):
    W = int(math.ceil((maxx - minx) / s)) + 2; H = int(math.ceil((maxy - miny) / s)) + 2
    ox = minx - s; oy = maxy + s     # 左上（1マスの余白）
    im = Image.new('I', (W * SUB, H * SUB), 0); dr = ImageDraw.Draw(im)
    def pts(ring): return [((x - ox) / s * SUB, (oy - y) / s * SUB) for x, y in ring]
    for i, (q, pf, pv) in enumerate(polys):
        for pg in (q.geoms if isinstance(q, MultiPolygon) else [q]):
            dr.polygon(pts(pg.exterior.coords), fill=i + 1)
            for h in pg.interiors: dr.polygon(pts(h.coords), fill=0)
    a = np.array(im, dtype=np.int32)
    frac = (a > 0).reshape(H, SUB, W, SUB).mean(axis=(1, 3))
    return W, H, ox, oy, a, frac

def comps(mask):
    H, W = mask.shape; lab = -np.ones((H, W), dtype=np.int32); n = 0
    for y in range(H):
        for x in range(W):
            if mask[y, x] and lab[y, x] < 0:
                st = [(y, x)]; lab[y, x] = n
                while st:
                    cy, cx = st.pop()
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        ny, nx = cy + dy, cx + dx
                        if 0 <= ny < H and 0 <= nx < W and mask[ny, nx] and lab[ny, nx] < 0: lab[ny, nx] = n; st.append((ny, nx))
                n += 1
    return lab, n

def links_and_keep(mask):
    """島を近い陸へつなぐ。遠すぎる島は外す。戻り値：残すマスの印、海のつながり [(y1,x1,y2,x2)]"""
    lab, n = comps(mask)
    size = np.bincount(lab[lab >= 0], minlength=n)
    main = int(size.argmax())
    cells = {c: np.argwhere(lab == c) for c in range(n)}
    conn = [main]; left = set(range(n)) - {main}; links = []
    connpts = cells[main].copy()
    while left:
        best = None
        for c in left:
            d = ((cells[c][:, None, :] - connpts[None, :, :]) ** 2).sum(-1)
            k = int(d.argmin()); i, j = divmod(k, d.shape[1]); dd = math.sqrt(d[i, j])
            if best is None or dd < best[0]: best = (dd, c, cells[c][i], connpts[j])
        dd, c, a, b = best
        if dd > MAXD: break
        links.append((int(a[0]), int(a[1]), int(b[0]), int(b[1])))
        left.discard(c); conn.append(c); connpts = np.vstack([connpts, cells[c]])
    keep = np.isin(lab, conn)
    return keep, links

def build(s):
    W, H, ox, oy, a, frac = raster(s)
    mask = frac >= THR
    keep, links = links_and_keep(mask)
    return W, H, ox, oy, a, frac, keep, links

# マスの大きさを探す：5000 以上でいちばん近い大きさ
best = None
s = 7.20
while s < 8.80:
    W, H, ox, oy, a, frac, keep, links = build(s)
    n = int(keep.sum())
    if n >= N_CELLS and (best is None or n < best[0]): best = (n, s)
    if n < N_CELLS - 150: break
    s = round(s + 0.01, 2)
n0, S = best
W, H, ox, oy, a, frac, keep, links = build(S)
print('マスの一辺 km', S, 'マス', int(keep.sum()), '格子', W, H)
# 多い分は、陸がいちばん少ないマスから外す
extra = int(keep.sum()) - N_CELLS
if extra > 0:
    ys, xs = np.nonzero(keep); order = np.argsort(frac[ys, xs])
    for k in order[:extra]: keep[ys[k], xs[k]] = False
    keep, links = links_and_keep(keep)
    # つながりを作りなおしたあとで外れた島があれば、その数だけ陸の少ない候補から戻すのは複雑なので、ここで確かめるだけ
assert int(keep.sum()) == N_CELLS, int(keep.sum())

# ---------- マスに番号・国・最初の持ち主 ----------
ys, xs = np.nonzero(keep)
cid = -np.ones((H, W), dtype=np.int32)
cells = []
for y, x in zip(ys.tolist(), xs.tolist()):
    cid[y, x] = len(cells); cells.append((x, y))
polyprov = np.array([0] + [p[2] for p in polys], dtype=np.int32)
prov = []
blk = a.reshape(H, SUB, W, SUB).transpose(0, 2, 1, 3).reshape(H, W, SUB * SUB)
for x, y in cells:
    v = blk[y, x]; v = v[v > 0]
    pv = polyprov[v]; prov.append(int(np.bincount(pv).argmax()))
def cell_of(lat, lon, only=None):
    px, py = proj(lon, lat); fx = (px - ox) / S; fy = (oy - py) / S
    bestc, bd = -1, 1e18
    for i, (x, y) in enumerate(cells):
        if only is not None and not only(i): continue
        d = (x + .5 - fx) ** 2 + (y + .5 - fy) ** 2
        if d < bd: bd, bestc = d, i
    return bestc, math.sqrt(bd)
def ckm(i): x, y = cells[i]; return ox + (x + .5) * S, oy - (y + .5) * S
def latof(i):
    # マスの中心の緯度（北かどうかの判定用）：逆変換
    x, y = ckm(i); rho = math.hypot(x / R, _r0 - y / R)
    return math.degrees(2 * math.atan((_F / rho) ** (1 / _n)) - math.pi / 2)
own = ['w'] * N_CELLS
castle = {}
pidx = {p: i for i, p in enumerate(allprov)}
for L, name, (cla, clo), rule in WAR:
    kind = rule[0]
    if kind == 'prov':
        ps = {pidx[p] for p in rule[1]}
        for i in range(N_CELLS):
            if prov[i] in ps: own[i] = L
    elif kind == 'north':
        p = pidx[rule[1]]
        for i in range(N_CELLS):
            if prov[i] == p and latof(i) >= rule[2]: own[i] = L
    else:
        ps = {pidx[p] for p in rule[2]}
        for la, lo, rad in rule[1]:
            cx, cy = proj(lo, la)
            for i in range(N_CELLS):
                if prov[i] in ps:
                    x, y = ckm(i)
                    if math.hypot(x - cx, y - cy) <= rad and own[i] == 'w': own[i] = L
for L, name, (cla, clo), rule in WAR:
    c, d = cell_of(cla, clo)
    castle[L] = c; own[c] = L
    print(L, name, '領地', own.count(L), '天守閣', c, allprov[prov[c]], 'ずれ', round(d, 2))
assert len(set(castle.values())) == 20

# ---------- 名所・名城・合戦場（そのマスを全部、同じ陣営が取ると「占領」） ----------
#  (印, 名前[日本語・英語・繁体中文・韓国語], 種類, 緯度, 経度, マスの数)   種類：mt 山／city 都・町／shrine 神社／temple 寺／mine 金銀山／castle 城／field 合戦場
LM = [
 ('azuchi', ['安土城', 'Azuchi Castle', '安土城', '아즈치성'], 'castle', 35.1556, 136.1394, 9),
 ('fuji', ['富士山', 'Mt. Fuji', '富士山', '후지산'], 'mt', 35.3606, 138.7274, 9),
 ('kyo', ['京の都', 'Kyoto, the Capital', '京都', '교토'], 'city', 35.0116, 135.7681, 9),
 ('aso', ['阿蘇山', 'Mt. Aso', '阿蘇山', '아소산'], 'mt', 32.8840, 131.1040, 9),
 ('edo', ['江戸城', 'Edo Castle', '江戶城', '에도성'], 'castle', 35.6852, 139.7528, 4),
 ('kumamoto', ['隈本城', 'Kumamoto Castle', '隈本城', '구마모토성'], 'castle', 32.8062, 130.7058, 4),
 ('okehazama', ['桶狭間', 'Okehazama', '桶狹間', '오케하자마'], 'field', 35.0540, 136.9700, 4),
 ('kawanakajima', ['川中島', 'Kawanakajima', '川中島', '가와나카지마'], 'field', 36.5930, 138.1880, 4),
 ('nagashino', ['長篠', 'Nagashino', '長篠', '나가시노'], 'field', 34.9230, 137.5600, 4),
 ('mikatagahara', ['三方ヶ原', 'Mikatagahara', '三方原', '미카타가하라'], 'field', 34.7600, 137.7100, 4),
 ('sekigahara', ['関ヶ原', 'Sekigahara', '關原', '세키가하라'], 'field', 35.3650, 136.4650, 4),
 ('sakai', ['堺', 'Sakai', '堺', '사카이'], 'city', 34.5733, 135.4830, 4),
 ('hakata', ['博多', 'Hakata', '博多', '하카타'], 'city', 33.5950, 130.4020, 4),
 ('kamakura', ['鎌倉', 'Kamakura', '鎌倉', '가마쿠라'], 'city', 35.3192, 139.5467, 4),
 ('ishiyama', ['石山本願寺', 'Ishiyama Hongan-ji', '石山本願寺', '이시야마 혼간지'], 'temple', 34.6873, 135.5262, 4),
 ('hiei', ['比叡山延暦寺', 'Mt. Hiei Enryaku-ji', '比叡山延曆寺', '히에이산 엔랴쿠지'], 'temple', 35.0703, 135.8409, 4),
 ('koya', ['高野山', 'Mt. Koya', '高野山', '고야산'], 'temple', 34.2130, 135.5860, 4),
 ('hiraizumi', ['平泉', 'Hiraizumi', '平泉', '히라이즈미'], 'temple', 38.9880, 141.1130, 4),
 ('nikko', ['日光', 'Nikko', '日光', '닛코'], 'temple', 36.7580, 139.5990, 4),
 ('ise', ['伊勢神宮', 'Ise Grand Shrine', '伊勢神宮', '이세 신궁'], 'shrine', 34.4550, 136.7255, 4),
 ('izumo', ['出雲大社', 'Izumo Grand Shrine', '出雲大社', '이즈모 대사'], 'shrine', 35.4019, 132.6855, 4),
 ('itsukushima', ['厳島神社', 'Itsukushima Shrine', '嚴島神社', '이쓰쿠시마 신사'], 'shrine', 34.2959, 132.3198, 4),
 ('suwa', ['諏訪大社', 'Suwa Grand Shrine', '諏訪大社', '스와 대사'], 'shrine', 35.9980, 138.1190, 4),
 ('kotohira', ['金刀比羅宮', 'Kotohira Shrine', '金刀比羅宮', '고토히라궁'], 'shrine', 34.1840, 133.8090, 4),
 ('iwami', ['石見銀山', 'Iwami Silver Mine', '石見銀山', '이와미 은광'], 'mine', 35.1070, 132.4460, 4),
 ('sado', ['佐渡金山', 'Sado Gold Mine', '佐渡金山', '사도 금광'], 'mine', 38.0420, 138.2580, 4),
 ('sakurajima', ['桜島', 'Sakurajima', '櫻島', '사쿠라지마'], 'mt', 31.5850, 130.6570, 4),
]
used = set(castle.values()); lms = []
for lid, names, kind, la, lo, cnt in LM:
    px, py = proj(lo, la); fx = (px - ox) / S; fy = (oy - py) / S
    # 9マスは、いちばん近いマスを中心にした3×3。4マスは、いちばん近い角のまわりの2×2。海や天守閣・ほかの名所で欠けた分は、近いマスで補う
    if cnt == 9: ccx, ccy = math.floor(fx) + .5, math.floor(fy) + .5; rad = 1.01
    else: ccx, ccy = round(fx), round(fy); rad = 0.51
    cand = sorted([i for i in range(N_CELLS) if i not in used], key=lambda i: (0 if max(abs(cells[i][0] + .5 - ccx), abs(cells[i][1] + .5 - ccy)) <= rad else 1, (cells[i][0] + .5 - ccx) ** 2 + (cells[i][1] + .5 - ccy) ** 2))
    pick = cand[:cnt]; far = max(math.hypot(cells[i][0] + .5 - ccx, cells[i][1] + .5 - ccy) for i in pick)
    assert far < 3.2, (names[0], far)
    used.update(pick)
    mx = sum(cells[i][0] + .5 for i in pick) / cnt; my = sum(cells[i][1] + .5 for i in pick) / cnt
    lms.append({'id': lid, 'n': names, 'k': kind, 'c': sorted(pick), 'x': round(mx, 2), 'y': round(my, 2)})
    print('名所', names[0], allprov[prov[pick[0]]], cnt, 'マス', '持ち主', ''.join(sorted(set(own[i] for i in pick))), '広がり', round(far, 2))

# ---------- 海のつながり ----------
sea = []
def addsea(i, j, nm=''):
    if i == j or i < 0 or j < 0: return
    (x1, y1), (x2, y2) = cells[i], cells[j]
    if abs(x1 - x2) + abs(y1 - y2) == 1: return
    k = (min(i, j), max(i, j))
    if k not in [s[:2] for s in sea]: sea.append((k[0], k[1], nm))
for y1, x1, y2, x2 in links: addsea(int(cid[y1, x1]), int(cid[y2, x2]))
lab, ncomp = comps(keep)
for nm, pa, pb in HAND:
    i, _ = cell_of(*pa); la = lab[cells[i][1], cells[i][0]]
    j, _ = cell_of(*pb, only=lambda k: lab[cells[k][1], cells[k][0]] != la)
    if j < 0: j, _ = cell_of(*pb)
    i, _ = cell_of(*pa, only=lambda k: lab[cells[k][1], cells[k][0]] == la)
    addsea(i, j, nm)
print('海のつながり', len(sea), [(s[2] or allprov[prov[s[0]]] + '-' + allprov[prov[s[1]]]) for s in sea])
# つながりの確かめ：全部のマスが1つにつながる
adj = [[] for _ in range(N_CELLS)]
for i, (x, y) in enumerate(cells):
    for dx, dy in ((1, 0), (0, 1)):
        nx, ny = x + dx, y + dy
        if 0 <= nx < W and 0 <= ny < H and cid[ny, nx] >= 0: j = int(cid[ny, nx]); adj[i].append(j); adj[j].append(i)
for i, j, _ in sea: adj[i].append(j); adj[j].append(i)
seen = {0}; st = [0]
while st:
    c = st.pop()
    for d in adj[c]:
        if d not in seen: seen.add(d); st.append(d)
assert len(seen) == N_CELLS, ('つながっていないマスがある', len(seen))

# ---------- 切れはし（陸はあるが、マスに数えなかった四角）を、となりのマスの色で塗るための表 ----------
sliver = []
for y in range(H):
    for x in range(W):
        if frac[y, x] > 0.004 and cid[y, x] < 0:
            bestc, bf = -1, -1
            for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0), (1, 1), (1, -1), (-1, 1), (-1, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < H and 0 <= nx < W and cid[ny, nx] >= 0:
                    f = frac[ny, nx] - (0.5 if dy and dx else 0)
                    if f > bf: bf, bestc = f, int(cid[ny, nx])
            if bestc >= 0: sliver.append((x, y, bestc))
# ---------- 陸の形（マスの単位。0.01 マスきざみ） ----------
def ring(coords): return [[round((x - ox) / S, 2), round((oy - y) / S, 2)] for x, y in coords]
simp = land.simplify(S * 0.035, preserve_topology=True)
outline = []
for pg in (simp.geoms if isinstance(simp, MultiPolygon) else [simp]):
    if pg.area < S * S * 0.012: continue
    b = pg.bounds; gx0, gy0 = int((b[0] - ox) / S), int((oy - b[3]) / S); gx1, gy1 = int((b[2] - ox) / S), int((oy - b[1]) / S)
    near = False
    for yy in range(max(0, gy0 - 1), min(H, gy1 + 2)):
        for xx in range(max(0, gx0 - 1), min(W, gx1 + 2)):
            if cid[yy, xx] >= 0: near = True
    if not near: continue      # マスのない離れ小島はかかない
    rs = [ring(pg.exterior.coords)] + [ring(h.coords) for h in pg.interiors if Polygon(h).area > S * S * 0.3]
    outline.append(rs)
npts = sum(len(r) for rs in outline for r in rs)
print('陸の形', len(outline), '個', npts, '点', '切れはし', len(sliver))

# 国ごとの名前の位置（マスの重心）と、武将ごとの領地の中心
plab = []
for p, nm in enumerate(allprov):
    idx = [i for i in range(N_CELLS) if prov[i] == p]
    if not idx: plab.append(None); continue
    mx = sum(cells[i][0] + .5 for i in idx) / len(idx); my = sum(cells[i][1] + .5 for i in idx) / len(idx)
    j = min(idx, key=lambda i: (cells[i][0] + .5 - mx) ** 2 + (cells[i][1] + .5 - my) ** 2)
    plab.append([round(cells[j][0] + .5, 1), round(cells[j][1] + .5, 1), len(idx)])
out = {
    'W': W, 'H': H, 'S': S, 'n': N_CELLS,
    'cells': [v for c in cells for v in c],               # x, y, x, y, …
    'prov': prov, 'provs': allprov, 'roma': [ROMA[p] for p in allprov], 'plab': plab,
    'own': ''.join(own),                                   # 最初の持ち主（a〜t、w＝だれのものでもない）
    'castle': castle,                                      # 武将 → 天守閣のマス
    'sea': [[i, j, nm] for i, j, nm in sea],
    'sliver': [v for s3 in sliver for v in s3],
    'land': outline,
    'lm': lms,                                             # 名所（マスの番号は変えずに、あとから足した）
}
js = json.dumps(out, ensure_ascii=False, separators=(',', ':'))
open(OUT + '/data/map.json', 'w', encoding='utf-8').write(js)
open(OUT + '/js/mapdata.js', 'w', encoding='utf-8').write('// 自動で作ったファイル（tools/mkmap.py）。手で直さない\nwindow.TK_MAP=' + js + ';\n')
print('書きだし', len(js), 'バイト', '白いマス', own.count('w'))
