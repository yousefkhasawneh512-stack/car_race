// ---- fabric along every road, then flush everything into instanced meshes ----
// building fabric along the real streets, budgeted per hub (the detail budget is a performance choice, not map data): each hub fills from its centre outward
const BCAP=FACQ?7500:3500,HSH=[.36,.18,.14,.10,.05,.07,.05,.05],BLD_STAT={placed:0,tries:0};
// ---- real OpenStreetMap building footprints (BLDD, BBBike extract + v40 BLDO, Overpass, everything outside it): placed first; the generated fabric below only fills
// places with no real OSM building within ~50 m (realCnt, 06c), i.e. where OpenStreetMap has nothing mapped ----
const inCover=(()=>{const q=BLDD.cover;return(x,z)=>{let sg=0;for(let i=0;i<4;i++){const a=q[i],b=q[(i+1)&3],c=(b[0]-a[0])*(z-a[1])-(b[1]-a[1])*(x-a[0]);if(c===0)continue;const g=c>0?1:-1;if(!sg)sg=g;else if(sg!==g)return false}return true}})();
const RB={pieces:0,placed:0,road:0,occ:0,zone:0,shrunk:0,sty:[0,0,0,0,0,0,0,0,0]},notTn=e=>!e.tn;
function roadHit(x,z,pad){const ci=Math.floor(x/HC2),cj=Math.floor(z/HC2);for(let i=ci-1;i<=ci+1;i++)for(let j=cj-1;j<=cj+1;j++){const L=HASH.get(hk(i,j));if(!L)continue;for(let q=0;q<L.length;q++){const s=L[q];if(s.e.tn)continue;const th=Math.max(s.hw+pad,2.4);let t=((x-s.x0)*s.dx+(z-s.z0)*s.dz)*s.il2;t=t<0?0:t>1?1:t;const ex=x-s.x0-s.dx*t,ez=z-s.z0-s.dz*t;if(ex*ex+ez*ez<th*th)return true}}return false}
function footHits(x,z,hw,hd,c,s,pad){const nx=Math.max(2,Math.ceil(hw*2/5)),nz=Math.max(2,Math.ceil(hd*2/5));let n=0;for(let i=0;i<=nx;i++)for(let j=0;j<=nz;j++){const lx=(i/nx-.5)*2*hw,lz=(j/nz-.5)*2*hd;if(roadHit(x+lx*c+lz*s,z-lx*s+lz*c,pad))n++}return n}
const noBR=(x,z)=>inPoly('STAD',x,z,0)||inPoly('MSTAD',x,z,0)||inPoly('IPARK',x,z,0)||inPark(x,z,12)||Math.hypot(x-MALL.x,z-MALL.z)<MALL.r||Math.hypot(x-SC[0],z-SC[1])<DZR+30;
function realStyle(tc,w,d,h,rn,zone){const area=w*d;
 if(tc===1)return(zone==='Petra Street'||zone==='Aidun')&&area>110?5:zone==='Al-Balad'&&area<200?1:4;
 if(tc===2)return 3;if(tc===3||tc===5)return 6;if(tc===4||tc===7)return 7;if(tc===6)return h>12&&area>150?8:2;
 if(zone==='Al-Balad'&&area<300&&h<15)return 1;
 const rk=rn?rn.e.kind:'',fr=rn&&rn.d<18&&(rk==='main'||rk==='arch'||rk==='petra'||ZR_UNI(rn.e));
 if(fr&&area>=35&&area<=260&&h<=14)return 2;if(h>=12)return area>400?8:3;
 if(area<230&&h<=10)return(zone==='Petra Street'||zone==='Aidun')&&area>100?5:4;return 3}
const colFor=sty=>sty===1?rowC():sty===2?pick(SHOPC):sty===3?pick(APTC):sty===4?pick(SANDC.concat(LIMEP,CONC)):sty===5?pick(VILC):sty===6?pick(LIMEP.concat(WHITEW)):sty===7?pick(CONC):pick([0xcfd8dc,0xb9c4cc,0xdcdcd6]);
const RBG=new Map(),RBK=(x,z)=>Math.floor(x/60)*100000+Math.floor(z/60);
function rbAt(x,z){const L=RBG.get(RBK(x,z));if(!L)return null;for(const r of L){const o=r[0],dx=x-o.x,dz=z-o.z,lx=dx*o.c-dz*o.s,lz=dx*o.s+dz*o.c;if(Math.abs(lx)<=o.hw+.5&&Math.abs(lz)<=o.hd+.5)return r}return null}
function placeReal(){const pass=[];
 for(const P of[BLDD.p,BLDO.p])for(let i=0,N=P.length/7;i<N;i++){const o=i*7;let x=P[o]/10,z=P[o+1]/10,w=P[o+2]/10,d=P[o+3]/10,ry=P[o+4]/100;const h=P[o+5]/2,tcf=P[o+6];RB.pieces++;
  if(w<2.5||d<2.5||noBR(x,z)||Math.hypot(x-BANKP.x,z-BANKP.z)<60||Math.hypot(x-SHOPP.x,z-SHOPP.z)<50||SPAWNKEEP.some(q=>Math.hypot(x-q[0],z-q[1])<q[2])){RB.zone++;continue}
  const rn=roadNear(x,z,45,notTn),fa=()=>{if(!rn)return[0,1];const c=Math.cos(ry),s=Math.sin(ry),vx=rn.px-x,vz=rn.pz-z;return[vx*c-vz*s,vx*s+vz*c]};
  let[lx,lz]=fa();if(Math.abs(lx)>Math.abs(lz)*1.2){const t=w;w=d;d=t;ry+=Math.PI/2;[lx,lz]=fa()}
  const sd=lz>0?-1:1,c=Math.cos(ry),s=Math.sin(ry);let ok=false;
  for(const kk of[1,.94,.88,.8,.7,.6]){if(footHits(x,z,w*kk/2,d*kk/2,c,s,.4)===0){if(kk<1){RB.shrunk++;w*=kk;d*=kk}ok=true;break}}
  if(!ok){RB.road++;continue}
  const ob=obb(x,z,w,d,ry);if(!occFree(ob,-.1)){RB.occ++;continue}
  pass.push([ob,h,tcf,rn,sd,w,d,ry])}
 const hAB=[],hPS=[],hAI=[];
 for(const[ob,h,tcf,rn,sd,w,d,ry]of pass){const tc=tcf&7,cont=tcf>>3,x=ob.x,z=ob.z,dn=distName(x,z),sty=realStyle(tc,w,d,h,rn,dn),col=colFor(sty);
  addBld(ob,h,col,undefined,sty,-sd,3.0);RB.placed++;{const k=RBK(ob.x,ob.z);let L=RBG.get(k);if(!L){L=[];RBG.set(k,L)}L.push([ob,sd,h])}RB.sty[sty]++;
  const nm=['','row','shop','apt','house','villa','house','house','apt'][sty],at=(lx,lz)=>[x+lx*ob.c+lz*ob.s,z-lx*ob.s+lz*ob.c];
  if(!cont&&w*d>=40&&sty!==7){if(sty===1||sty===2||sty===3||sty===8)BOXI.push([x,h+.12,z,ry,w+.45,.26,d+.45,tint(col,.14)]);roofJunk(ob,h,col,nm,false);if(Math.random()<.35)TANKS.push([x+R(-w/3,w/3),h+.6,z+R(-d/3,d/3)])}
  if(tc===5&&!cont&&w*d>120){const q=at(w/2-1.4,-d/2+1.4);BOXI.push([q[0],h+9,q[1],ry,2.2,18,2.2,0xefe9db]);BOXI.push([q[0],h+18.6,q[1],ry,3,1.2,3,0xd8d2c2])}
  if(!GFX.on&&!cont&&w*d>=40){const fl=Math.min(4,Math.max(1,Math.round(h/3.2)));for(let f=0;f<fl;f++)winRow(ob,sd,1.9+f*3.1,Math.max(2,Math.round(w/4)),1.1,1.4)}
  if(!cont&&w>=5){const rec={o:ob,sd,h,w,d,ry,x,z};if(dn==='Al-Balad'&&sty===1)BREG.push(Object.assign({sty:'row',zone:'Al-Balad'},rec));if(rn&&THAL(rn.e)&&w*d>=50)BREG.push(Object.assign({sty:'apt',zone:'Thalatheen Street'},rec));
   if(dn==='Al-Balad'&&sty===1&&w<=14)hAB.push(rec);else if(dn==='Petra Street'&&(sty===4||sty===5))hPS.push(rec);else if(dn==='Aidun'&&(sty===4||sty===5))hAI.push(rec)}}
 const heroes=(L,tag,units)=>{const A=L.slice();for(let i=A.length-1;i>0;i--){const j=hi(i+1);[A[i],A[j]]=[A[j],A[i]]}const out=[];for(const b of A){if(have[tag]>=quota[tag])break;if(out.some(q=>Math.hypot(q.x-b.x,q.z-b.z)<(tag==='Al-Balad'?45:70)))continue;out.push(b);have[tag]++;HOUSES.push({tag,x:b.x,z:b.z,units})}};
 heroes(hAB,'Al-Balad',3);heroes(hPS,'Petra Street',1);heroes(hAI,'Aidun',1);
 console.log('real buildings: pieces',RB.pieces,'placed',RB.placed,'dropped zone/road/occupied',RB.zone,RB.road,RB.occ,'shrunk',RB.shrunk,'styles',RB.sty.join('/'),'heroes',have['Al-Balad'],have['Petra Street'],have['Aidun'])}
placeReal();
function styleFor(e,x,z){if(inCover(x,z)||realCnt(x,z,25))return null;const dn=distName(x,z),k=e.kind;
 if(dn==='Al-Balad')return['row',1,dn];if(dn==='University Street')return ZR_UNI(e)?['shop',.96,dn]:['apt',.7,dn];
 if(dn==='Petra Street'||dn==='Aidun')return(k==='petra'||k==='local'||k==='main')?['villa',.62,dn]:null;
 if(dn==='Irbid')return k==='arch'?['apt',.35,dn]:k==='local'?['house',.75,dn]:['apt',.85,dn];
 if(dn==='Outskirts')return(k==='local'||k==='main')?['house',.3,dn]:null;return null}
const FK=new Set(['main','local','petra','arch']);
HUBS.forEach((hb,h)=>{const L=EDGES.filter(e=>e.hub===h&&e.fz>=2&&FK.has(e.kind)&&e.len>=30).sort((a,b)=>(a.hd-(ZR_UNI(a)?.3:0))-(b.hd-(ZR_UNI(b)?.3:0))),cap=Math.round(BCAP*HSH[h]),capA=cap*7;let cnt=0,att=0;
 for(const e of L){if(cnt>=cap||att>=capA)break;
 for(const sd of[-1,1]){let u=3,bl=0,heroB=false,fresh=false;
  while(u<e.len-6){const m=edgePt(e,Math.min(e.len,u+8)),st=styleFor(e,m[0],m[1]);if(!st){u+=12;continue}if(st[1]<1&&Math.random()>st[1]){u+=10;continue}
   let hero=false;if(st[0]==='row'){if(bl<=0){heroB=have['Al-Balad']<quota['Al-Balad'];bl=3+hi(3);fresh=true}hero=heroB}else if(st[0]==='villa')hero=have[st[2]]<quota[st[2]];
   att++;const c=slot(e,u,sd,st[0],hero);
   if(c>0){cnt++;if(st[0]==='row'){if(fresh&&heroB){have['Al-Balad']++;HOUSES.push({tag:'Al-Balad',x:LASTX,z:LASTZ,units:bl})}fresh=false;bl--}else if(st[0]==='villa'&&hero){have[st[2]]++;HOUSES.push({tag:st[2],x:LASTX,z:LASTZ,units:1})}u+=c}else u+=6}}}
 BLD_STAT.placed+=cnt;BLD_STAT.tries+=att;console.log('hub',h,'edges',L.length,'buildings',cnt,'/',cap,'tries',att)});
placeShops();
const winMat=gfxStd({color:0xffffff,roughness:.08,metalness:.15,envMapIntensity:2.2},'none')||new T.MeshLambertMaterial({color:0xffffff}),glassMat=gfxStd({color:0xffffff,roughness:.08,metalness:.15,envMapIntensity:2.2},'none')||new T.MeshLambertMaterial({color:0xffffff});
instO(UB,baseMat,BOXI.concat(WALLI,AWN,SIGNI),true);instO(UB,winMat,WINI.concat(SHOPI));instF(FACI);instO(UB,gfxStd({color:0x1f3560,roughness:.18,metalness:.35,envMapIntensity:1.6},'none')||UBm(0x1f3560),SOLAR,false,260,200);instO(UB,UBm(0x30343a),ANT,false,260,200);instO(UB,UBm(0x6a5a4a),REB,false,200,200);
instO(new T.CylinderGeometry(.6,.6,1.2,6),UBm(0x1b1b1b),TANKS);instO(new T.CylinderGeometry(.5,.5,.12,6).rotateX(.6),UBm(0xf2f2f2),DISH);
instO(new T.CylinderGeometry(.5,.6,1,6),UBm(0x6b4a2f),TRUNK);instO(new T.SphereGeometry(1,7,5),UBm(0x4a6b2a),LEAF);
function houseNear(x,z){let b=null,bd=35;for(const h of HOUSES){const d=Math.hypot(h.x-x,h.z-z);if(d<bd){bd=d;b=h}}return b}
