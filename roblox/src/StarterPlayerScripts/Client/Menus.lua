-- Irbid Drive (Roblox) - the garage (buy / switch cars, Robux packs), Apex Drift Customs (upgrades paid with banked drift points,
-- only at the shop) and the car wheel (10,000 cash per spin, the web game's tier odds). Every purchase is done by the server.
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))
local State = require(script.Parent:WaitForChild("State"))
local Hud = require(script.Parent:WaitForChild("Hud"))
local Remotes = ReplicatedStorage:WaitForChild("Remotes")

local Menus = {}
local plr = Players.LocalPlayer
local fmt = Hud.fmt

local function owned()
	local o = {}
	for i in string.gmatch(plr:GetAttribute("Owned") or "1", "%d+") do o[tonumber(i)] = true end
	return o
end

local function tierLine(c)
	local r = Config.RARITY[c.tier + 1]
	return r.name .. " ×" .. string.format("%.1f", r.mult)
end

-- ---- garage ----
function Menus.garage()
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
		local o = owned()
		for i, c in ipairs(Config.CARS) do
			local km = math.floor(c.vm * 3.6 + 0.5)
			local status = plr:GetAttribute("CurCar") == i and "driving" or o[i] and "use" or c.vip and "VIP pass" or (fmt(c.price) .. " cash")
			local b = Hud.button(p.list, c.name .. " · " .. tierLine(c) .. " · " .. km .. " km/h · " .. status, function()
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

-- ---- Apex Drift Customs ----
function Menus.shop()
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
		local lv, i = { 0, 0, 0, 0 }, 0
		for n in string.gmatch(plr:GetAttribute("Tune") or "", "%d+") do
			i += 1
			lv[i] = tonumber(n)
		end
		p.sub.Text = "Drift bank: " .. fmt(bank) .. " points · " .. State.spec.name .. " (" .. tierLine(Config.CARS[plr:GetAttribute("CurCar") or 1]) .. ")"
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

-- ---- the car wheel ----
local spinning = false
function Menus.wheel()
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
		-- reel: cycles the tiers, slowing down, and stops on the result
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

return Menus
