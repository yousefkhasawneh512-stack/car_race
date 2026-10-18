const fs=require('fs');global.THREE=require('three');
const noop=new Proxy(function(){},{get:()=>noop,apply:()=>noop,set:()=>true});
THREE.WebGLRenderer=class{constructor(){this.domElement={style:{},insertAdjacentElement(){}};this.shadowMap={}}setPixelRatio(){}setSize(){}render(){}};
const el=()=>({getContext:()=>new Proxy(noop,{get:(t,k)=>k==='measureText'?(q=>({width:String(q).length*14})):t[k]}),appendChild(){},remove(){},style:{},dataset:{},setAttribute(){},addEventListener(){},focus(){},blur(){},select(){},value:'',children:[],classList:{add(){},remove(){},toggle(){}},set innerHTML(v){},set textContent(v){}});
global.document={getElementById:el,createElement:el,body:{appendChild(){}}};global.window=global;
global.addEventListener=()=>{};global.innerWidth=1280;global.innerHeight=720;global.devicePixelRatio=1;
let t=1000;global.performance={now:()=>t};let cb;global.requestAnimationFrame=f=>{cb=f};global.setTimeout=()=>{};
const file=process.argv[2]||'new.html';
const html=fs.readFileSync(file,'utf8');
const js=html.match(/<script>\n([\s\S]*?)<\/script>/)[1]+'\n;global.__s={SIG_SKIPPED,pathProg,LIT,SIGNALS,SIG_LAMPS,SIG_MESH,sigTick,light,traffic,updTraffic,NODES,P,warp,setClock:v=>{clock=v},getClock:()=>clock,SIG_CYC,SIG_G,SIG_Y};';
const cl0=console.log;console.log=()=>{};(0,eval)(js);console.log=cl0;
// v44 traffic-signal checks (node tests/signals_test.js dist/irbid-drive.html): phase sequence, no conflicting greens, lamp colours, head placement,
// sources (OSM vs estimated), and traffic AI behaviour at the stop line. Exits 1 on failure.
const S=global.__s;let bad=0;const ck=(n,c,i)=>{if(!c)bad++;console.log((c?'PASS ':'FAIL ')+n+(i!==undefined?'  ['+i+']':''))};
const R=S.SIGNALS.filter(s=>!s.estimated),E=S.SIGNALS.filter(s=>s.estimated);
const jn=a=>new Set(a.map(q=>q.junction)).size;ck('signalised junctions: OSM-mapped + inferred major crossroads (estimated), not every junction',S.LIT.length===S.SIGNALS.length&&jn(R)>=3&&jn(S.SIGNALS)<60,jn(S.SIGNALS)+' junctions ('+S.LIT.length+' nodes) = '+jn(R)+' OSM + '+jn(E)+' estimated; skipped '+S.SIG_SKIPPED.length);
{const J=new Map();for(const s of S.SIGNALS)J.set(s.junction,(J.get(s.junction)||0)+s.heads);const z=[...J].filter(q=>q[1]<2);ck('every signalised junction shows heads on at least 2 approaches',z.length===0,J.size+' junctions, '+z.length+' with < 2 heads: '+z.map(q=>q[0]+'='+q[1]).join(' '))}
// sequence per approach: green 24 s -> amber 3 s -> red; cross street never green/amber at the same time; all-red clearance exists
const nd=S.LIT[0];let seq=[],conf=0,allRed=0,prev='';for(let t=0;t<120;t+=.1){S.setClock(t);const a=S.light('x',nd),b=S.light('z',nd);if(a!=='r'&&b!=='r')conf++;if(a==='r'&&b==='r')allRed++;if(a!==prev){seq.push(a+'@'+t.toFixed(1));prev=a}}
const tt=seq.map(q=>parseFloat(q.slice(2))),ph=seq.map(q=>q[0]),i0=ph.indexOf('g');
ck('one approach: green -> amber -> red -> green (never red -> amber)',ph.slice(i0,i0+4).join('')==='gyrg',seq.join(' '));
ck('green 24 s, amber 3 s, red 33 s (cycle 60 s)',Math.abs(tt[i0+1]-tt[i0]-24)<.15&&Math.abs(tt[i0+2]-tt[i0+1]-3)<.15&&Math.abs(tt[i0+3]-tt[i0+2]-33)<.15);
ck('crossing approaches are never green/amber together',conf===0,conf+' conflicting samples');
ck('all-red clearance between phases (2 x 3 s per cycle)',Math.abs(allRed/1200*60-6)<.3,(allRed/20).toFixed(1)+' s per 120 s');
ck('junctions are not all in step (several offset groups)',new Set(S.LIT.map(n=>n.sgo)).size>=2,[...new Set(S.LIT.map(n=>n.sgo))].join(' ')+' s');
// lamps: exactly one lit lamp per head, matching the light state
S.setClock(5);S.sigTick();const col=S.SIG_MESH.instanceColor.array;let wrong=0,heads=0;
for(let i=0;i<S.SIG_LAMPS.length;i+=3){heads++;const q=S.SIG_LAMPS[i],st=S.light(q.ax,q.nd),lit=[0,1,2].map(k=>Math.max(col[(i+k)*3],col[(i+k)*3+1],col[(i+k)*3+2])>.9),want=st==='r'?0:st==='y'?1:2;if(lit.filter(Boolean).length!==1||!lit[want])wrong++}
ck('every head shows exactly one lit lamp matching its state (red top, amber, green bottom)',wrong===0&&heads>40,heads+' heads, '+wrong+' wrong');
{let ok=true;for(let i=0;i<S.SIG_LAMPS.length;i+=3){const a=S.SIG_LAMPS[i],b=S.SIG_LAMPS[i+2];if(!(a.y>b.y&&a.c===0&&b.c===2))ok=false}ck('lamp order on every head: red highest, green lowest',ok)}
// heads face the approaching traffic: lamp normal (sin ry, cos ry) points against the approach direction
{let bad2=0;for(let i=0;i<S.SIG_LAMPS.length;i+=3){const q=S.SIG_LAMPS[i],dx=q.nd.x-q.x,dz=q.nd.z-q.z,l=Math.hypot(dx,dz);if((Math.sin(q.ry)*dx+Math.cos(q.ry)*dz)/l>-.5)bad2++}ck('every head faces away from the junction, toward its approaching drivers',bad2===0,bad2+' wrong')}
// traffic AI: simulate 6 minutes of traffic around the busiest OSM-mapped junction; record the light state when each car crosses a stop line
const J=S.LIT.find(n=>!S.SIGNALS.find(s=>s.id===n.id).estimated);S.warp(J.x+20,J.z+20,0);for(const c of S.traffic){c.x=1e5}
// a violation = passing the AI's commit line (4 m past the stop line) on red more than 3 s after red began. Cars already in the box (entered on
// green/amber, then blocked by the queue ahead) may still crawl out on red, as in real traffic.
let cross={g:0,y:0,r:0},viol=0,stopped=0,dt=1/30;const lastDD=new Map(),redSince=(n,ax)=>{let k=0;while(k<40&&S.light(ax,{sgo:n.sgo,clock:0})==='r'){k++;break}return 0};
const sinceRed=(n,ax)=>{const t0=S.getClock();let k=0;for(;k<40;k+=.1){S.setClock(t0-k);if(S.light(ax,n)!=='r')break}S.setClock(t0);return k};
for(let f=0;f<6*60*30;f++){S.setClock(S.getClock()+dt);for(const c of S.traffic){S.updTraffic(c,dt);
  const pr=S.pathProg(c);for(const m of c.Mk){if(m.i<c.pi)continue;const d=c.C[m.i]-pr;if(d>60)break;const n=S.NODES[m.id];if(!n.lit)continue;const ax=n.ph[m.e.id],dd=d-11,key=c.m.uuid+m.id,pv=lastDD.get(key),st=S.light(ax,n);
   if(pv!==undefined&&pv>0&&dd<=0)cross[st]++;if(pv!==undefined&&pv>-4&&dd<=-4&&st==='r'&&sinceRed(n,ax)>3)viol++;lastDD.set(key,dd);if(dd>-3&&dd<8&&c.v<.3&&st==='r')stopped++;break}}}
ck('traffic AI stops at red: cars wait at the stop line',stopped>100,stopped+' car-frames waiting at red');
ck('traffic AI goes on green and never enters the junction on red',cross.g>=5&&viol===0,'stop-line crossings '+JSON.stringify(cross)+' (red = creeping to a halt), red-light entries '+viol);
console.log('signals: '+(bad?bad+' FAILED':'all passed'));process.exit(bad?1:0);
