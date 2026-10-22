-- Irbid Drive (Roblox) - the Apex Drift Customs menu (key U or P, only at the orange pad): the 4 upgrades of the current car with their
-- level and next price in drift points, and the repair bay (the web game's 08d): every damaged item with its condition, effect and price
-- in JD (base + per % lost, x the rarity tier; gameplay estimates, not workshop quotes), "Repair all", and the full inspection of all
-- 42 parts. The server does every purchase and repair.
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))
local State = require(script.Parent:WaitForChild("State"))
local Hud = require(script.Parent:WaitForChild("Hud"))
local CarInfo = require(script.Parent:WaitForChild("CarInfo"))
local CarDamage = require(script.Parent:WaitForChild("CarDamage"))
local Diagnostics = require(script.Parent:WaitForChild("Diagnostics"))
local Damage = require(ReplicatedStorage:WaitForChild("Modules"):WaitForChild("Damage"))
local Remotes = ReplicatedStorage:WaitForChild("Remotes")

local TuneShop = {}
local plr = Players.LocalPlayer
local fmt = Hud.fmt

function TuneShop.open()
	if Hud.isOpen("Apex Drift Customs") then
		Hud.closePanel()
		return
	end
	local p = Hud.panel("Apex Drift Customs", 420, 520)
	local inspect = false
	local fill
	local function repair(ids)
		local ci = State.spec.ci or 1
		local ok, r, total, label = Remotes.Damage:InvokeServer("repair", ci, ids)
		if ok then
			CarDamage.setRecord(r)
			Hud.toast("🔧 Repaired: " .. tostring(label) .. " · −" .. fmt(total) .. " JD")
		else
			Hud.toast(tostring(r))
		end
		fill()
	end
	-- the repair bay rows, after the upgrades
	local function repairs(order)
		local rec = CarDamage.record()
		local car = Config.CARS[State.spec.ci or 1]
		local cash = plr:GetAttribute("Cash") or 0
		local function text(t, h, color)
			order += 1
			local l = Hud.label(p.list, UDim2.new(), UDim2.fromOffset(390, h or 20), Vector2.new(0, 0), t, 15)
			l.TextXAlignment = Enum.TextXAlignment.Left
			l.TextWrapped = true
			if color then l.TextColor3 = color end
			l.LayoutOrder = order
			return l
		end
		text("🛠 Repair bay · balance " .. fmt(cash) .. " JD · prices are gameplay estimates", 22, Color3.fromRGB(255, 210, 74))
		local items = rec and Damage.repairItems(rec, car) or {}
		if #items == 0 then
			text("No damage recorded on this car." .. (CarDamage.mode() == 0 and " Damage is Off (press I for Cosmetic or Full)." or ""))
		else
			local total, grp = 0, ""
			for _, q in ipairs(items) do
				total += q.price
				if q.grp ~= grp then
					grp = q.grp
					text(grp, 20, Color3.fromRGB(255, 210, 74))
				end
				order += 1
				local w = Diagnostics.sev(q.cond)
				local b = Hud.button(p.list, q.label .. " · " .. Damage.jsround(q.cond) .. "% " .. w .. "\n" .. q.eff .. " · Repair " .. fmt(q.price) .. " JD", function()
					repair({ q.id })
				end, 390, 44, cash < q.price and Color3.fromRGB(60, 62, 70) or Color3.fromRGB(60, 80, 110))
				b.Name = "Repair_" .. q.id
				b.TextSize = 13
				b.LayoutOrder = order
			end
			order += 1
			local all = Hud.button(p.list, "Repair all · " .. fmt(total) .. " JD" .. (cash < total and " (not enough balance)" or ""), function() repair("*") end, 390, 34,
				cash < total and Color3.fromRGB(60, 62, 70) or Color3.fromRGB(43, 107, 58))
			all.Name = "RepairAll"
			all.LayoutOrder = order
		end
		order += 1
		local ins = Hud.button(p.list, (inspect and "▾" or "▸") .. " 🔍 Full inspection: every part (42)", function()
			inspect = not inspect
			fill()
		end, 390, 30, Color3.fromRGB(50, 56, 66))
		ins.Name = "Inspect"
		ins.LayoutOrder = order
		if inspect and rec then
			for _, q in ipairs(Damage.inspectRows(rec, car)) do
				local w, c = Diagnostics.sev(q.cond)
				local l = text(q.label .. " · " .. Damage.jsround(q.cond) .. "% " .. w .. (q.price > 0 and (" · repair " .. fmt(q.price) .. " JD") or " · OK, no charge"), 18, c)
				l.Name = "Inspect_" .. q.id
				l.TextSize = 13
			end
		end
	end
	fill = function()
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
		repairs(#Config.UPGRADES)
	end
	fill()
end

return TuneShop
