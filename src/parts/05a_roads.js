// ---- ground, stunt ramps, road ribbons (real OSM polylines, chunked) and lane markings ----
const GS=2600,GN=130,gg=new T.PlaneGeometry(GS,GS,GN,GN).rotateX(-Math.PI/2),gp=gg.attributes.position,gcol=new Float32Array(gp.count*3);gg.setAttribute('color',new T.BufferAttribute(gcol,3));const gU=new Float32Array(gp.count);gg.setAttribute('aU',new T.BufferAttribute(gU,1));
const gnd=new T.Mesh(gg,gfxStd({vertexColors:true,roughness:1,metalness:0,envMapIntensity:.14},'ground')||new T.MeshLambertMaterial({vertexColors:true}));gnd.receiveShadow=true;scene.add(gnd);
const GHT=new Float32Array(gp.count),GDROP=.08;let gcx=1e9,gcz=1e9;const sandC=new T.Color(0xa99b76),oliveC=new T.Color(0x7f8c52),urbC=new T.Color(0x8d8879),tmpC=new T.Color();
function groundTo(cx,cz){if(cx===gcx&&cz===gcz)return;gcx=cx;gcz=cz;gnd.position.set(cx,0,cz);
 for(let i=0;i<gp.count;i++){const wx=cx+gp.getX(i),wz=cz+gp.getZ(i),uk=urbanK(wx,wz),hy=TH(wx,wz);GHT[i]=hy;gp.setY(i,hy-GDROP);gU[i]=uk;tmpC.copy(sandC).lerp(oliveC,.35);if(uk>0)tmpC.lerp(urbC,uk*.9);gcol[i*3]=tmpC.r;gcol[i*3+1]=tmpC.g;gcol[i*3+2]=tmpC.b}
 {const W=GN+1,gn=gg.attributes.normal,dx2=2*GS/GN;for(let r=0;r<W;r++)for(let c=0;c<W;c++){const i=r*W+c,hE=GHT[r*W+Math.min(W-1,c+1)],hW=GHT[r*W+Math.max(0,c-1)],hS=GHT[Math.min(W-1,r+1)*W+c],hN=GHT[Math.max(0,r-1)*W+c],nx=-(hE-hW)/dx2,nz=-(hS-hN)/dx2,l=Math.hypot(nx,1,nz);gn.setXYZ(i,nx/l,1/l,nz/l)}gn.needsUpdate=true}
 gp.needsUpdate=true;gg.attributes.color.needsUpdate=true;gg.attributes.aU.needsUpdate=true;gg.computeBoundingSphere()}
groundTo(0,0);
// stunt ramps: three ramps in a row on open ground (no real road within 35 m) nearest to Al-Balad, searched on the real map
const RAMP0=(()=>{const C=RA.balad;for(let r=900;r<9000;r+=150)for(let a=0;a<360;a+=10){const x=C[0]+r*Math.cos(a*Math.PI/180),z=C[1]+r*Math.sin(a*Math.PI/180);let ok=true;for(let dx=-30;dx<=140&&ok;dx+=15)for(let dz=-60;dz<=60&&ok;dz+=15)if(roadNear(x+dx,z+dz,40))ok=false;if(ok)return[x,z]}return[C[0]+3000,C[1]]})();
const RAMPS=[[RAMP0[0],RAMP0[1],12,26,4],[RAMP0[0]+50,RAMP0[1],12,26,5.5],[RAMP0[0]+100,RAMP0[1],16,44,9]],RAMPB=RAMPS.map(r=>TH(r[0],r[1]));
RAMPS.forEach(r=>{const a=Math.atan(r[4]/r[3]),m=new T.Mesh(new T.BoxGeometry(r[2],.4,Math.hypot(r[3],r[4])),new T.MeshLambertMaterial({color:0xd9822b}));m.rotation.x=-a;m.position.set(r[0],r[4]/2-.08,r[1]);m.castShadow=m.receiveShadow=true;scene.add(m)});
function groundH(x,z){let h=TH(x,z)+.12;for(let i=0;i<RAMPS.length;i++){const r=RAMPS[i];if(Math.abs(x-r[0])<r[2]/2&&z>r[1]-r[3]/2&&z<r[1]+r[3]/2)h=RAMPB[i]+.12+r[4]*(z-(r[1]-r[3]/2))/r[3]}return h}
// ---- instancing helpers (oriented boxes / geometries, 600 m chunks) ----
const BS=new T.Sphere(new T.Vector3(),520),o3=new T.Object3D(),tc=new T.Color();
function chunkBy(items,fn,cs){cs=cs||600;const ch={};items.forEach(p=>{const k=Math.floor(p[0]/cs)+','+Math.floor(p[2]/cs);(ch[k]=ch[k]||[]).push(p)});for(const k in ch){const[a,b]=k.split(',').map(Number);fn(ch[k],a*cs+cs/2,b*cs+cs/2)}}
// distance LOD for small props: a chunk is hidden once its centre is farther than R+half a chunk from the camera (checked every frame)
const LODL=[],BSC={};let lodF=0;
function lodTick(){const cx=cam.position.x,cz=cam.position.z;for(let i=0;i<LODL.length;i++){const o=LODL[i],dx=o.x-cx,dz=o.z-cz;o.m.visible=dx*dx+dz*dz<o.r2}}
function lodReg(m,x,z,R,cs){LODL.push({m,x,z,r2:(R+cs*.5)*(R+cs*.5)})}
// items: [x,y,z,ry,sx,sy,sz,color?]
function instO(g,mat,items,shadow,R,CS){CS=CS||600;if(CS!==600)g=g.clone();g.boundingSphere=CS===600?BS:new T.Sphere(new T.Vector3(),CS*.72);chunkBy(items,(L,cx,cz)=>{const m=new T.InstancedMesh(g,mat,L.length);L.forEach((p,i)=>{o3.position.set(p[0]-cx,p[1],p[2]-cz);o3.rotation.set(0,p[3]||0,0);o3.scale.set(p[4]||1,p[5]||1,p[6]||1);o3.updateMatrix();m.setMatrixAt(i,o3.matrix);if(p[7]!==undefined)m.setColorAt(i,tc.setHex(p[7]))});m.position.set(cx,0,cz);m.castShadow=!!shadow;m.receiveShadow=true;scene.add(m);if(R)lodReg(m,cx,cz,R,CS)},CS)}
const UB=new T.BoxGeometry(1,1,1),UBm=c=>new T.MeshLambertMaterial({color:c});
const baseMat=gfxStd({color:0xffffff,roughness:.93,metalness:0,envMapIntensity:.15},'wall')||new T.MeshLambertMaterial({color:0xffffff});
function edgePt(e,u){u=cl(u,0,e.len);let lo=0,hi=e.cum.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(e.cum[m]<=u)lo=m;else hi=m}const t=(u-e.cum[lo])/((e.cum[hi]-e.cum[lo])||1),a=e.pts[lo],b=e.pts[hi];return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,e.nx[lo]+(e.nx[hi]-e.nx[lo])*t,e.nz[lo]+(e.nz[hi]-e.nz[lo])*t,lo]}
// ---- road ribbons: one mesh per (800 m chunk, layer) so polygon offset keeps overlaps stable and distant chunks are culled ----
const KR={svc:0,local:1,ramp:2,main:3,petra:4,arch:4,hw:5,ring:6,drift:2,campus:1,alley:0},KC={svc:0x35393f,local:0x2b3037,ramp:0x21252b,main:0x242a31,petra:0x252b33,arch:0x252b32,hw:0x161a1f,ring:0x21252b,drift:0x121418,campus:0x30363e,alley:0x625a4c};
const edgeCol=e=>e.hw==='track'?0x625a4c:e.hw==='living_street'?0x3d3c3a:KC[e.kind]||0x2b2d31;
const RDCH=800,RCHUNK=new Map();
function LYR(x,z,k){const i=Math.floor(x/RDCH),j=Math.floor(z/RDCH),key=i*10000+j;let C=RCHUNK.get(key);if(!C)RCHUNK.set(key,C=[]);return C[k]||(C[k]={p:[],c:[],i:[]})}
function quad(L,a,b,c,d,col){const n=L.p.length/3;L.p.push(a[0],a[1],a[2],b[0],b[1],b[2],c[0],c[1],c[2],d[0],d[1],d[2]);for(let k=0;k<4;k++)L.c.push(col.r,col.g,col.b);L.i.push(n,n+1,n+2,n+1,n+3,n+2)}
const RSUB=30; // ribbons are cut into <=30 m pieces so that the terrain pass (12c_terrain.js) can drape them over the ground
// ribbon along edge e between arclengths u0..u1 using the edge's own vertices (no resampling); off = lateral offset, wd = width
function ribbonE(k,e,u0,u1,off,wd,yo,col){if(u1-u0<.05)return;const P0=[];P0.push(edgePt(e,u0));for(let i=1;i<e.cum.length-1;i++)if(e.cum[i]>u0+.01&&e.cum[i]<u1-.01)P0.push([e.pts[i][0],e.pts[i][1],e.nx[i],e.nz[i]]);P0.push(edgePt(e,u1));
  const P=[P0[0]];for(let i=1;i<P0.length;i++){const a=P0[i-1],b=P0[i],L=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.min(8,Math.ceil(L/RSUB));for(let q=1;q<n;q++){const t=q/n,nx=a[2]+(b[2]-a[2])*t,nz=a[3]+(b[3]-a[3])*t,l=Math.hypot(nx,nz)||1;P.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,nx/l,nz/l])}P.push(b)}
 const o=(p,s)=>[p[0]+p[2]*(off+s*wd/2),yo,p[1]+p[3]*(off+s*wd/2)];for(let i=0;i<P.length-1;i++){const a=P[i],b=P[i+1],L=LYR((a[0]+b[0])/2,(a[1]+b[1])/2,k);quad(L,o(a,-1),o(a,1),o(b,-1),o(b,1),col)}}
// one dash = one quad (dash length d from arclength u)
function dashE(k,e,u,d,off,wd,yo,col){const a=edgePt(e,u),b=edgePt(e,u+d),o=(p,s)=>[p[0]+p[2]*(off+s*wd/2),yo,p[1]+p[3]*(off+s*wd/2)],L=LYR((a[0]+b[0])/2,(a[1]+b[1])/2,k);quad(L,o(a,-1),o(a,1),o(b,-1),o(b,1),col)}
const nodeJ=n=>NODES[n].deg>=3,COLC=new Map(),colOf=h=>{let c=COLC.get(h);if(!c)COLC.set(h,c=new T.Color(h));return c};
const YELC=new T.Color(0xe8b800),WHTC=new T.Color(0xf2f2f2);
EDGES.forEach(e=>{if(e.len<.5)return;const rk=e.tn?0:e.br?7:(KR[e.kind]??1);ribbonE(rk,e,0,e.len,0,e.w,.05+rk*.004,colOf(edgeCol(e)))});
EDGES.forEach(e=>{const w=e.w,y=.075,K=e.kind;if(e.len<20||K==='svc'||K==='ring'||K==='ramp'||K==='local'||e.tn)return;const m0=nodeJ(e.a)?w*.9:0,m1=nodeJ(e.b)?w*.9:0,u0=Math.min(m0,e.len/2),u1=Math.max(e.len-m1,e.len/2);
 if(!e.ow&&w>=8.5){if(K==='petra'||K==='arch'||K==='hw'){ribbonE(8,e,u0,u1,-.35,.25,y,YELC);ribbonE(8,e,u0,u1,.35,.25,y,YELC)}else for(let u=u0;u+6<u1;u+=13)dashE(8,e,u,6,0,.3,y,YELC)}
 else if(e.ow&&w>=7)for(let u=u0;u+5<u1;u+=11)dashE(8,e,u,5,0,.25,y,WHTC);
 if(w>=11&&K!=='campus'){ribbonE(8,e,u0,u1,-(w/2-.5),.22,y,WHTC);ribbonE(8,e,u0,u1,w/2-.5,.22,y,WHTC)}});
const roadMats=[];
for(let k=0;k<=8;k++)roadMats.push(gfxStd({vertexColors:true,side:T.DoubleSide,roughness:k===8?.72:(k===0?.96:.5),metalness:0,envMapIntensity:k===8?.2:(k===0?.16:.5),polygonOffset:true,polygonOffsetFactor:-(1+k),polygonOffsetUnits:-(1+k)},k===8?'mark':'road')||new T.MeshPhongMaterial({vertexColors:true,side:T.DoubleSide,specular:k===8?0x303030:(k===0?0x2a2620:0x9aa3ad),shininess:k===8?30:(k===0?10:85),polygonOffset:true,polygonOffsetFactor:-(1+k),polygonOffsetUnits:-(1+k)}));
let RMESH=0;RCHUNK.forEach(C=>C.forEach((L,k)=>{if(!L||!L.i.length)return;const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(L.p,3));g.setAttribute('color',new T.Float32BufferAttribute(L.c,3));g.setAttribute('normal',new T.Float32BufferAttribute(new Float32Array(L.p.length).map((_,i)=>i%3===1?1:0),3));g.setIndex(L.i);
 const m=new T.Mesh(g,roadMats[k]);m.receiveShadow=true;scene.add(m);RMESH++}));
RCHUNK.clear();
