#!/usr/bin/env python3
"""Pack the real OSM network + real anchors into parts/03a_net_data.js (generated, do not edit).
usage: python3 gen_world.py   (run inside osm/)"""
import json, math, sys, os, base64, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import net
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'parts', '03a_net_data.js')

# ---- playable window: 32.40-32.62 N, 35.75-36.06 E (all inside the downloaded Overpass tiles)
xs = []; zs = []
for la in (32.40, 32.62):
    for lo in (35.75, 36.06):
        x, z = net.proj(la, lo); xs.append(x); zs.append(z)
WIN = (min(xs), max(xs), min(zs), max(zs))
N = net.build(WIN)
E = N['edges']; POS = N['pos']

# ---- repair: dangling ends <=3 m from another (same-level) road's interior are map-data gaps -> connect (split the other edge)
from shapely.geometry import LineString, Point
from shapely.strtree import STRtree
def seglen(p): return sum(math.hypot(a[0]-b[0], a[1]-b[1]) for a, b in zip(p, p[1:]))
def repair(E, tol=3.0):
    deg = collections.Counter()
    for e in E: deg[e['a']] += 1; deg[e['b']] += 1
    lines = [LineString(e['pts']) for e in E]
    tree = STRtree(lines)
    fixed = 0; splits = collections.defaultdict(list)   # edge idx -> [(dist along, nodeid, point)]
    for idx, e in enumerate(E):
        for end in (0, 1):
            n = e['a'] if end == 0 else e['b']
            if deg[n] != 1 or e['rb']: continue
            p = Point(e['pts'][0] if end == 0 else e['pts'][-1])
            best = None
            for j in tree.query(p.buffer(tol)):
                o = E[j]
                if j == idx or o['br'] != e['br'] or o['tn'] != e['tn'] or o['ly'] != e['ly']: continue
                d = lines[j].distance(p)
                if d < tol and (best is None or d < best[0]): best = (d, j)
            if best is None: continue
            d, j = best; o = E[j]; ln = lines[j]
            s = ln.project(p); q = ln.interpolate(s)
            if s < 1.0 or ln.length - s < 1.0:      # lands on the other edge's end node: just merge nodes
                tgt = o['a'] if s < 1.0 else o['b']
                if tgt == n: continue
                if end == 0: e['a'] = tgt; e['pts'][0] = POS[tgt]
                else: e['b'] = tgt; e['pts'][-1] = POS[tgt]
                fixed += 1; continue
            nid = ('rp', fixed); POS[nid] = (q.x, q.y)
            if end == 0: e['a'] = nid; e['pts'][0] = (q.x, q.y)
            else: e['b'] = nid; e['pts'][-1] = (q.x, q.y)
            splits[j].append((s, nid, (q.x, q.y))); fixed += 1
    new = []
    for j, L in splits.items():
        o = E[j]; L.sort(); pts = o['pts']
        # distances of original vertices
        cum = [0]
        for a, b in zip(pts, pts[1:]): cum.append(cum[-1] + math.hypot(a[0]-b[0], a[1]-b[1]))
        cuts = [(0, o['a'], pts[0])] + L + [(cum[-1], o['b'], pts[-1])]
        pieces = []
        for (s0, n0, p0), (s1, n1, p1) in zip(cuts, cuts[1:]):
            seg = [p0] + [pts[k] for k in range(1, len(pts)-1) if s0 < cum[k] < s1] + [p1]
            pieces.append(dict(o, a=n0, b=n1, pts=seg))
        E[j] = pieces[0]; new.extend(pieces[1:])
    E.extend(new)
    return fixed
FIXED = repair(E)
print('gap repairs (<=3 m):', FIXED)

# ---- stable node numbering + spatial edge order
ncode = {}
def nc(n):
    if n not in ncode: ncode[n] = len(ncode)
    return ncode[n]
def cellkey(e):
    p = e['pts'][len(e['pts'])//2]; i = int(p[0]//600); j = int(p[1]//600)
    return (j, i if j % 2 == 0 else -i)
E.sort(key=cellkey)
for e in E: e['A'] = nc(e['a']); e['B'] = nc(e['b'])

# ---- strokes (chains of same-named edges through junctions; straightest continuation, <=40 deg turn)
def tang(e, end):   # unit direction leaving node at that end, pointing away from node along the edge
    p = e['pts']
    if end == 0: a, b = p[0], p[min(len(p)-1, 1)]
    else: a, b = p[-1], p[max(0, len(p)-2)]
    l = math.hypot(b[0]-a[0], b[1]-a[1]) or 1; return ((b[0]-a[0])/l, (b[1]-a[1])/l)
byNode = collections.defaultdict(list)
for i, e in enumerate(E):
    if e['nm'] and not e['rb']:
        byNode[e['A']].append((i, 0)); byNode[e['B']].append((i, 1))
nxt = {}   # (edge,end) -> (edge,end) partner at the same node
for n, L in byNode.items():
    byname = collections.defaultdict(list)
    for it in L: byname[E[it[0]]['nm']].append(it)
    for nm, items in byname.items():
        cand = []
        for x in range(len(items)):
            for y in range(x+1, len(items)):
                if items[x][0] == items[y][0]: continue
                t1 = tang(E[items[x][0]], items[x][1]); t2 = tang(E[items[y][0]], items[y][1])
                c = -(t1[0]*t2[0] + t1[1]*t2[1])      # 1 = perfectly straight through
                if c > math.cos(math.radians(40)): cand.append((c, items[x], items[y]))
        cand.sort(reverse=True); used = set()
        for c, a, b in cand:
            if a in used or b in used: continue
            used.add(a); used.add(b); nxt[a] = b; nxt[b] = a
seen = set(); strokes = []
def walk(i, d):   # extend from edge i in direction d (0=forward: leaving via end 1)
    chain = []; cur = (i, d)
    while True:
        e, dd = cur
        if e in seen: break
        seen.add(e); chain.append((e, dd))
        leave_end = 1 if dd == 0 else 0
        p = nxt.get((e, leave_end))
        if not p: break
        # p = (edge, end where it meets this node) ; we then traverse that edge away from that end
        cur = (p[0], 0 if p[1] == 0 else 1)
    return chain
for i, e in enumerate(E):
    if i in seen or not e['nm'] or e['rb']: continue
    # rewind to the start of the chain
    back = []; cur = (i, 1)  # go backwards leaving via end 0
    chain_start = (i, 0)
    # find start by walking backward
    s = (i, 0); guard = 0; vis = {i}
    while guard < 5000:
        guard += 1
        p = nxt.get((s[0], 0 if s[1] == 0 else 1))
        if not p or p[0] in vis: break
        vis.add(p[0]); s = (p[0], 1 if p[1] == 0 else 0)
    ch = walk(s[0], s[1])
    if ch: strokes.append(ch)
print('strokes', len(strokes), 'named edges in strokes', sum(len(c) for c in strokes))


# ---- University Street axis (southbound carriageway, Al-Balad -> Yarmouk University) + roundabout clusters
UNI = [i for i, e in enumerate(E) if N['names'][e['nm']] == 'University Street' or N['namesAr'][e['nm']] == 'شارع الجامعة']
byA = {}
for i in UNI: byA.setdefault(E[i]['A'], []).append(i)
starts = [i for i in UNI if E[i]['A'] not in {E[j]['B'] for j in UNI if j != i}]
used = set(); chain = []
# start = the northern-most edge start (no predecessor, smallest z)
starts.sort(key=lambda i: E[i]['pts'][0][1]); cur = starts[0]
while cur is not None and cur not in used:
    used.add(cur); chain.append(cur); nx = None
    for j in byA.get(E[cur]['B'], []):
        if j not in used: nx = j; break
    if nx is None:   # roundabout gap: nearest unused University edge starting within 40 m, further south
        end = E[cur]['pts'][-1]; best = None
        for j in UNI:
            if j in used: continue
            p = E[j]['pts'][0]; d = math.hypot(p[0]-end[0], p[1]-end[1])
            if d < 40 and p[1] >= end[1]-5 and (best is None or d < best[0]): best = (d, j)
        nx = best[1] if best else None
    cur = nx
AXIS = []
for i in chain:
    for p in E[i]['pts']:
        if not AXIS or math.hypot(p[0]-AXIS[-1][0], p[1]-AXIS[-1][1]) > 0.5: AXIS.append((round(p[0], 1), round(p[1], 1)))
print('axis edges', len(chain), 'pts', len(AXIS), AXIS[0], AXIS[-1])

# roundabouts: clusters of ring edges joined at nodes
ring = [i for i, e in enumerate(E) if e['rb']]
par = {}
def fnd(a):
    while par.setdefault(a, a) != a: par[a] = par[par[a]]; a = par[a]
    return a
for i in ring: par[fnd(E[i]['A'])] = fnd(E[i]['B'])
comp = collections.defaultdict(list)
for i in ring: comp[fnd(E[i]['A'])].append(i)
CIRC = []
for k, L in comp.items():
    pts = [p for i in L for p in E[i]['pts']]
    cx = sum(p[0] for p in pts)/len(pts); cz = sum(p[1] for p in pts)/len(pts)
    r = sum(math.hypot(p[0]-cx, p[1]-cz) for p in pts)/len(pts)
    w = max(E[i]['w'] for i in L); nmi = next((E[i]['nm'] for i in L if E[i]['nm']), 0)
    CIRC.append([round(cx, 1), round(cz, 1), round(r, 1), w, nmi, len(L)])
print('roundabout clusters', len(CIRC), 'r>=8:', sum(1 for c in CIRC if c[2] >= 8))

# ---- geometry stream (dm, zigzag varint, base64)
def zz(v): return (v << 1) ^ (v >> 63) if v < 0 else v << 1
out = bytearray()
def wv(n):
    n = zz(n)
    while True:
        b = n & 0x7f; n >>= 7
        if n: out.append(b | 0x80)
        else: out.append(b); break
px = pz = 0
meta = []
for e in E:
    pts = [(round(p[0]*10), round(p[1]*10)) for p in e['pts']]
    # drop consecutive duplicates
    q = [pts[0]]
    for p in pts[1:]:
        if p != q[-1]: q.append(p)
    if len(q) < 2: q = [pts[0], (pts[-1][0] + 1, pts[-1][1])]
    wv(len(q));
    for p in q:
        wv(p[0]-px); wv(p[1]-pz); px, pz = p
    HW = ['motorway','trunk','primary','secondary','tertiary','unclassified','residential','living_street','service','track','link']
    h = e['hw']; hc = HW.index(h.replace('_link','')) if not h.endswith('_link') else 10
    lk = 1 if h.endswith('_link') else 0
    flags = (1 if e['ow'] else 0) | (2 if e['rb'] else 0) | (4 if e['br'] else 0) | (8 if e['tn'] else 0) | (16 if lk else 0)
    base = h.replace('_link','')
    hc = HW.index(base)
    meta.append([e['A'], e['B'], hc, flags, e['nm'], int(e['w']*2), int(e['lim']), e['ly'], int(e['osm'])])
geo = base64.b64encode(bytes(out)).decode()
print('geo b64 kB', len(geo)//1024, 'meta', len(meta))

# ---- real signals / mini roundabouts
sig = json.load(open(os.path.join(HERE, 'signals.json')))['elements']
SIG = []
for s in sig:
    t = s['tags']; k = t.get('highway')
    if k in ('traffic_signals', 'mini_roundabout'):
        x, z = net.proj(s['lat'], s['lon'])
        if WIN[0] < x < WIN[1] and WIN[2] < z < WIN[3]: SIG.append([round(x, 1), round(z, 1), 1 if k == 'traffic_signals' else 2])

# ---- real places: neighbourhood / town names for the HUD district line
poi = json.load(open(os.path.join(HERE, 'poi.json')))['elements']
PL = []
for e in poi:
    t = e['tags']
    if t.get('place') in ('city', 'town', 'suburb', 'neighbourhood', 'quarter', 'village'):
        c = e if 'lat' in e else e.get('center'); 
        if not c: continue
        x, z = net.proj(c['lat'], c['lon'])
        if WIN[0] < x < WIN[1] and WIN[2] < z < WIN[3]:
            PL.append([round(x), round(z), t.get('name', ''), t.get('name:en', ''), t['place']])

# ---- polygons (university campuses, stadium, parks)
def polys(fn):
    r = []
    for e in json.load(open(os.path.join(HERE, fn)))['elements']:
        g = e.get('geometry') or []
        if len(g) < 3: continue
        xy = [net.proj(p['lat'], p['lon']) for p in g]
        r.append((e['tags'], xy))
    return r
PA = polys('poly_a.json'); PB = polys('poly_b.json')
def pick(L, **kv):
    for t, xy in L:
        if all(t.get(k) == v for k, v in kv.items()): return xy
    return None
def poly_named(L, en):
    for t, xy in L:
        if t.get('name:en') == en: return xy
def centroid(xy):
    A = cx = cz = 0
    for (x0, z0), (x1, z1) in zip(xy, xy[1:] + xy[:1]):
        c = x0*z1 - x1*z0; A += c; cx += (x0+x1)*c; cz += (z0+z1)*c
    A /= 2; return (cx/(6*A), cz/(6*A)), abs(A)
def enc(xy, step=1): return [[round(p[0]), round(p[1])] for p in xy[::step]]
POLY = {
 'YU': poly_named(PA, 'Yarmouk University'),
 'YUS': poly_named(PA, 'Yarmouk University - South Campus'),
 'JUST': poly_named(PA, 'Jordan University of Science and Technology'),
 'STAD': poly_named(PA, 'Al-Hassan Stadium'),
}
for t, xy in PA:
    n = t.get('name:en') or ''
    if t.get('name') and 'Irbed' in (t.get('name') or ''): POLY['INU'] = xy
    if n == 'Jadara': POLY['JAD'] = xy
    if n.startswith('Balqaa'): POLY['BAU'] = xy
    if t.get('name') == 'Almalab Albaladi' or n == 'Almalab Albaladi': POLY['MSTAD'] = xy
for t, xy in PB:
    if t.get('name') == 'Emaar Irbid Park': POLY['EIMAR'] = xy
    if t.get('name') == 'King Abdullah II Park': POLY['KAP'] = xy
    if t.get('name') == 'منتزه اربد': POLY['IPARK'] = xy
PJ = {k: enc(v) for k, v in POLY.items() if v}
print({k: (round(centroid(v)[0][0]), round(centroid(v)[0][1])) for k, v in POLY.items() if v})

nm = N['names']; nmAr = N['namesAr']
J = dict(axis=AXIS, circ=CIRC, origin=[net.LAT0, net.LON0], win=[round(v) for v in WIN], names=nm, namesAr=nmAr, meta=meta, sig=SIG, places=PL, poly=PJ,
         strokes=[[[i, d] for i, d in c] for c in strokes])
js = 'const NETD=' + json.dumps({k: v for k, v in J.items() if k != 'meta'}, ensure_ascii=False, separators=(',', ':')) + ';\n'
js += 'NETD.meta=' + json.dumps(meta, separators=(',', ':')) + ';\n'
js += 'NETD.geo="' + geo + '";\n'
open(OUT, 'w').write('// GENERATED by osm/gen_world.py from OpenStreetMap (c) OpenStreetMap contributors, ODbL. Do not edit by hand.\n' + js)
print('wrote', OUT, len(js)//1024, 'kB')
json.dump(dict(win=WIN, fixed=FIXED, edges=len(E), nodes=len(ncode)), open(os.path.join(HERE, 'net_stats.json'), 'w'))
