import sqlite3,math,json,random,collections
from pyproj import Transformer
from shapely import wkb
from shapely.geometry import Polygon,box
from shapely.affinity import rotate,translate
from shapely.ops import transform
T=Transformer.from_crs("EPSG:4326","+proj=tmerc +lat_0=32.55 +lon_0=35.85 +k=1 +x_0=0 +y_0=0 +datum=WGS84 +units=m",always_xy=True)
def proj(x,y,z=None):
    X,Y=T.transform(x,y);return X,-Y   # game x east, z south
c=sqlite3.connect('irbid.gpkg')
rows=list(c.execute("select osm_id,osm_way_id,geom,building,name,amenity,shop,tourism,historic,other_tags from multipolygons where building is not null"))
TC={'house':1,'detached':1,'semidetached_house':1,'terrace':1,'bungalow':1,'residential':1,'apartments':2,'dormitory':2,
    'school':3,'university':3,'public':3,'hospital':3,'civic':3,'government':3,'college':3,'kindergarten':3,'clinic':3,
    'industrial':4,'warehouse':4,'hangar':4,'garage':4,'garages':4,'factory':4,'service':4,
    'mosque':5,'church':5,'religious':5,'retail':6,'commercial':6,'office':6,'supermarket':6,'hotel':6,
    'shed':7,'roof':7,'hut':7,'cabin':7,'carport':7,'kiosk':7,'barn':7,'greenhouse':7,'farm_auxiliary':7,'static_caravan':7,'container':7}
def parse_tags(o):
    d={}
    if o:
        import re
        for k,v in re.findall(r'"([^"]+)"=>"([^"]*)"',o):d[k]=v
    return d
def mrr_info(p):
    m=p.minimum_rotated_rectangle
    if m.geom_type!='Polygon':return None
    co=list(m.exterior.coords)[:4]
    e1=(co[1][0]-co[0][0],co[1][1]-co[0][1]);e2=(co[2][0]-co[1][0],co[2][1]-co[1][1])
    l1=math.hypot(*e1);l2=math.hypot(*e2)
    if l1>=l2:ux,uz=e1[0]/l1,e1[1]/l1;w,d=l1,l2
    else:ux,uz=e2[0]/l2,e2[1]/l2;w,d=l2,l1
    cx=sum(q[0] for q in co)/4;cz=sum(q[1] for q in co)/4
    return cx,cz,w,d,ux,uz,m
def split_pieces(p,depth=0):
    """decompose a polygon into oriented rectangles (L/U shapes -> several boxes)"""
    if p.is_empty or p.area<6:return []
    info=mrr_info(p)
    if info is None:return []
    cx,cz,w,d,ux,uz,m=info
    fill=p.area/max(1e-6,m.area)
    if fill>=0.74 or p.area<110 or depth>=3 or min(w,d)<5:
        return [(cx,cz,w,d,ux,uz,p.area)]
    best=None
    vx,vz=-uz,ux
    for frac in (0.3,0.4,0.5,0.6,0.7):
        for axis in (0,1):
            L=w if axis==0 else d
            ax=(ux,uz) if axis==0 else (vx,vz)
            bx=(vx,vz) if axis==0 else (ux,uz)
            # half-plane split along ax at fraction frac
            t=(frac-0.5)*L
            sc=(cx+ax[0]*t,cz+ax[1]*t)
            big=max(w,d)*2
            def halfbox(sgn):
                pts=[(sc[0]+sgn*0*ax[0]+bx[0]*big+ax[0]*0,0)]
                # polygon of the half plane
                o0=(sc[0]+bx[0]*big,sc[1]+bx[1]*big);o1=(sc[0]-bx[0]*big,sc[1]-bx[1]*big)
                o2=(o1[0]+sgn*ax[0]*big,o1[1]+sgn*ax[1]*big);o3=(o0[0]+sgn*ax[0]*big,o0[1]+sgn*ax[1]*big)
                return Polygon([o0,o1,o2,o3])
            parts=[]
            for sgn in (1,-1):
                g=p.intersection(halfbox(sgn))
                parts+= [q for q in (g.geoms if hasattr(g,'geoms') else [g]) if q.geom_type=='Polygon' and q.area>=6]
            if len(parts)<2:continue
            tot=0
            for q in parts:
                mi=mrr_info(q)
                if mi:tot+=q.area/max(1e-6,mi[6].area)*q.area
            score=tot/p.area
            if best is None or score>best[0]:best=(score,parts)
    if best is None or best[0]<=fill+0.04:
        return [(cx,cz,w,d,ux,uz,p.area)]
    out=[]
    for q in best[1]:out+=split_pieces(q,depth+1)
    return out
def rng(i):return random.Random(i*2654435761%2**32)
# first pass: collect buildings (polygons projected)
B=[]
for oid,wid,g,bt,name,am,shop,tour,hist,ot in rows:
    fl=g[3];env=(fl>>1)&7;off=8+{0:0,1:32,2:48,3:48,4:64}[env]
    geom=wkb.loads(bytes(g[off:]))
    gp=transform(proj,geom)
    parts=list(gp.geoms) if hasattr(gp,'geoms') else [gp]
    tg=parse_tags(ot)
    for q in parts:
        if q.geom_type!='Polygon':continue
        if not q.is_valid:q=q.buffer(0)
        if q.geom_type!='Polygon':continue
        q=Polygon(q.exterior).simplify(0.25)   # outer ring (courtyards ignored)
        if q.area<14:continue
        B.append(dict(oid=oid or wid,poly=q,bt=bt,name=name,am=am,shop=shop,tour=tour,hist=hist,tg=tg))
print('polygons',len(B))
# local density (centroid grid 150m) for height estimation
cs=150;dens=collections.Counter()
for b in B:
    ct=b['poly'].centroid;dens[(int(ct.x//cs),int(ct.y//cs))]+=1
def dn(b):
    ct=b['poly'].centroid;i,j=int(ct.x//cs),int(ct.y//cs);return sum(dens.get((i+a,j+k),0) for a in(-1,0,1) for k in(-1,0,1))/9
def height(b,area):
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
    # unknown 'yes': by size and by how built-up the neighbourhood is
    if area<35:return r.uniform(2.8,4)
    core=min(1,d/55)      # 0 sparse .. 1 dense core
    if area<90:return r.uniform(3.5,6.5)+core*r.uniform(0,4)
    if area<300:return r.uniform(5.5,9)+core*r.uniform(2,9)
    return r.uniform(7,12)+core*r.uniform(2,10)
out=[];names=[];nb=0
for b in B:
    pcs=split_pieces(b['poly'])
    if not pcs:continue
    tcode=TC.get(b['bt'],0)
    h=height(b,b['poly'].area)
    first=True;nb+=1
    for (cx,cz,w,d,ux,uz,area) in pcs:
        if w<2.2 or d<2.2:continue
        ang=math.atan2(-uz,ux)%math.pi          # game ry (local x axis = (cos,-sin)); mod pi, width is along the long axis
        out.append([round(cx*10),round(cz*10),round(w*10),round(d*10),round(ang*100),round(h*2),tcode+(8 if not first else 0)])
        first=False
    nm=b['name']
    if nm and (b['am'] or b['tour'] or b['hist'] or b['shop'] or b['bt'] in('mosque','university','school','public','retail','commercial','hospital') or 'Mall' in nm or 'Citadel' in nm):
        ct=b['poly'].centroid;names.append([round(ct.x,1),round(ct.y,1),nm,b['bt'] or '',b['am'] or '',b['shop'] or '',b['tour'] or '',b['hist'] or ''])
# extra named features for re-anchoring landmarks: key points (shops/malls) and park polygons
import re as _re
for nm,ot in c.execute("select name,other_tags from points where name is not null"):
    pass
for oid,g,nm,ot in c.execute("select osm_id,geom,name,other_tags from points where name is not null"):
    if _re.search(r'^MK |^Nissan$|Arbila|Wasfi',nm):
        fl=g[3];env=(fl>>1)&7;off=8+{0:0,1:32,2:48,3:48,4:64}[env];pt=wkb.loads(bytes(g[off:]));X,Z=proj(pt.x,pt.y);names.append([round(X,1),round(Z,1),nm,'','','pt','',''])
for oid,g,nm in c.execute("select osm_id,geom,name from multipolygons where name is not null and (leisure='park' or name like '%Clock%')"):
    fl=g[3];env=(fl>>1)&7;off=8+{0:0,1:32,2:48,3:48,4:64}[env];gp=transform(proj,wkb.loads(bytes(g[off:])));ct=gp.centroid;names.append([round(ct.x,1),round(ct.y,1),nm,'','','','park',''])
print('buildings',nb,'pieces',len(out),'named',len(names))
corners=[proj(*(lambda lo,la:(lo,la))(lo,la)) for lo,la in [(35.809,32.476),(35.89,32.476),(35.89,32.624),(35.809,32.624)]]
json.dump({'pieces':out,'names':names,'cover':[[round(x,1),round(z,1)] for x,z in corners]},open('bld.json','w'),ensure_ascii=False,separators=(',',':'))
import os;print(os.path.getsize('bld.json')//1024,'KB json')
print('cover corners',corners)
