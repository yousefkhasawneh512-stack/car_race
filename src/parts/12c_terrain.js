// ---- terrain pass: the world is built on flat ground (y=0); here every static object is lifted onto the real SRTM terrain TH(x,z) ----
// Instanced props: translation lifted per instance; big ground-standing boxes (buildings, walls) get a skirt down to their lowest footprint corner.
// Merged world-space meshes (road ribbons, sidewalks, wires): every vertex lifted (so roads follow the ground, incl. its cross slope).
// Everything else (landmark groups, signs, labels): position.y += TH at its position. Moving objects (player, traffic, bots) are skipped: they use TH themselves.
const TERRSTAT={inst:0,skirt:0,vtx:0,obj:0,skipped:0,ms:0,maxLift:0};
function applyTerrain(){
 const t0=performance.now(),skip=new Set([P.m,gnd,beacon,nbeacon,ndots,typeof dome!=='undefined'?dome:null,disc]);
 for(const c of all)if(c.m)skip.add(c.m);
 MESHC.forEach(m=>skip.add(m));for(const c of SHOWCARS)if(c.m)skip.add(c.m);
 const kids=scene.children.slice();
 for(const c of kids){
  if(skip.has(c)||c.isLight||c.isCamera||c.visible===false&&!c.isInstancedMesh){TERRSTAT.skipped++;continue}
  if(c.isInstancedMesh){
   const M=c.instanceMatrix.array,n=c.count,mx=c.position.x,mz=c.position.z,box=c.geometry.type==='BoxGeometry';let sum=0,dev=0;
   for(let i=0;i<n;i++){const e=i*16,x=mx+M[e+12],z=mz+M[e+14],t=TH(x,z);let y=M[e+13];
    if(box){const sy=Math.hypot(M[e+4],M[e+5],M[e+6]),sx=Math.hypot(M[e],M[e+1],M[e+2]),sz=Math.hypot(M[e+8],M[e+9],M[e+10]);
     if(sx*sz>=12&&Math.abs(y-sy/2)<.7){const ux=M[e]/2,uz=M[e+2]/2,vx=M[e+8]/2,vz=M[e+10]/2;let m=t;
      for(let a=-1;a<=1;a+=2)for(let b=-1;b<=1;b+=2){const h=TH(x+a*ux+b*vx,z+a*uz+b*vz);if(h<m)m=h}
      const ext=t-m+.1,k=(sy+ext)/sy;M[e+4]*=k;M[e+5]*=k;M[e+6]*=k;y-=ext/2;TERRSTAT.skirt++}}
    M[e+13]=y+t;sum+=t;if(Math.abs(t)>TERRSTAT.maxLift)TERRSTAT.maxLift=Math.abs(t)}
   const mean=n?sum/n:0;for(let i=0;i<n;i++){const e=i*16;M[e+13]-=mean;const d=Math.abs(M[e+13]);if(d>dev)dev=d}
   c.position.y+=mean;if(!c.matrixAutoUpdate)c.updateMatrix();c.instanceMatrix.needsUpdate=true;TERRSTAT.inst+=n;
   if(dev>440)c.frustumCulled=false;
   continue}
  const g=c.geometry,pa=g&&g.attributes&&g.attributes.position;
  if(pa&&(c.isMesh||c.isLine||c.isPoints)&&c.position.x===0&&c.position.y===0&&c.position.z===0&&c.rotation.x===0&&c.rotation.y===0&&c.rotation.z===0&&c.scale.x===1&&c.scale.y===1&&c.scale.z===1){
   const A=pa.array;for(let i=0;i<pa.count;i++){const o=i*3;A[o+1]+=TH(A[o],A[o+2])}pa.needsUpdate=true;g.computeBoundingBox();g.computeBoundingSphere();TERRSTAT.vtx+=pa.count;continue}
  c.position.y+=TH(c.position.x,c.position.z);if(!c.matrixAutoUpdate)c.updateMatrix();TERRSTAT.obj++}
 TERRSTAT.ms=Math.round(performance.now()-t0);console.log('terrain pass: instances',TERRSTAT.inst,'skirted',TERRSTAT.skirt,'merged vertices',TERRSTAT.vtx,'objects',TERRSTAT.obj,'skipped',TERRSTAT.skipped,TERRSTAT.ms+' ms, max lift '+Math.round(TERRSTAT.maxLift)+' m')}
