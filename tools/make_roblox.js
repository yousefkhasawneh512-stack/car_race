// Irbid Drive -> Roblox Studio project. Run from the repo root:  node tools/make_roblox.js dist/irbid-drive.html [radius_m]
// Loads the built game headless (same stub DOM as the Node tests), takes the REAL data it uses (OSM road graph with widths / one-ways /
// speed limits / street names, OSM building pieces, SRTM terrain heights, OSM places, the bank and tuning-shop sites, the race circuits the
// game routes over real roads, per-car stats and rarity tiers), and writes:
//   roblox/IrbidDrive.rbxlx   a place file to open in Roblox Studio (all scripts + data; the map is built by WorldBuilder when the server starts)
//   roblox/data/*.lua         server-only data modules (roads, buildings, terrain)      -> ServerStorage.IrbidData
//   roblox/shared/*.lua       data the players' devices need (graph, places, meta, cars) -> ReplicatedStorage.IrbidShared
// The Luau game code lives in roblox/src (hand-written); every file there is packed by its folder:  *.server.lua = Script,
// *.client.lua = LocalScript, *.lua = ModuleScript, a folder = Folder (the same rules Rojo uses with roblox/default.project.json).
// Map data: (c) OpenStreetMap contributors, ODbL -> shown in-game.
const fs=require('fs'),path=require('path');global.THREE=require(path.resolve('node_modules/three'));
const noop=new Proxy(function(){},{get:()=>noop,apply:()=>noop,set:()=>true});
THREE.WebGLRenderer=class{constructor(){this.domElement={style:{},insertAdjacentElement(){}};this.shadowMap={}}setPixelRatio(){}setSize(){}render(){}};
const el=()=>({getContext:()=>new Proxy(noop,{get:(t,k)=>k==='measureText'?(q=>({width:String(q).length*14})):t[k]}),appendChild(){},remove(){},style:{},dataset:{},setAttribute(){},addEventListener(){},focus(){},blur(){},select(){},value:'',children:[],classList:{add(){},remove(){},toggle(){}},set innerHTML(v){},get innerHTML(){return''},querySelector:()=>el(),querySelectorAll:()=>[]});
global.document={getElementById:el,createElement:el,body:{appendChild(){}},head:{appendChild(){}}};global.window=global;
global.addEventListener=()=>{};global.innerWidth=1280;global.innerHeight=720;global.devicePixelRatio=1;
global.performance={now:()=>0};global.requestAnimationFrame=()=>{};global.setTimeout=()=>{};
const LS={};global.localStorage={getItem:k=>k in LS?LS[k]:null,setItem:(k,v)=>{LS[k]=String(v)}};
const cl0=console.log;console.log=()=>{};
// the web game draws its trees, bushes, dumpsters, manholes and some poles with Math.random (a new sample on every page load): one fixed seed
// here, so the place file is the same on every run (only this export; the web game is unchanged)
{let q=20250611;Math.random=()=>{q|=0;q=q+0x6D2B79F5|0;let t=Math.imul(q^q>>>15,1|q);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const html=fs.readFileSync(process.argv[2]||'dist/irbid-drive.html','utf8'),R=+process.argv[3]||3500;
// hooks (rendering data only, nothing in the game changes): instO calls = the instanced street furniture / trees, scene.add = the hand-built landmarks
let JSRC=html.match(/<script>\n([\s\S]*?)<\/script>/)[1];Error.stackTraceLimit=12;global.__INST=[];global.__ADD=[];
global.__at=()=>{const l=new Error().stack.split(String.fromCharCode(10))[3]||'';const m=l.match(/<anonymous>:(\d+):(\d+)/);return m?[+m[1],+m[2]]:null};
global.__who=()=>new Error().stack.split(String.fromCharCode(10)).slice(3,9).map(l=>(l.match(/at (\S+)/)||[])[1]).filter(n=>n&&!/^(eval|Array|Object|new|forEach|<anonymous>)/.test(n)).slice(0,3).join('<');
global.__CN=0;JSRC=JSRC.replace('function addCol(c){','function addCol(c){if(c.__n===undefined)c.__n=__CN++;');
JSRC=JSRC.replace('function instO(g,mat,items,shadow,R,CS){','function instO(g,mat,items,shadow,R,CS){__INST.push({g,mat,items,R,at:__at()});');
{const a0=THREE.Object3D.prototype.add;THREE.Scene.prototype.add=function(...a){for(const o of a)__ADD.push({o,w:__who()});return a0.apply(this,a)}}
(0,eval)(JSRC+';global.__s={EDGES,NODES,TH,START,BLDD,BLDO,PLACES,PORS,setPlayerCar,P,rarityIdx,RARN,RMULT,CIRCUITS,BANK,SHOP,route,LIT,approachOf,IRBID_SPEED_BUMPS,DZONES,LM,RAMPS,RAMPB,urbanK,carSpec,ptSpec,ptGeom,TPOOL,WHEEL_OLD,TRAFFIC_SPAWN,trafficZone,TCOL,NRACE,OWNC,RCH,engProfile,dpGeo,carV,COL,DESTRUCTIBLE_INSTANCES,SGS}');
const S=global.__s,TH=S.TH,ST=S.START,OUT=path.resolve('roblox');
const dm=v=>Math.round(v*10),inR=(x,z)=>Math.hypot(x-ST.x,z-ST.z)<=R;
// ---- roads: one straight piece per polyline segment, centred on the start; class 0 major / 1 local / 2 service, roundabout 3 ----
const CLS={hw:0,arch:0,petra:0,main:0,ring:3,ramp:0,local:1,svc:2,alley:2,campus:2,drift:1};
const roads=[],segs=[];
for(const e of S.EDGES){if(e.tn)continue;const p=e.pts;for(let k=1;k<p.length;k++){const a=p[k-1],b=p[k];
 if(!inR(a[0],a[1])&&!inR(b[0],b[1]))continue;if(Math.hypot(b[0]-a[0],b[1]-a[1])<.3)continue;
 const w=Math.max(3,e.w||6);roads.push(dm(a[0]-ST.x),dm(a[1]-ST.z),dm(b[0]-ST.x),dm(b[1]-ST.z),dm(TH(a[0],a[1])),dm(TH(b[0],b[1])),dm(w),CLS[e.kind]??1);segs.push([a[0],a[1],b[0],b[1],w])}}
// segment hash (25 m) to keep buildings off the roads
const G=new Map(),gk=(i,j)=>i*100000+j;
segs.forEach((s,i)=>{const x0=Math.floor(Math.min(s[0],s[2])/25)-1,x1=Math.floor(Math.max(s[0],s[2])/25)+1,z0=Math.floor(Math.min(s[1],s[3])/25)-1,z1=Math.floor(Math.max(s[1],s[3])/25)+1;
 for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++){const k=gk(x,z);if(!G.has(k))G.set(k,[]);G.get(k).push(i)}});
const segD=(x,z,s)=>{const dx=s[2]-s[0],dz=s[3]-s[1],l=dx*dx+dz*dz||1;let t=((x-s[0])*dx+(z-s[1])*dz)/l;t=t<0?0:t>1?1:t;return Math.hypot(x-s[0]-dx*t,z-s[1]-dz*t)};
// distance from a road segment to a building rectangle (centre x,z; local axes u = (cs,-sn) half-size a, v = (sn,cs) half-size b)
// -> distance, and the point of the segment nearest the rectangle in local (u, v)
function rectSeg(x,z,cs,sn,a,b,s){const lu=(px,pz)=>[(px-x)*cs-(pz-z)*sn,(px-x)*sn+(pz-z)*cs],[u0,v0]=lu(s[0],s[1]),[u1,v1]=lu(s[2],s[3]);
 // Liang-Barsky: does the segment cross the box?
 let t0=0,t1=1;const du=u1-u0,dv=v1-v0;let hit=true;for(const[p,q]of[[-du,u0+a],[du,a-u0],[-dv,v0+b],[dv,b-v0]]){if(p===0){if(q<0){hit=false;break}}else{const r=q/p;if(p<0){if(r>t1){hit=false;break}if(r>t0)t0=r}else{if(r<t0){hit=false;break}if(r<t1)t1=r}}}
 if(hit){const t=(t0+t1)/2;return[0,u0+du*t,v0+dv*t]}
 const ptBox=(u,v)=>Math.hypot(Math.max(0,Math.abs(u)-a),Math.max(0,Math.abs(v)-b));let best=[ptBox(u0,v0),u0,v0];const e=ptBox(u1,v1);if(e<best[0])best=[e,u1,v1];
 const l2=du*du+dv*dv||1;for(const[cu,cv]of[[a,b],[a,-b],[-a,b],[-a,-b]]){const t=Math.max(0,Math.min(1,((cu-u0)*du+(cv-v0)*dv)/l2)),pu=u0+du*t,pv=v0+dv*t,d=Math.hypot(pu-cu,pv-cv);if(d<best[0])best=[d,pu,pv]}
 return best}
// ---- buildings: OSM pieces (x, z, width, depth, angle, height, type). The roads are drawn at the web game's widths, so some real
// footprints reach into a carriageway: such a piece is cut back from the road side (it keeps its other three faces); a piece that would
// get thinner than 2 m is dropped ----
const blds=[];let drop=0,trim=0;
for(const L of[S.BLDD.p,S.BLDO.p])for(let i=0;i<L.length;i+=7){let x=L[i]/10,z=L[i+1]/10,w=L[i+2]/10,d=L[i+3]/10;const ry=L[i+4]/100,h=L[i+5]/2,ty=L[i+6]&7;
 if(!inR(x,z)||w<2||d<2)continue;
 const cs=Math.cos(ry),sn=Math.sin(ry);let ok=false,cut=false;
 for(let it=0;it<6;it++){let worst=null;const R2=Math.hypot(w,d)/2+15,c0=Math.floor((x-R2)/25),c1=Math.floor((x+R2)/25),r0=Math.floor((z-R2)/25),r1=Math.floor((z+R2)/25),seen=new Set();
  for(let gx=c0;gx<=c1;gx++)for(let gz=r0;gz<=r1;gz++){const c=G.get(gk(gx,gz));if(!c)continue;for(const si of c){if(seen.has(si))continue;seen.add(si);const s=segs[si],q=rectSeg(x,z,cs,sn,w/2,d/2,s),pen=s[4]/2+.3-q[0];if(pen>0&&(!worst||pen>worst[0]))worst=[pen,q[1],q[2]]}}
  if(!worst){ok=true;break}
  // cut the face that looks towards the road point
  const[pen,qu,qv]=worst,c=pen+.1;cut=true;
  if(Math.abs(qu)/(w/2)>=Math.abs(qv)/(d/2)){const sg=Math.sign(qu)||1;w-=c;x-=cs*sg*c/2;z+=sn*sg*c/2}else{const sg=Math.sign(qv)||1;d-=c;x-=sn*sg*c/2;z-=cs*sg*c/2}
  if(w<2||d<2)break}
 if(!ok){drop++;continue}
 if(cut)trim++;
 let y=1e9;for(const[u,v]of[[1,1],[1,-1],[-1,1],[-1,-1]])y=Math.min(y,TH(x+cs*u*w/2+sn*v*d/2,z-sn*u*w/2+cs*v*d/2));
 blds.push(dm(x-ST.x),dm(z-ST.z),dm(w),dm(d),Math.round(ry*1000),dm(Math.max(3,h)),dm(y),ty)}
// ---- road graph for traffic, navigation, street names, the minimap: every edge that lies wholly inside the map (no tunnels) ----
// nodes: x,z,y   edges: a,b (1-based node index), one-way, limit km/h, name index (0 = unnamed), kind (CLS), width dm, n points, then n x (x,z,y)
const nodeIx=new Map(),nodes=[],names=[],nameIx=new Map(),edgeRows=[];
const nodeOf=id=>{if(!nodeIx.has(id)){const n=S.NODES[id];nodes.push(dm(n.x-ST.x),dm(n.z-ST.z),dm(TH(n.x,n.z)));nodeIx.set(id,nodes.length/3)}return nodeIx.get(id)};
const nameOf=n=>{if(!n)return 0;if(!nameIx.has(n)){names.push(n);nameIx.set(n,names.length)}return nameIx.get(n)};
const EIN=S.EDGES.filter(e=>!e.tn&&e.len>.5&&e.pts.every(p=>inR(p[0],p[1]))),EIX=new Map(EIN.map((e,i)=>[e,i+1]));
// fine road kinds (the web game's e.kind; traffic weights, wrong-way rules), track = unpaved (grip .75)
const FK=['hw','arch','petra','main','local','svc','ramp','ring','drift','campus','alley'];
for(const e of EIN){const row=[nodeOf(e.a),nodeOf(e.b),e.ow,e.lim||50,nameOf(e.name),CLS[e.kind]??1,dm(Math.max(3,e.w||6)),Math.max(0,FK.indexOf(e.kind)),e.hw==='track'?1:0,e.pts.length];
 for(const p of e.pts)row.push(dm(p[0]-ST.x),dm(p[1]-ST.z),dm(TH(p[0],p[1])));edgeRows.push(row.join(','))}
// ---- places (searchable in the GPS): real OSM places inside the map ----
const places=S.PLACES.filter(p=>!p.gen&&p.name&&inR(p.x,p.z)).map(p=>({n:p.name,k:p.kind,s:p.sub||'',x:+(p.x-ST.x).toFixed(1),z:+(p.z-ST.z).toFixed(1)}));
// ---- landmark labels ----
const LK=new Set(['landmark','square','museum','mall','campus','hospital','stadium','heritage','park','transport','church']);
const labels=S.PLACES.filter(p=>!p.gen&&LK.has(p.kind)&&p.r<150&&inR(p.x,p.z)).slice(0,120).map(p=>({n:p.name,x:+(p.x-ST.x).toFixed(1),z:+(p.z-ST.z).toFixed(1),y:+TH(p.x,p.z).toFixed(1)}));
// ---- race circuits: the game's own circuits (routed over the real network), kept when every checkpoint is inside the map ----
const circuits=[];
for(const C of S.CIRCUITS){if(!C.nodes.every(n=>inR(S.NODES[n].x,S.NODES[n].z)))continue;const seq=[];
 if(C.loop){for(let l=0;l<C.laps;l++){for(let k=1;k<C.nodes.length;k++)seq.push(C.nodes[k]);seq.push(C.nodes[0])}}else for(let k=1;k<C.nodes.length;k++)seq.push(C.nodes[k]);
 const pts=[];let prev=C.nodes[0],ok=true;
 for(const id of seq){const r=S.route(prev,id);if(!r){ok=false;break}for(const t of r){const q=t.d>0?t.e.pts:t.e.pts.slice().reverse();for(const p of q){const l=pts[pts.length-1];if(!l||Math.hypot(l[0]-p[0],l[1]-p[1])>.5)pts.push(p)}}prev=id}
 if(!ok||!pts.every(p=>inR(p[0],p[1])))continue;
 circuits.push({name:C.n,laps:C.laps,loop:C.loop===1,cps:seq.map(id=>({x:+(S.NODES[id].x-ST.x).toFixed(1),z:+(S.NODES[id].z-ST.z).toFixed(1)})),
  path:pts.map(p=>dm(p[0]-ST.x)+','+dm(p[1]-ST.z)+','+dm(TH(p[0],p[1]))).join(',')})}
// ---- cars: ALL 217 of the web game's cars (PORS), with their own numbers: the applyTune base values (vm, a0, bk, hd), size, body type,
// paint, and the Realistic-handling data the web game derives for each car (ptSpec + ptGeom: mass, engine torque, drag, gearbox, tyres,
// suspension, axle geometry; all of them the web game's own ESTIMATES). Names are generic (no brands, models or trademarks: Roblox removes
// experiences that use them without permission); roblox/CAR_NAMES.md maps every generic name to its web car. The first 22 keep the order
// and names of Roblox versions 1-3 (saved games store these indices); the rest follow in the web game's order. ----
const PICK=[['Ford Focus RS','Hot Hatch RS'],['Toyota Corolla','Family Sedan'],['Kia Picanto','City Mini'],['Toyota Hilux','Work Pickup'],['Mazda MX-5 Miata NA','Pop-Up Roadster'],['BMW E36 M3 (Drift Spec)','Drift Sedan 36'],
 ['Toyota AE86 Trueno','Classic 86'],['Nissan 350Z (Z33)','Z Coupe 33'],['Volkswagen Golf Mk7','Euro Hatch'],['Range Rover Sport','Sport SUV'],
 ['Nissan Silvia S15 Spec-R','Drift Coupe S'],['Dodge Challenger','Muscle V8'],['Nissan Skyline GT-R R34 (RWD)','Street Legend 34'],['Porsche Cayman','Mid Coupe'],
 ['Mazda RX-7 FD3S','Rotary Coupe'],['Toyota Supra JZA80','Turbo Six 80'],['Ferrari 458 Italia','Italian V8'],['Ford GT','Endurance GT'],
 ['Nissan GT-R R35','AWD Rocket'],['Porsche 911','Rear-Engine Six'],['Ferrari F40','Twin-Turbo Icon'],['Lamborghini Huracán','Super V10',true]];
const TIER_PRICE=[2500,12000,30000,60000,120000];
// generic name: where the make comes from + the body type (+ EV) + the listed top speed; a repeat gets a letter
const ORIGIN={Porsche:'German',Volkswagen:'German','Mercedes-Benz':'German','Mercedes-AMG':'German',BMW:'German',Audi:'German',Opel:'German',Classic:'German',
 Lamborghini:'Italian',Ferrari:'Italian',Fiat:'Italian',Maserati:'Italian',Alfa:'Italian',Ford:'American',Chevrolet:'American',GMC:'American',Dodge:'American',Jeep:'American',Tesla:'American',
 Toyota:'Japanese',Nissan:'Japanese',Mitsubishi:'Japanese',Honda:'Japanese',Lexus:'Japanese',Mazda:'Japanese',Subaru:'Japanese',Suzuki:'Japanese',Hyundai:'Korean',Kia:'Korean',
 BYD:'Chinese',Changan:'Chinese',Geely:'Chinese',Hongqi:'Chinese',GAC:'Chinese',Zeekr:'Chinese',MG:'British',Range:'British',Land:'British',Aston:'British',Bentley:'British','Rolls-Royce':'British',Lotus:'British',
 Peugeot:'French',Renault:'French',Skoda:'Czech',Seat:'Spanish'};
const BODYW={c:'Coupe',o:'Roadster',s:'SUV',p:'Pickup',h:'Hatch',m:'Supercar',q:'Spider',r:'Racer',v:'Vintage'};
const genName=(m,ev)=>{const o=ORIGIN[m[0].split(' ')[0]];if(!o)throw Error('no origin for '+m[0]);const b=m[6]==='c'&&m[5]>=1.38?'Sedan':BODYW[m[6]]||'Car';return o+' '+b+(ev?' EV':'')+' '+m[1]};
const order=PICK.map(([n])=>{const i=S.PORS.findIndex(m=>m[0]===n);if(i<0)throw Error('car not in the game: '+n);return i});
S.PORS.forEach((m,i)=>{if(!order.includes(i))order.push(i)});
const used=new Set(PICK.map(p=>p[1])),cars=[],nameRows=[],r5=v=>+v;   // full precision (JS String() round-trips exactly): the Roblox physics must get the web numbers bit for bit
for(const[k,i]of order.entries()){S.setPlayerCar(i);const m=S.PORS[i],tier=S.rarityIdx(i),cs=S.carSpec(i),pt=S.ptGeom(S.ptSpec(i)),vip=!!(PICK[k]&&PICK[k][2]);
 let name=PICK[k]?PICK[k][1]:genName(m,cs.ev);if(!PICK[k]&&used.has(name)){let c=66;while(used.has(name+' '+String.fromCharCode(c)))c++;name+=' '+String.fromCharCode(c)}used.add(name);
 nameRows.push([k+1,name,m[0],tier]);
 cars.push({name,tier,price:k===0||vip?0:TIER_PRICE[tier],vip,vm:r5(S.P.vm),a0:r5(S.P.a0),bk:r5(S.P.bk),hd:r5(S.P.hd),body:m[6]||'c',L:m[3],W:m[4],H:m[5],col:m[7],
  wb:r5(cs.wb),fn:r5(pt.fn),zeta:pt.zeta,
  // Realistic handling (07g): reference values that scale the tuned car (kv, ka) and the per-car model
  pt:{vref:r5(m[1]/3.6*.98),aref:r5(Math.min(11,27.8/m[2]*1.1)),t100:m[2],ev:!!pt.ev,red:pt.red,idle:pt.idle,ng:pt.ng,ratio:pt.ratio.map(r5),rw:r5(pt.rw),m:r5(pt.m),mu:r5(pt.mu),crr:pt.crr,eff:pt.eff,
   drive:pt.drive,fw:r5(pt.fw),hcg:r5(pt.hcg),wb:r5(pt.wb),shiftT:pt.shiftT,fn:r5(pt.fn),zeta:pt.zeta,T:r5(pt.T),CdA:r5(pt.CdA),gov:r5(pt.gov||0),a:r5(pt.a),b:r5(pt.b),Iz:r5(pt.Iz),pk:pt.pk,cl:pt.cl,B:r5(pt.B)},
  // damage / tyres (07c carSpec): mass, layout, strength (estimates in the web game too)
  mass:r5(cs.mass),drive:cs.drive,eng:cs.eng,ev:!!cs.ev,fw:r5(cs.fw),hcg:r5(cs.hcg),tr:r5(cs.tr),dur:r5(cs.durability),
  // the damage profile (07c carSpec: crush stiffness, thresholds, component strength, tyre wear / heat) and the body outline (07h dpGeo)
  dmg:{mass:cs.mass,drive:cs.drive,eng:cs.eng,ev:!!cs.ev,air:!!cs.air,fw:cs.fw,hcg:cs.hcg,wb:cs.wb,tr:cs.tr,L:cs.L,W:cs.W,H:cs.H,durability:cs.durability,kind:cs.kind,
   b0:cs.b0,b1:cs.b1,maxC:cs.maxC,thr:cs.thr,comp:cs.comp,tyre:cs.tyre},
  geo:(g=>{const o={L:g.L,W:g.W,H:g.H,k:g.k,y0:g.y0,ny:g.ny,ty:g.ty,hz:g.hz,rz:g.rz,ws:g.ws,four:g.four};if(g.rs)o.rs=g.rs;return o})(S.dpGeo(i)),
  // the car's own look (07a4 carV): its two name-hashed neon colours, their pulse, and its light-line layout
  vis:(v=>({c1:new THREE.Color(v.graphics.primaryColor).getHex(),c2:new THREE.Color(v.graphics.accentGlowColor).getHex(),f:v.graphics.pulsingSpeedHz,ph:(Math.abs(v.hash)%628)/100,
   ln:{side:v.graphics.lines.side,sideLen:v.graphics.lines.sideLen,front:v.graphics.lines.front,rear:v.graphics.lines.rear,rearSplit:v.graphics.lines.rearSplit,corners:v.graphics.lines.corners,swap:v.graphics.lines.swap}}))(S.carV(i)),
  // engine sound (12d engProfile): the layout's voice in the sound atlas, level, low-pass, aspiration, hybrid / electric, luxury damping
  snd:(e=>({code:e.ev?'E':e.lay+e.cyl+e.asp,lvl:r5(e.lvl),lpf:r5(e.lpf),asp:e.asp,ev:!!e.ev,hyb:!!e.hyb,lux:!!e.lux,kind:e.kind,idle:e.idle,red:e.red,src:e.src}))(S.engProfile(i))})}
if(cars[0].name!=='Hot Hatch RS')throw Error('the starter car must come first');
const rosterIx=new Map(order.map((i,k)=>[i,k+1]));
// the web wheel's tier pools (08a TIERS: the traffic pool names + WHEEL_OLD, de-duplicated) and the traffic pools (TPOOL), as Roblox car indices
const wheelPools=[0,1,2,3,4].map(t=>[...new Set(S.TPOOL[t].map(i=>S.PORS[i][0]).concat(S.WHEEL_OLD[t]))].map(n=>{const i=S.PORS.findIndex(m=>m[0]===n);if(i<0)throw Error('wheel car missing '+n);return rosterIx.get(i)}));
const trafficPools=S.TPOOL.map(pool=>pool.map(i=>rosterIx.get(i)));
fs.writeFileSync(path.join(OUT,'CAR_NAMES.md'),'# Roblox car names → web game cars\n\nGenerated by `tools/make_roblox.js` (do not edit). The Roblox game shows only the generic name (no brands or trademarks).\n'+
 'The numbers of each car (top speed, acceleration, brakes, handling, size, Realistic-handling data) are the web car\'s.\n\n| # | Roblox name | Web game car | Tier |\n|---|---|---|---|\n'+
 nameRows.map(r=>'| '+r[0]+' | '+r[1]+' | '+r[2]+' | '+S.RARN[r[3]]+' |').join('\n')+'\n');
// ---- the web game's road furniture and rules data (positions relative to the start, metres) ----
const rel=(x,z)=>[+(x-ST.x).toFixed(2),+(z-ST.z).toFixed(2)];
// traffic lights: each signalised junction node inside the map: node index, cycle offset (s), axis per incoming edge ('x' / 'z', or 'i' = a
// link inside a split junction, always green); and the signal heads (position, facing, axis, stop line) for the visuals
const signals=[],heads=[];
for(const nd of S.LIT){if(!nodeIx.has(nd.id))continue;const ph=[];for(const e of nd.inn){const ei=EIX.get(e);if(ei&&nd.ph[e.id])ph.push([ei,nd.ph[e.id]])}if(!ph.length)continue;
 signals.push({n:nodeIx.get(nd.id),o:nd.sgo,ph});
 for(const e of nd.inn){const ax=nd.ph[e.id];if(!ax||ax==='i'||(e.ow&&e.a===nd.id)||!EIX.get(e))continue;const h=S.approachOf(nd,e),rx=-h[1],rz=h[0],hw=e.w/2,[x,z]=rel(nd.x-h[0]*9+rx*(hw+1.1),nd.z-h[1]*9+rz*(hw+1.1)),[lx,lz]=rel(nd.x-h[0]*10+rx*hw/2,nd.z-h[1]*10+rz*hw/2);
  heads.push({x,z,y:+TH(nd.x-h[0]*9,nd.z-h[1]*9).toFixed(2),f:+Math.atan2(-h[0],-h[1]).toFixed(4),a:ax,o:nd.sgo,lx,lz,w:+hw.toFixed(2)})}}
// speed bumps (2 from OSM traffic_calming, the rest ESTIMATED near schools / clinics / parks: not surveyed)
const bumps=S.IRBID_SPEED_BUMPS.filter(b=>inR(b.x,b.z)).map(b=>{const[x,z]=rel(b.x,b.z);return{x,z,y:+TH(b.x,b.z).toFixed(2),tx:+b.tx.toFixed(4),tz:+b.tz.toFixed(4),w:+b.width.toFixed(2),l:b.len,h:b.h,est:b.estimated}});
const dzones=S.DZONES.filter(q=>inR(q.x,q.z)&&q.r).map(q=>{const[x,z]=rel(q.x,q.z);return{n:q.name,x,z,r:q.r,y:+TH(q.x,q.z).toFixed(2)}});
const tour=S.LM.filter(l=>inR(l[1],l[2])).map(l=>{const[x,z]=rel(l[1],l[2]);return{n:l[0],x,z,h:+l[3].toFixed(4)}});
const ramps=S.RAMPS.map((r,i)=>{const[x,z]=rel(r[0],r[1]);return{x,z,w:r[2],l:r[3],h:r[4],y:+S.RAMPB[i].toFixed(2),inside:inR(r[0],r[1])}}).filter(r=>r.inside).map(({inside,...r})=>r);
// built-up ground (the web game's urbanK > 0.5: grip .9 off the road, else .65): 50 m cells over the map square, one character per cell
const UC=50,UN=Math.ceil(2*R/UC);let urban='';for(let j=0;j<UN;j++)for(let i=0;i<UN;i++)urban+=S.urbanK(ST.x-R+(i+.5)*UC,ST.z-R+(j+.5)*UC)>.5?'1':'0';
// terrain height TH (the web game's ground for the car physics): 25 m grid over the map square, decimetres; the device interpolates it
const HC=25,HN=Math.ceil(2*(R+100)/HC)+1,hts=[];for(let j=0;j<HN;j++)for(let i=0;i<HN;i++)hts.push(dm(TH(ST.x-R-100+i*HC,ST.z-R-100+j*HC)));
// traffic: the web game's spawn odds per traffic zone (07a2 spawn_rules: rarity odds weighted by the zone's wealth) and the zone of every
// graph edge (trafficZone at the edge's middle point, street first), so traffic cars appear in the same mix as on the web game's streets
const ZN=Object.keys(S.TRAFFIC_SPAWN.spawn_rules),ezone=EIN.map(e=>{const p=e.pts[e.pts.length>>1];return ZN.indexOf(S.trafficZone(p[0],p[1],e))}).map(z=>String(z<0?ZN.indexOf('Irbid_Default'):z)).join('');
const traffic={zones:ZN,odds:ZN.map(z=>S.TRAFFIC_SPAWN.spawn_rules[z].map(r5)),ezone,pools:trafficPools,tcol:S.TCOL,
 own:cars.map((c,k)=>order[k]<S.NRACE||S.OWNC.has(S.PORS[order[k]][0])?1:0).join('')};
// race rivals and duel drivers come from the web game's sports catalogue only (11_race: PORS indices below NRACE)
const racers=order.map((i,k)=>i<S.NRACE?k+1:0).filter(Boolean);
// the police car (08b mkCop: a white Ford Crown Victoria with a light bar)
const copCar=rosterIx.get(S.PORS.findIndex(m=>m[0]==='Ford Crown Victoria'));if(!copCar)throw Error('no police car');
// ---- street furniture and vegetation (the web game's instanced props), by their instO call: lamps, utility poles, transformers, guardrails,
// bus stops, roundabout islands, dumpsters, traffic cones, manhole covers, trees (trunks, round / pine / palm / olive canopies, cypresses,
// bushes), rocks. Not exported: the generated building detail (windows, facades, rooftop tanks / solar / antennas: Roblox has the OSM buildings
// as blocks) and the night light pools. Each item: x, z, y (lifted by TH, as the web terrain pass does), heading, size; the colour of the item
// (instance colour) or of its material. The device builds them only near the player (the web game's LOD radius per family). ----
const SL=JSRC.split(String.fromCharCode(10)),argOf=a=>{if(!a)return'';const L=SL[a[0]-1];let i=L.indexOf('(',a[1]-1),d=0,j=i;for(;j<L.length;j++){if(L[j]==='(')d++;else if(L[j]===')'){d--;if(!d)break}}return L.slice(i+1,j)};
const PROPK=[['stops','busStop'],['posts,false,700','busPost'],['heads,false,700','busHead'],['mGrass,isl','island'],['mRim,rim','islandRim'],['CN','cone'],
 ['pm,poles','lampPole'],['pm,arms','lampArm'],['lampMat,heads','lampHead'],['conc,poles','utilPole'],['conc,arms','utilArm'],[',xf,','transformer'],['gr,rails','railBeam'],['gr,posts','railPost'],
 [',mh,','manhole'],['bin,true','bin'],[',lid,','binLid'],['TRK','trunk'],['CANP[k]','canopy'],['CANP.olive','olive'],['CANP.cyp','cypress'],['CANP.bush','bush'],['ROCKS','rock'],['signPole,false','signPost']];
// ---- the web game's roadside colliders (05b addCol): street lights, utility poles, road signs, dumpsters, guardrail segments, trees, the
// untyped circles (roundabout islands, columns) and solid boxes (landmark walls, kiosks). The OSM building boxes are left out: Roblox has the
// buildings as parts and tests them with rays. In the order the web game added them. Row: type, x, z (cm), r or hw (cm), hd (cm, -1 = circle),
// heading (1e-4 rad), break speed (cm/s, 0 = not breakable), height (cm), trunk diameter (mm), canopies, visual (1 = has instances), and the
// base of the instance it shows (pole height cm, base y cm: the fallen pole / tree is drawn from these, as the web game does) ----
const OTYPES=['-','solid','streetLight','utilityPole','sign','bin','guardrail','tree','busShelter','gardenWall','monument','structure'];
const colSeen=new Set(),cols=[];for(const L of S.COL.values())for(const a of L){if(colSeen.has(a))continue;colSeen.add(a);if(!inR(a.x,a.z)||(a.type===undefined&&a.r===undefined))continue;cols.push(a)}
cols.sort((a,b)=>a.__n-b.__n);const colId=new Map(),colRows=[],colStat={};
cols.forEach((a,i)=>{if(a.visualKey)colId.set(a.visualKey,i+1);const t=OTYPES.indexOf(a.type===undefined?'-':a.type);if(t<0)throw new Error('collider type '+a.type);
 const e=a.visualKey&&S.DESTRUCTIBLE_INSTANCES.get(a.visualKey),vh=e?Math.max(.3,e.item[5]||1):0,vy=e?e.item[1]+TH(e.item[0],e.item[2])-vh/2:0;
 colRows.push(t,Math.round((a.x-ST.x)*100),Math.round((a.z-ST.z)*100),Math.round((a.r!==undefined?a.r:a.hw)*100),a.r!==undefined?-1:Math.round(a.hd*100),a.r!==undefined?0:Math.round(Math.atan2(a.s,a.c)*1e4),
  a.breakable?Math.round((a.breakAt||0)*100):0,Math.round((a.height||0)*100),Math.round((a.trunkD||0)*1000),a.canopies||0,e?1:0,Math.round(vh*100),Math.round(vy*100),Math.round((a.wallH||0)*100));
 colStat[OTYPES[t]]=(colStat[OTYPES[t]]||0)+1});
const COLW=14,colOf=k=>{if(!k)return 0;return colId.get(k)||colId.get(String(k).replace(/\/(arm|head|pool|xf|lid|c\d+)$/,''))||0};
const props=[],propStat={};
for(const c of __INST){const a=argOf(c.at);const k=PROPK.find(q=>a.includes(q[0]));if(!k)continue;const g=c.g,t=g.type,P0=g.parameters||{};
 const shape=t==='BoxGeometry'?'box':t==='CylinderGeometry'?(P0.radiusTop<P0.radiusBottom*.3?'cone':'cyl'):t==='ConeGeometry'?'cone':t==='SphereGeometry'?'ball':t==='DodecahedronGeometry'?'ball':'box';
 const base=t==='BoxGeometry'?[P0.width,P0.height,P0.depth]:t==='CylinderGeometry'?[(P0.radiusTop+P0.radiusBottom),P0.height,(P0.radiusTop+P0.radiusBottom)]:t==='ConeGeometry'?[P0.radius*2,P0.height,P0.radius*2]:[P0.radius*2,P0.radius*2,P0.radius*2];
 const col=c.mat&&c.mat.color?c.mat.color.getHex():0xffffff,rows=[];
 for(const q of c.items){if(!inR(q[0],q[2]))continue;rows.push(dm(q[0]-ST.x),dm(q[2]-ST.z),Math.round((q[1]+TH(q[0],q[2]))*100),Math.round((q[3]||0)*1000),Math.round(base[0]*(q[4]||1)*100),Math.round(base[1]*(q[5]||1)*100),Math.round(base[2]*(q[6]||1)*100),q[7]!==undefined?q[7]:col,colOf(q[8]))}
 if(!rows.length)continue;props.push({kind:k[1],shape,R:c.R||300,col,n:rows.length/9,rows});propStat[k[1]]=(propStat[k[1]]||0)+rows.length/9}
// ---- the road-sign plates (06i SGS: street-name plates in the web blue, speed limits, STOP), with the collider of their post ----
const signR=(props.find(q=>q.kind==='signPost')||{R:300}).R,signRows=[],signText=[];
for(const g of S.SGS){if(!inR(g[0],g[2]))continue;signRows.push(dm(g[0]-ST.x),dm(g[2]-ST.z),Math.round((g[1]+TH(g[0],g[2]))*100),Math.round(g[3]*1000),Math.round(g[4]*100),Math.round(g[5]*100),g[7]?1:0,colOf(g[8]));
 signText.push(g[7]?(g[6]==='STOP'?'STOP':String(g[6]).slice(1)):String(g[6]).slice(1).toUpperCase())}
// ---- the hand-built landmarks (06b / 06c / 06g2 / 06i groups: Al-Balad sites, the clock square, heritage houses, arches, gantries ...): every
// mesh of the groups the landmark builders added, with its real transform (the terrain pass has lifted the groups), as a part: boxes, cylinders,
// spheres, cones, discs; extruded shapes and planes as their bounding box. Cars and the merged road / building chunks are not landmarks. ----
const LMW=/^grp<|^padAt</,lmParts=[],q4=new THREE.Quaternion(),p4=new THREE.Vector3(),s4=new THREE.Vector3(),m4=new THREE.Matrix4(),bb=new THREE.Box3();
scene0().updateMatrixWorld(true);
function scene0(){return __ADD.length?__ADD[0].o.parent||__ADD[0].o:null}
for(const a of __ADD){if(a.o.isInstancedMesh||!LMW.test(a.w)||/mkPorsche|carMesh/.test(a.w))continue;const o=a.o;if(!inR(o.position.x,o.position.z))continue;o.updateMatrixWorld(true);
 o.traverse(m=>{if(!m.isMesh||m.isInstancedMesh||!m.visible)return;const g=m.geometry,t=g.type,P0=g.parameters||{};m.matrixWorld.decompose(p4,q4,s4);
  let shape='box',size;let off=new THREE.Vector3();
  if(t==='BoxGeometry')size=[P0.width*s4.x,P0.height*s4.y,P0.depth*s4.z];
  else if(t==='CylinderGeometry'){shape=P0.radiusTop<P0.radiusBottom*.3?'cone':'cyl';const r=P0.radiusTop+P0.radiusBottom;size=[r*s4.x,P0.height*s4.y,r*s4.z]}
  else if(t==='ConeGeometry'){shape='cone';size=[P0.radius*2*s4.x,P0.height*s4.y,P0.radius*2*s4.z]}
  else if(t==='SphereGeometry'){shape='ball';size=[P0.radius*2*s4.x,P0.radius*2*s4.y,P0.radius*2*s4.z]}
  else if(t==='CircleGeometry'||t==='RingGeometry'){shape='disc';const r=(P0.radius||P0.outerRadius||1)*2;size=[r*s4.x,r*s4.y,.02]}
  else{if(!g.boundingBox)g.computeBoundingBox();bb.copy(g.boundingBox);const c=bb.getCenter(new THREE.Vector3()),z=bb.getSize(new THREE.Vector3());size=[Math.max(.02,z.x*s4.x),Math.max(.02,z.y*s4.y),Math.max(.02,z.z*s4.z)];off=c.multiply(s4).applyQuaternion(q4)}
  const mt=Array.isArray(m.material)?m.material[0]:m.material,col=mt&&mt.color?mt.color.getHex():0xcccccc,tr=mt&&mt.transparent?Math.round((1-(mt.opacity??1))*100):0;
  if(tr>=98)return;
  m4.makeRotationFromQuaternion(q4);const e=m4.elements;
  lmParts.push([shape,+(p4.x+off.x-ST.x).toFixed(3),+(p4.y+off.y).toFixed(3),+(p4.z+off.z-ST.z).toFixed(3),...size.map(v=>+v.toFixed(3)),...[e[0],e[1],e[2],e[4],e[5],e[6],e[8],e[9],e[10]].map(v=>+v.toFixed(4)),col,tr,mt&&mt.type==='MeshBasicMaterial'?1:0])})}
const rules={signals,heads,bumps,dzones,tour,ramps,urban:{cell:UC,n:UN,x0:-R,z0:-R,bits:urban},wheelPools,traffic,racers,copCar};
// ---- write ----
function luaVal(v){if(Array.isArray(v))return'{'+v.map(luaVal).join(',')+'}';if(v&&typeof v==='object')return'{'+Object.entries(v).map(([k,x])=>k+'='+luaVal(x)).join(',')+'}';
 if(typeof v==='string'){const s=JSON.stringify(v);if(/\\u/.test(s))throw Error('string needs a Lua escape: '+v);return s}if(typeof v==='boolean')return String(v);if(!Number.isFinite(v))throw Error('bad number');return String(v)}
const chunk=(name,arr,per)=>{const out=[];for(let i=0,k=1;i<arr.length;i+=per,k++)out.push([name+k,'return [['+arr.slice(i,i+per).join(',')+']]\n']);return out};
const chunkRows=(name,rows,max)=>{const out=[];let cur=[],len=0;const flush=()=>{if(cur.length){out.push([name+(out.length+1),'return [['+cur.join(';')+']]\n']);cur=[];len=0}};
 for(const r of rows){if(len+r.length>max)flush();cur.push(r);len+=r.length+1}flush();return out};
const serverMods=[...chunk('Roads',roads,8*6000),...chunk('Buildings',blds,8*6000),['Landmarks','return '+luaVal(lmParts.map(r=>r.join(',')))+'\n']];
// the props: one module per family chunk ({kind, shape, R, n, rows = "x,z,y,h,sx,sy,sz,col,..."})
const propMods=[];props.forEach((pr,i)=>{for(let o=0,k=1;o<pr.rows.length;o+=9*4000,k++)propMods.push(['Props_'+i+'_'+k,'return '+luaVal({kind:pr.kind,shape:pr.shape,R:pr.R,rows:pr.rows.slice(o,o+9*4000).join(',')})+'\n'])});
const meta={scale:3,radius:R,startHeading:+ST.h.toFixed(4),startY:+TH(ST.x,ST.z).toFixed(2),roadCount:roads.length/8,buildingCount:blds.length/8,
 attribution:'Map data © OpenStreetMap contributors (ODbL) · terrain NASA SRTM',
 bank:{x:+(S.BANK.x-ST.x).toFixed(1),z:+(S.BANK.z-ST.z).toFixed(1),y:+TH(S.BANK.x,S.BANK.z).toFixed(1)},
 shop:{x:+(S.SHOP.x-ST.x).toFixed(1),z:+(S.SHOP.z-ST.z).toFixed(1),y:+TH(S.SHOP.x,S.SHOP.z).toFixed(1)},
 rarity:S.RARN.map((n,k)=>({name:n,mult:S.RMULT[k]})),labels,cars};
// the sound atlas index (tools/make_roblox_audio.js writes it next to the sound file; without it the game has no sound)
const ATL=path.join(OUT,'audio','AudioAtlas.lua'),atlas=fs.existsSync(ATL)?fs.readFileSync(ATL,'utf8').replace(/\r\n/g,'\n'):'return { sampleRate = 22050, seconds = 0 }\n';
for(let o=0,k=1;o<colRows.length;o+=COLW*6000,k++)propMods.push(['Objects_'+k,'return '+luaVal({types:OTYPES,w:COLW,rows:colRows.slice(o,o+COLW*6000).join(',')})+'\n']);
propMods.push(['Signs','return '+luaVal({R:signR,rows:signRows.join(','),text:signText})+'\n']);
const sharedMods=[...propMods,['AudioAtlas',atlas],['Meta','return '+luaVal(meta)+'\n'],['Places','return '+luaVal(places)+'\n'],['Circuits','return '+luaVal(circuits)+'\n'],['Rules','return '+luaVal(rules)+'\n'],['Heights','return '+luaVal({x0:-R-100,z0:-R-100,cell:HC,n:HN})+'\n'],...chunk('HeightData',hts,40000),
 ['GraphNodes','return [['+nodes.join(',')+']]\n'],['GraphNames','return '+luaVal(names)+'\n'],...chunkRows('GraphEdges',edgeRows,240000)];
for(const[dir,mods]of[['data',serverMods],['shared',sharedMods]]){const D=path.join(OUT,dir);fs.mkdirSync(D,{recursive:true});
 for(const f of fs.readdirSync(D))fs.unlinkSync(path.join(D,f));for(const[n,s]of mods)fs.writeFileSync(path.join(D,n+'.lua'),s)}
fs.rmSync(path.join(OUT,'build'),{recursive:true,force:true});
// ---- rbxlx: the src tree + both data folders (Studio supplies every property not written here) ----
let ref=0;const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const item=(cls,name,kids,src,props)=>{if(src&&src.includes(']]>'))throw Error(name+' contains ]]>');return'<Item class="'+cls+'" referent="RBX'+(ref++)+'"><Properties><string name="Name">'+esc(name)+'</string>'+(props||'')+
 (src!==undefined?'<ProtectedString name="Source"><![CDATA['+src+']]></ProtectedString>':'')+'</Properties>'+(kids||[]).join('')+'</Item>'};
function tree(dir){return fs.readdirSync(dir).sort().map(f=>{const p=path.join(dir,f);if(fs.statSync(p).isDirectory())return item('Folder',f,tree(p));
 const src=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');if(f.endsWith('.server.lua'))return item('Script',f.slice(0,-11),[],src);if(f.endsWith('.client.lua'))return item('LocalScript',f.slice(0,-11),[],src);
 if(f.endsWith('.lua'))return item('ModuleScript',f.slice(0,-4),[],src);throw Error('unexpected file '+p)})}
function editSign(){const msg='IRBID DRIVE\nPress ▶ Play (F5) to build the map of Irbid and drive.\nThe streets, buildings and terrain are created when the game starts.';
 const cf='<CoordinateFrame name="CFrame"><X>0</X><Y>25</Y><Z>-60</Z><R00>1</R00><R01>0</R01><R02>0</R02><R10>0</R10><R11>1</R11><R12>0</R12><R20>0</R20><R21>0</R21><R22>1</R22></CoordinateFrame>';
 const gui=face=>item('SurfaceGui','Msg',[item('TextLabel','Text',[],undefined,'<UDim2 name="Size"><XS>1</XS><XO>0</XO><YS>1</YS><YO>0</YO></UDim2><float name="BackgroundTransparency">1</float>'+
  '<bool name="TextScaled">true</bool><bool name="TextWrapped">true</bool><Color3 name="TextColor3"><R>1</R><G>1</G><B>1</B></Color3><string name="Text">'+esc(msg)+'</string>')],undefined,
  '<token name="Face">'+face+'</token><token name="SizingMode">1</token><float name="PixelsPerStud">12</float>');
 return item('Part','EditModeSign',[gui(2),gui(5)],undefined,'<bool name="Anchored">true</bool><bool name="CanCollide">false</bool><bool name="CanQuery">false</bool><bool name="CanTouch">false</bool>'+cf+
  '<Vector3 name="size"><X>120</X><Y>40</Y><Z>2</Z></Vector3><Color3uint8 name="Color3uint8">'+(0xFF000000+0x1E*65536+0x30*256+0x50)+'</Color3uint8>')}
const modsOf=mods=>mods.map(([n,s])=>item('ModuleScript',n,[],s)),SRC=path.join(OUT,'src');
// the real-world vehicle catalogue (tools/vehicle_catalog/make_roblox_catalog.py writes roblox/catalog/; browse-only data, packed as it is)
const CATD=path.join(OUT,'catalog'),catalogMods=fs.existsSync(CATD)?fs.readdirSync(CATD).filter(f=>f.endsWith('.lua')).sort().map(f=>[f.slice(0,-4),fs.readFileSync(path.join(CATD,f),'utf8').replace(/\r\n/g,'\n')]):[];
if(!catalogMods.some(m=>m[0]==='CatalogDict'))cl0('warning: no roblox/catalog/CatalogDict.lua: the car encyclopedia will say the catalogue is not installed');
const xml='<roblox xmlns:xmime="http://www.w3.org/2005/05/xmlmime" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://www.roblox.com/roblox.xsd" version="4">'+
 // streaming off: every player's device does its own ground / wall ray tests against the whole map. The map is built by WorldBuilder when the
 // game runs, so Studio's edit view would show only the sky: a board in front of the default camera says so (WorldBuilder removes it)
 item('Workspace','Workspace',[editSign()],undefined,'<bool name="StreamingEnabled">false</bool>')+
 // Future lighting (Lighting.Technology 4; scripts cannot change it): shadows and lights for High / Ultra, Roblox lowers it by itself on
 // weaker devices. Everything else about the light is set by World/Sky and Client/Graphics, Client/Weather at run time
 item('Lighting','Lighting',[],undefined,'<token name="Technology">4</token>')+
 item('ReplicatedStorage','ReplicatedStorage',[...tree(path.join(SRC,'ReplicatedStorage')),item('Folder','IrbidShared',modsOf(sharedMods)),item('Folder','IrbidCatalog',modsOf(catalogMods))])+
 item('ServerStorage','ServerStorage',[item('Folder','IrbidData',modsOf(serverMods))])+
 item('ServerScriptService','ServerScriptService',tree(path.join(SRC,'ServerScriptService')))+
 item('StarterPlayer','StarterPlayer',[item('StarterPlayerScripts','StarterPlayerScripts',tree(path.join(SRC,'StarterPlayerScripts')))])+'</roblox>\n';
fs.writeFileSync(path.join(OUT,'IrbidDrive.rbxlx'),xml);
cl0('roads',roads.length/8,'buildings',blds.length/8,'(cut back from a road '+trim+', dropped '+drop+')','labels',labels.length);
cl0('graph: nodes',nodes.length/3,'edges',edgeRows.length,'names',names.length,'| places',places.length,'| circuits',circuits.map(c=>c.name+' ('+c.cps.length+' checkpoints, '+c.path.split(',').length/3+' points)').join(', '));
cl0('props',Object.entries(propStat).map(([k,v])=>k+' '+v).join(', '),'| landmark parts',lmParts.length);
cl0('colliders',cols.length,Object.entries(colStat).map(([k,v])=>k+' '+v).join(', '),'| sign plates',signText.length);
cl0('signals',signals.length,'heads',heads.length,'bumps',bumps.length,'drift zones',dzones.length,'tour',tour.length,'ramps',ramps.length);
cl0('cars',cars.length,cars.map(c=>c.name+' T'+c.tier+' '+(c.vm*3.6).toFixed(0)+'km/h').join(', '));
cl0('rbxlx',(xml.length/1e6).toFixed(2),'MB ->',path.join(OUT,'IrbidDrive.rbxlx'));
