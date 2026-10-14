import os
import sys
from playwright.sync_api import sync_playwright
SP=os.environ.get('SP',os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # repo root: node_modules/three + screenshots
THREE=open(SP+'/node_modules/three/build/three.min.js','rb').read()
F='file://'+SP+'/'+(sys.argv[1] if len(sys.argv)>1 else 'new.html')
def run(b,mobile):
    ctx=b.new_context(viewport={'width':960,'height':540},has_touch=mobile,is_mobile=mobile)
    pg=ctx.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:200]))
    pg.add_init_script("window.__NOAQ=1");pg.route('https://cdnjs.cloudflare.com/**',lambda r:r.fulfill(body=THREE,content_type='application/javascript'))
    pg.goto(F);pg.wait_for_timeout(5000)
    st="()=>({mobile:TuningShopInterface.isMobileDevice(),overlay:!!document.getElementById('hud2d'),shop:document.getElementById('shop').style.display,ui:ui})"
    print('MOBILE' if mobile else 'PC',pg.evaluate(st))
    pg.evaluate("()=>{warp(SHOP.x+6,SHOP.z,0)}");pg.wait_for_timeout(1500)
    if mobile:
        r=pg.evaluate("()=>{const r=document.getElementById('game').getBoundingClientRect();return[r.left,r.top,r.width,r.height]}")
        x=r[0]+(960/1920)*r[2];y=r[1]+(60/1080)*r[3]
        pg.screenshot(path=SP+'/m_closed.png',timeout=90000)
        pg.touchscreen.tap(x,y);pg.wait_for_timeout(1500);print(' after tap',pg.evaluate(st))
        pg.screenshot(path=SP+'/m_open.png',timeout=90000)
        pg.touchscreen.tap(x,y);pg.wait_for_timeout(1500);print(' after 2nd tap',pg.evaluate(st))
        pg.evaluate("()=>{warp(START.x,START.z,START.h)}");pg.wait_for_timeout(1200);pg.touchscreen.tap(x,y);pg.wait_for_timeout(800);print(' far tap',pg.evaluate(st),pg.evaluate("()=>document.getElementById('toast').textContent"))
    else:
        for k in['p','p','u','Escape']:
            pg.keyboard.press(k);pg.wait_for_timeout(700);print(' key',k,pg.evaluate(st))
        pg.evaluate("()=>{warp(START.x,START.z,START.h)}");pg.wait_for_timeout(1200);pg.keyboard.press('p');pg.wait_for_timeout(600);print(' far P',pg.evaluate(st),pg.evaluate("()=>document.getElementById('toast').textContent"))
    print(' errs',errs);ctx.close()
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox','--enable-webgl'])
    run(b,False);run(b,True);b.close()
