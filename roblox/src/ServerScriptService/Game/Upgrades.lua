-- Irbid Drive (Roblox) - Apex Drift Customs (the web game's economy): Speed / Acceleration / Handling / Extra Drift Points,
-- price = base x 2^level, 5 levels, paid with banked drift points, only at the shop, saved per car.
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))
local PlayerData = require(script.Parent:WaitForChild("PlayerData"))
local Sites = require(script.Parent:WaitForChild("Sites"))

local Upgrades = {}

-- -> ok, new level | reason
function Upgrades.buy(plr, d, i)
	local part = type(i) == "number" and Config.UPGRADES[i] and i
	if not part then return false, "no such part" end
	if not Sites.near(plr, Sites.shop, 40) then return false, "Drive to Apex Drift Customs first" end
	local l = PlayerData.levels(d, d.cur)
	if l[part] >= Config.UPGRADE_MAX then return false, "Already at the top level" end
	local price = Config.upgradePrice(part, l[part])
	if d.bank < price then return false, "Not enough drift points" end
	d.bank -= price
	l[part] += 1
	PlayerData.commit(plr)
	return true, l[part]
end

return Upgrades
