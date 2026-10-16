// ---- road infrastructure (visual layer on top of the existing road graph; nothing here moves a road, place or landmark):
// kerbed paved sidewalks, zebra crossings + stop lines, street lights with night light pools, utility poles with sagging wires,
// speed-limit / street-name / stop signs (one texture atlas), highway guardrails. No PR() calls, no occupancy changes.
const INFU={night:0};
const jTrim=id=>{const nd=NODES[id];if(!nd||nd.deg<3)return 0;let m=0;for(const e of nd.inn)m=Math.max(m,e.w/2);return m+2.6};
const crossHalf=(nd,e)=>{let m=0;for(const o of nd.inn)if(o!==e)m=Math.max(m,o.w/2);return m};
const uNear=(e,id,u)=>id===e.a?u:e.len-u;
const onOther=(x,z,e,pad)=>{const r=roadAt(x,z,pad||0);return r&&r.e!==e?r:null};
const signPole=[];let lampN=0,poleN=0;
const FURN=new Map(),fk=(x,z)=>Math.floor(x/8)+','+Math.floor(z/8);
function furnAdd(x,z){const k=fk(x,z);let L=FURN.get(k);if(!L)FURN.set(k,L=[]);L.push([x,z])}
function furnNear(x,z,r){for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){const L=FURN.get((Math.floor(x/8)+i)+','+(Math.floor(z/8)+j));if(L)for(const q of L)if(Math.hypot(q[0]-x,q[1]-z)<r)return true}return false}
// ===== sidewalks + kerbs (merged per 600 m cell) =====
{const SWK=new Set(['main','local','petra','arch']),cells=new Map(),YT=.19,YR=.07,col1=new T.Color(0x9c998f),col2=new T.Color(0xbdb9ae);
 const cell=(x,z)=>{const k=Math.floor(x/300)+','+Math.floor(z/300);let c=cells.get(k);if(!c)cells.set(k,c={p:[],n:[],c:[],uv:[],i:[],cx:(Math.floor(x/300)+.5)*300,cz:(Math.floor(z/300)+.5)*300});return c};
 function quadN(C,a,b,c,d,nx,ny,nz,col,uv){const n=C.p.length/3;
  // winding: (b-a)x(c-a) must agree with the requested normal
  const cx=(b[1]-a[1])*(c[2]-a[2])-(b[2]-a[2])*(c[1]-a[1]),cy=(b[2]-a[2])*(c[0]-a[0])-(b[0]-a[0])*(c[2]-a[2]),cz=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  for(const q of[a,b,c,d]){C.p.push(q[0],q[1],q[2]);C.n.push(nx,ny,nz);C.c.push(col.r,col.g,col.b)}
  for(const q of uv)C.uv.push(q[0],q[1]);
  if(cx*nx+cy*ny+cz*nz>=0)C.i.push(n,n+1,n+2,n+1,n+3,n+2);else C.i.push(n,n+2,n+1,n+1,n+2,n+3)}
 EDGES.forEach(e=>{if(!SWK.has(e.kind)||e.len<24||e.w<6||e.fz<(e.kind==='local'?3:2))return;
  const t0=jTrim(e.a),t1=jTrim(e.b),u0=t0,u1=e.len-t1;if(u1-u0<8)return;
  const pts=[];for(let u=u0;u<u1;u+=6)pts.push([u,edgePt(e,u)]);pts.push([u1,edgePt(e,u1)]);
  for(const sg of[-1,1]){const i0=sg*(e.w/2+.1),o0=sg*(e.w/2+1.95),ix=(p,o)=>[p[0]+p[2]*o,hillH(p[0],p[1]),p[1]+p[3]*o];
   for(let j=0;j<pts.length-1;j++){const[ua,A]=pts[j],[ub,B]=pts[j+1];
    const ai=ix(A,i0),ao=ix(A,o0),bi=ix(B,i0),bo=ix(B,o0),mi=ix(edgePt(e,(ua+ub)/2),(i0+o0)/2);
    if(onOther(ai[0],ai[2],e)||onOther(ao[0],ao[2],e)||onOther(bi[0],bi[2],e)||onOther(bo[0],bo[2],e)||onOther(mi[0],mi[2],e))continue;
    const C=cell(mi[0],mi[2]),y=ai[1];
    quadN(C,[ai[0],y+YT,ai[2]],[ao[0],y+YT,ao[2]],[bi[0],y+YT,bi[2]],[bo[0],y+YT,bo[2]],0,1,0,col1,[[ua,0],[ua,1.85],[ub,0],[ub,1.85]]);
    quadN(C,[ai[0],y+YT,ai[2]],[ai[0],y+YR,ai[2]],[bi[0],y+YT,bi[2]],[bi[0],y+YR,bi[2]],-sg*A[2],0,-sg*A[3],col2,[[ua,-1],[ua,-1],[ub,-1],[ub,-1]])}}});
 const swMat=gfxStd({vertexColors:true,roughness:.93,metalness:0,envMapIntensity:.2},'pave')||new T.MeshLambertMaterial({vertexColors:true});
 cells.forEach(C=>{if(!C.i.length)return;const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(C.p,3));g.setAttribute('normal',new T.Float32BufferAttribute(C.n,3));g.setAttribute('color',new T.Float32BufferAttribute(C.c,3));g.setAttribute('aPv',new T.Float32BufferAttribute(C.uv,2));g.setIndex(C.i);
  const m=new T.Mesh(g,swMat);m.receiveShadow=true;scene.add(m);lodReg(m,C.cx,C.cz,420,300)})}
// ===== zebra crossings + stop lines =====
{const ZC=new Map(),zcell=(x,z)=>{const k=Math.floor(x/300)+','+Math.floor(z/300);let c=ZC.get(k);if(!c)ZC.set(k,c={p:[],c:[],i:[],cx:(Math.floor(x/300)+.5)*300,cz:(Math.floor(z/300)+.5)*300});return c},wht=new T.Color(0xeeeeea),yo=.082,Q=(a,b,c,d)=>quad(zcell(a[0],a[2]),a,b,c,d,wht),pt=(e,u,o)=>{const p=edgePt(e,u);return[p[0]+p[2]*o,hillH(p[0],p[1])+yo,p[1]+p[3]*o]};
 for(const id in NODES){const nd=NODES[id];if(nd.deg<3||circNode(id))continue;
  for(const e of nd.inn){if(!(e.kind==='main'||e.kind==='local'||e.kind==='petra'||e.kind==='arch')||e.w<7||e.len<26||e.fz<2)continue;
   const jb=crossHalf(nd,e),zu=jb+1.4,z1=zu+3,lim=e.len-8;if(z1>lim)continue;
   const toU=s=>e.a===id?s:e.len-s,ua=toU(zu),ub=toU(z1);
   const mid=edgePt(e,toU(zu+1.5));
   const hw=e.w/2;let ok=true;for(const o of[-hw+1,0,hw-1]){const r=onOther(mid[0]+mid[2]*o,mid[1]+mid[3]*o,e);if(r){ok=false;break}}if(!ok)continue;
   const step=e.w>=13?1.05:.95;for(let t=-hw+.9;t<=hw-.9+.01;t+=step)Q(pt(e,ua,t-.25),pt(e,ua,t+.25),pt(e,ub,t-.25),pt(e,ub,t+.25));
   // stop line on the arriving half of the carriageway (traffic keeps right: arriving along +t sits on the -n side)
   const arrFwd=e.b===id,ul=toU(z1+.7),ul2=toU(z1+1.1);let a0=arrFwd?-hw+.3:.15,a1=arrFwd?-.15:hw-.3;if(e.ow){a0=-hw+.3;a1=hw-.3}
   Q(pt(e,ul,a0),pt(e,ul,a1),pt(e,ul2,a0),pt(e,ul2,a1));
   // lane arrow (straight-on) on the arriving lane of the wide avenues
   if(!e.ow&&e.w>=12&&e.len>z1+14&&e.kind!=='local'){const ao=arrFwd?-e.w/4:e.w/4,s0=z1+9.5,s1=z1+6.4,h1=z1+4.6;Q(pt(e,toU(s0),ao-.16),pt(e,toU(s0),ao+.16),pt(e,toU(s1),ao-.16),pt(e,toU(s1),ao+.16));
    const A=pt(e,toU(s1),ao-.62),B=pt(e,toU(s1),ao+.62),C2=pt(e,toU(h1),ao);Q(A,B,C2,C2)}}}
 const zmat=gfxStd({vertexColors:true,side:T.DoubleSide,roughness:.72,metalness:0,envMapIntensity:.2,polygonOffset:true,polygonOffsetFactor:-10,polygonOffsetUnits:-10},'mark')||new T.MeshPhongMaterial({vertexColors:true,side:T.DoubleSide,specular:0x303030,shininess:30,polygonOffset:true,polygonOffsetFactor:-10,polygonOffsetUnits:-10});
 ZC.forEach(L=>{if(!L.i.length)return;const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(L.p,3));g.setAttribute('color',new T.Float32BufferAttribute(L.c,3));g.setAttribute('normal',new T.Float32BufferAttribute(new Array(L.p.length).fill(0).map((_,i)=>i%3===1?1:0),3));g.setIndex(L.i);const m=new T.Mesh(g,zmat);m.receiveShadow=true;scene.add(m);lodReg(m,L.cx,L.cz,380,300)})}
// ===== street lights =====
const lampMat=new T.MeshBasicMaterial({color:0x8d9094}),poolMat=new T.MeshBasicMaterial({transparent:true,blending:T.AdditiveBlending,depthWrite:false,opacity:0,fog:true});poolMat.visible=false;
{const LK=new Set(['main','petra','arch','hw']),poles=[],arms=[],heads=[],pools=[];
 EDGES.forEach(e=>{if(!LK.has(e.kind)||e.len<60||e.fz<2)return;const sp=e.kind==='hw'?52:38,hwy=e.kind==='hw',t0=jTrim(e.a)+9,t1=jTrim(e.b)+9;let k=0;
  for(let u=Math.max(t0,16);u<e.len-Math.max(t1,16);u+=sp,k++){const sg=((k+e.id)&1)?1:-1,p=edgePt(e,u),off=sg*(e.w/2+(hwy?1.6:.6)),x=p[0]+p[2]*off,z=p[1]+p[3]*off;
   if(onOther(x,z,e,.8)||!occFree(obb(x,z,.7,.7,0),0))continue;
   if(inPark(x,z,0))continue;
   const y=hillH(x,z),H=hwy?10:8.4,dx=-sg*p[2],dz=-sg*p[3],ry=Math.atan2(-dz,dx),L=hwy?2.4:1.9,key='streetlight:'+Math.round(x*10)+':'+Math.round(z*10);
   poles.push([x,y+H/2,z,0,.2,H,.2,undefined,key]);arms.push([x+dx*L*.5,y+H-.15,z+dz*L*.5,ry,L,.12,.12,undefined,key+'/arm']);heads.push([x+dx*(L-.1),y+H-.3,z+dz*(L-.1),ry,.8,.14,.34,undefined,key+'/head']);pools.push([x+dx*(L+1.2),y+.22,z+dz*(L+1.2),0,1,1,1,undefined,key+'/pool']);
   addCol({x,z,r:.32,type:'streetLight',breakable:true,breakAt:17,visualKey:key,height:H,baseY:y});furnAdd(x,z);lampN++}});
 const pm=gfxStd({color:0xb4bac1,roughness:.42,metalness:.6,envMapIntensity:.9},'none')||UBm(0x7c838a);instO(UB,pm,poles,true,420,300);instO(UB,pm,arms,false,420,300);instO(UB,lampMat,heads,false,420,300);
 // light pools on the road at night (additive gradient discs)
 const cv=document.createElement('canvas');cv.width=cv.height=64;{const g=cv.getContext('2d'),gr=g.createRadialGradient(32,32,2,32,32,32);gr.addColorStop(0,'rgba(255,200,120,1)');gr.addColorStop(.45,'rgba(255,170,80,.45)');gr.addColorStop(1,'rgba(255,150,60,0)');g.fillStyle=gr;g.fillRect(0,0,64,64)}
 poolMat.map=new T.CanvasTexture(cv);
 const pg=new T.PlaneGeometry(1,1).rotateX(-Math.PI/2).scale(15,1,15);instO(pg,poolMat,pools,false,240,200)}
function lampTick(night){const n=night;lampMat.color.setRGB(.55+2.6*n,.57+1.9*n,.58+.9*n);poolMat.visible=n>.03;poolMat.opacity=n*.5}
// ===== utility poles + sagging wires =====
{const poles=[],arms=[],xf=[],wv=[],UK=new Set(['local','main','arch']);
 EDGES.forEach(e=>{if(!UK.has(e.kind)||e.len<70||e.fz<(e.kind==='local'?3:2))return;const sp=e.kind==='local'?40:46,sg=(e.id&1)?1:-1,t0=jTrim(e.a)+10,t1=jTrim(e.b)+10;let prev=null;
  for(let u=Math.max(t0,20)+(e.id%5)*3;u<e.len-Math.max(t1,16);u+=sp){const p=edgePt(e,u),off=sg*(e.w/2+1.35),x=p[0]+p[2]*off,z=p[1]+p[3]*off;
   if(onOther(x,z,e,.8)||!occFree(obb(x,z,.6,.6,0),0)||inPark(x,z,0)){prev=null;continue}
   const y=hillH(x,z),H=9.2,ry=Math.atan2(-p[3],p[2]),key='utilitypole:'+Math.round(x*10)+':'+Math.round(z*10);poles.push([x,y+H/2,z,0,.26,H,.26,0x8f8d86,key]);arms.push([x,y+H-.5,z,ry,2.3,.13,.13,0x4a3a2a,key+'/arm']);if(((u/sp)|0)%7===3)xf.push([x+p[2]*sg*.5,y+H-2.2,z+p[3]*sg*.5,0,.7,1.3,.7,undefined,key+'/xf']);addCol({x,z,r:.3,type:'utilityPole',breakable:true,breakAt:12.5,visualKey:key,height:H,baseY:y});furnAdd(x,z);poleN++;
   const tip=o=>[x+p[2]*o,y+H-.3,z+p[3]*o];
   if(prev){for(const o of[-1,0,1]){const a=prev.tip(o),b=tip(o);let q=a;for(let s=1;s<=4;s++){const t=s/4,r=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t-1.3*4*t*(1-t),a[2]+(b[2]-a[2])*t];wv.push(q[0],q[1],q[2],r[0],r[1],r[2]);q=r}}}
   prev={tip}}});
 const conc=gfxStd({color:0xffffff,roughness:.92,metalness:0,envMapIntensity:.25},'wall')||UBm(0xffffff);instO(UB,conc,poles,true,420,300);instO(UB,conc,arms,false,420,300);instO(new T.CylinderGeometry(.5,.5,1,8),UBm(0x6d7075),xf,false,300,300);
 if(wv.length){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(wv,3));const l=new T.LineSegments(g,new T.LineBasicMaterial({color:0x1b1d20}));l.frustumCulled=false;scene.add(l)}}
// ===== road signs (atlas: street-name plates 256x64, round/octagon signs 128x128) =====
const SGA={cv:document.createElement('canvas'),cells:new Map(),n:0};SGA.cv.width=2048;SGA.cv.height=1024;SGA.g=SGA.cv.getContext('2d');
function sgCell(name){let c=SGA.cells.get(name);if(c!==undefined)return c;c=SGA.n++;SGA.cells.set(name,c);return c}
function sgRect(c,big){if(big){const k=c;return[(k%16)*128,768+((k/16)|0)*128,128,128]}return[(c%8)*256,((c/8)|0)*64,256,64]}
const SGS=[],SGM=new Map();   // sign instances: [x,y,z,ry,w,h,cellKey,big]
function addSign(x,z,dx,dz,ph,w,h,key,big){const sk='sign:'+SGS.length;SGS.push([x,hillH(x,z)+ph,z,Math.atan2(dx,dz),w,h,key,big,sk]);signPole.push([x,hillH(x,z)+(ph+h/2-.1)/2,z,0,.09,ph+h/2-.1,.09,undefined,sk]);addCol({x,z,r:.25,type:'sign',breakable:true,breakAt:4.5,visualKey:sk,height:ph+h/2-.1})}
{ // speed-limit signs (both directions) on the main roads
 const seen=new Set();let ns=0;
 EDGES.forEach(e=>{if(!(e.kind==='main'||e.kind==='petra'||e.kind==='arch'||e.kind==='hw')||!e.lim||e.len<110||e.fz<1)return;
  const t0=jTrim(e.a),t1=jTrim(e.b),us=[Math.max(t0+14,30)];for(let u=us[0]+320;u<e.len-Math.max(t1,20)-20;u+=320)us.push(u);
  for(const u of us){for(const dir of(e.ow?[1]:[1,-1])){const p=edgePt(e,Math.min(u,e.len-12)),off=-dir*(e.w/2+(e.kind==='hw'?2.2:1.5)),x=p[0]+p[2]*off,z=p[1]+p[3]*off;
    if(onOther(x,z,e,.8)||!occFree(obb(x,z,.5,.5,0),0))continue;
    const tx=p[3],tz=-p[2];addSign(x,z,-dir*tx,-dir*tz,2.2,.8,.8,'L'+e.lim,1);ns++}}});
 // street-name plates at junctions: the name of the crossing street, on the right-hand corner of each major approach
 for(const id in NODES){const nd=NODES[id];if(nd.deg<3||circNode(id))continue;
  for(const e of nd.inn){if(!(e.kind==='main'||e.kind==='petra'||e.kind==='arch')||e.w<10||e.len<60||e.fz<2)continue;
   let o=null;for(const q of nd.inn)if(q!==e&&q.name&&q.name!==e.name&&(!o||q.w>o.w))o=q;if(!o||!/[A-Za-z]/.test(o.name))continue;
   const dn=jTrim(id)+2.2,uu=e.a===id?dn:e.len-dn;if(uu<6||uu>e.len-6)continue;if(!SGA.cells.has(o.name)&&SGA.n>=96)continue;
   const p=edgePt(e,uu),arr=e.b===id?1:-1,off=-arr*(e.w/2+1.4),x=p[0]+p[2]*off,z=p[1]+p[3]*off;
   if(onOther(x,z,e,.8)||!occFree(obb(x,z,.5,.5,0),0))continue;const key='N'+o.name;sgCell(o.name);
   addSign(x,z,-arr*p[3],arr*p[2],2.7,2.2,.55,key,0)}
  // stop sign where a minor local street meets a major one
  const big=nd.inn.some(q=>q.kind==='main'||q.kind==='petra'||q.kind==='arch');if(!big)continue;
  for(const e of nd.inn){if(e.kind!=='local'||e.len<40||e.w<6||e.fz<3)continue;const u=e.a===id?jTrim(id)+1.2:e.len-jTrim(id)-1.2,p=edgePt(e,u),arr=e.b===id?1:-1,off=-arr*(e.w/2+1.2),x=p[0]+p[2]*off,z=p[1]+p[3]*off;
   if(onOther(x,z,e,.8)||!occFree(obb(x,z,.5,.5,0),0))continue;addSign(x,z,-arr*p[3],arr*p[2],2.3,.8,.8,'STOP',1)}}
 // draw the atlas
 const g=SGA.g;g.clearRect(0,0,2048,1024);
 SGA.cells.forEach((c,name)=>{const r=sgRect(c,0);g.fillStyle='#0b5aa8';g.fillRect(r[0],r[1],r[2],r[3]);g.strokeStyle='#fff';g.lineWidth=3;g.strokeRect(r[0]+3,r[1]+3,r[2]-6,r[3]-6);g.fillStyle='#fff';g.textAlign='center';g.textBaseline='middle';
  let fs=28;g.font='bold '+fs+'px Arial,sans-serif';const tx=name.toUpperCase();while(fs>12&&g.measureText(tx).width>r[2]-16){fs-=2;g.font='bold '+fs+'px Arial,sans-serif'}g.fillText(tx,r[0]+r[2]/2,r[1]+r[3]/2+1)});
 const lims=new Set();SGS.forEach(s=>{if(/^L/.test(s[6]))lims.add(s[6])});let bi=0;const bigCell={};
 const drawBig=(key,fn)=>{const r=sgRect(bi,1);bigCell[key]=bi++;const cx=r[0]+64,cy=r[1]+64;fn(g,cx,cy)};
 lims.forEach(k=>drawBig(k,(g,cx,cy)=>{g.fillStyle='#fff';g.beginPath();g.arc(cx,cy,60,0,7);g.fill();g.strokeStyle='#d41f1f';g.lineWidth=11;g.beginPath();g.arc(cx,cy,54,0,7);g.stroke();g.fillStyle='#111';g.font='bold 56px Arial,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(k.slice(1),cx,cy+3)}));
 drawBig('STOP',(g,cx,cy)=>{g.fillStyle='#d41f1f';g.beginPath();for(let i=0;i<8;i++){const a=Math.PI/8+i*Math.PI/4;g.lineTo(cx+Math.cos(a)*62,cy+Math.sin(a)*62)}g.closePath();g.fill();g.strokeStyle='#fff';g.lineWidth=5;g.beginPath();for(let i=0;i<8;i++){const a=Math.PI/8+i*Math.PI/4;g.lineTo(cx+Math.cos(a)*54,cy+Math.sin(a)*54)}g.closePath();g.stroke();g.fillStyle='#fff';g.font='bold 40px Arial,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('STOP',cx,cy+3)});
 // merged plates (one mesh per 600 m cell), uv rectangles into the atlas
 const cells=new Map();
 SGS.forEach(s=>{const k=Math.floor(s[0]/300)+','+Math.floor(s[2]/300);let C=cells.get(k);if(!C)cells.set(k,C={p:[],uv:[],n:[],i:[],cx:(Math.floor(s[0]/300)+.5)*300,cz:(Math.floor(s[2]/300)+.5)*300});
  const r=s[7]?sgRect(bigCell[s[6]],1):sgRect(SGA.cells.get(s[6].slice(1)),0),u0=r[0]/2048,u1=(r[0]+r[2])/2048,v1=1-r[1]/1024,v0=1-(r[1]+r[3])/1024,hx=s[4]/2,sx=Math.cos(s[3]),sz=-Math.sin(s[3]),n=C.p.length/3;SIGN_PLATES.set(s[8],{C,n});
  // plate faces direction (sin ry, cos ry); its local x axis is (cos ry, -sin ry)
  for(const[a,b,uu,vv]of[[-1,0,u0,v0],[1,0,u1,v0],[-1,1,u0,v1],[1,1,u1,v1]]){C.p.push(s[0]+sx*hx*a,s[1]+s[5]*b,s[2]+sz*hx*a);C.uv.push(uu,vv);C.n.push(Math.sin(s[3]),0,Math.cos(s[3]))}
  C.i.push(n,n+1,n+2,n+1,n+3,n+2)});
 const tex=new T.CanvasTexture(SGA.cv);tex.anisotropy=4;tex.minFilter=T.LinearMipmapLinearFilter;
 const sm=new T.MeshLambertMaterial({map:tex,alphaTest:.5,side:T.DoubleSide});
 cells.forEach(C=>{const g2=new T.BufferGeometry();g2.setAttribute('position',new T.Float32BufferAttribute(C.p,3));g2.setAttribute('uv',new T.Float32BufferAttribute(C.uv,2));g2.setAttribute('normal',new T.Float32BufferAttribute(C.n,3));g2.setIndex(C.i);const m=new T.Mesh(g2,sm);C.mesh=m;scene.add(m);lodReg(m,C.cx,C.cz,260,300)});
 instO(UB,gfxStd({color:0xb4bac1,roughness:.42,metalness:.6,envMapIntensity:.9},'none')||UBm(0x7c838a),signPole,false,230,200)}
// ===== highway guardrails (W-beam rail + posts, stopped near every junction and wherever another road crosses) =====
{const rails=[],posts=[];
 EDGES.forEach(e=>{if(e.kind!=='hw'||e.len<80||e.fz<2)return;const t0=jTrim(e.a)+24,t1=jTrim(e.b)+24;
  for(const sg of[-1,1]){for(let u=t0;u<e.len-t1;u+=4){const p=edgePt(e,u),q=edgePt(e,Math.min(e.len,u+4)),off=sg*(e.w/2+.9),x=p[0]+p[2]*off,z=p[1]+p[3]*off,x2=q[0]+q[2]*off,z2=q[1]+q[3]*off;
   if(onOther(x,z,e,1.5)||onOther(x2,z2,e,1.5))continue;const mx=(x+x2)/2,mz=(z+z2)/2,y=hillH(mx,mz),dx=x2-x,dz=z2-z,l=Math.hypot(dx,dz)||1,ry=Math.atan2(-dz,dx);
   rails.push([mx,y+.62,mz,ry,l+.05,.3,.08]);posts.push([x,y+.38,z,0,.1,.76,.1]);boxCol(mx,mz,l,.3,ry,'guardrail')}}});
 const gr=gfxStd({color:0xcfd4d9,roughness:.38,metalness:.7,envMapIntensity:1},'none')||UBm(0xb9bec4);instO(UB,gr,rails,true,330,300);instO(UB,gr,posts,false,250,300)}

// ===== manhole covers, bus shelters, alley wires, roundabout planting =====
{const mh=[];EDGES.forEach(e=>{if(!(e.kind==='main'||e.kind==='local'||e.kind==='arch'||e.kind==='petra')||e.len<40||e.w<7||e.fz<3)return;
  for(let u=18+Math.random()*30;u<e.len-18;u+=rr(55,110)){const p=edgePt(e,u),o=(Math.random()<.5?-1:1)*(e.w/4+rr(-.6,.6)),x=p[0]+p[2]*o,z=p[1]+p[3]*o;if(onOther(x,z,e,-2))continue;mh.push([x,hillH(x,z)+.085,z,0,.8,.03,.8])}});
 instO(new T.CylinderGeometry(.5,.5,1,7),UBm(0x1b1d20),mh,false,140,200)}
{const roof=[],post=[],bench=[],glass=[];let n=0;
 EDGES.forEach(e=>{if(!(e.kind==='main'||e.kind==='arch'||e.kind==='petra')||e.len<160||e.w<10||e.fz<2)return;
  for(let u=60+Math.random()*120;u<e.len-60;u+=rr(260,520)){const dn=distName(...edgePt(e,u).slice(0,2));if(dn==='Outskirts'||dn==='Wasfi Al-Tal Park')continue;const sg=Math.random()<.5?-1:1,p=edgePt(e,u),off=sg*(e.w/2+1.55),x=p[0]+p[2]*off,z=p[1]+p[3]*off;
   if(onOther(x,z,e,2)||!occFree(obb(x,z,3.4,1.6,0),0)||furnNear(x,z,3))continue;   const tx=p[3],tz=-p[2],r=Math.atan2(-tz,tx),y=hillH(x,z),nx=-sg*p[2],nz=-sg*p[3];
   roof.push([x,y+2.55,z,r,3.2,.12,1.5,0x2f6f9f]);for(const k of[-1.3,1.3])post.push([x+tx*k+nx*.55,y+1.27,z+tz*k+nz*.55,0,.08,2.5,.08]);
   glass.push([x-nx*.62,y+1.3,z-nz*.62,r,3,2.2,.05]);bench.push([x-nx*.35,y+.45,z-nz*.35,r,2.4,.1,.45]);boxCol(x,z,3.2,1.2,r,'busShelter');furnAdd(x,z);n++}});
 const pm=UBm(0x4a4f55);instO(UB,UBm(0x2f6f9f),roof,true,280,300);instO(UB,pm,post,false,280,300);instO(UB,gfxStd({color:0x9fc4d8,roughness:.08,metalness:.2,envMapIntensity:2,transparent:true,opacity:.35},'none')||new T.MeshLambertMaterial({color:0x9fc4d8,transparent:true,opacity:.35}),glass,false,280,300);instO(UB,UBm(0x7a5a3a),bench,false,280,300)}
{const wv=[];EDGES.forEach(e=>{if(!(e.kind==='local'||e.kind==='svc')||e.fz<3)return;
  for(let u=12+Math.random()*10;u<e.len-10;u+=rr(16,32)){const p=edgePt(e,u);if(distName(p[0],p[1])!=='Al-Balad')continue;const hh=e.w/2+1.55,y=hillH(p[0],p[1])+rr(5.4,7.6),ax=p[0]-p[2]*hh,az=p[1]-p[3]*hh,bx=p[0]+p[2]*hh,bz=p[1]+p[3]*hh;
   if(occFree(obb(ax,az,1.2,1.2,0),0)||occFree(obb(bx,bz,1.2,1.2,0),0))continue;
   for(const dy of[0,-.45]){let q=[ax,y+dy,az];for(let k=1;k<=6;k++){const t=k/6,r=[ax+(bx-ax)*t,y+dy-.5*4*t*(1-t),az+(bz-az)*t];wv.push(q[0],q[1],q[2],r[0],r[1],r[2]);q=r}}}});
 if(wv.length){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(wv,3));const l=new T.LineSegments(g,new T.LineBasicMaterial({color:0x1b1d20}));l.frustumCulled=false;scene.add(l)}}
CIRC.forEach(c=>{const ir=c.r-c.w/2-.7;if(ir<4||c.mono)return;const n=Math.min(20,Math.floor(ir*1.5)),y=hillH(c.x,c.z);for(let k=0;k<n;k++){const a=k*Math.PI*2/n+.1,r=ir*.86,x=c.x+Math.cos(a)*r,z=c.z+Math.sin(a)*r,bs=rr(1.1,1.7);CANP.bush.push([x,y+.6+bs*.3,z,a,bs*1.2,bs*.8,bs,k%3===0?0xe36fa0:pick(GRN)])}});
CANP_PRE.forEach((q,i)=>treeSp(q[0],q[1],q[2],i%2?'palm':'cyp'));

// municipal green dumpsters at the back of the sidewalk in built-up zones
{const bin=[],lid=[];EDGES.forEach(e=>{if(!(e.kind==='local'||e.kind==='main'||e.kind==='arch'||e.kind==='petra')||e.len<80||e.w<7||e.fz<3)return;
  for(let u=40+Math.random()*60;u<e.len-40;u+=rr(130,260)){const p=edgePt(e,u),sg=Math.random()<.5?-1:1,off=sg*(e.w/2+rr(2.5,3.4)),x=p[0]+p[2]*off,z=p[1]+p[3]*off,dn=distName(x,z);
   if(dn==='Outskirts'||dn==='Wasfi Al-Tal Park'||Math.random()<.35)continue;const r=Math.atan2(-p[3],p[2]);
   if(onOther(x,z,e,2)||!occFree(obb(x,z,2.4,1.5,r),0)||furnNear(x,z,2.5))continue;const y=hillH(x,z);
   const bk='bin:'+bin.length;bin.push([x,y+.6,z,r,1.9,1.2,1.1,pick([0x2f6b3a,0x2f6b3a,0x25562f,0x3a6f8f]),bk]);lid.push([x,y+1.25,z,r,2,.1,1.2,0x1d2a22,bk+'/lid']);boxCol(x,z,1.9,1.1,r,'bin').visualKey=bk;furnAdd(x,z)}});
 instO(UB,UBm(0xffffff),bin,true,200,200);instO(UB,UBm(0x1d2a22),lid,false,200,200)}
