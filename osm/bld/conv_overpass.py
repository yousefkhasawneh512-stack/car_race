#!/usr/bin/env python3
"""OSM building outlines from the Overpass layer -> src/parts/03e_bld_out.js (BLDO): the real buildings OUTSIDE the old BBBike extract
rectangle (BLDD.cover in 03b), i.e. JUST, Jadara, INU, the Ramtha road and the outer villages, where the game used generated fabric.
usage: python osm/overpass/fetch.py buildings_geom  then  python osm/bld/conv_overpass.py     (project root; stdlib only)
Same piece format and rules as osm/bld/conv.py (minimum rotated rectangles, L/U shapes split into up to 8 pieces, same height rules and
per-building seeded randomness), but pure Python and the game's own projection (osm/overpass/proj.py), so it runs without pyproj/shapely.
Inside the extract nothing changes: 03b stays the source there. Heights without a height/building:levels tag are ESTIMATES (as in 03b)."""
import json,math,os,re,random,collections,sys
H=os.path.dirname(os.path.abspath(__file__));ROOT=os.path.abspath(os.path.join(H,'..','..'));sys.path.insert(0,os.path.join(ROOT,'osm','overpass'))
from proj import ll2xz
raw=json.load(open(os.path.join(ROOT,'osm','overpass','raw','buildings_geom.json'),encoding='utf-8'))
STAMP=raw['osm3s']['timestamp_osm_base'];WIN=raw['window_game_m']
cover=json.loads(re.search(r'cover:(\[\[.*?\]\])',open(os.path.join(ROOT,'src','parts','03b_bld_data.js'),encoding='utf-8').read(1200)).group(1))
def in_cover(x,z):   # same convex test as inCover() in 06d_fabric_driver.js
    sg=0
    for i in range(4):
        a,b=cover[i],cover[(i+1)&3];c=(b[0]-a[0])*(z-a[1])-(b[1]-a[1])*(x-a[0])
        if c==0:continue
        g=1 if c>0 else -1
        if not sg:sg=g
        elif sg!=g:return False
    return True
TC={'house':1,'detached':1,'semidetached_house':1,'terrace':1,'bungalow':1,'residential':1,'apartments':2,'dormitory':2,
    'school':3,'university':3,'public':3,'hospital':3,'civic':3,'government':3,'college':3,'kindergarten':3,'clinic':3,
    'industrial':4,'warehouse':4,'hangar':4,'garage':4,'garages':4,'factory':4,'service':4,
    'mosque':5,'church':5,'religious':5,'retail':6,'commercial':6,'office':6,'supermarket':6,'hotel':6,
    'shed':7,'roof':7,'hut':7,'cabin':7,'carport':7,'kiosk':7,'barn':7,'greenhouse':7,'farm_auxiliary':7,'static_caravan':7,'container':7}
# ---------- polygon helpers ----------
def area(P):return .5*abs(sum(P[i][0]*P[i-1][1]-P[i-1][0]*P[i][1] for i in range(len(P))))
def centroid(P):
    A=0;cx=cz=0
    for i in range(len(P)):
        x0,z0=P[i-1];x1,z1=P[i];c=x0*z1-x1*z0;A+=c;cx+=(x0+x1)*c;cz+=(z0+z1)*c
    if abs(A)<1e-9:return sum(p[0] for p in P)/len(P),sum(p[1] for p in P)/len(P)
    return cx/(3*A),cz/(3*A)
def hull(P):
    P=sorted(set(P))
    if len(P)<3:return P
    cr=lambda o,a,b:(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0])
    lo=[];up=[]
    for p in P:
        while len(lo)>=2 and cr(lo[-2],lo[-1],p)<=0:lo.pop()
        lo.append(p)
    for p in reversed(P):
        while len(up)>=2 and cr(up[-2],up[-1],p)<=0:up.pop()
        up.append(p)
    return lo[:-1]+up[:-1]
def mrr(P):
    """minimum-area rotated rectangle of P -> (cx,cz,w,d,ux,uz,area); w = long side along (ux,uz)"""
    Hh=hull(P)
    if len(Hh)<3:return None
    best=None
    for i in range(len(Hh)):
        a,b=Hh[i-1],Hh[i];ex,ez=b[0]-a[0],b[1]-a[1];L=math.hypot(ex,ez)
        if L<1e-9:continue
        ux,uz=ex/L,ez/L;vx,vz=-uz,ux
        us=[p[0]*ux+p[1]*uz for p in Hh];vs=[p[0]*vx+p[1]*vz for p in Hh]
        A=(max(us)-min(us))*(max(vs)-min(vs))
        if best is None or A<best[0]:best=(A,ux,uz,vx,vz,min(us),max(us),min(vs),max(vs))
    A,ux,uz,vx,vz,u0,u1,v0,v1=best;cu,cv=(u0+u1)/2,(v0+v1)/2;cx,cz=cu*ux+cv*vx,cu*uz+cv*vz;l1,l2=u1-u0,v1-v0
    if l1>=l2:return cx,cz,l1,l2,ux,uz,A
    return cx,cz,l2,l1,vx,vz,A
def clip(P,nx,nz,c):
    """Sutherland-Hodgman: keep the part of P with nx*x+nz*z >= c"""
    out=[]
    for i in range(len(P)):
        a,b=P[i-1],P[i];da=a[0]*nx+a[1]*nz-c;db=b[0]*nx+b[1]*nz-c
        if db>=0:
            if da<0:t=da/(da-db);out.append((a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t))
            out.append(b)
        elif da>=0:t=da/(da-db);out.append((a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t))
    return out
def split_pieces(P,depth=0):
    """decompose a polygon into oriented rectangles (L/U shapes -> several boxes), as conv.py does"""
    ar=area(P)
    if ar<6:return[]
    m=mrr(P)
    if m is None:return[]
    cx,cz,w,d,ux,uz,ma=m;fill=ar/max(1e-6,ma)
    if fill>=.74 or ar<110 or depth>=3 or min(w,d)<5:return[(cx,cz,w,d,ux,uz,ar)]
    best=None;vx,vz=-uz,ux
    for frac in(.3,.4,.5,.6,.7):
        for axis in(0,1):
            L=w if axis==0 else d;ax=(ux,uz) if axis==0 else(vx,vz);t=(frac-.5)*L;c=(cx+ax[0]*t)*ax[0]+(cz+ax[1]*t)*ax[1]
            parts=[q for q in(clip(P,ax[0],ax[1],c),clip(P,-ax[0],-ax[1],-c)) if len(q)>=3 and area(q)>=6]
            if len(parts)<2:continue
            tot=0
            for q in parts:
                mi=mrr(q)
                if mi:tot+=area(q)/max(1e-6,mi[6])*area(q)
            sc=tot/ar
            if best is None or sc>best[0]:best=(sc,parts)
    if best is None or best[0]<=fill+.04:return[(cx,cz,w,d,ux,uz,ar)]
    out=[]
    for q in best[1]:out+=split_pieces(q,depth+1)
    return out
def rng(i):return random.Random(i*2654435761%2**32)
# ---------- buildings ----------
B=[];inside=0;nogeo=0
for e in raw['elements']:
    g=e.get('geometry')
    if not g or len(g)<4:nogeo+=1;continue
    P=[ll2xz(p['lat'],p['lon']) for p in g if p]
    if P[0]==P[-1]:P=P[:-1]
    if len(P)<3:nogeo+=1;continue
    ar=area(P)
    if ar<14:continue
    cx,cz=centroid(P)
    if not(WIN[0]<=cx<=WIN[1] and WIN[2]<=cz<=WIN[3]):continue
    t=e.get('tags',{})
    B.append(dict(oid=e['id'],P=P,ar=ar,cx=cx,cz=cz,bt=t.get('building'),tg=t,inside=in_cover(cx,cz)))
cs=150;dens=collections.Counter((int(b['cx']//cs),int(b['cz']//cs)) for b in B)
def dn(b):i,j=int(b['cx']//cs),int(b['cz']//cs);return sum(dens.get((i+a,j+k),0) for a in(-1,0,1) for k in(-1,0,1))/9
def height(b,ar):
    tg=b['tg'];r=rng(int(b['oid'] or 1))
    if 'height' in tg:
        try:return max(2.5,min(80,float(tg['height'].split()[0])))
        except:pass
    if 'building:levels' in tg:
        try:return max(3,min(80,float(tg['building:levels'].split(';')[0])*3.2+r.uniform(0,.8)))
        except:pass
    t=TC.get(b['bt'],0);d=dn(b)
    if t==7:return r.uniform(2.6,4)
    if t==1:return r.choice([5.5,6.5,6.5,7.5,9.5])
    if t==2:return r.uniform(12,22)
    if t==3:return r.uniform(7.5,13)
    if t==4:return r.uniform(6,10)
    if t==5:return r.uniform(9,13)
    if t==6:return r.uniform(7,14)
    if ar<35:return r.uniform(2.8,4)
    core=min(1,d/55)
    if ar<90:return r.uniform(3.5,6.5)+core*r.uniform(0,4)
    if ar<300:return r.uniform(5.5,9)+core*r.uniform(2,9)
    return r.uniform(7,12)+core*r.uniform(2,10)
out=[];nb=0;tagged=0
for b in sorted(B,key=lambda b:b['oid']):
    if b['inside']:inside+=1;continue
    pcs=split_pieces(b['P'])
    if not pcs:continue
    h=height(b,b['ar']);tagged+=('height' in b['tg'] or 'building:levels' in b['tg']);first=True;nb+=1
    for(cx,cz,w,d,ux,uz,ar)in pcs:
        if w<2.2 or d<2.2:continue
        ang=math.atan2(-uz,ux)%math.pi
        out.append([round(cx*10),round(cz*10),round(w*10),round(d*10),round(ang*100),round(h*2),TC.get(b['bt'],0)+(0 if first else 8)])
        first=False
flat=[v for r in out for v in r]
js=('// ---- real OpenStreetMap buildings OUTSIDE the BBBike extract (GENERATED by osm/bld/conv_overpass.py from the Overpass API, OSM data of '+STAMP+'; ODbL (c) OpenStreetMap contributors; never hand-edit) ----\n'
    '// same 7-number piece format as BLDD.p (03b): x*10, z*10, width*10, depth*10, angle*100, height*2, type|(8 if continuation piece). Heights without an OSM height/levels tag are estimates.\n'
    'const BLDO={p:['+','.join(str(v) for v in flat)+']};\n')
open(os.path.join(ROOT,'src','parts','03e_bld_out.js'),'w',encoding='utf-8',newline='\n').write(js)
st={'retrieved':STAMP,'ways':len(raw['elements']),'missing_geometry':nogeo,'in_window':len(B),'inside_extract_skipped':inside,'buildings_written':nb,'pieces':len(out),'with_height_or_levels':tagged,'bytes':len(js)}
json.dump(st,open(os.path.join(ROOT,'manifest','buildings_outside_extract.json'),'w'),indent=1)
print(json.dumps(st))
