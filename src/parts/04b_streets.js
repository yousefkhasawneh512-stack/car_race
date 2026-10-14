// ---- streets on the real network: University Street axis, named strokes (nav), and the "street roles" content is placed on ----
// University Street axis = the real southbound carriageway of OSM "University Street" (Al-Balad -> Yarmouk University).
const AXP=NETD.axis,AXC=[0];for(let i=1;i<AXP.length;i++)AXC.push(AXC[i-1]+Math.hypot(AXP[i][0]-AXP[i-1][0],AXP[i][1]-AXP[i-1][1]));
const AXL=AXC[AXC.length-1],UZ0=-300,UZ1=2500,uS=z=>(z-UZ0)/(UZ1-UZ0)*AXL;
function axAt(s){let i;if(s<=0)i=0;else if(s>=AXL)i=AXP.length-2;else{let lo=0,hi=AXC.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(AXC[m]<=s)lo=m;else hi=m}i=lo}
 const a=AXP[i],b=AXP[i+1],l=AXC[i+1]-AXC[i]||1,tx=(b[0]-a[0])/l,tz=(b[1]-a[1])/l,t=s-AXC[i];return[a[0]+tx*t,a[1]+tz*t,tx,tz]}
const U=z=>{const q=axAt(uS(z));return[q[0],q[1]]},UL=(z,v)=>{const q=axAt(uS(z));return[q[0]+v*q[3],q[1]-v*q[2]]},UAt=z=>{const q=axAt(uS(z));return Math.atan2(q[2],q[3])},UA=UAt((UZ0+UZ1)/2);
function uvOf(x,z){let bd=1e18,bu=0,bv=0;const n=AXP.length-1;for(let i=0;i<n;i++){const a=AXP[i],b=AXP[i+1],dx=b[0]-a[0],dz=b[1]-a[1],l2=dx*dx+dz*dz||1;let t=((x-a[0])*dx+(z-a[1])*dz)/l2;if(i>0&&t<0)t=0;if(i<n-1&&t>1)t=1;
 const ox=x-(a[0]+dx*t),oz=z-(a[1]+dz*t),d=ox*ox+oz*oz;if(d<bd){bd=d;const l=Math.sqrt(l2);bu=AXC[i]+t*l;bv=(ox*dz-oz*dx)/l}}return[UZ0+bu/AXL*(UZ1-UZ0),bv]}
// uniform resample of a polyline (step m) so content can walk along it by index
function resample(P,st){const o=[P[0]];let acc=0,need=st;for(let i=1;i<P.length;i++){let a=P[i-1];const b=P[i],l=Math.hypot(b[0]-a[0],b[1]-a[1]);let d=l;while(d>=need){const t=need/d;a=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];o.push(a);d-=need;need=st}need-=d}const e=P[P.length-1],q=o[o.length-1];if(Math.hypot(e[0]-q[0],e[1]-q[1])>st*.25)o.push(e);return o}
// join edges into polylines through shared nodes (straightest continuation, turn < 120 deg)
function chainsOf(L){const used=new Set(),byN=new Map(),add=(n,e,end)=>{let a=byN.get(n);if(!a)byN.set(n,a=[]);a.push([e,end])};L.forEach(e=>{add(e.a,e,0);add(e.b,e,1)});
 const tang=(e,end)=>{const p=e.pts,n=p.length,a=end?p[n-1]:p[0],b=end?p[n-2]:p[1],l=Math.hypot(b[0]-a[0],b[1]-a[1])||1;return[(b[0]-a[0])/l,(b[1]-a[1])/l]};
 const next=(e,end)=>{const nid=end?e.b:e.a,t0=tang(e,end);let best=null,bc=-.5;for(const[o,oe]of byN.get(nid)||[]){if(used.has(o)||o===e)continue;const t1=tang(o,oe),c=-(t0[0]*t1[0]+t0[1]*t1[1]);if(c>bc){bc=c;best=[o,oe]}}return best};
 const out=[];
 for(const e0 of L){if(used.has(e0))continue;used.add(e0);const fw=[[e0,0]],bw=[];let tail=e0,te=1;
  for(;;){const n=next(tail,te);if(!n)break;used.add(n[0]);fw.push([n[0],n[1]===0?0:1]);tail=n[0];te=n[1]===0?1:0}
  tail=e0;te=0;for(;;){const n=next(tail,te);if(!n)break;used.add(n[0]);bw.push([n[0],n[1]===1?0:1]);tail=n[0];te=n[1]===0?1:0}
  const seq=bw.reverse().concat(fw),pts=[];for(const[e,o]of seq){const P=o?e.pts.slice().reverse():e.pts;for(let k=pts.length?1:0;k<P.length;k++)pts.push(P[k])}
  out.push({pts,edges:seq.map(s=>s[0])})}return out}
const medW=es=>{const w=es.map(e=>e.w).sort((a,b)=>a-b);return w[w.length>>1]||8};
// ---- real named strokes (OSM name chains, for search / turn-by-turn) ----
const STR=[];NETD.strokes.forEach(ch=>{const pts=[];let e0=null;ch.forEach(([i,d])=>{const e=EDGES[i];e0=e0||e;const P=d?e.pts.slice().reverse():e.pts;for(let k=pts.length?1:0;k<P.length;k++)pts.push(P[k])});
 if(pts.length>=2&&e0)STR.push({name:e0.name,nameAr:e0.nameAr,kind:e0.kind,hw:e0.hw,w:e0.w,lim:e0.lim,ow:e0.ow,dp:resample(pts,8),real:true})});
// ---- "street roles": the street names the place/landmark generators ask for, each bound to REAL edges chosen by name or district ----
const rxN=re=>e=>re.test(e.name)||re.test(e.nameAr),cirE=(c,r)=>e=>Math.hypot(e.mx-c[0],e.mz-c[1])<r,clsE=(...k)=>e=>k.includes(e.hw),andE=(...f)=>e=>f.every(g=>g(e)),orE=(...f)=>e=>f.some(g=>g(e)),polyE=(k,m)=>e=>inPoly(k,e.mx,e.mz,m||0);
const ARTC=['trunk','primary','secondary','tertiary'],RESC=['tertiary','unclassified','residential'],LANEC=['living_street','residential','service','unclassified'];
const dist=(c,r,k)=>andE(cirE(c,r),clsE(...(k||RESC)));
const KAB=rxN(/King Abdullah II|الملك عبدالله الثاني/),KHS=rxN(/^King Hussein$|^الملك حسين$/),WAS=rxN(/Wasfi At-Tal|Wasfi Al-Tal|وصفي التل/),SOUQ=dist(RA.balad,330,LANEC);
const VSD={
 'University Street':rxN(/University Street|شارع الجامعة/),'Palestine Street':rxN(/^Palestine$|^فلسطين$/),'Baghdad Street':rxN(/Hashemi|الهاشمي/),'Al-Hashmi Street':rxN(/Hashemi|الهاشمي/),
 'King Hussein Street':KHS,'Petra Street':andE(KHS,e=>e.mx>500),'King Abdullah II Street':andE(KAB,cirE([1300,900],3300)),'Amman–Irbid Highway (Route 35)':andE(KAB,e=>e.mz>2600&&e.mz<7000),
 'Thalatheen Street':rxN(/Abd Alhameed Sharaf|عبد ?الحميد شرف/),'Hakama Street':andE(cirE(RA.sinaa,1700),clsE(...ARTC)),'Al-Sareeh Road':WAS,'Wasfi Al-Tal Street':WAS,
 'Irbid–Syria Highway':andE(clsE('trunk','motorway','primary'),e=>e.mz<-2200&&e.mx<2500),'Al-Hai Al-Gharbi Road':dist(RA.abrar,1300,ARTC),'Hospital Street':dist(RA.nuzha2,700,['tertiary','residential']),
 'Al-Quds Street':rxN(/Quds|القدس/),'Al-Thawra Street':rxN(/Althawra|الثورة/),'Al-Mukhayyam Street':dist(RA.camp,550),'Al-Nuzha Street':orE(rxN(/Alnuzha|النزهة/),dist(RA.nuzha,600)),'Al-Hai Street':dist(RA.abrar,800),
 'Al-Wehdat Street':dist(RA.sehha,700),'Al-Hurriya Street':dist(RA.hikma,700),'Al-Rawda Street':dist(RA.rawda,750),'Al-Zahra Street':dist(RA.zahra,750),'Al-Andalus Street':dist(RA.andalus,750),'Al-Salam Street':dist(RA.salam,700),
 'Al-Mohandseen Street':dist(RA.karama,700),'Al-Tijari Street':dist(RA.balad,900,['tertiary','secondary','unclassified']),'Al-Jamiaa Street':dist([700,1750],700),'Al-Sultan Street':dist(RA.sinaa,900),'Park South Street':dist(RA.ipark,500),
 'Al-Husn Street':dist(RA.husn,900),'Aidun Main Street':dist(RA.aydun,700),'Aidun Garden Street':dist([RA.aydun[0]-350,RA.aydun[1]-300],600),'Aidun Hills Street':dist([RA.aydun[0]+350,RA.aydun[1]+250],600),'Aidun South Street':dist([RA.aydun[0],RA.aydun[1]+500],600),
 'Souq Al-Balad Lane':SOUQ,'Al-Hammam Lane':SOUQ,'Al-Khabbaz Lane':SOUQ,'Clock Tower Lane':SOUQ,'Old Mosque Lane':SOUQ,'Al-Sagha Lane':SOUQ,
 'Al-Hassan Sports City Road':dist(SC,450,ARTC.concat(['unclassified','residential'])),
 'Yarmouk Main Gate Road':polyE('YU',30),'YU Boulevard North':polyE('YU',30),'YU Boulevard':polyE('YU',30),'YU Gate 2 Road':polyE('YU',30),'YU North Gate Road':polyE('YU',30),'YU Campus Ring':polyE('YU',30),
 'JUST Ring Road':polyE('JUST',30),'JUST Inner Ring':polyE('JUST',30),'JUST Campus Avenue':polyE('JUST',30),'Ar-Ramtha Road':andE(rxN(/Jordan Street|شارع الأردن/),cirE(JC,2500)),
 'Jadara Access Road':polyE('JAD',80),'Jadara Campus Ring':polyE('JAD',30),'Jadara Service Road':polyE('JAD',60),'Southern Bypass':dist(HC,1500,ARTC),'INU Campus Ring':polyE('INU',30),'INU Exit Ramp':dist(INC,900,ARTC)};
const RDS=[],VSBY=new Map(),STRBY=new Map();
for(const nm in VSD){const L=EDGES.filter(e=>e.kind!=='ring'&&VSD[nm](e)),CS=chainsOf(L);let kept=0;
 for(const c of CS){const len=c.pts.reduce((s,p,i)=>i?s+Math.hypot(p[0]-c.pts[i-1][0],p[1]-c.pts[i-1][1]):0,0);if(len<70)continue;
  const es=c.edges,r={name:nm,w:medW(es),lim:es[0].lim,kind:es[0].kind,ow:0,dp:resample(c.pts,8),edges:es,real:es[0].name||''};RDS.push(r);let a=VSBY.get(nm);if(!a)VSBY.set(nm,a=[]);a.push(r);kept++}
 if(!kept)console.warn('street role without real edges: '+nm)}
STR.forEach(r=>{let a=STRBY.get(r.name);if(!a)STRBY.set(r.name,a=[]);a.push(r)});
function nearestOn(name,x,z){const A=VSBY.get(name)||STRBY.get(name);if(!A)throw new Error('snap target missing: '+name);let b=null,bd=1e18;for(const r of A)r.dp.forEach((p,i)=>{const d=(p[0]-x)**2+(p[1]-z)**2;if(d<bd){bd=d;b=[r,i]}});return b}
// legacy wording of zone / street names -> what the real map calls it (display strings only)
const REALTXT=[[/New Petra( Street)?( Developments)?|Petra Street( Highway Expansion| Corridor)?/g,'King Hussein Street (east)'],[/Baghdad Street( Axis)?|Al-Hashmi Street/g,'Al-Hashemi Street'],[/Thalatheen Street( Inner Beltway| Corridor| Bypass| Matrix| Layout)?/g,'Abd Al-Hameed Sharaf Street'],
 [/Hakama( Industrial)?( Street| Strip| Artery| Corridor)?/g,'Industrial District (Al-Sinaa)'],[/Al-Sareeh Road( Interface)?/g,'Wasfi Al-Tal Street'],[/Al-Hai Al-Gharbi( District| Road)?/g,'West Irbid (Al-Abrar)'],[/Al-Barha( Cluster| Quarter| District)?/g,'Al-Bariha'],[/Al-Hussein Quarter/g,'Dahiyat Al-Hussein']];
const realText=s=>{if(!s)return s;for(const[re,t]of REALTXT)s=s.replace(re,t);return s};
