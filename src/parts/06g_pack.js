// ---- gyms + 200-place expansion pack: placed by zone parameter, labelled by real name as the car passes ----
const DZONES=[{name:'Al-Hassan Drift Zone',x:SC[0],z:SC[1],r:DZR+30}],LAZYL=[],PACK_FAIL=[],PACK_OK=[];
const IRBID_GYMS=[
 {name:'Oxygen Gym',type:'Mega Fitness Center',zone:'University Street District',description:'High-volume bodybuilding and cardio club popular among students.'},
 {name:'Glow Gym & Spa',type:'Premium Health Club',zone:'Al-Hai Al-Gharbi',description:'Modern multi-level training venue with dedicated workout rooms.'},
 {name:'Power House Gym',type:'Hardcore Weight Training Center',zone:'Thalatheen Street Corridor',description:'Known for heavy powerlifting sets and classic strength layouts.'},
 {name:"Gold's Gym Irbid (Simulated)",type:'Franchise Health Complex',zone:'Near Irbid City Center',description:'Sprawling luxury fitness hub with open glass windows looking out at the main street.'},
 {name:'Champion Fitness Center',type:'Martial Arts & Strength Gym',zone:'Baghdad Street Axis',description:'Combines dynamic kickboxing rings with heavy iron weight sections.'},
 {name:'Iron Body Club',type:'Neighborhood Strength Garage',zone:'Al-Barha District',description:'A high-density ground-floor training spot packed with veteran local lifters.'}];
// explicit entries: [name,type,zone]; the "procedural loop" entries are generated below under the names the dataset gives
const EXPANSION_PACK={
 food_and_beverage_hubs_50_places:[
  ['Shawerma Reem Irbid','Fast Food Anchor','University Street'],['Al-Sultan Bakeries','Mega Bakery Hub','Thalatheen Street'],['Falafel Arafa','Historic Breakfast Joint','Al-Balad Core'],['Zanjabeel Cafe','Student Study Lounge','University Street'],
  ['Crepe & Waffle Corner','Dessert Shop Frontage','University Circle'],['Burger Joint 962','Local Burger Shop','Al-Hussein Quarter'],['Pizza Corner Irbid','Pizzeria Grid Block','Palestine Street'],['Al-Dallah Arabic Coffee','24/7 Drive-by Kiosk','Amman-Irbid Highway Corridor'],
  ['Shahrezad Restaurant','Traditional Grills House','Al-Balad Old Souk'],['Bun & Coffee Lab','Specialty Espresso Bar','New Petra Street Developments'],['Shawerma Sajiyyah','Corner Wrap Shop','Nabulsi Circle Area'],['Ice Cream Tamriyeh','Traditional Sweet Vendor','Al-Hai Al-Gharbi'],
  ['The Crispy Box','Fried Chicken Joint','King Abdullah II Street'],['Abu Mahjoub Falafel','Neighborhood Diner Counter','Al-Barha Quarter'],['Juice World Irbid','Fresh Fruit Juice Stand','Thaqafah Circle Junction'],['Al-Mandi Royal Restaurant','Large Format Rice & Meat Dining','Petra Street'],
  ['The Daily Grind Cafe','Laptop-Friendly Workspace','Near Yarmouk University Wall'],['Shawerma Al-Reef','High-Volume Fast Food Strip','Hakama Street Corridor'],['Bakery Al-Karama','Local Flatbread Stone Oven','Al-Nuzha Residential Area'],['Al-Hana Kunafa','Pastry Shop Anchor','Al-Balad Core']],
 automotive_retail_and_repair_40_places:[
  ['Al-Taqaddum Auto Parts','Mechanical Components Retailer','Hakama Industrial Artery'],['Spark Plug Center','Electrical Auto Shop','Baghdad Street Axis'],['Al-Awaiel EV Battery Hub','Electric Vehicle Specialist Station','Petra Street Corridor'],['The Drift Mechanic Garage','Custom Tuning Shop Visual Clutter','Thalatheen Street Bypass'],
  ['Al-Jazirah Tire Matrix','Alloy Wheel & Alignment Center','Hakama Street'],['Shabab Al-Lail Car Accessories','Neon & Aesthetic Tuning Store','University Street Sector'],['Al-Waha Window Tint Studio','Styling & Wrap Facility','King Hussein Street'],['EcoCharge Station Irbid','Rapid EV Charging Node Plaza','Near Irbid City Center'],
  ['Al-Raya Used Luxury Cars','Premium Vehicle Trade Lot','New Petra Developments'],['Al-Sareeh Body Shop Complex','Structural Repair Lot','Al-Sareeh Road Interface'],['Turbo Garage Irbid','Performance Parts Warehouse','Industrial Zone Frontier']],
 neighborhood_dukkans_and_grocers_40_places:[
  ['Mini-Market Abu Khaled','Ground-Floor Corner Shop','Al-Barha Cluster'],['Al-Yasmeen General Store','Residential Grocery Unit','Al-Nuzha Alleys'],['Al-Rayan Roastery & Market','Snack & Seed Boutique Storefront','Palestine Street Axis'],['Family Choice Supermarket','Mid-Size Fresh Grocery Market','Aidun Suburbs Grid'],
  ['Al-Madina Stationery & Books','Student Accessory Storefront','University Street Side'],['Al-Huda Household Hardware','Neighborhood Supplies Depot','Thalatheen Street Matrix'],['The Green Basket','Fresh Fruit & Vegetable Corner Market','Al-Balad Core']],
 civic_services_medical_and_education_40_places:[
  ['Irbid Central Pharmacy','24/7 Medical Visual Anchor','University Circle Node'],['Al-Razi Medical Laboratory','Clinic Block Infrastructure','Al-Hai Al-Gharbi'],['Jordan Post Office - Yarmouk Branch','Civic Utility Unit','Near YU South Campus Gate'],['Al-Hasan Mosque Square','Religious Structural Monument','Al-Balad Cultural Core'],
  ['Al-Ameen Private Preschool','Fenced Primary Institutional Block','Al-Hussein Quarter'],['Irbid Cultural Center Auditorium','Geometric Civic Building Asset','Al-Thaqafah Circle Link'],['Al-Sareeh Comprehensive Clinic','Suburban Healthcare Landmark','Al-Sareeh District Edge']],
 salons_pet_places_and_recreation_30_places:[
  ['The Barber Lounge',"Premium Men's Grooming Lounge",'University Street'],['Salon Golden Scissors','Modern Multi-Seat Barber','New Petra Street'],['Corner Salon for Men','Local Guide Approved Barber','Map Intersection Corner'],['Irbid Pet Supplies Boutique','Animal Feed & Cages Retailer','Thalatheen Street Layout'],
  ['Al-Shifa Veterinary Pharmacy','Animal Care Medical Unit','Near Agricultural Sectors'],['Al-Nuzha Fenced Football Cage','Asphalt Sports Pitches','Al-Nuzha Recreation Park'],['Yarmouk Stadium Overflow Lot','Wide Open Asphalt Drifting Arena','YU Eastern Boundary Track']]};
// procedural loop entries: [prefix,count,type,category,zone pool]
const PZ={food:['University Street','Palestine Street','Al-Balad Core','Thalatheen Street','Baghdad Street','King Hussein Street','Petra Street','Al-Hai Al-Gharbi','Hakama Street','King Abdullah II Street'],
 auto:['Hakama Street','Baghdad Street Axis','Thalatheen Street','Petra Street Corridor','King Hussein Street','Al-Sareeh Road','University Street Sector'],
 res:['Al-Barha Cluster','Al-Nuzha Alleys','Palestine Street','Aidun Suburbs Grid','Thalatheen Street','Al-Balad Core','Al-Hussein Quarter','Al-Hai Al-Gharbi','University Street Side'],
 civ:['Al-Hussein Quarter','Aidun Suburbs Grid','Al-Nuzha Residential Area','Al-Hai Al-Gharbi','Al-Barha Quarter','Petra Street','Palestine Street','Al-Sareeh District Edge','University Circle Node'],
 sal:['University Street','New Petra Street','Palestine Street','Baghdad Street','Al-Balad Core','Thalatheen Street','King Hussein Street','Al-Nuzha Residential Area']};
const PROC=[['Shawerma Spot',10,'Fast Food Strip','food',PZ.food],['Cafe Link',10,'Neighborhood Cafe','cafe',PZ.food],['Sweet House',10,'Sweets & Pastry Counter','food',PZ.food],
 ['Auto Dealership Box',15,'Dealership Showroom Box','dealer',PZ.auto],['Spare Parts Counter',14,'Spare Parts Counter','auto',PZ.auto],
 ['Dukkan Unit',20,'Ground-Floor Dukkan','dukkan',PZ.res],['Supermarket Box',13,'Neighborhood Supermarket','dukkan',PZ.res],
 ['School Facility Block',15,'School Facility Block','school',PZ.civ],['Clinic Facility',18,'Clinic Facility','medical',PZ.civ],
 ['Neighborhood Barber Shop',12,'Neighborhood Barber','salon',PZ.sal],['Pet Storefront',11,'Pet Storefront','pet',PZ.res]];
// ---- category from name / type ----
const SPECIAL={'EcoCharge Station Irbid':'ev!','Al-Hasan Mosque Square':'mosque!','Irbid Cultural Center Auditorium':'culture!','Al-Nuzha Fenced Football Cage':'cage!','Yarmouk Stadium Overflow Lot':'lot!','Corner Salon for Men':'skip'};
function packCat(n,t){if(SPECIAL[n])return SPECIAL[n];const s=n+' '+t;
 if(/Pharmacy|Laborator|Clinic|Veterinary/.test(s))return'medical';if(/School|Preschool/.test(s))return'school';if(/Post Office/.test(s))return'civic';
 if(/Barber|Salon/.test(s))return'salon';if(/Pet |Pet$/.test(s))return'pet';if(/Dealership|Used Luxury/.test(s))return'dealer';if(/EV |Charging/.test(s))return'ev';
 if(/Auto|Garage|Tire|Tint|Accessories|Body Shop|Spark Plug|Turbo|Parts/.test(s))return'auto';
 if(/Market|Store|Basket|Stationery|Hardware|Supermarket|Dukkan|Roastery/.test(s))return'dukkan';if(/Cafe|Coffee|Espresso|Lounge/.test(s))return'cafe';return'food'}
// ---- seeded RNG so placement is the same on every load ----
let PSEED=20250611;const PR=()=>{PSEED|=0;PSEED=PSEED+0x6D2B79F5|0;let t=Math.imul(PSEED^PSEED>>>15,1|PSEED);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const PRR=(a,b)=>a+PR()*(b-a),PPK=a=>a[(PR()*a.length)|0];
// ---- zone -> street resolver ----
function rpAt(name,a,span){const[r,i0]=nearestOn(name,a[0],a[1]);let i=i0;const dir=PR()<.5?-1:1,tg=PR()*span;let acc=0;while(i+dir>=0&&i+dir<r.dp.length&&acc<tg){const p=r.dp[i],q=r.dp[i+dir];acc+=Math.hypot(q[0]-p[0],q[1]-p[1]);i+=dir}return r.dp[i]}
function rpAny(name){const R=RDS.filter(r=>r.name===name&&r.dp);let tot=0;R.forEach(r=>tot+=r.dp.length);let k=(PR()*tot)|0;for(const r of R){if(k<r.dp.length)return r.dp[k];k-=r.dp.length}return R[0].dp[0]}
const ZRULES=[
 [/amman.irbid highway/,()=>({n:'Amman–Irbid Highway (Route 35)',p:rpAt('Amman–Irbid Highway (Route 35)',O(843,2900),500)})],
 [/yarmouk university wall|yu south campus gate/,()=>{const p=rpAt('University Street',U(1496),70);return{n:'University Street',p,ok:(x,z)=>uvOf(x,z)[1]<0}}],
 [/university circle/,()=>({n:'University Street',p:rpAt('University Street',U(1400),40)})],
 [/thaqafah/,()=>({n:'University Street',p:rpAt('University Street',U(2350),60)})],
 [/student strip/,()=>({n:'University Street',p:rpAt('University Street',U(1350),550)})],
 [/university/,()=>({n:'University Street',p:rpAt('University Street',U(500),1000)})],
 [/nabulsi/,()=>{const n=PR()<.5?'Baghdad Street':'Palestine Street';return{n,p:rpAt(n,O(-470,40),90)}}],
 [/al-balad/,()=>{const n=PPK(['Palestine Street','Baghdad Street','Souq Al-Balad Lane','Al-Hammam Lane','Al-Khabbaz Lane','Old Mosque Lane','Clock Tower Lane','Al-Sagha Lane']);return{n,p:rpAt(n,O(180,-20),450)}}],
 [/thalatheen/,()=>({n:'Thalatheen Street',p:rpAny('Thalatheen Street')})],
 [/petra/,()=>({n:'Petra Street',p:rpAt('Petra Street',O(1800,-200),700)})],
 [/palestine/,()=>({n:'Palestine Street',p:rpAny('Palestine Street')})],
 [/baghdad/,()=>({n:'Baghdad Street',p:rpAny('Baghdad Street')})],
 [/king hussein/,()=>({n:'King Hussein Street',p:rpAny('King Hussein Street')})],
 [/king abdullah/,()=>({n:'King Abdullah II Street',p:rpAny('King Abdullah II Street')})],
 [/hakama|industrial/,()=>({n:'Hakama Street',p:rpAny('Hakama Street')})],
 [/hai al-gharbi/,()=>({n:'Al-Hai Al-Gharbi Road',p:rpAny('Al-Hai Al-Gharbi Road')})],
 [/nuzha/,()=>({n:'Al-Nuzha Street',p:rpAny('Al-Nuzha Street')})],
 [/barha/,()=>{const n=PPK(['Al-Thawra Street','Al-Wehdat Street','Al-Hai Street']);return{n,p:rpAny(n)}}],
 [/hussein quarter/,()=>({n:'Al-Mohandseen Street',p:rpAny('Al-Mohandseen Street')})],
 [/aidun suburb|aidun/,()=>{const n=PPK(['Aidun Main Street','Aidun Garden Street','Aidun Hills Street','Aidun South Street']);return{n,p:rpAny(n)}}],
 [/city center/,()=>({n:'Aidun South Street',p:rpAt('Aidun South Street',O(3250,640),250)})],
 [/agricultural/,()=>({n:'Al-Sareeh Road',p:rpAt('Al-Sareeh Road',O(3800,2480),400)})],
 [/sareeh/,()=>({n:'Al-Sareeh Road',p:rpAny('Al-Sareeh Road')})],
 [/husun|husn|hisn/,()=>({n:'Al-Husn Street',p:rpAny('Al-Husn Street')})]];
function zoneTarget(zone){const z=zone.toLowerCase();for(const[re,f]of ZRULES)if(re.test(z))return f();return{n:'Baghdad Street',p:rpAny('Baghdad Street')}}
// place a building of w x d (set = forecourt depth) for a zone; retries other points on failure
const SATC=new Set(),FBR=['Al-Hurriya Street','Al-Rawda Street','Al-Zahra Street','Al-Andalus Street','Al-Salam Street','Al-Quds Street','Al-Tijari Street','Al-Mukhayyam Street','Al-Mohandseen Street','Al-Hai Street','Al-Wehdat Street','Al-Thawra Street','Aidun Garden Street','Aidun Hills Street','Aidun Main Street','Al-Sultan Street','Baghdad Street','Palestine Street','King Hussein Street'];
function packSite(zone,w,d,set,o){o=Object.assign({},o||{});const FB=o.fbr||FBR;delete o.fbr;let err,a=0;for(let t=0;t<80&&a<9;t++){let T0=zoneTarget(zone),fb=a>=6||t>=14;if(fb){const n=PPK(FB);T0={n,p:rpAny(n)}}const key=T0.n+'|'+Math.round(T0.p[0]/110)+','+Math.round(T0.p[1]/110)+(w>30?'L':'S');if(SATC.has(key))continue;a++;
  try{return siteBeside(T0.n,T0.p[0],T0.p[1],w,d,set,Object.assign({},o,T0.ok&&!fb?{ok:T0.ok}:{}))}catch(e){err=e;SATC.add(key)}}throw err||new Error('no free plot for '+zone)}
// ---- lazy name label above the entrance (created when the car is within 130 m) ----
function lazyLabel(p,S,txt,y,w,fz){const q=wl(S,0,-S.d/2-(fz===undefined?.9:fz));p.lbl={x:q[0],y,z:q[1],w,t:txt};LAZYL.push(p)}
// ---- generic freestanding shop built from instanced boxes ----
const CATSTY={
 food:{w:[9,12],d:[11,13],h:[5.5,8],sign:[0xc0392b,0xd35400,0xe67e22],body:[0xe9dcc0,0xdccfb0,0xf1e7cf]},
 cafe:{w:[9,11],d:[11,12],h:[5.5,7],sign:[0x6f4e37,0x2f6f5f,0x8e5b3a],body:[0xefe6d4,0xe0d4bf]},
 auto:{w:[12,15],d:[12,14],h:[4.8,5.6],sign:[0x2a2d33,0x1f4a8c,0xd9a000],body:[0xc7cacf,0xb6bac1]},
 dealer:{w:[20,24],d:[13,15],h:[6,7],sign:[0x1f4a8c,0xc3002f,0x2a2d33],body:[0xf2f3f5,0xe3e5e8]},
 dukkan:{w:[8,10],d:[10,12],h:[4.2,6.4],sign:[0x2e8b57,0xf2c200,0xd35400,0x1f6fb5],body:[0xe8e0cc,0xd9cdb0,0xf0e9dc]},
 supermarket:{w:[15,18],d:[13,15],h:[5,5.8],sign:[0xd62828,0x2e8b57],body:[0xf0ece2]},
 school:{w:[22,26],d:[14,16],h:[8.8,10],sign:[0x1f4a8c,0x2f6fb5],body:[0xf3ecd9,0xe9dfc3]},
 medical:{w:[14,18],d:[11,13],h:[7.5,9],sign:[0x1f8f4e,0x2a9d8f],body:[0xf4f6f6,0xe4eaea]},
 salon:{w:[8.5,10],d:[10,11],h:[4.4,5.2],sign:[0x1f4fa8,0x7a1f8f],body:[0xf4f1ea,0xe8e2d6]},
 pet:{w:[9,11],d:[10,11],h:[4.4,5.2],sign:[0x1f8f4e,0xe67e22],body:[0xf0ead8,0xe6e0cc]},
 ev:{w:[13,15],d:[12,13],h:[5,5.6],sign:[0x2ecc71,0x1abc9c],body:[0xe9eef0]},
 civic:{w:[14,16],d:[11,12],h:[6,6.6],sign:[0xc0392b],body:[0xe3dccb]},
 gym:{w:[12,15],d:[12,13],h:[5.6,6.6],sign:[0xe63946,0x19c3ff,0xff8a00],body:[0x3a3f47,0x2b2f36]}};
const CATK={gym:'gym',food:'food',cafe:'cafe',auto:'auto',dealer:'dealer',dukkan:'dukkan',school:'school',medical:'medical',salon:'barber',pet:'pet',ev:'ev',civic:'civic'};
const SHOWN=['Ford Mustang GT','Ford Fiesta ST','Ford Focus RS','Ford Taurus SHO','Porsche 911','Ford F-150 Raptor'],SHOWC=[0xd62828,0xf0a020,0x1f6fe0,0x1d1d1d,0xc9ced3,0xffffff];
const PSTY={gym:7,food:2,cafe:2,auto:7,dealer:2,dukkan:2,supermarket:2,school:6,medical:6,salon:2,pet:2,ev:2,civic:6};
function packShop(it){if(REALP)return null;const ck=it.cat==='dukkan'&&/Supermarket/.test(it.name+it.type)?'supermarket':it.cat,C=CATSTY[ck],w=PRR(C.w[0],C.w[1]),d=PRR(C.d[0],C.d[1]),h=PRR(C.h[0],C.h[1]),dl=it.cat==='dealer',set=dl?13:3.2,
  S=packSite(it.zone,w,d,set,{nogrp:true,sides:undefined,fbr:it.fbr}),body=PPK(C.body),sc=PPK(C.sign),hw=w/2;
 const B=(lx,y,lz,ww,hh,dd,col)=>bxi(S,lx,y,lz,ww,hh,dd,col),FZ=-d/2;
 const ps=PSTY[ck]||2;bxf(S,0,h/2,0,w,h,d,body,ps,-1,dl?3.7:3.0);B(0,h+.3,0,w+.5,.6,d+.5,0x8d8f94);
 let q=wl(S,0,FZ-.1);if(!GFX.on||ps!==2)SHOPI.push([q[0],dl?1.9:1.6,q[1],S.ry,w*(dl?.9:.84),dl?3.6:2.8,.2,0x1c3a46]);
 q=wl(S,0,FZ-.18);SIGNI.push([q[0],dl?4.6:3.55,q[1],S.ry,w*.92,dl?1.4:1.1,.4,sc]);
 for(const k of[-1,1]){q=wl(S,k*(hw-1.2),FZ-.6);AWN.push([q[0],dl?3.7:3.0,q[1],S.ry,w*.34,.12,1.1,PPK([0xc0392b,0x1f4a8c,0x2e8b57,0xf2c200])])}
 if(!GFX.on&&h>6&&ck!=='school')for(let i=0;i<3;i++){q=wl(S,-w*.28+i*w*.28,FZ-.08);WINI.push([q[0],h-2.2,q[1],S.ry,1.2,1.4,.14,0x25303a])}
 if(ck==='school'){if(!GFX.on)for(let f=0;f<2;f++)for(let i=0;i<5;i++){q=wl(S,-w*.38+i*w*.19,FZ-.08);WINI.push([q[0],4.4+f*3.2,q[1],S.ry,1.6,1.6,.14,0x2a3a48])}B(0,h+.9,0,w*.5,1.2,d*.5,0x1f4a8c)}
 if(ck==='salon')for(let k=0;k<4;k++){q=wl(S,hw-.7,FZ-.55);POLES.push([q[0],1.5+k*.3,q[1],0,1,1,1,[0xd62828,0xffffff,0x1f4fe0,0xffffff][k]])}
 if(ck==='pet'){q=wl(S,-hw*.78,FZ-.5);PAWS.push([q[0],3.5,q[1],S.ry,.34,.28,.12,0xffffff]);[[-.3,.28],[-.1,.38],[.1,.38],[.3,.28]].forEach(t=>{q=wl(S,-hw*.78+t[0]*1.2,FZ-.5);PAWS.push([q[0],3.5+t[1]*1.1,q[1],S.ry,.11,.13,.1,0xffffff])})}
 if(ck==='medical'){B(w*.3,h-2,FZ-.2,.8,3,.2,0x1f8f4e);B(w*.3,h-2,FZ-.2,3,.8,.2,0x1f8f4e);B(w*.3,h-2,FZ-.12,3.6,3.6,.1,0xffffff)}
 if(ck==='auto'||ck==='ev'){for(let i=0;i<3;i++){q=wl(S,hw-1.2-i*1.6,FZ-set*.55);TANKS.push([q[0],.6+(i%2)*1.2,q[1]])}B(-hw+1.6,1.2,FZ-1.1,2,2.4,1.2,0x3d4048);if(ck==='ev'){B(0,h+.9,FZ-.1,w*.7,.4,.3,0x2ecc71)}}
 if(ck==='dukkan'||ck==='supermarket'){for(let i=0;i<3;i++)B(-hw*.55+i*1.3,.45,FZ-1.2,1.1,.9,.9,PPK([0xd9822b,0x7a5a3c,0xc0392b]))}
 if(ck==='food'||ck==='cafe'){for(let i=0;i<2;i++){q=wl(S,-hw*.5+i*2.8,FZ-2);BOXI.push([q[0],.5,q[1],0,.9,.1,.9,0xf4efe2]);TRUNK.push([q[0],.25,q[1],0,.1,.5,.1])}}
 if(ck==='gym'){B(0,h+.9,FZ-.1,w*.8,.4,.3,0xff3b30);B(-hw*.55,h*.5,FZ-.1,.8,2.2,.2,0xffffff);B(-hw*.55-1.1,h*.5,FZ-.1,.8,.6,.2,0xffffff);B(-hw*.55+1.1,h*.5,FZ-.1,.8,.6,.2,0xffffff)}
 if(ck==='civic'){q=wl(S,hw+.6,FZ-.5);TRUNK.push([q[0],4,q[1],0,.12,8,.12]);B(hw+1.5,7,FZ-.5,1.8,1.1,.05,0xc0392b)}
 if(dl){const n=2+((PR()*2)|0);for(let i=0;i<n;i++){const k=(PR()*SHOWN.length)|0;showCar(S,-w*.25+i*w*.35,FZ-6.5,(i%2?.25:-.25),SHOWN[k],SHOWC[(k+i)%SHOWC.length])}}
 const P0=addPlace(it.name,S.cx,S.cz,{r:Math.max(w,d)*.7+7,kind:CATK[it.cat]||'poi',tag:it.zone,sub:it.type+' · '+it.zone,tp:S.tp});P0.gen=!!it.gen;
 lazyLabel(P0,S,it.name.toUpperCase(),dl?7:5.3,Math.min(15,Math.max(8.5,w*1.05)));return S}
// ---- custom structural venues ----
const FENCE_M=new T.MeshLambertMaterial({color:0x9aa0a6,transparent:true,opacity:.4});
function wallC(S,lx,lz,ww,dd){const q=wl(S,lx,lz);boxCol(q[0],q[1],ww,dd,S.ry)}
function gymBuild(G){if(REALP)return;const cfg={'Oxygen Gym':[36,22,12,0x2b2f36,0x19c3ff],'Glow Gym & Spa':[28,20,13,0xefe3ee,0xff4fd8],'Power House Gym':[30,20,10,0x7a3a2a,0xff3b30],"Gold's Gym Irbid (Simulated)":[40,24,12,0xf3f1ea,0xffc400],'Champion Fitness Center':[30,20,10,0x1d3557,0x4da3ff],'Iron Body Club':[20,14,6.5,0x4a4d54,0xff8a00],'Hydrogen Plus Fitness & Spa (Hydrogym)':[32,22,12,0xe6f2f5,0x00c2d1]}[G.name]||[30,20,11,0x2b2f36,0xff4d6d];
 const[w,d,h,bc,ac]=cfg,iron=G.name==='Iron Body Club',S=packSite(G.zone,w,d,iron?8:14,{}),g=S.g;
 BX(g,w,h,d,bc,0,h/2,0);BX(g,w+.8,.8,d+.8,0x1d1f24,0,h+.4,0);
 if(iron){BX(g,12,4.4,.4,0x90959c,-2,2.4,-d/2-.1);for(let i=0;i<8;i++)BX(g,12,.12,.45,0x6b7077,-2,.8+i*.5,-d/2-.12);BX(g,5,3,.3,GLM,7,2.4,-d/2-.1)}
 else{BX(g,w*.78,h*.55,.4,GLM,0,h*.36,-d/2-.1);BX(g,w*.78,.35,.5,0x15171b,0,h*.36+h*.275,-d/2-.15);for(let i=0;i<7;i++)BX(g,.15,h*.5,.15,0x15171b,-w*.34+i*w*.113,h*.36,-d/2-.2);BX(g,w*.62,2.2,.3,BMB(0xfff4cf),0,h*.2,-d/2+.2)}
 BX(g,w-1,1.5,.5,BMB(ac),0,h-1.1,-d/2-.45);for(const k of[-1,1])BX(g,.4,h-1,d,BMB(ac),k*(w/2+.25),h/2,0);
 BX(g,.4,12,.4,0x2a2d33,w/2+3.5,6,-d/2-3);BX(g,5.5,3.2,.3,BMB(ac),w/2+3.5,12.8,-d/2-3);
 if(G.name==='Champion Fitness Center'){BX(g,8,.5,8,0x1f4fe0,-8,h+1,2);for(const[a,b]of[[-4,-4],[4,-4],[-4,4],[4,4]])BX(g,.25,1.6,.25,0xdddddd,-8+a,h+1.9,2+b);for(const y of[1.5,2.1,2.7])BX(g,8,.08,.08,0xd62828,-8,h+y,-2)}
 else if(!iron){CY(g,.18,.18,5,0x9aa0a6,0,h+2.8,0,8).rotation.z=Math.PI/2;for(const k of[-1,1])CY(g,1.1,1.1,.7,0x23262b,k*2.6,h+2.8,0,10).rotation.z=Math.PI/2}
 BX(g,w,.12,S.set-3,0x34363b,0,.08,-d/2-(S.set-3)/2-1);for(let i=-5;i<=5;i++)bxi(S,i*3.4,.14,-d/2-S.set*.55-1,.25,.04,S.set*.4,0xf2f2f2);
 if(!iron)showCar(S,-w*.3,-d/2-S.set*.5-1,0,'Ford Focus RS',0xffffff);
 signAt(g,G.name.toUpperCase(),0,h+3.6,-d/2-.9,Math.min(34,w+6));
 const p=addPlace(G.name,S.cx,S.cz,{r:Math.max(w,d)*.75+8,kind:'gym',tag:G.zone,sub:G.type+' · '+G.zone,tp:S.tp,tour:G.name==='Oxygen Gym'||G.name==='Power House Gym'});SPAWNKEEP.push([S.cx,S.cz,Math.max(w,d)*.7]);return S}
function ecoBuild(it){let S=null;const ids=[];{const L=[];for(const id in NODES){const n=NODES[id];if(n.deg>=3)L.push([Math.hypot(n.x-O(3211,698)[0],n.z-O(3211,698)[1]),id])}L.sort((a,b)=>a[0]-b[0]);L.slice(0,16).forEach(a=>ids.push(a[1]))}
 try{S=siteCorner(ids,20,16,true)}catch(e){S=null}if(!S)S=packSite(it.zone,22,16,6,{nocol:true});S.d=16;S.set=S.set||4;
 const g=S.g,G=0x2ecc71;BX(g,20,.12,16,0x2b2e33,0,.1,0);
 BX(g,18,.5,11,0xf2f4f6,0,6.2,-1);BX(g,18.2,.25,11.2,BMB(G),0,5.85,-1);for(const kx of[-1,1])for(const kz of[-1,1]){BX(g,.5,6,.5,0x9aa0a6,kx*8,3,kz*3.6-1);addPos(S,kx*8,kz*3.6-1,.8)}
 for(let i=0;i<3;i++){const x=-5.5+i*5.5;BX(g,1,2.6,.7,0xf2f4f6,x,1.3,-1);BX(g,.7,.5,.1,BMB(G),x,2.1,-1.4);BX(g,.14,2.2,.14,0x23262b,x+.9,1.2,-1.4)}
 BX(g,4.4,3.2,3,0xe9eef0,0,1.6,6);BX(g,4.5,.3,3.1,BMB(G),0,3.3,6);wallC(S,0,6,4.4,3);
 const bolt=BX(g,.5,3,.3,BMB(0xfff02a),-8.8,9,-7);bolt.rotation.z=.4;BX(g,.5,13,.5,0x2a2d33,-9.4,6.5,-7.4);BX(g,5.6,2.6,.3,BMB(G),-9.4,13.6,-7.4);
 showCar(S,-5.5,-4,Math.PI,'Ford Fiesta ST',0x2ecc71);showCar(S,5.5,-4,Math.PI,'Ford Focus RS',0xffffff);
 signAt(g,'ECOCHARGE STATION',-9.4,16.2,-7.4,22);signAt(g,'ECOCHARGE STATION IRBID',0,8.2,-1,20);
 const p=addPlace(it.name,S.cx,S.cz,{r:24,kind:'ev',tag:it.zone,sub:it.type+' · '+it.zone,tp:S.tp,tour:true});SPAWNKEEP.push([S.cx,S.cz,18]);return S}
function addPos(S,lx,lz,r){const q=wl(S,lx,lz);addCol({x:q[0],z:q[1],r})}
function mosqueBuild(it){let S;for(const[n,x,z]of[['Old Mosque Lane',505,-50],['Al-Hammam Lane',300,-30],['Palestine Street',180,-20]]){try{S=siteBeside(n,x,z,40,34,6,{nocol:true,pad:1.2});break}catch(e){}}if(!S)S=packSite(it.zone,40,34,6,{nocol:true});
 const g=S.g;BX(g,40,.12,34,0xcfc3a6,0,.1,0);BX(g,22,10,16,0xf0e6c8,-3,5,3);wallC(S,-3,3,22,16);BX(g,22.6,1,16.6,0xc9ae66,-3,10.5,3);
 Mi(g,new T.SphereGeometry(6.4,22,12,0,Math.PI*2,0,Math.PI/2),lmx(0x2a9d8f),-3,11,3);CY(g,.22,.3,3.4,0xc9a23c,-3,20.4,3,6);Mi(g,new T.SphereGeometry(.7,8,6),lmx(0xc9a23c),-3,18.1,3);
 for(const k of[-1,1])Mi(g,new T.SphereGeometry(2.6,14,8,0,Math.PI*2,0,Math.PI/2),lmx(0x2a9d8f),-3+k*8.5,10.5,-1.2);
 BX(g,3.4,30,3.4,0xf0e6c8,15,15,-9);addPos(S,15,-9,2.4);BX(g,5,1,5,0xc9ae66,15,22,-9);BX(g,2.4,5,2.4,0xf0e6c8,15,25.5,-9);Mi(g,new T.ConeGeometry(1.6,5,10),lmx(0x2a9d8f),15,30.5,-9);CY(g,.1,.1,2.4,0xc9a23c,15,34.2,-9,6);
 for(let i=0;i<5;i++){BX(g,1.8,4,.3,0x24323d,-11+i*3.7,2.6,-5.2);BX(g,2,.4,.4,0xc9ae66,-11+i*3.7,4.7,-5.2)}
 for(let i=0;i<4;i++){CY(g,.5,.55,4.4,0xf5efde,-11+i*5.3,2.2,-11,10)}BX(g,22,.9,3,0xf0e6c8,-3,4.8,-11);
 for(const x of[-18,18])for(const z of[-15,15])BX(g,.5,1.1,.5,0xb9ad90,x,.55,z);
 for(let i=0;i<4;i++){const q=wl(S,-17+i*11,14);tree(q[0],q[1],1)}
 signAt(g,'AL-HASAN MOSQUE SQUARE',-3,14.6,-6,34);const p=addPlace(it.name,S.cx,S.cz,{r:40,kind:'mosque',tag:it.zone,sub:it.type+' · '+it.zone,tp:S.tp,tour:false});SPAWNKEEP.push([S.cx,S.cz,26]);return S}
function cultureBuild(it){const S=packSite(it.zone,38,28,16,{nocol:true}),g=S.g;
 BX(g,36,11,16,0x3f6a90,0,5.5,3);wallC(S,0,3,36,16);BX(g,36.6,.8,16.6,0xdfe5ea,0,11.4,3);
 for(let i=0;i<10;i++){const f=BX(g,.7,11,6,i%2?0xdfe5ea:0xf4f6f8,-16.2+i*3.6,6.4,-9);f.rotation.z=(i-4.5)*.025;f.rotation.x=0}wallC(S,0,-8,36,3);
 const rf=BX(g,34,.7,15,0xb9c4cc,0,13,3);rf.rotation.x=-.18;BX(g,28,6,.4,GLM,0,3.6,-5.1);
 const cn=Mi(g,new T.ConeGeometry(4,9,4).rotateY(Math.PI/4),lmx(0xdfe5ea),12,16.5,6);
 BX(g,36,.12,16,0xbdb5a0,0,.08,-d2(S)/2-8+0);for(let i=0;i<6;i++)BX(g,.35,.9,.35,0x6b7077,-12.5+i*5,.45,-d2(S)/2-3.5);
 signAt(g,'IRBID CULTURAL CENTER AUDITORIUM',0,15.5,-8,40);const p=addPlace(it.name,S.cx,S.cz,{r:34,kind:'culture',tag:it.zone,sub:it.type+' · '+it.zone,tp:S.tp,tour:false});SPAWNKEEP.push([S.cx,S.cz,24]);return S}
const d2=S=>S.d;
function cageBuild(it){const S=packSite(it.zone,30,19,4,{nocol:true}),g=S.g,w=30,d=19;
 BX(g,w,.12,d,0x33363b,0,.1,0);BX(g,w-3,.14,d-3,0x2e6f4e,0,.12,0);for(const[x,z,ww,dd]of[[0,0,w-3,.2],[0,0,.2,d-3]])BX(g,ww,.04,dd,0xffffff,x,.2,z);Mi(g,new T.RingGeometry(2.6,2.75,28).rotateX(-Math.PI/2),BMB(0xffffff),0,.22,0);
 for(const k of[-1,1]){BX(g,.3,2.4,.3,0xdddddd,k*(w/2-1.2),1.2,-1.4);BX(g,.3,2.4,.3,0xdddddd,k*(w/2-1.2),1.2,1.4);BX(g,.3,.3,3.1,0xdddddd,k*(w/2-1.2),2.4,0)}
 for(let i=0;i<=10;i++){const x=-w/2+i*w/10;for(const z of[-d/2,d/2])BX(g,.12,3.2,.12,0x6b7077,x,1.6,z)}for(let i=1;i<7;i++){const z=-d/2+i*d/6;for(const x of[-w/2,w/2])BX(g,.12,3.2,.12,0x6b7077,x,1.6,z)}
 const fm=(lx,lz,ww,dd)=>{BX(g,ww,3,dd,FENCE_M,lx,1.7,lz)};fm(0,d/2,w,.08);fm(-w/2,0,.08,d);fm(w/2,0,.08,d);fm(-w/4-1.5,-d/2,w/2-3,.08);fm(w/4+1.5,-d/2,w/2-3,.08);BX(g,w,.25,.25,0x6b7077,0,3.3,d/2);BX(g,.25,.25,d,0x6b7077,-w/2,3.3,0);BX(g,.25,.25,d,0x6b7077,w/2,3.3,0);
 wallC(S,0,d/2,w,.4);wallC(S,-w/2,0,.4,d);wallC(S,w/2,0,.4,d);wallC(S,-w/4-1.5,-d/2,w/2-3,.4);wallC(S,w/4+1.5,-d/2,w/2-3,.4);
 for(const k of[-1,1])for(const z of[-7,7])BX(g,.5,9,.5,0x6b7077,k*(w/2+.8),4.5,z);
 signAt(g,'AL-NUZHA FENCED FOOTBALL CAGE',0,5.2,-d/2-.6,26);const p=addPlace(it.name,S.cx,S.cz,{r:26,kind:'cage',tag:it.zone,sub:it.type+' · '+it.zone,tp:S.tp,tour:false});return S}
function lotBuild(it){let S=null;for(const[a,sd]of[[[1380,1000],[1]],[[1380,1500],[1]],[[1380,600],[1,-1]],[[1380,1000],[-1,1]]]){try{S=siteBeside('Al-Jamiaa Street',a[0],a[1],110,64,5,{nocol:true,sides:sd,pad:1});break}catch(e){}}if(!S)S=packSite(it.zone,110,64,5,{nocol:true});
 const g=S.g,w=110,d=64,cy=(S.set+d/2)*0;BX(g,w,.1,d,0x25272b,0,.1,0);
 for(let k=-4;k<=4;k++)BX(g,.2,.04,d-8,0xf2f2f2,k*11,.17,0);for(const z of[-d/2+4,d/2-4])BX(g,w-8,.2,.3,0xff7a00,0,.18,z);BX(g,.3,.04,d-8,0xff7a00,-w/2+4,.18,0);BX(g,.3,.04,d-8,0xff7a00,w/2-4,.18,0);
 Mi(g,new T.RingGeometry(10,10.3,40).rotateX(-Math.PI/2),BMB(0xff7a00),-20,.2,0);Mi(g,new T.RingGeometry(7,7.25,40).rotateX(-Math.PI/2),BMB(0xffffff),24,.2,6);
 const CN=[];for(let i=0;i<=22;i++){for(const z of[-d/2+1.5,d/2-1.5]){const q=wl(S,-w/2+1.5+i*(w-3)/22,z);CN.push([q[0],.35,q[1],0,1,1,1,0xff6a00])}}for(let i=1;i<10;i++)for(const x of[-w/2+1.5,w/2-1.5]){const q=wl(S,x,-d/2+1.5+i*(d-3)/10);CN.push([q[0],.35,q[1],0,1,1,1,0xff6a00])}
 for(let a=0;a<12;a++){const q=wl(S,-20+10*Math.cos(a*Math.PI/6),10*Math.sin(a*Math.PI/6));CN.push([q[0],.35,q[1],0,1,1,1,0xffffff])}
 instO(new T.ConeGeometry(.35,.7,6),baseMat,CN);
 for(const k of[-1,1]){BX(g,.4,8,.4,0x2a2d33,k*(w/2-6),4,-d/2-1.5);BX(g,8,1.2,.3,BMB(0xff7a00),k*(w/2-6),8.4,-d/2-1.5)}
 signAt(g,'YARMOUK STADIUM OVERFLOW LOT · DRIFT ARENA',0,9.5,-d/2-2,60);signAt(g,'DRIFT ARENA',0,5,d/2+2,30);
 DZONES.push({name:'Yarmouk Stadium Overflow Lot',x:S.cx,z:S.cz,hw:w/2+3,hd:d/2+3,c:S.c,s:S.s,r:Math.hypot(w,d)/2});
 const p=addPlace(it.name,S.cx,S.cz,{r:62,kind:'drift',tag:it.zone,sub:it.type+' · '+it.zone,tp:S.tp,tour:true});SPAWNKEEP.push([S.cx,S.cz,60]);return S}
// ---- build the dataset -> list of entries ----
const PACK_LIST=[];
for(const k in EXPANSION_PACK)for(const[name,type,zone]of EXPANSION_PACK[k])PACK_LIST.push({name,type,zone,cat:packCat(name,type)});
for(const[pre,n,type,cat,pool]of PROC)for(let i=1;i<=n;i++)PACK_LIST.push({name:pre+' '+i,type,zone:pool[(i-1+(pre.length%pool.length))%pool.length],cat:pre==='Supermarket Box'?'skip':cat}); // generic supermarket filler blocks are replaced by the real supermarket landmarks (06g2)
// ---- place: custom venues first (they need the big plots), then gyms, then shops ----
function runPack(){const log=(n,e)=>{PACK_FAIL.push(n+': '+(e&&e.message||e))};
 const CUSTOM={'ev!':ecoBuild,'mosque!':mosqueBuild,'culture!':cultureBuild,'cage!':cageBuild,'lot!':lotBuild};
 for(const it of PACK_LIST){const f=CUSTOM[it.cat];if(!f||REALP)continue;try{f(it);PACK_OK.push(it.name)}catch(e){log(it.name,e)}}
 for(const G of IRBID_GYMS){try{gymBuild(G);PACK_OK.push(G.name)}catch(e){log(G.name,e)}}
 const rest=PACK_LIST.filter(it=>!/!$|^skip$/.test(it.cat));
 // dealers and larger plots first so they find room
 const ord=c=>({dealer:0,school:1,medical:2,auto:3,ev:3,civic:3}[c]??4);rest.sort((a,b)=>ord(a.cat)-ord(b.cat));
 for(const it of rest){try{packShop(it);PACK_OK.push(it.name)}catch(e){log(it.name,e)}}
 PACK_OK.push('Corner Salon for Men')}
