// v48 checks (run from the repo root): node tests/assist_v48.js dist/irbid-drive.html [reference.html]
// Driver assists in Realistic: with the defaults (ABS on, TC off, ESC off) a fixed Realistic input sequence gives the SAME trajectory hash as the
// v47 build (reference: the file given, else `git show backup/v47:dist/irbid-drive.html`); ABS off locks the wheels on a panic stop (longer stop,
// steering lost); TC stops wheelspin on launch; ESC limits the body slip in power oversteer; Arcade ignores the assists. Driving school: every
// lesson finds a real straight street (or signalised approach) near the start; lessons are driven with real key input through updP and pass or
// fail by the rules; best scores are saved. Flat world without colliders for the assist checks; the real world for the school. Exits 1 on failure.
const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto');global.THREE=require(path.resolve('node_modules/three'));
const noop=new Proxy(function(){},{get:()=>noop,apply:()=>noop,set:()=>true});
THREE.WebGLRenderer=class{constructor(){this.domElement={style:{},insertAdjacentElement(){}};this.shadowMap={}}setPixelRatio(){}setSize(){}render(){}};
const el=()=>({getContext:()=>new Proxy(noop,{get:(t,k)=>k==='measureText'?(q=>({width:String(q).length*14})):t[k]}),appendChild(){},remove(){},style:{},dataset:{},setAttribute(){},addEventListener(){},focus(){},blur(){},select(){},value:'',children:[],classList:{add(){},remove(){},toggle(){}},set innerHTML(v){},get innerHTML(){return''},querySelector:()=>el(),querySelectorAll:()=>[]});
global.document={getElementById:el,createElement:el,body:{appendChild(){}},head:{appendChild(){}}};global.window=global;
global.addEventListener=()=>{};global.innerWidth=1280;global.innerHeight=720;global.devicePixelRatio=1;
let t=1000;global.performance={now:()=>t};global.requestAnimationFrame=()=>{};global.setTimeout=()=>{};
const LS={};global.localStorage={getItem:k=>k in LS?LS[k]:null,setItem:(k,v)=>{LS[k]=String(v)}};
let seed=7;Math.random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};
const cl0=console.log;console.log=()=>{};
const REF=process.env.V48REF,html=fs.readFileSync(process.argv[2],'utf8');
(0,eval)(html.match(/<script>\n([\s\S]*?)<\/script>/)[1]+';global.__s={updP,keys,P,PORS,setPlayerCar,traffic,heist,PTS,setHandling,WH,groundH,COL,TERR,all,START,setClock:v=>{clock=v},getClock:()=>clock,last,light'+
 (REF?'':',ASSIST,schFind,schStart,schStop,schoolTick,LESSONS,SCH,setUi:v=>{ui=v},NODES')+'}');
const S=global.__s,P=S.P,k=S.keys;S.traffic.length=0;S.heist.cops.length=0;S.all.length=0;S.all.push(P);
(0,eval)('toast=function(m){global.__toast=m};save=function(){}');
const WHN={on:false,steer:0,thr:0,brk:0,hb:false};S.WH.poll=()=>WHN;S.WH.ffb=()=>{};
function step(n,ks,cb){for(let i=0;i<n;i++){for(const c in k)k[c]=0;Object.assign(k,ks||{});t+=1000/60;S.updP(1/60,false);if(cb&&cb(i)===true)return i}return n}
const idx=n=>S.PORS.findIndex(m=>m[0]===n),FOCUS=idx('Ford Focus RS'),MUS=idx('Ford Mustang GT'),spd=()=>Math.hypot(P.vx,P.vz);
// flat world without colliders (restored for the school)
const COL0=new Map(S.COL),TE0=Array.from(S.TERR.e);S.COL.clear();for(let i=0;i<S.TERR.e.length;i++)S.TERR.e[i]=0;const sk0=surfK,bc0=checkSpeedBumpCrossing;(0,eval)('surfK=function(){return 1};checkSpeedBumpCrossing=function(){}');
function place(i,v){S.setPlayerCar(i);P.x=0;P.z=0;P.h=0;P.vx=0;P.vz=v||0;P.vy=0;P.y=P.pgh=S.groundH(0,0);P.gnd=true;P.al=0;S.PTS.idx=-1;S.PTS.yr=0;S.PTS.dl=0;S.PTS.spin=0}
// fixed Realistic sequence: launch, steer, brake, handbrake turn, power oversteer (the defaults must reproduce v47 exactly)
function trace(){S.setHandling(1);const out=[];for(const c of[FOCUS,MUS]){place(c,0);const rec=()=>out.push([P.x,P.z,P.h,P.vx,P.vz].map(v=>v.toFixed(6)).join(','));
 step(240,{KeyW:1});rec();step(60,{KeyW:1,KeyA:1});rec();step(90,{KeyS:1});rec();step(30,{KeyW:1});step(40,{Space:1,KeyD:1});rec();step(120,{KeyW:1,KeyA:1});rec();step(120,{KeyS:1,KeyA:1});rec()}
 return crypto.createHash('sha1').update(out.join('|')).digest('hex')}
if(REF){cl0('TRACE '+trace());process.exit(0)}
let fail=0;const ok=(c,m,v)=>{cl0((c?'PASS ':'FAIL ')+m+(v!==undefined?'  ['+v+']':''));if(!c)fail++};
// ---- 1. defaults = v47 Realistic physics ----
{const h=trace();let ref=process.argv[3],tmp=null;
 if(!ref){try{tmp=path.join(require('os').tmpdir(),'irbid_v47_ref.html');fs.writeFileSync(tmp,cp.execSync('git show backup/v47:dist/irbid-drive.html',{maxBuffer:64<<20}));ref=tmp}catch(e){ref=null}}
 if(ref){const o=cp.execFileSync(process.execPath,[__filename,ref],{env:Object.assign({},process.env,{V48REF:'1'}),maxBuffer:16<<20}).toString().match(/TRACE (\w+)/);
  ok(o&&o[1]===h,'defaults (ABS on, TC off, ESC off): Realistic trajectory identical to v47',h.slice(0,12)+' vs '+(o?o[1].slice(0,12):'?'))}else ok(false,'reference build for the v47 trace not found')}
// ---- 2. ABS ----
function brakeTest(abs,steer){S.ASSIST.abs=abs;place(FOCUS,80/3.6);let lk=0,ab=0;const h0=P.h,z0=P.z;step(600,steer?{KeyS:1,KeyA:1}:{KeyS:1},()=>{lk=Math.max(lk,S.PTS.flock);ab=Math.max(ab,S.PTS.absA);return spd()<.05});return{d:P.z-z0,lk,ab,dh:Math.abs(P.h-h0)}}
S.setHandling(1);{const on=brakeTest(true),off=brakeTest(false);
 ok(on.ab===1&&on.lk===0&&off.lk===1,'ABS on: the system works (no lock); ABS off: a full brake at 80 km/h locks the wheels','on abs '+on.ab+' lock '+on.lk+' / off lock '+off.lk);
 ok(off.d>on.d*1.08,'locked wheels stop later than ABS braking (Focus RS, 80 km/h)',on.d.toFixed(1)+' m vs '+off.d.toFixed(1)+' m');
 const son=brakeTest(true,1),soff=brakeTest(false,1);ok(soff.dh<son.dh*.5,'steering while braking: locked front tyres barely turn the car, ABS keeps steering','heading change '+son.dh.toFixed(2)+' rad (ABS) vs '+soff.dh.toFixed(2)+' rad (locked)')}
S.ASSIST.abs=true;
// ---- 3. traction control ----
function launch(tc){S.ASSIST.tc=tc;place(MUS,0);let sp=0,t60=0;step(600,{KeyW:1},i=>{sp=Math.max(sp,S.PTS.spin);if(!t60&&spd()>=60/3.6){t60=(i+1)/60;return true}});return{sp,t60}}
{const off=launch(false),on=launch(true);ok(off.sp>.25&&on.sp<.05,'TC on: no wheelspin on a full-throttle launch (Mustang GT); off: wheelspin builds','max spin '+off.sp.toFixed(2)+' off vs '+on.sp.toFixed(2)+' on');
 ok(on.t60>0&&on.t60<=off.t60*1.1,'TC does not make the launch slower than 110 % of the spinning launch','0-60 km/h '+off.t60.toFixed(2)+' s off, '+on.t60.toFixed(2)+' s on')}
S.ASSIST.tc=false;
// ---- 4. stability control ----
function over(esc){S.ASSIST.esc=esc;place(MUS,55/3.6);let mb=0,act=0;step(150,{KeyW:1,KeyA:1},()=>{const f=P.vx*Math.sin(P.h)+P.vz*Math.cos(P.h),l=P.vx*Math.cos(P.h)-P.vz*Math.sin(P.h);if(f>3)mb=Math.max(mb,Math.abs(Math.atan2(l,f)));act=Math.max(act,S.PTS.escA)});return{mb,act}}
{const off=over(false),on=over(true);ok(on.act===1&&on.mb<off.mb*.85,'ESC on: acts in power oversteer and keeps the body slip angle lower (Mustang, 55 km/h, full throttle + full lock)','max slip '+(off.mb*57.3).toFixed(1)+'° off vs '+(on.mb*57.3).toFixed(1)+'° on')}
S.ASSIST.esc=false;
// ---- 5. Arcade ignores the assists ----
{S.setHandling(0);const a=brakeTest(true),b=brakeTest(false);ok(a.d===b.d&&a.lk===0&&b.lk===0,'Arcade: ABS setting changes nothing (identical stop)',a.d.toFixed(3)+' = '+b.d.toFixed(3));S.ASSIST.abs=true}
// ---- driving school on the real world ----
S.COL.clear();for(const [kk,v] of COL0)S.COL.set(kk,v);for(let i=0;i<TE0.length;i++)S.TERR.e[i]=TE0[i];
global.__sk0=sk0;global.__bc0=bc0;(0,eval)('surfK=global.__sk0;checkSpeedBumpCrossing=global.__bc0');S.setHandling(0);
{const sites=S.LESSONS.map(L=>S.schFind(S.START.x,S.START.z,L.len,!!L.lit));
 ok(sites.every(s=>s&&!s.e.ow&&s.len>=S.LESSONS[sites.indexOf(s)].len-1e-6),'every lesson finds a straight two-way street near the start',sites.map(s=>s?Math.round(Math.hypot(s.x0-S.START.x,s.z0-S.START.z))+' m away, '+(s.e.name||'unnamed')+' '+s.e.lim+' km/h':'none').join(' | '));
 const s4=sites[3];ok(s4&&s4.nd&&s4.nd.lit,'the traffic-light lesson ends at a signalised junction',s4&&s4.nd.id)}
const kmh=()=>spd()*3.6;
// a driver for the lessons: keep the lane with A/D (pure pursuit on the lesson line), W/S to a target speed profile (negative = reverse)
const run=(i,target,max)=>{S.setUi(false);S.schStart(i);const L=S.LESSONS[i];for(let n=0;n<(max||7200)&&S.SCH.on&&!S.SCH.over;n++){const s=S.SCH.site,dx=P.x-s.x0,dz=P.z-s.z0,a=dx*s.ux+dz*s.uz,la=a+10,tx=s.x0+s.ux*la+s.rx*s.lane,tz=s.z0+s.uz*la+s.rz*s.lane;
  const ang=Math.atan2(tx-P.x,tz-P.z),e=Math.atan2(Math.sin(ang-P.h),Math.cos(ang-P.h)),v=target(a,s);for(const c in k)k[c]=0;const rev=v<0;
  if(!rev){if(e>.02)k.KeyA=1;else if(e<-.02)k.KeyD=1}
  if(rev){if(Math.abs(v)>kmh()+.5||P.vx*Math.sin(P.h)+P.vz*Math.cos(P.h)>0)k.KeyS=1}else if(v===0){const f=P.vx*Math.sin(P.h)+P.vz*Math.cos(P.h);if(f>.1)k.KeyS=1;else if(f<-.1)k.KeyW=1}else if(kmh()<v-1)k.KeyW=1;else if(kmh()>v+2)k.KeyS=1;
  t+=1000/60;S.setClock(S.getClock()+1/60);S.updP(1/60,false);S.schoolTick(1/60)}
 S.setUi(false);return{st:S.SCH.st,score:S.SCH.score,msg:S.SCH.msg,pen:S.SCH.pen.map(p=>p[0]).join('; '),t:S.SCH.t}};
// lesson 1: cruise at 30 km/h, brake to stop at 90 m
{const r=run(0,a=>a<70?30:a<88?Math.max(0,Math.sqrt(Math.max(0,90-a)*2*4)*3.6-2):0);ok(r.st==='pass'&&r.score>=70,'lesson 1 (start and stop): a careful driver passes',r.st+' '+r.score+' · '+r.msg)}
{const r=run(0,a=>45);ok(r.st==='fail'&&/past the box/.test(r.msg),'lesson 1: driving through the box fails',r.st+' · '+r.msg+' · '+r.pen)}
{const r=run(1,a=>a<130?58:0);ok(r.st==='pass','lesson 2 (emergency stop): 58 km/h then full brake at the line passes',r.st+' '+r.score+' · '+r.msg)}
{const r=run(2,(a,s)=>s.lim+15,9000);ok(r.score<100&&/Over the limit/.test(r.pen),'lesson 3 (speed limit): speeding costs points',r.st+' '+r.score+' · '+r.pen.slice(0,80))}
{const r=run(2,(a,s)=>s.lim-8,9000);ok(r.st==='pass'&&r.score>=90,'lesson 3: driving under the limit passes',r.st+' '+r.score+' · '+r.msg)}
{const r=run(4,a=>a>24.5?-6:a>23?-2:0);ok(r.st==='pass','lesson 5 (reverse parking): reversing straight into the bay passes',r.st+' '+r.score+' · '+r.msg)}
let c0=0;
// lesson 4: arrive at the line on red and run it -> fail; wait at the line until green -> pass
{S.schStart(3);const s=S.SCH.site,ax=s.nd.ph[s.e.id];for(let c=0;c<60;c+=.5){S.setClock(c);if(S.light(ax,s.nd)==='r'){let all=true;for(let q=0;q<14;q+=.5){S.setClock(c+q);if(S.light(ax,s.nd)!=='r'){all=false;break}}if(all){c0=c;break}}}S.schStop();
 S.setClock(c0-1e-3);S.last.red=undefined;const r=run(3,a=>40);ok(r.st==='fail'&&/red/.test(r.msg),'lesson 4 (traffic light): running the red light fails',r.st+' · '+r.msg)}
{S.setClock(c0-1e-3);const r=run(3,(a,s)=>{const st=S.light(s.nd.ph[s.e.id],s.nd),dd=s.stop-a;return st==='g'?30:dd>12?25:dd>.5?Math.min(20,Math.sqrt(dd*2*3)*3.6):0},20000);ok(r.st==='pass'&&/Waited/.test(r.msg),'lesson 4: arriving on red, stopping at the line and going on green passes',r.st+' '+r.score+' · '+r.msg)}
{const b=JSON.parse(LS['irbid-drive-school-v1']||'{}');ok(b.best&&b.best.stop>=70&&b.best.brake>0&&b.best.park>0&&b.runs>=8,'best scores and run count are saved (irbid-drive-school-v1)',JSON.stringify(b.best))}
cl0('assist_v48: '+(fail?fail+' FAILED':'all passed'));process.exit(fail?1:0);
