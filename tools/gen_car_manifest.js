// Generates manifest/cars.json and manifest/world_objects.json FROM THE BUILT GAME (single source of truth: 07c/07e config).
// usage: node tools/gen_car_manifest.js dist/irbid-drive.html
const fs=require('fs'),path=require('path');global.THREE=require(path.resolve('node_modules/three'));
const noop=new Proxy(function(){},{get:()=>noop,apply:()=>noop,set:()=>true});
THREE.WebGLRenderer=class{constructor(){this.domElement={style:{},insertAdjacentElement(){}};this.shadowMap={}}setPixelRatio(){}setSize(){}render(){}};
const el=()=>({getContext:()=>new Proxy(noop,{get:(t,k)=>k==='measureText'?(q=>({width:String(q).length*14})):t[k]}),appendChild(){},remove(){},style:{},dataset:{},setAttribute(){},addEventListener(){},focus(){},blur(){},select(){},value:'',children:[],classList:{add(){},remove(){},toggle(){}},set innerHTML(v){},set textContent(v){}});
global.document={getElementById:el,createElement:el,body:{appendChild(){}}};global.window=global;global.addEventListener=()=>{};
global.innerWidth=1280;global.innerHeight=720;global.devicePixelRatio=1;global.performance={now:()=>0};global.requestAnimationFrame=()=>{};global.setTimeout=()=>{};
global.localStorage={getItem:()=>null,setItem(){}};const log=console.log;console.log=()=>{};
const html=fs.readFileSync(process.argv[2]||'dist/irbid-drive.html','utf8');
(0,eval)(html.match(/<script>\n([\s\S]*?)<\/script>/)[1]+';global.__s={PORS,carSpec,OBJ_CLASS,RARN,rarityIdx,COL,objClass};');
const S=global.__s;console.log=log;
const KIND={c:'coupe/saloon',m:'mid-engine supercar',o:'open roadster',q:'mid-engine spider',s:'SUV',p:'pickup',r:'race car',v:'vintage',h:'hatchback'};
const cars=S.PORS.map((m,i)=>{const s=S.carSpec(i);return{
 name:m[0],index:i,body_type:KIND[m[6]]||m[6],rarity:S.RARN[S.rarityIdx(i)],game_stats:{top_speed_kmh:m[1],zero_100_s:m[2],length_m:m[3],width_m:m[4],height_m:m[5]},
 model:{asset:'procedural (07a_cars.js mkPorsche: extruded body profile + glass + lights + 4 wheels)',source_url:null,creator:'Irbid Drive (generated)',licence:'project code',
  verification:'approximation: dimensions from game data, shape is a generic body profile per body type; NOT an exact model of this car',
  licensed_3d_model:'none sourced — needs owner-approved licensed GLB (see AUDIT_REPORT.md: Sketchfab download needs the owner account; single-file/offline rule)'},
 damage_regions:['zones fl/fr/l/r/rl/rr/roof/underbody','body mesh dents (player car, tessellated on first dent)','headlights L/R','tail lights L/R','windscreen/rear screen/side windows (crack decals)','4 wheels (flat / camber / toe)'],
 mass_kg:s.mass,mass_source:s.massSrc,drivetrain:s.drive,drivetrain_source:s.driveSrc,engine_position:{F:'front',M:'mid',R:'rear'}[s.eng],engine_position_source:s.engSrc,
 electric:s.ev,air_cooled:s.air,front_weight_share:+s.fw.toFixed(2),cg_height_m:+s.hcg.toFixed(2),wheelbase_m:+s.wb.toFixed(2),track_m:+s.tr.toFixed(2),
 durability_index:s.durability,crush_model:{b0_kmh_front_rear_side:s.b0,b1_kmh_per_cm_front_rear_side:s.b1.map(v=>+v.toFixed(3)),zero_health_crush_cm_front_rear_side:s.maxC,
  thresholds_kmh:{scratch:s.thr[0],light_break:s.thr[1],glass_crack:s.thr[2]}},
 component_durability:Object.fromEntries(Object.entries(s.comp).map(([k,v])=>[k,+v.toFixed(3)])),tyres:{wear_durability:s.tyre.dur,heat_sensitivity:s.tyre.heat},
 per_wheel_state:'runtime: tread %, carcass %, temperature C, puncture, wear by cause (burnout/slide/spin/lock/road); saved per car in localStorage irbid-drive-realism-v1',
 repair:'free (economy unchanged)',data_status:'gameplay estimates unless *_source says doc; no manufacturer crash data'}});
const cnt={};for(const L of S.COL.values())for(const c of L){const k=c.type||(c.r!==undefined?'structure (untyped circle)':'solid (untyped box)');cnt[k]=(cnt[k]||new Set()).add(c)}
const objects=Object.entries(S.OBJ_CLASS).map(([type,c])=>({type,class:c.cls,label:c.label,material:c.material,mass_kg:c.mass??null,
 break_speed_ms_for_1500kg:c.breakAt??null,break_energy_kJ:c.breakAt?+(.5*1500*c.breakAt*c.breakAt/1000).toFixed(1):null,bend_from_fraction_of_break_energy:c.bend??null,
 collision_model:type==='vehicle'?'circle r 3.4 m (traffic/bots)':type==='speedBump'?'crossing test (07c)':'COL hash: circle or oriented box',
 visual_damage:c.cls==='breakable'?'leans (bend) / falls + debris (break); lamp arm, head, light pool and sign plate follow':c.cls==='movable'?'slides, may tip over; collider re-added where it stops':'none (rigid)',
 count_in_world:cnt[type]?cnt[type].size:null,data_status:'estimate'}));
fs.mkdirSync('manifest',{recursive:true});
fs.writeFileSync('manifest/cars.json',JSON.stringify({generated_by:'tools/gen_car_manifest.js from the built game',count:cars.length,cars},null,1));
fs.writeFileSync('manifest/world_objects.json',JSON.stringify({generated_by:'tools/gen_car_manifest.js from the built game',untyped_colliders:Object.fromEntries(Object.entries(cnt).filter(([k])=>/untyped/.test(k)).map(([k,v])=>[k,v.size])),objects},null,1));
const dr={};cars.forEach(c=>dr[c.drivetrain+' '+c.drivetrain_source.split(' ')[0]]=(dr[c.drivetrain+' '+c.drivetrain_source.split(' ')[0]]||0)+1);
console.log('cars',cars.length,JSON.stringify(dr),'objects',objects.map(o=>o.type+':'+o.count_in_world).join(' '));
