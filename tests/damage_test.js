// v39 damage / tyre / world-object checks (node tests/damage_test.js dist/irbid-drive.html). Prints PASS/FAIL per check, exits 1 on failure.
// Covers: v38 save migration, collision severity, localized zones + dents, the three modes, per-car durability, per-wheel tyre wear,
// burnouts by drivetrain, drift wear, landings, repairs, car switching, breakable / bendable / movable / rigid objects, diagnostics render.
const fs=require('fs');global.THREE=require(require('path').resolve('node_modules/three'));
const noop=new Proxy(function(){},{get:()=>noop,apply:()=>noop,set:()=>true});
THREE.WebGLRenderer=class{constructor(){this.domElement={style:{},insertAdjacentElement(){}};this.shadowMap={}}setPixelRatio(){}setSize(){}render(){}};
let lastHTML='';const el=()=>({getContext:()=>new Proxy(noop,{get:(t,k)=>k==='measureText'?(q=>({width:String(q).length*14})):t[k]}),appendChild(){},remove(){},style:{},dataset:{},setAttribute(){},addEventListener(){},focus(){},blur(){},select(){},value:'',children:[],classList:{add(){},remove(){},toggle(){}},set innerHTML(v){lastHTML=v},set textContent(v){}});
global.document={getElementById:el,createElement:el,body:{appendChild(){}}};global.window=global;
global.addEventListener=()=>{};global.innerWidth=1280;global.innerHeight=720;global.devicePixelRatio=1;
let t=1000;global.performance={now:()=>t};global.requestAnimationFrame=()=>{};global.setTimeout=()=>{};
// a saved v38 record (old shape) must migrate
const LS={'irbid-drive-realism-v1':JSON.stringify({mode:0,cars:{'Ford Mustang':{durability:90,body:61,engine:80,tyres:70,suspension:55,brakes:90,impacts:3,lastHit:-99,lastX:0,lastZ:0}}})};
global.localStorage={getItem:k=>k in LS?LS[k]:null,setItem:(k,v)=>{LS[k]=String(v)}};
const cl0=console.log;console.log=()=>{};
const html=fs.readFileSync(process.argv[2]||'dist/irbid-drive.html','utf8');
(0,eval)(html.match(/<script>\n([\s\S]*?)<\/script>/)[1]+`
;global.__s={updP,keys,PORS,setPlayerCar,P,groundH,TH,COL,traffic,bots,heist,DESTRUCTIBLE_INSTANCES,SIGN_PLATES,FALLING_POLES,MOVERS,DEBRIS,
 damageEffects,registerPlayerImpact,registerLanding,breakObstacle,objectImpact,objectsTick,damageTick,repairCurrentCar,currentDamageRecord,getDamageRecord,carSpec,
 carMeshParts,tyreMu,TYS,OBJ_CLASS,objClass,diagToggle,diagRender,IMPACT,damageRecords,
 get mode(){return damageMode},set mode(v){damageMode=v},get clock(){return clock},set clock(v){clock=v}};`);
(0,eval)('redLight=function(){};wrongWay=function(){return false};fine=function(){};toast=function(){}');
console.log=cl0;
const S=global.__s,P=S.P,k=S.keys;S.traffic.length=0;S.bots.length=0;S.heist.cops.length=0;
let bad=0;const ck=(name,ok,info)=>{if(!ok)bad++;console.log((ok?'PASS ':'FAIL ')+name+(info!==undefined?'  ['+info+']':''))};
const idx=n=>S.PORS.findIndex(m=>m[0]===n),car=n=>{S.setPlayerCar(idx(n));S.repairCurrentCar()};
const place=(x,z,h)=>{P.x=x;P.z=z;P.h=h||0;P.vx=P.vz=P.vy=0;P.y=P.pgh=S.groundH(x,z);P.gnd=true};
const keysOff=()=>{for(const c in k)k[c]=0};
const run=(sec,ks)=>{keysOff();Object.assign(k,ks||{});for(let i=0;i<sec*60;i++){t+=16.7;S.clock+=1/60;S.updP(1/60,false);S.damageTick(1/60)}keysOff()};
const hit=(v,nx,nz,type)=>{const r=S.currentDamageRecord();r.lastHit=-99;return S.registerPlayerImpact(v,{type:type||'wall'},nx,nz)};
const R=()=>S.currentDamageRecord();
// open, empty spot far from colliders
const OX=-8500,OZ=0;

// 1. migration of a v38 record
S.setPlayerCar(idx('Ford Mustang'));const mg=R();
ck('v38 record migrates (zones from body, wheels from tyres)',mg.v===2&&Math.abs(mg.zones.fl-61)<1e-9&&mg.wheels.every(w=>Math.abs(w.tread-70)<1e-9)&&mg.susp[2]===55&&mg.engine===80,'fl '+mg.zones.fl+' tread '+mg.wheels[0].tread);

// 2. Off: nothing recorded, objects rigid
S.mode=0;car('Ford Focus RS');place(OX,OZ);P.vz=20;hit(20,0,-1);
ck('Off: 72 km/h wall hit records nothing',R().impacts===0&&R().dents.length===0&&R().zones.fl===100);

// 3. severity scales with speed; low-speed contact ~free
S.mode=1;car('Ford Focus RS');place(OX,OZ);hit(2.2,0,-1);const r0=R();
ck('Cosmetic: 8 km/h nudge does nothing',r0.zones.fl===100&&r0.dents.length===0);
hit(4,0,-1);const lowLoss=200-R().zones.fl-R().zones.fr;car('Ford Focus RS');hit(14,0,-1);const hiLoss=200-R().zones.fl-R().zones.fr;
ck('Cosmetic: 50 km/h hit damages far more than 14 km/h (14 km/h: < 8% per front zone)',hiLoss>lowLoss*5&&lowLoss<16,'14 km/h '+lowLoss.toFixed(1)+' vs 50 km/h '+hiLoss.toFixed(1));

// 4. localization: front-left corner hit
car('Ford Focus RS');place(OX,OZ,0);
// heading 0 = forward +z; obstacle ahead-left: contact direction from car (toward obstacle) = forward + left. left = (cos h, -sin h) = (+1,0)
{const dx=.35,dz=1,l=Math.hypot(dx,dz);hit(12,-dx/l,-dz/l)}
const z=R().zones;ck('front-left hit: fl damaged most',z.fl<z.fr&&z.fl<100,'fl '+z.fl.toFixed(1)+' fr '+z.fr.toFixed(1));
ck('front-left hit: rear zones untouched',z.rl===100&&z.rr===100&&z.l>z.fl,'rl '+z.rl+' rr '+z.rr+' l '+z.l.toFixed(1));
ck('front-left hit: IMPACT zone/face',S.IMPACT.zone==='fl'&&S.IMPACT.face==='front',S.IMPACT.zone+'/'+S.IMPACT.face);
ck('front-left hit: left headlight broken, right intact, tails intact',R().lights[0]===1&&R().lights[2]===0&&R().lights[3]===0,R().lights.join(''));
// dent deforms the body locally (front vertices move, rear do not)
const parts=S.carMeshParts(P.m),body=parts.body,pa=body.geometry.attributes.position.array,ba=body.userData.base;
let frontMove=0,rearMove=0;for(let i=0;i<pa.length;i+=3){const d=Math.hypot(pa[i]-ba[i],pa[i+1]-ba[i+1],pa[i+2]-ba[i+2]);if(ba[i+2]>1.2)frontMove=Math.max(frontMove,d);if(ba[i+2]<-1.2)rearMove=Math.max(rearMove,d)}
ck('dent: front body vertices displaced, rear unchanged',frontMove>.05&&rearMove===0,'front '+frontMove.toFixed(3)+' m, rear '+rearMove.toFixed(3)+' m, verts '+pa.length/3);
const hlL=parts.hl.find(m=>m.userData.side>0),hlR=parts.hl.find(m=>m.userData.side<0);
ck('broken headlight mesh swapped to dark material',hlL.material!==hlR.material);
// side impact on the right rear door area
car('Ford Focus RS');place(OX,OZ,0);hit(9,1,0.0001);   // obstacle on the right (normal points +x... to the car's left), i.e. contact on the right side
const zr=R().zones;ck('right-side hit: right side damaged, left side untouched',zr.r<100&&zr.l===100,'r '+zr.r.toFixed(1)+' l '+zr.l);
ck('right-side hit: right windows cracked',R().glass[3]>0&&R().glass[2]===0,R().glass.map(v=>v.toFixed(2)).join(' '));

// 5. Cosmetic vs Full mechanical
car('Ford Focus RS');S.mode=1;hit(25,0,-1);ck('Cosmetic: no mechanical damage',R().engine===100&&R().cooling===100&&R().susp.every(v=>v===100));
car('Ford Focus RS');S.mode=2;hit(25,0,-1);const rf=R();
ck('Full: 90 km/h frontal hits engine + radiator + front suspension, not rear suspension',rf.engine<100&&rf.cooling<100&&rf.susp[0]<100&&rf.susp[2]===100,'eng '+rf.engine.toFixed(0)+' cool '+rf.cooling.toFixed(0)+' susFL '+rf.susp[0].toFixed(0)+' susRL '+rf.susp[2]);
// rear-engined car: rear impact damages the engine, frontal does not reach it
car('Porsche 911');S.mode=2;hit(16,0,1);const rp={engine:R().engine};car('Porsche 911');hit(16,0,-1);const fp={engine:R().engine};
ck('Porsche 911 (rear engine): rear hit damages engine, front hit does not',rp.engine<100&&fp.engine===100,'rear '+rp.engine.toFixed(0)+' front '+fp.engine.toFixed(0));
// wheel strike: punctures that tyre, bends that corner, causes a pull
car('Ford Focus RS');S.mode=2;{const W=S.carSpec(P.idx).W,L=S.carSpec(P.idx).L;hit(11,-1,-.001)}   // left side, mid -> doors, no wheel
const doorOnly=JSON.parse(JSON.stringify(R()));car('Ford Focus RS');hit(10,-.62,-.78);const wr=R(),fx=S.damageEffects();
ck('Full: front-left wheel strike damages FL suspension/alignment and pulls',wr.susp[0]<100&&wr.align[0]!==0&&fx.pull!==0,'susFL '+wr.susp[0].toFixed(0)+' toe '+wr.align[0].toFixed(2)+' pull '+fx.pull.toFixed(3));
ck('door hit does not touch the wheels',doorOnly.susp.every(v=>v===100),doorOnly.susp.map(v=>v.toFixed(0)).join(' '));

// 6. per-car durability differs
const lossFor=n=>{car(n);S.mode=2;hit(15,0,-1);const r=R();return 200-r.zones.fl-r.zones.fr};
const Lf=lossFor('Ford F-150'),Lc=lossFor('Ford Focus RS'),Lr=lossFor('Porsche 917');
ck('same 54 km/h hit: pickup < hatch < race car body loss',Lf<Lc&&Lc<Lr,'F-150 '+Lf.toFixed(1)+' Focus RS '+Lc.toFixed(1)+' 917 '+Lr.toFixed(1));
const specs=S.PORS.map((m,i)=>S.carSpec(i)),uniq=new Set(specs.map(s=>[s.mass,s.drive,s.b1.join(),s.comp.engine.toFixed(3),s.tyre.dur].join('|')));
ck('every car has a profile; profiles are not all identical',specs.length===217&&uniq.size>150,uniq.size+' distinct of '+specs.length);
ck('drivetrains: Focus RS AWD, Fiesta ST FWD, Mustang GT RWD, 911 rear engine',S.carSpec(idx('Ford Focus RS')).drive==='AWD'&&S.carSpec(idx('Ford Fiesta ST')).drive==='FWD'&&S.carSpec(idx('Ford Mustang GT')).drive==='RWD'&&S.carSpec(idx('Porsche 911')).eng==='R');
// vehicle-to-vehicle shares energy by mass
car('Ford Focus RS');hit(15,0,-1,'vehicle');const veh=200-R().zones.fl-R().zones.fr;
ck('car-to-car at 54 km/h closing does less than a wall at 54',veh<Lc,'vehicle '+veh.toFixed(1)+' vs wall '+Lc.toFixed(1));

// 7. tyres: burnouts by drivetrain
const burn=(n,sec,ks)=>{car(n);S.mode=2;place(OX,OZ,0);run(sec,ks);const W=R().wheels;return{F:(200-W[0].tread-W[1].tread)/2,Rr:(200-W[2].tread-W[3].tread)/2,tR:(W[2].temp+W[3].temp)/2,tF:(W[0].temp+W[1].temp)/2,v:Math.hypot(P.vx,P.vz),bt:S.TYS.burnT}};
const mus=burn('Ford Mustang GT',3,{KeyW:1,KeyS:1});
ck('RWD Mustang GT, throttle+brake 3 s: burnout, car held, rear tyres wear and heat, fronts do not',mus.bt>2.5&&mus.v<1&&mus.Rr>0.3&&mus.F<0.01&&mus.tR>mus.tF+40,'rear wear '+mus.Rr.toFixed(2)+'% front '+mus.F.toFixed(3)+'% rear '+mus.tR.toFixed(0)+'C front '+mus.tF.toFixed(0)+'C v '+mus.v.toFixed(2));
const mus30=burn('Ford Mustang GT',30,{KeyW:1,KeyS:1});
ck('sustained 30 s burnout wears far more than 3 s, but tyres survive the first seconds',mus30.Rr>mus.Rr*8&&mus.Rr<5,'3 s '+mus.Rr.toFixed(1)+'% vs 30 s '+mus30.Rr.toFixed(1)+'%');
const fwdBrake=burn('Ford Fiesta ST',3,{KeyW:1,KeyS:1}),fwdHb=burn('Ford Fiesta ST',3,{KeyW:1,Space:1});
ck('FWD Fiesta ST: foot brake holds the driven fronts (no burnout); handbrake burnout wears FRONTS only',fwdBrake.bt===0&&fwdHb.bt>2.5&&fwdHb.F>0.3&&fwdHb.Rr<0.01,'brake bt '+fwdBrake.bt.toFixed(1)+' | hb front '+fwdHb.F.toFixed(2)+'% rear '+fwdHb.Rr.toFixed(3)+'%');
const awd=burn('Ford Focus RS',3,{KeyW:1,KeyS:1});
ck('AWD Focus RS: throttle+brake cannot overcome all four wheels (no burnout)',awd.bt===0&&awd.Rr<awd.F+0.05&&awd.Rr<mus.Rr/4,'bt '+awd.bt+' wear F '+awd.F.toFixed(3)+' R '+awd.Rr.toFixed(3)+' v '+awd.v.toFixed(2));
const weak=burn('Ford Model T',3,{KeyW:1,KeyS:1});ck('Model T: too weak to burn out',weak.bt===0);
// Off mode never burns out and never wears
S.mode=0;{car('Ford Mustang GT');S.mode=0;place(OX,OZ,0);run(2,{KeyW:1,KeyS:1});ck('Off: no burnout, no wear',S.TYS.burnT===0&&R().wheels.every(w=>w.tread===100))}

// 8. drifting wears per wheel (rears more), launch spin small, ordinary driving negligible
const drift=n=>{car(n);S.mode=2;place(OX,OZ,0);run(4,{KeyW:1});run(10,{KeyW:1,KeyA:1});return R().wheels.map(w=>100-w.tread)};
const dw=drift('Ford Mustang GT');
ck('10 s power-oversteer slide: every tyre wears, rears more than fronts, outside more than inside',dw.every(v=>v>0)&&dw[2]+dw[3]>dw[0]+dw[1]&&dw[3]>dw[2],'FL '+dw.map(v=>v.toFixed(2)).join(' / ')+' %');
car('Ford Mustang GT');S.mode=2;place(OX,OZ,0);run(2,{KeyW:1});const launch=R().wheels.map(w=>100-w.tread);
ck('2 s full-throttle launch: small wear',Math.max(...launch)<1.5,launch.map(v=>v.toFixed(3)).join(' '));
car('Ford Focus RS');S.mode=2;place(OX,OZ,0);run(3,{KeyW:1});for(let i=0;i<12;i++){run(.4,i%2?{KeyD:1}:{KeyA:1});run(1,{KeyW:1});run(2.6,{})}
const city=R().wheels.map(w=>100-w.tread);ck('51 s of ordinary driving (cruise, coast, short steering inputs): < 1% wear per tyre',Math.max(...city)<1,city.map(v=>v.toFixed(3)).join(' '));

// 9. worn tyres reduce grip only in Full
car('Ford Mustang GT');for(const w of R().wheels)w.tread=3;S.mode=1;const e1=S.damageEffects().grip;S.mode=2;const e2=S.damageEffects();
ck('worn tyres: grip unchanged in Cosmetic, reduced in Full',e1===1&&e2.grip<.8&&e2.lat<.9,'Full grip '+e2.grip.toFixed(2)+' lat '+e2.lat.toFixed(2));
const W0=R().wheels[0];W0.tread=100;W0.punct=true;R().wheels[1].tread=100;ck('punctured tyre differs from a worn one (lower grip, pull, vibration, speed cap)',S.tyreMu(W0)<S.tyreMu({tread:3,temp:25,health:100,punct:false})&&S.damageEffects().pull>0&&S.damageEffects().vib>0&&S.damageEffects().maxSpeed<=.62);

// 10. landing
car('Ford Focus RS');S.mode=2;S.registerLanding(-9);ck('Full: hard landing (9 m/s) damages suspension + underbody',R().susp.every(v=>v<100)&&R().zones.u<100);
car('Ford Focus RS');S.registerLanding(-4);ck('normal landing (4 m/s) is free',R().susp.every(v=>v===100));

// 11. repairs and switching
car('Ford Focus RS');S.mode=2;hit(20,0,-1);S.repairCurrentCar('tyres');ck('Replace tyres: new tyres, body damage kept',R().wheels.every(w=>w.tread===100&&!w.punct)&&R().zones.fl<100);
S.repairCurrentCar();ck('Repair all restores every component',R().zones.fl===100&&R().engine===100&&R().dents.length===0&&R().lights.every(v=>!v));
car('Ford Focus RS');hit(20,0,-1);const focusFl=R().zones.fl;S.setPlayerCar(idx('Ford Fiesta ST'));const fi=R();
ck('switching cars does not carry damage over',fi.zones.fl===100&&fi.dents.length===0,'Fiesta fl '+fi.zones.fl);
const fiParts=S.carMeshParts(P.m);ck('new car mesh is not dented',!fiParts.body.userData.base);
S.setPlayerCar(idx('Ford Focus RS'));ck('switching back restores that car\'s own damage + dents',R().zones.fl===focusFl&&!!S.carMeshParts(P.m).body.userData.base);
const saved=JSON.parse(LS['irbid-drive-realism-v1']);ck('per-car damage persisted by name',saved.cars['Ford Focus RS'].zones.fl===focusFl&&saved.cars['Ford Focus RS'].v===2);

// 12. world objects
S.mode=2;const cols=[];for(const L of S.COL.values())for(const c of L)cols.push(c);const uniqC=[...new Set(cols)];
const byType=ty=>uniqC.find(c=>c.type===ty&&!c.broken);
const counts={};for(const c of uniqC){const k2=S.objClass(c).cls;counts[k2]=(counts[k2]||0)+1}
ck('every collider classifies (rigid / breakable / movable)',(counts.rigid||0)>0&&counts.breakable>0&&counts.movable>0,JSON.stringify(counts));
car('Ford Focus RS');const sign=byType('sign');let r=S.objectImpact(sign,3,1500,0,-1);
ck('road sign: 11 km/h bends it, does not break it',!sign.broken&&sign.bent>0,'lean '+(sign.bent||0).toFixed(2)+' rad');
r=S.objectImpact(sign,8,1500,0,-1);ck('road sign: 29 km/h knocks it down; car keeps most speed',sign.broken&&r.broke&&r.gave>0&&r.gave<3,'speed loss '+r.gave.toFixed(2)+' m/s');
const plate=S.SIGN_PLATES.get(sign.visualKey),pp=plate.C.mesh.geometry.attributes.position.array,i0=plate.n*3;
ck('broken sign plate collapsed in the merged mesh',pp[i0]===pp[i0+3]&&pp[i0+1]===pp[i0+10]);
const sl=byType('streetLight');r=S.objectImpact(sl,10,1500,1,0);
ck('street light: 36 km/h only bends it (stays a collider)',!sl.broken&&sl.bent>0);
ck('heavier car breaks a pole at a lower speed (energy-based)',S.breakObstacle(byType('utilityPole'),10,2500)&&!S.breakObstacle(byType('utilityPole'),10,1500));
const sl2=byType('streetLight');S.objectImpact(sl2,20,1500,1,0);const arm=S.DESTRUCTIBLE_INSTANCES.get(sl2.visualKey+'/arm'),M=new THREE.Matrix4();arm.mesh.getMatrixAt(arm.index,M);
ck('broken street light hides its arm (no floating lamp)',sl2.broken&&Math.abs(M.elements[0])+Math.abs(M.elements[5])<1e-9);
const bin=byType('bin');const bx=bin.x,bz=bin.z;r=S.objectImpact(bin,8,1500,0,-1);for(let i=0;i<300;i++)S.objectsTick(1/60);
ck('dumpster: shoved along the hit direction, collider re-added where it stopped',r.gave>0&&!bin.broken&&Math.hypot(bin.x-bx,bin.z-bz)>2&&(bin.z-bz)>0&&S.MOVERS.length===0,'moved '+Math.hypot(bin.x-bx,bin.z-bz).toFixed(1)+' m, car speed loss '+r.gave.toFixed(2));
const wall=uniqC.find(c=>c.type==='solid');r=S.objectImpact(wall,15,1500,0,-1);ck('wall: rigid, nothing gives way',r.gave===0&&!wall.broken&&r.ebs===15);
const tree=byType('tree');r=S.objectImpact(tree,15,1500,0,-1);ck('tree: rigid',r.gave===0&&!tree.broken);

// 13. diagnostics renders from live state
S.mode=2;car('Ford Focus RS');hit(20,0,-1);S.diagToggle(true);
ck('diagnostics panel lists components, zones and four tyres',/Engine/.test(lastHTML)&&/front-left/.test(lastHTML)&&/RR/.test(lastHTML)&&/Repair all/.test(lastHTML)&&/tread/.test(lastHTML));
S.diagToggle(false);S.mode=0;

console.log(bad?'damage: '+bad+' FAILED':'damage: all passed');process.exit(bad?1:0);
