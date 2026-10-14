// ---- traffic spawn system: 5-tier vehicle database + per-zone spawn weights ----
const NRACE=PORS.length; // racers and duel rivals only come from the original sports catalogue
const TMODELS=[ // [name, top km/h, 0-100 s, length, width, height, body kind] (approximate production figures)
['Toyota Prius',180,10.5,4.6,1.78,1.43,'h'],['Toyota Camry Hybrid',210,8,4.88,1.84,1.45,'c'],['Toyota Corolla',190,10.5,4.63,1.78,1.43,'c'],['Toyota Yaris',170,11.5,3.95,1.7,1.5,'h'],['Toyota Hilux',175,10.5,5.33,1.86,1.82,'p'],['Toyota RAV4 Hybrid',180,8.1,4.6,1.86,1.7,'s'],
['Hyundai Avante',195,10,4.65,1.8,1.43,'c'],['Hyundai Elantra',200,9.5,4.68,1.83,1.42,'c'],['Hyundai Accent',180,11,4.5,1.73,1.45,'c'],['Hyundai Sonata Hybrid',210,8.5,4.9,1.86,1.45,'c'],['Hyundai Ioniq Hybrid',185,10.8,4.47,1.82,1.45,'h'],['Hyundai Tucson',195,9.5,4.5,1.87,1.65,'s'],['Hyundai Santa Fe',200,9.8,4.78,1.9,1.69,'s'],
['Kia Sephia',170,12.5,4.4,1.7,1.4,'c'],['Kia Picanto',160,12.5,3.6,1.6,1.49,'h'],['Kia Cerato',195,10,4.64,1.8,1.44,'c'],['Kia Forte',195,10,4.64,1.8,1.44,'c'],['Kia Optima',210,9,4.85,1.86,1.47,'c'],['Kia K5 Hybrid',210,8.5,4.9,1.86,1.45,'c'],['Kia Niro',180,10,4.4,1.8,1.55,'s'],['Kia Sportage',195,9.8,4.5,1.87,1.65,'s'],['Kia K3 EV',170,10,4.65,1.8,1.45,'c'],
['Nissan Sunny',175,11.5,4.5,1.7,1.5,'c'],['Nissan Altima',210,8.2,4.9,1.85,1.45,'c'],['Nissan Leaf EV',150,7.9,4.49,1.79,1.54,'h'],['Ford Fusion Hybrid',190,8.8,4.87,1.85,1.48,'c'],['Ford Escape Hybrid',180,8.7,4.6,1.88,1.7,'s'],
['Chevrolet Spark',150,12.5,3.6,1.6,1.5,'h'],['Mitsubishi Lancer',200,9.5,4.6,1.76,1.45,'c'],['Mitsubishi L200',170,11,5.3,1.8,1.78,'p'],['Volkswagen ID.4',160,8.5,4.58,1.85,1.63,'s'],['Volkswagen ID.6',160,8.5,4.88,1.85,1.65,'s'],
['BYD Song Plus EV',175,8.8,4.7,1.89,1.69,'s'],['BYD Qin Plus',185,8,4.77,1.84,1.5,'c'],['Changan Eado EV',155,9.5,4.67,1.83,1.5,'c'],['Changan Alsvin',170,11,4.5,1.7,1.5,'c'],['Geely Geometry C',150,9.5,4.4,1.8,1.6,'s'],['MG 4 EV',160,7.7,4.29,1.84,1.5,'h'],['MG 5',180,10,4.6,1.8,1.49,'c'],
['Mercedes-Benz E-Class W211',240,8.5,4.82,1.85,1.45,'c'],['Mercedes-Benz C-Class W203',230,8.9,4.53,1.73,1.43,'c'],['BMW 3 Series E46',240,8,4.47,1.74,1.42,'c'],['BMW 5 Series E60',250,7.5,4.84,1.85,1.46,'c'],
['Honda Civic',200,9,4.65,1.8,1.42,'c'],['Honda Accord',210,8.5,4.9,1.86,1.45,'c'],['Peugeot 206',180,11,3.83,1.65,1.43,'h'],['Opel Astra',200,9.5,4.4,1.8,1.5,'h'],['GMC Envoy',190,9.3,4.9,1.9,1.8,'s'],
// uncommon
['Toyota Land Cruiser LC200',190,8.9,4.95,1.98,1.95,'s'],['Toyota Prado',180,10.5,4.78,1.89,1.84,'s'],['Toyota Highlander Hybrid',190,8,4.95,1.93,1.73,'s'],['Lexus RX Hybrid',200,7.7,4.89,1.92,1.7,'s'],['Kia Sorento',205,8.5,4.8,1.9,1.7,'s'],['Hyundai Palisade',200,8.3,4.98,1.98,1.75,'s'],['Nissan Patrol',210,7.9,5.1,1.99,1.95,'s'],['Nissan Rogue',190,9.2,4.65,1.84,1.7,'s'],
['Dodge Charger',250,5.2,5,1.9,1.48,'c'],['Dodge Challenger',260,5,5,1.92,1.45,'c'],['Chevrolet Tahoe',200,7.4,5.35,2.05,1.93,'s'],['Jeep Grand Cherokee',210,7.1,4.9,1.97,1.8,'s'],['Tesla Model 3',225,5.8,4.69,1.85,1.44,'c'],['Tesla Model Y',217,5,4.75,1.92,1.62,'s'],['BMW X5',250,6,4.94,2,1.77,'s'],['Audi A4',240,7,4.76,1.84,1.43,'c'],['Audi A6',250,6.2,4.94,1.89,1.46,'c'],['Mercedes-Benz S-Class W221',250,6.5,5.08,1.87,1.48,'c'],
['Range Rover Sport',225,6.5,4.88,2,1.8,'s'],['Land Rover Defender',190,8,4.76,2.01,1.97,'s'],['BYD Han EV',200,5.5,4.99,1.91,1.54,'c'],['BYD Seal',200,5.9,4.8,1.88,1.46,'c'],['Zeekr 001',200,4.5,4.97,1.99,1.56,'h'],['Hongqi HS5',210,6.5,4.99,1.95,1.7,'s'],['GAC Emkoo',190,8,4.5,1.88,1.65,'s'],
['Mazda 3',200,8.6,4.66,1.8,1.45,'h'],['Subaru Impreza',200,9,4.48,1.78,1.45,'h'],['Renault Duster',170,10.5,4.34,1.8,1.7,'s'],['Suzuki Swift',190,9.5,3.85,1.74,1.5,'h'],['Skoda Octavia',220,8,4.69,1.83,1.47,'h'],['Volkswagen Golf Mk7',220,8,4.26,1.8,1.45,'h'],['Seat Leon',220,8,4.28,1.8,1.46,'h'],['Fiat 500',160,12,3.57,1.63,1.49,'h'],
// rare (own paint)
['Porsche Cayenne Turbo',286,4.5,4.93,1.98,1.7,'s',0x1d1d1d],['Mercedes-AMG G63',220,4.5,4.87,1.98,1.97,'s',0x111111],['Mercedes-AMG GT',310,3.8,4.55,1.94,1.29,'c',0xc7c7c7],['BMW M3 G80',290,3.5,4.79,1.9,1.43,'c',0x2ecc71],['BMW M4 G82',290,3.5,4.79,1.89,1.39,'c',0xff8c1a],['BMW i8',250,4.4,4.69,1.94,1.3,'c',0xf2f2f2],
['Audi R8 V10',330,3.1,4.43,1.94,1.24,'c',0xd62828],['Maserati Ghibli',267,5.5,4.97,1.95,1.46,'c',0x1f3f8f],['Aston Martin Vantage',313,3.6,4.46,1.94,1.27,'c',0x1f6f4a],['Bentley Continental GT',333,3.7,4.85,1.96,1.4,'c',0x222a35],['Rolls-Royce Ghost',250,4.8,5.57,1.95,1.55,'c',0x15171c],['Rolls-Royce Cullinan',250,5.2,5.34,2,1.83,'s',0xf2efe6],
['Chevrolet Corvette C8',312,2.9,4.63,1.93,1.23,'c',0xf0c000],['Lotus Emira',290,4.2,4.41,1.89,1.22,'c',0xff6a00],['Nissan GT-R R35',315,2.9,4.71,1.89,1.37,'c',0xb0b6bd],['Toyota Supra Mk5',250,4.1,4.38,1.86,1.29,'c',0xe8e8e8],['Alfa Romeo Giulia Quadrifoglio',307,3.9,4.64,1.87,1.43,'c',0xb02a2a],['Classic Mercedes 280SEL W108',190,10.5,4.9,1.8,1.45,'c',0x8a6a3c],
// drift / tuner icons added with the 5-tier rarity database
['BMW E36 M3 (Drift Spec)',250,5.9,4.43,1.71,1.34,'c',0xe9e9ec],['Mazda MX-5 Miata NA',200,8.5,3.95,1.68,1.23,'o',0xd62828],['Ford Mustang Foxbody',225,6.4,4.6,1.75,1.34,'c',0x1b1b1b],
['Toyota AE86 Trueno',190,8.4,4.2,1.63,1.31,'c',0xf2f2f2],['Nissan 350Z (Z33)',250,5.4,4.31,1.82,1.32,'c',0xff8c1a],['Subaru BRZ / Toyota GT86',226,6.3,4.24,1.78,1.29,'c',0x1f6fe0],
['Nissan Silvia S15 Spec-R',240,6,4.45,1.73,1.32,'c',0xf2f2f2],['Nissan Skyline GT-R R34 (RWD)',250,5,4.6,1.78,1.34,'c',0x2a4f9e],
['Mazda RX-7 FD3S',255,5.3,4.29,1.76,1.23,'c',0xc0392b],['Toyota Supra JZA80',250,5,4.51,1.81,1.27,'c',0xff6a00]];
const OWNC=new Set();TMODELS.forEach(m=>{if(m[7]!==undefined)OWNC.add(m[0]);PORS.push([m[0],m[1],m[2],m[3],m[4],m[5],m[6],m[7]!==undefined?m[7]:0xcccccc])});
// ---- 5-tier rarity system (common / uncommon / rare / epic / legendary): spawn chance + drift-points multiplier ----
const rarity_system_update = {
    "rarities": {
      "common": { "spawn_chance": "50%", "drift_points_multiplier": 1.0 },
      "uncommon": { "spawn_chance": "35%", "drift_points_multiplier": 1.2 },
      "rare": { "spawn_chance": "10%", "drift_points_multiplier": 1.5 },
      "epic": { "spawn_chance": "4%", "drift_points_multiplier": 2.0 },
      "legendary": { "spawn_chance": "1%", "drift_points_multiplier": 3.0 }
    },
    "updated_vehicle_database": {
      "common": [
        "Toyota Prius", "Toyota Yaris", "Toyota Corolla", "Hyundai Accent", "Hyundai Elantra", 
        "Hyundai Avante", "Kia Sephia", "Kia Picanto", "Kia Cerato", "Kia Forte", 
        "Nissan Sunny", "Chevrolet Spark", "Mitsubishi Lancer", "Peugeot 206", "Opel Astra", 
        "Changan Alsvin", "MG 5", "BMW E36 M3 (Drift Spec)", "Mazda MX-5 Miata NA", "Ford Mustang Foxbody"
      ],
      "uncommon": [
        "Toyota Camry Hybrid", "Toyota RAV4 Hybrid", "Hyundai Sonata Hybrid", "Hyundai Ioniq Hybrid", 
        "Hyundai Tucson", "Kia Optima", "Kia K5 Hybrid", "Kia Niro", "Kia Sportage", "Kia K3 EV", 
        "Nissan Altima", "Nissan Leaf EV", "Ford Fusion Hybrid", "Ford Escape Hybrid", "Mitsubishi L200", 
        "Changan Eado EV", "Geely Geometry C", "MG 4 EV", "Mazda 3", "Suzuki Swift", 
        "Skoda Octavia", "Volkswagen Golf Mk7", "Seat Leon", "Fiat 500", "Toyota AE86 Trueno", 
        "Nissan 350Z (Z33)", "Subaru BRZ / Toyota GT86"
      ],
      "rare": [
        "Toyota Prado", "Toyota Highlander Hybrid", "Lexus RX Hybrid", "Kia Sorento", "Nissan Rogue", 
        "Jeep Grand Cherokee", "Dodge Charger", "Dodge Challenger", "Audi A4", "Audi A6", 
        "Mercedes-Benz C-Class W203", "Mercedes-Benz E-Class W211", "BMW 3 Series E46", "BMW 5 Series E60", 
        "Honda Civic", "Honda Accord", "GMC Envoy", "Subaru Impreza", "Renault Duster",
        "Nissan Silvia S15 Spec-R", "Nissan Skyline GT-R R34 (RWD)"
      ],
      "epic": [
        "Toyota Land Cruiser LC200", "Hyundai Palisade", "Nissan Patrol", "Ford F-150", "Chevrolet Tahoe", 
        "Tesla Model 3", "Tesla Model Y", "BMW X5", "Mercedes-Benz S-Class W221", "Porsche Macan", 
        "BYD Song Plus EV", "BYD Qin Plus", "BYD Han EV", "BYD Seal", "Zeekr 001", "Hongqi HS5", 
        "GAC Emkoo", "Volkswagen ID.4", "Volkswagen ID.6", "Mazda RX-7 FD3S", "Toyota Supra JZA80"
      ],
      "legendary": [
        "Porsche Cayenne Turbo", "Porsche 911", "Mercedes-AMG G63", "Mercedes-AMG GT", "BMW M3 G80", 
        "BMW M4 G82", "BMW i8", "Audi R8 V10", "Lamborghini Urus", "Lamborghini Huracan", 
        "Ferrari F8 Tributo", "Maserati Ghibli", "Aston Martin Vantage", "Bentley Continental GT", 
        "Rolls-Royce Ghost", "Rolls-Royce Cullinan", "Ford Mustang GT V8", "Chevrolet Corvette C8", 
        "Lotus Emira", "Nissan GT-R R35", "Toyota Supra Mk5", "Alfa Romeo Giulia Quadrifoglio", 
        "Classic Mercedes 280SEL W108"
      ]
    }
};
const RT=['common','uncommon','rare','epic','legendary'],RARN=RT.map(t=>t[0].toUpperCase()+t.slice(1)),RMULT=RT.map(t=>rarity_system_update.rarities[t].drift_points_multiplier),RCH=RT.map(t=>parseFloat(rarity_system_update.rarities[t].spawn_chance)/100);
// zone "wealth" tilts the 50/35/10/4/1 chances (1.0 = the exact city-wide spawn chances); weight_i = chance_i * wealth^i
const ZWEALTH={Al_Balad_Old_Core:.25,University_Street:1.15,Petra_Street_Highway:1.7,Thalatheen_Beltway:1.25,Aidun_Suburb:1.35,City_Center_Mall:1.5,Campus_Zone:.9,Irbid_Default:1};
const TRAFFIC_SPAWN={spawn_rules:{},vehicle_database:rarity_system_update.updated_vehicle_database};
for(const z in ZWEALTH){const w=RCH.map((p,i)=>p*Math.pow(ZWEALTH[z],i)),s=w.reduce((a,b)=>a+b,0);TRAFFIC_SPAWN.spawn_rules[z]=w.map(x=>x/s)}
// database names -> catalogue rows (accent / spelling aliases for models the sports catalogue already had)
const ALIAS={'Lamborghini Huracan':'Lamborghini Huracán','Ford Mustang GT V8':'Ford Mustang GT','Ford F-150':'Ford F-150'};
const TPOOL=RT.map(t=>TRAFFIC_SPAWN.vehicle_database[t].map(n=>{const i=PORS.findIndex(m=>m[0]===(ALIAS[n]||n));if(i<0)throw new Error('traffic model missing: '+n);return i}));
// rarity of ANY catalogue car: database tier first, then the old wheel prizes, then (sports catalogue) by top speed; the starter stays common
const RTIER=new Map();TPOOL.forEach((pool,t)=>pool.forEach(i=>{if(!RTIER.has(i))RTIER.set(i,t)}));
const WHEEL_OLD=[['Ford Fiesta ST','Ford Escort','Ford Focus'],['Ford Mustang GT','Ford Taurus SHO','Lamborghini Urraco'],['Ferrari 360 Modena','Lamborghini Gallardo','Ford F-150 Raptor'],['Ferrari 458 Italia','Lamborghini Aventador','Ford GT'],['Ferrari LaFerrari','Lamborghini Revuelto','Ferrari 250 GTO']];
WHEEL_OLD.forEach((L,t)=>L.forEach(n=>{const i=PORS.findIndex(m=>m[0]===n);if(i>=0&&!RTIER.has(i))RTIER.set(i,t)}));
{const i=PORS.findIndex(m=>m[0]==='Ford Focus RS');if(i>=0)RTIER.set(i,0)}
function rarityIdx(i){let t=RTIER.get(i);if(t===undefined){const v=PORS[i][1];t=v>=320?4:v>=290?3:v>=255?2:v>=215?1:0;RTIER.set(i,t)}return t}
const TCOL=[0xf2f2f2,0xf2f2f2,0xf2f2f2,0xc9ccd1,0xc9ccd1,0x8d9299,0x8d9299,0x1b1d21,0x1b1d21,0x2a4f9e,0xa63030,0xd8cdb4,0x3f6b4a,0x5a3d2a];

// which spawn rule applies where: street first, then neighbourhood
function trafficZone(x,z,e){const dn=distName(x,z);
 if(dn==='Al-Balad')return'Al_Balad_Old_Core';
 if(e&&(ZR_PET(e)||e.kind==='hw'))return'Petra_Street_Highway';
 if(dn==='University Street'||(e&&ZR_UNI(e)))return'University_Street';
 if(e&&ZR_THA(e))return'Thalatheen_Beltway';
 if(dn==='Aidun')return'Aidun_Suburb';if(dn==='Petra Street')return'Petra_Street_Highway';
 if(dn==='Arabella Mall'||(e&&ZR_KAB(e))||Math.hypot(x-CCP.x,z-CCP.z)<170)return'City_Center_Mall';if(dn==='Eastern Municipal District')return'Aidun_Suburb';
 if(dn==='Yarmouk University'||dn==='JUST'||dn==='Jadara University'||dn==='Irbid National University')return'Campus_Zone';
 return'Irbid_Default'}
function rollTraffic(zone){const w=TRAFFIC_SPAWN.spawn_rules[zone]||TRAFFIC_SPAWN.spawn_rules.Irbid_Default;let r=Math.random(),t=0;while(t<4&&r>=w[t]){r-=w[t];t++}const pool=TPOOL[t];return{tier:t,idx:pool[hi(pool.length)]}}
// one prototype per model (geometry shared); paint variants are clones with the body material swapped
const MESHC=new Map(),PAINT=new Map(),PROTO_COL=0xfe00fe;
const paintMat=c=>{let m=PAINT.get(c);if(!m){m=carPaint(c,0);PAINT.set(c,m)}return m};
function carMesh(idx,col){let p=MESHC.get(idx);if(!p){p=mkPorsche(idx,1,PROTO_COL);scene.remove(p);MESHC.set(idx,p)}const g=p.clone(),pm=paintMat(col);addNeon(g,idx,rarityIdx(idx)>=1);g.traverse(o=>{if(o.isMesh&&o.material.color&&o.material.color.getHex()===PROTO_COL)o.material=pm});scene.add(g);return g}
function setTrafficModel(c,zone){const r=rollTraffic(zone),col=r.tier>=2&&(r.idx<NRACE||OWNC.has(PORS[r.idx][0]))?PORS[r.idx][7]:TCOL[hi(TCOL.length)];
 if(c.idx!==r.idx||c.col!==col){if(c.m&&c.m.parent)scene.remove(c.m);c.m=carMesh(r.idx,col);c.idx=r.idx;c.col=col}
 c.tier=r.tier;c.zone=zone;c.cru=r.tier>=3?R(1,1.3):r.tier===2?R(.98,1.25):r.tier===1?R(.9,1.15):R(.85,1.1)}
