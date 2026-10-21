-- Irbid Drive (Roblox) - the garage menu (key G): every car with its rarity, top speed and price; buy or switch cars (the server
-- does it); the Robux buttons when their IDs are set in Config.
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))
local Hud = require(script.Parent:WaitForChild("Hud"))
local CarInfo = require(script.Parent:WaitForChild("CarInfo"))
local Remotes = ReplicatedStorage:WaitForChild("Remotes")

local Garage = {}
local plr = Players.LocalPlayer
local fmt = Hud.fmt

function Garage.open()
	if Hud.isOpen("Garage") then
		Hud.closePanel()
		return
	end
	local p = Hud.panel("Garage", 400, 400)
	local function fill()
		for _, ch in ipairs(p.list:GetChildren()) do
			if ch:IsA("GuiObject") then ch:Destroy() end
		end
		p.sub.Text = "Cash: " .. fmt(plr:GetAttribute("Cash") or 0) .. " · cars come from the shop list or the wheel"
		local o = CarInfo.owned()
		for i, c in ipairs(Config.CARS) do
			local km = math.floor(c.vm * 3.6 + 0.5)
			local status = plr:GetAttribute("CurCar") == i and "driving" or o[i] and "use" or c.vip and "VIP pass" or (fmt(c.price) .. " cash")
			local b = Hud.button(p.list, c.name .. " · " .. CarInfo.tierLine(c) .. " · " .. km .. " km/h · " .. status, function()
				local ok, msg = Remotes.CarAction:InvokeServer("buy", i)
				Hud.toast(ok and ("Now driving: " .. tostring(msg)) or tostring(msg))
				fill()
			end, 370, 32, plr:GetAttribute("CurCar") == i and Color3.fromRGB(40, 110, 60) or nil)
			b.TextSize = 13
			b.LayoutOrder = i
			local bar = Instance.new("Frame")
			bar.Size = UDim2.new(0, 6, 1, 0)
			bar.BorderSizePixel = 0
			bar.BackgroundColor3 = Config.TIER_COLORS[c.tier + 1]
			bar.Parent = b
		end
		local k = #Config.CARS
		if Config.PRODUCT_CASH_SMALL ~= 0 then
			Hud.button(p.list, "+" .. fmt(Config.CASH_SMALL) .. " cash (Robux)", function() Remotes.CarAction:InvokeServer("cash_small") end, 370, 32, Color3.fromRGB(0, 140, 80)).LayoutOrder = k + 1
		end
		if Config.PRODUCT_CASH_BIG ~= 0 then
			Hud.button(p.list, "+" .. fmt(Config.CASH_BIG) .. " cash (Robux)", function() Remotes.CarAction:InvokeServer("cash_big") end, 370, 32, Color3.fromRGB(0, 140, 80)).LayoutOrder = k + 2
		end
		if Config.GAMEPASS_VIP ~= 0 and not plr:GetAttribute("VIP") then
			Hud.button(p.list, "VIP pass: double drift cash + the VIP car (Robux)", function() Remotes.CarAction:InvokeServer("vip") end, 370, 32, Color3.fromRGB(180, 140, 0)).LayoutOrder = k + 3
		end
	end
	fill()
end

return Garage
