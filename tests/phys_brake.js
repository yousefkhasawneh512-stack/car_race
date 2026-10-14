// braking distance / reverse / frame-rate independence / slope gravity (node tests/phys_brake.js dist/irbid-drive.html)
const {S,sim,reset}=require('./phys_audit.js');const P=S.P,k=S.keys;
(0,eval)('surfK=function(){return 1}'); // asphalt for the baseline numbers
// find a flat 600 m E-W strip (|grade|<0.4%) near Al-Balad
let flat=null;for(let z=-2000;z<2000&&!flat;z+=50)for(let x=-3000;x<3000&&!flat;x+=50){let ok=true;for(let d=0;d<=600;d+=25)if(Math.abs(S.groundH(x+d+5,z)-S.groundH(x+d,z))/5>.004){ok=false;break}if(ok)flat=[x,z]}
console.log('flat strip',flat);
function run(i,dt,kind,grade){S.setPlayerCar(i);P.x=flat[0];P.z=flat[1];P.h=Math.PI/2;P.vy=0;P.y=P.pgh=S.groundH(P.x,P.z);P.gnd=true;P.pitch=0;
 const v0=100/3.6;P.vx=v0;P.vz=0;let t=0,d=0;k.KeyW=k.KeyS=k.Space=false;
 if(kind==='brake'){k.KeyS=true;while(P.vx>.01&&t<30){S.updP(dt,false);d+=P.vx*dt;t+=dt}k.KeyS=false;return {t,d}}
 if(kind==='coast'){while(Math.hypot(P.vx,P.vz)>.05&&t<400){S.updP(dt,false);d+=P.vx*dt;t+=dt}return {t,d,v:Math.hypot(P.vx,P.vz)*3.6}}
 if(kind==='rev'){P.vx=0;k.KeyS=true;while(t<10){S.updP(dt,false);t+=dt}k.KeyS=false;return {v:Math.hypot(P.vx,P.vz)*3.6}}
}
const idx=n=>S.PORS.findIndex(m=>m[0]===n);
for(const n of ['Ford Focus RS','Porsche 911','Lamborghini Aventador','Ford Model T']){const i=idx(n),m=S.PORS[i];
 for(const dt of [1/30,1/60,1/120]){const b=run(i,dt,'brake');console.log(n,m[6],'dt',dt.toFixed(4),'100->0 brake',b.t.toFixed(2),'s',b.d.toFixed(1),'m');}
 console.log(n,'reverse speed after 10 s (km/h):',run(i,1/60,'rev').v.toFixed(1))}
// 0-100 frame-rate independence
for(const dt of [1/30,1/60,1/120]){const a=sim(idx('Ford Focus RS'),dt,{maxT:30,input:()=>({w:true,s:false,hb:false})});console.log('Focus RS 0-100 dt',dt.toFixed(4),a.t100.toFixed(2),'vmax',a.vmax.toFixed(1))}
// hills: coast-down distance from 100 km/h on the steepest grade, uphill vs downhill (headings by gradient)
function onSlope(i,sgn,dt){const gx=(S.groundH(best.x+5,best.z)-S.groundH(best.x-5,best.z))/10,gz=(S.groundH(best.x,best.z+5)-S.groundH(best.x,best.z-5))/10;
 S.setPlayerCar(i);P.x=best.x;P.z=best.z;P.h=Math.atan2(sgn*gx,sgn*gz);P.vx=P.vz=P.vy=0;P.y=P.pgh=S.groundH(P.x,P.z);P.gnd=true;k.KeyW=k.KeyS=k.Space=false;return {gx,gz}}
// stationary on slope: place car on the steepest road within 3 km of Al-Balad, no input
let best=null;for(let x=-3000;x<3000;x+=40)for(let z=-3000;z<3000;z+=40){if(Math.hypot(x+2360,z-240)<300)continue;const g=Math.hypot(S.groundH(x+5,z)-S.groundH(x-5,z),S.groundH(x,z+5)-S.groundH(x,z-5))/10;if(!best||g>best.g)best={x,z,g}}
console.log('steepest 3 km cell grade',(best.g*100).toFixed(1)+'%');

const gz0=(x,z)=>S.groundH(x,z);
onSlope(idx('Ford Focus RS'),1,1/60);let t=0;const p0=[P.x,P.z];
for(let n=0;n<60*5;n++){S.updP(1/60,false)}
console.log('parked on steepest cell, no input, 5 s: moved',Math.hypot(P.x-p0[0],P.z-p0[1]).toFixed(1),'m speed',(Math.hypot(P.vx,P.vz)*3.6).toFixed(1),'km/h y-gnd',(P.y-gz0(P.x,P.z)).toFixed(2));
onSlope(idx('Ford Focus RS'),1,1/60);k.Space=true;for(let n=0;n<60*5;n++)S.updP(1/60,false);k.Space=false;
console.log('same with handbrake: speed',(Math.hypot(P.vx,P.vz)*3.6).toFixed(2),'km/h');
for(const [lab,sg] of [['uphill',1],['downhill',-1]]){onSlope(idx('Ford Focus RS'),sg,1/60);k.KeyW=true;let tt=0,v100=null;for(let n=0;n<60*20;n++){S.updP(1/60,false);tt+=1/60;const v=Math.hypot(P.vx,P.vz)*3.6;if(v100===null&&v>=100)v100=tt}k.KeyW=false;console.log('full throttle 20 s',lab,'0-100 at',v100&&v100.toFixed(2),'s, speed after 20 s',(Math.hypot(P.vx,P.vz)*3.6).toFixed(0),'km/h')}
