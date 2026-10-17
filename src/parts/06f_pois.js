// ---- real Irbid commercial POIs, Al-Hassan Stadium drift zone, modular local shops ----
const CCP={x:0,z:0},LMX=new Map(),STONEC=new Set([0xa5573a,0xb8694a,0xd9cfb4,0x4b4a47,0xe6dcc3,0xc99a6b,0xb8a98c,0xa87d52,0xcdb98f,0xcfc3a6,0x8d867a,0xdcd2b8,0xe4dcc6]),lmx=c=>{let m=LMX.get(c);if(!m){m=GFX.on?gfxStd({color:c,roughness:.9,metalness:0,envMapIntensity:.2},STONEC.has(c)?'stone':'wall'):new T.MeshLambertMaterial({color:c});LMX.set(c,m)}return m};
const GLM=new T.MeshLambertMaterial({color:0x6fb1d8,transparent:true,opacity:.55}),BMB=c=>new T.MeshBasicMaterial({color:c});
const BX=(g,w,h,d,c,x,y,z)=>Mi(g,new T.BoxGeometry(w,h,d),typeof c==='number'?lmx(c):c,x,y,z);
const CY=(g,r0,r1,h,c,x,y,z,seg)=>Mi(g,new T.CylinderGeometry(r0,r1,h,seg||10),typeof c==='number'?lmx(c):c,x,y,z);
const tpRoad=(name,x,z)=>{const s=roadSpot(name,x,z);return[s.x+s.nx*s.w/4,s.z+s.nz*s.w/4,Math.atan2(s.tx,s.tz)]};
// grid test: no road surface anywhere under the footprint
function footClear(o,pad){const nx=Math.max(3,Math.ceil(o.hw/3)),nz=Math.max(3,Math.ceil(o.hd/3));for(let i=-nx;i<=nx;i++)for(let j=-nz;j<=nz;j++){const lx=i/nx*o.hw,lz=j/nz*o.hd;if(roadAt(o.x+lx*o.c+lz*o.s,o.z-lx*o.s+lz*o.c,pad))return false}return true}
// find a free plot beside a named road: building w x d (front faces the road), forecourt `set` deep between road and building
function siteBeside(name,x,z,w,d,set,o){o=o||{};if(name==='@')return siteNear(x,z,w,d,set,o,name);const[r,i0]=nearestOn(name,x,z),L=r.dp.length,D=d+set;
 for(let k=0;k<110;k++){const i=cl(i0+(k%2?1:-1)*Math.ceil(k/2),3,L-4),a=r.dp[i-1],b=r.dp[i+1],p=r.dp[i],dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz),tx=dx/l,tz=dz/l,nx=-tz,nz=tx;
  for(const sd of(o.sides||[1,-1])){const off=r.w/2+2+D/2,fx=p[0]+sd*nx*off,fz=p[1]+sd*nz*off,ry=Math.atan2(-tz,tx)+(sd>0?0:Math.PI);if(o.ok&&!o.ok(fx,fz,sd))continue;
   const fob=obb(fx,fz,w,D,ry),R2=Math.hypot(w,D)/2;
   if(inPark(fx,fz,R2*.4)||Math.hypot(fx-BANKP.x,fz-BANKP.z)<R2+40||Math.hypot(fx-SHOPP.x,fz-SHOPP.z)<R2+30||SPAWNKEEP.some(q=>q[2]<60&&Math.hypot(fx-q[0],fz-q[1])<q[2]+R2*.6))continue;
   if(!footClear(fob,o.pad||1.4)||!occFree(fob,1))continue;
   const bo=r.w/2+2+set+d/2,cx=p[0]+sd*nx*bo,cz=p[1]+sd*nz*bo;occAdd(fob);if(!o.nocol)boxCol(cx,cz,w,d,ry);
   return{cx,cz,ry,sd,w,d,set,c:Math.cos(ry),s:Math.sin(ry),p:{x:p[0],z:p[1],tx,tz,nx,nz},tp:[p[0]+nx*r.w/4,p[1]+nz*r.w/4,Math.atan2(tx,tz)],g:o.nogrp?null:grp(cx,0,cz,ry)}}}
 return siteNear(x,z,w,d,set,o,name)}
// fallback when the named street has no free plot near the seed: nearest open ground that still fronts a real road
function siteNear(x,z,w,d,set,o,name){const D=d+set,R2=Math.hypot(w,D)/2,okE=e=>!e.tn&&!e.br&&e.hw!=='track'&&e.kind!=='ring';
 for(let r=0;r<=2600;r+=18){const n=r?Math.max(8,Math.round(r*6.283/16)):1;for(let i=0;i<n;i++){const a=i/n*6.283,fx=x+r*Math.cos(a),fz=z+r*Math.sin(a),q=roadNear(fx,fz,R2+set+34,okE);if(!q)continue;
   if(q.d>D/2+q.e.w/2+22)continue;let dx=q.px-fx,dz=q.pz-fz;const l=Math.hypot(dx,dz)||1;dx/=l;dz/=l;const ry=Math.atan2(-dx,-dz),fob=obb(fx,fz,w,D,ry),R3=R2;
   if(o&&o.ok&&!o.ok(fx,fz,1))continue;
   if(inPark(fx,fz,R3*.4)||noBuild(fx,fz,-R3*.5)||Math.hypot(fx-BANKP.x,fz-BANKP.z)<R3+40||Math.hypot(fx-SHOPP.x,fz-SHOPP.z)<R3+30||SPAWNKEEP.some(k=>k[2]<60&&Math.hypot(fx-k[0],fz-k[1])<k[2]+R3*.6))continue;
   if(!footClear(fob,(o&&o.pad)||1.4)||!occFree(fob,1))continue;
   const cx=fx-dx*set/2,cz=fz-dz*set/2,tx=q.tx,tz=q.tz;occAdd(fob);if(!(o&&o.nocol))boxCol(cx,cz,w,d,ry);
   return{cx,cz,ry,sd:1,w,d,set,c:Math.cos(ry),s:Math.sin(ry),p:{x:q.px,z:q.pz,tx,tz,nx:-tz,nz:tx},tp:[q.px-tz*q.e.w/4,q.pz+tx*q.e.w/4,Math.atan2(tx,tz)],g:o&&o.nogrp?null:grp(cx,0,cz,ry)}}}
 throw new Error('no free plot near '+name)}
const wl=(S,lx,lz)=>{if(S.kx){lx*=S.kx;lz*=S.kz}return[S.cx+lx*S.c+lz*S.s,S.cz-lx*S.s+lz*S.c]};   // local -> world (S.kx/kz: a model scaled onto a real footprint, siteReal)
function showCar(S,lx,lz,a,name,col){const q=wl(S,lx,lz);SHOWCARS.push({x:q[0],z:q[1],h:S.ry+Math.PI+(a||0),name,col})}
const bxi=(S,lx,y,lz,w,h,d,col)=>{const q=wl(S,lx,lz);BOXI.push([q[0],y,q[1],S.ry,w,h,d,col])};
const bxf=(S,lx,y,lz,w,h,d,col,sty,fr,vr)=>{const q=wl(S,lx,lz);bldF(q[0],y,q[1],S.ry,w,h,d,col,sty,fr,vr)};
const poiAt=(S,name,o)=>addPlace(name,S.cx,S.cz,Object.assign({tp:S.tp,tour:true},o||{}));
// ---- Nissan Irbid Showroom: glass-fronted dealership on the Petra Street corridor ----
{const S=siteBeside('@',...RL(/^Nissan$/,O(2230,-200)),46,24,26,{}),g=S.g,w=46,d=24;
 BX(g,w,8,d,0xf2f3f5,0,4,0);BX(g,40,5,.5,GLM,0,3,-d/2-.1);BX(g,w+.6,1.2,d+.6,0x2a2d33,0,8.6,0);BX(g,w+.8,.4,.3,0xc3002f,0,7.4,-d/2-.35);
 BX(g,50,.5,12,0xdadde0,0,7,-d/2-6);for(const k of[-1,1])BX(g,.8,7,.8,0x9a9ea3,k*23,3.5,-d/2-11);
 BX(g,2.4,18,1.6,0x2a2d33,-28,9,-d/2-S.set+5);signAt(g,'NISSAN IRBID SHOWROOM',-28,20,-d/2-S.set+5,26);signAt(g,'NISSAN IRBID SHOWROOM',0,13,-d/2-.5,44);
 BX(g,w,.12,S.set-3,0x9a9ea3,0,.08,-d/2-(S.set-3)/2-1);
 [['Ford Focus RS',0xffffff],['Ford Mustang GT',0xc3002f],['Ford Taurus SHO',0x1b1b1b]].forEach((c,i)=>showCar(S,-14+i*14,-d/2-5.5,0,c[0],c[1]));
 [['Ford Fiesta ST',0xc9ced3],['Ford Focus RS',0x1f6fe0],['Ford Mustang GT',0xffffff],['Ford Fiesta ST',0xf0a020]].forEach((c,i)=>showCar(S,-18+i*12,-d/2-S.set+9,(i%2?.35:-.35),c[0],c[1]));
 poiAt(S,'Nissan Irbid Showroom',{r:34,kind:'dealer',sub:'Petra Street'});SPAWNKEEP.push([S.cx,S.cz,26])}
// ---- Bergesh Cars Shop: used-car lot on the Baghdad Street axis ----
if(!REALP){const S=siteBeside('Baghdad Street',...O(-1050,112),48,14,32,{}),g=S.g,d=14;
 BX(g,30,8,d,0xe9ecef,-9,4,0);BX(g,31,.9,d+1,0x1f4a8c,-9,8.4,0);BX(g,22,4.5,.4,GLM,-9,2.8,-d/2-.1);BX(g,26,.4,6,0xf0a020,-9,6.4,-d/2-3);
 BX(g,48,.12,S.set-2,0x34363b,0,.08,-d/2-(S.set-2)/2-1);for(const k of[-1,1])for(let q=0;q<2;q++)BX(g,19,.12,.12,0xcfd2d6,k*14.5,.8+q*.45,-d/2-S.set+.6);BX(g,.3,1.4,.3,0xcfd2d6,-24,.7,-d/2-S.set+.6);BX(g,.3,1.4,.3,0xcfd2d6,24,.7,-d/2-S.set+.6);
 signAt(g,'BERGESH CARS SHOP',-9,13,-d/2-.5,38);BX(g,.5,12,.5,0x2a2d33,20,6,-d/2-S.set+3);signAt(g,'BERGESH CARS SHOP',20,13.6,-d/2-S.set+3,24);
 const cs=[['Ford Mustang GT',0xd62828],['Ford Fiesta ST',0xf0a020],['Ford Focus RS',0x1f6fe0],['Ford Taurus SHO',0x1d1d1d],['Porsche 911',0xc9ced3],['Ford F-150 Raptor',0x2a2a2a]];
 for(let i=0;i<5;i++)showCar(S,-20+i*10,-d/2-8,0,cs[i%cs.length][0],cs[i%cs.length][1]);for(let i=0;i<5;i++)showCar(S,-20+i*10,-d/2-20,(i%2?.3:-.3),cs[(i+2)%cs.length][0],cs[(i+2)%cs.length][1]);
 poiAt(S,'Bergesh Cars Shop',{r:30,kind:'dealer',sub:'Baghdad Street'});SPAWNKEEP.push([S.cx,S.cz,24])}
// ---- Grand Omaya Restaurant (Wasfi Al-Tal Street, beside the park) ----
if(!REALP){const S=siteBeside('Wasfi Al-Tal Street',...O(-215,-500),34,20,18,{}),g=S.g,d=20;
 BX(g,34,9,d,0xe3d3ae,0,4.5,0);BX(g,35,.9,d+1,0xc9ae66,0,9.4,0);for(let i=0;i<5;i++){BX(g,2.4,4.6,.3,0x3b2a1e,-12+i*6,3,-d/2-.1);BX(g,3,.5,.4,0xf1e7cc,-12+i*6,5.5,-d/2-.1)}
 BX(g,7,6.4,1.6,0x5a3d26,0,3.2,-d/2-.6);BX(g,9,.6,2.2,0xf1e7cc,0,6.9,-d/2-.8);
 Mi(g,new T.SphereGeometry(5.2,18,10,0,Math.PI*2,0,Math.PI/2),lmx(0xc9a23c),0,9.8,0);CY(g,.25,.4,3,0xc9a23c,0,16.3,0,6);
 for(const kx of[-1,1])for(const kz of[-1,1]){CY(g,1.1,1.2,12,0xe9dcb8,kx*16,6,kz*9);Mi(g,new T.ConeGeometry(1.5,3,10),lmx(0x2a9d8f),kx*16,13.5,kz*9)}
 BX(g,34,.14,S.set-4,0xc8b99a,0,.08,-d/2-(S.set-4)/2-.5);
 for(let i=0;i<6;i++){const x=-12+(i%3)*12,z=-d/2-5-Math.floor(i/3)*6;CY(g,.8,.8,.9,0xf4efe2,x,.55,z,12);CY(g,.07,.07,3,0x555555,x,1.6,z,6);Mi(g,new T.ConeGeometry(2.3,.9,10),lmx(i%2?0xb03a2e:0x2a7a4f),x,3.1,z)}
 signAt(g,'GRAND OMAYA RESTAURANT',0,14.2,-d/2-1,34);poiAt(S,'Grand Omaya Restaurant',{r:24,kind:'food',sub:'Wasfi Al-Tal Street'});SPAWNKEEP.push([S.cx,S.cz,18])}
// ---- Sicilia Restaurant (University District) ----
if(!REALP){const S=siteBeside('University Street',...U(300),26,14,14,{}),g=S.g,d=14;
 BX(g,26,8.5,d,0xf1e2c0,0,4.25,0);BX(g,26.4,1.6,d+.4,0xb5532f,0,.8,0);const rf=Mi(g,new T.CylinderGeometry(8.6,8.6,28,3).rotateZ(Math.PI/2).rotateX(-Math.PI/2),lmx(0xb5532f),0,10.3,0);rf.scale.y=.4;
 BX(g,22,4.2,.4,GLM,0,3.1,-d/2-.1);for(let i=-6;i<=6;i++){const m=Mi(g,new T.BoxGeometry(2,.15,3.2),lmx([0x2e8b57,0xffffff,0xc0392b][((i+6)%3)]),i*2,5.4,-d/2-1.5);m.rotation.x=.3}
 BX(g,26,.12,S.set-3,0xc8b99a,0,.08,-d/2-(S.set-3)/2-.5);
 for(let i=0;i<4;i++){const x=-9+i*6,z=-d/2-6.5;CY(g,.7,.7,.9,0xf4efe2,x,.55,z,12);CY(g,.06,.06,3,0x555555,x,1.6,z,6);Mi(g,new T.ConeGeometry(2.1,.8,10),lmx([0x2e8b57,0xffffff,0xc0392b,0xffffff][i]),x,3.1,z)}
 for(const k of[-1,1]){BX(g,1.6,.7,1.6,0x7a5a3c,k*14.8,.35,-d/2-1.2);Mi(g,new T.SphereGeometry(1.3,8,6),lmx(0x3f7f3a),k*14.8,1.9,-d/2-1.2)}
 signAt(g,'SICILIA RESTAURANT',0,10.2,-d/2-.4,24);poiAt(S,'Sicilia Restaurant',{r:20,kind:'food',sub:'University District'});SPAWNKEEP.push([S.cx,S.cz,14])}
// ---- Summit International Academy (Al-Husn Street) ----
if(!REALP){const S=siteBeside('Al-Husn Street',...O(-100,2090),64,34,22,{}),g=S.g,cr=0xf3ecd9,bl=0x1f4a8c;
 BX(g,34,11,14,cr,0,5.5,10);BX(g,35,.8,15,bl,0,11.4,10);for(const k of[-1,1]){BX(g,14,9,26,cr,k*24,4.5,4);BX(g,15,.8,27,bl,k*24,9.4,4)}
 BX(g,6,16,6,cr,0,8,1);BX(g,7,1,7,bl,0,16.5,1);for(let i=0;i<5;i++){BX(g,2,2,.2,0x2a3a48,-12+i*6,3,2.9);BX(g,2,2,.2,0x2a3a48,-12+i*6,7,2.9)}
 signAt(g,'SUMMIT INTERNATIONAL ACADEMY',0,20.5,0,46);
 BX(g,24,.1,14,0x2f6fb5,-14,.08,-28);for(const[x,z,w,d]of[[-14,-28,24,.2],[-14,-35,24,.2],[-14,-21,24,.2],[-26,-28,.2,14],[-2,-28,.2,14],[-14,-28,.2,14]])BX(g,w,.04,d,0xffffff,x,.15,z);
 for(const k of[-1,1]){CY(g,.12,.12,3.6,0x555555,-14+k*11.5,1.8,-28,6);BX(g,1.4,.9,.1,0xffffff,-14+k*11.5,3.4,-28)}
 BX(g,24,.1,14,0x5f9a45,14,.08,-28);for(const[x,z]of[[7,-33],[14,-22],[21,-31]]){const q=wl(S,x,z);tree(q[0],q[1],1.1)}
 CY(g,.12,.16,14,0xdddddd,0,7,-24,6);BX(g,3,1.8,.05,bl,1.7,13,-24);
 BX(g,2.5,2.8,9,0xf2c200,28,1.9,-26);BX(g,2.52,.7,7,0x2a3a48,28,2.4,-26);for(const kx of[-1,1])for(const kz of[-3,3]){CY(g,.5,.5,.4,0x111111,28+kx*1.3,.5,-26+kz,8).rotation.z=Math.PI/2}
 for(let i=0;i<9;i++)BX(g,.15,.9,.15,0x555555,-31+i*7.75,.45,-17-S.set+2.5);
 poiAt(S,'Summit International Academy',{r:34,kind:'school',sub:'Al-Husn Street'});SPAWNKEEP.push([S.cx,S.cz,30])}
// ---- Irbid City Center: multi-story mixed-use complex in Aidun / the southern sector ----
if(!REALP){const S=siteBeside('Aidun South Street',...O(3250,640),96,58,34,{}),g=S.g,d=58;
 BX(g,96,15,d,0xe4e1da,0,7.5,0);BX(g,96.6,4.2,d+.6,GLM,0,4.6,0);BX(g,96.6,4.2,d+.6,GLM,0,10.6,0);BX(g,97,1,d+1,0xb9bec4,0,15.5,0);
 BX(g,34,64,30,0x4f7ca3,-8,47,9);for(let k=0;k<16;k++)bxi(S,-8,15.4+k*4.1,9,34.8,.7,30.8,0xf2f4f6);BX(g,36,1.2,32,0xf2f4f6,-8,79.6,9);BX(g,18,6,16,0x3f6a90,-8,83,9);CY(g,.3,.5,16,0xb0b4b8,-8,94,9,6);Mi(g,new T.SphereGeometry(.9,8,6),BMB(0xff2a2a),-8,102.4,9);
 BX(g,26,38,22,0x5c8fb5,30,34,8);for(let k=0;k<9;k++)bxi(S,30,15.4+k*4.1,8,26.8,.7,22.8,0xf2f4f6);BX(g,27,1.2,23,0xf2f4f6,30,53.6,8);
 BX(g,32,.8,10,0xc0392b,0,7.8,-d/2-5);for(const k of[-1,1])BX(g,.8,7.6,.8,0x9a9ea3,k*15,3.8,-d/2-9.5);BX(g,26,6,.4,GLM,0,3.2,-d/2-.1);
 signAt(g,'IRBID CITY CENTER',0,18.5,-d/2-.6,60);signAt(g,'IRBID CITY CENTER',-8,74,-6.5,44);
 BX(g,96,.12,S.set-3,0x3d4046,0,.08,-d/2-(S.set-3)/2-1);for(let i=-14;i<=14;i++)bxi(S,i*3.2,.14,-d/2-S.set+7,.25,.04,5,0xf2f2f2);for(let i=-14;i<=14;i++)bxi(S,i*3.2,.14,-d/2-S.set/2-1,.25,.04,5,0xf2f2f2);
 [['Ford Focus RS',0xffffff],['Ford Fiesta ST',0xd62828],['Porsche 911',0x1b1b1b],['Ford Mustang GT',0x1f6fe0],['Ford Taurus SHO',0xc9ced3],['Ford Focus RS',0xf0a020]].forEach((c,i)=>showCar(S,-36+i*12.4,-d/2-S.set+9.5,0,c[0],c[1]));
 CCP.x=S.cx;CCP.z=S.cz;CCP.S=S;poiAt(S,'Irbid City Center',{r:66,kind:'mall',sub:'Aidun · Southern Sector'});SPAWNKEEP.push([S.cx,S.cz,40])}
// ---- Al-Hassan Stadium Sports Complex (Eastern Municipal District) + its asphalt perimeter drift zone ----
{const[cx,cz]=SC,g=grp(cx,0,cz,0);
 {const pad=new T.Mesh(new T.RingGeometry(DZR-19,DZR+19,64).rotateX(-Math.PI/2),new T.MeshLambertMaterial({color:0x14161a,polygonOffset:true,polygonOffsetFactor:-12,polygonOffsetUnits:-12}));pad.position.set(cx,.07,cz);pad.receiveShadow=true;scene.add(pad)}
 BX(g,92,.1,66,0xb5543a,0,.12,0);for(let k=0;k<8;k++)BX(g,8.75,.12,44,k%2?0x4f8f3c:0x5a9c45,-35+4.375+k*8.75,.18,0);
 for(const z of[-22,22])BX(g,70,.04,.25,0xffffff,0,.26,z);for(const x of[-35,35,0])BX(g,.25,.04,44,0xffffff,x,.26,0);for(const k of[-1,1]){BX(g,.25,.04,22,0xffffff,k*18.5,.26,0);BX(g,16.5,.04,.25,0xffffff,k*26.8,.26,-11);BX(g,16.5,.04,.25,0xffffff,k*26.8,.26,11);BX(g,.2,2.4,7.3,0xffffff,k*35.4,1.2,0)}
 Mi(g,new T.RingGeometry(5,5.25,32).rotateX(-Math.PI/2),BMB(0xffffff),0,.27,0);
 for(let i=0;i<16;i++){if(i%4===0)continue;const a=i*Math.PI/8,x=cx+66*Math.cos(a),z=cz+66*Math.sin(a),th=Math.atan2(-Math.cos(a),-Math.sin(a)),sg=grp(x,0,z,th),seat=i%2?0xc0392b:0x1f5fbf;
  BX(sg,25,15,3,0x8d9096,0,7.5,-5.5);BX(sg,25,11,4,seat,0,5.5,-2);BX(sg,25,7,4,seat,0,3.5,2);BX(sg,25,3.5,4,seat,0,1.75,6);BX(sg,26,.6,12,0xe6e8ea,0,16.4,-2);boxCol(x,z,25,15,th)}
 for(let k=0;k<4;k++){const a=(2*k+1)*Math.PI/4,x=cx+82*Math.cos(a),z=cz+82*Math.sin(a),tg=grp(x,0,z,Math.atan2(-Math.cos(a),-Math.sin(a)));CY(tg,.5,.7,34,0x6b7077,0,17,0,8);BX(tg,9,3,1.2,BMB(0xfff2c0),0,35.5,.8);addCol({x,z,r:1.4})}
 signAt(g,'AL-HASSAN STADIUM SPORTS COMPLEX',0,30,-44,84);signAt(g,'AL-HASSAN STADIUM SPORTS COMPLEX',0,30,44,84);signAt(g,'DRIFT ZONE',0,9,-DZR-8,30);signAt(g,'DRIFT ZONE',DZR+8,9,0,30);signAt(g,'DRIFT ZONE',0,9,DZR+8,30);signAt(g,'DRIFT ZONE',-DZR-8,9,0,30);
 const CN=[];for(let i=0;i<72;i++){const a=i*Math.PI/36;for(const r of[DZR-17.6,DZR+17.6]){if(r>DZR&&Math.abs(Math.cos(a))<.25&&Math.sin(a)<0)continue;CN.push([cx+r*Math.cos(a),.35,cz+r*Math.sin(a),0,1,1,1,0xff6a00])}}
 instO(new T.ConeGeometry(.35,.7,6),baseMat,CN);occAdd(obb(cx,cz,2*(DZR+22),2*(DZR+22),0));
 gantry('Al-Hassan Sports City Road',SC[0],SC[1],'AL-HASSAN SPORTS CITY · DRIFT ZONE',34);
 const tp=tpRoad('Al-Hassan Sports City Road',SC[0],SC[1]);
 addPlace('Al-Hassan Stadium',cx,cz,{r:90,kind:'stadium',tp,tour:true,sub:'Eastern Municipal District'}).alias='Al-Hassan Stadium Sports Complex';
 addPlace('Al-Hassan Drift Zone',cx,cz-DZR,{r:60,kind:'drift',sub:'Eastern Municipal District',ax:cx,az:cz-DZR});SPAWNKEEP.push([cx,cz,DZR+30])}
// ---- hair salons data structure: explicit named entries (the generic Al-Balad barbers are placed by placeShops) ----
const SALONS=[{name:'Corner Salon for Men',type:'Local Guide Approved Barber',zone:'Map Intersection Corner',description:'A highly visible corner barber shop featuring signature white styling lights and high-performance grooming stations.'}];
// building on a corner of a named junction: two street faces, chamfered entrance toward the crossing
function siteCorner(ids,w,d,nocol){for(const id of ids){const N=NODES[id];if(!N)continue;const tg=N.inn.map(e=>e.a===N.id?[e.pts[1][0]-e.pts[0][0],e.pts[1][1]-e.pts[0][1],e]:[e.pts[e.pts.length-2][0]-e.pts[e.pts.length-1][0],e.pts[e.pts.length-2][1]-e.pts[e.pts.length-1][1],e]).map(q=>{const l=Math.hypot(q[0],q[1])||1;return[q[0]/l,q[1]/l,q[2]]});
  let A=tg[0],B=null,bc=0;for(const q of tg){const c=Math.abs(A[0]*q[1]-A[1]*q[0]);if(c>bc){bc=c;B=q}}if(!B||bc<.5)continue;
  for(const gap of[3,5,8])for(const[sa,sb]of[[1,1],[-1,1],[1,-1],[-1,-1]]){const ox=sa*A[0]*(B[2].w/2+gap+w/2)+sb*B[0]*(A[2].w/2+gap+d/2),oz=sa*A[1]*(B[2].w/2+gap+w/2)+sb*B[1]*(A[2].w/2+gap+d/2),cx=N.x+ox,cz=N.z+oz;
   const nA=[-A[1],A[0]],sd=(ox*nA[0]+oz*nA[1])>0?1:-1,ry=Math.atan2(-A[1],A[0])+(sd>0?0:Math.PI),ob=obb(cx,cz,w,d,ry);
   if(!footClear(ob,1.6)||!occFree(ob,1.5)||Math.hypot(cx-BANKP.x,cz-BANKP.z)<50||Math.hypot(cx-SHOPP.x,cz-SHOPP.z)<45)continue;
   occAdd(ob);if(!nocol)boxCol(cx,cz,w,d,ry);const c=Math.cos(ry),s=Math.sin(ry),dxl=(N.x-cx)*c-(N.z-cz)*s;
   return{cx,cz,ry,c,s,w,d,cxs:dxl>0?1:-1,node:N,A,tp:[N.x+A[0]*20,N.z+A[1]*20,Math.atan2(A[0],A[1])],g:grp(cx,0,cz,ry)}}}
 throw new Error('no free corner')}
if(!REALP){const SALON_IDS=(()=>{const L=[];for(const id in NODES){const n=NODES[id];if(n.deg<3||n.rb)continue;const d=Math.hypot(n.x-507.3,n.z-2084.8);if(d<500)L.push([d,id])}L.sort((a,b)=>a[0]-b[0]);return L.slice(0,60).map(a=>a[1])})();
 const S=siteCorner(SALON_IDS,13,13),g=S.g,h=9.5,k=S.cxs,WL=BMB(0xffffff);
 BX(g,13,h,13,0xf4f1ea,0,h/2,0);BX(g,13.6,.9,13.6,0x2a2d33,0,h+.45,0);
 BX(g,9,3.4,.3,0x15262e,-k*.5,2.2,-6.6);BX(g,.3,3.4,9,0x15262e,k*6.6,2.2,k*.5);
 const ch=BX(g,5,3.8,.4,0x15262e,k*5.2,2.3,-5.2);ch.rotation.y=k*Math.PI/4;
 for(const z of[-6.75])Mi(g,new T.BoxGeometry(12.4,.28,.15),WL,0,4.6,z);Mi(g,new T.BoxGeometry(.15,.28,12.4),WL,k*6.75,4.6,0);
 for(let i=0;i<5;i++){Mi(g,new T.BoxGeometry(.18,3.6,.12),WL,-5+i*2.5,2.4,-6.78);Mi(g,new T.BoxGeometry(.12,3.6,.18),WL,k*6.78,2.4,-5+i*2.5)}
 for(let i=0;i<4;i++){Mi(g,new T.SphereGeometry(.28,10,8),WL,-4.5+i*3,5.7,-6.9);Mi(g,new T.SphereGeometry(.28,10,8),WL,k*6.9,5.7,-4.5+i*3)}
 Mi(g,new T.SphereGeometry(.7,14,10),WL,k*6.9,5.4,-6.9);
 [0xd62828,0xffffff,0x1f4fe0,0xffffff,0xd62828,0xffffff].forEach((c,i)=>CY(g,.2,.2,.45,c,k*7.9,1+i*.45,-7.9,8));
 for(let i=0;i<5;i++){BX(g,1.1,.3,.3,0x2a2d33,-4.2+i*2.1,6.3,-6.55)}
 signAt(g,'CORNER SALON FOR MEN',k*3,12.6,-6.6,22);signAt(g,'CORNER SALON FOR MEN',0,12.6,0,1);
 const S0=SALONS[0];poiAt(S,S0.name,{r:14,kind:'barber',tag:S0.zone,sub:'Corner junction (CSV coordinate 32.5312 N, 35.8554 E) · '+S0.type});SPAWNKEEP.push([S.cx,S.cz,12])}
// ---- Al-Husun Historic Church Tower (Al-Husun district core, Al-Husn Street) ----
if(!REALP){const S=siteBeside('Al-Husn Street',...O(-190,2250),34,30,12,{}),g=S.g,st=0xd9c8a0,dk=0xc4b186,d=30;
 BX(g,16,12,26,st,5,6,2);const rf=Mi(g,new T.CylinderGeometry(9.5,9.5,27,3).rotateX(-Math.PI/2),lmx(0x8a3b2a),5,14.6,2);rf.scale.y=.5;
 BX(g,9,34,9,dk,-9,17,-9);BX(g,10,1.2,10,0xb39e72,-9,34.6,-9);for(const[a,b]of[[0,-4.55],[0,4.55]])BX(g,3,5,.3,0x1b1b1b,-9+a,29,-9+b);for(const[a,b]of[[-4.55,0],[4.55,0]])BX(g,.3,5,3,0x1b1b1b,-9+a,29,-9+b);
 const sp=Mi(g,new T.ConeGeometry(6.4,13,4).rotateY(Math.PI/4),lmx(0x8a3b2a),-9,41.5,-9);CY(g,.12,.12,5,0xd4af37,-9,50.5,-9,6);BX(g,2.6,.28,.28,0xd4af37,-9,51.6,-9);
 for(const z of[-13.6])Mi(g,new T.CircleGeometry(1.5,20),BMB(0xfff6dc),-9,25,-13.6);
 BX(g,3.4,5.4,.4,0x3b2a1e,5,2.7,-11.2);for(const k of[-1,1])for(let i=0;i<3;i++)BX(g,.3,3.2,1.6,0x2a3a48,5+k*8.1,6.4,-6+i*7);
 BX(g,34,.12,10,0xc8b99a,0,.08,-d/2-5+5);
 for(const[x,z]of[[12,-14],[-14,-20]]){const q=wl(S,x,z);tree(q[0],q[1],1.2)}

 signAt(g,'AL-HUSUN HISTORIC CHURCH TOWER',-9,56,-9,38);poiAt(S,'Al-Husun Historic Church Tower',{r:34,kind:'church',tag:'Al-Husun District Core',sub:'Al-Husun District Core · Cultural Landmark'});SPAWNKEEP.push([S.cx,S.cz,26])}
// ---- Al-Saraya Museum Fortress Walls (Al-Balad northern crest): brick enclosure, corner towers, open gate ----
if(!REALP){const S=siteBeside('Al-Hashmi Street',...O(330,-330),64,48,8,{nocol:true,pad:2}),g=S.g,w=64,d=48,br=0xa5573a,bd=0xb8694a,H=7.5,T2=2.4;
 const wallC=(lx,lz,ww,dd)=>{const q=wl(S,lx,lz);boxCol(q[0],q[1],ww,dd,S.ry)};
 BX(g,w-4,.1,d-4,0xcbbd98,0,.08,0);
 for(const k of[-1,1]){BX(g,26,H,T2,br,k*19,H/2,-d/2+T2/2);wallC(k*19,-d/2+T2/2,26,T2);BX(g,T2,H,d,br,k*(w/2-T2/2),H/2,0);wallC(k*(w/2-T2/2),0,T2,d);BX(g,3,10,3.4,bd,k*6.6,5,-d/2+1.5);wallC(k*6.6,-d/2+1.5,3,3.4)}
 BX(g,w,H,T2,br,0,H/2,d/2-T2/2);wallC(0,d/2-T2/2,w,T2);BX(g,16.5,2.4,3.4,bd,0,11.2,-d/2+1.5);
 for(const kx of[-1,1])for(const kz of[-1,1]){const x=kx*(w/2-3),z=kz*(d/2-3);BX(g,8,11.5,8,bd,x,5.75,z);wallC(x,z,8,8);for(const[a,b]of[[-3.2,-3.2],[3.2,-3.2],[-3.2,3.2],[3.2,3.2],[0,-3.2],[0,3.2],[-3.2,0],[3.2,0]])bxi(S,x+a,12.2,z+b,1.3,1.3,1.3,bd)}
 for(let x=-w/2+2;x<w/2-1;x+=3.2){if(Math.abs(x)<8)continue;bxi(S,x,H+.6,-d/2+T2/2,1.4,1.2,T2,br);bxi(S,x,H+.6,d/2-T2/2,1.4,1.2,T2,br)}
 for(let z=-d/2+6;z<d/2-4;z+=3.2){for(const k of[-1,1])bxi(S,k*(w/2-T2/2),H+.6,z,T2,1.2,1.4,br)}
 BX(g,26,9,18,0xd8c9a6,0,4.5,8);BX(g,27,1,19,0x7a5a3c,0,9.4,8);BX(g,5,6.4,.3,0x3b2a1e,0,3.2,-1.2);Mi(g,new T.SphereGeometry(5,16,8,0,Math.PI*2,0,Math.PI/2),lmx(0x2a9d8f),0,9.9,8);wallC(0,8,26,18);
 CY(g,.12,.16,13,0xdddddd,-14,6.5,-8,6);BX(g,3,1.8,.05,0x1f8f4e,-12.4,12,-8);
 signAt(g,'AL-SARAYA MUSEUM FORTRESS WALLS',0,15.5,-d/2-.8,46);poiAt(S,'Al-Saraya Museum Fortress Walls',{r:44,kind:'museum',tag:'Al-Balad Northern Crest',sub:'Al-Balad Northern Crest · Historical Monument'});SPAWNKEEP.push([S.cx,S.cz,34])}
// ---- Central Bank of Jordan - Irbid Branch (mid-city corridor): stone complex, colonnade, fenced forecourt, guard booths ----
if(!REALP){const S=siteBeside('King Hussein Street',...O(-80,480),44,34,10,{nocol:true}),g=S.g,w=44,d=34,sn=0xe3dccb;
 const wallC=(lx,lz,ww,dd)=>{const q=wl(S,lx,lz);boxCol(q[0],q[1],ww,dd,S.ry)};
 BX(g,40,12,22,sn,0,6,d/2-11);wallC(0,d/2-11,40,22);BX(g,42,1.4,24,0xb9b19b,0,12.7,d/2-11);BX(g,36,.6,6,0xc9c1ab,0,.4,d/2-25);BX(g,36,.6,5,0xc9c1ab,0,.8,d/2-23.5);
 for(let i=0;i<8;i++)CY(g,.9,1,10.4,0xf2ecdc,-14+i*4,6,d/2-23,12);BX(g,34,1.6,3,0xd9d1ba,0,11.8,d/2-23);
 const pd=Mi(g,new T.CylinderGeometry(3.2,3.2,34,3).rotateZ(Math.PI/2).rotateX(-Math.PI/2),lmx(0xc9c1ab),0,13.9,d/2-23);pd.scale.y=.4;
 BX(g,6,6.4,.4,0x3b2a1e,0,3.4,d/2-22.8);for(const k of[-1,1])for(let i=0;i<3;i++)BX(g,2,3,.3,0x24323d,k*(8+i*5),5.5,d/2-22.6);
 BX(g,44,.12,12,0xbdb5a0,0,.08,-d/2+6);
 for(const k of[-1,1]){BX(g,17,1.8,.35,0x2a2d33,k*13.5,.9,-d/2+.4);wallC(k*13.5,-d/2+.4,17,.5);BX(g,.35,1.8,d-8,0x2a2d33,k*(w/2-.2),.9,-2);wallC(k*(w/2-.2),-2,.5,d-8);BX(g,3.2,3.2,3.2,0xcfc7b0,k*6,1.6,-d/2+2.4);BX(g,3.4,.4,3.4,0x2a2d33,k*6,3.4,-d/2+2.4);wallC(k*6,-d/2+2.4,3.2,3.2)}
 for(let i=0;i<9;i++)CY(g,.35,.35,.9,0x6b7077,-16+i*4,.45,-d/2+10,8);
 CY(g,.14,.18,15,0xdddddd,16,7.5,-d/2+9,6);BX(g,3.2,2,.05,0xc0392b,17.7,14,-d/2+9);
 signAt(g,'CENTRAL BANK OF JORDAN · IRBID BRANCH',0,16.5,d/2-23.5,44);poiAt(S,'Central Bank of Jordan - Irbid Branch',{r:34,kind:'bank',tag:'Mid-City Sector Corridor',sub:'Mid-City Sector Corridor · High-Security Stone Complex'});SPAWNKEEP.push([S.cx,S.cz,26])}
// ---- existing landmarks, registered by name for search / HUD ----
{const sp=(n,x,z)=>tpRoad(n,x,z);
 {const pcx=(PARK.x0+PARK.x1)/2,pcz=(PARK.z0+PARK.z1)/2,prn=roadNear(pcx,pcz,500);addPlace('Wasfi Al-Tal Park',pcx,pcz,{r:110,kind:'park',sub:'City center green space · name not in OSM (unverified)',tp:sp('Park South Street',pcx,pcz),tour:true,ax:prn?prn.px:pcx,az:prn?prn.pz:pcz})}
 {const mx=MALL.r?MALL.x:UL(880,415)[0],mz=MALL.r?MALL.z:UL(880,415)[1],mrn=roadNear(mx,mz,400);const ap=addPlace('Arabella Mall',mx,mz,{r:140,kind:'mall',sub:'King Abdullah II Street',tp:mrn?[mrn.px-mrn.tz*mrn.e.w/4,mrn.pz+mrn.tx*mrn.e.w/4,Math.atan2(mrn.tx,mrn.tz)]:sp('King Abdullah II Street',mx,mz),tour:true,ax:mrn?mrn.px:mx,az:mrn?mrn.pz:mz});ap.onReal=BLDD.n.some(n=>/^Arabella Mall/.test(n[2])&&Math.hypot(n[0]-mx,n[1]-mz)<40)}
 addPlace('Bank',BANK.x,BANK.z,{r:30,kind:'bank',sub:'Palestine Street · E to rob'});addPlace('Apex Drift Customs',SHOPP.x,SHOPP.z,{r:28,kind:'garage',sub:'Baghdad Street · U for upgrades'});
 addPlace('Souq Al-Balad',SOUQG.x,SOUQG.z,{r:40,kind:'market',sub:'Al-Balad · position estimated'});addPlace('Clock Tower',CLKG.x,CLKG.z,{r:20,kind:'landmark',sub:'Al-Balad'});
 const uc=UL(1496,70);addPlace('Yarmouk University',uc[0],uc[1],{r:120,kind:'campus',sub:'Main Stone Gate'});
 addPlace('Museum of Jordanian Heritage',UL(1275,335)[0],UL(1275,335)[1],{r:40,kind:'landmark',sub:'Yarmouk University · position estimated',ax:UL(1275,185)[0],az:UL(1275,185)[1]});
 addPlace('Jordan University of Science & Technology (JUST)',JC[0],JC[1],{r:200,kind:'campus',sub:'far east',ax:JC[0]-390,az:JC[1]});
 addPlace('Jadara University',HC[0],HC[1],{r:60,kind:'campus',sub:'southern hill'});addPlace('Irbid National University',INC[0],INC[1],{r:60,kind:'campus',sub:'Irbid–Syria Highway'});
 {const a=3*Math.PI/16,q=RLP(/^King Abdullah II Hospital$/,[JC[0]+375*Math.cos(a),JC[1]+375*Math.sin(a)]),rn=roadNear(q[0],q[1],300);addPlace('King Abdullah University Hospital',q[0],q[1],{r:60,kind:'hospital',sub:'JUST',ax:rn?rn.px:undefined,az:rn?rn.pz:undefined})}}
// ---- modular ground-floor shops: Al-Balad barber & hair salons, Thalatheen Street pet supplies ----
const POLES=[],PAWS=[];
function placeShops(){if(REALP)return;
 const take=(list,n,gap)=>{const L=list.slice();for(let i=L.length-1;i>0;i--){const j=hi(i+1);[L[i],L[j]]=[L[j],L[i]]}const out=[];for(const b of L){if(out.length>=n)break;if(out.some(q=>Math.hypot(q.x-b.x,q.z-b.z)<gap))continue;out.push(b)}return out};
 const front=(b,txt,col)=>{const o=b.o,sd=b.sd,w=b.w;let q=facade(o,sd,0,1.6,.12);SHOPI.push([q[0],q[1],q[2],b.ry,w*.84,2.8,.2,0x1c3a46]);q=facade(o,sd,0,3.55,.2);SIGNI.push([q[0],q[1],q[2],b.ry,w*.92,1.1,.4,col]);
  const s=label(txt,true),p=facade(o,sd,0,3.55,.55),sw=Math.min(w*.9,9.5);s.scale.set(sw,sw/8,1);s.position.set(p[0],p[1],p[2]);scene.add(s)};
 const bar=take(BREG.filter(b=>b.sty==='row'&&b.zone==='Al-Balad'),12,55),pet=(()=>{const C=BREG.filter(b=>b.sty==='apt'&&b.zone==='Thalatheen Street');let r=[];for(const g of[140,100,70,45,25]){r=take(C,8,g);if(r.length>=8)break}return r})();
 bar.forEach(b=>{front(b,'AL-BALAD LOCAL BARBER & HAIR SALON',0x1f4fa8);for(let k=0;k<4;k++){const q=facade(b.o,b.sd,b.w/2-.7,1.5+k*.3,.55);POLES.push([q[0],q[1],q[2],0,1,1,1,[0xd62828,0xffffff,0x1f4fe0,0xffffff][k]])}
  addPlace('Al-Balad Local Barber & Hair Salon',b.x,b.z,{r:12,kind:'barber',tag:'Al-Balad',sub:'Al-Balad'})});
 pet.forEach(b=>{front(b,'THALATHEEN STREET PET SUPPLIES',0x1f8f4e);const o=b.o,sd=b.sd,w=b.w;let q=facade(o,sd,-w*.4,3.5,.5);PAWS.push([q[0],q[1],q[2],b.ry,.34,.28,.12,0xffffff]);
  [[-.3,.28],[-.1,.38],[.1,.38],[.3,.28]].forEach(t=>{q=facade(o,sd,-w*.4+t[0]*1.2,3.5+t[1]*1.1,.5);PAWS.push([q[0],q[1],q[2],b.ry,.11,.13,.1,0xffffff])});
  addPlace('Thalatheen Street Pet Supplies',b.x,b.z,{r:14,kind:'pet',tag:'Thalatheen Street',sub:'Thalatheen Street'})});
 instO(new T.CylinderGeometry(.14,.14,.3,8),baseMat,POLES);instO(new T.SphereGeometry(1,8,6),baseMat,PAWS)}
