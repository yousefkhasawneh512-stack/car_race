import sys
from playwright.sync_api import sync_playwright
SP='/tmp/claude-0/-home-claude/7976de04-c6f1-5f2c-9216-6abb7f58f2b5/scratchpad'
THREE=open(SP+'/node_modules/three/build/three.min.js','rb').read()
F='file://'+SP+'/'+(sys.argv[1] if len(sys.argv)>1 else 'new.html')
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox','--enable-webgl'])
    ctx=b.new_context(viewport={'width':844,'height':390},device_scale_factor=3,has_touch=True,is_mobile=True,user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1')
    pg=ctx.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:200]))
    pg.add_init_script("window.__NOAQ=1");pg.route('https://cdnjs.cloudflare.com/**',lambda r:r.fulfill(body=THREE,content_type='application/javascript'))
    pg.goto(F);pg.wait_for_timeout(5000)
    cdp=ctx.new_cdp_session(pg)
    r=pg.evaluate("()=>{const r=document.getElementById('game').getBoundingClientRect();return[r.left,r.top,r.width,r.height]}")
    print('canvas css rect',[round(v,1) for v in r],'dpr',pg.evaluate("devicePixelRatio"),'touchAction',pg.evaluate("getComputedStyle(document.getElementById('game')).touchAction"),'armed',pg.evaluate("iOSBypassEngine.armed"))
    def pt(gx,gy,i): return {'x':r[0]+gx/1920*r[2],'y':r[1]+gy/1080*r[3],'id':i}
    st="()=>({m:MobilePCInputController.sig(),spd:Math.round(Math.hypot(P.vx,P.vz)*3.6),h:+P.h.toFixed(2)})"
    pg.evaluate("()=>{warp(START.x,START.z,START.h)}");pg.wait_for_timeout(800)
    print('idle',pg.evaluate(st))
    # multitouch: GAS (1700,900) + LEFT (200,900)
    cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[pt(1700,900,1),pt(200,900,2)]});pg.wait_for_timeout(300)
    print('gas+left',pg.evaluate(st));pg.wait_for_timeout(4000)
    print('after 4s',pg.evaluate(st))
    pg.screenshot(path=SP+'/ios_pads.png',timeout=90000)
    # lift left finger only: touchMove with remaining point? use touchEnd for one point
    cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[pt(1700,900,1),pt(600,900,2)]});pg.wait_for_timeout(300);print('gas+right',pg.evaluate(st))
    cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[pt(1700,900,1),pt(1700,560,3)]});pg.wait_for_timeout(300);print('gas+drift pad',pg.evaluate(st))
    cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});pg.wait_for_timeout(300);print('released',pg.evaluate(st))
    cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[pt(1350,900,1)]});pg.wait_for_timeout(300);print('brake',pg.evaluate(st))
    cdp.send('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]});pg.wait_for_timeout(300);print('cancel ->',pg.evaluate(st))
    print('scrollY',pg.evaluate("[scrollX,scrollY,document.body.scrollHeight>innerHeight]"),'errs',errs);b.close()
