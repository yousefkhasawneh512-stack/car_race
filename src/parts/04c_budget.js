// ---- districts, road density and the detail budget on the real network ----
// old authored map -> real map seed transform: legacy content still carries its old seed coordinates; they are mapped by a
// similarity (Al-Balad -> real Al-Balad, Yarmouk University -> real Yarmouk University) and then SNAPPED onto real roads of the named role
const O2N=(()=>{const ax=180,az=-20,bx=861.2,bz=1492,A=RA.balad,B=[YUC[0],YUC[1]],sx=bx-ax,sz=bz-az,tx=B[0]-A[0],tz=B[1]-A[1],k=Math.hypot(tx,tz)/Math.hypot(sx,sz),th=Math.atan2(tz,tx)-Math.atan2(sz,sx),c=Math.cos(th)*k,s=Math.sin(th)*k;
 return(x,z)=>{const dx=x-ax,dz=z-az;return[A[0]+dx*c-dz*s,A[1]+dx*s+dz*c]}})(),O=O2N;
const ZR_PET=VSD['Petra Street'],ZR_UNI=VSD['University Street'],ZR_THA=VSD['Thalatheen Street'],ZR_KAB=VSD['King Abdullah II Street'];
// ---- road density: metres of road per 150 m cell (3x3 blurred) ----
const DGC=150,DGW=Math.ceil((WX1-WX0)/DGC)+3,DGH=Math.ceil((WZ1-WZ0)/DGC)+3,DG0=new Float32Array(DGW*DGH),DG=new Float32Array(DGW*DGH);
const dgi=(x,z)=>{const i=Math.floor((x-WX0)/DGC)+1,j=Math.floor((z-WZ0)/DGC)+1;return i<0||j<0||i>=DGW||j>=DGH?-1:j*DGW+i};
EDGES.forEach(e=>{if(e.hw==='track'||e.hw==='motorway'||e.tn)return;const wt=e.hw==='service'?.3:1;for(let i=0;i<e.pts.length-1;i++){const a=e.pts[i],b=e.pts[i+1],k=dgi((a[0]+b[0])/2,(a[1]+b[1])/2);if(k>=0)DG0[k]+=Math.hypot(b[0]-a[0],b[1]-a[1])*wt}});
for(let j=1;j<DGH-1;j++)for(let i=1;i<DGW-1;i++){let s=0;for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++)s+=DG0[(j+dj)*DGW+i+di];DG[j*DGW+i]=s/9}
const dens=(x,z)=>{const k=dgi(x,z);return k<0?0:DG[k]},isUrban=(x,z)=>dens(x,z)>230;
function urbanK(x,z){return cl((dens(x,z)-90)/260,0,1)}
// ---- detail budget: every edge gets a furnishing level fz (3 full, 2 arterial detail, 1 sparse arterial, 0 road only) ----
const HUBS=[[RA.balad,2000],[RA.yu,1500],[RA.andalus,1100],[RA.aydun,900],[RA.sinaa,700],[JC,800],[HC,500],[INC,500]];
EDGES.forEach(e=>{let best=1e9,bh=0;HUBS.forEach(([c,r],hi2)=>{const d=Math.hypot(e.mx-c[0],e.mz-c[1])/r;if(d<best){best=d;bh=hi2}});e.hub=bh;e.hd=best;
 const arterial=e.hw==='trunk'||e.hw==='primary'||e.hw==='secondary'||e.hw==='tertiary',dn=dens(e.mx,e.mz);
 e.fz=e.tn||e.hw==='track'||e.hw==='motorway'?0:best<1&&dn>150?3:best<1.9&&dn>110?2:arterial&&Math.hypot(e.mx-RA.balad[0],e.mz-RA.balad[1])<8000?1:0;
 if(e.fz===3&&(e.hw==='service'||e.kind==='svc')&&dn<400)e.fz=2});
// ---- free rectangle search: nearest oriented w x d rectangle around (cx,cz) with no road within clr m (content that needs open ground) ----
function freeSite(cx,cz,w,d,ang,clr,maxR,bad){const c=Math.cos(ang),s=Math.sin(ang),nx=Math.ceil(w/14),nz=Math.ceil(d/14);
 const ok=(x,z)=>{for(let i=0;i<=nx;i++)for(let j=0;j<=nz;j++){const lx=(i/nx-.5)*(w+2*clr),lz=(j/nz-.5)*(d+2*clr),px=x+lx*c+lz*s,pz=z-lx*s+lz*c;if(roadNear(px,pz,clr+1)||(bad&&bad(px,pz)))return false}return true};
 if(ok(cx,cz))return[cx,cz];for(let r=30;r<=maxR;r+=30){const n=Math.max(8,Math.round(r/16));for(let k=0;k<n;k++){const a=k/n*Math.PI*2,x=cx+r*Math.cos(a),z=cz+r*Math.sin(a);if(ok(x,z))return[x,z]}}return null}
// ---- the city park: OSM leisure=park polygon is only 29x18 m, so the park is drawn as large as free ground allows around it ----
const PARKC=polyC('IPARK'),PARK=(()=>{for(const[w,d]of[[200,130],[160,100],[120,80],[90,60],[60,40]]){const p=freeSite(PARKC[0],PARKC[1],w,d,0,14,1800);if(p)return{x0:p[0]-w/2,x1:p[0]+w/2,z0:p[1]-d/2,z1:p[1]+d/2}}return{x0:PARKC[0]-15,x1:PARKC[0]+15,z0:PARKC[1]-9,z1:PARKC[1]+9}})();
const inPark=(x,z,m)=>x>PARK.x0-m&&x<PARK.x1+m&&z>PARK.z0-m&&z<PARK.z1+m;
const MALL={x:1e9,z:1e9,r:0,ang:0};   // set by 06b (Arabella Mall)
// areas where the building fabric must not stand: campuses, stadium, park, mall (real OSM polygons)
const NOBP=['YU','YUS','JUST','INU','JAD','STAD','MSTAD','BAU','KAP','IPARK'];
const noBuild=(x,z,m)=>{m=m||0;for(const k of NOBP)if(inPoly(k,x,z,m))return true;return inPark(x,z,12+m)||Math.hypot(x-MALL.x,z-MALL.z)<MALL.r+m||Math.hypot(x-SC[0],z-SC[1])<DZR+30+m};
// ---- zone names (traffic zones, tree species, fabric styles) from the real map ----
function distName(x,z){
 if(inPoly('YU',x,z,25)||inPoly('YUS',x,z,25))return'Yarmouk University';if(inPoly('INU',x,z,60))return'Irbid National University';if(inPoly('STAD',x,z,150)||inPoly('MSTAD',x,z,0))return'Eastern Municipal District';
 if(inPoly('JUST',x,z,60))return'JUST';if(inPoly('JAD',x,z,60))return'Jadara University';
 if(inPark(x,z,0))return'Wasfi Al-Tal Park';if(Math.hypot(x-MALL.x,z-MALL.z)<MALL.r)return'Arabella Mall';
 const bd=Math.hypot(x-RA.balad[0],z-RA.balad[1]);if(bd<650)return'Al-Balad';
 const[u,v]=uvOf(x,z);if(Math.abs(v)<70&&u>-300&&u<2500)return'University Street';
 if(Math.hypot(x-RA.aydun[0],z-RA.aydun[1])<1300)return'Aidun';if(Math.hypot(x-RA.andalus[0],z-RA.andalus[1])<1500&&isUrban(x,z))return'Petra Street';
 return isUrban(x,z)&&bd<7000?'Irbid':'Outskirts'}
// names shown to the player: real OSM neighbourhood / suburb / town names for generic zones
const NBR=NETD.places.filter(p=>p[4]!=='village'||true).map(p=>({x:p[0],z:p[1],n:p[3]||p[2],t:p[4]}));
function distDisp(x,z){const d=distName(x,z);if(d!=='Irbid'&&d!=='Outskirts')return realText(d);let b=null,bd=3000*3000;for(const p of NBR){const q=(p.x-x)**2+(p.z-z)**2;if(q<bd){bd=q;b=p}}return b?b.n:d}
console.log('park',PARK,'edges by fz',[0,1,2,3].map(k=>EDGES.filter(e=>e.fz===k).length).join('/'));
