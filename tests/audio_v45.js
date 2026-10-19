// v45 engine-audio data checks (Node, no Web Audio needed): node tests/audio_v45.js dist/irbid-drive.html
// Every car gets an engine profile; the generated exhaust cycle has its strongest harmonic at the firing order for even-firing engines; cross-plane
// V8s carry more sub-firing (burble) energy than flat-plane V8s; every combustion car's waveform is distinct; EVs have no combustion wave; the game
// boots and drives without an AudioContext (no crash, sound reported unavailable). Exits 1 on failure.
const fs=require('fs');global.THREE=require(require('path').resolve('node_modules/three'));
const noop=new Proxy(function(){},{get:()=>noop,apply:()=>noop,set:()=>true});
THREE.WebGLRenderer=class{constructor(){this.domElement={style:{},insertAdjacentElement(){}};this.shadowMap={}}setPixelRatio(){}setSize(){}render(){}};
const el=()=>({getContext:()=>new Proxy(noop,{get:(t,k)=>k==='measureText'?(q=>({width:String(q).length*14})):t[k]}),appendChild(){},remove(){},style:{},dataset:{},setAttribute(){},addEventListener(){},focus(){},blur(){},select(){},value:'',children:[],classList:{add(){},remove(){},toggle(){}},set innerHTML(v){},get innerHTML(){return''},querySelector:()=>el(),querySelectorAll:()=>[]});
global.document={getElementById:el,createElement:el,body:{appendChild(){}}};global.window=global;
global.addEventListener=()=>{};global.innerWidth=1280;global.innerHeight=720;global.devicePixelRatio=1;
let t=1000;global.performance={now:()=>t};global.requestAnimationFrame=()=>{};global.setTimeout=()=>{};
const LS={};global.localStorage={getItem:k=>k in LS?LS[k]:null,setItem:(k,v)=>{LS[k]=String(v)}};
let seed=7;Math.random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};
const cl0=console.log;console.log=()=>{};
const html=fs.readFileSync(process.argv[2],'utf8');
(0,eval)(html.match(/<script>\n([\s\S]*?)<\/script>/)[1]+';global.__s={PORS,engProfile,engCycle,ENG_DOC,AU,audTick,updP,P,keys,traffic}');
const S=global.__s;let fail=0;const ok=(c,m,v)=>{cl0((c?'PASS ':'FAIL ')+m+(v!==undefined?'  ['+v+']':''));if(!c)fail++};
const N=S.PORS.length,pr=S.PORS.map((m,i)=>S.engProfile(i));
ok(pr.every(e=>e&&e.code),'every car has an engine profile',N);
const doc=pr.filter(e=>e.src.startsWith('published')).length,var_=pr.filter(e=>e.src.includes('variant')).length,est=pr.filter(e=>e.src.startsWith('estimate')).length;
ok(est===0,'every car is in the engine table (no body-type estimates needed)','published '+doc+' (of which variant not specified '+var_+'), electric '+pr.filter(e=>e.ev).length+', estimates '+est);
const codes={};pr.forEach(e=>codes[e.code]=(codes[e.code]||0)+1);cl0('     engine codes: '+Object.entries(codes).sort((a,b)=>b[1]-a[1]).map(([k,v])=>k+' '+v).join(', '));
ok(Object.keys(codes).length>=20,'at least 20 different engine configurations',Object.keys(codes).length);
const mag=(c,k)=>Math.hypot(c.re[k],c.im[k]);let badDom=[];const hash=new Set();let comb=0;
for(const e of pr){if(e.ev)continue;comb++;const c=S.engCycle(e);let best=1;for(let k=1;k<c.re.length;k++)if(mag(c,k)>mag(c,best))best=k;
 const fire=e.lay==='R'?4:e.cyl,even=!(e.lay==='V'&&e.cyl===8)&&e.lay!=='U';if(even&&best!==fire)badDom.push(e.name+' '+e.code+' k='+best);
 hash.add(Array.from(c.re.slice(1,40)).map(x=>x.toFixed(5)).join(','))}
ok(badDom.length===0,'even-firing engines: strongest harmonic = firing order (cylinders per 720 deg)',badDom.slice(0,5).join('; ')||'all '+comb);
const sub=e=>{const c=S.engCycle(e);let a=0,b=0;for(let k=1;k<c.re.length;k++){const m=mag(c,k)**2;if(k%e.cyl)a+=m;else b+=m}return a/(a+b)};
const cp=pr.filter(e=>e.code.startsWith('V8')&&!e.ev),fp=pr.filter(e=>e.code.startsWith('P8'));
const mcp=cp.reduce((s,e)=>s+sub(e),0)/cp.length,mfp=fp.reduce((s,e)=>s+sub(e),0)/fp.length;
ok(mcp>mfp*1.5,'cross-plane V8 (burble) has more sub-firing energy than flat-plane V8','cross '+mcp.toFixed(3)+' vs flat '+mfp.toFixed(3));
ok(hash.size===comb,'every combustion car has its own waveform (per-car variation)',hash.size+' / '+comb);
ok(pr.filter(e=>e.ev).every(e=>S.engCycle(e)===null),'EVs have no combustion waveform (motor whine only)');
ok(S.engProfile(S.PORS.findIndex(m=>m[0]==='Mazda RX-7 FD3S')).lay==='R'&&S.engProfile(S.PORS.findIndex(m=>m[0]==='Toyota Hilux')).asp==='d'&&S.engProfile(S.PORS.findIndex(m=>m[0]==='Tesla Model 3')).ev,'rotary, diesel and electric profiles recognised');
ok(!S.AU.ok&&!S.AU.ctx,'Node has no Web Audio: audio disabled, no context');
let threw=null;try{for(let i=0;i<120;i++){S.updP(1/60,false);S.audTick(1/60)}}catch(e){threw=e.message}ok(!threw&&Number.isFinite(S.P.x),'game loop runs without audio support (no crash)',threw||'ok');
cl0(fail?'audio_v45: '+fail+' FAILED':'audio_v45: all passed');process.exit(fail?1:0);
