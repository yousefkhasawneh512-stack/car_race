// ---- v35: REAL OSM places. POID (03c_poi_data.js) = named shops / cafes / pharmacies / banks / mosques / schools ... from the BBBike OSM extract, at their real coordinates
// (same projection as the roads). They replace the invented shops (REALP): no PR(), no new buildings (the real building footprints already stand there).
// Display name = OSM name:en when tagged, else the OSM (mostly Arabic) name; the other spelling + category stay searchable via p.alias. Label sits on the front of the real building that contains the point.
const REALPOI={n:0,skip:0,inB:0,kinds:{}},LSTK=new Map();
(function(){const kept=PLACES.slice(),RAD={mosque:22,church:24,school:30,hospital:45,mall:45,grocery:20,bank:18,civic:20,museum:30,landmark:24,poi:20,gym:16};
 for(const q of POID){const x=q[0]/10,z=q[1]/10,k=q[2],nm=q[4]||q[3];
  if(kept.some(p=>{const d=Math.hypot(p.x-x,p.z-z);return d<42||(d<80&&p.kind===k)})){REALPOI.skip++;continue}
  const rn=roadNear(x,z,150),st=rn&&rn.e.name?rn.e.name:'';
  const p=addPlace(nm,x,z,{r:RAD[k]||14,kind:k,tag:st,sub:q[5]+(st?' · '+st:''),ax:rn?rn.px:undefined,az:rn?rn.pz:undefined});
  p.alias=(q[4]?q[3]+' ':'')+q[5]+(/vogo/i.test(q[3])?' Vogo Cafe':'');p.real=true;REALPOI.n++;REALPOI.kinds[k]=(REALPOI.kinds[k]||0)+1;
  const txt=/[A-Za-z]/.test(nm)?nm.toUpperCase():nm,w=Math.min(11,Math.max(5.5,txt.length*.55)),rec=rbAt(x,z);let lx=x,ly=5.5,lz=z;
  if(rec){const o=rec[0],sd=rec[1],l=cl((x-o.x)*o.c-(z-o.z)*o.s,-o.hw+1.2,o.hw-1.2),f=facade(o,sd,l,3.9,.6);lx=f[0];ly=f[1];lz=f[2];REALPOI.inB++}
  {const sk=Math.round(lx/5)*100000+Math.round(lz/5),n=LSTK.get(sk)||0;LSTK.set(sk,n+1);ly+=Math.min(n,6)*1.25}   // labels of shops stacked in one building/mall rise one above the other
  p.lbl={x:lx,y:ly,z:lz,w,t:txt};LAZYL.push(p)}
 console.log('real places',REALPOI.n,'skipped (landmark already there)',REALPOI.skip,'on a real building',REALPOI.inB)})();
