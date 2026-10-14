// ---- campuses built inside their real OSM polygons: Yarmouk University (+ south campus), JUST, Jadara, INU ----
// walls follow the real boundary, gates stand where real roads cross it, buildings are laid out inside it and avoid the real internal roads
const CAMPC=[0xe4d9bd,0xd9ccae,0xeee6d0,0xd2c6a6],BAND=0x2b4a66;
function campusBld(x,z,w,d,h,ry,y0,col){const o=obb(x,z,w,d,ry);if(onRoadFoot(o,2)||!occFree(o,.5))return false;addBld(o,h,col||pick(CAMPC),y0);const y=y0===undefined?hillH(x,z):y0;
 for(let k=0;k*3.4+2.6<h;k++)BOXI.push([x,y+2.6+k*3.4,z,ry,w+.5,1.3,d+.5,BAND]);BOXI.push([x,y+h+.5,z,ry,w+.4,1,d+.4,0xc8bd9f]);if(Math.random()<.5)TANKS.push([x+R(-w/3,w/3),y+h+1.5,z+R(-d/3,d/3)]);return true}
function pDist(k,x,z){const q=POLYS[k];let m=1e9;for(let i=0;i<q.length;i++){const a=q[i],b=q[(i+1)%q.length],dx=b[0]-a[0],dz=b[1]-a[1],t=cl(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1),0,1),d=Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t);if(d<m)m=d}return m}
function pAng(k){const q=POLYS[k];let b=0,ba=0;for(let i=0;i<q.length;i++){const a=q[i],c=q[(i+1)%q.length],l=Math.hypot(c[0]-a[0],c[1]-a[1]);if(l>b){b=l;ba=Math.atan2(c[1]-a[1],c[0]-a[0])}}return ba}
function pBox(k){let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;POLYS[k].forEach(p=>{x0=Math.min(x0,p[0]);x1=Math.max(x1,p[0]);z0=Math.min(z0,p[1]);z1=Math.max(z1,p[1])});return{x0,x1,z0,z1}}
// free spot of size w x d inside polygon k, as near as possible to (cx,cz)
function spotIn(k,cx,cz,w,d,ry,maxR){maxR=maxR||450;for(let r=0;r<=maxR;r+=12){const n=r?Math.max(6,Math.round(r/10)):1;for(let i=0;i<n;i++){const a=i/n*6.283,x=cx+r*Math.cos(a),z=cz+r*Math.sin(a);if(!inPoly(k,x,z)||pDist(k,x,z)<Math.hypot(w,d)/2+5)continue;
  const o=obb(x,z,w,d,ry);if(onRoadFoot(o,3)||!occFree(o,2))continue;return[x,z]}}return null}
// lattice of faculty blocks inside the polygon
// v35: where the real OSM extract already has buildings, the generated faculty blocks are not added (real footprints are placed later by placeReal)
const RBGRID=(()=>{const m=new Map(),Q=BLDD.p;for(let i=0;i<Q.length;i+=7){const k=Math.floor(Q[i]/10/50)*100000+Math.floor(Q[i+1]/10/50);m.set(k,(m.get(k)||0)+1)}return m})();
const realCnt=(x,z,r)=>{let n=0;for(let i=Math.floor((x-r)/50);i<=Math.floor((x+r)/50);i++)for(let j=Math.floor((z-r)/50);j<=Math.floor((z+r)/50);j++)n+=RBGRID.get(i*100000+j)||0;return n};
function campusFill(k,step,wr,dr,hr,inset,ry0){const b=pBox(k);let n=0,sk=0;for(let x=b.x0+step/2;x<b.x1;x+=step)for(let z=b.z0+step/2;z<b.z1;z+=step){const jx=x+R(-step*.22,step*.22),jz=z+R(-step*.22,step*.22);
  if(!inPoly(k,jx,jz)||pDist(k,jx,jz)<inset)continue;if(realCnt(jx,jz,step*.5)>=2){sk++;continue}if(campusBld(jx,jz,R(wr[0],wr[1]),R(dr[0],dr[1]),R(hr[0],hr[1]),ry0,0))n++}if(sk)console.log('campus',k,'cells left to real OSM buildings',sk);return n}
// places where real roads cross the polygon boundary (widest first, >=90 m apart)
function campusGates(k,max){const q=POLYS[k],L=[];for(let i=0;i<q.length;i++){const a=q[i],c=q[(i+1)%q.length],l=Math.hypot(c[0]-a[0],c[1]-a[1]);for(let t=0;t<l;t+=6){const x=a[0]+(c[0]-a[0])*t/l,z=a[1]+(c[1]-a[1])*t/l,r=roadAt(x,z,0);if(r&&r.e.w>=5&&!r.e.br&&!r.e.tn&&!r.e.rb)L.push({x:r.px,z:r.pz,tx:r.tx,tz:r.tz,w:r.e.w})}}
 L.sort((a,b)=>b.w-a.w);const out=[];for(const g of L){if(out.length>=max)break;if(out.some(o=>Math.hypot(o.x-g.x,o.z-g.z)<90))continue;out.push(g)}return out}
const GATEC=[];
function archAt(gt,text,stone){const ry=Math.atan2(-gt.tz,gt.tx),g=grp(gt.x,0,gt.z,ry),hw=gt.w/2+3.5,mm=LM_(stone?0xbfae8f:0xd9ccae);
 for(const k of[-1,1]){Mi(g,new T.BoxGeometry(stone?4.2:2.4,stone?12:8,stone?4.2:2.4),mm,0,stone?6:4,k*hw);boxCol(gt.x+k*hw*(-gt.tz),gt.z+k*hw*gt.tx,3,3,0);if(stone){Mi(g,new T.BoxGeometry(5.2,1.2,5.2),LM_(0xa39274),0,12.6,k*hw);Mi(g,new T.SphereGeometry(2.6,12,8,0,Math.PI*2,0,Math.PI/2),LM_(0x2a9d8f),0,13.2,k*hw)}}
 Mi(g,new T.BoxGeometry(stone?3:2,stone?3.2:2.4,hw*2),mm,0,stone?10.6:9.2,0);signAt(g,text,0,stone?17:14,0,Math.min(40,hw*2+12));SPAWNKEEP.push([gt.x,gt.z,14])}
// boundary wall (skips wherever a real road passes)
function campusWall(k,col){const q=POLYS[k];for(let i=0;i<q.length;i++){const a=q[i],c=q[(i+1)%q.length],l=Math.hypot(c[0]-a[0],c[1]-a[1]),dx=(c[0]-a[0])/l,dz=(c[1]-a[1])/l,wr=Math.atan2(-dz,dx);
  for(let t=15;t<l;t+=30){const x=a[0]+dx*t,z=a[1]+dz*t;if(roadNear(x,z,17)||roadAt(x+dx*12,z+dz*12,6))continue;WALLI.push([x,1.5,z,wr,30.2,3,1.2,col||0xe0d5b4]);boxCol(x,z,30.2,1.2,wr)}}}
const MUSE={x:0,z:0},KAUH={x:0,z:0},CAMPUS={};
const placeG=(x,z,ry,y)=>grp(x,y||0,z,ry);
// --- Yarmouk University ---
{const ang=pAng('YU'),ry0=-ang,ax=Math.cos(ang),az=Math.sin(ang),at=(m,s)=>[YUC[0]+m*ax-s*az,YUC[1]+m*az+s*ax];
 campusWall('YU');campusWall('YUS');
 const gates=campusGates('YU',3);gates.forEach((gt,i)=>archAt(gt,i===0?'YARMOUK UNIVERSITY · MAIN STONE GATE':i===1?'YU GATE 2':'YU NORTH GATE',i===0));CAMPUS.YU={gates};
 // Museum of Jordanian Heritage: portico with columns, pediment, steps and a gilded dome
 {const p=spotIn('YU',...at(0,0),62,46,ry0,500);if(p){const g=placeG(p[0],p[1],ry0),st=LM_(0xe8dcc0);Mi(g,new T.BoxGeometry(60,11,44),st,0,5.5,0);Mi(g,new T.BoxGeometry(66,1,50),LM_(0xb9a884),0,.5,0);Mi(g,new T.BoxGeometry(64,1.2,48),LM_(0xc9b891),0,11.6,0);for(let i=0;i<6;i++)Mi(g,new T.CylinderGeometry(.9,1,10,10),LM_(0xf4ecd8),-18+i*7.2,5,-24.5);
  Mi(g,new T.SphereGeometry(8,18,10,0,Math.PI*2,0,Math.PI/2),mGoldL,0,12.2,4);signAt(g,'MUSEUM OF JORDANIAN HERITAGE',0,21,-24.5,52);boxCol(p[0],p[1],60,44,ry0);occAdd(obb(p[0],p[1],62,46,ry0));MUSE.x=p[0];MUSE.z=p[1]}}
 // library with a teal dome
 {const p=spotIn('YU',...at(260,40),64,60,ry0,500);if(p&&campusBld(p[0],p[1],64,60,22,ry0,0,0xefe6cf)){const g=placeG(p[0],p[1],ry0,22.5);Mi(g,new T.SphereGeometry(10,18,10,0,Math.PI*2,0,Math.PI/2),LM_(0x2a9d8f),0,0,0);signAt(g,'YU LIBRARY',0,16,0,24)}}
 // mosque
 {const p=spotIn('YU',...at(-220,-40),34,34,ry0,500);if(p){const g=placeG(p[0],p[1],ry0);Mi(g,new T.BoxGeometry(34,12,34),LM_(0xf1ead6),0,6,0);Mi(g,new T.SphereGeometry(10,16,10,0,Math.PI*2,0,Math.PI/2),LM_(0x2a9d8f),0,12,0);Mi(g,new T.CylinderGeometry(1.4,1.8,34,10),LM_(0xf1ead6),20,17,18);Mi(g,new T.ConeGeometry(2,5,10),LM_(0x2a9d8f),20,36.5,18);boxCol(p[0],p[1],34,34,ry0);occAdd(obb(p[0],p[1],34,34,ry0))}}
 const n1=campusFill('YU',88,[44,64],[40,60],[12,17],26,ry0),n2=campusFill('YUS',100,[44,64],[40,56],[11,16],26,ry0);console.log('YU blocks',n1,'YU south',n2,'gates',gates.length)}
// --- JUST: faculties inside the real campus polygon, domed library, university hospital ---
{const ang=pAng('JUST'),ry0=-ang,ax=Math.cos(ang),az=Math.sin(ang),at=(m,s)=>[JC[0]+m*ax-s*az,JC[1]+m*az+s*ax];campusGates('JUST',2).forEach((gt,i)=>archAt(gt,'JUST',false));
 {const p=spotIn('JUST',...at(0,0),112,112,0,500);if(p){const g=grp(p[0],0,p[1],0);Mi(g,new T.CylinderGeometry(55,55,16,24),LM_(0xece6d4),0,8,0);Mi(g,new T.SphereGeometry(40,20,12,0,Math.PI*2,0,Math.PI/2),LM_(0x2a7fbf),0,16,0);Mi(g,new T.CylinderGeometry(2.2,3,70,10),LM_(0xe0d8c0),95,35,0);signAt(g,'JUST',95,78,0,34);signAt(g,'JORDAN UNIVERSITY OF SCIENCE & TECHNOLOGY',0,48,0,92);addCol({x:p[0],z:p[1],r:55});addCol({x:p[0]+95,z:p[1],r:3});occAdd(obb(p[0],p[1],118,118,0))}}
 {const p=spotIn('JUST',...at(380,120),64,44,ry0,600);if(p){KAUH.x=p[0];KAUH.z=p[1];const h=grp(p[0],0,p[1],ry0);Mi(h,new T.BoxGeometry(60,24,40),LM_(0xf3f3f0),0,12,0);Mi(h,new T.BoxGeometry(14,3,14),LM_(0xc0392b),0,25.5,0);signAt(h,'KING ABDULLAH UNIVERSITY HOSPITAL',0,32,0,70);boxCol(p[0],p[1],60,40,ry0);occAdd(obb(p[0],p[1],64,44,ry0));
   const tw=Mi(h,new T.BoxGeometry(16,78,16),LM_(0xe9eef2),0,39,48);Mi(h,new T.BoxGeometry(18,3,18),LM_(0x2f7fbf),0,79.5,48);Mi(h,new T.BoxGeometry(4,12,.6),LM_(0xc0392b),0,66,39.6);Mi(h,new T.BoxGeometry(12,4,.6),LM_(0xc0392b),0,66,39.6);signAt(h,'KAUH TOWER',0,90,48,40);boxCol(p[0]+Math.sin(ry0)*48,p[1]+Math.cos(ry0)*48,16,16,ry0)}}
 {const p=spotIn('JUST',...at(-380,-100),118,36,ry0,600);if(p){const h=grp(p[0],0,p[1],ry0),wm=LM_(0xf6f6f2),c2=Math.cos(ry0),s2=Math.sin(ry0);Mi(h,new T.BoxGeometry(36,18,34),wm,0,9,0);for(const k of[-1,1]){Mi(h,new T.BoxGeometry(36,11,22),wm,k*40,5.5,0);Mi(h,new T.BoxGeometry(37,1.2,23),LM_(0x2f7fbf),k*40,11.4,0)}
   Mi(h,new T.CylinderGeometry(9,9,.4,24),LM_(0x3a3f45),0,18.4,0);signAt(h,'H',0,19.4,0,6);signAt(h,'MEGA MEDICAL CENTER HUB',0,24,0,64);boxCol(p[0],p[1],36,34,ry0);for(const k of[-1,1])boxCol(p[0]+k*40*c2,p[1]-k*40*s2,36,22,ry0);occAdd(obb(p[0],p[1],118,34,ry0))}}
 console.log('JUST blocks',campusFill('JUST',150,[50,74],[34,46],[10,22],30,ry0))}
// --- Jadara University & Irbid National University ---
[['JAD',HC,'JADARA UNIVERSITY',58],['INU',INC,'IRBID NATIONAL UNIVERSITY',62]].forEach(([k,C,nm,step])=>{const ang=pAng(k),ry0=-ang;campusGates(k,1).forEach(gt=>archAt(gt,nm+' · GATE',false));campusWall(k,0xd9ccae);
 const p=spotIn(k,C[0],C[1],30,30,ry0,300);if(p){const g=placeG(p[0],p[1],ry0);Mi(g,new T.BoxGeometry(28,14,28),LM_(0xf1ead6),0,7,0);Mi(g,new T.SphereGeometry(9,18,10,0,Math.PI*2,0,Math.PI/2),LM_(k==='JAD'?0xc0392b:0x2f7fbf),0,14,0);Mi(g,new T.CylinderGeometry(1.2,1.6,30,10),LM_(0xf1ead6),20,15,12);signAt(g,nm,0,32,0,50);addCol({x:p[0],z:p[1],r:16});occAdd(obb(p[0],p[1],30,30,ry0));SPAWNKEEP.push([p[0],p[1],40])}
 campusFill(k,step,[26,38],[20,28],[9,15],16,ry0)});
