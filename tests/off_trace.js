// Off-mode physics identity (node tests/off_trace.js dist/irbid-drive.html): scripted keyboard inputs (throttle, steer, brake, handbrake,
// throttle+brake) on 4 cars with damage Off; hashes P every frame. Two hashes: PHYS = the same drive with every world collider removed (pure updP;
// identical on v38, v39 and v40) and WORLD = with the world (changes whenever buildings/landmarks near Al-Balad move: v40 moved the clock tower and the
// heritage houses onto their real OSM spots). Exits 1 if PHYS changed; a WORLD change is reported, not a failure.
const fs=require('fs');global.THREE=require(require('path').resolve('node_modules/three'));
const noop=new Proxy(function(){},{get:()=>noop,apply:()=>noop,set:()=>true});
THREE.WebGLRenderer=class{constructor(){this.domElement={style:{},insertAdjacentElement(){}};this.shadowMap={}}setPixelRatio(){}setSize(){}render(){}};
const el=()=>({getContext:()=>new Proxy(noop,{get:(t,k)=>k==='measureText'?(q=>({width:String(q).length*14})):t[k]}),appendChild(){},remove(){},style:{},dataset:{},setAttribute(){},addEventListener(){},focus(){},blur(){},select(){},value:'',children:[],classList:{add(){},remove(){},toggle(){}},set innerHTML(v){},set textContent(v){}});
global.document={getElementById:el,createElement:el,body:{appendChild(){}}};global.window=global;
global.addEventListener=()=>{};global.innerWidth=1280;global.innerHeight=720;global.devicePixelRatio=1;
let t=1000;global.performance={now:()=>t};global.requestAnimationFrame=()=>{};global.setTimeout=()=>{};
const LS={};global.localStorage={getItem:k=>k in LS?LS[k]:null,setItem:(k,v)=>{LS[k]=String(v)}};
let seed=7;Math.random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};
const cl0=console.log;console.log=()=>{};
const html=fs.readFileSync(process.argv[2],'utf8');
(0,eval)(html.match(/<script>\n([\s\S]*?)<\/script>/)[1]+';global.__s={updP,keys,P,PORS,setPlayerCar,groundH,traffic,bots,heist,COL};');
const S=global.__s,P=S.P,k=S.keys;S.traffic.length=0;S.bots.length=0;S.heist.cops.length=0;
(0,eval)('fine=function(){};toast=function(){}');
function run(){const out=[];
for(const car of ['Ford Focus RS','Porsche 911','Ford Fiesta ST','Lamborghini Aventador']){
 S.setPlayerCar(S.PORS.findIndex(m=>m[0]===car));P.x=-135;P.z=-733;P.h=1.6;P.vx=P.vz=P.vy=0;P.y=P.pgh=S.groundH(P.x,P.z);P.gnd=true;
 const seq=[[120,{KeyW:1}],[60,{KeyW:1,KeyA:1}],[60,{KeyW:1,KeyD:1,Space:1}],[90,{KeyS:1}],[60,{KeyW:1,KeyS:1}],[60,{KeyW:1,Space:1}],[120,{KeyW:1,KeyA:1}],[60,{}],[60,{KeyS:1}]];
 for(const[n,ks]of seq){for(const c in k)k[c]=0;Object.assign(k,ks);for(let i=0;i<n;i++){t+=16.7;S.updP(1/60,false);out.push([P.x,P.z,P.y,P.vx,P.vz,P.h].map(v=>v.toFixed(9)).join(','))}}
}return out}
const sha=o=>require('crypto').createHash('sha1').update(o.join(String.fromCharCode(10))).digest('hex');
const saved=new Map(S.COL);S.COL.clear();const op=run(),hp=sha(op);for(const[k2,v]of saved)S.COL.set(k2,v);const hw=sha(run());
const REF_PHYS='b4f220eefa2592e45aafffa914322161112cb4fa',REF_WORLD='67ecbca6e3d8d90ac7ccc4c4f47b1ef663a1cc02';   // v38 world hash was b48ea933... (v38 = v39)
cl0((hp===REF_PHYS?'PASS':'FAIL')+' Off-mode physics trace (no colliders) '+hp+' frames '+op.length+(hp===REF_PHYS?' (identical to v38)':' expected '+REF_PHYS));
cl0((hw===REF_WORLD?'same':'CHANGED')+' world trace '+hw+(hw===REF_WORLD?'':' (was '+REF_WORLD+': geometry near Al-Balad moved?)'));process.exit(hp===REF_PHYS?0:1);
