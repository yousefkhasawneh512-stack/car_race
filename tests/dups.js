const acorn=require('acorn'),fs=require('fs');
const order=fs.readFileSync('build.py','utf8').match(/order=\[([^\]]+)\]/)[1].match(/'([^']+)'/g).map(s=>s.slice(1,-1));
const seen=new Map();
function names(p,out){if(!p)return;if(p.type==='Identifier')out.push(p.name);else if(p.type==='ObjectPattern')p.properties.forEach(q=>names(q.value||q.argument,out));else if(p.type==='ArrayPattern')p.elements.forEach(q=>names(q,out));else if(p.type==='AssignmentPattern')names(p.left,out);else if(p.type==='RestElement')names(p.argument,out)}
for(const f of order){if(!f.endsWith('.js'))continue;if(f==='03a_net_data.js')continue;const src=fs.readFileSync('parts/'+f,'utf8');let ast;try{ast=acorn.parse(src,{ecmaVersion:2022,sourceType:'script',allowReturnOutsideFunction:true})}catch(e){console.log('PARSE',f,e.message);continue}
 const walk=(body,top)=>{for(const n of body){let ns=[];if(n.type==='VariableDeclaration'&&n.kind!=='var')n.declarations.forEach(d=>names(d.id,ns));else if(n.type==='FunctionDeclaration'||n.type==='ClassDeclaration')ns.push(n.id.name);
  else if(n.type==='VariableDeclaration')n.declarations.forEach(d=>names(d.id,ns));
  for(const nm of ns){if(seen.has(nm)&&seen.get(nm)!==f)console.log('DUP',nm,seen.get(nm),'+',f);else if(seen.get(nm)===f&&n.type!=='FunctionDeclaration')console.log('DUP-SAME',nm,f);seen.set(nm,f)}}};
 walk(ast.body);
 // block-level declarations at top (inside bare blocks) are not global: skip
}
