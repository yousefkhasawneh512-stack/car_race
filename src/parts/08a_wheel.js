// ---- wheel spin (costs law-breaking JD) ----
const wcv=document.getElementById('wc'),wres=document.getElementById('wres'),wcred=document.getElementById('wcred'),wgo=document.getElementById('wgo'),wx=document.getElementById('wx'),wheelEl=document.getElementById('wheel'),spinBtn=document.getElementById('spinBtn');
const WCOL=['#9aa0a6','#4caf50','#2196f3','#9c27b0','#ffc107'],TIERS=RT.map((t,k)=>[RARN[k],RCH[k],WCOL[k],[...new Set(TPOOL[k].map(i=>PORS[i][0]).concat(WHEEL_OLD[k]))]]),COST=10000;
let ui=false,spinning=false,rot=0;
function drawWheel(a){const c=crisp2d(wcv.getContext('2d'));c.clearRect(0,0,300,300);c.save();c.translate(150,150);c.rotate(a);let s=0;TIERS.forEach(t=>{const e=s+t[1]*Math.PI*2;c.beginPath();c.moveTo(0,0);c.arc(0,0,135,s,e);c.closePath();c.fillStyle=t[2];c.fill();c.strokeStyle='#000';c.lineWidth=2;c.stroke();s=e});c.restore();c.fillStyle='#fff';c.strokeStyle='#000';c.beginPath();c.moveTo(138,2);c.lineTo(162,2);c.lineTo(150,30);c.closePath();c.fill();c.stroke()}
function wcredit(){wcred.textContent='JD balance (fines + loot): '+(fines-spent)+' JD · each spin costs '+COST+' JD';wgo.disabled=spinning||fines-spent<COST}
const unfocus=()=>{try{document.activeElement.blur()}catch(e){}};
function openWheel(){if(ui)return;ui=true;for(const k in keys)keys[k]=0;unfocus();wres.textContent=TIERS.map((t,k)=>t[0]+' '+Math.round(t[1]*100)+'% (×'+RMULT[k].toFixed(1)+' drift)').join(' · ');wcredit();drawWheel(rot);wheelEl.style.display='flex'}
function closeWheel(){if(spinning||wheelEl.style.display!=='flex')return;ui=false;wheelEl.style.display='none';unfocus()}
function rollTier(){const r=Math.random();let a=0;for(let i=0;i<TIERS.length;i++){a+=TIERS[i][1];if(r<a)return i}return 0}
wgo.onclick=()=>{if(spinning||fines-spent<COST)return;spent+=COST;spinning=true;save();wcredit();wres.textContent='Spinning…';
 const ti=rollTier(),t=TIERS[ti],car=t[3][(Math.random()*t[3].length)|0];let s0=0;for(let i=0;i<ti;i++)s0+=TIERS[i][1];
 const TP=Math.PI*2,th=(s0+t[1]*R(.1,.9))*TP,start=rot%TP,end=start+TP*6+((((-Math.PI/2-th-start)%TP)+TP)%TP),t0=performance.now();
 (function step(now){const k=cl((now-t0)/4500,0,1);rot=start+(end-start)*(1-Math.pow(1-k,3));drawWheel(rot);if(k<1)requestAnimationFrame(step);else{spinning=false;
  let msg=t[0]+' — '+car;if(owned.includes(car)){spent-=COST/2;msg+=' (duplicate: '+COST/2+' JD refunded)'}else{owned.push(car);setPlayerCar(PORS.findIndex(m=>m[0]===car));msg+=' — unlocked and equipped! (×'+RMULT[ti].toFixed(1)+' drift points)'}
  save();wres.innerHTML='<b style="color:'+t[2]+'">'+msg+'</b>';toast('Wheel: '+msg);wcredit()}})(t0)};
wx.onclick=closeWheel;spinBtn.onclick=openWheel;
