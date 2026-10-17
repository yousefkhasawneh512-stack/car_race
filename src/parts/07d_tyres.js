// ---- per-wheel tyre model (v39): load, slip, temperature, tread and carcass for each wheel; burnouts by drivetrain ----
// A slip ESTIMATOR on top of the arcade updP (the game has no wheel-rotation or Pacejka tyre model). Every frame it derives each wheel's
// vertical load (static split + longitudinal/lateral weight transfer), longitudinal slip (drive force beyond traction, burnout spin,
// handbrake lock, ABS-limited braking) and lateral slip (from the car's sideslip and yaw rate), then integrates heat and wear from the
// slip power. It runs in Cosmetic and Full; its grip only acts on driving in Full (damageEffects). All coefficients are gameplay estimates.
const TYRE_AMB=25,TY_WEAR=5.5e-5,TY_HEAT=6e-4;
const TYS={thr:0,burn:false,burnT:0,h0:null,yaw:0,smk:0,fz:new Float32Array(4),sl:new Float32Array(4),sa:new Float32Array(4),pw:new Float32Array(4),mu:new Float32Array([1,1,1,1])};
// grip factor of one tyre (1 = new and in its working range): tread below 50 %, overheating above 110 C, a damaged carcass, or a puncture
function tyreMu(w){if(w.punct)return .35;const t=w.tread,tf=t>=50?1:t>=5?.78+.22*(t-5)/45:.6+.18*t/5,T=w.temp,hf=T<=110?1:cl(1-(T-110)/180,.7,1),cf=w.health>=60?1:.75+.25*w.health/60;return tf*hf*cf}
function tyreReset(){TYS.h0=null;TYS.burn=false;TYS.burnT=0;TYS.thr=0}
// Burnout = throttle + brake at (near) standstill where the drivetrain can overpower the driven wheels' traction plus whatever holds them:
// the foot brake holds every axle (front-biased ~68/32), the handbrake only the rear. So RWD cars burn out on the foot brake if they are
// strong enough, FWD cars need the handbrake, AWD cars rarely manage. Off mode never does this (physics identical to v37).
function burnoutState(th,thA,br,brA,hb,fs){
 TYS.burn=false;if(damageMode===0||!th||!P.gnd||Math.abs(fs)>2.5||!(br||hb))return false;
 const sp=carSpec(P.idx||0),m=sp.mass,g=9.81,mu=surfK(),Ff=m*g*sp.fw*mu,Fr=m*g*(1-sp.fw)*mu,b=br?(brA||1):0,
  holdF=.68*m*P.bk*b,holdR=.32*m*P.bk*b+(hb?.22*m*g:0),Fd=m*P.a0*1.8*(thA||1)*(damageMode===2?damageEffects().accel:1),
  need=sp.drive==='FWD'?Ff+holdF:sp.drive==='RWD'?Fr+holdR:Ff+Fr+holdF+holdR;
 TYS.burn=Fd>need;return TYS.burn}
let tySmA=0;
function tyreSmoke(j,sp,amt){if(typeof SMK==='undefined'||!SMK.length)return;const sh=Math.sin(P.h),ch=Math.cos(P.h),zw=(j<2?1:-1)*sp.L*.31,xw=(j%2===0?1:-1)*(sp.W/2-.12),
 s=SMK[smI=(smI+1)%SMN],u=s.userData;u.age=0;u.life=1.2+Math.random()*.8;u.s0=.8+amt*1.6+Math.random()*.4;u.o=.32+.2*amt;s.material.color.setRGB(.93,.93,.93);
 u.vx=(Math.random()-.5)*1.2-sh*.6;u.vz=(Math.random()-.5)*1.2-ch*.6;u.vy=.5+Math.random()*.7;s.position.set(P.x+sh*zw+ch*xw,groundH(P.x,P.z)+.3,P.z+ch*zw-sh*xw);s.visible=true;s.scale.set(u.s0*.5,u.s0*.5,1)}
function tyreStep(dt,thr,brk,hb,st,fs,ls,frozen){
 TYS.thr=thr;if(damageMode===0||!(dt>0))return;
 const s=currentDamageRecord(),sp=carSpec(P.idx||0),W=s.wheels,m=sp.mass,g=9.81,au=Math.abs(fs);
 if(!P.gnd||frozen){for(const w of W)w.temp=Math.max(TYRE_AMB,w.temp-(w.temp-TYRE_AMB)*.05*dt);TYS.h0=P.h;TYS.burn=false;return}
 if(TYS.h0===null)TYS.h0=P.h;const r=wrap(P.h-TYS.h0)/dt;TYS.h0=P.h;TYS.yaw=r;
 const v=-ls,sfc=surfK(),road=sfc>=1,ax=cl(P.al,-12,12),ay=cl(fs*r,-12,12),dX=m*ax*sp.hcg/sp.wb,dY=m*ay*sp.hcg/sp.tr,sf=m*g*sp.fw/2,sr=m*g*(1-sp.fw)/2,F=TYS.fz;
 // load per wheel: accelerating moves load rearward, a left turn (ay > 0) moves it to the right-hand wheels
 F[0]=sf-dX/2-dY/2;F[1]=sf-dX/2+dY/2;F[2]=sr+dX/2-dY/2;F[3]=sr+dX/2+dY/2;for(let j=0;j<4;j++)if(F[j]<50)F[j]=50;
 // lateral slip velocity: rear axle from sideslip + yaw (v - r*wb/2); the fronts slip less while counter-steering a slide (estimate)
 const vr=Math.abs(v-r*sp.wb/2),slide=Math.abs(Math.atan2(v,au+.5))>.15,vf=slide?vr*.55:vr,latG=Math.min(1,Math.abs(ay)/g);
 const dF=sp.drive!=='RWD',dR=sp.drive!=='FWD',nd=(dF?2:0)+(dR?2:0),spin=TYS.burn?cl(P.a0*2.4,5,24)*thr:0;
 const demand=thr>0&&!TYS.burn?m*P.a0*1.8*thr*Math.max(0,1-Math.pow(Math.max(fs,0)/(P.vm*1.05),2.5)):0;
 if(TYS.burn)TYS.burnT+=dt;let blown=-1;
 for(let j=0;j<4;j++){const front=j<2,isD=front?dF:dR,w=W[j],mu=tyreMu(w)*sfc,cap=mu*F[j];TYS.mu[j]=mu;let sl=0,fl=0;
  if(isD&&TYS.burn){sl=spin;fl=cap}
  else if(isD&&demand>0){const e=demand/nd-cap;if(e>0){sl=Math.min(18,e/cap*6);fl=cap}}
  if(!front&&hb&&au>1){sl=Math.max(sl,au);fl=cap}                                   // handbrake locks the rear wheels
  else if(brk>.6&&au>3&&!TYS.burn){sl=Math.max(sl,.08*au);fl=Math.max(fl,F[j]*Math.min(1,P.bk*brk/g))}   // ABS-limited braking slip
  const sa=front?vf:vr,fa=slide?cap:F[j]*Math.min(mu,latG),pl=fl*sl,pa=fa*sa,pw=pl+pa;TYS.sl[j]=sl;TYS.sa[j]=sa;TYS.pw[j]=pw;
  // heat: slip power in; convection (faster when rolling) and a steep loss above 150 C out
  w.temp=cl(w.temp+(pw*TY_HEAT*sp.tyre.heat*(road?1:.8)-(w.temp-TYRE_AMB)*(.05+.006*au)-Math.max(0,w.temp-150)*.5)*dt,TYRE_AMB-5,320);
  // wear: strongly non-linear in slip power and faster when hot; abrasive unpaved ground adds more; plus a tiny rolling wear per metre
  const tm=1+Math.max(0,(w.temp-90)/45)**2,kw=Math.pow(pw/1000,2)*TY_WEAR*tm*(road?1:1.6)/sp.tyre.dur*dt,roll=au*dt*2.5e-6*(road?1:3);
  w.tread=Math.max(0,w.tread-kw-roll);w.wear.roll+=roll;w.km+=au*dt/1000;if(w.temp>w.tmax)w.tmax=w.temp;
  if(kw>0){const fa2=pa/(pw||1),lw=kw*(1-fa2);w.wear.slide+=kw*fa2;if(TYS.burn&&isD)w.wear.burn+=lw;else if(!front&&hb&&au>1)w.wear.lock+=lw;else w.wear.spin+=lw}
  // the carcass suffers once the tread is gone or the rubber blisters; below 10 % it fails (blow-out)
  if(w.tread<3&&pw>2000)w.health=Math.max(0,w.health-pw/1000*.25*dt);if(w.temp>230)w.health=Math.max(0,w.health-(w.temp-230)*.05*dt);
  if(!w.punct&&w.health<10){w.punct=true;blown=j}}
 if(TYS.burn||(spin===0&&TYS.sl[2]+TYS.sl[3]+TYS.sl[0]+TYS.sl[1]>12)){tySmA+=dt*(TYS.burn?22:8);while(tySmA>=1){tySmA-=1;for(let j=0;j<4;j++)if(TYS.sl[j]>4)tyreSmoke(j,sp,Math.min(1,TYS.sl[j]/20))}}
 if(blown>=0){syncAggregates(s);persistDamage();updateDamageButton();refreshDamageVisual();toast('💥 Tyre '+WHEEL_NAMES[blown]+' failed — the car will pull and lose grip')}
}
