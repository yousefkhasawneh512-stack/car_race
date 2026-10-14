// ---- INU campus + highway exit terminal, Jadara hillside gates, interchange gantries, Hakama trucking zone ----
// overhead sign gantry across a road (local x = road normal)
function gantry(roadName,x,z,text,w2){const s=roadSpot(roadName,x,z),ry=Math.atan2(-s.nz,s.nx),g=grp(s.x,0,s.z,ry),hw=s.w/2+3;
 for(const k of[-1,1]){Mi(g,new T.BoxGeometry(1.2,8.5,1.2),LM_(0x6b7077),k*hw,4.25,0);boxCol(s.x+k*hw*s.nx,s.z+k*hw*s.nz,1.2,1.2,0)}
 Mi(g,new T.BoxGeometry(hw*2+1.4,.7,.9),LM_(0x6b7077),0,8.4,0);const pn=Mi(g,new T.BoxGeometry(Math.min(hw*2-2,w2||26),3.2,.3),LM_(0x1e7a3c),0,6.6,0);pn.castShadow=false;signAt(g,text,0,6.6,.25,Math.min(hw*2-2,w2||26)*.96);SPAWNKEEP.push([s.x,s.z,6])}
// --- Hakama trucking zone: gravel yard, warehouses and parked trailers off the north-eastern artery ---
{const fs=freeSite(RA.sinaa[0],RA.sinaa[1],176,100,0,8,2600);if(fs){const ry=0,c=1,sn=0,gx=fs[0],gz=fs[1],g=grp(gx,0,gz,ry);
 const W2=(lx,lz)=>[gx+lx*c+lz*sn,gz-lx*sn+lz*c];
 const yd=Mi(g,new T.BoxGeometry(170,.1,96),LM_(0x8c8472),0,.07,0);yd.castShadow=false;
 for(const lx of[-45,45]){Mi(g,new T.BoxGeometry(62,11,22),LM_(0xb9c0c6),lx,5.5,36);Mi(g,new T.BoxGeometry(63,1,23),LM_(0x7a8590),lx,11.3,36);const p=W2(lx,36);boxCol(p[0],p[1],62,22,ry)}
 const TIRE=LM_(0x111111),tc=[0xd62828,0x1f4e99,0xf2f2f2,0xf0a020,0x2a9d8f,0x444a52];for(let i=0;i<12;i++){const lx=-70+i*12.6,col=tc[i%6],lz=-14;Mi(g,new T.BoxGeometry(3.2,3.6,3.4),LM_(col),lx,2.5,lz-8.4);Mi(g,new T.BoxGeometry(3,3.2,13),LM_(i%3?0xe8e8e8:0xbfc5cc),lx,2.8,lz+2);for(const q of[-6,-1,3.5])for(const k of[-1,1])Mi(g,new T.CylinderGeometry(.55,.55,.4,8).rotateZ(Math.PI/2),TIRE,lx+k*1.55,.55,lz+q+3);const p=W2(lx,lz-1);boxCol(p[0],p[1],3.4,17,ry)}
 signAt(g,'HAKAMA TRUCKING ZONE',0,15,-46,56);occAdd(obb(gx,gz,176,100,ry));SPAWNKEEP.push([gx,gz,100])}}
