// ---- maps: place / street search + turn-by-turn directions over the real road graph ----
const navIn=document.getElementById('navIn'),navRes=document.getElementById('navRes'),navDir=document.getElementById('navDir'),navX=document.getElementById('navX'),navBan=document.getElementById('navBan'),ndT=document.getElementById('ndT'),ndS=document.getElementById('ndS');
const NAV={on:false,dest:null,pts:[],cum:[],total:0,steps:[],j:0,off:0,rr:0,ui:0,res:[],sel:0,si:0};
// ---- v49: saved destinations (☆/★ on each result, irbid-drive-fav-v1, at most 20; shown first when the search box is empty) and place-category
// filters (chips above the results; with an empty query a chip lists the nearest places of that category) ----
const FSTORE='irbid-drive-fav-v1',NAVF={cat:'',fav:[]};
try{const a=JSON.parse(localStorage.getItem(FSTORE)||'[]');if(Array.isArray(a))NAVF.fav=a.filter(f=>f&&typeof f.n==='string'&&(typeof f.road==='string'||isFinite(f.x)&&isFinite(f.z))).slice(0,20)}catch(e){}
const NCAT=[['food','🍽️ Food',['cafe','food']],['shop','🛍️ Shops',['dukkan','grocery','mall','market','barber','pet','tech','cleaner']],['health','⚕️ Health',['medical','hospital']],['edu','🎓 Schools',['school','campus']],['wor','🕌 Worship',['mosque','church']],['sight','🏛️ Sights',['landmark','heritage','museum','square','culture']],['car','🔧 Car',['auto','garage','dealer','ev','drift']],['sport','🌳 Parks & sport',['park','stadium','cage','gym']],['bank','🏦 Banks',['bank']],['civic','🏤 Civic & bus',['civic','transport']],['area','🏘️ Areas',['area']]];
const NCATK={};NCAT.forEach(c=>NCATK[c[0]]=new Set(c[2]));
const favKey=it=>it.road?'s|'+it.n:it.n+'|'+Math.round(it.x)+','+Math.round(it.z),isFav=it=>NAVF.fav.some(f=>favKey(f)===favKey(it));
function favSave(){try{localStorage.setItem(FSTORE,JSON.stringify(NAVF.fav))}catch(e){}}
function favToggle(it){const k=favKey(it),i=NAVF.fav.findIndex(f=>favKey(f)===k);if(i>=0){NAVF.fav.splice(i,1);favSave();toast('Removed from saved: '+it.n);return false}
 if(NAVF.fav.length>=20){toast('20 saved places at most: remove one first');return false}const o={n:it.n,k:it.k,sub:it.sub};if(it.road)o.road=it.road;else{o.x=it.x;o.z=it.z;if(it.ax!==undefined){o.ax=it.ax;o.az=it.az}if(it.r)o.r=it.r}
 NAVF.fav.push(o);favSave();toast('★ Saved: '+it.n);return true}
const NART=new Set(['al','at','el','ar','ash','as']);
const normN=s=>s.toLowerCase().replace(/husun/g,'husn').replace(/[–—-]/g,' ').replace(/&/g,' and ').replace(/[^a-z0-9\u0600-\u06FF ]/g,' ').split(/\s+/).filter(t=>t&&!NART.has(t));
const NKW={cleaner:['dry','cleaning','cleaners','laundry'],tech:['tech','electronics','phone','computer','shop'],grocery:['supermarket','grocery','market','hypermarket','mart','mall','groceries'],heritage:['house','heritage','historic','historical','cultural','monument','ottoman','museum'],square:['square','plaza','roundabout','monument','tower','clock'],gym:['gym','fitness','workout','club'],ev:['ev','charging','charge','station','electric'],auto:['auto','parts','garage','tire','repair','car'],dukkan:['dukkan','grocery','market','supermarket','store','shop','minimarket'],cafe:['cafe','coffee','juice','dessert'],medical:['pharmacy','clinic','laboratory','medical','lab'],cage:['football','cage','pitch','playground'],mosque:['mosque'],culture:['cultural','center','auditorium'],civic:['post','office','civic'],church:['church','tower','cathedral'],museum:['museum','fort','fortress','walls','historic'],mall:['mall','shopping','shops'],dealer:['car','cars','dealer','dealership','showroom','auto'],food:['restaurant','food','eat','dining'],school:['school','academy'],barber:['barber','hair','salon','shop'],pet:['pet','shop','store'],stadium:['stadium','sports','football'],area:['neighbourhood','neighborhood','district','village','area','town'],transport:['bus','station','stop','transport','complex'],drift:['drift','drifting','arena'],park:['park','garden'],bank:['bank','atm'],garage:['garage','tuning','mechanic'],hospital:['hospital','medical'],campus:['university','campus'],market:['market','souk','souq']};
const NICON={grocery:'🛒',heritage:'🏛️',square:'⛲',gym:'🏋️',ev:'⚡',auto:'🔧',dukkan:'🛒',cafe:'☕',medical:'⚕️',cage:'⚽',mosque:'🕌',culture:'🎭',civic:'🏤',church:'⛪',museum:'🏛️',street:'🛣️',circle:'⭕',mall:'🛍️',dealer:'🚗',food:'🍽️',school:'🎓',stadium:'🏟️',drift:'🏁',park:'🌳',barber:'💈',pet:'🐾',bank:'🏦',garage:'🔧',market:'🧺',landmark:'🏛️',campus:'🎓',hospital:'🏥',poi:'📍',area:'🏘️',transport:'🚌'};
const esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const fmtD=m=>m<950?Math.max(10,Math.round(m/10)*10)+' m':(m/1000).toFixed(1)+' km';
let NIDX=null;
function navIndex(){if(NIDX)return NIDX;const L=[];PLACES.forEach(p=>L.push({n:p.name,k:p.kind,t:normN(p.name+' '+(p.alias||'')).concat(NKW[p.kind]||[]),x:p.x,z:p.z,ax:p.ax,az:p.az,r:p.r,g:p.gen,sub:p.sub||p.tag}));CSVP.forEach(p=>L.push({n:p.name,k:p.kind,t:normN(p.name).concat(NKW[p.kind]||[]),x:p.x,z:p.z,r:p.r,g:1,sub:p.sub}));
 const seen=new Set();STR.forEach(r=>{if(!r.name||seen.has(r.name)||r.kind==='ring'||r.kind==='ramp')return;seen.add(r.name);L.push({n:r.name,k:'street',t:normN(r.name+' '+r.nameAr),road:r.name,sub:r.nameAr&&r.nameAr!==r.name?r.nameAr:'Street'})});
 CIRC.forEach(c=>c.name&&L.push({n:c.name,k:'circle',t:normN(c.name),x:c.x,z:c.z,sub:'Roundabout'}));return NIDX=L}
function navDist(it){if(it.road){try{const[r,i]=nearestOn(it.road,P.x,P.z);return Math.hypot(r.dp[i][0]-P.x,r.dp[i][1]-P.z)}catch(e){return 1e9}}return Math.hypot(it.x-P.x,it.z-P.z)}
function navSearch(q){const qt=normN(q),I=navIndex(),out=[];
 for(const it of I){if(NAVF.cat&&!NCATK[NAVF.cat].has(it.k))continue;let sc=0;if(qt.length){const joined=it.t.join(' ');if(!qt.every(w=>it.t.some(t=>t.startsWith(w))||joined.includes(w)))continue;sc=qt.every(w=>it.t.includes(w))?3:2;{const nt=normN(it.n);if(qt.every(w=>nt.some(t=>t.startsWith(w))))sc+=1.5}if(joined.startsWith(qt.join(' ')))sc+=2}else if(it.k==='street'||it.k==='circle')continue;
  if(it.k!=='street'&&it.k!=='circle')sc+=1;if(!it.g)sc+=2.5;out.push({it,sc,d:navDist(it)})}
 out.sort((a,b)=>b.sc-a.sc||a.d-b.d);const cnt={},res=[];for(const o of out){cnt[o.it.n]=(cnt[o.it.n]||0)+1;if(cnt[o.it.n]<=2)res.push(o);if(res.length>=8)break}return res}
function navResolve(it){if(it.road){const[r,i]=nearestOn(it.road,P.x,P.z),p=r.dp[i];return{name:it.n,x:p[0],z:p[1],ax:p[0],az:p[1],r:12,street:true}}return{name:it.n,x:it.x,z:it.z,ax:it.ax!==undefined?it.ax:it.x,az:it.az!==undefined?it.az:it.z,r:it.r||20,circle:it.k==='circle'}}
// nearest point on any road centreline (spiral out through the segment hash)
function snapRoad(x,z,R){let best=null,bd=1e18;const c=Math.ceil(R/HC2),ci=Math.floor(x/HC2),cj=Math.floor(z/HC2);
 for(let i=ci-c;i<=ci+c;i++)for(let j=cj-c;j<=cj+c;j++){const L=HASH.get(hk(i,j));if(!L)continue;for(const s of L){const dx=s.x1-s.x0,dz=s.z1-s.z0,l2=dx*dx+dz*dz||1;let t=((x-s.x0)*dx+(z-s.z0)*dz)/l2;t=t<0?0:t>1?1:t;const px=s.x0+dx*t,pz=s.z0+dz*t,d=(x-px)**2+(z-pz)**2;if(d<bd){bd=d;best={e:s.e,i:s.i,t,px,pz,d:Math.sqrt(d),tx:dx/Math.sqrt(l2),tz:dz/Math.sqrt(l2)}}}}
 if(best){const e=best.e;best.u=e.cum[best.i]+best.t*(e.cum[best.i+1]-e.cum[best.i])}return best}
const snapAny=(x,z)=>snapRoad(x,z,150)||snapRoad(x,z,400)||snapRoad(x,z,900);
const EM=e=>e.kind==='svc'?1.5:e.kind==='alley'?1.8:e.kind==='campus'?1.25:e.kind==='drift'?3:1,ENAME=e=>e.name||(e.kind==='ring'?'the roundabout':e.kind==='ramp'?'the slip road':e.kind==='svc'?'the service road':e.kind==='hw'?'the highway':'the road');
function navDij(srcs){const D={},prev={},done={},H=[];
 const push=(k,v)=>{H.push([k,v]);let i=H.length-1;while(i>0){const p=(i-1)>>1;if(H[p][0]<=H[i][0])break;[H[p],H[i]]=[H[i],H[p]];i=p}},pop=()=>{const t=H[0],l=H.pop();if(H.length){H[0]=l;let i=0;for(;;){let a=2*i+1,b=a+1,m=i;if(a<H.length&&H[a][0]<H[m][0])m=a;if(b<H.length&&H[b][0]<H[m][0])m=b;if(m===i)break;[H[m],H[i]]=[H[i],H[m]];i=m}}return t};
 srcs.forEach(s=>{if(D[s.n]===undefined||s.c<D[s.n]){D[s.n]=s.c;prev[s.n]={src:s};push(s.c,s.n)}});
 while(H.length){const[du,u]=pop();if(done[u]||du>D[u]+1e-6)continue;done[u]=1;
  for(const o of NODES[u].out){const v=o.d>0?o.e.b:o.e.a,nd=du+o.e.len*EM(o.e);if(D[v]===undefined||nd<D[v]-1e-6){D[v]=nd;prev[v]={u,o};if(!done[v])push(nd,v)}}}
 return{D,prev}}
function legPts(L){const e=L.e,a=Math.min(L.u0,L.u1),b=Math.max(L.u0,L.u1),o=[],p0=edgePt(e,a);o.push([p0[0],p0[1]]);for(let i=0;i<e.pts.length;i++)if(e.cum[i]>a+.01&&e.cum[i]<b-.01)o.push(e.pts[i]);const p1=edgePt(e,b);o.push([p1[0],p1[1]]);if(L.d<0)o.reverse();return o}
const ORDN=['','first','second','third','fourth','fifth','sixth'],CMP=['north','northeast','east','southeast','south','southwest','west','northwest'];
// plan a drivable route from a world position (heading hx,hz optional) to a destination {x,z,ax,az,name}
function planRoute(sx,sz,dest,hx,hz){const A=snapAny(sx,sz),B=snapAny(dest.ax,dest.az);if(!A||!B)return null;const e=A.e,f=B.e,dot=hx===undefined?0:hx*A.tx+hz*A.tz,pf=dot<-.3?120:0,pb=dot>.3?120:0;
 const srcs=[{n:e.b,c:(e.len-A.u)*EM(e)+pf,d:1}];if(!e.ow)srcs.push({n:e.a,c:A.u*EM(e)+pb,d:-1});
 const ends=[{n:f.a,c:B.u*EM(f),d:1}];if(!f.ow)ends.push({n:f.b,c:(f.len-B.u)*EM(f),d:-1});
 const{D,prev}=navDij(srcs);let best=null,bc=1e18;
 if(e===f){if(B.u>=A.u&&(B.u-A.u)*EM(e)+pf<bc){bc=(B.u-A.u)*EM(e)+pf;best={direct:1}}else if(B.u<A.u&&!e.ow&&(A.u-B.u)*EM(e)+pb<bc){bc=(A.u-B.u)*EM(e)+pb;best={direct:-1}}}
 for(const en of ends){if(D[en.n]===undefined)continue;const c=D[en.n]+en.c;if(c<bc){bc=c;best={en}}}
 if(!best)return null;const legs=[];
 if(best.direct){legs.push({e,d:best.direct,u0:A.u,u1:B.u,n0:null,n1:null})}
 else{const tr=[];let v=best.en.n,src=null;for(;;){const p=prev[v];if(p.src){src=p.src;break}tr.unshift(p.o);v=p.u}
  legs.push({e,d:src.d,u0:A.u,u1:src.d>0?e.len:0,n0:null,n1:src.n});tr.forEach(o=>legs.push({e:o.e,d:o.d,u0:o.d>0?0:o.e.len,u1:o.d>0?o.e.len:0,n0:o.d>0?o.e.a:o.e.b,n1:o.d>0?o.e.b:o.e.a}));
  legs.push({e:f,d:best.en.d,u0:best.en.d>0?0:f.len,u1:B.u,n0:best.en.n,n1:null})}
 const L2=legs.filter((L,i)=>Math.abs(L.u1-L.u0)>1.2||legs.length===1);if(!L2.length)L2.push(legs[0]);
 const pts=[[sx,sz]];L2.forEach(L=>{L.a=pts.length-1;legPts(L).forEach(p=>{const q=pts[pts.length-1];if(Math.hypot(p[0]-q[0],p[1]-q[1])>.5)pts.push(p)});L.b=pts.length-1});
 const cum=[0];for(let i=1;i<pts.length;i++)cum.push(cum[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));const total=cum[cum.length-1];
 const ptAt=s=>{s=cl(s,0,total);let lo=0,hi2=cum.length-1;while(hi2-lo>1){const m=(lo+hi2)>>1;if(cum[m]<=s)lo=m;else hi2=m}const t=(s-cum[lo])/((cum[hi2]-cum[lo])||1);return[pts[lo][0]+(pts[hi2][0]-pts[lo][0])*t,pts[lo][1]+(pts[hi2][1]-pts[lo][1])*t]};
 const dirOf=(s0,s1)=>{const a=ptAt(s0),b=ptAt(s1),dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz)||1;return[dx/l,dz/l]};
 const h0=L=>dirOf(cum[L.a],Math.min(cum[L.b],cum[L.a]+12)),h1=L=>dirOf(Math.max(cum[L.a],cum[L.b]-12),cum[L.b]);
 const steps=[],push=(s,txt,gl)=>{const p=ptAt(s);steps.push({s,txt,gl,x:p[0],z:p[1]})};
 const d0=h0(L2[0]),bi=Math.round(((Math.atan2(d0[0],-d0[1])+6.2832)%6.2832)/(Math.PI/4))%8;push(0,'Head '+CMP[bi]+' on '+ENAME(L2[0].e),'⬆');
 let k=1;while(k<L2.length){const L=L2[k],pL=L2[k-1];
  if(L.e.kind==='ring'&&!(pL.e.kind==='ring'&&pL.e.name===L.e.name)){let m=k,ex=1;while(m+1<L2.length&&L2[m+1].e.kind==='ring'&&L2[m+1].e.name===L.e.name){ex+=NODES[L2[m].n1].out.filter(o=>o.e.kind!=='ring').length;m++}
   const nx=L2[m+1];if(nx)push(cum[L.a],'At '+(L.e.name||'the roundabout')+', take the '+ORDN[Math.min(ex,6)]+' exit onto '+ENAME(nx.e),'↻');k=nx?m+2:m+1;continue}
  const a=h1(pL),b=h0(L),cr=a[0]*b[1]-a[1]*b[0],dt=a[0]*b[0]+a[1]*b[1],ang=Math.atan2(cr,dt)*180/Math.PI,aa=Math.abs(ang),rt=ang>0;
  if(L.e.name!==pL.e.name){if(aa<20)push(cum[L.a],'Continue onto '+ENAME(L.e),'↑');else if(aa<60)push(cum[L.a],'Slight '+(rt?'right':'left')+' onto '+ENAME(L.e),rt?'↗':'↖');else if(aa<135)push(cum[L.a],'Turn '+(rt?'right':'left')+' onto '+ENAME(L.e),rt?'➡':'⬅');else push(cum[L.a],'Sharp '+(rt?'right':'left')+' onto '+ENAME(L.e),rt?'↘':'↙')}
  else if(aa>=45)push(cum[L.a],'Turn '+(rt?'right':'left')+' to stay on '+ENAME(L.e),rt?'➡':'⬅');k++}
 const lt=h1(L2[L2.length-1]),ep=ptAt(total),wx=dest.x-ep[0],wz=dest.z-ep[1];let side='';if(Math.hypot(wx,wz)>9)side=(lt[0]*wz-lt[1]*wx>0)?', on your right':', on your left';
 push(total,(dest.street?'Arrive on ':'Arrive at ')+dest.name+side,'🏁');
 return{dest,pts,cum,total,steps,end:ep,legs:L2}}
// ---- 3D guidance: blue breadcrumb ribbon on the road + destination beacon ----
const NDOT=70,ndots=new T.InstancedMesh(new T.BoxGeometry(1.1,.06,2.8),new T.MeshBasicMaterial({color:0x2f8bff,transparent:true,opacity:.92,fog:false}),NDOT);ndots.frustumCulled=false;ndots.visible=false;scene.add(ndots);
const nbeacon=new T.Group();nbeacon.visible=false;scene.add(nbeacon);
{const m=new T.Mesh(new T.CylinderGeometry(3,3,170,16,1,true),new T.MeshBasicMaterial({color:0xff4d2e,transparent:true,opacity:.38,side:T.DoubleSide,depthWrite:false}));m.position.y=85;nbeacon.add(m);const r=new T.Mesh(new T.CylinderGeometry(6,6,.3,24),new T.MeshBasicMaterial({color:0xff4d2e,transparent:true,opacity:.6}));r.position.y=.3;nbeacon.add(r)}
let nbLabel=null;const nO=new T.Object3D();
function navDots(){if(!NAV.on){ndots.visible=false;return}ndots.visible=true;const c=NAV.cum,p=NAV.pts;let idx=NAV.j,s=c[NAV.j]+4;for(let k=0;k<NDOT;k++,s+=5){while(idx<c.length-2&&c[idx+1]<s)idx++;const t=cl((s-c[idx])/((c[idx+1]-c[idx])||1),0,1),x=p[idx][0]+(p[idx+1][0]-p[idx][0])*t,z=p[idx][1]+(p[idx+1][1]-p[idx][1])*t,hd=Math.atan2(p[idx+1][0]-p[idx][0],p[idx+1][1]-p[idx][1]);
  const ok=s<NAV.total;nO.position.set(x,ok?TH(x,z)+.2:-9999,z);nO.rotation.set(0,hd,0);nO.scale.set(1,1,1);nO.updateMatrix();ndots.setMatrixAt(k,nO.matrix)}ndots.instanceMatrix.needsUpdate=true}
// ---- start / stop / live guidance ----
function navClear(){NAV.on=false;NAV.dest=null;nbeacon.visible=false;ndots.visible=false;navDir.style.display='none';navX.style.display='none';navBan.innerHTML=''}
function navStart(dest,silent){const rt=planRoute(P.x,P.z,dest,Math.sin(P.h),Math.cos(P.h));if(!rt){navClear();toast('No route found to '+dest.name);return false}
 NAV.on=true;NAV.dest=dest;NAV.pts=rt.pts;NAV.cum=rt.cum;NAV.total=rt.total;NAV.steps=rt.steps;NAV.end=rt.end;NAV.legs=rt.legs;NAV.j=0;NAV.off=0;NAV.si=0;
 nbeacon.position.set(dest.x,TH(dest.x,dest.z),dest.z);nbeacon.visible=true;if(nbLabel)nbeacon.remove(nbLabel);nbLabel=label(dest.name);nbLabel.scale.set(40,5,1);nbLabel.position.y=175;nbeacon.add(nbLabel);
 navX.style.display='block';navDir.style.display='block';
 ndT.innerHTML='<b>'+esc(dest.name)+'</b><br><span id="ndR"></span>';ndS.innerHTML=rt.steps.map((st,i)=>'<div class="st" id="st'+i+'"><b>'+st.gl+'</b> '+esc(st.txt)+'<small>'+(i<rt.steps.length-1?fmtD(rt.steps[i+1].s-st.s):'')+'</small></div>').join('');
 if(!silent)toast('🧭 Route to '+dest.name+' · '+fmtD(rt.total));navTick(0,true);return true}
function navTick(dt,force){if(!NAV.on)return;const p=NAV.pts,n=p.length;let bj=NAV.j,bd=1e18;for(let j=Math.max(0,NAV.j-2);j<Math.min(n,NAV.j+90);j++){const d=(p[j][0]-P.x)**2+(p[j][1]-P.z)**2;if(d<bd){bd=d;bj=j}}NAV.j=Math.max(NAV.j,bj);
 if(bd>2500&&NAV.j>0||bd>40000){NAV.off+=dt;if(NAV.off>2.5){NAV.off=0;toast('↻ Rerouting…');navStart(NAV.dest,true);return}}else NAV.off=0;
 const s=NAV.cum[NAV.j],rem=NAV.total-s;
 if(Math.hypot(P.x-NAV.end[0],P.z-NAV.end[1])<28||rem<14){toast('🏁 You have arrived at '+NAV.dest.name);navClear();return}
 let si=NAV.steps.length-1;for(let i=0;i<NAV.steps.length;i++)if(NAV.steps[i].s>s+6){si=i;break}NAV.si=si;const st=NAV.steps[si],dd=st.s-s;
 navBan.innerHTML='<span class="gl">'+st.gl+'</span> '+(dd>25&&si<NAV.steps.length-1?'In '+fmtD(dd)+' · ':'')+esc(st.txt);
 NAV.ui-=dt;if(NAV.ui<=0||force){NAV.ui=.3;const r=document.getElementById('ndR');if(r)r.textContent=fmtD(rem)+' left · '+Math.max(1,Math.round(rem/12/60))+' min';NAV.steps.forEach((x,i)=>{const el=document.getElementById('st'+i);if(el)el.className='st'+(i===si?' cur':i<si?' done':'')});const c=document.getElementById('st'+si);if(c&&c.offsetTop!==undefined)ndS.scrollTop=Math.max(0,c.offsetTop-50)}
 navDots()}
function navPick(r){navIn.value=r.it.n;navIn.blur();navRes.style.display='none';navStart(navResolve(r.it))}
function navGo(q){const R=navSearch(q);if(!R.length){toast('No place called "'+q+'"');return false}return navStart(navResolve(R[0].it))}
function navShow(q){const R=navSearch(q),F=!String(q).trim()&&!NAVF.cat?NAVF.fav.map(f=>({it:f,d:navDist(f),fav:1})):[],L=F.concat(F.length?R.filter(r=>!isFav(r.it)):R);NAV.res=L;NAV.sel=0;navRes.innerHTML='';navRes.style.display='block';
 const ch=document.createElement('div');ch.className='ncat';ch.innerHTML=NCAT.map(c=>'<span class="nc'+(NAVF.cat===c[0]?' on':'')+'" data-cat="'+c[0]+'">'+c[1]+'</span>').join('');
 ch.onpointerdown=e=>{e.preventDefault();const c=e.target&&e.target.dataset&&e.target.dataset.cat;if(!c)return;NAVF.cat=NAVF.cat===c?'':c;navShow(navIn.value)};navRes.appendChild(ch);
 L.forEach((r,i)=>{const d=document.createElement('div'),fv=r.fav||isFav(r.it);d.className='nr'+(i?'':' on');d.innerHTML='<span>'+(NICON[r.it.k]||'📍')+' '+esc(r.it.n)+'</span><small>'+(r.fav?'saved · ':'')+(r.it.sub?esc(r.it.sub)+' · ':'')+fmtD(r.d)+'</small><b class="fv" title="Save / remove">'+(fv?'★':'☆')+'</b>';
  d.onpointerdown=e=>{e.preventDefault();if(e.target&&e.target.className==='fv'){favToggle(r.it);navShow(navIn.value);return}navPick(r)};navRes.appendChild(d)});
 if(!L.length){const d=document.createElement('div');d.className='nr0';d.textContent=NAVF.cat?'No '+NCAT.find(c=>c[0]===NAVF.cat)[1].replace(/^\S+ /,'').toLowerCase()+' found'+(String(q).trim()?' for "'+q+'"':''):'No match';navRes.appendChild(d)}}
function navFocus(){navIn.focus();if(navIn.select)navIn.select()}
navIn.addEventListener('input',()=>navShow(navIn.value));
navIn.addEventListener('focus',()=>{for(const k in keys)keys[k]=0;navShow(navIn.value)});
navIn.addEventListener('blur',()=>setTimeout(()=>{navRes.style.display='none'},180));
navIn.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){navIn.blur();return}if(e.key==='Enter'){e.preventDefault();const r=NAV.res[NAV.sel];if(r)navPick(r);return}
 if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(!NAV.res.length)return;NAV.sel=(NAV.sel+(e.key==='ArrowDown'?1:-1)+NAV.res.length)%NAV.res.length;[...navRes.querySelectorAll('.nr')].forEach((c,i)=>{c.className='nr'+(i===NAV.sel?' on':'')})}});
navX.addEventListener('click',()=>{navClear();navIn.value='';toast('Navigation stopped')});
// labels of ground-floor shops are only drawn near the car
let LZI=0;function navLabels(){const n=LAZYL.length,B=Math.min(n,260);for(let k=0;k<B;k++){const p=LAZYL[(LZI+k)%n],L=p.lbl,d=Math.hypot(L.x-P.x,L.z-P.z);
  if(!p.sp){if(d<130){const s=label(L.t,true);s.scale.set(L.w,L.w/8,1);s.position.set(L.x,L.y+TH(L.x,L.z),L.z);scene.add(s);p.sp=s}}
  else if(d>280){const s=p.sp,mt=s.material;scene.remove(s);const ix=NEARLBL.indexOf(s);if(ix>=0)NEARLBL.splice(ix,1);LBLM.delete(L.t+'|n');if(mt.map)mt.map.dispose();mt.dispose();p.sp=null}}
 LZI=(LZI+B)%Math.max(n,1);for(const s of NEARLBL){const v=Math.hypot(s.position.x-P.x,s.position.z-P.z)<130;if(s.visible!==v)s.visible=v}}
// the place the car is currently passing (for HUD / toast / minimap caption)
let PASS=null;const passSeen={};
function poiNear(){let b=null,bd=1e9;for(const p of PLACES){if(p.r>=150)continue;const d=Math.hypot(P.x-p.x,P.z-p.z)-p.r;if(d<25&&d<bd){bd=d;b=p}}if(!b)b=csvNear(P.x,P.z,25);
 if(b!==PASS){PASS=b;if(b&&!b.gen&&(clock-(passSeen[b.name]||-99))>14){passSeen[b.name]=clock;toast('📍 '+b.name)}}return PASS}
