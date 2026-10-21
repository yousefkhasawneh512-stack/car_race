-- Irbid Drive (Roblox) - the car wheel menu (key K): the tier odds, a SPIN button (the server rolls and pays), and a reel that
-- cycles the tiers, slows down and stops on the result.
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))
local Hud = require(script.Parent:WaitForChild("Hud"))
local Remotes = ReplicatedStorage:WaitForChild("Remotes")

local CarWheel = {}
local plr = Players.LocalPlayer
local fmt = Hud.fmt
local spinning = false

function CarWheel.open()
	if spinning then return end
	if Hud.isOpen("Car Wheel") then
		Hud.closePanel()
		return
	end
	local p = Hud.panel("Car Wheel", 380, 330)
	local odds = {}
	for k, r in ipairs(Config.RARITY) do
		odds[#odds + 1] = r.name .. " " .. math.floor(Config.WHEEL_ODDS[k] * 100 + 0.5) .. "%"
	end
	p.sub.Text = table.concat(odds, " · ")
	local reel = Hud.label(p.list, UDim2.new(), UDim2.fromOffset(340, 70), Vector2.zero, "?", 34)
	reel.LayoutOrder = 1
	local res = Hud.label(p.list, UDim2.new(), UDim2.fromOffset(340, 48), Vector2.zero, "Each spin costs " .. fmt(Config.WHEEL_COST) .. " cash · a duplicate refunds " .. fmt(Config.WHEEL_REFUND), 15)
	res.TextWrapped = true
	res.LayoutOrder = 2
	local go
	go = Hud.button(p.list, "SPIN · " .. fmt(Config.WHEEL_COST) .. " cash", function()
		if spinning then return end
		if (plr:GetAttribute("Cash") or 0) < Config.WHEEL_COST then
			res.Text = "Not enough cash: drift, race and rob the bank to earn more"
			return
		end
		spinning = true
		go.Text = "Spinning…"
		local ok, r = Remotes.CarAction:InvokeServer("spin")
		if not ok or type(r) ~= "table" then
			spinning = false
			go.Text = "SPIN · " .. fmt(Config.WHEEL_COST) .. " cash"
			res.Text = tostring(r)
			return
		end
		local steps = 22 + r.tier
		for k = 0, steps do
			local t = (r.tier - (steps - k)) % #Config.RARITY
			reel.Text = Config.RARITY[t + 1].name
			reel.TextColor3 = Config.TIER_COLORS[t + 1]
			task.wait(0.04 + 0.012 * k)
		end
		local car = Config.CARS[r.car]
		reel.Text = Config.RARITY[r.tier + 1].name .. " · " .. car.name
		res.Text = r.dup and ("Duplicate: you already own it, " .. fmt(Config.WHEEL_REFUND) .. " cash refunded")
			or ("Unlocked and equipped! (×" .. string.format("%.1f", Config.RARITY[r.tier + 1].mult) .. " drift points)")
		Hud.toast("Wheel: " .. car.name .. (r.dup and " (duplicate)" or " unlocked!"), 4)
		spinning = false
		if go.Parent then go.Text = "SPIN AGAIN · " .. fmt(Config.WHEEL_COST) .. " cash" end
	end, 340, 40, Color3.fromRGB(180, 120, 0))
	go.LayoutOrder = 3
end

return CarWheel
