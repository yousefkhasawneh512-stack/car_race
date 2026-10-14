import base64,os
from playwright.sync_api import sync_playwright
SP=os.environ.get('SP',os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # repo root: node_modules/three + screenshots
THREE=open(SP+'/node_modules/three/build/three.min.js','rb').read()
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox','--enable-webgl'])
    pg=b.new_page(viewport={'width':1100,'height':620})
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:200]))
    pg.route('https://cdnjs.cloudflare.com/**',lambda r:r.fulfill(body=THREE,content_type='application/javascript'))
    pg.goto('file://'+SP+'/new.html');pg.wait_for_timeout(5000)
    pg.evaluate("()=>{owned.push('Lamborghini Urus','Toyota AE86 Trueno');setPlayerCar(PORS.findIndex(m=>m[0]==='Lamborghini Urus'))}")
    pg.wait_for_timeout(1500);pg.screenshot(path=SP+'/u_hud.png')
    pg.evaluate("()=>openWheel()");pg.wait_for_timeout(800);pg.screenshot(path=SP+'/u_wheel.png')
    pg.evaluate("()=>{closeWheel();}");
    print(errs)
    b.close()
