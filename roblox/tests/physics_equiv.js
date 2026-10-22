// Irbid Drive (Roblox) physics equivalence: the web game's updP / updPStep (the real build, headless, flat world without colliders, as in
// tests/assist_v48.js) and the Roblox CarPhysics module (roblox/src/ReplicatedStorage/Modules/CarPhysics.lua, run by the Luau CLI) get the
// SAME input sequences; every frame's heading, velocity and position must agree, and in Realistic handling also the gear, rpm, wheelspin,
// yaw rate, steering angle, body springs, tyre / brake temperatures and the assist flags. The Luau side takes each car's numbers from the
// EXPORTED data (roblox/shared/Meta.lua), so the export is checked too. Arcade + Realistic, keyboard + analog input, 60 / 30 / 20 fps,
// ABS off, traction control, stability control, tyre temperature + brake fade, wet grip, manual gearbox with shift requests.
// Run from the repo root after tools/make_roblox.js:  node roblox/tests/physics_equiv.js <luau.exe> [dist/irbid-drive.html]
// Exits 1 on any difference above the tolerance. CARPHYS=<file> tests another copy of the module.
const fs=require('fs'),path=require('path'),os=require('os'),{spawnSync}=require('child_process');
global.THREE=require(path.resolve('node_modules/three'));
const LUAU=process.argv[2]||process.env.LUAU||'luau',HTML=process.argv[3]||'dist/irbid-drive.html';
const noop=new Proxy(function(){},{get:()=>noop,apply:()=>noop,set:()=>true});
THREE.WebGLRenderer=class{constructor(){this.domElement={style:{},insertAdjacentElement(){}};this.shadowMap={}}setPixelRatio(){}setSize(){}render(){}};
const el=()=>({getContext:()=>new Proxy(noop,{get:(t,k)=>k==='measureText'?(q=>({width:String(q).length*14})):t[k]}),appendChild(){},remove(){},style:{},dataset:{},setAttribute(){},addEventListener(){},focus(){},blur(){},select(){},value:'',children:[],classList:{add(){},remove(){},toggle(){}},set innerHTML(v){},get innerHTML(){return''},querySelector:()=>el(),querySelectorAll:()=>[]});
global.document={getElementById:el,createElement:el,body:{appendChild(){}},head:{appendChild(){}}};global.window=global;
global.addEventListener=()=>{};global.innerWidth=1280;global.innerHeight=720;global.devicePixelRatio=1;
let t=1000;global.performance={now:()=>t};global.requestAnimationFrame=()=>{};global.setTimeout=()=>{};
const LS={};global.localStorage={getItem:k=>k in LS?LS[k]:null,setItem:(k,v)=>{LS[k]=String(v)}};
let seed=7;Math.random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};
const cl0=console.log;console.log=()=>{};
const html=fs.readFileSync(HTML,'utf8');
(0,eval)(html.match(/<script>\n([\s\S]*?)<\/script>/)[1]+';global.__s={updP,updPStep,keys,P,PORS,setPlayerCar,traffic,heist,bots,PTS,setHandling,WH,groundH,COL,TERR,all,ASSIST,SIMX,TSLIP,WX,gearKey,setRiv:v=>{riv=v}}');
const S=global.__s,P=S.P,k=S.keys;S.traffic.length=0;S.heist.cops.length=0;S.bots.length=0;S.setRiv(null);S.all.length=0;S.all.push(P);
(0,eval)('toast=function(m){};save=function(){};fine=function(){};redLight=function(){};wrongWay=function(){return false};surfK=function(){return 1};checkSpeedBumpCrossing=function(){};driftZoneAt=function(){return null}');
const WHN={on:false,steer:0,thr:0,brk:0,clu:0,hb:false,raw:0};let WIN=WHN;S.WH.poll=()=>WIN;S.WH.ffb=()=>{};
S.COL.clear();for(let i=0;i<S.TERR.e.length;i++)S.TERR.e[i]=0;
// the Roblox index of each web car (roblox/CAR_NAMES.md, written by tools/make_roblox.js)
const RIX=new Map();for(const m of fs.readFileSync(path.join(__dirname,'..','CAR_NAMES.md'),'utf8').matchAll(/^\| (\d+) \| [^|]+ \| ([^|]+) \|/gm))RIX.set(m[2].trim(),+m[1]);
const idx=n=>{const i=S.PORS.findIndex(m=>m[0]===n);if(i<0||!RIX.has(n))throw Error('no car '+n);return i};
// ---- cases: car, mode (0 Arcade / 1 Realistic), frame time, options, input segments [frames, {kb keys} | {an analog}, shift] ----
const KB=(o,sh)=>({kb:o,sh}),AN=(steer,thr,brk,hb)=>({an:{steer,thr,brk,hb:!!hb}});
const SEQ=[[240,KB({KeyW:1})],[60,KB({KeyW:1,KeyA:1})],[90,KB({KeyS:1})],[30,KB({KeyW:1})],[40,KB({Space:1,KeyD:1})],[120,KB({KeyW:1,KeyA:1})],[120,KB({KeyS:1,KeyA:1})],[60,KB({})],[200,KB({KeyS:1})]];
const SEQAN=[[180,AN(0,.7,0)],[90,AN(-.35,.8,0)],[60,AN(.5,1,0)],[50,AN(0,0,.6)],[40,AN(.8,.3,0,1)],[120,AN(-.2,1,0)],[90,AN(0,0,1)]];
// panic stop from speed (ABS off locks the wheels), a hard launch (traction control), power oversteer (stability control)
const SEQBRK=[[300,KB({KeyW:1})],[150,KB({KeyS:1,KeyA:1})],[60,KB({KeyW:1})],[200,KB({KeyS:1})]];
// repeated hard stops from speed (the brakes heat past 400 °C and fade)
const SEQFADE=[];for(let r=0;r<8;r++)SEQFADE.push([420,KB({KeyW:1})],[150,KB({KeyS:1})]);
const SEQOS=[[200,KB({KeyW:1})],[150,KB({KeyW:1,KeyD:1})],[60,KB({KeyW:1,KeyA:1})],[60,KB({Space:1,KeyA:1})],[120,KB({KeyW:1,KeyD:1})],[60,KB({})]];
// manual gearbox: shift requests on single frames (E up = +1, Q down = -1), including a refused over-rev downshift
const SEQMAN=[[1,KB({KeyW:1},1)],[60,KB({KeyW:1})],[1,KB({KeyW:1},1)],[90,KB({KeyW:1})],[1,KB({KeyW:1},1)],[120,KB({KeyW:1})],[1,KB({KeyW:1},-1)],[1,KB({KeyW:1},-1)],[1,KB({KeyW:1},-1)],[60,KB({KeyW:1})],[1,KB({},-1)],[120,KB({KeyS:1})],[1,KB({KeyW:1},-1)],[90,KB({KeyW:1,KeyA:1})]];
const CASES=[];
for(const car of['Ford Focus RS','Ford Mustang GT','Kia Picanto','Toyota Hilux','Porsche 911']){CASES.push({car,mode:0,dt:1/60,seq:SEQ,tag:'keys'});CASES.push({car,mode:0,dt:1/60,seq:SEQAN,tag:'analog'})}
CASES.push({car:'Nissan Silvia S15 Spec-R',mode:0,dt:1/30,seq:SEQ,tag:'keys'},{car:'Ferrari F40',mode:0,dt:.05,seq:SEQAN,tag:'analog'});
for(const car of['Ford Focus RS','Ford Mustang GT','Kia Picanto','Toyota Hilux','Porsche 911','Tesla Model 3','Ferrari F40','Lamborghini Huracán','Ford Model T','Nissan Silvia S15 Spec-R','Toyota Prius','Porsche 917'])
 CASES.push({car,mode:1,dt:1/60,seq:SEQ,tag:'keys'});
for(const car of['Ford Mustang GT','Ford Focus RS','Porsche Taycan'])CASES.push({car,mode:1,dt:1/60,seq:SEQAN,tag:'analog'});
CASES.push({car:'Ford Mustang GT',mode:1,dt:1/30,seq:SEQ,tag:'keys'},{car:'Kia Picanto',mode:1,dt:.05,seq:SEQAN,tag:'analog'},{car:'Porsche 911',mode:1,dt:1/45,seq:SEQOS,tag:'oversteer'});
// ABS off: the web game locks the wheels only where the brakes can beat the tyres (low-grip cars; fast cars get a raised tyre mu)
CASES.push({car:'Kia Picanto',mode:1,dt:1/60,seq:SEQBRK,tag:'ABS off',assist:{abs:false,tc:false,esc:false}},
 {car:'Toyota Prius',mode:1,dt:1/60,seq:SEQBRK,tag:'ABS off',assist:{abs:false,tc:false,esc:false}},
 {car:'Ford Mustang GT',mode:1,dt:1/60,seq:SEQOS,tag:'traction control',assist:{abs:true,tc:true,esc:false}},
 {car:'Ford Mustang GT',mode:1,dt:1/60,seq:SEQOS,tag:'stability control',assist:{abs:true,tc:false,esc:true}},
 {car:'Nissan Silvia S15 Spec-R',mode:1,dt:1/60,seq:SEQOS,tag:'all assists',assist:{abs:true,tc:true,esc:true}},
 {car:'Ford Focus RS',mode:1,dt:1/60,seq:SEQ.concat(SEQBRK,SEQOS),tag:'tyre temp + brake fade',simx:{tt:true,bf:true}},
 {car:'Ferrari F40',mode:1,dt:1/60,seq:SEQFADE,tag:'brake fade',simx:{tt:false,bf:true}},
 {car:'Ford Mustang GT',mode:1,dt:1/60,seq:SEQ,tag:'wet road',wx:{mu:.78,wet:.8},simx:{tt:true,bf:false}},
 {car:'Ford Mustang GT',mode:1,dt:1/60,seq:SEQMAN,tag:'manual gearbox'},{car:'BMW E36 M3 (Drift Spec)',mode:1,dt:1/30,seq:SEQMAN,tag:'manual gearbox'});
// ---- the web side ----
function place(i){S.setPlayerCar(i);P.x=0;P.z=0;P.h=0;P.vx=0;P.vz=0;P.vy=0;P.y=P.pgh=S.groundH(0,0);P.gnd=true;P.al=0;P.h0=0;P.pitch=P.bp=P.br=0;
 Object.assign(S.PTS,{yr:0,dl:0,h0:0,gear:1,rpm:850,shift:0,spin:0,lim:0,hz:0,hv:0,pz:0,pv:0,rz:0,rv:0,idx:-1,man:0,req:0,deny:0,flock:0,absA:0,tcA:0,escA:0});
 Object.assign(S.TSLIP,{f:0,r:0,lock:0,spin:0,sa:0,af:0,ar:0});Object.assign(S.SIMX,{tt:false,bf:false,tT:24,bT:24,gk:1,bk:1})}
for(const c of CASES){const i=idx(c.car);S.setHandling(c.mode);place(i);c.rix=RIX.get(c.car);
 Object.assign(S.ASSIST,c.assist||{abs:true,tc:false,esc:false});Object.assign(S.SIMX,c.simx||{tt:false,bf:false});S.WX.mu=(c.wx||{mu:1}).mu;S.WX.wet=(c.wx||{wet:0}).wet;
 const tr=[];
 for(const[n,inp]of c.seq)for(let f=0;f<n;f++){for(const q in k)k[q]=0;if(inp.kb){Object.assign(k,inp.kb);WIN=WHN}else WIN=Object.assign({on:true,clu:0,raw:0},inp.an);
  if(inp.sh&&f===0)S.gearKey(inp.sh);
  t+=c.dt*1000;S.updPStep(c.dt,false);const Q=S.PTS,X=S.SIMX;
  tr.push([P.h,P.vx,P.vz,P.x,P.z,Q.gear,Q.rpm,Q.spin,Q.yr,Q.dl,Q.pz,Q.rz,Q.hz,X.tT,X.bT,Q.flock,Q.absA,Q.tcA,Q.escA,Q.man,Q.deny])}
 c.trace=tr}
// ---- the Luau side: the same inputs through CarPhysics (step, then the same moving as Drive.lua on flat ground, then the body springs) ----
const num=v=>{if(typeof v==='boolean')return String(v);if(!Number.isFinite(v))throw Error('bad number '+v);return v.toPrecision(17)};
const luaInp=inp=>(inp.kb?`{th=${inp.kb.KeyW?1:0},br=${inp.kb.KeyS?1:0},steer=${(inp.kb.KeyA?1:0)-(inp.kb.KeyD?1:0)},hb=${inp.kb.Space?'true':'false'}`
 :`{th=${num(inp.an.thr)},br=${num(inp.an.brk)},steer=${num(-inp.an.steer)},hb=${inp.an.hb},an=true`)+(inp.sh?`,sh=${inp.sh}`:'')+'}';
const tbl=o=>'{'+Object.entries(o).map(([q,v])=>q+'='+num(v)).join(',')+'}';
const casesLua='{'+CASES.map(c=>`{name=${JSON.stringify(c.car+' / '+(c.mode?'Realistic':'Arcade')+' / '+c.tag+' / '+Math.round(1/c.dt)+' fps')},mode=${c.mode},dt=${num(c.dt)},ci=${c.rix},`+
 `assist=${tbl(c.assist||{abs:true,tc:false,esc:false})},simx=${tbl(c.simx||{tt:false,bf:false})},wx=${tbl(c.wx||{mu:1,wet:0})},`+
 `seq={${c.seq.map(([n,inp])=>`{${n},${luaInp(inp)}}`).join(',')}},trace={${c.trace.map(r=>'{'+r.map(num).join(',')+'}').join(',')}}}`).join(',\n')+'}';
const src=fs.readFileSync(process.env.CARPHYS||path.join(__dirname,'..','src','ReplicatedStorage','Modules','CarPhysics.lua'),'utf8');
const meta=fs.readFileSync(path.join(__dirname,'..','shared','Meta.lua'),'utf8');
const harness=`
local CarPhysics = (function()\n${src}\nend)()
local Meta = (function()\n${meta}\nend)()
local CASES = ${casesLua}
local worst, bad = 0, 0
local function TH(x, z) return 0 end
local FIELDS = { "h", "vx", "vz", "x", "z", "gear", "rpm", "spin", "yr", "dl", "pz", "rz", "hz", "tT", "bT", "flock", "absA", "tcA", "escA", "man", "deny" }
-- the scale of each field for the comparison (positions over a few hundred metres, rpm in thousands)
local SCALE = { 1, 1, 1, 100, 100, 1, 1000, 1, 1, 1, 1, 1, 1, 100, 100, 1, 1, 1, 1, 1, 1 }
for _, c in ipairs(CASES) do
	local car = Meta.cars[c.ci]
	local spec = { vm = car.vm, a0 = car.a0, bk = car.bk, hd = car.hd, ci = c.ci, pt = car.pt }
	local st = { x = 0, y = 0.12, z = 0, h = 0, vx = 0, vz = 0, vy = 0, gnd = true, al = 0 }
	local env = CarPhysics.newState()
	env.sfc, env.TH, env.frozen, env.mode = 1, TH, false, c.mode
	for q, v in pairs(c.assist) do env.assist[q] = v end
	for q, v in pairs(c.simx) do env.simx[q] = v end
	for q, v in pairs(c.wx) do env.wx[q] = v end
	local f, cw, wf, wk = 0, 0, 0, ""
	for _, sg in ipairs(c.seq) do
		for k = 1, sg[1] do
			f += 1
			local inp = sg[2]
			if inp.sh and k == 1 then CarPhysics.requestShift(spec, env, inp.sh) end
			local n = CarPhysics.substeps(c.mode, c.dt)
			local h = c.dt / n
			for _ = 1, n do
				local fs = CarPhysics.step(st, spec, inp, env, h)
				st.x += st.vx * h
				st.z += st.vz * h
				if c.mode == 1 then CarPhysics.body(st, spec, env, h, false, fs) end
			end
			local P, X = env.pts, env.simx
			local mine = { st.h, st.vx, st.vz, st.x, st.z, P.gear, P.rpm, P.spin, P.yr, P.dl, P.pz, P.rz, P.hz, X.tT, X.bT, P.flock, P.absA, P.tcA, P.escA, P.man, P.deny }
			local r = c.trace[f]
			local nf = c.mode == 1 and #FIELDS or 5
			for q = 1, nf do
				local e = math.abs(mine[q] - r[q]) / SCALE[q]
				if e > cw then cw, wf, wk = e, f, FIELDS[q] end
			end
		end
	end
	if cw > worst then worst = cw end
	local ok = cw < 1e-9
	if not ok then bad += 1 end
	print((ok and "PASS " or "FAIL ") .. c.name .. string.format("  (%d frames, largest difference %.3g%s)", f, cw, cw > 0 and (" in " .. wk .. " at frame " .. wf) or ""))
end
print(string.format("RESULT %d cases, %d failed, largest difference %.3g", #CASES, bad, worst))
`;
const out=path.join(os.tmpdir(),'irbid_physics_equiv.luau');fs.writeFileSync(out,harness);
const r=spawnSync(LUAU,[out],{encoding:'utf8',maxBuffer:64<<20});
process.stdout.write(r.stdout||'');process.stderr.write(r.stderr||'');
// the cases must exercise what they claim (gears change, ABS-off locks, TC / ESC act, temperatures rise, a downshift is refused)
const T=c=>c.trace,mx=(c,j)=>Math.max(...T(c).map(r=>r[j]));
const EV1=new Set(['Tesla Model 3','Porsche Taycan']);
const sanity=[['Realistic cases change gear (every car with a gearbox; up to 5th or 6th)',CASES.filter(c=>c.mode===1&&!EV1.has(c.car)).every(c=>mx(c,5)>=2)&&CASES.some(c=>c.mode===1&&mx(c,5)>=6)],
 ['ABS off locks the wheels',CASES.filter(c=>c.tag==='ABS off').every(c=>mx(c,15)===1)],['traction control acts',mx(CASES.find(c=>c.tag==='traction control'),17)===1],
 ['stability control acts',mx(CASES.find(c=>c.tag==='stability control'),18)===1],['tyres heat up, brakes reach the fade range (> 400 °C)',mx(CASES.find(c=>c.tag==='tyre temp + brake fade'),13)>40&&mx(CASES.find(c=>c.tag==='brake fade'),14)>400],
 ['manual gearbox engaged and a downshift refused',CASES.filter(c=>c.tag==='manual gearbox').every(c=>mx(c,19)===1)&&CASES.some(c=>c.tag==='manual gearbox'&&mx(c,20)===1)]];
// PEDBG=1: what each Realistic case reached on the web side
if(process.env.PEDBG)for(const c of CASES)if(c.mode===1)cl0('  web',c.car,'/',c.tag,': top gear',mx(c,5),'· locked',mx(c,15),'· tyres',mx(c,13).toFixed(0),'°C · brakes',mx(c,14).toFixed(0),'°C · top speed',(Math.max(...T(c).map(r=>Math.hypot(r[1],r[2])))*3.6).toFixed(0),'km/h');
let sb=0;for(const[n,ok]of sanity){cl0((ok?'PASS ':'FAIL ')+'(web trace) '+n);if(!ok)sb++}
const fails=((r.stdout||'').match(/^FAIL /gm)||[]).length+sb,passes=((r.stdout||'').match(/^PASS /gm)||[]).length;
cl0(`\n${passes} passed, ${fails} failed, luau exit ${r.status}`);
process.exit(fails||r.status||!passes?1:0);
