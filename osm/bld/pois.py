# real named shops/amenities from the BBBike GeoPackage -> bb/pois.json  [x*10,z*10,kind,name,nameEn,label]
import sqlite3,re,json,math
from pyproj import Transformer
from shapely import wkb
T=Transformer.from_crs("EPSG:4326","+proj=tmerc +lat_0=32.55 +lon_0=35.85 +k=1 +x_0=0 +y_0=0 +datum=WGS84 +units=m",always_xy=True)
def gp(b):
    fl=b[3];env={0:0,1:32,2:48,3:48,4:64}[(fl>>1)&7];return wkb.loads(bytes(b[8+env:]))
def tags(ot):return {k:v for k,v in re.findall(r'"([^"]+)"=>"((?:[^"\\]|\\.)*)"',ot or '')}
SHOPK={'supermarket':('grocery','Supermarket'),'mall':('mall','Mall'),'convenience':('dukkan','Convenience store'),'general':('dukkan','General store'),'kiosk':('dukkan','Kiosk'),'greengrocer':('dukkan','Greengrocer'),'butcher':('dukkan','Butcher'),'deli':('dukkan','Deli'),
 'bakery':('food','Bakery'),'pastry':('food','Pastry shop'),'confectionery':('food','Sweets'),'coffee':('cafe','Coffee shop'),'tea':('cafe','Tea shop'),'ice_cream':('food','Ice cream'),
 'hairdresser':('barber','Hairdresser / barber'),'barber':('barber','Barber'),'beauty':('barber','Beauty salon'),'cosmetics':('barber','Cosmetics'),
 'optician':('medical','Optician'),'chemist':('medical','Pharmacy'),'medical_supply':('medical','Medical supplies'),
 'car':('dealer','Car dealer'),'car_repair':('auto','Car repair'),'car_parts':('auto','Car parts'),'tyres':('auto','Tyres'),'motorcycle':('auto','Motorcycles'),
 'pet':('pet','Pet shop'),'pet_grooming':('pet','Pet grooming'),
 'mobile_phone':('dukkan','Mobile phones'),'computer':('dukkan','Computers'),'electronics':('dukkan','Electronics'),'clothes':('dukkan','Clothes'),'shoes':('dukkan','Shoes'),'gift':('dukkan','Gifts'),'florist':('dukkan','Florist'),'hardware':('dukkan','Hardware'),
 'books':('dukkan','Books'),'jewelry':('dukkan','Jewellery'),'kitchen':('dukkan','Kitchenware'),'toys':('dukkan','Toys'),'furniture':('dukkan','Furniture'),'bed':('dukkan','Beds'),'video_games':('dukkan','Video games'),'bag':('dukkan','Bags'),'boutique':('dukkan','Boutique'),
 'fashion_accessories':('dukkan','Accessories'),'perfumery':('dukkan','Perfumery'),'printer_ink':('dukkan','Printing'),'houseware':('dukkan','Houseware'),'sports':('dukkan','Sports goods'),'stationery':('dukkan','Stationery'),'travel_agency':('dukkan','Travel agency'),
 'yes':('dukkan','Shop'),'outdoor':('dukkan','Shop'),'variety_store':('dukkan','Variety store'),'department_store':('dukkan','Department store'),'fabric':('dukkan','Fabric'),'curtain':('dukkan','Curtains'),'carpet':('dukkan','Carpets'),'tobacco':('dukkan','Tobacco'),'copyshop':('dukkan','Copy shop'),'laundry':('dukkan','Laundry'),'dry_cleaning':('dukkan','Dry cleaning'),'mobile_phone_accessories':('dukkan','Phone accessories'),'photo':('dukkan','Photo'),'gas':('dukkan','Gas'),'tailor':('dukkan','Tailor'),'doityourself':('dukkan','DIY'),'paint':('dukkan','Paint'),'electrical':('dukkan','Electrical'),'lighting':('dukkan','Lighting'),'musical_instrument':('dukkan','Music'),'wholesale':('dukkan','Wholesale'),'second_hand':('dukkan','Second hand'),'baby_goods':('dukkan','Baby goods'),'art':('dukkan','Art'),'craft':('dukkan','Craft'),'sewing':('dukkan','Sewing'),'locksmith':('dukkan','Locksmith'),'storage_rental':('dukkan','Storage'),'trade':('dukkan','Trade'),'health_food':('dukkan','Health food'),'nuts':('dukkan','Nuts'),'spices':('dukkan','Spices'),'dairy':('dukkan','Dairy'),'seafood':('dukkan','Seafood'),'frozen_food':('dukkan','Frozen food'),'beverages':('dukkan','Beverages'),'alcohol':('dukkan','Drinks'),'water':('dukkan','Water'),'greengrocer ':('dukkan','Greengrocer')}
AMEN={'restaurant':('food','Restaurant'),'fast_food':('food','Fast food'),'food_court':('food','Food court'),'ice_cream':('food','Ice cream'),'cafe':('cafe','Cafe'),
 'pharmacy':('medical','Pharmacy'),'clinic':('medical','Clinic'),'dentist':('medical','Dentist'),'doctors':('medical','Doctor'),'hospital':('hospital','Hospital'),'veterinary':('medical','Veterinary'),
 'fuel':('auto','Fuel station'),'car_wash':('auto','Car wash'),'car_rental':('dealer','Car rental'),
 'bank':('bank','Bank'),'school':('school','School'),'kindergarten':('school','Kindergarten'),'college':('school','College'),'library':('school','Library'),
 'marketplace':('dukkan','Market'),'townhall':('civic','Town hall'),'police':('civic','Police'),'post_office':('civic','Post office'),'community_centre':('civic','Community centre'),'courthouse':('civic','Court'),'fire_station':('civic','Fire station')}
LEIS={'fitness_centre':('gym','Gym'),'sports_centre':('gym','Sports centre'),'park':('park','Park')}
TOUR={'hotel':('poi','Hotel'),'hostel':('poi','Hostel'),'guest_house':('poi','Guest house'),'motel':('poi','Motel'),'museum':('museum','Museum'),'attraction':('landmark','Attraction')}
def classify(t):
    if t.get('amenity')=='place_of_worship':
        rel=t.get('religion','muslim');return ('church','Church') if rel=='christian' else ('mosque','Mosque')
    s=t.get('shop')
    if s:
        s=s.split(';')[0].strip();
        if s in SHOPK:return SHOPK[s]
        return ('dukkan','Shop')
    a=t.get('amenity')
    if a in AMEN:return AMEN[a]
    l=t.get('leisure')
    if l in LEIS:return LEIS[l]
    if t.get('sport')=='fitness' :return ('gym','Gym')
    tr=t.get('tourism')
    if tr in TOUR:return TOUR[tr]
    if t.get('healthcare') in ('clinic','doctor','dentist','laboratory','pharmacy'):return ('medical','Clinic')
    if t.get('craft') in ('car_repair',):return ('auto','Car repair')
    return None
c=sqlite3.connect('irbid.gpkg');out=[];seen=[]
def add(g,name,t,src):
    if not name or re.match(r'^Bul?ding num',name):return
    k=classify(t)
    if not k:return
    if k[0]=='park' and re.search(r'استراحة|Trees|مدينة الحسن|Circle|دوار',name):return
    cx,cy=(g.x,g.y) if g.geom_type=='Point' else (g.centroid.x,g.centroid.y)
    X,Y=T.transform(cx,cy);x,z=X,-Y
    for s in seen:
        if abs(s[0]-x)<60 and abs(s[1]-z)<60 and s[2]==name:return
    seen.append((x,z,name))
    out.append([round(x*10),round(z*10),k[0],name,t.get('name:en','') if t.get('name:en','')!=name else '',k[1]])
for name,ot,geom in c.execute("select name,other_tags,geom from points where name is not null and name!=''"):
    add(gp(geom),name,tags(ot),'p')
for name,am,sh,tour,leis,ot,geom in c.execute("select name,amenity,shop,tourism,leisure,other_tags,geom from multipolygons where name is not null and name!='' and (shop is not null or amenity is not null or tourism is not null or leisure is not null)"):
    t=tags(ot)
    if am:t['amenity']=am
    if sh:t['shop']=sh
    if tour:t['tourism']=tour
    if leis:t['leisure']=leis
    if am in ('university','bus_station') :continue
    add(gp(geom),name,t,'m')
import collections
print(len(out),collections.Counter(o[2] for o in out).most_common())
json.dump(out,open('pois.json','w'),ensure_ascii=False)
