// ---- missing Google-Maps landmarks (heritage sites, squares, parks) + the supermarket patch ----
const missing_google_maps_landmarks={
 historical_and_cultural_sites:[
  {id:"dar_as_saraya_museum",name:"Dar As Saraya Ottoman Museum",zone:"Al-Balad Old Core / Top of Irbid Hill",type:"Historical Ottoman Citadel & Museum",description:"Built originally as an Ottoman castle and prison in 1886. It features massive heritage stone archways and historic cobblestone surfaces."},
  {id:"arars_cultural_house",name:"Arar's Cultural House (Beit Arar)",zone:"Al-Balad Core / Near Municipality",type:"Heritage Historical Compound",description:"The historic family estate of Jordan's famous poet Mustafa Wahbi Al-Tal. Modeled after old Levant clay and stone courtyard architecture."},
  {id:"the_nabulsi_house",name:"The Nabulsi House (Beit Al-Nabulsi)",zone:"Historic Center Core",type:"Historic Building (OSM: historic=building)",description:"Historic building maintained by the Irbid municipality (OSM description). Build date not verified. Modelled after traditional early 20th-century urban Irbid estate styles with an open central courtyard."}],
 urban_squares_and_parks:[
  {id:"irbid_clock_tower_square",name:"Clock Tower Square",zone:"Downtown Market Center",type:"Central Roundabout & Tower Monument",description:"The absolute landmark focal point of the historic old town, surrounded by street vendors, older bookstores, and traditional cafes."},
  {id:"wasfi_at_tal_square",name:"Wasfi Al-Tal Square",zone:"Downtown / Wasfi Al-Tal Street",type:"Historic Assembly Plaza",description:"One of the oldest urban open public squares and assembly plazas right in the dense historic street layout."},
  {id:"eimar_irbid_park",name:"Emaar Irbid Park",type:"Premium Clean Public Green Space",zone:"Northern Residential Districts",description:"Highly rated clean municipal park layout featuring concrete walkways and dense perimeter landscaping."},
  {id:"tariq_park",name:"Tariq Park",zone:"Al-Hayy Al-Sharqi (Eastern Quarter)",type:"Fenced Family Park Asset",description:"A popular localized park destination located near the Al-Karama institutional blocks."}]};
const ultimate_irbid_supermarket_patch={
 requested_landmarks:[
  {id:"mk_supermarket_hq",name:"MK Super Market",zone:"University Street Corridor",type:"Major Grocery & Specialty Import Hub",description:"The definitive main store flagship. Specializes in hard-to-find imports and local convenience essentials, heavily visible on the main avenue."},
  {id:"m_market_balad",name:"M Market - Al-Balad Core",zone:"Al-Balad Old Core",type:"Convenience Supermarket Branch"},
  {id:"m_market_petra",name:"M Market - Petra Express",zone:"Petra Street Highway Expansion",type:"24/7 Supermarket Hub"},
  {id:"m_market_thataheen",name:"M Market - Thalatheen Ring",zone:"Thalatheen Street Inner Beltway",type:"Discount Grocery Center"},
  {id:"m_market_aidun",name:"M Market - Aidun Suburbia",zone:"Aidun Suburbs",type:"Neighborhood Supermarket Branch"}],
 missing_real_world_irbid_mega_grocery_chains:[
  {id:"sameh_mall_thqafah",name:"Sameh Mall",zone:"Irbid",type:"Mega Hypermarket Plaza",description:"A massive, distinctively modern 62,000-square-meter family mega-market hub loaded with massive fresh food displays and parking bays."},
  {id:"hypermax_carrefour_icc",name:"HyperMax / Carrefour (Irbid City Center)",zone:"Aidun / Southern Sector (Floor B1)",type:"Flagship Hypermarket Anchor",description:"The largest high-volume corporate department and grocery store inside the main city center complex."},
  {id:"ctown_irbid_branch",name:"C-Town Supermarket (Irbid Branch)",zone:"Inner Ring Corridor / Thalatheen Street",type:"Major Retail Supermarket Chain",description:"Highly recognizable retail brand building serving as a staple daily household supply destination."},
  {id:"irbid_mall_hypermarket",name:"Irbid Mall Hypermarket",zone:"Near Irbid-Amman Highway Corridor",type:"Integrated Regional Shopping Hypermarket",description:"A veteran multi-service community grocery center serving out-of-town highway traffic."}]};
const LM2_FAIL=[],LM2_OK=[];
// v40: a heritage landmark sits ON its real OSM building (BLDD piece + its continuation pieces), scaled to that outline (S.kx/S.kz, honoured by wl()
// and wallC()) and facing the nearest road. siteNear used to move it to the nearest free road-front plot: Dar As-Saraya stood 76 m from the real museum,
// whose footprint also stood there as a plain box; Beit Arar / Beit Nabulsi pushed their real footprints out. null = no data, the caller falls back.
function siteReal(re,w,d){const n=BLDD.n.find(q=>re.test(q[2]));if(!n)return null;const P=BLDD.p;let bi=-1,bs=1e9;
 for(let i=0;i<P.length;i+=7){if(P[i+6]&8)continue;const x=P[i]/10,z=P[i+1]/10,dd=Math.hypot(x-n[0],z-n[1]);if(dd>30)continue;
  const ry=P[i+4]/100,c=Math.cos(ry),s=Math.sin(ry),lx=(n[0]-x)*c-(n[1]-z)*s,lz=(n[0]-x)*s+(n[1]-z)*c,sc=Math.abs(lx)<=P[i+2]/20&&Math.abs(lz)<=P[i+3]/20?dd-1e3:dd;if(sc<bs){bs=sc;bi=i}}
 if(bi<0)return null;const a0=P[bi+4]/100,c0=Math.cos(a0),s0=Math.sin(a0),X0=P[bi]/10,Z0=P[bi+1]/10;let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;
 for(let i=bi;i<P.length;i+=7){if(i>bi&&!(P[i+6]&8))break;const x=P[i]/10,z=P[i+1]/10,hw=P[i+2]/20,hd=P[i+3]/20,ry=P[i+4]/100,c=Math.cos(ry),s=Math.sin(ry);
  for(const[u,v]of[[-hw,-hd],[hw,-hd],[hw,hd],[-hw,hd]]){const wx=x+u*c+v*s-X0,wz=z-u*s+v*c-Z0,lx=wx*c0-wz*s0,lz=wx*s0+wz*c0;x0=Math.min(x0,lx);x1=Math.max(x1,lx);z0=Math.min(z0,lz);z1=Math.max(z1,lz)}}
 const mx=(x0+x1)/2,mz=(z0+z1)/2,cx=X0+mx*c0+mz*s0,cz=Z0-mx*s0+mz*c0,q=roadNear(cx,cz,200,e=>!e.tn&&!e.br&&e.kind!=='ring');if(!q)return null;
 const vx=q.px-cx,vz=q.pz-cz;let bk=0,bd=-2;for(let k=0;k<4;k++){const ry=a0+k*Math.PI/2,dt=-Math.sin(ry)*vx-Math.cos(ry)*vz;if(dt>bd){bd=dt;bk=k}}
 const ry=a0+bk*Math.PI/2,W=bk&1?z1-z0:x1-x0,D=bk&1?x1-x0:z1-z0,kx=Math.max(.5,Math.min(2,W/w)),kz=Math.max(.5,Math.min(2,D/d)),g=grp(cx,0,cz,ry);g.scale.set(kx,1,kz);occAdd(obb(cx,cz,W,D,ry));
 return{cx,cz,ry,sd:1,w,d,set:0,c:Math.cos(ry),s:Math.sin(ry),kx,kz,real:true,p:{x:q.px,z:q.pz,tx:q.tx,tz:q.tz,nx:-q.tz,nz:q.tx},tp:[q.px-q.tz*q.e.w/4,q.pz+q.tx*q.e.w/4,Math.atan2(q.tx,q.tz)],g}}
function siteTry(list,w,d,set,o){let err;for(const[n,x,z]of list){try{return siteBeside(n,x,z,w,d,set,o||{})}catch(e){err=e}}throw err}
const treeAt=(S,lx,lz,s)=>{const q=wl(S,lx,lz);tree(q[0],q[1],s||1)};
const LM2_STONE=0xd9cfb4,LM2_BAS=0x4b4a47,LM2_CLAY=0xc99a6b,LM2_LIME=0xe6dcc3,LM2_TILE=0xa5472f;
const lm2Place=(S,it,o)=>poiAt(S,it.name,Object.assign({tag:it.zone,sub:it.type+' · '+it.zone},o));
function bench(g,x,z,rot){const b=BX(g,2.4,.5,.7,0x7a5a3c,x,.5,z),k=BX(g,2.4,.6,.15,0x7a5a3c,x,.95,z-.3);b.rotation.y=rot||0;k.rotation.y=rot||0}
function lamp(g,x,z){CY(g,.1,.12,4.2,0x2a2d33,x,2.1,z,6);Mi(g,new T.SphereGeometry(.3,8,6),BMB(0xfff2c0),x,4.3,z)}
function arch(g,x,y,z,w,h,col,depth){BX(g,w,h-w/2,depth||.5,col,x,y+(h-w/2)/2,z);const c=Mi(g,new T.CylinderGeometry(w/2,w/2,depth||.5,12,1,false,0,Math.PI).rotateX(Math.PI/2).rotateZ(Math.PI/2),lmx(col),x,y+h-w/2,z)}
// ---------- heritage sites ----------
function buildDarSaraya(it){const S=siteReal(/Archaeological Museum/,58,40)||siteTry([['@',...RL(/Archaeological Museum/,O(330,-220))],['Al-Hashmi Street',...O(330,-220)],['Al-Hashmi Street',...O(330,-470)],['Palestine Street',...O(250,-30)]],58,40,10,{nocol:true,pad:1.6}),g=S.g,w=58,d=40,H=11;
 BX(g,w,.12,10,0x8d867a,0,.1,-d/2-5);for(let i=0;i<14;i++)for(let j=0;j<3;j++)BX(g,3.4,.05,2.6,j%2?0x7a7468:0x9a9386,-24+i*3.7+(j%2)*1.5,.14,-d/2-2-j*3);
 BX(g,w,H,12,LM2_BAS,0,H/2,-d/2+6);wallC(S,0,-d/2+6,w,12);BX(g,w+1,1.1,13,LM2_STONE,0,H+.5,-d/2+6);
 for(const k of[-1,1]){BX(g,13,H,d-12,LM2_BAS,k*(w/2-6.5),H/2,6);wallC(S,k*(w/2-6.5),6,13,d-12);BX(g,14,1.1,d-11,LM2_STONE,k*(w/2-6.5),H+.5,6)}
 BX(g,w-26,H,2.4,LM2_BAS,0,H/2,d/2-1.2);wallC(S,0,d/2-1.2,w-26,2.4);BX(g,w-26,1,2.8,LM2_STONE,0,H+.4,d/2-1.2);BX(g,w-26,.1,d-12,0x9a9386,0,.1,6);
 for(let i=-4;i<=4;i++){if(i===0)continue;arch(g,i*5.6,1.2,-d/2+.1,2.6,5,LM2_STONE,.5);BX(g,2.2,3.6,.3,0x1c1e21,i*5.6,2.8,-d/2-.05)}
 arch(g,0,.1,-d/2+.1,6,8.4,LM2_STONE,.8);BX(g,4.2,6.4,.4,0x2a2118,0,3.3,-d/2-.3);BX(g,8.4,1,1,LM2_STONE,0,9.6,-d/2-.4);
 for(const kx of[-1,1]){CY(g,3.2,3.4,H+5,LM2_BAS,kx*(w/2-.5),(H+5)/2,-d/2+.5,12);CY(g,3.8,3.8,1,LM2_STONE,kx*(w/2-.5),H+5.4,-d/2+.5,12);addPos(S,kx*(w/2-.5),-d/2+.5,3.4);
  for(let a=0;a<8;a++)BX(g,1.1,1.1,1.1,LM2_STONE,kx*(w/2-.5)+3*Math.cos(a*Math.PI/4),H+6.3,-d/2+.5+3*Math.sin(a*Math.PI/4))}
 for(let i=0;i<20;i++){const x=-w/2+1.4+i*2.9;if(Math.abs(x)<5)continue;BX(g,1.5,1.1,1,LM2_STONE,x,H+1.7,-d/2+.5)}
 CY(g,.15,.2,14,0xdddddd,0,H+7,-d/2+6,6);BX(g,3.6,2.2,.06,0xb3202a,1.9,H+12.5,-d/2+6);
 for(let i=0;i<4;i++){const x=-18+i*12;CY(g,.6,.6,.9,0x6b7077,x,.5,-d/2-8,8)}
 treeAt(S,-24,-d/2-9,1);treeAt(S,24,-d/2-9,1);treeAt(S,0,8,1.2);
 signAt(g,'DAR AS SARAYA OTTOMAN MUSEUM',0,H+5,-d/2-1.5,44);const p=lm2Place(S,it,{r:44,kind:'museum',tour:true});SPAWNKEEP.push([S.cx,S.cz,36]);return S}
function buildBeitArar(it){const S=siteReal(/^Arar House/,34,28)||siteTry([['@',...RL(/^Arar House/,O(200,-30))],['Palestine Street',...O(200,-30)],['Al-Khabbaz Lane',...O(200,-70)],['Baghdad Street',...O(30,40)],['Palestine Street',...O(-120,-10)]],34,28,6,{nocol:true,pad:1.4}),g=S.g,w=34,d=28,H=5.4,TT=2.6;
 BX(g,w-1,.1,d-1,0xcdb98f,0,.1,0);
 BX(g,w,H,TT+3,LM2_CLAY,0,H/2,-d/2+(TT+3)/2);wallC(S,0,-d/2+(TT+3)/2,w,TT+3);BX(g,w+.6,.6,TT+3.6,0xa87d52,0,H+.3,-d/2+(TT+3)/2);BX(g,w,1.3,TT+3,0xb8a98c,0,.65,-d/2+(TT+3)/2);
 BX(g,w,H,TT,LM2_CLAY,0,H/2,d/2-TT/2);wallC(S,0,d/2-TT/2,w,TT);BX(g,w+.6,.6,TT+.6,0xa87d52,0,H+.3,d/2-TT/2);
 for(const k of[-1,1]){BX(g,TT+1,H,d-TT-5,LM2_CLAY,k*(w/2-(TT+1)/2),H/2,.5);wallC(S,k*(w/2-(TT+1)/2),.5,TT+1,d-TT-5);BX(g,TT+1.6,.6,d-TT-4.4,0xa87d52,k*(w/2-(TT+1)/2),H+.3,.5)}
 arch(g,0,.1,-d/2+.1,3.6,4.4,0x8a6a45,.5);BX(g,2.8,3.6,.35,0x3b2a1e,0,1.9,-d/2-.3);
 for(const k of[-1,1])for(const x of[7,12]){arch(g,k*x,1.4,-d/2-.1,1.5,2.6,0xb8a98c,.4);BX(g,1,1.8,.3,0x24323d,k*x,2.3,-d/2-.28)}
 CY(g,1.5,1.7,.9,0xb8a98c,0,.45,3,10);CY(g,1.1,1.1,.12,0x2a4f9e,0,.95,3,10);
 for(const[x,z]of[[-8,0],[8,6],[-7,8]]){treeAt(S,x,z,.9)}
 for(let i=0;i<6;i++)BX(g,.9,.5,.9,0xa6542f,-12+i*4.8,.3,d/2-TT-1.2);
 for(const k of[-1,1])BX(g,1.4,2.4,1.4,0xb8a98c,k*(w/2-.9),H+1.2,-d/2+.9);
 signAt(g,"ARAR'S CULTURAL HOUSE · BEIT ARAR",0,H+4,-d/2-1,34);const p=lm2Place(S,it,{r:30,kind:'heritage',tour:true});SPAWNKEEP.push([S.cx,S.cz,26]);return S}
function buildNabulsi(it){const S=siteReal(/^Nabulsi House/,38,32)||siteTry([['@',...RL(/^Nabulsi House/,O(-100,30))],['Baghdad Street',...O(-100,30)],['Palestine Street',...O(-250,-10)],['Baghdad Street',...O(-420,50)],['Palestine Street',...O(100,-10)]],38,32,6,{nocol:true,pad:1.4}),g=S.g,w=38,d=32,H=9.6,TT=5.5;
 BX(g,w-1,.1,d-1,0xcfc3a6,0,.1,0);
 const wing=(lx,lz,ww,dd)=>{BX(g,ww,H,dd,LM2_LIME,lx,H/2,lz);wallC(S,lx,lz,ww,dd);BX(g,ww+.8,.9,dd+.8,0xc9bea2,lx,H+.45,lz)};
 wing(0,-d/2+TT/2,w,TT);wing(0,d/2-TT/2,w,TT);wing(-(w/2-TT/2),0,TT,d-2*TT);wing(w/2-TT/2,0,TT,d-2*TT);
 for(let i=-3;i<=3;i++){if(i===0)continue;for(const y of[1.6,5.4]){BX(g,1.3,2.8,.3,0x24323d,i*4.6,y+1.4,-d/2-.1);Mi(g,new T.ConeGeometry(.95,.9,4).rotateY(Math.PI/4),lmx(0xc9bea2),i*4.6,y+3.15,-d/2-.15)}}
 BX(g,5.4,5.6,.5,0x3b2a1e,0,2.8,-d/2-.1);arch(g,0,.1,-d/2-.35,6.4,7.4,0xcfc3a6,.6);BX(g,12,1,1.6,0xc9bea2,0,H-.6,-d/2-1);
 for(const k of[-1,1])for(let i=0;i<3;i++){BX(g,.3,2.8,1.3,0x24323d,k*(w/2+.1),1.6+1.4,-6+i*6)}
 const rf=Mi(g,new T.CylinderGeometry(7,7,w-4,3).rotateZ(Math.PI/2).rotateX(-Math.PI/2),lmx(LM2_TILE),0,H+2.6,-d/2+TT/2);rf.scale.y=.4;
 CY(g,1.6,1.8,.8,0xb8a98c,0,.4,0,12);CY(g,.9,.9,.12,0x2a4f9e,0,.85,0,12);for(const[x,z]of[[-6,-5],[6,5],[-6,5],[6,-5]]){treeAt(S,x,z,.8)}
 for(let i=0;i<5;i++)BX(g,1.1,.7,1.1,0xa6542f,-8+i*4,.4,d/2-TT-1.4);
 BX(g,1.6,.1,1.6,0xffffff,0,.14,-d/2-2);
 signAt(g,'THE NABULSI HOUSE',0,H+6.2,-d/2-1,32);const p=lm2Place(S,it,{r:32,kind:'heritage',tour:true});SPAWNKEEP.push([S.cx,S.cz,26]);return S}
// ---------- squares & parks ----------
function buildClockSquare(it){const cx=CLK_SITE.x,cz=CLK_SITE.z,g=grp(cx,0,cz,0),k=Math.min(1,(CLK_SITE.cl-.6)/9.5);g.scale.set(k,1,k);   // plaza shrinks to fit the real median
 Mi(g,new T.CircleGeometry(9.5,36).rotateX(-Math.PI/2),lmx(0xcfc3a6),0,.11,0);Mi(g,new T.RingGeometry(9,9.5,36).rotateX(-Math.PI/2),lmx(0x8a7f68),0,.12,0);Mi(g,new T.RingGeometry(4.6,4.9,28).rotateX(-Math.PI/2),BMB(0xf0e6c8),0,.13,0);
 for(let a=0;a<12;a++){const x=8.3*Math.cos(a*Math.PI/6),z=8.3*Math.sin(a*Math.PI/6);CY(g,.25,.25,.9,0x6b7077,x,.5,z,8)}
 if(k>=.8)for(const[a,col,txt]of[[.5,0xc0392b,'books'],[2.1,0x2e8b57,'cafe'],[3.7,0x1f6fb5,'books'],[5.3,0xf2c200,'cafe']]){const x=6*Math.cos(a),z=6*Math.sin(a),s=BX(g,2.6,2.4,1.8,0xe8e0cc,x,1.2,z);s.rotation.y=-a;const t=BX(g,3.2,.15,2.4,col,x,2.6,z);t.rotation.y=-a}
 if(k>=.8)for(const a of[1.3,2.9,4.5,6.1])bench(g,3.6*Math.cos(a),3.6*Math.sin(a),-a+Math.PI/2);
 signAt(grp(cx,0,cz,0),'CLOCK TOWER SQUARE',0,33,0,36);
 const p=PLACES.find(q=>q.name==='Clock Tower');if(!p)throw new Error('clock tower place missing');
 p.name=it.name;p.alias='clock tower irbid clock memorial square دوار الساعة';p.kind='square';p.r=26;p.tag=it.zone;p.sub=it.type+' · '+it.zone;p.tp=tpRoad('Clock Tower Lane',...RL(/Clock Tower Square/,O(-320,-60)));p.tour=true;SPAWNKEEP.push([cx,cz,16]);return p}
function buildWasfiSquare(it){const S=siteTry([['@',...RLP(/Wasfi AlTal square/,[-135.1,-507.0])],['Wasfi Al-Tal Street',...O(-240,-300)],['Wasfi Al-Tal Street',...O(-240,-640)],['Wasfi Al-Tal Street',...O(-240,-230)]],40,30,3,{nocol:true,pad:1.2}),g=S.g,w=40,d=30;
 BX(g,w,.12,d,0xd2c7ab,0,.1,0);for(let i=-3;i<=3;i++)BX(g,.15,.05,d,0xb9ad90,i*5.5,.14,0);for(let j=-2;j<=2;j++)BX(g,w,.05,.15,0xb9ad90,0,.14,j*6);
 Mi(g,new T.RingGeometry(7,7.4,40).rotateX(-Math.PI/2),lmx(0x8a7f68),0,.16,0);
 BX(g,5,.8,5,0xbdb298,0,.5,0);BX(g,3.2,.8,3.2,0xcfc4a8,0,1.3,0);BX(g,1.6,9,1.6,0xe6dcc3,0,6.2,0);Mi(g,new T.ConeGeometry(1.2,2.2,4).rotateY(Math.PI/4),lmx(0xc9a23c),0,11.8,0);addPos(S,0,0,3);
 for(const[x,z]of[[-12,-9],[12,-9],[-12,9],[12,9]]){CY(g,.12,.16,9,0xdddddd,x,4.5,z,6);BX(g,2.4,1.5,.05,[0xb3202a,0xffffff,0x1f8f4e,0x111111][(x>0?1:0)+(z>0?2:0)],x+1.3,8.2,z)}
 for(const[x,z,r]of[[-8,0,0],[8,0,Math.PI],[0,-7,Math.PI/2],[0,7,-Math.PI/2],[-15,11,0],[15,11,0]])bench(g,x,z,r);
 for(const[x,z]of[[-18,-13],[18,-13],[-18,13],[18,13],[0,-14],[0,14]])treeAt(S,x,z,.9);for(const x of[-14,0,14])lamp(g,x,12.5);
 signAt(g,'WASFI AL-TAL SQUARE',0,13.5,-d/2-.5,28);const p=lm2Place(S,it,{r:30,kind:'square',tour:true});p.alias='Wasfi At Tal Square';return S}
function buildEimarPark(it){const S=siteTry([['@',...RL(/Emaar Irbid Park/,O(1610,-560))],['Al-Rawda Street',...O(1610,-560)],['Al-Rawda Street',...O(1610,-330)],['Al-Sultan Street',...O(1300,-1250)],['Al-Hurriya Street',...O(-1300,-700)]],64,46,3,{nocol:true,pad:1.2}),g=S.g,w=64,d=46;
 BX(g,w,.1,d,0x5f9a45,0,.08,0);BX(g,w-4,.12,3,0xd8d2c0,0,.12,0);BX(g,3,.12,d-4,0xd8d2c0,0,.12,0);Mi(g,new T.RingGeometry(8,10.4,36).rotateX(-Math.PI/2),lmx(0xd8d2c0),0,.13,0);BX(g,w-8,.12,2,0xd8d2c0,0,.12,-d/2+4);
 Mi(g,new T.CylinderGeometry(3,3,.5,20),lmx(0x9fd0e8),0,.3,0);Mi(g,new T.CylinderGeometry(.5,.8,2.4,10),lmx(0xbfc4c8),0,1.5,0);addPos(S,0,0,3.2);
 for(let i=0;i<8;i++){treeAt(S,-w/2+3+i*(w-6)/7,-d/2+2,1);treeAt(S,-w/2+3+i*(w-6)/7,d/2-2,1)}for(let i=1;i<5;i++){treeAt(S,-w/2+2,-d/2+2+i*(d-4)/5,1);treeAt(S,w/2-2,-d/2+2+i*(d-4)/5,1)}
 for(const[x,z,r]of[[-14,-3,0],[14,-3,0],[-14,3,Math.PI],[14,3,Math.PI],[-3,-14,Math.PI/2],[3,14,-Math.PI/2]])bench(g,x,z,r);
 for(let i=-3;i<=3;i++)lamp(g,i*8,-d/2+4.8);
 for(const k of[-1,1]){BX(g,.3,.9,d,0x3a3d42,k*w/2,.45,0)}for(const k of[-1,1]){BX(g,w,.9,.3,0x3a3d42,0,.45,k*d/2)}
 BX(g,4,.6,4,0xe9dfc3,-w*.3,.4,-d*.28);BX(g,.3,2.6,.3,0xdd5555,-w*.3-1.8,1.6,-d*.28-1.8);
 signAt(g,'EMAAR IRBID PARK',0,8,-d/2-.3,30);const p=lm2Place(S,it,{r:44,kind:'park',tour:true});p.alias='Eimar Irbid Park';return S}
function buildTariqPark(it){const S=siteTry([['Al-Zahra Street',...O(2150,300)],['Al-Zahra Street',...O(2150,0)],['Al-Tijari Street',...O(1100,420)]],46,38,3,{nocol:true,pad:1.2}),g=S.g,w=46,d=38;
 BX(g,w,.1,d,0x69a24c,0,.08,0);BX(g,3,.12,d-6,0xd8d2c0,0,.12,2);BX(g,w-6,.12,3,0xd8d2c0,0,.12,4);
 for(const z of[d/2]){BX(g,w,1.6,.25,0x2a5d3a,0,.8,z);wallC(S,0,z,w,.5)}for(const x of[-w/2,w/2]){BX(g,.25,1.6,d,0x2a5d3a,x,.8,0);wallC(S,x,0,.5,d)}
 BX(g,w/2-3,1.6,.25,0x2a5d3a,-(w/4+1.5),.8,-d/2);BX(g,w/2-3,1.6,.25,0x2a5d3a,w/4+1.5,.8,-d/2);wallC(S,-(w/4+1.5),-d/2,w/2-3,.5);wallC(S,w/4+1.5,-d/2,w/2-3,.5);
 for(const k of[-1,1]){BX(g,.5,3.2,.5,0xe6dcc3,k*3,1.6,-d/2);}BX(g,6.6,.6,.6,0xe6dcc3,0,3.3,-d/2);
 for(const[x,z]of[[-14,-6],[-14,6]]){for(const k of[-1,1])BX(g,.2,2.8,.2,0x2a4f9e,x+k*1.6,1.4,z);BX(g,3.4,.15,.15,0x2a4f9e,x,2.8,z);for(const k of[-.6,.6]){BX(g,.05,1.6,.05,0x999999,x+k,2,z);BX(g,.5,.1,.3,0xd62828,x+k,1.2,z)}}
 BX(g,.2,2.2,3,0xf2c200,-6,1.1,-10);const sl=BX(g,.8,.15,4,0xd62828,-6,1.5,-7.6);sl.rotation.x=.55;
 BX(g,5,.2,5,0x7a5a3c,12,3.2,8);for(const[a,b]of[[-2,-2],[2,-2],[-2,2],[2,2]])BX(g,.25,3.2,.25,0x7a5a3c,12+a,1.6,8+b);bench(g,12,8,0);
 for(let i=0;i<10;i++){treeAt(S,-w/2+3+i*(w-6)/9,d/2-2,.95)}for(let i=1;i<7;i++){treeAt(S,-w/2+2,-d/2+2+i*(d-4)/7,.95);treeAt(S,w/2-2,-d/2+2+i*(d-4)/7,.95)}
 for(const[x,z,r]of[[0,-2,0],[0,10,0]])bench(g,x,z,r);lamp(g,-8,-d/2+3);lamp(g,8,-d/2+3);
 signAt(g,'TARIQ PARK',0,5.4,-d/2-.4,22);const p=lm2Place(S,it,{r:34,kind:'park',tour:true});return S}
// ---------- supermarkets ----------
function mLogo(g,x,y,z,sz,col){const L=BX(g,.7*sz,3.2*sz,.3,col,x-1.2*sz,y,z),R=BX(g,.7*sz,3.2*sz,.3,col,x+1.2*sz,y,z),a=BX(g,.7*sz,2.2*sz,.3,col,x-.45*sz,y+.5*sz,z),b=BX(g,.7*sz,2.2*sz,.3,col,x+.45*sz,y+.5*sz,z);a.rotation.z=-.5;b.rotation.z=.5}
function superBuild(S,c){const g=S.g,w=S.w,d=S.d,h=c.h,fz=-d/2;
 BX(g,w,h,d,c.body,0,h/2,0);BX(g,w+.6,.8,d+.6,0x3b3e44,0,h+.4,0);BX(g,w*.95,2,.5,c.accent,0,h-1.5,fz-.3);
 BX(g,w*.62,4.2,.4,GLM,0,2.5,fz-.1);for(let i=-2;i<=2;i++)BX(g,.15,4.2,.15,0x15171b,i*w*.12,2.5,fz-.2);
 BX(g,w*.34,.4,5,c.accent,0,5.3,fz-2.5);for(const k of[-1,1])BX(g,.4,5.2,.4,0x9aa0a6,k*w*.16,2.6,fz-4.6);
 for(const k of[-1,1]){BX(g,w*.14,3,.3,0xf4f4f4,k*w*.42,2.2,fz-.1)}
 if(c.m){mLogo(g,-w*.38,h+2.6,fz-.4,c.m,c.accent)}
 if(c.neon)BX(g,w*.8,.5,.4,BMB(0xff3b30),0,h+.1,fz-.55);
 if(c.pylon){BX(g,.6,14,.6,0x2a2d33,w/2+3,7,fz-3);BX(g,6,3.4,.4,BMB(c.accent),w/2+3,14.6,fz-3);signAt(g,c.short||c.name.toUpperCase(),w/2+3,17.6,fz-3,16)}
 const pk=S.set-3;BX(g,w,.12,pk,0x34363b,0,.08,fz-pk/2-1);for(let i=-Math.floor(w/3.4/2);i<=Math.floor(w/3.4/2);i++)bxi(S,i*3.4,.14,fz-pk*.55-1,.22,.04,Math.min(5,pk*.5),0xf2f2f2);
 for(let i=0;i<(c.carts||3);i++)BX(g,1.3,.9,.8,0xb0b6bd,-w*.3+i*1.5,.5,fz-2.5);
 for(const k of[-1,1])lamp(g,k*(w/2-1),fz-pk*.7);
 (c.cars||[]).forEach(([a,b],i)=>showCar(S,a,fz-pk*.62,b,SHOWN[(i+2)%SHOWN.length],SHOWC[(i+3)%SHOWC.length]));
 for(let i=0;i<Math.max(2,Math.floor(w/9));i++)BX(g,2.2,1.2,2.2,0x9aa0a6,-w/2+4+i*9,h+1.2,0);
 if(c.saw)for(let i=0;i<5;i++){const s2=BX(g,w*.8,1.2,3,0x6fb1d8,0,h+1.6,-d*.3+i*d*.14);s2.rotation.x=.5}
 signAt(g,c.name.toUpperCase(),0,h+(c.sy||3.6),fz-.9,Math.min(34,Math.max(18,w*.9)))}
const SUPER_CFG={
 mk_supermarket_hq:{anchors:[['@',...RLP(/^MK /,U(700))],['University Street',...U(700)],['University Street',...U(620)],['University Street',...U(900)]],w:34,d:22,set:18,h:9,body:0xf2efe6,accent:0xd62828,pylon:true,carts:5,cars:[[-10,.1],[8,-.1]],short:'MK SUPER MARKET',kind:'grocery',r:30},
 m_market_balad:{zone:'Al-Balad Old Core',w:14,d:13,set:3,h:6,body:0xf0e6d0,accent:0x2e8b57,m:1.1,kind:'grocery',r:14},
 m_market_petra:{zone:'Petra Street Highway Expansion',w:24,d:16,set:12,h:6.6,body:0xe9eef2,accent:0x2e8b57,m:1.5,neon:true,pylon:true,carts:4,cars:[[-6,0]],short:'M MARKET 24/7',kind:'grocery',r:22},
 m_market_thataheen:{anchors:[['Thalatheen Street',...O(-1308,600)],['Thalatheen Street',...O(-1296,914)],['Thalatheen Street',...O(-1230,170)]],zone:'Thalatheen Street Inner Beltway',w:20,d:15,set:9,h:6,body:0xf4f1ea,accent:0x2e8b57,m:1.3,carts:3,kind:'grocery',r:20},
 m_market_aidun:{zone:'Aidun Suburbs',w:17,d:14,set:7,h:5.6,body:0xefe9da,accent:0x2e8b57,m:1.2,carts:3,kind:'grocery',r:18},
 sameh_mall_thqafah:{anchors:[['@',...RLP(/سامح مول/,U(2440))],['University Street',...U(2440)],['Amman–Irbid Highway (Route 35)',...O(843,2640)],['University Street',...U(2300)],['Amman–Irbid Highway (Route 35)',...O(843,2900)]],w:84,d:50,set:34,h:12,body:0xe9e4d8,accent:0xf2a900,pylon:true,carts:8,saw:true,cars:[[-26,.2],[-10,-.2],[10,.2],[26,0]],short:'SAMEH MALL',kind:'grocery',r:58,sy:5},
 ctown_irbid_branch:{anchors:[['Thalatheen Street',...O(-1048,-119)],['Thalatheen Street',...O(-954,-264)],['Thalatheen Street',...O(-1141,42)]],zone:'Thalatheen Street',w:26,d:18,set:12,h:7,body:0xf3f1ee,accent:0xc0392b,pylon:true,carts:4,cars:[[-6,0]],short:'C-TOWN',kind:'grocery',r:26},
 irbid_mall_hypermarket:{anchors:[['Amman–Irbid Highway (Route 35)',...O(843,2800)],['Amman–Irbid Highway (Route 35)',...O(780,3300)],['Amman–Irbid Highway (Route 35)',...O(843,3000)]],w:58,d:36,set:26,h:10,body:0xe3ddd0,accent:0x1f4aa8,pylon:true,carts:6,saw:true,cars:[[-18,.2],[0,0],[18,-.2]],short:'IRBID MALL HYPERMARKET',kind:'grocery',r:44,sy:4.4}};
function buildSuper(it){const c=SUPER_CFG[it.id];let S;
 if(c.anchors)S=siteTry(c.anchors,c.w,c.d,c.set,{pad:1.6});else S=packSite(it.zone,c.w,c.d,c.set,{});
 superBuild(S,Object.assign({name:it.name},c));
 const p=poiAt(S,it.name,{r:c.r,kind:'grocery',tag:it.zone,sub:it.type+' · '+it.zone,tour:c.w>=40});p.alias=it.id.replace(/_/g,' ')+' '+it.name.replace(/-/g,'');SPAWNKEEP.push([S.cx,S.cz,Math.max(c.w,c.d)*.7]);return S}
function buildHyperMax(it){const S=CCP.S;if(!S)throw new Error('Irbid City Center missing');const g=grp(S.cx,0,S.cz,S.ry),d=58;
 BX(g,34,3.2,.5,0x1f4aa8,33,8,-d/2-.4);BX(g,34.6,.4,.7,0xffffff,33,9.8,-d/2-.45);BX(g,34.6,.4,.7,0xd62828,33,6.2,-d/2-.45);
 BX(g,9,.14,7,0x1c1e21,-34,.14,-d/2-4);BX(g,9.4,.3,.3,BMB(0xffd24a),-34,.3,-d/2-.5);for(let i=0;i<4;i++)BX(g,8,.1,.5,0x45484e,-34,.15+i*.04,-d/2-1.5-i*1.6);
 BX(g,7,3.4,.4,GLM,-34,2.4,-d/2-.1);BX(g,2.4,.9,.4,BMB(0x2a9df4),-34,5.4,-d/2-.3);
 signAt(g,'HYPERMAX / CARREFOUR',33,12.4,-d/2-.9,30);signAt(g,'HYPERMAX · FLOOR B1 ▼',-34,8.6,-d/2-1,16);
 const q=wl(S,-34,-d/2-6),p=addPlace(it.name,q[0],q[1],{r:22,kind:'grocery',tag:it.zone,sub:it.type+' · '+it.zone,tp:S.tp,tour:false});p.alias='hypermax carrefour hypermarket b1';return p}
const LM2_BUILD={dar_as_saraya_museum:buildDarSaraya,arars_cultural_house:buildBeitArar,the_nabulsi_house:buildNabulsi,irbid_clock_tower_square:buildClockSquare,wasfi_at_tal_square:buildWasfiSquare,eimar_irbid_park:buildEimarPark,tariq_park:buildTariqPark,hypermax_carrefour_icc:buildHyperMax};
function runLandmarks(){const all=[].concat(missing_google_maps_landmarks.historical_and_cultural_sites,missing_google_maps_landmarks.urban_squares_and_parks,ultimate_irbid_supermarket_patch.requested_landmarks,ultimate_irbid_supermarket_patch.missing_real_world_irbid_mega_grocery_chains).filter(it=>!(REALP&&/^(m_market_|ctown_|irbid_mall_hypermarket|hypermax_|tariq_park)/.test(it.id)));
 // big plots first
 const ord=it=>SUPER_CFG[it.id]&&SUPER_CFG[it.id].w>=50?0:LM2_BUILD[it.id]===buildDarSaraya?1:SUPER_CFG[it.id]?2:3;all.sort((a,b)=>ord(a)-ord(b));
 for(const it of all){try{(LM2_BUILD[it.id]||buildSuper)(it);LM2_OK.push(it.name)}catch(e){LM2_FAIL.push(it.name+': '+(e&&e.message||e))}}}
runLandmarks();runPack();
