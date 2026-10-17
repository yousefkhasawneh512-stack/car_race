// ---- v41: Handling mode (key H). Arcade = the v37 updP, untouched (default; tests/off_trace.js proves it). Realistic = engine torque curve,
// automatic gearbox, drivetrain traction limit with longitudinal load transfer, aero drag + rolling resistance, engine braking, power-oversteer
// (RWD) / understeer (FWD) under wheelspin, and a sprung body (pitch / roll / heave spring-dampers, per-car frequency).
// EVERY number here is a GAMEPLAY ESTIMATE built from the game's own car data (PORS top speed + 0-100 time + dimensions) and carSpec()
// (estimated mass, documented-or-estimated drivetrain, engine position). Peak torque and drag area are SOLVED so that each car still reaches its
// listed top speed and 0-100 time (ptCalib); redline, gear count, ratios, tyre mu and spring frequency come from the body type. No manufacturer
// torque curve, gear ratio or spring rate is claimed. The calibration error per car is in CAR_ASSETS_AND_SPECS.md (tests/handling_test.js).
const HSTORE='irbid-drive-handling-v1';let handlingMode=0;try{handlingMode=localStorage.getItem(HSTORE)==='1'?1:0}catch(e){}
const PT_CACHE=new Map(),PTS={h0:0,gear:1,rpm:850,shift:0,spin:0,lim:0,hz:0,hv:0,pz:0,pv:0,rz:0,rv:0,idx:-1};
const PT_CD={r:.4,m:.33,q:.33,c:.31,o:.36,s:.38,p:.45,h:.32,v:.42},PT_RED={r:9000,m:8500,q:8500,c:7200,o:7000,s:6200,p:6000,h:6500,v:5500},PT_MU={r:1.3,m:1.15,q:1.15,c:1.05,o:1,s:.95,p:.9,h:.95,v:.85},PT_FN={r:2.8,m:2.1,q:2.1,c:1.8,o:1.6,s:1.3,p:1.25,h:1.5,v:1.2};
// generic engine torque shape vs x = rpm/redline (petrol NA/turbo blend), EV: constant torque, then constant power
const ptCurve=(x,ev)=>ev?(x<.35?1:.35/x):x<.12?.5:x<.6?.55+.45*Math.sin((x-.12)/.48*Math.PI/2):x<.85?1:Math.max(.6,1-(x-.85)*1.3);
function ptGear(s,v,g){return v*s.ratio[g-1]/s.rw*60/(2*Math.PI)}   // engine rpm at road speed v in gear g (clutch locked)
// one 0-100 run on dry asphalt (used for calibration and by tests); returns seconds
function ptRun(s,T,CdA){let v=0,t=0,g=1,sh=0;const dt=1/120,vt=s.vt||27.78;while(v<vt&&t<60){let F=0;
  if(sh>0)sh-=dt;else{let rpm=Math.max(ptGear(s,v,g),s.ev?0:s.red*.45);if(rpm>=s.red*.97&&g<s.ng){g++;sh=s.shiftT;continue}rpm=Math.min(rpm,s.red);
   F=T*ptCurve(rpm/s.red,s.ev)*s.ratio[g-1]/s.rw*s.eff}
  const a0=Math.min(Math.max(0,F/s.m),s.mu*9.81*ptShare(s,0)),lim=s.mu*9.81*ptShare(s,a0);F=Math.min(F,lim*s.m);   // load transfer from the ACHIEVABLE acceleration
  v+=(F-.5*1.2*CdA*v*v-s.crr*s.m*9.81)/s.m*dt;t+=dt}return t*(s.vt?27.78/s.vt:1)}   // slow cars: time to 80 % of top speed, scaled to a 0-100 equivalent
function ptShare(s,a){const d=a*s.hcg/(s.wb*9.81);return s.drive==='AWD'?1:s.drive==='FWD'?cl(s.fw-d,.2,.9):cl(1-s.fw+d,.2,.9)}
function ptSpec(i){let s=PT_CACHE.get(i);if(s)return s;const m=PORS[i],cs=carSpec(i),k=m[6],vmax=m[1]/3.6*.98,ev=cs.ev;
 const red=ev?15000:PT_RED[k]||6800,ng=ev?1:k==='r'?6:vmax<45?4:vmax<56?5:(k==='m'||k==='q')?7:6,rw=cl(.29+.06*(m[5]-1.2),.28,.4);
 const top=red*.97*2*Math.PI/60*rw/(vmax*1.02),first=ng===1?top:top*(vmax*1.02)/(vmax*({4:.36,5:.31,6:.27,7:.23}[ng]||.27)),ratio=[];
 for(let g=1;g<=ng;g++)ratio.push(ng===1?top:first*Math.pow(top/first,(g-1)/(ng-1)));
 s={i,ev,red,idle:ev?0:850,ng,ratio,rw,m:cs.mass+75,mu:PT_MU[k]||1,crr:k==='r'?.011:.013,eff:ev?.92:.88,drive:cs.drive,fw:cs.fw,hcg:cs.hcg,wb:cs.wb,
  shiftT:ev?0:k==='r'||k==='m'||k==='q'?.12:k==='c'||k==='o'?.2:.3,fn:PT_FN[k]||1.5,zeta:k==='r'?.55:k==='s'||k==='p'||k==='v'?.32:.42,vmax,t100:m[2],T:0,CdA:0,err:0,cdaMax:.85*m[4]*m[5]*(PT_CD[k]||.34),gov:0,src:'estimate (solved from game top speed + 0-100)'};
 if(vmax<=105/3.6)s.vt=.8*vmax;   // listed top speed <= 105 km/h: a 0-100 time cannot exist, calibrate to 80 % of top speed
 {const need=27.78/s.t100,mu0=s.mu;s.mu=cl(Math.max(mu0,1.3*need/(9.81*ptShare(s,need))),.8,1.7);s.muSrc=s.mu>mu0+.001?'raised so the listed 0-100 is physically possible':'body-type default'}   // tyre mu (estimate)
 ptCalib(s);PT_CACHE.set(i,s);return s}
// solve peak torque T (bisection on the 0-100 time) with drag area CdA re-derived each step from the power available at top speed
function ptCalib(s){const x=.97/1.02,pw=T=>T*ptCurve(x,s.ev)*s.red*x*2*Math.PI/60*s.eff,cda=T=>cl((pw(T)-s.crr*s.m*9.81*s.vmax)/(.5*1.2*Math.pow(s.vmax,3)),.25,1.6);
 // traction-limited cars cannot beat a grip-defined best time: aim for max(listed, best*1.03) with the SMALLEST torque (no wheelspin in every gear)
 const tgt=Math.max(s.t100,ptRun(s,4000,cda(4000))*1.03);let lo=2,hi=4000;for(let it=0;it<28;it++){const T=(lo+hi)/2;if(ptRun(s,T,cda(T))>tgt)lo=T;else hi=T}s.T=hi;s.CdA=cda(hi);if(s.CdA>s.cdaMax*1.15){s.CdA=s.cdaMax;s.gov=s.vmax}s.err=ptRun(s,s.T,s.CdA)-s.t100}   // drag above a plausible Cd*area => the listed top speed is a limiter (governor), not drag
// longitudinal acceleration for this frame (throttle, gearbox, traction limit, drag, rolling, engine braking). Called by updP only in Realistic mode
function ptAccel(dt,thA,fs,sfc,dfx){const s=ptSpec(P.idx||0),m=PORS[P.idx||0],kv=Math.max(.3,(P.vm/(m[1]/3.6*.98))*dfx.maxSpeed),ka=(P.a0/Math.min(11,27.8/m[2]*1.1))*dfx.accel,v=Math.max(0,fs);
 if(PTS.idx!==s.i){PTS.idx=s.i;PTS.gear=1;PTS.shift=0;PTS.spin=0}
 const red=s.red,idl=s.idle;let g=PTS.gear,rpm=ptGear(s,v,g)/kv;
 if(PTS.shift>0)PTS.shift-=dt;
 else if(g<s.ng&&rpm>=red*(thA>.6?.97:.6)){PTS.gear=++g;PTS.shift=s.shiftT;rpm=ptGear(s,v,g)/kv}
 else if(g>1&&ptGear(s,v,g-1)/kv<red*(thA>.6?.86:.5)&&rpm<red*(thA>.6?.55:.3)){PTS.gear=--g;PTS.shift=s.shiftT*.6;rpm=ptGear(s,v,g)/kv}
 let F=0;const eng=Math.max(rpm,idl),gov=s.gov&&v>=s.gov*kv;
 if(PTS.shift<=0&&thA>0&&!gov){const r=Math.min(Math.max(eng,v<6&&g===1&&!s.ev?red*.45*thA:0),red);F=s.T*ka*thA*ptCurve(r/red,s.ev)*s.ratio[g-1]/s.rw*s.eff}
 else if(thA<=0&&PTS.shift<=0&&!s.ev&&v>1)F=-s.T*.12*(eng/red)*s.ratio[g-1]/s.rw;           // engine braking (EV regen not modelled)
 const al=cl(P.al||0,-12,12),lim=s.mu*sfc*9.81*ptShare(s,Math.max(0,al))*s.m;PTS.lim=lim;
 if(F>lim){PTS.spin=Math.min(1,PTS.spin+dt*4*(F/lim-1)+dt);F=lim*.9}else PTS.spin=Math.max(0,PTS.spin-dt*3);
 PTS.rpm=PTS.spin>.2?Math.min(red,Math.max(eng,red*(.55+.4*PTS.spin))):Math.min(eng,red);
 return(F-.5*1.2*s.CdA/(kv*kv*kv)*v*v*Math.sign(fs)-s.crr*s.m*9.81*Math.sign(fs)*(Math.abs(fs)>.3?1:0))/s.m}
// sprung body: pitch / roll / heave spring-dampers driven by acceleration and by bumps (PTS.hv/pv impulses). Visual + a smaller bump hop.
function ptBody(dt,frozen,fs){const s=ptSpec(P.idx||0),w=2*Math.PI*s.fn,z=s.zeta,k2=(1.8/s.fn)*(1.8/s.fn);
 const yr=wrap(P.h-PTS.h0)/Math.max(dt,1e-4),al=P.gnd&&!frozen?cl(P.al,-12,8):0,ay=P.gnd&&!frozen?cl(fs*yr,-12,12):0,tp=-al*.0026*k2,tr=ay*.0075*k2,h=Math.min(dt,1/30);
 PTS.pv+=(w*w*(tp-PTS.pz)-2*z*w*PTS.pv)*h;PTS.pz+=PTS.pv*h;PTS.rv+=(w*w*(tr-PTS.rz)-2*z*w*PTS.rv)*h;PTS.rz+=PTS.rv*h;PTS.hv+=(-w*w*PTS.hz-2*z*w*PTS.hv)*h;PTS.hz+=PTS.hv*h;
 PTS.h0=P.h;PTS.pz=cl(PTS.pz,-.09,.09);PTS.rz=cl(PTS.rz,-.1,.1);PTS.hz=cl(PTS.hz,-.12,.12);
 P.m.position.y=P.y+PTS.hz;P.m.rotation.set(P.pitch+PTS.pz,P.h,PTS.rz)}
// a bump crossing in Realistic mode: the suspension absorbs it (heave + pitch impulse); only a limited hop when taken too fast
function ptBump(speed){const s=ptSpec(P.idx||0),soft=1.6/s.fn;PTS.hv+=Math.min(.9,speed*.05)*soft;PTS.pv-=Math.min(.6,speed*.03)*soft;return speed>8?cl((speed-8)*.045,0,.7)*(s.fn/1.6):0}
// wheelspin changes the balance: RWD rears lose side grip (power oversteer), FWD fronts lose steering (understeer), AWD a little of both
function ptLat(){const d=ptSpec(P.idx||0).drive,k=PTS.spin;return d==='RWD'?1-.65*k:d==='AWD'?1-.2*k:1}
function ptSteer(){const d=ptSpec(P.idx||0).drive,k=PTS.spin;return d==='FWD'?1-.45*k:d==='RWD'?1+.25*k:1}
function ptHud(){if(!handlingMode)return'';const s=ptSpec(P.idx||0);return'<small>'+(s.ev?'EV':'G'+PTS.gear)+' · '+Math.round(PTS.rpm/100)*100+' rpm'+(PTS.spin>.25?' · wheelspin':'')+'</small>'}
function setHandling(mo){handlingMode=mo?1:0;try{localStorage.setItem(HSTORE,String(handlingMode))}catch(e){}PTS.idx=-1;PTS.hz=PTS.hv=PTS.pz=PTS.pv=PTS.rz=PTS.rv=0;toast(handlingMode?'Handling: Realistic (engine, gears, traction, suspension; estimates)':'Handling: Arcade')}
addEventListener('keydown',e=>{if(e.code==='KeyH'&&!e.repeat&&!(e.target&&e.target.tagName==='INPUT')&&!ui){e.preventDefault();setHandling(!handlingMode)}});
