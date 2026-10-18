"""v44 visual evidence in real Chromium (SwiftShader): the player car undamaged, after a front crash (bumper torn off, bonnet buckled,
windscreen cracked, lights broken), a left-side hit (doors, mirror, shattered side glass), a rear hit, a flat tyre + bent rim, and after repair.
usage: python tests/damage_v44_pw.py dist/irbid-drive.html   -> docs/screenshots/v44/*.png (OUT env overrides). Prints PASS/FAIL per check."""
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
    pg=b.new_page(viewport={'width':960,'height':540});errs=[];cons=[]
    pg.on('pageerror',lambda e:errs.append(str(e)[:300]));pg.on('console',lambda m:cons.append(m.text) if m.type=='error' else None)
    pg.add_init_script("window.__NOAQ=1");pg.route('https://cdnjs.cloudflare.com/**',lambda r:r.fulfill(body=THREE,content_type='application/javascript'))
    pg.goto('file://'+os.path.abspath(sys.argv[1] if len(sys.argv)>1 else 'dist/irbid-drive.html'),timeout=300000);pg.wait_for_timeout(6000)
    ev=lambda s:pg.evaluate("()=>{"+s+"}")
    ev("""const g=gfxRender;window.__cam=null;gfxRender=function(){if(window.__cam){const c=window.__cam,sh=Math.sin(P.h),ch=Math.cos(P.h),lx=ch,lz=-sh;
          cam.position.set(P.x+sh*c[0]+lx*c[1],P.y+c[2],P.z+ch*c[0]+lz*c[1]);cam.lookAt(P.x+sh*(c[3]||0)+lx*(c[4]||0),P.y+(c[5]===undefined?.55:c[5]),P.z+ch*(c[3]||0)+lz*(c[4]||0))}return g.apply(this,arguments)};
          hour=12;warp(START.x,START.z,START.h);keys.KeyW=0;damageMode=1;cycleDamageMode();repairCurrentCar()""")
    hit="const r=currentDamageRecord();r.lastHit=-99;const sh=Math.sin(P.h),ch=Math.cos(P.h),lx=ch,lz=-sh;"
    def shot(name,cam,wait=2200):
        ev("window.__cam="+repr(cam));pg.wait_for_timeout(wait);pg.screenshot(path=OUT+'/'+name+'.png')
    shot('0_undamaged_front',[4.2,2.4,1.1])
    ev(hit+"registerPlayerImpact(21,{type:'wall',hw:6,hd:.5,c:1,s:0},-sh,-ch)")
    st=ev("const r=currentDamageRecord();return {bf:r.parts.bf,hood:r.parts.hood,cr:r.cracks[0].length,l:r.lights.slice(0,2).join('')}")
    ok('front crash recorded on the front parts only',st['bf']>=1 and st['hood']>.3 and st['cr']==1 and st['l']=='11',st)
    ok('torn-off bumper is a world object on the road',ev("return DP_DEBRIS.length>0&&DP_DEBRIS[0].m.parent===scene"))
    shot('1_front_crash',[4.2,2.4,1.1]);shot('2_windscreen_crack',[2.2,.6,1.9,.2])
    ev("const dd=DP_DEBRIS[0].m.position;window.__cam=null;cam.position.set(dd.x+3,dd.y+2,dd.z+3);cam.lookAt(dd.x,dd.y,dd.z)")
    ev("const g=gfxRender;gfxRender=function(){const dd=DP_DEBRIS[0].m.position;cam.position.set(dd.x+2.5,dd.y+1.6,dd.z+2.5);cam.lookAt(dd.x,dd.y,dd.z);return g.apply(this,arguments)};window.__dbg=1");pg.wait_for_timeout(2500);pg.screenshot(path=OUT+'/3_bumper_on_road.png')
    pg.reload();pg.wait_for_timeout(6000)
    ev("""const g=gfxRender;window.__cam=null;gfxRender=function(){if(window.__cam){const c=window.__cam,sh=Math.sin(P.h),ch=Math.cos(P.h),lx=ch,lz=-sh;
          cam.position.set(P.x+sh*c[0]+lx*c[1],P.y+c[2],P.z+ch*c[0]+lz*c[1]);cam.lookAt(P.x+sh*(c[3]||0)+lx*(c[4]||0),P.y+(c[5]===undefined?.55:c[5]),P.z+ch*(c[3]||0)+lz*(c[4]||0))}return g.apply(this,arguments)};
          hour=12;warp(START.x,START.z,START.h);keys.KeyW=0""")
    ok('damage persists after a page reload (saved record)',ev("const r=currentDamageRecord();return damageMode===2&&r.parts.bf>=1&&r.cracks[0].length===1"))
    ev("repairCurrentCar()");ev(hit+"registerPlayerImpact(14,{type:'vehicle'},-lx,-lz)")
    st=ev("const r=currentDamageRecord();return {dl:r.parts.dl,ml:r.parts.ml,g2:r.glass[2],dr:r.parts.dr}")
    ok('left-side hit: left doors / mirror / windows only',st['dl']>.3 and st['ml']>0 and st['g2']>0 and st['dr']==0,st)
    shot('4_side_hit',[-.6,6.5,2.6])
    ev("repairCurrentCar()");ev(hit+"registerPlayerImpact(12,{type:'wall'},sh,ch)");shot('5_rear_hit',[-4.4,2.2,1.2])
    ev("repairCurrentCar()");ev(hit+"registerPlayerImpact(14,{type:'wall'},-.6*lx-.8*sh,-.6*lz-.8*ch);const r2=currentDamageRecord();r2.wheels[0].punct=true;r2.wheels[0].health=8;refreshDamageVisual()")
    ok('flat FL tyre + bent rim',ev("const r=currentDamageRecord();return r.wheels[0].punct&&r.rims[0]>0"))
    shot('6_flat_tyre_bent_rim',[3.4,3.2,.9,1.3,.8,.35])
    ev("fines=spent+1e6;payRepair(repairItems().map(q=>q.id))")
    ok('repair restores parts and visuals',ev("const r=currentDamageRecord(),D=P.m.userData.dp;return repairItems().length===0&&D.bf.visible&&!D.hood.visible&&!P.m.children.some(c=>c.userData.damageOverlay)"))
    shot('7_repaired',[4.2,2.4,1.1])
    ev("fines=0;spent=0;damageMode=2;cycleDamageMode()")
    ok('no page errors',not errs,errs[:3]);ok('no console errors',not cons,cons[:3])
    b.close()
print('damage_v44_pw:','all passed' if not bad else str(bad)+' FAILED');sys.exit(1 if bad else 0)
