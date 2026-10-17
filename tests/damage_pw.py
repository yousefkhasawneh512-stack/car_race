"""v39 visual check in real Chromium (SwiftShader): Full damage mode, a front-left crash + right-side hit + a punctured tyre,
then close-up screenshots of the car and of the diagnostics panel. usage: python tests/damage_pw.py dist/irbid-drive.html
Writes damage_pw_car.png, damage_pw_side.png, damage_pw_diag.png in the repo root (SP env overrides). Prints PASS/FAIL."""
import sys,os
from playwright.sync_api import sync_playwright
SP=os.environ.get('SP',os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
THREE=open(SP+'/node_modules/three/build/three.min.js','rb').read()
bad=0
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
    # a fixed camera: wrap the renderer call so the loop's own camera update is overridden just before drawing
    ev("""const g=gfxRender;window.__cam=null;gfxRender=function(){if(window.__cam){const c=window.__cam;cam.position.set(P.x+c[0],P.y+c[1],P.z+c[2]);cam.lookAt(P.x,P.y+.6,P.z)}return g.apply(this,arguments)};
          hour=12;warp(START.x,START.z,START.h);keys.KeyW=0""")
    ev("damageMode=1;cycleDamageMode()")   # -> Full
    ok('Full mode active',ev("return damageMode")==2)
    # front-left crash at 60 km/h, a right-side scrape, then a tyre failure on the front-left
    ev("""const r=currentDamageRecord();repairCurrentCar();const sh=Math.sin(P.h),ch=Math.cos(P.h),lx=Math.cos(P.h),lz=-Math.sin(P.h);
          let dx=sh+.45*lx,dz=ch+.45*lz,l=Math.hypot(dx,dz);r.lastHit=-99;registerPlayerImpact(16.7,{type:'wall'},-dx/l,-dz/l);
          r.lastHit=-99;registerPlayerImpact(9,{type:'wall'},lx,lz);r.wheels[0].punct=true;refreshDamageVisual()""")
    st=ev("const r=currentDamageRecord();return {fl:r.zones.fl,r:r.zones.r,dents:r.dents.length,lights:r.lights.join(''),glass:r.glass.map(v=>+v.toFixed(2))}")
    ok('front-left + right-side damage recorded',st['fl']<70 and st['r']<90 and st['dents']>=2,st)
    pg.wait_for_timeout(800)
    # camera ahead-left of the car, looking back at the crushed corner
    ev("const sh=Math.sin(P.h),ch=Math.cos(P.h),lx=Math.cos(P.h),lz=-Math.sin(P.h);window.__cam=[sh*3.4+lx*2.6,.9,ch*3.4+lz*2.6]");pg.wait_for_timeout(2500)
    pg.screenshot(path=SP+'/damage_pw_car.png')
    ev("const sh=Math.sin(P.h),ch=Math.cos(P.h),lx=Math.cos(P.h),lz=-Math.sin(P.h);window.__cam=[-lx*5.2-sh*.6,1.4,-lz*5.2-ch*.6]");pg.wait_for_timeout(2500)
    pg.screenshot(path=SP+'/damage_pw_side.png')
    body=ev("const b=carMeshParts(P.m).body;return {tess:!!b.userData.base,verts:b.geometry.attributes.position.count}")
    ok('player body tessellated and dented',body['tess'] and body['verts']>2000,body)
    ev("window.__cam=null;diagToggle(true)");pg.wait_for_timeout(1200)
    html=ev("return document.getElementById('diagPanel').innerHTML")
    ok('diagnostics panel shows component + tyre report',all(k in html for k in ['Engine','front-left','PUNCTURED','tread','Apex Drift Customs']))
    warn=ev("return document.getElementById('dmgWarn').textContent")
    ok('dashboard warning for the punctured tyre',('TYRE FL PUNCTURED' in warn),repr(warn))
    pg.screenshot(path=SP+'/damage_pw_diag.png')
    # v42 repair bay at Apex Drift Customs: pay for one tyre, then for everything
    ev("diagToggle(false);fines=spent+5000;warp(SHOP.x,SHOP.z,0);openShop()");pg.wait_for_timeout(800)
    rows=ev("return Array.from(document.querySelectorAll('#shop [data-rep]')).map(b=>b.dataset.rep+'|'+b.textContent)")
    ok('repair bay lists priced parts in the shop',any(r.startswith('t:0|Repair') and 'JD' in r for r in rows) and any(r.startswith('*|') for r in rows),rows[:6])
    ok('full inspection (v43) lists every part, OK parts without a charge',ev("return document.querySelectorAll('#repInspect .row').length")==30 and ev("return /OK · no charge/.test(document.getElementById('repInspect').innerHTML)"))
    ev("document.getElementById('repInspect').open=true");pg.wait_for_timeout(300)
    pg.screenshot(path=SP+'/damage_pw_repair.png')
    b0=ev("return fines-spent")
    ev("document.querySelector('#shop [data-rep=\"t:0\"]').click()");pg.wait_for_timeout(400)
    st=ev("const r=currentDamageRecord();return {fl:!r.wheels[0].punct&&r.wheels[0].tread>99.9,tread:r.wheels[0].tread,body:r.zones.fl,bal:fines-spent}")
    ok('clicking Repair on tyre FL fixes only that tyre and charges the balance',st['fl'] and st['body']<70 and st['bal']<b0,st)
    ev("document.querySelector('#shop [data-rep=\"*\"]').click()");pg.wait_for_timeout(400)
    ok('Repair all restores the car',ev("const r=currentDamageRecord();return r.dents.length===0&&r.zones.fl===100&&!r.wheels[0].punct&&repairItems().length===0"))
    ok('repair bay then reports no damage',ev("return /No damage recorded/.test(document.getElementById('shopbody').innerHTML)"))
    ev("closeShop();fines=0;spent=0")
    ev("damageMode=2;cycleDamageMode()")  # back to Off
    ok('no page errors',not errs,errs[:3])
    b.close()
print('damage_pw:','all passed' if not bad else str(bad)+' FAILED');sys.exit(1 if bad else 0)
