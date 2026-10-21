-- Irbid Drive (Roblox) - is a player's car near a site (the bank, the tuning shop)? Uses the car's position as the server sees it.
local Workspace = game:GetService("Workspace")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))
local Meta = require(ReplicatedStorage:WaitForChild("IrbidShared"):WaitForChild("Meta"))

local Sites = { bank = Meta.bank, shop = Meta.shop }

-- site = {x, z} in metres; true when the car is within `metres`
function Sites.near(plr, site, metres)
	local car = Workspace:FindFirstChild("Car_" .. plr.UserId)
	if not (car and car.PrimaryPart) then return false end
	local p = car.PrimaryPart.Position / Config.SCALE
	return math.sqrt((p.X - site.x) ^ 2 + (p.Z - site.z) ^ 2) <= metres
end

return Sites
