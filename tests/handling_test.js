// Realistic handling mode (07g_drive.js): node tests/handling_test.js dist/irbid-drive.html [table.json]
// Checks calibration against the game's own top speed / 0-100 data for all cars, in-game acceleration and gear changes, drivetrain launch
// behaviour (FWD / RWD / AWD wheelspin and the resulting under/oversteer), braking, engine braking, the bump hop limit and suspension response,
// one damage registration per bump crossing, and that Arcade mode is untouched. Exits 1 on failure.
const fs=require('fs');global.THREE=require(require('path').resolve('node_modules/three'));
const noop=new Proxy(function(){},{get:()=>noop,apply:()=>noop,set:()=>true});
THREE.WebGLRenderer=class{constructor(){this.domElement={style:{},insertAdjacentElement(){}};this.shadowMap={}}setPixelRatio(){}setSize(){}render(){}};
const el=()=>({getContext:()=>new Proxy(noop,{get:(t,k)=>k==='measureText'?(q=>({width:String(q).length*14})):t[k]}),appendChild(){},remove(){},style:{},dataset:{},setAttribute(){},addEventListener(){},focus(){},blur(){},select(){},value:'',children:[],classList:{add(){},remove(){},toggle(){}},set innerHTML(v){},set textContent(v){}});
global.document={getElementById:el,createElement:el,body:{appendChild(){}}};global.window=global;
global.addEventListener=()=>{};global.innerWidth=1280;global.innerHeight=720;global.devicePixelRatio=1;
let t=1000;global.performance={now:()=>t};global.requestAnimationFrame=()=>{};global.setTimeout=()=>{};
const LS={};global.localStorage={getItem:k=>k in LS?LS[k]:null,setItem:(k,v)=>{LS[k]=String(v)}};
let seed=7;Math.random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};
const cl0=console.log;console.log=()=>{};
const html=fs.readFileSync(process.argv[2],'utf8');
(0,eval)(html.match(/<script>\n([\s\S]*?)<\/script>/)[1]+';global.__s={updP,keys,P,PORS,setPlayerCar,groundH,traffic,bots,heist,COL,ptSpec,ptRun,PTS,SUSP,bumpAt,setHandling,hm:()=>handlingMode,carSpec,IRBID_SPEED_BUMPS,checkSpeedBumpCrossing,currentDamageRecord,cycleDamageMode,dm:()=>damageMode,repairCurrentCar,TH,TSLIP};');
const S=global.__s,P=S.P,k=S.keys;S.traffic.length=0;S.bots.length=0;S.heist.cops.length=0;S.COL.clear();
(0,eval)('fine=function(){};toast=function(){}');
let fail=0;const ok=(c,m,v)=>{cl0((c?'PASS ':'FAIL ')+m+(v!==undefined?'  ['+v+']':''));if(!c)fail++};
const idx=n=>S.PORS.findIndex(m=>m[0]===n);
// ---- 1. calibration table for every car ----
const rows=[];let worst=0,big=0;
for(let i=0;i<S.PORS.length;i++){const s=S.ptSpec(i);let v=0;for(let j=0;j<4000;j++){const g=s.ng,F=s.T*1*s.ratio[g-1]/s.rw*s.eff*Math.min(1,1),rpm=v*s.ratio[g-1]/s.rw*60/(2*Math.PI);if(rpm>=s.red)break;
  const x=rpm/s.red,Ft=s.T*(s.ev?(x<.35?1:.35/x):x<.12?.5:x<.6?.55+.45*Math.sin((x-.12)/.48*Math.PI/2):x<.85?1:Math.max(.6,1-(x-.85)*1.3))*s.ratio[g-1]/s.rw*s.eff;v+=(Ft-.6*s.CdA*v*v-s.crr*s.m*9.81)/s.m*.05;if(v<0)break}
 const vt=Math.min(v,s.gov||1e9)*3.6/.98;rows.push({name:S.PORS[i][0],drive:s.drive,mass:s.m-75,gears:s.ng,redline:s.red,peakTorqueNm:Math.round(s.T),CdA:+s.CdA.toFixed(2),mu:s.mu,t100game:s.t100,t100sim:+(s.t100+s.err).toFixed(2),limiter:!!s.gov,vmaxGame:S.PORS[i][1],vmaxSim:Math.round(vt)});
 const e=Math.abs(s.err)/s.t100;worst=Math.max(worst,e);if(e>.1)big++}
ok(rows.every(r=>isFinite(r.peakTorqueNm)&&r.peakTorqueNm>0),'every car has a solved powertrain',rows.length);
ok(big<=Math.ceil(rows.length*.08),'0-100 within 10 % of the game value for >= 92 % of cars','outside: '+big+', worst '+(worst*100).toFixed(0)+' %');
ok(rows.filter(r=>Math.abs(r.vmaxSim-r.vmaxGame)/r.vmaxGame>.08).length<=Math.ceil(rows.length*.08),'top speed within 8 % for >= 92 % of cars','outside: '+rows.filter(r=>Math.abs(r.vmaxSim-r.vmaxGame)/r.vmaxGame>.08).length);
if(process.argv[3])fs.writeFileSync(process.argv[3],JSON.stringify(rows,null,0));
// ---- helpers: run in game on the start straight ----
function place(i){S.setPlayerCar(i);P.x=-135;P.z=-733;P.h=1.6;P.vx=P.vz=P.vy=0;P.y=P.pgh=S.groundH(P.x,P.z);P.gnd=true;P.al=0;S.PTS.idx=-1}
function step(n,ks,cb){for(let i=0;i<n;i++){for(const c in k)k[c]=0;Object.assign(k,ks);t+=16.7;S.updP(1/60,false);if(cb)cb(i)}}
const spd=()=>Math.hypot(P.vx,P.vz);
// ---- 2. Arcade untouched ----
ok(S.hm()===0,'default handling mode is Arcade');
S.setHandling(1);ok(S.hm()===1,'H switches to Realistic');
// ---- 3. in-game 0-100 and gears ----
for(const n of['Ford Focus RS','Ford Fiesta ST','Ford Mustang GT','Porsche 911','Tesla Model 3','Toyota Hilux']){const i=idx(n);if(i<0){ok(false,'car exists '+n);continue}place(i);
 let t100=0,gears=new Set(),maxRpm=0;step(60*25,{KeyW:1},j=>{gears.add(S.PTS.gear);maxRpm=Math.max(maxRpm,S.PTS.rpm);if(!t100&&spd()>=27.78)t100=(j+1)/60});
 const s=S.ptSpec(i),dv=t100/S.PORS[i][2];
 ok(t100>0&&dv>.8&&dv<1.35,n+' 0-100 in game close to the game value (start road has a grade)',t100.toFixed(2)+' s vs '+S.PORS[i][2]+' s');
 ok(s.ev?gears.size===1:gears.size>=3,n+(s.ev?' EV single speed':' shifts up through the gears'),[...gears].join(','));
 ok(maxRpm<=s.red+1,n+' rpm never above redline',Math.round(maxRpm)+' / '+s.red)}
// ---- 4. drivetrain launch: wheelspin and its effect ----
function launch(n,steer){const i=idx(n);place(i);let spin=0,yaw=0,h0=P.h;step(90,Object.assign({KeyW:1},steer?{KeyA:1}:{}),()=>{spin=Math.max(spin,S.PTS.spin)});yaw=Math.abs(P.h-h0);return{spin,yaw,drive:S.ptSpec(i).drive,v:spd()}}
const awd=launch('Ford Focus RS'),fwd=launch('Ford Fiesta ST'),rwd=launch('Ford Mustang GT');
cl0('     launch 1.5 s full throttle: AWD Focus RS spin '+awd.spin.toFixed(2)+' / FWD Fiesta ST '+fwd.spin.toFixed(2)+' / RWD Mustang GT '+rwd.spin.toFixed(2));
ok(awd.drive==='AWD'&&fwd.drive==='FWD'&&rwd.drive==='RWD','drivetrains as documented (AWD / FWD / RWD)');
ok(rwd.spin>awd.spin,'powerful RWD spins its wheels more than the AWD car at launch',rwd.spin.toFixed(2)+' > '+awd.spin.toFixed(2));
// v45: Realistic steering is now a two-axle tyre model (07g ptDyn), so its yaw is no longer Arcade's multiplied; the drivetrain balance is checked by which
// axle works harder (slip angle / peak) while launching with steer. Corner-entry versions of these checks are in tests/drift_v45.js.
function launchSlip(n){const i=idx(n);place(i);let f=0,r=0;step(90,{KeyW:1,KeyA:1},()=>{f+=S.TSLIP.af||0;r+=S.TSLIP.ar||0});return{f,r}}
const rwdT=launchSlip('Ford Mustang GT'),fwdT=launchSlip('Ford Fiesta ST');
ok(rwdT.r>rwdT.f,'RWD launching with steer: the rear axle works harder (power oversteer)',(rwdT.r/90).toFixed(2)+' vs front '+(rwdT.f/90).toFixed(2));
ok(fwdT.f>fwdT.r,'FWD launching with steer and wheelspin: the front axle works harder (understeer)',(fwdT.f/90).toFixed(2)+' vs rear '+(fwdT.r/90).toFixed(2));
// ---- 5. braking and engine braking ----
{place(idx('Ford Focus RS'));step(60*8,{KeyW:1});const v0=spd();step(60,{});const coast=v0-spd();place(idx('Ford Focus RS'));step(60*8,{KeyW:1});const v1=spd();let n=0;while(spd()>.6&&n<600){step(1,{KeyS:1});n++}
 const dec=v1/(n/60)/9.81;ok(coast>.2&&coast<4,'coasting 1 s slows the car by drag + engine braking',coast.toFixed(2)+' m/s from '+(v0*3.6).toFixed(0)+' km/h');ok(dec>.6&&dec<1.3,'full braking ~0.8-1.1 g (tyre/brake limited)',dec.toFixed(2)+' g')}
// ---- 6. speed bump: limited hop, suspension moves, damage once per crossing ----
const B=S.IRBID_SPEED_BUMPS.find(b=>b.estimated)||S.IRBID_SPEED_BUMPS[0];ok(!!B,'speed bumps present',S.IRBID_SPEED_BUMPS.length+' ('+S.IRBID_SPEED_BUMPS.filter(b=>!b.estimated).length+' mapped in OSM)');
ok(S.IRBID_SPEED_BUMPS.filter(b=>!b.estimated).length>=1,'OSM-mapped traffic calming is placed as real (not estimated) bumps');
function cross(kmh,mode){S.setHandling(mode);place(idx('Ford Focus RS'));const v=kmh/3.6;P.x=B.x-B.tx*6;P.z=B.z-B.tz*6;P.h=Math.atan2(B.tx,B.tz);P.vx=B.tx*v;P.vz=B.tz*v;P.y=P.pgh=S.groundH(P.x,P.z);B.armed=true;B.cooldown=-99;S.PTS.hz=S.PTS.hv=0;S.SUSP.zb=[0,0];S.SUSP.vb=[0,0];S.SUSP.zw=[0,0];S.SUSP.zh=[0,0];S.SUSP.vh=[0,0];S.SUSP.last=-99;
 let vy=0,hz=0,hits0=S.currentDamageRecord().impacts;const imp0=JSON.stringify(S.currentDamageRecord().susp);let maxVy=0,jo=0;S.SUSP.jolt=0;for(let j=0;j<120;j++){P.vx=B.tx*v;P.vz=B.tz*v;step(1,{});maxVy=Math.max(maxVy,P.vy);hz=Math.max(hz,Math.abs(S.SUSP.heave));jo=Math.max(jo,S.SUSP.jolt)}
 return{vy:maxVy,hz,jo,susp:S.currentDamageRecord().susp.slice()}}
while(S.dm()!==2)S.cycleDamageMode();S.repairCurrentCar('all');
const r30=cross(30,1),r70=cross(70,1),a70=cross(70,0);
cl0('     bump hop vy: realistic 30 km/h '+r30.vy.toFixed(2)+', 70 km/h '+r70.vy.toFixed(2)+' (arcade 70 km/h '+a70.vy.toFixed(2)+'); body heave '+r30.hz.toFixed(3)+' / '+r70.hz.toFixed(3)+' m');
ok(r30.vy<.35,'Realistic: 30 km/h over a bump is absorbed (small hop)',r30.vy.toFixed(2)+' m/s');
ok(r70.vy<=.75&&r70.jo>r30.jo*1.5,'70 km/h: a much harder jolt than 30 km/h, no launch (v44 quarter-car)','jolt '+r70.jo.toFixed(2)+' vs '+r30.jo.toFixed(2)+' m/s, hop '+r70.vy.toFixed(2)+' m/s');
ok(r30.hz>.005,'suspension visibly compresses over the bump',(r30.hz*100).toFixed(1)+' cm');
{S.repairCurrentCar('all');const before=S.currentDamageRecord().susp[0];cross(70,1);const after1=S.currentDamageRecord().susp[0];ok(after1<before,'a fast crossing damages suspension (Full mode)',before+' -> '+after1.toFixed(1));
 // stay on the bump line for 40 frames at speed 0 drift: no repeated registration
 let n=0;const s0=S.currentDamageRecord().susp[0];for(let j=0;j<40;j++){step(1,{})}ok(S.currentDamageRecord().susp[0]===s0,'no repeated damage after the crossing (armed / cooldown)')}
S.setHandling(0);ok(S.hm()===0,'back to Arcade');
cl0(fail?'handling: '+fail+' FAILED':'handling: all passed');process.exit(fail?1:0);
