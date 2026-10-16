// Off-mode physics identity (node tests/off_trace.js dist/irbid-drive.html): scripted keyboard inputs (throttle, steer, brake, handbrake,
// throttle+brake) on 4 cars with damage Off; hashes P every frame. v38 == v39 hash below. Exits 1 if physics with damage Off changed.
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
const out=[];
for(const car of ['Ford Focus RS','Porsche 911','Ford Fiesta ST','Lamborghini Aventador']){
 S.setPlayerCar(S.PORS.findIndex(m=>m[0]===car));P.x=-135;P.z=-733;P.h=1.6;P.vx=P.vz=P.vy=0;P.y=P.pgh=S.groundH(P.x,P.z);P.gnd=true;
 const seq=[[120,{KeyW:1}],[60,{KeyW:1,KeyA:1}],[60,{KeyW:1,KeyD:1,Space:1}],[90,{KeyS:1}],[60,{KeyW:1,KeyS:1}],[60,{KeyW:1,Space:1}],[120,{KeyW:1,KeyA:1}],[60,{}],[60,{KeyS:1}]];
 for(const[n,ks]of seq){for(const c in k)k[c]=0;Object.assign(k,ks);for(let i=0;i<n;i++){t+=16.7;S.updP(1/60,false);out.push([P.x,P.z,P.y,P.vx,P.vz,P.h].map(v=>v.toFixed(9)).join(','))}}
}
const h=require('crypto').createHash('sha1').update(out.join(String.fromCharCode(10))).digest('hex'),REF='b48ea9338ceb25fcae28572c16b3aaf1d75163df';
cl0((h===REF?'PASS':'FAIL')+' Off-mode physics trace '+h+' frames '+out.length+(h===REF?' (identical to v38)':' expected '+REF));process.exit(h===REF?0:1);
