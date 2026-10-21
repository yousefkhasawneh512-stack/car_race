-- Irbid Drive (Roblox) - small helpers for the menus: which cars this player owns, a car's rarity text, its upgrade levels.
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))

local CarInfo = {}
local plr = Players.LocalPlayer

-- {[car index] = true} from the player attribute "Owned" (set by the server)
function CarInfo.owned()
	local o = {}
	for i in string.gmatch(plr:GetAttribute("Owned") or "1", "%d+") do o[tonumber(i)] = true end
	return o
end

-- "Rare ×1.5"
function CarInfo.tierLine(c)
	local r = Config.RARITY[c.tier + 1]
	return r.name .. " ×" .. string.format("%.1f", r.mult)
end

-- the current car's 4 upgrade levels from the player attribute "Tune"
function CarInfo.levels()
	local lv, i = { 0, 0, 0, 0 }, 0
	for n in string.gmatch(plr:GetAttribute("Tune") or "", "%d+") do
		i += 1
		lv[i] = tonumber(n)
	end
	return lv
end

return CarInfo
