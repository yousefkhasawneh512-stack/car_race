// ---- v45: pause + settings menu (Esc, or the wheel's Back button), graphics quality presets, frame-time meter ----
// Pause stops the whole simulation (traffic, physics, races, heist timers, damage) and suspends audio; the main loop keeps only its rAF alive.
// Quality: Auto = the v40 behaviour (High, drops bloom then post-processing if frames stay slow); High = never drops; Medium = no bloom,
// 2048 shadow map; Low = no post chain (CSS grade), 1024 shadow map, shorter detail range. Stored under its own key; nothing else changes.
// v47: Low also renders 1280x720 (scaled to the same 16:9 box: 2.25x fewer pixels); Ultra renders 2560x1440 (supersampled down to the screen,
// sharper edges and far detail; 1.78x the pixels of High) with 1.3x the detail range. High already uses the 4096 shadow map where the GPU allows (02b).
// Traffic density (High 80 cars = the v46 game, Medium 52, Low 28) is a separate setting: parked cars are hidden and not simulated.
const PSTORE='irbid-drive-gfx-v1',PAUSE={on:false},GQ={q:'auto',fps:false,base:null,t:'high'},TDEN={high:1,medium:.65,low:.35};
try{const o=JSON.parse(localStorage.getItem(PSTORE)||'{}');if(['auto','ultra','high','medium','low'].includes(o.q))GQ.q=o.q;GQ.fps=o.fps===true;if(TDEN[o.t])GQ.t=o.t}catch(e){}
function gqSave(){try{localStorage.setItem(PSTORE,JSON.stringify({q:GQ.q,fps:GQ.fps,t:GQ.t}))}catch(e){}}
function gqShadow(n){try{const ms=Math.min(n,ren.capabilities.maxTextureSize||2048);if(sun.shadow.mapSize.x===ms)return;sun.shadow.mapSize.set(ms,ms);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null}}catch(e){}}
function gqApply(){if(!GQ.base)GQ.base={sh:sun.shadow.mapSize.x,post:POST.on,lod:LODL.map(o=>o.r2)};const q=GQ.q,b=GQ.base;
 window.__NOAQ=q!=='auto'?1:window.__NOAQ0;   // the adaptive drop only runs in Auto
 const rw=q==='low'?1280:q==='ultra'?2560:DISP.w,rh=q==='low'?720:q==='ultra'?1440:DISP.h;try{const sz=ren.getSize(new T.Vector2());if(sz.x!==rw||sz.y!==rh){ren.setSize(rw,rh,false);if(POST.comp)POST.comp.setSize(rw,rh)}}catch(e){}
 if(b.post&&POST.comp){if(q==='low'){if(POST.on)postLegacy()}else if(!POST.on){POST.on=true;ren.domElement.style.filter='';fxBlur.style.display='none'}if(POST.bloom)POST.bloom.enabled=q==='auto'||q==='high'||q==='ultra'}
 gqShadow(q==='low'?1024:q==='medium'?Math.min(2048,b.sh):b.sh);
 const k=q==='low'?.7*.7:q==='ultra'?1.3*1.3:1;for(let i=0;i<LODL.length;i++)LODL[i].r2=b.lod[i]*k;LODT.force=1}
// ---- v48: accessibility: HUD text size (CSS zoom on the HUD / menus) and reduced motion (no speed FOV pump, no post-chain motion blur).
// Reduced motion defaults to the OS "reduce motion" setting. Stored under irbid-drive-a11y-v1. ----
const A11STORE='irbid-drive-a11y-v1',A11Y={ts:1,rm:false};
try{A11Y.rm=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){}
try{const o=JSON.parse(localStorage.getItem(A11STORE)||'{}');if([.9,1,1.2,1.4].includes(o.ts))A11Y.ts=o.ts;if(typeof o.rm==='boolean')A11Y.rm=o.rm}catch(e){}
function a11yApply(){try{let st=document.getElementById('a11yCss');if(!st){st=document.createElement('style');st.id='a11yCss';document.head.appendChild(st)}
 st.textContent=A11Y.ts===1?'':'#top,#spd,#race,#drift,#heist,#toast,#navBan,#nav,#car,#damageBtn,#repairBtn,#school,#pauseMenu>div,#schoolRes>div{zoom:'+A11Y.ts+'}'}catch(e){}}
function a11ySave(){try{localStorage.setItem(A11STORE,JSON.stringify(A11Y))}catch(e){}}
a11yApply();
// ---- v47: traffic density ----
const TRAFALL=traffic.slice();
function trApply(){const n=Math.round(TRAFALL.length*(TDEN[GQ.t]||1));TRAFALL.forEach((c,i)=>{const pk=i>=n;if(pk===!!c.park)return;c.park=pk;
 if(pk){c.x=c.z=2e5;c.v=0;c.m.position.set(2e5,0,2e5);c.m.visible=false}else{c.m.visible=true;respawn(c,200)}})}
{const u0=updTraffic;updTraffic=function(c,dt){if(c.park){if(c.m.visible)c.m.visible=false;return}u0(c,dt)}}
window.__NOAQ0=window.__NOAQ;
// lodTick only needs to run when the camera has moved (24k distance checks per call); behaviour-neutral below 3 m of camera travel
const LODT={x:1e9,z:1e9,force:1};
{const lt0=lodTick;lodTick=function(){const dx=cam.position.x-LODT.x,dz=cam.position.z-LODT.z;if(!LODT.force&&dx*dx+dz*dz<9)return;LODT.force=0;LODT.x=cam.position.x;LODT.z=cam.position.z;lt0()}}
// frame-time meter: mean / 99th percentile frame time over the last 120 frames, fps, draw calls (counted on the next frame)
const FPS={buf:new Float32Array(120),i:0,n:0,last:0,el:null,t:0,srt:new Float32Array(120)};
FPS.el=document.createElement('div');FPS.el.id='fpsMeter';FPS.el.style.cssText='position:fixed;right:8px;top:8px;z-index:40;background:rgba(0,0,0,.65);color:#9f9;font:12px ui-monospace,monospace;padding:4px 7px;border-radius:5px;pointer-events:none;white-space:pre;display:none';try{document.body.appendChild(FPS.el)}catch(e){}
function fpsTick(now){const ri=ren.info;if(ri&&ri.render&&GQ.fps){FPS.calls=ri.render.calls;FPS.tris=ri.render.triangles;ri.autoReset=false;ri.reset()}else if(ri&&!ri.autoReset)ri.autoReset=true;if(FPS.last){FPS.buf[FPS.i]=now-FPS.last;FPS.i=(FPS.i+1)%120;FPS.n=Math.min(120,FPS.n+1)}FPS.last=now;
 if(!GQ.fps||FPS.n<10||now-FPS.t<500){FPS.el.style.display=GQ.fps?'':'none';return}FPS.t=now;FPS.el.style.display='';let s=0;for(let j=0;j<FPS.n;j++){s+=FPS.buf[j];FPS.srt[j]=FPS.buf[j]}
 const a=FPS.srt.subarray(0,FPS.n).sort(),m=s/FPS.n,p99=a[Math.min(FPS.n-1,Math.floor(FPS.n*.99))];
 FPS.el.textContent=(1000/m).toFixed(0)+' fps  '+m.toFixed(1)+' ms (99% '+p99.toFixed(1)+')\n'+FPS.calls+' draws · '+(FPS.tris/1e3).toFixed(0)+'k tris · '+DISP.w+'x'+DISP.h+' · '+GQ.q+(POST.on?'':' (no post)')}
// ---- menu ----
const pauseEl=document.createElement('div');pauseEl.id='pauseMenu';
pauseEl.style.cssText='position:fixed;inset:0;z-index:50;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.55);font:14px system-ui,sans-serif;color:#eee';
pauseEl.innerHTML='<div style="background:#15181d;border:1px solid #333;border-radius:10px;padding:16px 20px;width:min(420px,92vw);max-height:92vh;overflow:auto">'+
 '<div style="font-size:20px;font-weight:700;margin-bottom:8px">Paused</div>'+
 '<button data-a="resume" style="width:100%;padding:8px;margin-bottom:10px;font-size:15px">▶ Resume (Esc)</button>'+
 '<div style="font-weight:600;margin:6px 0 4px">Sound</div>'+
 [['master','Master'],['engine','Engine'],['fx','Effects (tyres, impacts)'],['amb','Ambient (wind, road, traffic)']].map(([k,l])=>'<label style="display:flex;justify-content:space-between;gap:8px;margin:3px 0">'+l+'<input type="range" min="0" max="100" data-v="'+k+'" style="width:52%"></label>').join('')+
 '<label style="display:block;margin:4px 0"><input type="checkbox" data-c="mute"> Mute (L)</label><div data-i="aud" style="font-size:12px;color:#aaa"></div>'+
 '<div style="font-weight:600;margin:10px 0 4px">Graphics</div><label style="display:flex;justify-content:space-between">Quality <select data-s="q"><option value="auto">Auto (High, drops if slow)</option><option value="ultra">Ultra (1440p supersampled, longer range)</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low (720p, no effects)</option></select></label>'+
 '<label style="display:flex;justify-content:space-between;margin-top:4px">Traffic <select data-s="tr"><option value="high">High (80 cars)</option><option value="medium">Medium (52)</option><option value="low">Low (28, weak devices)</option></select></label>'+
 '<label style="display:block;margin:4px 0"><input type="checkbox" data-c="fps"> Show frame-time meter</label><div data-i="plat" style="font-size:12px;color:#aaa"></div>'+
 '<div style="font-weight:600;margin:10px 0 4px">Driving school</div><div data-i="sch"></div>'+
 '<div style="font-weight:600;margin:10px 0 4px">Accessibility</div><label style="display:flex;justify-content:space-between">Text size <select data-s="ts"><option value="0.9">Small</option><option value="1">Normal</option><option value="1.2">Large</option><option value="1.4">Extra large</option></select></label>'+
 '<label style="display:block;margin:4px 0"><input type="checkbox" data-c="rm"> Reduced motion (no speed zoom or motion blur)</label>'+
 '<div style="font-weight:600;margin:10px 0 4px">Driving</div><button data-a="hand" style="width:100%;padding:6px;margin:2px 0"></button><button data-a="dmg" style="width:100%;padding:6px;margin:2px 0"></button><button data-a="gear" style="width:100%;padding:6px;margin:2px 0"></button>'+
 '<div style="display:flex;gap:4px"><button data-a="abs" style="flex:1;padding:6px"></button><button data-a="tc" style="flex:1;padding:6px"></button><button data-a="esc" style="flex:1;padding:6px"></button></div>'+
 '<div data-i="rep" style="font-size:12px;color:#aaa;margin:4px 0"></div>'+
 '<div style="font-weight:600;margin:10px 0 4px">Weather and time</div><label style="display:flex;justify-content:space-between">Weather <select data-s="wx"><option value="auto">Auto (Irbid seasons)</option><option value="clear">Clear</option><option value="cloudy">Cloudy</option><option value="rain">Rain</option></select></label>'+
 '<label style="display:flex;justify-content:space-between;margin-top:4px">Clock <select data-s="clk"><option value="game">Game time (1 day = 16 min)</option><option value="local">Irbid local time (Asia/Amman)</option></select></label><div data-i="wx" style="font-size:12px;color:#aaa;margin-top:4px"></div>'+
 '<div style="font-size:12px;color:#aaa;margin-top:10px">W/S drive · A/D steer · Space handbrake · H handling · I damage · O diagnostics · V wheel setup · L mute · C camera (chase / cockpit / bonnet / bumper) · M search · P shop · F reset · Q/E gears (Realistic) · X horn · Z auto-drive (after M sets a route)</div></div>';
try{document.body.appendChild(pauseEl)}catch(e){}
const pq=s=>pauseEl.querySelector(s);
function pauseSync(){try{for(const k of['master','engine','fx','amb']){const r=pq('[data-v="'+k+'"]');if(r)r.value=Math.round(AUD[k]*100)}const mu=pq('[data-c="mute"]');if(mu)mu.checked=AUD.mute;const fp=pq('[data-c="fps"]');if(fp)fp.checked=GQ.fps;const qs=pq('[data-s="q"]');if(qs)qs.value=GQ.q;const ts=pq('[data-s="tr"]');if(ts)ts.value=GQ.t;const pl=pq('[data-i="plat"]');if(pl&&typeof platLine==='function')pl.textContent=platLine();
 const h=pq('[data-a="hand"]');if(h)h.textContent='Handling: '+(handlingMode?'Realistic':'Arcade')+' (H)';const d=pq('[data-a="dmg"]');if(d)d.textContent='Damage: '+(['Off','Cosmetic','Full'][damageMode]||damageMode)+' (I)';
 for(const [k,n] of [['abs','ABS'],['tc','Traction control'],['esc','Stability (ESC)']]){const b=pq('[data-a="'+k+'"]');if(b)b.textContent=n+': '+(ASSIST[k]?'on':'off')+(handlingMode?'':' (Realistic)')}
 const sc=pq('[data-i="sch"]');if(sc&&typeof schMenuHtml==='function')sc.innerHTML=schMenuHtml();const tz=pq('[data-s="ts"]');if(tz)tz.value=String(A11Y.ts);const rm=pq('[data-c="rm"]');if(rm)rm.checked=A11Y.rm;
 const gb=pq('[data-a="gear"]');if(gb)gb.textContent='Gearbox: '+(PTS.man?'Manual (Q / E, paddles)':'Automatic')+(handlingMode?'':' · Realistic only');
 const rp=pq('[data-i="rep"]');if(rp&&typeof REP!=='undefined'){const r=REP.riv,rv=['Samer','Layth','Omar'].filter(n=>r[n]&&r[n].r).map(n=>n+' '+r[n].w+'–'+r[n].l+(r[n].h?' ('+r[n].h+' hits)':'')).join(' · ');rp.textContent='Road reputation '+Math.round(REP.road)+'/100 (traffic remembers hits, red lights, wrong way, speeding; clean driving earns it back)'+(rv?' · Rivals you–them: '+rv:'')}
 const ws=pq('[data-s="wx"]');if(ws&&typeof WX!=='undefined'){ws.value=WX.mode;pq('[data-s="clk"]').value=WX.clock;pq('[data-i="wx"]').textContent=wxLine()}
 const ai=pq('[data-i="aud"]');if(ai)ai.textContent=!AU.ok?'Sound unavailable in this browser':!AU.ctx?'Sound starts on your first click or key press':'Engine: '+engProfile(P.idx).code+' · '+engProfile(P.idx).src+' (synthesised, not a recording)'}catch(e){}}
function pauseToggle(on){on=on===undefined?!PAUSE.on:!!on;if(on===PAUSE.on)return;PAUSE.on=on;
 if(on){ui=true;for(const k in keys)keys[k]=0;pauseSync();pauseEl.style.display='flex';if(AU.ctx&&AU.ctx.state==='running')AU.ctx.suspend()}
 else{pauseEl.style.display='none';ui=false;if(AU.ctx&&!document.hidden)AU.ctx.resume().catch(()=>{})}}
pauseEl.addEventListener('click',e=>{const a=e.target.dataset&&e.target.dataset.a;if(a==='resume')pauseToggle(false);else if(a==='hand'){setHandling(!handlingMode);pauseSync()}else if(a==='dmg'){if(typeof cycleDamageMode==='function')cycleDamageMode();pauseSync()}else if(a==='gear'){setGearbox(!PTS.man);pauseSync()}else if(a==='abs'||a==='tc'||a==='esc'){ASSIST[a]=!ASSIST[a];assistSave();pauseSync()}
 const si=e.target.dataset&&e.target.dataset.sch;if(si!==undefined){if(si==='quit'){schStop();pauseSync()}else{pauseToggle(false);schStart(+si)}}});
pauseEl.addEventListener('input',e=>{const t=e.target,d=t.dataset||{};if(d.v)audSet(d.v,t.value/100);else if(d.c==='mute')audSet('mute',t.checked);else if(d.c==='fps'){GQ.fps=t.checked;gqSave()}else if(d.s==='q'){GQ.q=t.value;gqSave();gqApply();toast('Graphics: '+GQ.q)}else if(d.s==='ts'){A11Y.ts=+t.value;a11ySave();a11yApply()}else if(d.c==='rm'){A11Y.rm=t.checked;a11ySave()}else if(d.s==='tr'){GQ.t=t.value;gqSave();trApply();toast('Traffic: '+GQ.t)}else if(d.s==='wx'){wxSet('mode',t.value);pauseSync()}else if(d.s==='clk'){wxSet('clock',t.value);pauseSync()}});
pauseEl.addEventListener('keydown',e=>e.stopPropagation());
// capture phase: decide BEFORE other Esc handlers close their own menus (Esc that closes a menu never also opens the pause menu)
addEventListener('keydown',e=>{if(e.code!=='Escape'||e.repeat)return;if(PAUSE.on){e.preventDefault();e.stopImmediatePropagation();pauseToggle(false);return}
 if(e.target&&e.target.tagName==='INPUT')return;if(ESC_PRE||ui||(typeof diagOpen!=='undefined'&&diagOpen))return;e.preventDefault();pauseToggle(true)},true);
// a hidden tab stops rAF; stop the audio too (otherwise the last engine note keeps playing)
document.addEventListener&&document.addEventListener('visibilitychange',()=>{if(!AU.ctx)return;if(document.hidden)AU.ctx.suspend();else if(!PAUSE.on)AU.ctx.resume().catch(()=>{})});
if(GQ.q!=='auto')gqApply();if(GQ.t!=='high')trApply();
// HUD lines are rebuilt every frame; only write the DOM when the text actually changed (same strings, fewer style/layout passes)
function hudCache(){if(typeof Element!=='undefined'){const d=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');if(d&&d.set)for(const e of[spdEl,topEl,raceEl,heistEl]){let last=null;Object.defineProperty(e,'innerHTML',{configurable:true,get(){return d.get.call(e)},set(v){v=String(v);if(v!==last){last=v;d.set.call(e,v)}}})}}}
if(typeof saveNote!=='undefined'&&saveNote)setTimeout(()=>toast(saveNote),1500);
