// ---- street races (circuits follow real roads) and duels ----
// circuits are routed over the real network between junction nodes picked near real anchors (each leg must be routable, no absurd detours)
function nodesNear(x,z,r){const o=[],ci=Math.floor(x/HC2),cj=Math.floor(z/HC2),R=Math.ceil(r/HC2),seen=new Set();for(let i=ci-R;i<=ci+R;i++)for(let j=cj-R;j<=cj+R;j++){const L=HASH.get(hk(i,j));if(!L)continue;for(const s of L)for(const n of[s.e.a,s.e.b]){if(seen.has(n))continue;seen.add(n);const nd=NODES[n],d=Math.hypot(nd.x-x,nd.z-z);if(d<r&&nd.deg>=3&&!nd.rb)o.push([d,n])}}return o.sort((a,b)=>a[0]-b[0]).map(q=>q[1])}
const routeLen=r=>r.reduce((s,t)=>s+t.e.len,0);
function legOk(a,b){const r=route(a,b);if(!r)return false;const A=NODES[a],B=NODES[b];return routeLen(r)<2.6*Math.hypot(A.x-B.x,A.z-B.z)+450}
function mkCircuit(n,pts,loop,laps){const ids=[];let prev=null;for(const p of pts){let pick=null;for(const c of nodesNear(p[0],p[1],260)){if(ids.includes(c))continue;if(prev&&!legOk(prev,c))continue;pick=c;break}if(!pick)return null;ids.push(pick);prev=pick}
 if(loop&&!legOk(prev,ids[0]))return null;return{n,nodes:ids,loop:loop?1:0,laps}}
const alongVS=(name,k)=>{const R=VSBY.get(name)||[];let b=null;R.forEach(r=>{if(!b||r.dp.length>b.dp.length)b=r});if(!b)return[];return Array.from({length:k},(_,i)=>b.dp[Math.floor((b.dp.length-1)*i/(k-1))])};
const CIRCUITS=[mkCircuit('Al-Balad Circuit',[0,90,180,270].map(a=>[RA.balad[0]+330*Math.cos(a*Math.PI/180),RA.balad[1]+330*Math.sin(a*Math.PI/180)]),1,2),
 mkCircuit('Thalatheen Run',alongVS('Thalatheen Street',7),1,1)||mkCircuit('Thalatheen Run',alongVS('Thalatheen Street',6),0,1),
 mkCircuit('Petra Sprint',[[900,330],[1700,330],[2500,330],[3300,330]].map(p=>{const q=nearestOn('Petra Street',p[0],p[1])[0].dp;let b=q[0],bd=1e18;q.forEach(t=>{const d=(t[0]-p[0])**2;if(d<bd){bd=d;b=t}});return b}),0,1)].filter(Boolean);
if(!CIRCUITS.length)console.warn('no race circuit could be routed');
const race={s:'idle',t:0,kind:'',c:null,total:0,cpPos:[],legEnd:[],dest:null},beacon=new T.Mesh(new T.CylinderGeometry(6,6,70,20,1,true),new T.MeshBasicMaterial({color:0x33e0ff,transparent:true,opacity:.28,side:T.DoubleSide}));beacon.visible=false;scene.add(beacon);
const curWP=()=>race.kind==='duel'?race.dest:race.cpPos[Math.min(P.prog,race.total-1)];
function skipAt(tr,dist){const e=tr.e,n=e.pts.length;for(let k=0;k<n;k++){const i=tr.d>0?k:n-1-k,u=tr.d>0?e.cum[i]:e.len-e.cum[i];if(u>=Math.min(dist,e.len-6))return k}return 0}
function startRace(){if(race.s==='count'||race.s==='run'){race.s='idle';beacon.visible=false;endDuel();toast('Race cancelled');return}endDuel();
 let ci=0,bd=1e9;CIRCUITS.forEach((c,i)=>{const n=NODES[c.nodes[0]],d=Math.hypot(n.x-P.x,n.z-P.z);if(d<bd){bd=d;ci=i}});const C=CIRCUITS[ci],seq=[];
 if(C.loop){for(let l=0;l<C.laps;l++){for(let k=1;k<C.nodes.length;k++)seq.push(C.nodes[k]);seq.push(C.nodes[0])}}else for(let k=1;k<C.nodes.length;k++)seq.push(C.nodes[k]);
 const trs=[],legEnd=[];let prev=C.nodes[0];for(const id of seq){const r=route(prev,id);if(!r){toast('Race route unavailable');return}trs.push(...r);legEnd.push(trs.length);prev=id}
 const ids=[...Array(NRACE).keys()].sort(()=>Math.random()-.5).slice(0,3);bots.forEach((b,i)=>{scene.remove(b.m);b.m=mkPorsche(ids[i]);setModel(b,ids[i])});
 const grid=[20,34,48,62],D0={P:[],C:[],Lm:[],Mk:[]};pathFromTravs(D0,trs,0);const kAt=d=>{let k=0;while(k<D0.C.length-2&&D0.C[k]<d)k++;return k};
 bots.forEach((b,i)=>{pathFromTravs(b,trs,0);b.pi=kAt(grid[i]);b.loop=true;b.cpIdx=legEnd.map(k=>b.Mk[k-1].i);const p=b.P[b.pi];b.x=p[0];b.z=p[1];setHeadFromPath(b);b.v=0;b.prog=0;b.fin=false;b.m.position.set(b.x,TH(b.x,b.z)+.12,b.z);b.m.rotation.y=b.h});
 {const k=kAt(grid[3]);P.x=D0.P[k][0];P.z=D0.P[k][1];P.h=Math.atan2(D0.P[k+1][0]-D0.P[k][0],D0.P[k+1][1]-D0.P[k][1]);P.vx=P.vz=P.vy=0;P.prog=0;P.y=P.pgh=groundH(P.x,P.z)}
 race.kind='circuit';race.c=C;race.total=seq.length;race.legEnd=legEnd;race.cpPos=seq.map(id=>[NODES[id].x,NODES[id].z]);
 traffic.forEach(c=>{if(Math.hypot(c.x-P.x,c.z-P.z)<90)respawn(c,200)});race.s='count';race.t=3.99;beacon.visible=true;toast(C.n+' — rivals: '+bots.map(b=>b.model).join(', '))}
function nearCar(){let b=null,bd=5.5;for(const c of traffic){const d=Math.hypot(c.x-P.x,c.z-P.z);if(d<bd){bd=d;b=c}}return b}
function duelTravs(s,d){const trs=[{e:s.e,d}];let len=d>0?s.e.len-s.e.cum[s.i]:s.e.cum[s.i],cur=trs[0];
 while(len<650){const e=cur.e,q=cur.d>0?e.pts.slice(-3):e.pts.slice(0,3).reverse(),hx=q[q.length-1][0]-q[0][0],hz=q[q.length-1][1]-q[0][1],hl=Math.hypot(hx,hz)||1;let best=null,bc=-9;
  for(const o of NODES[cur.d>0?e.b:e.a].out){if(o.e===e&&o.d===-cur.d)continue;const p=o.d>0?o.e.pts:o.e.pts.slice().reverse(),dx=p[Math.min(2,p.length-1)][0]-p[0][0],dz=p[Math.min(2,p.length-1)][1]-p[0][1],cs=(hx*dx+hz*dz)/(hl*(Math.hypot(dx,dz)||1));if(cs>bc){bc=cs;best=o}}
  if(!best)break;trs.push(best);len+=best.e.len;cur=best}return trs}
function startDuel(c){endDuel();const s=roadAt(P.x,P.z,0);if(!s){toast('Get on a road to start a duel');return}
 const d=s.e.ow?1:((Math.sin(P.h)*s.tx+Math.cos(P.h)*s.tz)>=0?1:-1),trs=duelTravs(s,d),pi=(Math.random()*NRACE)|0;
 const rv={x:0,z:0,h:P.h,v:0,prog:0,fin:false,skill:1,m:mkPorsche(pi),src:c,P:[],C:[],Lm:[],Mk:[],pi:0,loop:true};setModel(rv,pi);
 pathFromTravs(rv,trs,d>0?s.i+1:s.e.pts.length-1-s.i);{let k=rv.P.length-1;while(k>8&&rv.C[k]-rv.C[0]>720)k--;rv.P.length=rv.C.length=rv.Lm.length=k+1}const q=rv.P,L=q[q.length-1];race.dest=[L[0],L[1]];
 P.h=Math.atan2(q[1][0]-q[0][0],q[1][1]-q[0][1]);P.vx=P.vz=P.vy=0;P.prog=0;const fx=Math.sin(P.h),fz=Math.cos(P.h);rv.x=P.x+fz*3.6;rv.z=P.z-fx*3.6;rv.h=P.h;
 traffic.splice(traffic.indexOf(c),1);riv=rv;c.m.visible=false;all[all.indexOf(c)]=riv;riv.m.position.set(riv.x,TH(riv.x,riv.z)+.12,riv.z);riv.m.rotation.set(0,riv.h,0);
 bots.forEach(b=>{b.m.position.set(1e4,TH(1e4,1e4),1e4);b.x=b.z=1e4});race.kind='duel';race.total=1;race.s='count';race.t=3.99;beacon.visible=true;toast('Duel vs '+riv.model+'! First to the beam wins')}
function endDuel(){if(!riv)return;const c=riv.src;scene.remove(riv.m);c.m.visible=true;all[all.indexOf(riv)]=c;traffic.push(c);riv=null;race.kind='';respawn(c,260)}
const rankP=()=>{const s=o=>{const w=race.cpPos[Math.min(o.prog,race.total-1)]||[0,0];return o.prog*1e5-Math.hypot(w[0]-o.x,w[1]-o.z)};return 1+bots.filter(b=>s(b)>s(P)).length};
function updRace(dt){if(race.s==='count'){race.t-=dt;if(race.t<=0){race.s='run';toast('GO!')}}
 if(race.s==='run'||race.s==='done'){if(race.kind==='duel'){if(riv){updBot(riv,dt);if(!riv.fin&&Math.hypot(race.dest[0]-riv.x,race.dest[1]-riv.z)<16)riv.fin=true}}
  else bots.forEach(b=>{updBot(b,dt);while(b.prog<race.total&&b.pi>=b.cpIdx[b.prog]-1)b.prog++;if(b.prog>=race.total)b.fin=true})}
 if(race.s==='run'){const w=curWP(),du=race.kind==='duel';
  if(du&&riv&&riv.fin){race.s='done';race.t=6;toast('You lost the duel')}
  else if(Math.hypot(w[0]-P.x,w[1]-P.z)<(du?18:28)){P.prog++;if(P.prog>=race.total){race.s='done';race.t=6;toast(du?'You won the duel!':'Finished P'+(1+bots.filter(b=>b.fin).length)+' of 4!')}}}
 if(race.s==='done'){race.t-=dt;if(race.t<0){race.s='idle';beacon.visible=false;endDuel();bots.forEach(b=>{b.m.position.set(1e4,TH(1e4,1e4),1e4);b.x=b.z=1e4})}}
 if(beacon.visible){const w=curWP();beacon.position.set(w[0],TH(w[0],w[1])+35,w[1])}}
