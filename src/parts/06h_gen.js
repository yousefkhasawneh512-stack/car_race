// ====== IRBID 1000+ MAXIMUM PLACE PROCEDURAL GENERATOR ENGINE ======
const irbidNeighborhoods = [
  { name: "Al-Balad Old Core", tags: ["Traditional Souk", "Historic Alley", "Local Dukkan", "Old Barber", "Traditional Bakery"] },
  { name: "University Street Corridor", tags: ["Student Cafe", "Shawarma Hub", "Tech Shop", "Boutique Lounge", "Bookstore Kiosk"] },
  { name: "Petra Street Highway Expansion", tags: ["Premium EV Showroom", "Modern Villa Side", "Luxury Diner", "Automotive Car Lot"] },
  { name: "Thalatheen Street Inner Beltway", tags: ["Automotive Parts Depot", "Pet Supply Store", "Local Bakery", "Tire Alignment Yard"] },
  { name: "Al-Hai Al-Gharbi District", tags: ["Family Restaurant", "Residential Grocer", "Local Barber", "Medical Clinic Entry"] },
  { name: "Al-Barha Cluster", tags: ["Ground-Floor Dukkan", "Corner Salon", "Neighborhood Market", "Local Roastery"] },
  { name: "Al-Nuzha Sector", tags: ["Community Grocery", "Fenced Football Cage", "Public School Block", "Asphalt Playground Corner"] },
  { name: "Aidun Suburbs", tags: ["Detached Limestone Villa", "Suburban Fitness Hub", "Fresh Produce Stand", "Family Park Lane"] }
];
const businessTypes = ["Dukkan","Shawarma","Roastery","Supermarket","Barber Shop","Salon","Cafe","Auto Parts","Car Showroom","Bakery","Falafel Spot","Pet Supply","Boutique","Gym Branch","Pharmacy","Electronics Shop","Juice Bar","Pizzeria","Hardware Depot"];
const familyNames = ["Abu Ahmad","Al-Barakah","Al-Rayan","Al-Huda","Abu Khaled","Al-Ameen","Al-Noor","Al-Waha","Al-Mustaqbal","Al-Sultan","Arafa","Al-Quds","Abu Ali"];
function generate1000PlusIrbidPlaces() {
  const proceduralPlaces = [];
  let placeCounter = 1;
  proceduralPlaces.push(
    { id: "Medeenat_Al_Hasan", name: "Medeenat Al-Hasan (Al-Hassan Sports City)", zone: "Eastern Municipal Districts", type: "Major Sports Complex & Drifting Arena" },
    { id: "Hydrogen_Plus_Gym", name: "Hydrogen Plus Fitness & Spa (Hydrogym)", zone: "Irbid-Al Hisn Road", type: "Premium Aquatic Fitness Hub" },
    { id: "Oxygen_Gym", name: "Oxygen Gym", zone: "University Street District", type: "Mega Fitness Center" },
    { id: "Power_House_Gym", name: "Power House Gym", zone: "Thalatheen Street Corridor", type: "Hardcore Weight Training Center" },
    { id: "Corner_Salon", name: "Corner Salon for Men", zone: "Map Intersection Corner", type: "Local Barber Landmark" }
  );
  while (proceduralPlaces.length < 1050) {
    const neighborhood = irbidNeighborhoods[placeCounter % irbidNeighborhoods.length];
    const type = businessTypes[placeCounter % businessTypes.length];
    const namePattern = familyNames[placeCounter % familyNames.length];
    proceduralPlaces.push({ id: `procedural_poi_${placeCounter}`, name: `${type} ${namePattern} (Spot #${placeCounter})`, zone: neighborhood.name, type: neighborhood.tags[placeCounter % neighborhood.tags.length] });
    placeCounter++;
  }
  return proceduralPlaces;
}
const maximumIrbidPlaces = generate1000PlusIrbidPlaces();
// ---- game-side: business type -> building category, then placed by zone like the rest of the pack ----
const GEN_CAT={'Dukkan':'dukkan','Shawarma':'food','Roastery':'cafe','Supermarket':'dukkan','Barber Shop':'salon','Salon':'salon','Cafe':'cafe','Auto Parts':'auto','Car Showroom':'dealer','Bakery':'food','Falafel Spot':'food','Pet Supply':'pet','Boutique':'dukkan','Gym Branch':'gym','Pharmacy':'medical','Electronics Shop':'dukkan','Juice Bar':'cafe','Pizzeria':'food','Hardware Depot':'dukkan'};
// ---- v30: each generated business goes to the district/street where that kind of shop really sits (no more round-robin zones).
// zone strings must match ZRULES in 06g_pack.js; the 2nd item is the descriptor shown in the place's `sub`; fb = streets used if the district is full.
const GF_RES=['Al-Hurriya Street','Al-Rawda Street','Al-Zahra Street','Al-Andalus Street','Al-Salam Street','Al-Quds Street','Al-Hai Street','Al-Wehdat Street','Al-Thawra Street','Aidun Garden Street'],GF_COM=['University Street','Baghdad Street','Palestine Street','King Hussein Street','King Abdullah II Street','Al-Tijari Street'],GF_AUTO=['Thalatheen Street','Hakama Street','Al-Sareeh Road','Petra Street'],GF_DEAL=['Petra Street','Amman–Irbid Highway (Route 35)','King Hussein Street','Al-Sareeh Road','Hakama Street'],GF_SOUQ=['Palestine Street','Baghdad Street','Souq Al-Balad Lane','Al-Hammam Lane','Al-Khabbaz Lane','Old Mosque Lane','Clock Tower Lane','Al-Sagha Lane'];
const Z_BAL='Al-Balad Old Core',Z_UNI='University Street Student Strip',Z_UNC='University Street Corridor',Z_PET='Petra Street Highway Expansion',Z_HIG='Amman–Irbid Highway Corridor',Z_THA='Thalatheen Street Inner Beltway',Z_HAK='Hakama Industrial Strip',Z_HAI='Al-Hai Al-Gharbi District',Z_BAR='Al-Barha Cluster',Z_NUZ='Al-Nuzha Sector',Z_AID='Aidun Suburbs';
const GEN_FIT={
 'Dukkan':{z:[[Z_BAL,'Local Dukkan'],[Z_BAR,'Ground-Floor Dukkan'],[Z_NUZ,'Community Grocery'],[Z_HAI,'Residential Grocer'],[Z_AID,'Fresh Produce Stand']],fb:GF_RES},
 'Supermarket':{z:[[Z_HAI,'Neighborhood Market'],[Z_AID,'Neighborhood Market'],[Z_BAR,'Neighborhood Market']],fb:GF_RES},
 'Shawarma':{z:[[Z_UNI,'Shawarma Hub'],[Z_BAL,'Traditional Souk'],[Z_UNC,'Shawarma Hub']],fb:GF_COM},
 'Falafel Spot':{z:[[Z_BAL,'Traditional Souk'],[Z_UNI,'Shawarma Hub'],[Z_BAL,'Historic Alley']],fb:GF_SOUQ},
 'Bakery':{z:[[Z_BAL,'Traditional Bakery'],[Z_THA,'Local Bakery'],[Z_HAI,'Local Bakery'],[Z_BAR,'Local Bakery']],fb:GF_RES},
 'Roastery':{z:[[Z_BAR,'Local Roastery'],[Z_UNI,'Student Cafe'],[Z_PET,'Local Roastery']],fb:GF_COM},
 'Cafe':{z:[[Z_UNI,'Student Cafe'],[Z_UNI,'Student Cafe'],[Z_PET,'Luxury Diner'],[Z_BAL,'Historic Alley']],fb:GF_COM},
 'Juice Bar':{z:[[Z_UNI,'Student Cafe'],[Z_BAL,'Traditional Souk'],[Z_UNC,'Student Cafe']],fb:GF_COM},
 'Pizzeria':{z:[[Z_UNI,'Shawarma Hub'],[Z_PET,'Luxury Diner'],[Z_HAI,'Family Restaurant']],fb:GF_COM},
 'Barber Shop':{z:[[Z_BAL,'Old Barber'],[Z_HAI,'Local Barber'],[Z_BAR,'Corner Salon'],[Z_NUZ,'Local Barber']],fb:GF_RES},
 'Salon':{z:[[Z_BAR,'Corner Salon'],[Z_HAI,'Local Barber'],[Z_UNC,'Boutique Lounge'],[Z_AID,'Corner Salon']],fb:GF_RES},
 'Boutique':{z:[[Z_UNC,'Boutique Lounge'],[Z_BAL,'Traditional Souk'],[Z_PET,'Boutique Lounge']],fb:GF_COM},
 'Electronics Shop':{z:[[Z_UNC,'Tech Shop'],[Z_UNI,'Tech Shop'],[Z_BAL,'Traditional Souk']],fb:GF_COM},
 'Pharmacy':{z:[[Z_HAI,'Medical Clinic Entry'],[Z_UNC,'Medical Clinic Entry'],[Z_BAL,'Medical Clinic Entry'],[Z_AID,'Medical Clinic Entry']],fb:GF_COM},
 'Gym Branch':{z:[[Z_UNC,'Fitness Branch'],[Z_AID,'Suburban Fitness Hub'],[Z_HAI,'Fitness Branch']],fb:GF_COM},
 'Pet Supply':{z:[[Z_THA,'Pet Supply Store']],fb:['Thalatheen Street','Al-Hai Al-Gharbi Road']},
 'Auto Parts':{z:[[Z_THA,'Automotive Parts Depot'],[Z_HAK,'Automotive Parts Depot'],[Z_THA,'Tire Alignment Yard']],fb:GF_AUTO},
 'Hardware Depot':{z:[[Z_THA,'Hardware Depot'],[Z_HAK,'Hardware Depot']],fb:GF_AUTO},
 'Car Showroom':{z:[[Z_PET,'Premium EV Showroom'],[Z_PET,'Automotive Car Lot'],[Z_HIG,'Automotive Car Lot'],[Z_PET,'Automotive Car Lot']],fb:GF_DEAL}};
const genFit=(bt,sn)=>{const f=GEN_FIT[bt];if(!f)return null;const e=f.z[Math.floor(sn/businessTypes.length)%f.z.length];return{zone:e[0],type:e[1],fbr:f.fb}};
const GEN_FAIL=[];let GEN_OK=0;
function runGen(){
 // the hand-locked landmarks: existing venues are reused, new ones are built
 const have=n=>PLACES.some(p=>p.name===n);
 for(const it of maximumIrbidPlaces.slice(0,5)){
  if(have(it.name))continue;
  if(it.id==='Medeenat_Al_Hasan'){addPlace(it.name,SC[0],SC[1],{r:8,kind:'stadium',sub:it.type+' · '+it.zone,tp:tpRoad('Al-Hassan Sports City Road',SC[0],SC[1]),tour:false,ax:SC[0],az:SC[1]-DZR});continue}
  try{gymBuild({name:it.name,type:it.type,zone:it.zone});GEN_OK++}catch(e){GEN_FAIL.push(it.name+': '+e.message)}}
 const L=maximumIrbidPlaces.slice(5).filter(it=>!it.name.startsWith('Supermarket ')).map(it=>{const bt=businessTypes.find(b=>it.name.startsWith(b+' '));const ft=genFit(bt,+(it.name.match(/#(\d+)/)||[0,0])[1]);return{name:it.name,type:ft?ft.type:it.type,zone:ft?ft.zone:it.zone,cat:GEN_CAT[bt]||'dukkan',gen:true,fbr:ft?ft.fbr:undefined}});
 const ord=c=>({dealer:0,medical:1,auto:2,gym:2}[c]??3);L.sort((a,b)=>ord(a.cat)-ord(b.cat));
 for(const it of L){try{packShop(it);GEN_OK++}catch(e){GEN_FAIL.push(it.name+': '+e.message)}}}
runGen();
