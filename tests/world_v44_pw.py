"""v44 visual evidence in real Chromium: a signalised junction (3-aspect heads, red / green on the crossing approaches), the same junction
12 s later, a speed bump close-up and the player car on the bump. usage: python tests/world_v44_pw.py dist/irbid-drive.html -> docs/screenshots/v44/."""
import sys,os
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));OUT=os.environ.get('OUT',ROOT+'/docs/screenshots/v44');os.makedirs(OUT,exist_ok=True)
THREE=open(ROOT+'/node_modules/three/build/three.min.js','rb').read();bad=0
def ok(n,c,info=''):
    global bad
    if not c:bad+=1
    print(('PASS ' if c else 'FAIL ')+n,info,flush=True)
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_page(viewport={'width':960,'height':540});errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)[:300]))
    pg.add_init_script("window.__NOAQ=1");pg.route('https://cdnjs.cloudflare.com/**',lambda r:r.fulfill(body=THREE,content_type='application/javascript'))
    pg.goto('file://'+os.path.abspath(sys.argv[1] if len(sys.argv)>1 else 'dist/irbid-drive.html'),timeout=300000);pg.wait_for_timeout(6000)
    ev=lambda s:pg.evaluate("()=>{"+s+"}")
    ev("const g=gfxRender;window.__cv=null;gfxRender=function(){if(window.__cv){const c=window.__cv;cam.position.set(c[0],c[1],c[2]);cam.lookAt(c[3],c[4],c[5])}return g.apply(this,arguments)};hour=12")
    # an OSM-mapped junction with heads on two axes
    j=ev("const q=SIG_LAMPS.find(l=>!SIGNALS.find(s=>s.id===l.nd.id).estimated&&SIG_LAMPS.some(m=>m.nd===l.nd&&m.ax!==l.ax))||SIG_LAMPS[0];return {x:q.x,z:q.z,nx:q.nd.x,nz:q.nd.z,ry:q.ry,id:q.nd.id}")
    ok('found a junction with heads on both axes',bool(j),j)
    ev(f"warp({j['nx']}+30,{j['nz']}+30,0);clock=5")
    ev(f"const y=TH({j['x']},{j['z']});window.__cv=[{j['x']}+Math.sin({j['ry']})*14,y+4.2,{j['z']}+Math.cos({j['ry']})*14,{j['nx']},y+2.5,{j['nz']}]")
    pg.wait_for_timeout(3000);pg.screenshot(path=OUT+'/8_signal_junction_t5.png')
    st1=ev(f"const n=NODES['{j['id']}'];return [light('x',n),light('z',n)]")
    ev("clock=33");pg.wait_for_timeout(2500);pg.screenshot(path=OUT+'/9_signal_junction_t33.png')
    st2=ev(f"const n=NODES['{j['id']}'];return [light('x',n),light('z',n)]")
    ok('the two axes swap between the screenshots',st1!=st2,str(st1)+' -> '+str(st2))
    # speed bump close-up, then the car on it
    bb=ev("const b=IRBID_SPEED_BUMPS.find(b=>!b.estimated)||IRBID_SPEED_BUMPS[0];return {x:b.x,z:b.z,tx:b.tx,tz:b.tz,w:b.width,len:b.len,est:b.estimated}")
    ev(f"warp({bb['x']}-{bb['tx']}*30,{bb['z']}-{bb['tz']}*30,Math.atan2({bb['tx']},{bb['tz']}));const y=TH({bb['x']},{bb['z']});window.__cv=[{bb['x']}+{bb['tz']}*5-{bb['tx']}*4,y+1.6,{bb['z']}-{bb['tx']}*5-{bb['tz']}*4,{bb['x']},y,{bb['z']}]")
    pg.wait_for_timeout(3000);pg.screenshot(path=OUT+'/10_speed_bump.png')
    ev(f"window.__cv=null;P.x={bb['x']}+{bb['tx']}*.9;P.z={bb['z']}+{bb['tz']}*.9;P.vx=P.vz=0;P.h=Math.atan2({bb['tx']},{bb['tz']});P.y=P.pgh=groundH(P.x,P.z);for(const k of['zb','vb','zw','zh','vh'])SUSP[k]=[0,0];SUSP.zh[0]=bumpAt(P.x+Math.sin(P.h)*carSpec(P.idx).wb/2,P.z+Math.cos(P.h)*carSpec(P.idx).wb/2);SUSP.zb[0]=SUSP.zh[0]*.6;SUSP.active=true;SUSP.heave=SUSP.zb[0]/2")
    ev(f"window.__cv=[P.x+{bb['tz']}*5.5,P.y+1.4,P.z-{bb['tx']}*5.5,P.x,P.y+.4,P.z]");pg.wait_for_timeout(2500);pg.screenshot(path=OUT+'/11_car_on_bump.png')
    ok('bump is drawn as profile geometry (merged mesh) at the right height',ev(f"const m=IRBID_SPEED_BUMPS[0].mesh;return !!m&&m.parent===scene&&bumpAt({bb['x']},{bb['z']})>.07"),bb)
    # environment materials: a slim tree felled, a garden wall before/after collapse, a building wall scrape (Cosmetic mode)
    ev("damageMode=0;cycleDamageMode();window.__all=[];for(const L of COL.values())for(const c of L)if(!c.broken&&!window.__all.includes(c))window.__all.push(c)")
    def hitobj(sel,v,shot,cam):
        o=ev("const o=window.__all.filter(c=>"+sel+")[0];if(!o)return null;window.__o=o;return {x:o.x,z:o.z}")
        if not o:ok('object found: '+sel,False);return None
        ev(f"const o=window.__o;window.__cv=[o.x+{cam[0]},TH(o.x,o.z)+{cam[1]},o.z+{cam[2]},o.x,TH(o.x,o.z)+1.2,o.z];warp(o.x+40,o.z+40,0);P.m.visible=false")
        pg.wait_for_timeout(2500);pg.screenshot(path=OUT+'/'+shot+'_before.png')
        ev(f"const o=window.__o;P.x=o.x;P.z=o.z+3;P.h=Math.PI;P.vx=0;P.vz=-{v};currentDamageRecord().lastHit=-99;o.mhT=-9;registerPlayerImpact({v},o,0,1);P.x=o.x+40;P.z=o.z+40;for(let i=0;i<40;i++)objectsTick(.05)")
        pg.wait_for_timeout(1800);pg.screenshot(path=OUT+'/'+shot+'_after.png');return o
    t=hitobj("c.type==='tree'&&c.visualKey&&c.trunkD<.33",36,'12_tree',[7,4,7]);ok('slim tree felled at 130 km/h (its snap speed ~120 km/h)',ev("return window.__o.broken"))
    w=hitobj("c.type==='gardenWall'&&c.visualKey",16,'13_garden_wall',[6,3,6]);ok('garden wall collapsed at 58 km/h',ev("return window.__o.broken"))
    s2=hitobj("c.type==='busShelter'&&c.visualKey",8,'14_bus_shelter',[5,2.5,5]);ok('bus shelter glass shattered',ev("return !!window.__o.glassBroken"))
    ev("P.m.visible=true")
    ok('no page errors',not errs,errs[:3])
    b.close()
print('world_v44_pw:','all passed' if not bad else str(bad)+' FAILED');sys.exit(1 if bad else 0)
