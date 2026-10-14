require('./hbase.js');
const S=global.__s,P=S.P,run=n=>{for(let i=0;i<n;i++)global.cb(global.t+=16.667)};
console.log('lit junctions',S.LIT.map(n=>n.id+'('+Math.round(n.x)+','+Math.round(n.z)+')').join(' '));
// duel debug
run(120);S.warp(S.START.x,S.START.z,S.START.h);run(30);S.traffic[0].x=P.x+3;S.traffic[0].z=P.z+1;const nc=S.nearCar();S.startDuel(nc);const rv=S.riv();
console.log('dest',S.race.dest.map(Math.round),'player',Math.round(P.x),Math.round(P.z),'rival',Math.round(rv.x),Math.round(rv.z),'path pts',rv.P.length,'path len',Math.round(rv.C[rv.C.length-1]));
S.keys.KeyW=1;for(let s=0;s<16;s++){run(60);const w=S.race.dest;console.log(s+1,S.race.s,'rival',Math.round(rv.x),Math.round(rv.z),'v',Math.round(rv.v*3.6),'pi',rv.pi,'/',rv.P.length,'dist',Math.round(Math.hypot(w[0]-rv.x,w[1]-rv.z)),'fin',rv.fin,'| me',Math.round(P.x),Math.round(P.z),Math.round(Math.hypot(P.vx,P.vz)*3.6))}
