// ---- agents that follow the road graph: traffic, race bots, police ----
const traffic=[],bots=['Samer','Layth','Omar'].map((n,i)=>({n,x:1e4,z:1e4,h:Math.PI/2,v:0,prog:0,fin:false,skill:.96+i*.02,rad:1.3,m:mkPorsche(i),P:[],C:[],Lm:[],Mk:[],pi:0}));
bots.forEach((b,i)=>{setModel(b,i);b.m.position.set(1e4,TH(1e4,1e4),1e4)});
const all=traffic.concat([P],bots);
const TRW={hw:1,arch:1,petra:1,main:.85,local:.4,svc:.07,ramp:.5,ring:.7,drift:0,campus:.5,alley:.3};
function pickSeg(rmin,rmax,tries){for(let t=0;t<(tries||120);t++){const a=Math.random()*6.2832,r=rmin+Math.random()*(rmax-rmin),L=HASH.get(hk(Math.floor((P.x+Math.cos(a)*r)/HC2),Math.floor((P.z+Math.sin(a)*r)/HC2)));if(L&&L.length){const s=L[hi(L.length)];if(s.e.hw==='track'||s.e.tn)continue;if(Math.random()<(TRW[s.e.kind]??.4))return s}}return null}
// append one road traversal (with lane offset) to an agent's path; skip = number of leading points to drop
function appendTrav(b,tr,skip){const e=tr.e,d=tr.d,n=e.pts.length,lane=e.ow?e.w*.18:e.w*.25;let c0=b.C.length?b.C[b.C.length-1]:0,lp=b.P.length?b.P[b.P.length-1]:null;
 for(let k=skip||0;k<n;k++){const i=d>0?k:n-1-k,sg=d>0?1:-1,p=[e.pts[i][0]+sg*e.nx[i]*lane,e.pts[i][1]+sg*e.nz[i]*lane];if(lp&&k<n-1&&(p[0]-lp[0])**2+(p[1]-lp[1])**2<42)continue;
  if(lp){const gl=Math.hypot(p[0]-lp[0],p[1]-lp[1]);if(gl>12){const m=Math.ceil(gl/9);for(let q=1;q<m;q++){const t=q/m,r=[lp[0]+(p[0]-lp[0])*t,lp[1]+(p[1]-lp[1])*t];c0+=gl/m;b.P.push(r);b.C.push(c0);b.Lm.push(e.lim)}c0+=gl/m}else c0+=gl}b.P.push(p);b.C.push(c0);b.Lm.push(e.lim);lp=p}
 b.Mk.push({i:b.P.length-1,id:d>0?e.b:e.a,e});b.lastE=e;b.lastD=d}
function nextTrav(b){const e=b.lastE,d=b.lastD,nd=NODES[d>0?e.b:e.a],P=b.P,n=P.length;if(!nd)return null;const hx=P[n-1][0]-P[Math.max(0,n-3)][0],hz=P[n-1][1]-P[Math.max(0,n-3)][1],hl=Math.hypot(hx,hz)||1;let tot=0;const W=[];
 for(const o of nd.out){if(o.e===e&&o.d===-d)continue;if(o.e.kind==='drift')continue;const q=o.d>0?o.e.pts:o.e.pts.slice().reverse(),dx=q[Math.min(2,q.length-1)][0]-q[0][0],dz=q[Math.min(2,q.length-1)][1]-q[0][1],dl=Math.hypot(dx,dz)||1,cs=(hx*dx+hz*dz)/(hl*dl);
  const w=(o.e.kind==='svc'?.2:o.e.kind==='local'?.7:o.e.kind==='ramp'?.6:1)*(.6+o.e.w/20)*(1+1.5*Math.max(0,cs));W.push([o,w]);tot+=w}
 if(!W.length)return null;let r=Math.random()*tot;for(const q of W){r-=q[1];if(r<=0)return q[0]}return W[W.length-1][0]}
function extend(b,need){need=need||170;let g=0;while(b.C[b.C.length-1]-b.C[b.pi]<need&&g++<6){const o=nextTrav(b);if(!o){b.dead=true;return}appendTrav(b,o,0)}}
function trim(b){if(b.pi>40){const cut=b.pi-12;b.P.splice(0,cut);b.C.splice(0,cut);b.Lm.splice(0,cut);b.Mk=b.Mk.filter(m=>m.i>=cut);b.Mk.forEach(m=>m.i-=cut);b.pi-=cut}}
function advance(b){const P=b.P;let pi=b.pi;while(pi<P.length-1){const d0=(P[pi][0]-b.x)**2+(P[pi][1]-b.z)**2,d1=(P[pi+1][0]-b.x)**2+(P[pi+1][1]-b.z)**2;if(d1<=d0||d0<9)pi++;else break}b.pi=pi}
function aim(b,L){const P=b.P,C=b.C;let j=b.pi;const c0=C[j];while(j<P.length-1&&C[j]-c0<L)j++;return P[j]}
function curveCap(b){const P=b.P,C=b.C;let best=1e9,j=b.pi;const c0=C[j];while(j+3<P.length&&C[j]-c0<150){const a1=Math.atan2(P[j+1][0]-P[j][0],P[j+1][1]-P[j][1]),a2=Math.atan2(P[j+3][0]-P[j+2][0],P[j+3][1]-P[j+2][1]),sa=Math.max(.02,Math.abs(wrap(a2-a1))),cp=cl(Math.sqrt(224/sa),9,120),d=Math.max(0,C[j]-c0-4);best=Math.min(best,Math.sqrt(cp*cp+2*10*d));j++}return best}
function setHeadFromPath(b){const p=b.P,i=b.pi||0;if(p.length>i+1)b.h=Math.atan2(p[i+1][0]-p[i][0],p[i+1][1]-p[i][1])}
// --- traffic ---
function respawn(c,rmin){const s=pickSeg(rmin||260,640);if(!s){c.x=c.z=1e5;c.m.position.set(1e5,0,1e5);c.hold=1;return}
 const e=s.e,d=e.ow?1:(Math.random()<.5?1:-1);setTrafficModel(c,trafficZone(s.x0,s.z0,e));c.P=[];c.C=[];c.Lm=[];c.Mk=[];c.pi=0;c.dead=false;appendTrav(c,{e,d},d>0?s.i+1:e.pts.length-1-s.i);extend(c);const p=c.P[0];c.x=p[0];c.z=p[1];setHeadFromPath(c);c.v=0;c.hold=0;c.stuck=0;c.m.position.set(c.x,TH(c.x,c.z)+.12,c.z);c.m.rotation.set(0,c.h,0)}
function updTraffic(c,dt){if(c.x>9e4){respawn(c,60);return}advance(c);extend(c);trim(c);const P_=c.P;
 let tgt=13*c.cru*(c.Lm[c.pi]||50)/50;tgt=Math.min(tgt,curveCap(c)*.8);
 for(const m of c.Mk){if(m.i<c.pi)continue;const d=c.C[m.i]-c.C[c.pi],nd=NODES[m.id];if(d>110)break;
  if(nd.lit){const dd=d-11,st=light(nd.ph[m.e.id]);if(dd>-4&&(st==='r'||(st==='y'&&dd>c.v*.9)))tgt=Math.min(tgt,Math.sqrt(Math.max(0,7*Math.max(dd,0))))}
  else if(circNode(m.id)&&d<38)tgt=Math.min(tgt,8)}
 const sh=Math.sin(c.h),ch=Math.cos(c.h);
 for(const o of all){if(o===c)continue;const dx=o.x-c.x,dz=o.z-c.z,f=dx*sh+dz*ch;if(f>0&&f<26&&Math.abs(dx*ch-dz*sh)<2.6)tgt=Math.min(tgt,Math.max(0,(f-6.5)*.9))}
 if(c.hold>0){c.hold-=dt;tgt=0}
 c.v=tgt>c.v?Math.min(tgt,c.v+3*dt):Math.max(tgt,c.v-9*dt);
 const a=aim(c,6+c.v*.6),want=Math.atan2(a[0]-c.x,a[1]-c.z);c.h+=cl(wrap(want-c.h),-2.8*dt,2.8*dt);c.x+=Math.sin(c.h)*c.v*dt;c.z+=Math.cos(c.h)*c.v*dt;
 c.stuck=c.v<.4&&c.hold<=0?c.stuck+dt:0;
 if(Math.hypot(c.x-P.x,c.z-P.z)>680||c.stuck>14||(c.dead&&c.pi>=P_.length-3)||(P_[c.pi]&&Math.hypot(P_[c.pi][0]-c.x,P_[c.pi][1]-c.z)>40))respawn(c);else{c.m.position.set(c.x,TH(c.x,c.z)+.12,c.z);c.m.rotation.set(0,c.h,0)}}
for(let n=0;n<80;n++){const c={x:0,z:0,h:0,v:0,hold:0,m:new T.Group(),P:[],C:[],Lm:[],Mk:[],pi:0};traffic.push(c);all.push(c);respawn(c,40)}
// --- racers, rival and police share one path follower ---
function updBot(b,dt){let tp,dd=1e9;
 if(b.direct)tp=[b.tx,b.tz];else{advance(b);if(b.P.length){const p=b.P[b.pi],d2=(p[0]-b.x)**2+(p[1]-b.z)**2;if(d2>2025){let bj=b.pi,bd=d2;for(let j=Math.max(0,b.pi-10);j<Math.min(b.P.length,b.pi+150);j++){const d=(b.P[j][0]-b.x)**2+(b.P[j][1]-b.z)**2;if(d<bd){bd=d;bj=j}}b.pi=bj;if(bd>2025){const q=b.P[bj];b.x=q[0];b.z=q[1];b.v*=.3}}}tp=aim(b,7+b.v*.7);if(b.P.length)dd=b.C[b.P.length-1]-b.C[b.pi]}
 if(!tp)return;let blocked=false,vt=b.vm;const sh=Math.sin(b.h),ch=Math.cos(b.h);
 for(const c of traffic){const dx=c.x-b.x,dz=c.z-b.z,f=dx*sh+dz*ch,l=dx*ch-dz*sh;if(f>0&&f<22&&Math.abs(l)<3.2){blocked=true;vt=Math.min(vt,Math.max(6,(f-6)*1.2))}}
 const want=Math.atan2(tp[0]-b.x,tp[1]-b.z)+(blocked?.3:0),df=wrap(want-b.h),r=(b.cop?2.2/(1+b.v/14):2.2)*dt;b.h+=cl(df,-r,r);
 const cc=b.direct?1e9:curveCap(b)*(b.cop?1.15:1);
 vt=Math.min(vt,cc,b.cop||b.loop?1e9:Math.sqrt(24*Math.max(dd-14,0))+16,b.vm-(b.vm-18)*Math.min(Math.abs(df)/1.2,1))*b.skill;if(b.fin)vt=0;
 b.v+=cl(vt-b.v,-14*dt,b.a0*(1-Math.pow(Math.max(b.v,0)/(b.vm*1.05),2.5))*dt);b.x+=Math.sin(b.h)*b.v*dt;b.z+=Math.cos(b.h)*b.v*dt;colB(b);
 b.m.position.set(b.x,TH(b.x,b.z)+.12,b.z);b.m.rotation.y=b.h}
function pathFromTravs(b,trs,startSkip){b.P=[];b.C=[];b.Lm=[];b.Mk=[];b.pi=0;trs.forEach((t,i)=>appendTrav(b,t,i===0?startSkip:0));b.dead=false}
