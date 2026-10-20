// Irbid Drive -> Roblox place file. Run from the repo root:  node tools/make_roblox.js dist/irbid-drive.html [radius_m]
// Loads the built game headless (same stub DOM as the Node tests), takes the REAL map data it uses (OSM road graph with widths, OSM building
// pieces, SRTM terrain heights, landmark names, the start point, per-car stats), and writes:
//   roblox/IrbidDrive.rbxlx      a place file to open in Roblox Studio (scripts + map data; the map is built by WorldBuilder when the game starts)
//   roblox/data/*.lua            the same data modules (for Rojo: roblox/default.project.json)
// The Lua game code lives in roblox/src (hand-written, Luau). Map data: (c) OpenStreetMap contributors, ODbL -> shown in-game.
const fs=require('fs'),path=require('path');global.THREE=require(path.resolve('node_modules/three'));
const noop=new Proxy(function(){},{get:()=>noop,apply:()=>noop,set:()=>true});
THREE.WebGLRenderer=class{constructor(){this.domElement={style:{},insertAdjacentElement(){}};this.shadowMap={}}setPixelRatio(){}setSize(){}render(){}};
const el=()=>({getContext:()=>new Proxy(noop,{get:(t,k)=>k==='measureText'?(q=>({width:String(q).length*14})):t[k]}),appendChild(){},remove(){},style:{},dataset:{},setAttribute(){},addEventListener(){},focus(){},blur(){},select(){},value:'',children:[],classList:{add(){},remove(){},toggle(){}},set innerHTML(v){},get innerHTML(){return''},querySelector:()=>el(),querySelectorAll:()=>[]});
global.document={getElementById:el,createElement:el,body:{appendChild(){}},head:{appendChild(){}}};global.window=global;
global.addEventListener=()=>{};global.innerWidth=1280;global.innerHeight=720;global.devicePixelRatio=1;
global.performance={now:()=>0};global.requestAnimationFrame=()=>{};global.setTimeout=()=>{};
const LS={};global.localStorage={getItem:k=>k in LS?LS[k]:null,setItem:(k,v)=>{LS[k]=String(v)}};
const cl0=console.log;console.log=()=>{};
const html=fs.readFileSync(process.argv[2]||'dist/irbid-drive.html','utf8'),R=+process.argv[3]||2500;
(0,eval)(html.match(/<script>\n([\s\S]*?)<\/script>/)[1]+';global.__s={EDGES,TH,START,BLDD,BLDO,PLACES,PORS,setPlayerCar,P}');
const S=global.__s,TH=S.TH,ST=S.START,OUT=path.resolve('roblox');
const dm=v=>Math.round(v*10);
// ---- roads: one straight piece per polyline segment, centred on the start; class 0 major / 1 local / 2 service, roundabout 3 ----
const CLS={hw:0,arch:0,petra:0,main:0,ring:3,ramp:0,local:1,svc:2,alley:2,campus:2,drift:1};
const roads=[],segs=[];
for(const e of S.EDGES){if(e.tn)continue;const p=e.pts;for(let k=1;k<p.length;k++){const a=p[k-1],b=p[k];
 if(Math.hypot(a[0]-ST.x,a[1]-ST.z)>R&&Math.hypot(b[0]-ST.x,b[1]-ST.z)>R)continue;if(Math.hypot(b[0]-a[0],b[1]-a[1])<.3)continue;
 const w=Math.max(3,e.w||6);roads.push(dm(a[0]-ST.x),dm(a[1]-ST.z),dm(b[0]-ST.x),dm(b[1]-ST.z),dm(TH(a[0],a[1])),dm(TH(b[0],b[1])),dm(w),CLS[e.kind]??1);segs.push([a[0],a[1],b[0],b[1],w])}}
// segment hash (25 m) to keep buildings off the roads
const G=new Map(),gk=(i,j)=>i*100000+j;
segs.forEach((s,i)=>{const x0=Math.floor(Math.min(s[0],s[2])/25)-1,x1=Math.floor(Math.max(s[0],s[2])/25)+1,z0=Math.floor(Math.min(s[1],s[3])/25)-1,z1=Math.floor(Math.max(s[1],s[3])/25)+1;
 for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++){const k=gk(x,z);if(!G.has(k))G.set(k,[]);G.get(k).push(i)}});
const segD=(x,z,s)=>{const dx=s[2]-s[0],dz=s[3]-s[1],l=dx*dx+dz*dz||1;let t=((x-s[0])*dx+(z-s[1])*dz)/l;t=t<0?0:t>1?1:t;return Math.hypot(x-s[0]-dx*t,z-s[1]-dz*t)};
// ---- buildings: OSM pieces (x, z, width, depth, angle, height, type); a piece whose footprint reaches a road centre strip is dropped ----
const blds=[];let drop=0;
for(const L of[S.BLDD.p,S.BLDO.p])for(let i=0;i<L.length;i+=7){const x=L[i]/10,z=L[i+1]/10,w=L[i+2]/10,d=L[i+3]/10,ry=L[i+4]/100,h=L[i+5]/2,ty=L[i+6]&7;
 if(Math.hypot(x-ST.x,z-ST.z)>R||w<2||d<2)continue;
 let hit=false;const c=G.get(gk(Math.floor(x/25),Math.floor(z/25)));if(c)for(const si of c){const s=segs[si];if(segD(x,z,s)<s[4]/2+.45*Math.min(w,d)){hit=true;break}}
 if(hit){drop++;continue}
 const cs=Math.cos(ry),sn=Math.sin(ry);let y=1e9;for(const[u,v]of[[1,1],[1,-1],[-1,1],[-1,-1]])y=Math.min(y,TH(x+cs*u*w/2+sn*v*d/2,z-sn*u*w/2+cs*v*d/2));
 blds.push(dm(x-ST.x),dm(z-ST.z),dm(w),dm(d),Math.round(ry*1000),dm(Math.max(3,h)),dm(y),ty)}
// ---- terrain: 40 m tiles, height at the tile centre ----
const TS=40,ter=[];for(let x=-R;x<=R;x+=TS)for(let z=-R;z<=R;z+=TS)if(Math.hypot(x,z)<=R+TS)ter.push(dm(x),dm(z),dm(TH(ST.x+x,ST.z+z)));
// ---- landmark labels ----
const LK=new Set(['landmark','square','museum','mall','campus','hospital','stadium','heritage','park','transport','church']);
const labels=S.PLACES.filter(p=>!p.gen&&LK.has(p.kind)&&p.r<150&&Math.hypot(p.x-ST.x,p.z-ST.z)<R).slice(0,120).map(p=>({n:p.name,x:+(p.x-ST.x).toFixed(1),z:+(p.z-ST.z).toFixed(1),y:+TH(p.x,p.z).toFixed(1)}));
// ---- cars: stats taken from the game's own cars (the same tune base), shown with generic names (no brands or trademarks in Roblox) ----
const PICK=[['Ford Focus RS','Hot Hatch RS',0,false],['Toyota AE86 Trueno','Classic 86',8000,false],['Ford Mustang GT','Muscle V8',15000,false],['Nissan Silvia S15 Spec-R','Drift Coupe S',30000,false],['Nissan GT-R R35','AWD Rocket',60000,false],['Lamborghini Huracán','Super V10',0,true]];
const cars=[];for(const[n,g,price,vip]of PICK){const i=S.PORS.findIndex(m=>m[0]===n);if(i<0)throw Error('car not in the game: '+n);S.setPlayerCar(i);
 const m=S.PORS[i];cars.push({name:g,price,vip,vm:+S.P.vm.toFixed(2),a0:+S.P.a0.toFixed(2),bk:+S.P.bk.toFixed(2),hd:+S.P.hd.toFixed(3),L:m[3],W:m[4],H:m[5]})}
// ---- write ----
const chunk=(name,arr,per)=>{const out=[];for(let i=0,k=1;i<arr.length;i+=per,k++)out.push([name+k,'return [['+arr.slice(i,i+per).join(',')+']]\n']);return out};
const mods=[...chunk('Roads',roads,8*6000),...chunk('Buildings',blds,8*6000),...chunk('Terrain',ter,3*20000),
 ['Meta','return '+luaVal({scale:3,radius:R,startHeading:+ST.h.toFixed(4),startY:+TH(ST.x,ST.z).toFixed(2),roadCount:roads.length/8,buildingCount:blds.length/8,
  attribution:'Map data © OpenStreetMap contributors (ODbL) · terrain NASA SRTM',labels,cars})+'\n']];
function luaVal(v){if(Array.isArray(v))return'{'+v.map(luaVal).join(',')+'}';if(v&&typeof v==='object')return'{'+Object.entries(v).map(([k,x])=>k+'='+luaVal(x)).join(',')+'}';
 if(typeof v==='string')return JSON.stringify(v);if(typeof v==='boolean')return String(v);return String(v)}
fs.mkdirSync(path.join(OUT,'data'),{recursive:true});for(const f of fs.readdirSync(path.join(OUT,'data')))fs.unlinkSync(path.join(OUT,'data',f));
for(const[n,s]of mods)fs.writeFileSync(path.join(OUT,'data',n+'.lua'),s);
// ---- rbxlx (scripts + modules only; Studio supplies every default property) ----
const rd=f=>fs.readFileSync(path.join(OUT,'src',f),'utf8').replace('--@@CARS@@',luaVal(cars));let ref=0;
const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const item=(cls,name,kids,src)=>{if(src&&src.includes(']]>'))throw Error(name+' contains ]]>');return'<Item class="'+cls+'" referent="RBX'+(ref++)+'"><Properties><string name="Name">'+esc(name)+'</string>'+(src!==undefined?'<ProtectedString name="Source"><![CDATA['+src+']]></ProtectedString>':'')+'</Properties>'+(kids||[]).join('')+'</Item>'};
const xml='<roblox xmlns:xmime="http://www.w3.org/2005/05/xmlmime" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://www.roblox.com/roblox.xsd" version="4">'+
 item('ReplicatedStorage','ReplicatedStorage',[item('ModuleScript','Config',[],rd('ReplicatedStorage/Config.lua'))])+
 item('ServerStorage','ServerStorage',[item('Folder','IrbidData',mods.map(([n,s])=>item('ModuleScript',n,[],s)))])+
 item('ServerScriptService','ServerScriptService',[item('Script','WorldBuilder',[],rd('ServerScriptService/WorldBuilder.server.lua')),item('Script','GameServer',[],rd('ServerScriptService/GameServer.server.lua'))])+
 item('StarterPlayer','StarterPlayer',[item('StarterPlayerScripts','StarterPlayerScripts',[item('LocalScript','CarClient',[],rd('StarterPlayerScripts/CarClient.client.lua'))])])+'</roblox>\n';
fs.writeFileSync(path.join(OUT,'IrbidDrive.rbxlx'),xml);
fs.mkdirSync(path.join(OUT,'build'),{recursive:true});fs.writeFileSync(path.join(OUT,'build','Config.lua'),rd('ReplicatedStorage/Config.lua'));
cl0('roads',roads.length/8,'buildings',blds.length/8,'(dropped on roads '+drop+')','terrain tiles',ter.length/3,'labels',labels.length,'cars',cars.map(c=>c.name+' '+(c.vm*3.6).toFixed(0)+' km/h').join(', '));
cl0('rbxlx',(xml.length/1e6).toFixed(2),'MB ->',path.join(OUT,'IrbidDrive.rbxlx'));
