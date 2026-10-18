// v44 visible-component damage checks (node tests/damage_v44.js dist/irbid-drive.html, from the repo root). Exits 1 on failure.
// Front / side / rear / pole / wall impacts -> the right parts, glass crack origins, detachment, flat tyre + rolling resistance, bent rims, persistence, repair.
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
 carMeshParts,tyreMu,TYS,dpGeo,DP_DEBRIS,DP_KEYS,IRBID_SPEED_BUMPS,SUSP,bumpAt,treeBreakV,WALL_DEC:()=>WALL_DEC,persistDamage,refreshDamageVisual,damageEffects,DFX,OBJ_CLASS,objClass,diagToggle,diagRender,IMPACT,damageRecords,repairItems,repairPart,payRepair,renderRepairs,dentZone,inspectRows,
 get fines(){return fines},set fines(v){fines=v},get spent(){return spent},set spent(v){spent=v},
 get mode(){return damageMode},set mode(v){damageMode=v},get clock(){return clock},set clock(v){clock=v}};`);
(0,eval)("redLight=function(){};wrongWay=function(){return false};fine=function(){};toast=function(){}");
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
const OX=-8500,OZ=0;const parts=()=>P.m.userData.dp||{},ov=()=>P.m.children.filter(c=>c.userData&&c.userData.damageOverlay);
const fresh=(n,mode)=>{S.mode=mode;car(n||'Ford Focus RS');place(OX,OZ,0)};
// Off: parts are built (visual detail) but nothing is recorded
fresh('Ford Focus RS',0);hit(25,0,-1);
ck('Off: every part tagged on the player mesh, nothing recorded',S.DP_KEYS.every(k=>parts()[k]&&parts()[k].userData.part===k)&&Object.values(R().parts).every(v=>v===0)&&R().cracks.every(c=>!c.length));
// 1. low-speed front collision: bumper scuffed only
fresh('Ford Focus RS',1);hit(4.5,0,-1);
ck('low-speed front (16 km/h): front bumper scuffed, bonnet / windscreen untouched',R().parts.bf>0&&R().parts.bf<.5&&R().parts.hood===0&&R().cracks[0].length===0,'bf '+R().parts.bf.toFixed(2));
// 2. high-speed front collision
fresh('Ford Focus RS',2);hit(22,0,-1,'wall');const F=JSON.parse(JSON.stringify(R()));
ck('high-speed front (79 km/h): bumper torn off, bonnet buckled, windscreen cracked, headlights broken, rear untouched',F.parts.bf>=1&&F.parts.hood>.3&&F.cracks[0].length===1&&F.lights[0]&&F.lights[1]&&F.parts.br===0&&F.parts.trunk===0&&F.zones.rl===100,'hood '+F.parts.hood.toFixed(2)+' crack '+JSON.stringify(F.cracks[0]));
ck('the torn-off bumper lies on the road as debris; the car shows the bonnet crumple and a crack overlay',S.DP_DEBRIS.length>=1&&!parts().bf.visible&&parts().hood.visible&&ov().length===1&&ov()[0].children.length>=3,'debris '+S.DP_DEBRIS.length);
{let mx=0;const h=parts().hood,a=h.geometry.attributes.position.array,b=h.userData.base;for(let i=1;i<a.length;i+=3)mx=Math.max(mx,a[i]-b[i]);ck('bonnet panel vertices are actually displaced (crease)',mx>.04,'max lift '+mx.toFixed(3)+' m')}
// 3. side collision (left)
fresh('Ford Focus RS',2);hit(14,-1,0,'vehicle');
ck('left side (50 km/h): left doors + left windows damaged, right side and bumpers clean',R().parts.dl>.3&&R().parts.dr===0&&R().cracks[2].length===1&&R().cracks[3].length===0&&R().parts.bf<.2,'dl '+R().parts.dl.toFixed(2)+' ml '+R().parts.ml.toFixed(2));
// 4. rear collision
fresh('Ford Focus RS',2);hit(12,0,1);
ck('rear (43 km/h): rear bumper + boot lid, tail lights, front clean',R().parts.br>.3&&R().parts.trunk>0&&(R().lights[2]||R().lights[3])&&R().parts.bf===0&&R().parts.hood===0&&R().zones.fl===100,'br '+R().parts.br.toFixed(2));
// 5. windscreen crack is laminated (stays), side window tempered (crazes when it fails)
fresh('Ford Focus RS',1);hit(8,0,-1);const c1=JSON.parse(JSON.stringify(R().cracks[0][0]));hit(8.5,0,-1);const c2=R().cracks[0];
ck('repeated front hits grow the same windscreen crack (no new random cracks everywhere)',c2.length===1&&c2[0][2]>c1[2],JSON.stringify(c2));
// 6. contact area: a pole makes a narrower, deeper dent than a wall at the same speed
fresh('Ford Focus RS',1);S.registerPlayerImpact(14,{type:'tree',r:.3},0,-1);const dp=R().dents[0];
fresh('Ford Focus RS',1);S.registerPlayerImpact(14,{type:'wall',hw:6,hd:.5,c:1,s:0},0,-1);const dw=R().dents[0];
ck('pole dent is narrower and deeper than a wall dent at 50 km/h',dp&&dw&&dp[6]<dw[6]&&dp[5]>dw[5],'pole r '+dp[6]+' d '+dp[5]+' | wall r '+dw[6]+' d '+dw[5]);
// 7. rigid wall at high speed never leaves the car pristine
fresh('Ford Focus RS',2);S.registerPlayerImpact(30,{type:'wall',hw:6,hd:.5,c:1,s:0},0,-1);
ck('108 km/h into a rigid wall: heavy body + engine + cooling damage',R().zones.fl<40&&R().engine<90&&R().cooling<80&&R().parts.bf>=1,'fl '+R().zones.fl.toFixed(0)+' engine '+R().engine.toFixed(0)+' cooling '+R().cooling.toFixed(0));
// 8. flat tyre: visible + slower + rolling resistance
fresh('Ford Focus RS',2);const v0=(()=>{place(OX,OZ,0);run(6,{KeyW:1});return Math.hypot(P.vx,P.vz)})();
place(OX,OZ,0);R().wheels[0].punct=true;R().wheels[0].health=40;S.refreshDamageVisual();const tyre=P.m.children.find(c=>c.userData.part==='tyre'&&c.userData.corner===0);
const fx=S.damageEffects();ck('flat FL tyre: squashed + bulging mesh, rolling resistance and pull in Full',tyre.scale.y<tyre.userData.p0[1]&&tyre.scale.x>1&&fx.roll>0&&fx.pull>0&&fx.maxSpeed<.7,'roll '+fx.roll+' pull '+fx.pull.toFixed(3));
run(6,{KeyW:1});const v1=Math.hypot(P.vx,P.vz);ck('flat tyre: the car is slower after 6 s full throttle',v1<v0*.92,(v0*3.6).toFixed(0)+' -> '+(v1*3.6).toFixed(0)+' km/h');
// 9. bent rim
fresh('Ford Focus RS',2);S.registerPlayerImpact(14,{type:'wall'},-.6,-.8);
ck('hit at the front-left corner bends the FL rim (vibration in Full)',R().rims[0]>0&&R().rims[3]===0&&S.damageEffects().vib>0,'rims '+R().rims.map(v=>v.toFixed(2)).join(' '));
// 10. persistence: the record survives a save/reload and a car switch
fresh('Ford Focus RS',1);hit(20,0,-1);S.persistDamage();const saved=JSON.parse(global.localStorage.getItem('irbid-drive-realism-v1')).cars['Ford Focus RS'];
S.setPlayerCar(idx('Ford Fiesta'));S.setPlayerCar(idx('Ford Focus RS'));
ck('parts, cracks and rims are saved and come back after switching cars (visual rebuilt)',saved.parts.bf>.5&&saved.cracks[0].length===1&&R().parts.bf===saved.parts.bf&&(R().parts.bf<1?parts().bf.visible:!parts().bf.visible)&&ov().length===1);
// 11. repair restores everything
S.spent=0;S.fines=1e7;S.payRepair(S.repairItems().map(q=>q.id));
ck('repair all: parts, cracks, rims cleared; bumper back on; overlays gone',Object.values(R().parts).every(v=>v===0)&&R().cracks.every(c=>!c.length)&&R().rims.every(v=>v===0)&&parts().bf.visible&&!parts().hood.visible&&ov().length===0);
// 12. one part repaired leaves the rest
fresh('Ford Focus RS',1);hit(22,0,-1);hit(14,-1,0);S.payRepair(['p:bf']);
ck('repairing only the front bumper keeps the doors and glass damaged',R().parts.bf===0&&R().parts.dl>0&&R().cracks[0].length>0);
// 13. durability differs per car (same hit, different crush)
const cmp=n=>{fresh(n,1);hit(7,0,-1);return R().parts.bf};
ck('per-car stiffness: same 25 km/h hit damages a Porsche 917 race car bumper more than a Cayenne SUV',cmp('Porsche 917')>cmp('Porsche Cayenne'));
// 14. speed bumps: speed sweep per car and profile (quarter-car per axle, tyre leaves the far side at speed)
{const cross=(b,n,kmh)=>{fresh(n,2);const v=kmh/3.6;P.x=b.x-b.tx*8;P.z=b.z-b.tz*8;P.h=Math.atan2(b.tx,b.tz);P.y=P.pgh=S.groundH(P.x,P.z);P.gnd=true;
  for(const k of['zb','vb','zw','zh','vh'])S.SUSP[k]=[0,0];S.SUSP.last=-99;let hz=0,pz=0,vy=0,cmp=0,jo=0;S.SUSP.jolt=0;
  for(let j=0;j<Math.ceil(16/v*60)+30;j++){P.vx=b.tx*v;P.vz=b.tz*v;t+=16.7;S.clock+=1/60;S.updP(1/60,false);S.damageTick(1/60);hz=Math.max(hz,Math.abs(S.SUSP.heave));pz=Math.max(pz,Math.abs(S.SUSP.pitch));vy=Math.max(vy,P.vy);cmp=Math.max(cmp,S.SUSP.comp[0],S.SUSP.comp[1]);jo=Math.max(jo,S.SUSP.jolt)}
  return{hz,pz,vy,cmp,jo,susp:Math.min(...R().susp)}};
 const B=S.IRBID_SPEED_BUMPS,est=B.find(b=>b.estimated),osm=B.find(b=>!b.estimated&&b.len>3);const rows=[];
 for(const[b,bn]of[[est,'0.9 m bump'],[osm,'3.7 m hump']]){if(!b)continue;for(const n of['Ford Focus RS','Porsche 917','Porsche Cayenne'])for(const kmh of[15,30,50,80]){const r=cross(b,n,kmh);rows.push([bn,n,kmh,r]);
  console.log('     '+bn.padEnd(11)+n.padEnd(17)+String(kmh).padStart(3)+' km/h  heave '+(r.hz*100).toFixed(1).padStart(4)+' cm  pitch '+(r.pz*57.3).toFixed(1).padStart(4)+' deg  compression '+(r.cmp*100).toFixed(1).padStart(4)+' cm  hop '+r.vy.toFixed(2)+' m/s  worst susp '+r.susp.toFixed(1)+'%  jolt '+r.jo.toFixed(2)+' m/s')}}
 const g=(bn,n,k)=>rows.find(r=>r[0]===bn&&r[1]===n&&r[2]===k)[3];
 ck('slow crossing (15 km/h) is mild on every car: body follows the bump (heave <= bump height), no damage, no hop, small jolt',rows.filter(r=>r[2]===15).every(r=>r[3].hz<=.08&&r[3].susp===100&&r[3].vy<.05&&r[3].jo<1.6));
 ck('the jolt (wheel compression speed, drives the chassis vibration) rises with speed on every car and profile',rows.every(r=>r[2]===15||r[3].jo>rows.find(q=>q[0]===r[0]&&q[1]===r[1]&&q[2]===(r[2]===30?15:r[2]===50?30:50))[3].jo));
 ck('0.9 m bump: compression grows with speed; 80 km/h damages the suspension',g('0.9 m bump','Ford Focus RS',80).cmp>g('0.9 m bump','Ford Focus RS',30).cmp&&g('0.9 m bump','Ford Focus RS',80).susp<100);
 ck('no launch: hop below 1.2 m/s even at 80 km/h',rows.every(r=>r[3].vy<=1.2));
 ck('the stiff, low race car bottoms out sooner than the SUV (less travel)',g('0.9 m bump','Porsche 917',50).susp<=g('0.9 m bump','Porsche Cayenne',50).susp&&g('0.9 m bump','Porsche 917',80).susp<g('0.9 m bump','Porsche Cayenne',80).susp);
 if(osm)ck('3.7 m hump is gentler than the 0.9 m bump at 50 km/h (less compression)',g('3.7 m hump','Ford Focus RS',50).cmp<g('0.9 m bump','Ford Focus RS',50).cmp)}
// 15. environment materials (energy based; the object keeps accumulated damage)
{const all=[];for(const L of S.COL.values())for(const c of L)if(!c.broken&&!all.includes(c))all.push(c);
 const inst=k=>S.DESTRUCTIBLE_INSTANCES.get(k),hidden=k=>{const e=inst(k);if(!e)return false;const m=new THREE.Matrix4();e.mesh.getMatrixAt(e.index,m);const sc=new THREE.Vector3();m.decompose(new THREE.Vector3(),new THREE.Quaternion(),sc);return sc.y<.1||sc.x<.01};
 const at=(o,v)=>{fresh('Ford Focus RS',2);P.x=o.x;P.z=o.z+3;P.h=Math.PI;P.vx=0;P.vz=-v;R().lastHit=-99;o.mhT=-9;return S.registerPlayerImpact(v,o,0,1)};
 const trees=all.filter(c=>c.type==='tree'&&c.visualKey&&inst(c.visualKey)).sort((a,b)=>a.trunkD-b.trunkD),thin=trees[0],thick=trees[trees.length-1];
 console.log('     trees with keys '+trees.length+'; trunk diameter '+thin.trunkD.toFixed(2)+'-'+thick.trunkD.toFixed(2)+' m; snap speed '+(S.treeBreakV(thin)*3.6).toFixed(0)+'-'+(S.treeBreakV(thick)*3.6).toFixed(0)+' km/h (1,500 kg)');
 at(thick,25);ck('thick tree (90 km/h): stays standing, canopy leans/sheds, car takes the full hit',!thick.broken&&thick.bent>0&&R().zones.fl<60,'bent '+(thick.bent||0).toFixed(2)+' fl '+R().zones.fl.toFixed(0));
 const vb=S.treeBreakV(thin);at(thin,vb*.75);const mid=!thin.broken;at(thin,vb*.75);
 ck('slim tree: one hit at 75% of its snap speed leaves it standing; the second (accumulated damage) fells it',mid&&thin.broken&&hidden(thin.visualKey+'/c0'),'d '+thin.trunkD.toFixed(2)+' m');
 const gw=all.find(c=>c.type==='gardenWall'&&c.visualKey&&inst(c.visualKey));
 at(gw,8);const crack=!gw.broken&&S.WALL_DEC().some(m=>m.visible);at(gw,15);
 ck('garden wall (masonry): 29 km/h cracks it (mark on the wall), 54 km/h collapses it into rubble',crack&&gw.broken&&hidden(gw.visualKey),'dmg '+(gw.dmg||0).toFixed(2));
 const bs=all.find(c=>c.type==='busShelter'&&c.visualKey&&inst(c.visualKey));at(bs,7);
 ck('bus shelter: glass panel shatters, the steel frame stays a collider',bs.glassBroken&&hidden(bs.visualKey)&&!bs.broken);
 const gr=all.find(c=>c.type==='guardrail'&&c.visualKey&&inst(c.visualKey));at(gr,20);const flG=R().zones.fl;
 const wall=all.find(c=>c.type===undefined&&c.hw>3);at(wall,20);const flW=R().zones.fl;
 ck('guardrail deflects (visible) and absorbs energy: less crush than a rigid wall at 72 km/h',gr.defl>0&&!gr.broken&&flG>flW,'rail '+gr.defl.toFixed(2)+' m, fl '+flG.toFixed(0)+' vs wall '+flW.toFixed(0));
 ck('building wall: rigid (never demolished), localized surface mark at the contact point',!wall.broken&&S.WALL_DEC().some(m=>m.visible&&Math.hypot(m.position.x-wall.x,m.position.z-(wall.z+3-1.21))<1.5))}
console.log('damage v44: '+(bad?bad+' FAILED':'all passed'));process.exit(bad?1:0);
