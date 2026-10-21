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
check("terrain tiles", M.terrainBlocks > 12000, M.terrainBlocks)
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
check("leaderstats", plr.leaderstats.Cash.Value == Config.START_CASH)
local st = State.st
check("car on the ground at the start", st.gnd == true and math.abs(st.x) < 1 and math.abs(st.z) < 1, "y " .. f1(st.y) .. " start " .. Meta.startY)

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
	check("traffic keeps to the right-hand lane", right >= #Traffic.agents - 2, right .. " of " .. #Traffic.agents)
end

-- ================= races =================
do
	local C = Missions.circuits
	check("race circuits loaded", #C >= 1, #C)
	local cash0 = plr:GetAttribute("Cash")
	-- 1) teleporting through the checkpoints is refused by the server
	M.call(function() Missions.race() end)
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
	check("teleport race result refused", plr:GetAttribute("Cash") == cash0, "cash " .. cash0 .. " -> " .. plr:GetAttribute("Cash"))
	M.run(6.5)
	check("race ends", State.mission == nil and #Missions.rivals == 0)
	-- 2) a race that takes a believable time pays by place
	M.call(function() Missions.race() end)
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
	check("race pays by finishing place", paid == Config.RACE_REWARD[fin + 1], "P" .. (fin + 1) .. ", paid " .. paid)
	M.run(7)
	-- 3) R during a race cancels it
	M.call(function() Missions.race() end)
	M.call(function() Missions.race() end)
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
	-- reset from off the road
	local near = Road.nearest(State.road, 0, 0, 50)
	Drive.place(near.x + 35, near.z + 35, 0)
	M.run(0.3)
	Drive.reset()
	M.run(0.3)
	local n2 = Road.nearest(State.road, st.x, st.z, 60)
	check("reset puts the car back on a road", n2 and n2.d < n2.e.w / 2, n2 and f1(n2.d) .. " m from the centre line")
	local h = game:GetService("Lighting").ClockTime
	local expect = (9 + M.now / (Config.DAY_MINUTES * 60) * 24) % 24
	check("day / night clock runs", math.abs(h - expect) < 0.1, string.format("%.2f h after %d s", h, M.now))
	local beams = 0
	for _, d in ipairs(State.car:GetDescendants()) do
		if d.ClassName == "SpotLight" then beams += 1 end
	end
	check("headlights fitted", beams == 2)
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
