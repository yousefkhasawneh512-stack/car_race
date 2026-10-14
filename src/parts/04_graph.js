// ---- road graph from the real OSM network: nodes = OSM junctions, edges = polylines between them, spatial hash, routing ----
const NODES={},EDGES=[],HASH=new Map(),HC2=50,hk=(i,j)=>(i+400)*2000+(j+400);
const NAMEN=NETD.names,NAMEA=NETD.namesAr;
function nodeAt(id,p){return NODES[id]||(NODES[id]={id,x:p[0],z:p[1],out:[],inn:[],deg:0})}
NETE.forEach((q,idx)=>{const pts=q.pts,n=pts.length,cum=[0],nx=[],nz=[];
 for(let k=1;k<n;k++)cum.push(cum[k-1]+Math.hypot(pts[k][0]-pts[k-1][0],pts[k][1]-pts[k-1][1]));
 for(let k=0;k<n;k++){const a=pts[Math.max(0,k-1)],b=pts[k],c=pts[Math.min(n-1,k+1)];let d1x=b[0]-a[0],d1z=b[1]-a[1],d2x=c[0]-b[0],d2z=c[1]-b[1];const l1=Math.hypot(d1x,d1z),l2=Math.hypot(d2x,d2z);
  if(l2>=1e-6){d2x/=l2;d2z/=l2}if(l1>=1e-6){d1x/=l1;d1z/=l1}if(l1<1e-6){d1x=d2x;d1z=d2z}if(l2<1e-6){d2x=d1x;d2z=d1z}
  let mx=-d1z-d2z,mz=d1x+d2x;const ml=Math.hypot(mx,mz);if(ml<1e-6){mx=-d1z;mz=d1x}else{mx/=ml;mz/=ml}
  const ch=Math.max(.45,mx*-d1z+mz*d1x);nx.push(mx/ch);nz.push(mz/ch)}
 const A='n'+q.A,B='n'+q.B,kind=q.fl&16?'ramp':q.fl&2?'ring':HWK[q.hc];
 const e={id:idx,road:null,name:NAMEN[q.nm]||NAMEA[q.nm]||'',nameAr:NAMEA[q.nm]||'',w:q.w,lim:q.lim,ow:q.fl&1?1:0,kind,hw:HWN[q.hc],a:A,b:B,pts,cum,len:cum[n-1],nx,nz,br:!!(q.fl&4),tn:!!(q.fl&8),ly:q.ly,rb:!!(q.fl&2),fz:0,mx:pts[n>>1][0],mz:pts[n>>1][1]};
 EDGES.push(e);const na=nodeAt(A,pts[0]),nb=nodeAt(B,pts[n-1]);na.deg++;nb.deg++;na.inn.push(e);nb.inn.push(e);na.out.push({e,d:1});if(!e.ow)nb.out.push({e,d:-1});if(e.rb){na.rb=true;nb.rb=true}});
// spatial hash of segments (50 m cells)
EDGES.forEach(e=>{for(let i=0;i<e.pts.length-1;i++){const a=e.pts[i],b=e.pts[i+1],ddx=b[0]-a[0],ddz=b[1]-a[1],l2=ddx*ddx+ddz*ddz||1,s={e,i,x0:a[0],z0:a[1],x1:b[0],z1:b[1],dx:ddx,dz:ddz,il2:1/l2,l:Math.sqrt(l2),hw:e.w/2};
 for(let ci=Math.floor(Math.min(a[0],b[0])/HC2);ci<=Math.floor(Math.max(a[0],b[0])/HC2);ci++)for(let cj=Math.floor(Math.min(a[1],b[1])/HC2);cj<=Math.floor(Math.max(a[1],b[1])/HC2);cj++){const k=hk(ci,cj);let L=HASH.get(k);if(!L)HASH.set(k,L=[]);L.push(s)}}});
// nearest road segment (largest depth inside its own width wins); returns null if nothing within `pad` of a road edge
function roadAt(x,z,pad){pad=pad||0;const ci=Math.floor(x/HC2),cj=Math.floor(z/HC2);let bs=-1e9,bg=null,bt=0,bd=0,cnt=0;
 for(let i=ci-1;i<=ci+1;i++)for(let j=cj-1;j<=cj+1;j++){const L=HASH.get(hk(i,j));if(!L)continue;for(let q=0;q<L.length;q++){const s=L[q],th=s.hw+pad;if(th<=0)continue;
   let t=((x-s.x0)*s.dx+(z-s.z0)*s.dz)*s.il2;t=t<0?0:t>1?1:t;const ex=x-s.x0-s.dx*t,ez=z-s.z0-s.dz*t,d2=ex*ex+ez*ez;if(d2>=th*th)continue;
   const d=Math.sqrt(d2),sc=s.hw-d;if(sc>=0)cnt++;if(sc>bs){bs=sc;bg=s;bt=t;bd=d}}}
 if(!bg)return null;const px=bg.x0+bg.dx*bt,pz=bg.z0+bg.dz*bt,tx=bg.dx/bg.l,tz=bg.dz/bg.l;
 return{e:bg.e,i:bg.i,t:bt,d:bd,px,pz,tx,tz,side:((x-px)*(-tz)+(z-pz)*tx),n:cnt}}
// nearest road edge of the given classes within maxd (used to snap content onto real roads): {e,i,t,d,px,pz,tx,tz}
function roadNear(x,z,maxd,ok){maxd=maxd||200;let best=null,bd=maxd;const R=Math.ceil(maxd/HC2),ci=Math.floor(x/HC2),cj=Math.floor(z/HC2);
 for(let i=ci-R;i<=ci+R;i++)for(let j=cj-R;j<=cj+R;j++){const L=HASH.get(hk(i,j));if(!L)continue;for(const s of L){if(ok&&!ok(s.e))continue;const dx=s.x1-s.x0,dz=s.z1-s.z0,l2=dx*dx+dz*dz||1;let t=((x-s.x0)*dx+(z-s.z0)*dz)/l2;t=t<0?0:t>1?1:t;const px=s.x0+dx*t,pz=s.z0+dz*t,d=Math.hypot(x-px,z-pz);if(d<bd){bd=d;const l=Math.sqrt(l2);best={e:s.e,i:s.i,t,d,px,pz,tx:dx/l,tz:dz/l}}}}return best}
// routing: Dijkstra with a binary heap on junction nodes, respects one-way edges -> list of traversals {e,d}
function route(from,to){if(from===to)return[];const D=new Map([[from,0]]),prev=new Map(),done=new Set(),H=[[0,from]];
 const push=(k,v)=>{H.push([k,v]);let i=H.length-1;while(i>0){const p=(i-1)>>1;if(H[p][0]<=H[i][0])break;[H[p],H[i]]=[H[i],H[p]];i=p}},pop=()=>{const t=H[0],l=H.pop();if(H.length){H[0]=l;let i=0;for(;;){let a=2*i+1,b=a+1,m=i;if(a<H.length&&H[a][0]<H[m][0])m=a;if(b<H.length&&H[b][0]<H[m][0])m=b;if(m===i)break;[H[m],H[i]]=[H[i],H[m]];i=m}}return t};
 const nt=NODES[to];while(H.length){const[du,u]=pop();if(done.has(u))continue;done.add(u);if(u===to)break;
  for(const o of NODES[u].out){const v=o.d>0?o.e.b:o.e.a;if(done.has(v))continue;const nd=du+o.e.len*(o.e.kind==='svc'?1.25:1),dv=D.get(v);if(dv===undefined||nd<dv){D.set(v,nd);prev.set(v,{u,o});push(nd,v)}}}
 if(!D.has(to))return null;const r=[];for(let v=to;v!==from;v=prev.get(v).u)r.unshift(prev.get(v).o);return r}
// nearest junction node: expand through the spatial hash instead of scanning all 26k nodes
function nearNode(x,z,maxd){maxd=maxd||1e9;let b=null,bd=maxd*maxd;const lim=Math.min(maxd,4000);for(let R=60;;R=Math.min(lim,R*2)){const rc=Math.ceil(R/HC2),ci=Math.floor(x/HC2),cj=Math.floor(z/HC2);b=null;bd=maxd*maxd;
  for(let i=ci-rc;i<=ci+rc;i++)for(let j=cj-rc;j<=cj+rc;j++){const L=HASH.get(hk(i,j));if(!L)continue;for(const s of L){if(s.i!==0&&s.i!==s.e.pts.length-2)continue;const n=NODES[s.i===0?s.e.a:s.e.b],d=(n.x-x)**2+(n.z-z)**2;if(d<bd){bd=d;b=n}
     if(s.i===s.e.pts.length-2){const n2=NODES[s.e.b],d2=(n2.x-x)**2+(n2.z-z)**2;if(d2<bd){bd=d2;b=n2}}}}
  if(b&&Math.sqrt(bd)<=R)return b;if(R>=lim)return b}}
// ---- real roundabouts (OSM ring edges clustered by the packer): centre, mean radius, carriageway width ----
const CIRC=NETD.circ.filter(c=>c[2]>=8).map((c,i)=>({id:'R'+i,name:NAMEN[c[4]]||'',x:c[0],z:c[1],r:c[2],w:c[3],mono:'',big:c[2]>=14}));
const isCircP=(x,z,m)=>CIRC.some(c=>Math.hypot(x-c.x,z-c.z)<(m||0)+c.r+8);
const circNode=id=>!!(NODES[id]&&NODES[id].rb);
