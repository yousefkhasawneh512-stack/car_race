-- Irbid Drive (Roblox) - shared settings. Read by the server and by every player's client scripts.
-- MONEY: create these in the Roblox Creator Dashboard (your experience -> Monetization), then paste the numeric IDs here and republish.
-- While an ID is 0 the matching button is hidden and nothing can be bought.
local Meta = require(script.Parent:WaitForChild("IrbidShared"):WaitForChild("Meta"))
local Config = {}

Config.GAMEPASS_VIP = 0        -- Game Pass "VIP": double cash from drifting + the VIP car
Config.PRODUCT_CASH_SMALL = 0  -- Developer Product: +5,000 cash
Config.PRODUCT_CASH_BIG = 0    -- Developer Product: +25,000 cash
Config.CASH_SMALL = 5000
Config.CASH_BIG = 25000

-- Optional engine sound: the ID of a Roblox audio asset you are allowed to use (0 = no engine sound)
Config.ENGINE_SOUND_ID = 0

Config.SCALE = 3               -- studs per metre (the map data is in metres)
Config.START_CASH = 500
Config.DRIFT_CASH = 0.25       -- cash per drift point (VIP: x2); drift points also go to the drift bank that pays for upgrades
Config.TRAFFIC_CARS = 22       -- AI cars around each player (simulated on that player's device)
Config.DAY_MINUTES = 24        -- one in-game day lasts this many real minutes

-- Cars: speed / acceleration / brakes / handling / rarity tier come from the web game's own car data (tools/make_roblox.js); generic names.
Config.CARS = Meta.cars
-- Rarity tiers (web game): Common x1.0, Uncommon x1.2, Rare x1.5, Epic x2.0, Legendary x3.0 drift points
Config.RARITY = Meta.rarity
Config.TIER_COLORS = { Color3.fromRGB(154, 160, 166), Color3.fromRGB(76, 175, 80), Color3.fromRGB(33, 150, 243), Color3.fromRGB(156, 39, 176), Color3.fromRGB(255, 193, 7) }

-- Apex Drift Customs (web game economy): price = base x 2^level, 5 levels, paid with banked drift points
Config.UPGRADES = {
	{ name = "Speed", base = 1500, info = "Top speed +5% per upgrade" },
	{ name = "Acceleration", base = 1200, info = "Acceleration +6% per upgrade" },
	{ name = "Handling", base = 800, info = "Steering and grip +7% per upgrade" },
	{ name = "Extra Drift Points", base = 3000, info = "Drift points +20% per upgrade" },
}
Config.UPGRADE_MAX = 5
function Config.upgradePrice(part, level)
	return Config.UPGRADES[part].base * 2 ^ level
end

-- Car wheel (web game): 10,000 per spin, tier odds 50 / 35 / 10 / 4 / 1 %, a duplicate refunds 5,000
Config.WHEEL_COST = 10000
Config.WHEEL_ODDS = { 0.50, 0.35, 0.10, 0.04, 0.01 }
Config.WHEEL_REFUND = 5000

-- Bank heist (web game): survive the police for 2:00 -> +500; caught -> lose up to 50; the bank then closes for 3:00
Config.HEIST_TIME = 120
Config.HEIST_REWARD = 500
Config.HEIST_FINE = 50
Config.HEIST_COOLDOWN = 180

-- Street races (Roblox only: the web game gives no money for races): cash by finishing place
Config.RACE_REWARD = { 1000, 500, 250, 100 }

-- Car stats with the player's upgrades (the web game's applyTune)
function Config.tuned(carIndex, levels)
	local c = Config.CARS[carIndex] or Config.CARS[1]
	local l = levels or { 0, 0, 0, 0 }
	return {
		vm = c.vm * (1 + 0.05 * l[1]),
		a0 = c.a0 * (1 + 0.06 * l[2]),
		hd = c.hd + 0.07 * l[3],
		dr = l[4],
		bk = c.bk,
		rm = Config.RARITY[c.tier + 1].mult,
	}
end

return Config
