-- Irbid Drive (Roblox) - shared settings. Read by the server and by every player's CarClient.
-- MONEY: create these in the Roblox Creator Dashboard (your game -> Monetization), then paste the numeric IDs here and republish.
-- While an ID is 0 the matching button is hidden and nothing can be bought.
local Config = {}

Config.GAMEPASS_VIP = 0        -- Game Pass "VIP": double cash from drifting + the VIP car
Config.PRODUCT_CASH_SMALL = 0  -- Developer Product: +5,000 cash
Config.PRODUCT_CASH_BIG = 0    -- Developer Product: +25,000 cash
Config.CASH_SMALL = 5000
Config.CASH_BIG = 25000

Config.SCALE = 3               -- studs per metre (the map data is in metres)
Config.START_CASH = 500
Config.DRIFT_CASH = 0.25       -- cash per drift point (VIP: x2)

-- Cars: speed / acceleration / brakes / handling come from the web game's own car data (tools/make_roblox.js); generic names, no brands.
Config.CARS = {{name="Hot Hatch RS",price=0,vip=false,vm=72.41,a0=6.51,bk=9.81,hd=1,L=4.39,W=1.85,H=1.47},{name="Classic 86",price=8000,vip=false,vm=51.72,a0=3.64,bk=9.81,hd=1,L=4.2,W=1.63,H=1.31},{name="Muscle V8",price=15000,vip=false,vm=68.06,a0=7.11,bk=9.81,hd=1,L=4.8,W=1.92,H=1.4},{name="Drift Coupe S",price=30000,vip=false,vm=65.33,a0=5.1,bk=9.81,hd=1,L=4.45,W=1.73,H=1.32},{name="AWD Rocket",price=60000,vip=false,vm=85.75,a0=10.54,bk=9.81,hd=1,L=4.71,W=1.89,H=1.37},{name="Super V10",price=0,vip=true,vm=88.47,a0=9.56,bk=9.81,hd=1,L=4.46,W=1.93,H=1.17}}

return Config
