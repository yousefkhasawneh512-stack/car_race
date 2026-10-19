import os
import sys,json,time
from playwright.sync_api import sync_playwright
SP=os.environ.get('SP',os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # repo root: node_modules/three + screenshots
THREE=open(SP+'/node_modules/three/build/three.min.js','rb').read()+b'\n;THREE.WebGLRenderer.prototype.render=function(){};'
HTML=sys.argv[1] if len(sys.argv)>1 else 'new.html'
GP_OK=(len(sys.argv)<=2 or sys.argv[2]!='blocked')
INIT='''
window.__NOAQ=1;window.__raf=null;window.requestAnimationFrame=cb=>{window.__raf=cb;return 1};window.__tt=1000;window.__pre=null;
window.__step=async(n,dt)=>{for(let i=0;i<n;i++){window.__tt+=dt||50;window.__pre&&window.__pre();const c=window.__raf;window.__raf=null;c&&c(window.__tt);await new Promise(r=>setTimeout(r,0))}};
window.__pad={id:'Logitech G29 Driving Force Racing Wheel (Vendor: 046d Product: c24f)',index:0,connected:true,mapping:'',axes:[0,1,1,1,0,0,0,0,0,0],buttons:Array.from({length:30},()=>({pressed:false,value:0}))};
%GP%
window.__hid={sent:[],pol:-1,motor:false};
const dev={vendorId:0x046d,productId:0xc24f,productName:'G29 (mock)',opened:false,collections:[{outputReports:[{reportId:0}]}],open:async()=>{dev.opened=true},
 sendReport:async(id,data)=>{const a=Array.from(data);window.__hid.sent.push([id,a]);if(window.__hid.motor&&a[0]===0x11){window.__pad.axes[0]=Math.max(-1,Math.min(1,window.__pad.axes[0]+window.__hid.pol*(a[2]-128)/127*0.08))}}};
Object.defineProperty(navigator,'hid',{value:{getDevices:async()=>[dev],requestDevice:async()=>[dev],addEventListener(){}},configurable:true});
'''.replace('%GP%',"navigator.getGamepads=()=>[window.__pad,null,null,null];" if GP_OK else "navigator.getGamepads=()=>{throw new DOMException('Access to the feature gamepad is disallowed by permissions policy','SecurityError')};")
res={}
def ok(name,cond,info=''):
    res[name]=bool(cond);print(('PASS ' if cond else 'FAIL ')+name,info,flush=True)
with sync_playwright() as p:
    b=p.chromium.launch(args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--enable-webgl'])
    pg=b.new_page(viewport={'width':800,'height':450})
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:300]))
    pg.add_init_script(INIT)
    pg.route('https://cdnjs.cloudflare.com/**',lambda r:r.fulfill(body=THREE,content_type='application/javascript'))
    pg.goto('file://'+SP+'/'+HTML);pg.wait_for_timeout(1500)
    ev=lambda s:pg.evaluate("()=>{"+s+"}")
    ev("window.gfxRender=function(){}")
    def run(sec):pg.evaluate("n=>window.__step(n,50)",int(sec*20))
    if not GP_OK:
        run(2);ok('blocked gamepad API is survived',ev("return WH.state.blocked==='gamepad'&&!WH.state.on&&typeof updP==='function'"));ok('no page errors',not errs,errs[:3]);print(json.dumps(res));b.close();sys.exit()
    run(2);pg.wait_for_timeout(1500);run(0.5)
    ok('wheel detected',ev("return WH.state.on&&/G29/.test(WH.state.id)"),ev("return WH.state.id"))
    ok('wizard auto-opens first run',ev("return ui===true&&document.getElementById('whz').style.display==='flex'"))
    ok('hid auto-connect',ev("return !!WH.ff.dev"),ev("return WH.ff.st"))
    sent=ev("return window.__hid.sent")
    ok('init cmds (autocenter off, range 900, stop)',any(s[1][0]==0xf5 for s in sent) and any(s[1][:4]==[0xf8,0x81,0x84,0x03] for s in sent) and any(s[1][0]==0x13 for s in sent),sent[:3])
    # --- axis calibration in wizard (steering: right = +, so no invert)
    ev("document.querySelector('[data-a=axw]').click()");run(0.2);ev("window.__pad.axes[0]=0.9");run(1.5)
    ok('steering axis detect',ev("return WH.cfg().wheel===0&&WH.cfg().wInv===false"),ev("return JSON.stringify([WH.cfg().wheel,WH.cfg().wInv])"))
    ev("window.__pad.axes[0]=0");run(0.2)
    ev("document.querySelector('[data-a=axw]').click()");run(0.2);ev("window.__pad.axes[0]=-0.9");run(1.5)
    ok('inverted wheel axis detected',ev("return WH.cfg().wInv===true"));ev("window.__pad.axes[0]=0;document.querySelector('[data-a=axw]').click()");run(.2);ev("window.__pad.axes[0]=0.9");run(1.5);ev("window.__pad.axes[0]=0");run(.2)
    ev("document.querySelector('[data-a=axt]').click()");run(.2)
    ok('pedal calibration first asks for released pedals',ev("return /released/.test(WH._cap().msg)"),ev("return WH._cap().msg"))
    run(.4);ok('then asks for the full press',ev("return /THROTTLE/.test(WH._cap().msg)"))
    ev("window.__pad.axes[2]=-1");run(.2);ev("window.__pad.axes[2]=1");run(.2)
    ev("document.querySelector('[data-a=axb]').click()");run(.6);ev("window.__pad.axes[3]=-1");run(.2);ev("window.__pad.axes[3]=1");run(.2)
    c=ev("const c=WH.cfg();return [c.thr,c.tr,c.tf,c.brk,c.br,c.bf]")
    ok('pedal calibration',c==[2,1,-1,3,1,-1],c)
    # --- button binding
    ev("document.querySelector('[data-a=\"b:KeyC\"]').click()");run(.2);ev("window.__pad.buttons[7].pressed=true");run(.2);ev("window.__pad.buttons[7].pressed=false");run(.2)
    ok('button bind',ev("return WH.cfg().btn.KeyC===7"),ev("return JSON.stringify(WH.cfg().btn)"))
    ev("window.__pad.buttons[9].pressed=true");run(.2);ev("window.__pad.buttons[9].pressed=false");run(.2)
    ok('wizard closed by wheel button',ev("return ui===false"))
    cm=ev("return camMode");ev("window.__pad.buttons[7].pressed=true");run(.2);ev("window.__pad.buttons[7].pressed=false");run(.2)
    ok('bound button triggers camera toggle',ev("return camMode")!=cm)
    # v45: Back button with no menu open = pause menu; again = resume (and closing a menu with Back never also pauses: checked above)
    ev("window.__pad.buttons[9].pressed=true");run(.2);ev("window.__pad.buttons[9].pressed=false");run(.2);p1=ev("return PAUSE.on")
    ev("window.__pad.buttons[9].pressed=true");run(.2);ev("window.__pad.buttons[9].pressed=false");run(.2);p2=ev("return PAUSE.on")
    ok('wheel Back button pauses, and resumes on the next press',p1 and not p2,(p1,p2))
    # --- pedals analog
    def accel(axisval):
        ev("window.__pre=null;warp(START.x,START.z,START.h);P.vx=P.vz=0;window.__pad.axes[2]=%s"%axisval);run(1.0)
        v=ev("return Math.hypot(P.vx,P.vz)");ev("window.__pad.axes[2]=1");run(.1);return v
    v50=accel(0);v100=accel(-1)
    ok('analog throttle (50% ≈ half of 100%)',v100>1 and 0.3<v50/v100<0.7,(round(v50,2),round(v100,2)))
    # brake pedal slows down proportionally
    def brk(axisval):
        ev("window.__pre=null;warp(START.x,START.z,START.h);P.vx=Math.sin(P.h)*30;P.vz=Math.cos(P.h)*30;window.__pad.axes[3]=%s"%axisval);run(.5)
        v=ev("return Math.hypot(P.vx,P.vz)");ev("window.__pad.axes[3]=1");run(.1);return v
    b50=brk(0);b100=brk(-1)
    ok('analog brake (light < hard)',b100<b50<30,(round(b50,2),round(b100,2)))
    # --- steering direction
    def steer(a):
        ev("window.__pad.axes[2]=1;warp(START.x,START.z,START.h);window.__h0=P.h;window.__pre=()=>{P.vx=Math.sin(P.h)*12;P.vz=Math.cos(P.h)*12};window.__pad.axes[0]=%s"%a);run(1.0)
        d=ev("return P.h-window.__h0");ev("window.__pre=null;window.__pad.axes[0]=0");return d
    dr=steer(0.4);dl=steer(-0.4);dh=steer(0.8)
    ok('steer right turns right (h decreases)',dr<-0.05,round(dr,3));ok('steer left turns left (h increases)',dl>0.05,round(dl,3));ok('more lock = more yaw',dh<dr,(round(dr,3),round(dh,3)))
    # --- handbrake button (v46: default moved from 5 to 6, because the paddles 4/5 now shift gears)
    ev("warp(START.x,START.z,START.h);P.vx=Math.sin(P.h)*20;P.vz=Math.cos(P.h)*20;window.__pad.buttons[6].pressed=true");run(.3)
    ok('handbrake button held',ev("return WH.state.hb"));ev("window.__pad.buttons[6].pressed=false");run(.1)
    # --- v46: paddles shift (Realistic, manual), horn button held / released
    ev("setHandling(1);setGearbox(0,1);warp(START.x,START.z,START.h);P.vx=Math.sin(P.h)*12;P.vz=Math.cos(P.h)*12;PTS.idx=-1");run(.3);g0=ev("return PTS.gear")
    ev("window.__pad.buttons[4].pressed=true");run(.2);ev("window.__pad.buttons[4].pressed=false");run(1);g1=ev("return PTS.gear");man=ev("return PTS.man")
    ev("window.__pad.buttons[5].pressed=true");run(.2);ev("window.__pad.buttons[5].pressed=false");run(1);g2=ev("return PTS.gear")
    ok('right paddle shifts up (and selects the manual gearbox), left paddle shifts down',man==1 and g1==g0+1 and g2==g1-1,(g0,g1,g2,man))
    ev("window.__pad.buttons[10].pressed=true");run(.2);h1=ev("return HORN.on");ev("window.__pad.buttons[10].pressed=false");run(.2);h2=ev("return HORN.on")
    ok('horn button: on while held, off when released',h1 and not h2,(h1,h2))
    ev("setGearbox(0,1);setHandling(0);P.vx=P.vz=0")
    # --- FFB signals
    def lastb(sec=.5):
        run(sec);s=ev("return window.__hid.sent.filter(x=>x[1][0]===0x11).slice(-1)[0]");return s[1][2] if s else None
    ev("warp(START.x,START.z,START.h);window.__pre=()=>{P.vx=Math.sin(P.h)*15;P.vz=Math.cos(P.h)*15;P.h=START.h};window.__pad.axes[0]=0.5")
    br=lastb();ev("window.__pad.axes[0]=-0.5");bl=lastb()
    ok('centring force opposes wheel angle',br<120 and bl>136,(br,bl))
    ev("window.__pad.axes[0]=0");bc=lastb(1.2)
    ok('neutral at centre',abs(bc-128)<=8,bc)
    ev("warp(START.x,START.z,0);window.__pre=()=>{P.h=0;P.vx=-8;P.vz=14}");bs=lastb(.2)
    ok('self-aligning pull toward slide',bs>150,bs)
    ev("window.__pre=()=>{P.vx=Math.sin(P.h)*20;P.vz=Math.cos(P.h)*20}");run(.5)
    n0=ev("return window.__hid.sent.length");ev("window.__pre=null;P.vx*=0.3;P.vz*=0.3");run(.4)
    seg=ev("return window.__hid.sent.slice(%d).filter(x=>x[1][0]===0x11).map(x=>x[1][2])"%n0)
    ok('collision jolt',seg and max(abs(x-128) for x in seg)>30,seg[:8])
    ev("window.__pre=null;P.vx=P.vz=0;window.__pad.axes[0]=0");run(1)
    ev("WH.ffTest(1)");run(.2)
    seg=ev("return window.__hid.sent.slice(-8).filter(x=>x[1][0]===0x11).map(x=>x[1][2])")
    ok('test pulse right sends strong force',seg and max(seg)>180,seg)
    run(1);ev("ui=true;window.__pad.axes[0]=0.8");bm=lastb(1);ev("ui=false;window.__pad.axes[0]=0")
    ok('menus release the wheel',abs(bm-128)<=2,bm)
    # probe with reversed mock motor: higher byte -> axis decreases  => should flip
    ev("window.__hid.motor=true;window.__hid.pol=-1;window.__pad.axes[0]=0;window.__pre=null");ev("WH.ffProbe()");run(1.5)
    ok('auto-detect flips reversed force',ev("return WH.cfg().ffInv===true"),ev("return WH.ff.st"))
    ev("window.__pad.axes[0]=0");ev("WH.ffProbe()");run(1.5)
    ok('auto-detect then confirms OK',ev("return WH.cfg().ffInv===true&&/OK/.test(WH.ff.st)"),ev("return WH.ff.st"))
    ev("window.__hid.motor=false")
    n1=ev("return window.__hid.sent.length");ev("dispatchEvent(new Event('blur'))");run(.2)
    ok('blur sends stop',ev("return window.__hid.sent.slice(%d).some(x=>x[1][0]===0x13)"%n1))
    # keyboard still drives with wheel connected and idle
    ev("window.__pad.axes[0]=0;window.__pad.axes[2]=1;warp(START.x,START.z,START.h);keys.KeyW=1");run(1);vk=ev("return Math.hypot(P.vx,P.vz)");ev("keys.KeyW=0")
    ok('keyboard throttle still works with wheel idle',vk>3,round(vk,2))
    ev("keys.KeyA=1;window.__pre=()=>{P.vx=Math.sin(P.h)*12;P.vz=Math.cos(P.h)*12};window.__h0=P.h");run(1);dk=ev("return P.h-window.__h0");ev("keys.KeyA=0;window.__pre=null")
    ok('keyboard steering still works with wheel idle',dk>0.05,round(dk,3))
    ev("window.__pad.axes[2]=1;warp(START.x,START.z,START.h);window.__h0=P.h;MobilePCInputController.isAccelerating=true;MobilePCInputController.steeringAngle=-1");run(1.2);tv=ev("return [Math.hypot(P.vx,P.vz),P.h-window.__h0]");ev("MobilePCInputController.isAccelerating=false;MobilePCInputController.steeringAngle=0")
    ok('touch pads still drive (gas + left)',tv[0]>3 and tv[1]>0.1,[round(tv[0],2),round(tv[1],3)])
    # --- v42: live readings, clutch, combined pedal axis, released-end correction, dead zone, disconnect
    ev("WH.open()");run(.3)
    ev("window.__pad.axes[2]=0");run(.4);pg.wait_for_timeout(300)
    ok('setup shows live numeric readings',ev("return /input live/.test(document.getElementById('wzd').innerHTML)&&document.getElementById('wztv').textContent==='50%'"),ev("return document.getElementById('wztv').textContent"))
    ev("window.__pad.axes[2]=1;window.__pad.axes[4]=1;document.querySelector('[data-a=axc]').click()");run(.6);ev("window.__pad.axes[4]=-1");run(.2);ev("window.__pad.axes[4]=0");run(.2)
    ok('clutch calibrates on its own axis and reads half travel',ev("return WH.cfg().clu===4&&Math.abs(WH.state.clu-0.5)<0.05"),ev("return [WH.cfg().clu,WH.state.clu]"))
    ev("window.__pad.axes[4]=1");run(.1)
    # combined pedals: one axis, rest 0, throttle -> -1, brake -> +1
    ev("window.__pad.axes[5]=0;document.querySelector('[data-a=axt]').click()");run(.6);ev("window.__pad.axes[5]=-1");run(.9);ev("window.__pad.axes[5]=0");run(.2)
    ev("document.querySelector('[data-a=axb]').click()");run(.6);ev("window.__pad.axes[5]=1");run(.9);ev("window.__pad.axes[5]=0");run(.2)
    ok('combined pedal axis calibrates (same axis, opposite directions)',ev("return WH.cfg().thr===5&&WH.cfg().brk===5&&/combined/.test(document.getElementById('wzpi').textContent)"),ev("return document.getElementById('wzpi').textContent"))
    ev("window.__pad.axes[5]=-0.6");run(.2);a=ev("return [WH.state.thr,WH.state.brk]");ev("window.__pad.axes[5]=0.6");run(.2);b2=ev("return [WH.state.thr,WH.state.brk]")
    ok('combined axis: throttle and brake read separately',a[0]>0.55 and a[1]==0 and b2[1]>0.55 and b2[0]==0,(a,b2))
    ev("window.__pad.axes[5]=0");run(.1)
    # browsers that report 0 until a pedal is first touched: calibrated rest 0, real rest +1 -> the released end corrects itself
    ev("window.__pad.axes[6]=0;document.querySelector('[data-a=axt]').click()");run(.6);ev("window.__pad.axes[6]=-1");run(.9);ev("window.__pad.axes[6]=1");run(.2);ev("window.__pad.axes[6]=0");run(.2)
    ok('released end auto-corrects when the axis reads beyond it',ev("return WH.cfg().tr===1&&Math.abs(WH.state.thr-0.5)<0.05"),ev("return [WH.cfg().tr,WH.state.thr]"))
    ev("window.__pad.axes[6]=0.96");run(.1);ok('pedal dead zone ignores resting noise (2% press)',ev("return WH.state.thr===0"),ev("return WH.state.thr"))
    ev("window.__pad.axes[6]=1;WH.cfg().thr=2;WH.cfg().tr=1;WH.cfg().tf=-1;WH.cfg().brk=3;WH.cfg().br=1;WH.cfg().bf=-1");run(.1)
    ev("window.__pad.connected=false;dispatchEvent(Object.assign(new Event('gamepaddisconnected'),{gamepad:window.__pad}))");run(.3);pg.wait_for_timeout(300)
    ok('disconnect: input marked not live, no stale pedal values',ev("return !WH.state.on&&WH.state.thr===0&&/No wheel detected/.test(document.getElementById('wzd').innerHTML)&&document.getElementById('wztv').textContent==='–'"),ev("return document.getElementById('wzd').innerHTML.slice(0,80)"))
    ev("window.__pad.connected=true");run(1.5);ok('reconnect detected',ev("return WH.state.on"))
    ev("document.querySelector('[data-a=cls]').click()");run(.1)
    ok('settings persisted under own key',ev("return !!localStorage.getItem('irbid-wheel')&&!localStorage.getItem('irbid-wheel').includes('fines')"))
    ok('no page errors',not errs,errs[:3])
    b.close()
print(json.dumps({'passed':sum(res.values()),'total':len(res)}))
