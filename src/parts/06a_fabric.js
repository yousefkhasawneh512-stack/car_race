// ---- districts, occupancy and building fabric along the roads ----
// registry of named real-world places (search, HUD, minimap, tour), static showroom cars and building slots for local shops
const REALP=true;   // v35: invented shops are not built; real OSM places (03c_poi_data.js / 06l_real_pois.js) replace them
const PLACES=[],SHOWCARS=[],BREG=[];
function addPlace(name,x,z,o){o=o||{};const p={name,x,z,r:o.r||30,kind:o.kind||'poi',tag:o.tag||'',ax:o.ax,az:o.az,tp:o.tp,tour:!!o.tour,sub:realText(o.sub||'')};PLACES.push(p);return p}
// oriented-box occupancy (separating axis test) so rows touch but never overlap
const OCC=new Map(),ok2=(i,j)=>(i+200)*1000+(j+200);
function obb(x,z,w,d,ry){return{x,z,hw:w/2,hd:d/2,c:Math.cos(ry),s:Math.sin(ry)}}
function sat(a,b,m){const dx=b.x-a.x,dz=b.z-a.z;for(const q of[[a.c,-a.s],[a.s,a.c],[b.c,-b.s],[b.s,b.c]]){const ra=a.hw*Math.abs(q[0]*a.c-q[1]*a.s)+a.hd*Math.abs(q[0]*a.s+q[1]*a.c),rb=b.hw*Math.abs(q[0]*b.c-q[1]*b.s)+b.hd*Math.abs(q[0]*b.s+q[1]*b.c);if(Math.abs(dx*q[0]+dz*q[1])>=ra+rb+m)return false}return true}
function occFree(o,m){const R=Math.hypot(o.hw,o.hd);for(let i=Math.floor((o.x-R)/50);i<=Math.floor((o.x+R)/50);i++)for(let j=Math.floor((o.z-R)/50);j<=Math.floor((o.z+R)/50);j++){const L=OCC.get(ok2(i,j));if(L)for(const b of L)if(sat(o,b,m))return false}return true}
function occAdd(o){const R=Math.hypot(o.hw,o.hd);for(let i=Math.floor((o.x-R)/50);i<=Math.floor((o.x+R)/50);i++)for(let j=Math.floor((o.z-R)/50);j<=Math.floor((o.z+R)/50);j++){const k=ok2(i,j);let L=OCC.get(k);if(!L)OCC.set(k,L=[]);L.push(o)}}
// footprint corners/edges must keep clear of every road surface
function onRoadFoot(o,pad){const pts=[[0,0],[1,1],[1,-1],[-1,1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];for(const q of pts){const lx=q[0]*o.hw,lz=q[1]*o.hd,x=o.x+lx*o.c+lz*o.s,z=o.z-lx*o.s+lz*o.c;if(roadAt(x,z,pad))return true}return false}
const BOXI=[],WINI=[],SIGNI=[],SHOPI=[],TANKB=[],TANKS=[],DISH=[],TRUNK=[],LEAF=[],AWN=[],WALLI=[],HOUSES=[];
const hi=n=>(Math.random()*n)|0,pick=a=>a[hi(a.length)];
function addBld(o,h,col,y0,sty,fr,vr){y0=y0===undefined?hillH(o.x,o.z):y0;const ry=Math.atan2(o.s,o.c);if(sty)bldF(o.x,y0+h/2,o.z,ry,o.hw*2,h,o.hd*2,col,sty,fr,vr);else BOXI.push([o.x,y0+h/2,o.z,ry,o.hw*2,h,o.hd*2,col]);addCol(o);occAdd(o)}
// façade point/normal helpers: local z axis is (s,c); road side sign sd => facade at local z = -sd*hd
function facade(o,sd,lx,ly,lz){const z=-sd*(o.hd+lz);return[o.x+lx*o.c+z*o.s,ly,o.z-lx*o.s+z*o.c]}
const YEL=[0xe1ce95,0xdbc68c,0xe6d59f,0xd7c288,0xdecd99,0xe7d8a9,0xdac994],LIME=[0xe0d3b1,0xd9cbaa,0xe6dabb,0xd3c5a4,0xddd0af,0xe4d7b6],VILC=[0xf5f0e6,0xffffff,0xf4dcd2,0xf0cfc6,0xfaf3ee,0xefe6d6,0xf7e4dc],SHOPC=[0xe8dcc0,0xd9c9a3,0xcfd8dc,0xf0e0c8,0xdbc9b0,0xe6d3b8],SIGNC=[0xd62828,0x1f6fe0,0xf0a020,0x2a9d8f,0x8e44ad,0x22a45d];
const LIMEP=[0xe4dcc6,0xdcd2b8,0xd6cdb4,0xe9e2cf],ROSEC=[0xd9b99a,0xcfa98a,0xdcc0a0],BASALT=[0x7c7a74,0x6d6b66,0x85817a],WHITEW=[0xefe9db,0xf2ede0],CONC=[0xb9b4a8,0xaaa598,0xc4bfb2],APTC=[0xe9dfc8,0xddd3bb,0xefe8d6,0xe3d9c1,0xd8cdb4,0xf2ece0],SANDC=[0xd2c4a2,0xcbbd9b,0xd9cdad];
function rowC(){const r=Math.random();return r<.42?pick(YEL):r<.72?pick(LIMEP):r<.82?pick(WHITEW):r<.92?pick(ROSEC):pick(BASALT)}
const THAL=VSD['Thalatheen Street'];const quota={'Al-Balad':40,'Petra Street':30,'Aidun':30};const have={'Al-Balad':0,'Petra Street':0,'Aidun':0};
function winRow(o,sd,y,n,wd,ht,col){const sp=o.hw*2/(n+1);for(let k=1;k<=n;k++){const p=facade(o,sd,-o.hw+sp*k,y,.06);WINI.push([p[0],p[1],p[2],Math.atan2(o.s,o.c),wd,ht,.14,col||0x25303a])}}
const CANP={round:[],cyp:[],pine:[],olive:[],palm:[],bush:[]},TRK=[],GRN=[0x3f6b2a,0x4a7a2e,0x365f26,0x587a35,0x4b6e2f,0x607c3a],CYPC=[0x1f4a28,0x255532,0x1c4426],PINC=[0x5e7e3c,0x6a8a42,0x56763a],OLC=[0x7f8d5e,0x76865a,0x889667,0x6f7f52],rr=(a,b)=>a+Math.random()*(b-a);
function speciesAt(x,z){let dn;try{dn=distName(x,z)}catch(e){dn='Irbid'}const r=Math.random();
 if(dn==='Petra Street'||dn==='Aidun')return r<.28?'cyp':r<.5?'pine':r<.62?'palm':r<.8?'olive':'round';
 if(dn==='Al-Balad')return r<.45?'olive':r<.75?'round':'cyp';
 if(dn==='Outskirts')return r<.55?'olive':r<.85?'pine':'round';
 if(dn==='Wasfi Al-Tal Park')return r<.35?'pine':r<.55?'cyp':'round';
 return r<.4?'round':r<.6?'pine':r<.78?'olive':r<.9?'cyp':'palm'}
function treeSp(x,z,s,sp){const y=hillH(x,z),ry=Math.random()*6.28;s=s*(.85+Math.random()*.35);
 if(sp==='cyp'){const h=rr(5.5,8.5)*s;TRK.push([x,y+.6,z,0,.35*s,1.2,.35*s,0x4a3a2a]);CANP.cyp.push([x,y+h/2+.5,z,ry,1.5*s,h,1.5*s,pick(CYPC)])}
 else if(sp==='pine'){const h=rr(4.5,6.5)*s;TRK.push([x,y+h/2,z,0,.45*s,h,.45*s,0x6b5440]);CANP.pine.push([x+rr(-.4,.4),y+h+.2,z+rr(-.4,.4),ry,rr(3.6,4.8)*s,rr(1.4,2)*s,rr(3.6,4.8)*s,pick(PINC)]);CANP.pine.push([x+rr(-1.4,1.4),y+h-.6,z+rr(-1.4,1.4),ry+1,2.4*s,1.1*s,2.4*s,pick(PINC)])}
 else if(sp==='olive'){const h=rr(1.1,1.7)*s;TRK.push([x,y+h/2,z,0,.7*s,h,.7*s,0x5a4a3a]);CANP.olive.push([x,y+h+.9*s,z,ry,rr(2.8,3.6)*s,rr(1.7,2.3)*s,rr(2.8,3.6)*s,pick(OLC)]);if(Math.random()<.55)CANP.olive.push([x+rr(-.9,.9),y+h+.4*s,z+rr(-.9,.9),ry,1.8*s,1.2*s,1.8*s,pick(OLC)])}
 else if(sp==='palm'){const h=rr(5,7.5)*s;TRK.push([x,y+h/2,z,0,.4*s,h,.4*s,0x7a6a52]);CANP.palm.push([x,y+h+.4,z,ry,rr(3.8,4.6)*s,1.3*s,rr(3.8,4.6)*s,0x3f7a35])}
 else{const h=rr(2.4,3.4)*s,cw=rr(4,5.4)*s;TRK.push([x,y+h/2,z,0,.5*s,h,.5*s,0x5b4733]);CANP.round.push([x,y+h+cw*.3,z,ry,cw,cw*.85,cw,pick(GRN)]);CANP.round.push([x+rr(-1,1)*s,y+h+cw*.05,z+rr(-1,1)*s,ry,cw*.7,cw*.6,cw*.7,pick(GRN)])}}
function tree(x,z,s){treeSp(x,z,s,speciesAt(x,z))}
// one slot of fabric; returns the depth consumed along the road (or 0 if rejected)
function slot(e,u,sd,style,hero){let w,d,h,set,gap=0,col;
 if(style==='row'){w=R(6,9.5);d=R(13,18);h=R(8,13);set=e.w<6?1.1:2;col=rowC()}
 else if(style==='shop'){w=R(5,9);d=R(10,14);h=R(6,11);set=2.8;gap=.5;col=pick(SHOPC)}
 else if(style==='apt'){w=R(16,26);d=R(14,20);h=R(10,17);set=5;gap=R(3,9);col=pick(APTC)}
 else if(style==='house'){w=R(11,17);d=R(11,16);h=R(5,9);set=5;gap=R(6,12);col=pick(SANDC.concat(LIMEP,CONC))}
 else{w=R(13,18);d=R(13,18);h=R(6.5,9);set=hero?11:8;gap=hero?R(15,22):R(12,24);col=pick(VILC)}
 const half=e.w/2,off=half+set+d/2,pr=edgePt(e,u+w/2),cx=pr[0]+sd*pr[2]*off,cz=pr[1]+sd*pr[3]*off;
 const pr2=edgePt(e,Math.min(e.len,u+w/2+2)),pr1=edgePt(e,Math.max(0,u+w/2-2)),ttx=pr2[0]-pr1[0],ttz=pr2[1]-pr1[1],ry2=Math.atan2(-ttz,ttx);const ob=obb(cx,cz,w,d,ry2);
 if(onRoadFoot(ob,style==='row'?.6:hero&&style==='villa'?7:1.8)||!occFree(ob,style==='row'?-.05:.6))return 0;
 if(noBuild(cx,cz,0))return 0;
 if(Math.hypot(cx-BANKP.x,cz-BANKP.z)<60||Math.hypot(cx-SHOPP.x,cz-SHOPP.z)<50||SPAWNKEEP.some(q=>Math.hypot(cx-q[0],cz-q[1])<q[2]))return 0;
 addBld(ob,h,col,undefined,{row:1,shop:2,apt:3,house:4,villa:5}[style],-sd,3.0);const FX=!GFX.on;
 if(style==='row'||(style==='apt'&&THAL(e)))BREG.push({sty:style,o:ob,sd,h,w,d,ry:ry2,x:cx,z:cz,zone:style==='row'?distName(cx,cz):'Thalatheen Street'});
 if(style==='row'){const fl=Math.round(h/3.2);if(hero){if(FX)for(let f=0;f<fl;f++){winRow(ob,sd,2.2+f*3.1,2,1.1,1.5);if(f>0)for(const k of[-1,1]){const q=facade(ob,sd,k*w*.22,2.4+f*3.1-.4,.4);AWN.push([q[0],q[1],q[2],ry2,1.5,.12,.9,0x6b5a45])}}else awnBays(ob,sd,w,fl,ry2,.55)
   BOXI.push([cx,h+.45,cz,ry2,w,.9,d,col]);if(Math.random()<.7)TANKS.push([cx+R(-w/3,w/3),h+1.5,cz+R(-d/3,d/3)]);if(Math.random()<.6)DISH.push([cx+R(-w/3,w/3),h+1.1,cz+R(-d/3,d/3)])}
  else{if(Math.random()<.5)TANKS.push([cx,h+.6,cz]);if(FX)winRow(ob,sd,2.4,2,.9,1.2);else awnBays(ob,sd,w,fl,ry2,.28)}}
 else if(style==='shop'){if(FX){const q=facade(ob,sd,0,1.6,.1);SHOPI.push([q[0],q[1],q[2],ry2,w*.86,2.8,.2,0x1c2a36])}const s2=facade(ob,sd,0,3.6,.18);SIGNI.push([s2[0],s2[1],s2[2],ry2,w*.9,1,.3,pick(SIGNC)]);if(FX){winRow(ob,sd,5.2,2,1,1.3);if(h>8)winRow(ob,sd,8.2,2,1,1.3)}}
 else if(style==='apt'){const fl=Math.round(h/3.2);if(FX)for(let f=0;f<fl;f++)winRow(ob,sd,1.9+f*3.1,4,1.2,1.5);if(Math.random()<.8)TANKS.push([cx+R(-w/3,w/3),h+.6,cz+R(-d/3,d/3)]);if(Math.random()<.5)DISH.push([cx,h+1.1,cz])}
 else if(style==='house'){if(FX)winRow(ob,sd,2,3,1.1,1.4);if(Math.random()<.6)tree(cx+sd*pr[2]*(d/2+4)+0,cz+sd*pr[3]*(d/2+4),1)}
 else{ // villa
  BOXI.push([cx,h+.25,cz,ry2,w+.8,.5,d+.8,0xe9e2d2]);const dt=hero?3:2;if(FX)winRow(ob,sd,2.2,dt,1.2,1.6,0x2a3a48);if(hero){if(FX){winRow(ob,sd,5.2,dt,1.2,1.5,0x2a3a48);const dq=facade(ob,sd,0,1.2,.08);WINI.push([dq[0],dq[1],dq[2],ry2,1.6,2.4,.14,0x6b4a2f])}
   // courtyard walls: front wall with gate gap, side walls, back wall
   const px=w+12,pd=d+12,front=-sd*(pd/2),cwall=(lx,lz,ww,dd)=>{const wx=cx+lx*ob.c+lz*ob.s,wz=cz-lx*ob.s+lz*ob.c,b2=obb(wx,wz,ww,dd,ry2);WALLI.push([wx,1.1+hillH(wx,wz),wz,ry2,ww,2.2,dd,0xf1ece0]);addCol(b2)};
   const gx=3.2;cwall(-(px/2+gx/2)/2,front,px/2-gx/2,.5);cwall((px/2+gx/2)/2,front,px/2-gx/2,.5);cwall(0,-front,px,.5);cwall(-px/2,0,.5,pd);cwall(px/2,0,.5,pd);
   for(let t=-px/2+1;t<px/2-.5;t+=2.4){if(Math.abs(t)<gx+.6||Math.random()<.5)continue;const wx=cx+t*ob.c+front*ob.s,wz=cz-t*ob.s+front*ob.c;CANP.bush.push([wx,hillH(wx,wz)+2.5,wz,Math.random()*3,1.6,.9,1.1,pick([0xc2185b,0xd81b60,0x2e7d32,0x388e3c])])}
   tree(cx+ob.c*(w/2+4)+ob.s*sd*(d/2+3.5),cz-ob.s*(w/2+4)+ob.c*sd*(d/2+3.5),1.1);tree(cx-ob.c*(w/2+4)-ob.s*(sd*d*.2),cz+ob.s*(w/2+4)-ob.c*(sd*d*.2),.9)}
  else if(Math.random()<.6)tree(cx+ob.s*-sd*(d/2+3.5),cz+ob.c*-sd*(d/2+3.5),1)}
 roofJunk(ob,h,col,style,hero);if(style==='row'||style==='shop'||style==='apt')BOXI.push([cx,h+.12,cz,ry2,w+.45,.26,d+.45,tint(col,.14)]);
 if(style==='apt'&&h>9.5&&Math.random()<.4){const w2=w-R(2.5,5),d2=d-R(2.5,4.5),lz=sd*(d-d2)/2,lx=R(-1,1);bldF(cx+lx*ob.c+lz*ob.s,h+1.62,cz-lx*ob.s+lz*ob.c,ry2,w2,3.2,d2,col,8,-sd,1.2)}
if((style==='house'&&Math.random()<.75)||(style==='villa'&&!hero&&Math.random()<.85))fenceFront(e,u,sd,w,gap,set,style==='villa'?2:1.5,style==='villa');
 LASTX=cx;LASTZ=cz;return w+gap}
let LASTX=0,LASTZ=0;const BANKP={x:1e9,z:1e9},SHOPP={x:1e9,z:1e9},SPAWNKEEP=[];

// awnings aligned with the shader's window bays (facade shader: bays = round(w/3.2), floor 1 starts at 3.4 m, then every 3.1 m, window top 2.45 m above the floor)
function awnBays(ob,sd,w,fl,ry,pr){const n=Math.max(1,Math.round(w/3.2)),bw=w/n;for(let f=1;f<fl;f++)for(let i=0;i<n;i++){if(Math.random()>pr)continue;const q=facade(ob,sd,-w/2+(i+.5)*bw,3.4+(f-1)*3.1+2.65,.42);AWN.push([q[0],q[1],q[2],ry,Math.min(1.7,bw*.6),.12,.9,pick([0x6b5a45,0x8a3b2c,0x2f5d46,0x395b8a,0xb08a3a])])}}

// roof clutter: stair/lift heads, solar panels, TV masts, unfinished-storey rebar (Math.random only)
const SOLAR=[],ANT=[],REB=[];
function roofJunk(ob,h,col,style,hero){const w=ob.hw*2,d=ob.hd*2,ry=Math.atan2(ob.s,ob.c),at=(lx,lz)=>[ob.x+lx*ob.c+lz*ob.s,ob.z-lx*ob.s+lz*ob.c];
 if((style==='apt'||style==='shop'||style==='row')&&w>5.5&&Math.random()<.6){const q=at(rr(-w/3,w/3),rr(-d/3,d/3));BOXI.push([q[0],h+1.3,q[1],ry,2.6,2.6,2.8,col])}
 if(style!=='shop'&&Math.random()<.5){const q=at(rr(-w/3,w/3),rr(-d/3,d/3));SOLAR.push([q[0],h+.7,q[1],ry,1.7,.08,1.1]);SOLAR.push([q[0],h+.35,q[1],ry,1.5,.7,.1,0xc8c8c8])}
 if(Math.random()<.45){const q=at(rr(-w/3,w/3),rr(-d/3,d/3));ANT.push([q[0],h+2,q[1],0,.06,4,.06]);ANT.push([q[0],h+3.2,q[1],ry,1.4,.05,.05]);ANT.push([q[0],h+2.6,q[1],ry,.9,.05,.05])}
 if((style==='house'&&Math.random()<.45)||(style==='apt'&&Math.random()<.2)){for(const[a,b]of[[-1,-1],[1,-1],[-1,1],[1,1]]){const q=at(a*(w/2-.5),b*(d/2-.5));REB.push([q[0],h+.8,q[1],0,.14,1.6,.14])}}}
// low garden wall with gate pillars (and bougainvillea) in front of plain houses / villas; solid for traffic
function fenceFront(e,u,sd,w,gap,set,hh,villa){const half=e.w/2,ww=w+Math.min(gap,8)*.6,off=half+set-2,pr=edgePt(e,Math.min(e.len,u+ww/2)),pa=edgePt(e,Math.min(e.len,u+ww/2+2)),pb=edgePt(e,Math.max(0,u+ww/2-2)),ry=Math.atan2(-(pa[1]-pb[1]),pa[0]-pb[0]);
 const cx=pr[0]+sd*pr[2]*off,cz=pr[1]+sd*pr[3]*off,ob=obb(cx,cz,ww,.5,ry);if(!occFree(ob,0)||onRoadFoot(ob,1.2))return;
 const c=Math.cos(ry),s=Math.sin(ry),at=t=>[cx+t*c,cz-t*s],g=rr(-ww/4,ww/4),col=pick(SANDC.concat(LIMEP)),yb=hillH(cx,cz);
 const seg=(a,b)=>{const L=b-a;if(L<.6)return;const q=at((a+b)/2);WALLI.push([q[0],yb+hh/2,q[1],ry,L,hh,.3,col]);boxCol(q[0],q[1],L,.3,ry)};
 seg(-ww/2,g-1.7);seg(g+1.7,ww/2);for(const t of[g-1.8,g+1.8]){const q=at(t);WALLI.push([q[0],yb+(hh+.45)/2,q[1],ry,.55,hh+.45,.55,col])}
 if(villa||Math.random()<.35)for(let t=-ww/2+1;t<ww/2-.5;t+=rr(1.8,2.8)){if(Math.abs(t-g)<2.2||Math.random()<.4)continue;const q=at(t);CANP.bush.push([q[0],yb+hh+.2,q[1],Math.random()*3,rr(1.2,1.8),.8,.9,pick([0x5d7a3a,0x4f7a38,0x6d8a42,0x587a35,0x8a3a5c,0x5d7a3a,0x7a8a4a])])}}

const tint=(c,k)=>{const r=(c>>16&255),g=(c>>8&255),b=(c&255),f=v=>Math.min(255,Math.round(v+(255-v)*k));return(f(r)<<16)|(f(g)<<8)|f(b)};
