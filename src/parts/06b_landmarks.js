// ---- landmarks: bank, garage, Al-Balad souks + clock tower, Wasfi Al-Tal Park, Arabella Mall ----
const SOUQG={x:0,z:0},CLKG={x:0,z:0};
function roadSpot(name,x,z){const[r,i]=nearestOn(name,x,z),a=r.dp[Math.max(0,i-1)],b=r.dp[Math.min(r.dp.length-1,i+1)],p=r.dp[i],dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz);return{x:p[0],z:p[1],tx:dx/l,tz:dz/l,nx:-dz/l,nz:dx/l,w:r.w}}
const grp=(x,y,z,ry)=>{const g=new T.Group();g.position.set(x,y,z);g.rotation.y=ry||0;scene.add(g);return g};
const Mi=(g,geo,mat,x,y,z)=>{const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;g.add(m);return m};
const LMC=new Map(),LM_=(c)=>{if(!GFX.on)return new T.MeshLambertMaterial({color:c});let m=LMC.get(c);if(!m){const r=c>>16&255,g=c>>8&255,b=c&255,st=r>=g&&g>=b&&(r+g+b)>200;m=gfxStd({color:c,roughness:.9,metalness:0,envMapIntensity:.2},st?'stone':'wall');LMC.set(c,m)}return m},mGoldL=GFX.on?(gfxStd({color:0xd4af37,roughness:.34,metalness:.85,envMapIntensity:1.3},'none')||LM_(0xd4af37)):LM_(0xd4af37);
const padAt=(x,z,col)=>{const m=new T.Mesh(new T.CylinderGeometry(6,6,.3,24),new T.MeshBasicMaterial({color:col,transparent:true,opacity:.65}));m.position.set(x,.2,z);scene.add(m)};
const signAt=(g,t,x,y,z,w)=>{const s=label(t);s.scale.set(w,w/8,1);s.position.set(x,y,z);g.add(s)};
// bank (Palestine Street) and garage (Al-Hashemi Street): lots found beside the real street, clear of every road
const BSITE=siteBeside('Palestine Street',...O(335,-122),50,44,6,{nogrp:true,pad:2}),BK=BSITE.p,BANK={x:BK.x,z:BK.z},SHOP={x:0,z:0},GSITE=siteBeside('Baghdad Street',...O(320,100),40,36,6,{pad:2}),GP=GSITE.p;
{const cx=BSITE.cx,cz=BSITE.cz,ry=BSITE.ry+Math.PI,g=grp(cx,0,cz,ry);BANKP.x=cx;BANKP.z=cz;
 Mi(g,new T.BoxGeometry(50,14,44),LM_(0xf2efe6),0,7,0);Mi(g,new T.BoxGeometry(54,1.4,48),mGoldL,0,14.7,0);for(let i=0;i<6;i++)Mi(g,new T.BoxGeometry(2,12,2),mGoldL,-17.5+i*7,6,23);signAt(g,'BANK',0,19,23,40);padAt(BK.x,BK.z,0xffd24a)}
{const cx=GSITE.cx,cz=GSITE.cz,g=GSITE.g;SHOP.x=GP.x;SHOP.z=GP.z;SHOPP.x=cx;SHOPP.z=cz;
 Mi(g,new T.BoxGeometry(40,9,36),LM_(0x2a2d33),0,4.5,0);Mi(g,new T.BoxGeometry(42,1.2,38),LM_(0xff7a00),0,9.6,0);Mi(g,new T.BoxGeometry(24,5,.4),LM_(0x5fb7ff),0,3.2,-18.1);signAt(g,'APEX DRIFT CUSTOMS',0,14,-19,40);padAt(GP.x,GP.z,0xff7a00)}
const ST=roadSpot('Baghdad Street',...O(150,86)),START={x:ST.x+ST.nx*4,z:ST.z+ST.nz*4,h:Math.atan2(ST.tx,ST.tz)};
// Al-Balad souk gate, striped awnings over the lanes and the clock tower
{const s=roadSpot('Souq Al-Balad Lane',...O(-70,-125)),ry=Math.atan2(-s.nz,s.nx),g=grp(s.x,0,s.z,ry);
 for(const k of[-1,1])Mi(g,new T.BoxGeometry(1.8,7.5,1.8),LM_(0xd9c27a),k*6.2,3.75,0);Mi(g,new T.BoxGeometry(15,2.2,2),LM_(0xc9ae66),0,8.1,0);Mi(g,new T.ConeGeometry(2.4,2.6,4),LM_(0xb8935a),0,10.6,0);
 signAt(g,'SOUQ AL-BALAD',0,13.2,0,22);SOUQG.x=s.x;SOUQG.z=s.z;boxCol(s.x+s.nx*6.2,s.z+s.nz*6.2,1.8,1.8,0);boxCol(s.x-s.nx*6.2,s.z-s.nz*6.2,1.8,1.8,0);SPAWNKEEP.push([s.x,s.z,14]);
 const ac=[0xc0392b,0x2980b9,0xf39c12,0x27ae60,0x8e44ad,0xe67e22];EDGES.forEach(e=>{if(!(SOUQ(e)&&e.w<6.5&&e.len>10))return;for(let u=4;u<e.len-4;u+=6.5)for(const sd of[-1,1]){const p=edgePt(e,u);AWN.push([p[0]+sd*p[2]*(e.w/2+.1),3.5,p[1]+sd*p[3]*(e.w/2+.1),Math.atan2(p[2],p[3]),5.8,.12,2.6,pick(ac)])}})}
{const c=roadSpot('Clock Tower Lane',...RL(/Clock Tower Square/,O(-320,-60))),cx=c.x+c.nx*14,cz=c.z+c.nz*14,g=grp(cx,0,cz,0),sd=LM_(0xdccf9f);Mi(g,new T.BoxGeometry(6,24,6),sd,0,12,0);Mi(g,new T.CylinderGeometry(0,5,7,4).rotateY(Math.PI/4),LM_(0x8a3b2a),0,27.5,0);
 for(const[a,b]of[[0,3.1],[0,-3.1]])Mi(g,new T.CircleGeometry(2,20),new T.MeshBasicMaterial({color:0xfff6dc,side:T.DoubleSide}),a,20,b);for(const[a,b]of[[3.1,0],[-3.1,0]]){const m=Mi(g,new T.CircleGeometry(2,20),new T.MeshBasicMaterial({color:0xfff6dc,side:T.DoubleSide}),a,20,b);m.rotation.y=Math.PI/2}
 boxCol(cx,cz,6,6,0);SPAWNKEEP.push([cx,cz,12]);CLKG.x=cx;CLKG.z=cz}
// Wasfi Al-Tal Park
{const px=(PARK.x0+PARK.x1)/2,pz=(PARK.z0+PARK.z1)/2,W=PARK.x1-PARK.x0,D=PARK.z1-PARK.z0,g=grp(px,0,pz,0);
 Mi(g,new T.BoxGeometry(W,.12,D),LM_(0x5f9a45),0,.1,0);for(const k of[-1,1]){const m=Mi(g,new T.BoxGeometry(Math.hypot(W,D)*.98,.06,4),LM_(0xcdc6b4),0,.2,0);m.rotation.y=k*Math.atan2(D,W)}Mi(g,new T.BoxGeometry(W,.06,3.5),LM_(0xcdc6b4),0,.2,D/2-6);Mi(g,new T.BoxGeometry(3.5,.06,D),LM_(0xcdc6b4),0,.2,0);
 const pond=Mi(g,new T.CylinderGeometry(24,24,.1,28),LM_(0x3a86c8),28,.22,-18);pond.scale.z=.6;Mi(g,new T.CylinderGeometry(1.2,1.6,3,10),LM_(0xeeeeee),28,1.7,-18);Mi(g,new T.ConeGeometry(.9,4,8),new T.MeshBasicMaterial({color:0xbfe6ff}),28,5,-18);
 for(const[a,b]of[[-1,-1],[1,-1],[-1,1],[1,1]])Mi(g,new T.BoxGeometry(.7,5,.7),LM_(0x8a6a3c),-70+a*7,2.5,30+b*7);Mi(g,new T.BoxGeometry(17,.5,17),LM_(0xa8864f),-70,5.3,30);
 signAt(g,'WASFI AL-TAL PARK',0,15,D/2-2,30);const fp=Mi(g,new T.CylinderGeometry(.18,.22,20,6),LM_(0xdddddd),-W/2+10,10,D/2-8);Mi(g,new T.BoxGeometry(7,4,.1),LM_(0x1f8f4e),-W/2+13.5,18,D/2-8);
 for(let i=0;i<64;i++){const x=R(-W/2+8,W/2-8),z=R(-D/2+8,D/2-8);if(Math.hypot((x-28)/26,(z+18)/16)<1.2||Math.hypot(x+70,z-30)<14)continue;tree(px+x,pz+z,R(.9,1.4))}
 SPAWNKEEP.push([px,pz,Math.hypot(W,D)/2+4])}
// Arabella Mall: placed on the nearest open ground big enough, east of University Street (mall + forecourt lot facing the street)
{const RMX=(()=>{const RM=BLDD.n.find(n=>/^Arabella Mall/.test(n[2]));if(!RM)return null;let bp=-1,ba=0;const P=BLDD.p;for(let i=0;i<P.length;i+=7){if(Math.abs(P[i]/10-RM[0])<60&&Math.abs(P[i+1]/10-RM[1])<60){const a=P[i+2]*P[i+3];if(a>ba){ba=a;bp=i}}}
  if(bp<0||ba<8000)return null;const r={x:P[bp]/10,z:P[bp+1]/10,w:P[bp+2]/10,d:P[bp+3]/10,a:P[bp+4]/100,h:Math.max(11,P[bp+5]/2)},rn=roadNear(r.x,r.z,200,e=>!e.tn);if(rn&&(rn.px-r.x)*Math.cos(r.a)+(rn.pz-r.z)*-Math.sin(r.a)>0)r.a+=Math.PI;return r})();
 if(RMX){const{x:mx,z:mz,w:mw,d:md,a:ma,h:hh}=RMX,g=grp(mx,0,mz,ma);Mi(g,new T.BoxGeometry(mw,hh,md),LM_(0xece8de),0,hh/2,0);Mi(g,new T.BoxGeometry(1.4,hh*.7,md*.64),new T.MeshLambertMaterial({color:0x5fa6d8,transparent:true,opacity:.75}),-mw/2-.2,hh*.4,0);Mi(g,new T.BoxGeometry(mw+2,1.4,md+2),LM_(0xc0392b),0,hh+.7,0);
  Mi(g,new T.BoxGeometry(8,40,8),LM_(0xc0392b),-mw/2+6,hh+20,-md/2+6);signAt(g,'ARABELLA MALL',-mw/2+6,hh+42,-md/2+6,46);signAt(g,'ARABELLA MALL',-mw/2-.4,hh+3,0,Math.min(70,md*.8));
  boxCol(mx,mz,mw,md,ma);occAdd(obb(mx,mz,mw,md,ma));MALL.x=mx;MALL.z=mz;MALL.r=Math.min(mw,md)/2+6;MALL.ang=ma;MALL.k=1}
 else {const seed=RL(/^Arabella Mall/,UL(880,415));let site=null,k=1;for(const mr of[120,900,3200])if(!site)for(k of[1,.8,.62,.48,.38]){const f=freeSite(seed[0],seed[1],170*k+70,110*k+10,UA,10,mr);if(f){site=f;break}}
 if(!site){site=seed;k=0}
 const ex=Math.cos(UA),ez=-Math.sin(UA),cxm=site[0]+ex*35,czm=site[1]+ez*35;
 if(k){const g=grp(cxm,0,czm,UA);Mi(g,new T.BoxGeometry(170*k,16,110*k),LM_(0xece8de),0,8,0);Mi(g,new T.BoxGeometry(1.4,11,70*k),new T.MeshLambertMaterial({color:0x5fa6d8,transparent:true,opacity:.75}),-85.5*k,6,0);Mi(g,new T.BoxGeometry(174*k,1.4,114*k),LM_(0xc0392b),0,16.7,0);
  Mi(g,new T.BoxGeometry(8,46,8),LM_(0xc0392b),-100*k,23,-70*k);signAt(g,'ARABELLA MALL',-100*k,50,-70*k,46);signAt(g,'ARABELLA MALL',-85.6*k,19,0,70*k);
  boxCol(cxm,czm,170*k,110*k,UA);const lx=site[0]-ex*85*k,lz=site[1]-ez*85*k,lg=grp(lx,0,lz,UA);
  const L=new T.Mesh(new T.BoxGeometry(70,.1,110*k+8),LM_(0x3d4046));L.position.set(0,.06,0);L.receiveShadow=true;lg.add(L);
  const st=[];for(let i=-Math.floor(55*k/5.2);i<=Math.floor(55*k/5.2);i++)for(const q of[-1,1])if(Math.abs(i)>1)st.push([lx+ex*(q*17)+Math.sin(UA)*(i*5.2),.13,lz+ez*(q*17)+Math.cos(UA)*(i*5.2),UA,5,.03,2.4]);instO(UB,UBm(0xf2f2f2),st)}
 MALL.x=cxm;MALL.z=czm;MALL.r=k?Math.hypot(170*k,110*k)/2+40:0;MALL.ang=UA;MALL.k=k}}
