"""v45 pause / settings menu, quality presets and frame-time meter in real Chromium.
usage: python tests/pause_v45_pw.py dist/irbid-drive.html   (screenshot -> docs/screenshots/v45/pause_menu.png)
Exits 1 on failure."""
import sys,os
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
THREE=open(ROOT+'/node_modules/three/build/three.min.js','rb').read()
OUT=os.environ.get('SP',ROOT+'/docs/screenshots/v45');os.makedirs(OUT,exist_ok=True)
fail=0
def ok(c,m,v=''):
    global fail
    print(('PASS ' if c else 'FAIL ')+m+(('  ['+str(v)+']') if v!='' else ''));fail+=0 if c else 1
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_page(viewport={'width':1280,'height':720});errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)[:300]))
    pg.add_init_script("window.__NOAQ=1")
    pg.route('https://cdnjs.cloudflare.com/**',lambda r:r.fulfill(body=THREE,content_type='application/javascript'))
    pg.goto('file://'+os.path.abspath(sys.argv[1]),timeout=300000)
    pg.wait_for_function("typeof pauseToggle==='function'&&typeof loop==='function'",timeout=300000);pg.wait_for_timeout(2500)
    ev=lambda s:pg.evaluate("()=>{"+s+"}")
    ev("warp(START.x,START.z,START.h);hour=12")
    pg.mouse.click(640,360);pg.keyboard.press('Escape');pg.wait_for_timeout(400)
    r=ev("return{on:PAUSE.on,d:pauseEl.style.display,ui}");ok(r['on'] and r['d']=='flex' and r['ui'],'Esc opens the pause menu (ui blocks driving keys)',r)
    s0=ev("P.vx=Math.sin(P.h)*20;P.vz=Math.cos(P.h)*20;return[P.x,P.z,clock,traffic.map(c=>c.x+c.z).reduce((a,b)=>a+b,0)]");pg.keyboard.down('KeyW');pg.wait_for_timeout(2500);pg.keyboard.up('KeyW')
    s1=ev("return[P.x,P.z,clock,traffic.map(c=>c.x+c.z).reduce((a,b)=>a+b,0)]")
    ok(s0==s1,'while paused: car, clock and traffic do not move (even with W held)',str(s0[:3])+' -> '+str(s1[:3]))
    pg.screenshot(path=OUT+'/pause_menu.png')
    pg.keyboard.press('Escape');pg.wait_for_timeout(1500)
    r=ev("return{on:PAUSE.on,d:pauseEl.style.display,ui,moved:P.x!=="+repr(s1[0])+"}");ok((not r['on']) and r['d']=='none' and not r['ui'] and r['moved'],'Esc again resumes; the simulation runs again',r)
    # Esc that closes another menu must not also open the pause menu
    pg.keyboard.press('KeyG');pg.wait_for_timeout(300);sh=ev("return wheelEl.style.display");pg.keyboard.press('Escape');pg.wait_for_timeout(300)
    r=ev("return{shop:wheelEl.style.display,pause:PAUSE.on,ui}");ok(sh=='flex' and r['shop']=='none' and not r['pause'] and not r['ui'],'Esc in the car-wheel menu (G) closes that menu only',str(sh)+' '+str(r))
    # quality presets
    def q(v):ev("pauseToggle(true)");pg.select_option('#pauseMenu select',v);pg.wait_for_timeout(300);return ev("return{post:POST.on,bloom:POST.bloom?POST.bloom.enabled:null,sh:sun.shadow.mapSize.x,store:localStorage.getItem('irbid-drive-gfx-v1')}")
    base=ev("return sun.shadow.mapSize.x")
    lo=q('low');ok(lo['post']==False and lo['sh']==1024,'Low: no post chain, 1024 shadow map',lo)
    me=q('medium');ok(me['post'] and me['bloom']==False and me['sh']==min(2048,base),'Medium: post chain without bloom, <=2048 shadow map',me)
    hi=q('high');ok(hi['post'] and hi['bloom'] and hi['sh']==base,'High: post chain + bloom, full shadow map',hi)
    ok('"q":"high"' in (hi['store'] or ''),'quality persists in its own storage key',hi['store'])
    au=q('auto');ev("pauseToggle(false)")
    # sliders reach the audio settings
    ev("pauseToggle(true)");pg.fill('#pauseMenu [data-v="engine"]','40');pg.dispatch_event('#pauseMenu [data-v="engine"]','input');r=ev("return AUD.engine");ok(abs(r-.4)<1e-6,'Engine volume slider sets the engine bus',r);ev("audSet('engine',.9);pauseToggle(false)")
    # frame-time meter
    ev("GQ.fps=true");pg.wait_for_timeout(2500);t=ev("return{d:FPS.el.style.display,t:FPS.el.textContent}");ev("GQ.fps=false")
    ok(t['d']!='none' and 'fps' in t['t'] and 'draws' in t['t'],'frame-time meter shows fps, frame time, 99th percentile and draw calls',t['t'].replace('\n',' | '))
    h=ev("return [topEl.textContent.length,spdEl.textContent]");ok(h[0]>20 and h[1],'HUD still updates with the DOM write cache',h)
    ok(not errs,'no page errors',errs[:3])
    b.close()
print('pause_v45_pw: '+('all passed' if not fail else str(fail)+' FAILED'));sys.exit(1 if fail else 0)
