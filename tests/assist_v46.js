// v46 checks (run from the repo root): node tests/assist_v46.js dist/irbid-drive.html
// Manual gearbox (Q/E: up/down, over-rev refusal, limiter, E still robs at the bank, Arcade untouched), weather (Irbid climate table drives the
// rain chance, wet road lengthens Realistic braking, Arcade identical wet or dry, Amman clock), road reputation + rival memory (rules, bounds,
// saved), auto-drive along a real navigation route in both handling modes (same updP physics, no teleport, stays on the route, keeps the speed
// limit, arrives and stops; manual input hands back control). Real world (roads, buildings, terrain), no traffic. Exits 1 on failure.
const fs=require('fs');global.THREE=require(require('path').resolve('node_modules/three'));
const noop=new Proxy(function(){},{get:()=>noop,apply:()=>noop,set:()=>true});
THREE.WebGLRenderer=class{constructor(){this.domElement={style:{},insertAdjacentElement(){}};this.shadowMap={}}setPixelRatio(){}setSize(){}render(){}};
const el=()=>({getContext:()=>new Proxy(noop,{get:(t,k)=>k==='measureText'?(q=>({width:String(q).length*14})):t[k]}),appendChild(){},remove(){},style:{},dataset:{},setAttribute(){},addEventListener(){},focus(){},blur(){},select(){},value:'',children:[],classList:{add(){},remove(){},toggle(){}},set innerHTML(v){},get innerHTML(){return''},querySelector:()=>el(),querySelectorAll:()=>[]});
global.document={getElementById:el,createElement:el,body:{appendChild(){}}};global.window=global;
global.addEventListener=()=>{};global.innerWidth=1280;global.innerHeight=720;global.devicePixelRatio=1;
let t=1000;global.performance={now:()=>t};global.requestAnimationFrame=()=>{};global.setTimeout=()=>{};
const LS={'irbid-wheel':JSON.stringify({wheel:0,setup:true,btn:{hb:5,KeyC:4,KeyF:0,KeyR:1,KeyP:2,KeyG:3,Escape:9}})};global.localStorage={getItem:k=>k in LS?LS[k]:null,setItem:(k,v)=>{LS[k]=String(v)}};
let seed=7;Math.random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};
const cl0=console.log;console.log=()=>{};
const html=fs.readFileSync(process.argv[2],'utf8');
(0,eval)(html.match(/<script>\n([\s\S]*?)<\/script>/)[1]+';global.__s={updP,updPStep,keys,P,PORS,setPlayerCar,traffic,bots,heist,ptSpec,PTS,setHandling,WH,groundH,gearKey,setGearbox,WX,wxRoll,wxPick,ammanNow,WX_CLIM,REP,REPG,fine,repTick,race,AP,apToggle,NAV,NODES,navStart,navTick,START,BANK,RI,curLimF:()=>curLim,setClock:v=>{clock=v},last,COL,TERR,all,LIT,light,get RI(){return RI}}');global.__surfK=surfK;global.__sbc=checkSpeedBumpCrossing;
const S=global.__s,P=S.P,k=S.keys;S.traffic.length=0;S.heist.cops.length=0;S.all.length=0;S.all.push(P);
(0,eval)('toast=function(m){global.__toast=m};save=function(){}');
let fail=0;const ok=(c,m,v)=>{cl0((c?'PASS ':'FAIL ')+m+(v!==undefined?'  ['+v+']':''));if(!c)fail++};
const idx=n=>{const i=S.PORS.findIndex(m=>m[0]===n);if(i<0)throw Error('no car '+n);return i};
let wheel=null;const WHN={on:false,steer:0,thr:0,brk:0,hb:false};S.WH.poll=()=>wheel||WHN;S.WH.ffb=()=>{};
const spd=()=>Math.hypot(P.vx,P.vz);
function step(n,ks,cb){for(let i=0;i<n;i++){for(const c in k)k[c]=0;Object.assign(k,ks||{});t+=1000/60;S.updP(1/60,false);if(cb)cb(i)}}
// gearbox / grip checks on a flat world with no colliders (both restored before the auto-drive checks)
const COL0=new Map(S.COL),TE0=Array.from(S.TERR.e);S.COL.clear();for(let i=0;i<S.TERR.e.length;i++)S.TERR.e[i]=0;(0,eval)('surfK=function(){return 1};checkSpeedBumpCrossing=function(){}');
function place(i,v){S.setPlayerCar(i);P.x=0;P.z=0;P.h=0;P.vx=0;P.vz=v||0;P.vy=0;P.y=P.pgh=S.groundH(P.x,P.z);P.gnd=true;P.al=0;S.PTS.idx=-1;S.PTS.yr=0;S.PTS.dl=0;S.PTS.spin=0}
const FOCUS=idx('Ford Focus RS'),MUS=idx('Ford Mustang GT');
// ---- wheel layout saved by v45: keeps its buttons; the new actions only take buttons nobody uses ----
{const b=S.WH.cfg().btn;ok(b.hb===5&&b.KeyC===4&&b.KeyE===-1&&b.KeyQ===-1&&b.KeyX===10&&b.KeyZ===11,'a saved v45 wheel layout keeps its paddles (handbrake 5, camera 4); new shift actions stay unbound, horn/auto-drive take free buttons',JSON.stringify(b))}
// ---- gearbox ----
S.setHandling(1);S.setGearbox(0,1);place(MUS,0);let gA=1;step(600,{KeyW:1},()=>gA=Math.max(gA,S.PTS.gear));
ok(gA>=3,'Automatic still shifts up by itself','top gear reached '+gA);
place(MUS,0);S.setGearbox(1,1);let gM=1,rpmMax=0;step(480,{KeyW:1},()=>{gM=Math.max(gM,S.PTS.gear);rpmMax=Math.max(rpmMax,S.PTS.rpm)});const v1=spd(),red=S.ptSpec(MUS).red;
ok(gM===1&&rpmMax<=red+1,'Manual: no automatic upshift, rpm held at the limiter','gear '+gM+', max '+Math.round(rpmMax)+' / red '+red+' rpm, '+(v1*3.6).toFixed(0)+' km/h');
step(120,{KeyW:1});ok(spd()-v1<1.5,'Manual at the limiter: no more pull in 1st (fuel cut)',((spd()-v1)*3.6).toFixed(1)+' km/h gained in 2 s');
ok(S.gearKey(1)===true,'E away from the bank = shift request');step(40,{KeyW:1});ok(S.PTS.gear===2,'E: 1st -> 2nd','gear '+S.PTS.gear);
S.gearKey(1);step(40,{KeyW:1});S.gearKey(1);step(40,{KeyW:1});const gHi=S.PTS.gear;step(30,{});S.PTS.deny=0;S.gearKey(-1);step(5,{});const gD=S.PTS.gear;
ok(gHi===4&&gD===3,'Q: one gear down at a safe speed','4 -> '+gD);
place(MUS,55);step(1,{});const ng=S.ptSpec(MUS).ng;S.PTS.gear=ng;S.PTS.shift=0;let den=0,gd=ng;for(let q=0;q<ng&&!den;q++){S.PTS.shift=0;S.PTS.deny=0;S.gearKey(-1);P.vx=0;P.vz=55;step(1,{KeyW:1});den=S.PTS.deny;if(den)gd=S.PTS.gear;else gd=S.PTS.gear}
ok(den===1&&gd>1,'Q refused when the lower gear would over-rev (198 km/h: downshifts stop above 1st)','stopped in gear '+gd+' of '+ng);
P.x=S.BANK.x;P.z=S.BANK.z;ok(S.gearKey(1)===false,'E next to the bank still robs it (no shift)');
S.setHandling(0);place(MUS,10);const gk=S.gearKey(1);ok(gk===true&&/Realistic/.test(global.__toast),'Arcade: Q/E only explain that gears are Realistic-only',global.__toast);S.setGearbox(0,1);
// ---- weather ----
function brake(mode,wet){S.setHandling(mode);S.WX.wet=wet;S.WX.mu=1-.28*wet;place(FOCUS,22.2);const x0=P.z;for(let i=0;i<900&&P.vz>.05;i++)step(1,{KeyS:1});return P.z-x0}
const dR=brake(1,0),wR=brake(1,1),dA=brake(0,0),wA=brake(0,1);S.WX.wet=0;S.WX.mu=1;
ok(wR>dR*1.15,'Realistic: fully wet road brakes longer from 80 km/h',dR.toFixed(1)+' m dry vs '+wR.toFixed(1)+' m wet');
ok(Math.abs(wA-dA)<1e-9,'Arcade: braking identical wet or dry (Arcade physics never changes)',dA.toFixed(3)+' / '+wA.toFixed(3));
function rainShare(m){S.WX.mon=m;S.WX.blk=0;let r=0;for(let i=0;i<4000;i++){S.wxRoll();if(S.WX.st==='rain')r++}return r/4000}
const jul=rainShare(6),jan=rainShare(0),oct=rainShare(9);
ok(jul===0,'Auto weather, July (JMD: 0 rain days): never rains',jul);
ok(jan>oct&&Math.abs(jan-11.3/31*.45)<.04,'Auto weather, January rains most (expected 11.3/31 x 45% of blocks)',jan.toFixed(3)+' vs Oct '+oct.toFixed(3));
const a=S.ammanNow();ok(a.h>=0&&a.h<24&&a.m>=0&&a.m<12,'Irbid local clock (Asia/Amman) readable',a.h.toFixed(2)+' h, month '+(a.m+1));
// ---- reputation ----
S.setClock(1000);const r0=S.REP.road;S.fine('hit',30,'Collision with traffic',2);const r1=S.REP.road;S.fine('hit',30,'Collision with traffic',2);
ok(r1===r0-6&&S.REP.road===r1,'hitting traffic costs 6 reputation; the fine cooldown also stops double counting',r0+' -> '+r1+' -> '+S.REP.road);
for(let i=0;i<40;i++){S.setClock(2000+i*10);S.fine('red',50,'Ran a red light',3)}ok(S.REP.road===0&&S.REPG.gap>11.9&&S.REPG.gap<=12,'reputation is bounded at 0; traffic behind keeps a 12 m gap',S.REP.road+', gap '+S.REPG.gap.toFixed(1));
P.vx=10;P.vz=0;for(let i=0;i<46*60;i++)S.repTick(1/60);ok(S.REP.road===1,'45 s of clean driving earns 1 point back',S.REP.road);
const sv=JSON.parse(LS['irbid-drive-rep-v1']);ok(sv.road===1&&sv.log.length===20,'reputation saved (own key), incident log capped at 20','log '+sv.log.length);
S.race.kind='race';S.race.s='count';S.repTick(.01);S.race.s='run';S.repTick(.01);S.bots[0].fin=true;S.bots[1].fin=false;S.bots[2].fin=false;S.race.s='done';S.repTick(.01);
const rv=S.REP.riv;ok(rv.Samer.l===1&&rv.Layth.w===1&&rv.Omar.w===1&&rv.Samer.r===1,'rivals remember results','Samer beat you, you beat Layth + Omar');
for(let i=0;i<5;i++){S.race.s='idle';S.repTick(.01);S.race.s='count';S.repTick(.01);S.race.s='run';S.repTick(.01);S.bots.forEach(b=>b.fin=false);S.race.s='done';S.repTick(.01)}
S.race.s='idle';S.repTick(.01);S.race.s='count';S.repTick(.01);const sk=S.bots.map(b=>b.skill);S.race.s='idle';S.repTick(.01);
ok(sk[1]>S.bots[1].sk0&&sk.every(x=>x>=.94&&x<=1.05),'a rival you keep beating drives harder next time (bounded .94-1.05)',sk.map(x=>x.toFixed(3)).join(' / '));
// ---- auto-drive along a real route ----
for(const[a,b]of COL0)S.COL.set(a,b);TE0.forEach((v,i)=>S.TERR.e[i]=v);(0,eval)('surfK=global.__surfK;checkSpeedBumpCrossing=global.__sbc');S.setClock(0);global.__fines=[];(0,eval)('{const f1=fine;fine=function(k){global.__fines.push(k);return f1.apply(this,arguments)}}');
function auto(mode){global.__fines.length=0;S.setHandling(mode);S.setPlayerCar(FOCUS);P.x=S.START.x;P.z=S.START.z;P.h=S.START.h;P.vx=P.vz=P.vy=0;P.y=P.pgh=S.groundH(P.x,P.z);P.gnd=true;S.PTS.idx=-1;
 // destination: a junction 500-900 m away by straight line
 let dst=null;for(const n of Object.values(S.NODES)){if(!n)continue;const d=Math.hypot(n.x-P.x,n.z-P.z);if(d>500&&d<900&&n.out&&n.out.length>=3){dst=n;break}}
 if(!dst||S.navStart({name:'test junction',x:dst.x,z:dst.z,ax:dst.x,az:dst.z},true)===false)return{err:'no route'};
 S.apToggle();if(!S.AP.on)return{err:'AP did not start: '+global.__toast};
 const lit=(S.NAV.legs||[]).filter(L=>L.n1!=null&&S.NODES[L.n1]&&S.NODES[L.n1].lit).length;let rs=0,wasR=false;
 let jump=0,off=0,over=0,steps=0,px=P.x,pz=P.z,arrived=false,msg='';const tot=S.NAV.total;
 for(let i=0;i<60*240;i++){t+=1000/60;S.setClock(i/60);for(const c in k)k[c]=0;const vb=spd();S.updPStep(1/60,false);S.navTick(1/60);steps++;
  const isR=S.AP.why==='red light'&&spd()<.5;if(isR&&!wasR)rs++;wasR=isR;const dj=Math.hypot(P.x-px,P.z-pz);if(dj>vb/60+.6)jump++;px=P.x;pz=P.z;
  if(S.NAV.on){let bd=1e9;const p=S.NAV.pts;for(let j=Math.max(0,S.NAV.j-3);j<Math.min(p.length-1,S.NAV.j+4);j++){const ax=p[j][0],az=p[j][1],bx=p[j+1][0]-ax,bz=p[j+1][1]-az,L2=bx*bx+bz*bz||1,u=Math.max(0,Math.min(1,((P.x-ax)*bx+(P.z-az)*bz)/L2));bd=Math.min(bd,Math.hypot(P.x-ax-bx*u,P.z-az-bz*u))}off=Math.max(off,bd)}
  if(spd()*3.6>S.curLimF()+10){over++;if(process.env.APD)cl0("over",(i/60).toFixed(1),(spd()*3.6).toFixed(0),S.curLimF(),S.RI&&S.RI.e.name,S.RI&&S.RI.e.lim,S.RI&&S.RI.d.toFixed(1),S.AP.vt*3.6|0,S.AP.why)}if(process.env.APD&&i%120===0)cl0('t',(i/60).toFixed(0),'s',Math.round(S.NAV.cum[S.NAV.j]||0),'/',Math.round(S.NAV.total),'v',(spd()*3.6).toFixed(0),'vt',(S.AP.vt*3.6).toFixed(0),S.AP.why,'off',off.toFixed(1),'nav',S.NAV.on,'ap',S.AP.on,'lim',S.curLimF(),'xz',P.x.toFixed(0),P.z.toFixed(0));
  if(!S.AP.on){msg=global.__toast;arrived=/arrived/.test(msg);break}}
 return{arrived,msg,jump,off,over,lit,rs,secs:steps/60,tot,v:spd(),fn:global.__fines.filter(k=>k!=='hit').join(',')}}
for(const m of[0,1]){const r=auto(m),M=m?'Realistic':'Arcade';
 if(r.err){ok(false,M+' auto-drive: '+r.err);continue}
 ok(r.arrived&&r.v<.5,M+' auto-drive: follows a '+Math.round(r.tot)+' m route through the real street network and stops at the destination',r.secs.toFixed(0)+' s, last message: '+r.msg);
 ok(r.jump===0,M+' auto-drive: never teleports (every frame moves at most speed x dt)','jumps '+r.jump);
 ok(r.off<6,M+' auto-drive: stays within 6 m of the route centre line (keeps right)','max '+r.off.toFixed(1)+' m');
 ok(r.fn==='',M+' auto-drive: no speeding / red-light / wrong-way fines on the way','fines ['+r.fn+'] · signalled junctions on the route '+r.lit+', red/amber stops '+r.rs+' · frames above limit+10 while crossing a slower side street '+r.over)}
// red light: start ~150 m before a signalled junction whose light for our approach is red, route straight through it
function redRun(mode){S.setHandling(mode);let res=null;
 for(const nd of S.LIT){for(const e of nd.inn||[]){if(nd.ph[e.id]===undefined||nd.ph[e.id]==='i'||e.len<60||(e.ow&&e.b!==nd.id))continue;   // an approach we can drive INTO the junction
   const ex=(nd.out||[]).find(q=>q.e!==e&&q.e.len>50);if(!ex)continue;const dn=ex.d>0?S.NODES[ex.e.b]:S.NODES[ex.e.a];if(!dn)continue;res={nd,e,dn};break}if(res)break}
 if(!res)return{err:'no signalled approach found'};
 const{nd,e,dn}=res;S.setPlayerCar(FOCUS);
 // start on the approach edge ~150 m from the junction, heading toward it
 const p=e.pts,toNd=Math.hypot(p[0][0]-nd.x,p[0][1]-nd.z)<Math.hypot(p[p.length-1][0]-nd.x,p[p.length-1][1]-nd.z)?-1:1;let acc=0,i0=toNd>0?p.length-1:0;let si=i0;while(si-toNd>=0&&si-toNd<p.length&&acc<Math.min(150,e.len-12)){acc+=Math.hypot(p[si][0]-p[si-toNd][0],p[si][1]-p[si-toNd][1]);si-=toNd}
 const sx=p[si][0],sz=p[si][1],nx=p[si+toNd]?p[si+toNd][0]:nd.x,nz=p[si+toNd]?p[si+toNd][1]:nd.z;P.x=sx;P.z=sz;P.h=Math.atan2(nx-sx,nz-sz);P.vx=P.vz=P.vy=0;P.y=P.pgh=S.groundH(sx,sz);P.gnd=true;S.PTS.idx=-1;
 if(S.navStart({name:'beyond the lights',x:dn.x,z:dn.z,ax:dn.x,az:dn.z},true)===false)return{err:'no route'};
 const leg=(S.NAV.legs||[]).find(L=>L.n1!=null&&S.NODES[L.n1]===nd);if(!leg)return{err:'route avoids the junction'};
 const ax=nd.ph[leg.e.id];let c0=-1;for(let c=0;c<120;c+=.25){S.setClock(c);if(S.light(ax,nd)==='r'){S.setClock(c+12);if(S.light(ax,nd)==='r'){c0=c;break}}}if(c0<0)return{err:'no red phase'};
 global.__fines.length=0;S.apToggle();let stopped=false,enteredOn='',minD=1e9;
 for(let i=0;i<60*90&&S.AP.on;i++){const c=c0+i/60;S.setClock(c);t+=1000/60;for(const q in k)k[q]=0;S.updPStep(1/60,false);S.navTick(1/60);const d=Math.hypot(P.x-nd.x,P.z-nd.z);
  if(process.env.APD&&i%30===0)cl0("r",(i/60).toFixed(1),d.toFixed(1),S.light(ax,nd),S.AP.why,(S.AP.vt*3.6).toFixed(0),(spd()*3.6).toFixed(0),S.NAV.on);if(S.AP.why==="red light"&&spd()<.3)stopped=true;if(d<minD){if(d<12&&minD>=12)enteredOn=S.light(ax,nd);minD=d}}
 if(S.AP.on)S.AP.on=false;return{stopped,enteredOn,fn:global.__fines.filter(x=>x==='red').length+(S.last.red!==undefined&&S.last.red>=c0?0:0),minD}}
for(const m of[0,1]){const r=redRun(m),M=m?'Realistic':'Arcade';if(r.err){ok(false,M+' auto-drive at a red light: '+r.err);continue}
 ok(r.stopped&&r.enteredOn&&r.enteredOn!=='r'&&r.fn===0,M+' auto-drive: stops at a red light and only crosses on green / amber','stopped '+r.stopped+', light when entering '+r.enteredOn+', red-light fines '+r.fn)}
S.setHandling(0);P.x=S.START.x;P.z=S.START.z;P.h=S.START.h;P.vx=P.vz=0;S.navStart({name:'t',x:S.START.x+600,z:S.START.z,ax:S.START.x+600,az:S.START.z},true);S.apToggle();const on1=S.AP.on;step(5,{KeyA:1});
ok(on1&&!S.AP.on&&/took control/.test(global.__toast),'auto-drive: pressing a steering key hands control back',global.__toast);
cl0(fail?'assist_v46: '+fail+' FAILED':'assist_v46: all passed');process.exit(fail?1:0);
