// ---- per-car procedural visual engine: every model gets its own name-hashed dual HSL neon pair, pixel-matrix underglow footprint, light-line layout and drift-exhaust profile (rendering only) ----
// The generator below is the supplied "uniqueness engine". Its `physics` block is generated for completeness but is NOT applied: top speed / acceleration / handling still come from PORS + the shop upgrades.
const baselineCarTiers={common:{speedScale:1.0,driftBonus:1.0,particleCount:20},uncommon:{speedScale:1.1,driftBonus:1.2,particleCount:30},rare:{speedScale:1.25,driftBonus:1.5,particleCount:45},epic:{speedScale:1.4,driftBonus:2.0,particleCount:65},legendary:{speedScale:1.6,driftBonus:3.0,particleCount:90}};
const CAR_TIERS=['common','uncommon','rare','epic','legendary'];
// deterministic, separate from the world PRNG `PR` (never touches place coordinates)
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function fnv1a(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function generateUniqueCarStats(modelName,tier,hueShift){
 let hash=0;for(let i=0;i<modelName.length;i++){hash=modelName.charCodeAt(i)+((hash<<5)-hash)}
 const hue1=(Math.abs(hash%360)+(hueShift||0))%360,hue2=(hue1+120)%360;
 const uniqueNeonColor=`hsl(${hue1}, 100%, 55%)`,uniqueAccentGlow=`hsl(${hue2}, 100%, 50%)`;
 const pixelWidth=14+(Math.abs(hash)%4),pixelHeight=7+(Math.abs(hash)%3);
 return{model:modelName,tier,hue:[hue1,hue2],hash,
  physics:{mass:1100+(Math.abs(hash)%600),drag:.25+((Math.abs(hash)%100)/1000),slideTractionThreshold:.6+((Math.abs(hash)%35)/100),speedModifier:baselineCarTiers[tier].speedScale,driftMultiplier:baselineCarTiers[tier].driftBonus},
  graphics:{primaryColor:uniqueNeonColor,accentGlowColor:uniqueAccentGlow,glowRadiusPixels:6+(Math.abs(hash)%12),pulsingSpeedHz:1.0+((Math.abs(hash)%40)/10),spriteDimensions:`${pixelWidth}x${pixelHeight} Matrix Grid`,pixelWidth,pixelHeight},
  exhaustParticles:{maxStreamParticles:baselineCarTiers[tier].particleCount,pixelSize:2+(Math.abs(hash)%4),alphaFadeRate:.01+((Math.abs(hash)%30)/1000),shapePattern:(hash%2===0)?"Sharp Vector Squares":"Kinetic Pixel Crosses"}}}
// extends a generated profile with the footprint matrix (unique per name) and the light-line layout
function finishCarProfile(p){
 const{pixelWidth:pw,pixelHeight:ph}=p.graphics,r=mulberry32(fnv1a(p.model)^(Math.abs(p.hash)|0)),half=Math.ceil(ph/2),rows=[];
 for(let y=0;y<pw;y++){const h=[];for(let x=0;x<half;x++){const edge=(y===0||y===pw-1||x===0),q=r();h.push(edge?(q<.78?1:2):(q<.30?0:q<.74?1:2))}
  const full=h.concat(h.slice(0,ph-half).reverse());rows.push(full)}
 p.footprint={w:pw,h:ph,rows,key:rows.map(a=>a.join('')).join('/')};
 p.graphics.lines={side:1+(r()<.5?1:0),sideLen:.4+r()*.3,front:.5+r()*.3,rear:.5+r()*.3,rearSplit:r()<.5,corners:r()<.5,swap:r()<.5};
 return p}
function compileUniqueCarDatabase(rawList){const db={},used=new Set();
 for(const tier in rawList)db[tier]=rawList[tier].map(m=>{let s=0,p;while(true){p=generateUniqueCarStats(m,tier,s);if(!used.has(p.hue[0])||s>359)break;s++}used.add(p.hue[0]);return finishCarProfile(p)});
 return db}
const gameCarList={common:[],uncommon:[],rare:[],epic:[],legendary:[]};
PORS.forEach((m,i)=>gameCarList[CAR_TIERS[rarityIdx(i)]].push(m[0]));
const finalizedUniqueVehicles=compileUniqueCarDatabase(gameCarList);
const CARV=PORS.map((m,i)=>finalizedUniqueVehicles[CAR_TIERS[rarityIdx(i)]].find(v=>v.model===m[0]));
const carV=i=>CARV[i]||CARV[0];
// ---- GPU side (lazy per model): pixel-matrix underglow texture, glow/strip materials, colours ----
const VM=[],VML=[],WHT=new T.Color(1,1,1);
const NEON_BOX=new T.BoxGeometry(1,1,1);
function carCols(i){return carVisMats(i)}
function carVisMats(i){let m=VM[i];if(m)return m;const v=carV(i),g=v.graphics,c1=new T.Color(g.primaryColor),c2=new T.Color(g.accentGlowColor);
 m=VM[i]={c1,c2,f:g.pulsingSpeedHz,ph:(Math.abs(v.hash)%628)/100,s1:new T.MeshBasicMaterial({color:c1.clone().multiplyScalar(1.5)}),s2:new T.MeshBasicMaterial({color:c2.clone().multiplyScalar(1.5)})};
 VML.push(m);return m}
// ---- 10,000-pixel detail sheet per car: one 100x100 canvas (nearest-filtered) = side panel 100x40 (shown on both flanks) + top deck 60x60 + front fascia 40x30 + rear fascia 40x30 = 10,000 px ----
// every pixel is written (paint-flake speckle) and then panel gaps, door seams/handles, livery stripes, vents, emblem, grille mesh, plates, exhaust tips... are drawn from the car's own seeded profile
const DET_N=100*100;
function carDims(i){const[n,,,L,W,H,k]=PORS[i],P0=PROF[k]||PROF.c,bh=(H-.3)*P0.bf;return{n,L,W,H,k,P0,bh,y0:.3+bh}}
function carDetailTex(i){const v=carV(i),g=v.graphics,d=carDims(i),r=mulberry32(fnv1a(d.n)^0x9E3779B9),ri=n=>Math.floor(r()*n),cv=document.createElement('canvas');cv.width=cv.height=100;const x=cv.getContext('2d');
 const c1=g.primaryColor,c2=g.accentGlowColor,h1=v.hue[0],dk='#08090b',lt='#e4e8ec';
 for(let py=0;py<100;py++)for(let px=0;px<100;px++){const q=r();x.globalAlpha=.05+q*.06;x.fillStyle=q<.5?'#000':'#fff';x.fillRect(px,py,1,1)}   // flake speckle: all 10,000 pixels written
 const Pn=(O,px,py,col,a)=>{if(px<0||py<0||px>=O.w||py>=O.h)return;x.globalAlpha=a==null?1:a;x.fillStyle=col;x.fillRect(O.x+px,O.y+py,1,1)},
  Rc=(O,px,py,w,h,col,a)=>{for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++)Pn(O,px+xx,py+yy,col,a)},
  Ln=(O,x0,y0,x1,y1,col,a)=>{const n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0));for(let t=0;t<=n;t++)Pn(O,Math.round(x0+(x1-x0)*t/(n||1)),Math.round(y0+(y1-y0)*t/(n||1)),col,a)},
  Cl=(O,cx,cy,rad,col,a)=>{for(let yy=-rad;yy<=rad;yy++)for(let xx=-rad;xx<=rad;xx++)if(xx*xx+yy*yy<=rad*rad)Pn(O,cx+xx,cy+yy,col,a)};
 const SD={x:0,y:0,w:100,h:40},TP={x:0,y:40,w:60,h:60},FR={x:60,y:40,w:40,h:30},RR={x:60,y:70,w:40,h:30};
 // --- side panel (u: rear -> front) ---
 Rc(SD,0,35,100,5,'#000',.35);Ln(SD,3,13,96,13,dk,.55);Ln(SD,3,33,96,33,dk,.6);Ln(SD,3,34,96,34,'#fff',.12);
 const seams=[22+ri(6),48+ri(5),74+ri(5)];for(const sx of seams){Ln(SD,sx,8,sx,33,dk,.6);Ln(SD,sx+1,8,sx+1,33,'#fff',.1);Rc(SD,sx+4,15,5,1,lt,.85);Rc(SD,sx+4,16,5,1,dk,.5)}
 const st=Math.abs(v.hash)%4;
 if(st===0){Rc(SD,0,21,100,3,c1);Rc(SD,0,25,100,1,c2)}
 else if(st===1){for(let sx=0;sx<100;sx+=5){Rc(SD,sx,21,4,3,c1);Rc(SD,sx+1,25,2,1,c2)}}
 else if(st===2){for(let sx=0;sx<100;sx++){Rc(SD,sx,20,1,5,c1,Math.min(1,sx/60));Rc(SD,sx,26,1,1,c2,Math.min(1,sx/60))}}
 else{Rc(SD,0,19,100,1,c1);Rc(SD,0,22,100,1,c2);Rc(SD,0,25,100,2,c1)}
 {const ex=8+ri(8),ey=3+ri(3);Cl(SD,60,22,7,'#f1f3f5',.92);Cl(SD,60,22,7,'#000',0);               // roundel + symmetric 5x5 emblem seeded per car
  for(let ey2=0;ey2<5;ey2++)for(let ex2=0;ex2<3;ex2++)if(r()<.55){Pn(SD,58+ex2,20+ey2,ex2%2?c1:dk);Pn(SD,62-ex2,20+ey2,ex2%2?c1:dk)}
  for(let k=0;k<4+ri(3);k++)Ln(SD,86+k*2,18,89+k*2,26,dk,.7);                                   // front fender gills
  Rc(SD,ex,14,4,3,dk,.6);Rc(SD,ex+1,15,2,1,c2)}                                                  // fuel cap
 // --- top deck (v: front -> rear, symmetric across the car) ---
 Ln(TP,6,20,53,20,dk,.5);Ln(TP,6,44,53,44,dk,.5);Ln(TP,6,6,6,54,dk,.35);Ln(TP,53,6,53,54,dk,.35);
 const ts=Math.floor(Math.abs(v.hash)/7)%3;
 if(ts===0){Rc(TP,20,0,5,60,c1,.95);Rc(TP,35,0,5,60,c2,.95)}else if(ts===1){Rc(TP,25,0,10,60,c1,.9);Rc(TP,24,0,1,60,c2);Rc(TP,35,0,1,60,c2)}else{for(let ty=0;ty<60;ty+=4){Ln(TP,10,ty+3,30,ty,c1,.8);Ln(TP,49,ty+3,29,ty,c2,.8)}}
 for(let k=0;k<3+ri(4);k++){Ln(TP,10,4+k*3,19,4+k*3,dk,.7);Ln(TP,41,4+k*3,50,4+k*3,dk,.7)}      // hood vents
 Rc(TP,12,52,36,2,c2,.9);Rc(TP,8,56,44,3,dk,.45);
 // --- front fascia (headlight pixels) ---
 const wd=d.W*.92,cut=(O,cxm,yc,hwm,hhm,Hs,yTop,col,col2)=>{const px=(cxm/wd+.5)*O.w,hw=hwm/wd*O.w,py=(yTop-yc)/Hs*O.h,hh=hhm/Hs*O.h;const X0=O.x+Math.round(px-hw),Y0=O.y+Math.round(py-hh),WW=Math.round(hw*2),HH=Math.max(2,Math.round(hh*2));x.globalAlpha=1;x.fillStyle=col;x.fillRect(X0,Y0,WW,HH);x.fillStyle=col2;x.fillRect(X0+1,Y0+Math.floor(HH/3),Math.max(1,WW-2),Math.max(1,Math.floor(HH/3)));x.fillStyle=dk;x.fillRect(X0,Y0+HH-1,WW,1)};
 const fyb=.34,fyt=Math.max(fyb+.12,.3+d.bh*d.P0.nf-.04),Hf=fyt-fyb;
 Rc(FR,12,3,16,12,dk,.85);for(let gy=3;gy<15;gy++)for(let gx=12;gx<28;gx++)if((gx+gy)%2)Pn(FR,gx,gy,'#777d86',.5);Rc(FR,12,16,16,1,c1);Rc(FR,12,17,16,1,c2,.8);
 Rc(FR,15,20,10,5,lt,.92);for(let k=0;k<12;k++)Pn(FR,16+ri(8),21+ri(3),dk,.9);Rc(FR,0,27,40,3,dk,.8);Rc(FR,6,26,28,1,c2,.9);
 for(const sg of[-1,1])cut(FR,sg*d.W*.33,.3+d.bh*d.P0.nf*.8,.23,.09,Hf,fyt,'#d9d2b0','#fffbe6');
 // --- rear fascia ---
 const ryb=.34,ryt=Math.max(ryb+.12,.3+d.bh*d.P0.rf-.04),Hr=ryt-ryb;
 Rc(RR,0,0,40,2,dk,.55);Rc(RR,6,3,28,1,c1);Rc(RR,12,6,16,6,lt,.92);for(let k=0;k<14;k++)Pn(RR,13+ri(14),7+ri(4),dk,.9);
 for(const sx of[10,24]){Cl(RR,sx+3,20,3,'#2a2c31',.95);Cl(RR,sx+3,20,2,dk,.95);Pn(RR,sx+3,20,c2)}
 for(let k=0;k<5;k++)Ln(RR,6+k*7,26,6+k*7,29,dk,.8);Rc(RR,0,29,40,1,c2,.8);
 for(const sg of[-1,1])cut(RR,sg*d.W*.33,.3+d.bh*d.P0.rf*.75,.25,.07,Hr,ryt,'#a01414','#ff4a3a');
 x.globalAlpha=1;const t=new T.CanvasTexture(cv);t.magFilter=t.minFilter=T.NearestFilter;t.generateMipmaps=false;return{tex:t,fyb,fyt,ryb,ryt}}
const DET=[];
function carDetail(i){let e=DET[i];if(e)return e;const d=carDims(i),s=carDetailTex(i),L=d.L,W=d.W,xw=W*.46,sx=W/2+.012,zl=-.40*L,zh=(.5-d.P0.hl)*L-.05,ys0=.36,ys1=d.y0-.03,yT=d.y0+.09,zf=L/2+.09,xt=W*.42,xf=W*.46;
 const pos=[],uv=[],nor=[],idx=[];
 const quad=(bl,br,tr,tl,n,O)=>{const b=pos.length/3,u0=O.x/100,u1=(O.x+O.w)/100,v0=1-(O.y+O.h)/100,v1=1-O.y/100;for(const p of[bl,br,tr,tl]){pos.push(...p);nor.push(...n)}uv.push(u0,v0,u1,v0,u1,v1,u0,v1);idx.push(b,b+1,b+2,b,b+2,b+3)};
 quad([-sx,ys0,zl],[-sx,ys0,zh],[-sx,ys1,zh],[-sx,ys1,zl],[-1,0,0],{x:0,y:0,w:100,h:40});quad([sx,ys0,zl],[sx,ys0,zh],[sx,ys1,zh],[sx,ys1,zl],[1,0,0],{x:0,y:0,w:100,h:40});
 quad([-xt,yT,zl],[xt,yT,zl],[xt,yT,zh],[-xt,yT,zh],[0,1,0],{x:0,y:40,w:60,h:60});
 quad([-xf,s.fyb,zf],[xf,s.fyb,zf],[xf,s.fyt,zf],[-xf,s.fyt,zf],[0,0,1],{x:60,y:40,w:40,h:30});quad([-xf,s.ryb,-zf],[xf,s.ryb,-zf],[xf,s.ryt,-zf],[-xf,s.ryt,-zf],[0,0,-1],{x:60,y:70,w:40,h:30});
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setAttribute('normal',new T.Float32BufferAttribute(nor,3));geo.setIndex(idx);
 const o={map:s.tex,transparent:true,depthWrite:false,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3};
 const mat=GFX.on?gfxReg(new T.MeshStandardMaterial(Object.assign({roughness:.42,metalness:.25,envMapIntensity:.7},o))):new T.MeshLambertMaterial(o);
 return DET[i]={geo,mat}}
function addNeon(g,idx,full){if(full===undefined)full=true;const[,,,L,W]=PORS[idx],v=carV(idx),gr=v.graphics,ln=gr.lines,m=carVisMats(idx),dt=carDetail(idx);
 const dm=new T.Mesh(dt.geo,dt.mat);dm.userData.nsh=true;dm.renderOrder=1;g.add(dm);
 if(full){const strip=(mt,sx,sy,sz,px,py,pz)=>{const b=new T.Mesh(NEON_BOX,mt);b.scale.set(sx,sy,sz);b.position.set(px,py,pz);g.add(b)},A=ln.swap?m.s2:m.s1,B=ln.swap?m.s1:m.s2;
  for(const sd of[-1,1]){strip(A,.05,.06,L*ln.sideLen,sd*(W/2-.03),.27,-L*.02);if(ln.side>1)strip(B,.05,.05,L*ln.sideLen*.7,sd*(W/2-.03),.19,-L*.02);
   if(ln.corners)strip(B,.05,.18,.05,sd*(W/2-.05),.4,L/2+.02)}
  strip(A,W*ln.front,.045,.05,0,.3,L/2+.02);
  if(ln.rearSplit)for(const sd of[-1,1])strip(B,W*ln.rear*.42,.045,.05,sd*W*ln.rear*.3,.34,-L/2-.02);else strip(B,W*ln.rear,.045,.05,0,.34,-L/2-.02)}
 g.userData.neon=gr.primaryColor}
function neonTick(t){for(const m of VML){const p=.5+.5*Math.sin(t*m.f*6.2832+m.ph),v=1.15+.7*p;m.s1.color.copy(m.c1).multiplyScalar(v);m.s2.color.copy(m.c2).multiplyScalar(v)}}
// ---- drift exhaust particle shapes: hard pixel squares vs kinetic pixel crosses ----
const PXT=(()=>{const mk=f=>{const c=document.createElement('canvas');c.width=c.height=16;const x=c.getContext('2d');f(x);const t=new T.CanvasTexture(c);t.magFilter=t.minFilter=T.NearestFilter;t.generateMipmaps=false;return t};
 return{sq:mk(x=>{x.fillStyle='rgba(255,255,255,.55)';x.fillRect(0,0,16,16);x.fillStyle='#fff';x.fillRect(0,0,16,2);x.fillRect(0,14,16,2);x.fillRect(0,0,2,16);x.fillRect(14,0,2,16)}),
  cr:mk(x=>{x.fillStyle='rgba(255,255,255,.7)';x.fillRect(5,0,6,16);x.fillRect(0,5,16,6);x.fillStyle='#fff';x.fillRect(6,6,4,4)})}})();
