const LIMIT=50;
// ---- laws / fines (road-aware: lanes, one-way rings, signalled junctions, per-road limits) ----
let last={},curL=null,RI=null,curLim=50;const toastEl=document.getElementById('toast');
function toast(m){const d=document.createElement('div');d.textContent=m;toastEl.appendChild(d);setTimeout(()=>d.remove(),3200)}
function fine(k,a,m,cd){if(clock-(last[k]??-99)<cd)return;last[k]=clock;fines+=a;save();toast(m+' — fine '+a+' JD')}
const driftZoneAt=(x,z)=>{for(const q of DZONES){if(q.hw){const dx=x-q.x,dz=z-q.z,lx=dx*q.c-dz*q.s,lz=dx*q.s+dz*q.c;if(Math.abs(lx)<q.hw&&Math.abs(lz)<q.hd)return q}else if(Math.hypot(x-q.x,z-q.z)<q.r)return q}return null},inDrift=(x,z)=>!!driftZoneAt(x,z);const onRoad=()=>!!RI&&RI.d<=RI.e.w/2+.3;
function streetName(){for(const c of CIRC)if(Math.hypot(P.x-c.x,P.z-c.z)<36)return c.name;return RI&&RI.d<=RI.e.w/2+5?RI.e.name:''}
function wrongWay(){const s=RI;if(!s||s.d>s.e.w/2||s.n!==1)return false;const e=s.e;if(e.kind==='alley'||e.kind==='svc'||e.kind==='campus'||e.kind==='drift'||e.kind==='ring')return false;
 const u=e.cum[s.i]+s.t*(e.cum[s.i+1]-e.cum[s.i]);if(u<18||e.len-u<18)return false;const al=P.vx*s.tx+P.vz*s.tz;if(e.ow)return al<-4;return(al>4&&s.side<-1)||(al<-4&&s.side>1)}
function redLight(sp){let near=null;for(const nd of LIT)if(Math.hypot(P.x-nd.x,P.z-nd.z)<12){near=nd;break}
 if(near&&curL===null&&P.y<1.5&&sp>14){const v=Math.hypot(P.vx,P.vz)||1,vx=P.vx/v,vz=P.vz/v;let best=null,bd=-2;for(const e of near.inn){const h=approachOf(near,e),dd=h[0]*vx+h[1]*vz;if(dd>bd){bd=dd;best=e}}
  if(best&&bd>.5&&light(near.ph[best.id],near)==='r')fine('red',50,'Ran a red light',3)}curL=near?near.id:null}
// ---- teleports: landmark tour (K), stunt ramps (J), reset (F) ----
const ringSpot=c=>c?[c.x+c.r,c.z,Math.PI]:null;
const rsp=(name,x,z)=>{const s=roadSpot(name,x,z);return[s.x+s.nx*s.w/4,s.z+s.nz*s.w/4,Math.atan2(s.tx,s.tz)]};
const monoC=id=>CIRC.find(c=>c.mono===id),LM=[];
[['Nabulsi Circle',()=>ringSpot(monoC('N'))],['Al-Balad souks',()=>rsp('Souq Al-Balad Lane',...RA.balad)],['Al-Qubbah Circle',()=>ringSpot(monoC('Q'))],['Irbid Park',()=>rsp('Park South Street',(PARK.x0+PARK.x1)/2,(PARK.z0+PARK.z1)/2)],['Arbila Mall',()=>rsp('King Abdullah II Street',MALL.x,MALL.z)],['University Circle',()=>ringSpot(monoC('C'))],
 ['Yarmouk University gate',()=>rsp('Yarmouk Main Gate Road',YUC[0],YUC[1])],['Al-Thaqafah Circle',()=>ringSpot(monoC('T'))],['Abd Al-Hameed Sharaf Street',()=>rsp('Thalatheen Street',...O(-492,1291))],['King Hussein Street (east)',()=>rsp('Petra Street',...O(2200,300))],['Aidun',()=>rsp('Aidun Main Street',...RA.aydun)],['JUST (far east)',()=>rsp('JUST Ring Road',JC[0],JC[1])],['Jadara University',()=>rsp('Jadara Access Road',HC[0],HC[1])],['Amman–Irbid Highway',()=>rsp('Amman–Irbid Highway (Route 35)',...O(1000,3500))],['Industrial District (Al-Sinaa)',()=>rsp('Hakama Street',...RA.sinaa)],['Irbid National University',()=>rsp('INU Campus Ring',INC[0],INC[1])]].forEach(([n,f])=>{try{const q=f();if(q)LM.push([n,...q])}catch(e){console.warn('tour stop skipped',n,e.message)}});PLACES.forEach(p=>{if(p.tour&&p.tp&&!LM.some(l=>l[0]===p.name))LM.push([p.name,p.tp[0],p.tp[1],p.tp[2]])});let lmI=0;
function warp(x,z,h){P.x=x;P.z=z;P.h=h;P.vx=P.vz=P.vy=0;P.y=P.pgh=groundH(x,z);cam.position.set(x-Math.sin(h)*9,P.y+3.6,z-Math.cos(h)*9)}
// ---- player ----
const keys={};addEventListener('keydown',e=>{if(e.target&&e.target.tagName==='INPUT')return;if(e.code==='KeyP'){e.preventDefault();TuningShopInterface.toggleShopMenu();return}if(ui){if(e.code==='Escape'){closeWheel();closeShop()}return}keys[e.code]=1;if(e.code.startsWith('Arrow')||e.code==='Space')e.preventDefault();
 if(e.code==='KeyN'||e.code==='KeyB')cycleCar(e.code==='KeyN'?1:-1);if(e.code==='KeyG')openWheel();if(e.code==='KeyE')tryRob();if(e.code==='KeyU')openShop();if(e.code==='KeyM'){e.preventDefault();navFocus()}
 if(e.code==='KeyK'&&heist.s==='idle'){const L=LM[lmI++%LM.length];warp(L[1],L[2],L[3]);toast('📍 '+L[0])}if(e.code==='KeyJ'&&heist.s==='idle')warp(RAMP0[0]+50,RAMP0[1]-70,0);
 if(e.code==='KeyC')camMode^=1;if(e.code==='KeyT')hour=(hour+1)%24;if(e.code==='KeyR'){const c=(race.s==='idle'||race.s==='done')?nearCar():null;c?startDuel(c):startRace()}if(e.code==='KeyF')warp(START.x,START.z,START.h)});
addEventListener('keyup',e=>keys[e.code]=0);let camMode=0;
// touch/iOS driving input (filled by iOSBypassEngine in 10b_ios_touch.js); all idle on PC
const MobilePCInputController={steeringAngle:0,isAccelerating:false,isBraking:false,isHandbrake:false,sig:function(){return[this.steeringAngle,this.isAccelerating,this.isBraking,this.isHandbrake].join()}};
// traction by surface under the car: 1 paved road / drift pad, .75 unpaved track, .9 urban ground off-network, .65 open ground (no surface tag is carried in the network data yet; see audit)
function surfK(){if(inDrift.was)return 1;const r=RI;if(r&&r.e&&r.d<=r.e.w/2+.3)return r.e.hw==='track'?.75:1;return urbanK(P.x,P.z)>.5?.9:.65}
function updP(dt,frozen){if(![P.x,P.y,P.z,P.vx,P.vz,P.vy,P.h].every(isFinite)){warp(START.x,START.z,START.h);P.y=P.pgh=groundH(START.x,START.z)}const k=ui?{}:keys,mi=ui?{}:MobilePCInputController,wp=WH.poll(dt),wi=ui?WHN:wp,dg=k.KeyW||k.ArrowUp||mi.isAccelerating,db=ui||k.KeyS||k.ArrowDown||mi.isBraking,th=dg||wi.thr>0,thA=dg?1:wi.thr,br=db||wi.brk>0,brA=db?1:wi.brk,hb=k.Space||mi.isHandbrake||wi.hb,dfx=typeof damageEffects==='function'?damageEffects():{maxSpeed:1,accel:1,steering:1,grip:1,brakes:1,lat:1,pull:0};let st=((k.KeyA||k.ArrowLeft||mi.steeringAngle<0)?1:0)-((k.KeyD||k.ArrowRight||mi.steeringAngle>0)?1:0);if(!st&&wi.on)st=-wi.steer;
 let fx=Math.sin(P.h),fz=Math.cos(P.h),fs=P.vx*fx+P.vz*fz;
 P.h+=st*1.8*P.hd*dfx.steering/(1+Math.abs(fs)/18)*cl(fs/4,-1,1)*(hb?1.5:1)*(P.gnd?1:.2)*(handlingMode?ptSteer():1)*dt;if(dfx.pull&&P.gnd&&!frozen)P.h+=dfx.pull*cl(fs/12,-1,1)*dt;
 fx=Math.sin(P.h);fz=Math.cos(P.h);const rx=-fz,rz=fx;fs=P.vx*fx+P.vz*fz;let ls=P.vx*rx+P.vz*rz;
 const sfc=surfK()*dfx.grip,vmEff=Math.max(2,P.vm*dfx.maxSpeed),aEff=P.a0*dfx.accel,bkEff=P.bk*dfx.brakes,slp=(TH(P.x+fx*2,P.z+fz*2)-TH(P.x-fx*2,P.z-fz*2))/4,pfs=fs;
 const bo=P.gnd&&!frozen&&typeof burnoutState==='function'&&burnoutState(th,thA,br,brA,hb,fs);
 if(P.gnd&&!frozen){if(bo)fs*=Math.exp(-5*dt);else{if(handlingMode&&fs>-.5&&!(br&&fs<=.5))fs+=ptAccel(dt,th?thA:0,fs,sfc,dfx)*dt;else if(th){let ac=aEff*thA*(1-Math.pow(Math.max(fs,0)/(vmEff*1.05),2.5))*(.5+.5*sfc);if(fs<0)ac=Math.min(ac*2,bkEff*sfc);fs+=ac*dt}
  if(br){if(fs>.5)fs=Math.max(0,fs-bkEff*sfc*dt*brA);else fs=Math.max(-10,fs-3.5*dt*brA)}}
  if(!(bo||Math.abs(fs)<1&&!th&&(br||hb||Math.abs(slp)<.15)))fs-=9.81*slp/Math.sqrt(1+slp*slp)*dt;if(sfc<1&&Math.abs(fs)>.5)fs-=Math.sign(fs)*(1-sfc)*1.5*dt;
  if(dfx.roll&&Math.abs(fs)>.3)fs-=Math.sign(fs)*Math.min(Math.abs(fs)-.3,dfx.roll*dt);if(hb)fs*=1-.8*dt;if(!handlingMode){if(Math.abs(fs)>.5)fs-=Math.sign(fs)*.5*dt;fs-=fs*.012*dt}ls*=Math.exp(-(hb?1.1:(th&&st&&fs>15?2.4:6.5*P.hd))*dfx.lat*(handlingMode?ptLat():1)*dt)}
 P.vx=fx*fs+rx*ls;P.vz=fz*fs+rz*ls;if(frozen)P.vx=P.vz=0;P.al=(fs-pfs)/dt;if(typeof tyreStep==='function')tyreStep(dt,th?thA:0,br?brA:0,hb,st,fs,ls,frozen);
 const sa=Math.abs(Math.atan2(ls,Math.abs(fs)+.5)),spm=Math.hypot(P.vx,P.vz);
 if(P.gnd&&spm>8&&sa>.22-.012*P.dr&&!frozen){drift.t+=dt;drift.off=0;drift.pts+=sa*spm*8*dt*(1+Math.min(4,drift.t/3))*(1+.2*P.dr)*(P.rm||1)}
 else if(drift.pts>0){drift.off+=dt;if(drift.off>.7){if(drift.pts>40){const n=Math.round(drift.pts);drift.total+=n;save();toast('Drift +'+n+(P.rm>1?'  ('+RARN[P.rt]+' ×'+P.rm.toFixed(1)+')':''))}drift.pts=0;drift.t=0}}
 const prevX=P.x,prevZ=P.z;P.x+=P.vx*dt;P.z+=P.vz*dt;if(typeof checkSpeedBumpCrossing==='function')checkSpeedBumpCrossing(prevX,prevZ,dt);if(colB(P)&&drift.pts>0){drift.pts=0;drift.t=0;toast('Drift lost')}
 if(P.x<WX0+40||P.x>WX1-40){P.x=cl(P.x,WX0+40,WX1-40);P.vx=0}if(P.z<WZ0+40||P.z>WZ1-40){P.z=cl(P.z,WZ0+40,WZ1-40);P.vz=0}
 const gh=groundH(P.x,P.z);P.vy-=9.81*dt;P.y+=P.vy*dt;
 if(P.y<=gh){P.y=gh;P.vy=(gh-P.pgh)/dt;P.gnd=true}else P.gnd=false;P.pgh=gh;
 const sl=(groundH(P.x+fx*2,P.z+fz*2)-groundH(P.x-fx*2,P.z-fz*2))/4,pt=P.gnd?-Math.atan(sl):-Math.atan2(P.vy,Math.max(fs,5))*.7;
 P.pitch+=(pt-P.pitch)*Math.min(1,dt*8);
 {const yr=wrap(P.h-P.h0)/dt;P.h0=P.h;const al=P.gnd&&!frozen?cl(P.al,-12,8):0,ay=P.gnd&&!frozen?cl(fs*yr,-12,12):0;P.bp+=(-al*.0022-P.bp)*Math.min(1,dt*6);P.br+=(ay*.0065-P.br)*Math.min(1,dt*6)}
 P.m.position.set(P.x,P.y,P.z);P.m.rotation.set(P.pitch+P.bp,P.h,P.br);if(handlingMode)ptBody(dt,frozen,fs);
 for(const c of traffic){const dx=P.x-c.x,dz=P.z-c.z,d=Math.hypot(dx,dz);if(d<3.4&&P.y<TH(P.x,P.z)+2){const nx=dx/(d||1),nz=dz/(d||1);P.x+=nx*(3.4-d)*.6;P.z+=nz*(3.4-d)*.6;
  const relX=P.vx-(Math.sin(c.h||0)*(c.v||0)),relZ=P.vz-(Math.cos(c.h||0)*(c.v||0)),rvn=relX*nx+relZ*nz;if(rvn< -1.8&&typeof registerPlayerImpact==='function')registerPlayerImpact(-rvn,{type:'vehicle'},nx,nz);const vn=P.vx*nx+P.vz*nz;if(vn<0){P.vx-=vn*nx*1.3;P.vz-=vn*nz*1.3}P.vx*=.8;P.vz*=.8;c.hold=1.5;c.v=0;fine('hit',30,'Collision with traffic',2)}}
 for(const b of bots.concat(riv?[riv]:[],heist.cops)){const dx=P.x-b.x,dz=P.z-b.z,d=Math.hypot(dx,dz);if(d<3.4){const nx=dx/(d||1),nz=dz/(d||1),rvx=P.vx-Math.sin(b.h||0)*(b.v||0),rvz=P.vz-Math.cos(b.h||0)*(b.v||0),rvn=rvx*nx+rvz*nz;if(rvn< -1.8&&typeof registerPlayerImpact==='function')registerPlayerImpact(-rvn,{type:'vehicle'},nx,nz);P.x+=nx*(3.4-d)*.5;P.z+=nz*(3.4-d)*.5;P.vx*=1-2*dt;P.vz*=1-2*dt}}
 const sp=Math.hypot(P.vx,P.vz)*3.6;RI=roadAt(P.x,P.z,6);const lim=RI&&RI.d<=RI.e.w/2+.3?RI.e.lim:0;curLim=lim||LIMIT;
 const dzo=driftZoneAt(P.x,P.z),dz=!!dzo;if(dzo!==inDrift.was){inDrift.was=dzo;toast(dzo?'🏁 '+dzo.name+' — no speed limit, no fines':'Leaving the drift zone')}
 if(!dz){if(P.gnd&&lim&&sp>lim+10)fine('spd',15,'Speeding ('+Math.round(sp)+' km/h)',5);
 if(P.gnd&&sp>14&&wrongWay())fine('way',20,'Driving against traffic',6);redLight(sp)}WH.ffb(dt,frozen);return sp}
