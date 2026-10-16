// ---- vehicle diagnostics (v39): damage report, per-wheel tyre view, dashboard warnings. Key O or the Diagnostics button; not modal (you can drive with it open) ----
const diagBtn=document.createElement('button'),diagPanel=document.createElement('div'),dmgWarn=document.createElement('div');
diagBtn.id='diagBtn';diagBtn.type='button';diagBtn.textContent='Diagnostics (O)';diagBtn.title='Vehicle damage report and tyre view (O)';
diagBtn.style.cssText='position:fixed;right:12px;top:calc(126px + env(safe-area-inset-top));z-index:4;padding:6px 10px;font-size:12px;color:#fff;background:#242a30dd;border:1px solid #ffffff40;border-radius:7px;cursor:pointer;display:none;touch-action:manipulation';
dmgWarn.id='dmgWarn';dmgWarn.style.cssText='position:fixed;right:12px;top:calc(162px + env(safe-area-inset-top));z-index:4;font:600 12px system-ui,sans-serif;color:#ffcf6b;text-align:right;text-shadow:0 1px 2px #000;pointer-events:none;white-space:pre-line';
diagPanel.id='diagPanel';diagPanel.style.cssText='position:fixed;right:12px;top:calc(50px + env(safe-area-inset-top));z-index:6;width:min(430px,calc(100vw - 24px));max-height:calc(100vh - 70px);overflow:auto;padding:12px 14px;font:13px/1.35 system-ui,sans-serif;color:#e8ecef;background:#121519ee;border:1px solid #ffffff38;border-radius:10px;display:none;box-shadow:0 8px 30px #0008';
try{document.body.appendChild(diagBtn);document.body.appendChild(dmgWarn);document.body.appendChild(diagPanel)}catch(e){}
let diagOpen=false,diagT=0,warnT=0;
const sev=h=>h>=95?['OK','#7fd68a']:h>=75?['minor','#c9e36b']:h>=45?['moderate','#ffcf6b']:h>=15?['severe','#ff9a5c']:['failed','#ff6b6b'];
const pct=v=>Math.round(v)+'%',bar=(h,w)=>{const c=sev(h)[1];return'<span style="display:inline-block;width:'+(w||60)+'px;height:7px;background:#ffffff1c;border-radius:4px;vertical-align:middle"><span style="display:block;height:7px;width:'+cl(h,0,100)+'%;background:'+c+';border-radius:4px"></span></span>'};
function diagSync(){const on=damageMode!==0;diagBtn.style.display=on||diagOpen?'block':'none';if(!on)dmgWarn.textContent=''}
function diagToggle(f){diagOpen=f===undefined?!diagOpen:!!f;diagPanel.style.display=diagOpen?'block':'none';diagSync();if(diagOpen)diagRender()}
diagBtn.addEventListener('click',()=>diagToggle());
addEventListener('keydown',e=>{if(e.target&&e.target.tagName==='INPUT')return;if(e.code==='KeyO'&&!e.repeat){e.preventDefault();diagToggle()}else if(e.code==='Escape'&&diagOpen)diagToggle(false)});
diagPanel.addEventListener('click',e=>{const b=e.target&&e.target.dataset&&e.target.dataset.act;if(b==='close')diagToggle(false);else if(b==='repair')repairCurrentCar();else if(b==='tyres')repairCurrentCar('tyres');if(b)diagRender()});
// effect wording comes from the same formulas damageEffects() uses
function diagRows(s,sp,full){const ev=sp.ev,rows=[],eff=(t)=>full?t:'<i>visual only in Cosmetic mode</i>',lim=s.engTemp>112?cl(1-(s.engTemp-112)/50,.55,1):1;
 const hE=s.engine/100,hT=s.trans/100;
 rows.push([ev?'Motor / inverter':'Engine',s.engine,eff('power −'+Math.round((1-(.35+.65*Math.pow(hE,.8))*lim)*100)+'%'+(s.engine<28?' · smoking':''))]);
 rows.push([ev?'Battery & motor cooling':'Cooling (radiator)',s.cooling,eff((ev?'drive unit ':'engine ')+Math.round(s.engTemp)+' °C'+(s.cooling<70?' · overheats under sustained throttle':'')+(lim<1?' · power limited '+Math.round((1-lim)*100)+'%':''))]);
 rows.push([ev?'Reduction gear':'Transmission',s.trans,eff('top speed −'+Math.round((1-(.72+.28*hT))*100)+'%, acceleration −'+Math.round((1-(.6+.4*hT))*100)+'%')]);
 rows.push(['Driveline',s.driveline,eff(s.driveline<90?'vibration, acceleration −'+Math.round((1-(.8+.2*s.driveline/100))*100)+'%':'no effect')]);
 rows.push(['Steering',s.steer,eff('steering response −'+Math.round((1-(.58+.42*s.steer/100))*100)+'%')]);
 rows.push(['Brakes',s.brakes,eff('braking −'+Math.round((1-(.5+.5*s.brakes/100))*100)+'%')]);
 for(let j=0;j<4;j++)rows.push(['Suspension '+WHEEL_NAMES[j],s.susp[j],eff(s.susp[j]<60?'camber/instability, less grip':s.susp[j]<95?'slightly softer':'no effect')]);
 const toe=s.align[0]+s.align[1]+.5*(s.align[2]+s.align[3]);
 rows.push(['Wheel alignment',100-Math.min(100,Math.abs(toe)*25),eff(Math.abs(toe)<.05?'straight':'pulls '+(toe>0?'left':'right')+' (toe '+toe.toFixed(1)+'°)')]);
 return rows}
function diagRender(){
 if(!diagOpen)return;const s=currentDamageRecord(),sp=carSpec(P.idx||0),full=damageMode===2,on=damageMode!==0;let h='';
 h+='<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><b style="font-size:15px">'+sp.name+'</b><button data-act="close" style="background:#ffffff1a;color:#fff;border:0;border-radius:6px;padding:3px 9px;cursor:pointer">✕</button></div>';
 h+='<div style="opacity:.8;margin:2px 0 8px">Damage mode: <b>'+DAMAGE_MODE_NAMES[damageMode]+'</b> (I to change) · '+sp.mass+' kg <i>est.</i> · '+sp.drive+' <i>'+sp.driveSrc+'</i> · '+({F:'front',M:'mid',R:'rear'})[sp.eng]+(sp.ev?' motor':' engine')+' · durability '+Math.round(sp.durability)+'</div>';
 if(!on){diagPanel.innerHTML=h+'<p>Damage is <b>Off</b>: nothing is recorded and the car drives exactly as before. Press <b>I</b> (or the Damage button) for Cosmetic or Full simulation.</p>';return}
 // body: top-down zone map
 const z=s.zones,cell=(k,lab)=>{const v=z[k],c=sev(v)[1];return'<div style="padding:4px 2px;text-align:center;border-radius:5px;background:'+c+'22;border:1px solid '+c+'88"><div style="font-size:11px;opacity:.8">'+lab+'</div><b>'+pct(v)+'</b></div>'};
 h+='<div style="font-weight:650;margin:6px 0 4px">Body (top view, front at the top)</div><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;max-width:330px">'+cell('fl','front-left')+'<div style="text-align:center;font-size:11px;opacity:.6;align-self:center">▲ front</div>'+cell('fr','front-right')+cell('l','left side')+cell('roof','roof')+cell('r','right side')+cell('rl','rear-left')+cell('u','underbody')+cell('rr','rear-right')+'</div>';
 const lights=s.lights.map((v,j)=>v?LIGHT_NAMES[j]:null).filter(Boolean),glass=s.glass.map((v,j)=>v>0?GLASS_NAMES[j]+' '+Math.round(v*100)+'%':null).filter(Boolean);
 h+='<div style="margin:6px 0">Lights: '+(lights.length?'<span style="color:#ff9a5c">broken '+lights.join(', ')+'</span>':'all working')+'<br>Glass: '+(glass.length?'<span style="color:#ffcf6b">cracked '+glass.join(', ')+'</span>':'intact')+'<br>Dents: '+s.dents.length+' (deepest '+Math.round(Math.max(0,...s.dents.map(d=>d[5]))*100)+' cm)</div>';
 // internal components
 h+='<div style="font-weight:650;margin:8px 0 4px">Mechanical'+(full?'':' <span style="font-weight:400;opacity:.7">(not simulated in Cosmetic mode)</span>')+'</div><table style="width:100%;border-collapse:collapse;font-size:12px">';
 for(const r of diagRows(s,sp,full)){const[w,c]=sev(r[1]);h+='<tr><td style="padding:2px 4px 2px 0">'+r[0]+'</td><td>'+bar(r[1],50)+'</td><td style="color:'+c+';padding:0 4px;white-space:nowrap">'+pct(r[1])+' '+w+'</td><td style="opacity:.85">'+r[2]+'</td></tr>'}
 h+='</table>';
 // tyres: one card per wheel
 h+='<div style="font-weight:650;margin:10px 0 4px">Tyres (per wheel)'+(full?'':' <span style="font-weight:400;opacity:.7">wear tracked; grip effect only in Full</span>')+'</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">';
 for(let j=0;j<4;j++){const w=s.wheels[j],mu=tyreMu(w),drv=(j<2)?sp.drive!=='RWD':sp.drive!=='FWD',st=w.punct?['PUNCTURED','#ff6b6b']:w.temp>150?['overheated','#ff9a5c']:w.tread<20?['worn','#ffcf6b']:['OK','#7fd68a'],wr=w.wear;
  h+='<div style="padding:6px;border-radius:6px;background:#ffffff0d;border:1px solid '+st[1]+'66"><b>'+WHEEL_NAMES[j]+'</b> <span style="font-size:11px;opacity:.7">'+(drv?'driven':'free')+'</span> <span style="color:'+st[1]+';float:right">'+st[0]+'</span><br>tread '+bar(w.tread,46)+' '+pct(w.tread)+'<br>carcass '+bar(w.health,38)+' '+pct(w.health)+'<br>temp <b>'+Math.round(w.temp)+' °C</b> · grip ×'+mu.toFixed(2)
   +'<br><span style="font-size:11px;opacity:.75">load '+Math.round(TYS.fz[j])+' N · slip '+TYS.sl[j].toFixed(1)+'/'+TYS.sa[j].toFixed(1)+' m/s<br>wear: burnout '+wr.burn.toFixed(1)+' · slide '+wr.slide.toFixed(1)+' · spin '+wr.spin.toFixed(1)+' · lock '+wr.lock.toFixed(1)+' · road '+wr.roll.toFixed(2)+' %</span></div>'}
 h+='</div><div style="font-size:11px;opacity:.65;margin-top:4px">'+(TYS.burn?'<b style="color:#ff9a5c">BURNOUT</b> · ':'')+'Burnout: throttle + brake at a standstill (FWD: throttle + handbrake). Whether the wheels break loose depends on power, weight split and drivetrain.</div>';
 if(s.log.length){h+='<div style="font-weight:650;margin:10px 0 4px">Recent impacts</div><div style="font-size:12px">'+s.log.map(q=>q.kmh+' km/h · '+q.zone+' · '+q.obj+(q.ebs?' · '+q.ebs+' km/h barrier-equivalent':'')).join('<br>')+'</div>'}
 h+='<div style="margin-top:10px;display:flex;gap:8px"><button data-act="repair" style="flex:1;padding:7px;border-radius:7px;border:1px solid #ffffff40;background:#2b6b3a;color:#fff;cursor:pointer">Repair all (free)</button><button data-act="tyres" style="flex:1;padding:7px;border-radius:7px;border:1px solid #ffffff40;background:#33414d;color:#fff;cursor:pointer">Replace tyres (free)</button></div>';
 h+='<div style="font-size:11px;opacity:.55;margin-top:8px">All masses, layouts and thresholds are gameplay estimates unless marked doc; no manufacturer crash data is used. See manifest/cars.json.</div>';
 diagPanel.innerHTML=h}
// dashboard warnings (Full only), refreshed twice a second
function diagTick(dt){
 if(diagOpen){diagT+=dt;if(diagT>.25){diagT=0;diagRender()}}
 warnT+=dt;if(warnT<.5)return;warnT=0;if(damageMode!==2){dmgWarn.textContent='';return}
 const s=currentDamageRecord(),w=[];if(s.engTemp>110)w.push('⚠ '+(carSpec(P.idx||0).ev?'DRIVE TEMP ':'ENGINE TEMP ')+Math.round(s.engTemp)+' °C');if(s.engine<40)w.push('⚠ ENGINE '+Math.round(s.engine)+'%');
 for(let j=0;j<4;j++){const t=s.wheels[j];if(t.punct)w.push('⚠ TYRE '+WHEEL_NAMES[j]+' PUNCTURED');else if(t.tread<15)w.push('⚠ TYRE '+WHEEL_NAMES[j]+' '+Math.round(t.tread)+'%');else if(t.temp>150)w.push('⚠ TYRE '+WHEEL_NAMES[j]+' '+Math.round(t.temp)+' °C')}
 if(s.brakes<50)w.push('⚠ BRAKES');if(s.steer<50)w.push('⚠ STEERING');const t=w.slice(0,4).join('\n');if(dmgWarn.textContent!==t)dmgWarn.textContent=t}
diagReady=true;diagSync();
