"""Cross-browser smoke test (v47): the built game in Chromium, Firefox and WebKit (Safari's engine), desktop and phone/tablet emulation.
Per run: the game boots (loop running, loading screen gone), no page errors, the simulation advances, the car drives with the real keyboard
(desktop) or the on-screen GAS pad via real touch events (phone/tablet), the pause menu opens, and a screenshot is saved.
These are Playwright's browser builds on Windows, NOT real Safari / iPhone / Android devices: they show engine-level compatibility only.
usage: python tests/xbrowser_pw.py dist/irbid-drive.html [chromium firefox webkit]   (screenshots -> docs/screenshots/v47/, or SP)
Exits 1 on failure."""
import sys,os,json
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
THREE=open(ROOT+'/node_modules/three/build/three.min.js','rb').read()
OUT=os.environ.get('SP',ROOT+'/docs/screenshots/v47');os.makedirs(OUT,exist_ok=True)
URL='file://'+os.path.abspath(sys.argv[1]).replace('\\','/')
if not URL.startswith('file:///'):URL=URL.replace('file://','file:///')
ENG=[a for a in sys.argv[2:] if a in('chromium','firefox','webkit')] or ['chromium','firefox','webkit']
ONLY=[a for a in sys.argv[2:] if a not in('chromium','firefox','webkit')]
fail=0;res=[]
def ok(c,m,v=''):
    global fail
    print(('PASS ' if c else 'FAIL ')+m+(('  ['+str(v)+']') if v!='' else ''),flush=True);fail+=0 if c else 1;return c
with sync_playwright() as p:
    for eng in ENG:
        bt=getattr(p,eng)
        args={'chromium':['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']}.get(eng,[])
        cases=[('desktop',dict(viewport={'width':1280,'height':720}))]
        if eng=='webkit':cases.append(('iphone',dict(p.devices['iPhone 13 landscape'])));cases.append(('iphone_portrait',dict(p.devices['iPhone 13'])));cases.append(('ipad',dict(p.devices['iPad (gen 7) landscape'])))
        if eng=='chromium':cases.append(('android',dict(p.devices['Pixel 7'])))
        for name,ctxa in cases:
            tag=eng+'/'+name
            if ONLY and name not in ONLY:continue
            # a fresh browser per case: Playwright's WebKit lost its software-GL context on the 4th page in one process (never restored)
            try:b=bt.launch(args=args) if args else bt.launch()
            except Exception as e:ok(False,tag+': browser launches',str(e)[:120]);continue
            ctx=b.new_context(**ctxa);pg=ctx.new_page();errs=[]
            pg.on('pageerror',lambda e:errs.append(str(e)[:200]))
            pg.add_init_script("window.__NOAQ=1")
            pg.route('https://cdnjs.cloudflare.com/**',lambda r:r.fulfill(body=THREE,content_type='application/javascript'))
            try:
                pg.goto(URL,timeout=600000)
                pg.wait_for_function("typeof loop==='function'&&typeof platLine==='function'",timeout=600000)
            except Exception as e:
                ok(False,tag+': game boots',str(e)[:160]+' errors '+str(errs[:2]));ctx.close();continue
            pg.wait_for_timeout(3000)
            ev=lambda s:pg.evaluate("()=>{"+s+"}")
            st=ev("return{boot:!!document.getElementById('boot'),gl:!!(ren.getContext&&ren.getContext()),nogl:!!document.getElementById('nogl'),c:clock,plat:platLine()}")
            ok(not st['boot'] and st['gl'] and not st['nogl'],tag+': game boots (WebGL context, loading screen gone)',st['plat'])
            ev("warp(START.x,START.z,START.h);P.vx=P.vz=0;hour=11")
            c0=ev("return clock");x0=ev("return[P.x,P.z]");hold=False
            def hold_until(sec):
                # headless software GL runs a few fps and the loop clamps dt, so wait for GAME time, not wall-clock time
                c_=ev("return clock")
                for _ in range(120):
                    pg.wait_for_timeout(500)
                    if ev("return clock")-c_>=sec:break
            if name=='iphone_portrait':
                h=ev("const e=document.getElementById('rotHint');return{d:getComputedStyle(e).display,t:e.textContent}")
                ok(h['d']=='block' and 'sideways' in h['t'],tag+': portrait phone shows the turn-sideways hint',h['t'])
                pg.screenshot(path=OUT+'/xb_'+eng+'_'+name+'.png');ok(not errs,tag+': no page errors',errs[:2]);res.append(tag);ctx.close();b.close();continue
            if name=='desktop':
                h=ev("return getComputedStyle(document.getElementById('rotHint')).display");ok(h=='none',tag+': no turn-sideways hint on desktop',h)
                pg.mouse.click(640,360);pg.keyboard.down('KeyW');hold_until(3);pg.keyboard.up('KeyW')
            else:
                # GAS pad = canvas coordinates x>1500, y>700 (10b_ios_touch). Held for 4 s with script TouchEvents where the engine allows
                # constructing Touch (Chromium); WebKit forbids that ("Illegal constructor"), so there a real Playwright tap is used and a
                # listener registered after the game's own records whether the pad engaged and released.
                hold=ev("try{new Touch({identifier:1,target:document.body,clientX:0,clientY:0});return true}catch(e){return false}")
                ev("const c=document.getElementById('game');window.__gas=[];for(const k of['touchstart','touchend'])c.addEventListener(k,()=>window.__gas.push(k+':'+MobilePCInputController.isAccelerating))")
                box=ev("const r=document.getElementById('game').getBoundingClientRect();return[r.left,r.top,r.width,r.height]")
                gx,gy=box[0]+1700/1920*box[2],box[1]+900/1080*box[3]
                if hold:
                    pg.evaluate("([x,y])=>{const c=document.getElementById('game'),t=new Touch({identifier:7,target:c,clientX:x,clientY:y,pageX:x,pageY:y});c.dispatchEvent(new TouchEvent('touchstart',{touches:[t],targetTouches:[t],changedTouches:[t],bubbles:true,cancelable:true}));window.__tt=t}",[gx,gy])
                    hold_until(3)
                    pg.evaluate("()=>{const c=document.getElementById('game'),t=window.__tt;c.dispatchEvent(new TouchEvent('touchend',{touches:[],targetTouches:[],changedTouches:[t],bubbles:true,cancelable:true}))}")
                else:
                    # WebKit's mobile emulation on Windows reports touch coordinates scaled (0.8 seen on iPhone 13); measure it with a probe tap
                    # on the sky (no pad there) and tap the compensated point, so the GAME sees a touch inside the GAS pad
                    ev("window.__pr=null;addEventListener('touchstart',e=>{if(!window.__pr)window.__pr=[e.touches[0].clientX,e.touches[0].clientY]},{capture:true,once:true})")
                    px,py=box[0]+box[2]*.5,box[1]+box[3]*.2;pg.touchscreen.tap(px,py);pg.wait_for_timeout(300);pr=ev("return window.__pr")
                    kx,ky=(pr[0]/px,pr[1]/py) if pr else (1,1);ev("window.__gas=[]")
                    pg.touchscreen.tap(gx/kx,gy/ky);pg.wait_for_timeout(500);print('     touch coordinate scale seen by the page: %.3f, %.3f'%(kx,ky))
                g=ev("return window.__gas")
                ok('touchstart:true' in g and g[-1]=='touchend:false',tag+': real touch on the GAS pad engages and releases the throttle',g)
            c1=ev("return clock");d=ev("return Math.hypot(P.x-(%f),P.z-(%f))"%(x0[0],x0[1]))
            ok(c1>c0,tag+': simulation advances','clock +%.2f s'%(c1-c0))
            if name=='desktop' or hold:ok(d>1,tag+': the car drives ('+('keyboard W' if name=='desktop' else 'GAS pad held 4 s')+')','%.1f m'%d)
            pg.screenshot(path=OUT+'/xb_'+eng+'_'+name+'.png')
            if name=='desktop':
                pg.keyboard.press('Escape');pg.wait_for_timeout(500);ok(ev("return PAUSE.on&&pauseEl.style.display==='flex'"),tag+': pause menu opens (Esc)');pg.keyboard.press('Escape')
            ok(not errs,tag+': no page errors',errs[:2]);res.append(tag)
            ctx.close();b.close()
print('xbrowser_pw: '+('all passed' if not fail else str(fail)+' FAILED')+' ('+', '.join(res)+')');sys.exit(1 if fail else 0)
