// Writes manifest/signals.json and manifest/speed_bumps.json from the build (v44). usage: node tools/gen_signal_manifest.js dist/irbid-drive.html
// Every signalised junction / speed bump with its position (game metres + lat/lon), source and whether it is estimated. Never hand-edit the outputs.
const fs=require('fs');global.THREE=require(require('path').resolve('node_modules/three'));
const noop=new Proxy(function(){},{get:()=>noop,apply:()=>noop,set:()=>true});
THREE.WebGLRenderer=class{constructor(){this.domElement={style:{},insertAdjacentElement(){}};this.shadowMap={}}setPixelRatio(){}setSize(){}render(){}};
const el=()=>({getContext:()=>new Proxy(noop,{get:(t,k)=>k==='measureText'?(q=>({width:String(q).length*14})):t[k]}),appendChild(){},remove(){},style:{},dataset:{},setAttribute(){},addEventListener(){},focus(){},blur(){},select(){},value:'',children:[],classList:{add(){},remove(){},toggle(){}},set innerHTML(v){},set textContent(v){}});
global.document={getElementById:el,createElement:el,body:{appendChild(){}}};global.window=global;global.addEventListener=()=>{};global.innerWidth=1280;global.innerHeight=720;global.devicePixelRatio=1;
global.performance={now:()=>0};global.requestAnimationFrame=()=>{};global.setTimeout=()=>{};global.localStorage={getItem:()=>null,setItem(){}};
const html=fs.readFileSync(process.argv[2]||'dist/irbid-drive.html','utf8');const c0=console.log;console.log=()=>{};
(0,eval)(html.match(/<script>\n([\s\S]*?)<\/script>/)[1]+';global.__s={SIGNALS,SIG_SKIPPED,IRBID_SPEED_BUMPS,SIG_CYC,SIG_G,SIG_Y};');console.log=c0;
const S=global.__s;
// the game projection, same maths as osm/overpass/proj.py (WGS84 transverse Mercator at 32.55 N 35.85 E; x east, z = -north), inverted by Newton steps
const A=6378137,F=1/298.257223563,E2=F*(2-F),EP2=E2/(1-E2),LAT0=32.55*Math.PI/180,LON0=35.85*Math.PI/180;
const mer=p=>A*((1-E2/4-3*E2*E2/64-5*E2**3/256)*p-(3*E2/8+3*E2*E2/32+45*E2**3/1024)*Math.sin(2*p)+(15*E2*E2/256+45*E2**3/1024)*Math.sin(4*p)-(35*E2**3/3072)*Math.sin(6*p)),M0=mer(LAT0);
function ll2xz(lat,lon){const p=lat*Math.PI/180,l=lon*Math.PI/180,N=A/Math.sqrt(1-E2*Math.sin(p)**2),T=Math.tan(p)**2,C=EP2*Math.cos(p)**2,a=(l-LON0)*Math.cos(p);
 const x=N*(a+(1-T+C)*a**3/6+(5-18*T+T*T+72*C-58*EP2)*a**5/120),y=mer(p)-M0+N*Math.tan(p)*(a*a/2+(5-T+9*C+4*C*C)*a**4/24+(61-58*T+T*T+600*C-330*EP2)*a**6/720);return[x,-y]}
const ll=(x,z)=>{let la=32.55-z/110900,lo=35.85+x/93900;for(let i=0;i<30;i++){const q=ll2xz(la,lo);lo+=(x-q[0])/93900;la-=(z-q[1])/110900}return[+la.toFixed(7),+lo.toFixed(7)]};
const J=new Map();for(const s of S.SIGNALS){if(!J.has(s.junction))J.set(s.junction,{junction:s.junction,nodes:[],estimated:s.estimated,source:s.source,offset_s:s.offset,heads:0});const j=J.get(s.junction);j.nodes.push({id:s.id,x:s.x,z:s.z,latlon:ll(s.x,s.z)});j.heads+=s.heads}
fs.writeFileSync('manifest/signals.json',JSON.stringify({generated_by:'tools/gen_signal_manifest.js',timing:{cycle_s:S.SIG_CYC,green_s:S.SIG_G,amber_s:S.SIG_Y,all_red_s:S.SIG_CYC/2-S.SIG_G-S.SIG_Y,note:'per approach; 4 offset groups; estimated timing, not Irbid controller data'},
 junctions:[...J.values()],not_modelled:S.SIG_SKIPPED.map(q=>Object.assign({latlon:ll(q.x,q.z)},q))},null,1));
fs.writeFileSync('manifest/speed_bumps.json',JSON.stringify({generated_by:'tools/gen_signal_manifest.js',profiles:'cos^2 cross-section; OSM hump 3.7 m x 75 mm, OSM bump / estimated 0.9 m x 75 mm (estimates)',
 bumps:S.IRBID_SPEED_BUMPS.map(b=>({x:+b.x.toFixed(1),z:+b.z.toFixed(1),latlon:ll(b.x,b.z),len_m:b.len,height_m:b.h,width_m:+b.width.toFixed(2),estimated:b.estimated,source:b.estimated?'inferred near OSM '+b.kind+': '+b.place:'OSM '+b.source+' ('+b.name+')',road:b.road}))},null,1));
console.log('signals: '+J.size+' junctions ('+[...J.values()].filter(j=>!j.estimated).length+' OSM), skipped '+S.SIG_SKIPPED.length+'; speed bumps '+S.IRBID_SPEED_BUMPS.length+' ('+S.IRBID_SPEED_BUMPS.filter(b=>!b.estimated).length+' OSM)');
