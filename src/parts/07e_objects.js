// ---- world-object damage (v39): every collider has a class; breakable/movable ones react to the impact ENERGY ----
// rigid      : stays put, the car takes the full hit (walls, buildings, trees, guardrails, shelters, monuments)
// breakable  : bends above `bend` x its break energy, snaps above it (street lights, utility poles, road signs)
// movable    : shoved along the impact direction, may tip over (dumpsters)
// vehicle    : car-to-car, energy shared by mass;  traversable : speed bumps (handled in 07c)
// Masses and thresholds are ESTIMATES (no material data in OSM for these props). breakAt is the speed (m/s) at which a 1,500 kg car breaks the
// object; heavier cars break it sooner (same energy). Only reacts in Cosmetic/Full: with damage Off every object is rigid exactly as in v37.
const OBJ_CLASS={
 streetLight:{cls:'breakable',label:'Street light',material:'steel lighting column (estimate)',mass:180,breakAt:17,bend:.3,debris:0},
 utilityPole:{cls:'breakable',label:'Utility pole',material:'pole; material not in source data (estimate)',mass:450,breakAt:12.5,bend:.35,debris:1},
 sign:{cls:'breakable',label:'Road sign',material:'steel post + sign plate (estimate)',mass:25,breakAt:4.5,bend:.35,debris:0},
 bin:{cls:'movable',label:'Dumpster',material:'steel 1,100 L container (estimate)',mass:160,debris:2},
 guardrail:{cls:'rigid',label:'Guardrail',material:'steel W-beam; redirects, deformation not modelled'},
 busShelter:{cls:'rigid',label:'Bus shelter',material:'steel frame + glass; breakage not modelled'},
 tree:{cls:'rigid',label:'Tree',material:'trunk'},monument:{cls:'rigid',label:'Monument',material:'masonry'},
 structure:{cls:'rigid',label:'Structure',material:'masonry / concrete'},solid:{cls:'rigid',label:'Wall',material:'building / wall'},
 vehicle:{cls:'vehicle',label:'Car',material:'traffic car (mass estimate)',mass:1400},speedBump:{cls:'traversable',label:'Speed bump',material:'asphalt hump (location estimated)'}};
const objClass=o=>OBJ_CLASS[o&&o.type]||(o&&o.r!==undefined?OBJ_CLASS.structure:OBJ_CLASS.solid);
const breakEnergy=(o,c)=>.5*1500*Math.pow(o.breakAt||c.breakAt||99,2);
const FALLING_POLES=[],DEBRIS=[],MOVERS=[],DEB_MAT=[new T.MeshLambertMaterial({color:0x9aa1a8}),new T.MeshLambertMaterial({color:0x8f8d86}),new T.MeshLambertMaterial({color:0x2f6b3a})],DEB_GEO=new T.BoxGeometry(.16,.06,.1);
for(let i=0;i<48;i++){const m=new T.Mesh(DEB_GEO,DEB_MAT[0]);m.visible=false;m.userData={age:9,life:1,vx:0,vy:0,vz:0,sp:0};scene.add(m);DEBRIS.push(m)}
let debI=0;
function spawnDebris(x,y,z,dx,dz,n,kind){for(let i=0;i<n;i++){const m=DEBRIS[debI=(debI+1)%DEBRIS.length],q=m.userData;m.material=DEB_MAT[kind||0];m.scale.setScalar(typeof DEB_SIZE!=='undefined'?DEB_SIZE[kind||0]:1);m.position.set(x+(Math.random()-.5)*.4,y+Math.random()*.4,z+(Math.random()-.5)*.4);
 q.age=0;q.life=1.8+Math.random();q.vx=dx*(1.5+Math.random()*3)+(Math.random()-.5)*2;q.vz=dz*(1.5+Math.random()*3)+(Math.random()-.5)*2;q.vy=1+Math.random()*2.5;q.sp=(Math.random()-.5)*14;m.visible=true}}
const _M1=new T.Matrix4(),_M2=new T.Matrix4(),_M3=new T.Matrix4(),_V=new T.Vector3(),_Q=new T.Quaternion(),_S=new T.Vector3(),_O=new T.Object3D();
// live (terrain-lifted) world base of an instanced pole: instance y + mesh y - half height
function instBase(e){e.mesh.getMatrixAt(e.index,_M1);const h=Math.max(.3,e.item[5]||1);return e.mesh.position.y+_M1.elements[13]-h/2}
function keepOrig(e){if(!e.orig){e.orig=new T.Matrix4();e.mesh.getMatrixAt(e.index,e.orig)}return e.orig}
function hideInstance(key){const e=DESTRUCTIBLE_INSTANCES.get(key);if(!e)return;keepOrig(e);_M1.makeScale(0,0,0);e.mesh.setMatrixAt(e.index,_M1);e.mesh.instanceMatrix.needsUpdate=true;e.broken=true}
function hideBrokenInstancedPole(key){
 const entry=key&&DESTRUCTIBLE_INSTANCES.get(key);if(!entry)return null;keepOrig(entry);
 // Read the live instance matrix: applyTerrain() has lifted it (instance y + mesh y), the authored p[1] is flat-frame.
 const p=entry.item,ob=_O,height=Math.max(.3,p[5]||1);entry.mesh.getMatrixAt(entry.index,ob.matrix);const localBase=ob.matrix.elements[13]-height/2,baseY=entry.mesh.position.y+localBase;
 ob.position.set(p[0]-entry.chunkX,localBase+.045,p[2]-entry.chunkZ);ob.rotation.set(0,p[3]||0,0);ob.scale.set(p[4]||1,.09,p[6]||1);ob.updateMatrix();
 entry.mesh.setMatrixAt(entry.index,ob.matrix);entry.mesh.instanceMatrix.needsUpdate=true;entry.broken=true;
 return{height,baseY,x:p[0],z:p[2],material:entry.material};
}
const ATTACHED={streetLight:['/arm','/head','/pool'],utilityPole:['/arm','/xf'],sign:[]};
// lean a pole (and its arm/lamp, sign plate) about its base toward (dx,dz) by `ang` radians
function leanObstacle(o,ang,dx,dz){
 const e=DESTRUCTIBLE_INSTANCES.get(o.visualKey);if(!e)return;const by=instBase(e),l=Math.hypot(dx,dz)||1;_V.set(dz/l,0,-dx/l);_Q.setFromAxisAngle(_V,ang);
 for(const k of[''].concat(ATTACHED[o.type]||[])){const q=DESTRUCTIBLE_INSTANCES.get(o.visualKey+k);if(!q||q.broken&&k)continue;const orig=keepOrig(q),mp=q.mesh.position;
  _M2.makeTranslation(o.x-mp.x,by-mp.y,o.z-mp.z);_M3.makeRotationFromQuaternion(_Q);_M2.multiply(_M3);_M3.makeTranslation(-(o.x-mp.x),-(by-mp.y),-(o.z-mp.z));_M2.multiply(_M3);_M2.multiply(orig);q.mesh.setMatrixAt(q.index,_M2);q.mesh.instanceMatrix.needsUpdate=true}
 const sp=SIGN_PLATES.get(o.visualKey);if(sp&&sp.C.mesh){const a=sp.C.mesh.geometry.attributes.position;if(!sp.orig)sp.orig=Float32Array.from(a.array.subarray(sp.n*3,sp.n*3+24));
  _M2.makeTranslation(o.x,by,o.z);_M3.makeRotationFromQuaternion(_Q);_M2.multiply(_M3);_M3.makeTranslation(-o.x,-by,-o.z);_M2.multiply(_M3);
  for(let k=0;k<8;k++){_V.fromArray(sp.orig,k*3).applyMatrix4(_M2);a.array[sp.n*3+k*3]=_V.x;a.array[sp.n*3+k*3+1]=_V.y;a.array[sp.n*3+k*3+2]=_V.z}a.needsUpdate=true}}
function hideSignPlate(key){const sp=SIGN_PLATES.get(key);if(!sp||!sp.C.mesh)return;const a=sp.C.mesh.geometry.attributes.position,i=sp.n*3;for(let k=1;k<8;k++){a.array[i+k*3]=a.array[i];a.array[i+k*3+1]=a.array[i+1];a.array[i+k*3+2]=a.array[i+2]}a.needsUpdate=true}
// breakObstacle(collider, normal speed m/s, car mass kg = 1,500): true when the impact energy reaches the object's break energy
function breakObstacle(obstacle,incoming,mass){
 if(!obstacle||!obstacle.breakable||obstacle.broken)return false;const c=objClass(obstacle),ms=mass||1500;
 if(.5*ms*incoming*incoming<breakEnergy(obstacle,c))return false;
 const vis=hideBrokenInstancedPole(obstacle.visualKey);for(const k of ATTACHED[obstacle.type]||[])hideInstance(obstacle.visualKey+k);if(obstacle.type==='sign')hideSignPlate(obstacle.visualKey);
 removeCol(obstacle);
 if(vis){
  const mat=obstacle.type==='utilityPole'?DEB_MAT[1]:DEB_MAT[0],pivot=new T.Group();pivot.position.set(vis.x,vis.baseY,vis.z);pivot.rotation.order='YXZ';
  const r0=obstacle.type==='sign'?.045:.105,pole=new T.Mesh(new T.CylinderGeometry(r0,r0*1.3,vis.height,6),mat);pole.position.y=vis.height/2;pole.castShadow=true;pole.receiveShadow=true;pivot.add(pole);
  if(obstacle.type==='sign'){const pl=new T.Mesh(new T.BoxGeometry(.75,.75,.03),DEB_MAT[0]);pl.position.y=vis.height;pivot.add(pl)}
  // falls along the car's direction of travel
  pivot.rotation.y=Math.atan2(P.vx||Math.sin(P.h),P.vz||Math.cos(P.h));scene.add(pivot);
  FALLING_POLES.push({pivot,age:0,duration:obstacle.type==='sign'?.35:.48,maxA:Math.PI/2-.05,direction:1,height:vis.height});
  spawnDebris(vis.x,vis.baseY+.3,vis.z,Math.sin(pivot.rotation.y),Math.cos(pivot.rotation.y),obstacle.type==='sign'?3:6,c.debris||0);
 }
 return true;
}
// ---- v44 material behaviour (all thresholds are gameplay ESTIMATES; docs/REALISM_RESEARCH.md lists what each rests on) ----
// tree        : wood. Bending strength of a trunk grows with diameter^3 (section modulus), so the snap speed for a 1,500 kg car is scaled as
//               30 m/s x (d / 0.30 m)^1.5. FHWA / AASHTO treat trees >= 10 cm diameter as fixed objects; every tree in the game is 0.3-1.0 m,
//               so most are effectively rigid: the car takes the hit, the canopy shakes and sheds leaves / bark; only the slimmest trunks fall.
// gardenWall  : unreinforced block / stone garden wall (masonry). Cracks first, collapses into rubble once the accumulated energy reaches its
//               break energy (10-13 m/s for a 1,500 kg car depending on wall height). The car still takes most of the hit.
// busShelter  : steel frame (rigid) + glass panel, which shatters (tempered glass) above ~4 m/s.
// guardrail   : steel W-beam: deflects outward (visible) and absorbs part of the energy, so the car's crush is lower than against a wall.
// solid / structure : buildings, walls, roundabout islands: rigid. Localized surface damage (scrape / cracked render) at the contact point
//               above ~22 km/h, dust; never demolished.
// Every object keeps o.dmg (accumulated fraction of its break energy), so repeated hits can finish what one hit started.
OBJ_CLASS.tree={cls:'tree',label:'Tree',material:'wood (trunk diameter from the tree model)',debris:3};
OBJ_CLASS.gardenWall={cls:'masonry',label:'Garden wall',material:'unreinforced masonry (estimate)',debris:5};
OBJ_CLASS.busShelter={cls:'rigid',label:'Bus shelter',material:'steel frame + tempered glass panel',glass:true};
OBJ_CLASS.guardrail={cls:'deflect',label:'Guardrail',material:'steel W-beam (deflects; estimate)'};
DEB_MAT.push(new T.MeshLambertMaterial({color:0x6b4a2f}),new T.MeshBasicMaterial({color:0xcfe9f5,transparent:true,opacity:.75}),new T.MeshLambertMaterial({color:0xd9cfb8}),new T.MeshLambertMaterial({color:0x9a958a}));
// debris kinds: 0 steel, 1 grey, 2 leaves, 3 wood, 4 glass, 5 masonry, 6 dust
const DEB_SIZE=[1,1,1,1.3,.6,2.6,1.6];
const treeBreakV=o=>30*Math.pow(Math.max(.1,o.trunkD||.5)/.3,1.5);
ATTACHED.tree=[];
function treeKeys(o){const L=[];for(let i=0;i<(o.canopies||0);i++)L.push('/c'+i);return L}
// surface damage decals on rigid walls (pooled, 16): a scrape + cracked render texture, oriented to the wall at the contact point
let WALL_DEC=null,wallDecI=0;
function wallDecals(){if(WALL_DEC)return WALL_DEC;WALL_DEC=[];let tex=null;try{const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');let s=7;const r=()=>((s=(s*1103515245+12345)&0x7fffffff)/0x7fffffff);
 g.fillStyle='rgba(60,58,54,.35)';g.beginPath();g.ellipse(64,64,58,26,0,0,Math.PI*2);g.fill();g.strokeStyle='rgba(40,38,34,.8)';g.lineWidth=1.4;
 for(let k=0;k<9;k++){let x=64,y=64,a=r()*Math.PI*2;g.beginPath();g.moveTo(x,y);for(let j=0;j<5;j++){a+=(r()-.5)*.8;x+=Math.cos(a)*12;y+=Math.sin(a)*12;g.lineTo(x,y)}g.stroke()}
 g.strokeStyle='rgba(235,232,225,.55)';for(let k=0;k<14;k++){const y=40+r()*48;g.beginPath();g.moveTo(8+r()*20,y);g.lineTo(100+r()*20,y+(r()-.5)*6);g.stroke()}tex=new T.CanvasTexture(c)}catch(e){}
 const mat=new T.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4});
 for(let i=0;i<16;i++){const m=new T.Mesh(new T.PlaneGeometry(1,1),mat);m.visible=false;scene.add(m);WALL_DEC.push(m)}return WALL_DEC}
function wallMark(nx,nz,vn){const D=wallDecals(),m=D[wallDecI=(wallDecI+1)%D.length],rad=(P.rad||2.2)*.55,x=P.x-nx*rad,z=P.z-nz*rad,s=cl(.5+(vn-6)*.07,.5,2.2);
 m.position.set(x+nx*.02,TH(x,z)+.55,z+nz*.02);m.rotation.set(0,Math.atan2(nx,nz),0);m.scale.set(s*1.6,s*.8,1);m.visible=true;m.userData.t=dmgNow();return m}
// guardrail: push the rail instance away from the car (deflection) and tilt it
function deflectRail(o,nx,nz,amt){const e=DESTRUCTIBLE_INSTANCES.get(o.visualKey);if(!e)return;const orig=keepOrig(e);o.defl=Math.min(.45,(o.defl||0)+amt);
 _M2.makeTranslation(-nx*o.defl,-o.defl*.25,-nz*o.defl);_M2.multiply(orig);e.mesh.setMatrixAt(e.index,_M2);e.mesh.instanceMatrix.needsUpdate=true}
// fell a tree / knock down a wall segment / shatter a shelter panel (visual + collider)
function fellTree(o,vn){const keys=treeKeys(o),vis=hideBrokenInstancedPole(o.visualKey);let can=null;for(const k of keys){const q=DESTRUCTIBLE_INSTANCES.get(o.visualKey+k);if(q&&!can){q.mesh.getMatrixAt(q.index,_M1);can={sx:q.item[4],sy:q.item[5],y:q.item[1]}}hideInstance(o.visualKey+k)}
 removeCol(o);if(!vis)return;const pivot=new T.Group();pivot.position.set(vis.x,vis.baseY,vis.z);pivot.rotation.order='YXZ';
 const r0=Math.max(.12,(o.trunkD||.4)/2),tr=new T.Mesh(new T.CylinderGeometry(r0*.8,r0,vis.height,7),DEB_MAT[3]);tr.position.y=vis.height/2;tr.castShadow=true;pivot.add(tr);
 if(can){const cm=new T.Mesh(new T.SphereGeometry(.5,8,6),DEB_MAT[2]);cm.scale.set(can.sx,can.sy,can.sx);cm.position.y=vis.height+can.sy*.3;cm.castShadow=true;pivot.add(cm)}
 pivot.rotation.y=Math.atan2(P.vx||Math.sin(P.h),P.vz||Math.cos(P.h));scene.add(pivot);FALLING_POLES.push({pivot,age:0,duration:1.1,maxA:Math.PI/2-.12,direction:1,height:vis.height});
 spawnDebris(vis.x,vis.baseY+.5,vis.z,Math.sin(pivot.rotation.y),Math.cos(pivot.rotation.y),8,3);spawnDebris(vis.x,vis.baseY+2,vis.z,Math.sin(pivot.rotation.y),Math.cos(pivot.rotation.y),6,2)}
function shakeTree(o,amt,nx,nz){o.bent=Math.min(.18,(o.bent||0)+amt);leanTree(o,o.bent,-nx,-nz);const e=DESTRUCTIBLE_INSTANCES.get(o.visualKey);if(e){const by=instBase(e);spawnDebris(o.x,by+2.5,o.z,-nx,-nz,Math.min(6,2+Math.round(amt*30)),2);spawnDebris(o.x,by+.5,o.z,-nx,-nz,2,3)}}
function leanTree(o,ang,dx,dz){const save=ATTACHED.tree;ATTACHED.tree=treeKeys(o);leanObstacle(o,ang,dx,dz);ATTACHED.tree=save}
function collapseWall(o,nx,nz){hideInstance(o.visualKey);removeCol(o);const e=DESTRUCTIBLE_INSTANCES.get(o.visualKey),y=e?instBase(e):TH(o.x,o.z);
 for(let k=0;k<3;k++)spawnDebris(o.x+(Math.random()-.5)*o.hw*1.4,y+.4+k*.3,o.z+(Math.random()-.5)*o.hw*1.4,-nx,-nz,4,5);spawnDebris(o.x,y+.6,o.z,-nx,-nz,5,6)}
function shatterShelter(o,nx,nz){if(o.glassBroken)return false;o.glassBroken=true;const e=DESTRUCTIBLE_INSTANCES.get(o.visualKey),y=e?instBase(e)+1:TH(o.x,o.z)+1.2;hideInstance(o.visualKey);
 for(let k=0;k<3;k++)spawnDebris(o.x+(Math.random()-.5)*2,y+k*.4,o.z+(Math.random()-.5)*2,-nx,-nz,5,4);return true}
// v44 material branch of objectImpact: returns true when it handled the object
function materialImpact(o,c,vn,mass,nx,nz){if(c.cls==='breakable'||c.cls==='movable'||c.cls==='vehicle'||c.cls==='traversable')return false;const E=.5*mass*vn*vn,t=dmgNow();if(t-(o.mhT||-9)<.5)return c.cls==='tree'||c.cls==='masonry'||c.cls==='deflect';o.mhT=t;
 if(c.cls==='tree'){const vb=treeBreakV(o),Eb=.5*1500*vb*vb;o.dmg=(o.dmg||0)+E/Eb;OBJR.label=c.label;
  if(o.dmg>=1&&o.visualKey){fellTree(o,vn);OBJR.broke=true;const Ea=Eb*.7;OBJR.gave=vn-Math.sqrt(Math.max(0,vn*vn-2*Ea/mass));OBJR.ebs=Math.min(vn,Math.sqrt(Ea/mass)*1.1);return true}
  if(o.visualKey&&vn>3)shakeTree(o,Math.min(.12,E/Eb*.6),nx,nz);OBJR.ebs=vn;return true}
 if(c.cls==='masonry'){const vb=10+3*cl((o.wallH||1.5)-1,0,1),Eb=.5*1500*vb*vb;o.dmg=(o.dmg||0)+E/Eb;OBJR.label=c.label;
  if(o.dmg>=1&&o.visualKey){collapseWall(o,nx,nz);OBJR.broke=true;const Ea=Eb*.55;OBJR.gave=vn-Math.sqrt(Math.max(0,vn*vn-2*Ea/mass));OBJR.ebs=Math.min(vn,Math.sqrt(Ea/mass)*1.2);return true}
  if(vn>5){wallMark(nx,nz,vn);spawnDebris(o.x,TH(o.x,o.z)+.6,o.z,-nx,-nz,2,5)}OBJR.ebs=vn;return true}
 if(c.cls==='deflect'){if(o.visualKey&&vn>3)deflectRail(o,nx,nz,Math.min(.3,E/(.5*1500*20*20)*.6));OBJR.ebs=vn*.8;OBJR.label=c.label;if(vn>8)spawnDebris(P.x-nx*1.6,P.y+.5,P.z-nz*1.6,-nx,-nz,3,0);return true}
 if(c.glass&&vn>4&&o.visualKey){if(shatterShelter(o,nx,nz))OBJR.label='Bus shelter glass';}
 if(c.cls==='rigid'&&!c.glass&&vn>6&&(o.type==='solid'||o.type===undefined||o.type==='structure'||o.type==='monument')){wallMark(nx,nz,vn);spawnDebris(P.x-nx*1.8,P.y+.6,P.z-nz*1.8,-nx,-nz,3,6)}
 return false}
// called by registerPlayerImpact (07c): returns the equivalent barrier speed for the car's crush, and the car's speed loss if the object gave way
const OBJR={ebs:0,gave:0,broke:false,label:''};
function objectImpact(o,vn,mass,nx,nz){
 const c=objClass(o),t=dmgNow();OBJR.ebs=vn;OBJR.gave=0;OBJR.broke=false;OBJR.label=c.label;
 if(materialImpact(o,c,vn,mass,nx,nz))return OBJR;
 if(c.cls==='vehicle'){const m2=c.mass;OBJR.ebs=vn*Math.sqrt(m2/(2*(mass+m2)));return OBJR}
 if(c.cls==='breakable'){const E=.5*mass*vn*vn,Eb=breakEnergy(o,c);
  if(breakObstacle(o,vn,mass)){const Ea=Eb*.6;OBJR.broke=true;OBJR.gave=vn-Math.sqrt(Math.max(0,vn*vn-2*Ea/mass));OBJR.ebs=Math.min(vn,Math.sqrt(Ea/mass));return OBJR}
  if(E>Eb*c.bend&&!(t-(o.hitT||-9)<.6)){o.hitT=t;o.bent=Math.min(.42,(o.bent||0)+.42*(E-Eb*c.bend)/(Eb*(1-c.bend)));leanObstacle(o,o.bent,-nx,-nz);OBJR.ebs=vn*.85}
  return OBJR}
 if(c.cls==='movable'&&vn>1.5&&o.visualKey){const mb=c.mass,vc=mass*vn/(mass+mb);OBJR.gave=vn-vc;OBJR.ebs=vn*Math.sqrt(mb/(2*(mass+mb)));OBJR.label=c.label;
  if(!o.moving){removeCol(o);o.moving=true;const e=DESTRUCTIBLE_INSTANCES.get(o.visualKey);if(e){keepOrig(e);const l=DESTRUCTIBLE_INSTANCES.get(o.visualKey+'/lid');if(l)keepOrig(l);
   MOVERS.push({o,e,l,x:o.x,z:o.z,vx:-nx*vc*1.15,vz:-nz*vc*1.15,ry:Math.atan2(o.s,o.c),spin:(Math.random()-.5)*2,tip:0,tipV:vc>5?2.4:0})}}
  spawnDebris(o.x,TH(o.x,o.z)+.6,o.z,-nx,-nz,2,c.debris);OBJR.gave=Math.max(OBJR.gave,0);return OBJR}
 return OBJR;
}
// shoved dumpsters slide with friction, maybe tip; their collider comes back where they stop
function placeMover(q){const e=q.e,p=e.item,mp=e.mesh.position,y=TH(q.x,q.z)+p[1];
 _O.position.set(q.x-mp.x,y-mp.y,q.z-mp.z);_O.rotation.set(q.tip,q.ry,0,'YXZ');_O.scale.set(p[4]||1,p[5]||1,p[6]||1);_O.updateMatrix();e.mesh.setMatrixAt(e.index,_O.matrix);e.mesh.instanceMatrix.needsUpdate=true;
 if(q.l){const lp=q.l.item,lm=q.l.mesh.position;_M2.makeRotationFromEuler(_O.rotation);_V.set(0,lp[1]-p[1],0).applyMatrix4(_M2);
  _O.position.set(q.x+_V.x-lm.x,y+_V.y-lm.y,q.z+_V.z-lm.z);_O.scale.set(lp[4]||1,lp[5]||1,lp[6]||1);_O.updateMatrix();q.l.mesh.setMatrixAt(q.l.index,_O.matrix);q.l.mesh.instanceMatrix.needsUpdate=true}}
function objectsTick(dt){
 for(let i=FALLING_POLES.length-1;i>=0;i--){const f=FALLING_POLES[i];f.age+=dt;const k=cl(f.age/f.duration,0,1);f.pivot.rotation.x=k*k*(f.maxA||Math.PI/2);if(k>=1)FALLING_POLES.splice(i,1)}
 for(const m of DEBRIS){if(!m.visible)continue;const q=m.userData;q.age+=dt;q.vy-=9.81*dt;m.position.x+=q.vx*dt;m.position.y+=q.vy*dt;m.position.z+=q.vz*dt;m.rotation.x+=q.sp*dt;m.rotation.z+=q.sp*.7*dt;
  const gy=TH(m.position.x,m.position.z)+.03;if(m.position.y<gy){m.position.y=gy;q.vy*=-.25;q.vx*=.55;q.vz*=.55;q.sp*=.5}if(q.age>q.life)m.visible=false}
 for(let i=MOVERS.length-1;i>=0;i--){const q=MOVERS[i],v=Math.hypot(q.vx,q.vz),dv=Math.min(v,.55*9.81*dt);if(v>0){q.vx-=q.vx/v*dv;q.vz-=q.vz/v*dv}q.x+=q.vx*dt;q.z+=q.vz*dt;q.ry+=q.spin*v*.12*dt;
  if(q.tipV){q.tip=Math.min(Math.PI/2,q.tip+q.tipV*dt);if(q.tip>=Math.PI/2)q.tipV=0}placeMover(q);
  if(v-dv<.05&&!q.tipV){const o=q.o;o.x=q.x;o.z=q.z;o.c=Math.cos(q.ry);o.s=Math.sin(q.ry);o.broken=false;o.moving=false;o.hitT=dmgNow();addCol(o);MOVERS.splice(i,1)}}
}
