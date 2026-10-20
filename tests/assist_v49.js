// v49 checks (run from the repo root): node tests/assist_v49.js dist/irbid-drive.html [reference.html]
// Tyre temperature + brake fade OFF (default): a fixed Realistic input sequence gives the SAME trajectory hash as v48 (`git show backup/v48:...`);
// ON: cold tyres have less grip, cornering warms them toward the 90 C peak, a long drift overheats them, straight cruising cools them; repeated hard
// stops from 140 km/h heat the brakes past 400 C and the stop gets longer; Arcade ignores both. Time-of-day traffic: density follows the hour and
// cars are parked only out of sight. Saved destinations and category filters in the search. Flat world without colliders. Exits 1 on failure.
const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto');global.THREE=require(path.resolve('node_modules/three'));
const noop=new Proxy(function(){},{get:()=>noop,apply:()=>noop,set:()=>true});
THREE.WebGLRenderer=class{constructor(){this.domElement={style:{},insertAdjacentElement(){}};this.shadowMap={}}setPixelRatio(){}setSize(){}render(){}};
const el=()=>({getContext:()=>new Proxy(noop,{get:(t,k)=>k==='measureText'?(q=>({width:String(q).length*14})):t[k]}),appendChild(){},remove(){},style:{},dataset:{},setAttribute(){},addEventListener(){},focus(){},blur(){},select(){},value:'',children:[],classList:{add(){},remove(){},toggle(){}},set innerHTML(v){},get innerHTML(){return''},querySelector:()=>el(),querySelectorAll:()=>[]});
global.document={getElementById:el,createElement:el,body:{appendChild(){}},head:{appendChild(){}}};global.window=global;
global.addEventListener=()=>{};global.innerWidth=1280;global.innerHeight=720;global.devicePixelRatio=1;
let t=1000;global.performance={now:()=>t};global.requestAnimationFrame=()=>{};global.setTimeout=()=>{};
const LS={};global.localStorage={getItem:k=>k in LS?LS[k]:null,setItem:(k,v)=>{LS[k]=String(v)}};
let seed=7;Math.random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};
const cl0=console.log;console.log=()=>{};
const REF=process.env.V49REF,html=fs.readFileSync(process.argv[2],'utf8');
(0,eval)(html.match(/<script>\n([\s\S]*?)<\/script>/)[1]+';global.__s={updP,keys,P,PORS,setPlayerCar,traffic,heist,PTS,setHandling,WH,groundH,COL,TERR,all,START,setClock:v=>{clock=v},getClock:()=>clock,last,light'+
 (REF?'':',ASSIST,SIMX,simxSave,simxGrip,GQ,trDen,trApply,TRAFALL,setHour:v=>{hour=v},NAVF,NCATK,navSearch,navShow,favToggle,isFav,NAV,FSTORE,SXSTORE')+'}');
const S=global.__s,P=S.P,k=S.keys;S.traffic.length=0;S.heist.cops.length=0;S.all.length=0;S.all.push(P);
(0,eval)('toast=function(m){global.__toast=m};save=function(){}');
const WHN={on:false,steer:0,thr:0,brk:0,hb:false};S.WH.poll=()=>WHN;S.WH.ffb=()=>{};
function step(n,ks,cb){for(let i=0;i<n;i++){for(const c in k)k[c]=0;Object.assign(k,ks||{});t+=1000/60;S.updP(1/60,false);if(cb&&cb(i)===true)return i}return n}
const idx=n=>S.PORS.findIndex(m=>m[0]===n),FOCUS=idx('Ford Focus RS'),MUS=idx('Ford Mustang GT'),spd=()=>Math.hypot(P.vx,P.vz);
// flat world without colliders (restored for the school)
const COL0=new Map(S.COL),TE0=Array.from(S.TERR.e);S.COL.clear();for(let i=0;i<S.TERR.e.length;i++)S.TERR.e[i]=0;const sk0=surfK,bc0=checkSpeedBumpCrossing;(0,eval)('surfK=function(){return 1};checkSpeedBumpCrossing=function(){}');
function place(i,v){S.setPlayerCar(i);P.x=0;P.z=0;P.h=0;P.vx=0;P.vz=v||0;P.vy=0;P.y=P.pgh=S.groundH(0,0);P.gnd=true;P.al=0;S.PTS.idx=-1;S.PTS.yr=0;S.PTS.dl=0;S.PTS.spin=0}
// fixed Realistic sequence: launch, steer, brake, handbrake turn, power oversteer, then 4 hard stops (the defaults must reproduce v48 exactly)
function trace(){S.setHandling(1);const out=[];for(const c of[FOCUS,MUS]){place(c,0);const rec=()=>out.push([P.x,P.z,P.h,P.vx,P.vz].map(v=>v.toFixed(6)).join(','));
 step(240,{KeyW:1});rec();step(60,{KeyW:1,KeyA:1});rec();step(90,{KeyS:1});rec();step(30,{KeyW:1});step(40,{Space:1,KeyD:1});rec();step(120,{KeyW:1,KeyA:1});rec();step(120,{KeyS:1,KeyA:1});rec();
 for(let i=0;i<4;i++){step(300,{KeyW:1});rec();step(200,{KeyS:1});rec()}}
 return crypto.createHash('sha1').update(out.join('|')).digest('hex')}
if(REF){cl0('TRACE '+trace());process.exit(0)}
let fail=0;const ok=(c,m,v)=>{cl0((c?'PASS ':'FAIL ')+m+(v!==undefined?'  ['+v+']':''));if(!c)fail++};
// per-step keys (step() sets its keys BEFORE updP, so a callback cannot change the keys of the same step)
const stepF=(n,f,cb)=>{for(let i=0;i<n;i++){for(const c in k)k[c]=0;Object.assign(k,f());t+=1000/60;S.updP(1/60,false);if(cb)cb(i)}};
const X=S.SIMX,cruise=(n,v)=>stepF(n,()=>spd()<v?{KeyW:1}:{});
// ---- 1. defaults = v48 Realistic physics ----
{ok(!X.tt&&!X.bf,'tyre temperature and brake fade are off by default');const h=trace();let ref=process.argv[3];
 if(!ref){try{ref=path.join(require('os').tmpdir(),'irbid_v48_ref.html');fs.writeFileSync(ref,cp.execSync('git show backup/v48:dist/irbid-drive.html',{maxBuffer:64<<20}))}catch(e){ref=null}}
 if(ref){const o=cp.execFileSync(process.execPath,[__filename,ref],{env:Object.assign({},process.env,{V49REF:'1'}),maxBuffer:16<<20}).toString().match(/TRACE (\w+)/);
  ok(o&&o[1]===h,'options off: Realistic trajectory identical to v48 (incl. 4 hard stops from speed)',h.slice(0,12)+' vs '+(o?o[1].slice(0,12):'?'))}else ok(false,'reference build for the v48 trace not found')
 ok(X.gk===1&&X.bk===1,'options off: grip and brake factors stay exactly 1',X.gk+' '+X.bk)}
S.setHandling(1);
// ---- 2. tyre temperature ----
{X.tt=true;X.tT=24;place(FOCUS,0);step(2,{});const cold=X.gk;
 let vm=0;stepF(3600,()=>spd()<16?{KeyW:1,KeyA:1}:{KeyA:1},()=>{vm=Math.max(vm,spd())});const warm=X.tT,gw=X.gk;
 ok(cold<.95&&cold>.9,'cold tyres (24 °C): less grip',(cold*100).toFixed(1)+' %');
 ok(warm>45&&warm<110&&gw>cold,'60 s of cornering at 58 km/h warms the tyres and grip rises',warm.toFixed(0)+' °C, grip '+(gw*100).toFixed(1)+' %, max '+(vm*3.6).toFixed(0)+' km/h');
 {X.tT=24;place(FOCUS,0);stepF(3600,()=>spd()<45?{KeyW:1,KeyA:1}:{KeyA:1});ok(X.tT>70&&X.tT<135,'fast cornering (160 km/h, full lock) runs them hot but not beyond 135 °C',X.tT.toFixed(0)+' °C')}
 place(FOCUS,25);const t0=X.tT;cruise(3600,25);ok(X.tT<t0-10,'straight cruising cools them',t0.toFixed(0)+' -> '+X.tT.toFixed(0)+' °C');
 X.tT=90;place(MUS,15);let mx=0;step(1800,{KeyW:1,KeyA:1},()=>{mx=Math.max(mx,X.tT)});ok(mx>115&&S.simxGrip(mx)<.97,'a long power drift (Mustang, 30 s) overheats them',mx.toFixed(0)+' °C, grip '+(S.simxGrip(mx)*100).toFixed(1)+' %');
 const g=[24,60,90,120,160].map(t=>S.simxGrip(t));ok(g[2]===1&&g[0]<g[1]&&g[3]<1&&g[4]<g[3],'grip curve peaks at 90 °C',g.map(v=>v.toFixed(3)).join(' / '));X.tt=false;X.tT=24;X.gk=1}
// ---- 3. brake fade ----
{X.bf=true;X.bT=24;const stops=[];for(let i=0;i<8;i++){place(FOCUS,140/3.6);const z0=P.z,b0=X.bT;step(900,{KeyS:1},()=>spd()<.05);stops.push([P.z-z0,b0,X.bT]);place(FOCUS,25);cruise(600,25)}
 const d0=stops[0][2]-stops[0][1];ok(d0>150&&d0<450,'one full stop from 140 km/h heats the brakes by a few hundred °C (estimate)',d0.toFixed(0)+' °C');
 const last=stops[stops.length-1];ok(last[1]>400&&last[0]>stops[0][0]*1.08,'repeated hard stops: the brakes pass 400 °C and fade (longer stop)','stop 1 '+stops[0][0].toFixed(1)+' m at '+stops[0][1].toFixed(0)+' °C, stop 8 '+last[0].toFixed(1)+' m at '+last[1].toFixed(0)+' °C');
 ok(X.bk>=.6,'fade never drops below 60 % brake force',X.bk.toFixed(2));
 X.bT=600;place(FOCUS,20);cruise(3600,20);ok(X.bT<330&&X.bk===1,'a minute of driving cools them and full braking returns',X.bT.toFixed(0)+' °C');X.bf=false;X.bT=24;X.bk=1}
// ---- 4. Arcade ignores both ----
{S.setHandling(0);const go=()=>{place(FOCUS,140/3.6);const z0=P.z;step(900,{KeyS:1},()=>spd()<.05);return P.z-z0};const a=go();X.tt=X.bf=true;X.bT=700;X.tT=150;X.gk=.8;X.bk=.6;const b=go();
 ok(a===b,'Arcade: identical stop with both options on and hot brakes',a.toFixed(3)+' = '+b.toFixed(3));X.tt=X.bf=false;X.tT=X.bT=24;X.gk=X.bk=1}
// ---- 5. saving ----
{X.tt=true;X.bf=false;S.simxSave();const o=JSON.parse(localStorage.getItem(S.SXSTORE));ok(o.tt===true&&o.bf===false&&Object.keys(o).length===2,'options saved under '+S.SXSTORE,JSON.stringify(o));X.tt=false;S.simxSave()}
// ---- 6. time-of-day traffic ----
{const G=S.GQ,TA=S.TRAFALL,act=()=>TA.filter(c=>!c.park).length;G.t='auto';S.setHour(3.5);const n3=S.trDen();S.setHour(8);const n8=S.trDen();S.setHour(17.5);const n17=S.trDen();
 ok(n3<.4&&n8===1&&n17>.8,'density by hour: night quiet, morning peak, evening busy',n3.toFixed(2)+' / '+n8.toFixed(2)+' / '+n17.toFixed(2));
 P.x=1e6;P.z=1e6;S.setHour(8);S.trApply(true);const a8=act();S.setHour(3.5);S.trApply(true);const a3=act();
 ok(a8===TA.length&&a3===Math.round(TA.length*n3),'cars are parked and brought back to match the hour',a8+' at 08:00, '+a3+' at 03:30 of '+TA.length);
 S.setHour(8);S.trApply(true);const near=TA[TA.length-1];S.setHour(3.5);P.x=near.x;P.z=near.z;S.trApply(true);ok(!near.park,'a car within 250 m of the player is never parked in view');
 P.x=1e6;P.z=1e6;S.trApply(true);ok(near.park,'it is parked once the player is away');G.t='high';S.trApply();ok(act()===TA.length,'back to High: all cars',act())}
// ---- 7. saved destinations and category filters ----
{const N=S.NAVF;P.x=S.START.x;P.z=S.START.z;N.cat='edu';const r=S.navSearch('');ok(r.length>=5&&r.every(o=>S.NCATK.edu.has(o.it.k)),'Schools chip, empty query: nearest schools only',r.slice(0,3).map(o=>o.it.n+' '+Math.round(o.d)+' m').join(' | '));
 N.cat='food';const q=S.navSearch('cafe');ok(q.length>0&&q.every(o=>S.NCATK.food.has(o.it.k)),'Food chip + "cafe": food places only',q.length+' results');
 N.cat='';const all=S.navSearch('');ok(all.length===8,'no chip: the v48 search is unchanged (8 results)');
 const it=all[2].it;ok(S.favToggle(it)===true&&S.isFav(it),'☆ saves a place');const st=JSON.parse(localStorage.getItem(S.FSTORE));ok(st.length===1&&st[0].n===it.n&&isFinite(st[0].x),'saved under '+S.FSTORE,JSON.stringify(st[0]).slice(0,90));
 S.navShow('');ok(S.NAV.res[0].it.n===it.n&&S.NAV.res[0].fav===1&&S.NAV.res.filter(o=>o.it.n===it.n).length===1,'empty search box lists saved places first (once)',S.NAV.res.slice(0,3).map(o=>o.it.n).join(' | '));
 const sr=S.navSearch('street').find(o=>o.it.road);if(sr){S.favToggle(sr.it);ok(S.isFav(sr.it)&&JSON.parse(localStorage.getItem(S.FSTORE)).some(f=>f.road===sr.it.road),'streets can be saved too',sr.it.n);S.favToggle(sr.it)}
 ok(S.favToggle(it)===false&&!S.isFav(it)&&JSON.parse(localStorage.getItem(S.FSTORE)).length===0,'★ removes it again');
 for(let i=0;i<20;i++)N.fav.push({n:'x'+i,x:i,z:0});ok(S.favToggle(all[0].it)===false&&N.fav.length===20,'at most 20 saved places');N.fav.length=0}
cl0(fail?'assist_v49: '+fail+' FAILED':'assist_v49: all passed');process.exit(fail?1:0)
