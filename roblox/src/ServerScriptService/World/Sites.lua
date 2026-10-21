-- Irbid Drive (Roblox) - the game sites at the web game's positions: the bank (red), Apex Drift Customs (orange), the race starts
-- (cyan). Glowing pads with a sign; no collision, ignored by ray tests.
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Shared = ReplicatedStorage:WaitForChild("IrbidShared")
local Meta = require(Shared:WaitForChild("Meta"))
local Circuits = require(Shared:WaitForChild("Circuits"))
local MapData = require(script.Parent:WaitForChild("MapData"))
local Signs = require(script.Parent:WaitForChild("Signs"))

return function(map)
	local S = MapData.S
	local siteF = map:WaitForChild("Sites")
	local function pad(name, x, y, z, radius, color, text)
		local p = Instance.new("Part")
		p.Name = name
		p.Anchored = true
		p.CanCollide = false
		p.CanQuery = false
		p.CanTouch = false
		p.Shape = Enum.PartType.Cylinder
		p.Material = Enum.Material.Neon
		p.Color = color
		p.Transparency = 0.45
		p.Size = Vector3.new(0.3 * S, radius * 2 * S, radius * 2 * S)
		p.CFrame = CFrame.new(x * S, (y + 0.25) * S, z * S) * CFrame.Angles(0, 0, math.pi / 2)
		p.Parent = siteF
		Signs.sign(siteF, Vector3.new(x * S, (y + 9) * S, z * S), text, color, 1500, 320)
		return p
	end
	pad("BankPad", Meta.bank.x, Meta.bank.y, Meta.bank.z, 7, Color3.fromRGB(255, 60, 60), "🏦 BANK · press E")
	pad("ShopPad", Meta.shop.x, Meta.shop.y, Meta.shop.z, 7, Color3.fromRGB(255, 122, 0), "🔧 APEX DRIFT CUSTOMS · press U")
	for _, c in ipairs(Circuits) do
		local x, z, y = string.match(c.path, "^(-?%d+),(-?%d+),(-?%d+)")
		pad("RacePad", tonumber(x) / 10, tonumber(y) / 10, tonumber(z) / 10, 5, Color3.fromRGB(51, 224, 255), "🏁 " .. c.name .. " · press R")
	end
end
