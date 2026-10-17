// ---- Apex Drift Customs repair bay (v42): per-component repairs paid from the JD balance (fines - spent) ----
// Owner-approved economy change (PLAN.md, v42): repairs used to be free. Prices are GAMEPLAY ESTIMATES (not workshop quotes):
// a base labour charge plus a charge per % of condition lost, scaled by the car's rarity tier. Repairing one item only touches that item.
const REP_TIER=[1,1.25,1.6,2.1,2.8],REP_ZC={fl:[.3,.45],fr:[-.3,.45],l:[.5,0],r:[-.5,0],rl:[.3,-.45],rr:[-.3,-.45]};
const REP_ZN={fl:'Front-left panels (bumper, wing)',fr:'Front-right panels (bumper, wing)',l:'Left side panels (doors, sill)',r:'Right side panels (doors, sill)',rl:'Rear-left panels (bumper, quarter)',rr:'Rear-right panels (bumper, quarter)',roof:'Roof',u:'Underbody / floor'};
// which body zone a dent belongs to (nearest zone centre, the same centres registerPlayerImpact spreads damage with)
function dentZone(d,sp){let b='',bd=1e9;for(const z in REP_ZC){const q=Math.hypot(d[0]-REP_ZC[z][0]*sp.W,d[2]-REP_ZC[z][1]*sp.L);if(q<bd){bd=q;b=z}}return b}
function repairItems(){
 const s=currentDamageRecord(),sp=carSpec(P.idx||0),cf=REP_TIER[P.rt||0],it=[],pr=(b,k,loss)=>Math.round((b+k*loss)*cf),dr=diagRows(s,sp,true);
 for(const z of ZONES){const loss=100-s.zones[z],nd=z in REP_ZC?s.dents.filter(d=>dentZone(d,sp)===z).length:0;if(loss<.5&&!nd)continue;
  it.push({id:'z:'+z,grp:'Body',label:REP_ZN[z],cond:s.zones[z],eff:(nd?nd+' dent'+(nd>1?'s':'')+' · ':'')+(z==='u'?'scrapes from landings / bumps':'scuffs'),price:pr(30,4,loss)})}
 for(let j=0;j<4;j++)if(s.lights[j])it.push({id:'li:'+j,grp:'Body',label:LIGHT_NAMES[j][0].toUpperCase()+LIGHT_NAMES[j].slice(1),cond:0,eff:'broken',price:pr(35,0,0)});
 for(let j=0;j<4;j++)if(s.glass[j]>0)it.push({id:'gl:'+j,grp:'Body',label:GLASS_NAMES[j][0].toUpperCase()+GLASS_NAMES[j].slice(1),cond:100-s.glass[j]*100,eff:'cracked',price:pr(j<2?90:50,0,0)});
 const M=[['engine',0,60,6],['cooling',1,25,2.5],['trans',2,50,5],['driveline',3,30,3],['steer',4,30,3],['brakes',5,20,2.5]];
 for(const[k,r,b,c]of M){const loss=100-s[k];if(loss<.5)continue;it.push({id:'c:'+k,grp:'Mechanical',label:dr[r][0],cond:s[k],eff:dr[r][2],price:pr(b,c,loss)})}
 for(let j=0;j<4;j++){const loss=100-s.susp[j],al=Math.abs(s.align[j])>.01;if(loss<.5&&!al)continue;
  it.push({id:'s:'+j,grp:'Suspension',label:'Suspension '+WHEEL_NAMES[j]+(al?' + alignment':''),cond:s.susp[j],eff:dr[6+j][2]+(al?' · toe '+s.align[j].toFixed(1)+'°':''),price:pr(25,2.5,loss)+(al?Math.round(20*cf):0)})}
 for(let j=0;j<4;j++){const w=s.wheels[j],c=w.punct?0:Math.min(w.tread,w.health);if(c>99.5&&w.temp<200)continue;
  it.push({id:'t:'+j,grp:'Tyres',label:'Tyre '+WHEEL_NAMES[j],cond:c,eff:w.punct?'punctured':'tread '+Math.round(w.tread)+'% · carcass '+Math.round(w.health)+'%',price:pr(45,0,0)})}
 return it}
// apply one repair to the record (no charge here; payRepair charges)
function repairPart(id){const s=currentDamageRecord(),sp=carSpec(P.idx||0),[k,a]=id.split(':'),j=+a;
 if(k==='z'){s.zones[a]=100;if(a in REP_ZC)s.dents=s.dents.filter(d=>dentZone(d,sp)!==a)}
 else if(k==='li')s.lights[j]=0;else if(k==='gl')s.glass[j]=0;
 else if(k==='c'){s[a]=100;if(a==='cooling'||a==='engine')s.engTemp=90}
 else if(k==='s'){s.susp[j]=100;s.align[j]=0}else if(k==='t')s.wheels[j]=newWheel();else return false;
 syncAggregates(s);return true}
const repBal=()=>fines-spent;
function payRepair(ids){const L=repairItems().filter(q=>ids.includes(q.id)),tot=L.reduce((a,q)=>a+q.price,0);if(!L.length||repBal()<tot)return false;
 spent+=tot;for(const q of L)repairPart(q.id);save();persistDamage();refreshDamageVisual();updateDamageButton();
 toast('🔧 Repaired: '+(L.length>2?L.length+' items':L.map(q=>q.label).join(', '))+' · −'+fmt(tot)+' JD');return tot}
function renderRepairs(el){const L=repairItems(),tot=L.reduce((a,q)=>a+q.price,0),bal=repBal(),sec=document.createElement('div');
 let h='<h3 style="margin:14px 0 4px;border-top:1px solid #ffffff26;padding-top:10px">🛠 Repair bay</h3><div style="font-size:12px;opacity:.75;margin-bottom:6px">Balance: <b>'+fmt(bal)+' JD</b> · prices are gameplay estimates, not workshop quotes</div>';
 if(!L.length)h+='<div style="opacity:.8">No damage recorded on this car.'+(damageMode===0?' Damage is Off (press I for Cosmetic or Full).':'')+'</div>';
 else{let g='';for(const q of L){if(q.grp!==g){g=q.grp;h+='<div style="font-weight:650;margin:8px 0 2px;color:#ffd24a">'+g+'</div>'}const[w,c]=sev(q.cond);
  h+='<div class="row" style="padding:4px 0"><div style="font-size:13px"><b>'+q.label+'</b> <span style="color:'+c+'">'+Math.round(q.cond)+'% '+w+'</span><br><small>'+q.eff+'</small></div><button data-rep="'+q.id+'"'+(bal<q.price?' disabled':'')+'>Repair · '+fmt(q.price)+' JD</button></div>'}
  h+='<div class="row" style="margin-top:8px"><div><b>Total for everything</b>: '+fmt(tot)+' JD'+(bal<tot?' <small style="color:#ff9a5c">(not enough balance)</small>':'')+'</div><button data-rep="*"'+(bal<tot?' disabled':'')+' style="background:#2b6b3a;color:#fff">Repair all · '+fmt(tot)+' JD</button></div>'}
 sec.innerHTML=h;sec.addEventListener('click',e=>{const id=e.target&&e.target.dataset&&e.target.dataset.rep;if(!id)return;payRepair(id==='*'?L.map(q=>q.id):[id]);renderShop()});el.appendChild(sec)}
