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
 if(o===P&&typeof registerPlayerImpact==='function'){const incoming=-(o.vx*nx+o.vz*nz);if(incoming>1.8){const gv=registerPlayerImpact(incoming,a,nx,nz);if(gv>0){o.vx+=nx*gv;o.vz+=nz*gv;return true}}}
 o.x+=nx*pen;o.z+=nz*pen;if(o.vx!==undefined){const vn=o.vx*nx+o.vz*nz;if(vn<0){o.vx-=vn*nx*1.4;o.vz-=vn*nz*1.4}}else o.v*=(o.rad?.9:.6);return true}return false}
// ---- traffic signals (v44) ----
// Cycle 60 s per junction: own approach green 24 s -> amber 3 s -> red, with 3 s all-red clearance before the cross street goes green.
// Amber 3 s and all-red clearance follow common practice (ITE change-interval guidance: amber ~3-6 s); flashing green (used at some Amman
// junctions, Awad 2014) is not modelled because its use in Irbid is undocumented. Junctions run in 4 offset groups (0/15/30/45 s), not all in step.
// light(axis, junction) -> 'g' | 'y' | 'r'. Axis 'x' is the junction's first major approach, 'z' the crossing one, 'i' a link inside a split junction.
let clock=0,hour=15;const SIG_CYC=60,SIG_G=24,SIG_Y=3;
const light=(ax,nd)=>{if(ax==='i')return'g';const p=((clock+(nd&&nd.sgo||0)+(ax==='x'?0:SIG_CYC/2))%SIG_CYC+SIG_CYC)%SIG_CYC;return p<SIG_G?'g':p<SIG_G+SIG_Y?'y':'r'};
// ---- signalised junctions: every junction with an OSM traffic_signals node within 40 m (real) + major crossroads (inferred, estimated:true):
// 4+ arterial arms (trunk/primary/secondary, >= 8 m wide) of which 2+ are trunk/primary. OSM maps very few signals here, so every inferred one is
// marked estimated in SIGNALS (manifest/signals.json via tools). Heads: a black 3-aspect housing (red top, amber, green bottom) on a 4 m pole at
// the near-side kerb, 9 m before the junction centre (just past the 10 m stop line), facing the approaching traffic. The generic vertical layout
// is used: no verified photo of Irbid signal hardware was available, so no Jordan-specific design is claimed.
function approachOf(nd,e){const back=e.b===nd.id?edgePt(e,Math.max(0,e.len-14)):edgePt(e,Math.min(e.len,14)),dx=nd.x-back[0],dz=nd.z-back[1],l=Math.hypot(dx,dz)||1;return[dx/l,dz/l]}
const LIT=[],SIGNALS=[],SIG_SKIPPED=[],SIGN_OSM=NETD.sig.filter(s=>s[2]===1),SIG_LAMPS=[];let SIG_MESH=null,SIG_LAST='';
{const stops=[],posts=[],heads=[],ART=new Set(['trunk','primary','secondary']),PRIM=new Set(['trunk','primary']);
 const real=new Set();SIGN_OSM.forEach(s=>{let bn=null,bd=40;for(const id in NODES){const n=NODES[id];if(Math.abs(n.x-s[0])>bd||Math.abs(n.z-s[1])>bd)continue;const d=Math.hypot(n.x-s[0],n.z-s[1]);if(n.deg>=3&&!n.rb&&d<bd){bd=d;bn=n}}if(bn)real.add(bn.id)});
 const cand=[];for(const id in NODES){const nd=NODES[id];if(nd.deg<3||nd.rb)continue;const maj=nd.inn.filter(e=>!e.rb&&e.kind!=='ramp'&&ART.has(e.hw)&&e.w>=8);
  const isReal=real.has(id);if(!isReal&&(maj.length<4||maj.filter(e=>PRIM.has(e.hw)).length<2))continue;if(nd.inn.every(e=>e.ow&&e.b!==nd.id))continue;cand.push({id,nd,maj,isReal})}
 // one controller per junction: nodes of a split junction (dual carriageway, < 35 m apart) share the offset and the axis reference, and the short
 // links between them carry no signal (cars that entered on green are not stopped again halfway through)
 const grp=new Map();for(const c of cand){if(grp.has(c.id))continue;const G=[c];grp.set(c.id,G);for(let k=0;k<G.length;k++)for(const o of cand)if(!grp.has(o.id)&&Math.hypot(o.nd.x-G[k].nd.x,o.nd.z-G[k].nd.z)<35){grp.set(o.id,G);G.push(o)}}
 // pass 1: every approach of every node (an approach shorter than 16 m has no room for a stop line 10 m back, so it counts as part of the junction)
 const APP=new Map();for(const c of cand){const{id,nd}=c,G=grp.get(id),inG=new Set(G.map(q=>q.id)),L=[];
  for(const e of nd.inn){const far=NODES[e.a===id?e.b:e.a];const internal=e.len<16||!!(far&&(inG.has(far.id)||G.some(q=>q.id!==id&&Math.hypot(q.nd.x-far.x,q.nd.z-far.z)<30)));L.push({e,internal,head:!internal&&!(e.ow&&e.a===id)})}APP.set(id,L)}
 // pass 2: a junction needs signal heads on at least 2 approaches to work; otherwise it is left unsignalised (listed in SIG_SKIPPED, OSM ones flagged)
 for(const c of cand){const{id,nd}=c,G=grp.get(id),lead=G[0];let nh=0;for(const q of G)nh+=APP.get(q.id).filter(a=>a.head).length;
  if(nh<2){if(G[0]===c)SIG_SKIPPED.push({id,x:+nd.x.toFixed(1),z:+nd.z.toFixed(1),osm:G.some(q=>q.isReal),why:'approach links shorter than 16 m: no room for stop lines'});continue}
  const base=lead.maj.length?lead.maj:lead.nd.inn.filter(e=>!e.rb);nd.lit=true;nd.ph={};nd.sgo=(Math.abs(Math.round(lead.nd.x*7+lead.nd.z*13))%4)*15;const h0=approachOf(lead.nd,base[0]);LIT.push(nd);
  SIGNALS.push({id,x:+nd.x.toFixed(1),z:+nd.z.toFixed(1),estimated:!G.some(q=>q.isReal),source:G.some(q=>q.isReal)?'OSM highway=traffic_signals within 40 m':'inferred: major crossroads (4+ arterial arms)',offset:nd.sgo,junction:lead.id,heads:0});
  for(const{e,internal,head}of APP.get(id)){if(internal){nd.ph[e.id]='i';continue}const h=approachOf(nd,e);nd.ph[e.id]=Math.abs(h[0]*h0[0]+h[1]*h0[1])>.7071?'x':'z';if(!head)continue;
   const rx=-h[1],rz=h[0],hw=e.w/2,ry=Math.atan2(h[0],h[1]),sx=nd.x-h[0]*9+rx*(hw+1.1),sz=nd.z-h[1]*9+rz*(hw+1.1),face=Math.atan2(-h[0],-h[1]);
   stops.push([nd.x-h[0]*10+rx*hw/2,.09,nd.z-h[1]*10+rz*hw/2,ry,hw,.04,.6]);posts.push([sx,2,sz,0,.16,4,.16]);heads.push([sx-h[0]*.12,3.35,sz-h[1]*.12,face,.36,1.05,.26]);SIGNALS[SIGNALS.length-1].heads++;
   // three lamps on the housing face (towards the driver), red on top
   for(let k=0;k<3;k++)SIG_LAMPS.push({x:sx-h[0]*.26,y:3.69-k*.33,z:sz-h[1]*.26,ry:face,nd,ax:nd.ph[e.id],c:k})}}
 instO(UB,UBm(0xf2f2f2),stops,false,700);instO(UB,UBm(0x5a5f63),posts,false,700);instO(UB,UBm(0x141516),heads,false,700);
 // all lamps are one InstancedMesh with per-instance colour, updated only when some junction changes state (a few times a second at most)
 if(SIG_LAMPS.length){const g=new T.CylinderGeometry(.13,.13,.05,14).rotateX(Math.PI/2);SIG_MESH=new T.InstancedMesh(g,new T.MeshBasicMaterial({color:0xffffff}),SIG_LAMPS.length);SIG_MESH.frustumCulled=false;
  const o=new T.Object3D(),c0=new T.Color(.1,.1,.1);SIG_LAMPS.forEach((q,i)=>{o.position.set(q.x,q.y,q.z);o.rotation.set(0,q.ry,0);o.updateMatrix();SIG_MESH.setMatrixAt(i,o.matrix);SIG_MESH.setColorAt(i,c0)});scene.add(SIG_MESH)}
 console.log('signalised junctions',new Set(SIGNALS.map(q=>q.junction)).size,'('+LIT.length+' nodes; OSM-mapped',new Set(SIGNALS.filter(q=>!q.estimated).map(q=>q.junction)).size+', estimated',new Set(SIGNALS.filter(q=>q.estimated).map(q=>q.junction)).size+'; not modelled',SIG_SKIPPED.length,'incl.',SIG_SKIPPED.filter(q=>q.osm).length,'OSM)')}
const SIG_ON=[[2.4,.12,.08],[2.3,1.35,.06],[.12,2.3,.6]],SIG_OFF=[[.2,.04,.03],[.2,.15,.02],[.03,.18,.06]],_sc=new T.Color();
function sigTick(){if(!SIG_MESH)return;let key='';for(let g=0;g<4;g++)key+=light('x',{sgo:g*15})+light('z',{sgo:g*15});if(key===SIG_LAST)return;SIG_LAST=key;const k=GFX.on?1:.55;
 for(let i=0;i<SIG_LAMPS.length;i++){const q=SIG_LAMPS[i],st=light(q.ax,q.nd),on=(st==='r'&&q.c===0)||(st==='y'&&q.c===1)||(st==='g'&&q.c===2),v=on?SIG_ON[q.c]:SIG_OFF[q.c];_sc.setRGB(Math.min(v[0]*k+(on&&!GFX.on?.3:0),2.4),Math.min(v[1]*k,2.4),Math.min(v[2]*k,2.4));SIG_MESH.setColorAt(i,_sc)}
 SIG_MESH.instanceColor.needsUpdate=true}
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
