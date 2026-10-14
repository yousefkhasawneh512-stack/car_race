const drift={pts:0,t:0,off:0,total:0};let tune={},fines=0,spent=0,owned=['Ford Focus RS'],cur='Ford Focus RS';
try{const sv=JSON.parse(localStorage.getItem('irbid-save')||'{}');fines=sv.fines||0;spent=sv.spent||0;if(Array.isArray(sv.owned))owned=sv.owned.filter(n=>PORS.some(m=>m[0]===n));if(!owned.length)owned=['Ford Focus RS'];cur=owned.includes(sv.cur)?sv.cur:owned[0];tune=sv.tune||{};drift.total=sv.dt||0}catch(e){}
function save(){try{localStorage.setItem('irbid-save',JSON.stringify({fines,spent,owned,cur,dt:drift.total,tune}))}catch(e){}}
const PARTS=[['Speed','Top speed +5% per upgrade','🏎️'],['Acceleration','Acceleration +6% per upgrade','🚀'],['Handling','Steering and grip +7% per upgrade','📐'],['Extra Drift Points','Drift points +20% per upgrade','💨']],PB=[1500,1200,800,3000],MAXL=5,price=(i,c)=>PB[i]*Math.pow(2,c),tl=()=>tune[cur]||(tune[cur]=[0,0,0,0]);
function applyTune(){const m=PORS[P.idx],t=tl();P.vm=m[1]/3.6*.98*(1+.05*t[0]);P.a0=Math.min(11,27.8/m[2]*1.1)*(1+.06*t[1]);P.hd=1+.07*t[2];P.dr=t[3];P.bk=9.81*({s:.8,p:.8,r:1.1}[m[6]]||1)}
const carSel=document.getElementById('car');
function refreshSel(){carSel.innerHTML='';owned.forEach(n=>{const o=document.createElement('option');o.value=PORS.findIndex(m=>m[0]===n);{const ri=PORS.findIndex(m=>m[0]===n),rt=rarityIdx(ri);o.textContent=n+' · '+RARN[rt]+' ×'+RMULT[rt].toFixed(1)}carSel.appendChild(o)});carSel.value=P.idx}
function setPlayerCar(i){if(P.m)scene.remove(P.m);P.m=mkPorsche(i,1);setModel(P,i);P.idx=i;P.rt=rarityIdx(i);P.rm=RMULT[P.rt];cur=PORS[i][0];applyTune();refreshSel();save()}
function cycleCar(d){const i=(owned.indexOf(cur)+d+owned.length)%owned.length;setPlayerCar(PORS.findIndex(m=>m[0]===owned[i]))}
carSel.onchange=()=>{setPlayerCar(+carSel.value);carSel.blur()};setPlayerCar(PORS.findIndex(m=>m[0]===cur));
