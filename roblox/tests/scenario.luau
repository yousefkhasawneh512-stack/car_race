-- Irbid Drive (Roblox) headless play-through (run by tests/run.js inside tests/rbxmock.luau with the place file loaded).
-- Each check prints PASS / FAIL. Times are simulated seconds at 60 frames per second.
local pass, fail = 0, 0
local function check(name, ok, detail)
	if ok then
		pass += 1
	else
		fail += 1
	end
	print((ok and "PASS " or "FAIL ") .. name .. (detail and ("  (" .. tostring(detail) .. ")") or ""))
end
local function f1(x) return string.format("%.1f", x) end
local game = M.game
local WS = M.workspace
local RS = game:GetService("ReplicatedStorage")
local Shared = RS.IrbidShared
local S = 3

-- ================= boot =================
M.startServer()
-- the sound atlas as if it had been uploaded (Config.AUDIO_ATLAS_ID; 0 in the shipped place = silent)
require(RS.Config).AUDIO_ATLAS_ID = 1
local plr = M.addPlayer(1001, "Tester")
M.run(8)
check("no script errors while starting", #M.errors == 0, #M.errors .. " errors")
local Meta = require(Shared.Meta)
local Config = require(RS.Config)
local Road = require(RS.Modules.Road)
local Places = require(Shared.Places)
local map = WS:FindFirstChild("IrbidMap")
check("map built", map ~= nil and WS:GetAttribute("MapReady") == true)
check("all road pieces", #map.Roads:GetChildren() == Meta.roadCount, #map.Roads:GetChildren() .. " / " .. Meta.roadCount)
check("all buildings", #map.Buildings:GetChildren() == Meta.buildingCount, #map.Buildings:GetChildren() .. " / " .. Meta.buildingCount)
check("terrain tiles", M.terrainBlocks > 12000 or #map.Ground:GetChildren() > 12000, M.terrainBlocks .. " terrain blocks, " .. #map.Ground:GetChildren() .. " ground parts")
check("edit-view sign removed when the game runs", WS:FindFirstChild("EditModeSign") == nil)
check("bank, shop and race pads", map.Sites:FindFirstChild("BankPad") ~= nil and map.Sites:FindFirstChild("ShopPad") ~= nil and map.Sites:FindFirstChild("RacePad") ~= nil)
local car = WS:FindFirstChild("Car_1001")
check("player car spawned", car ~= nil)
local hum = plr.Character and plr.Character:FindFirstChildOfClass("Humanoid")
check("driver seated", hum ~= nil and hum.Sit == true)
local State, Drive, Nav, Traffic, Missions, Menus, Hud = M.client("State"), M.client("Drive"), M.client("Nav"), M.client("Traffic"), M.client("Missions"), M.client("Menus"), M.client("Hud")
check("client attached to the car", State.car == car and State.road ~= nil)
check("car released to the device after it attached", car.Body.Anchored == false and car.Body.Lift.Force.Y > 0)
local toasts = {}
do
	local t0 = Hud.toast
	Hud.toast = function(s, t)
		table.insert(toasts, s)
		t0(s, t)
	end
end
local function lastToast(pattern)
	for k = #toasts, 1, -1 do
		if string.find(toasts[k], pattern) then return toasts[k] end
	end
	return nil
end
check("road graph loaded", #State.road.edges > 5000 and #State.road.nodes > 3000, #State.road.edges .. " edges, " .. #State.road.nodes .. " nodes")
check("HUD shows the info line", string.find(Hud.info.Text, "IRBID DRIVE", 1, true) ~= nil, Hud.info.Text)
check("starting cash", plr:GetAttribute("Cash") == Config.START_CASH, plr:GetAttribute("Cash"))
check("leaderstats", plr.leaderstats.JD.Value == Config.START_CASH)
local st = State.st
-- deterministic conditions for the checks: Clear weather, a dry road (the shared Auto weather is random and can bring rain, which lowers
-- the Realistic grip); the weather block below tests Rain, Clear and the drying on purpose
do
	local Wx = M.client("Weather").state
	M.client("Settings").set("wx", 1)
	Wx.cov, Wx.rain, Wx.wet, Wx.tc, Wx.tr = 0, 0, 0, 0, 0
end
check("car on the ground at the start", st.gnd == true and math.abs(st.x) < 1 and math.abs(st.z) < 1, "y " .. f1(st.y) .. " start " .. Meta.startY)
-- phones and tablets: the web game's touch pads drive the car
if game:GetService("UserInputService").TouchEnabled then
	local pads = Hud.gui:FindFirstChild("TouchPads")
	check("touch pads on a touch device", pads ~= nil and pads:FindFirstChild("gas") ~= nil and pads:FindFirstChild("brake") ~= nil and pads:FindFirstChild("l") ~= nil and pads:FindFirstChild("r") ~= nil and pads:FindFirstChild("drift") ~= nil)
	local touch = { UserInputType = Enum.UserInputType.Touch }
	pads.gas.InputBegan:Fire(touch)
	pads.l.InputBegan:Fire(touch)
	local h0 = st.h
	M.run(2)
	local sp, turned = st.sp, math.abs(st.h - h0)
	pads.gas.InputEnded:Fire(touch)
	pads.l.InputEnded:Fire(touch)
	-- BRAKE as the web game's S: brakes to a stop, then reverses; the lowest speed shows the stop
	pads.brake.InputBegan:Fire(touch)
	local low = math.huge
	for _ = 1, 30 do
		M.run(0.1)
		low = math.min(low, math.abs(st.sp))
	end
	pads.brake.InputEnded:Fire(touch)
	check("touch GAS + steer drive the car, BRAKE stops it", sp > 5 and turned > 0.05 and low < 1, f1(sp) .. " m/s, turned " .. f1(turned) .. " rad, lowest while braking " .. f1(low) .. " m/s")
	Drive.reset()
	M.run(0.5)
end

-- ================= routing matches the web game's rules =================
do
	local g = State.road
	local ow = 0
	for _, e in ipairs(g.edges) do if e.ow then ow += 1 end end
	-- a route must never drive a one-way edge backwards
	local bad, routes = 0, 0
	for k = 1, 40 do
		local a, b = g.nodes[(k * 97) % #g.nodes + 1], g.nodes[(k * 389) % #g.nodes + 1]
		local r = Road.route(g, a.id, b.id)
		if r then
			routes += 1
			local at = a.id
			for _, t in ipairs(r) do
				if t.e.ow and t.d < 0 then bad += 1 end
				local from = t.d > 0 and t.e.a or t.e.b
				if from ~= at then bad += 1 end
				at = t.d > 0 and t.e.b or t.e.a
			end
			if at ~= b.id then bad += 1 end
		end
	end
	check("routes are connected and respect one-way streets", bad == 0 and routes > 30, routes .. " routes, " .. ow .. " one-way edges, " .. bad .. " bad steps")
end

-- ================= drive by GPS (an autopilot on the controls) =================
local function wrap(a) return (a + math.pi) % (2 * math.pi) - math.pi end
local target
do
	local best
	for _, p in ipairs(Places) do
		local d = math.sqrt(p.x * p.x + p.z * p.z)
		if d > 700 and d < 1000 and (not best or p.n < best.n) and p.k ~= "area" then best = p end
	end
	target = best
end
check("GPS route planned", Nav.go(target) == true, target.n)
local airborne, frames, maxSp, crashes, stuck, reverses = 0, 0, 0, 0, 0, 0
local arrived = false
local rev, revSteer, blockedAhead = 0, 0, false
-- a driver on the controls: look ahead along the GPS line, slow down before sharp turns and behind AI cars, back out when against a wall
M.run(300, function()
	local r = Nav.route()
	if not r then
		arrived = true
		M.move = Vector3.zero
		return "stop"
	end
	frames += 1
	if not st.gnd then airborne += 1 end
	maxSp = math.max(maxSp, st.sp)
	local P = r.P
	local s0, _, i = Road.project(P, st.x, st.z, r.i - 2, r.i + 40)
	local tx, tz = Road.sample(P, s0 + 4 + st.sp * 0.45, i)
	local diff = wrap(math.atan2(tx - st.x, tz - st.z) - st.h)
	local ax, az = Road.sample(P, s0 + 3, i)
	local bx, bz = Road.sample(P, s0 + 14, i)
	local cx, cz = Road.sample(P, s0 + 26, i)
	local turn = math.abs(wrap(math.atan2(cx - bx, cz - bz) - math.atan2(bx - ax, bz - az)))
	local want = turn > 1.0 and 5 or turn > 0.5 and 8 or 14
	if math.abs(diff) > 0.6 then want = 4 end
	blockedAhead = false
	for _, a in ipairs(State.ai) do
		local dx, dz = a.x - st.x, a.z - st.z
		local f = dx * math.sin(st.h) + dz * math.cos(st.h)
		local l = dx * math.cos(st.h) - dz * math.sin(st.h)
		if f > 0 and f < 12 and math.abs(l) < 2.8 then
			want = 0
			blockedAhead = true
		end
	end
	if rev > 0 then
		rev -= 1 / 60
		M.move = Vector3.new(revSteer, 0, 1)
		return
	end
	local thr = st.sp < want and -1 or (st.sp > want + 1.5 and 0.7 or 0)
	M.move = Vector3.new(-math.clamp(diff * 2.5, -1, 1), 0, thr)
	if st.sp < 0.5 and not blockedAhead then stuck += 1 else stuck = 0 end
	if stuck == 90 then
		-- 1.5 s pressed against something: reverse 1.3 s, turning the nose towards the line
		rev, revSteer = 1.3, diff >= 0 and 1 or -1
		reverses += 1
	end
	if stuck > 900 then
		-- still stuck after 15 s: reset onto the road
		stuck = 0
		crashes += 1
		Drive.reset()
	end
end)
M.move = Vector3.zero
check("arrived at the GPS destination", arrived and crashes <= 1, target.n .. ", " .. f1(frames / 60) .. " s, top " .. f1(maxSp * 3.6) .. " km/h, " .. reverses .. " reverses, " .. crashes .. " resets")
check("wheels on the ground while driving", airborne / math.max(frames, 1) < 0.03, f1(airborne / math.max(frames, 1) * 100) .. " % airborne")
check("GPS cleared on arrival", Nav.route() == nil and Hud.gps.Text == "")

-- ================= acceleration and braking (Arcade numbers) =================
do
	-- the longest straight edge near the start
	local best
	for _, e in ipairs(State.road.edges) do
		if e.n == 2 and e.len > 160 and e.kind ~= 2 and (not best or e.len > best.len) and math.sqrt(e.x[1] ^ 2 + e.z[1] ^ 2) < 2000 then best = e end
	end
	local e = best
	local h = math.atan2(e.x[2] - e.x[1], e.z[2] - e.z[1])
	Drive.place(e.x[1] + math.sin(h) * 5, e.z[1] + math.cos(h) * 5, h)
	M.run(0.5)
	M.move = Vector3.new(0, 0, -1)
	local t = 0
	M.run(10, function()
		t += 1 / 60
		if st.sp >= 100 / 3.6 then return "stop" end
	end)
	local spec = State.spec
	check("0-100 km/h under full throttle", st.sp >= 100 / 3.6 - 0.5, f1(t) .. " s for " .. spec.name .. " (a0 " .. spec.a0 .. ")")
	M.move = Vector3.new(0, 0, 1)
	local x0, z0 = st.x, st.z
	M.run(8, function()
		if st.sp < 0.3 then return "stop" end
	end)
	M.move = Vector3.zero
	local d = math.sqrt((st.x - x0) ^ 2 + (st.z - z0) ^ 2)
	check("braking from 100 km/h", d > 25 and d < 60, f1(d) .. " m (v^2/2a = " .. f1((100 / 3.6) ^ 2 / 2 / spec.bk) .. " m)")
end

-- ================= Realistic handling (H), gearbox (Q / E), assists, the settings menu (Y) =================
do
	local Settings = M.client("Settings")
	local phys = State.phys
	local best
	for _, e in ipairs(State.road.edges) do
		if e.n == 2 and e.len > 160 and e.kind ~= 2 and (not best or e.len > best.len) and math.sqrt(e.x[1] ^ 2 + e.z[1] ^ 2) < 2000 then best = e end
	end
	local h = math.atan2(best.x[2] - best.x[1], best.z[2] - best.z[1])
	M.key(Enum.KeyCode.H, true)
	M.run(0.2)
	check("H switches to Realistic handling", phys.mode == 1 and Settings.get("hm") == 1 and lastToast("^Handling: Realistic") ~= nil, lastToast("^Handling"))
	Drive.place(best.x[1] + math.sin(h) * 5, best.z[1] + math.cos(h) * 5, h)
	M.run(0.5)
	M.move = Vector3.new(0, 0, -1)
	local t, top, hudOk = 0, 1, false
	M.run(12, function()
		t += 1 / 60
		top = math.max(top, phys.pts.gear)
		if string.find(Hud.gear.Text, "^G%d · %d+ rpm") then hudOk = true end
		if st.sp >= 100 / 3.6 then return "stop" end
	end)
	local c = Config.CARS[plr:GetAttribute("CurCar")]
	check("Realistic 0-100 km/h close to the car's listed time", st.sp >= 100 / 3.6 - 0.5 and math.abs(t - c.pt.t100) < 1.2,
		f1(t) .. " s for " .. c.name .. " (listed " .. c.pt.t100 .. " s), up to gear " .. top)
	check("automatic gearbox shifts up, gear and rpm on the HUD", top >= 3 and hudOk, "gear " .. top .. " · " .. Hud.gear.Text)
	M.move = Vector3.new(0, 0, 1)
	M.run(8, function()
		if st.sp < 0.3 then return "stop" end
	end)
	M.move = Vector3.zero
	M.run(0.5)
	-- E (away from the bank) = shift up: selects the manual gearbox; Q = shift down
	M.key(Enum.KeyCode.E, true)
	M.run(0.3)
	local g2 = phys.pts.gear
	M.key(Enum.KeyCode.Q, true)
	M.run(0.3)
	check("E / Q shift up and down (manual gearbox selected)", Settings.get("gb") == 1 and phys.pts.man == 1 and g2 == 2 and phys.pts.gear == 1 and string.find(Hud.gear.Text, "^M1") ~= nil,
		"gear " .. g2 .. " -> " .. phys.pts.gear .. " · " .. Hud.gear.Text)
	-- the settings menu: one row per handling setting; a click changes it
	M.key(Enum.KeyCode.Y, true)
	M.run(0.2)
	local rows = {}
	for _, d in ipairs(Hud.gui:GetDescendants()) do
		if string.sub(d.Name, 1, 4) == "Row_" then rows[string.sub(d.Name, 5)] = d end
	end
	local all = rows.hm and rows.gb and rows.abs and rows.tc and rows.esc and rows.tt and rows.bf
	check("Y opens the settings menu with the handling rows", State.ui == "Settings" and all ~= nil)
	if rows.abs then rows.abs.Activated:Fire() end
	if rows.tc then rows.tc.Activated:Fire() end
	if rows.gb then rows.gb.Activated:Fire() end
	check("menu rows change the settings (ABS off, traction control on, gearbox back to automatic)",
		phys.assist.abs == false and phys.assist.tc == true and phys.pts.man == 0 and rows.abs and string.find(rows.abs.Text, "Off") ~= nil, rows.abs and rows.abs.Text)
	if rows.abs then rows.abs.Activated:Fire() end
	if rows.tc then rows.tc.Activated:Fire() end
	Hud.closePanel()
	M.run(1.6)
	local saved = plr:GetAttribute("Settings") or ""
	check("settings saved by the server", string.find(saved, "hm=1", 1, true) ~= nil and string.find(saved, "abs=1", 1, true) ~= nil and string.find(saved, "gb=0", 1, true) ~= nil, saved)
	-- the rest of the play-through drives in Arcade (the default)
	M.key(Enum.KeyCode.H, true)
	M.run(0.2)
	check("H back to Arcade", phys.mode == 0 and lastToast("^Handling: Arcade") ~= nil)
end

-- ================= gamepad / racing wheel (Roblox sees a wheel only as a gamepad) =================
do
	local Gamepad, Settings = M.client("Gamepad"), M.client("Settings")
	local K = Enum.KeyCode
	local best
	for _, e in ipairs(State.road.edges) do
		if e.n == 2 and e.len > 160 and e.kind ~= 2 and (not best or e.len > best.len) and math.sqrt(e.x[1] ^ 2 + e.z[1] ^ 2) < 2000 then best = e end
	end
	local h = math.atan2(best.x[2] - best.x[1], best.z[2] - best.z[1])
	Drive.place(best.x[1] + math.sin(h) * 5, best.z[1] + math.cos(h) * 5, h)
	M.run(0.3)
	M.padInput(K.ButtonR2, 0, 0, 1)
	M.run(3)
	local sp1 = st.sp
	check("gamepad RT (gas pedal) accelerates", Gamepad.state.on and sp1 > 12 and State.input.th == 1, f1(sp1 * 3.6) .. " km/h after 3 s")
	-- steering: stick right turns right (heading down), left turns left, as the keys D / A
	local h0 = st.h
	M.padInput(K.Thumbstick1, 0.6, 0)
	M.run(0.6)
	local dR = st.h - h0
	M.padInput(K.Thumbstick1, -0.6, 0)
	M.run(1.2)
	local dL = st.h - (h0 + dR)
	M.padInput(K.Thumbstick1, 0, 0)
	check("gamepad steering: right turns right, left turns left", dR < -0.05 and dL > 0.05 and State.input.an == true, string.format("%+.2f / %+.2f rad", dR, dL))
	M.padInput(K.ButtonR2, 0, 0, 0)
	M.padInput(K.ButtonL2, 0, 0, 1)
	local sp2 = st.sp
	M.run(1.5)
	check("gamepad LT (brake pedal) brakes", st.sp < sp2 - 5 and State.input.br == 1, f1(sp2 * 3.6) .. " -> " .. f1(st.sp * 3.6) .. " km/h")
	M.padInput(K.ButtonL2, 0, 0, 0)
	-- the web game's steering processing: dead zone, sensitivity (range / lock), response curve, invert, centre offset
	local function steerFor(x)
		M.padInput(K.Thumbstick1, x, 0)
		Gamepad.poll(1 / 60)
		return Gamepad.state.steer
	end
	local dz = steerFor(0.05)
	local lin = steerFor(0.5)
	Settings.set("gsens", 20)
	local sens = steerFor(0.5)
	Settings.set("gsens", 10)
	Settings.set("gcurve", 20)
	local curve = steerFor(0.5)
	Settings.set("gcurve", 10)
	Settings.set("ginv", 1)
	local inv = steerFor(0.5)
	Settings.set("ginv", 0)
	Settings.set("gcen", 10)
	local cen = steerFor(0.1)
	Settings.set("gcen", 0)
	steerFor(0)
	local want = (0.5 - 0.08) / 0.92
	check("steering dead zone, sensitivity, curve, invert, centre offset (web formulas)", dz == 0 and math.abs(lin - want) < 1e-9 and sens == 1 and math.abs(curve - want * want) < 1e-9
		and math.abs(inv + want) < 1e-9 and cen == 0, string.format("dz %.3f lin %.4f sens %.3f curve %.4f inv %.4f cen %.3f", dz, lin, sens, curve, inv, cen))
	-- buttons call the same actions as the keys: Y = camera, RB = shift up (Arcade: the web game's hint), A = handbrake (held)
	M.padInput(K.ButtonY, true)
	M.padInput(K.ButtonY, false)
	M.run(0.1)
	local camT = lastToast("^Camera") ~= nil
	M.padInput(K.ButtonR1, true)
	M.padInput(K.ButtonR1, false)
	M.run(0.1)
	local gearT = lastToast("Realistic handling") ~= nil
	M.padInput(K.ButtonA, true)
	M.run(0.1)
	local hbOn = State.input.hb
	M.padInput(K.ButtonA, false)
	M.run(0.1)
	check("gamepad buttons: Y camera, RB shift up, A handbrake (held)", camT and gearT and hbOn == true and State.input.hb == false, tostring(lastToast("^Camera")))
	M.client("Camera").set(0)
	-- rumble on a hard impact (the web game's fallback when a pad has no force feedback); back on the straight first
	Drive.place(best.x[1] + math.sin(h) * 5, best.z[1] + math.cos(h) * 5, h)
	M.run(0.3)
	M.padInput(K.ButtonR2, 0, 0, 1)
	M.run(2)
	local r0 = M.rumbles or 0
	st.vx, st.vz = 0, 0
	M.run(0.3)
	M.padInput(K.ButtonR2, 0, 0, 0)
	check("rumble on a hard impact", (M.rumbles or 0) > r0, (M.rumbles or 0) - r0 .. " pulses")
	-- the setup panel (from the settings menu): live readings and the rows
	M.call(function() M.client("SettingsMenu").openPad() end)
	M.padInput(K.Thumbstick1, 0.4, 0)
	M.run(0.2)
	local live, rowGs, rowHb
	for _, d in ipairs(Hud.gui:GetDescendants()) do
		if d.Name == "Live" then live = d end
		if d.Name == "Row_gs" then rowGs = d end
		if d.Name == "Row_bhb" then rowHb = d end
	end
	check("gamepad setup panel: live readings and the binding rows", live ~= nil and string.find(live.Text, "Gamepad connected", 1, true) ~= nil and rowGs ~= nil and rowHb ~= nil,
		live and live.Text)
	if rowHb then rowHb.Activated:Fire() end
	check("a binding row changes the button", Settings.get("bhb") == 1 and string.find(rowHb.Text, "B", 1, true) ~= nil, rowHb and rowHb.Text)
	Settings.set("bhb", 0)
	Hud.closePanel()
	M.padInput(K.Thumbstick1, 0, 0)
	-- unplugged: back to the keyboard / touch input
	M.gamepad = false
	game:GetService("UserInputService").GamepadDisconnected:Fire(Enum.UserInputType.Gamepad1)
	M.run(0.2)
	check("gamepad unplugged: keyboard driving again", Gamepad.state.on == false and State.input.an == false)
	M.run(2)
end

-- ================= weather (simulated, Irbid climate table) and the Irbid local clock =================
do
	local Settings, Weather = M.client("Settings"), M.client("Weather")
	local Lighting = game:GetService("Lighting")
	local WX = Weather.state
	local d = os.date("!*t", os.time() + 3 * 3600)
	check("server rolls the Auto weather for the month in Irbid", WS:GetAttribute("WxSt") ~= nil and WS:GetAttribute("WxTc") ~= nil and WS:GetAttribute("WxMon") == d.month - 1,
		tostring(WS:GetAttribute("WxSt")) .. ", month " .. tostring(WS:GetAttribute("WxMon")))
	local br0 = Lighting.Brightness
	local road = map.Roads:GetChildren()[1]
	local c0 = road.Color
	Settings.set("wx", 3)
	M.run(45)
	local rate = WS.CurrentCamera:FindFirstChild("RainBox") and WS.CurrentCamera.RainBox.Rain.Rate or 0
	local cl = WS.Terrain and WS.Terrain:FindFirstChildOfClass("Clouds")
	check("Rain: it rains, the road gets wet, the sky darkens", WX.rain > 0.5 and WX.wet > 0.25 and rate > 500 and Lighting.Brightness < br0 * 0.6 and (cl == nil or cl.Cover > 0.6),
		string.format("rain %.2f, wet %.2f, %d drops/s, brightness %.2f -> %.2f", WX.rain, WX.wet, rate, br0, Lighting.Brightness))
	check("wet road: darker road surface, Realistic grip lower", road.Color.R < c0.R * 0.97 and State.phys.wx.mu < 0.95 and State.phys.wx.mu > 0.72,
		string.format("road R %.3f -> %.3f, grip x%.3f", c0.R, road.Color.R, State.phys.wx.mu))
	local line = Weather.line()
	check("weather line: simulated, with the Irbid rain days of the month", string.find(line, "simulated, not live", 1, true) ~= nil and string.find(line, "rain days in Irbid", 1, true) ~= nil, line)
	-- Clear: the shower eases out over ~12 s (the web game's easing), the road keeps wetting until the rain is light, then dries (~4 min)
	Settings.set("wx", 1)
	local peak = WX.wet
	M.run(60, function() peak = math.max(peak, WX.wet) end)
	check("Clear: the rain stops and the road dries", WX.rain < 0.02 and WX.wet < peak - 0.02 and rate > 0 and WS.CurrentCamera.RainBox.Rain.Rate == 0,
		string.format("rain %.3f, wet peak %.2f -> %.2f", WX.rain, peak, WX.wet))
	-- back to Clear and a dry road for the rest of the checks
	Settings.set("wx", 1)
	WX.wet, WX.rain = 0, 0
	-- Irbid local time on this device; T goes back to the game clock
	Settings.set("clk", 1)
	M.run(1.2)
	local h, _ = Weather.ammanNow()
	check("Irbid local clock (UTC+3)", math.abs(((Lighting.ClockTime - h + 12) % 24) - 12) < 0.05, string.format("%.2f h, Irbid %.2f h", Lighting.ClockTime, h))
	-- (the T key's first step; its +1 hour is checked later with the other keys)
	M.call(function() Weather.onHourKey() end)
	M.run(1)
	check("T switches back to the game clock", Settings.get("clk") == 0 and lastToast("^Clock: game time") ~= nil)
	M.run(25)
end

-- ================= sound (the web game's synthesised sounds, from the sound atlas) =================
do
	local CarAudio, Settings, Atlas = M.client("CarAudio"), M.client("Settings"), require(Shared.AudioAtlas)
	local SS = game:GetService("SoundService")
	local G = CarAudio.groups
	local eng = G.Engine:FindFirstChild("engOn")
	local loops = 0
	for _, g in ipairs({ G.Engine, G.Effects, G.Ambient }) do
		for _, c in ipairs(g:GetChildren()) do
			if c.ClassName == "Sound" and c.Looped and c.IsPlaying then loops += 1 end
		end
	end
	check("sound groups and looping sounds from the atlas", G.Engine.Parent == SS and eng ~= nil and loops >= 18 and string.find(eng.SoundId, "rbxassetid://", 1, true) ~= nil, loops .. " loops playing")
	local car = Config.CARS[State.spec.ci]
	local a = Atlas["eng_" .. car.snd.code .. "_on"]
	check("engine voice of the car's layout", eng.PlaybackRegion.Min == a.start and eng.LoopRegion.Max == a.start + a.len, car.name .. ": " .. car.snd.code .. " (" .. car.snd.src .. ")")
	-- full throttle on the straight: pitch follows the rpm, the full-load voice takes over
	local best
	for _, e in ipairs(State.road.edges) do
		if e.n == 2 and e.len > 160 and e.kind ~= 2 and (not best or e.len > best.len) and math.sqrt(e.x[1] ^ 2 + e.z[1] ^ 2) < 2000 then best = e end
	end
	local h = math.atan2(best.x[2] - best.x[1], best.z[2] - best.z[1])
	Drive.place(best.x[1] + math.sin(h) * 5, best.z[1] + math.cos(h) * 5, h)
	-- a random traffic car on this road once stopped the run (1,763 rpm, no slide): clear the road as a race start does
	Traffic.clear(st.x, st.z, 200)
	M.run(2)
	local idle = eng.PlaybackSpeed
	M.move = Vector3.new(0, 0, -1)
	M.run(2.5)
	local on, off = G.Engine.engOn.Volume, G.Engine.engOff.Volume
	check("engine pitch rises with rpm, full-load voice under throttle", eng.PlaybackSpeed > idle * 1.5 and on > off and math.abs(eng.PlaybackSpeed - CarAudio.rpm / 3000) < 1e-6,
		string.format("speed %.2f -> %.2f (%.0f rpm), on %.3f / off %.3f", idle, eng.PlaybackSpeed, CarAudio.rpm, on, off))
	-- a handbrake slide squeals (paved road)
	local maxSq = 0
	M.key(Enum.KeyCode.Space, true)
	M.move = Vector3.new(-1, 0, -1)
	M.run(1.2, function() maxSq = math.max(maxSq, G.Effects.squeal.Volume) end)
	M.key(Enum.KeyCode.Space, false)
	M.move = Vector3.zero
	check("tyres squeal in a slide", maxSq > 0.01, string.format("squeal volume %.3f at %.0f km/h", maxSq, math.sqrt(st.vx ^ 2 + st.vz ^ 2) * 3.6))
	-- the horn (X)
	M.key(Enum.KeyCode.X, true)
	M.run(0.1)
	local hv = G.Effects.horn.Volume
	game:GetService("UserInputService").InputEnded:Fire({ KeyCode = Enum.KeyCode.X, UserInputType = Enum.UserInputType.Keyboard }, false)
	M.run(0.1)
	check("horn on X", hv > 0.05 and G.Effects.horn.Volume == 0, string.format("%.3f while held", hv))
	-- a wall: the crash sound (a real building in front of the car)
	local b
	for _, p in ipairs(map.Buildings:GetChildren()) do
		local q = p.Position / S
		if math.sqrt(q.X * q.X + q.Z * q.Z) < 600 and p.Size.X > 15 and p.Size.Z > 15 then
			b = p
			break
		end
	end
	local lv = b.CFrame.LookVector
	local bx, bz = b.Position.X / S - lv.X * (b.Size.Z / S / 2 + 6), b.Position.Z / S - lv.Z * (b.Size.Z / S / 2 + 6)
	Drive.place(bx, bz, math.atan2(lv.X, lv.Z))
	local played0 = (M.played.crash1 or 0) + (M.played.crash2 or 0) + (M.played.crash3 or 0)
	st.vx, st.vz = lv.X * 15, lv.Z * 15
	M.run(1)
	local played1 = (M.played.crash1 or 0) + (M.played.crash2 or 0) + (M.played.crash3 or 0)
	check("hitting a wall plays the crash", played1 > played0, (played1 - played0) .. " crash sounds")
	-- the cockpit view muffles the outside, L mutes
	M.client("Camera").set(1)
	M.run(0.2)
	local muff = G.Effects.Muffle.HighGain
	M.client("Camera").set(0)
	M.key(Enum.KeyCode.L, true)
	M.run(0.2)
	local muted = G.Engine.Volume == 0 and G.Effects.Volume == 0 and G.Ambient.Volume == 0 and lastToast("^Sound muted") ~= nil
	M.key(Enum.KeyCode.L, true)
	M.run(0.2)
	check("cockpit view muffles the sound, L mutes and unmutes", muff <= -15 and muted and G.Engine.Volume > 0, string.format("muffle %.0f dB", muff))
	-- the volume settings set the groups
	Settings.set("veng", 4)
	M.run(0.1)
	check("engine volume setting", math.abs(G.Engine.Volume - 0.8 * 0.8 * 0.4) < 1e-6, string.format("%.3f", G.Engine.Volume))
	Settings.set("veng", 8)
end

-- ================= vehicle damage (I), diagnostics (O), the repair bay =================
do
	local CarDamage, Settings, Diagnostics = M.client("CarDamage"), M.client("Settings"), M.client("Diagnostics")
	local Damage = require(RS.Modules.Damage)
	local PD = require(game:GetService("ServerScriptService").Game.PlayerData)
	M.key(Enum.KeyCode.I, true)
	M.run(0.1)
	local m1 = CarDamage.mode()
	M.key(Enum.KeyCode.I, true)
	M.run(0.3)
	check("I: damage Off -> Cosmetic -> Full", m1 == 1 and CarDamage.mode() == 2 and lastToast("^Vehicle damage: Full") ~= nil and Settings.get("dm") == 2, lastToast("^Vehicle damage"))
	check("the car's damage record (from the server)", CarDamage.record() ~= nil and CarDamage.record().body == 100)
	-- a real building in front of the car, 15 m/s into it
	local b
	for _, p in ipairs(map.Buildings:GetChildren()) do
		local q = p.Position / S
		if math.sqrt(q.X * q.X + q.Z * q.Z) < 600 and p.Size.X > 15 and p.Size.Z > 15 then
			b = p
			break
		end
	end
	local lv = b.CFrame.LookVector
	local function toWall()
		Drive.place(b.Position.X / S - lv.X * (b.Size.Z / S / 2 + 6), b.Position.Z / S - lv.Z * (b.Size.Z / S / 2 + 6), math.atan2(lv.X, lv.Z))
		st.vx, st.vz = lv.X * 15, lv.Z * 15
		M.run(1)
	end
	toWall()
	local r = CarDamage.record()
	check("a wall at 54 km/h: dents, body and front damage recorded", r.impacts >= 1 and r.body < 100 and #r.dents >= 1 and lastToast("^Impact") ~= nil,
		string.format("%d impacts, body %.0f %%, %d dents · %s", r.impacts, r.body, #r.dents, tostring(lastToast("^Impact"))))
	check("Full: mechanical damage and its effect on driving", (r.cooling < 100 or r.engine < 100) and (CarDamage.fx.maxSpeed < 1 or CarDamage.fx.accel < 1),
		string.format("engine %.0f, cooling %.0f · top speed x%.2f, accel x%.2f", r.engine, r.cooling, CarDamage.fx.maxSpeed, CarDamage.fx.accel))
	local ov = State.car:FindFirstChild("DamageOverlay")
	local dents = 0
	for _, c in ipairs(ov and ov:GetChildren() or {}) do
		if c.Name == "Dent" then dents += 1 end
	end
	local bf = State.car.DamageParts:FindFirstChild("bf")
	check("the damage shows on the car (dents, bumper)", dents == #r.dents and bf ~= nil and (r.parts.bf < 0.15 or bf.Color ~= State.car.Body.Color), dents .. " dent patches, bumper " .. string.format("%.2f", r.parts.bf))
	M.run(1)
	local ci = State.spec.ci
	local stored = PD.data[plr].damage and PD.data[plr].damage[ci]
	check("the server keeps the record", stored ~= nil and stored.impacts == r.impacts and math.abs(stored.body - r.body) < 1e-9, stored and stored.impacts)
	-- a device cannot repair its car by sending a clean record
	M.call(function() RS.Remotes.Damage:InvokeServer("save", ci, Damage.newRecord(Config.CARS[ci])) end)
	M.run(0.6)
	stored = PD.data[plr].damage[ci]
	check("the server refuses a record that got better", stored.body < 100 and #stored.dents >= 1, string.format("body %.0f %%", stored.body))
	-- O: the diagnostics
	M.key(Enum.KeyCode.O, true)
	M.run(0.6)
	local L = Diagnostics.lines()
	local has = { engine = false, tyre = false }
	for _, q in ipairs(L) do
		if string.find(q[1], "^Engine") then has.engine = true end
		if string.find(q[1], "^Tyre FL") then has.tyre = true end
	end
	check("O: diagnostics with every component and the tyres", State.ui == "Diagnostics" and has.engine and has.tyre, #L .. " lines")
	Hud.closePanel()
	-- the repair bay: drive to Apex Drift Customs, Repair all
	PD.data[plr].cash += 20000
	PD.sync(plr)
	Drive.place(Meta.shop.x, Meta.shop.z, 0)
	M.run(1)
	M.call(function() Missions.openShop() end)
	M.run(0.2)
	local items = Damage.repairItems(CarDamage.record(), Config.CARS[ci])
	local total = 0
	for _, q in ipairs(items) do total += q.price end
	local all, rows = nil, 0
	for _, d in ipairs(Hud.gui:GetDescendants()) do
		if d.Name == "RepairAll" then all = d end
		if string.sub(d.Name, 1, 7) == "Repair_" then rows += 1 end
	end
	check("repair bay lists every damaged part with a price", all ~= nil and rows == #items and total > 0, rows .. " items, " .. total .. " JD")
	local cash0 = plr:GetAttribute("Cash")
	if all then all.Activated:Fire() end
	M.run(1)
	check("Repair all: paid in JD, the car is like new", cash0 - plr:GetAttribute("Cash") == total and not Damage.hurt(CarDamage.record()) and lastToast("^🔧 Repaired") ~= nil,
		(cash0 - plr:GetAttribute("Cash")) .. " JD · " .. tostring(lastToast("^🔧")))
	Hud.closePanel()
	-- a handbrake slide wears the rear tyres
	local best
	for _, e in ipairs(State.road.edges) do
		if e.n == 2 and e.len > 160 and e.kind ~= 2 and (not best or e.len > best.len) and math.sqrt(e.x[1] ^ 2 + e.z[1] ^ 2) < 2000 then best = e end
	end
	local h = math.atan2(best.x[2] - best.x[1], best.z[2] - best.z[1])
	Drive.place(best.x[1] + math.sin(h) * 5, best.z[1] + math.cos(h) * 5, h)
	M.move = Vector3.new(0, 0, -1)
	M.run(3)
	M.key(Enum.KeyCode.Space, true)
	M.move = Vector3.new(-1, 0, -1)
	M.run(1.5)
	M.key(Enum.KeyCode.Space, false)
	M.move = Vector3.zero
	M.run(1)
	local W = CarDamage.record().wheels
	check("a handbrake slide heats and wears the rear tyres", W[3].tread < 100 and W[3].tmax > 30, string.format("RL tread %.4f %%, %d °C max", W[3].tread, W[3].tmax))
	-- Off: nothing is recorded
	Settings.set("dm", 0)
	M.run(0.1)
	local n0 = CarDamage.record().impacts
	toWall()
	check("damage Off: a hit records nothing", CarDamage.record().impacts == n0)
	Settings.set("dm", 2)
	toWall()
	M.run(1)
	Settings.set("dm", 0)
	M.run(0.5)
end

-- ================= road reputation, auto-drive (Z), the driving school =================
do
	local Rep, AutoDrive, School, Gps = M.client("Reputation"), M.client("AutoDrive"), M.client("School"), M.client("Gps")
	local Laws = M.client("Laws")
	-- a fine lowers the reputation (red light -4) and a low reputation widens the gap the traffic keeps behind you
	local r0 = Rep.state.road
	M.call(function() Laws.fine("red", "Ran a red light", 3) end)
	check("road reputation: a red-light fine costs 4", Rep.state.road == math.max(0, r0 - 4), r0 .. " -> " .. Rep.state.road)
	Rep.state.road = 20
	M.call(function() Rep.event("spd") end)
	check("low reputation: traffic keeps a longer gap behind you", math.abs(State.repGap - (6.5 + (50 - 19) * 0.11)) < 1e-9, string.format("%.2f m", State.repGap))
	M.run(3.5)
	check("reputation saved by the server", string.match(plr:GetAttribute("Rep") or "", "^19") ~= nil, plr:GetAttribute("Rep"))
	Rep.state.road = 70
	-- auto-drive: a destination 300-700 m away on the road graph, Z, the car drives itself there
	local target
	for _, pl in ipairs(Places) do
		local d = math.sqrt((pl.x - st.x) ^ 2 + (pl.z - st.z) ^ 2)
		if d > 300 and d < 700 then
			target = pl
			break
		end
	end
	Drive.reset()
	M.run(1)
	M.call(function() Gps.go({ n = target.n, x = target.x, z = target.z }) end)
	M.key(Enum.KeyCode.Z, true)
	M.run(0.2)
	check("Z: auto-drive on with a route", AutoDrive.state.on == true and lastToast("^🤖 Auto%-drive on") ~= nil, lastToast("Auto"))
	local d0 = math.sqrt((target.x - st.x) ^ 2 + (target.z - st.z) ^ 2)
	local maxSp, t = 0, 0
	M.run(150, function()
		t += 1 / 60
		maxSp = math.max(maxSp, st.sp)
		if not AutoDrive.state.on then return "stop" end
	end)
	local d1 = math.sqrt((target.x - st.x) ^ 2 + (target.z - st.z) ^ 2)
	check("auto-drive follows the route to the destination and stops", lastToast("arrived") ~= nil and d1 < 60 and st.sp < 0.5,
		string.format("%s: %.0f m -> %.0f m in %.0f s, top %.0f km/h · %s", target.n, d0, d1, t, maxSp * 3.6, tostring(lastToast("Auto%-drive"))))
	-- any input takes the controls back
	M.call(function() Gps.go({ n = target.n, x = 0, z = 0 }) end)
	M.key(Enum.KeyCode.Z, true)
	M.run(1)
	M.move = Vector3.new(0, 0, -1)
	M.run(0.2)
	M.move = Vector3.zero
	check("gas, brake or steering takes the controls back", AutoDrive.state.on == false and lastToast("you took control") ~= nil)
	Gps.clear()
	-- the driving school: lesson 1 (stop in the box), driven with the keys like a learner
	local function lesson(i, drive)
		M.call(function() School.start(i) end)
		M.run(0.3)
		local S0 = School.state
		M.run(40, function()
			local s = S0.site
			if not s or S0.over then return "stop" end
			local dx, dz = st.x - s.x0, st.z - s.z0
			drive(dx * s.ux + dz * s.uz, st.sp * 3.6)
		end)
		M.move = Vector3.zero
		M.run(0.3)
		return S0
	end
	local S1 = lesson(1, function(a, v)
		-- a speed that brings the car to rest at the box centre (90 m): about 9 m/s, then sqrt(2 * 2 * remaining)
		local want = math.min(9, math.sqrt(math.max(0, 2 * 2 * (89.5 - a)))) * 3.6
		M.move = v < want - 2 and Vector3.new(0, 0, -1) or v > want + 2 and Vector3.new(0, 0, 1) or Vector3.zero
		if a > 88 and v > 0.5 then M.move = Vector3.new(0, 0, 1) end
	end)
	check("driving school lesson 1 (start and stop): passed in the box", S1.st == "pass" and S1.score > 50 and State.ui == "Driving school result", S1.st .. " · " .. S1.score .. " · " .. S1.msg)
	local nextB
	for _, d in ipairs(Hud.gui:GetDescendants()) do
		if d.Name == "Next" then nextB = d end
	end
	check("result card with Retry / Next", nextB ~= nil)
	Hud.closePanel()
	-- lesson 2 as asked: about 55 km/h at the red line, then full brakes
	local S2 = lesson(2, function(a, v)
		if a < 130 then
			M.move = v < 55 and Vector3.new(0, 0, -1) or Vector3.zero
		else
			M.move = Vector3.new(0, 0, 1)
		end
	end)
	check("driving school lesson 2 (emergency stop from 50 km/h): passed", S2.st == "pass", S2.st .. " · " .. S2.score .. " · " .. S2.msg)
	Hud.closePanel()
	School.stop()
	M.run(1)
	check("best scores saved by the server", string.find(plr:GetAttribute("School") or "", "stop=", 1, true) ~= nil and string.find(plr:GetAttribute("School") or "", "brake=", 1, true) ~= nil,
		plr:GetAttribute("School"))
	Drive.reset()
	M.run(1)
	-- search: the category chips filter by place kind; ☆ saves a place, listed first in the empty search
	local Search = M.client("Search")
	M.call(function() Nav.open() end)
	local chip, star
	for _, d in ipairs(Hud.gui:GetDescendants()) do
		if d.Name == "Chip_wor" then chip = d end
	end
	chip.Activated:Fire()
	M.run(0.1)
	local results, worship = 0, 0
	for _, d in ipairs(Hud.gui:GetDescendants()) do
		if d.Name == "Result" then
			results += 1
			-- the place behind the row: its kind must be a worship kind
			local name = string.match(d.Go.Text, "^(.-)  ·  ")
			for _, pl in ipairs(Places) do
				if pl.n == name and (pl.k == "mosque" or pl.k == "church") then
					worship += 1
					break
				end
			end
			star = star or d.Star
		end
	end
	check("search chips: Worship lists only mosques and churches", results > 0 and worship == results, worship .. " of " .. results)
	chip.Activated:Fire()
	star.Activated:Fire()
	M.run(1.2)
	Hud.closePanel()
	M.call(function() Nav.open() end)
	local first
	for _, d in ipairs(Hud.gui:GetDescendants()) do
		if d.Name == "Result" and not first then first = d end
	end
	check("☆ saves a place: saved by the server and listed first", #Search.fav == 1 and first and string.sub(first.Go.Text, 1, 3) == "★" and string.find(plr:GetAttribute("Fav") or "", "|", 1, true) ~= nil,
		tostring(plr:GetAttribute("Fav")))
	Hud.closePanel()
	-- traffic density: Low = 35 % of the cars; By time of day follows the hour (never parking a car near the player)
	local Settings = M.client("Settings")
	Settings.set("tr", 2)
	M.run(0.5)
	local low = Traffic.driving()
	Settings.set("tr", 3)
	M.run(6)
	local h = game:GetService("Lighting").ClockTime
	local want = M.client("TrafficDensity").den()
	local auto = Traffic.driving()
	Settings.set("tr", 0)
	M.run(0.5)
	check("traffic density: Low 35 %, by time of day, High all", low == math.floor(Config.TRAFFIC_CARS * 0.35 + 0.5) and auto >= math.floor(Config.TRAFFIC_CARS * want + 0.5) and Traffic.driving() == Config.TRAFFIC_CARS,
		string.format("low %d, at %.1f h %d (curve %.0f %%), high %d", low, h, auto, want * 100, Traffic.driving()))
	Settings.set("ts", 3)
	M.run(0.1)
	check("text size 140 %", Hud.gui.TextSize.Scale == 1.4)
	Settings.set("ts", 1)
end

-- ================= drifting -> drift bank and cash (server) =================
do
	local cash0, bank0 = plr:GetAttribute("Cash"), plr:GetAttribute("DriftBank")
	local maxPts = 0
	Drive.reset()
	M.run(0.5)
	M.move = Vector3.new(0, 0, -1)
	M.run(3)
	M.key(Enum.KeyCode.Space, true)
	M.move = Vector3.new(-1, 0, -1)
	M.run(1.4, function() maxPts = math.max(maxPts, Drive.drift.pts) end)
	M.key(Enum.KeyCode.Space, false)
	M.move = Vector3.zero
	M.run(0.3, function() maxPts = math.max(maxPts, Drive.drift.pts) end)
	check("handbrake turn scores drift points", maxPts > 20, f1(maxPts) .. " points")
	M.run(2)
	-- bank a known amount directly through the remote
	local before = plr:GetAttribute("DriftBank")
	RS.Remotes.BankDrift:FireServer(1000)
	M.run(0.2)
	check("server banks drift points", plr:GetAttribute("DriftBank") - before == 1000, plr:GetAttribute("DriftBank") - before)
	check("drift points pay cash (0.25 each)", plr:GetAttribute("Cash") >= cash0 + 250, (plr:GetAttribute("Cash") - cash0) .. " cash since start of test")
	RS.Remotes.BankDrift:FireServer(1e9)
	M.run(0.2)
	local got = plr:GetAttribute("DriftBank") - before - 1000
	check("server caps an impossible drift", got < 2000, "credited " .. got .. " of 1e9")
	RS.Remotes.BankDrift:FireServer(0 / 0)
	RS.Remotes.BankDrift:FireServer("lots")
	M.run(0.2)
	check("server ignores bad drift values", #M.errors == 0 and plr:GetAttribute("DriftBank") == before + 1000 + got)
end

-- ================= traffic =================
do
	local moved, off, bad = 0, 0, 0
	local p0 = {}
	for i, a in ipairs(Traffic.agents) do p0[i] = { a.x, a.z } end
	M.run(15)
	for i, a in ipairs(Traffic.agents) do
		if a.x ~= a.x or a.z ~= a.z then bad += 1 end
		if math.sqrt((a.x - p0[i][1]) ^ 2 + (a.z - p0[i][2]) ^ 2) > 20 then moved += 1 end
		local near = Road.nearest(State.road, a.x, a.z, 60)
		if not near or near.d > near.e.w / 2 + 2.5 then off += 1 end
	end
	check("traffic cars exist", #Traffic.agents == Config.TRAFFIC_CARS, #Traffic.agents)
	check("traffic drives", moved >= #Traffic.agents * 0.6, moved .. " of " .. #Traffic.agents .. " moved > 20 m in 15 s")
	check("traffic stays on the roads", off == 0 and bad == 0, off .. " off the road, " .. bad .. " NaN")
	-- measured against the nearest road, so cars inside a junction (within 15 m of a node where 3+ roads meet) are left out: there the
	-- nearest road can be the crossing street (16 runs before this rule: 75-80 of 80, the misses at junctions)
	local right, counted = 0, 0
	local junc = {}
	for _, nd in pairs(State.road.nodes) do
		if nd.deg >= 3 then
			local k = math.floor(nd.x / 50) * 100000 + math.floor(nd.z / 50)
			junc[k] = junc[k] or {}
			table.insert(junc[k], nd)
		end
	end
	local function inJunction(x, z)
		for i = -1, 1 do
			for j = -1, 1 do
				for _, nd in ipairs(junc[(math.floor(x / 50) + i) * 100000 + math.floor(z / 50) + j] or {}) do
					if (nd.x - x) ^ 2 + (nd.z - z) ^ 2 < 225 then return true end
				end
			end
		end
		return false
	end
	for _, a in ipairs(Traffic.agents) do
		local near = Road.nearest(State.road, a.x, a.z, 60)
		if near and not inJunction(a.x, a.z) then
			counted += 1
			local d = Road.dirFor(near, math.sin(a.h), math.cos(a.h))
			local side = (a.x - near.x) * (-near.tz * d) + (a.z - near.z) * (near.tx * d)
			if side >= -0.3 then right += 1 end
		end
	end
	check("traffic keeps to the right-hand lane", counted >= #Traffic.agents * 0.5 and right >= counted * 0.95, right .. " of " .. counted .. " away from junctions (" .. #Traffic.agents .. " cars)")
end

-- ================= races =================
do
	local RaceM = M.client("Race")
	local C = Missions.circuits
	check("race circuits loaded", #C >= 1, #C)
	local cash0 = plr:GetAttribute("Cash")
	-- 1) teleporting through the checkpoints is refused by the server
	M.call(function() RaceM.toggle() end)
	check("race starts with a countdown", State.mission == "race" and State.frozen == true and #Missions.rivals == 3, Hud.mission.Text)
	local named = Missions.rivals[1].driver == "Samer" and Missions.rivals[2].driver == "Layth" and Missions.rivals[3].driver == "Omar"
		and math.abs(Missions.rivals[1].sk0 - 0.96) < 1e-9 and math.abs(Missions.rivals[3].sk0 - 1.0) < 1e-9
	check("the web game's racers Samer, Layth, Omar (skills .96 / .98 / 1.00, moved by their record)", named and Missions.rivals[2].skill >= 0.94 and Missions.rivals[2].skill <= 1.05)
	M.run(4.2)
	check("countdown ends", State.frozen == false)
	local c = nil
	for _, x in ipairs(C) do
		local d = (x.P.x[1] - st.x) ^ 2 + (x.P.z[1] - st.z) ^ 2
		if not c or d < c[2] then c = { x, d } end
	end
	c = c[1]
	local r0 = Missions.rivals[1].s
	local roadOff = 0
	M.run(6, function()
		for _, a in ipairs(Missions.rivals) do
			local n = Road.nearest(State.road, a.x, a.z, 40)
			if not n or n.d > n.e.w / 2 + 1 then roadOff += 1 end
		end
	end)
	check("rivals race along the circuit", Missions.rivals[1].s > r0 + 40, f1(Missions.rivals[1].s - r0) .. " m in 6 s from a standing start")
	check("rivals stay on the road", roadOff == 0, roadOff .. " frames off")
	for _, cp in ipairs(c.cps) do
		Drive.place(cp.x, cp.z, st.h)
		M.run(0.1)
	end
	M.run(0.5)
	local ft = lastToast("^Finished")
	check("teleport race result refused", ft ~= nil and string.find(ft, "+", 1, true) == nil, ft)
	M.run(6.5)
	check("race ends", State.mission == nil and #Missions.rivals == 0)
	-- 2) a race that takes a believable time pays by place
	M.call(function() RaceM.toggle() end)
	M.run(4.2)
	local minT = 3 + c.P.c[#c.P.c] / (State.spec.vm * 1.2)
	M.run(minT + 2)
	local cash1 = plr:GetAttribute("Cash")
	local fin
	for _, cp in ipairs(c.cps) do
		fin = 0
		for _, a in ipairs(Missions.rivals) do if a.done then fin += 1 end end
		Drive.place(cp.x, cp.z, st.h)
		M.run(0.1)
	end
	M.run(0.5)
	local paid = plr:GetAttribute("Cash") - cash1
	-- (the balance can also move by a fine for touching traffic on the way, so read the prize from the finish message)
	local ftx = lastToast("^Finished") or ""
	local prize = tonumber((string.gsub(string.match(ftx, "%+([%d,]+) JD") or "0", ",", "")))
	check("race pays by finishing place", prize == Config.RACE_REWARD[fin + 1] and paid >= prize, "P" .. (fin + 1) .. ", prize " .. tostring(prize) .. ", balance +" .. paid)
	M.run(7)
	-- 3) R during a race cancels it
	M.call(function() RaceM.toggle() end)
	M.call(function() RaceM.toggle() end)
	check("R cancels a race", State.mission == nil and State.frozen == false and #Missions.rivals == 0)
end

-- ================= heist =================
do
	local bx, bz = Meta.bank.x, Meta.bank.z
	local function toBank()
		Drive.place(bx, bz, st.h)
		M.run(0.6)
	end
	Drive.place(bx + 200, bz, 0)
	M.run(0.3)
	-- robbing away from the bank does nothing
	M.call(function() Missions.rob() end)
	check("cannot rob away from the bank", State.mission == nil)
	toBank()
	local cash0 = plr:GetAttribute("Cash")
	M.call(function() Missions.rob() end)
	check("bank robbed", State.mission == "heist", Hud.mission.Text)
	local closest, t = 1e9, 0
	M.run(60, function()
		t += 1 / 60
		M.move = Vector3.zero
		for _, a in ipairs(Missions.cops) do
			closest = math.min(closest, math.sqrt((a.x - st.x) ^ 2 + (a.z - st.z) ^ 2))
		end
		if State.mission == nil then return "stop" end
	end)
	check("police come and catch a car that stays put", State.mission == nil, "after " .. f1(t) .. " s, closest " .. f1(closest) .. " m")
	M.run(0.5)
	local bt = lastToast("^Busted")
	check("busted costs up to 50", bt ~= nil and string.find(bt, "-50", 1, true) ~= nil, bt)
	M.call(function() Missions.rob() end)
	check("bank closed after a heist", State.mission == nil)
	-- after the cool-down: escape by keeping away from the police
	M.run(Config.HEIST_COOLDOWN + 1)
	toBank()
	cash0 = plr:GetAttribute("Cash")
	M.call(function() Missions.rob() end)
	check("bank open again after 3:00", State.mission == "heist")
	local hop = 0
	M.run(Config.HEIST_TIME + 5, function()
		hop += 1
		if hop % 30 == 0 then
			-- jump to the road point furthest from every police car among a few candidates
			local best, bd = nil, -1
			for k = 1, 8 do
				local a = k * 0.785
				local near = Road.nearest(State.road, math.sin(a) * 1200, math.cos(a) * 1200, 300)
				if near then
					local m = 1e9
					for _, c in ipairs(Missions.cops) do m = math.min(m, (c.x - near.x) ^ 2 + (c.z - near.z) ^ 2) end
					if m > bd then best, bd = near, m end
				end
			end
			if best then Drive.place(best.x, best.z, 0) end
		end
		if State.mission == nil then return "stop" end
	end)
	M.run(0.5)
	check("escaping pays 500", plr:GetAttribute("Cash") - cash0 == Config.HEIST_REWARD, plr:GetAttribute("Cash") - cash0)
	check("police removed after the heist", #Missions.cops == 0)
end

-- ================= Apex Drift Customs =================
do
	M.run(30)
	RS.Remotes.BankDrift:FireServer(5000)
	M.run(0.2)
	local bank0 = plr:GetAttribute("DriftBank")
	-- away from the shop
	Drive.place(Meta.shop.x + 300, Meta.shop.z, 0)
	M.run(0.3)
	local ok, msg = M.call(function() return RS.Remotes.CarAction:InvokeServer("upgrade", 3) end)
	check("upgrades only at the shop", ok == false, tostring(msg))
	Drive.place(Meta.shop.x, Meta.shop.z, 0)
	M.run(0.6)
	M.call(function() Missions.openShop() end)
	check("shop menu opens at the shop", State.ui == "Apex Drift Customs")
	Hud.closePanel()
	local vm0, hd0 = State.spec.vm, State.spec.hd
	ok = M.call(function() return RS.Remotes.CarAction:InvokeServer("upgrade", 3) end)
	local ok2 = M.call(function() return RS.Remotes.CarAction:InvokeServer("upgrade", 1) end)
	M.run(0.2)
	check("upgrades bought with drift points", ok and ok2 and bank0 - plr:GetAttribute("DriftBank") == 800 + 1500, "spent " .. (bank0 - plr:GetAttribute("DriftBank")))
	check("upgrade levels saved on the car", plr:GetAttribute("Tune") == "1,0,1,0", plr:GetAttribute("Tune"))
	check("upgrades change the car", math.abs(State.spec.vm - vm0 * 1.05) < 1e-6 and math.abs(State.spec.hd - (hd0 + 0.07)) < 1e-6, f1(vm0 * 3.6) .. " -> " .. f1(State.spec.vm * 3.6) .. " km/h")
	-- spend the bank on Extra Drift Points until the next level is too dear, then that purchase must be refused
	local lv4 = 0
	while plr:GetAttribute("DriftBank") >= Config.upgradePrice(4, lv4) and lv4 < Config.UPGRADE_MAX do
		M.call(function() return RS.Remotes.CarAction:InvokeServer("upgrade", 4) end)
		lv4 += 1
	end
	local bank = plr:GetAttribute("DriftBank")
	local okx, msgx = M.call(function() return RS.Remotes.CarAction:InvokeServer("upgrade", 4) end)
	check("an upgrade needs enough drift points", okx == false and plr:GetAttribute("DriftBank") == bank, tostring(msgx) .. ", bank " .. bank .. ", level " .. lv4)
	check("Extra Drift Points upgrade applies", State.spec.dr == lv4, State.spec.dr)
end

-- ================= car wheel and garage =================
do
	local Rules = require(Shared.Rules)
	M.run(30)
	RS.Remotes.BankDrift:FireServer(40000)
	M.run(0.2)
	local cash0 = plr:GetAttribute("Cash")
	local x0, z0 = st.x, st.z
	local ok, r = M.call(function() return RS.Remotes.CarAction:InvokeServer("spin") end)
	M.run(1.5)
	-- the won car is one of the web wheel's cars for that slice (08a: a slice's list can hold a car of another rarity, e.g. WHEEL_OLD)
	local inPool = false
	for _, i in ipairs(type(r) == "table" and Rules.wheelPools[r.tier + 1] or {}) do
		if i == r.car then inPool = true end
	end
	check("wheel spin", ok == true and type(r) == "table" and Config.CARS[r.car] ~= nil and inPool, type(r) == "table" and (Config.CARS[r.car].name .. " tier " .. r.tier .. (r.dup and " duplicate" or "")) or tostring(r))
	local cost = cash0 - plr:GetAttribute("Cash")
	check("wheel costs 10,000 (5,000 back on a duplicate)", cost == (r.dup and 5000 or 10000), cost)
	if not r.dup then
		check("won car equipped where the old one was", State.car and State.car:GetAttribute("carIndex") == r.car and math.sqrt((st.x - x0) ^ 2 + (st.z - z0) ^ 2) < 8)
	end
	-- the garage: buy the Family Sedan (2,500)
	cash0 = plr:GetAttribute("Cash")
	ok = M.call(function() return RS.Remotes.CarAction:InvokeServer("buy", 2) end)
	M.run(1)
	check("garage buys a car", ok and plr:GetAttribute("CurCar") == 2 and (cash0 - plr:GetAttribute("Cash") == 2500 or (r.car == 2)), (cash0 - plr:GetAttribute("Cash")) .. " cash")
	check("each car has its own upgrades", plr:GetAttribute("Tune") == "0,0,0,0" and State.spec.name == Config.CARS[2].name)
	local vipIx = 0
	for i, c in ipairs(Config.CARS) do
		if c.vip then vipIx = i end
	end
	local vipOk, vipMsg = M.call(function() return RS.Remotes.CarAction:InvokeServer("buy", vipIx) end)
	check("VIP car needs the pass", vipOk == false, tostring(vipMsg))
	M.call(function() Menus.garage() end)
	local rows = 0
	for _, d in ipairs(Hud.gui:GetDescendants()) do
		if d.ClassName == "TextButton" and string.find(d.Text, "km/h", 1, true) then rows += 1 end
	end
	check("garage lists every car", rows == #Config.CARS, rows)
	Hud.closePanel()
	check("menu closes", State.ui == nil)
end

-- ================= the web game's car shapes (07a mkPorsche + 07a4 light lines) =================
do
	local car = State.car
	local c = Config.CARS[car:GetAttribute("carIndex")]
	local n = { Shell = 0, Wedge = 0, Glass = 0, Wheel = 0, Rim = 0, Headlight = 0, Taillight = 0, Neon = 0 }
	local corners, lights = {}, {}
	local lo, hi = Vector3.new(1e9, 1e9, 1e9), Vector3.new(-1e9, -1e9, -1e9)
	for _, p in ipairs(car:GetChildren()) do
		if n[p.Name] then n[p.Name] += 1 end
		if p.ClassName == "WedgePart" then n.Wedge += 1 end
		if p.Name == "Wheel" then corners[p:GetAttribute("Corner")] = true end
		if p.Name == "Headlight" or p.Name == "Taillight" then lights[p:GetAttribute("Light")] = true end
		if (p.Name == "Shell" or p.Name == "Glass" or p.Name == "Roof" or p.Name == "Wheel") and p:IsA("BasePart") then
			local q = car.Body.CFrame:PointToObjectSpace(p.Position)
			local hs = p.Size / 2
			-- the parts' extents in the car's frame (boxes only approximately for the rotated wedges: their centre +- half size)
			lo = Vector3.new(math.min(lo.X, q.X - hs.X), math.min(lo.Y, q.Y - hs.Y), math.min(lo.Z, q.Z - hs.Z))
			hi = Vector3.new(math.max(hi.X, q.X + hs.X), math.max(hi.Y, q.Y + hs.Y), math.max(hi.Z, q.Z + hs.Z))
		end
	end
	local all4 = corners[0] and corners[1] and corners[2] and corners[3] and lights[0] and lights[1] and lights[2] and lights[3]
	check("player car: the web body profile (blocks + wedges), glass house, lamps, wheels with rims, its light lines",
		n.Shell >= 4 and n.Wedge >= 1 and n.Glass >= 1 and n.Wheel == 4 and n.Rim == 4 and n.Headlight == 2 and n.Taillight == 2 and n.Neon >= 4 and all4 == true,
		string.format("%d body pieces (%d wedges), %d glass, %d wheels, %d rims, %d neon", n.Shell, n.Wedge, n.Glass, n.Wheel, n.Rim, n.Neon))
	-- every wedge's three corners lie on the web profile: Roblox's WedgePart has its right angle at the bottom-back edge (y = -h/2,
	-- z = +h/2) and its slope down to the front; the corners in web car-local metres must be points of the body profile or the glass house
	local P0 = M.client("State") and require(RS.Modules.CarBody).PROF[c.body]
	local bh = (c.H - 0.3) * P0.bf
	local y0 = 0.3 + bh
	local lift = c.H * 0.34 - 0.12
	local pts = { { c.L / 2, 0.3 + bh * P0.nf }, { c.L * (0.5 - P0.hl), y0 }, { -c.L * 0.42, y0 }, { -c.L / 2, 0.3 + bh * P0.rf },
		{ c.L * (0.5 - P0.hl), 0.3 + bh * P0.nf }, { -c.L * 0.42, 0.3 + bh * P0.rf } }
	for _, f in ipairs(P0.g) do
		pts[#pts + 1] = { f * c.L, y0 }
		pts[#pts + 1] = { f * c.L, c.H }
	end
	local wedges, onProfile = 0, 0
	for _, p in ipairs(car:GetChildren()) do
		if p.ClassName == "WedgePart" then
			wedges += 1
			local ok = 0
			local h, d = p.Size.Y / 2, p.Size.Z / 2
			for _, v in ipairs({ Vector3.new(0, -h, d), Vector3.new(0, -h, -d), Vector3.new(0, h, d) }) do
				local q = car.Body.CFrame:PointToObjectSpace(p.CFrame:PointToWorldSpace(v)) / S
				-- model (X right, -Z forward) -> web (z forward, y up from the ground point)
				local wz, wy = -q.Z, q.Y + lift
				for _, pt in ipairs(pts) do
					if math.abs(pt[1] - wz) < 0.01 and math.abs(pt[2] - wy) < 0.01 then
						ok += 1
						break
					end
				end
			end
			if ok == 3 then onProfile += 1 end
		end
	end
	check("every wedge's corners on the web body profile", wedges > 0 and onProfile == wedges, onProfile .. " of " .. wedges)
	local size = (hi - lo) / S
	check("player car the web car's size (length, width, height)", math.abs(size.Z - c.L) < 0.25 and math.abs(size.X - c.W) < 0.2 and math.abs(size.Y - (c.H + 0.06)) < 0.35,
		string.format("%.2f x %.2f x %.2f m (web %.2f x %.2f x %.2f)", size.Z, size.X, size.Y, c.L, c.W, c.H))
	-- traffic: Common cars plain, Uncommon and up with their light lines (the web game's carMesh)
	local plainOk, neonOk, seen0, seen1 = true, true, 0, 0
	for _, a in ipairs(Traffic.agents) do
		local neon = 0
		for _, p in ipairs(a.model:GetChildren()) do
			if p.Name == "Neon" then neon += 1 end
		end
		if (a.car.tier or 0) == 0 then
			seen0 += 1
			if neon > 0 then plainOk = false end
		else
			seen1 += 1
			if neon == 0 then neonOk = false end
		end
	end
	check("traffic: light lines on Uncommon and up only", plainOk and neonOk and seen0 > 0, seen0 .. " common, " .. seen1 .. " others")
end

-- ================= the web game's landmarks, street furniture and trees =================
do
	local data = require(game:GetService("ServerStorage").IrbidData.Landmarks)
	local lm = map:FindFirstChild("Landmarks")
	check("hand-built landmarks: every exported part built", lm ~= nil and #lm:GetChildren() == #data and #data > 300, (lm and #lm:GetChildren() or 0) .. " / " .. #data)
	local Props = M.client("Props")
	Drive.reset()
	M.run(1.2)
	local kinds = {}
	for _, p in ipairs(Props.folder:GetChildren()) do kinds[p.Name] = (kinds[p.Name] or 0) + 1 end
	local live0 = Props.live
	check("street lights, poles and trees around the car (the web game's LOD radius)", (kinds.lampPole or 0) > 10 and (kinds.trunk or 0) + (kinds.canopy or 0) > 10 and live0 < 6000 and #Props.folder:GetChildren() == live0,
		string.format("%d live of %d: %d lamp poles, %d trunks, %d canopies, %d utility poles", live0, Props.count, kinds.lampPole or 0, kinds.trunk or 0, kinds.canopy or 0, kinds.utilPole or 0))
	-- far away: the old cells go, new ones come, the count stays bounded
	Drive.place(2000, 1500, 0)
	M.run(1.2)
	local near0 = 0
	for _, p in ipairs(Props.folder:GetChildren()) do
		if (p.Position / S - Vector3.new(0, p.Position.Y / S, 0)).Magnitude < 300 then near0 += 1 end
	end
	check("props behind the car are removed", near0 == 0 and Props.live < 6000 and #Props.folder:GetChildren() == Props.live, Props.live .. " live, " .. near0 .. " left at the start")
	Drive.reset()
	M.run(1.2)
end

-- ================= the web game's roadside objects (07e: breakable / movable, colliders) =================
do
	local RO, CarDamage, Ground, Props = M.client("RoadsideObjects"), M.client("CarDamage"), M.client("Ground"), M.client("Props")
	local Objects = RO.Objects
	local n, types = 0, {}
	for _, d in ipairs(RS.IrbidShared:GetChildren()) do
		if string.match(d.Name, "^Objects_%d+$") then
			local m = require(d)
			local k = 0
			for _ in string.gmatch(m.rows, "-?%d+") do k += 1 end
			n += k / m.w
		end
	end
	for _, o in ipairs(Objects.list) do types[o.type or "-"] = (types[o.type or "-"] or 0) + 1 end
	check("the web game's roadside colliders loaded", RO.count == n and n > 20000 and (types.streetLight or 0) > 1000 and (types.tree or 0) > 5000 and (types.bin or 0) > 100 and (types.guardrail or 0) > 1000,
		string.format("%d: %d street lights, %d utility poles, %d signs, %d trees, %d dumpsters, %d guardrail segments, %d other", n, types.streetLight or 0, types.utilityPole or 0,
			types.sign or 0, types.tree or 0, types.bin or 0, types.guardrail or 0, (types["-"] or 0) + (types.solid or 0)))
	local function setMode(m)
		local k = 0
		while CarDamage.mode() ~= m and k < 4 do
			M.call(function() CarDamage.cycle() end)
			M.run(0.1)
			k += 1
		end
	end
	-- an object of a type with a clear 9 m run-up: no other collider and no building wall on the way (seen from the object)
	local used = {}
	local function find(t, test)
		for _, o in ipairs(Objects.list) do
			if o.type == t and not o.broken and not used[o] and math.sqrt(o.x * o.x + o.z * o.z) < 2500 and (not test or test(o)) then
				for k = 0, 7 do
					local a = k * math.pi / 4
					local dx, dz = math.sin(a), math.cos(a)
					local clear = true
					local sz = o.r or math.max(o.hw, o.hd)
					for s = 0, 14 do
						local px, pz = o.x + dx * (sz + 1 + s), o.z + dz * (sz + 1 + s)
						for _, c in ipairs(Objects.near(px, pz) or {}) do
							if c ~= o and not c.broken and math.sqrt((c.x - px) ^ 2 + (c.z - pz) ^ 2) < (c.r or math.max(c.hw, c.hd)) + 3.4 then clear = false end
						end
					end
					if clear and not Ground.wall(o.x + dx * (sz + 1), Ground.TH(o.x, o.z) + 0.5, o.z + dz * (sz + 1), dx, dz, 16) then
						used[o] = true
						return o, dx, dz
					end
				end
			end
		end
	end
	-- drive at v (m/s) into the object from (dx, dz), the contact after ~0.3 s; returns the car's speed along the run after it
	local function hit(o, dx, dz, v, secs)
		local sz = o.r or math.max(o.hw, o.hd)
		local d = sz + 2.2 + v * 0.3 + 0.3
		Drive.place(o.x + dx * d, o.z + dz * d, math.atan2(-dx, -dz))
		M.run(0.7)
		Drive.place(o.x + dx * d, o.z + dz * d, math.atan2(-dx, -dz))
		st.vx, st.vz = -dx * v, -dz * v
		M.run(secs or 0.6)
		return -(st.vx * dx + st.vz * dz)
	end
	local function parts(o)
		local L = {}
		for p, b in pairs(RO.reg[o.id] or {}) do L[#L + 1] = { p, b } end
		return L
	end
	-- damage Off: every object is rigid (the car bounces, nothing breaks)
	setMode(0)
	local o1, dx, dz = find("streetLight")
	local played0 = (M.played.crash1 or 0) + (M.played.crash2 or 0) + (M.played.crash3 or 0)
	local vAfter = hit(o1, dx, dz, 20)
	local played1 = (M.played.crash1 or 0) + (M.played.crash2 or 0) + (M.played.crash3 or 0)
	check("damage Off: a street light at 72 km/h is rigid, the car bounces", not o1.broken and vAfter < 0 and played1 > played0 and #parts(o1) >= 2,
		string.format("speed along the run %.1f m/s, %d crash sounds, %d parts drawn", vAfter, played1 - played0, #parts(o1)))
	-- Full: a street light snaps at 90 km/h and falls along the car's path; a stump stays, the lamp and arm are gone; the car keeps going
	setMode(2)
	local o2
	o2, dx, dz = find("streetLight")
	local fallen0 = #RO.falling
	vAfter = hit(o2, dx, dz, 25, 0.35)
	local f = nil
	for _, c in ipairs(RO.folder:GetChildren()) do
		if c.Name == "Fallen_streetLight" then f = c end
	end
	M.run(1)
	local stump, hidden, attached = nil, 0, 0
	for _, q in ipairs(parts(o2)) do
		if q[2].base then stump = q[1] else
			attached += 1
			if q[1].Transparency == 1 then hidden += 1 end
		end
	end
	local pole = f and f:FindFirstChild("Pole")
	local sh = stump and (stump.Shape == Enum.PartType.Cylinder and stump.Size.X or stump.Size.Y) / S
	check("Full: a street light at 90 km/h snaps and falls, a stump stays, the car keeps going", o2.broken and o2.down and pole ~= nil and math.abs(pole.Position.Y / S - (o2.vy + 0.2)) < 0.4
		and sh ~= nil and math.abs(sh - 0.09) < 1e-6 and attached >= 2 and hidden == attached and vAfter > 10 and lastToast("Street light broke") ~= nil,
		string.format("fallen pole at %.2f m above its base, stump %.2f m, %d / %d attached parts hidden, %.1f m/s after · %s", pole and pole.Position.Y / S - o2.vy or -1, sh or -1,
			hidden, attached, vAfter, tostring(lastToast("Street light broke"))))
	local deb = 0
	for _, q in ipairs(RO.debris) do if q.age < q.life or q.p.Transparency < 1 then deb += 1 end end
	-- a road sign at 13 km/h bends (above 35 % of its break energy) without breaking; its plate leans with the post
	local o3
	o3, dx, dz = find("sign")
	hit(o3, dx, dz, 3.6, 0.5)
	local plate, post
	for _, q in ipairs(parts(o3)) do
		if q[1].Name == "signPlate" then plate = q[1] end
		if q[1].Name == "signPost" then post = q[1] end
	end
	check("Full: a road sign at 13 km/h bends and stays (its plate leans with it)", not o3.broken and (o3.bent or 0) > 0 and post ~= nil and plate ~= nil
		and post.CFrame.UpVector.Y < math.cos((o3.bent or 0) * 0.9) and plate.CFrame.UpVector.Y < 0.9999,
		string.format("bent %.3f rad, post up %.4f, plate %s", o3.bent or 0, post and post.CFrame.UpVector.Y or -1, plate and string.format("%.4f", plate.CFrame.UpVector.Y) or "missing"))
	check("the sign plate shows the web game's text", plate ~= nil and plate:FindFirstChildOfClass("SurfaceGui") ~= nil and plate:FindFirstChildOfClass("SurfaceGui"):FindFirstChildOfClass("TextLabel").Text ~= "",
		plate and plate:FindFirstChildOfClass("SurfaceGui") and plate:FindFirstChildOfClass("SurfaceGui"):FindFirstChildOfClass("TextLabel").Text or "no plate")
	-- a dumpster at 36 km/h is shoved, slides, turns, stops; its collider comes back where it stopped and the bin is drawn there
	local o4
	o4, dx, dz = find("bin")
	local x0, z0 = o4.x, o4.z
	hit(o4, dx, dz, 10, 0.5)
	local moving = o4.moving == true
	M.run(4)
	local bin
	for _, q in ipairs(parts(o4)) do if q[1].Name == "bin" then bin = q[1] end end
	local moved = math.sqrt((o4.x - x0) ^ 2 + (o4.z - z0) ^ 2)
	local back = false
	for _, c in ipairs(Objects.near(o4.x, o4.z) or {}) do if c == o4 then back = true end end
	check("Full: a dumpster at 36 km/h slides away and stops; its collider is where it stopped", moving and not o4.moving and not o4.broken and back and moved > 1 and bin ~= nil
		and math.abs(bin.Position.X / S - o4.x) < 0.01 and math.abs(bin.Position.Z / S - o4.z) < 0.01 and lastToast("Dumpster shoved") ~= nil,
		string.format("slid %.1f m, bin drawn %.2f m from its collider · %s", moved, bin and math.sqrt((bin.Position.X / S - o4.x) ^ 2 + (bin.Position.Z / S - o4.z) ^ 2) or -1, tostring(lastToast("Dumpster shoved"))))
	-- a guardrail segment at 54 km/h deflects away from the car (and down)
	local o5
	o5, dx, dz = find("guardrail", function(o) return o.hw > 1.5 end)
	hit(o5, dx, dz, 15, 0.5)
	local rail0
	for _, q in ipairs(parts(o5)) do rail0 = q end
	local shift = rail0 and (rail0[2].cf.Position - rail0[1].Position).Magnitude / S or 0
	check("Full: a guardrail segment at 54 km/h deflects (the car is redirected, the rail moves)", (o5.defl or 0) > 0 and not o5.broken and rail0 ~= nil and math.abs(shift - o5.defl * math.sqrt(1 + 0.0625)) < 0.01,
		string.format("deflection %.3f m, rail moved %.3f m", o5.defl or 0, shift))
	-- a tree at 54 km/h: wood is rigid for a normal trunk; the canopy shakes and sheds leaves
	local o6
	o6, dx, dz = find("tree", function(o) return (o.trunkD or 0.5) > 0.4 end)
	vAfter = hit(o6, dx, dz, 15, 0.4)
	local canopy
	for _, q in ipairs(parts(o6)) do if not q[2].base then canopy = q[1] end end
	check("Full: a tree at 54 km/h stands (the car bounces), its canopy shakes", not o6.broken and vAfter < 0 and (o6.bent or 0) > 0 and canopy ~= nil and (canopy.Position - RO.reg[o6.id][canopy].cf.Position).Magnitude > 0.01,
		string.format("trunk %.2f m (breaks at %.0f m/s), shaken %.3f rad, %.1f m/s after", o6.trunkD or 0, Objects.treeBreakV(o6), o6.bent or 0, vAfter))
	check("debris flies when objects break", deb >= 6, deb .. " pieces")
	-- a building wall at 43 km/h: a scrape mark at the contact
	local marked0 = 0
	for _, m in ipairs(RO.marks) do if m.Transparency < 1 then marked0 += 1 end end
	local b
	for _, p in ipairs(map.Buildings:GetChildren()) do
		local q = p.Position / S
		if math.sqrt(q.X * q.X + q.Z * q.Z) < 900 and p.Size.X > 15 and p.Size.Z > 15 then
			b = p
			break
		end
	end
	local lv = b.CFrame.LookVector
	Drive.place(b.Position.X / S - lv.X * (b.Size.Z / S / 2 + 6), b.Position.Z / S - lv.Z * (b.Size.Z / S / 2 + 6), math.atan2(lv.X, lv.Z))
	st.vx, st.vz = lv.X * 12, lv.Z * 12
	M.run(1)
	local marked1 = 0
	for _, m in ipairs(RO.marks) do if m.Transparency < 1 then marked1 += 1 end end
	check("Full: a building wall at 43 km/h gets a scrape mark", marked1 > marked0, (marked1 - marked0) .. " new marks")
	-- the broken light stays broken when its cell is built again (drive away and back)
	Drive.place(o2.x + 900, o2.z, 0)
	M.run(1.2)
	Drive.place(o2.x + dx * 30, o2.z + dz * 30, 0)
	M.run(1.2)
	local again, hid2 = 0, 0
	for _, q in ipairs(parts(o2)) do
		again += 1
		if not q[2].base and q[1].Transparency == 1 then hid2 += 1 end
	end
	check("a broken street light stays broken when its props are built again", again >= 1 and hid2 == again - 1, again .. " parts again, " .. hid2 .. " hidden")
	setMode(0)
	Drive.reset()
	M.run(0.5)
end

-- ================= the web game's whole car list =================
do
	local Rules = require(Shared.Rules)
	-- the first 22 keep the names and order of Roblox versions 1-3 (saved games store these indices)
	local FIRST = { "Hot Hatch RS", "Family Sedan", "City Mini", "Work Pickup", "Pop-Up Roadster", "Drift Sedan 36", "Classic 86", "Z Coupe 33", "Euro Hatch",
		"Sport SUV", "Drift Coupe S", "Muscle V8", "Street Legend 34", "Mid Coupe", "Rotary Coupe", "Turbo Six 80", "Italian V8", "Endurance GT", "AWD Rocket",
		"Rear-Engine Six", "Twin-Turbo Icon", "Super V10" }
	local same = 0
	for i, n in ipairs(FIRST) do
		if Config.CARS[i] and Config.CARS[i].name == n then same += 1 end
	end
	check("all 217 web cars, the first 22 unchanged (saved games)", #Config.CARS == 217 and same == 22, #Config.CARS .. " cars, " .. same .. " of the first 22 unchanged")
	-- no brand or model names (Roblox removes experiences that use trademarks without permission)
	local BRANDS = { "porsche", "ferrari", "lamborghini", "ford", "toyota", "nissan", "bmw", "mercedes", "audi", "mazda", "honda", "hyundai", "kia", "chevrolet",
		"dodge", "jeep", "tesla", "lexus", "subaru", "suzuki", "mitsubishi", "volkswagen", "opel", "peugeot", "renault", "skoda", "seat ", "fiat", "maserati", "alfa",
		"aston", "bentley", "rolls", "lotus", "byd", "geely", "changan", "hongqi", "gac", "zeekr", "mg ", "range rover", "land rover", "gmc", "mustang", "skyline",
		"supra", "corvette", "huracán", "huracan", "f40", "911", "gt-r", "miata", "golf", "corolla", "hilux", "picanto", "camry", "prius" }
	local seen, dup, brand, worst = {}, 0, 0, ""
	for _, c in ipairs(Config.CARS) do
		if seen[c.name] then dup += 1 end
		seen[c.name] = true
		local low = string.lower(c.name) .. " "
		for _, b in ipairs(BRANDS) do
			if string.find(low, b, 1, true) then
				brand += 1
				worst = c.name
			end
		end
	end
	check("car names unique, no brands or model names", dup == 0 and brand == 0, dup .. " repeated, " .. brand .. " with a brand " .. worst)
	-- every car keeps its own numbers (the web car's top speed, acceleration, size, engine torque)
	local sig, n = {}, 0
	for _, c in ipairs(Config.CARS) do
		local k = string.format("%.5f/%.5f/%.2f/%.2f/%.3f/%s", c.vm, c.a0, c.L, c.W, c.pt.T, c.body)
		if not sig[k] then
			sig[k] = true
			n += 1
		end
	end
	check("each car keeps its own performance and size", n >= 210, n .. " different of " .. #Config.CARS)
	local okPt = 0
	for _, c in ipairs(Config.CARS) do
		local p = c.pt
		if p and p.m > 300 and p.T > 0 and #p.ratio == p.ng and p.red > 0 and p.Iz > 0 and p.mu > 0 then okPt += 1 end
	end
	check("Realistic-handling data for every car", okPt == #Config.CARS, okPt)
	-- the wheel: tier odds 50 / 35 / 10 / 4 / 1 % and only the web wheel's cars of the slice
	local Wheel = require(game:GetService("ServerScriptService").Game.Wheel)
	local cnt, outside, N = { 0, 0, 0, 0, 0 }, 0, 20000
	for _ = 1, N do
		local i, t = Wheel.roll()
		cnt[t + 1] += 1
		local hit = false
		for _, j in ipairs(Rules.wheelPools[t + 1]) do
			if j == i then hit = true end
		end
		if not hit or Config.CARS[i].vip then outside += 1 end
	end
	local dev = 0
	for t = 1, 5 do
		dev = math.max(dev, math.abs(cnt[t] / N - Config.WHEEL_ODDS[t]))
	end
	check("wheel odds 50 / 35 / 10 / 4 / 1 % from the web wheel's lists", dev < 0.012 and outside == 0,
		string.format("%.1f / %.1f / %.1f / %.1f / %.1f %%, %d outside", cnt[1] / N * 100, cnt[2] / N * 100, cnt[3] / N * 100, cnt[4] / N * 100, cnt[5] / N * 100, outside))
	-- traffic: the street's traffic zone sets the tier odds (old Al-Balad mostly common cars)
	local TR = Rules.traffic
	local zb = 0
	for k, z in ipairs(TR.zones) do
		if z == "Al_Balad_Old_Core" then zb = k - 1 end
	end
	local eB
	for _, e in ipairs(State.road.edges) do
		if tonumber(string.sub(TR.ezone, e.id, e.id)) == zb then
			eB = e
			break
		end
	end
	local common, inPools, paintOk = 0, 0, 0
	for _ = 1, 4000 do
		local c, _, col = Traffic.rollCar(eB)
		local ix = table.find(Config.CARS, c)
		if c.tier == 0 then common += 1 end
		for _, pool in ipairs(TR.pools) do
			if table.find(pool, ix) then
				inPools += 1
				break
			end
		end
		local own = Traffic.hex(c.col)
		local isT = false
		for _, h in ipairs(TR.tcol) do
			if Traffic.hex(h) == col then isT = true end
		end
		if isT or col == own then paintOk += 1 end
	end
	local want = TR.odds[zb + 1][1]
	check("traffic cars by the street's zone (Al-Balad: mostly common)", eB ~= nil and math.abs(common / 4000 - want) < 0.03 and inPools == 4000 and paintOk == 4000,
		string.format("%.0f %% common (web odds %.0f %%), %d of 4000 from the traffic lists, %d with a web paint", common / 40, want * 100, inPools, paintOk))
end

-- ================= GPS search, minimap, reset, clock =================
do
	M.call(function() Nav.open() end)
	local box
	for _, d in ipairs(Hud.gui:GetDescendants()) do
		if d.ClassName == "TextBox" then box = d end
	end
	box.Text = "mall"
	M.run(0.1)
	local hit
	for _, d in ipairs(Hud.gui:GetDescendants()) do
		if d.ClassName == "TextButton" and string.find(string.lower(d.Text), "mall", 1, true) then hit = hit or d end
	end
	check("GPS search finds places", hit ~= nil, hit and hit.Text)
	if hit then
		hit.Activated:Fire()
		M.run(0.2)
	end
	check("picking a result starts the GPS", Nav.route() ~= nil and State.ui == nil, Hud.gps.Text)
	M.run(0.5)
	local mm = Hud.gui:FindFirstChild("Minimap")
	local vis = 0
	for _, f in ipairs(mm:GetChildren()) do
		if f.ClassName == "Frame" and f.Visible ~= false then vis += 1 end
	end
	check("minimap draws the roads", vis > 40, vis .. " shapes")
	local dots = 0
	for _, p in ipairs(WS.CurrentCamera:GetChildren()) do
		if p.Name == "GpsDot" and p.Transparency < 1 then dots += 1 end
	end
	check("GPS dots on the road", dots >= 10, dots)
	Nav.clear()
	-- F: back to the start (the web game's warp to START)
	Drive.place(800, 600, 1)
	M.run(0.3)
	Drive.reset()
	M.run(0.3)
	check("F puts the car back at the start", math.abs(st.x) < 0.5 and math.abs(st.z) < 0.5 and math.abs(st.h - Meta.startHeading) < 0.01, f1(st.x) .. ", " .. f1(st.z))
	local h = game:GetService("Lighting").ClockTime
	local expect = (15 + M.now / (Config.DAY_MINUTES * 60) * 24) % 24
	-- the avatar is hidden (the web game shows no driver; it stuck out through the roof)
	local shown = 0
	for _, p in ipairs(plr.Character:GetDescendants()) do
		if p:IsA("BasePart") and p.Transparency < 1 then shown += 1 end
	end
	check("no avatar sticking out of the car", shown == 0, shown .. " visible avatar parts")
	check("day / night clock runs (15:00, an hour every 40 s)", math.abs(h - expect) < 0.1, string.format("%.2f h after %d s", h, M.now))
	local beams = 0
	for _, d in ipairs(State.car:GetDescendants()) do
		if d.ClassName == "SpotLight" then beams += 1 end
	end
	check("headlights fitted", beams == 2)
end

-- ================= the web game's road rules =================
do
	local Rules = require(Shared.Rules)
	local Signals, Ground, Laws, Extras, Duel, SpeedBumps = M.client("Signals"), M.client("Ground"), M.client("Laws"), M.client("Extras"), M.client("Duel"), M.client("SpeedBumps")
	local g = State.road
	-- terrain heights match the road data (both are the web game's TH)
	local worst = 0
	for k = 1, #g.nodes, 37 do
		local nd = g.nodes[k]
		worst = math.max(worst, math.abs(Ground.TH(nd.x, nd.z) - nd.y))
	end
	check("ground heights follow the web game's terrain", worst < 0.6, "worst " .. f1(worst) .. " m at the junctions")
	-- the ground stays just under the web game's terrain height (it buried the roads on slopes when it was flat tiles)
	local blocks = #M.terrainList > 0 and M.terrainList or map.Ground:GetChildren()
	local above, deep, nb = 0, 0, 0
	for k = 1, #blocks, 5 do
		local b = blocks[k]
		local cf, sz = b.CFrame, b.Size
		for _, q in ipairs({ { 0, 0 }, { 0.5, 0.5 }, { -0.5, 0.5 }, { 0.5, -0.5 }, { -0.5, -0.5 } }) do
			local w = cf:PointToWorldSpace(Vector3.new(q[1] * sz.X, sz.Y / 2, q[2] * sz.Z)) / S
			local d = w.Y - Ground.TH(w.X, w.Z)
			above = math.max(above, d)
			deep = math.min(deep, d)
		end
		nb += 1
	end
	check("ground top just under the terrain height", above < 0.05 and deep > -1.6, nb .. " blocks: from " .. f1(deep) .. " to " .. string.format("%.2f", above) .. " m")
	-- every road piece is drawn above the ground along its whole length
	local buried, samples = 0, 0
	for _, r in ipairs(map.Roads:GetChildren()) do
		local cf, sz = r.CFrame, r.Size
		for t = -0.5, 0.5, 0.25 do
			local w = cf:PointToWorldSpace(Vector3.new(0, sz.Y / 2, t * (sz.Z - sz.X * 0.5))) / S
			samples += 1
			if w.Y < Ground.TH(w.X, w.Z) - 0.3 then buried += 1 end
		end
	end
	check("roads not buried by the ground", buried / samples < 0.002, buried .. " of " .. samples .. " road points under the ground")
	-- traffic lights: the 60 s cycle (24 s green, 3 s amber), the two axes half a cycle apart
	local gx, gz, both = 0, 0, 0
	for k = 0, 599 do
		local t0 = k / 10
		local function at(ax)
			local p = (t0 + (ax == "x" and 0 or 30)) % 60
			return p < 24 and "g" or p < 27 and "y" or "r"
		end
		if at("x") == "g" then gx += 1 end
		if at("z") == "g" then gz += 1 end
		if at("x") == "g" and at("z") == "g" then both += 1 end
	end
	local lx = 0
	for _ = 1, 600 do
		if Signals.light("x", 0) == "g" then lx += 1 end
		M.run(0.1)
	end
	check("traffic light cycle: 24 s green of 60, never both axes green", math.abs(lx - 240) <= 3 and gx == 240 and gz == 240 and both == 0, lx .. " green tenths in 60 s")
	local lit = 0
	for _, nd in ipairs(g.nodes) do if nd.lit then lit += 1 end end
	check("signalised junctions on the graph", lit == #Rules.signals and lit > 10, lit)
	local heads = WS.IrbidMap.Signals:GetChildren()
	local on = 0
	for _, hd in ipairs(heads) do
		for _, c in ipairs({ "r", "y", "g" }) do
			local p = hd:FindFirstChild("Lamp_" .. c)
			if p and p.Color.R + p.Color.G > 0.8 then on += 1 end
		end
	end
	check("signal heads built, one lamp lit on each", #heads == #Rules.heads and on == #heads, on .. " lit of " .. #heads)
	-- traffic does not run red lights: watch every traffic car crossing a signalised junction for 90 s near the signals
	local s1 = g.nodes[Rules.signals[1].n]
	Drive.place(s1.x + 30, s1.z + 30, 0)
	local Traffic = M.client("Traffic")
	for _, a in ipairs(Traffic.agents) do a.x = 1e5 end
	M.run(1)
	local crossings, redRuns, inside = 0, 0, {}
	M.run(90, function()
		st.vx, st.vz = 0, 0
		for _, a in ipairs(Traffic.agents) do
			local cur = nil
			for _, s in ipairs(Rules.signals) do
				local nd = g.nodes[s.n]
				if (a.x - nd.x) ^ 2 + (a.z - nd.z) ^ 2 < 9 then cur = nd end
			end
			if cur and inside[a] ~= cur then
				crossings += 1
				-- the edge it arrived on: the traversal ending at this node
				for k = 1, #a.trs do
					local tr = a.trs[k]
					if (tr.d > 0 and tr.e.b or tr.e.a) == cur.id then
						local ax = cur.lit.ph[tr.e.id]
						local tt = WS.DistributedGameTime - 2
						local p = (tt + cur.lit.o + (ax == "x" and 0 or 30)) % 60
						if ax ~= "i" and ax ~= nil and p >= 27 and Signals.at(cur, tr.e) == "r" then redRuns += 1 end
						break
					end
				end
			end
			inside[a] = cur
		end
	end)
	check("traffic stops at red lights", crossings >= 5 and redRuns == 0, crossings .. " junction crossings, " .. redRuns .. " on red")

	-- fines (they ADD to the JD balance, as in the web game)
	local function fines() return plr:GetAttribute("Fines") or 0 end
	-- speeding: a straight street with a 50 km/h limit (or less), full throttle
	local best
	for _, e in ipairs(g.edges) do
		if e.n == 2 and e.len > 220 and e.lim <= 50 and not e.ow and e.fk ~= "ring" and e.fk ~= "drift" and (not best or e.len > best.len) then best = e end
	end
	local h0 = math.atan2(best.x[2] - best.x[1], best.z[2] - best.z[1])
	local function onLane(e, s, dir)
		local hx, hz = (e.x[2] - e.x[1]) / e.len, (e.z[2] - e.z[1]) / e.len
		local x, z = e.x[1] + hx * s, e.z[1] + hz * s
		local off = Road.lane(e) * dir
		return x - hz * off, z + hx * off
	end
	local f0, c0 = fines(), plr:GetAttribute("Cash")
	local x, z = onLane(best, 10, 1)
	Drive.place(x, z, h0)
	M.run(0.3)
	M.move = Vector3.new(0, 0, -1)
	M.run(8, function()
		if fines() > f0 then return "stop" end
	end)
	M.move = Vector3.zero
	check("speeding fined 15 JD", fines() - f0 == 15 and lastToast("^Speeding") ~= nil, (fines() - f0) .. " JD · " .. tostring(lastToast("^Speeding")))
	check("a fine adds to the JD balance", plr:GetAttribute("Cash") >= c0 + 15, (plr:GetAttribute("Cash") - c0) .. " JD more")
	-- driving against traffic: the left lane of the same two-way street, moving along it
	M.run(1)
	f0 = fines()
	x, z = onLane(best, 30, -1)
	Drive.place(x, z, h0)
	M.run(0.3)
	M.move = Vector3.new(0, 0, -1)
	M.run(5, function()
		if fines() > f0 then return "stop" end
	end)
	M.move = Vector3.zero
	check("driving against traffic fined 20 JD", lastToast("^Driving against traffic") ~= nil and (fines() - f0) % 5 == 0 and fines() - f0 >= 20, (fines() - f0) .. " JD")
	-- collision with traffic: a traffic car right next to the player
	M.run(6)
	f0 = fines()
	local tc = Traffic.agents[1]
	tc.x, tc.z = st.x + 2, st.z
	M.run(0.1)
	check("collision with traffic fined 30 JD and the car stops", fines() - f0 == 30 and tc.v == 0, (fines() - f0) .. " JD")
	-- red light: approach a signalised junction while its light is red
	M.run(3)
	local done = false
	for _, s in ipairs(Rules.signals) do
		local nd = g.nodes[s.n]
		for _, q in ipairs(s.ph) do
			local e = g.edges[q[1]]
			if q[2] ~= "i" and e and e.len > 60 and not done and not (e.ow and e.a == nd.id) then
				-- wait until this approach is red for at least 6 more seconds
				local waited = 0
				while waited < 70 do
					local p = (WS.DistributedGameTime + s.o + (q[2] == "x" and 0 or 30)) % 60
					if p > 28 and p < 50 then break end
					M.run(0.5)
					waited += 0.5
				end
				-- 40 m back along the edge, heading for the node
				local atB = e.b == nd.id
				local P = Road.path({ { e = e, d = atB and 1 or -1 } }, Road.lane)
				local s0 = math.max(0, P.c[#P.c] - 40)
				local px, pz, _, tx, tz = Road.sample(P, s0, 1)
				f0 = fines()
				Drive.place(px, pz, math.atan2(tx, tz))
				M.run(0.2)
				-- 50 km/h straight on
				local hh = math.atan2(tx, tz)
				M.run(3.5, function()
					st.h = hh
					st.vx, st.vz = math.sin(hh) * 14, math.cos(hh) * 14
					if fines() > f0 then return "stop" end
				end)
				done = true
			end
		end
	end
	check("running a red light fined 50 JD", lastToast("^Ran a red light") ~= nil and fines() - f0 >= 50, (fines() - f0) .. " JD")
	-- drift zone: no fines inside
	local dzz = Rules.dzones[1]
	if dzz then
		Drive.place(dzz.x, dzz.z, 0)
		M.run(0.5)
		check("drift zone: no limits, no fines", State.inDrift == true and lastToast("no speed limit") ~= nil, tostring(lastToast("Zone")))
	end

	-- speed bumps: crossing one at 60 km/h moves the suspension
	local b = Rules.bumps[1]
	local hb = math.atan2(b.tx, b.tz)
	Drive.place(b.x - b.tx * 30, b.z - b.tz * 30, hb)
	M.run(0.3)
	local maxHeave, hop = 0, false
	M.run(2.5, function()
		st.h = hb
		st.vx, st.vz = math.sin(hb) * 16.7, math.cos(hb) * 16.7
		maxHeave = math.max(maxHeave, math.abs(SpeedBumps.SUSP.heave))
		if st.vy > 0.05 and not st.gnd then hop = true end
	end)
	check("speed bump moves the suspension", maxHeave > 0.01, string.format("heave %.3f m%s", maxHeave, hop and ", short hop" or ""))
	-- stunt ramps: J, full throttle: the car flies off the end
	Extras.ramps()
	M.run(0.3)
	local flight, maxUp = 0, 0
	M.move = Vector3.new(0, 0, -1)
	M.run(20, function()
		local gh = Ground.groundH(st.x, st.z)
		if not st.gnd and st.y > gh + 0.5 then flight += 1 end
		if flight > 30 and st.gnd then return "stop" end
		maxUp = math.max(maxUp, st.y - Ground.TH(st.x, st.z))
	end)
	M.move = Vector3.zero
	check("stunt ramp jump", flight > 20, f1(flight / 60) .. " s in the air, " .. f1(maxUp) .. " m above the ground; at " .. f1(st.x) .. "," .. f1(st.z) .. " " .. f1(st.sp) .. " m/s ui=" .. tostring(State.ui) .. " mission=" .. tostring(State.mission) .. " frozen=" .. tostring(State.frozen))
	-- surface grip: open ground accelerates slower than a road (the web game's .5 + .5 x grip)
	local function accel(x0, z0, h)
		Drive.place(x0, z0, h)
		M.run(0.3)
		M.move = Vector3.new(0, 0, -1)
		M.run(2)
		M.move = Vector3.zero
		local v = st.sp
		M.run(0.1)
		return v
	end
	x, z = onLane(best, 10, 1)
	local vRoad = accel(x, z, h0)
	-- 60 m to the side of the street, where there is no road
	local ox, oz
	for k = 1, 30 do
		local a = k * 0.7
		local cx, cz = best.x[1] + math.sin(a) * (60 + k * 10), best.z[1] + math.cos(a) * (60 + k * 10)
		if not Road.at(g, cx, cz, 4) and not Road.at(g, cx + math.sin(h0) * 40, cz + math.cos(h0) * 40, 4) then
			ox, oz = cx, cz
			break
		end
	end
	local vOff = ox and accel(ox, oz, h0) or 0
	check("less grip off the road", ox ~= nil and vOff < vRoad * 0.95 and vOff > vRoad * 0.6, string.format("%.1f vs %.1f m/s after 2 s", vOff, vRoad))
	-- K: the landmark tour
	Extras.tour()
	M.run(0.2)
	local L = Rules.tour[1]
	check("K jumps to the next landmark tour stop", math.abs(st.x - L.x) < 0.5 and math.abs(st.z - L.z) < 0.5 and lastToast(L.n) ~= nil, L.n)
	-- T: +1 hour
	local hBefore = game:GetService("Lighting").ClockTime
	Extras.hour()
	M.run(1.2)
	local dh = (game:GetService("Lighting").ClockTime - hBefore) % 24
	check("T adds an hour", dh > 0.95 and dh < 1.2, string.format("+%.2f h", dh))
	-- N / B: next / previous owned car
	local cur0 = plr:GetAttribute("CurCar")
	Extras.cycleCar(1)
	M.run(1.5)
	local cur1 = plr:GetAttribute("CurCar")
	Extras.cycleCar(-1)
	M.run(1.5)
	check("N / B switch between owned cars", cur1 ~= cur0 and plr:GetAttribute("CurCar") == cur0, cur0 .. " -> " .. cur1 .. " -> " .. plr:GetAttribute("CurCar"))
	-- R next to a traffic car: a duel; reaching the beam first wins
	x, z = onLane(best, 20, 1)
	Drive.place(x, z, h0)
	M.run(0.3)
	tc = Traffic.agents[2]
	tc.x, tc.z = st.x + math.sin(h0) * 4, st.z + math.cos(h0) * 4
	M.call(function() Missions.race() end)
	check("R next to a traffic car starts a duel", State.mission == "duel" and #Missions.duelRivals == 1, Hud.mission.Text)
	M.run(4.2)
	local rv = Missions.duelRivals[1]
	local rs0 = rv and rv.s or 0
	M.run(3)
	-- the rival is a random car of the web game's sports catalogue (some are slow classics): at least 70 % of its own a0 t^2 / 2
	local want = rv and 0.7 * 0.5 * rv.a0 * 9 or 1e9
	check("the duel rival drives the road ahead", rv ~= nil and rv.s > rs0 + want, rv and (f1(rv.s - rs0) .. " m in 3 s (" .. rv.name .. ", a0 " .. f1(rv.a0) .. ", wanted > " .. f1(want) .. " m)"))
	local dest = State.raceMark
	Drive.place(dest[1], dest[2], st.h)
	M.run(0.5)
	check("reaching the beam first wins the duel", lastToast("won the duel") ~= nil)
	M.run(7)
	check("duel over", State.mission == nil and #Missions.duelRivals == 0)
end

-- ================= saving =================
do
	local cash = plr:GetAttribute("Cash")
	local owned = plr:GetAttribute("Owned")
	M.removePlayer(plr)
	M.run(0.5)
	local rec = M.store.IrbidDrive_v1 and M.store.IrbidDrive_v1.u1001
	check("progress saved on leaving", rec ~= nil and rec.v == 2 and rec.cash == cash and rec.cur == 2, rec and ("cash " .. tostring(rec.cash)))
	check("vehicle damage saved with the progress", rec ~= nil and type(rec.dmg) == "table" and next(rec.dmg) ~= nil, rec and rec.dmg and next(rec.dmg))
	check("settings saved with the progress", rec ~= nil and type(rec.set) == "string" and string.find(rec.set, "hm=0", 1, true) ~= nil and string.find(rec.set, "abs=1", 1, true) ~= nil, rec and tostring(rec.set))
	check("car removed with the player", WS:FindFirstChild("Car_1001") == nil)
	local p2 = M.addPlayer(1001, "Tester")
	M.run(6)
	check("progress loaded on joining again", p2:GetAttribute("Cash") == cash and p2:GetAttribute("Owned") == owned and p2:GetAttribute("CurCar") == 2, p2:GetAttribute("Owned"))
	check("car spawned again", WS:FindFirstChild("Car_1001") ~= nil)
end

check("no script errors at the end", #M.errors == 0, #M.errors .. " errors")
for _, l in ipairs(M.logs) do print("log: " .. l) end
print(string.format("simulated %.0f s, %d rays", M.now, M.rays))
print(string.format("RESULT %d passed, %d failed", pass, fail))
