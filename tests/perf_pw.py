"""Performance snapshot in real Chromium (SwiftShader software GL, so absolute fps is far below a real GPU; compare builds, not numbers).
usage: python tests/perf_pw.py dist/irbid-drive.html [label]. Prints load time, JS heap, draw calls / triangles at three views,
mean frame time over 8 s at the start view, and console/page errors, as one JSON line."""
import sys,os,json,time
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
THREE=open(ROOT+'/node_modules/three/build/three.min.js','rb').read()
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--enable-precise-memory-info'])
    pg=b.new_page(viewport={'width':1280,'height':720});errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)[:200]));pg.on('console',lambda m:errs.append(m.text[:200]) if m.type=='error' else None)
    pg.add_init_script("window.__NOAQ=1;window.__t0=performance.now();const R=window.requestAnimationFrame;window.__frames=[];window.requestAnimationFrame=f=>R(t=>{window.__frames.push(t);if(!window.__first)window.__first=performance.now();f(t)})")
    pg.route('https://cdnjs.cloudflare.com/**',lambda r:r.fulfill(body=THREE,content_type='application/javascript'))
    t0=time.time();pg.goto('file://'+os.path.abspath(sys.argv[1]),timeout=300000)
    pg.wait_for_function("window.__first>0",timeout=300000);load=pg.evaluate("window.__first-window.__t0")
    pg.wait_for_timeout(3000)
    ev=lambda s:pg.evaluate("()=>{"+s+"}")
    out={'build':sys.argv[2] if len(sys.argv)>2 else sys.argv[1],'load_ms':round(load),'heap_mb':round(ev("return performance.memory?performance.memory.usedJSHeapSize/1048576:-1"),1)}
    views={}
    for name,js in [('start',"warp(START.x,START.z,START.h)"),('balad',"warp(-66,-640,0)"),('yarmouk',"warp(905,1520,0)")]:
        ev(js+";hour=12");pg.wait_for_timeout(2500);views[name]=ev("ren.info.autoReset=false;ren.info.reset();POST.comp.render();const i=ren.info.render;const o=[i.calls,i.triangles];ren.info.autoReset=true;return o")
    out['views']=views
    ev("warp(START.x,START.z,START.h)");pg.wait_for_timeout(1500);ev("window.__frames=[]");pg.wait_for_timeout(8000)
    fr=ev("const f=window.__frames;let s=0;for(let i=1;i<f.length;i++)s+=f[i]-f[i-1];return [f.length,f.length>1?s/(f.length-1):0]")
    out['frames_8s']=fr[0];out['mean_frame_ms']=round(fr[1],1);out['errors']=errs[:5];out['n_errors']=len(errs)
    print(json.dumps(out));b.close()
