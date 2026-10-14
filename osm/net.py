#!/usr/bin/env python3
"""Real Irbid road network from OpenStreetMap -> game graph (topology preserved).
Inputs : osm/{irbid_osm_highways,north,south,east}.json  (Overpass `out geom`, highway ways)
Output : osm/net.json  (nodes, edges, name table, stats)
Projection: local transverse Mercator (EPSG-free, WGS84) centred on 32.55N 35.85E, k=1 -> x=east, z=-north (metres).
"""
import json, math, sys, os, collections
from pyproj import Transformer
HERE = os.path.dirname(os.path.abspath(__file__))
LAT0, LON0 = 32.55, 35.85
TR = Transformer.from_crs("EPSG:4326", f"+proj=tmerc +lat_0={LAT0} +lon_0={LON0} +k=1 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs", always_xy=True)
def proj(lat, lon):
    e, n = TR.transform(lon, lat); return (e, -n)

DRIVE = {'motorway','motorway_link','trunk','trunk_link','primary','primary_link','secondary','secondary_link',
         'tertiary','tertiary_link','unclassified','residential','living_street','service','track'}
# typical carriageway widths (m) by class -- OSM carries no width data here (only 7 ways have `lanes`)
W2 = {'motorway':14,'trunk':14,'primary':12.5,'secondary':11,'tertiary':9.5,'unclassified':8.5,'residential':8,'living_street':6,'service':5.5,'track':4,
      'motorway_link':7,'trunk_link':7,'primary_link':7,'secondary_link':7,'tertiary_link':7}
W1 = {'motorway':9,'trunk':9,'primary':9,'secondary':8.5,'tertiary':7.5,'unclassified':7,'residential':6.5,'living_street':5.5,'service':4.5,'track':4,
      'motorway_link':6.5,'trunk_link':6.5,'primary_link':6.5,'secondary_link':6.5,'tertiary_link':6.5}
LIM = {'motorway':100,'trunk':80,'primary':60,'secondary':60,'tertiary':50,'unclassified':50,'residential':40,'living_street':20,'service':20,'track':30,
       'motorway_link':60,'trunk_link':60,'primary_link':50,'secondary_link':50,'tertiary_link':40}
KIND = {'motorway':'hw','trunk':'hw','primary':'arch','secondary':'petra','tertiary':'main','unclassified':'local','residential':'local','living_street':'local','service':'svc','track':'trk',
        'motorway_link':'ramp','trunk_link':'ramp','primary_link':'ramp','secondary_link':'ramp','tertiary_link':'ramp'}

def load_ways():
    allw = {}
    for f in ['irbid_osm_highways','north','south','east']:
        for e in json.load(open(os.path.join(HERE, f + '.json')))['elements']:
            if e['type'] == 'way': allw[e['id']] = e
    return allw

def clip_seg(a, b, R):
    """Liang-Barsky: clip segment a->b (x,z) to rect R=(x0,x1,z0,z1); returns (p,q) or None."""
    x0,x1,z0,z1 = R; dx=b[0]-a[0]; dz=b[1]-a[1]; t0,t1=0.0,1.0
    for p,q in ((-dx,a[0]-x0),(dx,x1-a[0]),(-dz,a[1]-z0),(dz,z1-a[1])):
        if p==0:
            if q<0: return None
        else:
            r=q/p
            if p<0:
                if r>t1: return None
                t0=max(t0,r)
            else:
                if r<t0: return None
                t1=min(t1,r)
    return ((a[0]+t0*dx,a[1]+t0*dz),(a[0]+t1*dx,a[1]+t1*dz))

def dp(pts, eps):
    if len(pts) < 3: return pts
    keep = [False]*len(pts); keep[0]=keep[-1]=True
    st=[(0,len(pts)-1)]
    while st:
        i,j=st.pop(); ax,az=pts[i]; bx,bz=pts[j]; dx=bx-ax; dz=bz-az; L=math.hypot(dx,dz); best=-1; bi=-1
        for k in range(i+1,j):
            px,pz=pts[k]
            d = math.hypot(px-ax,pz-az) if L<1e-9 else abs((px-ax)*dz-(pz-az)*dx)/L
            if d>best: best=d; bi=k
        if best>eps: keep[bi]=True; st.append((i,bi)); st.append((bi,j))
    return [p for p,k in zip(pts,keep) if k]

def build(win, eps=0.4, verbose=True):
    allw = load_ways()
    # ---- 1. keep drivable ways, project, clip to window -> pieces carrying OSM node ids (synthetic ids for cut points)
    syn = [-1]
    pieces = []   # dict(way, ids[], xy[])
    for w in allw.values():
        t = w['tags']; hw = t.get('highway')
        if hw not in DRIVE or t.get('area') == 'yes' or t.get('access') in ('no','private') and hw=='service': continue
        ids = w['nodes']; xy = [proj(p['lat'], p['lon']) for p in w['geometry']]
        cur_i, cur_p = [], []
        def flush():
            nonlocal cur_i, cur_p
            if len(cur_p) >= 2: pieces.append(dict(w=w, ids=cur_i, xy=cur_p))
            cur_i, cur_p = [], []
        for k in range(len(xy)-1):
            c = clip_seg(xy[k], xy[k+1], win)
            if c is None: flush(); continue
            p, q = c
            if not cur_p:
                if abs(p[0]-xy[k][0])<1e-6 and abs(p[1]-xy[k][1])<1e-6: cur_i.append(ids[k])
                else: syn[0]-=1; cur_i.append(syn[0])
                cur_p.append(p)
            if abs(q[0]-xy[k+1][0])<1e-6 and abs(q[1]-xy[k+1][1])<1e-6:
                cur_i.append(ids[k+1]); cur_p.append(q)
            else:
                syn[0]-=1; cur_i.append(syn[0]); cur_p.append(q); flush()
        flush()
    # ---- 2. junction nodes: shared by >=2 pieces, repeated inside one piece, or piece endpoints
    cnt = collections.Counter()
    for pc in pieces:
        for k,i in enumerate(pc['ids']): cnt[i] += 1
    # a node used in the middle of 2+ ways, or ends anywhere
    def is_j(pc,k):
        i = pc['ids'][k]
        return k==0 or k==len(pc['ids'])-1 or cnt[i]>=2
    pos = {}
    for pc in pieces:
        for i,p in zip(pc['ids'], pc['xy']): pos.setdefault(i, p)
    # ---- 3. edges
    names = ['']; nmap = {('',''):0}; namesAr=['']
    def nid(t):
        en = t.get('name:en') or t.get('name') or ''
        ar = t.get('name:ar') or t.get('name') or ''
        key = (en, ar)
        if key not in nmap: nmap[key]=len(names); names.append(en); namesAr.append(ar)
        return nmap[key]
    edges = []
    for pc in pieces:
        t = pc['w']['tags']; hw = t['highway']; ids=pc['ids']; xy=pc['xy']
        rb = t.get('junction') in ('roundabout','circular')
        ow = 1 if (t.get('oneway') in ('yes','true','1') or rb or (hw in ('motorway','motorway_link') and t.get('oneway')!='no')) else (-1 if t.get('oneway')=='-1' else 0)
        if ow == -1: ids = ids[::-1]; xy = xy[::-1]; ow = 1
        ly = int(t.get('layer','0')) if t.get('layer','0').lstrip('-').isdigit() else 0
        br = 1 if t.get('bridge') not in (None,'no') else 0
        tn = 1 if t.get('tunnel') not in (None,'no') else 0
        ms = 0
        if 'maxspeed' in t:
            m = ''.join(ch for ch in t['maxspeed'].split()[0] if ch.isdigit())
            ms = int(m) if m else 0
        lanes = int(t['lanes']) if t.get('lanes','').isdigit() else 0
        if lanes: w = lanes*3.4 if ow==0 else lanes*3.3+0.6
        else: w = W1[hw] if (ow or rb) else W2[hw]
        if rb: w = max(w, 8.5 if hw in ('primary','trunk','secondary') else 7.5)
        attrs = dict(hw=hw, ow=ow, rb=int(rb), br=br, tn=tn, ly=ly, nm=nid(t), ms=ms, w=round(w*2)/2, lim=ms or LIM[hw], ref=t.get('ref',''), osm=pc['w']['id'])
        a = 0
        for k in range(1, len(ids)):
            if k==len(ids)-1 or cnt[ids[k]]>=2:
                seg = xy[a:k+1]
                if len(seg)>=2 and (len(seg)>2 or math.hypot(seg[0][0]-seg[-1][0],seg[0][1]-seg[-1][1])>0.05 or ids[a]!=ids[k]):
                    edges.append(dict(a=ids[a], b=ids[k], pts=seg, **attrs))
                a = k
    # ---- 4. repair: dangling ends within 2.5 m of another road's interior (mapping glitch) -> split + connect (counted & reported)
    # (skipped here; reported by stats below)
    # ---- 5. merge degree-2 chains with identical attributes
    def key(e): return (e['hw'],e['ow'],e['rb'],e['br'],e['tn'],e['ly'],e['nm'],e['w'],e['lim'])
    inc = collections.defaultdict(list)
    for i,e in enumerate(edges): inc[e['a']].append(i); inc[e['b']].append(i)
    alive = [True]*len(edges)
    for n, L in list(inc.items()):
        L = [i for i in L if alive[i]]
        if len(L)!=2 or L[0]==L[1]: continue
        e1, e2 = edges[L[0]], edges[L[1]]
        if key(e1)!=key(e2) or e1['a']==e1['b'] or e2['a']==e2['b']: continue
        # orient so e1 ends at n and e2 starts at n
        if e1['b']==n: A=e1
        elif e1['a']==n and e1['ow']==0: A=dict(e1,a=e1['b'],b=e1['a'],pts=e1['pts'][::-1])
        else: continue
        if e2['a']==n: B=e2
        elif e2['b']==n and e2['ow']==0: B=dict(e2,a=e2['b'],b=e2['a'],pts=e2['pts'][::-1])
        else: continue
        if A['a']==B['b'] and A is e1 and B is e2: pass
        m = dict(A, b=B['b'], pts=A['pts']+B['pts'][1:])
        alive[L[0]]=alive[L[1]]=False; edges.append(m); alive.append(True)
        for x in (m['a'], m['b']):
            inc[x] = [j for j in inc[x] if alive[j]] + [len(edges)-1]
    edges = [e for e,al in zip(edges,alive) if al]
    # ---- 6. simplify
    for e in edges:
        e['pts'] = dp(e['pts'], eps)
    # ---- stats
    used = set()
    for e in edges: used.add(e['a']); used.add(e['b'])
    tot = sum(sum(math.hypot(p[0]-q[0],p[1]-q[1]) for p,q in zip(e['pts'],e['pts'][1:])) for e in edges)
    nv = sum(len(e['pts']) for e in edges)
    if verbose: print(f"win={win} pieces={len(pieces)} edges={len(edges)} nodes={len(used)} verts={nv} km={tot/1000:.0f}")
    return dict(edges=edges, pos=pos, names=names, namesAr=namesAr, nodes=used)

if __name__ == '__main__':
    for lat0,lat1,lon0,lon1 in [(32.45,32.60,35.75,35.95),(32.40,32.62,35.72,36.06),(32.40,32.64,35.65,36.08)]:
        xs=[];zs=[]
        for la in (lat0,lat1):
            for lo in (lon0,lon1):
                x,z=proj(la,lo); xs.append(x); zs.append(z)
        win=(min(xs),max(xs),min(zs),max(zs))
        build(win)
