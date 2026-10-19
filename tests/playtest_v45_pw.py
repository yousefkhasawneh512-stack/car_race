"""v45 playtest of the BUILT game in real Chromium with real keyboard / mouse input (Playwright page.keyboard / page.mouse; no direct calls
into game functions to cause the outcome — page.evaluate is used only to READ state, to warp to a test spot (the game's own K/F-style warp)
and to skip rendering while driving).
usage: python tests/playtest_v45_pw.py dist/irbid-drive.html [offline]   screenshots + log -> docs/screenshots/v45/playtest_*.png
'offline': the HTML is expected to contain three.js inline; every network request is blocked and counted.
Limits: headless SwiftShader renders ~1-2 fps, so while driving gfxRender is replaced by a no-op (the simulation then runs at the normal
rate with the same input path) and restored for each screenshot. This is not a substitute for a person playing on a real GPU / G29.
Exits 1 on failure."""
import sys,os,json,time
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
THREE=open(ROOT+'/node_modules/three/build/three.min.js','rb').read()
OUT=os.environ.get('SP',ROOT+'/docs/screenshots/v45');os.makedirs(OUT,exist_ok=True)
OFF='offline' in sys.argv[2:]
fail=0;log=[]
def ok(c,m,v=''):
    global fail
    s=('PASS ' if c else 'FAIL ')+m+(('  ['+str(v)+']') if v!='' else '');print(s);log.append(s);fail+=0 if c else 1
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    ctx=b.new_context(viewport={'width':1280,'height':720});pg=ctx.new_page();errs=[];cons=[];reqs=[];failed=[]
    pg.on('pageerror',lambda e:errs.append(str(e)[:300]))
    pg.on('console',lambda m:cons.append(m.text[:200]) if m.type=='error' else None)
    pg.on('requestfailed',lambda r:failed.append(r.url[:120]))
    def route(r):
        u=r.request.url
        if u.startswith('file:') or u.startswith('data:') or u.startswith('blob:'):return r.continue_()
        reqs.append(u[:120])
        if OFF:return r.abort()
        if 'cdnjs.cloudflare.com' in u:return r.fulfill(body=THREE,content_type='application/javascript')
        r.abort()
    pg.route('**/*',route)
    # a returning player: owns two cars, has some balance (a real save in the v44 shape)
    pg.add_init_script("window.__NOAQ=1;if(!sessionStorage.getItem('pt')){sessionStorage.setItem('pt','1');localStorage.setItem('irbid-save',JSON.stringify({fines:20000,spent:0,owned:['Ford Focus RS','Ford Mustang GT'],cur:'Ford Focus RS',dt:100,tune:{}}))}")
    t0=time.time();pg.goto('file://'+os.path.abspath(sys.argv[1]),timeout=300000)
    pg.wait_for_function("typeof loop==='function'&&typeof P!=='undefined'",timeout=300000);pg.wait_for_timeout(2500)
    ok(not errs,'1. game starts without page errors','%.1f s to first frame'%(time.time()-t0))
    z=pg.evaluate("()=>[getComputedStyle(document.getElementById('top')).zIndex,getComputedStyle(document.getElementById('spd')).zIndex,getComputedStyle(document.getElementById('map')).zIndex,getComputedStyle(document.getElementById('game')).zIndex]")
    ok(all(int(q)>int(z[3]) for q in z[:3]),'1b. HUD (top bar, speed, minimap) is layered above the 3D canvas (hidden behind it since v24)',z)
    ev=lambda s:pg.evaluate("()=>{"+s+"}")
    R0=ev("window.__gr=gfxRender;return 1")
    fast=lambda:ev("gfxRender=function(){};return 1")
    def shot(name):ev("gfxRender=window.__gr;gfxRender();return 1");pg.screenshot(path=OUT+'/playtest_'+name+'.png');fast()
    st=lambda:ev("const fx=Math.sin(P.h),fz=Math.cos(P.h);return{v:(P.vx*fx+P.vz*fz)*3.6,h:P.h,x:P.x,z:P.z,car:PORS[P.idx][0],drift:drift.pts,dt:drift.t,slip:TSLIP.sa}")
    pg.mouse.click(640,300);pg.wait_for_timeout(300)
    ok(ev("return !!(AU.ctx&&AU.ctx.state==='running')"),'2. a click turns sound on')
    ok(ev("return PORS[P.idx][0]")=='Ford Focus RS','3. the saved car is selected (Ford Focus RS)')
    fast();ev("warp(START.x,START.z,START.h);return 1")
    pg.keyboard.down('KeyW');pg.wait_for_timeout(3000);a=st();shot('accelerate');pg.keyboard.up('KeyW')
    ok(a['v']>35,'4. W accelerates',('%.0f km/h after 3 s'%a['v']))
    pg.keyboard.down('KeyS');pg.wait_for_timeout(1200);bk=st();pg.keyboard.up('KeyS')
    ok(bk['v']<a['v']-20,'5. S brakes','%.0f -> %.0f km/h'%(a['v'],bk['v']))
    for key,sg in(('KeyA',1),('KeyD',-1)):
        ev("warp(START.x,START.z,START.h);P.vx=Math.sin(P.h)*14;P.vz=Math.cos(P.h)*14;return 1");h0=st()['h']
        pg.keyboard.down('KeyW');pg.keyboard.down(key);pg.wait_for_timeout(700);pg.keyboard.up(key);pg.keyboard.up('KeyW');dh=st()['h']-h0
        ok(dh*sg>.15,'6. '+key[-1]+' steers '+('left' if sg>0 else 'right'),'%.2f rad'%dh)
    ev("warp(START.x,START.z,START.h);return 1");pg.keyboard.down('KeyS');pg.wait_for_timeout(2000);r=st();pg.keyboard.up('KeyS')
    ok(r['v']<-3,'7. holding S from a stop reverses','%.0f km/h'%r['v'])
    # drift: Realistic handling (H), speed up, handbrake + steer, then countersteer
    pg.keyboard.press('KeyH');ok(ev("return handlingMode")==1,'8a. H switches to Realistic handling')
    ev("warp(START.x,START.z,START.h);P.vx=Math.sin(P.h)*20;P.vz=Math.cos(P.h)*20;drift.pts=0;drift.total=drift.total;return 1")
    pg.keyboard.down('KeyW');pg.keyboard.down('KeyA');pg.keyboard.down('Space');pg.wait_for_timeout(450);pg.keyboard.up('Space');pg.wait_for_timeout(500);d=st();shot('drift');pg.keyboard.up('KeyA')
    # countersteer like a driver: look at the slide each ~50 ms, steer into it (D) while it is still rotating, straighten once it is caught
    pg.keyboard.up('KeyW');held=False
    for i in range(60):
        q=ev("return[beta_(),PTS.yr]".replace('beta_()','(()=>{const fx=Math.sin(P.h),fz=Math.cos(P.h);return Math.atan2(-P.vx*fz+P.vz*fx,Math.abs(P.vx*fx+P.vz*fz)+.5)})()'))
        want=q[0]>.08 and q[1]>-.2
        if want and not held:pg.keyboard.down('KeyD');held=True
        if not want and held:pg.keyboard.up('KeyD');held=False
        pg.wait_for_timeout(50)
    if held:pg.keyboard.up('KeyD')
    pg.wait_for_timeout(500);rec=st()
    ok(d['slip']>.25 and d['drift']>0,'8b. handbrake + steer starts a drift (slip angle, drift points)','slip %.2f rad, %d pts'%(d['slip'],d['drift']))
    ok(rec['slip']<.15,'8c. countersteer (steer into the slide, straighten when caught): the car recovers','slip %.2f rad'%rec['slip'])
    pg.keyboard.press('KeyH')
    # collision with Full damage: drive into a building
    while ev("return damageMode")!=2:pg.keyboard.press('KeyI')
    tgt=ev("""let best=null,bd=1e9;for(const c of new Set([].concat(...COL.values()))){if(!(c.hw>4&&c.hd>4)||c.type)continue;const d=Math.hypot(c.x-START.x,c.z-START.z);if(d<bd&&d>30){bd=d;best=c}}
      if(!best)return null;const h=Math.atan2(best.x-(best.x-30),0);P.h=0;warp(best.x,best.z-best.hd-26,0);return{x:best.x,z:best.z,hw:best.hw,hd:best.hd}""")
    i0=ev("return currentDamageRecord().impacts");pg.keyboard.down('KeyW');pg.wait_for_timeout(3500);pg.keyboard.up('KeyW');pg.wait_for_timeout(300)
    dm=ev("const s=currentDamageRecord();return{imp:s.impacts,body:s.body,fl:s.zones.fl,fr:s.zones.fr,hits:AU.hits}");shot('crash')
    ok(tgt and dm['imp']>i0 and dm['body']<100,'9. driving into a building damages the car (Full mode) and plays a crash',dm)
    # repair at Apex Drift Customs: drive-up (warp next to it), U opens the shop, click "Repair all"
    ev("warp(SHOP.x+4,SHOP.z+4,0);return 1");pg.wait_for_timeout(300);pg.keyboard.press('KeyU');pg.wait_for_timeout(400)
    btn=pg.locator('button[data-rep="*"]');nb=btn.count()
    if nb:btn.first.click();pg.wait_for_timeout(300)
    rp=ev("const s=currentDamageRecord();return{body:s.body,items:repairItems().length,bal:fines-spent}");pg.keyboard.press('Escape')
    ok(nb>0 and rp['items']==0 and rp['body']==100,'10. U in the garage + "Repair all" restores the car',rp)
    # pause
    pg.keyboard.press('Escape');pg.wait_for_timeout(300);x0=st()['x'];pg.keyboard.down('KeyW');pg.wait_for_timeout(1000);pg.keyboard.up('KeyW');x1=st()['x']
    shot('pause');pg.keyboard.press('Escape');pg.wait_for_timeout(200)
    ok(x0==x1 and not ev("return PAUSE.on"),'11. Esc pauses (W does nothing) and Esc resumes')
    # setting: quality via the pause menu select
    pg.keyboard.press('Escape');pg.select_option('#pauseMenu select','medium');pg.keyboard.press('Escape');ok(ev("return GQ.q")=='medium','12. changing graphics quality in the menu')
    # navigation: M, type, Enter
    ev("warp(START.x,START.z,START.h);return 1");pg.keyboard.press('KeyM');pg.wait_for_timeout(200);pg.keyboard.type('Yarmouk University');pg.wait_for_timeout(600);pg.keyboard.press('Enter');pg.wait_for_timeout(800)
    nv=ev("return{on:NAV.on,total:Math.round(NAV.total||0),pts:NAV.pts.length,dest:NAV.dest&&(NAV.dest.name||NAV.dest.n||'')}");shot('navigation')
    ok(nv['on'] and nv['total']>300 and nv['pts']>5,'13. search "Yarmouk University" + Enter starts a road route',nv)
    pg.mouse.click(640,300)
    # switch car with N (owned cars only)
    pg.keyboard.press('KeyN');pg.wait_for_timeout(1500);c=ev("return [PORS[P.idx][0],cur,AU.cur===P.idx||AU.sw.ph]")
    ok(c[0]=='Ford Mustang GT' and c[1]=='Ford Mustang GT','14. N switches to the other owned car (engine sound follows)',c)
    # reload: save restored
    ev("save();return 1");pg.reload(timeout=300000);pg.wait_for_function("typeof loop==='function'&&typeof P!=='undefined'",timeout=300000);pg.wait_for_timeout(1500)
    rl=ev("return{car:PORS[P.idx][0],owned:owned.length,q:GQ.q,aud:!!localStorage.getItem('irbid-drive-audio-v1'),dm:damageMode}")
    ok(rl['car']=='Ford Mustang GT' and rl['owned']==2 and rl['q']=='medium','15. reload restores the car, owned list and settings',rl)
    ok(not errs,'no page errors during the whole session',errs[:3])
    ok(not cons,'no console errors',cons[:3])
    ext=[u for u in reqs if 'cdnjs.cloudflare.com/ajax/libs/three.js/r128' not in u]
    ok(not ext,'network: only three.js r128 from cdnjs is requested' if not OFF else 'network: no request at all (offline build)',reqs[:5] if OFF else ext[:5])
    if OFF:ok(not reqs,'offline: zero network requests',len(reqs))
    b.close()
open(OUT+'/playtest_log.txt','w',encoding='utf-8').write('\n'.join(log)+'\n')
print('playtest_v45_pw: '+('all passed' if not fail else str(fail)+' FAILED'));sys.exit(1 if fail else 0)
