// ---- Logitech G29 / racing-wheel support (v29) ----
// INPUT : Gamepad API (steering axis, pedals, buttons). Pedal axes + buttons are bound in the in-game setup screen (key V) because
//         browsers/OSes number the G29 axes differently. Keyboard and touch driving are untouched: the wheel only adds analog values.
// FORCE : WebHID (Chromium desktop only, needs a click once). Uses the Logitech constant-force protocol of the open-source Linux
//         `lg4ff` driver (report of 7 bytes: 0x11 slot-1 constant force, 0x13 stop, 0xf5 autocenter off, 0xf8 0x81 range).
//         If WebHID is unavailable the game falls back to gamepad rumble (if the pad exposes it) and otherwise just drives without force.
// Settings live in their own localStorage key `irbid-wheel` (the `irbid-save` format is not touched).
const WHN={on:false,steer:0,thr:0,brk:0,clu:0,hb:false,raw:0};
const WH=(()=>{
 const KEY='irbid-wheel',isW=id=>/046d|logitech|g29|g27|g25|g920|g923|driving force|racing wheel|wheel/i.test(id||'')||(!!cfg.dev&&id===cfg.dev);
 const ACT=[['hb','Handbrake (hold)'],['KeyC','Camera'],['KeyF','Reset to start'],['KeyR','Race / duel'],['KeyN','Next car'],['KeyB','Previous car'],['KeyG','Wheel spin'],['KeyE','Rob bank'],['KeyP','Tuning shop'],['KeyT','+1 hour'],['KeyK','Landmark tour'],['Escape','Back / close menu']];
 const DEF=()=>({wheel:0,wInv:false,thr:-1,brk:-1,tr:1,tf:-1,br:1,bf:-1,clu:-1,cr:1,cf:-1,pdz:.03,dev:'',range:900,lock:540,dead:.015,cen:0,curve:1,smooth:0,gain:.6,ffInv:false,ffOn:true,setup:false,btn:{hb:5,KeyC:4,KeyF:0,KeyR:1,KeyP:2,KeyG:3,Escape:9}});
 let cfg=DEF();try{const s=JSON.parse(localStorage.getItem(KEY)||'null');if(s)cfg=Object.assign(DEF(),s,{btn:Object.assign(DEF().btn,s.btn||{})})}catch(e){}
 const store=()=>{try{localStorage.setItem(KEY,JSON.stringify(cfg))}catch(e){}},cl2=(v,a,b)=>v<a?a:v>b?b:v;
 const S={on:false,steer:0,thr:0,brk:0,clu:0,hb:false,raw:0,id:'',blocked:'',seen:0,others:[]};
 let pi=-1,pad=null,scanT=9,cap=null,wzOn=false,rev=[],prev=new Uint8Array(64),said='';
 const rebuild=()=>{rev=[];for(const[a]of ACT){const i=cfg.btn[a];if(i>=0)rev[i]=a}};rebuild();
 const hasGP=()=>typeof navigator!=='undefined'&&typeof navigator.getGamepads==='function';
 const GP=()=>{try{return navigator.getGamepads()}catch(e){S.blocked='gamepad';return null}};
 const press=code=>{dispatchEvent(new KeyboardEvent('keydown',{code,key:code}));dispatchEvent(new KeyboardEvent('keyup',{code,key:code}))};
 // ================= force feedback state =================
 const WPID=[0xc24f,0xc29b,0xc299,0xc29a],FF={dev:null,rid:0,busy:false,st:'Force feedback: not connected',lastB:-1,same:0,acc:0,fb:0,imp:0,impS:1,impT:9,pvx:0,pvz:0,px:0,pz:0,pv:0,air:false,vyp:0,test:null,probe:null,rum:0};
 const hasHID=()=>typeof navigator!=='undefined'&&!!navigator.hid;
 const ffErr=e=>{const m=String(e&&e.message||e);FF.st=/policy|SecurityError|disallowed/i.test(m+(e&&e.name))?'Force feedback blocked by the page (embedded view). Open the game in its own tab/window in Chrome or Edge.':'Force feedback error: '+m;FF.dev=/disconnect|closed|lost/i.test(m)?null:FF.dev};
 const tx=(a,force)=>{const d=FF.dev;if(!d||(FF.busy&&!force))return false;FF.busy=true;let p;try{p=d.sendReport(FF.rid,new Uint8Array(a))}catch(e){FF.busy=false;ffErr(e);return false}p.catch(ffErr).then(()=>{FF.busy=false});return true};
 const fbyte=F=>cl2(Math.round(128+F*(cfg.ffInv?-127:127)),1,255);
 const ffStop=()=>{FF.lastB=-1;tx([0x13,0,0,0,0,0,0],true)};
 async function ffInit(dev){try{if(!dev.opened)await dev.open();FF.dev=dev;FF.rid=0;try{const rs=dev.collections.flatMap(c=>c.outputReports||[]);if(rs.length&&!rs.some(r=>r.reportId===0))FF.rid=rs[0].reportId}catch(e){}
   const snd=a=>dev.sendReport(FF.rid,new Uint8Array(a));await snd([0xf5,0,0,0,0,0,0]);                           // autocenter spring off (we drive the wheel ourselves)
   if([0xc24f,0xc29b,0xc299].includes(dev.productId)&&cfg.range>=40)await snd([0xf8,0x81,cfg.range&255,cfg.range>>8,0,0,0]);  // steering range in degrees
   await snd([0x13,0,0,0,0,0,0]);FF.lastB=-1;FF.st='Force feedback: connected ('+(dev.productName||'Logitech wheel')+')'}catch(e){FF.dev=null;ffErr(e)}}
 async function hidAuto(){if(!hasHID())return;try{for(const d of await navigator.hid.getDevices())if(d.vendorId===0x046d&&WPID.includes(d.productId)){await ffInit(d);break}}catch(e){}}
 async function hidAsk(){if(!hasHID()){FF.st='Force feedback needs WebHID (Chrome or Edge on desktop).';return}
  try{const l=await navigator.hid.requestDevice({filters:WPID.map(p=>({vendorId:0x046d,productId:p}))});if(l[0])await ffInit(l[0]);else FF.st='No wheel selected in the browser prompt.'}catch(e){ffErr(e)}}
 if(hasHID()){try{navigator.hid.addEventListener('disconnect',e=>{if(e.device===FF.dev){FF.dev=null;FF.st='Force feedback: wheel disconnected'}})}catch(e){}}
 // ================= input polling (called once per frame from updP) =================
 function onConnect(g){S.id=g.id;if(said!==g.id){said=g.id;toast('🎮 Wheel detected: '+g.id.replace(/\s*\(.*$/,''));if(!cfg.setup)setTimeout(()=>{if(!ui&&!wzOn)wzOpen()},900);else if(cfg.thr<0)toast('Press V to set up the pedals')}}
 function capAxis(g,dt){const c=cap;if(!c.base){c.base=Array.from(g.axes);c.idx=-1;c.maxd=0;c.stall=0;c.ext=0;c.rt=0;c.n=1}
  if(c.rest&&c.rt<.4){c.rt+=dt;c.n++;for(let i=0;i<g.axes.length;i++)c.base[i]+=(g.axes[i]-c.base[i])/c.n;if(c.rt>=.4)c.msg=c.msg2;return}  // pedals: average the RELEASED value first
  let bi=-1,bd=0;for(let i=0;i<g.axes.length;i++){if(c.skip&&c.skip.indexOf(i)>=0)continue;const d=Math.abs(g.axes[i]-c.base[i]);if(d>bd){bd=d;bi=i}}
  if(bd>.5&&(c.idx<0||bi===c.idx)){c.idx=bi;if(bd>c.maxd+.01){c.maxd=bd;c.stall=0;c.ext=g.axes[bi]}else c.stall+=dt;if(c.maxd>=1.6||c.stall>.6){const f=c.fn,i=c.idx,b=c.base[i],e=c.ext;cap=null;f(i,b,e)}}}
 function poll(dt){
  if(!hasGP())return WHN;const L=GP();if(!L)return WHN;
  if(pi<0||!L[pi]||!L[pi].connected){pi=-1;pad=null;scanT+=dt;if(scanT>1){scanT=0;for(let i=0;i<L.length;i++){const g=L[i];if(g&&g.connected&&isW(g.id)){pi=i;onConnect(g);break}}}
   if(pi<0){S.on=false;S.steer=S.thr=S.brk=S.clu=S.raw=0;S.hb=false;if(scanT===0){S.others.length=0;for(const g of L)if(g&&g.connected)S.others.push(g.id)}return S}}
  const g=L[pi];pad=g;S.on=true;S.seen++;const ax=g.axes;
  let a=ax[cfg.wheel]||0;if(cfg.wInv)a=-a;S.raw=a;
  // v45: centre offset (set in the setup screen), dead zone, response curve (1 = linear, >1 = finer near centre), optional smoothing (0 = none)
  let n=cl2((a-(cfg.cen||0))*cfg.range/cfg.lock,-1,1);const d=cfg.dead;n=Math.abs(n)<d?0:Math.sign(n)*(Math.abs(n)-d)/(1-d);if(cfg.curve>1)n=Math.sign(n)*Math.pow(Math.abs(n),cfg.curve);
  S.steer=cfg.smooth>0?S.steer+(n-S.steer)*(1-Math.exp(-dt/cfg.smooth)):n;
  // pedal read: dead zone at both ends; a reading beyond the released end moves that end (some browsers report 0 until a pedal is first touched)
  const pz=cfg.pdz,ped=(i,rk,fk)=>{if(i<0||i>=ax.length)return 0;const r=cfg[rk],f=cfg[fk],q=f-r;if(Math.abs(q)<.2)return 0;const u=(ax[i]-r)/q;
   if(u<-.06&&cfg.thr!==cfg.brk&&!cap){cfg[rk]=ax[i];store()}const p=cl2(u,0,1);return p<pz?0:Math.min(1,(p-pz)/(1-2*pz))};
  S.thr=ped(cfg.thr,'tr','tf');S.brk=ped(cfg.brk,'br','bf');S.clu=ped(cfg.clu,'cr','cf');
  if(cap&&cap.t==='axis')capAxis(g,dt);
  const B=g.buttons;let hb=false;
  for(let i=0;i<B.length&&i<64;i++){const p=B[i].pressed?1:0,a2=rev[i];
   if(cap&&cap.t==='btn'){if(p&&!prev[i]){const f=cap.fn;cap=null;f(i)}}
   else if(a2&&!cap&&(!wzOn||a2==='Escape')){if(a2==='hb')hb=hb||!!p;else if(p&&!prev[i])press(a2)}
   prev[i]=p}
  S.hb=hb&&!ui;return S}
 // ================= force feedback synthesis (called once per frame at the end of updP) =================
 function ffb(dt,frozen){
  const t=FF.test,pr=FF.probe,pd=pad;if(!pd||(!FF.dev&&!t&&!pr&&!(pd.vibrationActuator&&cfg.ffOn)))return;
  const sh=Math.sin(P.h),ch=Math.cos(P.h),vx=P.vx,vz=P.vz,ls=-vx*ch+vz*sh,v=Math.hypot(vx,vz);   // ls>0: sliding to the driver's right
  const dvx=vx-FF.pvx,dvz=vz-FF.pvz,dv=Math.hypot(dvx,dvz),tele=Math.hypot(P.x-FF.px,P.z-FF.pz)>Math.max(4,v*dt*3);
  if(!tele&&FF.pv>5&&dv>3){const m=Math.min(1,dv/10);if(m>FF.imp*Math.exp(-FF.impT*9)){FF.imp=m;FF.impT=0;FF.impS=(-dvx*ch+dvz*sh)>=0?1:-1}}
  if(P.gnd&&FF.air&&FF.vyp<-3){const m=Math.min(.8,-FF.vyp/10);if(m>FF.imp*Math.exp(-FF.impT*9)){FF.imp=m;FF.impT=0;FF.impS=1}}
  FF.air=!P.gnd;if(!P.gnd)FF.vyp=P.vy;FF.pvx=vx;FF.pvz=vz;FF.px=P.x;FF.pz=P.z;FF.pv=v;
  let tgt=0,rough=0;
  if(!frozen&&!ui&&cfg.ffOn){const sp=Math.min(1,v/28),a=S.raw;
   tgt=-a*(.12+.5*sp)*(P.gnd?1:.25)*(1-.55*Math.min(1,Math.abs(ls)/6));                       // speed-weighted centring spring
   if(P.gnd&&v>3)tgt+=cl2(ls/5,-1,1)*Math.min(1,v/15)*.7;                                         // self-aligning pull toward the slide (counter-steer)
   if(P.gnd&&v>4&&!onRoad())rough=(Math.random()*2-1)*.14*Math.min(1,v/18)}                       // gravel / kerb rumble off the tarmac
  FF.fb+=cl2(tgt-FF.fb,-14*dt,14*dt);const ie=FF.imp*Math.exp(-FF.impT*9);
  let F=cfg.ffOn&&!ui&&!frozen?cl2(FF.fb+rough+ie*Math.cos(FF.impT*38)*FF.impS*.9,-1,1)*cfg.gain:0;
  FF.impT+=dt;
  if(t){t.t-=dt;F=t.f;if(t.t<=0)FF.test=null}
  if(pr){pr.t+=dt;if(pr.t<.4){F=.3;const d=S.raw-pr.a0;if(d>pr.max)pr.max=d;if(d<pr.min)pr.min=d}else{F=0;if(pr.t>.7){FF.probe=null;
    if(pr.max>.012&&pr.max>-pr.min)FF.st='Force direction OK (wheel moved the right way).';
    else if(pr.min<-.012&&-pr.min>pr.max){cfg.ffInv=!cfg.ffInv;store();FF.st='Force direction was reversed – fixed automatically.'}
    else FF.st='No wheel movement detected: keep your hands off the wheel and try again (or check G HUB is not holding the wheel).'}}}
  FF.acc+=dt;if(FF.acc<.025)return;FF.acc=0;
  if(FF.dev){const b=fbyte(F);if(b===FF.lastB&&++FF.same<20)return;FF.same=0;FF.lastB=b;tx([0x11,0x08,b,0x80,0,0,0])}
  else if(pd.vibrationActuator&&cfg.ffOn&&ie>.25){const n=performance.now();if(n-FF.rum>160){FF.rum=n;try{pd.vibrationActuator.playEffect('dual-rumble',{duration:110,strongMagnitude:Math.min(1,ie),weakMagnitude:Math.min(1,ie)})}catch(e){}}}}
 const ffTest=f=>{if(FF.dev){FF.test={f:f*Math.max(.3,cfg.gain),t:.6};FF.lastB=-1}else FF.st='Connect force feedback first.'};
 const ffProbe=()=>{if(!FF.dev){FF.st='Connect force feedback first.';return}FF.probe={t:0,a0:S.raw,max:0,min:0};FF.st='Testing direction… keep your hands off the wheel.'};
 addEventListener('pagehide',ffStop);addEventListener('blur',ffStop);if(document.addEventListener)document.addEventListener('visibilitychange',()=>{if(document.hidden)ffStop()});
 addEventListener('gamepadconnected',e=>{if(isW(e.gamepad.id)&&pi<0){pi=e.gamepad.index;onConnect(e.gamepad)}});
 addEventListener('gamepaddisconnected',e=>{if(e.gamepad.index===pi){pi=-1;pad=null;S.on=false;ffStop();toast('🎮 Wheel disconnected')}});
 hidAuto();
 // ================= setup screen (key V) =================
 let wz=null,wzT=0;
 const nm=i=>i>=0?'Button '+i:'— unbound —';
 function build(){const st=document.createElement('style');st.textContent='#whz{position:fixed;inset:0;background:#000d;display:none;align-items:center;justify-content:center;z-index:7;font:14px system-ui,sans-serif;color:#fff}#whz .box{background:#14161a;padding:16px 18px;border-radius:12px;width:min(580px,94vw);max-height:92vh;overflow:auto}#whz h3{margin:0 0 8px}#whz h4{margin:14px 0 6px;color:#ffd24a}#whz .r{display:flex;gap:8px;align-items:center;margin:5px 0;flex-wrap:wrap}#whz .r>span{flex:1;min-width:120px}#whz button{padding:6px 11px;border-radius:7px;border:0;cursor:pointer;font-size:13px}#whz .bar{height:10px;background:#333;border-radius:5px;position:relative;flex:2;min-width:140px;overflow:hidden}#whz .bar i{position:absolute;top:0;bottom:0;background:#4aa3ff;left:0;width:0}#whz .msg{background:#2b3f66;padding:7px 10px;border-radius:8px;margin:8px 0;display:none}#whz small{opacity:.7}';document.head.appendChild(st);
  wz=document.createElement('div');wz.id='whz';document.body.appendChild(wz);
  wz.innerHTML='<div class="box"><h3>🎮 Racing wheel setup</h3><div id="wzd"></div><div class="msg" id="wzm"></div>'
  +'<h4>Steering</h4><div class="r"><span>Wheel position <b id="wzsv"></b></span><div class="bar"><i id="wzs"></i></div><button data-a="axw">Detect axis</button></div>'
  +'<div class="r"><span>Wheel range (degrees)</span><select id="wzr"><option>270</option><option>360</option><option>540</option><option>720</option><option>900</option></select></div>'
  +'<div class="r"><span>Full steering lock = <b id="wzlv"></b>° lock-to-lock</span><input type="range" id="wzl" min="180" max="900" step="30"></div>'
  +'<div class="r"><span>Invert steering</span><input type="checkbox" id="wzi"></div>'
  +'<div class="r"><span>Centre offset <b id="wzcev"></b></span><button data-a="cen">Set centre (hold the wheel straight)</button><button data-a="ncen">×</button></div>'
  +'<div class="r"><span>Response curve <b id="wzcuv"></b> <small>(1 = linear; higher = finer near centre)</small></span><input type="range" id="wzcu" min="1" max="2.5" step="0.1"></div>'
  +'<div class="r"><span>Smoothing <b id="wzsmv"></b> ms <small>(0 = none, adds delay)</small></span><input type="range" id="wzsm" min="0" max="150" step="10"></div>'
  +'<h4>Pedals</h4><div class="r"><small>Calibrate measures each pedal released (keep your feet off for a moment), then fully pressed. Reversed axes and pedals sharing one axis (combined mode) are handled.</small></div>'
  +'<div class="r"><span>Throttle <b id="wztv"></b></span><div class="bar"><i id="wzt"></i></div><button data-a="axt">Calibrate</button></div><div class="r"><span>Brake / reverse <b id="wzkv"></b></span><div class="bar"><i id="wzk"></i></div><button data-a="axb">Calibrate</button></div>'
  +'<div class="r"><span>Clutch <b id="wzcv"></b> <small>(shown only: the game has an automatic gearbox)</small></span><div class="bar"><i id="wzc"></i></div><button data-a="axc">Calibrate</button><button data-a="nclu">×</button></div>'
  +'<div class="r"><span>Pedal dead zone <b id="wzdzv"></b>%</span><input type="range" id="wzdz" min="0" max="15" step="1"></div><div class="r"><small id="wzpi"></small></div><div class="r"><small id="wzax" style="font-family:monospace"></small></div>'
  +'<h4>Buttons</h4><div id="wzb"></div><div class="r"><small>Currently pressed: <b id="wzp">–</b></small></div>'
  +'<h4>Force feedback</h4><div class="r"><span id="wzf"></span></div><div class="r"><button data-a="ffc">Connect force feedback</button><button data-a="ftl">Test ◀</button><button data-a="ftr">Test ▶</button><button data-a="ffp">Auto-detect direction</button></div>'
  +'<div class="r"><span>Force strength <b id="wzgv"></b>%</span><input type="range" id="wzg" min="0" max="100" step="5"></div><div class="r"><span>Force feedback on</span><input type="checkbox" id="wzo"></div><div class="r"><span>Reverse force direction</span><input type="checkbox" id="wzv"></div>'
  +'<div class="r" style="margin-top:12px"><button data-a="rst">Reset wheel settings</button><button data-a="cls" style="margin-left:auto">Close (Esc)</button></div></div>';
  const bl=wz.querySelector('#wzb');bl.innerHTML=ACT.map(([a,l])=>'<div class="r"><span>'+l+'</span><b id="wzb_'+a+'"></b><button data-a="b:'+a+'">Bind</button><button data-a="u:'+a+'">×</button></div>').join('');
  wz.addEventListener('click',e=>{const a=e.target&&e.target.dataset&&e.target.dataset.a;if(!a)return;
   if(a==='cls')wzClose();else if(a==='ffc')hidAsk();else if(a==='ftl')ffTest(-1);else if(a==='ftr')ffTest(1);else if(a==='ffp')ffProbe();
   else if(a==='rst'){cfg=DEF();rebuild();store();wzRender()}
   else if(a==='axw')cap={t:'axis',skip:[],msg:'Turn the wheel all the way to the RIGHT and hold it…',fn:(i,b,x)=>{cfg.wheel=i;cfg.wInv=x<b;store();wzRender()}};
   else if(a==='axt')cap={t:'axis',rest:true,skip:[cfg.wheel],msg:'Keep ALL pedals released…',msg2:'Now press the THROTTLE pedal all the way down and hold it…',fn:(i,b,x)=>{cfg.thr=i;cfg.tr=b;cfg.tf=x;store();wzRender()}};
   else if(a==='axb')cap={t:'axis',rest:true,skip:[cfg.wheel],msg:'Keep ALL pedals released…',msg2:'Now press the BRAKE pedal all the way down and hold it…',fn:(i,b,x)=>{cfg.brk=i;cfg.br=b;cfg.bf=x;store();wzRender()}};
   else if(a==='axc')cap={t:'axis',rest:true,skip:[cfg.wheel,cfg.thr,cfg.brk],msg:'Keep ALL pedals released…',msg2:'Now press the CLUTCH pedal all the way down and hold it…',fn:(i,b,x)=>{cfg.clu=i;cfg.cr=b;cfg.cf=x;store();wzRender()}};
   else if(a==='nclu'){cfg.clu=-1;store();wzRender()}
   else if(a==='cen'){cfg.cen=pad?(cfg.wInv?-1:1)*(pad.axes[cfg.wheel]||0):0;store();wzRender()}else if(a==='ncen'){cfg.cen=0;store();wzRender()}
   else if(a.startsWith('dev:')){cfg.dev=S.others[+a.slice(4)]||'';pi=-1;scanT=9;said='';store();wzRender()}
   else if(a.startsWith('b:')){const k=a.slice(2),lb=ACT.find(q=>q[0]===k)[1];cap={t:'btn',msg:'Press the wheel button for “'+lb+'”…',fn:i=>{for(const q of ACT)if(cfg.btn[q[0]]===i)cfg.btn[q[0]]=-1;cfg.btn[k]=i;rebuild();store();wzRender()}}}
   else if(a.startsWith('u:')){cfg.btn[a.slice(2)]=-1;rebuild();store();wzRender()}});
  wz.addEventListener('input',e=>{const id=e.target.id;if(id==='wzcu'||id==='wzsm'){if(id==='wzcu')cfg.curve=+e.target.value;else cfg.smooth=e.target.value/1000;store();wzRender();return}if(id==='wzr'){cfg.range=+e.target.value;store();if(FF.dev)ffInit(FF.dev)}else if(id==='wzl')cfg.lock=+e.target.value;else if(id==='wzdz')cfg.pdz=e.target.value/100;else if(id==='wzi')cfg.wInv=e.target.checked;else if(id==='wzg')cfg.gain=e.target.value/100;else if(id==='wzo'){cfg.ffOn=e.target.checked;if(!cfg.ffOn)ffStop()}else if(id==='wzv'){cfg.ffInv=e.target.checked}else return;store();wzRender()})}
 function wzRender(){const q=s=>wz.querySelector(s);q('#wzr').value=cfg.range;q('#wzl').value=cfg.lock;q('#wzlv').textContent=cfg.lock;q('#wzi').checked=cfg.wInv;q('#wzg').value=Math.round(cfg.gain*100);q('#wzgv').textContent=Math.round(cfg.gain*100);q('#wzo').checked=cfg.ffOn;q('#wzv').checked=cfg.ffInv;q('#wzdz').value=Math.round(cfg.pdz*100);q('#wzdzv').textContent=Math.round(cfg.pdz*100);q('#wzcev').textContent=((cfg.cen||0)>=0?'+':'')+((cfg.cen||0)*100).toFixed(1)+'%';q('#wzcu').value=cfg.curve||1;q('#wzcuv').textContent=(cfg.curve||1).toFixed(1);q('#wzsm').value=Math.round((cfg.smooth||0)*1000);q('#wzsmv').textContent=Math.round((cfg.smooth||0)*1000);
  q('#wzpi').textContent='Throttle: '+(cfg.thr>=0?'axis '+cfg.thr:'not calibrated')+' · Brake: '+(cfg.brk>=0?'axis '+cfg.brk:'not calibrated')+(cfg.thr>=0&&cfg.thr===cfg.brk?' (combined pedal axis)':'')+' · Clutch: '+(cfg.clu>=0?'axis '+cfg.clu:'not set');
  for(const[a]of ACT)q('#wzb_'+a).textContent=nm(cfg.btn[a]);}
 function wzLive(){if(!wz)return;const q=s=>wz.querySelector(s),m=q('#wzm');
  q('#wzd').innerHTML=!hasGP()?'<small>This browser does not provide the Gamepad API, so no wheel input can be read. Use Chrome or Edge on a desktop.</small>':S.blocked==='gamepad'?'<small>The browser blocked gamepad access for this embedded page. Open the game in its own tab/window.</small>':(pad?'Device: <b>'+pad.id+'</b> · <span style="color:#7fd68a">input live</span>':'<small style="color:#ffcf6b">No wheel detected: the readings below are not live. Turn the wheel or press a wheel button so the browser reports it (Chrome / Edge on desktop; close G HUB profiles that capture the wheel).</small>'+(S.others.length?'<br><small>Other controllers seen:</small> '+S.others.map((d,i)=>'<button data-a="dev:'+i+'">Use '+d.replace(/\s*\(.*$/,'').slice(0,40)+'</button>').join(' '):''));
  q('#wzs').style.cssText='left:'+((S.raw+1)/2*100-1.5).toFixed(1)+'%;width:3%';q('#wzt').style.width=(S.thr*100).toFixed(0)+'%';q('#wzk').style.width=(S.brk*100).toFixed(0)+'%';q('#wzc').style.width=(S.clu*100).toFixed(0)+'%';
  const lv=!!pad;q('#wzsv').textContent=lv?(S.steer>=0?'+':'')+(S.steer*100).toFixed(0)+'%':'–';q('#wztv').textContent=lv?(S.thr*100).toFixed(0)+'%':'–';q('#wzkv').textContent=lv?(S.brk*100).toFixed(0)+'%':'–';q('#wzcv').textContent=lv&&cfg.clu>=0?(S.clu*100).toFixed(0)+'%':'–';
  q('#wzax').textContent=pad?'raw axes: '+Array.from(pad.axes,(v,i)=>i+':'+(v>=0?'+':'')+v.toFixed(2)).join(' '):'';
  m.style.display=cap?'block':'none';if(cap)m.textContent=cap.msg;q('#wzf').textContent=FF.st;
  let pr='';if(pad)for(let i=0;i<pad.buttons.length;i++)if(pad.buttons[i].pressed)pr+=i+' ';q('#wzp').textContent=pr||'–'}
 function wzOpen(){if(ui&&!wzOn)return;if(!wz)build();wzOn=true;ui=true;for(const k in keys)keys[k]=0;wz.style.display='flex';wzRender();wzLive();clearInterval(wzT);wzT=setInterval(wzLive,100)}
 function wzClose(){wzOn=false;cap=null;if(wz)wz.style.display='none';clearInterval(wzT);ui=false;cfg.setup=true;store()}
 addEventListener('keydown',e=>{if(e.target&&e.target.tagName==='INPUT'&&e.target.type!=='range'&&e.target.type!=='checkbox')return;
  if(e.code==='KeyV'&&!e.repeat){if(wzOn)wzClose();else wzOpen();return}
  if(wzOn&&e.code==='Escape'){if(cap)cap=null;else wzClose();ui=true;if(!wzOn)ui=false}});
 return{poll,ffb,open:wzOpen,cfg:()=>cfg,state:S,ff:FF,hidAsk,ffStop,ffTest,ffProbe,_cap:()=>cap,_setCap:c=>{cap=c}}
})();
