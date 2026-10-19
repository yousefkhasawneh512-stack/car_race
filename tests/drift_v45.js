// v45 driving-dynamics checks (run from the repo root): node tests/drift_v45.js dist/irbid-drive.html
// Steering end to end through updP (both handling modes): left/right opposite + symmetric, centred = no yaw, reverse steers the right way,
// keyboard and analog (wheel) paths; Realistic two-axle tyre model: no false drift when stopped, handbrake initiation, countersteer recovery,
// power oversteer (RWD) vs power understeer (FWD), load transfer (brake mid-corner), per-car differences, surface grip; stability under random
// frame times (finite, bounded). Arcade identical to v38 is proved separately by off_trace. Flat ground, grip 1, no colliders. Exits 1 on failure.
const fs=require('fs');global.THREE=require(require('path').resolve('node_modules/three'));
const noop=new Proxy(function(){},{get:()=>noop,apply:()=>noop,set:()=>true});
THREE.WebGLRenderer=class{constructor(){this.domElement={style:{},insertAdjacentElement(){}};this.shadowMap={}}setPixelRatio(){}setSize(){}render(){}};
const el=()=>({getContext:()=>new Proxy(noop,{get:(t,k)=>k==='measureText'?(q=>({width:String(q).length*14})):t[k]}),appendChild(){},remove(){},style:{},dataset:{},setAttribute(){},addEventListener(){},focus(){},blur(){},select(){},value:'',children:[],classList:{add(){},remove(){},toggle(){}},set innerHTML(v){},get innerHTML(){return''},querySelector:()=>el(),querySelectorAll:()=>[]});
global.document={getElementById:el,createElement:el,body:{appendChild(){}}};global.window=global;
global.addEventListener=()=>{};global.innerWidth=1280;global.innerHeight=720;global.devicePixelRatio=1;
let t=1000;global.performance={now:()=>t};global.requestAnimationFrame=()=>{};global.setTimeout=()=>{};
const LS={};global.localStorage={getItem:k=>k in LS?LS[k]:null,setItem:(k,v)=>{LS[k]=String(v)}};
let seed=7;Math.random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};
const cl0=console.log;console.log=()=>{};
const html=fs.readFileSync(process.argv[2],'utf8');
(0,eval)(html.match(/<script>\n([\s\S]*?)<\/script>/)[1]+';global.__s={updP,keys,P,PORS,setPlayerCar,traffic,bots,heist,COL,ptSpec,PTS,TSLIP,setHandling,hm:()=>handlingMode,drift,WH,TERR,RAMPS,groundH,updPStep}');
const S=global.__s,P=S.P,k=S.keys;S.traffic.length=0;S.bots.length=0;S.heist.cops.length=0;S.COL.clear();
for(let i=0;i<S.TERR.e.length;i++)S.TERR.e[i]=0;S.RAMPS.length=0;   // flat world: no slope, no ramps
(0,eval)('fine=function(){};toast=function(){};save=function(){};surfK=function(){return 1};checkSpeedBumpCrossing=function(){};redLight=function(){};wrongWay=function(){return false}');
let fail=0;const ok=(c,m,v)=>{cl0((c?'PASS ':'FAIL ')+m+(v!==undefined?'  ['+v+']':''));if(!c)fail++};
const idx=n=>{const i=S.PORS.findIndex(m=>m[0]===n);if(i<0)throw Error('no car '+n);return i};
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
function place(i,v){S.setPlayerCar(i);P.x=0;P.z=0;P.h=0;P.vx=0;P.vz=v||0;P.vy=0;P.y=P.pgh=S.groundH(0,0);P.gnd=true;P.al=0;S.PTS.idx=-1;S.PTS.yr=0;S.PTS.dl=0;S.PTS.spin=0;S.drift.t=0;S.drift.pts=0}
let wheel=null;const WHN={on:false,steer:0,thr:0,brk:0,hb:false};S.WH.poll=()=>wheel||WHN;S.WH.ffb=()=>{};
function step(n,ks,cb,dtf){for(let i=0;i<n;i++){for(const c in k)k[c]=0;Object.assign(k,typeof ks==='function'?ks(i):ks);const dt=dtf?dtf(i):1/60;t+=dt*1000;S.updP(dt,false);if(cb)cb(i)}}
const spd=()=>Math.hypot(P.vx,P.vz),beta=()=>{const fx=Math.sin(P.h),fz=Math.cos(P.h),u=P.vx*fx+P.vz*fz,v=-P.vx*fz+P.vz*fx;return Math.atan2(v,Math.abs(u)+.5)};
const FOCUS=idx('Ford Focus RS'),MUS=idx('Ford Mustang GT'),FIE=idx('Ford Fiesta ST'),AE=idx('Toyota AE86 Trueno'),LC=idx('Toyota Land Cruiser LC200');
for(const mode of[0,1]){S.setHandling(mode);const M=mode?'Realistic':'Arcade';
 place(FOCUS,14);step(60,{KeyW:1,KeyA:1});const L=wrap(P.h);place(FOCUS,14);step(60,{KeyW:1,KeyD:1});const R=wrap(P.h);place(FOCUS,14);step(600,{KeyW:1});const C=wrap(P.h);
 ok(L>.2&&R<-.2,M+': A turns left (+h), D turns right (-h) at 50 km/h','L '+L.toFixed(2)+' R '+R.toFixed(2)+' rad in 1 s');
 ok(Math.abs(L+R)<.02*Math.abs(L),M+': left and right are mirror images',(L+R).toFixed(4));
 ok(Math.abs(C)<1e-6,M+': centred steering, 10 s at full throttle: no yaw',C.toExponential(1));
 wheel={on:true,steer:-.5,thr:.6,brk:0,hb:false};place(FOCUS,14);step(60,{});const W=wrap(P.h);wheel={on:true,steer:.5,thr:.6,brk:0,hb:false};place(FOCUS,14);step(60,{});const W2=wrap(P.h);wheel=null;
 ok(W>.05&&W2<-.05&&Math.abs(W+W2)<.05*Math.abs(W),M+': analog wheel half-left / half-right (the G29 path) turns the car both ways equally',W.toFixed(3)+' / '+W2.toFixed(3));
 place(FOCUS,0);step(90,{KeyS:1});const v0=P.vx*Math.sin(P.h)+P.vz*Math.cos(P.h);step(60,{KeyS:1,KeyA:1});ok(v0<-1&&wrap(P.h)<-.05,M+': reverse + left steer swings the nose right','v '+v0.toFixed(1)+' m/s, h '+wrap(P.h).toFixed(2));
 place(FOCUS,0);let dt0=0;step(180,{KeyA:1},()=>{dt0=Math.max(dt0,S.drift.t,S.TSLIP.r)});ok(dt0===0&&spd()<1e-6,M+': stopped car + steering only: no movement, no drift, no slip',dt0)}
// ---- Realistic tyre model ----
S.setHandling(1);
place(MUS,19.4);step(30,{KeyA:1,Space:1});const bH=Math.abs(beta());let rmax=0;
place(MUS,19.4);step(30,{KeyA:1},()=>{rmax=Math.max(rmax,Math.abs(beta()))});
ok(bH>.25&&bH>2*rmax,'handbrake + steer at 70 km/h kicks the rear out (body slip vs the same turn without handbrake)',bH.toFixed(2)+' vs '+rmax.toFixed(2)+' rad');
function drift(counter){place(MUS,19.4);step(30,{KeyA:1,Space:1});let b=0;step(150,i=>counter?(beta()>.08&&S.PTS.yr>-.2?{KeyD:1}:{}):{KeyA:1,KeyW:1},()=>b=Math.abs(beta()));return{b,yaw:Math.abs(S.PTS.yr),v:spd()}}
const cs=drift(1),nc=drift(0);
ok(cs.b<.12&&cs.yaw<.3,'countersteer (steer into the slide, then straighten) recovers within 2.5 s',cs.b.toFixed(3)+' rad, '+(cs.v*3.6).toFixed(0)+' km/h');
ok(nc.b>cs.b*2||nc.yaw>1,'keeping the inside steer + throttle keeps it sliding / spinning instead',nc.b.toFixed(2)+' rad, yaw '+nc.yaw.toFixed(2)+' rad/s');
function power(i){place(i,8);let f=0,r=0;wheel={on:true,steer:-.3,thr:1,brk:0,hb:false};step(120,{},()=>{f+=S.TSLIP.af;r+=S.TSLIP.ar});wheel=null;return{f:f/120,r:r/120}}   // mean slip angle / peak slip angle per axle
const pm=power(MUS),pf=power(FIE);
ok(pm.r>pm.f,'RWD Mustang GT, full throttle in a 30 %-lock corner: rear works harder than the front (power oversteer)','mean rear '+pm.r.toFixed(2)+' vs front '+pm.f.toFixed(2)+' of peak slip');
ok(pf.f>pf.r,'FWD Fiesta ST, same wheel input: front works harder than the rear (power understeer)','mean front '+pf.f.toFixed(2)+' vs rear '+pf.r.toFixed(2)+' of peak slip');
function trail(br){place(FOCUS,22);step(40,{KeyA:1,KeyW:1});let r=0;step(30,br?{KeyA:1,KeyS:1}:{KeyA:1,KeyW:1},()=>r=Math.max(r,Math.abs(beta())));return r}
const tb=trail(1),tt=trail(0);ok(tb>tt,'braking mid-corner shifts load forward and rotates the car more than staying on throttle',tb.toFixed(3)+' vs '+tt.toFixed(3)+' rad');
function hbk(i){place(i,16.7);step(25,{KeyA:1,Space:1});let b=0;step(40,{KeyA:1,KeyW:1},()=>b=Math.max(b,Math.abs(beta())));return b}
const ae=hbk(AE),lc=hbk(LC);ok(Math.abs(ae-lc)>.05,'vehicle-specific: AE86 and Land Cruiser respond differently to the same drift input',ae.toFixed(2)+' vs '+lc.toFixed(2)+' rad');
(0,eval)('surfK=function(){return .65}');const g65=trail(0);(0,eval)('surfK=function(){return 1}');ok(g65>tt,'lower surface grip -> more slip in the same corner',g65.toFixed(3)+' vs '+tt.toFixed(3));
let bad=0,vmax=0;for(const i of[FOCUS,MUS,FIE,AE,LC,idx('Porsche 917'),idx('Tesla Model 3')]){place(i,0);step(1500,j=>[{KeyW:1},{KeyW:1,KeyA:1},{KeyW:1,KeyD:1,Space:1},{KeyS:1,KeyA:1},{},{KeyW:1,KeyD:1}][(j>>6)%6],()=>{if(![P.x,P.z,P.vx,P.vz,P.h,S.PTS.yr].every(Number.isFinite))bad++;vmax=Math.max(vmax,spd())},()=>.004+Math.random()*.046)}
ok(bad===0&&vmax<110,'7 cars x 1,500 random-length frames (4-50 ms): all state finite, speed bounded','bad '+bad+', vmax '+(vmax*3.6).toFixed(0)+' km/h');
place(MUS,19.4);step(20,{KeyA:1,Space:1});const yb=Math.abs(S.PTS.yr);step(1,{KeyA:1},null,()=>.05);ok(Math.abs(S.PTS.yr)<Math.max(3,yb*2),'one 50 ms frame mid-drift: yaw rate stays bounded',yb.toFixed(2)+' -> '+Math.abs(S.PTS.yr).toFixed(2)+' rad/s');
// frame-rate independence: the same 2.85 s of input (handbrake entry, hold, countersteer, release) at 60, 30 and 20 fps through the loop's
// updPStep must end in the same state (recovered), also when a previous run left the gearbox in a higher gear
function fr(fps,raw){place(FOCUS,20);S.PTS.idx=FOCUS;S.PTS.gear=4;const dt=1/fps,n=s=>Math.round(s*fps),run=(m,ks)=>{for(let i=0;i<m;i++){for(const c in k)k[c]=0;Object.assign(k,ks);t+=dt*1000;raw?S.updP(dt,false):S.updPStep(dt,false)}};
 run(n(.45),{KeyW:1,KeyA:1,Space:1});run(n(.5),{KeyW:1,KeyA:1});run(n(.4),{KeyW:1,KeyD:1});run(n(1.5),{});return{b:Math.abs(beta()),yr:Math.abs(S.PTS.yr),h:P.h}}
const F60=fr(60),F30=fr(30),F20=fr(20),R20=fr(20,1);cl0('     without sub-steps (one 50 ms step per frame, the pre-fix behaviour): slip '+R20.b.toFixed(2)+' rad, yaw '+R20.yr.toFixed(2)+' rad/s');
ok([F60,F30,F20].every(q=>q.b<.1&&q.yr<.2),'same input at 60 / 30 / 20 fps: recovered every time (physics sub-steps <= 1/60 s; final heading may differ, the manoeuvre is at the edge of a spin)',[F60,F30,F20].map(q=>'slip '+q.b.toFixed(2)+' yaw '+q.yr.toFixed(2)+' h '+q.h.toFixed(2)).join(' | '));
S.setHandling(0);cl0(fail?'drift_v45: '+fail+' FAILED':'drift_v45: all passed');process.exit(fail?1:0);
