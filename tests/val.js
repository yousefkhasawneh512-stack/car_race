const fs=require('fs');const SP=__dirname;
const src=['03_world_data.js','04_graph.js'].map(f=>fs.readFileSync(SP+'/../src/parts/'+f,'utf8')).join('\n')+'\n;globalThis.__W={RDS,EDGES,NODES,HASH,CIRC,NP,roadAt,route,nearNode,U,UL};';
(0,eval)(src);const W=globalThis.__W;
console.log('roads',W.RDS.length,'edges',W.EDGES.length,'nodes',Object.keys(W.NODES).length);
let tot=0;W.EDGES.forEach(e=>tot+=e.len);console.log('total road km',(tot/1000).toFixed(1));
const shares=(a,b)=>a.a===b.a||a.a===b.b||a.b===b.a||a.b===b.b;
const seen={};const issues=[];
const inter=(s,t)=>{const d=(s.x1-s.x0)*(t.z1-t.z0)-(s.z1-s.z0)*(t.x1-t.x0);if(Math.abs(d)<1e-9)return null;const u=((t.x0-s.x0)*(t.z1-t.z0)-(t.z0-s.z0)*(t.x1-t.x0))/d,v=((t.x0-s.x0)*(s.z1-s.z0)-(t.z0-s.z0)*(s.x1-s.x0))/d;if(u>=0&&u<=1&&v>=0&&v<=1)return[s.x0+u*(s.x1-s.x0),s.z0+u*(s.z1-s.z0)];return null};
for(const [k,L] of W.HASH){for(let i=0;i<L.length;i++)for(let j=i+1;j<L.length;j++){const s=L[i],t=L[j];if(s.e===t.e)continue;const key=Math.min(s.e.id,t.e.id)+'-'+Math.max(s.e.id,t.e.id);
 const x=inter(s,t);if(x){if(shares(s.e,t.e))continue;(seen[key]=seen[key]||{k:'CROSS',a:s.e.name+'#'+s.e.id,b:t.e.name+'#'+t.e.id,at:x.map(Math.round)})}
 else if(!shares(s.e,t.e)){const mx=(s.x0+s.x1)/2,mz=(s.z0+s.z1)/2,nx=(t.x0+t.x1)/2,nz=(t.z0+t.z1)/2;if(Math.hypot(mx-nx,mz-nz)<(s.e.w+t.e.w)/2*.7)(seen['o'+key]=seen['o'+key]||{k:'OVERLAP',a:s.e.name+'#'+s.e.id,b:t.e.name+'#'+t.e.id,at:[Math.round(mx),Math.round(mz)]})}}}
const out=Object.values(seen);console.log('issues',out.length);out.slice(0,60).forEach(o=>console.log(o.k,o.a,'x',o.b,'@',o.at.join(',')));
// dead ends / degree summary
const dead=Object.values(W.NODES).filter(n=>n.deg===1).map(n=>n.id+'('+Math.round(n.x)+','+Math.round(n.z)+')');console.log('dead ends',dead.length,dead.join(' '));
// connectivity from Nabulsi
const start='N45',vis=new Set([start]),q=[start];while(q.length){const u=q.shift();for(const o of W.NODES[u].out){const v=o.d>0?o.e.b:o.e.a;if(!vis.has(v)){vis.add(v);q.push(v)}}}
console.log('reachable nodes from N45',vis.size,'/',Object.keys(W.NODES).length,'unreachable:',Object.keys(W.NODES).filter(n=>!vis.has(n)).join(' '));
require('fs').writeFileSync(SP+'/roads.json',JSON.stringify({edges:W.EDGES.map(e=>({n:e.name,w:e.w,k:e.kind,p:e.pts.filter((_,i)=>i%2===0||i===e.pts.length-1).map(p=>[Math.round(p[0]),Math.round(p[1])])})),circ:W.CIRC}));
