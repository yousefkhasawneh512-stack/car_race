// ---- vegetation + land-use layer: urban/rural ground tint, street trees, olive groves, scrub, rocks (all Math.random-based; never touches PR) ----
const VQ=FACQ?1:.45,ROCKS=[];
// ===== street trees along the avenues (only where the verge is free) =====
{const ZP={'Al-Balad':.22,'University Street':.3,'Petra Street':.85,'Aidun':.85,'Irbid':.6,'Outskirts':.4,'Eastern Municipal District':.5,'Jadara University':.3,'JUST':.3},SK=new Set(['main','petra','arch','local']);let n=0;
 EDGES.forEach(e=>{if(!SK.has(e.kind)||e.len<50||e.w<7||e.fz<(e.kind==='local'?3:2))return;const t0=jTrim(e.a)+10,t1=jTrim(e.b)+10;
  for(const sg of[-1,1]){for(let u=t0+Math.random()*14;u<e.len-t1;u+=rr(22,42)){const p=edgePt(e,u),off=sg*(e.w/2+rr(2.7,3.4)),x=p[0]+p[2]*off,z=p[1]+p[3]*off,dn=distName(x,z);
    if(Math.random()>(ZP[dn]!==undefined?ZP[dn]:.5)*VQ*1.3)continue;
    if(onOther(x,z,e,3)||!occFree(obb(x,z,3.4,3.4,0),0)||furnNear(x,z,3))continue;
    const sp=dn==='Petra Street'||dn==='Aidun'?(Math.random()<.3?'cyp':Math.random()<.5?'pine':Math.random()<.2?'palm':'round'):(Math.random()<.55?'round':Math.random()<.5?'pine':Math.random()<.4?'cyp':'palm');
    treeSp(x,z,rr(.85,1.15),sp);addCol({x,z,r:.32,type:'tree'});furnAdd(x,z);n++}}});
 console.log('street trees',n)}
// ===== olive groves, pines, scrub and limestone boulders on the open land outside the city =====
{const RS=RAMPS.map(r=>[r[0],r[1]]),VX0=RA.balad[0]-7500,VX1=RA.balad[0]+7500,VZ0=RA.balad[1]-7000,VZ1=RA.balad[1]+7000,okPt=(x,z,rd)=>{if(distName(x,z)!=='Outskirts')return false;if(roadAt(x,z,rd))return false;for(const r of RS)if(Math.hypot(x-r[0],z-r[1])<160)return false;return true};
 const nearPlace=(x,z,r)=>{for(const q of PLACES)if(Math.abs(q.x-x)<r&&Math.abs(q.z-z)<r)return true;return false};
 let groves=0,trees=0,tries=0;const cap=Math.round(70*VQ);
 while(groves<cap&&tries<900){tries++;const x=R(VX0,VX1),z=R(VZ0,VZ1);if(!okPt(x,z,40)||nearPlace(x,z,90))continue;
  const a=Math.random()*3.14,ca=Math.cos(a),sa=Math.sin(a),sp=rr(6.5,9),nx=Math.round(rr(5,12)),nz=Math.round(rr(5,11));let placed=0;
  for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){const lx=(i-nx/2)*sp+rr(-.8,.8),lz=(j-nz/2)*sp+rr(-.8,.8),tx=x+lx*ca-lz*sa,tz=z+lx*sa+lz*ca;
    if(Math.random()<.07||roadAt(tx,tz,10)||!occFree(obb(tx,tz,4,4,0),0))continue;treeSp(tx,tz,rr(.9,1.2),'olive');addCol({x:tx,z:tz,r:.4,type:'tree'});placed++}
  if(placed>8){groves++;trees+=placed}}
 // scattered pines / carob and shrubs on rocky ground
 let sc=0;for(let k=0;k<Math.round(900*VQ);k++){const x=R(VX0,VX1),z=R(VZ0,VZ1);if(!okPt(x,z,12)||!occFree(obb(x,z,3,3,0),0))continue;
  const r=Math.random();if(r<.18){treeSp(x,z,rr(.9,1.25),Math.random()<.65?'pine':'round');addCol({x,z,r:.35,type:'tree'})}
  else if(r<.78){const k2=Math.round(rr(1,4));for(let q=0;q<k2;q++){const bs=rr(.9,2.1);CANP.bush.push([x+rr(-2,2),hillH(x,z)+bs*.28,z+rr(-2,2),Math.random()*3,bs*1.3,bs*.8,bs,pick([0x8a8a55,0x777f4a,0x9a9060,0x6d7a42,0x7b8348])])}}
  else{const rs=rr(.7,1.8),y=hillH(x,z);for(let q=0;q<Math.round(rr(1,4));q++)ROCKS.push([x+rr(-1.6,1.6),y+rs*.2,z+rr(-1.6,1.6),Math.random()*3,rs*rr(1,1.8),rs*rr(.6,1),rs*rr(1,1.6),pick([0x9a9690,0x8c8880,0xa8a39a,0x7f7b74])])}sc++}
 console.log('groves',groves,'olives',trees,'scatter',sc)}
// ===== dry scrub along verges and in vacant gaps =====
{let n=0;EDGES.forEach(e=>{if(!(e.kind==='local'||e.kind==='main'||e.kind==='arch'||e.kind==='petra')||e.len<40||e.fz<3)return;
  for(const sg of[-1,1])for(let u=10+Math.random()*10;u<e.len-10;u+=rr(16,34)){if(Math.random()>.35*VQ)continue;const p=edgePt(e,u),off=sg*(e.w/2+rr(2.4,7)),x=p[0]+p[2]*off,z=p[1]+p[3]*off;
   if(onOther(x,z,e,2)||!occFree(obb(x,z,2.2,2.2,0),0)||furnNear(x,z,1.5))continue;const bs=rr(.7,1.5);
   CANP.bush.push([x,hillH(x,z)+bs*.28,z,Math.random()*3,bs*1.3,bs*.8,bs,pick([0x8a8a55,0x777f4a,0x9a9060,0x6d7a42,0x4f7a38])]);n++}});console.log('verge scrub',n)}
// ===== flush all vegetation =====
const leafMat=gfxStd({color:0xffffff,roughness:.95,metalness:0,envMapIntensity:.25},'leaf')||new T.MeshLambertMaterial({color:0xffffff});
{instO(new T.CylinderGeometry(.5,.6,1,5,1,true),UBm(0xffffff),TRK,true,420,300);
 const sph=new T.SphereGeometry(.5,6,4),sphO=new T.SphereGeometry(.5,6,3);for(const k of['round','pine','palm'])instO(sph,leafMat,CANP[k],true,420,300);instO(sphO,leafMat,CANP.olive,true,380,300);
 instO(new T.CylinderGeometry(.05,.5,1,6,1,true),leafMat,CANP.cyp,true,420,300);instO(new T.SphereGeometry(.5,5,3),leafMat,CANP.bush,false,230,200);
 instO(new T.DodecahedronGeometry(.6,0),baseMat,ROCKS,true,300,200)}
