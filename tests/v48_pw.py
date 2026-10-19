"""v48 in real Chromium (built game): the four camera views (C: chase, cockpit, bonnet, bumper) placed per car, pause-menu rows (ABS / TC / ESC
toggles stored, driving-school list, text size applied as CSS zoom, reduced motion stops the speed zoom), a driving lesson started by a real
click in the pause menu (car on the lesson street, markers on the road, instructor panel), the result card and its Retry button, no page errors.
usage: python tests/v48_pw.py dist/irbid-drive.html   (screenshots -> docs/screenshots/v48/, or SP)
Exits 1 on failure."""
import sys,os
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
THREE=open(ROOT+'/node_modules/three/build/three.min.js','rb').read()
OUT=os.environ.get('SP',ROOT+'/docs/screenshots/v48');os.makedirs(OUT,exist_ok=True)
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
    pg.wait_for_function("typeof schStart==='function'&&typeof loop==='function'",timeout=300000);pg.wait_for_timeout(2500)
    ev=lambda s:pg.evaluate("()=>{"+s+"}")
    ev("warp(START.x,START.z,START.h);hour=11");pg.mouse.click(640,360);pg.wait_for_timeout(500)
    # ---- cameras ----
    views=[]
    for i,n in enumerate(['chase','cockpit','bonnet','bumper']):
        if i:pg.keyboard.press('KeyC')
        pg.wait_for_timeout(1500)
        v=ev("const f=Math.sin(P.h),g=Math.cos(P.h),dx=cam.position.x-P.x,dz=cam.position.z-P.z;return{m:camMode,a:+(dx*f+dz*g).toFixed(2),y:+(cam.position.y-P.y).toFixed(2),L:PORS[P.idx][3],H:PORS[P.idx][5]}")
        views.append(v);pg.screenshot(path=OUT+'/camera_'+n+'.png')
    ok([v['m'] for v in views]==[0,1,2,3],'C cycles chase -> cockpit -> bonnet -> bumper',[v['m'] for v in views])
    c,k,bn,bp=views
    ok(c['a']<-5 and 0<k['a']<bn['a']<bp['a'] and bp['a']>c['L']/2 and k['y']<c['H']+.2 and bp['y']<.7,'views sit behind / at the driver / on the bonnet / ahead of the bumper, sized from the car',views)
    pg.keyboard.press('KeyC');pg.wait_for_timeout(400);ok(ev("return camMode")==0,'a fourth press returns to the chase view')
    # ---- pause menu rows ----
    pg.keyboard.press('Escape');pg.wait_for_timeout(400)
    t=ev("return pauseEl.textContent")
    ok(all(x in t for x in['ABS: on','Traction control: off','Stability (ESC): off','Driving school','1. Start and stop','5. Reverse parking','Text size','Reduced motion']),'pause menu: assists (defaults ABS on, TC off, ESC off), school lessons, accessibility')
    pg.click('#pauseMenu [data-a="tc"]');pg.wait_for_timeout(200)
    s=ev("return{tc:ASSIST.tc,st:localStorage.getItem('irbid-drive-assist-v1'),b:pauseEl.querySelector('[data-a=\"tc\"]').textContent}");ok(s['tc'] and '"tc":true' in (s['st'] or '') and 'on' in s['b'],'clicking Traction control turns it on and stores it',s)
    pg.click('#pauseMenu [data-a="tc"]')
    pg.select_option('#pauseMenu [data-s="ts"]','1.4');pg.wait_for_timeout(300)
    z=ev("return{z:getComputedStyle(document.getElementById('top')).zoom,st:localStorage.getItem('irbid-drive-a11y-v1')}");pg.screenshot(path=OUT+'/pause_v48_textsize.png')
    ok(z['z'] in('1.4','1.39999') and '"ts":1.4' in (z['st'] or ''),'Extra large text zooms the HUD to 140 % and is stored',z)
    pg.select_option('#pauseMenu [data-s="ts"]','1');pg.check('#pauseMenu [data-c="rm"]');pg.wait_for_timeout(200)
    # ---- a lesson from the menu (real click) ----
    pg.click('#pauseMenu [data-sch="0"]');pg.wait_for_timeout(2500)
    l=ev("const s=SCH.site,dx=P.x-s.x0,dz=P.z-s.z0;return{on:SCH.on&&SCH.on.id,paused:PAUSE.on,a:+(dx*s.ux+dz*s.uz).toFixed(1),l:+(dx*s.rx+dz*s.rz).toFixed(1),lane:s.lane,zone:SCHM.zone.visible,zy:+(SCHM.zone.position.y-TH(SCHM.zone.position.x,SCHM.zone.position.z)).toFixed(2),panel:document.getElementById('school').style.display,txt:document.getElementById('school').textContent.slice(0,90)}")
    pg.screenshot(path=OUT+'/school_lesson1.png')
    ok(l['on']=='stop' and not l['paused'] and abs(l['l']-l['lane'])<.6 and l['zone'] and 0<l['zy']<.2 and l['panel']=='block' and 'Start and stop' in l['txt'],'clicking lesson 1 starts it: car in the right lane of the lesson street, green box on the road, instructor panel',l)
    pg.keyboard.down('KeyW')
    for i in range(60):
        pg.wait_for_timeout(500)
        if ev("return Math.hypot(P.vx,P.vz)*3.6")>8:break
    pg.keyboard.up('KeyW');sp=ev("return Math.round(Math.hypot(P.vx,P.vz)*3.6)")
    fov=ev("return cam.fov");ok(sp>5 and abs(fov-65)<.01,'drives with the real keyboard during the lesson; reduced motion keeps the FOV at 65° at speed','%d km/h, fov %.1f'%(sp,fov))
    ev("schEnd('fail','Test ending.')");pg.wait_for_timeout(500);pg.screenshot(path=OUT+'/school_result.png')
    r=ev("return{d:schoolRes.style.display,t:schoolRes.textContent}")
    ok(r['d']=='flex' and 'Not passed' in r['t'] and 'Retry' in r['t'],'the result card shows the outcome, mistakes and Retry / Next / Close',r['t'][:120])
    pg.click('#schoolRes [data-s="retry"]');pg.wait_for_timeout(1500)
    rr=ev("return{on:SCH.on&&SCH.on.id,over:SCH.over,ui:ui,t:SCH.t}");ok(rr['on']=='stop' and not rr['over'] and not rr['ui'],'Retry restarts the lesson and gives control back',rr)
    ev("schStop()");ok(not ev("return SCHM.zone.visible||document.getElementById('school').style.display!=='none'"),'quitting removes the markers and the panel')
    ev("A11Y.rm=false;a11ySave();ASSIST.tc=false;assistSave()")
    ok(not errs,'no page errors',errs[:3])
    b.close()
print('v48_pw: '+('all passed' if not fail else str(fail)+' FAILED'));sys.exit(1 if fail else 0)
