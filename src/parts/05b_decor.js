// ---- colliders (oriented boxes + circles in a 100 m hash), clock/lights, circles & monuments ----
const COL=new Map(),ck=(i,j)=>(i+100)*1000+(j+100);
function addCol(c){const R=(c.r!==undefined?c.r:Math.hypot(c.hw,c.hd))+3;c._cells=[];for(let i=Math.floor((c.x-R)/100);i<=Math.floor((c.x+R)/100);i++)for(let j=Math.floor((c.z-R)/100);j<=Math.floor((c.z+R)/100);j++){const k=ck(i,j);let L=COL.get(k);if(!L)COL.set(k,L=[]);L.push(c);c._cells.push(k)}return c}
function removeCol(c){if(!c||c.broken)return;c.broken=true;for(const k of c._cells||[]){const L=COL.get(k);if(!L)continue;const i=L.indexOf(c);if(i>=0)L.splice(i,1);if(!L.length)COL.delete(k)}}
const boxCol=(x,z,w,d,ry,type)=>addCol({x,z,hw:w/2,hd:d/2,c:Math.cos(ry||0),s:Math.sin(ry||0),type:type||'solid'});
function colB(o){const L=COL.get(ck(Math.floor(o.x/100),Math.floor(o.z/100)));if(!L)return false;for(const a of L){if(a.broken)continue;let nx,nz,pen;const q=o.rad||2.2,dx=o.x-a.x,dz=o.z-a.z;
 if(a.r!==undefined){const d=Math.hypot(dx,dz);if(d>=a.r+q)continue;nx=d>1e-4?dx/d:1;nz=d>1e-4?dz/d:0;pen=a.r+q-d}
 else{const lx=dx*a.c-dz*a.s,lz=dx*a.s+dz*a.c,cx=cl(lx,-a.hw,a.hw),cz=cl(lz,-a.hd,a.hd);let ex=lx-cx,ez=lz-cz,d=Math.hypot(ex,ez);
  if(d>=q)continue;if(d<1e-4){const px=a.hw-Math.abs(lx),pz=a.hd-Math.abs(lz);if(px<pz){ex=Math.sign(lx)||1;ez=0;pen=px+q}else{ex=0;ez=Math.sign(lz)||1;pen=pz+q}d=1}else pen=q-d;
  ex/=d;ez/=d;nx=ex*a.c+ez*a.s;nz=-ex*a.s+ez*a.c}
 if(o===P&&typeof registerPlayerImpact==='function'){const incoming=-(o.vx*nx+o.vz*nz);if(incoming>1.8)registerPlayerImpact(incoming,a,nx,nz)}
 o.x+=nx*pen;o.z+=nz*pen;if(o.vx!==undefined){const vn=o.vx*nx+o.vz*nz;if(vn<0){o.vx-=vn*nx*1.4;o.vz-=vn*nz*1.4}}else o.v*=(o.rad?.9:.6);return true}return false}
let clock=0,hour=15;const light=ax=>{const p=ax==='x'?clock%28:(clock+14)%28;return p<10?'g':p<12?'y':'r'};
// ---- signalised junctions: the 14 signals mapped in OSM + junctions where three or more arterial arms meet (inferred; OSM lists few) ----
const mX=new T.MeshBasicMaterial({color:0x22ff55}),mZ=new T.MeshBasicMaterial({color:0xff2a2a});
function approachOf(nd,e){const back=e.b===nd.id?edgePt(e,Math.max(0,e.len-14)):edgePt(e,Math.min(e.len,14)),dx=nd.x-back[0],dz=nd.z-back[1],l=Math.hypot(dx,dz)||1;return[dx/l,dz/l]}
const LIT=[],SIGN_OSM=NETD.sig.filter(s=>s[2]===1);
{const stops=[],postsA=[],hX=[],hZ=[],ART=new Set(['trunk','primary','secondary']);
 const real=new Set();SIGN_OSM.forEach(s=>{let bn=null,bd=40;for(const id in NODES){const n=NODES[id];if(Math.abs(n.x-s[0])>bd||Math.abs(n.z-s[1])>bd)continue;const d=Math.hypot(n.x-s[0],n.z-s[1]);if(n.deg>=3&&!n.rb&&d<bd){bd=d;bn=n}}if(bn)real.add(bn.id)});
 for(const id in NODES){const nd=NODES[id];if(nd.deg<3||nd.rb)continue;const maj=nd.inn.filter(e=>!e.rb&&e.kind!=='ramp'&&ART.has(e.hw)&&e.w>=8);if(!real.has(id)&&maj.length<3)continue;if(nd.inn.every(e=>e.ow&&e.b!==nd.id))continue;
  const base=maj.length?maj:nd.inn.filter(e=>!e.rb);nd.lit=true;nd.ph={};const h0=approachOf(nd,base[0]);LIT.push(nd);
  nd.inn.forEach(e=>{const h=approachOf(nd,e);nd.ph[e.id]=Math.abs(h[0]*h0[0]+h[1]*h0[1])>.7071?'x':'z';
   if(e.ow&&e.a===nd.id)return;const rx=-h[1],rz=h[0],hw=e.w/2,ry=Math.atan2(h[0],h[1]),sx=nd.x-h[0]*11+rx*(hw+1.2),sz=nd.z-h[1]*11+rz*(hw+1.2);
   stops.push([nd.x-h[0]*10+rx*hw/2,.09,nd.z-h[1]*10+rz*hw/2,ry,hw,.04,.6]);postsA.push([sx,2.8,sz]);(nd.ph[e.id]==='x'?hX:hZ).push([sx,6.1,sz,0,1.1,1.1,1.1])})}
 instO(UB,UBm(0xf2f2f2),stops,false,700);instO(UB,UBm(0x444444),postsA.map(p=>[p[0],p[1],p[2],0,.3,5.6,.3]),false,700);instO(UB,mX,hX,false,700);instO(UB,mZ,hZ,false,700);console.log('signalised junctions',LIT.length,'(OSM-mapped',real.size+')')}
// ---- roundabouts: every real OSM roundabout gets a kerbed island + collider; four of them carry the game's landmark monuments ----
const mStone=new T.MeshLambertMaterial({color:0xe6dcc3}),mGold=new T.MeshLambertMaterial({color:0xd4af37}),mGrass=new T.MeshLambertMaterial({color:0x6b8f4a}),mRim=new T.MeshLambertMaterial({color:0xf4f4f4});
const nearCirc=(x,z,minR)=>{let b=null,bd=1e18;for(const c of CIRC){if(c.r<(minR||0))continue;const d=Math.hypot(c.x-x,c.z-z);if(d<bd){bd=d;b=c}}return b};
const CANP_PRE=[];
{const MN=[['N','Nabulsi Circle',nearCirc(-132,-517,8)],['Q','Al-Qubbah Circle',nearCirc(109,985,8)],['C','University Circle',nearCirc(YUC[0],YUC[1],12)],['T','Al-Thaqafah Circle',nearCirc(U(2500)[0],U(2500)[1],14)]];
 for(const[id,nm,c]of MN)if(c&&!c.mono){c.mono=id;c.name=c.name||nm}
 const isl=[],rim=[];
 CIRC.forEach(c=>{const ir=c.r-c.w/2-.7;if(ir<2.5)return;isl.push([c.x,.35,c.z,0,ir,.7,ir]);rim.push([c.x,.62,c.z,0,ir+.35,.14,ir+.35]);addCol({x:c.x,z:c.z,r:Math.max(2.4,ir)});
  if(!c.mono){const n=Math.min(8,Math.floor(ir/2.2));for(let k=0;k<n;k++){const a=k*Math.PI*2/n+.3;CANP_PRE.push([c.x+Math.cos(a)*ir*.62,c.z+Math.sin(a)*ir*.62,Math.min(1.4,ir/9)])}}});
 const cyl=new T.CylinderGeometry(1,1,1,28);instO(cyl,mGrass,isl,false,900);instO(cyl,mRim,rim,false,900);
 CIRC.filter(c=>c.mono).forEach(c=>{const y0=0,g=new T.Group(),k=Math.min(1,Math.max(.55,(c.r-c.w/2-.7)/12.5));g.position.set(c.x,y0,c.z);
  const M=(geo,mat,x,y,z)=>{const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;g.add(m);return m};const id=c.mono;
  if(id==='N'){[[10,2.4,7],[7.6,2.4,5.2],[5.2,2.4,3.4]].forEach((s,i)=>M(new T.BoxGeometry(...s),new T.MeshLambertMaterial({color:i%2?0xefe4c6:0xf6edd3}),0,1.9+i*2.4,0));M(new T.SphereGeometry(1,12,8),mGold,0,9.4,0)}
  if(id==='Q'){for(let q=0;q<8;q++){const a=q*Math.PI/4;M(new T.CylinderGeometry(.55,.65,6,10),mStone,Math.cos(a)*6,3.6,Math.sin(a)*6)}M(new T.CylinderGeometry(7.2,7.2,.5,24),mStone,0,.9,0);M(new T.SphereGeometry(6.8,20,10,0,Math.PI*2,0,Math.PI/2),new T.MeshLambertMaterial({color:0x2a9d8f}),0,6.6,0);M(new T.CylinderGeometry(.12,.12,4,6),mGold,0,14,0)}
  if(id==='C'){M(new T.CylinderGeometry(2.4,3,5,14),mStone,0,3,0);M(new T.SphereGeometry(4.2,20,14),new T.MeshLambertMaterial({color:0x2f7fd0}),0,10,0);M(new T.TorusGeometry(5.6,.25,6,32).rotateX(Math.PI/2.6),mGold,0,10,0)}
  if(id==='T'){for(let q=0;q<3;q++){const a=q*Math.PI*2/3,m=M(new T.CylinderGeometry(.5,.9,15,8),mStone,Math.cos(a)*3.2,8.2,Math.sin(a)*3.2);m.rotation.z=-Math.cos(a)*.22;m.rotation.x=Math.sin(a)*.22}M(new T.ConeGeometry(2.2,5.5,10),new T.MeshBasicMaterial({color:0xff8a1f}),0,17.4,0)}
  g.children.forEach(m=>{m.scale.multiplyScalar(k)});g.children.forEach(m=>{m.position.multiplyScalar(k)});
  const sg=label(c.name);sg.scale.set(28,3.5,1);sg.position.y=23*k;g.add(sg);scene.add(g)})}
