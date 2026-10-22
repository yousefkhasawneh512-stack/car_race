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
	local right = 0
	for _, a in ipairs(Traffic.agents) do
		local near = Road.nearest(State.road, a.x, a.z, 60)
		if near then
			local d = Road.dirFor(near, math.sin(a.h), math.cos(a.h))
			local side = (a.x - near.x) * (-near.tz * d) + (a.z - near.z) * (near.tx * d)
			if side >= -0.3 then right += 1 end
		end
	end
	-- (measured against the nearest road: a car crossing a junction can be nearest to the crossing street)
	check("traffic keeps to the right-hand lane", right >= #Traffic.agents * 0.95, right .. " of " .. #Traffic.agents)
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
	M.run(30)
	RS.Remotes.BankDrift:FireServer(40000)
	M.run(0.2)
	local cash0 = plr:GetAttribute("Cash")
	local x0, z0 = st.x, st.z
	local ok, r = M.call(function() return RS.Remotes.CarAction:InvokeServer("spin") end)
	M.run(1.5)
	check("wheel spin", ok == true and type(r) == "table" and Config.CARS[r.car] ~= nil and Config.CARS[r.car].tier == r.tier, type(r) == "table" and (Config.CARS[r.car].name .. " tier " .. r.tier .. (r.dup and " duplicate" or "")) or tostring(r))
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
	local vipOk, vipMsg = M.call(function() return RS.Remotes.CarAction:InvokeServer("buy", #Config.CARS) end)
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
	check("the duel rival drives the road ahead", rv ~= nil and rv.s > rs0 + 20, rv and f1(rv.s - rs0) .. " m")
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
