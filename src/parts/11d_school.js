// ---- v48: driving school. Lessons run on REAL streets near the start with the player's normal car and controls (updP, keyboard / touch /
// wheel); nothing is simulated for the player. A lesson picks a straight two-way OSM street (or a signalised approach), marks zones on the road,
// gives instructions, watches speed, stops, the real fine rules (speeding, red light, wrong way, hitting cars) and scores 0-100.
// Rules: right-hand traffic, stop lines ~13.5 m before the junction centre, OSM speed limits (Jordan; SCH_RULES holds the regional values).
// Best scores are stored under irbid-drive-school-v1. Opened from the pause menu (Esc -> Driving school).
const SCH_RULES={side:1,stopLine:13.5,tolKmh:3},SSTORE='irbid-drive-school-v1';
const SCH={on:null,t:0,best:{},runs:0,site:null,pen:[],score:0,st:'',msg:'',over:0,last:{}};
try{const o=JSON.parse(localStorage.getItem(SSTORE)||'{}');if(o&&typeof o.best==='object')for(const k in o.best)if(isFinite(o.best[k]))SCH.best[k]=cl(+o.best[k],0,100);if(isFinite(o.runs))SCH.runs=+o.runs}catch(e){}
function schSave(){try{localStorage.setItem(SSTORE,JSON.stringify({v:1,best:SCH.best,runs:SCH.runs}))}catch(e){}}
// a straight stretch of `len` m on a street: travel order dir (1 = along pts, -1 = against), toEnd = the stretch must END at the polyline end
function schStraight(e,dir,len,toEnd){const p=dir>0?e.pts:e.pts.slice().reverse(),n=p.length,c=[0];for(let i=1;i<n;i++)c.push(c[i-1]+Math.hypot(p[i][0]-p[i-1][0],p[i][1]-p[i-1][1]));
 const ok=(i,j)=>{const ax=p[i][0],az=p[i][1],dx=p[j][0]-ax,dz=p[j][1]-az,l=Math.hypot(dx,dz)||1;for(let k=i+1;k<j;k++)if(Math.abs(((p[k][0]-ax)*dz-(p[k][1]-az)*dx)/l)>1.2)return false;return true};
 for(let j=n-1;j>0;j--){let i=j;while(i>0&&c[j]-c[i]<len)i--;if(c[j]-c[i]>=len&&ok(i,j)){const dx=p[j][0]-p[i][0],dz=p[j][1]-p[i][1],l=Math.hypot(dx,dz);return{x0:p[i][0],z0:p[i][1],x1:p[j][0],z1:p[j][1],ux:dx/l,uz:dz/l,len:l,e}}if(toEnd)return null}return null}
// the nearest suitable street to (x,z): two-way, not a ramp/roundabout/bridge/tunnel, 6+ m wide; lit = approach to a signalised junction
function schFind(x,z,len,lit){let best=null,bd=1e18;
 for(const e of EDGES){if(e.ow||e.rb||e.br||e.tn||e.kind==='ramp'||e.w<6||e.lim<30||e.lim>70||e.len<len)continue;const d=(e.mx-x)**2+(e.mz-z)**2;if(d>=bd||d>3000*3000)continue;
  if(lit){for(const [nid,dir] of [[e.b,1],[e.a,-1]]){const nd=NODES[nid];if(!nd||!nd.lit||!nd.ph||nd.ph[e.id]===undefined)continue;const s=schStraight(e,dir,len,true);if(s){s.nd=nd;best=s;bd=d}}}
  else{const s=schStraight(e,1,len,false);if(s){best=s;bd=d}}}
 if(best){best.rx=-best.uz*SCH_RULES.side;best.rz=best.ux*SCH_RULES.side;best.h=Math.atan2(best.ux,best.uz);best.lane=Math.min(2.6,best.e.w*.25)}return best}
// road markers (created after the terrain pass, so they add TH themselves)
// each marker: a translucent floor (scaled to the zone) + two 1.8 m posts at its far corners, so it reads from 100 m away
const SCHM=(()=>{const g=new T.Group(),pg=new T.CylinderGeometry(.09,.09,1.8,8),mk=c=>{const o=new T.Group(),mt=new T.MeshBasicMaterial({color:c,transparent:true,opacity:.6,depthWrite:false}),pm=new T.MeshBasicMaterial({color:c});
  o.userData.f=new T.Mesh(new T.BoxGeometry(1,.08,1),mt);o.userData.p=[new T.Mesh(pg,pm),new T.Mesh(pg,pm)];o.add(o.userData.f,...o.userData.p);o.visible=false;g.add(o);return o};
 // added to the scene on the first lesson (after the terrain pass, which would otherwise lift the group)
 return{g,zone:mk(0x3cff9a),line:mk(0xff5a5a),end:mk(0x4aa3ff)}})();
function schPut(m,s,along,side,w,l){const x=s.x0+s.ux*along+s.rx*side,z=s.z0+s.uz*along+s.rz*side;m.position.set(x,TH(x,z)+.08,z);m.rotation.y=s.h;m.userData.f.scale.set(w,1,l);
 m.userData.p.forEach((p,i)=>p.position.set((i?-1:1)*w/2,.9,l/2));m.visible=true;return{x,z}}
function schLocal(s){const dx=P.x-s.x0,dz=P.z-s.z0;return{a:dx*s.ux+dz*s.uz,l:(dx*s.rx+dz*s.rz)}}
const schKmh=()=>Math.hypot(P.vx,P.vz)*3.6,schFwd=()=>P.vx*Math.sin(P.h)+P.vz*Math.cos(P.h);
// ---- lessons: setup(site) places markers and the car; tick(dt,L) returns 'run' | 'pass' | 'fail' ----
const LESSONS=[
 {id:'stop',name:'1. Start and stop',goal:'Drive to the green box and stop inside it. Stay under 40 km/h.',len:130,
  setup(s){s.zc=schPut(SCHM.zone,s,90,s.lane,3.2,8)},
  tick(dt,s,L){if(schKmh()>40+SCH_RULES.tolKmh)schPen('Too fast: '+Math.round(schKmh())+' km/h (40 max)',8,'spd',1.5);
   if(L.a>110)return schEnd('fail','You drove past the box.');
   if(schKmh()<.6&&SCH.t>3&&L.a>20){const da=Math.abs(L.a-90),dl=Math.abs(L.l-s.lane);if(da<=4&&dl<=1.6){schPen('Distance from the box centre '+da.toFixed(1)+' m',Math.round(da*3),'pos',99);return schEnd('pass','Stopped in the box.')}if(SCH.t>8)SCH.msg='Not in the box yet: '+(L.a<90?Math.round(86-L.a)+' m to go':'too far')}return'run'}},
 {id:'brake',name:'2. Emergency stop',goal:'Reach 50 km/h before the red line, then brake hard and stop within 30 m, keeping straight.',len:230,
  setup(s){schPut(SCHM.line,s,130,s.lane,4,1.2);schPut(SCHM.zone,s,145,s.lane,3.2,30)},
  tick(dt,s,L){if(!s.at&&L.a>=130){s.at=1;s.v0=schKmh();s.l0=L.l;if(s.v0<50)schPen('Only '+Math.round(s.v0)+' km/h at the line (50 needed)',Math.round((50-s.v0)*2),'slow',99);SCH.msg='BRAKE!'}
   if(s.at){s.dl=Math.max(s.dl||0,Math.abs(L.l-s.l0));if(schKmh()<.6){const d=L.a-130;if(d>30)return schEnd('fail','Stopped '+d.toFixed(1)+' m after the line (30 m allowed).');schPen('Stopping distance '+d.toFixed(1)+' m',Math.max(0,Math.round((d-18)*2)),'dist',99);if(s.dl>1.5)schPen('Drifted '+s.dl.toFixed(1)+' m sideways',Math.round(s.dl*6),'lat',99);return schEnd('pass','Stopped '+d.toFixed(1)+' m after the line from '+Math.round(s.v0)+' km/h.')}}
   else if(L.a>40&&schKmh()<5&&SCH.t>12)SCH.msg='Accelerate to 50 km/h before the red line.';if(L.a>200)return schEnd('fail','You did not stop.');return'run'}},
 {id:'limit',name:'3. Speed limit',goal:'Drive to the blue marker without going over the street\'s speed limit. Keep to the right.',len:320,
  setup(s){s.lim=s.e.lim||50;schPut(SCHM.end,s,300,s.lane,4,3)},
  tick(dt,s,L){if(schKmh()>s.lim+SCH_RULES.tolKmh)schPen('Over the limit: '+Math.round(schKmh())+' in a '+s.lim+' km/h street',4,'spd',1);
   if(L.l<-.3)schPen('Left of the centre line (keep right)',5,'side',2);SCH.msg=SCH.msg||('Limit '+s.lim+' km/h · '+Math.max(0,Math.round(300-L.a))+' m to go');
   if(L.a>=298)return schEnd(SCH.t<300/(s.lim/3.6)*.8?'fail':'pass',SCH.t<300/(s.lim/3.6)*.8?'Impossible time: you must have sped.':'Reached the marker in '+SCH.t.toFixed(0)+' s.');if(SCH.t>120)return schEnd('fail','Too slow (2 minutes).');return'run'}},
 {id:'light',name:'4. Traffic light',goal:'Approach the junction. Stop before the line on red or amber; go on green. Cross the junction.',len:130,lit:true,
  setup(s){s.stop=s.len-SCH_RULES.stopLine;schPut(SCHM.line,s,s.stop,s.lane,4,.6);s.red0=last.red},
  tick(dt,s,L){const nd=s.nd,st=light(nd.ph[s.e.id],nd);SCH.msg=(st==='g'?'🟢 Green: go':st==='y'?'🟡 Amber: stop if you safely can':'🔴 Red: stop before the line')+' · '+Math.max(0,Math.round(s.stop-L.a))+' m to the line';
   if(last.red!==s.red0)return schEnd('fail','You ran the red light.');if(L.a>s.stop&&!s.cross){s.cross=1;s.cst=st}
   if(st!=='g'&&L.a<s.stop&&L.a>s.stop-6&&schKmh()<1)s.waited=1;if(L.a>s.len+25)return schEnd('pass',s.waited?'Waited for green, then crossed.':'Crossed on '+(s.cst==='g'?'green':'amber')+'.');if(SCH.t>150)return schEnd('fail','Too slow.');return'run'}},
 {id:'park',name:'5. Reverse parking',goal:'Reverse (S) into the green bay behind you and stop straight inside it.',len:60,
  setup(s){s.zc=schPut(SCHM.zone,s,22,s.lane+.2,2.8,6)},
  start(s){return 34},
  tick(dt,s,L){if(schFwd()>2&&SCH.t>2)SCH.msg='Reverse: hold S (brake, then backwards).';if(L.a<10)return schEnd('fail','You reversed past the bay.');
   if(schKmh()<.4&&SCH.t>3&&L.a<30){const da=Math.abs(L.a-22),dl=Math.abs(L.l-(s.lane+.2)),dh=Math.abs(wrap(P.h-s.h))*57.3;if(da<=2&&dl<=.9&&dh<=12){schPen('Off-centre '+Math.hypot(da,dl).toFixed(1)+' m, angle '+dh.toFixed(0)+'°',Math.round(da*6+dl*12+dh),'pos',99);return schEnd('pass','Parked.')}if(SCH.t>6)SCH.msg='Not inside yet ('+(dh>12?'straighten up':da>2?(L.a>22?'further back':'too far back'):'line up sideways')+').'}
   if(SCH.t>90)return schEnd('fail','Out of time (90 s).');return'run'}}];
function schPen(m,p,k,cd){if(!SCH.on||SCH.over)return;const t=SCH.last[k];if(t!==undefined&&SCH.t-t<cd)return;SCH.last[k]=SCH.t;SCH.pen.push([m,p]);SCH.score=Math.max(0,SCH.score-p);if(p>0)toast('Instructor: '+m+' (−'+p+')')}
function schEnd(r,m){SCH.over=1;SCH.st=r;SCH.msg=m;if(r==='fail')SCH.score=0;const L=SCH.on;SCH.runs++;if(r==='pass'&&!(SCH.best[L.id]>=SCH.score))SCH.best[L.id]=SCH.score;schSave();schResult();return r}
function schStart(i){const L=LESSONS[i];if(!L)return false;const s=schFind(START.x,START.z,L.len,!!L.lit);if(!s){toast('No suitable street found for this lesson');return false}
 if(!SCHM.g.parent)scene.add(SCHM.g);schStop(true);if(typeof apOff==='function')apOff();if(typeof navClear==='function'&&typeof NAV!=='undefined'&&NAV.on)navClear();
 SCH.on=L;SCH.site=s;SCH.t=0;SCH.pen=[];SCH.score=100;SCH.over=0;SCH.st='run';SCH.msg='';SCH.last={};L.setup(s);
 const a0=L.start?L.start(s):(L.lit?0:5);warp(s.x0+s.ux*a0+s.rx*s.lane,s.z0+s.uz*a0+s.rz*s.lane,s.h);
 traffic.forEach(c=>{if(!c.park&&Math.hypot(c.x-P.x,c.z-P.z)<L.len+80)respawn(c,L.len+150)});
 schEl.style.display='block';schRes.style.display='none';toast('Driving school: '+L.name);return true}
function schStop(silent){SCH.on=null;SCH.site=null;for(const k of['zone','line','end'])SCHM[k].visible=false;schEl.style.display='none';if(!silent)schRes.style.display='none'}
// ---- UI: instructor panel (top centre) + result card ----
const schEl=document.createElement('div');schEl.id='school';schEl.style.cssText='position:fixed;left:50%;top:calc(96px + env(safe-area-inset-top));transform:translateX(-50%);z-index:4;max-width:min(560px,92vw);background:#0d2a1ce8;border:1px solid #3cff9a88;border-radius:10px;padding:8px 14px;font:14px/1.4 system-ui,sans-serif;color:#eafff2;display:none;pointer-events:none';
const schRes=document.createElement('div');schRes.id='schoolRes';schRes.style.cssText='position:fixed;inset:0;z-index:55;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.5);font:14px system-ui,sans-serif;color:#eee';
try{document.body.appendChild(schEl);document.body.appendChild(schRes)}catch(e){}
function schResult(){const L=SCH.on;if(!L)return;const ok=SCH.st==='pass',ix=LESSONS.indexOf(L);
 schRes.innerHTML='<div style="background:#15181d;border:1px solid #333;border-radius:10px;padding:16px 20px;width:min(420px,92vw)"><div style="font-size:19px;font-weight:700">'+(ok?'✅ Passed':'❌ Not passed')+' · '+L.name+'</div>'+
  '<div style="font-size:30px;font-weight:800;margin:6px 0;color:'+(ok?'#3cff9a':'#ff8a7a')+'">'+SCH.score+'/100</div><div style="margin-bottom:6px">'+SCH.msg.replace(/[<>&]/g,'')+'</div>'+
  (SCH.pen.length?'<div style="font-size:12px;color:#bbb">'+SCH.pen.map(([m,p])=>'• '+m.replace(/[<>&]/g,'')+(p?' (−'+p+')':'')).join('<br>')+'</div>':'<div style="font-size:12px;color:#bbb">No mistakes.</div>')+
  '<div style="font-size:12px;color:#9ad;margin-top:6px">Best: '+(SCH.best[L.id]!==undefined?SCH.best[L.id]+'/100':'—')+'</div><div style="display:flex;gap:8px;margin-top:10px"><button data-s="retry" style="flex:1;padding:8px">↻ Retry</button>'+
  (ix<LESSONS.length-1?'<button data-s="next" style="flex:1;padding:8px">Next ▶</button>':'')+'<button data-s="close" style="flex:1;padding:8px">Close</button></div></div>';
 schRes.style.display='flex';ui=true;for(const k in keys)keys[k]=0}
schRes.addEventListener('click',e=>{const a=e.target.dataset&&e.target.dataset.s;if(!a)return;const ix=LESSONS.indexOf(SCH.on);schRes.style.display='none';ui=false;if(a==='retry')schStart(ix);else if(a==='next')schStart(ix+1);else schStop()});
function schMenuHtml(){return LESSONS.map((L,i)=>'<button data-sch="'+i+'" style="width:100%;padding:6px;margin:2px 0;text-align:left">'+L.name+(SCH.best[L.id]!==undefined?' · best '+SCH.best[L.id]:'')+'</button>').join('')+
 (SCH.on?'<button data-sch="quit" style="width:100%;padding:6px;margin:2px 0">✕ Quit the lesson</button>':'')}
function schoolTick(dt){if(!SCH.on||SCH.over||PAUSE.on)return;SCH.t+=dt;SCH.msg='';const s=SCH.site,L=schLocal(s);
 if(Math.abs(L.l)>12&&SCH.t>2&&L.a>-5&&L.a<s.len)return schEnd('fail','You left the street.');SCH.on.tick(dt,s,L);
 if(!SCH.over)schEl.innerHTML='<b>🎓 '+SCH.on.name+'</b> · '+SCH.score+' pts · '+SCH.t.toFixed(0)+' s<br>'+SCH.on.goal+(SCH.msg?'<br><b style="color:#ffd24a">'+SCH.msg+'</b>':'')}
{const f2=fine;fine=function(k){const b=last[k];const r=f2.apply(this,arguments);if(SCH.on&&!SCH.over&&last[k]!==b){if(k==='hit')schPen('Hit another car',30,'hit',2);else if(k==='way')schPen('Wrong way',20,'way',3)}return r}}
