"""CPU time per frame by subsystem in real Chromium (wraps the loop's global functions with performance.now()).
GPU time is NOT measured (SwiftShader renders on the CPU, so gfxRender here is software rendering, not a GPU figure).
usage: python tests/cpu_prof_pw.py dist/irbid-drive.html [seconds]. Prints one JSON line: mean ms per frame per function, frames, the JS-only total."""
import sys,os,json
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
THREE=open(ROOT+'/node_modules/three/build/three.min.js','rb').read()
SEC=float(sys.argv[2]) if len(sys.argv)>2 else 10
FN=['sigTick','updTraffic','updP','updHeist','updRace','poiNear','navTick','navLabels','showCarsTick','fxTick','damageTick','drawMap','gfxRender','lodTick','lampTick','gfxSky','groundTo']
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_page(viewport={'width':1280,'height':720});errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)[:200]))
    pg.add_init_script("window.__NOAQ=1;const R=window.requestAnimationFrame;window.__lt=[];window.requestAnimationFrame=f=>R(t=>{const a=performance.now();f(t);window.__lt.push(performance.now()-a)})")
    pg.route('https://cdnjs.cloudflare.com/**',lambda r:r.fulfill(body=THREE,content_type='application/javascript'))
    pg.goto('file://'+os.path.abspath(sys.argv[1]),timeout=300000)
    pg.wait_for_function("typeof loop==='function'&&window.__lt.length>5",timeout=300000);pg.wait_for_timeout(3000)
    pg.evaluate("""FN=>{window.__pf={};for(const n of FN){const f=window[n];if(typeof f!=='function')continue;window.__pf[n]=0;window[n]=function(){const a=performance.now();const r=f.apply(this,arguments);window.__pf[n]+=performance.now()-a;return r}}
      warp(START.x,START.z,START.h);hour=12;P.vx=Math.sin(P.h)*20;P.vz=Math.cos(P.h)*20;keys.KeyW=1;setTimeout(()=>{for(const k in window.__pf)window.__pf[k]=0;window.__lt=[]},1500)}""",FN)
    pg.wait_for_timeout(1500+SEC*1000)
    r=pg.evaluate("()=>{const n=window.__lt.length,o={};let js=0;for(const k in window.__pf){o[k]=+(window.__pf[k]/n).toFixed(3);if(k!=='gfxRender')js+=window.__pf[k]/n}const lt=window.__lt.reduce((a,b)=>a+b,0)/n;return{frames:n,loop_ms:+lt.toFixed(2),js_ms_excl_render:+js.toFixed(2),other_loop_ms:+(lt-js-o.gfxRender).toFixed(2),fn:o,traffic:traffic.length}}")
    r['errors']=errs[:3];print(json.dumps(r));b.close()
