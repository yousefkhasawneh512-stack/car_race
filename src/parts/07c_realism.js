// ---- vehicle damage v2 (v39): per-car profiles, localized impacts, internal components, mesh dents ----
// Modes: 0 Off (no persistent damage; physics identical to v37), 1 Cosmetic (visible damage only), 2 Full (visible + mechanical + tyre grip).
// HONEST LIMITS: the cars are procedural meshes (07a_cars.js) and the driving model is the arcade updP. Every mass, layout and threshold
// here is a GAMEPLAY ESTIMATE unless its source flag says 'doc' (the layout commonly published for that model name; generation-dependent,
// not re-verified against a primary source). No manufacturer crash-test data is used. Crush depth uses the generic linear crush relation
// v = b0 + b1*C (Campbell 1974, SAE 740565) with coefficients in the usual published range, scaled per car.
const IRBID_DAMAGE_STORE='irbid-drive-realism-v1';
let damageMode=0,damageRecords={},damageSaveClock=0,lastDamageToast=-99,diagReady=false;
try{const savedRealism=JSON.parse(localStorage.getItem(IRBID_DAMAGE_STORE)||'{}');damageMode=cl(+savedRealism.mode||0,0,2)|0;damageRecords=savedRealism.cars&&typeof savedRealism.cars==='object'?savedRealism.cars:{}}catch(e){}
const DAMAGE_MODE_NAMES=['Off','Cosmetic','Full'];
const damageButton=document.getElementById('damageBtn'),repairButton=document.getElementById('repairBtn');
function persistDamage(){try{localStorage.setItem(IRBID_DAMAGE_STORE,JSON.stringify({mode:damageMode,cars:damageRecords}))}catch(e){}}
const dmgNow=()=>typeof clock==='number'?clock:performance.now()/1000;

// ---- per-car profile (data-driven; see manifest/cars.json for the generated table) ----
function durabilityForCar(i){
 const m=PORS[i],kind=m[6],kindBonus=kind==='s'?22:kind==='v'?18:kind==='p'?16:kind==='h'?12:kind==='r'?-18:kind==='o'?-5:kind==='q'?4:0;
 // Gameplay balance only: this is relative durability, not manufacturer crash-test data.
 const accelPenalty=cl((m[2]-5)*1.1,-5,8),hash=String(m[0]).split('').reduce((a,c)=>((a*31+c.charCodeAt(0))|0),7),individual=((Math.abs(hash)%9)-4);
 return cl(82+kindBonus+accelPenalty+individual,55,120);
}
// drivetrain / engine layout: names listed here follow the layout commonly published for that model name ('doc'); everything else
// falls back to a body-type default ('est'). Where a name covers several generations or variants the choice is noted as ambiguous.
const DRV_DOC={
 AWD:['Porsche 959','Porsche 918 Spyder','Porsche Cayenne','Porsche Cayenne Turbo','Porsche Macan','Lamborghini Murciélago','Lamborghini Aventador','Lamborghini Revuelto','Lamborghini Gallardo','Lamborghini Huracán','Lamborghini Temerario','Lamborghini Reventón','Lamborghini Centenario','Lamborghini Sián FKP 37','Lamborghini Countach LPI 800-4','Lamborghini Urus','Lamborghini Sesto Elemento','Lamborghini Veneno','Lamborghini LM002','Ferrari SF90 Stradale','Ferrari SF90 Spider','Ferrari Purosangue','Ford Focus RS','Ford Bronco','Ford F-150 Raptor','Ford Taurus SHO','Nissan GT-R R35','Audi R8 V10','BMW i8','Bentley Continental GT','Subaru Impreza','BMW X5','Range Rover Sport','Land Rover Defender','Mercedes-AMG G63','Rolls-Royce Cullinan','Toyota Land Cruiser LC200','Toyota Prado','Nissan Patrol','Toyota Highlander Hybrid'],
 FWD:['Ford Fiesta','Ford Fiesta ST','Ford Focus','Ford Puma','Ford Mondeo','Ford Taurus','Ford Escort','Ford Maverick','Ford Fusion Hybrid','Toyota Camry Hybrid','Toyota Corolla','Toyota Prius','Toyota Yaris','Hyundai Avante','Hyundai Elantra','Hyundai Accent','Hyundai Sonata Hybrid','Hyundai Ioniq Hybrid','Kia Sephia','Kia Cerato','Kia Forte','Kia Optima','Kia K5 Hybrid','Kia K3 EV','Kia Picanto','Kia Niro','Nissan Sunny','Nissan Altima','Nissan Leaf EV','Mitsubishi Lancer','BYD Qin Plus','BYD Song Plus EV','Changan Eado EV','Changan Alsvin','MG 5','Honda Civic','Honda Accord','Chevrolet Spark','Peugeot 206','Opel Astra','Mazda 3','Suzuki Swift','Skoda Octavia','Volkswagen Golf Mk7','Seat Leon','Fiat 500','Geely Geometry C'],
 RWD:['Ford Model T','Ford Model A','Ford Mustang','Ford Mustang GT','Ford Mustang Foxbody','Ford Crown Victoria','Ford Sierra','Ford Capri','Ford Cortina','Ford Falcon','Ford Fairlane','Ford Galaxie','Ford Thunderbird','Ford GT40','Ford GT','Porsche 550 Spyder','Porsche 912','Porsche 914','Porsche 924','Porsche 928','Porsche 944','Porsche 968','Porsche Boxster','Porsche Cayman','Porsche Carrera GT','Porsche 904 GTS','Porsche 906','Porsche 917','Porsche 935','Porsche 956','Porsche 962','Lamborghini Miura','Lamborghini Countach','Lamborghini Urraco','Lamborghini Jalpa','Lamborghini Silhouette','Lamborghini 350 GT','Lamborghini 400 GT','Lamborghini Islero','Lamborghini Espada','Lamborghini Jarama','Ferrari 125 S','Ferrari 250 GTO','Ferrari 250 GT California Spyder','Ferrari Testarossa','Ferrari F40','Ferrari F50','Ferrari Enzo','Ferrari LaFerrari','Ferrari Dino 246 GT','Ferrari 365 GTB/4 Daytona','Ferrari 288 GTO','Ferrari 458 Italia','Ferrari 488 GTB','Ferrari 488 Spider','Ferrari F8 Tributo','Ferrari F8 Spider','Ferrari 296 GTB','Ferrari Roma','Ferrari Portofino','Ferrari 812 Superfast','Ferrari 12Cilindri','Ferrari Monza SP1','Ferrari Daytona SP3','Ferrari FXX-K','Ferrari 599 GTB Fiorano','Ferrari 360 Modena','Mercedes-Benz E-Class W211','Mercedes-Benz C-Class W203','Mercedes-Benz S-Class W221','Classic Mercedes 280SEL W108','BMW 3 Series E46','BMW 5 Series E60','BMW E36 M3 (Drift Spec)','BMW M3 G80','BMW M4 G82','Mercedes-AMG GT','Maserati Ghibli','Aston Martin Vantage','Chevrolet Corvette C8','Lotus Emira','Toyota Supra Mk5','Toyota Supra JZA80','Alfa Romeo Giulia Quadrifoglio','Toyota AE86 Trueno','Nissan 350Z (Z33)','Subaru BRZ / Toyota GT86','Nissan Silvia S15 Spec-R','Nissan Skyline GT-R R34 (RWD)','Mazda RX-7 FD3S','Mazda MX-5 Miata NA','MG 4 EV','Dodge Charger','Dodge Challenger']};
const DRV_AMBIG=new Set(['Ford Escort','Ford Taurus SHO','Porsche Taycan','Lamborghini Diablo','Porsche 911','Lamborghini Huracán','Lamborghini Gallardo','BMW M3 G80','BMW M4 G82','Dodge Charger','Dodge Challenger','Audi R8 V10','Nissan Skyline GT-R R34 (RWD)']);
const ENG_REAR=new Set(['Porsche 911','Porsche 912','Porsche 959','Porsche 935']);
const ENG_MID=new Set(['Porsche 550 Spyder','Porsche 914','Porsche Boxster','Porsche Cayman','Porsche Carrera GT','Porsche 918 Spyder','Porsche 904 GTS','Porsche 906','Porsche 917','Porsche 956','Porsche 962','Ford GT40','Ford GT','Ferrari Daytona SP3','Chevrolet Corvette C8','Lotus Emira','Audi R8 V10','BMW i8']);
const EVS=new Set(['Porsche Taycan','Porsche Mission X','Kia K3 EV','Changan Eado EV','Tesla Model 3','Tesla Model Y','BYD Han EV','BYD Seal','BYD Song Plus EV','Volkswagen ID.4','Volkswagen ID.6','Geely Geometry C','Nissan Leaf EV','MG 4 EV','Zeekr 001']);
const AIRC=new Set(['Porsche 550 Spyder','Porsche 912','Porsche 914']);
// body-type defaults (all estimates): rho = kg per m^3 of the L*W*H box (calibrated loosely on a few widely published kerb weights),
// b1 = crush stiffness km/h per cm (front/rear/side), thr = scratch/light/glass thresholds in km/h, comp = component durability, ty = tyre wear/heat
const KSPEC={
 c:{rho:135,b1:[.9,.8,1],thr:[3,9,18],comp:1,ty:[1,1],dr:'RWD'},  m:{rho:142,b1:[.8,.75,.9],thr:[2.5,8,16],comp:.9,ty:[.8,1.2],dr:'RWD'},
 o:{rho:125,b1:[.85,.8,.9],thr:[3,9,16],comp:.95,ty:[1,1],dr:'RWD'}, q:{rho:135,b1:[.8,.75,.9],thr:[2.5,8,16],comp:.9,ty:[.8,1.2],dr:'RWD'},
 s:{rho:120,b1:[1.05,.95,1.15],thr:[4,10,20],comp:1.2,ty:[1.2,.9],dr:'AWD'}, p:{rho:95,b1:[1.1,1,1.2],thr:[4,10,20],comp:1.25,ty:[1.3,.9],dr:'RWD'},
 r:{rho:100,b1:[.75,.7,.85],thr:[2,7,15],comp:.85,ty:[.6,1.4],dr:'RWD'}, v:{rho:50,b1:[1.2,1.1,1.3],thr:[4,8,12],comp:.8,ty:[.7,1.1],dr:'RWD'},
 h:{rho:122,b1:[.9,.8,1],thr:[3,9,18],comp:1,ty:[1,1],dr:'FWD'}};
const CAR_SPEC=new Map();
function carSpec(i){
 let s=CAR_SPEC.get(i);if(s)return s;const m=PORS[i],n=m[0],k=KSPEC[m[6]]||KSPEC.c,L=m[3],W=m[4],H=m[5],dur=durabilityForCar(i),f=dur/100;
 let drive=k.dr,driveSrc='est';for(const d in DRV_DOC)if(DRV_DOC[d].includes(n)){drive=d;driveSrc=DRV_AMBIG.has(n)?'doc (variant-dependent)':'doc'}
 if(driveSrc==='est'&&DRV_AMBIG.has(n))driveSrc='est (variant-dependent)';
 const eng=ENG_REAR.has(n)?'R':(ENG_MID.has(n)||m[6]==='m'||m[6]==='q'||m[6]==='r')?'M':'F',ev=EVS.has(n),air=AIRC.has(n);
 const fw=ev?.49:eng==='R'?.39:eng==='M'?.42:drive==='FWD'?.62:drive==='AWD'?.57:.53;
 s={i,name:n,kind:m[6],mass:Math.round(cl(k.rho*L*W*H,500,3300)),massSrc:'est',drive,driveSrc,eng,engSrc:ENG_REAR.has(n)||ENG_MID.has(n)?'doc':'est',ev,air,fw,
  hcg:.2+H*.28,wb:L*.62,tr:W-.24,L,W,H,durability:dur,b0:[8,8,4],b1:k.b1.map(b=>b*(.6+.4*f)),maxC:[110,95,55],thr:k.thr,
  comp:{engine:k.comp*Math.sqrt(f),cooling:k.comp*Math.sqrt(f),trans:k.comp,driveline:k.comp,steer:k.comp,susp:k.comp*Math.sqrt(f),brakes:1},
  tyre:{dur:k.ty[0],heat:k.ty[1]}};
 CAR_SPEC.set(i,s);return s;
}
// ---- per-car damage record (stored per car NAME under irbid-drive-realism-v1, so switching cars never transfers damage) ----
const ZONES=['fl','fr','l','r','rl','rr','roof','u'],ZONE_NAMES={fl:'front-left',fr:'front-right',l:'left side',r:'right side',rl:'rear-left',rr:'rear-right',roof:'roof',u:'underbody'};
const WHEEL_NAMES=['FL','FR','RL','RR'],LIGHT_NAMES=['left headlight','right headlight','left tail light','right tail light'],GLASS_NAMES=['windscreen','rear screen','left windows','right windows'];
function newWheel(){return{tread:100,temp:25,health:100,punct:false,wear:{burn:0,slide:0,spin:0,lock:0,roll:0}}}
function newDamageRecord(i){return{v:2,durability:durabilityForCar(i),body:100,engine:100,tyres:100,suspension:100,brakes:100,cooling:100,trans:100,driveline:100,steer:100,
 zones:{fl:100,fr:100,l:100,r:100,rl:100,rr:100,roof:100,u:100},susp:[100,100,100,100],align:[0,0,0,0],lights:[0,0,0,0],glass:[0,0,0,0],
 wheels:[newWheel(),newWheel(),newWheel(),newWheel()],dents:[],engTemp:90,impacts:0,lastHit:-99,lastX:0,lastZ:0,log:[]}}
const finite=(v,d)=>Number.isFinite(v)?v:d;
function migrateRecord(s,i){ // v38 records had only body/engine/tyres/suspension/brakes: spread them over the new components
 const b=finite(s.body,100),t=finite(s.tyres,100),su=finite(s.suspension,100),n=newDamageRecord(i),old=s.v!==2;
 for(const k in n)if(!(k in s))s[k]=n[k];
 if(old){for(const z of ZONES)s.zones[z]=z==='roof'||z==='u'?100:b;s.susp=[su,su,su,su];for(const w of s.wheels)w.tread=t;s.v=2}
 for(const k of['body','engine','tyres','suspension','brakes','cooling','trans','driveline','steer','engTemp'])s[k]=finite(s[k],k==='engTemp'?90:100);
 if(!Number.isFinite(s.durability))s.durability=durabilityForCar(i);
 if(!Array.isArray(s.wheels)||s.wheels.length!==4)s.wheels=n.wheels;for(let j=0;j<4;j++){const w=s.wheels[j]=Object.assign(newWheel(),s.wheels[j]);w.wear=Object.assign(newWheel().wear,w.wear)}
 for(const a of['susp','align','lights','glass'])if(!Array.isArray(s[a])||s[a].length!==4)s[a]=n[a];if(!Array.isArray(s.dents))s.dents=[];if(!Array.isArray(s.log))s.log=[];
 return s}
function getDamageRecord(i){const name=PORS[i]?.[0]||'Unknown car';if(!damageRecords[name]||typeof damageRecords[name]!=='object')damageRecords[name]=newDamageRecord(i);const s=damageRecords[name];if(!s._ok){migrateRecord(s,i);Object.defineProperty(s,'_ok',{value:true,enumerable:false})}return s;}
function currentDamageRecord(){return getDamageRecord(P.idx||0)}
// legacy aggregate fields (body/tyres/suspension) stay meaningful for the v38 HUD/toasts and saved data
function syncAggregates(s){let z=0;for(let j=0;j<6;j++)z+=s.zones[ZONES[j]];s.body=z/6;let t=0,u=0;for(let j=0;j<4;j++){const w=s.wheels[j];t+=w.punct?0:Math.min(w.tread,w.health);u+=s.susp[j]}s.tyres=t/4;s.suspension=u/4}

// ---- effects on driving (Full only). Filled in place every frame: no allocation ----
const DFX={maxSpeed:1,accel:1,steering:1,grip:1,brakes:1,lat:1,pull:0,vib:0,limp:1};
function damageEffects(){
 if(damageMode!==2){DFX.maxSpeed=DFX.accel=DFX.steering=DFX.grip=DFX.brakes=DFX.lat=DFX.limp=1;DFX.pull=DFX.vib=0;return DFX}
 const s=currentDamageRecord(),sp=carSpec(P.idx||0),W=s.wheels,mu=typeof tyreMu==='function'?tyreMu:(()=>1);
 const m0=mu(W[0]),m1=mu(W[1]),m2=mu(W[2]),m3=mu(W[3]),muF=(m0+m1)/2,muR=(m2+m3)/2,muA=(muF+muR)/2,
  muD=sp.drive==='FWD'?muF:sp.drive==='RWD'?muR:muA,sF=(s.susp[0]+s.susp[1])/200,sR=(s.susp[2]+s.susp[3])/200,sA=(sF+sR)/2,
  hE=cl(s.engine/100,0,1),hT=cl(s.trans/100,0,1),hD=cl(s.driveline/100,0,1),hS=cl(s.steer/100,0,1),hB=cl(s.brakes/100,0,1),
  punct=W[0].punct||W[1].punct||W[2].punct||W[3].punct,limp=s.engTemp>112?cl(1-(s.engTemp-112)/50,.55,1):1;
 DFX.limp=limp;
 DFX.maxSpeed=cl((.55+.45*Math.pow(hE,.7))*limp*(.72+.28*hT)*(.85+.15*sA)*(punct?.62:1),.4,1);
 DFX.accel=cl((.35+.65*Math.pow(hE,.8))*limp*(.6+.4*hT)*(.8+.2*hD)*(.5+.5*muD),.3,1);
 DFX.steering=cl((.58+.42*hS)*Math.pow(muF,.7)*(.8+.2*sF),.45,1);
 DFX.grip=cl(muA*(.85+.15*sA),.35,1);DFX.brakes=cl(.5+.5*hB,.5,1);DFX.lat=cl(muR*(.75+.25*sR),.45,1);
 // pull (rad/s at speed, + = left): toe changes from wheel hits plus a punctured tyre dragging its side
 DFX.pull=(s.align[0]+s.align[1]+.5*(s.align[2]+s.align[3]))*.012+((W[0].punct||W[2].punct)?.07:0)-((W[1].punct||W[3].punct)?.07:0);
 DFX.vib=cl((punct?.8:0)+(1-hD)*.6+(1-sA)*.5+(1-Math.min(m0,m1,m2,m3))*.4,0,1);
 return DFX;
}

// ---- visuals: localized dents (vertex deformation of a tessellated copy of the player's body), broken lights, cracked glass, scratches, bent/flat wheels ----
const DMG_SCRATCH=new T.MeshBasicMaterial({color:0x9a9fa5,transparent:true,opacity:.9,depthWrite:false,side:T.DoubleSide}),DMG_BOX=new T.BoxGeometry(1,1,1),
 DMG_LIGHT=new T.MeshLambertMaterial({color:0x2a2b2d}),DMG_PLANE=new T.PlaneGeometry(1,1);
let DMG_CRACK=null;
function crackMat(){if(DMG_CRACK)return DMG_CRACK;let tex=null;try{const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');g.strokeStyle='rgba(235,240,245,.9)';g.lineWidth=1.6;
  for(let k=0;k<14;k++){const a=k/14*Math.PI*2+Math.sin(k*7)*.2;let x=128,y=128;g.beginPath();g.moveTo(x,y);for(let s=0;s<6;s++){x+=Math.cos(a+Math.sin(k*3+s)*.35)*20;y+=Math.sin(a+Math.cos(k*5+s)*.35)*20;g.lineTo(x,y)}g.stroke()}
  for(let r=18;r<120;r+=26){g.beginPath();for(let k=0;k<=14;k++){const a=k/14*Math.PI*2;g.lineTo(128+Math.cos(a)*r*(1+Math.sin(k*9)*.12),128+Math.sin(a)*r*(1+Math.cos(k*7)*.12))}g.stroke()}
  tex=new T.CanvasTexture(c)}catch(e){}
 DMG_CRACK=new T.MeshBasicMaterial({map:tex,color:0xffffff,transparent:true,opacity:.85,depthWrite:false,side:T.DoubleSide});return DMG_CRACK}
// longest-edge bisection until every edge is shorter than maxE (player car only, done once on the first dent; caps the triangle count)
function tessellate(geo,maxE){
 const g0=geo.index?geo.toNonIndexed():geo,p=g0.attributes.position.array,uvA=g0.attributes.uv?g0.attributes.uv.array:null,outP=[],outU=[],st=[];
 for(let t=0;t<p.length/9;t++){const q=[];for(let k=0;k<3;k++){const v=t*3+k;q.push([p[v*3],p[v*3+1],p[v*3+2],uvA?uvA[v*2]:0,uvA?uvA[v*2+1]:0])}st.push(q)}
 const m2=maxE*maxE,mid=(a,b)=>a.map((x,k)=>(x+b[k])/2),d2=(a,b)=>(a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2;let n=0;
 while(st.length){const q=st.pop(),e0=d2(q[0],q[1]),e1=d2(q[1],q[2]),e2=d2(q[2],q[0]),mx=Math.max(e0,e1,e2);
  if(mx>m2&&n+st.length<24000){const[a,b,c]=e0===mx?[0,1,2]:e1===mx?[1,2,0]:[2,0,1],mm=mid(q[a],q[b]);st.push([q[a],mm,q[c]],[mm,q[b],q[c]])}
  else{for(const v of q){outP.push(v[0],v[1],v[2]);outU.push(v[3],v[4])}n++}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(outP,3));if(uvA)g.setAttribute('uv',new T.Float32BufferAttribute(outU,2));g.computeVertexNormals();return g}
function carMeshParts(m){const r={body:null,glass:null,hl:[],tl:[],tyre:[],rim:[]};if(!m)return r;for(const c of m.children){const u=c.userData||{};
 if(u.part==='body')r.body=c;else if(u.part==='glass')r.glass=c;else if(u.part==='hl')r.hl.push(c);else if(u.part==='tl')r.tl.push(c);else if(u.part==='tyre')r.tyre.push(c);else if(u.part==='rim')r.rim.push(c)}return r}
function ensureTess(mesh){const u=mesh.userData;if(u.base)return;const g=tessellate(mesh.geometry,.2);mesh.geometry.dispose();mesh.geometry=g;u.base=Float32Array.from(g.attributes.position.array)}
function applyDents(mesh,dents){const u=mesh.userData;if(!u.base)return;const pos=mesh.geometry.attributes.position,a=pos.array,b=u.base;
 for(let v=0;v<a.length;v+=3){let x=b[v],y=b[v+1],z=b[v+2];for(const d of dents){const dx=b[v]-d[0],dy=(b[v+1]-d[1])*1.25,dz=b[v+2]-d[2],r2=d[6]*d[6],q=dx*dx+dy*dy+dz*dz;
  if(q<r2){const w=(1-q/r2)**2;x+=d[3]*d[5]*w;z+=d[4]*d[5]*w;y-=d[5]*w*.18}}a[v]=x;a[v+1]=y;a[v+2]=z}
 pos.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingSphere()}
function removeDamageOverlay(){if(!P.m)return;const old=P.m.children.filter(c=>c.userData&&c.userData.damageOverlay);for(const o of old)P.m.remove(o)}
function refreshDamageVisual(){
 if(!P.m||!Number.isFinite(P.idx))return;removeDamageOverlay();const parts=carMeshParts(P.m),s=currentDamageRecord(),show=damageMode!==0;
 // restore everything first (mode Off hides damage; the record is kept)
 for(const m of parts.hl.concat(parts.tl))if(m.userData.mat0){m.material=m.userData.mat0}
 for(const m of parts.tyre.concat(parts.rim)){const u=m.userData;if(!u.p0)u.p0=[m.position.y,m.scale.y,m.scale.z];m.position.y=u.p0[0];m.scale.y=u.p0[1];m.scale.z=u.p0[2];m.rotation.set(0,0,0)}
 for(const m of[parts.body,parts.glass])if(m&&m.userData.base){if(show&&s.dents.length)applyDents(m,s.dents);else applyDents(m,[])}
 if(!show)return;
 const[,, ,L,W,H]=PORS[P.idx];
 if(s.dents.length)for(const m of[parts.body,parts.glass])if(m){ensureTess(m);applyDents(m,s.dents)}
 // broken lights (index: 0 left head, 1 right head, 2 left tail, 3 right tail; mesh +x is the car's left)
 for(const m of parts.hl.concat(parts.tl)){const u=m.userData,j=(u.part==='hl'?0:2)+(u.side>0?0:1);if(s.lights[j]){if(!u.mat0)u.mat0=m.material;m.material=DMG_LIGHT}}
 // wheels: punctured tyres sit flat, damaged corners lean (camber) and toe out
 for(const m of parts.tyre.concat(parts.rim)){const u=m.userData,j=u.corner,w=s.wheels[j];if(j===undefined)continue;
  if(w.punct){m.scale.y=u.p0[1]*.8;m.position.y=u.p0[0]*.82}
  const camber=s.susp[j]<60?(60-s.susp[j])/60*.16:0;m.rotation.z=(u.side>0?1:-1)*camber;m.rotation.y=(j<2?1:.5)*s.align[j]*Math.PI/180}
 const g=new T.Group();g.userData.damageOverlay=true;
 const add=(geo,mat,x,y,z,sx,sy,sz,rx,ry)=>{const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.rotation.set(rx||0,ry||0,0);m.rotation.order='YXZ';m.userData.damageOverlay=true;g.add(m)};
 // scratches/scuffs on each zone that lost condition (localized, a few strips per zone)
 const ZC={fl:[W*.5,L*.38,1],fr:[-W*.5,L*.38,1],l:[W*.5,0,1],r:[-W*.5,0,1],rl:[W*.5,-L*.38,1],rr:[-W*.5,-L*.38,1]};
 for(const z in ZC){const loss=100-s.zones[z];if(loss<1.5)continue;const c=ZC[z],n=Math.min(4,1+Math.floor(loss/12));
  for(let j=0;j<n;j++){const zz=c[1]+((j*37)%60-30)/100*L*.18,yy=.42+((j*13)%22)/100;add(DMG_BOX,DMG_SCRATCH,c[0]+Math.sign(c[0])*.035,yy,zz,.01,.02+.018*(j%2),Math.min(.7,.22+loss*.01),0,Math.sign(c[0])*.08*(j%2?1:-1))}}
 // cracked glass: decal planes on the windscreen / rear screen / side windows (positions from the body profile)
 const k=PORS[P.idx][6],a=(PROF[k]||PROF.c).g,P0=PROF[k]||PROF.c,y0=.3+(H-.3)*P0.bf,u=f=>f*L,cm=s.glass.some(v=>v>0)?crackMat():null;
 const pane=(za,zb,ya,yb,wd,lvl)=>{if(lvl<=0)return;const dz=zb-za,dy=yb-ya,len=Math.hypot(dz,dy),sc=.45+.55*Math.min(1,lvl);
  add(DMG_PLANE,cm,0,(ya+yb)/2+.05,(za+zb)/2+(dz<0?.06:-.06),wd*sc,len*sc,1,Math.atan2(-Math.abs(dz),dy),dz<0?0:Math.PI)};
 if(cm){pane(u(a[0]),u(a[1]),y0,H,W*.7,s.glass[0]);if(a.length===4)pane(u(a[3]),u(a[2]),y0,H,W*.66,s.glass[1]);
  const cz=a.length===4?u((a[1]+a[2])/2):u(a[0])-.4,cl2=a.length===4?Math.abs(u(a[1]-a[2]))+.4:.6;
  for(const sd of[1,-1]){const lvl=s.glass[sd>0?2:3];if(lvl>0)add(DMG_PLANE,cm,sd*(W*.42+.1),(y0+H)/2,cz,cl2*(.5+.5*Math.min(1,lvl)),(H-y0)*.7,1,0,sd*Math.PI/2)}}
 P.m.add(g);
}
function updateDamageButton(){if(damageButton){damageButton.textContent='Damage: '+DAMAGE_MODE_NAMES[damageMode];damageButton.dataset.mode=String(damageMode);damageButton.setAttribute('aria-label','Vehicle damage setting: '+DAMAGE_MODE_NAMES[damageMode]+'. Click to change.')}if(repairButton){const s=currentDamageRecord(),hurt=['body','engine','tyres','suspension','brakes','cooling','trans','driveline','steer'].some(k=>s[k]<99.9)||s.dents.length>0||s.lights.some(Boolean)||s.glass.some(Boolean)||s.wheels.some(w=>w.tread<99.9);repairButton.style.display=damageMode!==0&&hurt?'block':'none'}if(diagReady)diagSync()}
function cycleDamageMode(){damageMode=(damageMode+1)%3;persistDamage();updateDamageButton();refreshDamageVisual();const n=DAMAGE_MODE_NAMES[damageMode];toast('Vehicle damage: '+n+(damageMode===2?' — tyres, engine, suspension and brakes active':damageMode===1?' — visual damage only':' — disabled'));}
if(damageButton)damageButton.addEventListener('click',cycleDamageMode);if(repairButton)repairButton.addEventListener('click',()=>repairCurrentCar());
addEventListener('keydown',e=>{if(e.code==='KeyI'&&!e.repeat&&!(e.target&&e.target.tagName==='INPUT')){e.preventDefault();cycleDamageMode()}});

// ---- impacts ----
// registerPlayerImpact(normal closing speed m/s, collider, contact normal pointing from the obstacle to the car).
// Returns the car's speed loss along the normal when the obstacle gave way (broke / was shoved), else 0 (colB then bounces as before).
const IMPACT={zone:'',face:'',kmh:0,ebs:0,crush:0,x:0,z:0,wx:0,wz:0};
function registerPlayerImpact(normalSpeed,obstacle,nx,nz){
 if(damageMode===0||!Number.isFinite(normalSpeed)||normalSpeed<2.8)return 0;
 const s=currentDamageRecord(),sp=carSpec(P.idx||0),t=dmgNow();
 // One hit per contact interval, so staying pressed against a wall does not multiply damage every frame.
 if(t-s.lastHit<.48&&Math.hypot(P.x-s.lastX,P.z-s.lastZ)<2.8)return 0;
 s.lastHit=t;s.lastX=P.x;s.lastZ=P.z;s.impacts=(s.impacts||0)+1;
 // what the obstacle does (07e_objects.js): equivalent barrier speed for the car, and the speed it keeps if the object gives way
 const ob=typeof objectImpact==='function'?objectImpact(obstacle,normalSpeed,sp.mass,nx,nz):{ebs:normalSpeed,gave:0,broke:false,label:'object'};
 const kmh=ob.ebs*3.6;
 // contact point on the car's outline, in mesh-local coordinates (+x = car's left, +z = forward)
 const sh=Math.sin(P.h),ch=Math.cos(P.h),dx=-(nx||0),dz=-(nz||0),lf=dx*sh+dz*ch,lr=dx*-ch+dz*sh,X=-lr,Z=lf,L=sp.L,W=sp.W;
 const tX=Math.abs(X)>1e-6?W/2/Math.abs(X):1e9,tZ=Math.abs(Z)>1e-6?L/2/Math.abs(Z):1e9,tt=Math.min(tX,tZ),cx=X*tt,cz=Z*tt,face=tZ<=tX?(Z>0?'front':'rear'):(X>0?'left':'right');
 const fi=face==='front'?0:face==='rear'?1:2,crush=Math.max(0,kmh-sp.b0[fi])/sp.b1[fi];   // cm
 IMPACT.face=face;IMPACT.kmh=Math.round(normalSpeed*3.6);IMPACT.ebs=kmh;IMPACT.crush=crush;IMPACT.x=cx;IMPACT.z=cz;IMPACT.wx=P.x+dx*tt;IMPACT.wz=P.z+dz*tt;
 // spread over the zones by distance from the contact point (localized: far zones get nothing)
 const ZC={fl:[W*.3,L*.45],fr:[-W*.3,L*.45],l:[W*.5,0],r:[-W*.5,0],rl:[W*.3,-L*.45],rr:[-W*.3,-L*.45]};let best='',bw=0;
 const maxC=sp.maxC[fi],scuff=kmh>sp.thr[0]?Math.min(2.5,(kmh-sp.thr[0])*.25):0;
 for(const z in ZC){const d=Math.hypot(cx-ZC[z][0],cz-ZC[z][1]),w=Math.exp(-((d/(.8+crush/200))**2));if(w>bw){bw=w;best=z}
  if(w>.05)s.zones[z]=cl(s.zones[z]-(crush/maxC*100+scuff)*w,0,100)}
 IMPACT.zone=best;
 // dent at the contact point (stored per car in mesh-local metres; merged with a nearby earlier dent)
 if(crush>1.5){const depth=Math.min(fi===2?.3:.5,crush/100*.8),rad=.42+Math.min(.9,crush/100*.9),il=Math.hypot(cx,cz)||1,d=[+cx.toFixed(3),.55,+cz.toFixed(3),+(-cx/il).toFixed(3),+(-cz/il).toFixed(3),+depth.toFixed(3),+rad.toFixed(3)];
  const near=s.dents.find(q=>Math.hypot(q[0]-d[0],q[2]-d[2])<.35);if(near){near[5]=+Math.min(fi===2?.32:.52,Math.hypot(near[5],d[5])).toFixed(3);near[6]=Math.max(near[6],d[6])}else{s.dents.push(d);if(s.dents.length>16){s.dents.sort((a,b)=>b[5]-a[5]);s.dents.length=16}}}
 // lights and glass (visible, so recorded in Cosmetic and Full)
 if(kmh>sp.thr[1]){const lx=W*.33;if(face==='front'||face==='rear'||Math.abs(cz)>L*.36){const base=cz>0?0:2;for(const sd of[0,1]){const sx=sd===0?lx:-lx;if(Math.abs(cx-sx)<.55+crush/100)s.lights[base+sd]=1}}}
 if(face==='front'&&kmh>sp.thr[2])s.glass[0]=Math.min(1,s.glass[0]+(kmh-sp.thr[2])/35);
 if(face==='rear'&&kmh>sp.thr[2])s.glass[1]=Math.min(1,s.glass[1]+(kmh-sp.thr[2])/35);
 if(fi===2&&crush>6&&Math.abs(cz)<L*.3)s.glass[face==='left'?2:3]=Math.min(1,s.glass[face==='left'?2:3]+crush/25);
 if(damageMode===2){
  const c=sp.comp,center=1-Math.min(1,Math.abs(cx)/(W/2))*.5;
  // radiator sits behind the front bumper (air-cooled cars: at the engine)
  const coolFace=sp.air?(sp.eng==='F'?'front':'rear'):'front';if(face===coolFace)s.cooling=cl(s.cooling-Math.max(0,crush-8)*1.6*center/c.cooling,0,100);
  const engFace=sp.eng==='F'?'front':'rear',engDepth=sp.eng==='F'?22:sp.eng==='M'?30:18;
  if(face===engFace)s.engine=cl(s.engine-Math.max(0,crush-engDepth)*1.4*center/c.engine,0,100);
  if(fi===2&&sp.eng==='M'&&cz<-L*.05)s.engine=cl(s.engine-Math.max(0,crush-20)*.8/c.engine,0,100);
  if((face==='front'&&sp.eng==='F'&&crush>40)||(face==='rear'&&sp.eng!=='F'&&crush>25))s.trans=cl(s.trans-(crush-(face==='front'?40:25))*.8/c.trans,0,100);
  // wheels within reach of the contact point, or behind a deep front/rear crush, take tyre / suspension / steering / alignment damage
  const reach=L/2-L*.31-.3;
  for(let j=0;j<4;j++){const wx=(j%2===0?1:-1)*(W/2-.12),wz=(j<2?1:-1)*L*.31;let wf=Math.max(0,1-Math.hypot(cx-wx,cz-wz)/1.0);
   if(fi<2&&(j<2)===(face==='front')&&crush/100>reach)wf=Math.max(wf,Math.min(1,(crush/100-reach)/.4));if(wf<=0)continue;
   const wk=kmh*wf,w=s.wheels[j];
   w.health=cl(w.health-wk*1.1/sp.tyre.dur,0,100);if(wk>32||w.health<12)w.punct=true;
   s.susp[j]=cl(s.susp[j]-Math.max(0,wk-6)*1.6/c.susp,0,100);s.brakes=cl(s.brakes-Math.max(0,wk-15)*.4/c.brakes,0,100);
   const toe=Math.max(0,wk-8)*.06*(fi===2?(face==='left'?-1:1):(j%2===0?1:-1));s.align[j]=cl(s.align[j]+toe,-6,6);
   if(j<2)s.steer=cl(s.steer-Math.max(0,wk-10)*1.0/c.steer,0,100)}
 }
 syncAggregates(s);s.log.unshift({t:Math.round(t),kmh:IMPACT.kmh,ebs:Math.round(kmh),zone:ZONE_NAMES[best]||best,face,obj:ob.label});if(s.log.length>8)s.log.length=8;
 spawnImpactSparks(normalSpeed,nx,nz);refreshDamageVisual();persistDamage();updateDamageButton();
 if(t-lastDamageToast>.7){lastDamageToast=t;toast((ob.broke?'💥 '+ob.label+' broke · ':ob.gave?ob.label+' shoved · ':'Impact · ')+Math.round(normalSpeed*3.6)+' km/h · '+(ZONE_NAMES[best]||face)+' · body condition '+Math.round(s.body)+'%'+(damageMode===2?' · engine '+Math.round(s.engine)+'%':'') )}
 return ob.gave||0;
}
// heavy landings (ramps, kerbs at speed) load the suspension and underbody; vy is the vertical speed just before touchdown
function registerLanding(vy){
 if(damageMode===0||vy>-5.5)return;const s=currentDamageRecord(),sp=carSpec(P.idx||0),e=-vy-5.5,c=sp.comp;
 s.zones.u=cl(s.zones.u-e*6,0,100);
 if(damageMode===2){for(let j=0;j<4;j++){s.susp[j]=cl(s.susp[j]-e*7/c.susp,0,100);s.wheels[j].health=cl(s.wheels[j].health-e*2/sp.tyre.dur,0,100)}
  s.driveline=cl(s.driveline-Math.max(0,-vy-8)*4/c.driveline,0,100);s.trans=cl(s.trans-Math.max(0,-vy-9)*3/c.trans,0,100);s.engine=cl(s.engine-Math.max(0,-vy-10)*3/c.engine,0,100)}
 syncAggregates(s);s.log.unshift({t:Math.round(dmgNow()),kmh:Math.round(-vy*3.6),ebs:0,zone:'underbody',face:'landing',obj:'hard landing'});if(s.log.length>8)s.log.length=8;
 persistDamage();updateDamageButton();const now=dmgNow();if(now-lastDamageToast>.8){lastDamageToast=now;toast('Hard landing · '+Math.round(-vy*3.6)+' km/h vertical · check suspension')}
}
function registerSpeedBumpImpact(speed){
 if(damageMode===0||speed<12)return;
 const s=currentDamageRecord(),sp=carSpec(P.idx||0),now=dmgNow();
 if(damageMode===1){s.zones.u=cl(s.zones.u-Math.max(0,speed-12)*.10,0,100)}
 else{const sev=cl((speed-11)*.34,0,8);for(let j=0;j<4;j++){s.susp[j]=cl(s.susp[j]-sev*.55/sp.comp.susp,0,100);s.wheels[j].health=cl(s.wheels[j].health-sev*.28/sp.tyre.dur,0,100)}s.zones.u=cl(s.zones.u-sev*.3,0,100)}
 syncAggregates(s);refreshDamageVisual();persistDamage();updateDamageButton();if(now-lastDamageToast>.8){lastDamageToast=now;toast(speed*3.6>80?'Hard speed-bump impact — check suspension/tyres':'Speed-bump impact')}
}
// pooled sparks (no allocation per impact)
const IMPACT_SPARKS=[],IMPACT_SPARK_GEOM=new T.SphereGeometry(.055,5,4);
for(let i=0;i<24;i++){const m=new T.Mesh(IMPACT_SPARK_GEOM,new T.MeshBasicMaterial({color:i%2?0xff8d34:0xffd17a,transparent:true,opacity:0,depthWrite:false}));m.visible=false;m.userData={age:9,life:1,vx:0,vy:0,vz:0};scene.add(m);IMPACT_SPARKS.push(m)}
let sparkI=0;
function spawnImpactSparks(normalSpeed,nx,nz){if(normalSpeed<11)return;const x=P.x-(nx||0)*1.55,z=P.z-(nz||0)*1.55,y=P.y+.28;for(let i=0;i<5;i++){const m=IMPACT_SPARKS[sparkI=(sparkI+1)%IMPACT_SPARKS.length],q=m.userData;m.position.set(x+(Math.random()-.5)*.24,y+(Math.random()-.5)*.16,z+(Math.random()-.5)*.24);q.age=0;q.life=.18+Math.random()*.16;q.vx=(nx||0)*(-1.2-Math.random()*2)+(Math.random()-.5)*2;q.vy=.6+Math.random()*2;q.vz=(nz||0)*(-1.2-Math.random()*2)+(Math.random()-.5)*2;m.material.opacity=.9;m.visible=true}}
let airVy=0,wasAir=false,engHeatAcc=0;
function damageTick(dt){
 if(typeof diagTick==='function')diagTick(dt);
 if(damageMode!==0){
  // landings: remember the last airborne vertical speed (updP overwrites P.vy on touchdown)
  if(!P.gnd){airVy=P.vy;wasAir=true}else if(wasAir){wasAir=false;registerLanding(airVy)}
  const s=currentDamageRecord();
  if(damageMode===2){// engine temperature: a damaged radiator cannot reject the heat of sustained throttle
   const thr=typeof TYS==='object'?TYS.thr:0,c=s.cooling/100,heat=thr*((1-c)*6+.4),cool=(s.engTemp-90)*(.02+.08*c);s.engTemp=cl(s.engTemp+(heat-cool)*dt,60,140);
   if(s.engTemp>125){s.engine=cl(s.engine-(s.engTemp-125)*.02*dt,0,100);engHeatAcc+=dt;if(engHeatAcc>3){engHeatAcc=0;syncAggregates(s);updateDamageButton()}}
   // vibration from a flat tyre / bent driveline (visual only; updP has already set the body rotation this frame)
   const fx=damageEffects(),v=Math.hypot(P.vx,P.vz);if(fx.vib>0&&P.gnd&&v>2&&P.m){const a=fx.vib*.011*Math.min(1,v/18);P.m.rotation.z+=(Math.random()-.5)*a;P.m.rotation.x+=(Math.random()-.5)*a*.6}}
  damageSaveClock+=dt;if(damageSaveClock>8){damageSaveClock=0;syncAggregates(s);persistDamage();updateDamageButton()}
 }
 for(const m of IMPACT_SPARKS){if(!m.visible)continue;const q=m.userData;q.age+=dt;q.vy-=5.5*dt;m.position.x+=q.vx*dt;m.position.y+=q.vy*dt;m.position.z+=q.vz*dt;m.material.opacity=cl(1-q.age/q.life,0,1);if(q.age>=q.life)m.visible=false}
 if(typeof objectsTick==='function')objectsTick(dt);
 if(smokePuff){const s=currentDamageRecord(),show=damageMode===2&&(s.engine<28||s.engTemp>118);smokePuff.visible=show;if(show){const f=Math.sin(clock*8)*.05,hot=Math.max(28-s.engine,(s.engTemp-118)*1.5);const back=PORS[P.idx][3]*(carSpec(P.idx).eng==='F'?-.37:.37);smokePuff.position.set(P.x-Math.sin(P.h)*back,P.y+.52+f,P.z-Math.cos(P.h)*back);const size=.23+hot*.009;smokePuff.scale.setScalar(size);smokePuff.material.opacity=.13+hot*.004}}
}
let smokePuff=null;
try{smokePuff=new T.Mesh(new T.SphereGeometry(1,7,5),new T.MeshBasicMaterial({color:0x777c80,transparent:true,opacity:.18,depthWrite:false}));smokePuff.visible=false;scene.add(smokePuff)}catch(e){smokePuff=null}
// repairs are free (the economy is unchanged by request); 'tyres' replaces the four tyres only
function repairCurrentCar(what){const s=currentDamageRecord(),i=P.idx||0;
 if(what==='tyres'){s.wheels=[newWheel(),newWheel(),newWheel(),newWheel()];toast('Tyres replaced')}
 else{const n=newDamageRecord(i);for(const k in n)if(k!=='durability')s[k]=n[k];s.lastHit=-99;toast('Vehicle repaired')}
 syncAggregates(s);persistDamage();refreshDamageVisual();updateDamageButton()}
window.irbidVehicleRealism={cycleDamageMode,repairCurrentCar,getMode:()=>damageMode,getCurrentState:()=>JSON.parse(JSON.stringify(currentDamageRecord())),getEffects:damageEffects,getSpec:()=>carSpec(P.idx||0)};

// ---- place up to 90 estimated low-speed humps near mapped sensitive destinations ----
// Road data and POIs are bundled from OpenStreetMap. The bundled network carries no traffic_calming-tagged features, so bumps are
// explicitly inferred near mapped schools, hospitals/clinics, and parks, on nearby local/service roads. They are not surveyed locations.
const IRBID_SPEED_BUMPS=[];
function buildEstimatedSpeedBumps(){
 if(!Array.isArray(POID)||typeof roadNear!=='function'||typeof edgePt!=='function')return;
 const targets=POID.filter(q=>['school','hospital','medical','park'].includes(q[2]));
 const candidates=[];
 for(const q of targets){const x=q[0]/10,z=q[1]/10,kind=q[2],maxDist=kind==='school'?68:kind==='hospital'?72:kind==='medical'?50:38;
  const near=roadNear(x,z,maxDist,e=>(e.kind==='local'||e.kind==='svc')&&e.hw!=='track'&&e.kind!=='alley'&&e.len>34&&e.w>=3.2);
  if(!near||near.d>maxDist)continue;
  const e=near.e,u=e.cum[near.i]+near.t*((e.cum[near.i+1]||e.cum[near.i])-e.cum[near.i]);
  if(u<13||e.len-u<13)continue;
  // Do not place a hump almost on an intersection or within 115 m of another inferred hump.
  if(candidates.some(b=>Math.hypot(b.x-near.px,b.z-near.pz)<115))continue;
  candidates.push({x:near.px,z:near.pz,tx:near.tx,tz:near.tz,width:cl(e.w*.88,3.2,7.5),kind,place:q[4]||q[3]||kind,name:q[4]||q[3]||kind,estimated:true,road:e.name||'',armed:true,cooldown:-99});
 }
 // Spread them around the loaded network and cap the count for mobile performance.
 const selected=candidates.slice(0,90);
 for(const b of selected){
  // Flat-frame authoring: applyTerrain() (12c) adds TH(x,z) to this group later; adding it here too lifted bumps twice.
  const group=new T.Group();group.position.set(b.x,.05,b.z);group.rotation.y=Math.atan2(b.tx,b.tz);group.userData.speedBump=true;group.userData.estimated=true;
  const stripeCount=Math.max(6,Math.ceil(b.width/0.75)),stripeWidth=b.width/stripeCount;
  for(let j=0;j<stripeCount;j++){const col=j%2===0?0xe6c84f:0x202326,mesh=new T.Mesh(new T.BoxGeometry(stripeWidth+.015,.10,.72),new T.MeshLambertMaterial({color:col}));mesh.position.set(-b.width/2+stripeWidth*(j+.5),.05,0);mesh.receiveShadow=true;group.add(mesh)}
  scene.add(group);b.mesh=group;IRBID_SPEED_BUMPS.push(b);
 }
 console.log('Speed bumps:',IRBID_SPEED_BUMPS.length,'estimated near OSM-mapped schools/medical facilities/parks; locations are not surveyed traffic-calming data.');
}
buildEstimatedSpeedBumps();
function checkSpeedBumpCrossing(prevX,prevZ){
 if(!IRBID_SPEED_BUMPS.length)return;const speed=Math.hypot(P.vx,P.vz);if(speed<1.2)return;
 for(const b of IRBID_SPEED_BUMPS){
  const pAlong=(prevX-b.x)*b.tx+(prevZ-b.z)*b.tz,along=(P.x-b.x)*b.tx+(P.z-b.z)*b.tz;
  const dx=P.x-b.x,dz=P.z-b.z,lateral=dx*b.tz-dz*b.tx;
  if(Math.abs(along)>2.7)b.armed=true;
  const crossed=(pAlong<=0&&along>=0)||(pAlong>=0&&along<=0)||Math.abs(along)<.18;
  if(!b.armed||!crossed||Math.abs(lateral)>b.width/2+1.8||clock-b.cooldown<1.2)continue;
  b.armed=false;b.cooldown=clock;
  // Low, speed-dependent hop only; never a dramatic launch. This is an arcade approximation.
  P.vy=Math.max(P.vy,.16+cl((speed-8)*.043,0,.85));
  if(speed>16){P.vx*=.992;P.vz*=.992;registerSpeedBumpImpact(speed)}
 }
}

// Follow vehicle changes after the game's own model/tuning setter has run: the new mesh gets ITS OWN car's saved damage.
const irbidOriginalSetPlayerCar=setPlayerCar;
setPlayerCar=function(i){irbidOriginalSetPlayerCar(i);if(typeof tyreReset==='function')tyreReset();refreshDamageVisual();updateDamageButton();persistDamage()};
// The initial car was selected before this module loaded; attach its saved damage state now.
updateDamageButton();refreshDamageVisual();
