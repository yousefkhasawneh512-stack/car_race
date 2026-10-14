// ---- vehicle damage, subtle impact effects, and OSM-informed estimated speed bumps ----
// Road data and POIs are bundled from OpenStreetMap. The currently bundled extract has no
// traffic_calming-tagged features, so bumps are explicitly inferred near mapped schools,
// hospitals/clinics, and parks, on nearby local/service roads. They are not claimed as surveyed locations.
const IRBID_DAMAGE_STORE='irbid-drive-realism-v1';
let damageMode=0,damageRecords={},damageSaveClock=0,lastDamageToast=-99;
try{const savedRealism=JSON.parse(localStorage.getItem(IRBID_DAMAGE_STORE)||'{}');damageMode=cl(+savedRealism.mode||0,0,2)|0;damageRecords=savedRealism.cars&&typeof savedRealism.cars==='object'?savedRealism.cars:{}}catch(e){}
const DAMAGE_MODE_NAMES=['Off','Cosmetic','Full'];
const damageButton=document.getElementById('damageBtn'),repairButton=document.getElementById('repairBtn');
function persistDamage(){try{localStorage.setItem(IRBID_DAMAGE_STORE,JSON.stringify({mode:damageMode,cars:damageRecords}))}catch(e){}}
function durabilityForCar(i){
 const m=PORS[i],kind=m[6],kindBonus=kind==='s'?22:kind==='v'?18:kind==='p'?16:kind==='h'?12:kind==='r'?-18:kind==='o'?-5:kind==='q'?4:0;
 // Gameplay balance only: this is relative durability, not manufacturer crash-test data.
 const accelPenalty=cl((m[2]-5)*1.1,-5,8),hash=String(m[0]).split('').reduce((a,c)=>((a*31+c.charCodeAt(0))|0),7),individual=((Math.abs(hash)%9)-4);
 return cl(82+kindBonus+accelPenalty+individual,55,120);
}
function newDamageRecord(i){return{durability:durabilityForCar(i),body:100,engine:100,tyres:100,suspension:100,brakes:100,impacts:0,lastHit:-99,lastX:0,lastZ:0};}
function getDamageRecord(i){const name=PORS[i]?.[0]||'Unknown car';if(!damageRecords[name]||typeof damageRecords[name]!=='object')damageRecords[name]=newDamageRecord(i);const s=damageRecords[name];for(const k of ['body','engine','tyres','suspension','brakes'])if(!Number.isFinite(s[k]))s[k]=100;if(!Number.isFinite(s.durability))s.durability=durabilityForCar(i);return s;}
function currentDamageRecord(){return getDamageRecord(P.idx||0)}
// Called every frame by updP: fills one shared object (no per-frame allocation).
const DFX={maxSpeed:1,accel:1,steering:1,grip:1,brakes:1};
function damageEffects(){
 if(damageMode!==2){DFX.maxSpeed=DFX.accel=DFX.steering=DFX.grip=DFX.brakes=1;return DFX}
 const s=currentDamageRecord(),hE=cl(s.engine/100,0,1),hT=cl(s.tyres/100,0,1),hS=cl(s.suspension/100,0,1),hB=cl(s.brakes/100,0,1);
 DFX.maxSpeed=cl(.48+.34*hE+.18*hT,.48,1);DFX.accel=cl(.35+.65*hE,.35,1);DFX.steering=cl(.58+.42*hS,.58,1);
 DFX.grip=cl(.42+.58*hT*(.8+.2*hS),.42,1);DFX.brakes=cl(.50+.50*hB,.50,1);return DFX;
}
function removeDamageOverlay(){if(!P.m)return;const old=P.m.children.filter(c=>c.userData&&c.userData.damageOverlay);for(const o of old){P.m.remove(o);o.traverse?.(n=>{if(n.geometry)n.geometry.dispose();if(n.material){if(Array.isArray(n.material))n.material.forEach(m=>m.dispose());else n.material.dispose()}})}}
function refreshDamageVisual(){
 if(!P.m||!Number.isFinite(P.idx))return;removeDamageOverlay();
 if(damageMode===0)return;const s=currentDamageRecord(),loss=100-s.body;if(loss<2)return;
 const [,, ,L,W,H]=PORS[P.idx],g=new T.Group();g.userData.damageOverlay=true;
 const scratchMat=new T.MeshBasicMaterial({color:0x25282c,transparent:true,opacity:cl(.38+loss*.006,.38,.9),depthWrite:false,side:T.DoubleSide});
 const dentMat=new T.MeshLambertMaterial({color:0x4a4d50});
 const add=(geo,mat,x,y,z,ry=0)=>{const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.rotation.y=ry;m.userData.damageOverlay=true;g.add(m)};
 const count=Math.min(8,Math.floor(loss/7));
 for(let j=0;j<count;j++){
  const side=j%2?1:-1,zz=-L*.30+((j*37)%70)/100*L*.6,yy=.40+((j*13)%20)/100;
  add(new T.BoxGeometry(.018+((j%3)*.008),.012,Math.min(.48,L*.16)),scratchMat,side*(W*.47),yy,zz,side*.10);
 }
 if(loss>18){add(new T.BoxGeometry(W*.54,.055,.09),dentMat,0,.34,L*.49,0)}
 if(loss>38){add(new T.BoxGeometry(.28,.012,.42),scratchMat,-W*.14,H*.77,L*.24,.08);add(new T.BoxGeometry(.24,.012,.34),scratchMat,W*.18,H*.72,L*.22,-.13)}
 P.m.add(g);
}
function updateDamageButton(){if(damageButton){damageButton.textContent='Damage: '+DAMAGE_MODE_NAMES[damageMode];damageButton.dataset.mode=String(damageMode);damageButton.setAttribute('aria-label','Vehicle damage setting: '+DAMAGE_MODE_NAMES[damageMode]+'. Click to change.')}if(repairButton){const s=currentDamageRecord(),hurt=['body','engine','tyres','suspension','brakes'].some(k=>s[k]<99.9);repairButton.style.display=damageMode!==0&&hurt?'block':'none'}}
function cycleDamageMode(){damageMode=(damageMode+1)%3;persistDamage();updateDamageButton();refreshDamageVisual();const n=DAMAGE_MODE_NAMES[damageMode];toast('Vehicle damage: '+n+(damageMode===2?' — tyres, engine, suspension and brakes active':damageMode===1?' — visual damage only':' — disabled'));}
if(damageButton)damageButton.addEventListener('click',cycleDamageMode);if(repairButton)repairButton.addEventListener('click',repairCurrentCar);
addEventListener('keydown',e=>{if(e.code==='KeyI'&&!e.repeat&&!(e.target&&e.target.tagName==='INPUT')){e.preventDefault();cycleDamageMode()}});
updateDamageButton();

function hideBrokenInstancedPole(key){
 const entry=key&&DESTRUCTIBLE_INSTANCES.get(key);if(!entry)return null;
 // Read the live instance matrix: applyTerrain() has lifted it (instance y + mesh y), the authored p[1] is flat-frame.
 const p=entry.item,ob=new T.Object3D(),height=Math.max(.3,p[5]||1);entry.mesh.getMatrixAt(entry.index,ob.matrix);const localBase=ob.matrix.elements[13]-height/2,baseY=entry.mesh.position.y+localBase;
 ob.position.set(p[0]-entry.chunkX,localBase+.045,p[2]-entry.chunkZ);ob.rotation.set(0,p[3]||0,0);ob.scale.set(p[4]||1,.09,p[6]||1);ob.updateMatrix();
 entry.mesh.setMatrixAt(entry.index,ob.matrix);entry.mesh.instanceMatrix.needsUpdate=true;entry.broken=true;
 return{height,baseY,x:p[0],z:p[2],material:entry.material};
}
const FALLING_POLES=[],IMPACT_SPARKS=[];
const IMPACT_SPARK_GEOM=new T.SphereGeometry(.055,5,4);
function breakObstacle(obstacle,incoming){
 if(!obstacle||!obstacle.breakable||obstacle.broken||incoming<(obstacle.breakAt||99))return false;
 const vis=hideBrokenInstancedPole(obstacle.visualKey);removeCol(obstacle);
 if(vis){
  const mat=new T.MeshLambertMaterial({color:obstacle.type==='streetLight'?0x9aa1a8:0x8f8d86});
  const pivot=new T.Group();pivot.position.set(vis.x,vis.baseY,vis.z);
  const pole=new T.Mesh(new T.CylinderGeometry(.105,.14,vis.height,6),mat);pole.position.y=vis.height/2;pole.castShadow=true;pole.receiveShadow=true;pivot.add(pole);scene.add(pivot);
  FALLING_POLES.push({pivot,age:0,duration:.48,direction:Math.sign(P.vx||P.vz||1),height:vis.height});
 }
 return true;
}
function spawnImpactSparks(normalSpeed,nx,nz){if(normalSpeed<11)return;const x=P.x-(nx||0)*1.55,z=P.z-(nz||0)*1.55,y=P.y+.28;for(let i=0;i<5;i++){const mat=new T.MeshBasicMaterial({color:i%2?0xff8d34:0xffd17a,transparent:true,opacity:.9,depthWrite:false}),m=new T.Mesh(IMPACT_SPARK_GEOM,mat);m.position.set(x+(Math.random()-.5)*.24,y+(Math.random()-.5)*.16,z+(Math.random()-.5)*.24);scene.add(m);IMPACT_SPARKS.push({mesh:m,age:0,life:.18+Math.random()*.16,vx:(nx||0)*(-1.2-Math.random()*2)+(Math.random()-.5)*2,vy:.6+Math.random()*2,vz:(nz||0)*(-1.2-Math.random()*2)+(Math.random()-.5)*2})}}
function registerPlayerImpact(normalSpeed,obstacle,nx,nz){
 if(damageMode===0||!Number.isFinite(normalSpeed)||normalSpeed<2.8)return;
 const s=currentDamageRecord(),t=typeof clock==='number'?clock:performance.now()/1000;
 // One hit per contact interval, so staying pressed against a wall does not multiply damage every frame.
 if(t-s.lastHit<.48&&Math.hypot(P.x-s.lastX,P.z-s.lastZ)<2.8)return;
 s.lastHit=t;s.lastX=P.x;s.lastZ=P.z;s.impacts=(s.impacts||0)+1;
 const type=obstacle?.type|| (obstacle?.r!==undefined?'fixed-object':'wall');
 const objectFactor=type==='utilityPole'?1.22:type==='streetLight'?1.12:type==='vehicle'?.72:type==='speedBump'?.30:type==='tree'?.9:.95;
 const severity=cl(Math.pow(Math.max(0,normalSpeed-2.4),1.22)*.67*objectFactor*(100/Math.max(55,s.durability)),0,58);
 if(damageMode===1){s.body=cl(s.body-severity*1.3,0,100)}
 else{
  s.body=cl(s.body-severity*1.35,0,100);
  // The impact vector determines whether the front drivetrain is likely to have taken the hit.
  const towardCarX=-(nx||0),towardCarZ=-(nz||0),front=Math.max(0,Math.sin(P.h)*towardCarX+Math.cos(P.h)*towardCarZ);
  const hard=cl((normalSpeed-5)/18,0,1);
  s.engine=cl(s.engine-severity*(.10+.55*front)*hard,0,100);
  s.tyres=cl(s.tyres-severity*(.18+(type==='utilityPole'?.13:0)),0,100);
  s.suspension=cl(s.suspension-severity*(.20+.18*hard),0,100);
  s.brakes=cl(s.brakes-severity*.10*hard,0,100);
 }
 const broke=damageMode!==0&&breakObstacle(obstacle,normalSpeed);spawnImpactSparks(normalSpeed,nx,nz);
 refreshDamageVisual();persistDamage();updateDamageButton();
 if(t-lastDamageToast>.7){lastDamageToast=t;const lost=Math.round(100-s.body);toast((broke?'💥 Weak roadside pole broke · ':'Impact · ')+Math.round(normalSpeed*3.6)+' km/h · body condition '+Math.round(s.body)+'%'+(damageMode===2?' · engine '+Math.round(s.engine)+'%':'') )}
}
function registerSpeedBumpImpact(speed){
 if(damageMode===0||speed<12)return;
 const s=currentDamageRecord(),now=typeof clock==='number'?clock:performance.now()/1000;
 if(damageMode===1){s.body=cl(s.body-Math.max(0,speed-12)*.10,0,100)}
 else{const sev=cl((speed-11)*.34,0,8);s.suspension=cl(s.suspension-sev*.55,0,100);s.tyres=cl(s.tyres-sev*.28,0,100)}
 refreshDamageVisual();persistDamage();updateDamageButton();if(now-lastDamageToast>.8){lastDamageToast=now;toast(speed*3.6>80?'Hard speed-bump impact — check suspension/tyres':'Speed-bump impact')}
}
function damageTick(dt){
 if(damageMode===2){const s=currentDamageRecord(),speed=Math.hypot(P.vx,P.vz),road=!!(RI&&RI.d<=RI.e.w/2+.3),rough=!road;
  if(P.gnd&&speed>31){const rate=(rough?.014:.004)+(drift&&drift.pts>1?.009:0);s.tyres=cl(s.tyres-rate*dt,0,100)}
  damageSaveClock+=dt;if(damageSaveClock>8){damageSaveClock=0;persistDamage()}
 }
 for(let i=FALLING_POLES.length-1;i>=0;i--){const f=FALLING_POLES[i];f.age+=dt;const k=cl(f.age/f.duration,0,1);f.pivot.rotation.z=-f.direction*k*Math.PI/2;if(k>=1)FALLING_POLES.splice(i,1)}
 for(let i=IMPACT_SPARKS.length-1;i>=0;i--){const q=IMPACT_SPARKS[i];q.age+=dt;q.vy-=5.5*dt;q.mesh.position.x+=q.vx*dt;q.mesh.position.y+=q.vy*dt;q.mesh.position.z+=q.vz*dt;q.mesh.material.opacity=cl(1-q.age/q.life,0,1);if(q.age>=q.life){scene.remove(q.mesh);q.mesh.material.dispose();IMPACT_SPARKS.splice(i,1)}}
 if(smokePuff){const s=currentDamageRecord(),show=damageMode===2&&s.engine<28;smokePuff.visible=show;if(show){const f=Math.sin(clock*8)*.05;const back=PORS[P.idx][3]*.37;smokePuff.position.set(P.x-Math.sin(P.h)*back,P.y+.52+f,P.z-Math.cos(P.h)*back);const size=.23+(28-s.engine)*.009;smokePuff.scale.setScalar(size);smokePuff.material.opacity=.13+(28-s.engine)*.004}}
}
let smokePuff=null;
try{smokePuff=new T.Mesh(new T.SphereGeometry(1,7,5),new T.MeshBasicMaterial({color:0x777c80,transparent:true,opacity:.18,depthWrite:false}));smokePuff.visible=false;scene.add(smokePuff)}catch(e){smokePuff=null}
function repairCurrentCar(){const s=currentDamageRecord();s.body=s.engine=s.tyres=s.suspension=s.brakes=100;s.impacts=0;s.lastHit=-99;persistDamage();refreshDamageVisual();updateDamageButton();toast('Vehicle repaired')}
// Expose a compact repair method for the tuning/shop UI to call later if desired.
window.irbidVehicleRealism={cycleDamageMode,repairCurrentCar,getMode:()=>damageMode,getCurrentState:()=>({...currentDamageRecord()}),getEffects:damageEffects};

// ---- place up to 90 estimated low-speed humps near mapped sensitive destinations ----
const IRBID_SPEED_BUMPS=[];
function buildEstimatedSpeedBumps(){
 if(!Array.isArray(POID)||typeof roadNear!=='function'||typeof edgePt!=='function')return;
 const targets=POID.filter(q=>['school','hospital','medical','park'].includes(q[2]));
 const candidates=[];
 for(const q of targets){const x=q[0]/10,z=q[1]/10,kind=q[2],maxDist=kind==='school'?68:kind==='hospital'?72:kind==='medical'?50:38;
  const near=roadNear(x,z,maxDist,e=>(e.kind==='local'||e.kind==='svc')&&e.hw!=='track'&&e.kind!=='alley'&&e.len>34&&e.w>=3.2);
  if(!near||near.d>maxDist)continue;
  const e=near.e,u=e.cum[near.i]+near.t*((e.cum[near.i+1]||e.cum[near.i])-e.cum[near.i]);
  if(u<13||e.len-u<13)continue;
  // Do not place a hump almost on an intersection or within 115 m of another inferred hump.
  if(candidates.some(b=>Math.hypot(b.x-near.px,b.z-near.pz)<115))continue;
  candidates.push({x:near.px,z:near.pz,tx:near.tx,tz:near.tz,width:cl(e.w*.88,3.2,7.5),kind,place:q[4]||q[3]||kind,name:q[4]||q[3]||kind,estimated:true,road:e.name||'',armed:true,cooldown:-99});
 }
 // Spread them around the loaded network and cap the count for mobile performance.
 const selected=candidates.slice(0,90);
 for(const b of selected){
  // Flat-frame authoring: applyTerrain() (12c) adds TH(x,z) to this group later; adding it here too lifted bumps twice.
  const group=new T.Group();group.position.set(b.x,.05,b.z);group.rotation.y=Math.atan2(b.tx,b.tz);group.userData.speedBump=true;group.userData.estimated=true;
  const stripeCount=Math.max(6,Math.ceil(b.width/0.75)),stripeWidth=b.width/stripeCount;
  for(let j=0;j<stripeCount;j++){const col=j%2===0?0xe6c84f:0x202326,mesh=new T.Mesh(new T.BoxGeometry(stripeWidth+.015,.10,.72),new T.MeshLambertMaterial({color:col}));mesh.position.set(-b.width/2+stripeWidth*(j+.5),.05,0);mesh.receiveShadow=true;group.add(mesh)}
  scene.add(group);b.mesh=group;IRBID_SPEED_BUMPS.push(b);
 }
 console.log('Speed bumps:',IRBID_SPEED_BUMPS.length,'estimated near OSM-mapped schools/medical facilities/parks; locations are not surveyed traffic-calming data.');
}
buildEstimatedSpeedBumps();
function checkSpeedBumpCrossing(prevX,prevZ){
 if(!IRBID_SPEED_BUMPS.length)return;const speed=Math.hypot(P.vx,P.vz);if(speed<1.2)return;
 for(const b of IRBID_SPEED_BUMPS){
  const pAlong=(prevX-b.x)*b.tx+(prevZ-b.z)*b.tz,along=(P.x-b.x)*b.tx+(P.z-b.z)*b.tz;
  const dx=P.x-b.x,dz=P.z-b.z,lateral=dx*b.tz-dz*b.tx;
  if(Math.abs(along)>2.7)b.armed=true;
  const crossed=(pAlong<=0&&along>=0)||(pAlong>=0&&along<=0)||Math.abs(along)<.18;
  if(!b.armed||!crossed||Math.abs(lateral)>b.width/2+1.8||clock-b.cooldown<1.2)continue;
  b.armed=false;b.cooldown=clock;
  // Low, speed-dependent hop only; never a dramatic launch. This is an arcade approximation.
  P.vy=Math.max(P.vy,.16+cl((speed-8)*.043,0,.85));
  if(speed>16){P.vx*=.992;P.vz*=.992;registerSpeedBumpImpact(speed)}
 }
}

// Follow vehicle changes after the game's own model/tuning setter has run.
const irbidOriginalSetPlayerCar=setPlayerCar;
setPlayerCar=function(i){irbidOriginalSetPlayerCar(i);refreshDamageVisual();persistDamage()};
// The initial car was selected before this module loaded; attach its saved damage state now.
refreshDamageVisual();
