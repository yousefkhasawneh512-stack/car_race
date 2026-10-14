// ---- static display / parked cars: colliders always, meshes created only while the player is within ~300 m ----
SHOWCARS.forEach(c=>{c.idx=PORS.findIndex(m=>m[0]===c.name);c.m=null;if(c.idx>=0)boxCol(c.x,c.z,2.1,4.7,c.h)});
function showCarsTick(){for(const c of SHOWCARS){if(c.idx<0)continue;const d2=(c.x-P.x)**2+(c.z-P.z)**2;if(!c.m&&d2<300*300){const g=carMesh(c.idx,c.col);g.position.set(c.x,TH(c.x,c.z)+.12,c.z);g.rotation.set(0,c.h,0);c.m=g}else if(c.m&&d2>450*450){scene.remove(c.m);c.m=null}}}
