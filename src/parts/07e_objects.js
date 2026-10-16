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
for(let i=0;i<36;i++){const m=new T.Mesh(DEB_GEO,DEB_MAT[0]);m.visible=false;m.userData={age:9,life:1,vx:0,vy:0,vz:0,sp:0};scene.add(m);DEBRIS.push(m)}
let debI=0;
function spawnDebris(x,y,z,dx,dz,n,kind){for(let i=0;i<n;i++){const m=DEBRIS[debI=(debI+1)%DEBRIS.length],q=m.userData;m.material=DEB_MAT[kind||0];m.position.set(x+(Math.random()-.5)*.4,y+Math.random()*.4,z+(Math.random()-.5)*.4);
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
 const sp=SIGN_PLATES.get(o.visualKey);if(sp&&sp.C.mesh){const a=sp.C.mesh.geometry.attributes.position;if(!sp.orig)sp.orig=Float32Array.from(a.array.subarray(sp.n*3,sp.n*3+12));
  _M2.makeTranslation(o.x,by,o.z);_M3.makeRotationFromQuaternion(_Q);_M2.multiply(_M3);_M3.makeTranslation(-o.x,-by,-o.z);_M2.multiply(_M3);
  for(let k=0;k<4;k++){_V.fromArray(sp.orig,k*3).applyMatrix4(_M2);a.array[sp.n*3+k*3]=_V.x;a.array[sp.n*3+k*3+1]=_V.y;a.array[sp.n*3+k*3+2]=_V.z}a.needsUpdate=true}}
function hideSignPlate(key){const sp=SIGN_PLATES.get(key);if(!sp||!sp.C.mesh)return;const a=sp.C.mesh.geometry.attributes.position,i=sp.n*3;for(let k=1;k<4;k++){a.array[i+k*3]=a.array[i];a.array[i+k*3+1]=a.array[i+1];a.array[i+k*3+2]=a.array[i+2]}a.needsUpdate=true}
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
// called by registerPlayerImpact (07c): returns the equivalent barrier speed for the car's crush, and the car's speed loss if the object gave way
const OBJR={ebs:0,gave:0,broke:false,label:''};
function objectImpact(o,vn,mass,nx,nz){
 const c=objClass(o),t=dmgNow();OBJR.ebs=vn;OBJR.gave=0;OBJR.broke=false;OBJR.label=c.label;
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
