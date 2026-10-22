-- Irbid Drive (Roblox) - the vehicle diagnostics (key O; the web game's 07f panel): the damage mode, every component with its condition
-- and its effect (Full) or "visual only" (Cosmetic), the body zones, lights, glass and panels, one card per wheel (tread, carcass,
-- temperature, grip, load, slip, wear by cause, distance on the tyre), the last impacts, and the gamepad / racing-wheel status.
-- Refreshed twice a second while it is open.
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local Config = require(ReplicatedStorage:WaitForChild("Config"))
local Damage = require(ReplicatedStorage:WaitForChild("Modules"):WaitForChild("Damage"))
local Client = script.Parent
local State = require(Client:WaitForChild("State"))
local Hud = require(Client:WaitForChild("Hud"))
local CarDamage = require(Client:WaitForChild("CarDamage"))
local Gamepad = require(Client:WaitForChild("Gamepad"))

local Diagnostics = {}
local TITLE = "Diagnostics"

-- the web game's condition words and colours (07f sev)
local function sev(c)
	if c >= 95 then return "OK", Color3.fromHex("#7fd68a") end
	if c >= 75 then return "minor", Color3.fromHex("#c9e36b") end
	if c >= 45 then return "moderate", Color3.fromHex("#ffcf6b") end
	if c >= 15 then return "severe", Color3.fromHex("#ff9a5c") end
	return "failed", Color3.fromHex("#ff6b6b")
end
Diagnostics.sev = sev

local function line(p, txt, order, color, h)
	local t = Hud.label(p.list, UDim2.new(), UDim2.fromOffset(450, h or 18), Vector2.new(0, 0), txt, 14)
	t.TextXAlignment = Enum.TextXAlignment.Left
	t.TextWrapped = true
	t.Font = Enum.Font.Gotham
	t.TextStrokeTransparency = 1
	if color then t.TextColor3 = color end
	t.LayoutOrder = order
	return t
end

-- the report as lines (also used by tests)
function Diagnostics.lines()
	local rec, mode = CarDamage.record(), CarDamage.mode()
	local car = Config.CARS[State.spec.ci or 1]
	local L = {}
	local function add(t, c) L[#L + 1] = { t, c } end
	add(car.name .. " · damage " .. Damage.MODE_NAMES[mode + 1] .. (mode == 0 and " (press I for Cosmetic or Full)" or ""), Color3.fromRGB(255, 210, 74))
	if not rec then
		add("No record yet")
		return L
	end
	local full = mode == 2
	add(string.format("Body %d %% · tyres %d %% · suspension %d %% · %d impacts", Damage.jsround(rec.body), Damage.jsround(rec.tyres), Damage.jsround(rec.suspension), rec.impacts))
	for _, r in ipairs(Damage.diagRows(rec, car, full)) do
		local w, c = sev(r[2])
		add(r[1] .. ": " .. Damage.jsround(r[2]) .. " % " .. w .. " · " .. r[3], c)
	end
	local zs = {}
	for _, z in ipairs(Damage.ZONES) do zs[#zs + 1] = Damage.ZONE_NAMES[z] .. " " .. Damage.jsround(rec.zones[z]) .. "%" end
	add("Body zones: " .. table.concat(zs, " · "))
	local bits = {}
	for j = 1, 4 do
		if rec.lights[j] ~= 0 then bits[#bits + 1] = Damage.LIGHT_NAMES[j] .. " broken" end
		if rec.glass[j] > 0 then bits[#bits + 1] = Damage.GLASS_NAMES[j] .. " cracked " .. Damage.jsround(rec.glass[j] * 100) .. "%" end
	end
	for _, k in ipairs(Damage.DP_KEYS) do
		local v = rec.parts[k]
		if v > 0.005 then bits[#bits + 1] = Damage.DP_NAMES[k] .. (v >= 1 and " torn off" or (" " .. Damage.jsround(v * 100) .. "%")) end
	end
	add(#bits > 0 and table.concat(bits, " · ") or "Lights, glass and panels: no damage", #bits > 0 and Color3.fromRGB(240, 150, 70) or nil)
	if #rec.dents > 0 then add(#rec.dents .. " dent" .. (#rec.dents > 1 and "s" or "")) end
	local T = CarDamage.tyres
	for j = 1, 4 do
		local w = rec.wheels[j]
		local c = w.punct and 0 or math.min(w.tread, w.health)
		local wd, col = sev(c)
		local wr = w.wear
		add(string.format("Tyre %s: %s · tread %d %% · carcass %d %% · %d °C (max %d) · grip x%.2f · load %d N · slip %.1f · wear: slide %.2f, spin %.2f, lock %.2f, burnout %.2f · %.1f km%s%s",
			Damage.WHEEL_NAMES[j], wd, Damage.jsround(w.tread), Damage.jsround(w.health), Damage.jsround(w.temp), Damage.jsround(w.tmax), Damage.tyreMu(w), Damage.jsround(T.fz[j]),
			T.sl[j], wr.slide, wr.spin, wr.lock, wr.burn, w.km, w.punct and " · PUNCTURED" or "", rec.rims[j] > 0.005 and (" · rim bent " .. Damage.jsround(rec.rims[j] * 100) .. "%") or ""), col)
	end
	if full then add(string.format("Engine %d °C%s", Damage.jsround(rec.engTemp), rec.engTemp > 112 and " · power limited" or "")) end
	for i, e in ipairs(rec.log) do
		if i > 4 then break end
		add(string.format("Impact: %d km/h (barrier %d) · %s · %s", e.kmh, e.ebs, e.zone, e.obj))
	end
	local g = Gamepad.state
	add(g.on and string.format("Gamepad / wheel: connected · steering %+.2f · gas %.2f · brake %.2f", g.steer, g.thr, g.brk) or "Gamepad / wheel: not in use (a G29 works through Steam Input or x360ce)")
	return L
end

function Diagnostics.toggle()
	if Hud.isOpen(TITLE) then
		Hud.closePanel()
		return
	end
	local p = Hud.panel(TITLE, 480, 520)
	p.sub.Text = "Damage, wear and tyres of this car · numbers are gameplay estimates"
	local labels = {}
	local function fill()
		local L = Diagnostics.lines()
		for i, q in ipairs(L) do
			local t = labels[i]
			if not t then
				t = line(p, "", i, nil, string.len(q[1]) > 70 and 34 or 18)
				labels[i] = t
			end
			t.Text = q[1]
			t.TextColor3 = q[2] or Color3.new(1, 1, 1)
		end
	end
	fill()
	local acc = 0
	local conn
	conn = RunService.RenderStepped:Connect(function(dt)
		if not Hud.isOpen(TITLE) then
			conn:Disconnect()
			return
		end
		acc += dt
		if acc > 0.5 then
			acc = 0
			fill()
		end
	end)
end

-- the web game's two buttons (right edge, under Roblox's player list): "Damage: Off / Cosmetic / Full" (click = the next mode, like I) and "🔧 Repair" (shown when the
-- car is damaged and damage is on; at Apex Drift Customs it opens the repair bay, elsewhere it sets the GPS route there)
function Diagnostics.buttons(openShop, nearShop, routeShop)
	local dmgB = Hud.button(Hud.gui, "Damage: Off", CarDamage.cycle, 150, 30, Color3.fromRGB(70, 50, 50))
	dmgB.Name = "DamageButton"
	dmgB.AnchorPoint = Vector2.new(1, 0)
	dmgB.Position = UDim2.new(1, -12, 0.5, -70)
	dmgB.ZIndex = 4
	local repB = Hud.button(Hud.gui, "🔧 Repair", function()
		if nearShop() then
			openShop()
		else
			Hud.toast("🔧 Repairs are done at Apex Drift Customs (Baghdad Street) — route set")
			routeShop()
		end
	end, 150, 30, Color3.fromRGB(150, 80, 20))
	repB.Name = "RepairButton"
	repB.AnchorPoint = Vector2.new(1, 0)
	repB.Position = UDim2.new(1, -12, 0.5, -34)
	repB.ZIndex = 4
	repB.Visible = false
	table.insert(CarDamage.changed, function(rec, mode)
		dmgB.Text = "Damage: " .. Damage.MODE_NAMES[mode + 1]
		repB.Visible = mode ~= 0 and rec ~= nil and Damage.hurt(rec)
	end)
	Diagnostics.damageButton, Diagnostics.repairButton = dmgB, repB
end

return Diagnostics
