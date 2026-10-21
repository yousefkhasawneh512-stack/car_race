-- Irbid Drive (Roblox) - the Apex Drift Customs menu (key U, only at the orange pad): the 4 upgrades of the current car with their
-- level and next price in drift points; the server does the purchase.
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))
local State = require(script.Parent:WaitForChild("State"))
local Hud = require(script.Parent:WaitForChild("Hud"))
local CarInfo = require(script.Parent:WaitForChild("CarInfo"))
local Remotes = ReplicatedStorage:WaitForChild("Remotes")

local TuneShop = {}
local plr = Players.LocalPlayer
local fmt = Hud.fmt

function TuneShop.open()
	if Hud.isOpen("Apex Drift Customs") then
		Hud.closePanel()
		return
	end
	local p = Hud.panel("Apex Drift Customs", 400, 340)
	local function fill()
		for _, ch in ipairs(p.list:GetChildren()) do
			if ch:IsA("GuiObject") then ch:Destroy() end
		end
		local bank = plr:GetAttribute("DriftBank") or 0
		local lv = CarInfo.levels()
		p.sub.Text = "Drift bank: " .. fmt(bank) .. " points · " .. State.spec.name .. " (" .. CarInfo.tierLine(Config.CARS[plr:GetAttribute("CurCar") or 1]) .. ")"
		for k, u in ipairs(Config.UPGRADES) do
			local l = lv[k]
			local max = l >= Config.UPGRADE_MAX
			local price = Config.upgradePrice(k, l)
			local txt = u.name .. " · level " .. (l + 1) .. (max and " (MAX)" or "") .. "\n" .. u.info .. (max and "" or (" · next: " .. fmt(price) .. " pts"))
			local b = Hud.button(p.list, txt, function()
				if max then return end
				local ok, msg = Remotes.CarAction:InvokeServer("upgrade", k)
				Hud.toast(ok and (u.name .. " → level " .. (tonumber(msg) + 1)) or tostring(msg))
				fill()
			end, 370, 52, (max or bank < price) and Color3.fromRGB(60, 62, 70) or nil)
			b.TextSize = 14
			b.LayoutOrder = k
		end
	end
	fill()
end

return TuneShop
