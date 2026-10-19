"""v45 audio in real Chromium (Web Audio; headless output is measured with an AnalyserNode tapped after the compressor, nothing is heard).
usage: python tests/audio_v45_pw.py dist/irbid-drive.html
Checks: no AudioContext before a user gesture + the hint is shown; a real click starts it; engine sound present while driving and its pitch follows
rpm; mute (L) silences everything, unmute restores; engine slider at 0 silences only the engine bus; node count does not grow while driving;
switching car swaps the voice (shutdown -> crank -> idle) without errors; impacts create one-shot sources that are released; pause suspends.
Exits 1 on failure."""
import sys,os,json
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
THREE=open(ROOT+'/node_modules/three/build/three.min.js','rb').read()
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
    pg.wait_for_function("typeof audTick==='function'&&typeof loop==='function'",timeout=300000);pg.wait_for_timeout(2000)
    ev=lambda s:pg.evaluate("()=>{"+s+"}")
    r=ev("return{ctx:!!AU.ctx,hint:getComputedStyle(audHint).display!=='none',txt:audHint.textContent}")
    ok(not r['ctx'] and r['hint'],'no AudioContext before a user gesture; the hint is visible',r['txt'])
    pg.mouse.click(640,360);pg.wait_for_timeout(800)
    r=ev("return{st:AU.ctx&&AU.ctx.state,hint:getComputedStyle(audHint).display}")
    ok(r['st']=='running' and r['hint']=='none','a real click starts audio and hides the hint',r)
    # tap the output
    ev("const a=AU.ctx.createAnalyser();a.fftSize=2048;AU.n.comp.connect(a);window.__an=a;window.__rms=()=>{const d=new Float32Array(a.fftSize);a.getFloatTimeDomainData(d);let s=0;for(const x of d)s+=x*x;return Math.sqrt(s/d.length)};"
       "window.__eng=AU.ctx.createAnalyser();window.__eng.fftSize=2048;AU.n.eng.connect(window.__eng);window.__erms=()=>{const d=new Float32Array(2048);window.__eng.getFloatTimeDomainData(d);let s=0;for(const x of d)s+=x*x;return Math.sqrt(s/d.length)}")
    # hold the throttle via the real game input (keys), car on the start straight
    ev("warp(START.x,START.z,START.h);hour=12");pg.keyboard.down('KeyW');pg.wait_for_timeout(2500)
    r=ev("return{rms:__rms(),erms:__erms(),f:AU.n.oA.frequency.value,rpm:(handlingMode?PTS.rpm:AU.ag.rpm),gear:(handlingMode?PTS.gear:AU.ag.gear),v:Math.hypot(P.vx,P.vz)*3.6,nodes:AU.nodes,eng:engProfile(P.idx).code}")
    ok(r['erms']>0.01,'engine bus is producing sound while accelerating',r)
    ok(abs(r['f']-r['rpm']/120)<max(3,r['rpm']/120*.15),'engine oscillator pitch = rpm/120 (one 720-degree cycle)','%.1f Hz vs rpm %d'%(r['f'],r['rpm']))
    n0=r['nodes'];pg.wait_for_timeout(2500);n1=ev("return AU.nodes")
    ok(n1==n0,'no persistent nodes created while driving',str(n0)+' -> '+str(n1))
    pg.keyboard.up('KeyW')
    pg.keyboard.press('KeyL');pg.wait_for_timeout(600);r=ev("return{rms:__rms(),mute:AUD.mute,g:AU.n.master.gain.value}")
    ok(r['mute'] and r['rms']<1e-3,'L mutes every channel (master output silent)',r)
    pg.keyboard.press('KeyL');pg.wait_for_timeout(600);r=ev("return{rms:__rms(),mute:AUD.mute}")
    ok((not r['mute']) and r['rms']>1e-3,'L again restores sound',r)
    ev("audSet('engine',0)");pg.wait_for_timeout(500);r=ev("return{e:__erms(),all:__rms()}");ev("audSet('engine',.9)")
    ok(r['e']<1e-3,'engine volume 0 silences the engine bus',r)
    saved=ev("return localStorage.getItem('irbid-drive-audio-v1')");ok(saved and '"engine":0.9' in saved,'audio settings persist in their own storage key',saved)
    # car switch: shutdown -> crank -> idle with a new wave
    c0=ev("return [AU.cur,engProfile(AU.cur).code]");ev("setPlayerCar(PORS.findIndex(m=>m[0]==='Ford Mustang GT'))");pg.wait_for_timeout(200);ph=ev("return AU.sw.ph");pg.wait_for_timeout(2200)
    c1=ev("return [AU.cur,engProfile(AU.cur).code,AU.sw.ph,P.idx]")
    ok(ph=='stop' and c1[0]==c1[3] and c1[0]!=c0[0] and c1[2] in('run','start'),'car switch: old engine shuts down, the new car cranks and idles',str(c0)+' -> '+str(c1))
    # impacts: one-shot sources, rate limited
    h0=ev("return AU.hits");ev("for(let i=0;i<5;i++)audHit('crash',.8)");pg.wait_for_timeout(1500);h1=ev("return AU.hits")
    ok(h1-h0==1,'impact sounds are rate-limited (5 calls in the same instant -> 1 sound)',h1-h0)
    ev("registerPlayerImpact(15,{type:'wall'},1,0)");pg.wait_for_timeout(200);ok(ev("return AU.hits")>h1,'a collision through registerPlayerImpact plays a crash')
    if ev("return typeof pauseToggle==='function'"):
        ev("pauseToggle(true)");pg.wait_for_timeout(600);st=ev("return AU.ctx.state");ev("pauseToggle(false)");pg.wait_for_timeout(600);st2=ev("return AU.ctx.state")
        ok(st=='suspended' and st2=='running','pause suspends audio, resume restarts it',st+' / '+st2)
    ok(not errs,'no page errors',errs[:3])
    b.close()
print('audio_v45_pw: '+('all passed' if not fail else str(fail)+' FAILED'));sys.exit(1 if fail else 0)
