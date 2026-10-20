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
Config.CARS = --@@CARS@@

return Config
