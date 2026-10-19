// ---- v46: manual gearbox (Q down / E up / wheel paddles, Realistic handling), horn (X), auto-drive along the navigation route (Z),
// road reputation (traffic remembers how you drive) and rival memory (named racers remember results and hits). Everything here is optional:
// with the gearbox on Automatic, auto-drive off and no incidents, updP runs exactly as before (off_trace).
// ---- gearbox ----
const GSTORE='irbid-drive-gearbox-v1';try{PTS.man=localStorage.getItem(GSTORE)==='1'?1:0}catch(e){}
function setGearbox(m,quiet){PTS.man=m?1:0;PTS.req=0;try{localStorage.setItem(GSTORE,String(PTS.man))}catch(e){}if(!quiet)toast('Gearbox: '+(PTS.man?'Manual (Q down · E up · wheel paddles)':'Automatic'))}
// returns false only when E should rob the bank instead (standing at the bank with no heist running)
function gearKey(d){if(d>0&&heist.s==='idle'&&Math.hypot(P.x-BANK.x,P.z-BANK.z)<=14)return false;
 if(!handlingMode){toast('Gears are simulated in Realistic handling (press H)');return true}
 const s=ptSpec(P.idx||0);if(s.ev||s.ng<2){toast('Single-speed drive: no gears to shift');return true}
 if(!PTS.man)setGearbox(1);PTS.req=d;PTS.deny=0;return true}
// ---- horn: X (or a bound wheel button, which sends the same key) ----
const HORN={on:false};
function hornSet(on){if(HORN.on===on)return;HORN.on=on;if(typeof audHorn==='function')audHorn(on);
 if(on)for(const c of traffic){const dx=c.x-P.x,dz=c.z-P.z,f=dx*Math.sin(P.h)+dz*Math.cos(P.h);if(f>0&&f<22&&Math.abs(dx*Math.cos(P.h)-dz*Math.sin(P.h))<3&&c.hold>.4)c.hold=.4}}   // a car still sitting after a knock moves off
// ---- road reputation: 0-100, starts at 70. Measurable rules (no learning): -6 hit a traffic car, -4 red light, -2 wrong way, -1 speeding fine;
// +1 for every 45 s of driving above 15 km/h with no incident. Effects: below 50 the cars behind you keep a longer gap (6.5 m -> 12 m at 0),
// and blocked drivers lose patience and honk sooner (6 s / 3 s / 1.5 s at >=60 / >=30 / <30). A traffic car you hit always honks.
const RSTORE='irbid-drive-rep-v1',REP={road:70,clean:0,riv:{},log:[]},REP_D={hit:-6,red:-4,way:-2,spd:-1};
try{const o=JSON.parse(localStorage.getItem(RSTORE)||'null');if(o&&typeof o==='object'){if(Number.isFinite(o.road))REP.road=cl(o.road,0,100);
 if(o.riv&&typeof o.riv==='object')for(const n of['Samer','Layth','Omar']){const r=o.riv[n];if(r&&typeof r==='object'){const q=REP.riv[n]={};for(const k of['r','w','l','h'])q[k]=Number.isFinite(r[k])?cl(Math.round(r[k]),0,999):0}}
 if(Array.isArray(o.log))REP.log=o.log.filter(e=>e&&typeof e.k==='string'&&Number.isFinite(e.t)).slice(-20)}}catch(e){}
function repSave(){try{localStorage.setItem(RSTORE,JSON.stringify({v:1,road:REP.road,riv:REP.riv,log:REP.log}))}catch(e){}}
function repGap(){REPG.gap=6.5+(REP.road<50?(50-REP.road)*.11:0)}repGap();
function repEvent(k){if(!(k in REP_D))return;REP.road=cl(REP.road+REP_D[k],0,100);REP.clean=0;REP.log.push({k,t:Date.now()});if(REP.log.length>20)REP.log.shift();repGap();repSave()}
{const f0=fine;fine=function(k,a,m,cd){const b=last[k];const r=f0.apply(this,arguments);if(last[k]!==b){repEvent(k);if(k==='hit'){let c=null,bd=49;for(const t of traffic){const d=(t.x-P.x)**2+(t.z-P.z)**2;if(d<bd){bd=d;c=t}}if(c)honkAt(c,1.1)}}return r}}
function repRiv(n){return REP.riv[n]||(REP.riv[n]={r:0,w:0,l:0,h:0})}
function honkAt(c,dur){if(clock-(c.hk||-99)<4)return;c.hk=clock;if(typeof audHornAt==='function')audHornAt(c.x,c.z,dur||.5,c.hp||(c.hp=.85+Math.random()*.35))}
const RPT={t:0,rs:'idle',bh:{}};
function carAtRed(c){const pr=pathProg(c);for(const m of c.Mk){if(m.i<c.pi)continue;if(c.C[m.i]-pr>45)break;const nd=NODES[m.id];if(nd&&nd.lit&&light(nd.ph[m.e.id],nd)!=='g')return true}return false}   // waiting at a light is not the player's fault
function repTick(dt){if(PTS.deny){PTS.deny=0;toast('Downshift refused: the engine would over-rev')}
 const v=Math.hypot(P.vx,P.vz);if(v>4.2&&!ui){REP.clean+=dt;if(REP.clean>=45){REP.clean=0;if(REP.road<100){REP.road=Math.min(100,REP.road+1);repGap();repSave()}}}
 // rivals: results when a race ends, hits while it runs, skill adjusted when the next race starts
 if(race.s!==RPT.rs){if(race.s==='count'&&race.kind!=='duel'){const m=[];bots.forEach(b=>{if(b.sk0===undefined)b.sk0=b.skill;const q=repRiv(b.n);b.skill=cl(b.sk0+cl((q.w-q.l)*.004,-.02,.03)+(q.h>=3?.01:0),.94,1.05);if(q.h>=3)m.push(b.n+' remembers '+q.h+' hits');else if(q.w-q.l>=3)m.push(b.n+' wants revenge ('+q.l+'-'+q.w+')')});if(m.length)setTimeout(()=>toast('🧠 '+m.join(' · ')),2600)}
  if(race.s==='done'&&RPT.rs==='run'&&race.kind!=='duel'){bots.forEach(b=>{const q=repRiv(b.n);q.r=Math.min(999,q.r+1);if(b.fin)q.l=Math.min(999,q.l+1);else q.w=Math.min(999,q.w+1)});repSave()}RPT.rs=race.s}
 if(race.s==='run'&&race.kind!=='duel')for(const b of bots){const d=Math.hypot(b.x-P.x,b.z-P.z);if(d<3.6&&clock-(RPT.bh[b.n]||-99)>2&&v>3){RPT.bh[b.n]=clock;const q=repRiv(b.n);q.h=Math.min(999,q.h+1);repSave()}}
 // impatient drivers: a traffic car stuck right behind the stopped player honks after its patience runs out
 if((RPT.t-=dt)>0)return;RPT.t=.25;const pat=REP.road>=60?6:REP.road>=30?3:1.5;
 for(const c of traffic){const dx=P.x-c.x,dz=P.z-c.z;if(dx*dx+dz*dz>900){c.blk=0;continue}const sh=Math.sin(c.h),ch=Math.cos(c.h),f=dx*sh+dz*ch;
  if(f>0&&f<14&&Math.abs(dx*ch-dz*sh)<2.6&&c.v<1&&v<1.5&&!(c.hold>0)&&!carAtRed(c)){c.blk=(c.blk||0)+.25;if(c.blk>pat){c.blk=-4;honkAt(c,.45)}}else c.blk=0}}
// ---- auto-drive: follows NAV.pts through the SAME updP physics as the player (it only supplies steering / throttle / brake, like a wheel),
// keeps right of the centre line, obeys the speed limit and red lights, slows for curves and for cars ahead, stops at the destination.
// Any steering, throttle, brake or handbrake input hands control back. Never teleports.
const AP={on:false,stop:0,stuck:0,wi:{on:true,steer:0,thr:0,brk:0,hb:false,clu:0},vt:0,why:''};
const apBadge=document.createElement('div');apBadge.id='apBadge';apBadge.style.cssText='position:fixed;left:50%;bottom:64px;transform:translateX(-50%);z-index:3;background:rgba(20,90,200,.85);color:#fff;font:600 13px system-ui,sans-serif;padding:4px 10px;border-radius:12px;pointer-events:none;display:none';try{document.body.appendChild(apBadge)}catch(e){}
function apToggle(){if(AP.on){apOff('Auto-drive off');return}
 if(!NAV.on){toast('Auto-drive follows a route: press M and choose a destination first');return}
 if(race.s==='count'||race.s==='run'){toast('Auto-drive is not available during races');return}
 if(heist.s!=='idle'){toast('Auto-drive is not available during a heist');return}
 AP.on=true;AP.stop=0;AP.stuck=0;apBadge.style.display='';toast('🤖 Auto-drive on (Z): following the route · steer, gas or brake to take over')}
function apOff(m){AP.on=false;AP.stop=0;const w=AP.wi;w.steer=w.thr=w.brk=0;apBadge.style.display='none';if(m)toast(m)}
function apPt(s,o){const c=NAV.cum,p=NAV.pts;s=cl(s,0,NAV.total);let i=Math.max(0,Math.min(NAV.j,c.length-2));while(i>0&&c[i]>s)i--;while(i<c.length-2&&c[i+1]<s)i++;const L=(c[i+1]-c[i])||1,t=cl((s-c[i])/L,0,1),tx=(p[i+1][0]-p[i][0])/L,tz=(p[i+1][1]-p[i][1])/L;o[0]=p[i][0]+(p[i+1][0]-p[i][0])*t;o[1]=p[i][1]+(p[i+1][1]-p[i][1])*t;o[2]=tx;o[3]=tz;return o}
const APA=[0,0,0,0],APB=[0,0,0,0];
// distance along the route of the car's projection (route points can be 40 m apart; the nearest POINT is not the car's progress)
function apProg(){const p=NAV.pts,c=NAV.cum;let bs=c[Math.min(NAV.j,c.length-1)],bd=1e18;for(let j=Math.max(0,NAV.j-2);j<Math.min(p.length-1,NAV.j+3);j++){const ax=p[j][0],az=p[j][1],bx=p[j+1][0]-ax,bz=p[j+1][1]-az,L2=bx*bx+bz*bz||1,u=cl(((P.x-ax)*bx+(P.z-az)*bz)/L2,0,1),d=(P.x-ax-bx*u)**2+(P.z-az-bz*u)**2;if(d<bd){bd=d;bs=c[j]+u*(c[j+1]-c[j])}}return bs}
function apInput(wp,k,mi,dt){const w=AP.wi;
 if(k.KeyW||k.KeyS||k.KeyA||k.KeyD||k.ArrowUp||k.ArrowDown||k.ArrowLeft||k.ArrowRight||k.Space||mi.isAccelerating||mi.isBraking||mi.steeringAngle||mi.isHandbrake||(wp.on&&(Math.abs(wp.steer)>.15||wp.thr>.15||wp.brk>.15||wp.hb))){apOff('Auto-drive off: you took control');return wp}
 const fx=Math.sin(P.h),fz=Math.cos(P.h),u=P.vx*fx+P.vz*fz;
 if(!NAV.on||AP.stop){AP.stop=1;w.steer=0;w.thr=0;w.brk=1;if(Math.abs(u)<.4)apOff(NAV.on?'Auto-drive off':'🏁 Auto-drive: arrived');return w}
 if(race.s==='count'||race.s==='run'||heist.s!=='idle'){apOff('Auto-drive off');return wp}
 const s=apProg(),rd=RI&&RI.e&&RI.d<=RI.e.w/2+4?RI.e:null,lane=rd?(rd.ow?rd.w*.18:Math.min(2.6,rd.w*.25)):1.6;
 // steering: pure pursuit on a point Ld ahead, shifted to the right-hand lane
 const Ld=7+.45*Math.max(0,u),q=apPt(s+Ld,APA),tx=q[0]-q[3]*lane-P.x,tz=q[1]+q[2]*lane-P.z,rx=-fz,rz=fx,lat=tx*rx+tz*rz,fw=tx*fx+tz*fz,d2=Math.max(9,lat*lat+fw*fw),kap=2*lat/d2;   // kap > 0: target on the right
 let st;if(handlingMode){const sp=ptGeom(ptSpec(P.idx||0)),beta=Math.abs(Math.atan2(P.vx*rx+P.vz*rz,Math.abs(u)+.5)),dm=.6/(1+Math.max(0,u)/(12+45*Math.min(1,beta*2.5)));st=-Math.atan(kap*sp.wb*1.15)/dm}
 else st=u>.5?-kap*u*(1+u/18)/(1.8*P.hd*cl(u/4,-1,1)):-Math.sign(kap)*Math.min(1,Math.abs(kap)*20);
 w.steer=-cl(st,-1,1);
 // target speed: limit, curvature ahead (3 m/s^2 lateral, 3 m/s^2 braking), red / amber lights, cars ahead, the destination
 const mu=handlingMode?WX.mu:1,he=Math.abs(Math.atan2(lat,fw));let vt=Math.min(curLim||50,90)/3.6*.95,why='limit';
 // the posted limit of the route's own legs (the leg we are on, and lower limits ahead in time to brake for them at 2.5 m/s^2)
 if(NAV.legs)for(const L of NAV.legs){const a0=NAV.cum[L.a],b0=NAV.cum[L.b];if(b0<s)continue;if(a0>s+90)break;const vl=Math.min(L.e.lim||50,90)/3.6*.95,dd=Math.max(0,a0-s-4);if(a0<=s)vt=vl;else vt=Math.min(vt,Math.sqrt(vl*vl+2*2.5*dd))}
 if(he>.3){const vh=Math.max(3,14*(1-(he-.3)/1.2));if(vh<vt){vt=vh;why='turning'}}   // big heading error (start, missed turn): slow down first
 apPt(s,APB);let px=APB[2],pz=APB[3];for(let d=10;d<=110;d+=10){apPt(s+d,APB);const cr=px*APB[3]-pz*APB[2],dp=px*APB[2]+pz*APB[3],k2=Math.abs(Math.atan2(cr,dp))/10;px=APB[2];pz=APB[3];if(k2>.004){const vc=Math.sqrt(3*mu/k2),va=Math.sqrt(vc*vc+2*3*mu*Math.max(0,d-10));if(va<vt){vt=va;why='curve'}}}
 // red / amber: stop 13.5 m before the junction node (the red-light rule, redLight, watches a 12 m circle round it); once inside at speed, carry on
 if(NAV.legs)for(const L of NAV.legs){const nd=L.n1!=null?NODES[L.n1]:null,de=NAV.cum[L.b]-s;if(de<-2)continue;if(de>95)break;if(!nd||!nd.lit)continue;const lt=light(nd.ph?nd.ph[L.e.id]:'x',nd),dd=de-13.5;if((dd>-2||dd>-8&&u<3)&&(lt==='r'||(lt==='y'&&dd>u*1.1))){const vr=Math.sqrt(2*3*Math.max(0,dd));if(vr<vt){vt=vr;why='red light'}}break}
 for(const o of all){if(o===P)continue;const dx=o.x-P.x,dz=o.z-P.z,f=dx*fx+dz*fz;if(f>0&&f<40&&Math.abs(dx*rx+dz*rz)<2.4){const vo=Math.max(0,(f-8)*.8);if(vo<vt){vt=vo;why='car ahead'}}}
 const rem=NAV.total-s,ve=Math.sqrt(2*2.5*Math.max(0,rem-6));if(ve<vt){vt=ve;why='arriving'}
 AP.vt=vt;AP.why=why;const e=vt-u;w.thr=e>0?cl(e*.45,0,1):0;w.brk=vt<.3&&u<2?1:e<-.8?cl(-e*.3,0,1):0;   // hold the brake while waiting (no creeping over the stop line)
 AP.stuck=vt>3&&u<.5?AP.stuck+dt:0;if(AP.stuck>6){apOff('Auto-drive stopped: the way is blocked');return wp}
 return w}
function apHud(){if(!AP.on)return;const t='🤖 AUTO · '+Math.round(AP.vt*3.6)+' km/h target · '+AP.why;if(apBadge.textContent!==t)apBadge.textContent=t}
addEventListener('keydown',e=>{if(e.repeat||ui||(e.target&&e.target.tagName==='INPUT'))return;if(e.code==='KeyX')hornSet(true);if(e.code==='KeyZ')apToggle()});
addEventListener('keyup',e=>{if(e.code==='KeyX')hornSet(false)});
function assistTick(dt){repTick(dt);apHud();if(HORN.on&&ui)hornSet(false)}
