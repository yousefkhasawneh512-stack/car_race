// ---- visible vehicle components (v44): bumpers, mirrors, bonnet / boot lids, door skins, per-pane glass cracks, bent rims, flat tyres, detached parts ----
// Original procedural implementation (the visible-damage look of open-world racers was the brief; no third-party code or assets).
// Built on the PLAYER's mesh only (first refresh after a car is set), so traffic/showcar draw calls are unchanged. Every threshold is a GAMEPLAY
// ESTIMATE scaled by the car's own crush stiffness/durability (carSpec, 07c); none is a manufacturer or crash-test value (docs/REALISM_RESEARCH.md).
// Glass follows the usual automotive split (FMVSS 205 / UN R43 glazing): the laminated windscreen cracks and stays in place; tempered side and rear
// windows craze all over and break out. Parts state lives in the per-car record (s.parts 0..1, s.cracks per pane, s.rims 0..1) so it persists.
const DP_KEYS=['bf','br','ml','mr','hood','trunk','dl','dr'],DP_NAMES={bf:'Front bumper',br:'Rear bumper',ml:'Left mirror',mr:'Right mirror',hood:'Bonnet (hood)',trunk:'Boot lid (trunk)',dl:'Left doors',dr:'Right doors'};
const DP_DARK=new T.MeshLambertMaterial({color:0x17181a}),DP_MIRG=new T.MeshBasicMaterial({color:0x8fa4b6}),DP_BOX=new T.BoxGeometry(1,1,1),DP_SC=new Map();
// scuffed / bare-metal clone of a paint material (cached per source material)
function dpScuff(m,k){const key=m.uuid+k;let s=DP_SC.get(key);if(!s){s=m.clone();if(s.color){if(k==='m')s.color.setRGB(.55,.56,.58);else s.color.multiplyScalar(.68)}if('roughness' in s)s.roughness=k==='m'?.45:Math.min(1,(s.roughness||.4)+.35);if('metalness' in s)s.metalness=k==='m'?.8:(s.metalness||0)*.4;DP_SC.set(key,s)}return s}
// car geometry in mesh-local metres (+x = car's left, +z = forward): the same profile mkPorsche extrudes
function dpGeo(i){const m=PORS[i],L=m[3],W=m[4],H=m[5],k=m[6],P0=PROF[k]||PROF.c,bh=(H-.3)*P0.bf,y0=.3+bh,a=P0.g,u=f=>f*L;
 return{L,W,H,k,y0,ny:.3+bh*P0.nf,ty:.3+bh*P0.rf,hz:L*(.5-P0.hl),rz:-L*.42,ws:[u(a[0]),u(a[1])],rs:a.length===4?[u(a[3]),u(a[2])]:null,four:a.length===4}}
// ---- build the tagged parts once per player mesh ----
function dpEnsure(m){if(!m||m.userData.dpBuilt)return m&&m.userData.dp;const g=dpGeo(P.idx),body=m.children.find(c=>c.userData&&c.userData.part==='body');if(!body)return null;
 const paint=body.material,D={},add=(name,mesh,x,y,z)=>{mesh.position.set(x,y,z);mesh.userData.part=name;mesh.userData.p0=[x,y,z];mesh.castShadow=true;m.add(mesh);return mesh};
 const bh=Math.min(.2,(g.ny-.3)*.75);
 for(const[key,zs]of[['bf',1],['br',-1]]){const grp=new T.Group(),b=new T.Mesh(DP_BOX,paint);b.scale.set(g.W-.02,bh,.16);grp.add(b);const gr=new T.Mesh(DP_BOX,DP_DARK);gr.scale.set(g.W*.46,bh*.38,.02);gr.position.set(0,-bh*.12,zs*.08);grp.add(gr);
  grp.userData.paintMesh=b;D[key]=add(key,grp,0,.3+bh/2,zs*(g.L/2+.01))}
 for(const[key,sx]of[['ml',1],['mr',-1]]){const grp=new T.Group(),h=new T.Mesh(DP_BOX,paint);h.scale.set(.15,.1,.09);grp.add(h);const gl2=new T.Mesh(DP_BOX,DP_MIRG);gl2.scale.set(.12,.075,.01);gl2.position.z=-.05;grp.add(gl2);
  const st=new T.Mesh(DP_BOX,DP_DARK);st.scale.set(.08,.03,.04);st.position.x=-sx*.09;grp.add(st);grp.userData.paintMesh=h;D[key]=add(key,grp,sx*(g.W/2+.1),g.y0+.07,g.ws[0]-.08)}
 // bonnet / boot lid / door skins: hidden until damaged (a crumpled copy of the panel, 1.5 cm proud of the shell, so the buckle is visible)
 const lid=(z0,y0,z1,y1,w)=>{const len=Math.hypot(z1-z0,y1-y0),geo=new T.PlaneGeometry(w,len,8,8).rotateX(-Math.PI/2),mm=new T.Mesh(geo,dpScuff(paint,'p'));mm.rotation.x=-Math.atan2(y1-y0,z1-z0)*Math.sign(z1-z0);
  mm.userData.base=Float32Array.from(geo.attributes.position.array);mm.userData.len=len;mm.visible=false;return mm};
 D.hood=add('hood',lid(g.L/2-.14,g.ny,g.hz+.04,g.y0,g.W*.86),0,(g.ny+g.y0)/2+.02,(g.L/2-.14+g.hz+.04)/2);
 D.trunk=add('trunk',lid(-g.L/2+.12,g.ty,g.rz-.04,g.y0,g.W*.84),0,(g.ty+g.y0)/2+.02,(-g.L/2+.12+g.rz-.04)/2);
 const dz0=g.ws[0]+.1,dz1=g.four?Math.max(g.rs[0]-.1,dz0-1.6):dz0-1.1;
 for(const[key,sx]of[['dl',1],['dr',-1]]){const geo=new T.PlaneGeometry(dz0-dz1,g.y0-.42,8,4).rotateY(sx*Math.PI/2),mm=new T.Mesh(geo,dpScuff(paint,'p'));mm.userData.base=Float32Array.from(geo.attributes.position.array);mm.visible=false;
  D[key]=add(key,mm,sx*(g.W/2-.005),(g.y0+.42)/2,(dz0+dz1)/2)}
 m.userData.dpBuilt=true;m.userData.dp=D;return D}
// deform a lid/door plane: tent crease (peak at `pk` along its length), lift of the far edge, lateral bias toward the hit side
function dpBend(mesh,sev,pk,lift,bias){const a=mesh.geometry.attributes.position,b=mesh.userData.base,ar=a.array;let mx=0,mz=0;for(let v=0;v<b.length;v+=3){mx=Math.max(mx,Math.abs(b[v]));mz=Math.max(mz,Math.abs(b[v+2]))}
 for(let v=0;v<b.length;v+=3){const x=b[v],y=b[v+1],z=b[v+2],t=(z/mz+1)/2,s=(x/mx+1)/2,cr=Math.max(0,1-Math.abs(t-pk)/.35),w=1+bias*(s-.5)*1.2;ar[v]=x;ar[v+1]=y+sev*(.11*cr*w+lift*t*t);ar[v+2]=z*(1-sev*.05)}
 a.needsUpdate=true;mesh.geometry.computeVertexNormals()}
function dpDoor(mesh,sev,sx,cz){const a=mesh.geometry.attributes.position,b=mesh.userData.base,ar=a.array;let mzv=0,myv=0;for(let v=0;v<b.length;v+=3){mzv=Math.max(mzv,Math.abs(b[v+2]));myv=Math.max(myv,Math.abs(b[v+1]))}
 const c0=cl((cz-mesh.position.z)/(mzv||1),-1,1);
 for(let v=0;v<b.length;v+=3){const z=b[v+2],y=b[v+1],t=z/(mzv||1),q=y/(myv||1),d=Math.max(0,1-((t-c0)/.75)**2)*Math.max(0,1-(q/1.15)**2);ar[v]=b[v]-sx*sev*.09*d;ar[v+1]=y;ar[v+2]=z}
 a.needsUpdate=true;mesh.geometry.computeVertexNormals()}
// ---- crack textures: deterministic from the saved crack origins, rebuilt only when a pane's crack list changes ----
const DP_TEX=new Map();
function dpRand(seed){let s=seed|0||1;return()=>((s=(s*1103515245+12345)&0x7fffffff)/0x7fffffff)}
function dpCrackTex(pane,list){const key=pane+':'+list.map(c=>c.join(',')).join(';');const old=DP_TEX.get(pane);if(old&&old.key===key)return old.mat;
 let tex=null;try{const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d'),tempered=pane>=1;g.lineCap='round';
  for(const[cu,cv,sev]of list){const r=dpRand(Math.round(cu*977+cv*331+pane*71)),x0=cu*256,y0=(1-cv)*256,arms=Math.round(6+sev*12),reach=40+sev*170;
   g.fillStyle='rgba(240,244,248,.95)';g.beginPath();g.arc(x0,y0,2+sev*5,0,Math.PI*2);g.fill();g.strokeStyle='rgba(236,241,246,.9)';
   for(let k=0;k<arms;k++){let a=k/arms*Math.PI*2+r()*.4,x=x0,y=y0;g.lineWidth=1.8-k%3*.4;g.beginPath();g.moveTo(x,y);const n=4+Math.round(r()*4);for(let s=0;s<n;s++){a+=(r()-.5)*.5;const st=reach/n*(.6+r()*.8);x+=Math.cos(a)*st;y+=Math.sin(a)*st;g.lineTo(x,y)}g.stroke()}
   if(sev>.35){g.lineWidth=1;for(let ring=1;ring<=Math.round(sev*4);ring++){const rr=ring*reach/5;g.beginPath();for(let k=0;k<=arms;k++){const a=k/arms*Math.PI*2;g.lineTo(x0+Math.cos(a)*rr*(.85+r()*.3),y0+Math.sin(a)*rr*(.85+r()*.3))}g.stroke()}}
   // tempered glass crazes into small cubes over the whole pane once it fails
   if(tempered&&sev>=.85){g.lineWidth=.8;g.strokeStyle='rgba(225,230,236,.75)';for(let k=0;k<420;k++){const x=r()*256,y=r()*256,a=r()*Math.PI;g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(a)*7,y+Math.sin(a)*7);g.stroke()}g.fillStyle='rgba(30,32,36,.35)';g.fillRect(0,0,256,256)}}
  tex=new T.CanvasTexture(c)}catch(e){}
 if(old){if(old.mat.map)old.mat.map.dispose();old.mat.dispose()}
 const mat=new T.MeshBasicMaterial({map:tex,color:0xffffff,transparent:true,opacity:.92,depthWrite:false,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2});DP_TEX.set(pane,{key,mat});return mat}
let DP_SCR=null;
function dpScratchMat(){if(DP_SCR)return DP_SCR;let tex=null;try{const c=document.createElement('canvas');c.width=256;c.height=64;const g=c.getContext('2d'),r=dpRand(91);
 for(let k=0;k<70;k++){const x=r()*256,y=r()*64,l=20+r()*90,a=(r()-.5)*.25;g.strokeStyle=r()<.35?'rgba(70,72,76,.75)':'rgba(205,208,212,.8)';g.lineWidth=.6+r()*1.6;g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);g.stroke()}
 tex=new T.CanvasTexture(c)}catch(e){}DP_SCR=new T.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2});return DP_SCR}
// ---- impact -> parts (called by registerPlayerImpact, both Cosmetic and Full) ----
function dpImpact(s,sp,face,cx,cz,crush,kmh,tang){
 const q=s.parts,b4={bf:q.bf,br:q.br,ml:q.ml,mr:q.mr},g=dpGeo(P.idx||0),add=(k,v)=>{if(v>0)q[k]=cl(q[k]+v,0,1)},fi=face==='front'?0:face==='rear'?1:2,sc=Math.max(0,kmh-sp.thr[0])*.006;
 if(face==='front'){add('bf',crush/48+sc);if(crush>58)q.bf=1;add('hood',Math.max(0,crush-15)/40)}
 if(face==='rear'){add('br',crush/44+sc);if(crush>52)q.br=1;add('trunk',Math.max(0,crush-14)/38)}
 if(fi===2){const sd=face==='left'?'l':'r';if(Math.abs(cz)<g.L*.33)add('d'+sd,crush/28+sc*.5);if(cz>g.L*.36)add('bf',crush/70);if(cz<-g.L*.36)add('br',crush/70);
  if(Math.abs(cz-(g.ws[0]-.08))<.9)add('m'+sd,crush/10+(tang>6?.45:0)+sc)}
 // a scrape along a side (high tangential, low normal speed) takes the mirror on that side
 if(fi<2&&tang>9&&Math.abs(cx)>g.W*.35)add(cx>0?'ml':'mr',.35);
 // glass: crack origin in pane coordinates (u across, v up), merged with a nearby crack
 const crack=(j,u,v,sev)=>{if(sev<=0)return;const L=s.cracks[j],n=L.find(c=>Math.hypot(c[0]-u,c[1]-v)<.22);if(n)n[2]=+Math.min(1,n[2]+sev).toFixed(3);else{L.push([+u.toFixed(3),+v.toFixed(3),+Math.min(1,sev).toFixed(3)]);if(L.length>3)L.shift()}};
 const ux=cl(.5-cx/g.W,.08,.92);
 if(face==='front'&&kmh>sp.thr[2])crack(0,ux,.22+Math.min(.5,crush/180),(kmh-sp.thr[2])/35);
 if(face==='rear'&&kmh>sp.thr[2])crack(1,1-ux,.3,(kmh-sp.thr[2])/35);
 if(fi===2&&crush>6&&Math.abs(cz)<g.L*.3){const j=face==='left'?2:3,span=g.ws[0]-(g.four?g.rs[0]:g.ws[0]-1);crack(j,cl((g.ws[0]-cz)/(span||1),.1,.9),.45,crush/25)}
 for(let j=0;j<4;j++){let m=0;for(const c of s.cracks[j])m=Math.max(m,c[2]);s.glass[j]=Math.max(s.glass[j],m)}
 // rims: a hard hit at a wheel bends the rim (visible wobble + vibration in Full)
 for(let j=0;j<4;j++){const wx=(j%2===0?1:-1)*(g.W/2-.12),wz=(j<2?1:-1)*g.L*.31,wf=Math.max(0,1-Math.hypot(cx-wx,cz-wz)/1.0),wk=kmh*wf;if(wk>18)s.rims[j]=cl(s.rims[j]+(wk-18)/40,0,1)}
 for(const k of['bf','br','ml','mr'])if(q[k]>=1&&b4[k]<1)dpDetach(k)}
// ---- detached parts fall off and lie on the road (pooled, at most 8; each removed after 90 s) ----
const DP_DEBRIS=[];
function dpDetach(k){const D=P.m&&P.m.userData.dp;if(!D||!D[k])return;const src=D[k],wp=new T.Vector3();src.getWorldPosition(wp);const grp=src.clone(true);
 grp.position.copy(wp);grp.rotation.set(P.m.rotation.x,P.m.rotation.y,P.m.rotation.z,'YXZ');scene.add(grp);
 const k2=k[0]==='b'?.55:.85;
 DP_DEBRIS.push({m:grp,vx:P.vx*k2+(Math.random()-.5)*2,vz:P.vz*k2+(Math.random()-.5)*2,vy:1.2+Math.random(),sp:(Math.random()-.5)*6,age:0,rest:false,hh:k[0]==='b'?.08:.05});
 while(DP_DEBRIS.length>8){const o=DP_DEBRIS.shift();scene.remove(o.m)}
 if(typeof toast==='function')toast('💥 '+DP_NAMES[k]+' torn off')}
function dpTick(dt){
 for(let i=DP_DEBRIS.length-1;i>=0;i--){const d=DP_DEBRIS[i],m=d.m;d.age+=dt;if(d.age>90){scene.remove(m);DP_DEBRIS.splice(i,1);continue}if(d.rest)continue;
  d.vy-=9.81*dt;m.position.x+=d.vx*dt;m.position.y+=d.vy*dt;m.position.z+=d.vz*dt;m.rotation.y+=d.sp*dt;m.rotation.x+=d.sp*.4*dt;const gy=TH(m.position.x,m.position.z)+.06+d.hh;
  if(m.position.y<gy){m.position.y=gy;d.vy=Math.abs(d.vy)>2?-d.vy*.25:0;d.vx*=.5;d.vz*=.5;d.sp*=.4;m.rotation.x*=.5;if(Math.hypot(d.vx,d.vz)<.3&&!d.vy){d.rest=true;m.rotation.x=0;m.rotation.z=(Math.random()-.5)*.2}}}
 // bent rims wobble with the wheel's rotation (visual; Full mode adds the vibration through DFX.vib)
 const D=P.m&&P.m.userData.dp;if(!D||damageMode===0)return;const s=currentDamageRecord();if(!s.rims.some(v=>v>.05))return;
 const v=P.vx*Math.sin(P.h)+P.vz*Math.cos(P.h);dpPhase+=v*dt/.33;
 for(const r of D.rimList||[]){const j=r.userData.corner,b=s.rims[j];if(b<=.05)continue;const base=r.userData.rb||0;r.rotation.y=base+Math.sin(dpPhase+j)*b*.07}}
let dpPhase=0;
// ---- visuals (called at the end of refreshDamageVisual; mode Off hides everything, the record is kept) ----
function dpVisual(m,s,show){const D=dpEnsure(m);if(!D)return;const g=dpGeo(P.idx),q=s.parts;
 D.rimList=m.children.filter(c=>c.userData&&c.userData.part==='rim');
 for(const k of['bf','br','ml','mr']){const o=D[k],v=show?q[k]:0,pm=o.userData.paintMesh,p0=o.userData.p0,paint=m.children.find(c=>c.userData.part==='body').material;o.visible=v<1;o.position.set(p0[0],p0[1],p0[2]);o.rotation.set(0,0,0);
  pm.material=v>.6?dpScuff(paint,'m'):v>.15?dpScuff(paint,'p'):paint;
  if(k[0]==='b'&&v>.3){const sd=(s.zones[k==='bf'?'fl':'rl']<s.zones[k==='bf'?'fr':'rr'])?1:-1,zs=k==='bf'?1:-1;o.position.z-=zs*Math.min(.12,v*.12);o.rotation.y=sd*v*.06*zs;if(v>.6){o.rotation.z=sd*(v-.6)*.55;o.position.y-=(v-.6)*.22}}
  if(k[0]==='m'&&v>.4){const sx=k==='ml'?1:-1;o.rotation.z=sx*-1.1*(v-.3);o.rotation.y=sx*.6*v;o.position.y-=.06}}
 const lidV=(o,v,pk,lift)=>{o.visible=show&&v>.12;if(o.visible)dpBend(o,v,pk,lift,(s.zones.fl-s.zones.fr)/100)};
 lidV(D.hood,q.hood,.55,.1);lidV(D.trunk,q.trunk,.5,.08);
 for(const[k,sx,z]of[['dl',1,'l'],['dr',-1,'r']]){const o=D[k];o.visible=show&&q[k]>.15;if(o.visible){let cz=o.position.z;const dd=s.dents.filter(d=>Math.sign(d[0])===sx);if(dd.length)cz=dd.reduce((a,d)=>a+d[2],0)/dd.length;dpDoor(o,q[k],sx,cz);o.rotation.y=sx*q[k]*.05}}
 // flat tyre: squashed at the bottom with a bulging sidewall; shredded when the carcass is gone; rims bend
 for(const t of m.children){const u=t.userData;if(!u||(u.part!=='tyre'&&u.part!=='rim')||u.corner===undefined||!show)continue;const w=s.wheels[u.corner];
  if(u.part==='tyre'&&w.punct){t.scale.x=(u.sx0||(u.sx0=t.scale.x))*1.14;if(w.health<15)t.scale.y*=.92}else if(u.part==='tyre'&&u.sx0)t.scale.x=u.sx0;
  if(u.part==='rim'){u.rb=t.rotation.y;const b=s.rims[u.corner];if(b>.05){t.scale.y=u.p0[1]*(1-b*.07);t.scale.z=u.p0[2]*(1+b*.04)}}}
 if(!show)return;
 const ov=new T.Group();ov.userData.damageOverlay=true;const put=(mat,x,y,z,sx,sy,ry,rx)=>{const p=new T.Mesh(DMG_PLANE,mat);p.position.set(x,y,z);p.scale.set(sx,sy,1);p.rotation.order='YXZ';p.rotation.set(rx||0,ry||0,0);p.userData.damageOverlay=true;ov.add(p)};
 // paint scratches on the zones that lost condition (textured strips on the side skin / bumper faces)
 const sm=dpScratchMat(),SZ={fl:[1,.33],fr:[-1,.33],l:[1,0],r:[-1,0],rl:[1,-.33],rr:[-1,-.33]};
 for(const z in SZ){const loss=100-s.zones[z];if(loss<1.5)continue;const[sx,f]=SZ[z],len=Math.min(g.L*.3,.35+loss*.025),h=Math.min(.3,.08+loss*.006);put(sm,sx*(g.W/2+.012),.42+(f*7%3)*.03,f*g.L,len,h,sx*Math.PI/2)}
 // glass cracks: one textured overlay per pane, laid on the pane surface (offset 1.5 cm outward)
  const pane=(j,za,ya,zb,yb,wd)=>{if(!s.cracks[j].length)return;const dz=zb-za,dy=yb-ya;put(dpCrackTex(j,s.cracks[j]),0,(ya+yb)/2+.05,(za+zb)/2+(dz<0?.06:-.06),wd,Math.hypot(dz,dy),dz<0?0:Math.PI,Math.atan2(-Math.abs(dz),dy))};
 pane(0,g.ws[0],g.y0,g.ws[1],g.H,g.W*.78);if(g.rs)pane(1,g.rs[0],g.y0,g.rs[1],g.H,g.W*.74);
 const zc=g.four?(g.ws[1]+g.rs[1])/2:g.ws[0]-.45,zl=g.four?Math.abs(g.ws[1]-g.rs[1])+.5:.7;
 for(const[j,sx]of[[2,1],[3,-1]])if(s.cracks[j].length){const mat=dpCrackTex(j,s.cracks[j]);put(mat,sx*(g.W*.42+.1),(g.y0+g.H)/2,zc,zl,(g.H-g.y0)*.78,sx*Math.PI/2)}
 // broken lamps: a cracked lens over the dark housing
 for(const c of m.children){const u=c.userData;if(!u||(u.part!=='hl'&&u.part!=='tl'))continue;const j=(u.part==='hl'?0:2)+(u.side>0?0:1);if(s.lights[j]){const mat=dpCrackTex(4+j,[[.5,.5,.7]]);put(mat,c.position.x,c.position.y,c.position.z+(u.part==='hl'?.035:-.035),.42,.16,u.part==='hl'?0:Math.PI)}}
 if(ov.children.length)m.add(ov)}
// ---- mechanical side of the new parts (Full only; folded into DFX by damageEffects) ----
function dpEffects(s,F){const r=s.rims,b=(r[0]+r[1]+r[2]+r[3])/4;F.vib=cl(F.vib+b*.5,0,1);F.pull+=(r[0]-r[1])*.03+(r[2]-r[3])*.015;F.grip*=1-.08*b;
 // rolling resistance of a flat tyre: roughly ten times a healthy tyre's (estimate), as a deceleration in m/s^2 per flat corner
 let flats=0;for(const w of s.wheels)if(w.punct)flats++;F.roll=flats*.45}
// repair hooks (08d): ids 'p:<key>' and 'rim:<j>'
function dpRepair(s,k,a){if(k==='p'){s.parts[a]=0;return true}if(k==='rim'){s.rims[+a]=0;return true}return false}
dpReady=true;refreshDamageVisual();
