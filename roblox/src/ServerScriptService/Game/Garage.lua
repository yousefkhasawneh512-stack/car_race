-- Irbid Drive (Roblox) - buy or switch cars with cash. The VIP car needs the VIP pass. The new car appears where the old one was.
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local MarketplaceService = game:GetService("MarketplaceService")
local Config = require(ReplicatedStorage:WaitForChild("Config"))
local PlayerData = require(script.Parent:WaitForChild("PlayerData"))
local Spawner = require(script.Parent:WaitForChild("Spawner"))

local Garage = {}

-- -> ok, car name | reason
function Garage.buyOrUse(plr, d, i)
	local spec = type(i) == "number" and Config.CARS[i]
	if not spec then return false, "no such car" end
	if spec.vip and not d.vip then
		if Config.GAMEPASS_VIP ~= 0 then MarketplaceService:PromptGamePassPurchase(plr, Config.GAMEPASS_VIP) end
		return false, "VIP car"
	end
	if not d.owned[i] then
		if d.cash < spec.price then return false, "Not enough cash" end
		d.cash -= spec.price
		d.owned[i] = true
	end
	d.cur = i
	PlayerData.commit(plr)
	Spawner.spawn(plr, true)
	return true, spec.name
end

return Garage
