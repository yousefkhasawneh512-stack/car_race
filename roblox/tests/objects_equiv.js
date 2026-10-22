// Irbid Drive (Roblox) roadside-object equivalence: the web game's colliders and object rules (05b addCol / colB, 07e objectImpact /
// materialImpact / objectsTick; the real build, headless) against the Roblox module (roblox/src/ReplicatedStorage/Modules/Objects.lua, run by
// the Luau CLI):
//  A. the exported colliders (roblox/shared/Objects_*.lua) are the web game's, in its order: type, position, size, heading, break speed,
//     height, trunk diameter, canopies, visual instance (to the export's rounding: 1 cm, 1e-4 rad, 1 mm)
//  B. colB on the exported colliders: cars (the player's 2.2 m radius, with a speed) and AI cars (1.3 m, slowed) at points around them
//  C. objectImpact: sequences of hits at random speeds, masses, directions and times on street lights, utility poles, signs, dumpsters,
//     guardrails, trees (incl. the slimmest trunks), islands and walls: the result (barrier speed, speed given away, broke, label) and the
//     object's state (bent, damage, deflection, removed, moving) after every hit; shoved dumpsters sliding to a stop (objectsTick)
// B and C use the SAME numbers on both sides (the exported ones). Run from the repo root after tools/make_roblox.js:
//   node roblox/tests/objects_equiv.js <luau.exe> [dist/irbid-drive.html]          Exits 1 on any difference.
const fs=require('fs'),path=require('path'),os=require('os'),{spawnSync}=require('child_process');
global.THREE=require(path.resolve('node_modules/three'));
const LUAU=process.argv[2]||process.env.LUAU||'luau',HTML=process.argv[3]||'dist/irbid-drive.html';
const noop=new Proxy(function(){},{get:()=>noop,apply:()=>noop,set:()=>true});
THREE.WebGLRenderer=class{constructor(){this.domElement={style:{},insertAdjacentElement(){}};this.shadowMap={}}setPixelRatio(){}setSize(){}render(){}};
const el=()=>({getContext:()=>new Proxy(noop,{get:(t,k)=>k==='measureText'?(q=>({width:String(q).length*14})):t[k]}),appendChild(){},remove(){},style:{},dataset:{},setAttribute(){},addEventListener(){},focus(){},blur(){},select(){},value:'',children:[],classList:{add(){},remove(){},toggle(){}},set innerHTML(v){},get innerHTML(){return''},querySelector:()=>el(),querySelectorAll:()=>[]});
global.document={getElementById:el,createElement:el,body:{appendChild(){}},head:{appendChild(){}}};global.window=global;
global.addEventListener=()=>{};global.innerWidth=1280;global.innerHeight=720;global.devicePixelRatio=1;
global.performance={now:()=>0};global.requestAnimationFrame=()=>{};global.setTimeout=()=>{};
const LS={};global.localStorage={getItem:k=>k in LS?LS[k]:null,setItem:(k,v)=>{LS[k]=String(v)}};
const cl0=console.log;console.log=()=>{};
// the generator's seed (tools/make_roblox.js), so the random trees / dumpsters / poles are the exported ones
{let q=20250611;Math.random=()=>{q|=0;q=q+0x6D2B79F5|0;let t=Math.imul(q^q>>>15,1|q);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
global.__CN=0;
let SRC=fs.readFileSync(HTML,'utf8').match(/<script>\n([\s\S]*?)<\/script>/)[1];
SRC=SRC.replace('function addCol(c){','function addCol(c){if(c.__n===undefined)c.__n=__CN++;');
(0,eval)(SRC+';global.__s={COL,addCol,removeCol,colB,objectImpact,objectsTick,MOVERS,DESTRUCTIBLE_INSTANCES,START,P,setClock:v=>{clock=v},setMode:v=>{damageMode=v}}');
const S=global.__s,ST=S.START,R=3500,inR=(x,z)=>Math.hypot(x-ST.x,z-ST.z)<=R;
eval('toast=function(){}');
// ---- the exported rows ----
const SH=path.join(__dirname,'..','shared'),mods=fs.readdirSync(SH).filter(f=>/^Objects_\d+\.lua$/.test(f)).sort((a,b)=>+a.match(/\d+/)[0]-+b.match(/\d+/)[0]);
if(!mods.length){cl0('no roblox/shared/Objects_*.lua: run tools/make_roblox.js first');process.exit(1)}
let TYPES=null,W=0;const rows=[];
for(const f of mods){const t=fs.readFileSync(path.join(SH,f),'utf8');TYPES=JSON.parse('['+t.match(/types=\{([^}]*)\}/)[1]+']');W=+t.match(/w=(\d+)/)[1];rows.push(...t.match(/rows="([^"]*)"/)[1].split(',').map(Number))}
const EX=[];for(let i=0;i<rows.length;i+=W){const v=rows.slice(i,i+W),t=TYPES[v[0]];const c={type:t==='-'?undefined:t,x:v[1]/100,z:v[2]/100};
 if(v[4]<0)c.r=v[3]/100;else{const h=v[5]/1e4;c.hw=v[3]/100;c.hd=v[4]/100;c.c=Math.cos(h);c.s=Math.sin(h)}
 if(v[6]>0){c.breakable=true;c.breakAt=v[6]/100}if(v[7]>0)c.height=v[7]/100;if(v[8]>0)c.trunkD=v[8]/1000;if(v[9]>0)c.canopies=v[9];c.visual=v[10]===1;if(v[13]>0)c.wallH=v[13]/100;c.row=v;EX.push(c)}
// ---- A. the web colliders, the generator's way ----
const seen=new Set(),web=[];for(const L of S.COL.values())for(const a of L){if(seen.has(a))continue;seen.add(a);if(!inR(a.x,a.z)||(a.type===undefined&&a.r===undefined))continue;web.push(a)}
web.sort((a,b)=>a.__n-b.__n);
const checks=[];const ck=(n,ok,d)=>{checks.push([n,ok,d])};
{let worst=0,bad=0,bt=0;const n=Math.min(web.length,EX.length);
 for(let i=0;i<n;i++){const a=web[i],e=EX[i];if((a.type||undefined)!==e.type){bt++;continue}
  const d=[Math.abs(a.x-ST.x-e.x),Math.abs(a.z-ST.z-e.z),a.r!==undefined?Math.abs(a.r-e.r):Math.max(Math.abs(a.hw-e.hw),Math.abs(a.hd-e.hd)),a.r!==undefined?0:Math.abs(a.c-e.c)+Math.abs(a.s-e.s),
   Math.abs((a.breakable?a.breakAt:0)-(e.breakAt||0)),Math.abs((a.height||0)-(e.height||0)),Math.abs((a.trunkD||0)-(e.trunkD||0))*10,Math.abs((a.canopies||0)-(e.canopies||0))*100,(!!(a.visualKey&&S.DESTRUCTIBLE_INSTANCES.get(a.visualKey)))!==e.visual?100:0];
  const m=Math.max(...d);if(m>worst)worst=m;if(m>.0051){bad++;if(process.env.OBJDBG)cl0("row",i,a.type,JSON.stringify(d.map(x=>+x.toFixed(5))),JSON.stringify(a,(k,v)=>k==="_cells"?undefined:v))}}
 ck('A. exported colliders = the web game\'s ('+EX.length+' in the map, same order)',web.length===EX.length&&bt===0&&bad===0,`web ${web.length}, exported ${EX.length}, type mismatches ${bt}, rows off by more than the rounding ${bad}, largest ${worst.toFixed(4)}`)}
// the web objects of the exported rows (same numbers), with their real visual keys (the visuals run on the real instances)
const mk=(e,i)=>{const o={type:e.type,x:e.x,z:e.z};for(const k of['r','hw','hd','c','s','breakable','breakAt','height','trunkD','canopies','wallH'])if(e[k]!==undefined)o[k]=e[k];if(e.visual)o.visualKey=web[i].visualKey;return o};
// ---- B. colB ----
S.COL.clear();const WB=EX.map((e,i)=>S.addCol(mk(e,i)));
let seed=11;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};
const CB=[];
for(let n=0;n<1500;n++){const i=Math.floor(rnd()*EX.length),e=EX[i],sz=e.r!==undefined?e.r:Math.max(e.hw,e.hd),a=rnd()*Math.PI*2,d=rnd()*(sz+3.2),bot=n%3===2;
 const o=bot?{x:e.x+Math.sin(a)*d,z:e.z+Math.cos(a)*d,v:5+rnd()*20,rad:1.3}:{x:e.x+Math.sin(a)*d,z:e.z+Math.cos(a)*d,vx:(rnd()-.5)*40,vz:(rnd()-.5)*40};const o0={...o};
 const hit=S.colB(o);CB.push({o:o0,hit,after:bot?[o.x,o.z,o.v]:[o.x,o.z,o.vx,o.vz]})}
// ---- C. objectImpact ----
S.setMode(2);const pick={};
const byType=t=>EX.map((e,i)=>[e,i]).filter(([e])=>(e.type||'-')===t);
for(const t of['streetLight','utilityPole','sign','bin','guardrail','-','solid'])pick[t]=byType(t).filter((_,k)=>k%37===0).slice(0,30);
{const tr=byType('tree');pick.tree=tr.filter((_,k)=>k%97===0).slice(0,20).concat(tr.slice().sort((a,b)=>(a[0].trunkD||.5)-(b[0].trunkD||.5)).slice(0,20))}
const CC=[];let clock=500;const rnd07=()=>.7;
for(const t in pick)for(const[e,i]of pick[t]){const o=mk(e,i),hits=[];const n=3+Math.floor(rnd()*4);
 for(let h=0;h<n;h++){clock+=.2+rnd()*1.1;const vn=t==='tree'&&h===n-1?30+rnd()*30:2+rnd()*38,mass=[900,1500,2400][Math.floor(rnd()*3)],a=rnd()*Math.PI*2,nx=Math.sin(a),nz=Math.cos(a);
  S.setClock(clock);const mr=Math.random;Math.random=rnd07;const r=S.objectImpact(o,vn,mass,nx,nz);Math.random=mr;
  hits.push({t:clock,vn,mass,nx,nz,ebs:r.ebs,gave:r.gave,broke:r.broke,label:r.label,bent:o.bent||0,dmg:o.dmg||0,defl:o.defl||0,broken:!!o.broken,moving:!!o.moving})}
 // a shoved dumpster slides to a stop
 const slide=[];const q=S.MOVERS.find(m=>m.o===o);
 if(q){for(let f=1;f<=900;f++){clock+=1/60;S.setClock(clock);S.objectsTick(1/60);if(f%30===0||!S.MOVERS.includes(q)){slide.push([q.x,q.z,q.ry,q.tip]);if(!S.MOVERS.includes(q))break}}
  slide.push([o.x,o.z,o.c,o.s,o.broken?1:0,o.moving?1:0])}
 S.MOVERS.length=0;CC.push({i:i+1,type:t,hits,slide})}
// ---- to Lua ----
const num=v=>{if(!Number.isFinite(v))throw Error('bad number '+v);return v.toPrecision(17)};
function lua(v){if(Array.isArray(v))return'{'+v.map(lua).join(',')+'}';if(v===null||v===undefined)return'nil';if(typeof v==='object')return'{'+Object.entries(v).map(([q,x])=>'['+JSON.stringify(q)+']='+lua(x)).join(',')+'}';
 if(typeof v==='string')return JSON.stringify(v);if(typeof v==='boolean')return String(v);return num(v)}
const src=f=>fs.readFileSync(f,'utf8');
const harness=`
local Objects = (function()\n${src(path.join(__dirname,'..','src','ReplicatedStorage','Modules','Objects.lua'))}\nend)()
local MODS = {${mods.map(f=>'(function()\n'+src(path.join(SH,f))+'\nend)()').join(',\n')}}
Objects.load(MODS)
local CB = ${lua(CB)}
local CC = ${lua(CC)}
local bad, worst = 0, 0
local function report(name, e, at)
	if e > worst then worst = e end
	local ok = e < 1e-9
	if not ok then bad += 1 end
	print((ok and "PASS " or "FAIL ") .. name .. string.format("  (largest difference %.3g%s)", e, e > 0 and at and (" at " .. at) or ""))
end
local function d(a, b) return math.abs(a - b) / math.max(1, math.abs(b)) end
-- B. colB
do
	local e, at, hits = 0, nil, 0
	for n, c in ipairs(CB) do
		local o = table.clone(c.o)
		local hit = Objects.collide(o, o.rad or 2.2)
		if hit ~= c.hit then e, at = math.huge, "case " .. n .. " (hit " .. tostring(hit) .. ", web " .. tostring(c.hit) .. ")" end
		if hit then hits += 1 end
		local got = o.rad and { o.x, o.z, o.v } or { o.x, o.z, o.vx, o.vz }
		for k = 1, #got do
			local x = d(got[k], c.after[k])
			if x > e then e, at = x, "case " .. n .. " value " .. k end
		end
	end
	report("B. colB: " .. #CB .. " cars and AI cars around the colliders (" .. hits .. " touching)", e, at)
end
-- C. objectImpact, then the slide
local function fresh(i)
	local c = Objects.list[i]
	local o = {}
	for k, v in pairs(c) do if k ~= "cells" and k ~= "broken" then o[k] = v end end
	return o
end
local byType = {}
for _, c in ipairs(CC) do
	local o = fresh(c.i)
	local e, at = 0, nil
	for h, w in ipairs(c.hits) do
		local r = Objects.impact(o, w.vn, w.mass, w.nx, w.nz, w.t, function() return 0.7 end)
		local got = { r.ebs, r.gave, o.bent or 0, o.dmg or 0, o.defl or 0 }
		local want = { w.ebs, w.gave, w.bent, w.dmg, w.defl }
		for k = 1, 5 do
			local x = d(got[k], want[k])
			if x > e then e, at = x, "hit " .. h .. " value " .. k end
		end
		if r.broke ~= w.broke or r.label ~= w.label or (o.broken == true) ~= w.broken or (o.moving == true) ~= w.moving then
			e, at = math.huge, string.format("hit %d: broke %s/%s label %s/%s removed %s/%s moving %s/%s", h, tostring(r.broke), tostring(w.broke), r.label, w.label,
				tostring(o.broken == true), tostring(w.broken), tostring(o.moving == true), tostring(w.moving))
		end
	end
	if #c.slide > 0 then
		local q = o.mover
		local f, k = 0, 1
		while q and k < #c.slide and f < 900 do
			f += 1
			local still = table.find(Objects.MOVERS, q) ~= nil
			Objects.step(1 / 60, 0)
			local gone = table.find(Objects.MOVERS, q) == nil
			if f % 30 == 0 or gone then
				local w = c.slide[k]
				for j, v in ipairs({ q.x, q.z, q.ry, q.tip }) do
					local x = d(v, w[j])
					if x > e then e, at = x, "slide step " .. f .. " value " .. j end
				end
				k += 1
				if gone then break end
			end
		end
		local w = c.slide[#c.slide]
		for j, v in ipairs({ o.x, o.z, o.c, o.s, o.broken and 1 or 0, o.moving and 1 or 0 }) do
			local x = d(v, w[j])
			if x > e then e, at = x, "after the slide value " .. j end
		end
	end
	table.clear(Objects.MOVERS)
	local b = byType[c.type] or { n = 0, h = 0, e = 0, at = nil, broke = 0, slid = 0 }
	byType[c.type] = b
	b.n += 1
	b.h += #c.hits
	if #c.slide > 0 then b.slid += 1 end
	for _, w in ipairs(c.hits) do if w.broke then b.broke += 1 end end
	if e > b.e then b.e, b.at = e, "object " .. c.i .. " " .. tostring(at) end
end
for _, t in ipairs({ "streetLight", "utilityPole", "sign", "bin", "guardrail", "tree", "-", "solid" }) do
	local b = byType[t]
	if b then report(string.format("C. %s: %d objects, %d hits (%d broke%s)", t == "-" and "untyped circles (islands, columns)" or t, b.n, b.h, b.broke, b.slid > 0 and (", " .. b.slid .. " slid to a stop") or ""), b.e, b.at) end
end
print(string.format("RESULT %d failed, largest difference %.3g", bad, worst))
`;
const out=path.join(os.tmpdir(),'irbid_objects_equiv_'+process.pid+'.luau');fs.writeFileSync(out,harness);
const r=spawnSync(LUAU,[out],{encoding:'utf8',maxBuffer:64<<20});
let sb=0;for(const[n,ok,dt]of checks){cl0((ok?'PASS ':'FAIL ')+n+'  ('+dt+')');if(!ok)sb++}
process.stdout.write(r.stdout||'');process.stderr.write(r.stderr||'');
// the cases must exercise what they claim
const all=CC.flatMap(c=>c.hits);
const sanity=[['poles and lights broke, signs bent, a tree fell, a dumpster slid, a rail deflected',['streetLight','utilityPole','sign'].every(t=>CC.some(c=>c.type===t&&c.hits.some(h=>h.broke)))&&CC.some(c=>c.type==='sign'&&c.hits.some(h=>h.bent>0&&!h.broke))&&
  CC.some(c=>c.type==='tree'&&c.hits.some(h=>h.broke))&&CC.some(c=>c.slide.length>2)&&CC.some(c=>c.type==='guardrail'&&c.hits.some(h=>h.defl>0))],['some colB cases touch, some do not',CB.some(c=>c.hit)&&CB.some(c=>!c.hit)]];
for(const[n,ok]of sanity){cl0((ok?'PASS ':'FAIL ')+'(web) '+n);if(!ok)sb++}
const fails=((r.stdout||'').match(/^FAIL /gm)||[]).length+sb,passes=((r.stdout||'').match(/^PASS /gm)||[]).length+checks.filter(c=>c[1]).length;
cl0(`\n${passes} passed, ${fails} failed, luau exit ${r.status}`);
process.exit(fails||r.status||!passes?1:0);
