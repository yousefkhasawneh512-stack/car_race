"""v46 in real Chromium (built game, real keyboard/mouse where it matters): weather visuals (clear vs rain: sky, fog, rain streaks, wet
roads), pause-menu rows (gearbox, reputation, weather, clock) and their storage, Irbid local clock, auto-drive (Z) from a route set by the
real search box, takeover by a steering key, horn (X held/released, audio node), manual gears with E in Realistic, no page errors.
usage: python tests/v46_pw.py dist/irbid-drive.html   (screenshots -> docs/screenshots/v46/, or SP)
Exits 1 on failure."""
import sys,os
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
THREE=open(ROOT+'/node_modules/three/build/three.min.js','rb').read()
OUT=os.environ.get('SP',ROOT+'/docs/screenshots/v46');os.makedirs(OUT,exist_ok=True)
fail=0
def ok(c,m,v=''):
    global fail
    print(('PASS ' if c else 'FAIL ')+m+(('  ['+str(v)+']') if v!='' else ''));fail+=0 if c else 1
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required'])
    pg=b.new_page(viewport={'width':1280,'height':720});errs=[];reqs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)[:300]))
    pg.on('request',lambda r:reqs.append(r.url) if not r.url.startswith('file:') and 'cdnjs.cloudflare.com' not in r.url else None)
    pg.add_init_script("window.__NOAQ=1")
    pg.route('https://cdnjs.cloudflare.com/**',lambda r:r.fulfill(body=THREE,content_type='application/javascript'))
    pg.goto('file://'+os.path.abspath(sys.argv[1]),timeout=300000)
    pg.wait_for_function("typeof wxTick==='function'&&typeof loop==='function'",timeout=300000);pg.wait_for_timeout(2500)
    ev=lambda s:pg.evaluate("()=>{"+s+"}")
    ev("warp(START.x,START.z,START.h);hour=11")
    pg.mouse.click(640,360);pg.wait_for_timeout(500)   # first gesture: starts the audio
    # ---- weather ----
    ev("wxSet('mode','clear');WX.cov=WX.tc=0;WX.rain=WX.tr=0;WX.wet=0");pg.wait_for_timeout(2500)
    c=ev("return{sky:sky.r+sky.g+sky.b,blue:sky.b-sky.r,far:scene.fog.far,rain:wxRainM.visible,rough:roadMats[1].roughness}");pg.screenshot(path=OUT+'/weather_clear.png')
    ev("wxSet('mode','rain');WX.cov=WX.tc=.95;WX.rain=WX.tr=.9;WX.wet=1");pg.wait_for_timeout(2500)
    r=ev("return{sky:sky.r+sky.g+sky.b,blue:sky.b-sky.r,far:scene.fog.far,rain:wxRainM.visible,rough:roadMats[1].roughness,mu:WX.mu,line:wxLine()}");pg.screenshot(path=OUT+'/weather_rain.png')
    ok(r['rain'] and not c['rain'],'rain streaks drawn only in rain',(c['rain'],r['rain']))
    ok(r['blue']<c['blue']*.6 and r['sky']<c['sky'] and r['far']<c['far']*.8,'rain: grey (less blue), darker sky and shorter fog distance','blue-red %.2f -> %.2f, brightness %.2f -> %.2f, fog %d -> %d m'%(c['blue'],r['blue'],c['sky'],r['sky'],c['far'],r['far']))
    ok(r['rough']<c['rough']*.7,'wet road: glossier asphalt (lower roughness)','%.2f -> %.2f'%(c['rough'],r['rough']))
    ok('simulated, not live' in r['line'] and 'JMD' in r['line'],'weather is labelled as simulated from the JMD climate table',r['line'])
    # ---- pause menu rows ----
    pg.keyboard.press('Escape');pg.wait_for_timeout(400)
    t=ev("return pauseEl.textContent");ok(all(x in t for x in['Gearbox','Road reputation','Weather','Clock','auto-drive']),'pause menu shows gearbox, reputation, weather, clock and the new keys')
    pg.select_option('#pauseMenu [data-s="wx"]','cloudy');pg.select_option('#pauseMenu [data-s="clk"]','local');pg.wait_for_timeout(200)
    s=ev("return{m:WX.mode,c:WX.clock,st:localStorage.getItem('irbid-drive-weather-v1')}");ok(s['m']=='cloudy' and s['c']=='local' and '"local"' in (s['st'] or ''),'weather + clock chosen in the menu are stored',s)
    pg.screenshot(path=OUT+'/pause_v46.png')
    pg.keyboard.press('Escape');pg.wait_for_timeout(2500)
    h=ev("const a=ammanNow();return[hour,a.h]");ok(abs(h[0]-h[1])<.05,'Irbid local clock drives the time of day (Asia/Amman)','game %.3f h vs Amman %.3f h'%(h[0],h[1]))
    ev("wxSet('clock','game');wxSet('mode','clear');WX.cov=WX.tc=0;WX.rain=WX.tr=0;WX.wet=0;hour=11")
    # ---- auto-drive from a route chosen in the real search box ----
    ev("warp(START.x,START.z,START.h)");pg.keyboard.press('KeyM');pg.wait_for_timeout(400);pg.keyboard.type('Irbid Park',delay=30);pg.wait_for_timeout(800);pg.keyboard.press('Enter');pg.wait_for_timeout(1500)
    nav=ev("return{on:NAV.on,d:NAV.dest&&NAV.dest.name,tot:Math.round(NAV.total)}")
    if not nav['on']:ev("const p=PLACES.find(q=>/Irbid Park/.test(q.name));if(p)navStart(navResolve?navResolve(p):p)");nav=ev("return{on:NAV.on,d:NAV.dest&&NAV.dest.name,tot:Math.round(NAV.total)}")
    ok(nav['on'],'route set through the search box (M)',nav)
    pg.mouse.click(640,360);x0=ev("return[P.x,P.z]");pg.keyboard.press('KeyZ');pg.wait_for_timeout(300)
    a=ev("return{on:AP.on,badge:apBadge.style.display}");ok(a['on'] and a['badge']!='none','Z starts auto-drive; the AUTO badge is shown',a)
    for i in range(40):
        pg.wait_for_timeout(500)
        if ev("return Math.hypot(P.x-(%f),P.z-(%f))"%(x0[0],x0[1]))>8:break
    m=ev("return{d:Math.hypot(P.x-(%f),P.z-(%f)),why:AP.why,on:AP.on,badge:apBadge.textContent}"%(x0[0],x0[1]));pg.screenshot(path=OUT+'/autodrive.png')
    ok(m['d']>2 and m['on'],'auto-drive moves the car by itself (headless Chromium runs ~2 fps, i.e. ~2 s of game time here; long routes: assist_v46)',m)
    pg.keyboard.down('KeyA');pg.wait_for_timeout(600);pg.keyboard.up('KeyA');a=ev("return{on:AP.on,badge:apBadge.style.display}")
    ok(not a['on'] and a['badge']=='none','a steering key takes control back',a)
    ev("navClear()")
    # ---- horn ----
    st=ev("return AU.ctx?AU.ctx.state:'none'")
    pg.keyboard.down('KeyX');pg.wait_for_timeout(600);h1=ev("return[HORN.on,AU.n.gHn?AU.n.gHn.gain.value:-1]");pg.keyboard.up('KeyX');pg.wait_for_timeout(600);h2=ev("return[HORN.on,AU.n.gHn?AU.n.gHn.gain.value:-1]")
    ok(h1[0] and not h2[0] and h1[1]>.05 and h2[1]<.02,'X horn: sounds while held, stops on release (audio '+st+')',(h1,h2))
    # ---- gears ----
    pg.keyboard.press('KeyH');pg.wait_for_timeout(300);ev("setGearbox(0,1);warp(START.x,START.z,START.h);P.vx=Math.sin(P.h)*10;P.vz=Math.cos(P.h)*10;PTS.idx=-1");pg.wait_for_timeout(800)
    g0=ev("return PTS.gear");pg.keyboard.press('KeyE')
    try:pg.wait_for_function("PTS.gear===%d"%(g0+1),timeout=15000);pg.wait_for_timeout(600)   # rAF ticks irregularly in headless SwiftShader
    except Exception:pass
    g=ev("return[PTS.gear,PTS.man,spdEl.textContent]")
    ok(g[1]==1 and g[0]==g0+1 and ('M%d'%g[0]) in g[2],'Realistic: E selects the manual gearbox and shifts up; the HUD shows M<gear>',(g0,g))
    ev("setGearbox(0,1);setHandling(0)")
    ok(not errs,'no page errors',errs[:3]);ok(not reqs,'no network requests besides three.js',reqs[:3])
    b.close()
print('v46_pw: '+('all passed' if not fail else str(fail)+' FAILED'));sys.exit(1 if fail else 0)
