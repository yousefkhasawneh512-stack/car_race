"""v49 in real Chromium (built game): the search box (M) shows category chips; a real click on "Schools" lists only schools, a click on the
star saves a place (stored) and the empty box then lists it first; picking it starts navigation; the pause menu has Tyre temperature / Brake
fade toggles (off by default, stored) and the "By time of day" traffic option; in Realistic the HUD shows tyre and brake temperatures; no page errors.
usage: python tests/v49_pw.py dist/irbid-drive.html   (screenshots -> docs/screenshots/v49/, or SP)
Exits 1 on failure."""
import sys,os,json
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
THREE=open(ROOT+'/node_modules/three/build/three.min.js','rb').read()
OUT=os.environ.get('SP',ROOT+'/docs/screenshots/v49');os.makedirs(OUT,exist_ok=True)
fail=0
def ok(c,m,v=''):
    global fail
    print(('PASS ' if c else 'FAIL ')+m+(('  ['+str(v)+']') if v!='' else ''),flush=True);fail+=0 if c else 1
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_page(viewport={'width':1280,'height':720});errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)[:300]))
    pg.add_init_script("window.__NOAQ=1")
    pg.route('https://cdnjs.cloudflare.com/**',lambda r:r.fulfill(body=THREE,content_type='application/javascript'))
    pg.goto('file://'+os.path.abspath(sys.argv[1]),timeout=300000)
    pg.wait_for_function("typeof favToggle==='function'&&typeof loop==='function'",timeout=300000);pg.wait_for_timeout(2500)
    ev=lambda s:pg.evaluate("()=>{"+s+"}")
    ev("warp(START.x,START.z,START.h);hour=11");pg.mouse.click(640,360);pg.wait_for_timeout(500)
    # ---- search: chips, category filter, saved places ----
    pg.keyboard.press('KeyM');pg.wait_for_timeout(800)
    s=ev("return{f:document.activeElement===navIn,d:navRes.style.display,n:navRes.querySelectorAll('.nc').length,r:navRes.querySelectorAll('.nr').length}")
    ok(s['f'] and s['d']=='block' and s['n']==11 and s['r']>0,'M focuses the search box: 11 category chips above the results',s)
    pg.screenshot(path=OUT+'/search_chips.png')
    pg.click('#navRes .nc[data-cat="edu"]');pg.wait_for_timeout(600)
    r=ev("return{cat:NAVF.cat,f:document.activeElement===navIn,k:NAV.res.map(o=>o.it.k),on:navRes.querySelector('.nc.on')&&navRes.querySelector('.nc.on').dataset.cat,t:[...navRes.querySelectorAll('.nr')].slice(0,3).map(e=>e.textContent)}")
    pg.screenshot(path=OUT+'/search_schools.png')
    ok(r['cat']=='edu' and r['on']=='edu' and r['f'] and len(r['k'])>=5 and all(k in('school','campus') for k in r['k']),'clicking "Schools" lists only schools and campuses (box keeps focus)',r['t'])
    pg.keyboard.type('yarmouk');pg.wait_for_timeout(600)
    y=ev("return NAV.res.map(o=>o.it.n+' '+o.it.k)");ok(len(y)>0 and all(x.endswith(('school','campus')) for x in y),'typing with the chip on keeps the filter',y[:3])
    pg.click('#navRes .nc[data-cat="edu"]');pg.wait_for_timeout(400);ok(ev("return NAVF.cat")=='','clicking the chip again clears it')
    pg.fill('#navIn','');pg.wait_for_timeout(500)
    nm=ev("return NAV.res[1].it.n");pg.click('#navRes .nr:nth-of-type(3) .fv');pg.wait_for_timeout(500)
    st=ev("return{fav:NAVF.fav.map(f=>f.n),ls:localStorage.getItem('irbid-drive-fav-v1'),first:NAV.res[0].it.n,sv:NAV.res[0].fav,star:navRes.querySelector('.nr .fv').textContent}")
    pg.screenshot(path=OUT+'/search_saved.png')
    ok(st['fav']==[nm] and nm in (st['ls'] or '') and st['first']==nm and st['sv']==1 and st['star']=='★','clicking ☆ saves the place (stored) and the empty box lists it first with ★',st)
    pg.click('#navRes .nr:nth-of-type(2) span');pg.wait_for_timeout(1500)
    n=ev("return{on:NAV.on,d:NAV.dest&&NAV.dest.name,tot:Math.round(NAV.total)}");ok(n['on'] and n['d']==nm and n['tot']>0,'clicking the saved place starts navigation',n)
    ev("navClear()")
    # ---- pause menu ----
    pg.mouse.click(640,360);pg.keyboard.press('Escape');pg.wait_for_timeout(400)
    t=ev("return pauseEl.textContent");ok('Tyre temperature: off' in t and 'Brake fade: off' in t,'pause menu: Tyre temperature and Brake fade, off by default')
    opts=ev("return[...pauseEl.querySelectorAll('[data-s=\"tr\"] option')].map(o=>o.value)");ok('auto' in opts,'traffic has a "By time of day" option',opts)
    pg.click('#pauseMenu [data-a="tt"]');pg.click('#pauseMenu [data-a="bf"]');pg.wait_for_timeout(200)
    x=ev("return{s:localStorage.getItem('irbid-drive-sim-v1'),a:pauseEl.querySelector('[data-a=\"tt\"]').textContent,b:pauseEl.querySelector('[data-a=\"bf\"]').textContent}")
    ok(json.loads(x['s'] or '{}')=={'tt':True,'bf':True} and 'on' in x['a'] and 'on' in x['b'],'clicking both turns them on and stores them',x)
    pg.select_option('#pauseMenu [data-s="tr"]','auto');pg.wait_for_timeout(300)
    a=ev("hour=3.5;trApply(true);return{t:GQ.t,ls:localStorage.getItem('irbid-drive-gfx-v1'),act:TRAFALL.filter(c=>!c.park).length}")
    ok(a['t']=='auto' and '"t":"auto"' in (a['ls'] or '') and 20<=a['act']<80,'"By time of day" is stored; at 03:30 fewer cars are out',a)
    pg.screenshot(path=OUT+'/pause_v49.png')
    pg.select_option('#pauseMenu [data-s="tr"]','high');pg.keyboard.press('Escape');pg.wait_for_timeout(300)
    # ---- HUD temperatures in Realistic ----
    ev("setHandling(1);warp(START.x,START.z,START.h)");pg.keyboard.down('KeyW')
    for i in range(40):
        pg.wait_for_timeout(500)
        if ev("return Math.hypot(P.vx,P.vz)*3.6")>15:break
    pg.keyboard.up('KeyW');pg.keyboard.down('KeyS');pg.wait_for_timeout(1500);pg.keyboard.up('KeyS')
    h=ev("return{t:document.getElementById('spd').textContent,tt:SIMX.tT,bt:SIMX.bT}");pg.screenshot(path=OUT+'/hud_temps.png')
    ok('tyres' in h['t'] and 'brakes' in h['t'] and '°C' in h['t'],'Realistic HUD shows tyre and brake temperatures',h)
    ok(not errs,'no page errors',errs[:3])
    b.close()
print('v49_pw: '+('all passed' if not fail else str(fail)+' FAILED'));sys.exit(1 if fail else 0)
