// v38 realism checks (node tests/realism_test.js dist/irbid-drive.html): damage modes, Off = unchanged physics,
// pole break on terrain, speed bumps on terrain + hop, repair, persistence, no per-frame allocation. Prints PASS/FAIL per check.
const fs=require('fs');global.THREE=require('three');
const noop=new Proxy(function(){},{get:()=>noop,apply:()=>noop,set:()=>true});
THREE.WebGLRenderer=class{constructor(){this.domElement={style:{},insertAdjacentElement(){}};this.shadowMap={}}setPixelRatio(){}setSize(){}render(){}};
const el=()=>({getContext:()=>new Proxy(noop,{get:(t,k)=>k==='measureText'?(q=>({width:String(q).length*14})):t[k]}),appendChild(){},remove(){},style:{},dataset:{},setAttribute(){},addEventListener(){},focus(){},blur(){},select(){},value:'',children:[],classList:{add(){},remove(){},toggle(){}},set innerHTML(v){},set textContent(v){}});
global.document={getElementById:el,createElement:el,body:{appendChild(){}}};global.window=global;
global.addEventListener=()=>{};global.innerWidth=1280;global.innerHeight=720;global.devicePixelRatio=1;
let t=1000;global.performance={now:()=>t};global.requestAnimationFrame=()=>{};global.setTimeout=()=>{};
const LS={};global.localStorage={getItem:k=>k in LS?LS[k]:null,setItem:(k,v)=>{LS[k]=String(v)}};
const html=fs.readFileSync(process.argv[2]||'dist/irbid-drive.html','utf8');
const js=html.match(/<script>\n([\s\S]*?)<\/script>/)[1]+`
;global.__s={updP,keys,PORS,setPlayerCar,P,groundH,TH,COL,traffic,bots,heist,DESTRUCTIBLE_INSTANCES,IRBID_SPEED_BUMPS,FALLING_POLES,
 damageEffects,registerPlayerImpact,breakObstacle,checkSpeedBumpCrossing,repairCurrentCar,cycleDamageMode,currentDamageRecord,
 get mode(){return damageMode},set mode(v){damageMode=v}};`;
(0,eval)(js);
(0,eval)('colB=function(){return false};redLight=function(){};wrongWay=function(){return false};fine=function(){};toast=function(){}');
const S=global.__s,P=S.P,k=S.keys;S.traffic.length=0;S.bots.length=0;S.heist.cops.length=0;
let bad=0;const ck=(name,ok,info)=>{if(!ok)bad++;console.log((ok?'PASS ':'FAIL ')+name+(info!==undefined?'  ['+info+']':''))};
const idx=n=>S.PORS.findIndex(m=>m[0]===n),FOCUS=idx('Ford Focus RS');
const all1=e=>e.maxSpeed===1&&e.accel===1&&e.steering===1&&e.grip===1&&e.brakes===1;
function t100(){S.setPlayerCar(FOCUS);P.x=-8500;P.z=0;P.h=0;P.vx=P.vz=P.vy=0;P.y=P.pgh=S.groundH(P.x,P.z);P.gnd=true;k.KeyW=true;let tt=0;
 for(let n=0;n<60*40;n++){S.updP(1/60,false);tt+=1/60;if(Math.hypot(P.vx,P.vz)*3.6>=100)break}k.KeyW=false;return tt}
const hit=v=>{const r=S.currentDamageRecord();r.lastHit=-99;S.registerPlayerImpact(v,{type:'wall'},0,-1)};

// 1. defaults and Off mode
ck('default mode is Off',S.mode===0,S.mode);
ck('Off: all multipliers 1',all1(S.damageEffects()));
ck('damageEffects reuses one object',S.damageEffects()===S.damageEffects());
S.setPlayerCar(FOCUS);S.repairCurrentCar();hit(20);
ck('Off: impact does no damage',S.currentDamageRecord().body===100,S.currentDamageRecord().body);
const base=t100();

// 2. cosmetic
S.cycleDamageMode();ck('cycle -> Cosmetic',S.mode===1);
hit(20);const rc=S.currentDamageRecord();
ck('Cosmetic: body damaged',rc.body<100,rc.body.toFixed(1));
ck('Cosmetic: engine untouched',rc.engine===100);
ck('Cosmetic: multipliers stay 1',all1(S.damageEffects()));
ck('Cosmetic: 0-100 unchanged',Math.abs(t100()-base)<1e-9,base.toFixed(3));

// 3. full
S.cycleDamageMode();ck('cycle -> Full',S.mode===2);
S.repairCurrentCar();ck('Full, repaired: 0-100 unchanged',Math.abs(t100()-base)<1e-9);
for(let i=0;i<6;i++)hit(25);const rf=S.currentDamageRecord(),ef=S.damageEffects();
ck('Full: engine/tyres/suspension damaged',rf.engine<100&&rf.tyres<100&&rf.suspension<100,['eng',rf.engine.toFixed(0),'tyr',rf.tyres.toFixed(0),'sus',rf.suspension.toFixed(0)].join(' '));
// v39 floors (07c damageEffects): a wrecked car keeps >= 40% top speed, 30% accel, 45% steering, 35% grip, 50% brakes, 45% lateral grip
ck('Full: multipliers within bounds',ef.maxSpeed>=.4&&ef.accel>=.3&&ef.steering>=.45&&ef.grip>=.35&&ef.brakes>=.5&&ef.lat>=.45&&!all1(ef),['spd',ef.maxSpeed.toFixed(2),'acc',ef.accel.toFixed(2),'str',ef.steering.toFixed(2),'grip',ef.grip.toFixed(2),'lat',ef.lat.toFixed(2)].join(' '));
const slow=t100();ck('Full, damaged: 0-100 slower',slow>base,base.toFixed(2)+'s -> '+slow.toFixed(2)+'s');
const st=JSON.parse(LS['irbid-drive-realism-v1']||'{}');
ck('persisted to irbid-drive-realism-v1',st.mode===2&&st.cars&&st.cars['Ford Focus RS']);
ck('irbid-save not touched by damage',!('irbid-save' in LS)||!/body|engine/.test(LS['irbid-save']));
S.repairCurrentCar();const rr=S.currentDamageRecord();
ck('repair restores 100%',['body','engine','tyres','suspension','brakes'].every(q=>rr[q]===100));
ck('repair: multipliers back to 1',all1(S.damageEffects()));

// 4. pole break on the steepest-lifted breakable pole
let pole=null,col=null;const cols=new Set();for(const L of S.COL.values())for(const c of L)if(c.breakable&&c.visualKey)cols.add(c);
for(const c of cols){const lift=Math.abs(S.TH(c.x,c.z));if(S.DESTRUCTIBLE_INSTANCES.has(c.visualKey)&&(!col||lift>Math.abs(S.TH(col.x,col.z))))col=c}
ck('breakable poles registered',cols.size>0&&!!col,cols.size+' colliders, '+S.DESTRUCTIBLE_INSTANCES.size+' instances');
if(col){const e=S.DESTRUCTIBLE_INSTANCES.get(col.visualKey),M=new THREE.Matrix4();e.mesh.getMatrixAt(e.index,M);
 const h=Math.max(.3,e.item[5]||1),liveBase=e.mesh.position.y+M.elements[13]-h/2,gh=S.TH(col.x,col.z);
 ck('pole stands on terrain before break',Math.abs(liveBase-gh)<.6,'base '+liveBase.toFixed(2)+' TH '+gh.toFixed(2));
 ck('below breakAt: no break',!S.breakObstacle(col,col.breakAt-1)&&!col.broken);
 const nf=S.FALLING_POLES.length;ck('above breakAt: breaks',S.breakObstacle(col,col.breakAt+2)&&col.broken);
 let still=0;for(const L of S.COL.values())if(L.includes(col))still++;ck('collider removed from COL',still===0);
 e.mesh.getMatrixAt(e.index,M);const stump=e.mesh.position.y+M.elements[13];
 ck('stump at ground (not flat-frame y)',Math.abs(stump-gh)<.6,'stump '+stump.toFixed(2)+' TH '+gh.toFixed(2));
 const fp=S.FALLING_POLES[nf];ck('falling pole pivot on terrain',fp&&Math.abs(fp.pivot.position.y-gh)<.6,fp&&fp.pivot.position.y.toFixed(2));
 ck('second break is a no-op',!S.breakObstacle(col,99))}

// 5. speed bumps
const B=S.IRBID_SPEED_BUMPS;ck('speed bumps built',B.length>0&&B.length<=90,B.length);
let worst=0;for(const b of B){const d=Math.abs(b.mesh.position.y-.05-S.TH(b.x,b.z));if(d>worst)worst=d}
ck('bumps sit on terrain (no double lift)',worst<.3,'max offset '+worst.toFixed(2)+' m');
if(B.length){const b=B[0];S.mode=0;P.vy=0;P.vx=b.tx*15;P.vz=b.tz*15;const px=b.x-b.tx*.6,pz=b.z-b.tz*.6;P.x=b.x+b.tx*.4;P.z=b.z+b.tz*.4;
 S.checkSpeedBumpCrossing(px,pz);ck('crossing at 54 km/h gives a small hop (damage Off too)',P.vy>.1&&P.vy<1.1,P.vy.toFixed(2)+' m/s')}

console.log(bad?'realism: '+bad+' FAILED':'realism: all passed');process.exit(bad?1:0);
